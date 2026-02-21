import type { FastifyReply, FastifyRequest } from 'fastify';
import { getDbClient } from '../services/db.js';

async function parseUserFromToken(token: string): Promise<{ id: string; email?: string } | null> {
  try {
    const db = getDbClient();
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email,
    };
  } catch {
    return null;
  }
}

export async function optionalAuth(request: FastifyRequest): Promise<void> {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return;
  }

  const token = auth.slice('Bearer '.length);
  const user = await parseUserFromToken(token);
  if (user) {
    request.authUser = user;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await optionalAuth(request);
  if (!request.authUser) {
    reply.status(401).send({
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    });
  }
}
