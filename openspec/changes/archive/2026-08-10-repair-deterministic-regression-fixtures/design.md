## Context

The failing suite is a deterministic regression inventory over current
Harness contracts, but several test-owned bundles and prose snapshots were
authored before the current work-unit v3, style freshness, canonical Topic
Projection Entry, and verification-routing contracts. See `proposal.md` for
the motivation. The production modules and accepted specs are the sources of
truth; this change only repairs their consumers.

## Goals / Non-Goals

**Goals:**

- Make every existing failing assertion exercise the current accepted input
  shape or assert the current deterministic output.
- Preserve the smallest direct fixture prerequisite set so dependent Gate
  checks are not reported as unrelated cascades.
- Keep test classes and proof boundaries honest: `node:test` fixtures prove
  deterministic mechanics, not real Agent behavior.
- Add focused and full-suite verification evidence.

**Non-Goals:**

- No changes to `DEEP_RESEARCH_HARNESS/` production behavior, schemas, Gate
  rules, CLI exit-code conventions, or runtime authority.
- No compatibility exceptions for invalid current inputs.
- No fabricated dogfood, runtime bundle state, Agent output, or OpenSpec
  capability requirement.

## Decisions

1. **Repair inputs at the owning fixture boundary.** Work-unit fixtures will
   obtain their expected assignment from the real claim/manifest path and emit
   only canonical roles (`source_yaml`, `evidence_summary`, and
   `question_list`). This is preferred over weakening submit validation because
   the Engine contract is authoritative and the test is meant to prove it.

2. **Repair prerequisite chains before downstream assertions.** Gate-chain,
   handoff, and post-final fixtures will write the accepted style projection
   through the existing writer or use a complete current profile. Wave1
   fixtures will materialize canonical Topic identity, Projection Entries,
   depth-review references, and hash-valid terminal ledger rows before asking
   for a Wave1 receipt verdict. This keeps each failure at its nearest root.

3. **Update assertions from current executable authority.** Exit-code,
   documentation, Markdown token, verification-routing, and active-rule-count
   assertions will derive or assert current repository facts rather than pin
   retired versions, wording, tokens, or counts. No production file will be
   edited to satisfy an old snapshot.

4. **Use focused tests before the full inventory.** Each repaired suite will
   run directly first. A current-contract comparison set will remain green,
   then `npm test` must report zero failures. Temporary bundle output is
   cleaned by the existing test helpers and is never committed.

The change introduces no new named state, projection, command, or reader view;
the semantic-precision, control-complexity, and helper-responsibility reviews
are therefore not applicable beyond preserving those existing boundaries.

## Risks / Trade-offs

- [Risk] A fixture can be over-completed and accidentally hide a real Gate
  rule. → Keep every added fact tied to an accepted prerequisite and retain
  negative-case assertions for the intended failure.
- [Risk] Documentation wording changes may broaden static allowlists. → Update
  only the exact current source-of-record phrase and keep drift scanners active.
- [Risk] Parallel test cleanup can leave temporary bundles. → Re-run focused
  suites and inspect `git status`; do not add runtime artifacts to the repo.

## Migration Plan

Apply changes in focused groups, marking each task only after its direct test
passes. Run routing/closure plan checks before target edits, then run all
focused groups and `npm test`. Rollback is a normal git revert of this
verification-only change; no runtime data migration exists.
