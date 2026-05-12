import type { Ausbaustandard } from '../data/types';
import { copy } from '../lib/copy';

interface Props {
  value: Ausbaustandard;
  onChange: (v: Ausbaustandard) => void;
  disabled?: boolean;
}

const OPTIONS: { value: Ausbaustandard; label: string }[] = [
  { value: 'niedrig', label: copy.ausbaustandard.niedrig },
  { value: 'mittel',  label: copy.ausbaustandard.mittel  },
  { value: 'hoch',    label: copy.ausbaustandard.hoch    },
];

export function AusbaustandarRadio({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-zinc-500">
        {copy.ausbaustandard.label}
      </span>
      <div className="flex overflow-hidden rounded-md border border-zinc-200">
        {OPTIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={[
                'px-3 py-1.5 text-xs font-medium transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-buildx-accent/40',
                selected
                  ? 'bg-buildx-accent text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 disabled:text-zinc-400',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
