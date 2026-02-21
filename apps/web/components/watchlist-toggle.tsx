'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { addToWatchlist, getWatchlist, removeFromWatchlist } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';

type WatchlistToggleProps = {
  symbol: string;
};

type AuthState = 'loading' | 'signed_out' | 'signed_in' | 'unavailable';

export function WatchlistToggle({ symbol }: WatchlistToggleProps) {
  const normalizedSymbol = useMemo(() => symbol.toUpperCase(), [symbol]);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!supabase) {
        if (mounted) setAuthState('unavailable');
        return;
      }

      const { data } = await supabase.auth.getSession();
      const currentToken = data.session?.access_token ?? null;

      if (!mounted) return;

      if (!currentToken) {
        setAuthState('signed_out');
        setToken(null);
        setInWatchlist(false);
        return;
      }

      setAuthState('signed_in');
      setToken(currentToken);

      try {
        const watchlist = await getWatchlist(currentToken);
        const set = new Set(watchlist.data.map((item) => item.toUpperCase()));
        setInWatchlist(set.has(normalizedSymbol));
      } catch {
        setMessage('Unable to load watchlist right now.');
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [normalizedSymbol]);

  const toggle = async () => {
    if (!token) {
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      if (inWatchlist) {
        await removeFromWatchlist(normalizedSymbol, token);
        setInWatchlist(false);
        setMessage('Removed from watchlist.');
      } else {
        await addToWatchlist(normalizedSymbol, token);
        setInWatchlist(true);
        setMessage('Added to watchlist.');
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Watchlist update failed.');
    } finally {
      setPending(false);
    }
  };

  if (authState === 'loading') {
    return <p className="text-xs text-slate-300">Checking watchlist access...</p>;
  }

  if (authState === 'unavailable') {
    return <p className="text-xs text-slate-300">Watchlist needs Supabase client configuration.</p>;
  }

  if (authState === 'signed_out') {
    return (
      <p className="text-xs text-slate-300">
        <Link href="/auth" className="text-cyan-200 underline underline-offset-2">
          Sign in
        </Link>{' '}
        to save this stock to your watchlist.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={toggle}
        disabled={pending}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:w-auto ${
          inWatchlist
            ? 'border border-amber-300/60 bg-amber-500/10 text-amber-100 hover:border-amber-200'
            : 'border border-cyan-300/50 bg-cyan-500/10 text-cyan-100 hover:border-cyan-200'
        } disabled:opacity-60`}
      >
        {pending ? 'Updating...' : inWatchlist ? 'Remove From Watchlist' : 'Add To Watchlist'}
      </button>
      {message ? <p className="text-xs text-slate-300">{message}</p> : null}
    </div>
  );
}
