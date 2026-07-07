> req: RWE-001, RWE-002, RWE-003, RWE-004, RWE-005, RWE-006, RWE-007, RWE-008, RWE-009, RWE-010

## ADDED Requirements

### Requirement: Wave experiments SHALL prove work-unit-only delegated execution

Controlled wave E2E playbooks SHALL use only `operate-work-unit` for delegated work. They SHALL cover multi-work-unit phase drain, out-of-order submit, timeout retry, gate-failure refill, and no mixed provenance pass.

#### Scenario: no mixed provenance path passes

- **WHEN** a playbook creates one work-unit output and one non-work-unit delegated output
- **THEN** the gate SHALL fail for mixed provenance

## MODIFIED Requirements

### Requirement: Wave0 happy-path + fail playbook

Wave0 playbooks SHALL verify work-unit source intake happy path and failure cases: missing ledger, missing receipt, invalid result, orphan output, non-work-unit delegated artifact, timeout retry, and gate-failure refill.

#### Scenario: Wave0 happy path drains multiple work units

- **WHEN** Wave0 has three source-intake queue items
- **THEN** the playbook SHALL claim and submit multiple work units before gate pass

### Requirement: Wave1 happy-path + boundary enforcement playbook

Wave1 playbooks SHALL verify topic deepening through work units and SHALL reject placeholder or non-work-unit delegated artifacts as pass evidence.

#### Scenario: Wave1 boundary rejects non-work-unit artifact

- **WHEN** a Wave1 delegated artifact exists without work-unit ledger coverage
- **THEN** the playbook gate SHALL fail

### Requirement: Wave2 happy-path + artifact reference verification playbook

Wave2 playbooks SHALL verify pure synthesis artifact references separately from optional delegated targeted evidence work-unit coverage.

#### Scenario: Wave2 delegated evidence is submitted

- **WHEN** Wave2 targeted evidence search is used
- **THEN** the playbook SHALL submit the delegated result by `work_id`

### Requirement: Full-chain waves sequential playbook

The full-chain playbook SHALL prove work-unit handoff across Wave0, Wave1, and Wave2 where delegated work is used, and SHALL run gates only after phase queue drain.

#### Scenario: full chain gates after drain

- **WHEN** a wave still has in-flight work units
- **THEN** the playbook SHALL not run the wave gate as a pass attempt

### Requirement: Wave repair-loop playbook

The repair-loop playbook SHALL prove gate failure creates repair/refill queue demand and new work-unit attempts with explicit batch reason.

#### Scenario: gate failure opens repair batch

- **WHEN** the gate fails for missing delegated coverage
- **THEN** the repair run SHALL open `b001+` with a repair/refill reason

### Requirement: Wave fault-tolerance playbook

The fault-tolerance playbook SHALL include invalid submit, terminal fail, timeout, abandon, duplicate submit, stale manifest/index mismatch, and late submit rejection.

#### Scenario: late submit after timeout fails

- **WHEN** a timed-out work unit submits after a retry has been claimed
- **THEN** the playbook SHALL verify late submit rejection
