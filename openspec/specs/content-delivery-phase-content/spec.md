# Content Delivery Phase Content

> req: CDP-001, CDP-002, CDP-003

## Purpose

Define the complete 9-section phase body content for the three content-delivery lifecycle phases: HITL2 (`phase-hitl2.md`), readiness (`phase-readiness.md`), and final (`phase-final.md`). Each phase SHALL follow the standard phase node structure with correct frontmatter contracts and deterministic boundaries.

## Requirements

### Requirement: Phase HITL2 body completeness

`phase-hitl2.md` SHALL contain a complete 9-section body following the standard phase node structure. The node SHALL declare `phase: hitl2`, `gate: hitl2-recorded`, `next: readiness`, `stop: "yes"`.

The phase SHALL produce a decision brief summarizing research findings, open questions, and recommended actions. It SHALL present structured decision options to the user and record the user's structured decision to `rb_profile.yaml` under `human_decision_checkpoints.hitl2`.

The allowed decision enum values SHALL be: `proceed_to_readiness`, `request_view_revision`, `repair_and_rerun`, `stop_blocked`.

The phase SHALL record a `hitl2_recorded` trace event.

After gate pass, the Agent SHALL read `user_decision` from `rb_profile.yaml` and act accordingly:
- `proceed_to_readiness`: Agent SHALL follow the chain's normal next (`readiness`).
- `request_view_revision`: Agent SHALL determine the affected phase and return there for revision.
- `repair_and_rerun`: Agent SHALL restart the lifecycle from instantiation, carrying updated requirements in `rb_profile.yaml`.
- `stop_blocked`: Agent SHALL terminate the lifecycle and record the reason.

`transitions.chain.json` SHALL only encode the `proceed_to_readiness` path (as the deterministic normal next). The other three decisions are Agent-level routing, not encoded in the transition table.

#### Scenario: HITL2 frontmatter contract

- **WHEN** `phase-hitl2.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-hitl2`, `phase: hitl2`, `gate: hitl2-recorded`, `stop: "yes"`
- **AND** `next` SHALL be `readiness`
- **AND** `requires` SHALL include at least `shared/shared-profile`

#### Scenario: HITL2 decision brief production

- **WHEN** Agent executes the HITL2 phase
- **THEN** Agent SHALL produce a decision brief artifact at `artifacts/hitl2/decision-brief.md`
- **AND** the brief SHALL summarize research findings from wave artifacts
- **AND** the brief SHALL present structured decision options to the user

#### Scenario: HITL2 user decision recorded to profile

- **WHEN** user provides structured decision
- **THEN** Agent SHALL write the decision to `rb_profile.yaml` under `human_decision_checkpoints.hitl2`
- **AND** the `status` field SHALL be set to `recorded`
- **AND** the `user_decision` field SHALL be one of the accepted enum values
- **AND** the decision SHALL NOT remain only in chat memory

#### Scenario: HITL2 stop behavior

- **WHEN** Agent reaches the stop point after producing the decision brief
- **THEN** Agent SHALL pause and wait for user input
- **AND** Agent SHALL NOT advance past the gate without user providing a structured decision

#### Scenario: HITL2 repair_and_rerun restarts lifecycle

- **WHEN** user chooses `repair_and_rerun`
- **AND** gate passes
- **THEN** Agent SHALL restart the lifecycle from instantiation
- **AND** updated requirements SHALL be carried in `rb_profile.yaml`
- **AND** this routing SHALL NOT be encoded in `transitions.chain.json`

#### Scenario: HITL2 proceed_to_readiness follows chain

- **WHEN** user chooses `proceed_to_readiness`
- **AND** gate passes
- **THEN** `resolveNodeTransitionDetailed` SHALL return `kind: 'next'` with `next: 'phases/phase-readiness.md'`
- **AND** Agent SHALL advance to readiness

### Requirement: Phase Readiness body completeness

`phase-readiness.md` SHALL contain a complete 9-section body. The node SHALL declare `phase: readiness`, `gate: readiness-passed`, `next: final`, `stop: "no"`.

The phase SHALL execute a deterministic precheck before final delivery:
- Verify required artifacts are reachable and parseable
- Verify all prior non-terminal gate passage statuses are auditable from trace evidence (the CLI derives the expected prior gate set at runtime from `manifest.json` topology — all phases before readiness with `gate != null`; readiness-passed itself is not counted)
- Verify profile/status/queue/trace cross-file consistency
- Verify final delivery input comes from verified bundle state

The phase SHALL NOT judge semantic quality or writing quality. It SHALL only perform structural, existence, and consistency checks.

#### Scenario: Readiness frontmatter contract

- **WHEN** `phase-readiness.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-readiness`, `phase: readiness`, `gate: readiness-passed`, `stop: "no"`
- **AND** `next` SHALL be `final`

#### Scenario: Readiness artifact reachability check

- **WHEN** Agent executes the readiness phase
- **THEN** Agent SHALL verify required artifacts exist and are parseable
- **AND** required artifacts SHALL include at minimum: `seed_topics/`, `reference/index.md`, `artifacts/wave2/synthesis.md`, `artifacts/hitl2/decision-brief.md`

#### Scenario: Readiness gate audit

- **WHEN** Agent executes the readiness phase
- **THEN** Agent SHALL verify all prior non-terminal gate passage statuses are auditable (derived from manifest topology, not a hardcoded count)
- **AND** evidence SHALL come from `rb_trace.jsonl` gate_attempt events with `passed: true`

#### Scenario: Readiness cross-file consistency

- **WHEN** Agent executes the readiness phase
- **THEN** Agent SHALL check profile/status/queue/trace for internal contradictions
- **AND** inconsistencies SHALL be reported in inspect/advice output

#### Scenario: Readiness does not judge quality

- **WHEN** Agent executes the readiness phase
- **THEN** Agent SHALL NOT evaluate writing quality, argument strength, or synthesis completeness
- **AND** the phase SHALL only perform deterministic structural checks

### Requirement: Phase Final body completeness

`phase-final.md` SHALL contain a complete 9-section body. The node SHALL declare `phase: final`, `gate: none`, `next: none`, `stop: "no"`. It SHALL be a terminal node — no outgoing gate, no normal next phase.

The phase SHALL generate final report artifact(s) from verified bundle state. The report SHALL source content from verified wave artifacts and profile, not from chat memory.

Post-final user feedback SHALL enter through HITL2 repair/rerun: feedback written to `rb_profile.yaml` under HITL2/user feedback location, then routed back to the affected phase or repair path. Final SHALL NOT contain hidden next, hidden gate, or implicit loop.

Delivery completion SHALL be evidenced by the existence of at least one report file under the `final/` directory. Because `phase-final.md` is a terminal node with `gate: none`, there is no gate CLI to write a `final_delivery` trace event, and the charter prohibits hand-writing trace events. Therefore the delivery fact is proven by file existence, not by a trace event.

#### Scenario: Final frontmatter contract

- **WHEN** `phase-final.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-final`, `phase: final`, `gate: none`, `next: none`, `stop: "no"`
- **AND** `gate` being `none` SHALL mean no outgoing gate CLI runs after this phase

#### Scenario: Final report generation

- **WHEN** Agent executes the final phase
- **THEN** Agent SHALL generate at least 1 final report artifact in the `final/` directory
- **AND** report content SHALL be sourced from verified bundle state (wave artifacts, profile, status)

#### Scenario: Final terminal semantics

- **WHEN** final phase completes
- **THEN** the lifecycle SHALL have no normal next phase
- **AND** `transitions.chain.json` SHALL NOT contain an entry for `phases/phase-final.md`

#### Scenario: Post-final feedback routing

- **WHEN** user provides feedback after final delivery
- **THEN** feedback SHALL be written to `rb_profile.yaml` under HITL2/user feedback location
- **AND** rework SHALL enter through HITL2 repair/rerun (re-running `phase-hitl2.md`)
- **AND** final SHALL NOT implement a hidden loop back to earlier phases
