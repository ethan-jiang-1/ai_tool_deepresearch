> req: GSK-002, GSK-006

## MODIFIED Requirements

### Requirement: Gate CLI skeleton shape

All formal Gate CLIs SHALL preserve the compatible JSON surface `{ check, routing, inspect, advice }` and SHALL add top-level `hints[]`. On pass, `hints` SHALL be empty. On failure, `hints` SHALL contain one entry for each independent primary blocking root and SHALL exclude advisory, diagnostic-only, masked, and downstream-symptom findings.

Each hint SHALL contain:

- `rule_id`: stable failed rule or shared preflight/config root identity;
- `repair_kind`: `agent_action`, `engine_operation`, `user_decision`, `external_action`, or `missing_contract`, copied from the resolved root contract;
- `missing_fact`: the earliest directly observed failed fact, expected deterministic contract, and observed value/state where available;
- `write_to`: the exact next-action coordinate from the resolved definition-owned or checker-owned root contract; and
- `rerun`: the exact same Gate CLI checkpoint, using the Engine-resolved absolute bundle root and current node when available.

`repair_kind` is action-responsibility feedback, not permission or interaction timing. `agent_action` and `engine_operation` tell the Controller which legal mechanical path to execute; `user_decision`, `external_action`, and `missing_contract` identify the smallest honest boundary. The Controller SHALL NOT infer this kind from the shape of `write_to` or from prose.

Producer-supplied `repair` and action-bearing `advice[]` for `user_decision`, `external_action`, or `missing_contract` SHALL remain interaction-placement-neutral so the same direct diagnostic is valid at HITL1/HITL2 and at a non-terminal `stop: no` phase. That prose SHALL identify the missing boundary and its existing owner or unavailable contract. The structured `hints[].rerun` SHALL remain the one exact checkpoint coordinate; compatibility prose SHALL NOT copy a competing command or contradict it. Producer prose SHALL NOT direct the Controller to ask/contact the user now, return/jump to HITL, surface a blocker, request approval, or wait for acknowledgement. This wording constraint SHALL NOT suppress a finding or change `repair_kind` merely to alter interaction timing, and SHALL NOT alter Gate pass/fail or routing or require the Engine to inspect conversation state. When direct facts and an accepted owner prove that a current producer mislabeled an existing mechanical operation as `user_decision`, the producer SHALL correct `repair_kind` and `write_to` to that existing owner; this is owner repair, not interaction-policy relabeling. Legacy `failure_message` remains the non-authoritative compatibility detail defined by the Gate-definition contract; this requirement SHALL NOT make it an action source or require rewriting it.

`write_to` is retained as the compatible coordinate field name, but its meaning SHALL be interpreted by `repair_kind`: `agent_action` names an authorized mutable bundle path or JSON pointer; `engine_operation` names an accepted Engine operation with the exact known arguments; `user_decision` names the exact HITL/decision surface; `external_action` names the non-delegable prerequisite; and `missing_contract` names the exact unavailable capability or checker/definition contract boundary. A non-`agent_action` coordinate SHALL NOT be presented as permission to edit that coordinate directly.

Definition-time coordinate templates SHALL be fully resolved before output. For a per-topic failure, `write_to` SHALL identify the exact current Topic path and field/JSON pointer rather than a literal `{topic}` placeholder. If invocation parsing has not established a bundle/current node, the hint SHALL preserve only known exact arguments and a required-argument command template; it SHALL NOT invent an absolute bundle root.

`hints[]` is a read-only feedback projection. It SHALL NOT become gate authority, permission, a generic repair controller, or an automatic mutation path. `inspect[]` MAY retain bounded forensic detail and `advice[]` MAY remain for compatibility, but neither SHALL be the only way for the Markdown Controller to discover the legal repair path.

All failure exits SHALL use the shared result/finding builder, including invalid invocation, missing/unparseable definition, node/gate binding, lifecycle handoff/status preflight, canonical topic-state prerequisite, gate-specific prerequisite, routing, durability, and rule evaluation. For failures outside definition evaluation, the existing helper that directly detects the failed fact SHALL construct and return the structured finding with its stable root id, blocking basis, observed/expected facts, and repair kind/write coordinate. A wrapper SHALL only project that finding for its checkpoint and SHALL NOT hand-build a failed result, reconstruct metadata from prose, or look up a duplicate central preflight-root catalog.

#### Scenario: Gate rule failure returns one actionable hint

- **WHEN** a Gate rule fails on an Agent-repairable artifact
- **THEN** output SHALL contain a primary hint naming the missing fact, exact bundle-relative artifact/field, and exact same-gate rerun command
- **AND** the Agent SHALL not need to inspect JavaScript source or infer the repair from a generic failure message

#### Scenario: Engine-owned failure does not grant manual mutation authority

- **WHEN** a Gate fails on status, trace, submitted declaration, work-unit binding, receipt, hash, or queue authority
- **THEN** `write_to` SHALL name the accepted Engine operation or an explicit missing-contract boundary
- **AND** it SHALL NOT name direct manual editing as the repair

#### Scenario: Parent root masks dependent hints

- **WHEN** one missing or unparseable parent authority makes dependent checks non-actionable
- **THEN** `hints[]` SHALL contain the parent repair only
- **AND** dependent failures SHALL be represented as masked/durable forensic detail rather than competing primary hints

#### Scenario: Explicit checked-target alias is resolved before output

- **WHEN** a definition-owned Agent rule has `target: "artifacts/wave1/{topic}/evidence-summary.md"` and `repair.write_to: "$checked_target"`, and it fails for Topic `topic-a`
- **THEN** the emitted hint SHALL name `artifacts/wave1/topic-a/evidence-summary.md`
- **AND** neither `$checked_target` nor an unresolved `{topic}` placeholder SHALL appear in `hints[]`

#### Scenario: Handoff helper owns its failure finding

- **WHEN** the shared handoff/status helper detects a missing route-bound load or invalid status window
- **THEN** that helper SHALL return the structured lifecycle finding consumed by the formal Gate projector
- **AND** the wrapper SHALL NOT translate helper prose through a separate `GATE_FAILURE_ROOTS` or equivalent root catalog

#### Scenario: Non-mechanical Gate advice stays placement-neutral

- **WHEN** a Gate or its shared evaluator emits a primary `user_decision`, `external_action`, or `missing_contract` finding
- **THEN** `hints[]` SHALL retain the exact `repair_kind`, `missing_fact`, `write_to`, and same-checkpoint `rerun`
- **AND** producer-supplied repair/advice SHALL identify the boundary without instructing immediate user contact, HITL reentry, approval, surfacing, or acknowledgement wait
- **AND** Gate verdict and route SHALL remain unchanged, and finding classification SHALL remain unchanged unless direct facts plus an accepted existing owner prove it was misclassified as a user decision

#### Scenario: Existing mechanical owner corrects a false user-decision finding

- **WHEN** a recorded research profile exists and a Wave finding lacks only derived `research_style_params` that the accepted `apply-research-style.mjs` operation owns
- **THEN** the finding SHALL use `repair_kind: engine_operation` and name that existing operation rather than HITL1
- **AND** only a genuinely missing research-profile decision MAY retain `repair_kind: user_decision`
- **AND** Gate verdict, routing and the formal same-check rerun SHALL remain unchanged

#### Scenario: CLI called without --bundle

- **WHEN** `node check-gate-wave0-complete.mjs` 被调用且未提供 `--bundle`
- **THEN** 脚本 MUST 以 `process.exit(2)` 退出，MUST 输出错误信息

#### Scenario: CLI called without --current-node

- **WHEN** `node check-gate-wave0-complete.mjs --bundle dpt_rb_test` 被调用且未提供 `--current-node`
- **THEN** 脚本 MUST 以 `process.exit(2)` 退出，MUST 输出错误信息

#### Scenario: CLI returns valid JSON

- **WHEN** `node check-gate-wave0-complete.mjs --bundle dpt_rb_test --current-node phases/phase-wave0.md` 被调用
- **THEN** stdout MUST 是合法 JSON
- **AND** MUST 包含 `check`（含 `passed`、`gate`、`currentNodeRef`、`next`）、`routing`、`inspect`、`advice` 四个 key

#### Scenario: CLI exit code matches check result

- **WHEN** CLI 返回的 JSON 中 `check.passed` 为 `false`
- **THEN** process exit code MUST 为 1

#### Scenario: CLI exits 2 on routing contract errors

- **WHEN** CLI 调用详细 router 后 `routing.kind` 为 `no_transition`、`invalid_input` 或 `config_error`
- **THEN** process exit code MUST 为 2

### Requirement: Gate CLI accepts agent-reported attempt hint for fatigue diagnostics

Lifecycle gate CLIs MAY use an Agent-reported or Engine-derived attempt count as one input to degraded-pass eligibility, but the attempt count alone SHALL NOT change gate truth or authorize handoff. A degraded pass MAY be considered only after the configured fatigue threshold has been reached and the gate can still prove the runtime-truth preconditions required by the lifecycle handoff contract.

Fatigue advice for a non-terminal `stop: no` phase SHALL reinforce the direction-aware silent contract: gate failure is not permission for the framework/Agent to initiate questions, progress, idle summaries, partial delivery or A/B choices. It SHALL direct strategy change, accepted degradation, same-check repair or silent hold without stating an absolute prohibition on answering a user-initiated normal conversation turn already received. The advice SHALL NOT inspect or classify chat state, and this change SHALL NOT alter the fatigue threshold, Gate verdict or degraded-pass eligibility.

#### Scenario: Attempt hint does not bypass runtime truth

- **WHEN** a wave gate is invoked with an attempt count at or above fatigue threshold
- **AND** the gate has a missing submitted work-unit ledger row, stale `delegated_in_flight`, invalid status window, failed handoff preflight, hash drift, nonce mismatch, or non-durable trace write
- **THEN** the Gate SHALL NOT emit a degraded pass
- **AND** inspect/advice SHALL name the runtime-truth blocker

#### Scenario: Fatigue advice prohibits initiation rather than every reply

- **WHEN** a failed non-terminal `stop: no` Gate reaches the existing fatigue threshold
- **THEN** fatigue advice SHALL state that the Agent/framework must not initiate user-facing questions, progress, idle summaries, partial delivery or choices
- **AND** it SHALL NOT state that all user-facing interaction or an answer to an already received user turn is absolutely prohibited
- **AND** the configured threshold, Gate verdict and degradation eligibility SHALL remain unchanged
