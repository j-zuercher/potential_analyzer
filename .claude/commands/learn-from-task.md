---
description: At the end of a non-trivial task, extract 0–3 high-signal reusable lessons into docs/lessons-learned.md. Suggests CLAUDE.md / agent / command updates when patterns emerge.
---

Review the completed task and extract reusable lessons. Invoke the `learning-agent`.

## Bar for what counts as a lesson

A lesson is worth recording only if a future contributor would have benefited from reading it before starting the same task. Zero lessons is a fine answer.

Examples of **signal** (record these):
- "GWR `egid === undefined` is the common case for free-form-geocoded addresses; the source must fail-fast without fetching."
- "Stadt Zürich OGD WFS only accepts BBOX spatial filters; CQL_FILTER is silently ignored."
- "`Q*` zones (Quartiererhaltung) need to map to W3 in the canonicalisation table — they were missing initially and produced `no_zone_data`."

Examples of **noise** (skip these):
- "TypeScript strict mode catches bugs."
- "Add tests for new code."
- "Communicate clearly with the team."

## Steps

1. **Read the change:** diff, PR description, code-review comments, QA report.
2. **Read `docs/lessons-learned.md`** to avoid duplicates.
3. **Read `CLAUDE.md`** §10 and §15 to avoid restating existing rules.
4. **Extract 0–3 lessons.** Add them to the right section in `docs/lessons-learned.md`.
5. **Check for patterns:** has the same kind of issue surfaced ≥ 2 times across PRs?
   - If yes → propose an addition to `CLAUDE.md` §10 (Coding standards) or §15 (Guardrails), or a specific agent file, or a new slash command. Provide exact text.
6. **Identify stale lessons:** if any existing lesson is now contradicted or superseded, propose removal.

## Output

1. Lessons learned (0–3, with section, headline, paragraph)
2. Repeated mistakes to avoid (if pattern detected)
3. Suggested CLAUDE.md updates (exact text, location)
4. Suggested agent file updates (exact text, location)
5. Suggested new slash command (name, purpose, contents) — if applicable
6. Suggested removal of stale lessons (if any)
