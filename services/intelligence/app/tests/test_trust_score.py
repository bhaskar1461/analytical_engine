from __future__ import annotations

import pytest

from app.engines.common import stable_score
from app.engines.trust_score import compute_trust_score


@pytest.mark.asyncio
async def test_trust_score_is_deterministic() -> None:
    first = await compute_trust_score("RELIANCE.NS", previous_score=58)
    second = await compute_trust_score("RELIANCE.NS", previous_score=58)

    assert first.trustScore == second.trustScore
    assert first.components.historical == second.components.historical


@pytest.mark.asyncio
async def test_daily_delta_capped() -> None:
    previous = 62.0
    result = await compute_trust_score("INFY.NS", previous_score=previous)
    delta = result.trustScore - previous

    assert -10 <= delta <= 10


@pytest.mark.asyncio
async def test_hype_risk_caps_upper_bound() -> None:
    result = await compute_trust_score("ADANIENT.NS", previous_score=76)

    if "High hype risk detected; sentiment impact is dampened." in result.explanations:
        assert result.trustScore <= 80


@pytest.mark.asyncio
async def test_default_previous_score_is_stable() -> None:
    result = await compute_trust_score("TCS.NS")
    previous = stable_score("TCS.NS", 38, 84, "previous-day")
    delta = result.trustScore - previous

    assert -10 <= delta <= 10
