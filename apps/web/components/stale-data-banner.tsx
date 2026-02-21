type StaleDataBannerProps = {
  stale: boolean;
};

export function StaleDataBanner({ stale }: StaleDataBannerProps) {
  if (!stale) return null;

  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-100 sm:text-sm">
      Data may be stale due to temporary provider issues. Cached values are shown.
    </div>
  );
}
