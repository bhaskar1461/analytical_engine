from __future__ import annotations

import asyncio
from datetime import date
from typing import Any

from ..engines.trust_score import compute_trust_score
from ..providers.reddit import fetch_social_features
from .store import supabase_rest
from .universe import NIFTY_UNIVERSE


async def _compute_rows_for_symbol(
    symbol: str,
    as_of_date: date,
    previous_score: float | None,
    semaphore: asyncio.Semaphore,
) -> tuple[dict[str, Any], dict[str, Any]]:
    async with semaphore:
        trust = await compute_trust_score(
            symbol,
            previous_score=previous_score,
            as_of_date=as_of_date,
        )
        social = await fetch_social_features(symbol)

    trust_row = {
        "symbol": symbol,
        "as_of_date": trust.asOfDate,
        "trust_score": trust.trustScore,
        "historical_score": trust.components.historical,
        "financial_score": trust.components.financial,
        "news_score": trust.components.news,
        "market_score": trust.components.market,
        "confidence": trust.confidence,
        "limited_data_flag": trust.limitedData,
        "hype_penalty": trust.components.hypePenalty,
        "model_version": "trust-v1.0.0",
        "explanation_json": {"explanations": trust.explanations, "stale": trust.staleData},
    }
    social_row = {
        "symbol": symbol,
        "as_of_date": as_of_date.isoformat(),
        "bullish_pct": social["bullish_pct"],
        "bearish_pct": social["bearish_pct"],
        "hype_velocity": social["hype_velocity"],
        "confidence": social["confidence"],
        "meme_risk_flag": social["meme_risk_flag"],
    }
    return trust_row, social_row


async def run() -> None:
    as_of_date = date.today()
    symbols = [stock["symbol"] for stock in NIFTY_UNIVERSE]
    previous_scores = (
        await supabase_rest.get_latest_trust_scores(symbols)
        if supabase_rest.enabled
        else {}
    )

    semaphore = asyncio.Semaphore(4)
    computed = await asyncio.gather(
        *(
            _compute_rows_for_symbol(
                symbol,
                as_of_date,
                previous_scores.get(symbol),
                semaphore,
            )
            for symbol in symbols
        )
    )
    trust_rows = [rows[0] for rows in computed]
    social_rows = [rows[1] for rows in computed]

    await supabase_rest.upsert("trust_scores", trust_rows)
    await supabase_rest.upsert("social_daily", social_rows)


if __name__ == "__main__":
    asyncio.run(run())
