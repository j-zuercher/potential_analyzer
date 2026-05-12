---
description: After a meaningful change, update README, docs/architecture.md, docs/product.md, docs/decisions/, and (optionally) draft a Confluence-ready summary. Concise, anchored in the actual change.
---

Review the recent changes and update documentation where needed. Invoke the `documentation-agent`.

## Steps

1. **Identify the change.** `git diff main...HEAD`, the PR description, or the engineer's report.
2. **Decide which docs are affected:**
   - **README.md** — only if commands, structure, or stack changed.
   - **docs/architecture.md** — if data flow, sources, or modules changed.
   - **docs/product.md** — if users, use cases, or planned features changed.
   - **docs/decisions/** — new ADR if the change is non-obvious (data source swap, schema change, pipeline restructure, dep addition, math contract change).
   - **docs/lessons-learned.md** — see `learn-from-task` instead; not this command.
3. **Update each affected doc concisely.** Reference spec § sections where applicable. Don't restate `spec_v0.md` — link to it.
4. **For new ADRs:** copy `docs/decisions/000-template.md`, name it `NNN-short-title.md`, fill it out completely.
5. **If the change has cross-team relevance,** draft a Confluence-ready markdown summary. Do NOT publish — output for human review.

## Rules

- Concise > comprehensive. A 10-line section is better than 100 lines no one reads.
- Reference spec sections, don't restate them.
- Mark unknowns as `TODO:` and ask the human rather than inventing.
- Don't edit `docs/spec_v0.md` without explicit approval.
- Don't auto-publish to Confluence.

## Output

1. Documentation updated (file list + one-line summary per file)
2. Key changes per file
3. ADR added? (name + decision summary)
4. Missing information (TODOs added)
5. Confluence-ready summary (if applicable, in a fenced markdown block)
