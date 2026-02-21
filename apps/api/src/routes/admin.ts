import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';
import { optionalAuth } from '../plugins/auth.js';
import { triggerMarketSync } from '../services/intelligence-client.js';
import { getMarketSyncStatus, logAudit } from '../services/stock-service.js';

function extractAdminKey(header: string | string[] | undefined): string {
  if (Array.isArray(header)) {
    return (header[0] ?? '').trim();
  }
  return (header ?? '').trim();
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/admin/sync/market-universe/status',
    {
      schema: {
        summary: 'Get latest market universe sync status',
        tags: ['admin'],
      },
    },
    async (request, reply) => {
      await optionalAuth(request);

      const providedKey = extractAdminKey(request.headers['x-admin-key']);
      if (!providedKey || providedKey !== env.ADMIN_SYNC_KEY) {
        return reply.status(401).send({
          code: 'UNAUTHORIZED',
          message: 'Invalid admin sync key.',
        });
      }

      const status = await getMarketSyncStatus();
      return {
        ok: true,
        data: status,
      };
    },
  );

  app.post(
    '/api/admin/sync/market-universe',
    {
      schema: {
        summary: 'Trigger market universe sync (NSE/BSE/NYSE)',
        tags: ['admin'],
      },
    },
    async (request, reply) => {
      await optionalAuth(request);

      const providedKey = extractAdminKey(request.headers['x-admin-key']);
      if (!providedKey || providedKey !== env.ADMIN_SYNC_KEY) {
        return reply.status(401).send({
          code: 'UNAUTHORIZED',
          message: 'Invalid admin sync key.',
        });
      }

      try {
        const syncResult = await triggerMarketSync(providedKey);
        await logAudit(
          'admin.market_sync.triggered',
          {
            modelVersion: 'admin-sync-v1.0.0',
            syncResult,
          },
          undefined,
          request.authUser?.id,
        );

        return {
          ok: true,
          data: syncResult,
        };
      } catch (cause) {
        await logAudit(
          'admin.market_sync.failed',
          {
            modelVersion: 'admin-sync-v1.0.0',
            reason: cause instanceof Error ? cause.message : 'unknown_error',
          },
          undefined,
          request.authUser?.id,
        );

        return reply.status(502).send({
          code: 'SYNC_FAILED',
          message: cause instanceof Error ? cause.message : 'Unable to run market sync job.',
        });
      }
    },
  );
};
