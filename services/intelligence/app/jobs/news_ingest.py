from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from ..engines.common import stable_score
from ..providers.newsapi import SOURCE_WEIGHT, fallback_news_features, fetch_news_articles
from .store import supabase_rest
from .universe import NIFTY_UNIVERSE


def _fallback_news_row(
    symbol: str,
    stock_name: str,
    now: datetime,
    confidence: float,
    sentiment: float,
) -> dict[str, str | float | bool]:
    return {
        "symbol": symbol,
        "source": "stale-cache",
        "title": f"{stock_name} sentiment cache update for educational analytics",
        "url": f"https://anylical.local/news/{symbol}/{now.strftime('%Y%m%d%H%M')}",
        "published_at": now.isoformat(),
        "sentiment": round(sentiment, 2),
        "confidence": round(confidence, 2),
        "credibility_weight": round(stable_score(symbol, 0.55, 0.9, "credibility"), 2),
        "is_duplicate": False,
        "content_hash": f"{symbol}-{now.strftime('%Y%m%d%H')}",
    }


def _mark_duplicate_hashes(
    rows: list[dict[str, str | float | bool]],
    existing_hashes: set[str],
) -> list[dict[str, str | float | bool]]:
    seen_hashes: set[str] = set(existing_hashes)

    for row in rows:
        content_hash = str(row.get("content_hash") or "")
        if not content_hash:
            row["is_duplicate"] = False
            continue

        is_duplicate = content_hash in seen_hashes
        row["is_duplicate"] = is_duplicate
        seen_hashes.add(content_hash)

    return rows


async def _build_rows_for_stock(
    stock: dict[str, str],
    source_credibility: dict[str, float],
    semaphore: asyncio.Semaphore,
) -> list[dict[str, str | float | bool]]:
    symbol = stock["symbol"]

    async with semaphore:
        provider_articles = await fetch_news_articles(symbol, source_weights=source_credibility)

    if provider_articles:
        existing_hashes = await supabase_rest.get_recent_news_hashes(symbol)
        rows: list[dict[str, str | float | bool]] = []
        for article in provider_articles:
            rows.append(
                {
                    "symbol": symbol,
                    "source": str(article["source"]),
                    "title": str(article["title"]),
                    "url": str(article["url"]),
                    "published_at": str(article["published_at"]),
                    "sentiment": float(article["sentiment"]),
                    "confidence": float(article["confidence"]),
                    "credibility_weight": float(article["credibility_weight"]),
                    "is_duplicate": False,
                    "content_hash": str(article["content_hash"]),
                }
            )

        return _mark_duplicate_hashes(rows, existing_hashes)

    features = fallback_news_features(symbol)
    now = datetime.now(timezone.utc)
    fallback_row = _fallback_news_row(
        symbol=symbol,
        stock_name=stock["name"],
        now=now,
        confidence=float(features["confidence"]),
        sentiment=(float(features["news_score"]) - 50) / 10,
    )
    return [fallback_row]


async def run() -> None:
    source_credibility = dict(SOURCE_WEIGHT)
    if supabase_rest.enabled:
        source_credibility.update(await supabase_rest.get_source_credibility())
    source_credibility.setdefault("unknown", 0.5)

    semaphore = asyncio.Semaphore(4)
    batches = await asyncio.gather(
        *(_build_rows_for_stock(stock, source_credibility, semaphore) for stock in NIFTY_UNIVERSE)
    )
    rows = [row for batch in batches for row in batch]

    await supabase_rest.upsert("news_items", rows, on_conflict="url")


if __name__ == "__main__":
    asyncio.run(run())
