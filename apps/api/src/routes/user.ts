import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../plugins/auth.js';
import { WatchlistMutationSchema } from '../schemas/http.js';
import { addWatchlist, getWatchlist, removeWatchlist } from '../services/stock-service.js';

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/user/watchlist',
    {
      schema: {
        summary: 'Get user watchlist',
        tags: ['user'],
      },
    },
    async (request, reply) => {
      await requireAuth(request, reply);
      if (!request.authUser?.id) return;

      const symbols = await getWatchlist(request.authUser.id);
      return { data: symbols };
    },
  );

  app.post(
    '/api/user/watchlist',
    {
      schema: {
        summary: 'Add stock to watchlist',
        tags: ['user'],
      },
    },
    async (request, reply) => {
      await requireAuth(request, reply);
      if (!request.authUser?.id) return;

      const parsed = WatchlistMutationSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_PAYLOAD', message: parsed.error.message });
      }

      await addWatchlist(request.authUser.id, parsed.data.symbol.toUpperCase());
      return { ok: true };
    },
  );

  app.delete(
    '/api/user/watchlist',
    {
      schema: {
        summary: 'Remove stock from watchlist',
        tags: ['user'],
      },
    },
    async (request, reply) => {
      await requireAuth(request, reply);
      if (!request.authUser?.id) return;

      const parsed = WatchlistMutationSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_PAYLOAD', message: parsed.error.message });
      }

      await removeWatchlist(request.authUser.id, parsed.data.symbol.toUpperCase());
      return { ok: true };
    },
  );
};
