from __future__ import annotations

from app.engines.portfolio import generate_portfolio
from app.engines.quiz import score_quiz
from app.engines.sip import generate_sip_plan


def test_quiz_weighted_scoring() -> None:
    profile = score_quiz(
        [
            {"section": "emotional", "value": 80},
            {"section": "emotional", "value": 70},
            {"section": "financial", "value": 60},
            {"section": "financial", "value": 65},
            {"section": "behavioral", "value": 55},
            {"section": "behavioral", "value": 50},
        ]
    )

    assert 0 <= profile.riskScore <= 100
    assert profile.persona in {"TURTLE", "OWL", "TIGER", "FALCON"}


def test_portfolio_constraints() -> None:
    portfolio = generate_portfolio("OWL", 50000, 60)

    assert len(portfolio["allocations"]) >= 3
    assert round(sum(item["weightPct"] for item in portfolio["allocations"]), 2) == 100

    per_sector = {}
    for item in portfolio["allocations"]:
        per_sector[item["sector"]] = per_sector.get(item["sector"], 0) + item["weightPct"]

    assert all(weight <= 35 for weight in per_sector.values())


def test_sip_budget_and_allocation_invariants() -> None:
    plan = generate_sip_plan(3000, "TIGER", 84)

    assert plan["monthlyBudgetInr"] <= 3000
    assert round(sum(item["weightPct"] for item in plan["allocations"]), 2) == 100
    assert plan["expectedDrawdown"] >= 0
