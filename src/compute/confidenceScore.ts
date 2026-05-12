// Confidence score: deterministic deductions from a 100 baseline. Spec §7.4.
// Caveats[] follows the priority order from §7.4 (display order). Deduction
// order in this function is mathematical and irrelevant since deductions are
// additive.

import type { DemoAddress } from '../data/types';
import { copy } from '../lib/copy';

const KNOWN_ZONES = new Set(['W2', 'W3', 'W4', 'W5', 'K', 'Z5']);
const NORMAL_BAUJAHR_MIN = 1900;
const NORMAL_BAUJAHR_MAX = 2010;

export interface ConfidenceOutput {
  score: number;
  caveats: string[];
}

export function confidenceScore(address: DemoAddress): ConfidenceOutput {
  // Denkmal-inventar: reserve is 0 elsewhere, score is informational.
  if (address.denkmal_status === 'inventar') {
    return { score: 0, caveats: [] };
  }

  let score = 100;

  // Structural caps that always apply in v0:
  score -= 20; // Statik nicht geprüft
  score -= 5;  // Marktwert from Stadtkreis cluster
  score -= 5;  // BZO 2026 noch nicht rechtskräftig

  // Dynamic deductions:
  if (address.isos_status === 'hinweis') score -= 10;
  if (!KNOWN_ZONES.has(address.zone_code)) score -= 5;
  if (
    address.baujahr < NORMAL_BAUJAHR_MIN ||
    address.baujahr > NORMAL_BAUJAHR_MAX
  ) {
    score -= 5;
  }

  // Caveats in §7.4 priority order. caveats[0] is shown next to the score.
  const caveats: string[] = [];
  if (address.isos_status === 'hinweis') caveats.push(copy.caveats.isosHinweis);
  caveats.push(copy.caveats.statikGap);
  caveats.push(copy.caveats.bzoOeffentlicheAuflage);
  caveats.push(copy.caveats.marktwertCluster);
  if (!KNOWN_ZONES.has(address.zone_code)) caveats.push(copy.caveats.edgeZone);
  if (
    address.baujahr < NORMAL_BAUJAHR_MIN ||
    address.baujahr > NORMAL_BAUJAHR_MAX
  ) {
    caveats.push(copy.caveats.edgeBaujahr);
  }

  return { score, caveats };
}
