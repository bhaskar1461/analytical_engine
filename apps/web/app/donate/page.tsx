'use client';

import { useState } from 'react';
import { DisclaimerFooter } from '@/components/disclaimer-footer';
import { createDonationLink } from '@/lib/api-client';
import { formatInr } from '@/lib/utils';

const TIERS = [
  { label: 'SUPPORTER', amount: 49 },
  { label: 'INSIDER', amount: 149 },
  { label: 'BACKER', amount: 499 },
  { label: 'FOUNDING_MEMBER', amount: 999 },
] as const;

export default function DonatePage() {
  const [tier, setTier] = useState<(typeof TIERS)[number]['label']>('SUPPORTER');
  const [amount, setAmount] = useState(49);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const createLink = async () => {
    setLoading(true);
    setMessage(null);
    setPaymentUrl(null);

    try {
      const response = await createDonationLink({ amount_inr: amount, tier });
      setPaymentUrl(response.data.paymentUrl ?? null);
      setMessage(
        `Donation link prepared: ${response.data.provider} ${formatInr(response.data.amountPaise / 100)}`,
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to create donation payload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Support Anylical Engine</h1>
        <p className="mt-2 text-sm text-slate-300">
          Help keep this educational platform free for everyone. Donations are optional and never
          unlock core insights.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Contributions do not change trust scores or portfolio/SIP outputs.
        </p>

        <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2">
          {TIERS.map((option) => (
            <button
              key={option.label}
              onClick={() => {
                setTier(option.label);
                setAmount(option.amount);
              }}
              className={`rounded-xl border px-4 py-3 text-left ${
                tier === option.label
                  ? 'border-mint-400 bg-mint-500/10'
                  : 'border-white/15 bg-slate-900/40 hover:border-cyan-300/50'
              }`}
            >
              <p className="text-sm font-semibold text-white">{option.label.replace('_', ' ')}</p>
              <p className="text-xs text-slate-300">{formatInr(option.amount)}</p>
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm text-slate-200">
          Custom amount (INR)
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-base"
          />
        </label>

        <button
          onClick={createLink}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-mint-500 px-6 py-3 font-semibold text-slate-900 disabled:opacity-60 sm:w-auto"
        >
          {loading ? 'Creating...' : 'Create Donation Link'}
        </button>

        {message ? <p className="mt-4 text-sm text-slate-200">{message}</p> : null}
        {paymentUrl ? (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex w-full justify-center rounded-xl border border-cyan-300/60 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-200 sm:w-auto"
          >
            Open Razorpay Link
          </a>
        ) : null}
      </section>

      <DisclaimerFooter />
    </main>
  );
}
