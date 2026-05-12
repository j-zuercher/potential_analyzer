# Claude Code Setup Report

> Snapshot of the agentic-development setup created for this repo. Generated once during initial migration from OneDrive to GitHub. Treat as a record, not a living doc — update via PRs if the setup changes.

## What was created

### Repo-level

- `README.md` — rewritten to reflect both v0 (fixture) and v0.5 (live-data) pipelines, the 7 engineering rules, the Claude Code workflow, and the documentation map.
- `CLAUDE.md` — operating manual. 16 sections covering project overview, product context, users, use cases, tech stack, repo structure, commands, coding standards (the 7 rules), documentation standards, git workflow, definition of done, agentic workflow, guardrails, and a spec § quick-reference.
- `.gitignore` — extended with build/test caches, OS/editor noise, OneDrive office lock files, and `.claude/settings.local.json`.
- `.github/pull_request_template.md` — required-fields PR template tied to the project's definition-of-done.

### Agent team (`.claude/agents/`)

Seven role-specific subagents, each tailored to this project (Swiss real estate, strict layer boundaries, Result type, no inline strings/numbers):

| Agent | Role | Writes code? |
|---|---|---|
| `product-manager.md` | Turn loose requests into requirements + acceptance criteria | No |
| `architect.md` | Propose technical approach, identify affected files + ADR needs | No |
| `full-stack-engineer.md` | Implement approved plans across data / compute / ui / lib | Yes |
| `code-reviewer.md` | Review diffs against the 7 rules, layer boundaries, test coverage | No |
| `qa-engineer.md` | Test plan, edge cases for live-data sources, add/extend tests | Yes (tests) |
| `documentation-agent.md` | Update README / architecture / decisions / Confluence drafts | Yes (docs) |
| `learning-agent.md` | Extract high-signal lessons, propose CLAUDE.md/agent updates | Yes (lessons) |

### Slash commands (`.claude/commands/`)

- `/plan-from-ticket` — Jira/Confluence/rough text → PM + architect plan, stops before coding.
- `/implement-approved-plan` — Engineer → QA → reviewer → docs cycle, with `npm test` + `npm run lint` gates.
- `/review-current-diff` — Run `code-reviewer` against current diff, with rule-by-rule check.
- `/update-docs` — Refresh README/architecture/product/decisions when meaningful changes land.
- `/learn-from-task` — High-signal lesson extraction at end of task.

### Documentation (`docs/`)

- `product.md` — purpose, users, workflows, current vs. planned features, open questions.
- `architecture.md` — system overview, modules, data flow (v0.5 live path), external integrations, known technical debt.
- `lessons-learned.md` — empty sections to be filled by `learning-agent` over time.
- `decisions/README.md` — when to write an ADR (and when not to).
- `decisions/000-template.md` — ADR template.
- `spec_v0.md` — copy of the canonical engineering spec from the parent BuildX folder (self-contains the repo).
- `setup_report.md` — this file.

## What was customized for THIS project (not generic)

Every artifact references the actual codebase, not boilerplate:

- **Swiss real-estate domain** — `Aufstockungspotenzial`, BGF, BZO 2016 / 2026, AZ, Stadtkreis 1–12, ISOS, Denkmalschutz, marktwert, baukosten, Ausbaustandard, Bauweise.
- **Actual public data sources** — `api3.geo.admin.ch` SearchServer (geocoder), Stadt Zürich OGD WFS `bzo_zone_v` (zoning), GWR MapServer (building). Failure modes per source.
- **Two-pipeline coexistence** — `analyze` (v0 fixture) and `analyzeLive` (v0.5 live). Agents and commands distinguish them.
- **The 7 enforced engineering rules** — codified in `CLAUDE.md` §10 and referenced as hard constraints in every agent file.
- **Specific files referenced** — `src/data/sources/geocoder.ts` as the "reference pattern" for new fetchers; `src/compute/computeReserve.ts` as the pattern for new compute functions; `src/compute/compute.test.ts` as the math contract.
- **Spec § cross-references** — agents and commands point at sections of `docs/spec_v0.md` rather than restating rules.
- **Layer boundaries** — every agent's "must NOT" list calls out the specific boundary they'd be tempted to cross (UI importing sources, compute calling `fetch`, etc.).
- **Failure modes for live data** — `qa-engineer.md` enumerates the actual edge cases for each public API (empty results, HTML in label, missing EGID, 404 in GWR, etc.).

## TODOs and open items

Marked here so they don't get forgotten:

- **PLZ → Stadtkreis edge cases.** The `PLZ_TO_KREIS` table in `analyze.ts` is approximate; some 80xx codes split across Kreise. Decide whether to refine or document.
- **Marktwert refresh cadence.** `marktwert_zh.json` is a 2026 snapshot. Decide who owns refreshes and how often.
- **`parzelle_m2` default.** When GWR doesn't return `garea`, we default to 500 m². Document or refine.
- **`/zh` proxy unused.** `vite.config.ts` has a proxy for `maps.zh.ch` reserved for future GIS-ZH integration. Either start using it or remove the dead config (ADR-worthy decision).
- **Cast in `analyzeLive`.** The `as unknown as DemoAddress` works but is fragile. Future refactor: introduce a shared narrower type both pipelines accept.
- **No CI yet.** Add `.github/workflows/ci.yml` running `npm install && npm run lint && npm test` on PR. Likely first or second post-migration PR.
- **`docs/lessons-learned.md` is empty.** Will fill organically via `learning-agent` after PRs.
- **Spec sync.** `docs/spec_v0.md` is now a copy. Decide whether parent-folder canonical stays authoritative (and we sync periodically) or the in-repo copy becomes canonical (and the parent gets archived). Worth an ADR.
- **No `docs/decisions/001-*.md` yet.** First actual ADR will likely be one of: spec authority (above), `/zh` proxy decision, or the dual-pipeline coexistence decision.

## Recommended next steps (in order)

1. **Run the PowerShell push commands** (in your terminal, see the chat reply).
2. **Verify the repo on GitHub** — README renders, `.github/pull_request_template.md` shows up on new PRs, `.claude/` directory is present.
3. **First test task** (suggestion below in chat). Pick one, run it end-to-end through the agent workflow to validate the setup before doing any real work.
4. **Add CI** — small first PR adding `.github/workflows/ci.yml`.
5. **Write ADR-001** — likely "Dual-pipeline coexistence (v0 fixture + v0.5 live)" since that's the most load-bearing architectural choice in the codebase.

## Risks of the setup itself

- **Agent files are markdown, not enforcement.** Nothing prevents a careless edit from violating the 7 rules. The `code-reviewer` agent + the `review-current-diff` command are the only gates. Consider adding `eslint` and pre-commit hooks later (separate ADR-worthy decision).
- **OneDrive sync.** This project lives in OneDrive. OneDrive can sync files mid-write, occasionally truncating saves. Encountered during setup; mitigated by writing critical files via heredoc and verifying line counts. If you see weird truncation in normal dev, suspect OneDrive first.
- **No `.git/` yet** (as of setup time). A partial broken `.git/` from a failed sandbox `git init` may be sitting in the folder; the PowerShell script in the chat reply removes it before re-initializing.
- **`gh` CLI is not assumed.** The PowerShell script uses plain `git` + the remote URL you supplied. Works with whatever auth you've already configured for github.com on Windows.
- **Sandbox couldn't push.** The migration's actual `git push` step must run from your real Windows terminal where credentials are available. The PowerShell script in the chat reply contains everything you need.
