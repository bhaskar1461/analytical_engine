from __future__ import annotations

from .common import clamp
from .portfolio import generate_portfolio


def generate_sip_plan(monthly_budget: float, risk_persona: str, horizon_months: int) -> dict:
    base = generate_portfolio(risk_persona, monthly_budget, horizon_months)

    allocations = []
    for row in base["allocations"]:
        allocations.append(
            {
                **row,
                "weightPct": round(row["weightPct"], 2),
            }
        )

    total_weight = sum(item["weightPct"] for item in allocations)
    if total_weight != 100:
        diff = round(100 - total_weight, 2)
        allocations[0]["weightPct"] = round(allocations[0]["weightPct"] + diff, 2)

    expected_drawdown = clamp(base["volatilityEstimate"] * 0.8, 4, 32)

    warnings = list(base["warnings"])
    if monthly_budget < 1500:
        warnings.append("Lower monthly budgets can increase concentration risk over time.")

    return {
        "monthlyBudgetInr": round(monthly_budget, 2),
        "riskPersona": risk_persona,
        "horizonMonths": horizon_months,
        "expectedDrawdown": round(expected_drawdown, 2),
        "rebalanceTriggers": [
            "Allocation drift > 8%",
            "Risk persona change",
            "Major trust score shift (>12 points)",
        ],
        "allocations": allocations,
        "warnings": warnings,
    }
