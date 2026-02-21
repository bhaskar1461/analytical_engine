from __future__ import annotations

from dataclasses import dataclass

from .common import clamp, stable_score


@dataclass
class Asset:
    symbol: str
    label: str
    sector: str


UNIVERSE = [
    Asset("NIFTYBEES.NS", "Nippon India ETF Nifty 50", "ETF"),
    Asset("RELIANCE.NS", "Reliance Industries", "Energy"),
    Asset("TCS.NS", "Tata Consultancy Services", "Information Technology"),
    Asset("INFY.NS", "Infosys", "Information Technology"),
    Asset("HDFCBANK.NS", "HDFC Bank", "Financial Services"),
    Asset("ICICIBANK.NS", "ICICI Bank", "Financial Services"),
    Asset("ITC.NS", "ITC", "FMCG"),
    Asset("HINDUNILVR.NS", "Hindustan Unilever", "FMCG"),
    Asset("LT.NS", "Larsen & Toubro", "Industrials"),
]

PERSONA_CAP = {
    "TURTLE": 25.0,
    "OWL": 30.0,
    "TIGER": 35.0,
    "FALCON": 40.0,
}

PERSONA_TARGET_RISK = {
    "TURTLE": 30.0,
    "OWL": 50.0,
    "TIGER": 70.0,
    "FALCON": 85.0,
}


def _base_assets_for_persona(persona: str) -> list[Asset]:
    if persona == "TURTLE":
        return [UNIVERSE[0], UNIVERSE[4], UNIVERSE[6], UNIVERSE[7]]
    if persona == "OWL":
        return [UNIVERSE[0], UNIVERSE[1], UNIVERSE[4], UNIVERSE[6], UNIVERSE[8]]
    if persona == "TIGER":
        return [UNIVERSE[0], UNIVERSE[1], UNIVERSE[2], UNIVERSE[4], UNIVERSE[8]]
    return [UNIVERSE[0], UNIVERSE[1], UNIVERSE[2], UNIVERSE[3], UNIVERSE[8]]


def _score_asset(symbol: str) -> tuple[float, float]:
    trust = stable_score(symbol, 55, 90, "portfolio-trust")
    volatility = stable_score(symbol, 12, 36, "portfolio-vol")
    return trust, volatility


def generate_portfolio(risk_persona: str, amount: float, horizon_months: int) -> dict:
    assets = _base_assets_for_persona(risk_persona)
    cap = PERSONA_CAP[risk_persona]

    weighted = []
    total_trust = 0.0
    for asset in assets:
        trust, volatility = _score_asset(asset.symbol)
        # bias toward trust while penalizing excessive volatility
        weight_signal = max(0.1, trust - volatility * 0.7)
        total_trust += weight_signal
        weighted.append((asset, trust, volatility, weight_signal))

    allocations = []
    sector_weight: dict[str, float] = {}
    remaining = 100.0

    for idx, (asset, trust, volatility, signal) in enumerate(weighted):
        if idx == len(weighted) - 1:
            weight = round(remaining, 2)
        else:
            proposed = round((signal / total_trust) * 100, 2)
            proposed = min(proposed, cap)
            # enforce 35% sector cap
            current_sector = sector_weight.get(asset.sector, 0.0)
            proposed = min(proposed, max(0.0, 35.0 - current_sector))
            weight = proposed

        sector_weight[asset.sector] = sector_weight.get(asset.sector, 0.0) + weight
        remaining = round(max(0.0, remaining - weight), 2)

        allocations.append(
            {
                "symbol": asset.symbol,
                "label": asset.label,
                "sector": asset.sector,
                "weightPct": weight,
                "expectedVolatility": round(volatility, 2),
                "trustScore": round(trust, 2),
            }
        )

    if remaining > 0:
        allocations[0]["weightPct"] = round(allocations[0]["weightPct"] + remaining, 2)

    # risk alignment check
    portfolio_risk = sum(item["weightPct"] * item["expectedVolatility"] for item in allocations) / 100
    risk_tolerance = PERSONA_TARGET_RISK[risk_persona]

    warnings: list[str] = []
    if portfolio_risk > risk_tolerance:
        warnings.append("Portfolio risk exceeded persona tolerance; conservative rebalancing applied.")
        scale = risk_tolerance / max(portfolio_risk, 1e-6)
        for item in allocations:
            item["expectedVolatility"] = round(item["expectedVolatility"] * scale, 2)
        portfolio_risk = risk_tolerance

    confidence = clamp(78 - (portfolio_risk / 2.5) + min(horizon_months / 36, 10), 45, 92)
    risk_level = (
        "Conservative"
        if risk_persona == "TURTLE"
        else "Moderate"
        if risk_persona == "OWL"
        else "Aggressive"
        if risk_persona == "TIGER"
        else "Very Aggressive"
    )

    return {
        "riskPersona": risk_persona,
        "amountInr": round(amount, 2),
        "horizonMonths": horizon_months,
        "confidence": round(confidence, 2),
        "riskLevel": risk_level,
        "volatilityEstimate": round(portfolio_risk, 2),
        "educationalOnly": True,
        "nonBinding": True,
        "allocations": allocations,
        "warnings": warnings,
    }
