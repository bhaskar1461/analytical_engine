import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type SentryTarget = {
  protocol: string;
  host: string;
  publicKey: string;
  projectId: string;
};

function safeJson(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(safeJson);
  }
  if (typeof value === 'object') {
    const out: JsonObject = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = safeJson(item);
    }
    return out;
  }
  return String(value);
}

function parseSentryDsn(dsn: string | undefined): SentryTarget | null {
  if (!dsn) return null;
  try {
    const parsed = new URL(dsn);
    const publicKey = parsed.username;
    const projectId = parsed.pathname.replace(/\//g, '');
    if (!publicKey || !projectId) return null;
    return {
      protocol: parsed.protocol,
      host: parsed.host,
      publicKey,
      projectId,
    };
  } catch {
    return null;
  }
}

async function sendToPosthog(event: string, properties: Record<string, unknown>): Promise<void> {
  if (!env.POSTHOG_KEY) {
    return;
  }

  const host = (env.POSTHOG_HOST ?? 'https://app.posthog.com').replace(/\/$/, '');
  const payload = {
    api_key: env.POSTHOG_KEY,
    event,
    distinct_id: String(properties.distinctId ?? 'api-gateway'),
    properties: {
      ...properties,
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    },
  };

  await fetch(`${host}/capture/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function sendToSentry(error: unknown, context: Record<string, unknown>): Promise<void> {
  const target = parseSentryDsn(env.SENTRY_DSN);
  if (!target) {
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const eventId = randomUUID().replace(/-/g, '');
  const sentAt = new Date().toISOString();

  const envelopeHeader = {
    event_id: eventId,
    sent_at: sentAt,
    sdk: {
      name: 'anylical-api-telemetry',
      version: '0.1.0',
    },
  };
  const eventPayload = {
    event_id: eventId,
    timestamp: Math.floor(Date.now() / 1000),
    level: 'error',
    platform: 'node',
    logger: 'anylical-api',
    message,
    extra: safeJson(context),
    exception: {
      values: [
        {
          type: error instanceof Error ? (error.name ?? 'Error') : 'Error',
          value: message,
          stacktrace: stack
            ? {
                frames: stack.split('\n').map((line) => ({
                  filename: line.trim(),
                })),
              }
            : undefined,
        },
      ],
    },
  };

  const itemHeader = { type: 'event' };
  const envelope = `${JSON.stringify(envelopeHeader)}\n${JSON.stringify(itemHeader)}\n${JSON.stringify(eventPayload)}`;

  await fetch(`${target.protocol}//${target.host}/api/${target.projectId}/envelope/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-sentry-envelope',
      'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${target.publicKey}`,
    },
    body: envelope,
  });
}

function fireAndForget(task: Promise<void>): void {
  task.catch(() => {
    // Best-effort telemetry.
  });
}

export function trackMetric(event: string, properties: Record<string, unknown>): void {
  fireAndForget(sendToPosthog(event, properties));
}

export function captureException(error: unknown, context: Record<string, unknown>): void {
  fireAndForget(sendToSentry(error, context));
  fireAndForget(
    sendToPosthog('api.exception', {
      ...context,
      message: error instanceof Error ? error.message : String(error),
      level: 'error',
    }),
  );
}
