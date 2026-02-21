import type { FastifyPluginAsync } from 'fastify';
import type { NewsItem, SocialSnapshot, TrustScoreResponse } from '@anylical/shared-types';
import { SearchStocksQuerySchema, SymbolParamsSchema } from '../schemas/http.js';
import { withCache } from '../services/cache.js';
import { fetchSocialSnapshot, fetchTrustScore } from '../services/intelligence-client.js';
import {
  getLatestSocial,
  getLatestTrustScore,
  getNewsForSymbol,
  getStockOverview,
  searchStocks,
} from '../services/stock-service.js';
import { mandatoryDisclaimers } from '../utils/disclaimers.js';

const TRUST_SCORE_CACHE_SECONDS = 6 * 60 * 60;
const NEWS_CACHE_SECONDS = 15 * 60;
const SOCIAL_CACHE_SECONDS = 10 * 60;
const NEWS_STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000;
const SEARCH_CACHE_SECONDS = 60;
const STOCK_OVERVIEW_CACHE_SECONDS = 5 * 60;

function setCacheHeaders(
  reply: { header: (name: string, value: string) => unknown },
  seconds: number,
) {
  reply.header(
    'cache-control',
    `public, max-age=${Math.max(0, Math.floor(seconds / 2))}, s-maxage=${seconds}, stale-while-revalidate=${seconds}`,
  );
}

function stableValue(symbol: string, salt: string): number {
  const source = `${symbol}:${salt}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash % 100);
}

function trustFallback(symbol: string): TrustScoreResponse {
  const base = 40 + stableValue(symbol, 'trust') * 0.35;
  return {
    symbol,
    asOfDate: new Date().toISOString().slice(0, 10),
    trustScore: Number(base.toFixed(2)),
    trustBand: base >= 80 ? 'STRONG' : base >= 60 ? 'WATCH' : base >= 40 ? 'RISKY' : 'AVOID',
    confidence: 35,
    limitedData: true,
    staleData: true,
    components: {
      historical: Number((45 + stableValue(symbol, 'hist') * 0.2).toFixed(2)),
      financial: Number((48 + stableValue(symbol, 'fin') * 0.2).toFixed(2)),
      news: Number((50 + stableValue(symbol, 'news') * 0.1).toFixed(2)),
      market: Number((46 + stableValue(symbol, 'market') * 0.2).toFixed(2)),
      hypePenalty: 0,
    },
    explanations: [
      'Primary intelligence service is temporarily unavailable.',
      'Fallback deterministic estimate is shown for continuity.',
      'Limited historical data - confidence reduced.',
    ],
    disclaimers: mandatoryDisclaimers(),
  };
}

export function isNewsFeedStale(news: NewsItem[], now = Date.now()): boolean {
  if (news.length === 0) {
    return true;
  }

  const latestPublishedAt = Date.parse(news[0]?.publishedAt ?? '');
  if (Number.isNaN(latestPublishedAt)) {
    return true;
  }

  return now - latestPublishedAt > NEWS_STALE_THRESHOLD_MS;
}

export const stockRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/stocks/search',
    {
      schema: {
        summary: 'Search stocks',
        tags: ['stocks'],
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string' },
            sector: { type: 'string' },
            exchange: { type: 'string', enum: ['NSE', 'BSE', 'NYSE'] },
            page: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = SearchStocksQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_QUERY', message: parsed.error.message });
      }

      const rows = await searchStocks(
        parsed.data.q,
        parsed.data.sector,
        parsed.data.page,
        parsed.data.exchange,
      );
      setCacheHeaders(reply, SEARCH_CACHE_SECONDS);
      return {
        data: rows,
        disclaimers: mandatoryDisclaimers(),
      };
    },
  );

  app.get(
    '/api/stocks/:symbol',
    {
      schema: {
        summary: 'Get stock overview',
        tags: ['stocks'],
        params: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = SymbolParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_SYMBOL', message: parsed.error.message });
      }

      const overview = await getStockOverview(parsed.data.symbol);
      if (!overview) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Stock not found' });
      }

      setCacheHeaders(reply, STOCK_OVERVIEW_CACHE_SECONDS);
      return {
        data: overview,
        disclaimers: mandatoryDisclaimers(),
      };
    },
  );

  app.get(
    '/api/stocks/:symbol/trust-score',
    {
      schema: {
        summary: 'Get trust score',
        tags: ['stocks'],
        params: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = SymbolParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_SYMBOL', message: parsed.error.message });
      }

      const key = `trust:${parsed.data.symbol}`;
      const { data, stale } = await withCache<TrustScoreResponse>(
        key,
        TRUST_SCORE_CACHE_SECONDS,
        async () => {
          const fromDb = await getLatestTrustScore(parsed.data.symbol);
          if (fromDb) {
            return fromDb;
          }

          try {
            return await fetchTrustScore(parsed.data.symbol);
          } catch {
            return trustFallback(parsed.data.symbol);
          }
        },
      );

      setCacheHeaders(reply, TRUST_SCORE_CACHE_SECONDS);
      return {
        data: {
          ...data,
          staleData: stale || data.staleData,
          disclaimers: mandatoryDisclaimers(),
        },
      };
    },
  );

  app.get(
    '/api/stocks/:symbol/news',
    {
      schema: {
        summary: 'Get stock news sentiment feed',
        tags: ['stocks'],
        params: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = SymbolParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_SYMBOL', message: parsed.error.message });
      }

      const key = `news:${parsed.data.symbol}`;
      const { data, stale } = await withCache<NewsItem[]>(key, NEWS_CACHE_SECONDS, async () =>
        getNewsForSymbol(parsed.data.symbol),
      );

      setCacheHeaders(reply, NEWS_CACHE_SECONDS);
      return {
        data,
        staleData: stale || isNewsFeedStale(data),
        disclaimers: mandatoryDisclaimers(),
      };
    },
  );

  app.get(
    '/api/stocks/:symbol/social',
    {
      schema: {
        summary: 'Get social sentiment snapshot',
        tags: ['stocks'],
        params: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = SymbolParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_SYMBOL', message: parsed.error.message });
      }

      const key = `social:${parsed.data.symbol}`;
      try {
        const { data, stale } = await withCache<SocialSnapshot>(
          key,
          SOCIAL_CACHE_SECONDS,
          async () => {
            try {
              return await fetchSocialSnapshot(parsed.data.symbol);
            } catch {
              const local = await getLatestSocial(parsed.data.symbol);
              if (!local) {
                throw new Error('No social data');
              }

              return {
                symbol: parsed.data.symbol,
                asOfDate: new Date().toISOString().slice(0, 10),
                bullishPct: local.bullishPct,
                bearishPct: local.bearishPct,
                hypeVelocity: local.hypeVelocity,
                confidence: local.confidence,
                memeRiskFlag: local.memeRiskFlag,
                staleData: true,
              };
            }
          },
        );

        setCacheHeaders(reply, SOCIAL_CACHE_SECONDS);
        return {
          data: {
            ...data,
            staleData: stale || data.staleData,
          },
          disclaimers: mandatoryDisclaimers(),
        };
      } catch {
        const bullish = 45 + stableValue(parsed.data.symbol, 'bullish') * 0.2;
        setCacheHeaders(reply, SOCIAL_CACHE_SECONDS);
        return {
          data: {
            symbol: parsed.data.symbol,
            asOfDate: new Date().toISOString().slice(0, 10),
            bullishPct: Number(bullish.toFixed(2)),
            bearishPct: Number((100 - bullish).toFixed(2)),
            hypeVelocity: Number((stableValue(parsed.data.symbol, 'velocity') * 1.1).toFixed(2)),
            confidence: 30,
            memeRiskFlag: false,
            staleData: true,
          },
          disclaimers: mandatoryDisclaimers(),
        };
      }
    },
  );
};
