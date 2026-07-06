> req: WAI-001, WAI-002, WAI-003, WAI-004, WAI-005, WAI-006, WAI-007

## ADDED Requirements

### Requirement: Wave1 deepening queue items SHALL claim work units

Wave1 deepening queue items SHALL become eligible for `operate-work-unit claim` rather than non-work-unit delegated dispatch. The queue demand SHALL include enough kind/output contract data for the Engine to create a `wave1_topic_deepening` work unit.

#### Scenario: Wave1 claim creates deepening work unit

- **WHEN** a Wave1 deepening queue item is claimed
- **THEN** the allocated work unit SHALL have kind `wave1_topic_deepening`

## MODIFIED Requirements

### Requirement: Wave1 phase uses queue-driven three-stage execution

Wave1 SHALL use queue-driven execution with delegated topic deepening represented as queue demand items claimed into work units, submitted by `work_id`, and validated by gate coverage after phase drain.

#### Scenario: Wave1 gate waits for in-flight work

- **WHEN** Wave1 has an in-flight topic deepening work unit
- **THEN** Wave1 SHALL not be considered drained

### Requirement: Sub-agent executes deepening search and writes bounded output

The Wave1 sub-agent SHALL execute bounded topic deepening according to the work-unit task/result schema and SHALL return through `operate-work-unit submit`.

#### Scenario: bounded output is submitted

- **WHEN** the Wave1 sub-agent writes bounded output
- **THEN** submit SHALL validate the output contract before ledger append

### Requirement: Inline backfill after each task completion

Inline backfill after delegated Wave1 completion SHALL occur after successful work-unit submit and ledger append. Backfill SHALL not treat claimed or invalid-submitted attempts as completed.

#### Scenario: invalid submit does not trigger backfill

- **WHEN** a Wave1 submit is rejected as invalid
- **THEN** inline backfill SHALL not run for that queue demand

### Requirement: Wave1 gate checks deepening artifacts

Wave1 gate SHALL check deepening artifacts through submitted work-unit ledger coverage and cross-checks.

#### Scenario: deepening artifact requires ledger row

- **WHEN** a Wave1 deepening artifact exists without submitted ledger coverage
- **THEN** Wave1 gate SHALL fail

### Requirement: Wave1 queue-loop playbook verifies deepening end-to-end

Wave1 playbook SHALL verify deepening end to end through work-unit claim, sub-agent execution, submit, ledger, backfill, and gate.

#### Scenario: Wave1 playbook covers out-of-order submit

- **WHEN** multiple Wave1 deepening work units are in flight
- **THEN** the playbook SHALL allow submits to arrive out of order

## REMOVED Requirements

### Requirement: Wave1 deepening task card targets sub-agent via targets.delegates

**Reason**: Wave1 delegated task-card targeting no longer routes through relay dispatch authority. Work-unit claim is the production allocation boundary.

**Migration**: Use `Wave1 deepening queue items SHALL claim work units`.

#### Scenario: Wave1 deepening target routes through claim

- **WHEN** a Wave1 deepening queue item targets delegated work
- **THEN** the Engine SHALL allocate a `wave1_topic_deepening` work unit through claim
