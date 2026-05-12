// Three-line ampel: AZ Reserve, ISOS, Denkmalschutz. Spec §4.2.

import type { AmpelStatus } from '../data/types';
import { copy } from '../lib/copy';

interface Props {
  az_reserve: AmpelStatus;
  isos: AmpelStatus;
  denkmal: AmpelStatus;
}

const dotClass: Record<AmpelStatus, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-rose-500',
};

function Line({ status, label }: { status: AmpelStatus; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className={`inline-block h-3 w-3 rounded-full ${dotClass[status]}`} />
      <span className="text-sm text-zinc-700">{label}</span>
    </li>
  );
}

export function FeasibilityAmpel({ az_reserve, isos, denkmal }: Props) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500">
        {copy.result.feasibilityLabel}
      </p>
      <ul className="mt-2 space-y-1.5">
        <Line status={az_reserve} label={copy.result.feasibilityAz} />
        <Line status={isos} label={copy.result.feasibilityIsos} />
        <Line status={denkmal} label={copy.result.feasibilityDenkmal} />
      </ul>
    </div>
  );
}
