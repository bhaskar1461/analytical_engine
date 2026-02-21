from __future__ import annotations

from pydantic import BaseModel, Field


MANDATORY_DISCLAIMERS = [
    "Educational purposes only.",
    "This is not financial advice.",
    "Market risks are involved in all investments.",
    "No guaranteed returns.",
]


class TrustComponents(BaseModel):
    historical: float = Field(ge=0, le=100)
    financial: float = Field(ge=0, le=100)
    news: float = Field(ge=0, le=100)
    market: float = Field(ge=0, le=100)
    hypePenalty: float = Field(ge=0)


class TrustScoreResponse(BaseModel):
    symbol: str
    asOfDate: str
    trustScore: float = Field(ge=0, le=100)
    trustBand: str
    confidence: float = Field(ge=0, le=100)
    limitedData: bool
    staleData: bool
    components: TrustComponents
    explanations: list[str]
    disclaimers: list[str] = Field(default_factory=lambda: MANDATORY_DISCLAIMERS.copy())


class SocialSnapshot(BaseModel):
    symbol: str
    asOfDate: str
    bullishPct: float = Field(ge=0, le=100)
    bearishPct: float = Field(ge=0, le=100)
    hypeVelocity: float = Field(ge=0)
    confidence: float = Field(ge=0, le=100)
    memeRiskFlag: bool
    staleData: bool = False


class QuizAnswer(BaseModel):
    section: str
    value: float = Field(ge=0, le=100)


class QuizScoreRequest(BaseModel):
    answers: list[QuizAnswer]


class RiskProfile(BaseModel):
    riskScore: float = Field(ge=0, le=100)
    persona: str
    riskLevel: str
    warnings: list[str]
    modelVersion: str = "quiz-v1.0.0"


class AllocationItem(BaseModel):
    symbol: str
    label: str
    sector: str
    weightPct: float = Field(ge=0, le=100)
    expectedVolatility: float = Field(ge=0)
    trustScore: float = Field(ge=0, le=100)


class PortfolioRequest(BaseModel):
    riskPersona: str
    amount: float = Field(gt=0)
    horizonMonths: int = Field(gt=0)


class PortfolioPlan(BaseModel):
    riskPersona: str
    amountInr: float
    horizonMonths: int
    confidence: float = Field(ge=0, le=100)
    riskLevel: str
    volatilityEstimate: float = Field(ge=0)
    educationalOnly: bool = True
    nonBinding: bool = True
    allocations: list[AllocationItem]
    warnings: list[str]
    disclaimers: list[str] = Field(default_factory=lambda: MANDATORY_DISCLAIMERS.copy())


class SipRequest(BaseModel):
    monthlyBudget: float = Field(gt=0)
    riskPersona: str
    horizonMonths: int = Field(gt=0)


class SipPlan(BaseModel):
    monthlyBudgetInr: float
    riskPersona: str
    horizonMonths: int
    expectedDrawdown: float = Field(ge=0)
    rebalanceTriggers: list[str]
    allocations: list[AllocationItem]
    warnings: list[str]
    disclaimers: list[str] = Field(default_factory=lambda: MANDATORY_DISCLAIMERS.copy())
