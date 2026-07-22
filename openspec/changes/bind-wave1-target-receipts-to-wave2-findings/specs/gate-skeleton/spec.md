## ADDED Requirements

> req: GSK-012

### Requirement: Shared Wave1 gate attempt writer SHALL own receipt projection failure

`writeGateAttempt(bundlePath, result, { carriedTargetReceipt })` SHALL remain the sole audit/trace writer for formal Gate wrappers. For a successful routed Wave1 result only, it MAY accept that dedicated validated options input defined by RWG-020/TRW-006 and SHALL reject it for every other Gate or for an arbitrary `extraCheck` field. The Wave1 CLI SHALL not append the receipt directly.

When strict persistence of that Wave1 attempt fails, the existing Wave1 wrapper SHALL emit exactly one failed Gate envelope and SHALL not subsequently emit its original passed result. Existing shared failed-attempt diagnostics MAY remain, but they SHALL not create a second passed handoff or receipt authority.

#### Scenario: generic gate metadata is not projected
- **WHEN** a Gate result contains unrelated `extraCheck` data or a non-Wave1 receipt-like value
- **THEN** the shared writer SHALL not project it as a carried-target receipt
- **AND** trace ownership remains with the existing shared helper

#### Scenario: strict Wave1 writer failure suppresses the pass
- **WHEN** a receipt-bearing Wave1 handoff cannot persist its required trace entry
- **THEN** the wrapper emits one failed result for that invocation
- **AND** it SHALL not later emit the original passed result or a consumable `check.next`
