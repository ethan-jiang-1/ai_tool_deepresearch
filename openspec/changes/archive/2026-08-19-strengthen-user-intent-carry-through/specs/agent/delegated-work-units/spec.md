> req: DEW-026

## ADDED Requirements

### Requirement: Affected delegated work SHALL receive current intent through the existing task brief

Before claim, the Phase Agent that creates an intent-affected delegated demand
SHALL author the existing queue-owned `task_brief` with a bounded task-local
objective and the read-only coordinates needed to derive it. The brief SHALL
name relevant canonical seed coordinates; the User Research Controls coordinate
when controls are present; for a current rerun, the newest complete matching
Decisions revision coordinate and the assigned Topic's matching direction
coordinate; and a rule that stale, future, invalid, or legacy-unbound direction
does not become a current instruction.

The Engine SHALL carry that already-authored task brief unchanged through the
existing queue snapshot, manifest, generated task, and actor prompt path. The
brief SHALL use the work unit's existing beacon-rooted bundle coordinate and
SHALL NOT copy full user wording into every task. It SHALL NOT add machine
fields, result obligations, receipt authority, queue actions, permission, or a
second intent source. When none of these sources materially affects the demand,
the existing task-brief behavior remains unchanged.

#### Scenario: Rerun delegated task can locate current intent

- **WHEN** a current-round Wave1 or Wave2 delegated demand is affected by an accepted rerun amendment
- **THEN** its rendered task SHALL carry the Phase-authored seed, baseline, current revision, matching direction, and bounded-objective instructions unchanged
- **AND** the actor SHALL not need chat history or a copied transcript to identify the assignment

#### Scenario: Stale direction is explicitly non-current

- **WHEN** a bundle retains an older direction next to the assigned Topic's matching current direction
- **THEN** the task brief SHALL tell the actor to use only the matching current direction
- **AND** the older direction SHALL remain historical context rather than another assignment

#### Scenario: Task brief does not widen work-unit authority

- **WHEN** an intent-aware task brief is rendered into a claimed work unit
- **THEN** manifest, result, receipt, submit, ledger, and queue authority SHALL remain governed by their existing schemas and transactions
- **AND** user prose SHALL NOT authorize an output, lifecycle transition, or Gate pass
