# Architecture Decision Records

Each non-obvious technical choice that has long-tail consequences gets an ADR here. Number them sequentially (`001-`, `002-`, …) and keep the filename short and descriptive (`004-zone-canonicalization.md`).

**Use the template** at `000-template.md`. Don't skip "Alternatives considered" or "Consequences" — they're what makes an ADR useful three months later.

## What goes into an ADR

- Adding or removing a runtime dependency.
- Swapping a public API for another (different geocoder, different zone source).
- Changing a Zod schema in a way that affects fixture shape or compute input.
- Restructuring a layer boundary (e.g., moving a helper from `lib/` to `compute/`).
- Changing a math contract (any test in `compute.test.ts` whose expected value shifts).
- Changing a rule in `CLAUDE.md` §10 or §15.

## What does NOT need an ADR

- Adding a new component to `src/ui/`.
- Adding a new copy string to `src/lib/copy.ts`.
- A new fixture field that's purely additive and has a Zod default.
- A bugfix that doesn't change behavior in `compute.test.ts`.
