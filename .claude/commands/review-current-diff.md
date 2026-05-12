---
description: Review the current git diff (uncommitted or branch vs main) against the 7 enforced rules and guardrails. Outputs blocking / non-blocking findings with file:line references.
---

Review the current git diff using the `code-reviewer` perspective.

## Steps

1. **Get the diff:**
   - Staged + unstaged: `git diff HEAD`
   - Branch vs main: `git diff main...HEAD`
   - Use whichever is appropriate; if both are non-empty, do both.
2. **Read `CLAUDE.md` §10 (the 7 rules)** so they're fresh.
3. **Walk the diff file-by-file.** For each hunk, check:
   - Rule 1: errors-as-values, no throws across layer boundaries.
   - Rule 2: compute purity (no `fetch`, `Date.now`, `Math.random`, React imports under `src/compute/`).
   - Rule 3: Zod schemas as source of truth; no parallel `interface` for things with schemas.
   - Rule 4: no inline German strings in UI or compute — `src/lib/copy.ts` only.
   - Rule 5: no inline number formatting — `src/lib/format.ts` only.
   - Rule 6: no em dashes in German copy.
   - Rule 7: comments are why-not-what, with spec § references where applicable.
4. **Check test coverage.** Was the corresponding test updated or added? `compute.test.ts` for compute changes, `sources.test.ts` for source changes.
5. **Check for `any`,** unsafe casts, or disabled type-check flags.
6. **Check for new dependencies** in `package.json` — flag with ADR-needed.
7. **Check for secrets,** `.env*` files, or hard-coded credentials.

## Output

Use the `code-reviewer` agent's output format:
1. Summary (2–3 sentences, top-level verdict)
2. Blocking issues (numbered, with file:line, rule reference)
3. Non-blocking improvements (numbered, with file:line)
4. Test gaps
5. Documentation gaps
6. Spec-section verification
7. Recommendation: `approve` / `approve with comments` / `request changes`
