// Geocoder source: address string → WGS84 coordinates + optional EGRID/EGID.
// Uses api3.geo.admin.ch SearchServer — public, no key required.

import { ok, fail, type Result } from '../../lib/result';

export interface GeocoderResult {
  display: string;
  lon: number;
  lat: number;
  egrid?: string;
  egid?: number;      // numeric EGID for display (parsed from gwrKey)
  gwrKey?: string;    // "151889_0" style key — required for GWR MapServer lookup
}

export type GeocoderFailure = 'no_match' | 'network_error';

interface SearchAttrs {
  lon?: unknown;
  lat?: unknown;
  label?: unknown;
  featureId?: unknown; // "151889_0" — EGID + entrance seq; present in real API responses
  egid?: unknown;      // numeric EGID — present in mock responses, absent in real API
  egrid?: unknown;
}

interface SearchResponse {
  results?: Array<{ attrs?: SearchAttrs }>;
}

const BASE = 'https://api3.geo.admin.ch/rest/services/api/SearchServer';

export async function geocode(
  query: string,
  fetchFn: typeof fetch = fetch
): Promise<Result<GeocoderResult, GeocoderFailure>> {
  const trimmed = query.trim();
  if (!trimmed) return fail('no_match');

  const url =
    `${BASE}?searchText=${encodeURIComponent(trimmed)}` +
    `&type=locations&origins=address&limit=1&lang=de`;

  let response: Response;
  try {
    response = await fetchFn(url);
  } catch {
    return fail('network_error');
  }

  if (!response.ok) return fail('network_error');

  let body: SearchResponse;
  try {
    body = (await response.json()) as SearchResponse;
  } catch {
    return fail('network_error');
  }

  const attrs = body.results?.[0]?.attrs;
  if (!attrs) return fail('no_match');

  const { lon, lat, label, featureId, egid, egrid } = attrs;
  if (typeof lon !== 'number' || typeof lat !== 'number') return fail('no_match');

  // Strip HTML tags the API wraps around matched tokens (e.g. <b>Bahnhofstrasse</b>).
  const display =
    typeof label === 'string' ? label.replace(/<[^>]+>/g, '').trim() : trimmed;

  // The real API returns featureId = "151889_0" (EGID_entranceSeq).
  // The GWR MapServer requires the full featureId string for lookup — bare numeric IDs 404.
  // We also parse the numeric EGID for display in the result card header.
  const gwrKey = typeof featureId === 'string' && featureId ? featureId : undefined;
  const parsedEgid = gwrKey
    ? parseInt(gwrKey.split('_')[0], 10)
    : (typeof egid === 'number' ? egid : undefined);

  return ok({
    display,
    lon,
    lat,
    ...(typeof egrid === 'string' && egrid ? { egrid } : {}),
    ...(parsedEgid !== undefined && !isNaN(parsedEgid) ? { egid: parsedEgid } : {}),
    ...(gwrKey !== undefined ? { gwrKey } : {}),
  });
}
