## ADDED Requirements

> req: WNC-010

### Requirement: Lifecycle phase handoff consumes check.next through enter-phase

Lifecycle phase nodes with deterministic gate pass routing SHALL instruct the Agent to consume gate CLI `check.next` through `enter-phase.mjs`.

The On Gate Pass section SHALL require this sequence:

1. read the gate CLI JSON output;
2. verify `check.passed === true`;
3. read `check.next`;
4. call `node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>` and capture the rendered Markdown as the next Agent control surface;
5. before executing any work from that rendered next phase, call `node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to <this phase's gate enum>` to synchronize the just-passed source gate after the target node load witness exists;
6. continue from the Markdown captured in step 4.

The phase body SHALL NOT frame `advance-status` as the action that enters the next phase. `advance-status` is status synchronization and SHALL NOT substitute for `enter-phase`. `enter-phase` itself SHALL also be framed as a deterministic loader/check, not as a JS lifecycle walker or executor of the next phase.

The source gate enum SHALL be the gate that just passed, not the next phase's gate. For example, wave0 gate pass SHALL synchronize with `--to wave0_complete` after `enter-phase --node phases/phase-wave1.md`; it SHALL NOT use `--to wave1_complete` until the wave1 gate itself has passed.

This requirement applies to lifecycle phases whose deterministic outcome has a next lifecycle node from setup onward, including setup→seed-topics, seed-topics→wave0, wave0→wave1, wave1→wave2, wave2→HITL2, HITL2→readiness, readiness→final, and rerun→seed-topics. HITL2 indeterminate decisions remain governed by their existing decision logic; when the current runtime emits a deterministic HITL2 branch, its selected fileRef SHALL still be consumed through `enter-phase`. The instantiation/HITL1 bootstrap status shape is a compatibility exception for this change and SHALL NOT be silently rewritten by the phase wording update.

The phase wording SHALL give concrete source-gate `advance-status` commands so the Agent does not infer them at runtime:

| Passed phase | Target from `check.next` | Source-gate status sync |
| --- | --- | --- |
| setup | `phases/phase-seed-topics.md` | `advance-status --to setup_ready` |
| seed-topics | `phases/phase-wave0.md` | `advance-status --to seed_topics_ready` |
| wave0 | `phases/phase-wave1.md` | `advance-status --to wave0_complete` |
| wave1 | `phases/phase-wave2.md` | `advance-status --to wave1_complete` |
| wave2 | `phases/phase-hitl2.md` | `advance-status --to wave2_complete` |
| HITL2 proceed branch | `phases/phase-readiness.md` | `advance-status --to hitl2_recorded` |
| readiness | `phases/phase-final.md` | `advance-status --to readiness_passed` |
| rerun | `phases/phase-seed-topics.md` | `advance-status --to rerun_ready` |

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
