import { DisclaimerFooter } from '@/components/disclaimer-footer';
import { MarketUniverseGrid } from '@/components/market-universe-grid';

export default function StocksPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Stock Universe Explorer</h1>
        <p className="mt-2 text-sm text-slate-300">
          Browse NSE, BSE, and NYSE symbols with latest synced pricing signals.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Prices are informational snapshots and can lag during provider outages.
        </p>
      </section>

      <MarketUniverseGrid showHeaderLink={false} enableAdminTools />
      <DisclaimerFooter />
    </main>
  );
}
