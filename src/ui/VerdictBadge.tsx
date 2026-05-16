// Investor-facing verdict: quick go/no-go read at the top of the result card.
// Based on BZO 2026 reserve and feasibility flags only — no CHF (zone-agnostic).

import type { AmpelStatus } from '../data/types';
import { copy } from '../lib/copy';

interface Props {
  reserve_2026: number;
  denkmal: AmpelStatus;
  az_reserve: AmpelStatus;
}

type Verdict = 'stark' | 'pruefenswert' | 'kein';

function classify(reserve_2026: number, denkmal: AmpelStatus, az_reserve: AmpelStatus): Verdict {
  if (denkmal === 'red' || reserve_2026 === 0) return 'kein';
  if (reserve_2026 >= 150 && az_reserve !== 'red') return 'stark';
  return 'pruefenswert';
}

const STYLES: Record<Verdict, { bg: string; text: string; dot: string }> = {
  stark:         { bg: 'bg-green-50 border-green-200',   text: 'text-green-800',  dot: 'bg-green-500' },
  pruefenswert:  { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  kein:          { bg: 'bg-red-50 border-red-200',       text: 'text-red-800',    dot: 'bg-red-500' },
};

export function VerdictBadge({ reserve_2026, denkmal, az_reserve }: Props) {
  const verdict = classify(reserve_2026, denkmal, az_reserve);
  const { bg, text, dot } = STYLES[verdict];
  const label = copy.verdict[verdict];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${bg} ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
