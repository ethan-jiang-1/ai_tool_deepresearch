## ADDED Requirements

> req: DEW-011

### Requirement: Successful work-unit submit SHALL verify durable queue postconditions

After `operate-work-unit submit` accepts a delegated result and before it reports success, the Engine SHALL reload or otherwise verify durable queue state from `rb_queue.json`. A successful submit SHALL prove that the bound `queue_item_id` is absent from `delegated_in_flight` and represented in `terminal_history` with the submitted `work_id`.

If the ledger/index/result transition succeeded but the durable queue postcondition cannot be proven, submit SHALL fail closed with structured diagnostics naming the missing queue postcondition. Where practical, submit SHALL restore the prior durable state; if rollback cannot be proven, diagnostics SHALL mark the work-unit/queue completion state as suspect. It SHALL NOT leave the Agent with a successful submit response and stale in-flight queue state.

#### Scenario: Submit proves in-flight binding was cleared

- **WHEN** `operate-work-unit submit` succeeds for work unit `wu-w0-b000-src-i0001`
- **THEN** reloaded `rb_queue.json.delegated_in_flight` SHALL NOT contain the submitted `queue_item_id`
- **AND** `rb_queue.json.terminal_history` SHALL contain a terminal record binding that `queue_item_id` to `wu-w0-b000-src-i0001`

#### Scenario: Submit fails if queue postcondition is missing

- **WHEN** submit cannot verify that the queue item left `delegated_in_flight`
- **THEN** the submit command SHALL return a structured failure
- **AND** diagnostics SHALL instruct the Agent to repair through Engine queue/work-unit tooling rather than editing `rb_queue.json` by hand

#### Scenario: Submit rollback failure is diagnosed

- **WHEN** submit detects a missing queue postcondition after partially writing work-unit or ledger state
- **AND** the prior durable state cannot be fully restored
- **THEN** submit SHALL return a structured failure that marks work-unit/queue state as suspect
- **AND** it SHALL NOT print a successful submit result
