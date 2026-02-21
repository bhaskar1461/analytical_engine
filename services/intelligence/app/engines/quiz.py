from __future__ import annotations

from collections import defaultdict

from ..schemas import RiskProfile

SECTION_WEIGHTS = {
    "emotional": 0.40,
    "financial": 0.35,
    "behavioral": 0.25,
}


def to_persona(score: float) -> tuple[str, str]:
    if score < 35:
        return "TURTLE", "CONSERVATIVE"
    if score < 60:
        return "OWL", "MODERATE"
    if score < 80:
        return "TIGER", "AGGRESSIVE"
    return "FALCON", "VERY_AGGRESSIVE"


def score_quiz(answers: list[dict[str, float | str]]) -> RiskProfile:
    buckets: dict[str, list[float]] = defaultdict(list)

    for answer in answers:
        section = str(answer.get("section", "")).lower()
        value = float(answer.get("value", 0))
        if section in SECTION_WEIGHTS:
            buckets[section].append(value)

    weighted = 0.0
    missing_sections = []

    for section, weight in SECTION_WEIGHTS.items():
        values = buckets.get(section, [])
        if not values:
            missing_sections.append(section)
            continue
        weighted += (sum(values) / len(values)) * weight

    completion_ratio = len([s for s in SECTION_WEIGHTS if buckets.get(s)]) / len(SECTION_WEIGHTS)
    weighted *= completion_ratio

    risk_score = max(0.0, min(100.0, round(weighted, 2)))
    persona, risk_level = to_persona(risk_score)

    warnings: list[str] = []
    if risk_score >= 75:
        warnings.append(
            "Your responses indicate higher risk tolerance. Ensure this matches your financial situation."
        )
    if missing_sections:
        warnings.append(
            "Some response categories were incomplete. Confidence in your persona is reduced."
        )

    return RiskProfile(
        riskScore=risk_score,
        persona=persona,
        riskLevel=risk_level,
        warnings=warnings,
    )
