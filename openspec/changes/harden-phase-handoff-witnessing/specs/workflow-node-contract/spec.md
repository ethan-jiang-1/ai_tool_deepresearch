## ADDED Requirements

> req: WNC-010

### Requirement: Lifecycle phase handoff consumes check.next through enter-phase

Lifecycle phase nodes with deterministic gate pass routing SHALL instruct the Agent to consume gate CLI `check.next` through `enter-phase.mjs`.

The On Gate Pass section SHALL require this sequence:

1. read the gate CLI JSON output;
2. verify `check.passed === true`;
3. read `check.next`;
4. call `node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>`;
5. read the Markdown rendered by `enter-phase` into the Agent conversation context and continue from that next phase's Markdown instructions.

The phase body SHALL NOT frame `advance-status` as the action that enters the next phase. `advance-status` is status synchronization and SHALL NOT substitute for `enter-phase`. `enter-phase` itself SHALL also be framed as a deterministic loader/check, not as a JS lifecycle walker or executor of the next phase.

This requirement applies to lifecycle phases whose deterministic outcome has a next lifecycle node, including wave0, wave1, wave2, readiness, and other non-entry deterministic handoffs. HITL2 indeterminate decisions remain governed by their existing decision logic; when a deterministic HITL2 branch is chosen, its selected fileRef SHALL still be consumed through `enter-phase`.

#### Scenario: Wave phase gate pass uses enter-phase

- **WHEN** a wave phase node describes its Gate Pass behavior
- **THEN** it SHALL instruct the Agent to run `enter-phase --bundle <path> --node <check.next>`
- **AND** it SHALL tell the Agent to continue from the rendered next node content

#### Scenario: Advance status is not described as phase entry

- **WHEN** a lifecycle phase node mentions `advance-status`
- **THEN** the phase body SHALL NOT describe it as loading, entering, or executing the next phase
- **AND** the phase body SHALL preserve `enter-phase` as the handoff consumption action

#### Scenario: Final delivery still happens only at final

- **WHEN** readiness gate pass points to `phase-final.md`
- **THEN** readiness SHALL instruct the Agent to consume that node through `enter-phase`
- **AND** final report delivery SHALL remain governed by the Final node after final artifacts are written
