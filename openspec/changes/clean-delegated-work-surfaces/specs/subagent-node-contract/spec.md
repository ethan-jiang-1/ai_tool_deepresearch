> req: SNC-001, SNC-002, SNC-003

## MODIFIED Requirements

### Requirement: Sub-agent role specs SHALL mandate lifecycle logging

Sub-agent role specs SHALL mandate lifecycle logging through work-unit receipt/logging instructions. Lifecycle events SHALL be associated with the work-unit receipt nonce rather than a non-work-unit beacon nonce.

Current node, role, and prompt guidance SHALL NOT tell the Phase Agent to drive delegated work through retired relay drivers or slot task generators. It SHALL bind lifecycle logging to work-unit task, beacon, receipt, and submit surfaces.

#### Scenario: lifecycle event binds work unit

- **WHEN** a sub-agent logs `work_done`
- **THEN** the event SHALL carry the work-unit `receipt_nonce`
- **AND** the event SHALL be checkable against the work-unit manifest and beacon

#### Scenario: role guidance uses work-unit logging path

- **WHEN** generated sub-agent guidance describes lifecycle logging
- **THEN** it SHALL identify the assigned work unit and work-unit beacon
- **AND** it SHALL NOT require a retired relay driver as the production logging path

### Requirement: Sub-agent task contract SHALL bind work-unit identity

Generated sub-agent task Markdown and spawn prompts SHALL bind `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, work-unit directory, result schema, output contract, lease deadline, and receipt/logging instructions.

The task contract SHALL refer to generated work-unit task Markdown, not old slot task generation.

#### Scenario: task contains nonce and deadline

- **WHEN** `operate-work-unit claim` generates `task.md`
- **THEN** the task SHALL include the work-unit receipt nonce and deadline
- **AND** the sub-agent SHALL be instructed to preserve those fields in receipts and result

#### Scenario: task contract excludes slot task wording

- **WHEN** current specs or playbooks describe a generated delegated task
- **THEN** they SHALL describe a work-unit task bound to `work_id`
- **AND** they SHALL NOT describe a relay slot task as production authority

### Requirement: Sub-agent result contract SHALL bind receipt nonce

Sub-agent result files and runtime receipt events SHALL include `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`. Submit SHALL reject mismatches across result, receipt, beacon, manifest, index, and ledger row.

The result contract SHALL be validated by `operate-work-unit submit`. A result that only matches an old slot result shape SHALL NOT be accepted as delegated completion.

#### Scenario: nonce mismatch rejects submit

- **WHEN** a result uses a different `receipt_nonce` than the beacon
- **THEN** submit SHALL reject the result as non-terminal

#### Scenario: old result shape is not delegated completion

- **WHEN** a delegated result is not bound to a submitted work unit
- **THEN** it SHALL NOT complete queue demand
- **AND** it SHALL NOT append delegated ledger coverage

### Requirement: Work-unit task Markdown SHALL include lifecycle logging directive

Generated work-unit task Markdown SHALL include lifecycle logging directives, result schema location, beacon pointer, and submit expectations for the assigned work-unit directory.

The directive SHALL route completion back through work-unit submit and SHALL NOT instruct the sub-agent or Phase Agent to use retired relay/slot completion commands.

#### Scenario: generated task names work-unit surfaces

- **WHEN** a task is generated for a claimed work unit
- **THEN** the task SHALL identify the work-unit directory, beacon, result schema, and lifecycle logging expectations

#### Scenario: generated task names submit return contract

- **WHEN** a generated task describes how work returns to the main run
- **THEN** it SHALL identify the submit contract for the assigned work unit
- **AND** it SHALL NOT name a retired relay commit or merge path as production completion
