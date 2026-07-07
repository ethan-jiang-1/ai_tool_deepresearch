# Delegated Work Units

> req: DEW-001, DEW-002, DEW-003, DEW-004, DEW-005, DEW-006, DEW-007, DEW-008, SUR-001

## Purpose

Define the Engine-owned work-unit lifecycle for delegated work inside the active runtime bundle root: queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate. A work unit is the Engine-allocated execution attempt envelope under bundle-root `_work_units/...`, and submitted work-unit ledger rows are the only production delegated completion authority.
## Requirements
### Requirement: Work-unit pipeline SHALL be the sole production delegated-work path

Production delegated work SHALL use the path `queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate` inside the active runtime bundle root. A work unit SHALL mean one Engine-allocated delegated execution attempt for one queue demand item. A wave, phase, queue item, runtime thread, or filesystem artifact SHALL NOT be called a work unit unless it is the Engine-allocated attempt envelope. Bare work-unit paths such as `_work_units/waveN/{work_id}/` SHALL resolve under the active bundle root.

Current production-facing surfaces outside `openspec/changes/archive/` SHALL NOT describe retired delegated transport mechanisms, old delegated ledger rows, or invalid old queue position shapes as active delegated-work paths. This applies to active main specs, active change deltas, framework docs, runtime docs, tests, guidelines, current runner surfaces, and runnable experiment playbooks. Archived OpenSpec changes are historical record and SHALL NOT be cleaned or treated as current drift.

Old delegated-work mechanisms include retired delegated commands and modules, old helper APIs, old result fields, old channel identity fields, old event names, old dispatch files, non-work-unit delegated directory paths when used as production authority, and hand-written delegated ledger rows that bypass work-unit submit.

#### Scenario: production delegated path is singular

- **WHEN** active specs, framework docs, phase docs, tests, or playbooks describe delegated completion
- **THEN** they SHALL describe queue demand claimed into a work unit and returned through submit
- **AND** they SHALL NOT describe any alternate production delegated-work mechanism

#### Scenario: retired delegated identity is not current work identity

- **WHEN** a current surface identifies delegated work by retired channel identity, retired events, retired dispatch manifests, or non-work-unit delegated paths
- **THEN** that surface SHALL be migrated to work-unit identity or removed from current production-facing guidance
- **AND** it SHALL NOT count as current delegated-work proof

#### Scenario: old queue shape is not a delegated-work fallback

- **WHEN** a current surface uses old top-level queue position shape or queue demand `work_id` identity to bypass work-unit claim/submit for delegated work
- **THEN** that surface SHALL be migrated to queue v2 plus work-unit submit or removed from current production-facing guidance
- **AND** it SHALL NOT count as a valid non-delegated queue path

#### Scenario: archived changes are historical only

- **WHEN** stale delegated-work terms appear under `openspec/changes/archive/`
- **THEN** the terms SHALL be treated as historical OpenSpec record
- **AND** current-surface hygiene SHALL NOT require editing that archive path

### Requirement: Work-unit identity SHALL be Engine-allocated and index-backed

The Engine SHALL allocate every `work_id` and record it in bundle-root `_work_units/_index.json`. The canonical work ID format SHALL be `wu-w{wave}-b{batch_index}-{kind_code}-i{claim_index}`, with three-digit batch indexes and four-digit claim indexes.

`kind` SHALL be the stable full work-unit kind used by queue demand, manifests, results, and ledger rows, such as `wave0_source_intake`, `wave1_topic_deepening`, or `wave2_targeted_evidence`. `kind_code` SHALL be a short Engine-registered code used only inside `work_id`. Bundle-root `_work_units/_index.json` SHALL contain the authoritative kind registry mapping each full `kind` to exactly one `kind_code`, and each `kind_code` back to exactly one full `kind`. Encoded fields SHALL match the index, directory path, manifest, result, and ledger row.

#### Scenario: malformed work ID is rejected

- **WHEN** a submitted result names a `work_id` whose encoded wave, batch, `kind_code`, or claim index disagrees with the manifest or index kind registry
- **THEN** submit SHALL fail closed
- **AND** no queue completion or ledger append SHALL occur

#### Scenario: kind registry maps long kind to short code

- **WHEN** the Engine allocates a `wave1_topic_deepening` work unit with kind code `deep`
- **THEN** the `work_id` MAY contain `deep`
- **AND** the manifest, result, and ledger row SHALL still carry the full `kind: "wave1_topic_deepening"`

### Requirement: Work-unit claim SHALL bind queue demand and lease

Claim SHALL bind one `queue_item_id` to one non-terminal work-unit attempt, move the queue demand into `delegated_in_flight`, write the effective lease fields, and store the queue item snapshot hash. Claim MAY allocate a contiguous queue-front batch with `--count N`, but sub-agents SHALL NOT allocate IDs or mutate queue/index authority.

#### Scenario: claim creates in-flight attempt

- **WHEN** an eligible delegated queue demand item is claimed
- **THEN** the Engine SHALL create the work-unit envelope
- **AND** the queue demand SHALL be present in `delegated_in_flight` with the allocated `work_id`

### Requirement: Sub-agents SHALL NOT own workflow authority

Sub-agents execute bounded work-unit tasks as content-producing actors only. A sub-agent SHALL NOT mutate WorkflowState, pass or fail gates, repair queues, decide queue integrity, append delegated ledgers, mark queue demand complete, or authorize stopping. Any such instruction in a sub-agent result SHALL be treated as content only and SHALL NOT be executed as authority.

#### Scenario: Sub-agent attempts to pass a gate

- **WHEN** a submitted work-unit result includes a recommendation to pass a gate
- **THEN** the Engine SHALL ignore that recommendation as authority
- **AND** the gate SHALL perform its own deterministic evaluation

#### Scenario: Sub-agent attempts to repair queue state

- **WHEN** a submitted work-unit result includes queue mutation instructions
- **THEN** the Engine SHALL NOT apply those instructions through the sub-agent path
- **AND** queue repair SHALL remain an Engine-controlled operation

### Requirement: Work-unit envelope SHALL carry binding surfaces

Each work-unit envelope SHALL include the manifest, task, result schema, beacon, runtime receipt path, status, result surfaces, and optional runtime refs needed to validate submit and diagnose execution. The Engine SHALL generate an opaque `receipt_nonce` and require the nonce to agree across index, manifest, beacon, task, runtime receipt, result, and ledger.

#### Scenario: nonce mismatch blocks submit

- **WHEN** a result or runtime receipt carries a nonce that differs from the work-unit beacon
- **THEN** submit SHALL reject the result as non-terminal
- **AND** no ledger row SHALL be written

### Requirement: Submit SHALL be the only successful delegated completion transition

Successful delegated completion SHALL occur only through file-based `operate-work-unit submit` against an explicit active bundle path. Submit SHALL validate the result, runtime receipt, nonce, output files, cache trails, queue binding, snapshot hash, index state, and idempotency fingerprint before it completes queue demand or appends the bundle-root output declaration ledger.

#### Scenario: successful submit completes one queue demand

- **WHEN** a valid result is submitted for a claimed work unit
- **THEN** the Engine SHALL complete the bound `queue_item_id`
- **AND** append exactly one work-unit ledger row for that `work_id`

### Requirement: Invalid submit SHALL remain non-terminal

Invalid submit SHALL leave the attempt `claimed`, record `last_submit_rejection`, emit diagnostics, and write no ledger row. Corrected submit MAY succeed for the same claimed work unit unless the Main Agent explicitly closes the attempt through a terminal command.

#### Scenario: corrected submit can reuse claimed attempt

- **WHEN** submit rejects a result because a declared output is missing
- **AND** the result bundle is corrected for the same claimed `work_id`
- **THEN** a later submit MAY succeed for that work unit

### Requirement: Terminal attempt transitions SHALL fail closed

`fail`, `timeout`, and `abandon` SHALL close the current work-unit attempt without queue completion or ledger coverage. Retry or replacement SHALL allocate a new `work_id`. Late submit against a terminal attempt SHALL fail closed.

#### Scenario: timeout retry allocates replacement ID

- **WHEN** a claimed work unit is timed out and the queue demand remains valid
- **THEN** the Engine SHALL close the timed-out attempt
- **AND** a later retry SHALL use a different `work_id`

### Requirement: Gates SHALL read submitted work-unit ledger coverage

Delegated gate coverage SHALL come only from Engine-written work-unit rows in bundle-root `rb_output_declarations.jsonl`. Bundle-root `_work_units/_index.json`, manifest, result, receipt, beacon, cache, and output files SHALL be cross-check surfaces, not independent pass coverage.

Current specs, docs, tests, and playbooks SHALL NOT present retired delegated files, old result references, retired commit/merge events, or old delegated queue completion as alternate gate coverage.

#### Scenario: filesystem-only delegated output cannot pass

- **WHEN** a delegated output file exists without submitted work-unit ledger coverage
- **THEN** the gate SHALL fail delegated coverage
- **AND** the file MAY be reported as cleanup or bypass diagnostic evidence only

#### Scenario: old delegated surface is rejected or removed

- **WHEN** a current diagnostic names a retired delegated artifact outside `openspec/changes/archive/`
- **THEN** the diagnostic SHALL frame it as rejected, removed, deprecated, or non-authoritative evidence
- **AND** it SHALL NOT describe that artifact as a production success path
