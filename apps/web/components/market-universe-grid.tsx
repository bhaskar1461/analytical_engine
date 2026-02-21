'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  getMarketUniverseSyncStatus,
  searchStocks,
  triggerMarketUniverseSync,
} from '@/lib/api-client';
import { formatMarketPrice } from '@/lib/utils';

type ExchangeFilter = 'ALL' | 'NSE' | 'BSE' | 'NYSE';

type StockRow = {
  symbol: string;
  name: string;
  sector: string;
  exchange: 'NSE' | 'BSE' | 'NYSE';
  iconUrl: string | null;
  latestPrice: number | null;
  trendPct: number | null;
};

type MarketUniverseGridProps = {
  showHeaderLink?: boolean;
  enableAdminTools?: boolean;
};

type SyncStatus = {
  activeStocksCount: number;
  exchangeCounts: {
    NSE: number;
    BSE: number;
    NYSE: number;
  };
  latestTradingDate: string | null;
  latestTradingDateRows: number;
  lastAdminSync: {
    at: string;
    userId: string | null;
    result: {
      status: string;
      stocksUpserted: number;
      pricesUpserted: number;
      quotesResolved: number;
      tradingDate?: string;
    } | null;
  } | null;
};

export function MarketUniverseGrid({
  showHeaderLink = true,
  enableAdminTools = false,
}: MarketUniverseGridProps) {
  const [query, setQuery] = useState('');
  const [exchange, setExchange] = useState<ExchangeFilter>('ALL');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    searchStocks(query, {
      exchange: exchange === 'ALL' ? undefined : exchange,
      page,
    })
      .then((response) => {
        if (!mounted) return;
        setRows(response.data);
      })
      .catch((cause) => {
        if (!mounted) return;
        setRows([]);
        setError(cause instanceof Error ? cause.message : 'Unable to load stock universe');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [query, exchange, page]);

  const hasNextPage = useMemo(() => rows.length >= 20, [rows.length]);

  const loadSyncStatus = async (providedKey?: string) => {
    const key = (providedKey ?? adminKey).trim();
    if (!key) {
      setSyncMessage('Enter admin sync key before loading status.');
      return;
    }

    setStatusLoading(true);
    try {
      const response = await getMarketUniverseSyncStatus(key);
      setSyncStatus(response.data);
    } catch (cause) {
      setSyncStatus(null);
      setSyncMessage(cause instanceof Error ? cause.message : 'Unable to fetch sync status');
    } finally {
      setStatusLoading(false);
    }
  };

  const triggerSync = async () => {
    const key = adminKey.trim();
    if (!key) {
      setSyncMessage('Enter admin sync key before running sync.');
      return;
    }

    setSyncing(true);
    setSyncMessage(null);
    try {
      const response = await triggerMarketUniverseSync(key);
      const result = response.data.result;
      setSyncMessage(
        `Synced ${result.stocksUpserted} stocks and ${result.pricesUpserted} prices (quotes resolved: ${result.quotesResolved}).`,
      );
      await loadSyncStatus(key);
      setPage(1);
      const refreshed = await searchStocks(query, {
        exchange: exchange === 'ALL' ? undefined : exchange,
        page: 1,
      });
      setRows(refreshed.data);
    } catch (cause) {
      setSyncMessage(cause instanceof Error ? cause.message : 'Failed to run market sync');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white sm:text-xl">Live Market Universe</h2>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">
            NSE, BSE, and NYSE listings with latest synced price and logo.
          </p>
        </div>
        {showHeaderLink ? (
          <Link
            href="/stocks"
            className="inline-flex rounded-lg border border-cyan-300/50 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:border-cyan-200"
          >
            Open Full Explorer
          </Link>
        ) : null}
      </div>

      {enableAdminTools ? (
        <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
            Admin Sync
          </p>
          <p className="mt-1 text-xs text-amber-100/90">
            Triggers full NSE/BSE/NYSE market sync from the intelligence service.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="Enter ADMIN_SYNC_KEY"
              className="w-full rounded-lg border border-amber-200/30 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-amber-200"
            />
            <button
              onClick={() => loadSyncStatus()}
              disabled={statusLoading}
              className="w-full rounded-lg border border-amber-200/50 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-50 disabled:opacity-60 sm:w-auto"
            >
              {statusLoading ? 'Loading...' : 'Load Status'}
            </button>
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="w-full rounded-lg border border-amber-200/50 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-50 disabled:opacity-60 sm:w-auto"
            >
              {syncing ? 'Syncing...' : 'Run Full Sync'}
            </button>
          </div>
          {syncStatus ? (
            <div className="mt-3 rounded-lg border border-amber-200/30 bg-slate-900/40 p-3 text-xs text-amber-100">
              <p>
                Active stocks: {syncStatus.activeStocksCount} (NSE {syncStatus.exchangeCounts.NSE}
                , BSE {syncStatus.exchangeCounts.BSE}, NYSE {syncStatus.exchangeCounts.NYSE})
              </p>
              <p className="mt-1">
                Latest trading date:{' '}
                {syncStatus.latestTradingDate
                  ? `${syncStatus.latestTradingDate} (${syncStatus.latestTradingDateRows} rows)`
                  : 'N/A'}
              </p>
              <p className="mt-1">
                Last admin sync:{' '}
                {syncStatus.lastAdminSync
                  ? new Date(syncStatus.lastAdminSync.at).toLocaleString()
                  : 'Not recorded'}
              </p>
              {syncStatus.lastAdminSync?.result ? (
                <p className="mt-1">
                  Last result: {syncStatus.lastAdminSync.result.status} · stocks{' '}
                  {syncStatus.lastAdminSync.result.stocksUpserted} · prices{' '}
                  {syncStatus.lastAdminSync.result.pricesUpserted} · quotes{' '}
                  {syncStatus.lastAdminSync.result.quotesResolved}
                </p>
              ) : null}
            </div>
          ) : null}
          {syncMessage ? <p className="mt-2 text-xs text-amber-100">{syncMessage}</p> : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={query}
          onChange={(event) => {
            setPage(1);
            setQuery(event.target.value);
          }}
          placeholder="Search symbol or company"
          className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300 sm:col-span-2"
        />
        <select
          value={exchange}
          onChange={(event) => {
            setPage(1);
            setExchange(event.target.value as ExchangeFilter);
          }}
          className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
        >
          <option value="ALL">All Exchanges</option>
          <option value="NSE">NSE</option>
          <option value="BSE">BSE</option>
          <option value="NYSE">NYSE</option>
        </select>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
          <span>Page {page}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((current) => current + 1)}
              disabled={!hasNextPage || loading}
              className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl border border-white/10 bg-slate-900/40"
              />
            ))
          : rows.map((row) => (
              <Link
                key={`${row.exchange}:${row.symbol}`}
                href={`/stock/${encodeURIComponent(row.symbol)}`}
                className="rounded-xl border border-white/10 bg-slate-900/45 p-3 hover:border-cyan-300/60"
              >
                <div className="flex items-start gap-3">
                  {row.iconUrl ? (
                    <img
                      src={row.iconUrl}
                      alt={`${row.name} logo`}
                      className="h-9 w-9 rounded-md border border-white/10 bg-slate-950/60 object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{row.symbol}</p>
                    <p className="truncate text-xs text-slate-300">{row.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-cyan-200/80">
                      {row.exchange}
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-200">
                  <p>
                    {row.latestPrice !== null
                      ? formatMarketPrice(row.latestPrice, row.exchange)
                      : 'Price N/A'}
                  </p>
                  <p
                    className={
                      row.trendPct !== null && row.trendPct >= 0
                        ? 'text-emerald-300'
                        : 'text-rose-300'
                    }
                  >
                    {row.trendPct !== null ? `${row.trendPct.toFixed(2)}%` : 'Trend N/A'}
                  </p>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}
