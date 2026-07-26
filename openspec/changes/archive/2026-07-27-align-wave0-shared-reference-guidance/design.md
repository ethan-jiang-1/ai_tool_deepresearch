## Context

The submitted work-unit ledger is the direct evidence authority. Current
`wave0_source_intake` output validation accepts extra safe `reference` outputs
with a `source_url`, and the Wave0 count helper reads those submitted paths
before applying `reference/00-shared-*.md`. The current Wave0 task card calls
that output optional, while `shared_ref_count_floor` reports `write_to:
reference/`; the latter implies an illegal direct Phase repair.

This is a documentation/definition alignment across Markdown, the gate
definition, and focused test fixtures. It does not require a new runtime
authority, state, command, schema, or producer.

## Goals / Non-Goals

**Goals:**

- Point an unmet shared-reference-floor finding at the existing delegated
  `wave0_source_intake` formal-submit path.
- Make shared-reference production mandatory only when that producer is used
  to supply missing shared-floor coverage, while retaining its existing
  `source.yaml` required output contract.
- Restore focused proof through current canonical-seed admission and assert
  submitted-versus-orphan evidence behavior.

**Non-Goals:**

- No new `wave0_shared_foundation` kind, queue operation, receipt, ledger,
  retry flow, health projection, or terminal route.
- No change to the profile-derived floor, degradation eligibility, Wave1/Wave2
  evidence rules, or Agent-flow behavior claim.
- No deterministic E2E or Agent-flow E2E.

## Decisions

### 1. Repair the existing feedback coordinate, not the evidence model

The gate definition's `shared_ref_count_floor` failure message and `repair`
coordinate will name the existing source-intake delegated output: a real
`reference/00-shared-<slug>.md`, declared with `role: reference` and
`source_url`, followed by the existing dry-submit/formal-submit loop. The
Engine continues to report the gate fact; it does not create evidence or route
the Agent through a new controller.

Alternative rejected: add a `wave0_shared_foundation` work-unit kind or queue
command. The existing producer, output-role validation, submit ledger, and
count reader already form the legal path. A second path would duplicate
authority and expand terminal/admission surface without answering a new
question.

### 2. Make the producer expectation conditional and explicit

The Wave0 task-card/action wording will replace `optionally write` with a
conditional requirement: when the missing shared-reference floor is being
repaired by this unit, the actor must write and declare the shared reference in
its output. `source.yaml` remains the only assignment-contract required output;
the change does not falsely make every source-intake unit produce a shared
reference or change dry-submit validation grammar.

Alternative rejected: add the shared reference to `required_receipts` or
assignment output requirements. That would alter normal per-topic intake and
conflate a profile/gate shortfall with every delegated unit's closed contract.

### 3. Repair the focused proof at its new admission prerequisite

The existing ref-count test helper will establish the canonical seed binding
that current delegated claim admission requires. Tests will then cover one
legal submitted shared reference, a direct orphan that remains uncountable,
and the production Wave0 CLI's repair feedback. This confines fixture repair
to the existing test support and avoids simulation of a Subject Agent.

Alternative rejected: an Agent-flow experiment. It would prove a broader
behavior claim than this deterministic change needs, costs more, and cannot
replace the direct ledger/count contract test.

## Risks / Trade-offs

- [Guidance text accidentally suggests direct Phase creation] -> Assert the
  exact delegated work-unit/submit coordinate in the production CLI test and
  retain the orphan rejection assertion.
- [Conditional wording is mistaken for a new assignment-contract requirement]
  -> State both the triggering condition and unchanged `source.yaml` required
  output in guidance and delta spec.
- [Fixture repair masks an admission regression] -> Limit it to canonical seed
  setup already required by the current claim contract; retain tests that use
  the real claim/submit helper.

## Migration Plan

No bundle migration is required. Existing submitted shared references keep
counting; existing direct orphans remain non-authoritative. Apply updates the
definition and Wave0 guidance atomically, runs the selected focused tests, then
bumps the framework release to `v0.52`. Rollback is a normal source rollback;
it does not require runtime-state repair because no state format changes.

## Open Questions

None for this change. Whether `wave0_shared_ref_total` is reasonable is the
separate `decide-wave0-shared-reference-floor` product decision. Wave1 source
backing and Wave2 receipt compatibility remain later evidence-led changes.
