## ADDED Requirements

> req: AGT-010

### Requirement: Handoff witnessing experiment coverage

The change SHALL add controlled E2E coverage that proves phase handoff witnessing prevents clean laundering of premature phase truncation.

The required standard playbook SHALL use a disposable bundle and real framework CLIs. It SHALL NOT mock gate/status/trace behavior. It SHALL prove:

- a gate can pass after multiple attempts;
- attempting to synchronize status without a witnessed next-phase entry fails closed;
- running `enter-phase` writes `load_complete`;
- after `enter-phase`, status/gate operations proceed normally;
- a forced old-style resume path reports a named handoff failure and remedy instead of silently accepting the state.

The playbook verdict SHALL be based on `rb_trace.jsonl`, CLI exit codes, and bundle files. Console output alone SHALL NOT be verdict authority.

#### Scenario: Standard E2E detects unwitnessed handoff

- **WHEN** a disposable bundle has a prior gate pass but no `load_complete` for the next phase
- **AND** the playbook invokes the next status/gate checkpoint
- **THEN** the checkpoint SHALL fail with inspect/advice naming the missing handoff witness
- **AND** the remedy SHALL name `enter-phase`

#### Scenario: Standard E2E passes after enter-phase

- **WHEN** the playbook runs `enter-phase --bundle <bundle> --node <next-node>`
- **THEN** `rb_trace.jsonl` SHALL contain `load_complete` for that node
- **AND** the subsequent status/gate checkpoint SHALL no longer fail for missing handoff witness

### Requirement: Optional heavy canary cannot substitute for standard proof

The change MAY include a heavy real-Agent canary that replays high-friction behavior with native Agent/subagent execution. This canary MAY report `NOT RUN` when the runtime surface is unavailable or too costly.

The heavy canary SHALL NOT be required for archive, and `NOT RUN` SHALL NOT be claimed as proof of real Agent behavior. The standard disposable-bundle E2E remains the required mechanism proof.

#### Scenario: Heavy canary records NOT RUN without blocking archive

- **WHEN** the heavy canary cannot be executed
- **THEN** it SHALL record `NOT RUN` with diagnostic context
- **AND** the change MAY still archive if the standard E2E and regression tests pass
- **AND** the archive notes SHALL NOT claim real Agent high-friction replay passed
