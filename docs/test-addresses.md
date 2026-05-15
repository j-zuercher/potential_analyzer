# Manual Test Addresses — v0.5 Live Path

Three Stadt Zürich addresses for human verification of the v0.5 live pipeline (`analyzeLive()`). Each covers a distinct scenario. Run with `npm run dev` at http://localhost:5173.

Last updated: 2026-05-14

---

## Address 1 — "The Opportunity" (inner-city, high marktwert, meaningful reserve)

**Merkurstrasse 16, 8032 Zürich**

| Attribute | Expected |
|---|---|
| Kreis | 7 (Fluntern / Hottingen) |
| Zone | W3 or W4 |
| Baujahr | ~1950–1970 (pre-AZ-limit) |
| AZ reserve | Positive — building should be below current AZ limit |
| Marktwert range | W3 Kreis 7: CHF 14'000–17'500/m² · W4 Kreis 7: CHF 15'000–18'500/m² |
| Feasibility ampel | Green across all three (no known ISOS / Denkmal) |
| Confidence | 60–75 (Statik gap deducted, marktwert cluster may apply) |

**What this tests:** The upside scenario — a typical residential property in a premium inner-city location where the asking-price question is most commercially relevant. Verifies the full CHF pipeline with high marktwert values.

**Watch for:** Geocoder returning the correct Kreis (7 vs 8 boundary), correct zone code from OGD WFS, marktwert table lookup for zone × Kreis pair.

---

## Address 2 — "The Flag" (historic core, ISOS / Denkmal constraint)

**Oberdorfstrasse 28, 8001 Zürich**

| Attribute | Expected |
|---|---|
| Kreis | 1 (Altstadt Zürich / Niederdorf) |
| Zone | K (Kernzone) or W3 |
| Baujahr | Pre-1900 |
| AZ reserve | Severely limited or 0 (Denkmal-inventar forces reserve to 0) |
| Marktwert range | K Kreis 1: CHF 18'000–24'000/m² (if reserve > 0) |
| Feasibility ampel | ISOS: yellow (Altstadt Zürich is a federal ISOS site) · Denkmal: likely red |
| Confidence | Low (Denkmal → 0 regardless of other factors) |

**What this tests:** The constrained path — a building that looks attractive on marktwert but is blocked by heritage protection. Verifies `applyFeasibility()` correctly zeros the reserve and that the ampel UI shows red/yellow warnings.

**Watch for:** ISOS flag returned by the zoning source, Denkmal-inventar flag from GWR or zoning, ampel component showing correct colors, CHF output showing CHF 0 / CHF 0 when reserve is zeroed.

---

## Address 3 — "The Periphery" (outer Zürich, moderate reserve, lower marktwert)

**Hagenholzstrasse 89, 8050 Zürich**

| Attribute | Expected |
|---|---|
| Kreis | 11 (Oerlikon / Seebach) |
| Zone | W3 or W4 |
| Baujahr | ~1960–1980 |
| AZ reserve | Moderate positive (similar age/zone as Address 1 but outer location) |
| Marktwert range | W3 Kreis 11: CHF 9'500–12'000/m² · W4 Kreis 11: CHF 10'500–13'500/m² |
| Feasibility ampel | Green (no known ISOS / Denkmal in this area) |
| Confidence | 60–70 |

**What this tests:** The peripheral case — same zone type as Address 1 but in an outer Kreis. The reserve calculation should be similar, but the CHF output will be 30–40% lower due to the marktwert difference. This contrast is the tool's core product value: location matters as much as reserve.

**Watch for:** Correct PLZ-to-Kreis mapping (PLZ 8050 → Kreis 11), marktwert table lookup returning Kreis 11 values (not inner-city values), confidence score not penalizing for things that don't apply.

---

## How to run

1. `npm run dev` — starts at http://localhost:5173
2. Paste each address into the input field
3. Compare output against the "Expected" table above
4. Note: actual zone and baujahr come from live public APIs — small deviations from the expected zone (e.g. W3 vs W4) are normal and should be noted, not treated as bugs

## Known edge cases to watch for during testing

- **Geocoder returns no EGID:** The building source will fall back to `bestehende_bgf = 0`. Confidence drops; result is still returned (not an error).
- **Zone code outside marktwert table:** If OGD WFS returns a Q-zone, special district, or unmapped code, the app should surface a clear error state, not crash.
- **Address not found:** Typing a non-existent address should show the empty/error state, not a blank screen.
