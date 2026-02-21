import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';
import { getCacheStats } from '../services/cache.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/health',
    {
      schema: {
        summary: 'Health check',
        tags: ['health'],
      },
    },
    async () => {
      return {
        status: 'ok',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        dependencies: {
          supabaseConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
          upstashConfigured: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
          sentryConfigured: Boolean(env.SENTRY_DSN),
          posthogConfigured: Boolean(env.POSTHOG_KEY),
        },
        cache: getCacheStats(),
      };
    },
  );
};
