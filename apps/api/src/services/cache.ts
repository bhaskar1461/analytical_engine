import { env } from '../config/env.js';

type CacheRecord = {
  value: string;
  expiresAt: number;
};

const memory = new Map<string, CacheRecord>();
const cacheStats = {
  memoryHits: 0,
  remoteHits: 0,
  misses: 0,
  writes: 0,
  errors: 0,
};

async function upstashGet(key: string): Promise<string | null> {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`${env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      },
    });

    if (!response.ok) return null;
    const body = (await response.json()) as { result?: string | null };
    if (body.result) {
      cacheStats.remoteHits += 1;
    }
    return body.result ?? null;
  } catch {
    cacheStats.errors += 1;
    return null;
  }
}

async function upstashSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }

  try {
    await fetch(
      `${env.UPSTASH_REDIS_REST_URL}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(value)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
        },
      },
    );
  } catch {
    cacheStats.errors += 1;
    // noop fallback
  }
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const local = memory.get(key);
  if (local && local.expiresAt > Date.now()) {
    cacheStats.memoryHits += 1;
    return JSON.parse(local.value) as T;
  }

  const remote = await upstashGet(key);
  if (!remote) {
    cacheStats.misses += 1;
    return null;
  }
  return JSON.parse(remote) as T;
}

export async function setCachedJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const serialized = JSON.stringify(value);
  memory.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  cacheStats.writes += 1;
  await upstashSet(key, serialized, ttlSeconds);
}

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<{ data: T; stale: boolean }> {
  const cached = await getCachedJson<T>(key);
  if (cached) {
    return { data: cached, stale: false };
  }

  try {
    const data = await producer();
    await setCachedJson(key, data, ttlSeconds);
    return { data, stale: false };
  } catch (error) {
    if (cached) {
      return { data: cached, stale: true };
    }
    throw error;
  }
}

export function getCacheStats(): {
  memoryHits: number;
  remoteHits: number;
  misses: number;
  writes: number;
  errors: number;
  memoryEntries: number;
} {
  return {
    ...cacheStats,
    memoryEntries: memory.size,
  };
}
