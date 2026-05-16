// Validation script: compare tool reserve estimates against 5 confirmed
// Aufstockung Baugesuch cases in Stadt Zürich (all completed 2016–2021).
// Definition C: pass if |tool_estimate - actual_bgf_added| / actual_bgf_added <= 30%
//
// Run: node scripts/validate-baugesuch.mjs
// Requires Node >= 18 (built-in fetch). No dev server needed — calls public APIs directly.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

// Load AZ table from economic_assumptions.json
const econ = JSON.parse(readFileSync(join(root, 'src/data/economic_assumptions.json'), 'utf8'));
const BZO_2016 = econ.bzo.bzo_2016;
const BZO_2026 = econ.bzo.bzo_2026;

// ─── Coverage ratio for parzelle estimation (from analyze.ts) ──────────────
const COVERAGE_RATIO = { W2: 0.25, W3: 0.35, W4: 0.40, W5: 0.45, K: 0.55, Z5: 0.60 };
function estimateParzelle(garea, zone_code) {
  return Math.round(garea / (COVERAGE_RATIO[zone_code] ?? 0.35));
}

// ─── LV95 conversion (from zoning.ts) ──────────────────────────────────────
function wgs84ToLv95(lat, lon) {
  const phi = (lat * 3600 - 169028.66) / 10000;
  const lam = (lon * 3600 - 26782.5)   / 10000;
  const E = 2600072.37 + 211455.93*lam - 10938.51*lam*phi - 0.36*lam*phi**2 - 44.54*lam**3;
  const N = 1200147.07 + 308807.95*phi + 3745.25*lam**2 + 76.63*phi**2 - 194.56*lam**2*phi + 119.79*phi**3;
  return [E, N];
}
function bboxParam(lat, lon, m = 200) {
  const [E, N] = wgs84ToLv95(lat, lon);
  return [E-m, N-m, E+m, N+m].map(Math.round).join(',');
}

function canonicalZone(raw) {
  const t = raw.trim();
  if (t.startsWith('W2')) return 'W2';
  if (t.startsWith('W3')) return 'W3';
  if (t.startsWith('W4')) return 'W4';
  if (t.startsWith('W5')) return 'W5';
  if (t.startsWith('W6')) return 'W5';
  if (t.startsWith('K'))  return 'K';
  if (t.startsWith('Z5')) return 'Z5';
  if (t.startsWith('Q'))  return 'W3';
  return null;
}

// ─── API callers ───────────────────────────────────────────────────────────
async function geocode(address) {
  const url = `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(address)}&type=locations&origins=address&limit=1&lang=de`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`geocoder ${r.status}`);
  const body = await r.json();
  const attrs = body.results?.[0]?.attrs;
  if (!attrs || typeof attrs.lat !== 'number') return null;
  return { lat: attrs.lat, lon: attrs.lon, egid: attrs.egid ?? null, display: attrs.label?.replace(/<[^>]+>/g,'').trim() ?? address };
}

async function fetchZone(lat, lon) {
  const params = new URLSearchParams({
    SERVICE: 'WFS', VERSION: '1.1.0', REQUEST: 'GetFeature',
    TYPENAME: 'bzo_zone_v', BBOX: bboxParam(lat, lon),
    PROPERTYNAME: 'typ,rechtsstatus', OUTPUTFORMAT: 'application/vnd.geo+json', MAXFEATURES: '50',
  });
  const url = `https://www.ogd.stadt-zuerich.ch/wfs/geoportal/Nutzungsplanung___kommunale_Bau__und_Zonenordnung__BZO_?${params}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`zoning ${r.status}`);
  const body = await r.json();
  const candidates = (body.features ?? [])
    .filter(f => f.properties?.rechtsstatus === 'inKraft')
    .map(f => canonicalZone(String(f.properties?.typ ?? '')))
    .filter(Boolean);
  if (!candidates.length) return null;
  const counts = {};
  for (const z of candidates) counts[z] = (counts[z] ?? 0) + 1;
  const RANK = { W2: 0, W3: 1, W4: 2, W5: 3, K: 4, Z5: 5 };
  return Object.keys(counts).sort((a,b) => (counts[b]-counts[a]) || (RANK[a]??99)-(RANK[b]??99))[0];
}

async function fetchBuilding(egid) {
  if (!egid) return null;
  const url = `https://api3.geo.admin.ch/rest/services/api/MapServer/ch.bfs.gebaeude_wohnungs_register/${egid}?sr=4326&returnGeometry=false`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const body = await r.json();
  const attrs = body.feature?.attributes ?? body.results?.[0]?.attributes;
  if (!attrs) return null;
  return {
    garea:  typeof attrs.garea === 'number'  ? attrs.garea  : null,
    gastw:  typeof attrs.gastw === 'number'  ? attrs.gastw  : null,
    baujahr: typeof attrs.gbauj === 'number' ? attrs.gbauj  : null,
    egrid:  attrs.egrid ?? null,
  };
}

// ─── Test cases (from research agent) ─────────────────────────────────────
// actual_bgf_added: best available proxy for additional BGF built
const CASES = [
  {
    label: 'Case 1: Hofwiesenstrasse 22, 8057',
    address: 'Hofwiesenstrasse 22, 8057 Zürich',
    actual_bgf_added: 850,   // EBF delta 758 m² × 1.1 BGF factor (midpoint proxy)
    actual_note: 'EBF +758 m² × 1.1 BGF/EBF proxy; 2 floors added on 4-floor 1982 Zeilenbau',
  },
  {
    label: 'Case 2: Widmerstrasse 73, 8038',
    address: 'Widmerstrasse 73, 8038 Zürich',
    actual_bgf_added: 880,   // Timbatec: 880 m² hollow box element area used
    actual_note: '880 m² hollow-box elements = approx new floor plate; 1 floor added on 4-floor 1977 MFH',
  },
  {
    label: 'Case 3: Erikastrasse 11, 8003',
    address: 'Erikastrasse 11, 8003 Zürich',
    actual_bgf_added: 155,   // estimated: 11 m ridge × ~15 m depth × 1 floor
    actual_note: 'Rough estimate from ridge span; 1 floor added on 4-floor 1946 building (weakest data)',
  },
  {
    label: 'Case 4: Guggachstrasse 30, 8057 (best case)',
    address: 'Guggachstrasse 30, 8057 Zürich',
    actual_bgf_added: 177,   // 327 m² post-BGF − ~150 m² pre-BGF (2 floors × ~65 m²)
    actual_note: 'Post-BGF 327 m² confirmed; pre-BGF ~150 m² estimated; exhausted AZ reserve per source',
    known_parzelle: 376,     // confirmed from swiss-arc.ch
  },
  {
    label: 'Case 5: Münchhaldenstrasse 22, 8008',
    address: 'Münchhaldenstrasse 22, 8008 Zürich',
    actual_bgf_added: null,  // not published — skip in accuracy test
    actual_note: '4 new attic apartments added; BGF not published — identifier only',
  },
];

// ─── Validation run ────────────────────────────────────────────────────────
console.log('\n=== BuildX Potenzial Analyzer — Baugesuch Validation ===');
console.log('Definition C: |tool_reserve - actual_bgf_added| / actual_bgf_added ≤ 30%\n');

for (const c of CASES) {
  console.log(`\n--- ${c.label} ---`);
  try {
    const geo = await geocode(c.address);
    if (!geo) { console.log('  ✗ Geocode: no result'); continue; }
    console.log(`  Geocoded: ${geo.display} (lat ${geo.lat.toFixed(4)}, lon ${geo.lon.toFixed(4)}, EGID ${geo.egid ?? 'n/a'})`);

    const zone = await fetchZone(geo.lat, geo.lon);
    if (!zone) { console.log('  ✗ Zone: no result'); continue; }
    console.log(`  Zone: ${zone}`);

    const bldg = await fetchBuilding(geo.egid);
    if (bldg) {
      console.log(`  GWR: garea=${bldg.garea} m², gastw=${bldg.gastw}, baujahr=${bldg.baujahr}`);
    } else {
      console.log('  GWR: no data (EGID missing or not found)');
    }

    // Parzelle estimation
    const parzelle = c.known_parzelle
      ? c.known_parzelle
      : (bldg?.garea ? estimateParzelle(bldg.garea, zone) : 500);
    const source = c.known_parzelle ? 'known' : (bldg?.garea ? 'garea estimate' : 'default 500');
    console.log(`  Parzelle: ${parzelle} m² (${source})`);

    // BGF estimation
    let bestehende_bgf = 0;
    if (bldg?.garea && bldg?.gastw) {
      bestehende_bgf = Math.round(bldg.garea * bldg.gastw * 0.8); // GASTW × GAREA × 0.8 proxy
    }
    console.log(`  Bestehende BGF: ${bestehende_bgf} m² (${bldg ? 'GWR proxy' : 'unknown → 0'})`);

    // Reserve calculation
    const az_2026 = BZO_2026[zone];
    const az_2016 = BZO_2016[zone];
    if (!az_2026) { console.log(`  ✗ No AZ for zone ${zone}`); continue; }

    const max_2026 = parzelle * az_2026;
    const max_2016 = az_2016 ? parzelle * az_2016 : 0;
    const reserve_2026 = Math.max(0, max_2026 - bestehende_bgf);
    const reserve_2016 = Math.max(0, max_2016 - bestehende_bgf);

    console.log(`  AZ: ${az_2016} (2016) → ${az_2026} (2026)`);
    console.log(`  Max BGF: ${Math.round(max_2016)} m² (2016) → ${Math.round(max_2026)} m² (2026)`);
    console.log(`  Tool reserve: ${Math.round(reserve_2016)} m² (2016), ${Math.round(reserve_2026)} m² (2026)`);

    if (c.actual_bgf_added !== null) {
      const error = Math.abs(reserve_2026 - c.actual_bgf_added) / c.actual_bgf_added;
      const pass = error <= 0.30;
      console.log(`  Actual added: ~${c.actual_bgf_added} m² (${c.actual_note})`);
      console.log(`  Error: ${(error * 100).toFixed(0)}%  →  Definition C: ${pass ? '✓ PASS' : '✗ FAIL'}`);
    } else {
      console.log(`  Skip accuracy test: ${c.actual_note}`);
    }
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
  }
}

console.log('\n=== Done ===\n');
