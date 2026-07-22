## ADDED Requirements

> req: TRW-006

### Requirement: Routed Wave1 gate attempt SHALL carry its normalized target receipt

The shared Gate trace writer SHALL explicitly validate and project one `carried_target_receipt` only for a successful routed Wave1 Gate attempt. Its exact shape is `{ contract_version: "wave1-carried-targets/v1", receipt_sha256, targets[] }`; every target is `{ topic_uid, intent_sha256, target_id, target_revision }`, targets are strictly ordered by unique `(topic_uid,target_id)` pairs, and the receipt digest SHALL match canonical JSON `{contract_version,targets}` excluding `receipt_sha256` itself. It SHALL not copy question-list/depth-review bytes, become generic `extraCheck` serialization, or be written by the Wave1 CLI directly.

If receipt projection cannot be durably appended with the successful Wave1 attempt, that pass SHALL not be reported as a consumable routed handoff. The repair is the same Wave1 Gate/trace persistence boundary; no direct second trace writer or second passed-receipt authority is created. Existing shared failed-attempt diagnostics remain diagnostic rather than a replacement handoff.

#### Scenario: successful Wave1 handoff records a receipt
- **WHEN** a current Wave1 Gate passes with a valid carried-target declaration
- **THEN** its routed `gate_attempt` contains a complete contract-versioned receipt, including an empty selected set when applicable
- **AND** the subsequent Wave2 entry can select that exact trace event through existing handoff/load binding

#### Scenario: versioned trace diagnostic is not a receipt
- **WHEN** a diagnostic or Gate result exposes selected targets and the routed trace event presents the contract version but lacks the validated receipt
- **THEN** Wave2 SHALL reject the current handoff as missing contract
- **AND** it SHALL not treat diagnostic content as a replacement authority

#### Scenario: receipt persistence failure emits one failed envelope
- **WHEN** a successful Wave1 candidate cannot durably append its receipt-bearing gate attempt
- **THEN** the CLI emits one failed Gate envelope with `check.passed: false` and no consumable `check.next`
- **AND** it SHALL not subsequently emit the original passed result from the same invocation
