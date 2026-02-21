import { DisclaimerFooter } from '@/components/disclaimer-footer';
import { NewsMoodBar } from '@/components/news-mood-bar';
import { SocialMeter } from '@/components/social-meter';
import { StaleDataBanner } from '@/components/stale-data-banner';
import { TrustScoreGauge } from '@/components/trust-score-gauge';
import { WatchlistToggle } from '@/components/watchlist-toggle';
import { getNews, getSocial, getStock, getTrustScore } from '@/lib/api-client';
import { confidenceLabel, formatMarketPrice } from '@/lib/utils';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ symbol: string }>;
};

export default async function StockPage({ params }: PageProps) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol).toUpperCase();

  try {
    const [stock, trust, news, social] = await Promise.all([
      getStock(decodedSymbol),
      getTrustScore(decodedSymbol),
      getNews(decodedSymbol),
      getSocial(decodedSymbol),
    ]);

    const latestHeadline = news.data[0];
    const moodSample = news.data.slice(0, 5);
    const moodWeightTotal = moodSample.reduce(
      (total, item) => total + Math.max(item.credibilityWeight, 0.1),
      0,
    );
    const moodSentiment =
      moodWeightTotal > 0
        ? moodSample.reduce(
            (total, item) => total + item.sentiment * Math.max(item.credibilityWeight, 0.1),
            0,
          ) / moodWeightTotal
        : 0;
    const moodConfidence =
      moodSample.length > 0
        ? moodSample.reduce((total, item) => total + item.confidence, 0) / moodSample.length
        : 0;

    return (
      <main className="space-y-6">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Stock intelligence</p>
          <div className="mt-2 flex items-center gap-3">
            {stock.data.iconUrl ? (
              // `img` keeps runtime flexible for dynamic external logo domains.
              <img
                src={stock.data.iconUrl}
                alt={`${stock.data.name} logo`}
                className="h-10 w-10 rounded-lg border border-white/10 bg-slate-900/60 object-cover"
                loading="lazy"
              />
            ) : null}
            <div>
              <h1 className="break-words text-2xl font-bold text-white sm:text-3xl">
                {stock.data.name}
              </h1>
              <p className="mt-1 break-words text-sm text-slate-300">
                {stock.data.symbol} · {stock.data.exchange} · {stock.data.sector}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-200 sm:flex-row sm:flex-wrap sm:gap-4">
            <span>
              Price:{' '}
              {stock.data.latestPrice
                ? formatMarketPrice(stock.data.latestPrice, stock.data.exchange)
                : 'N/A'}
            </span>
            <span>
              Trend: {stock.data.trendPct !== null ? `${stock.data.trendPct.toFixed(2)}%` : 'N/A'}
            </span>
          </div>
          <div className="mt-4">
            <WatchlistToggle symbol={stock.data.symbol} />
          </div>
        </header>

        <StaleDataBanner
          stale={Boolean(trust.data.staleData || social.data.staleData || news.staleData)}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <TrustScoreGauge
            score={trust.data.trustScore}
            confidence={trust.data.confidence}
            band={trust.data.trustBand}
          />

          <div className="space-y-4">
            <SocialMeter
              bullishPct={social.data.bullishPct}
              bearishPct={social.data.bearishPct}
              hypeVelocity={social.data.hypeVelocity}
              memeRiskFlag={social.data.memeRiskFlag}
            />
            <NewsMoodBar
              sentiment={moodSentiment}
              confidence={moodConfidence}
              articleCount={moodSample.length}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Signal Summary</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            {trust.data.explanations.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-300">{confidenceLabel(trust.data.confidence)}</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white sm:text-xl">News Feed</h2>
          {latestHeadline ? (
            <a
              href={latestHeadline.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-4 hover:border-cyan-200/60"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Key Headline</p>
              <p className="mt-2 text-sm font-semibold text-white sm:text-base">
                {latestHeadline.title}
              </p>
              <p className="mt-1 text-xs text-slate-200">
                {latestHeadline.source} · confidence {latestHeadline.confidence.toFixed(1)}%
              </p>
            </a>
          ) : null}
          <div className="mt-4 space-y-3">
            {news.data.length === 0 ? (
              <p className="text-sm text-slate-300">No recent articles available.</p>
            ) : (
              news.data.slice(0, 8).map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-white/10 bg-slate-900/40 p-4 hover:border-cyan-300/50"
                >
                  <p className="text-sm font-medium text-white sm:text-base">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    {item.source} · confidence {item.confidence.toFixed(1)}%
                  </p>
                </a>
              ))
            )}
          </div>
        </section>

        <DisclaimerFooter />
      </main>
    );
  } catch {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">
          Unable to load intelligence data for {decodedSymbol}. Please try again shortly.
        </section>
        <DisclaimerFooter />
      </main>
    );
  }
}
