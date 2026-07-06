> req: LOG-006, LOG-007

## MODIFIED Requirements

### Requirement: Engine hot-path SHALL emit accident-grade diagnostics (LOG-006)

Engine hot paths SHALL emit accident-grade diagnostics for work-unit claim, submit, submit rejection, ledger append, fail, timeout, abandon, retry claim, late submit rejection, inspect failure, transaction mismatch, and gate provenance mismatch.

#### Scenario: invalid submit is logged with rejection detail

- **WHEN** work-unit submit rejects a result as invalid
- **THEN** run log SHALL include `work_id`, `queue_item_id`, reason code, and the inspected result/receipt hash when available

### Requirement: Sub-agent spawn prompt SHALL include diagnostic logging CLI instructions (LOG-007)

Sub-agent spawn prompts SHALL include diagnostic logging instructions bound to work-unit identity and receipt nonce. The instructions SHALL avoid slot-based command examples as production guidance.

#### Scenario: spawn prompt includes work-unit log example

- **WHEN** a work-unit prompt is generated
- **THEN** it SHALL include copyable logging instructions that carry `work_id` and `receipt_nonce`
- **AND** it SHALL not instruct the sub-agent to log against a non-work-unit delegated channel

## ADDED Requirements

### Requirement: Timeout recovery SHALL record operator-visible diagnostics

Timeout recovery SHALL write run log and trace diagnostics that explain the closed attempt, deadline, timeout reason, runtime refs when available, and replacement/requeue action.

#### Scenario: timeout log names replacement path

- **WHEN** `operate-work-unit timeout` closes an attempt and requeues the demand
- **THEN** the log SHALL identify the timed-out `work_id`
- **AND** it SHALL identify whether the same `queue_item_id` was requeued or a replacement was created
