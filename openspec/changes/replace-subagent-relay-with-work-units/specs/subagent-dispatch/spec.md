> req: SUD-001, SUD-002, SUD-003, SUD-004, SUD-005, SUD-006, SUD-007

## ADDED Requirements

### Requirement: Dispatch SHALL originate from Engine work-unit claim

Sub-agent dispatch SHALL originate from `operate-work-unit claim`. Claim SHALL allocate `work_id`, create the work-unit directory envelope, write manifest/task/schema/beacon/receipt placeholders, move the queue demand into `delegated_in_flight`, and return the prompt that the Main Agent may hand to the sub-agent.

#### Scenario: claim returns dispatchable prompt

- **WHEN** a delegated queue item is claimed
- **THEN** the Engine SHALL return a prompt bound to `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`
- **AND** the prompt SHALL reference the work-unit directory and beacon

### Requirement: Work-unit dispatch SHALL support batched fan-out

`operate-work-unit claim --count N` SHALL create up to N in-flight work units from the contiguous eligible queue-front prefix. The Main Agent MAY fan out the returned prompts, but sub-agents SHALL NOT allocate IDs or mutate queue/index state.

#### Scenario: batch claim creates multiple in-flight attempts

- **WHEN** the queue front contains three eligible delegated items
- **AND** the Main Agent runs `claim --count 3`
- **THEN** the Engine SHALL allocate three distinct `work_id` values
- **AND** all three queue demands SHALL be recorded in `delegated_in_flight`

### Requirement: Work-unit dispatch SHALL enforce delegated fan-out concurrency cap

V1 dispatch concurrency SHALL be enforced by the Main Agent's choice of `claim --count N` and any accepted cap. The cap SHALL limit how many work-unit prompts are fanned out at once; it SHALL NOT create multiple schedulers or allow sub-agents to allocate IDs.

#### Scenario: cap limits fan-out, not allocation authority

- **WHEN** a concurrency cap allows three delegated workers
- **THEN** the Main Agent MAY request `claim --count 3`
- **AND** all IDs SHALL still be allocated by the Engine in one transaction

## REMOVED Requirements

### Requirement: V1 dispatch enforces MAX_CONCURRENT_SUBAGENTS concurrency cap

**Reason**: The old concurrency source of truth was tied to the relay dispatch module. Work-unit fan-out is controlled by Engine claim transactions plus an accepted delegated fan-out cap.

**Migration**: Use `Work-unit dispatch SHALL enforce delegated fan-out concurrency cap`.

#### Scenario: old concurrency symbol is not production authority

- **WHEN** delegated work is claimed for fan-out
- **THEN** the Engine SHALL allocate work-unit IDs through claim
- **AND** no relay-specific concurrency symbol SHALL be the delegated allocation authority

### Requirement: Gate pass declares real subagent slots

**Reason**: Gates no longer declare or depend on subagent slots.

**Migration**: Gates validate submitted work-unit ledger coverage.

#### Scenario: gate pass does not declare slots

- **WHEN** a wave gate passes
- **THEN** the pass state SHALL be based on work-unit ledger coverage and structural rules
- **AND** it SHALL NOT declare real subagent slots

### Requirement: Dispatch uses wave-specific file system contract

**Reason**: The old dispatch filesystem contract is slot based.

**Migration**: Dispatch SHALL use `_work_units/waveN/{work_id}/`.

#### Scenario: dispatch path is work-unit path

- **WHEN** Wave1 dispatch occurs
- **THEN** the prompt and manifest SHALL refer to `_work_units/wave1/{work_id}/`

### Requirement: Queue task card targets.delegates triggers relay-based dispatch

**Reason**: Queue delegated demand triggers work-unit claim, not relay-based dispatch.

**Migration**: Queue demand with delegated target SHALL become eligible for `operate-work-unit claim`.

#### Scenario: delegated target triggers work-unit claim

- **WHEN** a queue item requires delegated work
- **THEN** the next production action SHALL be `operate-work-unit claim`

### Requirement: Batch sub-agent protocol defines collect-as-return loop

**Reason**: Batch return is now out-of-order work-unit submit.

**Migration**: Use `claim --count N` plus `submit --work-id <id>` for each returned result.

#### Scenario: return does not depend on batch collect order

- **WHEN** batched sub-agents return out of order
- **THEN** each result SHALL submit by `work_id`

### Requirement: Staging SHALL write a per-slot beacon with runtime coordinates

**Reason**: Beacons are per-work-unit, not per-slot.

**Migration**: Claim writes `_work_units/waveN/{work_id}/_beacon.json` with `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

#### Scenario: beacon binds work unit

- **WHEN** a sub-agent reads its beacon
- **THEN** the beacon SHALL bind the work unit and queue demand

### Requirement: dispatch.json SHALL persist each slot's engine-generated receipt nonce

**Reason**: Dispatch registry is replaced by `_work_units/_index.json` and work-unit manifests.

**Migration**: Store Engine-generated `receipt_nonce` in index, manifest, beacon, task, receipt, result, and ledger.

#### Scenario: nonce is stored in work-unit surfaces

- **WHEN** a work unit is claimed
- **THEN** `receipt_nonce` SHALL be present in the index, manifest, and beacon

### Requirement: Spawn prompt SHALL hand the sub-agent only its slot directory plus a beacon pointer

**Reason**: Spawn prompt now hands the sub-agent its work-unit directory and beacon pointer.

**Migration**: Generate task/spawn prompt from the work-unit manifest and kind contract.

#### Scenario: prompt names work-unit directory

- **WHEN** a prompt is generated for `wu-w0-b000-src-i0001`
- **THEN** it SHALL reference `_work_units/wave0/wu-w0-b000-src-i0001/`

### Requirement: Staging and commit trace events SHALL carry the slot receipt nonce

**Reason**: Trace events are claim/submit/fail/timeout/abandon events carrying work-unit nonce.

**Migration**: Emit work-unit trace/log events with `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

#### Scenario: submit trace carries receipt nonce

- **WHEN** a work unit submits successfully
- **THEN** the trace event SHALL carry the work-unit receipt nonce
