# BuildX · Hebel 3.1 Potenzial Analyzer · v0 Spec

> **Pivot note for future readers.** v0 is shipped as a fixture-based sales-pitch demo (this document). Subsequent work pivoted to a public-data MVP for developers, supporting any Stadt Zürich address via live APIs. The architecture, layer rules, types, compute pipeline, and tests carry forward; the data ingestion layer is replaced. See `potenzial-analyzer-v0/ROADMAP_v0_5.md` for the pivot direction. This spec remains authoritative for everything except sections 3, 4.1, 6.2, 8, and 12 — those are superseded by the roadmap.

**Status.** Single source of truth for v0. Supersedes the v0 briefing, architecture, and data model documents. v0.5 pivot direction lives in the project's ROADMAP_v0_5.md.

**Phase.** 6 of 12 in the iterative build methodology. Phase 7 (PM review) may amend this document; downstream phases (8 onward) treat it as locked.

---

## TL;DR

A local web app that takes a Stadt Zürich address, returns additional buildable BGF, a CHF range, a feasibility ampel, and a confidence score, using only public data, with the demo-fidelity polish needed for a sales pitch with sophisticated owners. v0 ships in days. Scope is deliberately narrow.

**Locked decisions, one line each.**

1. Geographic scope: Stadt Zürich only.
2. Primary user: BuildX co-founder during owner pitches on a laptop.
3. Output: four-number card (m² BGF, CHF range, feasibility ampel, confidence).
4. Feasibility evaluation: public-data ampel (AZ reserve, ISOS, Denkmalschutz).
5. UI language: German.
6. Timeline: days. Optimize for demo-fidelity per dev hour.
7. Deployment: local web app on a laptop. Offline-resilient.
8. Tech stack: Vite + React 18 + TypeScript strict + Tailwind + shadcn/ui + Vitest.
9. Data approach: hand-curated JSON fixtures with Zod validation. No live WFS in v0.
10. Zoning regime: BZO 2026 values, with disclosure flag and conditional comparison line to BZO 2016.
11. ISOS Hinweisinventar: yellow ampel and confidence deduction; does not reduce reserve.
12. Aufstockung bauweise: matches existing building bauweise (Decision D, conservative).
13. Quartier granularity: 12 Stadtkreise, keyed `[zone][stadtkreis]`.
14. Confidence score baseline 70 (Statik, Marktwert-cluster, BZO not yet rechtskräftig).
15. Comparison line BZO 2016 vs 2026 shows only when delta exceeds 10%.
16. Fixture validation failure: silent EmptyState for user, loud Zod error in dev console.
17. Six curated demo addresses, one per pitch story type (see §8).

---

## 1. Context and goal

BuildX is an AI-assisted asset-centric intelligence platform for the built environment in Switzerland, pitching to small and mid pension funds, Anlagestiftungen, family offices, and private owners with 3 to 15 buildings. The Potenzialanalyse over six MECE Hebel is the core sales artifact. Hebel 3.1 (Aufstockung und Dachausbau) has the strongest public-data signal and is the natural anchor of any first owner conversation.

The goal of v0 is to let a co-founder type a real Stadt Zürich address into a local web app during a pitch and within 3 seconds show a credible four-number readout of additional buildable potential plus feasibility flags, derived from public data sources only.

Reference solutions: plotmates.ch and raumpioniere.ch. We are not trying to beat them on UX. We are using a thin slice of their core mechanic to anchor BuildX-level conversations with sophisticated owners.

## 2. User and scenario

**User.** BuildX co-founder during an owner-pitch meeting. Audience: 1 to 3 sophisticated property owners who already own multiple buildings.

**Scenario.** Mid-meeting, 15 to 20 minutes after the framework is introduced. Co-founder asks for an address, types it, hits Enter. Result appears within 3 seconds. The four numbers anchor the next 5 minutes of conversation about reserve, feasibility, and what would unlock more.

**Failure mode to design against above all others.** The tool returns an obviously wrong number — negative reserve, zero potential on a building everyone in the room knows is underdeveloped, or a CHF figure off by an order of magnitude. One such moment in a pitch is unrecoverable. The curated demo address whitelist plus Zod validation make this structurally impossible.

## 3. Scope

### 3.1 In scope for v0

- Address input with exact normalized-string match against a curated whitelist of 6 Stadt Zürich addresses.
- BGF reserve computation under BZO 2026 with conditional BZO 2016 comparison.
- Feasibility ampel for AZ reserve, ISOS, and Denkmalschutz, derived from public-data fields stored in the fixture.
- Net CHF range (low / base / high) using zone+Stadtkreis market values and bauweise-keyed construction costs.
- Confidence score from a deterministic deduction formula.
- Empty state when the typed address does not match a fixture entry.
- Offline operation: no network calls during a live demo.

### 3.2 Out of scope for v0 (non-goals)

A fresh AI session will drift toward these. Push back firmly. Each is deferred deliberately.

- Live WFS or geo.admin.ch API calls (deferred to v0.5).
- Other Hebel (1, 2, 4, 5, 6).
- Cantons other than Stadt Zürich.
- Address autocomplete dropdown.
- 3D massing visualization.
- Map preview of the parcel.
- PDF export.
- Accounts, login, persistence beyond browser session.
- Wüest, RealAdvisor, or other licensed market data.
- Static feasibility check (Statik). Confidence score caps at 80 because of this gap, by design.
- UI tests. The compute layer has unit tests; the UI is verified visually.

## 4. UX contract

### 4.1 Input

Single text field. The user types a Stadt Zürich address in any reasonable form:

- "Seefeldstrasse 100, 8008 Zürich"
- "seefeldstr 100"
- "Seefeldstrasse 100"

Matching is exact, not fuzzy. The input is normalized (lowercase, collapse multiple spaces, strip umlauts: ä→a, ö→o, ü→u, ß→ss) and compared character-for-character against each entry's `search_keys` array. Each fixture entry carries 3 to 4 hand-written normalized variants, e.g., `["seefeldstrasse 100, 8008 zurich", "seefeldstr 100", "seefeldstrasse 100"]`. No match → EmptyState. Phase 7 PM cut: Levenshtein and the FUZZY_MATCH_MAX_DISTANCE constant are dropped because in the real use scenario the co-founder types one of 6 known addresses carefully, exactly once.

### 4.2 Output: the four-number card

| Field | Source | Format example |
|---|---|---|
| Adresse + Metadaten | fixture | "Seefeldstrasse 100, 8008 Zürich · EGID 150234567 · Zone W3 · Kreis 8 · Baujahr 1928" |
| Zusätzliche m² BGF | computed | "+ 214 m²" plus subline "AZ Reserve" |
| BZO comparison line | computed, conditional | shown only when `|reserve_2026 − reserve_2016| / reserve_2026 > 0.10` |
| CHF Potenzial Range | computed | "1.3 – 2.6 Mio CHF" plus subline "Netto nach Baukosten" |
| Machbarkeit Ampel | fixture-derived | three lines, each with green/yellow/red dot: AZ Reserve, ISOS, Denkmalschutz |
| Konfidenz | computed | "60 / 100" plus one-line caveat from `caveats[0]` (priority order locked in §7.4) |
| BZO disclosure footer | constant | "BZO 2026 (öffentliche Auflage), negative Vorwirkung beachtet" |

### 4.3 Language and formatting

- All visible strings in `lib/copy.ts`. Inline JSX strings are forbidden.
- CHF values via `formatCHF` helper using `Intl.NumberFormat('de-CH', ...)`. Output: `CHF 2'100'000` with apostrophe as thousands separator.
- m² values via `formatM2` helper. Output: `380 m²`.
- Ranges: `1.3 – 2.6 Mio CHF` (Mio. is the Swiss German abbreviation; en-dash; thin spaces around the dash).
- No em dashes anywhere in any output text. BuildX framework rule.
- Tone: factual, professional, conservative. No marketing voice.

### 4.4 Empty and error states

- **Address not in whitelist.** EmptyState component shows: "Adresse nicht in der Demoauswahl." plus three example addresses pulled from the fixture.
- **Fixture validation failure (boot time).** `fixtureLoader.ts` THROWS on Zod failure. The app does not boot; the user sees a blank page and the dev sees the full Zod error tree in the console. Rationale: a malformed fixture is a dev error during pre-pitch prep, not a user condition. Catching at boot prevents a half-broken app from ever running.
- **Compute-layer error (runtime).** Compute functions return `Result<T, R>` and never throw. UI pattern-matches on `ok`; the `false` branch renders EmptyState with a generic message. Boot-throw and runtime-Result are deliberately different mechanisms for two different failure types.

## 5. Architecture

### 5.1 Tech stack (locked)

| Layer | Choice | Reason |
|---|---|---|
| Build tool | Vite 5 | Fastest dev loop, ESM native, smallest config |
| Framework | React 18 | Largest AI training corpus |
| Language | TypeScript strict | Compiler refuses bad fixture and forgotten error case |
| Styling | Tailwind CSS | No CSS context-switching |
| Components | shadcn/ui | Copied not imported, owner-credible aesthetic |
| State | React useState/useReducer | No global store; tree is two levels deep |
| Validation | Zod | Compile-time type plus runtime guarantee |
| Testing | Vitest, compute layer only | UI is verified visually |
| Lint/format | ESLint + Prettier defaults | No style debates |

### 5.2 Folder layout

```
potenzial-analyzer-v0/
├── src/
│   ├── data/
│   │   ├── types.ts                    # TS types + Zod schemas
│   │   ├── demo_addresses.json         # 6 hand-verified Stadt Zürich addresses
│   │   ├── economic_assumptions.json   # marktwert, baukosten, BZO tables
│   │   └── fixtureLoader.ts            # Load and Zod-validate at boot
│   ├── compute/
│   │   ├── addressMatch.ts
│   │   ├── computeReserve.ts
│   │   ├── applyFeasibility.ts
│   │   ├── computeNetCHF.ts
│   │   ├── confidenceScore.ts
│   │   └── compute.test.ts             # Vitest gate
│   ├── ui/
│   │   ├── App.tsx
│   │   ├── AddressInput.tsx
│   │   ├── ResultCard.tsx
│   │   ├── BigNumber.tsx
│   │   ├── FeasibilityAmpel.tsx
│   │   ├── EmptyState.tsx
│   │   └── BzoDisclosure.tsx
│   ├── lib/
│   │   ├── format.ts                   # CHF, m² Swiss formatting
│   │   ├── copy.ts                     # All German strings, single file
│   │   └── result.ts                   # Result<T, R> type
│   └── main.tsx
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

### 5.3 Layer boundaries

Enforced by convention now, by ESLint `import/no-restricted-paths` in v0.5.

| Layer | Imports allowed from | Imports forbidden from |
|---|---|---|
| `data/` | `lib/` | `compute/`, `ui/`, React |
| `compute/` | `data/`, `lib/` | `ui/`, React, DOM, fetch, localStorage |
| `ui/` | `compute/`, `lib/`, React, shadcn | `data/*.json` directly |
| `lib/` | nothing internal | everything else |

The seam between `data/` and `compute/` is the seam crossed in v0.5 when fixtures become live WFS. Defending it now is free.

### 5.4 The six engineering rules

1. **Pure compute.** Every function in `compute/` is referentially transparent. No `fetch`, `Date.now()`, `Math.random()`, no DOM, no React. Same input always returns same output.
2. **Errors are values.** Compute functions return `Result<T, R> = { ok: true; data: T } | { ok: false; reason: R }`. Never throw. UI pattern-matches `ok`.
3. **Single source for German copy.** Every visible string in `lib/copy.ts`.
4. **Swiss formatting through one helper.** All CHF and m² rendering via `lib/format.ts`.
5. **UI never reads JSON directly.** Components import from `compute/` or `data/fixtureLoader.ts`.
6. **Comments explain why, not what.** Each compute function has one contract line at the top. No JSDoc bloat.

### 5.5 Naming conventions

| Kind | Convention | Example |
|---|---|---|
| Files in `compute/`, `data/`, `lib/` | camelCase | `computeReserve.ts` |
| React components | PascalCase | `ResultCard.tsx` |
| Functions | verb-first for compute, noun-first for components | `computeReserve`, `ResultCard` |
| Types and interfaces | PascalCase | `DemoAddress` |
| Fixture-level constants | SCREAMING_SNAKE_CASE | `STATIK_SURCHARGE_PCT` |

## 6. Data model

### 6.1 TypeScript types

```ts
export type Bauweise = 'Massiv' | 'Holz' | 'Mischbau';
export type AmpelStatus = 'green' | 'yellow' | 'red';
export type IsosStatus = 'none' | 'hinweis' | 'inventar';
export type DenkmalStatus = 'none' | 'inventar';

export interface DemoAddress {
  display: string;
  search_keys: string[];
  egid: number;
  egrid: string;
  stadtkreis: 1|2|3|4|5|6|7|8|9|10|11|12;
  zone_code: string;
  bauweise_bestand: Bauweise;
  parzelle_m2: number;
  bestehende_bgf: number;
  baujahr: number;
  isos_status: IsosStatus;
  denkmal_status: DenkmalStatus;
  notes?: string;        // dev-only diagnostic field, never surfaced in UI
}

export interface ZoneRule {
  code: string;
  az_2016: number;
  az_2026: number;
}

export interface MarktwertEntry {
  zone: string;
  stadtkreis: number;
  low_chf_per_m2: number;
  high_chf_per_m2: number;
}

export interface BaukostenEntry {
  bauweise: Bauweise;
  low_chf_per_m2: number;
  high_chf_per_m2: number;
}

export interface AnalysisResult {
  address: DemoAddress;
  reserve_m2: { bzo_2016: number; bzo_2026: number; show_compare: boolean };
  net_chf: { low: number; base: number; high: number };
  feasibility: { az_reserve: AmpelStatus; isos: AmpelStatus; denkmal: AmpelStatus };
  confidence: number;
  caveats: string[];
}

export type Result<T, R extends string = string> =
  | { ok: true; data: T }
  | { ok: false; reason: R };
```

Each interface has a paired Zod schema in `types.ts` for runtime validation by `fixtureLoader.ts`.

### 6.2 Fixture files

**`demo_addresses.json`** holds 6 entries (see §8).

**`economic_assumptions.json`** has three top-level objects:

```json
{
  "marktwert": {
    "W3": { "8": { "low_chf_per_m2": 15000, "high_chf_per_m2": 18000 }, ... },
    "W4": { ... }
  },
  "baukosten": {
    "Massiv": { "low_chf_per_m2": 4500, "high_chf_per_m2": 7000 },
    "Holz":   { "low_chf_per_m2": 3500, "high_chf_per_m2": 5500 },
    "Mischbau": { "low_chf_per_m2": 4000, "high_chf_per_m2": 6500 }
  },
  "bzo": {
    "bzo_2016": { "W3": 1.10, "W4": 1.50, "W5": 1.85, "K": 2.40, "Z5": 2.20 },
    "bzo_2026": { "W3": 1.30, "W4": 1.70, "W5": 2.05, "K": 2.55, "Z5": 2.40 }
  },
  "constants": {
    "STATIK_SURCHARGE_PCT": 0.20,
    "NEBENKOSTEN_PCT": 0.08,
    "BZO_COMPARE_THRESHOLD": 0.10
  }
}
```

The marktwert table is filled only for cells that any of the 6 demo addresses actually use, plus a sensible neighbor cell or two for safety. Realistic v0 fill: 20 to 30 cells.

## 7. Computation logic

### 7.1 Reserve

```
max_BGF_2016 = az_2016 × parzelle_m2
max_BGF_2026 = az_2026 × parzelle_m2
reserve_2016 = max(0, max_BGF_2016 − bestehende_bgf)
reserve_2026 = max(0, max_BGF_2026 − bestehende_bgf)
show_compare = |reserve_2026 − reserve_2016| / reserve_2026 > 0.10
```

### 7.2 Feasibility

```
az_reserve = reserve_2026 > 0 ? green : red
denkmal    = denkmal_status === 'inventar' ? red : green
isos       = isos_status === 'hinweis'    ? yellow
           : isos_status === 'inventar'   ? red
           : green

if denkmal === 'red' OR isos === 'red':
    reserve_2026 = 0
    reserve_2016 = 0
```

ISOS yellow does not reduce reserve. It only colors the ampel and triggers a confidence deduction.

### 7.3 Monetization

```
M_low, M_high = marktwert[zone][stadtkreis]
B_low, B_high = baukosten[bauweise_bestand]   // Decision D: match Bestand

reserve = reserve_2026                          // headline figure uses BZO 2026
gross_low  = reserve × M_low
gross_high = reserve × M_high
build_low  = reserve × B_low
build_high = reserve × B_high

surcharge = (1 + STATIK_SURCHARGE_PCT) × (1 + NEBENKOSTEN_PCT)   // 1.20 × 1.08 = 1.296

net_low  = gross_low  − build_high × surcharge
net_high = gross_high − build_low  × surcharge
net_base = (net_low + net_high) / 2
```

If `reserve === 0` (Denkmal short-circuit or no AZ reserve), all three CHF values are 0.

**Marktwert lookup requirement (Phase 8 hardening).** The lookup `marktwert[zone][stadtkreis]` MUST succeed for every (zone, stadtkreis) cell touched by the 6 demo addresses. There is no fallback. If a lookup misses, `computeNetCHF` returns `Result<…, 'no_marktwert_data'>` and the UI renders EmptyState. The exact list of required cells is enumerated in `economic_assumptions.json` once the 6 demo addresses are curated; the v0 ship checklist (§12) verifies all required cells are populated.

### 7.4 Confidence score

```
score = 100
score -= 20    // Statik nicht geprüft (always in v0)
score -= 5     // Marktwert from Stadtkreis cluster, not transaction comparables
score -= 5     // BZO 2026 noch nicht rechtskräftig

if isos_status === 'hinweis'           score -= 10
if zone_code not in known v0 zones     score -= 5
if baujahr < 1900 OR baujahr > 2010    score -= 5

if denkmal_status === 'inventar':
    return 0   // reserve is also 0; score is informational only
```

**Caveat priority order (Phase 7 sharpening, Phase 8 clarification).** This priority list governs **display order only**. The score deduction order above is mathematical and irrelevant since deductions are additive. When constructing `caveats[]`, push entries in this fixed order. `caveats[0]` is what the UI shows next to the score; the full array is available to the BzoDisclosure footer or future tooltips.

1. ISOS Hinweisinventar, Einzelfallprüfung erforderlich (when `isos_status === 'hinweis'`)
2. Statik nicht geprüft (always in v0)
3. BZO 2026 in öffentlicher Auflage (always in v0)
4. Marktwert basiert auf Stadtkreis-Cluster (always in v0)
5. Edge-case zone (when `zone_code` outside common set)
6. Edge-case baujahr (when `baujahr < 1900` OR `baujahr > 2010`)

Denkmal-inventar is not in the priority list because its outcome (reserve = 0) is shown via the headline number, not the caveat subline.

### 7.5 Worked example

Fictional Seefeldstrasse 100, 8008 Zürich, Kreis 8, zone W3, Massiv, parzelle 480 m², bestehende BGF 410, ISOS hinweis, Denkmal none.

```
max_2016 = 1.10 × 480 = 528
max_2026 = 1.30 × 480 = 624
reserve_2016 = 118, reserve_2026 = 214
delta = 45% → show_compare = true

ampel: AZ green, ISOS yellow, Denkmal green

marktwert[W3][8] = 15'000 to 18'000
baukosten[Massiv] = 4'500 to 7'000

gross_low = 214 × 15'000 = 3'210'000
gross_high = 214 × 18'000 = 3'852'000
build_low = 214 × 4'500 = 963'000
build_high = 214 × 7'000 = 1'498'000
surcharge = 1.296

net_low = 3'210'000 − 1'498'000 × 1.296 = 1'268'592
net_high = 3'852'000 − 963'000 × 1.296   = 2'603'952
net_base = 1'936'272

confidence = 100 − 20 − 5 − 5 − 10 = 60
caveats = ["ISOS Hinweisinventar, Einzelfallprüfung erforderlich", "Statik nicht geprüft", "BZO 2026 in öffentlicher Auflage", "Marktwert basiert auf Stadtkreis-Cluster"]
# caveats[] is in §7.4 priority order. caveats[0] is what the UI shows next to the score.
```

What the demo viewer sees on the card:

- Header: "Seefeldstrasse 100, 8008 Zürich · EGID 150234567 · Zone W3 · Kreis 8 · Baujahr 1928"
- "+ 214 m²" with subline "AZ Reserve"
- Comparison line: "Heute (BZO 2016): + 118 m²"
- "1.3 – 2.6 Mio CHF" with subline "Netto nach Baukosten"
- Ampel: AZ green, ISOS yellow, Denkmal green
- "60 / 100, ISOS Hinweisinventar, Einzelfallprüfung erforderlich"
- Footer: "BZO 2026 (öffentliche Auflage), negative Vorwirkung beachtet"

## 8. Demo address whitelist

The 6 entries in `demo_addresses.json` must be hand-verified against GeoZH and GWR before the first pitch. Each occupies a different pitch story slot.

| # | Pitch role | Suggested Stadtkreis | Expected feasibility |
|---|---|---|---|
| 1 | Clear high potential, headline number | Kreis 8 (Seefeld) | green / green / green |
| 2 | Borderline, small but real reserve | Kreis 6 (Unterstrass) | green / green / green |
| 3 | ISOS Hinweisinventar yellow story | Kreis 1 (Altstadt) or Kreis 6 | green / yellow / green |
| 4 | Denkmalschutz, reserve forced to 0 | Kreis 1 (Altstadt) | green / green / red |
| 5 | Freshly built, near-zero reserve | Kreis 11 (Affoltern) | green / green / green, low number |
| 6 | BZO 2016 vs 2026 material delta | Kreis 12 (Schwamendingen) | green / green / green |

## 9. Build plan: 17 atomic bricks

Build in numerical order. Stage A must complete before B. Brick 9 (compute.test.ts) is a hard gate: no Stage C work begins until every Stage B brick has a passing test.

**Stage A — Foundation (bricks 1 to 4)**

1. `data/types.ts` — TypeScript types and Zod schemas.
2. `data/economic_assumptions.json` — marktwert, baukosten, BZO tables, constants.
3. `data/demo_addresses.json` — six hand-verified entries.
4. `data/fixtureLoader.ts` — Load and Zod-validate at boot. Throws loud if malformed.

**Stage B — Compute engine (bricks 5 to 9)**

5. `compute/addressMatch.ts` — Exact normalized-string match against fixture `search_keys`. No Levenshtein, no dependency.
6. `compute/computeReserve.ts` — Reserve under both BZO regimes.
7. `compute/applyFeasibility.ts` — Denkmal short-circuit and ISOS flag.
8. `compute/computeNetCHF.ts` — Low, base, high net CHF.
9. `compute/confidenceScore.ts` — Deterministic deduction formula.
9*. `compute/compute.test.ts` — Vitest covering every brick plus edge cases. **Hard gate.**

**Stage C — UI components (bricks 10 to 15)**

10. `ui/App.tsx` — Layout shell.
11. `ui/AddressInput.tsx` — Single shadcn Input plus submit, with 600 to 900 ms artificial delay.
12. `ui/ResultCard.tsx` — Container for the four-number readout.
13. `ui/BigNumber.tsx` — Reusable label/value/caption block.
14. `ui/FeasibilityAmpel.tsx` — Three lines, dot plus text per line.
15. `ui/EmptyState.tsx` — "Adresse nicht in Demoauswahl" plus three example addresses.

**Stage D — Polish (bricks 16 to 17)**

16. `ui/BzoDisclosure.tsx` — Footer disclosure text on the result card.
17. Demo polish — Tailwind tweaks, font weights, page title, fav icon.

## 10. Success criteria

A demo run is "successful" when all six are true.

1. Co-founder types one of the 6 demo addresses, sees a fully rendered result card in under 1500 ms total (includes the 600 to 900 ms artificial delay).
2. The four-number readout matches values manually verified against GeoZH for that address.
3. The Denkmalschutz cap rule fires correctly on demo address #4.
4. The graceful fallback fires when an unprepared address is typed.
5. The tool runs offline (laptop disconnected from internet) end-to-end.
6. Co-founder, after one walkthrough, can demo it without your help.

## 11. Anti-patterns this project rejects

- A `useStore`, Zustand, or Redux global state. Tree is two levels deep; prop drilling wins.
- A `services/` folder. The right name is `compute/`, and it is pure.
- Async compute functions. If something needs `await`, it does not belong in `compute/`.
- Inline German text in JSX. Always via `copy.ts`.
- A `utils.ts` grab-bag. Cross-cutting helpers live in `lib/format.ts` or `lib/copy.ts`. New helpers earn their own file.
- Em dashes in any output text. BuildX framework rule.
- UI tests in v0.
- Live network calls in v0.

## 12. Pre-pitch validation checklist

Run before every first-time use of a demo address in front of an external owner. Three of the six items below could quietly invalidate a number on the card if skipped, and a wrong number in front of a sophisticated owner is the failure mode this entire project is built to prevent.

| # | Check | Source of truth | Why it matters |
|---|---|---|---|
| 1 | Each fixture's `az_2026` matches the official BZO 2026 öffentliche Auflage value for that zone | Stadt Zürich BZO revision document, filed 18 March 2026 | Pension-fund owners often track public-consultation news. A wrong AZ for their zone is instantly noticed. |
| 2 | Each fixture's `az_2016` matches the rechtskräftige BZO 2016 value for that zone | oerebdocs.zh.ch (700.100 BZO 2016) | Required for the BZO comparison line to be defensible. |
| 3 | Each fixture's `egid` and `egrid` resolve correctly in GWR and GeoZH | gwr.bfs.admin.ch, GeoZH cadastre viewer | Visual cross-check that we picked the right building when curating. |
| 4 | Each fixture's `bestehende_bgf` matches GWR `GEBF` (Geschossfläche) within ±5% | gwr.bfs.admin.ch | The single most leveraged number; a wrong BGF inverts the reserve sign. |
| 5 | Every (zone, stadtkreis) cell touched by the 6 demo addresses has a documented `marktwert` source | RealAdvisor / ImmoMapper / Stadt Zürich Liegenschaften, dated within the last 6 months | Auditability if an owner asks "where does that 18'000 come from?" |
| 6 | `bauweise_bestand` matches reality for each demo building (visual / cadastre cross-check) | GeoZH building-age plus visual inspection | Determines `baukosten` band; getting it wrong shifts the CHF number by ~25%. |

This checklist is the boundary between "spec ready" and "pitch ready". v0 ships with the spec; the first pitch ships with the checklist.

## 13. Deferred to v0.5

- Live geo.admin.ch geocoder and GeoZH WFS for parcel and zone.
- Live ISOS API integration.
- Smart bauweise default for Aufstockung (e.g., baujahr-based static-load heuristic).
- Sub-Kreis quartier granularity (the 34 statistische Quartiere).
- Confidence-score reweighting once live WFS reduces the fixture penalty.
- Per-parcel zone overrides for parcels straddling two zones.
- Address autocomplete dropdown.
- Map preview of the parcel.
- 3D massing visualization (deck.gl or Three.js).
- PDF export of the result card.
- Multi-canton expansion (next priority: Tier 1 cantons AG, SO, BS, BL).
