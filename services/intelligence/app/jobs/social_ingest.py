from __future__ import annotations

import asyncio
from ..providers.reddit import fetch_social_posts
from .store import supabase_rest
from .universe import NIFTY_UNIVERSE


async def _load_rows_for_symbol(symbol: str, semaphore: asyncio.Semaphore) -> list[dict[str, object]]:
    async with semaphore:
        posts = await fetch_social_posts(symbol)
    rows: list[dict[str, object]] = []
    for post in posts:
        rows.append(
            {
                "symbol": symbol,
                "source_post_id": str(post["source_post_id"]),
                "created_at": str(post["created_at"]),
                "karma": int(post["karma"]),
                "account_age_days": int(post["account_age_days"]),
                "sentiment": float(post["sentiment"]),
                "is_bot": bool(post["is_bot"]),
                "is_spam": bool(post["is_spam"]),
                "post_hash": str(post["post_hash"]),
                "raw_json": post["raw_json"],
            }
        )
    return rows


async def run() -> None:
    semaphore = asyncio.Semaphore(4)
    batches = await asyncio.gather(
        *(_load_rows_for_symbol(stock["symbol"], semaphore) for stock in NIFTY_UNIVERSE)
    )
    rows = [row for batch in batches for row in batch]

    await supabase_rest.upsert("social_posts", rows, on_conflict="source_post_id")


if __name__ == "__main__":
    asyncio.run(run())
