# Content Delivery Gate Implementation

> req: CDG-001, CDG-002, CDG-003, CDG-004

## Purpose

Define the gate definition JSONs and gate CLI implementations for the three content-delivery lifecycle phases: HITL2 gate (`hitl2-recorded`), readiness gate (`readiness-passed`), and final phase (terminal, no gate). Establish real rule sets that replace placeholders.

## Requirements

### Requirement: HITL2 recorded gate rule set

`gate-hitl2-recorded.definition.json` SHALL define the deterministic rule set for the current HITL2 decision contract. The definition SHALL verify:

- `artifacts/hitl2/decision-brief.md` exists and is non-empty;
- `rb_profile.yaml` is parseable;
- `human_decision_checkpoints.hitl2.status` equals `recorded`;
- `human_decision_checkpoints.hitl2.user_decision` is non-empty; and
- `user_decision` is one of `proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, `stop_blocked`.

Each rule SHALL have a concrete `failure_message` naming the missing or invalid fact and the nearest repair action.

The definition SHALL NOT require a separate `hitl2_recorded` trace event as a blocking rule. The durable profile fields and decision brief own the recorded-decision check, while the gate CLI's `gate_attempt` owns deterministic gate audit. Removing the redundant trace rule SHALL NOT authorize hand-written trace or weaken the CLI's `gate_attempt` requirement.

Lifecycle handoff/status consistency MAY be enforced by the shared gate handoff preflight used by the CLI. It SHALL NOT be duplicated as a second stale set of definition rules with a different status-window interpretation.

#### Scenario: Gate definition parseable and complete

- **WHEN** `gate-hitl2-recorded.definition.json` is loaded
- **THEN** it SHALL parse as valid JSON with `gate`, `description`, and `rules` fields
- **AND** the rules SHALL cover decision-brief existence/non-empty, profile parsing, recorded status, non-empty decision, and five-enum validation
- **AND** no rule SHALL have `check: "placeholder"`

#### Scenario: Decision brief existence check

- **WHEN** `artifacts/hitl2/decision-brief.md` does not exist or is empty
- **THEN** the gate SHALL fail with advice naming the decision brief repair

#### Scenario: HITL2 status recorded check

- **WHEN** `rb_profile.yaml` `human_decision_checkpoints.hitl2.status` is not `recorded`
- **THEN** the gate SHALL fail with a message indicating the expected value

#### Scenario: User decision valid enum check

- **WHEN** `human_decision_checkpoints.hitl2.user_decision` is not one of the five accepted enum values
- **THEN** the gate SHALL fail with a message listing `proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, and `stop_blocked`

#### Scenario: Missing phase-authored trace event is not a duplicate blocker

- **WHEN** the decision brief and profile decision fields are valid but no separate `hitl2_recorded` event exists
- **THEN** the gate definition SHALL NOT fail solely for that missing event
- **AND** the gate CLI SHALL still write its own `gate_attempt` audit event

For `proceed_to_readiness` only, the HITL2 Gate SHALL require that
`final_report_view` is an existing delivery value other than `not_started`,
`composition_handoff` parses through the strict v1 schema, its
`for_rerun_count` equals the effective sibling `hitl2.rerun_count` (default
`0` when absent), and `custom` has both trim-non-empty `custom_slug` and
trim-non-empty `composition_handoff.view_instructions`. A non-custom view
SHALL not obtain semantics from `custom_slug`. The Gate SHALL use the shared
pure evaluator for these invariants and SHALL validate only structure, closed
vocabulary, conditional presence, and round binding, not semantic quality.

On a successful routed proceed attempt, the Engine-authored `gate_attempt`
SHALL carry one strict immutable `composition_handoff_receipt` with
`schema_version: composition-handoff-receipt/v1`, normalized
`final_report_view`, normalized `custom_slug` (or null), full normalized
handoff, and canonical `projection_sha256` and `profile_context_sha256` values
for the projection and parsed profile context excluding only those three
composition coordinates. Recursive canonical hashing SHALL sort object keys and
preserve array order. Receipt
durability is part of successful routing: inability to append it SHALL fail the
handoff. Non-delivery decisions retain their existing behavior without a
handoff requirement or composition receipt.

#### Scenario: Complete proceed decision emits a bound receipt

- **WHEN** a recorded `proceed_to_readiness` profile has a complete v1 handoff,
  a delivery view, and matching rerun counts
- **THEN** the HITL2 Gate SHALL pass and route to Readiness
- **AND** its durable `gate_attempt` SHALL carry normalized projection and
  profile-context fingerprints

#### Scenario: Incomplete or stale proceed handoff fails at HITL2

- **WHEN** `proceed_to_readiness` has no handoff, a malformed handoff,
  `final_report_view: not_started`, a rerun-count mismatch, or unresolved
  custom semantics
- **THEN** the Gate SHALL fail before routing
- **AND** feedback SHALL identify the smallest direct profile fact to repair at
  HITL2 rather than direct Final to infer a replacement

#### Scenario: Non-delivery decisions do not acquire a composition blocker

- **WHEN** the recorded decision is `request_view_revision`, `repair`, `rerun`,
  or `stop_blocked`
- **THEN** existing Gate decision behavior SHALL run without requiring a
  composition handoff
- **AND** no composition receipt SHALL be emitted or treated as Final
  authorization

#### Scenario: Receipt durability is part of a successful route

- **WHEN** proceed facts pass but the Engine cannot durably append the
  receipt-bearing `gate_attempt`
- **THEN** the Gate SHALL fail the handoff
- **AND** it SHALL direct repair to the trace durability boundary and rerun of
  the same HITL2 Gate

### Requirement: Readiness passed gate rule set

`gate-readiness-passed.definition.json` SHALL define a complete rule set replacing the placeholder. The gate SHALL verify:
- Required artifact directories/files exist: `seed_topics/`, `reference/_INDEX.md`, `artifacts/wave2/synthesis.md`, `artifacts/hitl2/decision-brief.md`
- Every prior gate that precedes readiness in the manifest topology has at least one `gate_attempt` event with `passed: true` in `rb_trace.jsonl` (the CLI derives the expected prior gate set from `manifest.json` at runtime — no hardcoded threshold)
- `rb_profile.yaml` is parseable as valid YAML
- `rb_trace.jsonl` is readable (every line is valid JSON)
- `rb_status.json` `current_gate` equals `readiness_passed` and `next_gate` equals `none`

The gate SHALL NOT evaluate content quality, writing quality, argument strength, or synthesis completeness. It SHALL only perform deterministic structural checks.

#### Scenario: Gate definition parseable and complete

- **WHEN** `gate-readiness-passed.definition.json` is loaded
- **THEN** it SHALL parse as valid JSON with `gate`, `description`, and `rules` fields
- **AND** `rules` SHALL contain at least 7 rules
- **AND** no rule SHALL have `check: "placeholder"`

#### Scenario: Required artifacts reachability check

- **WHEN** the gate executes artifact existence rules
- **AND** any required artifact (`seed_topics/`, `reference/_INDEX.md`, `artifacts/wave2/synthesis.md`, `artifacts/hitl2/decision-brief.md`) is missing
- **THEN** the gate SHALL return fail with a message identifying the missing artifact

#### Scenario: All prior gates passed audit

- **WHEN** the gate executes the prior-gate audit rule
- **AND** any required prior gate lacks a `gate_attempt` event with `passed: true` in `rb_trace.jsonl`
- **THEN** the gate SHALL return fail identifying the missing gate passage evidence

Readiness SHALL obtain its composition witness only from the exact legal
HITL2-to-Readiness handoff selected by the existing route-bound handoff
preflight. It SHALL not scan arbitrary earlier receipts, choose by filesystem
recency, or read a decision brief as authority. For the current v1 contract it
SHALL require a valid receipt on that selected passed HITL2 `gate_attempt`,
parse current profile, reconstruct the same normalized projection and
profile-context values, and compare both fingerprints.

Matching projection and context continues existing Readiness rules. Mismatched
context SHALL fail as unrelated profile drift with no composition-only restore;
matching context and mismatched projection SHALL fail as bounded composition
projection drift and return exactly
`node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs restore --bundle <bundle> --current-node phases/phase-readiness.md`.
Missing, malformed, unsupported, or fingerprint-inconsistent receipts fail
closed at their witness boundary. `restore` SHALL reuse the selected handoff and
shared evaluator, run only while current non-composition context matches, write
only `final_report_view`, `custom_slug`, and `composition_handoff` atomically,
validate the whole profile, append one audit event, and leave all other profile,
trace, status, artifact, receipt, and research facts unchanged. Its only next
action is the same Readiness Gate; it does not ask the user, infer semantics,
enter Final, rerun HITL2, or make the receipt Final's normal source.

An in-flight selected pre-v1 passed proceed predecessor may use
`migrate-legacy` only before Final, only once, only with a complete
user-accepted current-round projection input, and only when profile, status,
and route form a legal pre-Final lifecycle boundary. It SHALL update exactly
the same three coordinates atomically and append one predecessor-bound migration
witness with the receipt shape. Its profile-context fingerprint starts at the
committed migration result; it SHALL not claim predecessor-era context equality.
Current v1, non-proceed, stale, conflicting, repeated, post-Final, or inferred
input attempts SHALL make no mutation.

#### Scenario: Current profile matches the route-bound accepted receipt

- **WHEN** Readiness has a legal HITL2 handoff whose receipt and current profile
  produce equal projection and context fingerprints
- **THEN** composition consistency SHALL pass
- **AND** Readiness SHALL continue its existing structural rules

#### Scenario: Pure composition drift is repairable without another question

- **WHEN** only `final_report_view`, `custom_slug`, or `composition_handoff`
  differs from the selected receipt while profile context still matches
- **THEN** Readiness SHALL fail with one composition-restore operation
- **AND** successful restore followed by the same Readiness check SHALL recover
  the exact accepted projection without user interaction

#### Scenario: Unrelated profile drift cannot be hidden by restore

- **WHEN** a non-composition profile fact changes after HITL2 Gate pass
- **THEN** Readiness SHALL report unrelated profile drift
- **AND** restore SHALL refuse to write any field or represent the profile as
  Gate-accepted context

#### Scenario: Legacy migration establishes no fictional predecessor context

- **WHEN** the selected pre-v1 Gate attempt has no profile-context fingerprint
- **THEN** migration SHALL identify historical context equality as unproven and
  establish its fingerprint only from the committed result
- **AND** a later non-composition change SHALL fail Readiness against that
  migration baseline

#### Scenario: Migration cannot become a normal success path

- **WHEN** the selected handoff carries a v1 receipt, Final was legally
  entered, or a migration already exists
- **THEN** `migrate-legacy` SHALL fail without changing profile, status, trace,
  or artifacts
- **AND** it SHALL not offer another migration, Final fallback, or rewritten
  historical Gate event

### Requirement: HITL2 gate CLI evaluates rules from definition

`check-gate-hitl2-recorded.mjs` SHALL use the standard `gate-helpers.mjs` pipeline and evaluate rules from the loaded definition JSON. It SHALL NOT hardcode `passed: true`.

The CLI SHALL accept `--bundle <path>` and `--current-node <path>` flags. It SHALL load the gate definition, validate node-gate binding, run the shared phase-handoff preflight, iterate definition rules, resolve routing via `resolveNodeTransitionDetailed`, and emit structured JSON to stdout.

After all definition rules pass, the CLI SHALL map the recorded decision to routing outcome as follows:

- `proceed_to_readiness` -> deterministic outcome `passed`;
- `rerun` -> deterministic outcome `rerun`;
- `request_view_revision`, `repair`, or `stop_blocked` -> no fixed deterministic handoff; `check.next` SHALL remain null rather than defaulting to readiness.

Exit code SHALL be 0 when the decision facts pass, 1 on gate/preflight failure, and 2 on routing/configuration/caller error according to the shared convention. A passing non-deterministic decision MAY have no `check.next`; pass/fail truth and routing truth SHALL remain distinct.

The CLI SHALL append a `gate_attempt` trace event to `rb_trace.jsonl` after completing the check on both pass and fail. For a deterministic handoff, the event SHALL preserve the selected `next`; for a context-dependent decision, it SHALL preserve `next: null` rather than inventing a route.

#### Scenario: CLI writes gate_attempt trace event

- **WHEN** `check-gate-hitl2-recorded.mjs` completes with any result
- **THEN** it SHALL append a `gate_attempt` event with `gate`, `passed`, `currentNodeRef`, and `next`
- **AND** this event SHALL remain the gate audit consumed by later readiness/history checks

#### Scenario: CLI evaluates definition rules

- **WHEN** `check-gate-hitl2-recorded.mjs` is invoked with a valid bundle and node
- **THEN** it SHALL load `gate-hitl2-recorded.definition.json`
- **AND** it SHALL iterate all rules and execute checks
- **AND** it SHALL NOT return hardcoded `passed: true`

#### Scenario: Proceed decision selects readiness

- **WHEN** all checks pass and `user_decision` is `proceed_to_readiness`
- **THEN** the CLI SHALL resolve outcome `passed`
- **AND** `check.next` SHALL be `phases/phase-readiness.md`

#### Scenario: Rerun decision selects rerun node

- **WHEN** all checks pass and `user_decision` is `rerun`
- **THEN** the CLI SHALL resolve outcome `rerun`
- **AND** `check.next` SHALL be `phases/phase-rerun.md`

#### Scenario: Context-dependent decision does not default to readiness

- **WHEN** all checks pass and `user_decision` is `request_view_revision`, `repair`, or `stop_blocked`
- **THEN** `check.next` SHALL be null
- **AND** the CLI SHALL NOT replace the decision with the `passed` readiness route

#### Scenario: CLI supports yaml_parse and field checks

- **WHEN** definition rules target `rb_profile.yaml` fields
- **THEN** the CLI SHALL parse YAML and evaluate non-empty/equality/enum checks deterministically
- **AND** parse or field failure SHALL appear in structured inspect/advice

### Requirement: Readiness gate CLI evaluates rules from definition

`check-gate-readiness-passed.mjs` SHALL use the standard `gate-helpers.mjs` pipeline and evaluate rules from the loaded definition JSON. It SHALL NOT hardcode `passed: true`.

The CLI SHALL accept `--bundle <path>` and `--current-node <path>` flags. It SHALL support the `trace_has_all_gates` check type: derive the expected prior gate set from `manifest.json` topology (all phases before the current node with `gate != null`), then verify each expected gate has at least one `gate_attempt(passed: true)` event in `rb_trace.jsonl`. Missing gates SHALL be reported by name in inspect.

The CLI SHALL append a `gate_attempt` trace event to `rb_trace.jsonl` after completing all checks (on both pass and fail), following the same append pattern as the wave0/1/2 gate CLIs and the HITL2 CLI.

#### Scenario: CLI writes gate_attempt trace event

- **WHEN** `check-gate-readiness-passed.mjs` completes with any result (pass or fail)
- **THEN** it SHALL append a `gate_attempt` event to `rb_trace.jsonl` with `gate`, `passed`, `currentNodeRef`, and `next` fields

#### Scenario: CLI evaluates definition rules

- **WHEN** `check-gate-readiness-passed.mjs` is invoked with valid bundle and node
- **THEN** it SHALL load `gate-readiness-passed.definition.json`
- **AND** it SHALL iterate all rules and execute checks
- **AND** it SHALL NOT return hardcoded `passed: true`

#### Scenario: CLI supports trace_has_all_gates check type

- **WHEN** a rule has `check: "trace_has_all_gates"` with `target: "gate_attempt"` and `match: { "passed": true }`
- **THEN** the CLI SHALL read `manifest.json` to derive the set of prior gates (all phases before the current node with `gate != null`)
- **AND** the CLI SHALL read `rb_trace.jsonl` and collect all `gate_attempt` events matching the rule's target and match criteria
- **AND** if any prior gate is missing, the inspect output SHALL name which specific gate(s)

#### Scenario: CLI supports jsonl_parse check type

- **WHEN** a rule has `check: "jsonl_parse"` with target pointing to a JSONL file
- **THEN** the CLI SHALL verify every line in the file is valid JSON
- **AND** if any line fails to parse, the rule SHALL report fail with the line number
