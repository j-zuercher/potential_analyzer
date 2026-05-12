# Roadmap to v0.5 — Public-Data Pivot for Developers

**Status.** Pivot direction agreed at end of v0. v0 (fixture-based, sales-pitch focus) is shipped and working. v0.5 is a focus shift, not a rewrite.

**Audience for v0.5.** Real-estate developers evaluating an asking price for a Stadt Zürich parcel. They type any address; the tool returns: additional buildable volume, plausible market value, plausible build cost, net potential. Approximate is fine — the goal is "is this asking price defensible given Aufstockungspotenzial?", not "what's the exact CHF down to the franc?"

**Constraint that does not change.** Stays MVP-grade. Public data only. Approximations explicitly labeled. Cheap to verify, hard to get wrong by an order of magnitude.

---

## What stays from v0

- Tech stack (Vite + React 18 + TS strict + Tailwind + Vitest + Zod).
- Folder layout: `data/`, `compute/`, `ui/`, `lib/` and the strict layer boundaries.
- The Result<T, R> error-as-value pattern in `lib/result.ts`.
- `lib/format.ts` (Swiss number formatting) and `lib/copy.ts` (German strings).
- Compute pipeline shape: `addressMatch → computeReserve → applyFeasibility → computeNetCHF → confidenceScore` orchestrated by `analyze.ts`.
- All 20 unit tests in `compute.test.ts` — the math is unchanged, only the data sources change.
- The 6 fixture addresses stay in `demo_addresses.json` as **dev test data**: useful for offline development and as a known-good harness for the live integration.

## What changes

- **Address input.** Free-form. No more whitelist matching. Calls live geocoder.
- **Data layer.** Add `data/sources/` with one fetcher per public source. Each returns `Promise<Result<T, R>>` so compute remains pure but UI can `await`.
- **Marktwert.** Static lookup table by `[zone][stadtkreis]`, hand-curated from public sources, with `source` attribution per cell. Coverage: all 12 Stadtkreise × the 5-6 most common zone codes.
- **Baukosten.** Add `Ausbaustandard: 'niedrig' | 'mittel' | 'hoch'` to the type. Cost ranges become `[bauweise][ausbaustandard]`. User picks Ausbaustandard in the UI (radio buttons). Default: mittel.
- **Output framing.** Headline shifts from "Aufstockungspotenzial CHF" to "Net potential vs. asking price (optional input)". User can type an asking price; tool computes ratio.
- **Spec § 8 (curated whitelist).** Becomes obsolete. Replace with a sanity-check list of test addresses across the 12 Kreise.

---

## Public data sources to wire

| Source | Purpose | Endpoint / mechanism | Notes |
|---|---|---|---|
| api3.geo.admin.ch SearchServer | Address → coordinates + EGRID | `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText={query}&type=locations&origins=address` | Free, public, no key. Returns `lon`, `lat`, often EGRID. |
| GeoZH WFS Nutzungsplanung | Coordinate → zone code + AZ | `https://maps.zh.ch/wfs/...` (MGDM 73.1 layer or GeoZH-native) | Tier 1 canton: AZ is in the geodata directly. CORS may require a small proxy in dev. |
| GWR / GeoZH Building layer | EGRID → bestehende BGF, baujahr | GWR public REST or GeoZH WFS Buildings | `GASTW × GAREA` is a reasonable BGF approximation when no 3D mesh. |
| Static marktwert table | Zone + Kreis → CHF/m² range | `data/marktwert_zh.json` | Hand-curated. Source per cell mandatory. RealAdvisor April 2026 medians as starting point. |
| Static baukosten table | Bauweise + Ausbaustandard → CHF/m² | `data/baukosten.json` | From AllHebel framework section 5.2 plus standard Schweizer Baukosten Index. |
| Static BZO 2026 AZ table | Zone code → AZ value | already exists in `economic_assumptions.json` | Verify against öffentliche Auflage doc per spec §12. |

**CORS warning.** Some Stadt Zürich endpoints don't send permissive CORS headers. Easiest dev workaround: a tiny Vite middleware in `vite.config.ts` proxying `/zh/*` → `https://maps.zh.ch/*`. Avoids needing a backend at all.

---

## Updated data model (delta from v0 spec §6.1)

```ts
// New
export type Ausbaustandard = 'niedrig' | 'mittel' | 'hoch';

// Modified
export interface BaukostenEntry {
  bauweise: Bauweise;
  ausbaustandard: Ausbaustandard;
  low_chf_per_m2: number;
  high_chf_per_m2: number;
}

// New: live address lookup result, replaces DemoAddress for the primary path
export interface ResolvedAddress {
  display: string;
  egrid: string;
  egid?: number;
  lat: number;
  lon: number;
  stadtkreis: 1|2|3|4|5|6|7|8|9|10|11|12;
  zone_code: string;
  parzelle_m2: number;
  bestehende_bgf: number;
  baujahr?: number;
  // bauweise still derived from baujahr heuristic in v0.5; user override coming v1
  bauweise_bestand: Bauweise;
  // Feasibility flags TBD: ISOS / Denkmalschutz integration is a v0.6 stretch
  isos_status: IsosStatus;
  denkmal_status: DenkmalStatus;
}

// New optional UI input
export interface UserInputs {
  ausbaustandard: Ausbaustandard;
  asking_price_chf?: number;  // optional, enables price comparison
}
```

The `analyze` orchestrator's signature changes from synchronous to async:

```ts
export async function analyze(
  input: string,
  userInputs: UserInputs,
  sources: Sources,
  economics: EconomicAssumptions
): Promise<Result<AnalysisResult, AnalyzeFailure>>
```

`Sources` is the bundle of live fetchers (geocoder, zoning, building registry).

---

## Build sequence for Claude Code in VS Code

Same Lego principle as v0. Build top-to-bottom, do not skip.

1. **Extend types.** Add `Ausbaustandard`, `ResolvedAddress`, `UserInputs`. Keep existing types.
2. **Marktwert table.** Hand-curate `data/marktwert_zh.json`: 12 Kreise × ~6 zones with `source` per cell. Use the v0 `economic_assumptions.json` cells as the seed and expand.
3. **Baukosten with Ausbaustandard.** Replace flat baukosten with 3 × 3 = 9 cells (bauweise × ausbaustandard).
4. **Geocoder source.** `data/sources/geocoder.ts` calling api3.geo.admin.ch SearchServer. Returns `Result<{lon, lat, egrid?}, 'no_match' | 'network_error'>`.
5. **Zoning source.** `data/sources/zoning.ts` calling GeoZH WFS at the geocoded coordinate. Returns zone code, AZ, parzelle area.
6. **Building source.** `data/sources/building.ts` reading GWR for bestehende BGF and baujahr.
7. **Update `analyze.ts`.** Become async, chain the three sources, then call existing pure compute functions.
8. **Update `AddressInput.tsx`.** No more fixture lookup. Just submit string to `analyze()`.
9. **Add Ausbaustandard radio.** Below the address input. Default: mittel.
10. **Add optional asking-price input.** Shown after first result. Tool computes net potential vs. asking price.
11. **Update `ResultCard.tsx`.** Add an "asking price comparison" line when user provided one.
12. **Adjust tests.** Existing 20 compute tests stay (they test pure compute math). Add 4-6 source tests with mocked fetch to verify each source returns correctly shaped data.

Acceptance criterion for "v0.5 done": user types `Bahnhofstrasse 42, 8001 Zürich`, tool returns a CHF range within 30 seconds, with feasibility ampel and confidence score.

---

## Open questions for the first VS Code session with Claude Code

These deliberately stay open until you actually start the work in VS Code, because they're best resolved with the API responses on screen.

- Does GeoZH WFS allow direct browser CORS, or do we need the Vite proxy?
- What's the actual response shape of `api3.geo.admin.ch/SearchServer` for a typical Zürich address? Specifically does it return EGRID directly or only coordinates?
- What's the cleanest Stadtkreis lookup from coordinates? Either reverse-geocoding to a known field, or a lightweight point-in-polygon against a Stadtkreis GeoJSON.
- For `bestehende_bgf` from GWR: do we trust `GASTW × GAREA` as a BGF proxy, or wait for a 3D-derived value? v0.5 recommendation: trust the proxy, deduct 10 points from confidence.

---

## Continuing in VS Code with Claude Code

The existing folder works as-is. Steps:

```
1. Open VS Code.
2. File → Open Folder → C:\Users\julia\OneDrive\Venture\1_Projects\2_BuildX\2.0 BuildX\potenzial-analyzer-v0
3. Open a terminal (Ctrl + ` ) in that folder.
4. Run:  npm install
5. Run:  npm run dev   (verifies the v0 still works, opens http://localhost:5173)
6. Open Claude Code in the IDE.
7. First prompt to Claude Code:
   "Read ROADMAP_v0_5.md. Then implement step 1 (extend types) and step 2 (marktwert table). Run npm test after each change."
```

Claude Code will pick up the spec, the architecture doc, and this roadmap from the workspace and continue brick-by-brick. Same atomic build pattern as v0; the spec's six engineering rules (pure compute, errors-as-values, single copy.ts, formatting helper, no JSON in UI, comments as why-not-what) carry forward unchanged.

When in doubt during the VS Code work, the canonical references are:

- `../hebel_3_1_potenzial_analyzer_v0_spec.md` (rules + architecture, still authoritative)
- `ROADMAP_v0_5.md` (this file — what changes from v0)
- `compute.test.ts` (the math contract — keep these green at all times)
