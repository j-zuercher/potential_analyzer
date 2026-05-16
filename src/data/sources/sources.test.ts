import { describe, it, expect, vi } from 'vitest';
import { geocode } from './geocoder';
import { fetchZoning } from './zoning';
import { fetchBuilding } from './building';
import { deriveBauweise, extractStadtkreis, estimateParzelle } from '../../compute/analyze';

// ─── Fetch mock helpers ────────────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

function throwingFetch(): typeof fetch {
  return vi.fn().mockRejectedValue(new Error('network failure'));
}

// ─── geocode ──────────────────────────────────────────────────────────────────

describe('geocode', () => {
  it('happy path: strips HTML label, parses egid and gwrKey from featureId', async () => {
    const body = {
      results: [{
        attrs: {
          lon: 8.5432,
          lat: 47.3769,
          label: '<b>Bahnhofstrasse</b> 42, 8001 Zürich',
          featureId: '123456_0', // real API format
        },
      }],
    };
    const r = await geocode('Bahnhofstrasse 42, 8001 Zürich', mockFetch(body));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.lon).toBeCloseTo(8.5432);
    expect(r.data.lat).toBeCloseTo(47.3769);
    expect(r.data.egid).toBe(123456);     // parsed from featureId
    expect(r.data.gwrKey).toBe('123456_0'); // passed to fetchBuilding
    expect(r.data.display).toBe('Bahnhofstrasse 42, 8001 Zürich');
  });

  it('falls back to attrs.egid when featureId absent (legacy mock responses)', async () => {
    const body = {
      results: [{
        attrs: { lon: 8.5432, lat: 47.3769, label: 'Test', egid: 99999 },
      }],
    };
    const r = await geocode('Test', mockFetch(body));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.egid).toBe(99999);
    expect(r.data.gwrKey).toBeUndefined(); // no featureId → no gwrKey
  });

  it('empty results → no_match', async () => {
    const r = await geocode('gibberish xyz', mockFetch({ results: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_match');
  });

  it('network failure → network_error', async () => {
    const r = await geocode('any address', throwingFetch());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('network_error');
  });
});

// ─── fetchZoning ──────────────────────────────────────────────────────────────

describe('fetchZoning', () => {
  it('happy path: returns zone_code and default parzelle_m2', async () => {
    const body = {
      features: [{
        properties: { typ: 'W3', rechtsstatus: 'inKraft' },
      }],
    };
    const r = await fetchZoning(47.376, 8.543, mockFetch(body));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.zone_code).toBe('W3');
    expect(r.data.parzelle_m2).toBe(500); // fixed default (no area in WFS)
  });

  it('empty features → no_zone_data', async () => {
    const r = await fetchZoning(47.376, 8.543, mockFetch({ features: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_zone_data');
  });
});

// ─── fetchBuilding ────────────────────────────────────────────────────────────

describe('fetchBuilding', () => {
  it('undefined gwrKey → no_egid without calling fetch', async () => {
    const spy = vi.fn();
    const r = await fetchBuilding(undefined, spy as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_egid');
    expect(spy).not.toHaveBeenCalled();
  });

  it('happy path: BGF = gastw × garea, baujahr and egrid extracted', async () => {
    const body = {
      feature: {
        attributes: {
          gastw: 4,
          garea: 180.0,
          gbauj: 1968,
          egris_egrid: 'CH935200455',
        },
      },
    };
    const r = await fetchBuilding('99999_0', mockFetch(body));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.bestehende_bgf).toBe(720); // 4 × 180
    expect(r.data.baujahr).toBe(1968);
    expect(r.data.egrid).toBe('CH935200455');
    expect(r.data.garea).toBe(180);
  });
});

// ─── analyze pure helpers ─────────────────────────────────────────────────────

describe('deriveBauweise', () => {
  it('pre-1970 → Massiv', () => expect(deriveBauweise(1955)).toBe('Massiv'));
  it('1970–1999 → Mischbau', () => expect(deriveBauweise(1985)).toBe('Mischbau'));
  it('2000+ → Holz', () => expect(deriveBauweise(2010)).toBe('Holz'));
  it('undefined → Massiv (conservative default)', () => expect(deriveBauweise(undefined)).toBe('Massiv'));
});

describe('extractStadtkreis', () => {
  it('PLZ 8008 → Kreis 8', () => expect(extractStadtkreis('Seefeldstrasse 100, 8008 Zürich')).toBe(8));
  it('PLZ 8050 → Kreis 11', () => expect(extractStadtkreis('Oerlikonerstrasse 12, 8050 Zürich')).toBe(11));
  it('PLZ 8001 → Kreis 1', () => expect(extractStadtkreis('Bahnhofstrasse 42, 8001 Zürich')).toBe(1));
  it('no PLZ → undefined', () => expect(extractStadtkreis('London SW1A 1AA')).toBeUndefined());
});

describe('estimateParzelle', () => {
  it('W3 zone: 175 m² footprint → 500 m² parcel (175/0.35)', () =>
    expect(estimateParzelle(175, 'W3')).toBe(500));
  it('W4 zone: 200 m² footprint → 500 m² parcel (200/0.40)', () =>
    expect(estimateParzelle(200, 'W4')).toBe(500));
  it('unknown zone: falls back to W3 ratio (0.35)', () =>
    expect(estimateParzelle(175, 'X9')).toBe(500));
});
