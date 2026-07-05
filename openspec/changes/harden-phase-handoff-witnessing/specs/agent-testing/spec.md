## ADDED Requirements

> req: AGT-010

### Requirement: Handoff witnessing experiment coverage

The change SHALL add controlled E2E coverage that proves phase handoff witnessing prevents clean laundering of premature phase truncation.

The required standard playbook SHALL use a disposable bundle and real framework CLIs. It SHALL NOT mock gate/status/trace behavior. It SHALL prove:

- a gate can pass after multiple real attempts, with Engine-derived attempt diagnostics visible in trace or diagnostic artifacts;
- a controlled Wave0 cascade condition exercises cascade-mask diagnostics without changing gate truth;
- attempting to synchronize status without a witnessed next-phase entry fails closed;
- attempting old-style next-gate synchronization, such as `advance-status --to wave1_complete` immediately after wave0 pass, fails closed with source-gate advice;
- running `enter-phase --node <check.next>` writes a route-bound `load_complete` tied to the latest passed deterministic predecessor gate attempt, including source gate/source node/target node metadata and `handoff_source_attempt_index`;
- stale historical `gate_attempt.next` matches do not authorize a new `enter-phase` witness after a later passed deterministic gate attempt points elsewhere;
- an older passed handoff is rejected when a newer attempt for the same source gate/source node fails or points elsewhere;
- after `enter-phase`, source-gate `advance-status` and subsequent gate operations proceed normally under the source-gate status-window contract;
- the status-window contract is exercised beyond wave0→wave1, covering at minimum wave1→wave2, wave2→HITL2, HITL2→readiness, readiness→final, one HITL2→rerun deterministic branch emitted by the real HITL2 gate CLI, and one rerun→seed-topics multi-incoming predecessor case;
- a forced old-style resume path reports a named handoff failure and remedy instead of silently accepting the state.
- a witnessed entry without subsequent target-phase work is not overclaimed as pipeline completion: the next target gate SHALL still fail its normal content/status rules when required artifacts are absent, and the playbook SHALL NOT claim to prove chat-channel halt prevention.

The playbook verdict SHALL be based on `rb_trace.jsonl`, CLI exit codes, diagnostic artifacts, and bundle files. Console output alone SHALL NOT be verdict authority. The standard playbook SHALL NOT claim to prove real chat-channel behavior; chat-side premature synthesis remains reserved for the optional heavy canary or manual replay evidence.

#### Scenario: Standard E2E detects unwitnessed handoff

- **WHEN** a disposable bundle has a prior gate pass but no `load_complete` for the next phase
- **AND** the playbook invokes the next status/gate checkpoint
- **THEN** the checkpoint SHALL fail with inspect/advice naming the missing handoff witness
- **AND** the remedy SHALL name `enter-phase`

#### Scenario: Standard E2E passes after enter-phase

- **WHEN** the playbook runs `enter-phase --bundle <bundle> --node <next-node>`
- **THEN** `rb_trace.jsonl` SHALL contain route-bound `load_complete` for that node after the matching source gate attempt
- **AND** that `load_complete` SHALL expose source gate/source node/target node metadata and `handoff_source_attempt_index`
- **AND** the subsequent status/gate checkpoint SHALL no longer fail for missing handoff witness

#### Scenario: Standard E2E rejects stale route-bound witness

- **WHEN** a disposable bundle contains an old `gate_attempt.next` match for a lifecycle node
- **AND** a later passed deterministic gate attempt points to a different lifecycle node
- **THEN** `enter-phase --node <that-node>` SHALL fail unless the latest passed deterministic gate attempt authorizes that handoff
- **AND** no new `load_complete` SHALL be appended for the stale route

#### Scenario: Standard E2E rejects superseded pass

- **WHEN** a disposable bundle contains an older passed handoff for a source gate/source node
- **AND** a newer attempt for the same source gate/source node fails or points to a different target
- **THEN** `enter-phase` and `advance-status` SHALL reject the older handoff
- **AND** neither command SHALL mutate status or write a misleading witness

#### Scenario: Standard E2E rejects old-style next gate status laundering

- **WHEN** wave0 has passed after multiple attempts and returned `check.next: "phases/phase-wave1.md"`
- **AND** the playbook calls `advance-status --bundle <bundle> --to wave1_complete` before the wave1 gate has passed
- **THEN** the command SHALL fail closed
- **AND** the advice SHALL identify `wave0_complete` as the source gate status synchronization after `enter-phase`

#### Scenario: Standard E2E exercises full lifecycle status windows

- **WHEN** the playbook advances through witnessed handoffs after wave1 and wave2 gate passes
- **THEN** wave2 SHALL accept `current_gate: "wave1_complete"` and `next_gate: "wave2_complete"` as its active status window before wave2 passes
- **AND** the next covered phase after wave2 SHALL accept `current_gate: "wave2_complete"` and its own gate as `next_gate`
- **AND** no downstream gate SHALL require its own gate enum as `current_gate` before it has passed

#### Scenario: Standard E2E covers rerun alternate predecessor

- **WHEN** a disposable bundle trace contains a real rerun-ready pass whose `next` points to `phases/phase-seed-topics.md`
- **AND** `enter-phase --node phases/phase-seed-topics.md` writes the corresponding post-pass load witness
- **THEN** source-gate `advance-status --to rerun_ready` SHALL establish `current_gate: "rerun_ready"` and `next_gate: "seed_topics_ready"`
- **AND** the seed-topics gate preflight SHALL accept rerun as the legal predecessor for that branch

#### Scenario: Standard E2E covers HITL2 deterministic branch targets

- **WHEN** HITL2 emits a deterministic proceed handoff to `phases/phase-readiness.md`
- **THEN** `enter-phase`, source-gate `advance-status`, and readiness preflight SHALL accept the readiness target
- **WHEN** HITL2 emits a deterministic rerun handoff to `phases/phase-rerun.md`
- **THEN** `enter-phase`, source-gate `advance-status`, and rerun preflight SHALL accept the rerun target
- **AND** neither branch SHALL be replaced by a default outcome target

#### Scenario: Standard E2E does not treat entry witness as work completion

- **WHEN** a disposable bundle has a valid route-bound `load_complete` witness for a target phase
- **AND** the target phase's required artifacts or completion trace are absent
- **THEN** handoff preflight MAY pass for the entry witness
- **AND** the target phase gate SHALL still fail its normal content/status rules
- **AND** the playbook SHALL NOT describe this as proof that an Agent cannot halt in chat after `enter-phase`

#### Scenario: Standard E2E proves HITL2 rerun through real gate output

- **WHEN** the playbook records HITL2 `user_decision: rerun` in the disposable bundle and invokes `check-gate-hitl2-recorded.mjs`
- **THEN** the HITL2 gate CLI SHALL emit `check.next: "phases/phase-rerun.md"` and append a matching `gate_attempt` trace event
- **AND** the playbook SHALL NOT create the HITL2 rerun `gate_attempt` by hand
- **AND** downstream `enter-phase`, `advance-status`, and rerun preflight verdicts SHALL rely on that real gate output

#### Scenario: Standard E2E exercises high-friction diagnostics

- **WHEN** the playbook drives a disposable Wave0 gate through multiple real failed attempts before pass
- **AND** at least one failed attempt includes an upstream schema or parse failure that masks downstream count or dedup diagnostics
- **THEN** diagnostic artifacts SHALL show deterministic attempt delta and cascade-mask diagnostics
- **AND** those diagnostics SHALL NOT be treated as pass/fail authority

### Requirement: Optional heavy canary cannot substitute for standard proof

If the change includes a heavy real-Agent canary, that canary SHALL replay high-friction behavior with native Agent/subagent execution and MAY report `NOT RUN` when the runtime surface is unavailable or too costly.

The heavy canary SHALL NOT be required for archive, and `NOT RUN` SHALL NOT be claimed as proof of real Agent behavior. The standard disposable-bundle E2E remains the required mechanism proof.

#### Scenario: Heavy canary records NOT RUN without blocking archive

- **WHEN** the heavy canary cannot be executed
- **THEN** it SHALL record `NOT RUN` with diagnostic context
- **AND** the change MAY still archive if the standard E2E and regression tests pass
- **AND** the archive notes SHALL NOT claim real Agent high-friction replay passed
