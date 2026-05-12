// Building source: EGID → bestehende BGF + Baujahr from the Swiss GWR.
// Uses the geo.admin.ch MapServer feature endpoint — public, no key, no proxy needed.
//
// BGF approximation: GASTW (floors) × GAREA (footprint m²). This is a known
// proxy; confidenceScore deducts 10 pts when this path is taken (roadmap note).
// If the geocoder returned no EGID, returns 'no_egid' so analyze() can fall back
// to bestehende_bgf = 0 and let the compute layer treat the parcel as empty.

import { ok, fail, type Result } from '../../lib/result';

export interface BuildingResult {
  bestehende_bgf: number;
  baujahr?: number;
  egrid?: string;
  garea?: number; // footprint m² — used to estimate parzelle_m2 in analyze.ts
}

export type BuildingFailure = 'no_egid' | 'not_found' | 'network_error';

const GWR_BASE =
  'https://api3.geo.admin.ch/rest/services/ech/MapServer' +
  '/ch.bfs.gebaeude_wohnungs_register';

interface GWRAttributes {
  gastw?: unknown;   // Anzahl Vollgeschosse (floors)
  garea?: unknown;   // Gebäudegrundfläche in m²
  gbauj?: unknown;   // Baujahr
  egris_egrid?: unknown;
}

interface GWRResponse {
  feature?: {
    attributes?: GWRAttributes;
  };
}

export async function fetchBuilding(
  egid: number | undefined,
  fetchFn: typeof fetch = fetch
): Promise<Result<BuildingResult, BuildingFailure>> {
  if (egid === undefined) return fail('no_egid');

  const url = `${GWR_BASE}/${egid}?returnGeometry=false`;

  let response: Response;
  try {
    response = await fetchFn(url);
  } catch {
    return fail('network_error');
  }

  if (response.status === 404) return fail('not_found');
  if (!response.ok) return fail('network_error');

  let body: GWRResponse;
  try {
    body = (await response.json()) as GWRResponse;
  } catch {
    return fail('network_error');
  }

  const attrs = body.feature?.attributes;
  if (!attrs) return fail('not_found');

  const floors = typeof attrs.gastw === 'number' ? attrs.gastw : 0;
  const footprint = typeof attrs.garea === 'number' ? attrs.garea : 0;
  const bestehende_bgf = Math.round(floors * footprint);

  const baujahr =
    typeof attrs.gbauj === 'number' &&
    attrs.gbauj >= 1700 &&
    attrs.gbauj <= 2100
      ? (attrs.gbauj as number)
      : undefined;

  const egrid =
    typeof attrs.egris_egrid === 'string' && attrs.egris_egrid
      ? (attrs.egris_egrid as string)
      : undefined;

  const garea = footprint > 0 ? footprint : undefined;

  return ok({ bestehende_bgf, baujahr, egrid, garea });
}
