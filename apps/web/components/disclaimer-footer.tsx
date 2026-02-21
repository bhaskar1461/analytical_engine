import { MANDATORY_DISCLAIMERS } from '@anylical/config';

type DisclaimerFooterProps = {
  className?: string;
};

export function DisclaimerFooter({ className }: DisclaimerFooterProps) {
  return (
    <footer
      className={
        className ??
        'mt-8 rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-slate-300 sm:mt-10 sm:p-4 sm:text-xs'
      }
    >
      <p className="mb-2 font-semibold text-slate-200">Important Disclosures</p>
      <ul className="space-y-1">
        {MANDATORY_DISCLAIMERS.map((text) => (
          <li key={text}>- {text}</li>
        ))}
      </ul>
    </footer>
  );
}
