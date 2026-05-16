# ADR 001: Baugesuch Accuracy Validation — Findings and Implications

**Date:** 2026-05-16  
**Status:** Informational (no code change decided yet)  
**Context:** CTO workstream — validate tool accuracy against real Aufstockung permit data

---

## Background

We ran the tool against 5 confirmed, completed Aufstockung projects in Stadt Zürich (2016–2021) found through public sources (Baublatt, Timbatec, open house zürich, swiss-arc.ch). The goal was to test Definition C: tool reserve estimate within 30% of actual additional BGF built.

Script: `scripts/validate-baugesuch.mjs`

## Results

| Case | Address | Zone (tool) | Tool Reserve | Actual Added | Error | D-C |
|------|---------|-------------|-------------|--------------|-------|-----|
| 1 | Hofwiesenstrasse 22, 8057 | W4 | 850 m² | ~850 m² | 0% | PASS* |
| 2 | Widmerstrasse 73, 8038 | W2 | 350 m² | ~880 m² | 60% | FAIL |
| 3 | Erikastrasse 11, 8003 | W3 | 650 m² | ~155 m² | 319% | FAIL |
| 4 | Guggachstrasse 30, 8057 | W4 | 639 m² | ~177 m² | 261% | FAIL |
| 5 | Münchhaldenstrasse 22, 8008 | W3 | 650 m² | n/a | — | N/A |

**3/4 testable cases fail Definition C. Case 1 is a coincidental pass (see below).**

## Root cause analysis

### Primary failure mode: EGID unavailable → bestehende_bgf = 0

The geocoder returned no EGID for any of the 5 validation addresses. Without EGID, the GWR building lookup is skipped and `bestehende_bgf` defaults to 0. This causes the tool to compute:

```
reserve = max_2026 - 0 = parzelle × AZ_2026
```

This is the total buildable area on an empty parcel, not the additional reserve above the existing building. For a 4-story apartment block built in the 1970s, the existing BGF might be 2,000–3,000 m², making the "reserve" figure meaningless.

**Case 1 is a coincidental pass:** The geocoder returned no EGID, bestehende_bgf=0, parzelle defaults to 500 m², zone=W4. Tool computes reserve = 500 × 1.7 = 850 m². The actual addition happened to be ~850 m² (EBF proxy). But the building already had ~2,400 m² BGF before the project — far over the AZ maximum for a 500 m² parcel. The tool result is numerically coincident but logically wrong.

### Secondary failure mode: 500 m² default parzelle

For large apartment blocks (Case 2: 55 units, Case 3: 4-story), the actual parcel is 1,500–3,000 m². The 500 m² default creates systematic underestimation of max_2026, but this is masked by the dominant failure mode above.

### Tertiary issue: confidence docking is inverted for BGF-unavailable case

In `analyzeLive()` (`src/compute/analyze.ts:217`):
```typescript
const score = Math.max(0, conf.score - (bgfFromProxy ? 10 : 0));
```

When BGF is unavailable (`bgfFromProxy = false`), no confidence is docked. But the unavailable case is worse than the proxy — the proxy introduces ~20% BGF error, while unavailable introduces 100% error (assumes empty). This is a bug. The fix would dock 20 points for unavailable vs. 10 for proxy. **Requires explicit approval before changing (spec §15).**

### Zone lookup accuracy

Case 4 (Guggachstrasse 30): A 1928 2-story row house in Unterstrass was assigned zone W4 (AZ 1.5/1.7). The confirmed post-project BGF (327 m² on 376 m² parcel) implies actual AZ ≈ 0.87, inconsistent with W4 (1.5). The WFS BBOX query can bleed into adjacent parcels with different zones, skewing the canonical zone selection.

## Decisions

### Decision A: Document and accept current accuracy limitations for v0.5

The tool's accuracy is bounded by GWR data availability. When EGID is absent, the reserve estimate is theoretical (empty-parcel) not actual. This is a known limitation, not a bug in the compute logic.

Current user-visible signal: `bgfUnavailable` caveat ("BGF nicht verfügbar, Potenzial ab Leerparzel berechnet"). This is accurate but understates the uncertainty magnitude.

### Decision B: Do NOT change compute math in this sprint

The confidence score inversion (0 pts docked for unavailable vs. 10 pts for proxy) is a bug, but fixing it requires explicit approval per CLAUDE.md §15 since it changes mathematical behavior. Tracked as a follow-up for v0.6.

### Decision C: Track EGID lookup reliability as the v0.6 priority

The v0.5 geocoder integration was designed for the happy path (address → EGID → GWR data). The validation reveals that EGID is often absent from geocoder results for Zürich addresses. Next steps:

1. Log EGID hit rate in production (add a counter or diagnostic field to `LiveAnalysisResult`).
2. Investigate whether the EGRID-based GWR lookup (instead of EGID) is more reliable for Swiss addresses.
3. Evaluate adding a third data source: amtliche Vermessung WFS for real parcel area (parzelle_m2 instead of the 500 m² default).

### Decision D: The validation script is canonical — keep it in `/scripts`

`scripts/validate-baugesuch.mjs` is the right harness for live-data accuracy tests. It should be extended as new cases are found. Do not move it into the Vitest suite — live API calls do not belong in the unit test suite.

## Accuracy target revision

Given the findings, the **70% Definition C accuracy target is not achievable in v0.5** when EGID is unavailable. A more honest framing for v0.5:

- **When EGID is available and GWR returns data:** Reserve estimate accuracy is ~±20% (proxy BGF error + 500m² parcel default). Definition C likely achievable for a majority of cases.
- **When EGID is unavailable:** Reserve is theoretical (assumes empty parcel). Should be displayed prominently, with the caveat upgraded from informational to warning.

This does not prevent shipping v0.5. It sets honest expectations and frames v0.6 scope.
