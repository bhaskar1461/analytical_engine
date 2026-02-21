'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DisclaimerFooter } from '@/components/disclaimer-footer';
import { getWatchlist, removeFromWatchlist } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';

export default function WatchlistPage() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!supabase) {
        if (mounted) {
          setLoading(false);
          setMessage('Supabase auth is not configured.');
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? null;

      if (!mounted) return;

      if (!accessToken) {
        setLoading(false);
        setToken(null);
        return;
      }

      setToken(accessToken);
      try {
        const response = await getWatchlist(accessToken);
        if (!mounted) return;
        setSymbols(response.data);
      } catch (cause) {
        if (!mounted) return;
        setMessage(cause instanceof Error ? cause.message : 'Unable to load watchlist');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const remove = async (symbol: string) => {
    if (!token) {
      return;
    }

    try {
      await removeFromWatchlist(symbol, token);
      setSymbols((current) => current.filter((item) => item !== symbol));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Failed to update watchlist');
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">My Watchlist</h1>
        <p className="mt-2 text-sm text-slate-300">
          Saved symbols are stored in your account and can be updated anytime.
        </p>

        {loading ? <p className="mt-6 text-sm text-slate-300">Loading watchlist...</p> : null}

        {!loading && !token ? (
          <p className="mt-6 text-sm text-slate-300">
            <Link href="/auth" className="text-cyan-200 underline underline-offset-2">
              Sign in
            </Link>{' '}
            to use watchlist persistence.
          </p>
        ) : null}

        {!loading && token && symbols.length === 0 ? (
          <p className="mt-6 text-sm text-slate-300">Your watchlist is currently empty.</p>
        ) : null}

        {!loading && token && symbols.length > 0 ? (
          <div className="mt-6 space-y-3">
            {symbols.map((symbol) => (
              <div
                key={symbol}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  href={`/stock/${encodeURIComponent(symbol)}`}
                  className="text-sm font-medium text-cyan-100 hover:text-cyan-200"
                >
                  {symbol}
                </Link>
                <button
                  onClick={() => remove(symbol)}
                  className="w-full rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:border-amber-200 sm:w-auto"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {message ? <p className="mt-4 text-sm text-rose-300">{message}</p> : null}
      </section>

      <DisclaimerFooter />
    </main>
  );
}
