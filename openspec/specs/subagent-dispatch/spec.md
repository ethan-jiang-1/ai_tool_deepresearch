# Subagent Dispatch

> req: SUD-001, SUD-002, SUD-003, SUD-004, SUD-005, SUD-006, SUD-007

## Purpose

Define sub-agent dispatch as Engine work-unit claim and prompt handoff. `operate-work-unit claim` allocates `work_id`, writes the work-unit envelope, moves delegated queue demand into `delegated_in_flight`, and returns bounded prompts the Main Agent may hand to sub-agent actors.
## Requirements
### Requirement: Dispatch manifest is schema-validated

The work-unit dispatch manifest and related envelope files SHALL be validated at write time. Invalid manifests SHALL be rejected before any sub-agent prompt is treated as dispatchable.

#### Scenario: invalid work-unit manifest blocks dispatch

- **WHEN** a claimed work unit has a manifest that fails schema validation
- **THEN** its prompt SHALL NOT be treated as dispatchable

### Requirement: Dispatch SHALL originate from Engine work-unit claim

Sub-agent dispatch SHALL originate from `operate-work-unit claim`. Claim SHALL allocate `work_id`, create the work-unit directory envelope, write manifest/task/schema/beacon/receipt placeholders, move the queue demand into `delegated_in_flight`, and return the prompt that the Main Agent may hand to the sub-agent.

Current dispatch guidance SHALL define dispatch as work-unit claim and prompt handoff. It SHALL NOT describe gate pass as declaring relay slots, slot tasks, or slot result schemas as production dispatch authority.

#### Scenario: claim returns dispatchable prompt

- **WHEN** a delegated queue item is claimed
- **THEN** the Engine SHALL return a prompt bound to `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`
- **AND** the prompt SHALL reference the work-unit directory and beacon

#### Scenario: dispatch wording is work-unit based

- **WHEN** active main specs are synced after this change
- **THEN** the dispatch capability SHALL describe Engine work-unit claim as the dispatch origin
- **AND** it SHALL NOT describe bounded relay slots as the production dispatch model

### Requirement: Work-unit dispatch SHALL support batched fan-out

`operate-work-unit claim --count N` SHALL create up to N in-flight work units from the contiguous eligible queue-front prefix. The Main Agent MAY fan out the returned prompts, but sub-agents SHALL NOT allocate IDs or mutate queue/index state.

Batched fan-out SHALL be expressed as multiple Engine-allocated work units, not as a slot array or relay dispatch manifest.

#### Scenario: batch claim creates multiple in-flight attempts

- **WHEN** the queue front contains three eligible delegated items
- **AND** the Main Agent runs `claim --count 3`
- **THEN** the Engine SHALL allocate three distinct `work_id` values
- **AND** all three queue demands SHALL be recorded in `delegated_in_flight`

#### Scenario: fan-out creates work-unit prompts

- **WHEN** a current experiment proves delegated fan-out
- **THEN** it SHALL use claimed work-unit prompts as the fan-out surface
- **AND** its verdict SHALL not depend on retired relay slot manifests

### Requirement: Work-unit dispatch SHALL enforce delegated fan-out concurrency cap

V1 dispatch concurrency SHALL be enforced by the Main Agent's choice of `claim --count N` and any accepted cap. The cap SHALL limit how many work-unit prompts are fanned out at once; it SHALL NOT create multiple schedulers or allow sub-agents to allocate IDs.

The cap SHALL be described in work-unit terms. Current production guidance SHALL NOT express the concurrency cap as relay slot count.

#### Scenario: cap limits fan-out, not allocation authority

- **WHEN** a concurrency cap allows three delegated workers
- **THEN** the Main Agent MAY request `claim --count 3`
- **AND** all IDs SHALL still be allocated by the Engine in one transaction

#### Scenario: cap wording avoids slot authority

- **WHEN** a current doc or spec explains delegated concurrency
- **THEN** it SHALL describe the number of work-unit prompts the Main Agent may fan out
- **AND** it SHALL NOT describe slot allocation as production authority

