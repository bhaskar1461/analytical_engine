from __future__ import annotations

from datetime import date
from time import perf_counter

from fastapi import Depends, FastAPI, Request, Response

from .engines.portfolio import generate_portfolio
from .engines.quiz import score_quiz
from .engines.sip import generate_sip_plan
from .engines.trust_score import compute_trust_score
from .jobs import market_sync
from .providers.reddit import fetch_social_features
from .schemas import (
    PortfolioPlan,
    PortfolioRequest,
    QuizScoreRequest,
    RiskProfile,
    SipPlan,
    SipRequest,
    SocialSnapshot,
    TrustScoreResponse,
)
from .security import verify_admin_sync_key, verify_internal_token
from .telemetry import schedule_event, schedule_exception

app = FastAPI(
    title="Anylical Intelligence Service",
    version="0.1.0",
    description="Deterministic AI-assisted analytics engines (educational only)",
)

SLOW_REQUEST_MS = 1200


@app.middleware("http")
async def telemetry_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
    start = perf_counter()
    try:
        response: Response = await call_next(request)
    except Exception as exc:
        schedule_exception(
            exc,
            {
                "path": request.url.path,
                "method": request.method,
            },
        )
        raise

    duration_ms = round((perf_counter() - start) * 1000, 2)
    response.headers["x-response-time-ms"] = str(duration_ms)

    if request.url.path != "/health":
        schedule_event(
            "intelligence.request",
            {
                "path": request.url.path,
                "method": request.method,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "level": "warn" if duration_ms > SLOW_REQUEST_MS else "info",
            },
        )

    return response


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "intelligence",
        "date": date.today().isoformat(),
    }


@app.get("/v1/trust-score/{symbol}", response_model=TrustScoreResponse, dependencies=[Depends(verify_internal_token)])
async def trust_score(symbol: str) -> TrustScoreResponse:
    return await compute_trust_score(symbol.upper())


@app.get("/v1/social/{symbol}", response_model=SocialSnapshot, dependencies=[Depends(verify_internal_token)])
async def social_snapshot(symbol: str) -> SocialSnapshot:
    features = await fetch_social_features(symbol.upper())
    return SocialSnapshot(
        symbol=symbol.upper(),
        asOfDate=date.today().isoformat(),
        bullishPct=float(features["bullish_pct"]),
        bearishPct=float(features["bearish_pct"]),
        hypeVelocity=float(features["hype_velocity"]),
        confidence=float(features["confidence"]),
        memeRiskFlag=bool(features["meme_risk_flag"]),
        staleData=bool(features["stale"]),
    )


@app.post("/v1/quiz/score", response_model=RiskProfile, dependencies=[Depends(verify_internal_token)])
def quiz_score(payload: QuizScoreRequest) -> RiskProfile:
    normalized = [answer.model_dump() for answer in payload.answers]
    return score_quiz(normalized)


@app.post("/v1/portfolio/generate", response_model=PortfolioPlan, dependencies=[Depends(verify_internal_token)])
def portfolio_generate(payload: PortfolioRequest) -> PortfolioPlan:
    data = generate_portfolio(payload.riskPersona, payload.amount, payload.horizonMonths)
    return PortfolioPlan(**data)


@app.post("/v1/sip/generate", response_model=SipPlan, dependencies=[Depends(verify_internal_token)])
def sip_generate(payload: SipRequest) -> SipPlan:
    data = generate_sip_plan(payload.monthlyBudget, payload.riskPersona, payload.horizonMonths)
    return SipPlan(**data)


@app.post(
    "/v1/admin/market-sync",
    dependencies=[Depends(verify_internal_token), Depends(verify_admin_sync_key)],
)
async def admin_market_sync() -> dict[str, object]:
    result = await market_sync.run()
    return {
        "status": "ok",
        "job": "market_sync",
        "result": result,
    }
