from __future__ import annotations

from app.engines.social import social_hype_penalty
from app.providers import reddit


def test_social_hype_penalty_capped_and_non_negative() -> None:
    assert social_hype_penalty(0, False, 100) == 0
    assert social_hype_penalty(200, True, 5) <= 15
    assert social_hype_penalty(55, False, 90) >= 0


def test_fallback_social_features_shape() -> None:
    fallback = reddit._fallback_features("RELIANCE.NS")

    assert 0 <= float(fallback["bullish_pct"]) <= 100
    assert 0 <= float(fallback["bearish_pct"]) <= 100
    assert 0 <= float(fallback["confidence"]) <= 100
    assert "stale" in fallback
