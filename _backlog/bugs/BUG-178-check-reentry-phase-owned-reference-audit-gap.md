---
bug_id: BUG-178
title: check-reentry ignores Phase-owned submitted-backed reference projections
severity: P2
phase: wave0→wave1 reentry
source: current Codex run, OpenSpec evolution/popularity/user-demands bundle
surfaced_at: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
related: [BUG-142, BUG-162]
status: resolved
resolved: 2026-07-30
resolved_by: openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators
verification: openspec/changes/archive/2026-07-30-converge-artifact-contract-evaluators/apply-evidence.md
---

# BUG-178: check-reentry rejects legal Phase-owned reference projections

## C1 Disposition (2026-07-30)

Resolved by OpenSpec change `converge-artifact-contract-evaluators` (v0.61).
`check-reentry` now delegates the reference audit to the same pure
reference-authority classifier used by normal Wave evaluation. On the recorded
real bundle, `check-reentry --at wave0_complete` passed with exit 0, zero
`ledger_coverage` blockers, and 55 `phase_owned_projection` classifications.
The unbacked-reference integration case remains blocking with the classifier's
direct missing-fact detail. Deterministic and real-bundle coordinates are
retained in the change's `apply-evidence.md`.

The real bundle still reports historical drift for `rb_status.json`,
`rb_queue.json`, and `rb_output_declarations.jsonl`. Those are independent
checkpoint-continuity findings, not a reentry reference-authority mismatch, and
remain outside C1.

## What happened

After the current bundle completed the legal Wave1 data closeout:

- all five Wave1 work units were formally submitted;
- 55 topic reference projections were materialized from submitted source/cache
  backing;
- `reference/_INDEX.md` synchronized successfully with 66 rows;
- `operate-topic-state inspect` reported all five canonical Topics `complete`;
- `inspect-bundle` and `validate-bundle` passed.

The main Wave1 reference authority path recognizes these files as
`phase_owned_projection`. However:

```bash
node DPT_FRAMEWORK/cli/check-reentry.mjs \
  --bundle dpt_rb_openspec-evolution-popularity-user-demands \
  --at wave0_complete
```

exits `1` and reports 55 blocking `ledger_coverage` findings of the form:

```text
Reference file is not declared in rb_output_declarations.jsonl:
reference/<topic>-<canonical-source>.md
```

The diagnostic walks every `reference/*.md` file and requires a direct output
declaration, without applying the current submitted-backed Phase-owned
projection classification. It also labels current Wave1 projections as
`phase: wave0` when the reentry target is `wave0_complete`.

## Why this is a defect

The accepted Wave1 split makes delegated output declarations the evidence
authority and makes topic references a Phase-owned consumer-navigation
projection backed by submitted source claims, accepted URLs, verified cache
trails, and body references. The current Wave1 Gate implements that split:
`reference_ledger_coverage` accepts a valid `phase_owned_projection`.

`check-reentry` therefore reintroduces the pre-convergence orphan-reference
rule on a separate recovery surface. It can block a valid reentry audit after
the normal closeout and offers no legal operation to add immutable
Phase-owned projections to the delegated ledger. Treating the diagnostic as
an instruction to mutate `rb_output_declarations.jsonl` would create a second
authority and violate the current contract.

## Impact

- A normal Phase-owned reference closeout cannot produce a clean reentry audit.
- The diagnostic emits a large cascade of false ledger blockers instead of
  checking the submitted backing already accepted by the main Gate.
- An Agent following the output can be sent toward an impossible ledger repair,
  repeating the historical circular-dependency shape tracked by BUG-142.
- The output obscures the actual Wave1 blocker in this run (BUG-162's
  return-map parser collision).

## Expected behavior

`check-reentry` should share the current reference authority classification used
by the Wave Gate, or at minimum exclude a Phase-owned reference when its
canonical source URL, submitted work/cache backing, and body locator checks
pass. It should preserve a blocker for an actually unbacked or delegated-bypass
reference. It must not require a Phase-owned projection to become a new
delegated `role: reference` ledger row.

## Direct evidence

- Bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Command: `check-reentry.mjs --at wave0_complete`
- Result: `passed: false`, 55 `ledger_coverage` blockers
- Contrast: `operate-topic-state inspect` passed; the Wave1 evaluator's
  reference authority helper classifies the same projections as
  `phase_owned_projection`.
- Framework surfaces: `DPT_FRAMEWORK/cli/check-reentry.mjs` audit
  `ledger_coverage`; `DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs`
  `classifyReferenceAuthority` / `checkReferenceLedgerCoverage`.

## Classification and model note

This is a deterministic recovery-diagnostic scope mismatch, not a weak-actor
materialization error. The Coding Agent is Codex and the runtime-visible model
family is GPT-5; the exact deployment ID and delegated actor models are not
exposed. The current run did not modify framework code.

This card is distinct from BUG-142: the current Wave1 Gate no longer shows the
historical Phase-owned ledger dead end, while `check-reentry` still contains a
separate unconditional orphan scan. BUG-142 remains the historical
current-head classification boundary; this card records the live recovery
surface that still violates the accepted split.

## Disposition

Do not add synthetic declarations to `rb_output_declarations.jsonl`, do not
rewrite submitted receipts, and do not modify framework code in this run.
Keep the reentry blocker as evidence until the recovery diagnostic is brought
onto the same authority classification as the Wave Gate.
