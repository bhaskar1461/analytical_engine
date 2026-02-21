'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function SearchStockForm() {
  const router = useRouter();
  const [symbol, setSymbol] = useState('RELIANCE.NS');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    router.push(`/stock/${encodeURIComponent(clean)}`);
  };

  return (
    <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:gap-3">
      <input
        className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-base text-white outline-none focus:border-mint-400"
        placeholder="Try: TCS.NS or INFY.NS"
        value={symbol}
        onChange={(event) => setSymbol(event.target.value)}
      />
      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-mint-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-900 sm:w-auto sm:text-base"
      >
        Open Intelligence Page
      </button>
    </form>
  );
}
