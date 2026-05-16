// Visual: current BGF vs BZO 2016 reserve vs BZO 2026 reserve, proportional bars.
// Lets investors see at a glance how much of the AZ is already used.

import { formatM2 } from '../lib/format';
import { copy } from '../lib/copy';

interface Props {
  bestehende_bgf: number;
  reserve_bzo_2016: number; // already clipped to 0 if negative
  reserve_bzo_2026: number; // already clipped to 0 if negative
  show_compare: boolean;
}

export function BgfBar({ bestehende_bgf, reserve_bzo_2016, reserve_bzo_2026, show_compare }: Props) {
  const max = bestehende_bgf + reserve_bzo_2026;
  if (max <= 0) return null;

  // Additional BZO 2026 delta beyond the 2016 cap (only shown when show_compare is true).
  const delta_2026 = show_compare ? Math.max(0, reserve_bzo_2026 - reserve_bzo_2016) : 0;
  const shown_2016 = show_compare ? reserve_bzo_2016 : 0;

  const pct = (n: number) => `${((n / max) * 100).toFixed(1)}%`;

  return (
    <div className="mt-6 rounded-lg border border-zinc-100 bg-white p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {copy.bgfBar.title}
      </p>

      {/* Proportional bar */}
      <div className="flex h-6 w-full overflow-hidden rounded-md">
        <div
          className="bg-zinc-300"
          style={{ width: pct(bestehende_bgf) }}
          title={`${copy.bgfBar.bestandLabel}: ${formatM2(bestehende_bgf)}`}
        />
        {show_compare && shown_2016 > 0 && (
          <div
            className="bg-amber-300"
            style={{ width: pct(shown_2016) }}
            title={`${copy.bgfBar.reserve2016Label}: +${formatM2(shown_2016)}`}
          />
        )}
        {reserve_bzo_2026 > 0 && (
          <div
            className="bg-buildx-accent opacity-80"
            style={{ width: pct(show_compare ? delta_2026 : reserve_bzo_2026) }}
            title={`${copy.bgfBar.reserve2026Label}: +${formatM2(reserve_bzo_2026)}`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <LegendItem color="bg-zinc-300" label={copy.bgfBar.bestandLabel} value={formatM2(bestehende_bgf)} />
        {show_compare && shown_2016 > 0 && (
          <LegendItem color="bg-amber-300" label={copy.bgfBar.reserve2016Label} value={`+${formatM2(shown_2016)}`} />
        )}
        {reserve_bzo_2026 > 0 && (
          <LegendItem color="bg-buildx-accent opacity-80" label={copy.bgfBar.reserve2026Label} value={`+${formatM2(reserve_bzo_2026)}`} />
        )}
        <LegendItem color="" label={copy.bgfBar.maxLabel} value={formatM2(max)} isTotal />
      </div>
    </div>
  );
}

function LegendItem({ color, label, value, isTotal }: { color: string; label: string; value: string; isTotal?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {!isTotal && <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${color}`} />}
      <span className={`text-xs ${isTotal ? 'font-semibold text-zinc-700' : 'text-zinc-500'}`}>
        {label}:{' '}
        <span className={isTotal ? 'text-zinc-700' : 'text-zinc-700'}>{value}</span>
      </span>
    </div>
  );
}
