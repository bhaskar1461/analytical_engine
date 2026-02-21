'use client';

import { useMemo, useState } from 'react';
import { DisclaimerFooter } from '@/components/disclaimer-footer';
import { submitQuiz } from '@/lib/api-client';

const QUESTION_BANK = [
  { id: 'e1', section: 'emotional', label: 'I can stay calm during market drops.' },
  { id: 'e2', section: 'emotional', label: 'Short-term losses do not trigger panic exits.' },
  { id: 'e3', section: 'emotional', label: 'I can handle high price volatility.' },
  { id: 'f1', section: 'financial', label: 'I have emergency savings before investing.' },
  { id: 'f2', section: 'financial', label: 'My monthly budget can support fluctuations.' },
  { id: 'f3', section: 'financial', label: 'I have stable income for long-term investing.' },
  { id: 'b1', section: 'behavioral', label: 'I prefer disciplined investing over hype trends.' },
  { id: 'b2', section: 'behavioral', label: 'I diversify across sectors consistently.' },
  { id: 'b3', section: 'behavioral', label: 'I evaluate data before acting on social tips.' },
] as const;

export default function QuizPage() {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(QUESTION_BANK.map((q) => [q.id, 50])),
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    riskScore: number;
    persona: string;
    riskLevel: string;
    warnings: string[];
  }>(null);
  const [error, setError] = useState<string | null>(null);

  const answers = useMemo(
    () =>
      QUESTION_BANK.map((q) => ({
        section: q.section,
        value: values[q.id],
      })),
    [values],
  );

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await submitQuiz(answers);
      setResult(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Risk Personality Quiz</h1>
        <p className="mt-2 text-sm text-slate-300">
          Rate each statement from 0 to 100. Higher values indicate stronger agreement.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Persona scoring is educational and should not be treated as investment advice.
        </p>

        <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
          {QUESTION_BANK.map((question) => (
            <label
              key={question.id}
              className="block rounded-xl border border-white/10 bg-slate-900/40 p-3 sm:p-4"
            >
              <span className="text-sm text-slate-200">{question.label}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={values[question.id]}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [question.id]: Number(event.target.value),
                  }))
                }
                className="mt-3 w-full"
              />
              <span className="mt-2 block text-xs text-slate-300">{values[question.id]}</span>
            </label>
          ))}
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-mint-500 px-6 py-3 font-semibold text-slate-900 disabled:opacity-60 sm:w-auto"
        >
          {loading ? 'Scoring...' : 'Generate Risk Persona'}
        </button>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        {result ? (
          <div className="mt-6 rounded-xl border border-mint-400/30 bg-mint-500/10 p-3 sm:p-4">
            <p className="text-sm text-slate-200">Persona: {result.persona}</p>
            <p className="text-sm text-slate-200">Risk Level: {result.riskLevel}</p>
            <p className="text-sm text-slate-200">Risk Score: {result.riskScore.toFixed(1)}</p>
            <p className="mt-1 text-xs text-slate-400">
              This profile is probabilistic and non-binding.
            </p>
            {result.warnings.map((warning) => (
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
