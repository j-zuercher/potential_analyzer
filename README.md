# BuildX · Hebel 3.1 Potenzial Analyzer

Local web app for Stadt Zürich real estate. Takes an address, returns additional buildable BGF (Bruttogeschossfläche) and a plausible CHF range based on public data only. Built for real-estate developers evaluating asking prices for Zürich parcels — answers "is this price defensible given Aufstockungspotenzial?", not "what's the exact CHF down to the franc".

## Status

Two pipelines coexist in the codebase:

- **v0** — synchronous, fixture-based. Six curated demo addresses for sales-pitch demos. Used by `compute.test.ts` as the math contract. Entry: `analyze()` in `src/compute/analyze.ts`.
- **v0.5** — async, live public-data sources. Free-form address input → geocode (`api3.geo.admin.ch` SearchServer) → zone (Stadt Zürich OGD WFS) → building (GWR MapServer) → compute. Entry: `analyzeLive()` in `src/compute/analyze.ts`.

`App.tsx` runs the v0.5 path. The v0 fixture path stays in place for the unit-test math contract and as a known-good harness for the live integration.

See `ROADMAP_v0_5.md` for the live-data pivot rationale and `docs/spec_v0.md` for the engineering spec (decisions, rules, architecture).

## Run locally

```bash
npm install
npm run dev
```

Dev server runs at http://localhost:5173.

## Test

```bash
npm test            # run once
npm run test:watch  # watch mode
npm run lint        # type-check only (tsc -b --noEmit)
```

## Build

```bash
npm run build
```

Produces a static `dist/` folder. Deploy target is local for v0/v0.5; build is mostly used to confirm the TypeScript compile is clean before a pitch.

## Project structure

```
src/
├── data/        # Zod schemas + JSON fixtures + live data sources
│   ├── types.ts            # Single source of truth for types (Zod schemas)
│   ├── *.json              # Curated fixtures (boot-time Zod-validated)
│   ├── fixtureLoader.ts    # Boot-time validation, throws loud on failure
│   └── sources/            # v0.5 live fetchers (geocoder, zoning, building)
├── compute/     # Pure functions — no React, no IO, no time, no randomness
├── ui/          # React components — all strings via copy.ts, all numbers via format.ts
├── lib/         # result.ts (Result<T, R>), format.ts (Swiss CHF), copy.ts (German strings)
├── App.tsx      # App shell, wires UI to analyzeLive()
└── main.tsx     # Entry point
```

## Engineering rules (enforced — see CLAUDE.md for full operating manual)

1. **Errors are values.** Never throw across layer boundaries. Use `Result<T, R>` (`src/lib/result.ts`).
2. **Compute is pure.** No IO, no React, no time, no randomness anywhere under `src/compute/`.
3. **Zod schemas are the source of truth.** Types are inferred from schemas (`src/data/types.ts`) — never declare a parallel `interface`.
4. **All German strings live in `src/lib/copy.ts`.** No inline literals in UI or compute.
5. **All number/CHF/m² formatting goes through `src/lib/format.ts`.** No inline formatting.
6. **No em dashes in German copy.** En-dash with spaces (`–`) only.
7. **Code comments are why-not-what.** Reference the spec section (`§4.1`, `§7.3`, …) when applicable.

## Claude Code workflow

This repo is set up for agent-assisted development.

- `CLAUDE.md` — operating manual (project context, rules, guardrails, workflow)
- `.claude/agents/` — role-specific subagents (PM, architect, full-stack, code review, QA, docs, learning)
- `.claude/commands/` — repeatable slash commands (`/plan-from-ticket`, `/implement-approved-plan`, `/review-current-diff`, `/update-docs`, `/learn-from-task`)

Typical flow: Jira ticket → Confluence context → `/plan-from-ticket` → human approval → implement on feature branch → `/review-current-diff` → PR → human merge → `/learn-from-task`.

## Documentation

- `docs/product.md` — product context, users, use cases
- `docs/architecture.md` — system overview, data sources, data flow
- `docs/spec_v0.md` — engineering spec (rules, decisions, architecture; copy of the canonical spec)
- `docs/decisions/` — Architecture Decision Records (ADRs)
- `docs/lessons-learned.md` — high-signal lessons across product, architecture, engineering, testing

## OneDrive note

`node_modules` is in `.gitignore` and should stay out of OneDrive sync. Right-click the folder → "Free up space" if OneDrive has uploaded it. Local dev should keep it on-disk.
