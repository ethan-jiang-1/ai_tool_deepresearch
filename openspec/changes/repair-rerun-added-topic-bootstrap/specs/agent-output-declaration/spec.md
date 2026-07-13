> req: AGO-003, AGO-005

## MODIFIED Requirements

### Requirement: Ledger declarations SHALL preserve enough creation context for accepted outputs

Work-unit ledger declarations SHALL preserve creation context through `work_id`, `queue_item_id`, `wave`, `kind`, `producer_rule`, `creation_reason`, `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `result_hash`, `ledger_record_hash`, output/source/cache declarations and actor execution binding.

At successful normal or late submit, the Engine SHALL also persist the exact schema-valid, hash-valid ledger row as an immutable work-unit-local recovery witness at `_work_units/waveN/<work_id>/submitted-declaration.json`. The witness SHALL be written and verified before the bundle ledger append is reported durable and SHALL carry the exact row bytes/semantics needed for restoration. It SHALL NOT be consumed by gates as coverage authority, listed as a second ledger, or accepted without matching submitted index/status/result/receipt/beacon/output/cache facts.

Audited late-accepted rows SHALL continue to preserve their existing hash-covered late-accept fields. A legacy declaration reconstruction, used only when a pre-witness submitted attempt lost its bundle ledger row, SHALL carry one hash-covered `declaration_recovery` audit object with recovery mode, reason, timestamp, previous ledger hash and original submit trace witness. That audit SHALL not claim new actor execution or new research.

#### Scenario: Creation context binds queue and work unit

- **WHEN** a gate reads a delegated output ledger row
- **THEN** it SHALL be able to identify the queue demand, work-unit attempt, result, runtime receipt, outputs, source/cache declarations and creation reason

#### Scenario: Submit preserves exact recovery witness

- **WHEN** normal or late submit accepts a work unit
- **THEN** the work-unit directory SHALL contain one Engine-owned exact submitted-declaration witness matching the appended ledger row and index hash
- **AND** gate coverage SHALL still come only from `rb_output_declarations.jsonl`

#### Scenario: Recovery witness cannot become parallel authority

- **WHEN** a submitted-declaration witness exists but the bundle ledger row is absent
- **THEN** gates SHALL continue to fail delegated coverage until Engine recovery restores the bundle ledger row
- **AND** no reader SHALL count the witness directly as coverage

#### Scenario: Half-audit rows are invalid

- **WHEN** a ledger row carries incomplete late-accept or declaration-recovery audit fields
- **THEN** ledger schema validation SHALL reject it


### Requirement: Work-unit submit SHALL write bundle-level output declaration ledger

For delegated work, Engine-owned work-unit completion SHALL write the single bundle-level `rb_output_declarations.jsonl` ledger. Normal `operate-work-unit submit` remains the standard path for claimed attempts and audited `late-submit` remains the narrow completion exception for eligible timed-out attempts.

The existing work-unit CLI SHALL expose one explicit `recover-declaration` operation for an already-submitted `work_id` whose bundle ledger row is missing. Recovery SHALL NOT complete queue demand, rerun research, accept a new result, create a new work unit, or count as a new successful delegated execution. It SHALL only restore one missing Engine-written declaration through the existing work-unit owner.

Recovery SHALL first require a valid remaining ledger file or an absent/empty ledger surface with no malformed/conflicting rows. It SHALL then verify submitted index and status binding, canonical assigned result hash, manifest, beacon, runtime receipt, outputs, cache/source claims, queue terminal history and replacement conflicts. Every failed recovery prerequisite SHALL return a structured primary root with `missing_fact`, `write_to`, and `rerun`; dependent recovery checks SHALL short-circuit rather than produce a cascade.

- If an exact submitted-declaration witness exists and matches all direct facts, recovery SHALL append that exact row without changing the work-unit result or original ledger hash.
- For a pre-witness legacy attempt, recovery MAY reconstruct one audited row only when a unique original submitted state is proven by the complete binding set plus matching original `work_unit_ledger_appended`/`work_unit_submitted` trace evidence. It SHALL write the new recovery witness, append the audited row, and atomically update only the index/status ledger hash needed to bind that recovered row.
- Missing, ambiguous, conflicting or drifted evidence SHALL block. The response SHALL identify the failed prerequisite and one nearest action; it SHALL never advise hand-writing hashes or ledger JSONL.

Recovery SHALL be idempotent. An identical restored row SHALL return unchanged/success without duplicate append. A different existing row for the same `work_id`, another submitted replacement for the same queue demand, or an invalid ledger prefix SHALL fail closed.

#### Scenario: Successful submit writes ledger and witness

- **WHEN** a delegated work unit submits successfully
- **THEN** the Engine SHALL append exactly one bundle ledger row and persist its exact work-unit-local recovery witness
- **AND** success SHALL be reported only after both bind durably to index/status and queue postconditions

#### Scenario: Exact missing row is restored without new execution

- **WHEN** a submitted work unit retains a matching recovery witness and all bound surfaces but its bundle ledger row is missing
- **THEN** `recover-declaration` SHALL append the exact row and emit an audited recovery event
- **AND** it SHALL not alter queue completion, actor provenance, result/output/cache content or research artifacts

#### Scenario: Legacy missing row can be auditedly reconstructed

- **WHEN** a pre-witness submitted work unit has no ledger row but index/status/result/receipt/beacon/output/cache, terminal queue history and original submit trace all prove one consistent submission
- **THEN** `recover-declaration` MAY create one recovery-audited row and exact witness
- **AND** it SHALL preserve the previous ledger hash in recovery audit while atomically rebinding index/status to the recovered row hash

#### Scenario: Missing proof blocks legacy reconstruction

- **WHEN** any required submitted binding or original trace witness is missing, ambiguous or drifted
- **THEN** recovery SHALL block without ledger/index/status mutation
- **AND** the nearest action SHALL be restoration from an external exact backup or a new legal work-unit attempt, not manual declaration construction
- **AND** the response SHALL name the earliest unavailable proof in `missing_fact`, the legal recovery/attempt boundary in `write_to`, and the exact checkpoint in `rerun`

#### Scenario: Repeated recovery is idempotent

- **WHEN** the exact recovered row is already present
- **THEN** recovery SHALL return unchanged/success without appending a second row

#### Scenario: Conflicting row or malformed ledger fails closed

- **WHEN** the ledger contains a different row for the work ID, a submitted replacement conflict, or an invalid/truncated prefix
- **THEN** recovery SHALL not append or rewrite rows
- **AND** diagnostics SHALL expose that direct integrity root
