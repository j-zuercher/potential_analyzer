// Pipeline orchestrator. Two entry points:
//   analyze()     — synchronous, fixture-based (used by compute.test.ts, v0 UI)
//   analyzeLive() — async, chains the three live sources (v0.5 UI)

import type {
  AnalysisResult,
  LiveAnalysisResult,
  EconomicAssumptions,
  DemoAddress,
  ResolvedAddress,
  UserInputs,
  Bauweise,
  Stadtkreis,
} from '../data/types';
import { ok, fail, type Result } from '../lib/result';
import { copy } from '../lib/copy';
import { addressMatch } from './addressMatch';
import { computeReserve } from './computeReserve';
import { applyFeasibility } from './applyFeasibility';
import { computeNetCHF } from './computeNetCHF';
import { confidenceScore } from './confidenceScore';
import type { GeocoderResult, GeocoderFailure } from '../data/sources/geocoder';
import type { ZoningResult, ZoningFailure } from '../data/sources/zoning';
import type { BuildingResult, BuildingFailure } from '../data/sources/building';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalyzeFailure =
  | 'no_match'
  | 'unknown_zone'
  | 'no_marktwert_data'
  | 'no_baukosten_data'
  | 'no_zone_data'
  | 'no_stadtkreis';

// Injected fetcher bundle — each field is a function matching the source's
// signature minus the optional fetchFn param (caller wires that via closure).
export interface Sources {
  geocode: (query: string) => Promise<Result<GeocoderResult, GeocoderFailure>>;
  fetchZoning: (lat: number, lon: number) => Promise<Result<ZoningResult, ZoningFailure>>;
  fetchBuilding: (egid: number | undefined) => Promise<Result<BuildingResult, BuildingFailure>>;
}

// ─── Helpers (pure, exported for testing) ────────────────────────────────────

// Fraction of parcel area typically covered by the building footprint per zone.
// Used to back-calculate parzelle_m2 from the GWR footprint (garea).
// Conservative values keep reserve estimates grounded rather than inflated.
const COVERAGE_RATIO: Partial<Record<string, number>> = {
  W2: 0.25, W3: 0.35, W4: 0.40, W5: 0.45, K: 0.55, Z5: 0.60,
};

export function estimateParzelle(garea: number, zone_code: string): number {
  const ratio = COVERAGE_RATIO[zone_code] ?? 0.35;
  return Math.round(garea / ratio);
}

// Heuristic: bauweise of Aufstockung follows existing construction era.
export function deriveBauweise(baujahr: number | undefined): Bauweise {
  if (!baujahr || baujahr < 1970) return 'Massiv';
  if (baujahr < 2000) return 'Mischbau';
  return 'Holz';
}

// PLZ → Stadtkreis for all residential postal codes within Stadt Zürich.
// Approximate (PLZ boundaries don't align perfectly with Kreis borders).
const PLZ_TO_KREIS: Partial<Record<string, Stadtkreis>> = {
  '8001': 1,  // Altstadt, Hochschulquartier
  '8002': 2,  // Enge
  '8003': 3,  // Wiedikon, Sihlfeld
  '8004': 4,  // Aussersihl, Langstrasse
  '8005': 5,  // Escher Wyss, Gewerbeschule
  '8006': 6,  // Unterstrass, Oberstrass
  '8008': 8,  // Riesbach, Seefeld
  '8032': 8,  // Mühlebach (Kreis 8)
  '8037': 10, // Wipkingen
  '8038': 2,  // Wollishofen
  '8041': 3,  // Leimbach
  '8044': 7,  // Fluntern, Hottingen, Hirslanden
  '8045': 3,  // Friesenberg
  '8046': 10, // Höngg
  '8047': 9,  // Albisrieden
  '8048': 9,  // Altstetten
  '8049': 10, // Höngg Nord
  '8050': 11, // Oerlikon
  '8051': 11, // Affoltern, Seebach
  '8052': 12, // Schwamendingen
  '8053': 7,  // Witikon
  '8055': 3,  // Wiedikon (south)
  '8057': 11, // Seebach
  '8064': 9,  // Altstetten Süd
};

export function extractStadtkreis(display: string): Stadtkreis | undefined {
  const m = display.match(/\b(80\d{2})\b/);
  if (!m) return undefined;
  return PLZ_TO_KREIS[m[1]];
}

// ─── v0 synchronous pipeline (fixture-based) ──────────────────────────────────

export function analyze(
  input: string,
  addresses: readonly DemoAddress[],
  economics: EconomicAssumptions
): Result<AnalysisResult, AnalyzeFailure> {
  const matched = addressMatch(input, addresses);
  if (!matched.ok) return fail('no_match');
  const address = matched.data;

  const reserveResult = computeReserve(address, economics);
  if (!reserveResult.ok) return fail(reserveResult.reason);

  const feas = applyFeasibility(address, reserveResult.data);
  const reserve_2026 = feas.reserve_m2.bzo_2026;

  const chfResult = computeNetCHF(address, reserve_2026, economics);
  if (!chfResult.ok) return fail(chfResult.reason);

  const conf = confidenceScore(address);

  const result: AnalysisResult = {
    address,
    reserve_m2: feas.reserve_m2,
    net_chf: chfResult.data,
    feasibility: feas.feasibility,
    confidence: conf.score,
    caveats: conf.caveats,
  };

  return ok(result);
}

// ─── v0.5 async pipeline (live sources) ───────────────────────────────────────

export async function analyzeLive(
  input: string,
  userInputs: UserInputs,
  sources: Sources,
  economics: EconomicAssumptions
): Promise<Result<LiveAnalysisResult, AnalyzeFailure>> {
  // 1. Geocode the free-form address string.
  const geoResult = await sources.geocode(input);
  if (!geoResult.ok) return fail('no_match');
  const geo = geoResult.data;

  // 2. Fetch zoning and building data in parallel.
  //    Building failure is non-fatal: bestehende_bgf falls back to 0
  //    (treats parcel as empty, confidence docked below).
  const [zoningResult, buildingResult] = await Promise.all([
    sources.fetchZoning(geo.lat, geo.lon),
    sources.fetchBuilding(geo.egid),
  ]);

  if (!zoningResult.ok) return fail('no_zone_data');
  const zoning = zoningResult.data;
  const building = buildingResult.ok ? buildingResult.data : null;

  // 3. Derive Stadtkreis from PLZ in the geocoder display string.
  const stadtkreis = extractStadtkreis(geo.display);
  if (stadtkreis === undefined) return fail('no_stadtkreis');

  // 4. Assemble ResolvedAddress.
  const baujahr = building?.baujahr;
  const parzelle_m2 = building?.garea
    ? estimateParzelle(building.garea, zoning.zone_code)
    : zoning.parzelle_m2; // fixed 500 m² default when garea unavailable

  const address: ResolvedAddress = {
    display: geo.display,
    egrid: building?.egrid ?? geo.egrid ?? 'unknown',
    egid: geo.egid,
    lat: geo.lat,
    lon: geo.lon,
    stadtkreis,
    zone_code: zoning.zone_code,
    parzelle_m2,
    bestehende_bgf: building?.bestehende_bgf ?? 0,
    baujahr,
    bauweise_bestand: deriveBauweise(baujahr),
    isos_status: 'none',    // ISOS integration deferred to v0.6
    denkmal_status: 'none', // Denkmal integration deferred to v0.6
  };

  // 5. Run the pure compute pipeline.
  //    Cast is safe: all fields the compute functions actually access
  //    (zone_code, parzelle_m2, bestehende_bgf, bauweise_bestand,
  //    isos_status, denkmal_status, stadtkreis, baujahr) exist on ResolvedAddress.
  const asDemo = address as unknown as DemoAddress;

  const reserveResult = computeReserve(asDemo, economics);
  if (!reserveResult.ok) return fail(reserveResult.reason);

  const feas = applyFeasibility(asDemo, reserveResult.data);

  const chfResult = computeNetCHF(asDemo, feas.reserve_m2.bzo_2026, economics);
  if (!chfResult.ok) return fail(chfResult.reason);

  const conf = confidenceScore(asDemo);

  // 6. Dock 10 pts when BGF came from the GASTW×GAREA GWR proxy.
  const bgfFromProxy = building !== null;
  const score = Math.max(0, conf.score - (bgfFromProxy ? 10 : 0));
  const caveats = bgfFromProxy
    ? [copy.caveats.bgfProxy, ...conf.caveats]
    : [copy.caveats.bgfUnavailable, ...conf.caveats];

  return ok({
    address,
    reserve_m2: feas.reserve_m2,
    net_chf: chfResult.data,
    feasibility: feas.feasibility,
    confidence: score,
    caveats,
    userInputs,
  });
}
