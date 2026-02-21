type TrustScoreGaugeProps = {
  score: number;
  confidence: number;
  band: string;
};

export function TrustScoreGauge({ score, confidence, band }: TrustScoreGaugeProps) {
  const safeScore = Math.max(0, Math.min(100, score));
  const angle = (safeScore / 100) * 180;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glass sm:p-5">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Trust Score</p>
      <div className="relative mt-4 h-24 w-full overflow-hidden sm:h-28">
        <div className="absolute inset-x-0 bottom-0 h-56 rounded-full border-[6px] border-slate-700/60 sm:border-8" />
        <div
          className="absolute inset-x-0 bottom-0 h-56 rounded-full border-[6px] border-mint-400 sm:border-8"
          style={{
            clipPath: `polygon(0% 100%, 100% 100%, 100% ${100 - angle / 1.8}%, 0% ${100 - angle / 1.8}%)`,
          }}
        />
        <div className="absolute inset-0 flex items-end justify-center pb-2">
          <div className="text-center">
            <p className="text-3xl font-bold text-white sm:text-4xl">{safeScore.toFixed(1)}</p>
            <p className="text-sm text-slate-300">{band}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-300">Confidence: {confidence.toFixed(1)}%</p>
    </div>
  );
}
