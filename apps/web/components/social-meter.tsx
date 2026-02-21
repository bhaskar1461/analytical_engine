type SocialMeterProps = {
  bullishPct: number;
  bearishPct: number;
  hypeVelocity: number;
  memeRiskFlag: boolean;
};

export function SocialMeter({
  bullishPct,
  bearishPct,
  hypeVelocity,
  memeRiskFlag,
}: SocialMeterProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-slate-300">Social Sentiment</p>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full bg-mint-400"
          style={{ width: `${Math.max(0, Math.min(100, bullishPct))}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
        <span>Bullish {bullishPct.toFixed(1)}%</span>
        <span>Bearish {bearishPct.toFixed(1)}%</span>
      </div>
      <div className="mt-3 text-xs text-slate-300">Hype velocity: {hypeVelocity.toFixed(1)}</div>
      {memeRiskFlag ? (
        <div className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
          High hype risk detected
        </div>
      ) : null}
    </div>
  );
}
