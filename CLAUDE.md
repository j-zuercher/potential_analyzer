# Claude Code Operating Manual

> This file is the canonical brief for any Claude (or Claude subagent) working on this repo.
> Read it before touching code. Reference it in PRs when a rule is invoked.

## 1. Project overview

**BuildX · Hebel 3.1 Potenzial Analyzer** — a local web app that takes a Stadt Zürich address and returns additional buildable BGF (Bruttogeschossfläche) plus a plausible CHF range, based on public data only.

The product question is *"is this asking price defensible given the Aufstockungspotenzial?"* — not *"what's the exact CHF down to the franc?"* Approximation is the feature, not a bug; everything user-visible labels its confidence and sources.

Two pipelines coexist in the codebase:

- **v0** — synchronous, fixture-based (`analyze()`, six demo addresses, sales-pitch path). Kept as the math contract and a known-good harness for the live integration.
- **v0.5** — async, live public-data sources (`analyzeLive()`, free-form address, real APIs). What `App.tsx` actually runs today.

See `ROADMAP_v0_5.md` for the live-data pivot rationale and `docs/spec_v0.md` for the engineering spec (rules, decisions, architecture — authoritative).

## 2. Product context

- "Hebel 3.1" is the **Aufstockungspotenzial** lever in the BuildX product framework — the question of whether a parcel has additional buildable volume that's not yet realised, under the current and upcoming BZO (Bau- und Zonenordnung) regimes.
- v0 framing: pitch-demo, six curated illustrative addresses. v0.5 framing: defensible asking-price check on any Stadt-Zürich address.
- The CHF output is a *range*, not a point estimate. It accounts for marktwert (low/high per `[zone][stadtkreis]`), baukosten (per `[bauweise][ausbaustandard]`), a Statik surcharge (20%), and a Nebenkosten surcharge (12%). Conservative pairing: low gross ↔ high build cost, and vice versa.
- Feasibility ampel (green/yellow/red) for: AZ reserve, ISOS, Denkmalschutz. Denkmal-inventar forces reserve to 0. ISOS Hinweis is a flag (yellow), not a reserve multiplier.
- Confidence score deducts deterministically from 100 (statik gap, marktwert cluster, BZO 2026 not yet rechtskräftig, optional ISOS hinweis, edge zone, edge baujahr, BGF-from-proxy).

## 3. Core users

- **Primary (v0.5):** real-estate developers evaluating an asking price for a Stadt Zürich parcel. Want a quick, defensible answer in under 30 seconds.
- **Secondary (v0):** BuildX sales / pitch context — illustrative demos with curated addresses.
- **Not in scope yet:** brokers, retail buyers, owners outside Stadt Zürich, cantons other than ZH.

## 4. Main use cases

1. "Asking price defensibility": user pastes address + asking price → tool shows net potential vs price ratio.
2. "Quick reserve check": user pastes address → tool returns CHF range and AZ reserve in m².
3. "BZO transition story": user wants to see the delta between BZO 2016 and 2026 reserves for the same parcel.
4. "Feasibility scan": user wants to know if ISOS / Denkmalschutz blocks the case before going further.

## 5. Tech stack

- Vite 5 + React 18 (strict mode) + TypeScript 5 (strict, `noUnusedLocals`, `noUnusedParameters`)
- Tailwind CSS 3 with custom `buildx-accent` palette (`#c2410c`, plus `accent-soft` / `accent-border`)
- Vitest 2 for unit tests, run via `npm test`
- Zod 3 for runtime schema validation (source of truth for types)
- Node ≥20 (`.nvmrc`)
- **No backend.** CORS handled in `vite.config.ts` via two proxies: `/zh` → `maps.zh.ch`, `/ogd` → `www.ogd.stadt-zuerich.ch`.
- **Public data sources:** `api3.geo.admin.ch/rest/services/api/SearchServer` (geocoder), Stadt Zürich OGD WFS `bzo_zone_v` (zoning), `api3.geo.admin.ch` MapServer `ch.bfs.gebaeude_wohnungs_register` (GWR / building registry).

## 6. Repository structure

```
src/
├── data/
│   ├── types.ts                     # Zod schemas = source of truth, types inferred
│   ├── demo_addresses.json          # v0 fixture (6 curated illustrative addresses)
│   ├── economic_assumptions.json    # BZO 2016/2026 AZ, marktwert (legacy), baukosten (legacy), constants
│   ├── marktwert_zh.json            # v0.5 hand-curated [zone][stadtkreis] price table
│   ├── baukosten.json               # v0.5 [bauweise][ausbaustandard] cost matrix
│   ├── fixtureLoader.ts             # Boot-time Zod validation, throws loud
│   └── sources/                     # v0.5 live fetchers
│       ├── geocoder.ts              # api3.geo.admin.ch SearchServer
│       ├── zoning.ts                # OGD WFS bzo_zone_v
│       ├── building.ts              # GWR MapServer
│       └── sources.test.ts          # Mocked-fetch unit tests
├── compute/
│   ├── addressMatch.ts              # Exact normalized-string match (v0 only)
│   ├── computeReserve.ts            # BZO 2016/2026 reserve, negative clipped to 0
│   ├── applyFeasibility.ts          # ISOS / Denkmal short-circuits
│   ├── computeNetCHF.ts             # Net CHF range, conservative pairing
│   ├── confidenceScore.ts           # Deterministic deductions from 100
│   ├── analyze.ts                   # Pipeline orchestrator (analyze + analyzeLive)
│   └── compute.test.ts              # ~20 unit tests — the math contract, must stay green
├── ui/
│   ├── AddressInput.tsx
│   ├── AusbaustandarRadio.tsx
│   ├── AskingPriceInput.tsx
│   ├── ResultCard.tsx
│   ├── BigNumber.tsx
│   ├── FeasibilityAmpel.tsx
│   ├── BzoDisclosure.tsx
│   └── EmptyState.tsx
├── lib/
│   ├── result.ts                    # Result<T, R> discriminated union, errors-as-values
│   ├── format.ts                    # Swiss CHF, m², range, percentage formatters
│   └── copy.ts                      # All German strings, single source
├── App.tsx                          # Shell, wires UI to analyzeLive() with live sources
├── main.tsx                         # Entry, StrictMode, mount #root
└── index.css                        # Tailwind directives
```

## 7. Local development commands

```bash
npm install
npm run dev            # http://localhost:5173
```

## 8. Testing commands

```bash
npm test               # vitest run (single pass — CI mode)
npm run test:watch     # vitest --watch
npm run lint           # tsc -b --noEmit (type-check only, no runtime lint yet)
```

The math contract lives in `src/compute/compute.test.ts`. **Keep it green at all times.** When modifying any compute function, run `npm test` before opening a PR. If a math change is intentional, update both the function AND the relevant test in the same commit, with the why-not-what in the commit message.

## 9. Build / deployment

```bash
npm run build          # tsc -b && vite build → dist/
npm run preview        # serve dist/ locally
```

Deploy target is local for v0 and v0.5. Build is mostly used to confirm the TypeScript compile is clean before a pitch. No CI/CD is wired up yet — manual `npm run build` is the current gate. (Future: GitHub Actions workflow for lint+test on PR; not in scope for the initial migration.)

## 10. Coding standards (the 7 enforced rules)

These are visible in the codebase (look for `// Spec §X.Y` markers) and must be preserved:

1. **Errors are values.** Never throw across layer boundaries. Use `Result<T, R>` from `src/lib/result.ts`. Compute functions return `{ ok: true, data }` or `{ ok: false, reason }`. UI pattern-matches on `ok`. The only legal throw is the boot-time Zod fixture validation in `fixtureLoader.ts`.

2. **Compute is pure.** Nothing under `src/compute/` may do IO, touch the DOM, call `Date.now()` / `Math.random()`, or import React. Sources are async and live in `src/data/sources/`; they hand `Result`s to the compute layer, which stays pure.

3. **Zod schemas are the source of truth.** Types are inferred from schemas in `src/data/types.ts` via `z.infer<...>`. Never declare a parallel `interface` for something that has a schema. Schema added → type added → fixture revalidated at boot.

4. **All German strings live in `src/lib/copy.ts`.** No inline string literals in UI or compute. If you need a new label, add it to `copy.ts` first, then reference it. This includes error messages, button labels, caveats, headings.

5. **All number/CHF/m² formatting goes through `src/lib/format.ts`.** Helpers: `formatCHF`, `formatM2`, `formatRangeMio`, `formatSingleMio`, `formatPct`. No inline `toLocaleString`, no inline `Math.round`-then-template-string.

6. **No em dashes in German copy.** En-dash (`–`) with surrounding spaces only. This is a BuildX product-framework rule (spec §4.3) — keep it consistent across new caveats and result strings.

7. **Code comments are why-not-what.** Reference spec sections (`§4.1`, `§7.3`, …) when invoking a rule or decision. Bad: `// loop over addresses`. Good: `// Exact normalized-string match. No Levenshtein (Phase 7 PM cut, spec §4.1).`

### Additional conventions

- Each compute file should be < 150 lines. Split early — orchestration goes in `analyze.ts`.
- Each new source fetcher follows the pattern in `src/data/sources/geocoder.ts`: optional `fetchFn = fetch` parameter for test injection; return `Promise<Result<X, Y>>`; catch and convert all network/parse errors into `Result.fail`.
- `any` is forbidden. Use `unknown` and narrow. The only legal cast in the codebase is the `as unknown as DemoAddress` in `analyzeLive` (commented with why).
- New JSON fixtures get a Zod schema in `types.ts` and are validated in `fixtureLoader.ts`.

## 11. Documentation standards

- `README.md` — updated when commands, structure, or stack change.
- `CLAUDE.md` — this file. Updated when project-wide rules or workflows change.
- `docs/spec_v0.md` — authoritative engineering spec. **Do not edit casually**; update the canonical copy in the parent BuildX folder first, then re-sync. (Or treat this in-repo copy as the new canonical and stop syncing — decide in an ADR.)
- `docs/architecture.md` — system overview, kept in sync when data flow or sources change.
- `docs/product.md` — product context, users, use cases.
- `docs/decisions/` — ADRs (Architecture Decision Records) for any non-obvious choice: schema change, data source swap, pipeline restructure, rule change. Template at `docs/decisions/000-template.md`.
- `docs/lessons-learned.md` — high-signal lessons after meaningful PRs. The `learning-agent` curates this.
- Code comments — why-not-what (rule 7 above).

## 12. Git workflow

- **Default branch:** `main` (protected — no direct pushes).
- **Feature branches:** `feature/SCRUM-123-short-description` when a Jira ticket exists; `feature/short-description` otherwise. Hotfixes: `fix/short-description`.
- **Commit subject:** `SCRUM-123: short description` (imperative). If no ticket, just imperative subject.
- **Commit body:** the why. Include spec-section reference if a rule applies.
- **One feature / fix per PR.** Keep diffs reviewable. Big refactors get split or get a `chore/` branch with an upfront approval.
- **PR template** at `.github/pull_request_template.md` is required-reading; fill it out.
- `npm run lint` and `npm test` must be green before merge.
- No force-push to `main`. Force-push to feature branches is fine when needed for clean history.

## 13. Definition of done

- [ ] Requirement understood. Linked Jira ticket (or scope written down in PR description).
- [ ] Implementation plan posted to the ticket / agreed in chat. (Use `/plan-from-ticket`.)
- [ ] Code implemented respecting all 7 engineering rules.
- [ ] Tests added or updated. `npm test` green locally.
- [ ] `npm run lint` green locally.
- [ ] Docs updated when product / architecture / data-flow changed.
- [ ] PR description filled out (`.github/pull_request_template.md`).
- [ ] Risks and follow-ups documented in the PR.
- [ ] Code-review agent run, comments addressed.
- [ ] Human approval.

## 14. Agentic workflow

The agent team lives in `.claude/agents/`. Slash commands in `.claude/commands/`.

Standard flow for any non-trivial change:

1. **Read the Jira ticket** (and any linked Confluence pages, designs, or prior PRs).
2. **Inspect the relevant code** — `src/data/`, `src/compute/`, `src/ui/` as appropriate. Read `docs/spec_v0.md` for the authoritative rules.
3. **`/plan-from-ticket`** with the ticket text → `product-manager` agent formalizes requirement → `architect` agent proposes technical approach. Stop and ask for human approval.
4. **`/implement-approved-plan`** → `full-stack-engineer` agent implements on a feature branch. Small, reviewable commits.
5. **`qa-engineer`** agent extends tests or adds new ones. `compute.test.ts` stays green; new tests for new behavior.
6. **`/review-current-diff`** → `code-reviewer` agent reviews. Fix blocking issues, decide on non-blocking.
7. **`/update-docs`** → `documentation-agent` updates README / architecture.md / decisions/ / lessons-learned as needed.
8. **Open PR** with the template filled out.
9. **Human merge.**
10. **`/learn-from-task`** → `learning-agent` extracts high-signal lessons into `docs/lessons-learned.md`. **This step is mandatory after every non-trivial PR merge** — not optional. If you skip it, the team's calibration erodes.

For trivial changes (typo, comment fix, single-line tweak), skip steps 3–7. Still run `npm test` before pushing.

### Token efficiency

Before launching any research or long-running sub-agent, consult the **`token-manager` agent** (`.claude/agents/token-manager.md`). It sizes the task, sets scope caps, and prevents redundant work. Skip it only for trivial single-tool lookups.

## 15. Guardrails

- **Do not delete files without explicit approval.** Especially `src/data/*.json` (fixtures), `src/compute/compute.test.ts` (math contract), `vite.config.ts` (CORS proxies), and `.claude/settings.local.json` (personal config).
- **Do not rewrite git history without approval.** No `--force` on `main`, no rebases of merged PRs.
- **Do not commit secrets.** No PAT, API key, customer data, or `.env*` content. The `.gitignore` covers this; verify before `git add`.
- **Do not invent business logic.** Swiss BZO, ISOS, Denkmalschutz, BGF, Stadtkreis, Bauweise definitions all live in `docs/spec_v0.md` and the data fixtures. If you need a number or rule that's not there, ask — don't make one up.
- **Do not change `src/compute/*` mathematical behavior without explicit approval.** Those functions are the math contract. Changing them = updating `compute.test.ts` in the same commit with a why-statement.
- **Do not introduce new dependencies without justification.** Each new dep gets an ADR in `docs/decisions/`. The current stack (React 18, Vite 5, TS 5, Tailwind 3, Vitest 2, Zod 3) is deliberately small.
- **Do not bypass `Result<T, R>`.** No `throw` across layer boundaries. No `try/catch` swallowing errors — convert to `Result.fail(...)`.
- **Do not put strings or formatted numbers inline.** `copy.ts` for German strings, `format.ts` for CHF/m²/percent.
- **Do not change data-source URLs or zone-code mappings without an ADR.** Public APIs change; document the change and update `sources.test.ts` in the same PR.
- **Fail gracefully on public-data garbage.** When a source returns something unexpected, return `Result.fail('reason')` from the fetcher and let `analyzeLive` propagate. Never crash the UI.
- **Do not auto-publish to Confluence or auto-create Jira tickets** unless explicitly asked. Drafts are fine; publication is human-controlled.

## 16. Spec section quick-reference

When a comment says `Spec §X.Y`, here's the index:

- §4.1 — input / address matching
- §4.2 — result card layout
- §4.3 — BuildX framework rules (no em dashes, en-dash with spaces, etc.)
- §4.4 — empty-state / error-state behavior
- §5.4 — engineering rules (Result type, copy.ts, format.ts, why-not-what comments)
- §6.1 — data model (DemoAddress, EconomicAssumptions, AnalysisResult)
- §7.1 — `computeReserve` math
- §7.2 — `applyFeasibility` (ISOS, Denkmal rules)
- §7.3 — `computeNetCHF` (marktwert lookup, baukosten, surcharges, conservative pairing)
- §7.4 — `confidenceScore` (deductions, caveat priority order)
- §7.5 — full pipeline example (Seefeld)
- §8 — curated demo whitelist (v0)
- §9 — phase 9 hard gate (compute.test.ts must be green)
- §11 — BZO 2016 / 2026 source decisions
- §12 — Public-data verification before pitch

(The above is approximate; `docs/spec_v0.md` is authoritative.)
