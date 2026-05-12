// Zoning source: WGS84 coordinates → BZO zone code.
// Uses the Stadt Zürich OGD WFS (public, no account required) via the Vite proxy.
// Endpoint: www.ogd.stadt-zuerich.ch/wfs/geoportal/Nutzungsplanung___kommunale_Bau__und_Zonenordnung__BZO_
// Layer: bzo_zone_v   Attribute: typ (e.g. "W3", "W4", "K", "Z5", "W2bII", "W6" …)
//
// Zone code normalisation: bzo_zone_v uses BZO sub-type codes (W2bII, W6, Ka …).
// We map these to the six canonical codes used in the marktwert/bzo tables.
//
// Parcel area (parzelle_m2) is NOT provided by this WFS.
// A fixed default of 500 m² is returned; confidence is docked in analyze.ts.
//
// The WFS only accepts LV95 (EPSG:2056) coordinates in the BBOX.
// Incoming WGS84 lat/lon is converted via the Swisstopo approximate formula.
// CQL_FILTER spatial predicates are ignored by this server — BBOX is the only
// spatial filter available. MAXFEATURES=50 is used so we can pick the best
// zone client-side from all polygons that overlap the search box.

import { ok, fail, type Result } from '../../lib/result';

export interface ZoningResult {
  zone_code: string;
  parzelle_m2: number;
}

export type ZoningFailure = 'no_zone_data' | 'network_error';

const WFS_BASE  = '/ogd/wfs/geoportal/Nutzungsplanung___kommunale_Bau__und_Zonenordnung__BZO_';
const WFS_LAYER = 'bzo_zone_v';

// Parcel area not available from this WFS — use Stadt Zürich residential median.
const PARCEL_M2_DEFAULT = 500;

// ±200 m in LV95 projected metres — wide enough to always intersect ≥1 zone polygon,
// tight enough not to bleed into a different neighbourhood.
const BBOX_M = 200;

// Approximate WGS84 → LV95 (EPSG:2056) using the Swisstopo formula (~1 m accuracy).
// Reference: swisstopo "Näherungsformeln für die Transformation" (2016).
function wgs84ToLv95(lat: number, lon: number): [number, number] {
  const phi = (lat * 3600 - 169028.66) / 10000;
  const lam = (lon * 3600 - 26782.5)   / 10000;
  const E =
    2600072.37
    + 211455.93 * lam
    -  10938.51 * lam * phi
    -      0.36 * lam * phi ** 2
    -     44.54 * lam ** 3;
  const N =
    1200147.07
    + 308807.95 * phi
    +   3745.25 * lam ** 2
    +     76.63 * phi ** 2
    -    194.56 * lam ** 2 * phi
    +    119.79 * phi ** 3;
  return [E, N];
}

function bboxParam(lat: number, lon: number): string {
  const [E, N] = wgs84ToLv95(lat, lon);
  return [
    Math.round(E - BBOX_M),
    Math.round(N - BBOX_M),
    Math.round(E + BBOX_M),
    Math.round(N + BBOX_M),
  ].join(',');
}

// Map a raw bzo_zone_v `typ` value to one of the six canonical zone codes.
// Returns null for zones outside our marktwert/bzo tables (parks, industry, etc.).
function canonicalZone(raw: string): 'W2' | 'W3' | 'W4' | 'W5' | 'K' | 'Z5' | null {
  const t = raw.trim();
  if (t.startsWith('W2')) return 'W2';
  if (t.startsWith('W3')) return 'W3';
  if (t.startsWith('W4')) return 'W4';
  if (t.startsWith('W5')) return 'W5';
  if (t.startsWith('W6')) return 'W5'; // 6-storey zone ≈ W5 density
  if (t.startsWith('K'))  return 'K';
  if (t.startsWith('Z5')) return 'Z5';
  // Quartiererhaltungszone (QI–QIII): neighbourhood conservation, similar density to W3.
  // Mapped conservatively so addresses in preserved residential streets get a result.
  if (t.startsWith('Q'))  return 'W3';
  return null;
}

// Among matched canonical zones, prefer W-zones (residential) over K/Z5 (commercial)
// so that residential addresses aren't wrongly labelled as Kernzone.
// Within W-zones, pick the most common one by frequency.
const ZONE_RANK: Record<string, number> = { W2: 0, W3: 1, W4: 2, W5: 3, K: 4, Z5: 5 };

function selectBestZone(candidates: string[]): string | null {
  if (candidates.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const z of candidates) counts[z] = (counts[z] ?? 0) + 1;

  // Sort by: frequency desc, then rank asc (prefer W-zones on tie)
  return Object.keys(counts).sort((a, b) => {
    const freqDiff = counts[b] - counts[a];
    if (freqDiff !== 0) return freqDiff;
    return (ZONE_RANK[a] ?? 99) - (ZONE_RANK[b] ?? 99);
  })[0] ?? null;
}

interface GeoJSONFeature {
  properties?: Record<string, unknown>;
}
interface GeoJSONFeatureCollection {
  features?: GeoJSONFeature[];
}

export async function fetchZoning(
  lat: number,
  lon: number,
  fetchFn: typeof fetch = fetch
): Promise<Result<ZoningResult, ZoningFailure>> {
  const params = new URLSearchParams({
    SERVICE:      'WFS',
    VERSION:      '1.1.0',
    REQUEST:      'GetFeature',
    TYPENAME:     WFS_LAYER,
    BBOX:         bboxParam(lat, lon),
    PROPERTYNAME: 'typ,rechtsstatus',   // skip geometry — we only need the zone code
    OUTPUTFORMAT: 'application/vnd.geo+json',
    MAXFEATURES:  '50',
  });

  let response: Response;
  try {
    response = await fetchFn(`${WFS_BASE}?${params.toString()}`);
  } catch {
    return fail('network_error');
  }

  if (!response.ok) return fail('network_error');

  let body: GeoJSONFeatureCollection;
  try {
    body = (await response.json()) as GeoJSONFeatureCollection;
  } catch {
    return fail('network_error');
  }

  const features = body.features ?? [];

  // Collect canonical zone codes from all valid (inKraft) features.
  const matched: string[] = [];
  for (const f of features) {
    const props = f.properties;
    if (!props) continue;
    if (props['rechtsstatus'] !== 'inKraft') continue;
    const raw = props['typ'];
    if (typeof raw !== 'string') continue;
    const canonical = canonicalZone(raw);
    if (canonical) matched.push(canonical);
  }

  const zone_code = selectBestZone(matched);
  if (!zone_code) return fail('no_zone_data');

  return ok({ zone_code, parzelle_m2: PARCEL_M2_DEFAULT });
}
