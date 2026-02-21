import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature } from '../routes/donate.js';

describe('donation webhook signature verification', () => {
  it('accepts valid signatures', () => {
    const raw = '{"event":"payment.captured","payload":{"id":"pay_123"}}';
    const secret = 'phase4-secret';

    const valid = createHmac('sha256', secret).update(raw).digest('hex');

    expect(verifyWebhookSignature(raw, valid, secret)).toBe(true);
  });

  it('rejects invalid signatures', () => {
    const raw = '{"event":"payment.captured","payload":{"id":"pay_123"}}';
    const secret = 'phase4-secret';

    expect(verifyWebhookSignature(raw, 'invalid-signature', secret)).toBe(false);
  });

  it('rejects when secret is absent', () => {
    const raw = '{"event":"payment.captured","payload":{"id":"pay_123"}}';
    expect(verifyWebhookSignature(raw, 'anything', undefined)).toBe(false);
  });
});
