// Container for the four-number readout. Spec §4.2.

import type { LiveAnalysisResult } from '../data/types';
import { formatCHF, formatM2, formatRangeMio, formatSingleMio, formatPct } from '../lib/format';
import { copy } from '../lib/copy';
import { BigNumber } from './BigNumber';
import { FeasibilityAmpel } from './FeasibilityAmpel';
import { BzoDisclosure } from './BzoDisclosure';

interface Props {
  result: LiveAnalysisResult;
  askingPriceCHF?: number;
}

export function ResultCard({ result, askingPriceCHF }: Props) {
  const { address, reserve_m2, net_chf, feasibility, confidence, caveats } =
    result;

  const metaParts = [
    address.egid !== undefined ? `EGID ${address.egid}` : null,
    `Zone ${address.zone_code}`,
    `Kreis ${address.stadtkreis}`,
    address.baujahr !== undefined ? `Baujahr ${address.baujahr}` : null,
  ].filter((s): s is string => s !== null);

  const headerMeta = metaParts.join(' · ');

  const reserveValue =
    reserve_m2.bzo_2026 > 0
      ? `+ ${formatM2(reserve_m2.bzo_2026)}`
      : formatM2(0);

  const reserveSecondary = reserve_m2.show_compare
    ? `${copy.result.reserveCompareLabel}: + ${formatM2(reserve_m2.bzo_2016)}`
    : undefined;

  const chfValue =
    net_chf.high > 0
      ? formatRangeMio(net_chf.low, net_chf.high)
      : formatCHF(0);

  const headlineCaveat = caveats[0];

  return (
    <article className="rounded-xl border border-buildx-accent-border bg-buildx-accent-soft p-6">
      <header className="border-b border-buildx-accent-border pb-3">
        <h2 className="text-base font-semibold text-zinc-900">
          {address.display}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">{headerMeta}</p>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <BigNumber
          label={copy.result.reserveLabel}
          value={reserveValue}
          caption={copy.result.reserveSubline}
          secondary={reserveSecondary}
        />
        <BigNumber
          label={copy.result.chfLabel}
          value={chfValue}
          caption={copy.result.chfSubline}
        />
        <FeasibilityAmpel {...feasibility} />
        <BigNumber
          label={copy.result.confidenceLabel}
          value={`${confidence} / 100`}
          caption={headlineCaveat}
        />
      </div>

      <footer className="mt-6 flex flex-col gap-3">
        <BzoDisclosure />
        {askingPriceCHF !== undefined && net_chf.base > 0 && (() => {
          const ratio = net_chf.base / askingPriceCHF;
          const color =
            ratio >= 0.8 ? 'text-green-700' :
            ratio >= 0.5 ? 'text-yellow-700' :
                           'text-red-700';
          return (
            <p className={`text-xs font-medium ${color}`}>
              {copy.askingPrice.hint}{' '}
              <span className="font-semibold">{formatPct(ratio)}</span>{' '}
              {copy.askingPrice.ofPrice}{' '}
              ({formatSingleMio(askingPriceCHF)})
            </p>
          );
        })()}
      </footer>
    </article>
  );
}
