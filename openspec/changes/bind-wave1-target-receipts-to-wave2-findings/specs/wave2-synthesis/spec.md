## ADDED Requirements

> req: WTS-011

### Requirement: Finding index SHALL bind carried targets separately from artifact lineage

`finding-index.yaml` MAY give a finding `wave1_target_bindings[]` only when the finding is offered as coverage for a receipt-declared Wave1 target. Each binding SHALL name the selected receipt digest plus canonical topic UID, intent binding, local target ID, and target revision. It SHALL be distinct from `origin_refs[]`, `trigger_refs[]`, affected-topic presentation, and work-unit receipts.

A target MAY have several bindings and a finding MAY bind several targets. Coverage requires at least one exact binding on a finding whose existing decision/gap-status contract is valid. Unrelated/emergent/legacy findings remain valid without this field but SHALL not satisfy a carried target merely through shared topic or lineage.

#### Scenario: one finding covers multiple declared targets
- **WHEN** one Wave2 finding legitimately disposes of two targets from the selected receipt
- **THEN** it MAY carry two exact target bindings
- **AND** each target is independently visible to the Wave2 closure evaluator

#### Scenario: stale binding does not cover revised target
- **WHEN** a target has the same local ID but a different receipt digest, intent binding, or target revision
- **THEN** the old finding binding SHALL not satisfy the selected receipt target
- **AND** the existing finding index receives the repair
