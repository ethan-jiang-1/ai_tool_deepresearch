## MODIFIED Requirements

### Requirement: Advance status CLI advances current_gate and next_gate based on chain.json

`advance-status.mjs` SHALL synchronize `rb_status.json` after a lifecycle gate
pass using the existing trace-backed source-gate handoff rules and transition
table. When the normal witnessed readiness handoff targets terminal Final and
therefore derives `current_gate: readiness_passed` and `next_gate: none`, the
same status-write/trace-append transaction SHALL set `state: completed`.
Non-terminal status synchronization and the accepted post-final
`hitl2_recorded -> rerun_ready` exception SHALL preserve their existing state
semantics.

For covered trace-backed handoffs, before mutating `rb_status.json` or
appending `phase_transition`, the CLI SHALL verify that the route-bound handoff
target matches the already loaded `rb_status.json#/current_node` and that the
loaded node frontmatter is readable. On success, in addition to `status`,
`current_gate`, and `next_gate`, the CLI SHALL return a small `continuation`
object derived directly from that loaded current-node frontmatter:

- non-terminal `stop: no`: `interaction: do_not_initiate`,
  `next_action: execute_loaded_node`;
- `stop: yes`: `interaction: required`,
  `next_action: wait_for_user_in_loaded_node`;
- terminal Final: `interaction: terminal_delivery`,
  `next_action: deliver_final_artifacts`.

For this projection, `do_not_initiate` SHALL mean that the Agent/framework does
not initiate user-facing surfacing while executing the loaded autonomous node.
It SHALL NOT mean that an already received user-initiated normal conversation
turn must be ignored, and it SHALL NOT make the CLI responsible for reading or
classifying chat state.

The JSON `continuation` object SHALL be top-level, contain required
`interaction` and `next_action` fields and a direct `node_ref` locator. It MAY
include the synchronized source gate as `gate`, but SHALL NOT be nested inside
status fields and SHALL NOT include confidence, policy decisions, retry trees,
context estimates, alternate route choices, chat state, or pause state.

The cue SHALL NOT choose a node, execute Markdown, mutate additional state,
prove target-phase completion, create interaction permission, or create a
lifecycle checkpoint. If a covered handoff's `current_node` is missing,
mismatched with the witnessed target, or has unreadable frontmatter, the CLI
SHALL fail closed before mutation rather than guess.

For explicit bootstrap compatibility source sync where existing rules do not
require a route-bound handoff, the CLI SHALL preserve current status
synchronization behavior. It SHALL emit a loaded-node continuation cue only if
`rb_status.json#/current_node` is non-null, matches the computed target node,
and has readable frontmatter; otherwise it SHALL omit `continuation`, MAY
include an explicit `continuation_diagnostic`, and SHALL NOT infer loaded-node
execution from manifest/chain lookup alone.

If trace append fails after status has been written, the existing rollback SHALL
restore the exact previous status bytes, including the previous `state`; it
SHALL NOT leave a partial terminal triple.

#### Scenario: Advance into Wave1 returns execute cue

- **WHEN** Wave0 handoff to `phases/phase-wave1.md` is witnessed and
  `advance-status --to wave0_complete` succeeds
- **THEN** status SHALL synchronize normally
- **AND** stdout SHALL state `interaction: do_not_initiate` and Wave1 as the
  loaded node to execute
- **AND** stdout SHALL NOT create a user-interaction or pause authority

#### Scenario: Covered handoff with mismatched current_node fails before mutation

- **WHEN** Wave0 handoff to `phases/phase-wave1.md` is witnessed
- **AND** `rb_status.json#/current_node` is missing or names another node
- **WHEN** `advance-status --to wave0_complete` is called
- **THEN** the CLI SHALL return diagnostic JSON and non-zero exit
- **AND** it SHALL not mutate status or append `phase_transition`

#### Scenario: Advance into HITL2 returns user-interaction cue

- **WHEN** Wave2 handoff to `phases/phase-hitl2.md` is witnessed and status
  sync succeeds
- **THEN** continuation SHALL state `interaction: required`
- **AND** it SHALL direct the Agent to the loaded HITL2 user loop

#### Scenario: Bootstrap compatibility does not guess loaded-node cue

- **WHEN** a bootstrap-compatible source sync succeeds without a covered
  route-bound handoff
- **AND** `rb_status.json#/current_node` is null or does not match the computed
  target node
- **THEN** status MAY synchronize according to the existing compatibility path
- **AND** stdout SHALL NOT claim that the target node is loaded or executable

#### Scenario: Readiness status sync commits the terminal triple and returns delivery cue

- **WHEN** readiness handoff to `phases/phase-final.md` is witnessed, Final has
  been loaded, and `advance-status --to readiness_passed` succeeds
- **THEN** status SHALL synchronize with `current_gate: readiness_passed`,
  `next_gate: none`, and `state: completed`
- **AND** continuation SHALL state `interaction: terminal_delivery` and
  `next_action: deliver_final_artifacts`

#### Scenario: Terminal trace failure restores the previous lifecycle state

- **WHEN** the witnessed readiness handoff reaches the status write but
  `phase_transition` trace append fails
- **THEN** `rb_status.json` SHALL equal its pre-command bytes, including its
  prior `state`, `current_gate`, and `next_gate`
- **AND** no `phase_transition` event SHALL be appended

#### Scenario: Post-final recovery does not rewrite terminal completion semantics

- **WHEN** an accepted post-final recovery uses the existing
  `advance-status --to hitl2_recorded` exception after its route-bound rerun
  load
- **THEN** it SHALL retain the existing derived `hitl2_recorded -> rerun_ready`
  window and its existing lifecycle state semantics
- **AND** it SHALL NOT be treated as another normal readiness-to-Final
  completion transition

#### Scenario: Unknown gate still fails without mutation

- **WHEN** an unknown gate is passed to `advance-status`
- **THEN** the CLI SHALL return diagnostic JSON and non-zero exit
- **AND** it SHALL not mutate status or trace
