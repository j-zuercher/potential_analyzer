# Lessons Learned

> Curated by the `learning-agent` after meaningful PRs. High-signal only — see `.claude/agents/learning-agent.md` for the bar.

## Product lessons

### EGID availability is the single most important data quality gate

**Context:** Baugesuch validation run (2026-05-16) against 5 confirmed Aufstockung cases.

When the geocoder returns no EGID (which happens for ~30-50% of addresses based on the validation sample), the GWR lookup is skipped and bestehende_bgf defaults to 0. This causes the tool to treat every existing building as an empty parcel, producing massive reserve overestimation.

| Case | Tool Reserve | Actual Added | Error | D-C Result |
|------|-------------|--------------|-------|------------|
| Hofwiesenstrasse 22, 8057 | 850 m² | ~850 m² | 0% | PASS* |
| Widmerstrasse 73, 8038 | 350 m² | ~880 m² | 60% | FAIL |
| Erikastrasse 11, 8003 | 650 m² | ~155 m² | 319% | FAIL |
| Guggachstrasse 30, 8057 | 639 m² | ~177 m² | 261% | FAIL |

*Case 1 is a coincidental pass. The geocoder returned no EGID → bestehende_bgf=0 → reserve = entire max_2026. This happened to equal the actual addition because the building was already over the AZ maximum before the addition (i.e., the "reserve" computed is meaningless).

**Implication:** The 70% accuracy target (Definition C: ≤30% error) is not achievable without a reliable bestehende_bgf. The GWR GASTW×GAREA proxy is the right approach but requires EGID.

**Action taken:** None yet. Tracked as a known limitation. Priority for v0.6: investigate why geocoder returns no EGID for these addresses and whether an EGRID-based GWR lookup is more reliable.

### The 500 m² default parzelle is a silent accuracy killer for large buildings

When the GWR lookup fails, parzelle defaults to 500 m². For large apartment blocks (55+ units), the actual parcel can be 5–10× larger. This creates a compound error: zero BGF start × too-small parcel × correct AZ = completely wrong reserve.

**Signal for users:** Reserve estimates should be labeled as "Näherung ab Leerparzel" (approximation from empty parcel) when bestehende_bgf=0 AND EGID is missing. The confidence score already docks points for BGF-from-proxy (−10) and bgfUnavailable, but the current caveats don't signal the magnitude of the uncertainty.

### Zone lookup accuracy varies for edge cases

Guggachstrasse 30 (8057) — a 1928 2-story row house in Unterstrass — was assigned zone W4 (AZ 1.5/1.7) by the WFS. But the post-project BGF (327 m² on a 376 m² parcel) implies actual AZ ≈ 0.87, more consistent with W2b or a reduced W3. The WFS BBOX query can bleed into neighboring parcels, which skews zone selection for edge-of-zone addresses.

## Architecture lessons

### Parzelle estimation is a circular dependency problem

The tool uses `garea / COVERAGE_RATIO[zone]` to estimate parzelle from the GWR building footprint. But COVERAGE_RATIO itself is a heuristic. If garea is missing (EGID not found), parzelle defaults to 500 m². The fix — a real parcel area from the cadastral registry — requires a third data source (Amtliche Vermessung / swisstopo WFS). This is tracked for v0.6.

### Validation scripts belong in `/scripts`, not ad-hoc in the root

Created `scripts/validate-baugesuch.mjs` for the Baugesuch accuracy test. This pattern (Node ESM script calling live APIs) is the right harness for live-data validation — separate from Vitest which is for pure-compute unit tests.

## Engineering lessons

### Raising a baukosten floor requires maintaining tier ordering

When calibrating Massiv baukosten (niedrig/mittel/hoch), raising the mittel floor (4,500 → 5,000) requires also raising the niedrig floor (3,500 → 4,000). Otherwise niedrig-hoch > mittel-hoch, breaking the tier invariant. The test suite catches this if pin values are updated correctly.

### PLZ_TO_KREIS table had 8 missing residential codes

Original table had 24 entries. City of Zürich has 32 residential PLZ codes. Added: 8033, 8034, 8036, 8039, 8040, 8042, 8043, 8063. Corporate PO box codes (8058+) intentionally excluded — they have no residential Stadtkreis.

## Testing lessons

### `toBeCloseTo(value, -2)` precision is per-100 CHF rounding tolerance

`-2` means ±50 CHF. For CHF outputs in the millions, this is appropriate. Don't tighten to 0 decimal places — minor floating-point differences in multiplication order will cause spurious failures.

### Pin test values to 6 significant figures for CHF math

When writing `expect(r.data.low).toBeCloseTo(1_628_112, -2)`, the pinned value must be calculated correctly. Manual arithmetic on surcharges (1.20 × 1.12 = 1.344) is error-prone. Verify with: `reserve × marktwert_high − reserve × baukosten_high × 1.344`.

## Documentation lessons

_None yet._

## Agent workflow lessons

### Research agents on Swiss government sites need a hard cap at 5 fetches

Swiss government sites (bs.zh.ch, ogd.stadt-zuerich.ch, swisstopo MapServer) frequently return 403 or time out on large HTML pages. A research agent sent without a cap will stall at the watchdog timeout (600s). Use the token-manager agent before every research delegation.

### Background research agents that stall need a foreground fallback

The first Baugesuch research agent hit usage limits and stalled. In future sessions, if a background agent doesn't complete within 2 hours, restart with a tighter prompt that caps fetches to 3–4 targeted sources instead of broad crawls.

## Repeated mistakes to avoid

- **Ausbaustandard not wired:** `baukosten.json` existed but was never loaded or threaded through the pipeline. When a new data file is added to `src/data/`, immediately add it to `fixtureLoader.ts` and thread it through all callers. Don't leave it as a dead import.
- **Manual CHF arithmetic:** Always verify conservatively-paired CHF values with a formula check, not mental math. The surcharge (1.344) applied to the wrong operand shifts results by hundreds of thousands.
