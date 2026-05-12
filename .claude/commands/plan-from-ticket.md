---
description: Convert a Jira ticket / Confluence page / rough requirement into a clear product requirement + technical plan. Stops before coding.
argument-hint: paste the ticket text, the Jira key, or a Confluence URL
---

Read the requirement below and produce a plan. Do NOT modify any files.

Requirement:
$ARGUMENTS

## Steps

1. **Read the requirement carefully.** If a Jira key is given, fetch the ticket; if a Confluence URL is given, fetch the page; if it's free text, work from that.
2. **Read the project context:** `CLAUDE.md`, `ROADMAP_v0_5.md`, `docs/spec_v0.md`, `docs/product.md`, `docs/architecture.md`.
3. **Invoke the `product-manager` agent** to formalize the requirement (summary, user story, acceptance criteria, non-goals, open questions, suggested slices, risks).
4. **If the PM output reveals genuine ambiguity, stop and ask the human** before continuing.
5. **Invoke the `architect` agent** to propose the technical approach (affected files grouped by layer, data-model changes, source-fetcher changes, test plan, risks, alternatives, ADR-needed).
6. **Cross-check** the proposal against the 7 enforced rules (`CLAUDE.md` §10) and the guardrails (§15). Flag any conflicts.
7. **Output the combined plan** to the human and STOP. Wait for human approval before any code changes.

## Final output

A single document with:
1. Product requirement (PM output)
2. Technical approach (architect output)
3. Rule / guardrail conflicts (if any)
4. Suggested first slice to implement
5. Explicit ask: "Approve to proceed? Anything you'd like to change?"
