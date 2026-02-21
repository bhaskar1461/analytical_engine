from __future__ import annotations

import asyncio
from datetime import date
from typing import Any

from ..engines.common import stable_score
from ..providers.yahoo import fetch_latest_quotes
from .store import supabase_rest
from .universe import load_market_universe


def _to_float(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _build_rows_for_symbol(
    stock: dict[str, str],
    trading_date: str,
    quote: dict[str, float | bool] | None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    symbol = stock["symbol"]
    fallback_close = stable_score(symbol, 25, 3800, "close")
    close = _to_float((quote or {}).get("latest_close"), fallback_close)
    previous_close = _to_float((quote or {}).get("previous_close"), close * 0.995)
    open_price = previous_close if previous_close > 0 else close * 0.995

    high = max(open_price, close) * 1.01
    low = min(open_price, close) * 0.99
    volume = int(stable_score(symbol, 1_000_000, 18_000_000, "volume"))

    stock_row = {
        "symbol": symbol,
        "name": stock["name"],
        "sector": stock["sector"],
        "exchange": stock["exchange"],
        "icon_url": stock.get("icon_url"),
        "is_active": True,
    }
    prices_row = {
        "symbol": symbol,
        "trading_date": trading_date,
        "open": round(open_price, 4),
        "high": round(high, 4),
        "low": round(low, 4),
        "close": round(close, 4),
        "adj_close": round(close, 4),
        "volume": volume,
    }
    return stock_row, prices_row


def _chunks(items: list[str], size: int) -> list[list[str]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


async def run() -> dict[str, Any]:
    universe = await load_market_universe()
    if not universe:
        return {
            "status": "no-data",
            "stocksUpserted": 0,
            "pricesUpserted": 0,
            "quotesResolved": 0,
        }

    trading_date = date.today().isoformat()
    symbols = [stock["symbol"] for stock in universe]
    quote_map: dict[str, dict[str, float | bool]] = {}

    quote_batches = _chunks(symbols, 150)
    for batch in quote_batches:
        quote_map.update(await fetch_latest_quotes(batch))

    computed = [
        _build_rows_for_symbol(stock, trading_date, quote_map.get(stock["symbol"].upper()))
        for stock in universe
    ]
    stocks_rows = [rows[0] for rows in computed]
    prices_rows = [rows[1] for rows in computed]

    await supabase_rest.upsert("stocks", stocks_rows)
    await supabase_rest.upsert("historical_prices", prices_rows)

    return {
        "status": "ok",
        "stocksUpserted": len(stocks_rows),
        "pricesUpserted": len(prices_rows),
        "quotesResolved": len(quote_map),
        "tradingDate": trading_date,
    }


if __name__ == "__main__":
    print(asyncio.run(run()))
