> req: SHC-001, SHC-002

## MODIFIED Requirements

### Requirement: Shared profile content completeness

`shared-profile.md` SHALL explain the current `rb_profile.yaml` fields, types, write timing, example values, and Source of Record.

Content SHALL cover at least the current `ProfileSchema` fields:

- `plan_basename`: string for the run's canonical basename; a disposable bundle directory MAY include a `dpt_disp_` prefix and random suffix, while `plan_basename` remains the unsuffixed logical name;
- `research_profile`: one of `not_selected`, `quick_factual`, `exploratory_map`, `claim_verification`, `debug`;
- `root_must_answer_set`: string array containing the user's required questions;
- `research_style_params`: optional/nullable current 13-field style object populated through the accepted profile-style path;
- `research_access`: optional discriminated status contract for `unprobed`, `available`, or `unavailable`, including the branch-specific probe fields;
- `human_decision_checkpoints.hitl1.status`;
- `human_decision_checkpoints.hitl1.recorded_at`;
- `human_decision_checkpoints.hitl2.status`: one of `not_started`, `pending_user`, `recorded`, `blocked`, `not_applicable`;
- `human_decision_checkpoints.hitl2.answerability_class`: one of `not_assessed`, `ready_substantive`, `ready_insufficient_judgment`, `blocked_repair_required`;
- `human_decision_checkpoints.hitl2.user_decision`: `not_started` before a decision is recorded, and then one of `proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, `stop_blocked`;
- `human_decision_checkpoints.hitl2.final_report_view`: one of `not_started`, `profile_default`, `executive_brief`, `evidence_map`, `claim_judgment`, `technical_deep_dive`, `custom`;
- `human_decision_checkpoints.hitl2.custom_slug`: optional custom report name;
- `human_decision_checkpoints.hitl2.rerun_count`: optional non-negative integer with default `0`; and
- `human_decision_checkpoints.hitl2.rationale`: optional text carrying the recorded decision reason or rerun/repair intent.

The HITL2 explanation SHALL distinguish `repair` from `rerun`: `repair` means the Agent repairs the current run through existing legal paths and reruns the HITL2 gate, while `rerun` means the HITL2 gate emits the deterministic handoff to `phases/phase-rerun.md`. It SHALL NOT describe either decision as an automatic restart from instantiation.

The body SHALL include an Authority Boundary section stating that schema authority is `DPT_FRAMEWORK/schema/contracts/profile.mjs` and runtime truth is the active bundle's `rb_profile.yaml`.

#### Scenario: Agent reads shared-profile for field meaning

- **WHEN** the Agent needs to understand profile, research-access, style, or HITL decision fields
- **THEN** `shared-profile.md` SHALL describe the current field and enum contract
- **AND** it SHALL distinguish `repair` from the deterministic `rerun -> phase-rerun` route
- **AND** it SHALL identify `not_started`, not an empty string, as the pre-decision `user_decision` value

#### Scenario: HITL1 path uses current accepted contract

- **WHEN** the Agent reads the HITL1 portion of `shared-profile.md`
- **THEN** the node SHALL point to `human_decision_checkpoints.hitl1.status` and `human_decision_checkpoints.hitl1.recorded_at`
- **AND** research profile and must-answer fields SHALL remain top-level profile fields rather than invented nested HITL1 fields
- **AND** the node SHALL NOT describe removed `topic_rewrite` or `user_intent_summary` schema fields

#### Scenario: Shared profile explains disposable basename relation

- **WHEN** the Agent reads `plan_basename` in an experiment bundle
- **THEN** the node SHALL explain that the bundle directory MAY include a `dpt_disp_` prefix and random suffix
- **AND** the canonical `plan_basename` written to plan/profile SHALL remain the unsuffixed logical name

### Requirement: Shared gate rules content as generated summary

`shared-gate-rules.md` SHALL provide Agent-facing summaries of gate purpose, current check direction, and repair posture. Content SHALL mark itself `authority: generated-summary` and SHALL state that gate definition JSON and gate CLI output are deterministic rule authority. Wave gate summaries SHALL describe delegated source/evidence coverage as work-unit ledger coverage plus cross-checks.

The `hitl2-recorded` summary SHALL match the current definition and CLI contract: decision brief existence/non-empty, profile parsing, recorded status, non-empty five-enum decision, and the shared phase-handoff preflight. It SHALL NOT list a separate `hitl2_recorded` trace event as a blocking definition rule. It MAY state that the Phase Agent records that event for diagnostic/audit history, while the gate CLI writes the authoritative `gate_attempt` for the gate verdict and selected handoff.

The summary SHALL distinguish the two deterministic outcomes: `proceed_to_readiness` selects `phases/phase-readiness.md`, while `rerun` selects `phases/phase-rerun.md`. It SHALL NOT describe `repair`, `request_view_revision`, or `stop_blocked` as defaulting to readiness.

#### Scenario: Agent reads current HITL2 gate summary

- **WHEN** the Agent reads `shared-gate-rules.md` before the HITL2 gate
- **THEN** the summary SHALL reflect the current definition rules and five-enum contract
- **AND** it SHALL identify gate CLI output as deterministic verdict/routing authority
- **AND** it SHALL NOT instruct the Agent to repair a nonexistent blocking `trace_event_present` rule

#### Scenario: Wave gate summaries preserve work-unit coverage

- **WHEN** the Agent reads a Wave0, Wave1, or Wave2 gate summary
- **THEN** delegated output coverage SHALL remain described as submitted work-unit ledger coverage plus direct cross-checks
