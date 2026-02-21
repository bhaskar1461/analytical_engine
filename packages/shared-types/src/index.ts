export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type TrustBand = 'STRONG' | 'WATCH' | 'RISKY' | 'AVOID';

export type TrustScoreResponse = {
  symbol: string;
  asOfDate: string;
  trustScore: number;
  trustBand: TrustBand;
  confidence: number;
  limitedData: boolean;
  staleData: boolean;
  components: {
    historical: number;
    financial: number;
    news: number;
    market: number;
    hypePenalty: number;
  };
  explanations: string[];
  disclaimers: string[];
};

export type NewsItem = {
  id: string;
  symbol: string;
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  sentiment: number;
  confidence: number;
  credibilityWeight: number;
  isDuplicate: boolean;
};

export type SocialSnapshot = {
  symbol: string;
  asOfDate: string;
  bullishPct: number;
  bearishPct: number;
  hypeVelocity: number;
  confidence: number;
  memeRiskFlag: boolean;
  staleData: boolean;
};

export type RiskPersona = 'TURTLE' | 'OWL' | 'TIGER' | 'FALCON';

export type RiskProfile = {
  riskScore: number;
  persona: RiskPersona;
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'VERY_AGGRESSIVE';
  warnings: string[];
  modelVersion: string;
};

export type AllocationItem = {
  symbol: string;
  label: string;
  sector: string;
  weightPct: number;
  expectedVolatility: number;
  trustScore: number;
};

export type PortfolioPlan = {
  riskPersona: RiskPersona;
  amountInr: number;
  horizonMonths: number;
  confidence: number;
  riskLevel: string;
  volatilityEstimate: number;
  educationalOnly: true;
  nonBinding: true;
  allocations: AllocationItem[];
  warnings: string[];
  disclaimers: string[];
};

export type SipPlan = {
  monthlyBudgetInr: number;
  riskPersona: RiskPersona;
  horizonMonths: number;
  expectedDrawdown: number;
  rebalanceTriggers: string[];
  allocations: AllocationItem[];
  warnings: string[];
  disclaimers: string[];
};
