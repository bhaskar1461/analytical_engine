from __future__ import annotations

import math
from datetime import datetime, timezone

import httpx

from ..config import settings
from ..engines.common import stable_score


def _compute_volatility(closes: list[float]) -> float:
    if len(closes) < 2:
        return 0.0
    returns: list[float] = []
    for idx in range(1, len(closes)):
        if closes[idx - 1] <= 0:
            continue
        returns.append((closes[idx] - closes[idx - 1]) / closes[idx - 1])

    if len(returns) < 2:
        return 0.0

    mean = sum(returns) / len(returns)
    variance = sum((item - mean) ** 2 for item in returns) / max(len(returns) - 1, 1)
    return math.sqrt(variance)


async def fetch_latest_quotes(symbols: list[str]) -> dict[str, dict[str, float | bool]]:
    if not symbols:
        return {}

    try:
        async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": settings.yahoo_user_agent}) as client:
            response = await client.get(
                "https://query1.finance.yahoo.com/v7/finance/quote",
                params={"symbols": ",".join(symbols)},
            )
            response.raise_for_status()

        payload = response.json()
        results = payload.get("quoteResponse", {}).get("result", [])
        if not isinstance(results, list):
            return {}

        mapped: dict[str, dict[str, float | bool]] = {}
        for row in results:
            if not isinstance(row, dict):
                continue
            symbol = str(row.get("symbol") or "").strip().upper()
            latest = row.get("regularMarketPrice")
            previous = row.get("regularMarketPreviousClose")
            if not symbol or not isinstance(latest, (int, float)):
                continue
            latest_value = float(latest)
            previous_value = float(previous) if isinstance(previous, (int, float)) and float(previous) > 0 else latest_value
            mapped[symbol] = {
                "latest_close": round(latest_value, 4),
                "previous_close": round(previous_value, 4),
                "stale": False,
            }
        return mapped
    except Exception:
        return {}


async def fetch_market_features(symbol: str) -> dict[str, float | int | bool]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {
        "range": "5y",
        "interval": "1d",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": settings.yahoo_user_agent}) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()

        payload = response.json()
        result = payload.get("chart", {}).get("result", [])[0]
        timestamps = result.get("timestamp", [])
        closes = result.get("indicators", {}).get("quote", [])[0].get("close", [])

        closes_clean = [float(item) for item in closes if isinstance(item, (float, int))]
        timestamps_clean = [int(item) for item in timestamps if isinstance(item, int)]

        if len(closes_clean) < 50 or not timestamps_clean:
            raise ValueError("Insufficient data")

        first_date = datetime.fromtimestamp(timestamps_clean[0], tz=timezone.utc)
        years = max((datetime.now(timezone.utc) - first_date).days / 365.0, 0.0)

        volatility = _compute_volatility(closes_clean)
        market_score = max(0.0, min(100.0, 80 - volatility * 400))
        historical_return = (closes_clean[-1] - closes_clean[0]) / closes_clean[0]
        historical_score = max(0.0, min(100.0, 50 + historical_return * 40 - volatility * 200))
        latest_close = closes_clean[-1]
        previous_close = closes_clean[-2] if len(closes_clean) > 1 else closes_clean[-1]

        return {
            "historical_score": round(historical_score, 2),
            "market_score": round(market_score, 2),
            "volatility": round(volatility * 100, 2),
            "history_years": round(years, 2),
            "latest_close": round(latest_close, 2),
            "previous_close": round(previous_close, 2),
            "stale": False,
        }
    except Exception:
        latest_close = stable_score(symbol, 25, 3800, "latest-close")
        previous_close = latest_close * (1 - stable_score(symbol, -0.03, 0.03, "trend"))
        return {
            "historical_score": stable_score(symbol, 48, 82, "historical"),
            "market_score": stable_score(symbol, 45, 80, "market"),
            "volatility": stable_score(symbol, 8, 42, "volatility"),
            "history_years": round(stable_score(symbol, 1, 6, "years"), 2),
            "latest_close": round(latest_close, 2),
            "previous_close": round(previous_close, 2),
            "stale": True,
        }
