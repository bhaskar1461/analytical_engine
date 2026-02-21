from __future__ import annotations

from .common import clamp


def social_hype_penalty(hype_velocity: float, meme_risk_flag: bool, confidence: float) -> float:
    spike_penalty = clamp((hype_velocity - 60) * 0.12, 0, 8)
    meme_penalty = 6 if meme_risk_flag else 0
    confidence_adjustment = (100 - confidence) * 0.03
    return round(clamp(spike_penalty + meme_penalty + confidence_adjustment, 0, 15), 2)
