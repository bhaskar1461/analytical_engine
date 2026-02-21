from __future__ import annotations

import asyncio
from datetime import date

from ..engines.common import stable_score
from .store import supabase_rest
from .universe import NIFTY_UNIVERSE


async def run() -> None:
    rows = []
    period_end = date.today().replace(day=1).isoformat()

    for row in NIFTY_UNIVERSE:
        symbol = row["symbol"]
        rows.append(
            {
                "symbol": symbol,
                "period_end": period_end,
                "roe": round(stable_score(symbol, 8, 28, "roe"), 2),
                "de_ratio": round(stable_score(symbol, 0.1, 1.8, "de"), 2),
                "revenue_growth": round(stable_score(symbol, -5, 25, "revenue-growth"), 2),
                "operating_margin": round(stable_score(symbol, 8, 40, "op-margin"), 2),
                "interest_coverage": round(stable_score(symbol, 1.2, 14, "interest-coverage"), 2),
            }
        )

    await supabase_rest.upsert("financials", rows)


if __name__ == "__main__":
    asyncio.run(run())
