---
description: Implement an already-approved technical plan on a feature branch. Small commits. Tests added. npm test + npm run lint green before reporting done.
argument-hint: paste the approved plan
---

Implement the approved plan below. Adhere strictly to `CLAUDE.md` §10 (Coding standards) and §15 (Guardrails).

Plan:
$ARGUMENTS

## Rules

- **Keep diffs small.** One concern per commit. If a step exceeds ~200 lines, pause and split.
- **Match existing patterns.** New compute functions follow `src/compute/computeReserve.ts`. New source fetchers follow `src/data/sources/geocoder.ts` (optional `fetchFn` param, `Result` return).
- **Tests first when feasible.** Math change → write or update the test in `compute.test.ts` first. Source change → write the mocked-fetch test in `sources.test.ts` first.
- **No inline strings or formatted numbers.** Add to `src/lib/copy.ts` / use `src/lib/format.ts`.
- **No `any`.** Use `unknown` and narrow.
- **No throws across layer boundaries.** Use `Result<T, R>`.
- **Run `npm test` and `npm run lint`** before reporting done.

## Steps

1. **Re-read the plan.** Confirm understanding.
2. **Create a feature branch:** `feature/<jira-key>-<short-description>` (e.g., `feature/POT-12-add-vista-source`). If no Jira key, use `feature/<short-description>`.
3. **Invoke the `full-stack-engineer` agent** to execute the plan.
4. **Invoke the `qa-engineer` agent** to add or extend tests.
5. **Run `npm test` and `npm run lint`.** Fix any failures.
6. **Invoke the `code-reviewer` agent** on the current diff. Address blocking issues.
7. **Invoke the `documentation-agent`** to update docs (`README`, `architecture.md`, `decisions/`).
8. **Report changed files, test outcomes, and any deferred follow-ups** to the human.

## Final output

A single report with:
1. Branch name and commit list
2. Changed files (grouped by layer)
3. `npm test` and `npm run lint` results
4. Code-review findings + status
5. Documentation updated
6. Deferred follow-ups (with rationale)
7. Suggested PR description (using the template at `.github/pull_request_template.md`)
