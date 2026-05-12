// Net CHF range from reserve, marktwert, baukosten. Decision D: bauweise of
// the Aufstockung matches existing bauweise (spec §7.3).

import type { DemoAddress, EconomicAssumptions } from '../data/types';
import { ok, fail, type Result } from '../lib/result';

export interface NetCHFOutput {
  low: number;
  base: number;
  high: number;
}

export function computeNetCHF(
  address: DemoAddress,
  reserve_2026: number,
  economics: EconomicAssumptions
): Result<NetCHFOutput, 'no_marktwert_data' | 'no_baukosten_data'> {
  if (reserve_2026 <= 0) {
    return ok({ low: 0, base: 0, high: 0 });
  }

  // Marktwert lookup is hard-required (Phase 8 hardening, spec §7.3).
  const zoneCells = economics.marktwert[address.zone_code];
  if (!zoneCells) return fail('no_marktwert_data');
  const cell = zoneCells[String(address.stadtkreis)];
  if (!cell) return fail('no_marktwert_data');

  const baukosten = economics.baukosten[address.bauweise_bestand];
  if (!baukosten) return fail('no_baukosten_data');

  const { STATIK_SURCHARGE_PCT, NEBENKOSTEN_PCT } = economics.constants;
  const surcharge = (1 + STATIK_SURCHARGE_PCT) * (1 + NEBENKOSTEN_PCT);

  const gross_low = reserve_2026 * cell.low_chf_per_m2;
  const gross_high = reserve_2026 * cell.high_chf_per_m2;
  const build_low = reserve_2026 * baukosten.low_chf_per_m2;
  const build_high = reserve_2026 * baukosten.high_chf_per_m2;

  // Conservative pairing: low gross with high build cost, and vice versa.
  const low = gross_low - build_high * surcharge;
  const high = gross_high - build_low * surcharge;
  const base = (low + high) / 2;

  return ok({ low, base, high });
}
