import type {
  NewsItem,
  PortfolioPlan,
  RiskProfile,
  SipPlan,
  SocialSnapshot,
  TrustScoreResponse,
} from '@anylical/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type ApiResponse<T> = {
  data: T;
  staleData?: boolean;
  disclaimers?: string[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...(method === 'GET'
      ? {
          next: { revalidate: 300 },
        }
      : {}),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function searchStocks(
  query: string,
  options?: {
    sector?: string;
    exchange?: 'NSE' | 'BSE' | 'NYSE';
    page?: number;
  },
): Promise<
  ApiResponse<
    Array<{
      symbol: string;
      name: string;
      sector: string;
      exchange: 'NSE' | 'BSE' | 'NYSE';
      iconUrl: string | null;
      latestPrice: number | null;
      trendPct: number | null;
    }>
  >
> {
  const params = new URLSearchParams({ q: query });
  if (options?.sector) params.set('sector', options.sector);
  if (options?.exchange) params.set('exchange', options.exchange);
  if (typeof options?.page === 'number') params.set('page', String(options.page));
  return request<
    ApiResponse<
      Array<{
        symbol: string;
        name: string;
        sector: string;
        exchange: 'NSE' | 'BSE' | 'NYSE';
        iconUrl: string | null;
        latestPrice: number | null;
        trendPct: number | null;
      }>
    >
  >(
    `/api/stocks/search?${params.toString()}`,
  );
}

export async function getStock(symbol: string): Promise<
  ApiResponse<{
    symbol: string;
    name: string;
    sector: string;
    exchange: 'NSE' | 'BSE' | 'NYSE';
    iconUrl: string | null;
    latestPrice: number | null;
    trendPct: number | null;
  }>
> {
  return request<
    ApiResponse<{
      symbol: string;
      name: string;
      sector: string;
      exchange: 'NSE' | 'BSE' | 'NYSE';
      iconUrl: string | null;
      latestPrice: number | null;
      trendPct: number | null;
    }>
  >(`/api/stocks/${encodeURIComponent(symbol)}`);
}

export async function getTrustScore(symbol: string): Promise<ApiResponse<TrustScoreResponse>> {
  return request<ApiResponse<TrustScoreResponse>>(
    `/api/stocks/${encodeURIComponent(symbol)}/trust-score`,
  );
}

export async function getNews(symbol: string): Promise<ApiResponse<NewsItem[]>> {
  return request<ApiResponse<NewsItem[]>>(`/api/stocks/${encodeURIComponent(symbol)}/news`);
}

export async function getSocial(symbol: string): Promise<ApiResponse<SocialSnapshot>> {
  return request<ApiResponse<SocialSnapshot>>(`/api/stocks/${encodeURIComponent(symbol)}/social`);
}

export async function submitQuiz(
  answers: Array<{ section: string; value: number | undefined }>,
  token?: string,
): Promise<ApiResponse<RiskProfile>> {
  return request<ApiResponse<RiskProfile>>('/api/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({ answers }),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function generatePortfolio(
  payload: {
    risk_persona: 'TURTLE' | 'OWL' | 'TIGER' | 'FALCON';
    amount: number;
    horizon_months: number;
  },
  token?: string,
): Promise<ApiResponse<PortfolioPlan>> {
  return request<ApiResponse<PortfolioPlan>>('/api/portfolio/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function generateSip(
  payload: {
    monthly_budget: number;
    risk_persona: 'TURTLE' | 'OWL' | 'TIGER' | 'FALCON';
    horizon_months: number;
  },
  token?: string,
): Promise<ApiResponse<SipPlan>> {
  return request<ApiResponse<SipPlan>>('/api/sip/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function createDonationLink(
  payload: {
    amount_inr: number;
    tier: 'SUPPORTER' | 'INSIDER' | 'BACKER' | 'FOUNDING_MEMBER';
  },
  token?: string,
): Promise<
  ApiResponse<{
    provider: string;
    keyId: string;
    amountPaise: number;
    currency: string;
    description: string;
    paymentUrl?: string | null;
    paymentLinkId?: string | null;
  }>
> {
  return request<
    ApiResponse<{
      provider: string;
      keyId: string;
      amountPaise: number;
      currency: string;
      description: string;
      paymentUrl?: string | null;
      paymentLinkId?: string | null;
    }>
  >('/api/donate/create-link', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function getWatchlist(token: string): Promise<ApiResponse<string[]>> {
  return request<ApiResponse<string[]>>('/api/user/watchlist', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function addToWatchlist(symbol: string, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/user/watchlist', {
    method: 'POST',
    body: JSON.stringify({ symbol }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function removeFromWatchlist(symbol: string, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/user/watchlist', {
    method: 'DELETE',
    body: JSON.stringify({ symbol }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function triggerMarketUniverseSync(adminKey: string): Promise<{
  ok: boolean;
  data: {
    status: string;
    job: string;
    result: {
      status: string;
      stocksUpserted: number;
      pricesUpserted: number;
      quotesResolved: number;
      tradingDate?: string;
    };
  };
}> {
  return request<{
    ok: boolean;
    data: {
      status: string;
      job: string;
      result: {
        status: string;
        stocksUpserted: number;
        pricesUpserted: number;
        quotesResolved: number;
        tradingDate?: string;
      };
    };
  }>('/api/admin/sync/market-universe', {
    method: 'POST',
    headers: {
      'x-admin-key': adminKey,
    },
  });
}

export async function getMarketUniverseSyncStatus(adminKey: string): Promise<{
  ok: boolean;
  data: {
    activeStocksCount: number;
    exchangeCounts: {
      NSE: number;
      BSE: number;
      NYSE: number;
    };
    latestTradingDate: string | null;
    latestTradingDateRows: number;
    lastAdminSync: {
      at: string;
      userId: string | null;
      result: {
        status: string;
        stocksUpserted: number;
        pricesUpserted: number;
        quotesResolved: number;
        tradingDate?: string;
      } | null;
    } | null;
  };
}> {
  return request<{
    ok: boolean;
    data: {
      activeStocksCount: number;
      exchangeCounts: {
        NSE: number;
        BSE: number;
        NYSE: number;
      };
      latestTradingDate: string | null;
      latestTradingDateRows: number;
      lastAdminSync: {
        at: string;
        userId: string | null;
        result: {
          status: string;
          stocksUpserted: number;
          pricesUpserted: number;
          quotesResolved: number;
          tradingDate?: string;
        } | null;
      } | null;
    };
  }>('/api/admin/sync/market-universe/status', {
    method: 'GET',
    headers: {
      'x-admin-key': adminKey,
    },
  });
}
