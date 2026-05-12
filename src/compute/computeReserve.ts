// Reserve BGF under both BZO regimes. Negative values clipped to 0.
// Pure: same input → same output. Spec §7.1.

import type { DemoAddress, EconomicAssumptions } from '../data/types';
import { ok, fail, type Result } from '../lib/result';

export interface ReserveOutput {
  bzo_2016: number;
  bzo_2026: number;
  show_compare: boolean;
}

export function computeReserve(
  address: DemoAddress,
  economics: EconomicAssumptions
): Result<ReserveOutput, 'unknown_zone'> {
  const az_2016 = economics.bzo.bzo_2016[address.zone_code];
  const az_2026 = economics.bzo.bzo_2026[address.zone_code];

  if (az_2016 === undefined || az_2026 === undefined) {
    return fail('unknown_zone');
  }

  const max_2016 = az_2016 * address.parzelle_m2;
  const max_2026 = az_2026 * address.parzelle_m2;

  const reserve_2016 = Math.max(0, max_2016 - address.bestehende_bgf);
  const reserve_2026 = Math.max(0, max_2026 - address.bestehende_bgf);

  const threshold = economics.constants.BZO_COMPARE_THRESHOLD;
  const show_compare =
    reserve_2026 > 0 &&
    Math.abs(reserve_2026 - reserve_2016) / reserve_2026 > threshold;

  return ok({ bzo_2016: reserve_2016, bzo_2026: reserve_2026, show_compare });
}
