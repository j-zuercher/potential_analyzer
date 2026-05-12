// Applies Denkmal short-circuit and ISOS rules. ISOS Hinweis is a flag, not a
// reserve multiplier (Decision C, spec §7.2). Denkmal-inventar AND ISOS-inventar
// both force reserve to 0.

import type { DemoAddress, AmpelStatus } from '../data/types';
import type { ReserveOutput } from './computeReserve';

export interface FeasibilityOutput {
  reserve_m2: ReserveOutput;
  feasibility: {
    az_reserve: AmpelStatus;
    isos: AmpelStatus;
    denkmal: AmpelStatus;
  };
}

export function applyFeasibility(
  address: DemoAddress,
  reserve: ReserveOutput
): FeasibilityOutput {
  const denkmal: AmpelStatus =
    address.denkmal_status === 'inventar' ? 'red' : 'green';

  const isos: AmpelStatus =
    address.isos_status === 'inventar'
      ? 'red'
      : address.isos_status === 'hinweis'
      ? 'yellow'
      : 'green';

  const blocked = denkmal === 'red' || isos === 'red';

  const finalReserve: ReserveOutput = blocked
    ? { bzo_2016: 0, bzo_2026: 0, show_compare: false }
    : reserve;

  const az_reserve: AmpelStatus = finalReserve.bzo_2026 > 0 ? 'green' : 'red';

  return {
    reserve_m2: finalReserve,
    feasibility: { az_reserve, isos, denkmal },
  };
}
