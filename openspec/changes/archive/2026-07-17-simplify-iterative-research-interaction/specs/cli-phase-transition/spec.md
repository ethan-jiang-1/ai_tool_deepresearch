> req: CPT-001, CPT-003

## MODIFIED Requirements

### Requirement: Advance status CLI advances current_gate and next_gate based on chain.json

`advance-status.mjs` SHALL synchronize `rb_status.json` after a lifecycle gate pass using the existing trace-backed source-gate handoff rules and transition table.

For covered trace-backed handoffs, before mutating `rb_status.json` or appending `phase_transition`, the CLI SHALL verify that the route-bound handoff target matches the already loaded `rb_status.json#/current_node` and that the loaded node frontmatter is readable. On success, in addition to `status`, `current_gate`, and `next_gate`, the CLI SHALL return a small `continuation` object derived directly from that loaded current-node frontmatter:

- non-terminal `stop: no`: `interaction: do_not_initiate`, `next_action: execute_loaded_node`;
- `stop: yes`: `interaction: required`, `next_action: wait_for_user_in_loaded_node`;
- terminal Final: `interaction: terminal_delivery`, `next_action: deliver_final_artifacts`.

For this projection, `do_not_initiate` SHALL mean that the Agent/framework does not initiate user-facing surfacing while executing the loaded autonomous node. It SHALL NOT mean that an already received user-initiated normal conversation turn must be ignored, and it SHALL NOT make the CLI responsible for reading or classifying chat state.

The JSON `continuation` object SHALL be top-level, contain required `interaction` and `next_action` fields and a direct `node_ref` locator. It MAY include the synchronized source gate as `gate`, but SHALL NOT be nested inside status fields and SHALL NOT include confidence, policy decisions, retry trees, context estimates, alternate route choices, chat state, or pause state.

The cue SHALL NOT choose a node, execute Markdown, mutate additional state, prove target-phase completion, create interaction permission, or create a lifecycle checkpoint. If a covered handoff's `current_node` is missing, mismatched with the witnessed target, or has unreadable frontmatter, the CLI SHALL fail closed before mutation rather than guess.

For explicit bootstrap compatibility source sync where existing rules do not require a route-bound handoff, the CLI SHALL preserve current status synchronization behavior. It SHALL emit a loaded-node continuation cue only if `rb_status.json#/current_node` is non-null, matches the computed target node, and has readable frontmatter; otherwise it SHALL omit `continuation`, MAY include an explicit `continuation_diagnostic`, and SHALL NOT infer loaded-node execution from manifest/chain lookup alone.

#### Scenario: Advance into Wave1 returns execute cue

- **WHEN** Wave0 handoff to `phases/phase-wave1.md` is witnessed and `advance-status --to wave0_complete` succeeds
- **THEN** status SHALL synchronize normally
- **AND** stdout SHALL state `interaction: do_not_initiate` and Wave1 as the loaded node to execute
- **AND** stdout SHALL NOT create a user-interaction or pause authority

#### Scenario: Covered handoff with mismatched current_node fails before mutation

- **WHEN** Wave0 handoff to `phases/phase-wave1.md` is witnessed
- **AND** `rb_status.json#/current_node` is missing or names another node
- **WHEN** `advance-status --to wave0_complete` is called
- **THEN** the CLI SHALL return diagnostic JSON and non-zero exit
- **AND** it SHALL not mutate status or append `phase_transition`

#### Scenario: Advance into HITL2 returns user-interaction cue

- **WHEN** Wave2 handoff to `phases/phase-hitl2.md` is witnessed and status sync succeeds
- **THEN** continuation SHALL state `interaction: required`
- **AND** it SHALL direct the Agent to the loaded HITL2 user loop

#### Scenario: Bootstrap compatibility does not guess loaded-node cue

- **WHEN** a bootstrap-compatible source sync succeeds without a covered route-bound handoff
- **AND** `rb_status.json#/current_node` is null or does not match the computed target node
- **THEN** status MAY synchronize according to the existing compatibility path
- **AND** stdout SHALL NOT claim that the target node is loaded or executable

#### Scenario: Readiness status sync returns terminal delivery cue

- **WHEN** readiness handoff to `phases/phase-final.md` is witnessed, Final has been loaded, and `advance-status --to readiness_passed` succeeds
- **THEN** status SHALL synchronize with `next_gate: "none"`
- **AND** continuation SHALL state `interaction: terminal_delivery` and `next_action: deliver_final_artifacts`

#### Scenario: Unknown gate still fails without mutation

- **WHEN** an unknown gate is passed to `advance-status`
- **THEN** the CLI SHALL return diagnostic JSON and non-zero exit
- **AND** it SHALL not mutate status or trace

### Requirement: Enter phase CLI witnesses lifecycle node entry (CPT-003)

`enter-phase` SHALL continue to validate the latest trace-durable clean or degraded handoff, load the target dependency closure through `assessNode()`, write route-bound `load_complete`, and update `rb_status.json#/current_node` without mutating gate windows.

The accepted handoff vocabulary SHALL contain exactly two Engine-written classes:

- the existing latest legal passed `gate_attempt` with non-null `next`; and
- one `post_final_reentry` event produced by the accepted post-final recovery operation, whose closed action is `post_final_rerun`, whose recorded HITL2 decision outcome is `rerun`, and whose target/window are resolved through the existing transition table and manifest helpers.

Handoff selection SHALL compare structurally valid authorities from both classes in append-only trace order rather than let a C5-specific selector compete with the existing gate selector. A valid post-final event becomes the latest handoff only after its Final lineage and route resolution pass; a later valid normal gate handoff or newer valid post-final lineage supersedes it for future entry. Failed gate attempts, arbitrary events and partial lookalikes SHALL NOT become a newer handoff authority merely because they appear later.

The exceptional event SHALL bind its request digest, operation id, previous readiness->Final handoff/load lineage, expected profile/terminal-status/final-inventory facts, transition-table resolution and derived target status window. One structural parser SHALL produce immutable event facts; closed stage predicates SHALL add the mutable checks needed by entry, status sync and completed rerun preflight. Before phase entry it SHALL be accepted only when those facts remain current, no accepted C5 workspace remains, re-resolving HITL2 outcome `rerun` produces the recorded target/window, the event is not superseded, `rb_profile.yaml` matches the committed recovery profile, and `rb_status.json` remains the terminal Final window. After a route-bound rerun `load_complete` exists, `advance-status` SHALL validate the immutable event and that exact load witness before writing the derived `hitl2_recorded -> rerun_ready` window. Downstream consumers SHALL then require event+load+phase_transition+current rerun window without reapplying the terminal pre-entry predicate. Arbitrary trace text, C5-local/caller-supplied target nodes, `human-directed` flags and hand-written gate attempts SHALL NOT become handoff authority.

Successful stdout SHALL remain Agent-readable Markdown with stable file-boundary markers and no mixed JSON status envelope. After the loaded dependency closure, the CLI SHALL append one short generated continuation block derived from the target node frontmatter:

- non-terminal stop:no: `interaction: do_not_initiate`; execute the loaded node now without initiating a user-facing pause;
- stop:yes: `interaction: required`; follow the loaded HITL prompt;
- Final: `interaction: terminal_delivery`; deliver final artifacts only.

The generated block SHALL be a feedback projection, not a new authority surface, and SHALL not duplicate the full silent-execution contract. `do_not_initiate` SHALL not prohibit answering an already received user-initiated normal conversation turn, and the Engine SHALL not read chat state to produce the token. The block SHALL be the final stdout content and use stable markers with short key/value lines:

```markdown
<!-- DPT_CONTINUATION_CUE_START -->
interaction: do_not_initiate
next_action: execute_loaded_node
node_ref: phases/phase-wave1.md
<!-- DPT_CONTINUATION_CUE_END -->
```

For a post-final recovery handoff, route-bound `load_complete` SHALL reference the recovery event identity and lineage rather than pretending a HITL2 gate attempt occurred. Its additive binding fields SHALL be `handoff_source_kind: post_final_reentry`, `handoff_source_event_id`, `handoff_source_event_index`, `handoff_source_event_sha256`, `handoff_source_operation_id`, and the existing `handoff_target_node`. Existing source-gate handoff behavior SHALL remain unchanged.

#### Scenario: Enter phase accepts degraded source pass

- **WHEN** the latest deterministic source gate has a valid degraded pass and matching next node
- **THEN** enter-phase SHALL accept the same route-binding conditions as a clean pass
- **AND** degraded context SHALL remain in `load_complete`

#### Scenario: Post-final recovery enters the existing rerun node

- **WHEN** the latest legal handoff is a valid non-superseded `post_final_reentry` event bound to the current Final lineage and target status/profile bytes
- **AND** the Agent invokes `enter-phase --node phases/phase-rerun.md`
- **THEN** enter-phase SHALL load the existing rerun dependency closure and append a route-bound `load_complete` referencing the recovery operation/event
- **AND** it SHALL NOT write or claim a synthetic `gate_attempt`

#### Scenario: Forged exceptional event is rejected

- **WHEN** a `post_final_reentry` trace object has an unsupported action/target, wrong Final lineage, mismatched current profile/status bytes, missing operation binding or stale supersession
- **THEN** enter-phase SHALL reject the target without `load_complete` or `current_node` mutation
- **AND** one direct inspect/advice item SHALL identify the failed binding

#### Scenario: Accepted workspace must be cleaned before entry

- **WHEN** the exact recovery event exists but its accepted C5 workspace still remains after cleanup interruption
- **THEN** enter-phase SHALL reject without another load or current-node mutation
- **AND** its only advice SHALL be the exact post-final recovery command for that operation

#### Scenario: Legal entry exposes existing status synchronization

- **WHEN** enter-phase has consumed a valid recovery event and written its route-bound rerun load while updating `current_node` to `phases/phase-rerun.md`
- **THEN** the event/load lineage SHALL authorize only existing `advance-status --to hitl2_recorded` as the next status action
- **AND** downstream topic-state/reentry SHALL remain blocked until the derived rerun window and phase_transition exist

#### Scenario: stop:no rendered output ends with continuation cue

- **WHEN** enter-phase loads `phases/phase-wave1.md`
- **THEN** stdout SHALL include the normal loaded Markdown and autonomous header
- **AND** the final generated block SHALL state `interaction: do_not_initiate` and direct execution of Wave1
- **AND** the block SHALL NOT create a chat-interception or permission contract

#### Scenario: stop:yes rendered output ends with interaction cue

- **WHEN** enter-phase loads HITL2
- **THEN** the final generated block SHALL state that user interaction is required

#### Scenario: Enter phase rejects unauthorized or stale route

- **WHEN** the target node is not authorized by the latest deterministic source-gate or accepted post-final recovery handoff
- **THEN** enter-phase SHALL exit non-zero
- **AND** it SHALL not append a successful continuation block, `load_complete`, or current-node update

#### Scenario: Current node write failure is partial entry failure

- **WHEN** loading succeeded but updating `current_node` fails
- **THEN** stdout SHALL be diagnostic JSON rather than successful Markdown
- **AND** a later audit SHALL treat the existing load with terminal Final `current_node` as incomplete entry and recommend the same `enter-phase` retry, not `advance-status`
