import { useState } from 'react';
import { copy } from '../lib/copy';

interface Props {
  onChange: (v: number | undefined) => void;
}

export function AskingPriceInput({ onChange }: Props) {
  const [raw, setRaw] = useState('');

  function handleChange(s: string) {
    setRaw(s);
    // Strip everything except digits; allow empty to clear.
    const digits = s.replace(/[^0-9]/g, '');
    const parsed = digits ? parseInt(digits, 10) : undefined;
    onChange(parsed !== undefined && parsed > 0 ? parsed : undefined);
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-medium text-zinc-500 whitespace-nowrap">
        {copy.askingPrice.label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
          CHF
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={copy.askingPrice.placeholder}
          className="w-40 rounded-md border border-zinc-200 bg-white py-1.5 pl-10 pr-3 text-xs text-zinc-900 outline-none transition focus:border-buildx-accent focus:ring-2 focus:ring-buildx-accent/20"
        />
      </div>
    </div>
  );
}
