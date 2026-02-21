'use client';

import { useState } from 'react';
import { DisclaimerFooter } from '@/components/disclaimer-footer';
import { generatePortfolio } from '@/lib/api-client';
import { formatInr } from '@/lib/utils';

export default function PortfolioPage() {
  const [riskPersona, setRiskPersona] = useState<'TURTLE' | 'OWL' | 'TIGER' | 'FALCON'>('OWL');
  const [amount, setAmount] = useState(50000);
  const [horizon, setHorizon] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await generatePortfolio({
        risk_persona: riskPersona,
        amount,
        horizon_months: horizon,
      });
      setResult(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to generate portfolio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">AI Portfolio Advisor</h1>
        <p className="mt-2 text-sm text-slate-300">
          Educational allocation suggestions based on risk persona and horizon.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Non-binding model output. Review independently before any real investment decisions.
        </p>

        <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
          <label className="text-sm text-slate-200">
            Persona
            <select
              value={riskPersona}
              onChange={(event) => setRiskPersona(event.target.value as any)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-base"
            >
              <option value="TURTLE">Turtle (Conservative)</option>
              <option value="OWL">Owl (Moderate)</option>
              <option value="TIGER">Tiger (Aggressive)</option>
              <option value="FALCON">Falcon (Very Aggressive)</option>
            </select>
          </label>

          <label className="text-sm text-slate-200">
            Amount (INR)
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-base"
            />
          </label>

          <label className="text-sm text-slate-200">
            Horizon (months)
            <input
              type="number"
              value={horizon}
              onChange={(event) => setHorizon(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-base"
            />
          </label>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-mint-500 px-6 py-3 font-semibold text-slate-900 disabled:opacity-60 sm:w-auto"
        >
          {loading ? 'Generating...' : 'Generate Portfolio'}
        </button>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        {result ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/40 p-3 sm:p-4">
            <p className="text-sm text-slate-200">Amount: {formatInr(result.amountInr)}</p>
            <p className="text-sm text-slate-200">Risk level: {result.riskLevel}</p>
            <p className="text-sm text-slate-200">Confidence: {result.confidence.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-slate-400">
              Educational illustration only. No buy/sell recommendation is being made.
            </p>

            <div className="mt-4 space-y-2">
              {result.allocations.map((item: any) => (
                <div
                  key={item.symbol}
                  className="rounded-lg border border-white/10 bg-slate-800/60 p-3 text-sm"
                >
                  <p className="font-medium text-white">
                    {item.symbol} · {item.weightPct.toFixed(1)}%
                  </p>
                  <p className="break-words text-slate-300">
                    {item.sector} · Trust {item.trustScore.toFixed(1)} · Vol{' '}
                    {item.expectedVolatility.toFixed(1)}
                  </p>
                </div>
              ))}
            </div>

            {result.warnings.map((warning: string) => (
              <p key={warning} className="mt-2 text-xs text-amber-200">
                {warning}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <DisclaimerFooter />
    </main>
  );
}
