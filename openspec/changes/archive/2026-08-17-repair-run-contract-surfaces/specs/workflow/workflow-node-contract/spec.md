> req: WNC-010

## MODIFIED Requirements

### Requirement: Lifecycle phase handoff consumes check.next through enter-phase (WNC-010)

Lifecycle phase nodes with deterministic gate pass routing SHALL instruct the Agent to consume gate CLI `check.next` through `enter-phase.mjs`.

The On Gate Pass section SHALL require this sequence:

1. read the gate CLI JSON output;
2. verify `check.passed === true`;
3. read `check.next`;
4. call `node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node <check.next>` and capture the rendered Markdown as the next Agent control surface;
5. before executing any work from that rendered next phase, call `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to <this phase's gate enum>` to synchronize the just-passed source gate after the target node load witness exists;
6. continue from the Markdown captured in step 4.

The phase body SHALL NOT frame `advance-status` as the action that enters the next phase. `advance-status` is status synchronization and SHALL NOT substitute for `enter-phase`. `enter-phase` itself SHALL also be framed as a deterministic loader/check, not as a JS lifecycle walker or executor of the next phase.

The source gate enum SHALL be the gate that just passed, not the next phase's gate. For example, wave0 gate pass SHALL synchronize with `--to wave0_complete` after `enter-phase --node phases/phase-wave1.md`; it SHALL NOT use `--to wave1_complete` until the wave1 gate itself has passed.

This requirement applies to lifecycle phases whose deterministic outcome has a next lifecycle node, including instantiation→HITL1, HITL1→setup, setup→seed-topics, seed-topics→wave0, wave0→wave1, wave1→wave2, wave2→HITL2, HITL2→readiness, HITL2→rerun, readiness→final, and rerun→seed-topics. HITL2 indeterminate decisions remain governed by their existing decision logic; when the current runtime emits a deterministic HITL2 branch, its selected fileRef SHALL still be consumed through `enter-phase`.

The instantiation/HITL1 bootstrap status shape is a compatibility exception that SHALL NOT be widened by phase wording. The exception covers only the `advance-status` source-gate synchronization step of the handoff sequence for the instantiation→HITL1 and HITL1→setup transitions: `phase-instantiation.md` and `phase-hitl1.md` SHALL NOT instruct `advance-status` source-gate sync as part of those handoffs, because the bootstrap status shape (`current_gate: setup_ready`, `state: not_started`, `current_node: null`) is established by the bundle creator rather than by a passed gate. The exception does NOT exempt `enter-phase` node loading: `phase-instantiation.md` §6 SHALL instruct `enter-phase --node phases/phase-hitl1.md` (the instantiation gate `check.next`) after gate pass so `rb_status.json#/current_node` is populated before HITL1 `operate-topic-state apply --context hitl1` authorization; `phase-hitl1.md` §6 SHALL likewise instruct loading `phase-setup.md` through `enter-phase` on `hitl1-recorded` gate pass. Phase wording SHALL NOT claim that the bootstrap exception skips `enter-phase`, SHALL NOT frame the bootstrap `advance-status --to setup_ready` (the `hitl1_to_setup` compatibility window, run before the setup gate) as part of the instantiation/HITL1 handoff, and SHALL NOT silently rewrite this exception boundary.

The phase wording SHALL give concrete source-gate `advance-status` commands so the Agent does not infer them at runtime:

| Passed phase | Target from `check.next` | Source-gate status sync |
| --- | --- | --- |
| setup | `phases/phase-seed-topics.md` | `advance-status --to setup_ready` |
| seed-topics | `phases/phase-wave0.md` | `advance-status --to seed_topics_ready` |
| wave0 | `phases/phase-wave1.md` | `advance-status --to wave0_complete` |
| wave1 | `phases/phase-wave2.md` | `advance-status --to wave1_complete` |
| wave2 | `phases/phase-hitl2.md` | `advance-status --to wave2_complete` |
| HITL2 proceed branch | `phases/phase-readiness.md` | `advance-status --to hitl2_recorded` |
| HITL2 rerun branch | `phases/phase-rerun.md` | `advance-status --to hitl2_recorded` |
| readiness | `phases/phase-final.md` | `advance-status --to readiness_passed` |
| rerun | `phases/phase-seed-topics.md` | `advance-status --to rerun_ready` |

The target phase's `## 0. Execution Brief` SHALL be a bounded action core for
entry presentation. It SHALL keep the already accepted order visible to an
Agent at the transition decision point: consume `check.next` through
`enter-phase`; synchronize the just-passed source gate through the exact
`advance-status --to <source_gate_enum>` command; then execute the loaded
target node. Shared dependency prose remains reference material rather than a
precondition for seeing that sequence. The action core is an Agent-facing
projection and SHALL not replace the loaded node, `load_complete`, status, or
gate authority.

Before `enter-phase` may write its route-bound `load_complete`, it SHALL
preflight that target action-core structure as framework configuration. A
missing or ambiguous `## 0. Execution Brief` through-next-H2 boundary is a
direct configuration result, not an entry witness: it SHALL leave both
`load_complete` and `rb_status.json#/current_node` unchanged and SHALL not
infer replacement Markdown or another target node. This preflight reads only
the selected framework target source; it SHALL not invoke the workflow loader,
resolve the dependency closure, or emit a workflow/trace/receipt event.

#### Scenario: Wave phase gate pass uses enter-phase

- **WHEN** a wave phase node describes its Gate Pass behavior
- **THEN** it SHALL instruct the Agent to run `enter-phase --bundle <path> --node <check.next>`
- **AND** it SHALL instruct the Agent to run `advance-status --bundle <path> --to <this phase's gate enum>` only after `enter-phase`
- **AND** it SHALL tell the Agent to continue from the captured rendered next node content as the Phase Agent's next Markdown control surface after source-gate status synchronization

#### Scenario: Advance status is not described as phase entry

- **WHEN** a lifecycle phase node mentions `advance-status`
- **THEN** the phase body SHALL NOT describe it as loading, entering, or executing the next phase
- **AND** the phase body SHALL preserve `enter-phase` as the handoff consumption action
- **AND** the phase body SHALL NOT use the next phase's gate enum as the `--to` value for the just-passed source phase

#### Scenario: Instantiation/HITL1 bootstrap exception does not exempt enter-phase loading

- **WHEN** the instantiation gate passes on a fresh bundle whose `check.next` is `phases/phase-hitl1.md`
- **THEN** `phase-instantiation.md` §6 SHALL instruct `enter-phase --bundle <path> --node phases/phase-hitl1.md`
- **AND** it SHALL NOT instruct `advance-status` source-gate sync for the instantiation→HITL1 handoff (bootstrap status shape exception)
- **AND** it SHALL NOT claim that the bootstrap exception skips `enter-phase`

#### Scenario: HITL1 handoff loads setup without source-gate sync

- **WHEN** the `hitl1-recorded` gate passes and `check.next` is `phases/phase-setup.md`
- **THEN** `phase-hitl1.md` §6 SHALL instruct `enter-phase --bundle <path> --node phases/phase-setup.md`
- **AND** it SHALL NOT instruct `advance-status` as part of the HITL1→setup handoff
- **AND** the setup phase's own bootstrap `advance-status --to setup_ready` (the `hitl1_to_setup` compatibility window, run before the setup gate) SHALL remain the legal pre-gate status sync described by `phase-setup.md`

#### Scenario: Final delivery still happens only at final

- **WHEN** readiness gate pass points to `phase-final.md`
- **THEN** readiness SHALL instruct the Agent to consume that node through `enter-phase`
- **AND** final report delivery SHALL remain governed by the Final node after final artifacts are written

#### Scenario: Wave1 and Wave2 handoffs use source-gate synchronization

- **WHEN** wave1 or wave2 phase nodes describe their Gate Pass behavior
- **THEN** wave1 SHALL instruct `enter-phase --node phases/phase-wave2.md` followed by `advance-status --to wave1_complete`
- **AND** wave2 SHALL instruct `enter-phase --node phases/phase-hitl2.md` followed by `advance-status --to wave2_complete`
- **AND** neither phase SHALL instruct the Agent to synchronize to the next phase's gate before that next phase passes

#### Scenario: Rerun handoff preserves alternate predecessor semantics

- **WHEN** rerun gate pass points to `phases/phase-seed-topics.md`
- **THEN** rerun SHALL instruct the Agent to consume seed-topics through `enter-phase`
- **AND** rerun SHALL synchronize source status with `advance-status --to rerun_ready`
- **AND** seed-topics SHALL treat rerun as a legal predecessor when the runtime trace proves that branch

#### Scenario: HITL2 deterministic branches consume the selected target

- **WHEN** HITL2 proceeds to readiness
- **THEN** HITL2 SHALL consume `phases/phase-readiness.md` through `enter-phase` and synchronize with `advance-status --to hitl2_recorded`
- **WHEN** HITL2 selects the deterministic rerun branch
- **THEN** HITL2 SHALL consume `phases/phase-rerun.md` through `enter-phase` and synchronize with `advance-status --to hitl2_recorded`
- **AND** neither branch SHALL let `advance-status` choose the target in place of the selected `check.next`

#### Scenario: Action core keeps the handoff sequence visible

- **WHEN** a lifecycle node is entered from a passed source gate
- **THEN** its bounded entry action core SHALL make the source-gate status-sync
  command visible before target-phase work begins
- **AND** shared dependency reference content SHALL not obscure or replace the
  accepted `enter-phase` -> `advance-status` -> execute ordering
