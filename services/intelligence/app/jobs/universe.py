from __future__ import annotations

import csv
import io
import re
from urllib.parse import quote

import httpx

from ..config import settings

NIFTY_UNIVERSE = [
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "sector": "Energy", "exchange": "NSE"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "sector": "Information Technology", "exchange": "NSE"},
    {"symbol": "INFY.NS", "name": "Infosys", "sector": "Information Technology", "exchange": "NSE"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank", "sector": "Financial Services", "exchange": "NSE"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank", "sector": "Financial Services", "exchange": "NSE"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "sector": "Financial Services", "exchange": "NSE"},
    {"symbol": "ITC.NS", "name": "ITC", "sector": "FMCG", "exchange": "NSE"},
    {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever", "sector": "FMCG", "exchange": "NSE"},
    {"symbol": "LT.NS", "name": "Larsen & Toubro", "sector": "Industrials", "exchange": "NSE"},
]

SYMBOL_PATTERN = re.compile(r"^[A-Z0-9.\-]+$")


def _pick(row: dict[str, object], keys: list[str]) -> str:
    for key in keys:
        value = row.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def _clean(text: str | None, fallback: str = "Unclassified") -> str:
    value = (text or "").strip()
    return value if value else fallback


def _logo_url(symbol: str, name: str, exchange: str) -> str:
    root_symbol = symbol.split(".")[0]
    if exchange == "NYSE":
        return f"https://assets.parqet.com/logos/symbol/{quote(root_symbol)}?format=png"
    return f"https://api.dicebear.com/9.x/initials/svg?seed={quote(name or root_symbol)}"


def _apply_limit(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    limit = settings.universe_limit_per_exchange
    if limit <= 0:
        return rows
    return rows[:limit]


def _normalize_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    dedupe: dict[str, dict[str, str]] = {}
    for row in rows:
        symbol = row.get("symbol", "").strip().upper()
        name = row.get("name", "").strip()
        sector = row.get("sector", "").strip()
        exchange = row.get("exchange", "").strip().upper()
        if not symbol or not name or exchange not in {"NSE", "BSE", "NYSE"}:
            continue
        if not SYMBOL_PATTERN.fullmatch(symbol):
            continue
        dedupe[symbol] = {
            "symbol": symbol,
            "name": name,
            "sector": sector or "Unclassified",
            "exchange": exchange,
            "icon_url": row.get("icon_url") or _logo_url(symbol, name, exchange),
        }
    return sorted(dedupe.values(), key=lambda item: item["symbol"])


async def _fetch_nse_universe(client: httpx.AsyncClient) -> list[dict[str, str]]:
    response = await client.get(settings.nse_universe_url)
    response.raise_for_status()

    rows: list[dict[str, str]] = []
    reader = csv.DictReader(io.StringIO(response.text))
    for row in reader:
        symbol = _pick(row, ["SYMBOL", " SYMBOL"]).upper()
        if not symbol:
            continue
        series = _pick(row, ["SERIES", " SERIES"]).upper()
        if series and series != "EQ":
            continue
        if not SYMBOL_PATTERN.fullmatch(symbol):
            continue

        name = _clean(_pick(row, ["NAME OF COMPANY", " NAME OF COMPANY"]), symbol)
        rows.append(
            {
                "symbol": f"{symbol}.NS",
                "name": name,
                "sector": "Unclassified",
                "exchange": "NSE",
            }
        )

    return _apply_limit(rows)


async def _fetch_bse_universe(client: httpx.AsyncClient) -> list[dict[str, str]]:
    response = await client.get(
        settings.bse_universe_url,
        headers={
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.bseindia.com/",
            "User-Agent": settings.yahoo_user_agent,
        },
    )
    response.raise_for_status()

    payload = response.json()
    records: list[dict[str, object]] = []
    if isinstance(payload, list):
        records = [item for item in payload if isinstance(item, dict)]
    elif isinstance(payload, dict):
        for key in ["Table", "table", "Data", "data", "d"]:
            value = payload.get(key)
            if isinstance(value, list):
                records = [item for item in value if isinstance(item, dict)]
                break

    rows: list[dict[str, str]] = []
    for record in records:
        code = _pick(
            record,
            [
                "SCRIP_CD",
                "scrip_cd",
                "ScripCode",
                "scripcode",
                "SecurityCode",
                "securityCode",
            ],
        )
        code = "".join(ch for ch in code if ch.isdigit())
        if not code:
            continue

        name = _clean(
            _pick(
                record,
                [
                    "SCRIP_NM",
                    "scrip_nm",
                    "SCRIPNAME",
                    "scripname",
                    "SecurityName",
                    "securityName",
                ],
            ),
            code,
        )
        sector = _clean(
            _pick(
                record,
                [
                    "Industry",
                    "industry",
                    "sector",
                    "Sector",
                ],
            ),
            "Unclassified",
        )
        rows.append(
            {
                "symbol": f"{code}.BO",
                "name": name,
                "sector": sector,
                "exchange": "BSE",
            }
        )

    return _apply_limit(rows)


async def _fetch_nyse_universe(client: httpx.AsyncClient) -> list[dict[str, str]]:
    response = await client.get(settings.nyse_universe_url)
    response.raise_for_status()

    lines = response.text.splitlines()
    if not lines:
        return []

    headers = lines[0].split("|")
    rows: list[dict[str, str]] = []
    for line in lines[1:]:
        if not line.strip() or line.startswith("File Creation Time"):
            continue

        cells = line.split("|")
        if len(cells) < len(headers):
            continue
        record = dict(zip(headers, cells))

        exchange = record.get("Exchange", "").strip().upper()
        if exchange not in {"N", "A", "P"}:
            continue
        if record.get("Test Issue", "").strip().upper() == "Y":
            continue

        symbol = record.get("ACT Symbol", "").strip().upper()
        if not symbol or not SYMBOL_PATTERN.fullmatch(symbol):
            continue

        name = _clean(record.get("Security Name", "").strip(), symbol)
        rows.append(
            {
                "symbol": symbol,
                "name": name,
                "sector": "Unclassified",
                "exchange": "NYSE",
            }
        )

    return _apply_limit(rows)


async def load_market_universe() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    async with httpx.AsyncClient(
        timeout=25.0,
        follow_redirects=True,
        headers={"User-Agent": settings.yahoo_user_agent},
    ) as client:
        try:
            rows.extend(await _fetch_nse_universe(client))
        except Exception:
            rows.extend(NIFTY_UNIVERSE)

        try:
            rows.extend(await _fetch_bse_universe(client))
        except Exception:
            pass

        try:
            rows.extend(await _fetch_nyse_universe(client))
        except Exception:
            pass

    normalized = _normalize_rows(rows)
    if normalized:
        return normalized
    return _normalize_rows(NIFTY_UNIVERSE)
