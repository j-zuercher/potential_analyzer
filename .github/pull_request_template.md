## Summary

<!-- 1-3 sentences. What does this change and why? -->

## Related Jira ticket

<!-- e.g., POT-123, or "n/a — quick fix" -->

## Product / user impact

<!-- What does the user see differently? What use case does this serve? -->

## Technical changes

<!-- Bullet list of changes, grouped by layer if it spans several. Reference spec § sections where rules are invoked. -->

- `src/data/`:
- `src/compute/`:
- `src/ui/`:
- `src/lib/`:
- `docs/`:

## Testing

<!-- What did you test, and how? -->

- [ ] `npm test` green locally
- [ ] `npm run lint` green locally
- [ ] Manual test on at least one Stadt Zürich address (v0.5 path) — address used: _____
- [ ] Existing `compute.test.ts` math contract untouched (or, if touched: approved and updated in same commit)

## Documentation updates

<!-- Tick all that apply. -->

- [ ] `README.md` updated (only if commands / structure / stack changed)
- [ ] `docs/architecture.md` updated (if data flow / sources / modules changed)
- [ ] `docs/product.md` updated (if users / use cases / planned features changed)
- [ ] New ADR in `docs/decisions/` (if non-obvious choice)
- [ ] No doc changes needed (explain why below)

## Risks / edge cases

<!-- What could go wrong? What did you consider? -->

## Follow-ups

<!-- Things consciously not done in this PR, with rationale. -->

## Claude Code notes

<!-- Which agents / slash commands were used? Any prompt that worked particularly well or poorly? -->

- Plan: `/plan-from-ticket`
- Implementation: `/implement-approved-plan`
- Review: `/review-current-diff`
- Docs: `/update-docs`
- Learning: `/learn-from-task`
