import type { NewsItem, TrustScoreResponse } from '@anylical/shared-types';
import { getDbClient } from './db.js';
import { trustBand } from '../utils/disclaimers.js';

export type StockExchange = 'NSE' | 'BSE' | 'NYSE';

export type StockCard = {
  symbol: string;
  name: string;
  sector: string;
  exchange: StockExchange;
  iconUrl: string | null;
};

export type StockSearchCard = StockCard & {
  latestPrice: number | null;
  trendPct: number | null;
};

export type StockOverview = StockCard & {
  latestPrice: number | null;
  previousClose: number | null;
  trendPct: number | null;
};

export type MarketSyncResult = {
  status: string;
  stocksUpserted: number;
  pricesUpserted: number;
  quotesResolved: number;
  tradingDate?: string;
};

export type MarketSyncStatus = {
  activeStocksCount: number;
  exchangeCounts: Record<StockExchange, number>;
  latestTradingDate: string | null;
  latestTradingDateRows: number;
  lastAdminSync: {
    at: string;
    userId: string | null;
    result: MarketSyncResult | null;
  } | null;
};

const fallbackUniverse: StockCard[] = [
  {
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries',
    sector: 'Energy',
    exchange: 'NSE',
    iconUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Reliance%20Industries',
  },
  {
    symbol: 'TCS.NS',
    name: 'Tata Consultancy Services',
    sector: 'Information Technology',
    exchange: 'NSE',
    iconUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=TCS',
  },
  {
    symbol: 'INFY.NS',
    name: 'Infosys',
    sector: 'Information Technology',
    exchange: 'NSE',
    iconUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Infosys',
  },
  {
    symbol: 'HDFCBANK.NS',
    name: 'HDFC Bank',
    sector: 'Financial Services',
    exchange: 'NSE',
    iconUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=HDFC%20Bank',
  },
  {
    symbol: 'ICICIBANK.NS',
    name: 'ICICI Bank',
    sector: 'Financial Services',
    exchange: 'NSE',
    iconUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=ICICI%20Bank',
  },
  {
    symbol: '500325.BO',
    name: 'Reliance Industries',
    sector: 'Energy',
    exchange: 'BSE',
    iconUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Reliance%20Industries',
  },
  {
    symbol: '532540.BO',
    name: 'Tata Consultancy Services',
    sector: 'Information Technology',
    exchange: 'BSE',
    iconUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=TCS',
  },
  {
    symbol: '500209.BO',
    name: 'Infosys',
    sector: 'Information Technology',
    exchange: 'BSE',
    iconUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Infosys',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    exchange: 'NYSE',
    iconUrl: 'https://assets.parqet.com/logos/symbol/AAPL?format=png',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    exchange: 'NYSE',
    iconUrl: 'https://assets.parqet.com/logos/symbol/MSFT?format=png',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Communication Services',
    exchange: 'NYSE',
    iconUrl: 'https://assets.parqet.com/logos/symbol/GOOGL?format=png',
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    sector: 'Consumer Discretionary',
    exchange: 'NYSE',
    iconUrl: 'https://assets.parqet.com/logos/symbol/AMZN?format=png',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    exchange: 'NYSE',
    iconUrl: 'https://assets.parqet.com/logos/symbol/NVDA?format=png',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Consumer Discretionary',
    exchange: 'NYSE',
    iconUrl: 'https://assets.parqet.com/logos/symbol/TSLA?format=png',
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financial Services',
    exchange: 'NYSE',
    iconUrl: 'https://assets.parqet.com/logos/symbol/JPM?format=png',
  },
  {
    symbol: 'WMT',
    name: 'Walmart Inc.',
    sector: 'Consumer Defensive',
    exchange: 'NYSE',
    iconUrl: 'https://assets.parqet.com/logos/symbol/WMT?format=png',
  },
];

function fallbackExchangeCounts(): Record<StockExchange, number> {
  return fallbackUniverse.reduce(
    (accumulator, row) => {
      accumulator[row.exchange] += 1;
      return accumulator;
    },
    { NSE: 0, BSE: 0, NYSE: 0 } as Record<StockExchange, number>,
  );
}

function stableValue(source: string, salt: string): number {
  const text = `${source}:${salt}`;
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash % 100);
}

function coerceExchange(value: unknown): StockExchange {
  if (value === 'BSE' || value === 'NYSE') return value;
  return 'NSE';
}

function defaultIconUrl(symbol: string, name: string, exchange: StockExchange): string {
  const root = encodeURIComponent(symbol.split('.')[0] ?? symbol);
  if (exchange === 'NYSE') {
    return `https://assets.parqet.com/logos/symbol/${root}?format=png`;
  }
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name || symbol)}`;
}

function fallbackPriceSnapshot(symbol: string): {
  latestPrice: number;
  previousClose: number;
  trendPct: number;
} {
  const latest = 40 + stableValue(symbol, 'latest') * 18.5;
  const trend = -4 + stableValue(symbol, 'trend') * 0.08;
  const previous = latest / (1 + trend / 100);
  return {
    latestPrice: Number(latest.toFixed(2)),
    previousClose: Number(previous.toFixed(2)),
    trendPct: Number(trend.toFixed(2)),
  };
}

async function loadPriceSnapshots(symbols: string[]): Promise<
  Map<
    string,
    {
      latestPrice: number | null;
      previousClose: number | null;
      trendPct: number | null;
    }
  >
> {
  const map = new Map<
    string,
    {
      latestPrice: number | null;
      previousClose: number | null;
      trendPct: number | null;
    }
  >();
  if (!symbols.length) return map;

  try {
    const db = getDbClient();
    const { data, error } = await db
      .from('historical_prices')
      .select('symbol,close')
      .in('symbol', symbols)
      .order('trading_date', { ascending: false });

    if (error || !data) {
      return map;
    }

    const state = new Map<string, { latest: number | null; previous: number | null }>();
    for (const row of data) {
      const latestState = state.get(row.symbol) ?? { latest: null, previous: null };
      const close = Number(row.close);
      if (!Number.isFinite(close)) {
        continue;
      }
      if (latestState.latest === null) {
        latestState.latest = close;
      } else if (latestState.previous === null) {
        latestState.previous = close;
      }
      state.set(row.symbol, latestState);
    }

    for (const [symbol, value] of state) {
      const latestPrice = value.latest;
      const previousClose = value.previous;
      const trendPct =
        latestPrice !== null && previousClose !== null && previousClose > 0
          ? Number((((latestPrice - previousClose) / previousClose) * 100).toFixed(2))
          : null;
      map.set(symbol, { latestPrice, previousClose, trendPct });
    }
  } catch {
    // DB unavailable
  }

  return map;
}

export async function searchStocks(
  query: string,
  sector?: string,
  page = 1,
  exchange?: StockExchange,
): Promise<StockSearchCard[]> {
  try {
    const db = getDbClient();
    let q = db
      .from('stocks')
      .select('symbol,name,sector,exchange,icon_url')
      .eq('is_active', true)
      .order('symbol', { ascending: true })
      .range((page - 1) * 20, page * 20 - 1);

    if (query) {
      q = q.or(`symbol.ilike.%${query}%,name.ilike.%${query}%`);
    }

    if (sector) {
      q = q.eq('sector', sector);
    }

    if (exchange) {
      q = q.eq('exchange', exchange);
    }

    const { data, error } = await q;
    if (error) throw error;

    const symbols = (data ?? []).map((row) => row.symbol);
    const priceMap = await loadPriceSnapshots(symbols);

    return (data ?? []).map((row) => {
      const normalizedExchange = coerceExchange(row.exchange);
      const snapshot = priceMap.get(row.symbol);
      const fallback = fallbackPriceSnapshot(row.symbol);

      return {
        symbol: row.symbol,
        name: row.name,
        sector: row.sector,
        exchange: normalizedExchange,
        iconUrl: row.icon_url ?? defaultIconUrl(row.symbol, row.name, normalizedExchange),
        latestPrice: snapshot?.latestPrice ?? fallback.latestPrice,
        trendPct: snapshot?.trendPct ?? fallback.trendPct,
      };
    });
  } catch {
    return fallbackUniverse
      .filter((stock) => {
        const matchQuery =
          !query ||
          stock.symbol.includes(query.toUpperCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase());
        const matchSector = !sector || stock.sector === sector;
        const matchExchange = !exchange || stock.exchange === exchange;
        return matchQuery && matchSector && matchExchange;
      })
      .slice((page - 1) * 20, page * 20)
      .map((stock) => {
        const snapshot = fallbackPriceSnapshot(stock.symbol);
        return {
          ...stock,
          iconUrl: stock.iconUrl ?? defaultIconUrl(stock.symbol, stock.name, stock.exchange),
          latestPrice: snapshot.latestPrice,
          trendPct: snapshot.trendPct,
        };
      });
  }
}

export async function getStockOverview(symbol: string): Promise<StockOverview | null> {
  try {
    const db = getDbClient();
    const { data: stock, error: stockError } = await db
      .from('stocks')
      .select('symbol,name,sector,exchange,icon_url')
      .eq('symbol', symbol)
      .single();

    if (stockError || !stock) {
      return null;
    }

    const { data: prices } = await db
      .from('historical_prices')
      .select('close')
      .eq('symbol', symbol)
      .order('trading_date', { ascending: false })
      .limit(2);

    const latest = Number(prices?.[0]?.close ?? NaN);
    const previous = Number(prices?.[1]?.close ?? NaN);
    const fallback = fallbackPriceSnapshot(symbol);
    const normalizedExchange = coerceExchange(stock.exchange);

    const latestPrice = Number.isFinite(latest) ? latest : fallback.latestPrice;
    const previousClose = Number.isFinite(previous) ? previous : fallback.previousClose;
    const trendPct =
      latestPrice && previousClose
        ? Number((((latestPrice - previousClose) / previousClose) * 100).toFixed(2))
        : fallback.trendPct;

    return {
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      exchange: normalizedExchange,
      iconUrl: stock.icon_url ?? defaultIconUrl(stock.symbol, stock.name, normalizedExchange),
      latestPrice,
      previousClose,
      trendPct,
    };
  } catch {
    const fallback = fallbackUniverse.find((x) => x.symbol === symbol);
    if (!fallback) return null;
    const snapshot = fallbackPriceSnapshot(symbol);
    return {
      ...fallback,
      iconUrl: fallback.iconUrl ?? defaultIconUrl(fallback.symbol, fallback.name, fallback.exchange),
      latestPrice: snapshot.latestPrice,
      previousClose: snapshot.previousClose,
      trendPct: snapshot.trendPct,
    };
  }
}

export async function getNewsForSymbol(symbol: string): Promise<NewsItem[]> {
  try {
    const db = getDbClient();
    const { data, error } = await db
      .from('news_items')
      .select(
        'id,symbol,source,title,url,published_at,sentiment,confidence,credibility_weight,is_duplicate',
      )
      .eq('symbol', symbol)
      .eq('is_duplicate', false)
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data ?? []).map((item) => ({
      id: item.id,
      symbol: item.symbol,
      source: item.source,
      title: item.title,
      url: item.url,
      publishedAt: item.published_at,
      sentiment: Number(item.sentiment),
      confidence: Number(item.confidence),
      credibilityWeight: Number(item.credibility_weight),
      isDuplicate: item.is_duplicate,
    }));
  } catch {
    return [];
  }
}

export async function getLatestSocial(symbol: string): Promise<{
  bullishPct: number;
  bearishPct: number;
  hypeVelocity: number;
  confidence: number;
  memeRiskFlag: boolean;
} | null> {
  try {
    const db = getDbClient();
    const { data, error } = await db
      .from('social_daily')
      .select('bullish_pct,bearish_pct,hype_velocity,confidence,meme_risk_flag')
      .eq('symbol', symbol)
      .order('as_of_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      bullishPct: Number(data.bullish_pct),
      bearishPct: Number(data.bearish_pct),
      hypeVelocity: Number(data.hype_velocity),
      confidence: Number(data.confidence),
      memeRiskFlag: data.meme_risk_flag,
    };
  } catch {
    return null;
  }
}

export async function getLatestTrustScore(symbol: string): Promise<TrustScoreResponse | null> {
  try {
    const db = getDbClient();
    const { data, error } = await db
      .from('trust_scores')
      .select(
        'as_of_date,trust_score,historical_score,financial_score,news_score,market_score,confidence,limited_data_flag,hype_penalty,explanation_json',
      )
      .eq('symbol', symbol)
      .order('as_of_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const explanationJson = (data.explanation_json ?? {}) as {
      explanations?: unknown;
      stale?: unknown;
    };
    const explanations = Array.isArray(explanationJson.explanations)
      ? explanationJson.explanations.map((item) => String(item))
      : ['Batch trust score loaded from nightly computation.'];

    const trustScore = Number(data.trust_score);
    return {
      symbol,
      asOfDate: String(data.as_of_date),
      trustScore,
      trustBand: trustBand(trustScore),
      confidence: Number(data.confidence),
      limitedData: Boolean(data.limited_data_flag),
      staleData: Boolean(explanationJson.stale ?? false),
      components: {
        historical: Number(data.historical_score),
        financial: Number(data.financial_score),
        news: Number(data.news_score),
        market: Number(data.market_score),
        hypePenalty: Number(data.hype_penalty),
      },
      explanations,
      disclaimers: [],
    };
  } catch {
    return null;
  }
}

export async function getMarketSyncStatus(): Promise<MarketSyncStatus> {
  try {
    const db = getDbClient();

    const [
      activeStocksResponse,
      nseCountResponse,
      bseCountResponse,
      nyseCountResponse,
      latestTradingDateResponse,
      lastAdminSyncResponse,
    ] = await Promise.all([
      db.from('stocks').select('symbol', { count: 'exact', head: true }).eq('is_active', true),
      db
        .from('stocks')
        .select('symbol', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('exchange', 'NSE'),
      db
        .from('stocks')
        .select('symbol', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('exchange', 'BSE'),
      db
        .from('stocks')
        .select('symbol', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('exchange', 'NYSE'),
      db
        .from('historical_prices')
        .select('trading_date')
        .order('trading_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('audit_events')
        .select('created_at,user_id,payload_json')
        .eq('event_type', 'admin.market_sync.triggered')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const latestTradingDate = latestTradingDateResponse.data?.trading_date
      ? String(latestTradingDateResponse.data.trading_date)
      : null;

    let latestTradingDateRows = 0;
    if (latestTradingDate) {
      const latestDateCountResponse = await db
        .from('historical_prices')
        .select('symbol', { count: 'exact', head: true })
        .eq('trading_date', latestTradingDate);
      latestTradingDateRows = latestDateCountResponse.count ?? 0;
    }

    const payload = (lastAdminSyncResponse.data?.payload_json ?? {}) as Record<string, unknown>;
    const syncEnvelope = (payload.syncResult ?? null) as Record<string, unknown> | null;
    const rawResult = (syncEnvelope?.result ?? null) as Record<string, unknown> | null;

    const parsedResult: MarketSyncResult | null =
      rawResult && typeof rawResult === 'object'
        ? {
            status: String(rawResult.status ?? 'unknown'),
            stocksUpserted: Number(rawResult.stocksUpserted ?? 0),
            pricesUpserted: Number(rawResult.pricesUpserted ?? 0),
            quotesResolved: Number(rawResult.quotesResolved ?? 0),
            tradingDate:
              typeof rawResult.tradingDate === 'string' ? rawResult.tradingDate : undefined,
          }
        : null;

    return {
      activeStocksCount: activeStocksResponse.count ?? 0,
      exchangeCounts: {
        NSE: nseCountResponse.count ?? 0,
        BSE: bseCountResponse.count ?? 0,
        NYSE: nyseCountResponse.count ?? 0,
      },
      latestTradingDate,
      latestTradingDateRows,
      lastAdminSync: lastAdminSyncResponse.data
        ? {
            at: String(lastAdminSyncResponse.data.created_at),
            userId: lastAdminSyncResponse.data.user_id ? String(lastAdminSyncResponse.data.user_id) : null,
            result: parsedResult,
          }
        : null,
    };
  } catch {
    return {
      activeStocksCount: fallbackUniverse.length,
      exchangeCounts: fallbackExchangeCounts(),
      latestTradingDate: null,
      latestTradingDateRows: 0,
      lastAdminSync: null,
    };
  }
}

export async function logAudit(
  eventType: string,
  payload: Record<string, unknown>,
  symbol?: string,
  userId?: string,
): Promise<void> {
  try {
    const db = getDbClient();
    await db.from('audit_events').insert({
      event_type: eventType,
      symbol,
      user_id: userId,
      payload_json: payload,
      model_version: String(payload.modelVersion ?? ''),
    });
  } catch {
    // best effort auditing
  }
}

export async function saveQuizResult(input: {
  userId: string;
  rawResponses: unknown;
  riskScore: number;
  persona: string;
  riskLevel: string;
  modelVersion: string;
}): Promise<void> {
  try {
    const db = getDbClient();
    await db.from('quiz_results').insert({
      user_id: input.userId,
      raw_responses: input.rawResponses,
      risk_score: input.riskScore,
      persona: input.persona,
      risk_level: input.riskLevel,
      model_version: input.modelVersion,
    });
  } catch {
    // best effort persistence
  }
}

export async function savePortfolio(input: {
  userId: string;
  riskPersona: string;
  amountInr: number;
  horizonMonths: number;
  confidence: number;
  riskLevel: string;
  volatilityEstimate: number;
  allocations: unknown;
  warnings: unknown;
  modelVersion: string;
}): Promise<void> {
  try {
    const db = getDbClient();
    await db.from('portfolios').insert({
      user_id: input.userId,
      risk_persona: input.riskPersona,
      amount_inr: input.amountInr,
      horizon_months: input.horizonMonths,
      confidence: input.confidence,
      risk_level: input.riskLevel,
      volatility_estimate: input.volatilityEstimate,
      allocations_json: input.allocations,
      warnings_json: input.warnings,
      model_version: input.modelVersion,
    });
  } catch {
    // best effort persistence
  }
}

export async function saveSip(input: {
  userId: string;
  monthlyBudgetInr: number;
  riskPersona: string;
  horizonMonths: number;
  expectedDrawdown: number;
  rebalanceTriggers: unknown;
  allocations: unknown;
  warnings: unknown;
  modelVersion: string;
}): Promise<void> {
  try {
    const db = getDbClient();
    await db.from('sip_plans').insert({
      user_id: input.userId,
      monthly_budget_inr: input.monthlyBudgetInr,
      risk_persona: input.riskPersona,
      horizon_months: input.horizonMonths,
      expected_drawdown: input.expectedDrawdown,
      rebalance_triggers_json: input.rebalanceTriggers,
      allocations_json: input.allocations,
      warnings_json: input.warnings,
      model_version: input.modelVersion,
    });
  } catch {
    // best effort persistence
  }
}

export async function getWatchlist(userId: string): Promise<string[]> {
  try {
    const db = getDbClient();
    const { data, error } = await db.from('watchlists').select('symbol').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map((item) => item.symbol);
  } catch {
    return [];
  }
}

export async function addWatchlist(userId: string, symbol: string): Promise<void> {
  const db = getDbClient();
  await db.from('watchlists').upsert({ user_id: userId, symbol }, { onConflict: 'user_id,symbol' });
}

export async function removeWatchlist(userId: string, symbol: string): Promise<void> {
  const db = getDbClient();
  await db.from('watchlists').delete().eq('user_id', userId).eq('symbol', symbol);
}

export async function saveDonation(input: {
  userId?: string;
  amountInr: number;
  tier: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  status: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = getDbClient();
    const payload = {
      user_id: input.userId,
      amount_inr: input.amountInr,
      tier: input.tier,
      provider: 'razorpay',
      provider_payment_id: input.providerPaymentId,
      provider_order_id: input.providerOrderId,
      status: input.status,
      metadata_json: input.metadata ?? {},
    };

    if (input.providerPaymentId) {
      await db.from('donations').upsert(payload, { onConflict: 'provider_payment_id' });
      return;
    }

    await db.from('donations').insert(payload);
  } catch {
    // best effort persistence
  }
}
