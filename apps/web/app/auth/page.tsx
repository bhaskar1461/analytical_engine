'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DisclaimerFooter } from '@/components/disclaimer-footer';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!supabase) {
      setStatus('Supabase env is not configured yet.');
      return;
    }

    setLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus('Magic link sent. Check your email.');
    }
    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold text-white">Sign in with Magic Link</h1>
        <p className="mt-2 text-sm text-slate-300">
          Login is optional for browsing. Required for watchlist and history.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-base text-white outline-none focus:border-mint-400"
            placeholder="you@example.com"
          />
          <button
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-mint-500 px-4 py-3 font-semibold text-slate-900 disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {status ? <p className="mt-4 text-sm text-slate-200">{status}</p> : null}
      </section>

      <DisclaimerFooter />
    </main>
  );
}
