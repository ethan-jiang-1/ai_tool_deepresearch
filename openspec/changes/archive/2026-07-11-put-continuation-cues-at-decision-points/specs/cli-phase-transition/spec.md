> req: CPT-001, CPT-003

## MODIFIED Requirements

### Requirement: Advance status CLI advances current_gate and next_gate based on chain.json

`advance-status.mjs` SHALL synchronize `rb_status.json` after a lifecycle gate pass using the existing trace-backed source-gate handoff rules and transition table.

For covered trace-backed handoffs, before mutating `rb_status.json` or appending `phase_transition`, the CLI SHALL verify that the route-bound handoff target matches the already loaded `rb_status.json#/current_node` and that the loaded node frontmatter is readable. On success, in addition to `status`, `current_gate`, and `next_gate`, the CLI SHALL return a small `continuation` object derived directly from that loaded current-node frontmatter:

- non-terminal `stop: no`: `interaction: prohibited`, `next_action: execute_loaded_node`;
- `stop: yes`: `interaction: required`, `next_action: wait_for_user_in_loaded_node`;
- terminal Final: `interaction: terminal_delivery`, `next_action: deliver_final_artifacts`.

The JSON `continuation` object SHALL be top-level, contain required `interaction` and `next_action` fields and a direct `node_ref` locator. It MAY include the synchronized source gate as `gate`, but SHALL NOT be nested inside status fields and SHALL NOT include confidence, policy decisions, retry trees, context estimates, or alternate route choices.

The cue SHALL NOT choose a node, execute Markdown, mutate additional state, or prove target-phase completion. If a covered handoff's `current_node` is missing, mismatched with the witnessed target, or has unreadable frontmatter, the CLI SHALL fail closed before mutation rather than guess.

For explicit bootstrap compatibility source sync where existing rules do not require a route-bound handoff, the CLI SHALL preserve current status synchronization behavior. It SHALL emit a loaded-node continuation cue only if `rb_status.json#/current_node` is non-null, matches the computed target node, and has readable frontmatter; otherwise it SHALL omit `continuation`, MAY include an explicit `continuation_diagnostic`, and SHALL NOT infer loaded-node execution from manifest/chain lookup alone.

#### Scenario: Advance into Wave1 returns execute cue

- **WHEN** Wave0 handoff to `phases/phase-wave1.md` is witnessed and `advance-status --to wave0_complete` succeeds
- **THEN** status SHALL synchronize normally
- **AND** stdout SHALL state that interaction is prohibited and Wave1 is the loaded node to execute

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

Successful stdout SHALL remain Agent-readable Markdown with stable file-boundary markers and no mixed JSON status envelope. After the loaded dependency closure, the CLI SHALL append one short generated continuation block derived from the target node frontmatter:

- non-terminal stop:no: user interaction prohibited; execute the loaded node now;
- stop:yes: user interaction required; follow the loaded HITL prompt;
- Final: terminal delivery only.

The generated block SHALL be a feedback projection, not a new authority surface, and SHALL not duplicate the full silent-execution contract. It SHALL be the final stdout content and use stable markers with short key/value lines:

```markdown
<!-- DPT_CONTINUATION_CUE_START -->
interaction: prohibited
next_action: execute_loaded_node
node_ref: phases/phase-wave1.md
<!-- DPT_CONTINUATION_CUE_END -->
```

#### Scenario: Enter phase accepts degraded source pass

- **WHEN** the latest deterministic source gate has a valid degraded pass and matching next node
- **THEN** enter-phase SHALL accept the same route-binding conditions as a clean pass
- **AND** degraded context SHALL remain in `load_complete`

#### Scenario: stop:no rendered output ends with continuation cue

- **WHEN** enter-phase loads `phases/phase-wave1.md`
- **THEN** stdout SHALL include the normal loaded Markdown and autonomous header
- **AND** the final generated block SHALL prohibit user interaction and direct execution of Wave1

#### Scenario: stop:yes rendered output ends with interaction cue

- **WHEN** enter-phase loads HITL2
- **THEN** the final generated block SHALL state that user interaction is required

#### Scenario: Enter phase rejects unauthorized or stale route

- **WHEN** the target node is not authorized by the latest deterministic source-gate handoff
- **THEN** enter-phase SHALL exit non-zero
- **AND** it SHALL not append a successful continuation block, `load_complete`, or current-node update

#### Scenario: Current node write failure is partial entry failure

- **WHEN** loading succeeded but updating `current_node` fails
- **THEN** stdout SHALL be diagnostic JSON rather than successful Markdown
- **AND** no continuation cue SHALL claim successful entry
