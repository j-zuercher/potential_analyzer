# Product Context

## Purpose

BuildX · Hebel 3.1 Potenzial Analyzer answers one question for one user:

> Given a Stadt Zürich address (and optionally an asking price), is the price defensible relative to the unrealised Aufstockungspotenzial?

The answer is a CHF range, an additional-buildable-BGF figure in m², a feasibility ampel, and a confidence score with caveats. Approximation is intentional — the goal is a decision-grade quick-check, not a franc-accurate valuation.

## Target users

| Tier | Audience | Use today |
|---|---|---|
| Primary | Real-estate developers evaluating Zürich parcels | v0.5 live-data path (`analyzeLive`) |
| Secondary | BuildX sales / pitch demos | v0 fixture path (`analyze`, 6 curated addresses) |
| Future | Brokers, retail buyers, non-Zürich users | Out of scope for now |

## Main workflows

1. **Asking-price defensibility check** — user enters address + asking price; tool returns net potential vs. price ratio with a green/yellow/red headline.
2. **Quick reserve check** — user enters address; tool returns additional buildable m² and the CHF range.
3. **BZO 2016 → 2026 delta** — when the reserve changes materially between regimes, the result card surfaces both numbers.
4. **Feasibility scan** — ampel for AZ reserve, ISOS, Denkmalschutz. Denkmal-inventar forces reserve to 0.

## Current features (live in the codebase)

- Free-form address input (v0.5) and curated 6-address whitelist (v0).
- Live data sources: `api3.geo.admin.ch` SearchServer (geocode), Stadt Zürich OGD WFS `bzo_zone_v` (zoning), `api3.geo.admin.ch` MapServer GWR (building registry).
- Ausbaustandard radio: niedrig / mittel / hoch (default mittel). Affects `baukosten.json` lookup.
- Optional asking-price input with net-potential-vs-price ratio.
- Result card with: reserve m² (and BZO 2016 compare line when delta is material), CHF range (Mio CHF format), feasibility ampel (3 dots), confidence score / 100 + headline caveat, footer disclosure for BZO 2026 öffentliche Auflage.
- Empty state (address not matched) and error state (data sources unavailable).
- Hand-curated `marktwert_zh.json` covering 12 Stadtkreise × ~6 zone codes with per-cell source attribution (RealAdvisor April 2026 medians as the starting baseline).
- 3×3 `baukosten.json` keyed by `[bauweise][ausbaustandard]`.

## Planned features

- **v0.6 stretch:** ISOS / Denkmalschutz integration via canton/city heritage layers.
- **v1:** User override of the bauweise heuristic (currently derived from `baujahr`).
- **v1:** Persisted asking-price comparison history.
- **v2+:** Multi-canton expansion (start with Stadt Bern or Basel-Stadt).
- **v2+:** Save / share results with a tokenised URL.

## Constraints that should NOT change without explicit discussion

- Public data only. No private listings databases, no client-supplied CSVs as inputs to the math.
- Approximations explicitly labeled. Every CHF figure is a range, every confidence deduction is visible, every caveat is in `copy.ts`.
- MVP-grade. No analytics SDK, no auth, no backend, no telemetry beyond browser dev tools. Adding any of these requires an ADR.
- German-language UI. Swiss CHF formatting (apostrophe thousand-separator). No em dashes in German copy.

## Open product questions

- **PLZ outside Zürich.** Geocoder will happily return matches outside the city; `extractStadtkreis` returns `undefined` and we fail with `no_stadtkreis`. Is the current "Adresse nicht gefunden" state acceptable or do we need a clearer message?
- **Asking-price confidence band.** Currently the ratio is a point estimate from `net_chf.base`. Should the UI show a band (using `low` / `high`)?
- **Marktwert refresh cadence.** `marktwert_zh.json` is hand-curated. How often do we re-pull RealAdvisor / Stadt ZH Liegenschaften medians, and who owns that refresh?
- **Save / share use case.** Do users want to revisit a result, or is each session a one-off check?
