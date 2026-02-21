import Link from 'next/link';
import { SearchStockForm } from '@/components/search-stock-form';
import { DisclaimerFooter } from '@/components/disclaimer-footer';
import { MarketUniverseGrid } from '@/components/market-universe-grid';

export default function LandingPage() {
  return (
    <main className="space-y-6 sm:space-y-8">
      <header className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-glass sm:rounded-3xl sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
          India-first · Educational only
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-5xl">
          Trust-driven stock intelligence for Gen-Z investors
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
          Analyze statistical trends, news mood, and social hype risk in one place without broker
          lock-in.
        </p>

        <SearchStockForm />

        <Link
          href="/stocks"
          className="mt-5 inline-flex rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 hover:border-mint-400/60 sm:mt-6 sm:text-sm"
        >
          Browse Full Stock Universe
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        <Link
          href="/quiz"
          className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-mint-400/50 sm:p-5"
        >
          <h2 className="text-base font-semibold text-white sm:text-lg">Risk Quiz</h2>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">
            Find your investment persona in under 2 minutes.
          </p>
        </Link>
        <Link
          href="/portfolio"
          className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-mint-400/50 sm:p-5"
        >
          <h2 className="text-base font-semibold text-white sm:text-lg">Portfolio Advisor</h2>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">
            Get diversified educational allocations with risk checks.
          </p>
        </Link>
        <Link
          href="/sip"
          className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-mint-400/50 sm:p-5"
        >
          <h2 className="text-base font-semibold text-white sm:text-lg">SIP Planner</h2>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">
            Generate monthly plans that respect your budget.
          </p>
        </Link>
        <Link
          href="/donate"
          className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-mint-400/50 sm:p-5"
        >
          <h2 className="text-base font-semibold text-white sm:text-lg">Support Project</h2>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">
            Community-funded model. No paywalled core insights.
          </p>
        </Link>
        <Link
          href="/watchlist"
          className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-mint-400/50 sm:p-5"
        >
          <h2 className="text-base font-semibold text-white sm:text-lg">Watchlist</h2>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">
            Save symbols to your account and track them quickly.
          </p>
        </Link>
      </section>

      <MarketUniverseGrid />

      <DisclaimerFooter />
    </main>
  );
}
