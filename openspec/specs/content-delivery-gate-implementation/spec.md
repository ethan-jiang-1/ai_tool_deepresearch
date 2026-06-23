# Content Delivery Gate Implementation

> req: CDG-001, CDG-002, CDG-003, CDG-004

## Purpose

Define the gate definition JSONs and gate CLI implementations for the three content-delivery lifecycle phases: HITL2 gate (`hitl2-recorded`), readiness gate (`readiness-passed`), and final phase (terminal, no gate). Establish real rule sets that replace placeholders.

## Requirements

### Requirement: HITL2 recorded gate rule set

`gate-hitl2-recorded.definition.json` SHALL define a complete rule set replacing the placeholder. The gate SHALL verify:
- Decision brief artifact exists at `artifacts/hitl2/decision-brief.md`
- `rb_profile.yaml` is parseable and contains `human_decision_checkpoints.hitl2.status` equal to `recorded`
- `human_decision_checkpoints.hitl2.user_decision` is non-empty
- `user_decision` value is one of the accepted enum: `proceed_to_readiness`, `request_view_revision`, `repair_and_rerun`, `stop_blocked`
- `hitl2_recorded` event exists in `rb_trace.jsonl`
- `rb_status.json` `current_gate` equals `hitl2_recorded` and `next_gate` equals `readiness_passed`

Each rule SHALL have a `failure_message` providing concrete repair direction.

#### Scenario: Gate definition parseable and complete

- **WHEN** `gate-hitl2-recorded.definition.json` is loaded
- **THEN** it SHALL parse as valid JSON with `gate`, `description`, and `rules` fields
- **AND** `rules` SHALL contain at least 5 rules
- **AND** no rule SHALL have `check: "placeholder"`

#### Scenario: Decision brief existence check

- **WHEN** the gate executes the `decision_brief_exists` rule
- **AND** `artifacts/hitl2/decision-brief.md` does not exist
- **THEN** the rule SHALL return fail with a message indicating the missing file and the required action

#### Scenario: HITL2 status recorded check

- **WHEN** the gate executes the `hitl2_status_recorded` rule
- **AND** `rb_profile.yaml` `human_decision_checkpoints.hitl2.status` is not `recorded`
- **THEN** the rule SHALL return fail with a message indicating the expected value

#### Scenario: User decision valid enum check

- **WHEN** the gate executes the `user_decision_valid_enum` rule
- **AND** `human_decision_checkpoints.hitl2.user_decision` is not one of the accepted enum values
- **THEN** the rule SHALL return fail with a message listing the accepted values

#### Scenario: Trace event present check

- **WHEN** the gate executes the `trace_hitl2_recorded` rule
- **AND** no `hitl2_recorded` event exists in `rb_trace.jsonl`
- **THEN** the rule SHALL return fail with a message indicating the missing trace event

### Requirement: Readiness passed gate rule set

`gate-readiness-passed.definition.json` SHALL define a complete rule set replacing the placeholder. The gate SHALL verify:
- Required artifact directories/files exist: `seed_topics/`, `reference/index.md`, `artifacts/wave2/synthesis.md`, `artifacts/hitl2/decision-brief.md`
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
- **AND** any required artifact (seed_topics/, reference/index.md, artifacts/wave2/synthesis.md, artifacts/hitl2/decision-brief.md) is missing
- **THEN** the gate SHALL return fail with a message identifying the missing artifact

#### Scenario: All prior gates passed audit

- **WHEN** the gate executes the `all_prior_gates_passed` rule (check type: `trace_has_all_gates`)
- **AND** the CLI derives the expected prior gate set from `manifest.json` (all phases before readiness with `gate != null`)
- **AND** `rb_trace.jsonl` is missing a `gate_attempt(passed: true)` event for one or more of those prior gates
- **THEN** the rule SHALL return fail with a message naming which specific gate(s) are missing from the trace

#### Scenario: Profile YAML parseability check

- **WHEN** the gate executes the YAML parseability rule
- **AND** `rb_profile.yaml` is missing or contains invalid YAML
- **THEN** the rule SHALL return fail with a message indicating the parse error

#### Scenario: Trace JSONL readability check

- **WHEN** the gate executes the JSONL readability rule
- **AND** `rb_trace.jsonl` is missing or contains unparseable lines
- **THEN** the rule SHALL return fail with a message indicating which line failed

### Requirement: HITL2 gate CLI evaluates rules from definition

`check-gate-hitl2-recorded.mjs` SHALL use the standard `gate-helpers.mjs` pipeline and evaluate rules from the loaded definition JSON. It SHALL NOT hardcode `passed: true`.

The CLI SHALL accept `--bundle <path>` and `--current-node <path>` flags. It SHALL load the gate definition, validate node-gate binding, iterate rules, execute deterministic checks, resolve routing via `resolveNodeTransitionDetailed`, and emit the result as JSON to stdout.

Exit code SHALL be 0 on pass, 1 on fail, 2 on routing contract error.

The CLI SHALL append a `gate_attempt` trace event to `rb_trace.jsonl` after completing all checks (on both pass and fail), following the same append pattern as the wave0/1/2 gate CLIs. This trace event is required because the readiness gate audits prior gate pass count via `gate_attempt` events — if the HITL2 CLI does not write this event, the readiness gate's prior gates audit can never reach the expected count.

#### Scenario: CLI writes gate_attempt trace event

- **WHEN** `check-gate-hitl2-recorded.mjs` completes with any result (pass or fail)
- **THEN** it SHALL append a `gate_attempt` event to `rb_trace.jsonl` with `gate`, `passed`, `currentNodeRef`, and `next` fields
- **AND** this event SHALL be readable by the readiness gate's `trace_has_all_gates` check

#### Scenario: CLI evaluates definition rules

- **WHEN** `check-gate-hitl2-recorded.mjs` is invoked with valid bundle and node
- **THEN** it SHALL load `gate-hitl2-recorded.definition.json`
- **AND** it SHALL iterate all rules and execute checks
- **AND** it SHALL NOT return hardcoded `passed: true`

#### Scenario: CLI supports yaml_parse check type

- **WHEN** a rule has `check: "yaml_parse"` with target pointing to a YAML file
- **THEN** the CLI SHALL parse the YAML file
- **AND** if parsing fails, the rule SHALL report fail with the parse error

#### Scenario: CLI supports field_non_empty check type

- **WHEN** a rule has `check: "field_non_empty"` with a YAML path target
- **THEN** the CLI SHALL navigate to the specified field in the parsed YAML
- **AND** if the field is empty, null, or missing, the rule SHALL report fail

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
