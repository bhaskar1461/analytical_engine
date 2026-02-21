import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';
import { optionalAuth } from '../plugins/auth.js';
import { DonationCreateSchema, DonationWebhookSchema } from '../schemas/http.js';
import { logAudit, saveDonation } from '../services/stock-service.js';

const TIER_MAP: Record<string, number> = {
  SUPPORTER: 49,
  INSIDER: 149,
  BACKER: 499,
  FOUNDING_MEMBER: 999,
};

function hasRazorpayApiCreds(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

function toBasicAuthHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

function normalizedAmountForTier(inputAmount: number, tier: string): number {
  const minimumForTier = TIER_MAP[tier] ?? 49;
  return Math.max(inputAmount, minimumForTier);
}

type DonationPayload = {
  provider: 'razorpay';
  keyId: string;
  amountPaise: number;
  currency: 'INR';
  description: string;
  paymentUrl?: string | null;
  paymentLinkId?: string | null;
  metadata: {
    tier: string;
    userId: string | null;
  };
};

function fallbackDonationPayload(input: {
  amountPaise: number;
  tier: string;
  userId: string | null;
}): DonationPayload {
  return {
    provider: 'razorpay',
    keyId: env.RAZORPAY_KEY_ID ?? 'rzp_test_placeholder',
    amountPaise: input.amountPaise,
    currency: 'INR',
    description: 'Support Anylical Engine (community-funded, educational platform)',
    paymentUrl: null,
    paymentLinkId: null,
    metadata: {
      tier: input.tier,
      userId: input.userId,
    },
  };
}

async function createRazorpayPaymentLink(input: {
  amountPaise: number;
  tier: string;
  userId: string | null;
}): Promise<DonationPayload> {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials are not configured.');
  }

  const body = {
    amount: input.amountPaise,
    currency: 'INR',
    accept_partial: false,
    description: 'Support Anylical Engine (community-funded, educational platform)',
    reference_id: `anylical-${Date.now()}`,
    notify: {
      sms: false,
      email: false,
    },
    reminder_enable: true,
    notes: {
      tier: input.tier,
      user_id: input.userId ?? '',
      source: 'anylical-engine',
    },
  };

  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: toBasicAuthHeader(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET),
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  let parsedBody: Record<string, unknown> = {};
  try {
    parsedBody = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    parsedBody = {};
  }

  if (!response.ok) {
    throw new Error(
      `Razorpay payment-link creation failed (${response.status}): ${responseText.slice(0, 280)}`,
    );
  }

  return {
    provider: 'razorpay',
    keyId: env.RAZORPAY_KEY_ID,
    amountPaise: input.amountPaise,
    currency: 'INR',
    description: 'Support Anylical Engine (community-funded, educational platform)',
    paymentUrl:
      typeof parsedBody.short_url === 'string' && parsedBody.short_url.length > 0
        ? parsedBody.short_url
        : null,
    paymentLinkId:
      typeof parsedBody.id === 'string' && parsedBody.id.length > 0 ? parsedBody.id : null,
    metadata: {
      tier: input.tier,
      userId: input.userId,
    },
  };
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string | undefined = env.RAZORPAY_WEBHOOK_SECRET,
): boolean {
  if (!secret) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export const donateRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/donate/create-link',
    {
      schema: {
        summary: 'Create Razorpay donation link payload',
        tags: ['donation'],
      },
    },
    async (request, reply) => {
      await optionalAuth(request);

      const parsed = DonationCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_PAYLOAD', message: parsed.error.message });
      }

      const amount = normalizedAmountForTier(parsed.data.amount_inr, parsed.data.tier);
      const amountPaise = Math.round(amount * 100);
      const userId = request.authUser?.id ?? null;

      let paymentPayload: DonationPayload;
      let gatewayMode: 'live' | 'fallback' = 'fallback';

      if (hasRazorpayApiCreds()) {
        try {
          paymentPayload = await createRazorpayPaymentLink({
            amountPaise,
            tier: parsed.data.tier,
            userId,
          });
          gatewayMode = 'live';
        } catch {
          paymentPayload = fallbackDonationPayload({
            amountPaise,
            tier: parsed.data.tier,
            userId,
          });
        }
      } else {
        paymentPayload = fallbackDonationPayload({
          amountPaise,
          tier: parsed.data.tier,
          userId,
        });
      }

      await saveDonation({
        userId: userId ?? undefined,
        amountInr: amount,
        tier: parsed.data.tier,
        providerOrderId: paymentPayload.paymentLinkId ?? undefined,
        status: 'link_created',
        metadata: paymentPayload.metadata,
      });

      await logAudit(
        'donation.link_created',
        {
          amount,
          tier: parsed.data.tier,
          gatewayMode,
          paymentLinkId: paymentPayload.paymentLinkId ?? null,
          modelVersion: 'donation-v1.0.0',
        },
        undefined,
        request.authUser?.id,
      );

      return {
        data: paymentPayload,
        message: 'Support the project. Donations are optional and do not unlock core insights.',
      };
    },
  );

  app.post(
    '/api/donate/webhook',
    {
      config: {
        rawBody: true,
      },
      schema: {
        summary: 'Razorpay donation webhook',
        tags: ['donation'],
      },
    },
    async (request, reply) => {
      const signature = request.headers['x-razorpay-signature'];
      if (!signature || typeof signature !== 'string') {
        return reply.status(401).send({ code: 'INVALID_SIGNATURE', message: 'Signature missing' });
      }

      const rawBody =
        typeof (request as { rawBody?: string }).rawBody === 'string'
          ? (request as { rawBody?: string }).rawBody!
          : typeof request.body === 'string'
            ? request.body
            : JSON.stringify(request.body ?? {});
      if (!verifyWebhookSignature(rawBody, signature)) {
        return reply
          .status(401)
          .send({ code: 'INVALID_SIGNATURE', message: 'Webhook signature mismatch' });
      }

      const parsed = DonationWebhookSchema.safeParse(
        typeof request.body === 'string' ? JSON.parse(request.body) : request.body,
      );
      if (!parsed.success) {
        return reply.status(400).send({ code: 'INVALID_PAYLOAD', message: parsed.error.message });
      }

      const entity = parsed.data.payload?.payment?.entity as Record<string, unknown> | undefined;
      const notes =
        entity?.notes && typeof entity.notes === 'object'
          ? (entity.notes as Record<string, unknown>)
          : undefined;

      await saveDonation({
        amountInr: Number(entity?.amount ?? 0) / 100,
        tier: String(notes?.tier ?? 'SUPPORTER'),
        providerPaymentId: String(entity?.id ?? ''),
        providerOrderId: String(entity?.order_id ?? ''),
        status: parsed.data.event,
        metadata: parsed.data.payload,
      });

      await logAudit('donation.webhook_received', {
        event: parsed.data.event,
        paymentId: entity?.id,
        modelVersion: 'donation-v1.0.0',
      });

      return { ok: true };
    },
  );
};
