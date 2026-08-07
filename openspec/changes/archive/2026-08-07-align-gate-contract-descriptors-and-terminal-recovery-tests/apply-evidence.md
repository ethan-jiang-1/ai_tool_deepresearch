# Apply Evidence

## Change A Dependency (2026-08-07)

`remove-recursive-queue-failure-repair` completed its supported archive
transition at
`openspec/changes/archive/2026-08-07-remove-recursive-queue-failure-repair/`.
Its archived task ledger is complete, its archive evidence records a successful
governed finalization, and the current release surfaces agree on `v0.75`:

- `CHANGELOG.md` has the `v0.75` Queue terminal-failure entry.
- `DEEP_RESEARCH_HARNESS/RUN.md` declares `v0.75`.

Change B therefore treats Queue `terminal_no_successor` behavior as an
accepted input boundary. It does not reopen or replace Queue successor
authority.

## Apply Plan Review (2026-08-07)

Before target edits, the review reread the Change B proposal, design, delta
specs, active `GSK-011`/`RWG-005` authority, Gate-definition parser, Wave1
evaluator, direct-output and semantic-heading readers, submitted-evidence/depth
reader, current claimed assignment contract, terminal fixture, and selected
verification plan.

One actionable implementation finding is retained as task 1.2.1: the Wave1
evaluator currently caches a direct-output evaluation only by target path. A
`semantic_sections` rule must not reuse that default-contract result, because
doing so could make its parsed `required_sections` metadata non-authoritative.
The repair must evaluate or cache by the parsed descriptor and a regression
must prove that the declared section names determine the result. The
`openspec-feedback:plan-review` marker records that this scoped review
completed; task 1.2.1 remains an ordinary implementation obligation and its
descriptor-specific result will be rechecked during closeout review.

## Pre-Edit Governance And Baseline (2026-08-07)

- `node openspec/governance/check-verification-routing.mjs --change align-gate-contract-descriptors-and-terminal-recovery-tests --mode plan`: PASS (6 deterministic claims).
- `openspec validate align-gate-contract-descriptors-and-terminal-recovery-tests --strict`: PASS.

The focused baseline command was:

```sh
node --test \
  tests/schema/gate-rule-audit.test.mjs \
  tests/engine/queue-manager-window-lifecycle.test.mjs \
  tests/integration/cli/check-gate-wave1-complete.test.mjs \
  tests/engine/work-unit-terminal.test.mjs \
  tests/engine/work-unit-attempt-recovery.test.mjs
```

Result: `79` passed, `6` failed. The tracker previously recorded `77` passed;
the two additional passing cases were added by the already-applied Change A
Queue work. All six failures are in
`tests/engine/work-unit-terminal.test.mjs` and occur before terminal behavior
can be exercised: its candidate writes an unassigned `reference` output while
the current Wave0 claimed assignment requires only `source_yaml`. This is
deterministic Engine evidence only and makes no Agent-flow claim.

## Applied Descriptor, Binding, and Terminal Evidence (2026-08-07)

- The active `question_list_has_four_sections` definition now parses as one
  `semantic_sections` descriptor with its four named sections. Schema parsing
  rejects empty/duplicate section names and incompatible `pattern`/`negate`
  metadata. The descriptor-specific direct-output regression proves the
  declared names, rather than a target-only default result, decide pass/fail.
- `checkWave1DepthReviewContract()` now passes the already parsed review and
  canonical Topic fact to `resolveReviewedWave1SubmittedBacking()`. The exact
  regression submits only `topic-b` and points `topic-a`'s review at that
  work unit; it returns the single
  `manifest_topic_binding_invalid` submitted-backing root, masks
  source/cache/novelty derivatives, and directs the Agent not to invent a
  reviewed ref. Formal Gate and side-effect-free inspect expose matching root
  lineage with their own rerun coordinates.
- `writeSubmitReadyCandidate()` in the terminal fixture now reads the claimed
  manifest's `output_contract.required_outputs` tuple. The current Wave0
  fixture writes and submits only its assigned `source_yaml` output; it no
  longer invents an unassigned `reference` output.

The selected deterministic verification command was:

```sh
node --test --test-reporter=dot \
  tests/schema/gate-definition.test.mjs \
  tests/schema/gate-rule-audit.test.mjs \
  tests/engine/helpers/direct-output-contract.test.mjs \
  tests/engine/wave-depth-contracts.test.mjs \
  tests/engine/work-unit-terminal.test.mjs \
  tests/integration/cli/check-gate-wave1-complete.test.mjs \
  tests/integration/cli/operate-work-unit.test.mjs
```

Result: PASS, `169` deterministic test cases. This evidence establishes only
the named Engine contracts; it does not claim real Agent-flow adherence.

## Closeout Follow-Up: One Submitted-Backing Root (2026-08-07)

The pre-sync review found that the depth contract correctly reported a
current-Topic submitted-backing failure, while the same Topic's
`per_topic_ref_md_count_floor` rule still independently reran reference
convergence and projected a second submitted-backing root. This was a
dependent symptom, not an independent reference-floor fact.

`evaluateWave1Contract()` now reuses the Topic's depth-contract result to mask
that reference-floor rule whenever the direct submitted-backing or submitted
ledger parent root is present. The binding finding now reports
`missing_contract` at the current-Topic backing/replacement boundary instead
of naming an unproven generic claim/submit operation. It retains the existing
no-fabrication message.

Focused verification run:

```sh
node --test --test-reporter=dot \
  tests/engine/wave-depth-contracts.test.mjs \
  tests/integration/cli/check-gate-wave1-complete.test.mjs
```

Result: PASS. The regressions prove deterministic Gate/inspect parity: one
`manifest_topic_binding_invalid` depth root, masked
`per_topic_ref_md_count_floor`, `missing_contract` no-path, and no
fabricated-ref or generic claim/submit advice. They do not prove real
Agent-flow adherence.

## Main-Spec Sync (2026-08-07)

The supported OpenSpec sync flow merged both declared deltas and the resulting
main requirements were reread:

- `engine/gate-skeleton` `GSK-011` removes the contradictory maintained
  per-rule closure/artifact catalog scenarios and adds parsed typed-descriptor
  plus focused evaluator/Gate evidence as the complete direct-rule audit path.
- `research/research-wave-gate-implementation` `RWG-005` records the
  declarative `semantic_sections` contract, presentation-tolerant evaluation,
  one current-Topic submitted-backing root, masked reference-floor derivative,
  and `missing_contract` no-path when no legal owner is established.

No delta operation headers were copied into a main spec. This is a semantic
specification merge, not additional runtime or Agent-flow evidence.

## Release Surface (2026-08-07)

`CHANGELOG.md` and `DEEP_RESEARCH_HARNESS/RUN.md` both declare `v0.76`.
Their release summary names the declarative Wave1 descriptor and derived audit,
the submitted-backing root-first/no-path behavior, and terminal fixture
alignment while preserving strict role, hash, snapshot, receipt, and provenance
contracts. This is release documentation, not evidence of real Agent behavior.

## Post-Sync Verification and Governance (2026-08-07)

The full selected deterministic verification plan passed after the closeout
follow-up:

```sh
node --test --test-reporter=dot \
  tests/schema/gate-definition.test.mjs \
  tests/schema/gate-rule-audit.test.mjs \
  tests/engine/wave-depth-contracts.test.mjs \
  tests/engine/work-unit-terminal.test.mjs \
  tests/integration/cli/check-gate-wave1-complete.test.mjs \
  tests/integration/cli/operate-work-unit.test.mjs
```

The required governance checks also passed:

- verification routing assets: 6 valid deterministic claims;
- strict OpenSpec validation: active change valid;
- requirement registry: 630 registered IDs, 53 retired, 0 orphan, 736
  main-spec/active-delta occurrences; and
- main-spec governance: 84 main specs, 0 violations.

These commands prove the named deterministic contracts and project governance
surfaces only. They do not prove real Agent-flow adherence.

## Closeout Review (2026-08-07)

The review boundary included this change's Gate-definition schema and Wave1
definition, direct-output/Wave evaluator/depth/convergence helpers, terminal
fixture, focused schema/unit/integration tests, synchronized `GSK-011` and
`RWG-005` main requirements, verification plan, and `v0.76` release surfaces.
The archived `remove-recursive-queue-failure-repair` changes to Queue manager,
Queue schema/tests, `AGQ-019`, `GSK-008`, and the `v0.75` release text were
treated as a released dependency, not as Change B implementation.

The scoped review found no open actionable defect. The descriptor has one
schema/evaluator path; the wrong-current-Topic regression observes one binding
root with its reference-floor derivative masked and an honest no-path; terminal
candidate construction reads the claimed assignment; and all selected
deterministic verification plus governance checks pass. This review does not
claim real Agent/sub-agent adherence or host liveness.
