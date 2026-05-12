// Geocoder source: address string → WGS84 coordinates + optional EGRID/EGID.
// Uses api3.geo.admin.ch SearchServer — public, no key required.

import { ok, fail, type Result } from '../../lib/result';

export interface GeocoderResult {
  display: string;
  lon: number;
  lat: number;
  egrid?: string;
  egid?: number;
}

export type GeocoderFailure = 'no_match' | 'network_error';

interface SearchAttrs {
  lon?: unknown;
  lat?: unknown;
  label?: unknown;
  egid?: unknown;
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

  const { lon, lat, label, egid, egrid } = attrs;
  if (typeof lon !== 'number' || typeof lat !== 'number') return fail('no_match');

  // Strip HTML tags the API wraps around matched tokens (e.g. <b>Bahnhofstrasse</b>).
  const display =
    typeof label === 'string' ? label.replace(/<[^>]+>/g, '').trim() : trimmed;

  return ok({
    display,
    lon,
    lat,
    ...(typeof egrid === 'string' && egrid ? { egrid } : {}),
    ...(typeof egid === 'number' ? { egid } : {}),
  });
}
