# Architecture

> Companion to `docs/spec_v0.md`. Spec describes rules and decisions; this doc describes the current as-built shape of the system.

## System overview

Pure browser single-page app. No backend. Built with Vite, runs locally at `http://localhost:5173`. The app loads, validates two JSON fixtures at boot via Zod, then renders an address-input form. On submit, the live pipeline (`analyzeLive`) calls three public APIs, runs a pure compute pipeline, and renders a result card.

Strict layer boundaries enforced by convention and code review:

```
        ┌─────────────┐
        │  src/ui/    │  React components. Strings via copy.ts. Numbers via format.ts.
        └──────┬──────┘
               │ (calls)
        ┌──────▼──────┐
        │ src/compute/│  Pure functions. No IO, no React, no time, no randomness.
        └──────┬──────┘
               │ (consumes Result<T, R> from)
   ┌───────────▼─────────────┐
   │ src/data/sources/       │  Async fetchers. Public APIs. Return Promise<Result>.
   │ src/data/types.ts       │  Zod schemas = source of truth for types.
   │ src/data/fixtureLoader  │  Boot-time validation, throws loud on bad fixtures.
   │ src/data/*.json         │  Curated fixtures (demo addresses, marktwert, baukosten, economics).
   └─────────────────────────┘
               │
        ┌──────▼──────┐
        │  src/lib/   │  Cross-cutting: result.ts, format.ts, copy.ts.
        └─────────────┘
```

## Tech stack (current)

- **Runtime:** browser (modern evergreen). Node ≥20 for tooling.
- **Build:** Vite 5 + `@vitejs/plugin-react`. TypeScript 5 strict.
- **UI:** React 18 (StrictMode), Tailwind CSS 3 with custom `buildx-accent` palette.
- **Tests:** Vitest 2, environment `node`, includes `src/**/*.test.ts`.
- **Validation:** Zod 3 (schemas in `src/data/types.ts`).
- **No state library.** Component state via `useState` in `App.tsx`.

## Main modules

| Module | Path | Purpose |
|---|---|---|
| Result type | `src/lib/result.ts` | `{ok, data}` / `{ok: false, reason}` discriminated union. The error-as-value primitive. |
| Format helpers | `src/lib/format.ts` | Swiss CHF, m², Mio-CHF range, percent. Single source of formatting. |
| Copy | `src/lib/copy.ts` | All German UI strings. Single source. No inline literals anywhere else. |
| Zod schemas | `src/data/types.ts` | Source of truth. Types inferred via `z.infer`. |
| Fixture loader | `src/data/fixtureLoader.ts` | Imports + Zod-validates `demo_addresses.json` and `economic_assumptions.json` at module-eval. Throws loud on failure. |
| Geocoder source | `src/data/sources/geocoder.ts` | `api3.geo.admin.ch/SearchServer`. Returns `{display, lon, lat, egrid?, egid?}` or `Result.fail('no_match' \| 'network_error')`. |
| Zoning source | `src/data/sources/zoning.ts` | Stadt Zürich OGD WFS `bzo_zone_v`, via `/ogd` Vite proxy. WGS84 → LV95 conversion in-source (Swisstopo approximate formula). Returns `{zone_code, parzelle_m2}` or `Result.fail('no_zone_data' \| 'network_error')`. |
| Building source | `src/data/sources/building.ts` | GWR via `api3.geo.admin.ch` MapServer feature endpoint. Returns `{bestehende_bgf, baujahr?, egrid?, garea?}` or `Result.fail('no_egid' \| 'not_found' \| 'network_error')`. |
| Address match | `src/compute/addressMatch.ts` | v0-only. Exact normalized-string match against `demo_addresses.json` (no Levenshtein). |
| Reserve compute | `src/compute/computeReserve.ts` | `(AZ × parzelle_m2 − bestehende_bgf)` for BZO 2016 and 2026, clipped to 0. |
| Feasibility | `src/compute/applyFeasibility.ts` | Denkmal-inventar OR ISOS-inventar → reserve forced to 0. ISOS-hinweis → yellow ampel but reserve preserved. |
| Net CHF | `src/compute/computeNetCHF.ts` | Conservative pairing: low-gross with high-build-cost (low) and vice versa (high). 20% Statik surcharge × 12% Nebenkosten surcharge multiplied (1.344 effective). |
| Confidence | `src/compute/confidenceScore.ts` | Deterministic deductions from 100. Always-applies: −20 Statik, −5 Marktwert-cluster, −5 BZO 2026 öffentliche Auflage. Conditional: −10 ISOS-hinweis, −5 edge zone, −5 edge baujahr. Denkmal-inventar → 0. |
| Pipeline orchestrator | `src/compute/analyze.ts` | Exports `analyze()` (sync v0) and `analyzeLive()` (async v0.5). Also exports pure helpers (`deriveBauweise`, `extractStadtkreis`, `estimateParzelle`) testable in isolation. |
| App shell | `src/App.tsx` | Wires UI to `analyzeLive` with the live `Sources` bundle. Holds `useState` for view state, ausbaustandard, asking price. |
| Entry | `src/main.tsx` | StrictMode mount to `#root`. |

## Data flow (v0.5 live path)

```
AddressInput.onSubmit(string)
  → App.handleSubmit
  → analyzeLive(input, userInputs, liveSources, fixtures.economics)
       1. geocode(input)
          → api3.geo.admin.ch SearchServer
          → {display, lon, lat, egrid?, egid?}
       2. Promise.all([
            fetchZoning(lat, lon)   → OGD WFS bzo_zone_v (LV95 BBOX)
                                    → {zone_code, parzelle_m2=500 default}
            fetchBuilding(egid)     → GWR MapServer
                                    → {bestehende_bgf, baujahr?, egrid?, garea?}
          ])
       3. extractStadtkreis(display) → 1..12 (from PLZ in label)
       4. Build ResolvedAddress (parzelle_m2 = estimateParzelle(garea, zone)
                                  fallback to 500 if no garea)
       5. computeReserve(addr, economics) → {bzo_2016, bzo_2026, show_compare}
       6. applyFeasibility(addr, reserve) → reserve_m2 (possibly zeroed) + ampel
       7. computeNetCHF(addr, reserve_2026, economics) → {low, base, high}
       8. confidenceScore(addr) → {score, caveats}
       9. Dock 10pt when BGF came from GWR proxy; prepend caveat
      10. return LiveAnalysisResult
  → setState({kind: 'result', data})
  → ResultCard renders
```

## External integrations

| Endpoint | Purpose | Auth | Proxy | Failure mode |
|---|---|---|---|---|
| `api3.geo.admin.ch/rest/services/api/SearchServer` | Geocode address → coords + (sometimes) EGID | none | direct | `no_match` / `network_error` |
| `www.ogd.stadt-zuerich.ch/wfs/geoportal/...bzo_zone_v` | BBOX → zone code | none | `/ogd` | `no_zone_data` / `network_error` |
| `api3.geo.admin.ch/rest/services/ech/MapServer/ch.bfs.gebaeude_wohnungs_register` | EGID → BGF proxy, baujahr | none | direct | `no_egid` / `not_found` / `network_error` |
| `maps.zh.ch/wfs/...` | Reserved for future GIS-ZH (authed) | account required | `/zh` | not in use today |

## Environment variables

None currently. If a source becomes auth'd, add a `.env.example` (already covered by `.gitignore`) and document here.

## Build / deploy

`npm run build` produces a static `dist/` (TypeScript compile + Vite bundle). Deployment is manual / local. No CI/CD yet. **Future:** GitHub Actions workflow for `npm run lint && npm test` on PR; not in scope for the initial migration.

## Known risks / technical debt

- **GWR BGF proxy.** `gastw × garea` is a known approximation (±20%). Confidence is docked 10pt when this path is taken; caveat surfaced in `caveats[0]`.
- **PLZ → Stadtkreis map.** `PLZ_TO_KREIS` in `analyze.ts` covers all residential 80xx PLZs but PLZ boundaries don't perfectly align with Kreis borders. Edge case at PLZ boundaries.
- **Marktwert curation freshness.** `marktwert_zh.json` is a 2026 snapshot. No automatic refresh; needs periodic re-curation.
- **`parzelle_m2` default.** When GWR doesn't return `garea`, we default to 500 m². For atypical parcels this is wrong by a wide margin.
- **`/zh` proxy unused.** `vite.config.ts` defines a proxy for `maps.zh.ch` reserved for future authed access. Dead config until needed.
- **Type cast in `analyzeLive`.** Compute functions accept `DemoAddress` but we pass a `ResolvedAddress` via `as unknown as DemoAddress`. Works because compute only reads fields present in both types. Fragile under type drift; future cleanup: refactor compute to accept a narrower shared shape.
- **`smoke.test.ts`.** Phase-9 placeholder per spec §9. Should be removed once `compute.test.ts` is the gate.
- **No CI gate.** Tests run only when someone remembers `npm test`. First add: GitHub Actions on PR.
