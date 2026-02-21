import type {
  PortfolioPlan,
  RiskProfile,
  SipPlan,
  SocialSnapshot,
  TrustScoreResponse,
} from '@anylical/shared-types';
import { env } from '../config/env.js';

async function callIntelligence<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.INTELLIGENCE_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      'x-internal-token': env.API_INTERNAL_TOKEN,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Intelligence service error (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

export async function fetchTrustScore(symbol: string): Promise<TrustScoreResponse> {
  return callIntelligence<TrustScoreResponse>(`/v1/trust-score/${encodeURIComponent(symbol)}`);
}

export async function fetchSocialSnapshot(symbol: string): Promise<SocialSnapshot> {
  return callIntelligence<SocialSnapshot>(`/v1/social/${encodeURIComponent(symbol)}`);
}

export async function generateRiskProfile(answers: unknown): Promise<RiskProfile> {
  return callIntelligence<RiskProfile>('/v1/quiz/score', {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export async function generatePortfolio(input: {
  riskPersona: string;
  amount: number;
  horizonMonths: number;
}): Promise<PortfolioPlan> {
  return callIntelligence<PortfolioPlan>('/v1/portfolio/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function generateSipPlan(input: {
  monthlyBudget: number;
  riskPersona: string;
  horizonMonths: number;
}): Promise<SipPlan> {
  return callIntelligence<SipPlan>('/v1/sip/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function triggerMarketSync(adminSyncKey: string): Promise<{
  status: string;
  job: string;
  result: {
    status: string;
    stocksUpserted: number;
    pricesUpserted: number;
    quotesResolved: number;
    tradingDate?: string;
  };
}> {
  return callIntelligence<{
    status: string;
    job: string;
    result: {
      status: string;
      stocksUpserted: number;
      pricesUpserted: number;
      quotesResolved: number;
      tradingDate?: string;
    };
  }>('/v1/admin/market-sync', {
    method: 'POST',
    headers: {
      'x-admin-key': adminSyncKey,
    },
  });
}
