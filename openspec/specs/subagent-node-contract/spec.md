# Subagent Node Contract

> req: SNC-001, SNC-002, SNC-003

## Purpose

Sub-agent lifecycle logging 的强制契约与 relay driver 供需接线：sub-agent role spec（always-loaded）与 `taskMarkdownForSlot` 生成的 `task.md` SHALL mandate 读 `_beacon.json` + 经 `log-event.mjs` 发射 lifecycle 事件 + 事件带 nonce；phase workflow node SHALL 指示 Phase Agent 经 `drive-relay-slot` 驱动 relay。
## Requirements
### Requirement: Sub-agent role specs SHALL mandate lifecycle logging

Sub-agent role specs SHALL mandate lifecycle logging through work-unit receipt/logging instructions. Lifecycle events SHALL be associated with the work-unit receipt nonce rather than a non-work-unit beacon nonce.

#### Scenario: lifecycle event binds work unit

- **WHEN** a sub-agent logs `work_done`
- **THEN** the event SHALL carry the work-unit `receipt_nonce`
- **AND** the event SHALL be checkable against the work-unit manifest and beacon

### Requirement: Sub-agent task contract SHALL bind work-unit identity

Generated sub-agent task Markdown and spawn prompts SHALL bind `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, work-unit directory, result schema, output contract, lease deadline, and receipt/logging instructions.

#### Scenario: task contains nonce and deadline

- **WHEN** `operate-work-unit claim` generates `task.md`
- **THEN** the task SHALL include the work-unit receipt nonce and deadline
- **AND** the sub-agent SHALL be instructed to preserve those fields in receipts and result

### Requirement: Sub-agent result contract SHALL bind receipt nonce

Sub-agent result files and runtime receipt events SHALL include `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`. Submit SHALL reject mismatches across result, receipt, beacon, manifest, index, and ledger row.

#### Scenario: nonce mismatch rejects submit

- **WHEN** a result uses a different `receipt_nonce` than the beacon
- **THEN** submit SHALL reject the result as non-terminal

### Requirement: Work-unit task Markdown SHALL include lifecycle logging directive

Generated work-unit task Markdown SHALL include lifecycle logging directives, result schema location, beacon pointer, and submit expectations for the assigned work-unit directory.

#### Scenario: generated task names work-unit surfaces

- **WHEN** a task is generated for a claimed work unit
- **THEN** the task SHALL identify the work-unit directory, beacon, result schema, and lifecycle logging expectations

