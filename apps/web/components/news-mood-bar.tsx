import { sentimentLabel } from '@/lib/utils';

type NewsMoodBarProps = {
  sentiment: number;
  confidence?: number;
  articleCount?: number;
};

export function NewsMoodBar({ sentiment, confidence, articleCount }: NewsMoodBarProps) {
  const normalized = Math.max(-2, Math.min(2, sentiment));
  const pct = ((normalized + 2) / 4) * 100;
  const label = sentimentLabel(sentiment);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-slate-300">News Mood</p>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-mint-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-200">{label}</p>
      <p className="mt-1 break-words text-xs text-slate-300">
        {typeof confidence === 'number' ? `Signal confidence ${confidence.toFixed(1)}%` : null}
        {typeof confidence === 'number' && typeof articleCount === 'number' ? ' · ' : null}
        {typeof articleCount === 'number'
          ? `${articleCount} article${articleCount === 1 ? '' : 's'} tracked`
          : null}
      </p>
    </div>
  );
}
