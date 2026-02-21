from __future__ import annotations

from datetime import date

from .common import clamp, stable_score
from .language import sanitize_text
from .social import social_hype_penalty
from ..providers.newsapi import fetch_news_features
from ..providers.reddit import fetch_social_features
from ..providers.yahoo import fetch_market_features
from ..schemas import TrustComponents, TrustScoreResponse


def _trust_band(score: float) -> str:
    if score >= 80:
        return "STRONG"
    if score >= 60:
        return "WATCH"
    if score >= 40:
        return "RISKY"
    return "AVOID"


async def compute_trust_score(
    symbol: str,
    previous_score: float | None = None,
    as_of_date: date | None = None,
) -> TrustScoreResponse:
    market = await fetch_market_features(symbol)
    news = await fetch_news_features(symbol)
    social = await fetch_social_features(symbol)

    historical_score = float(market["historical_score"])
    market_score = float(market["market_score"])
    volatility = float(market["volatility"])
    history_years = float(market["history_years"])

    financial_score = stable_score(symbol, 45, 88, "financial")

    news_score = float(news["news_score"])
    news_confidence = float(news["confidence"])

    if bool(news["low_confidence"]):
        # low-confidence sentiment impact is dampened and blended with neutral score
        news_score = round(news_score * 0.4 + 50 * 0.6, 2)

    social_confidence = float(social["confidence"])
    meme_risk_flag = bool(social["meme_risk_flag"])
    hype_velocity = float(social["hype_velocity"])

    raw = (
        0.30 * historical_score
        + 0.25 * financial_score
        + 0.25 * news_score
        + 0.20 * market_score
    )

    hype_penalty = social_hype_penalty(hype_velocity, meme_risk_flag, social_confidence)

    # social sentiment cannot force trust score above 80; only hype penalty can reduce score
    adjusted = raw - hype_penalty

    limited_data = history_years < 2
    confidence = (
        0.40 * min(history_years / 5, 1)
        + 0.30 * (news_confidence / 100)
        + 0.30 * (social_confidence / 100)
    ) * 100

    if limited_data:
        adjusted *= 0.78
        confidence *= 0.72

    # volatility dampener
    if volatility > 30:
        adjusted -= min((volatility - 30) * 0.6, 10)

    # news spike protection
    if bool(news["spike_detected"]):
        adjusted -= 3

    prior = (
        float(previous_score)
        if previous_score is not None
        else stable_score(symbol, 38, 84, "previous-day")
    )
    capped_delta = clamp(adjusted - prior, -10, 10)
    trust_today = clamp(prior + capped_delta, 0, 100)

    # hard upper-bound under hype condition
    if meme_risk_flag and trust_today > 80:
        trust_today = 80.0

    stale_data = bool(market["stale"] or news["stale"] or social["stale"])

    explanations = [
        sanitize_text(f"Data suggests historical stability score of {historical_score:.1f}."),
        sanitize_text(f"Financial strength model indicates {financial_score:.1f}."),
        sanitize_text(f"News sentiment contributes {news_score:.1f} with confidence {news_confidence:.1f}."),
        sanitize_text(f"Observed market behavior contributes {market_score:.1f} with volatility {volatility:.1f}."),
    ]

    if limited_data:
        explanations.append("Limited historical data - confidence reduced.")
    if meme_risk_flag:
        explanations.append("High hype risk detected; sentiment impact is dampened.")
    explanations.append(f"Daily stability cap applied using prior trust score {prior:.1f}.")

    return TrustScoreResponse(
        symbol=symbol,
        asOfDate=(as_of_date or date.today()).isoformat(),
        trustScore=round(trust_today, 2),
        trustBand=_trust_band(trust_today),
        confidence=round(clamp(confidence, 15, 98), 2),
        limitedData=limited_data,
        staleData=stale_data,
        components=TrustComponents(
            historical=round(historical_score, 2),
            financial=round(financial_score, 2),
            news=round(news_score, 2),
            market=round(market_score, 2),
            hypePenalty=round(hype_penalty, 2),
        ),
        explanations=explanations,
    )
