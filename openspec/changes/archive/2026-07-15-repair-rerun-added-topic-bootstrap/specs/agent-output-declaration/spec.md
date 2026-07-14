> req: AGO-003, AGO-005

## MODIFIED Requirements

### Requirement: Ledger declarations SHALL preserve enough creation context for accepted outputs

Work-unit ledger declarations SHALL preserve creation context through `work_id`, `queue_item_id`, `wave`, `kind`, `producer_rule`, `creation_reason`, `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `result_hash`, `ledger_record_hash`, output/source/cache declarations and actor execution binding.

Normal submit SHALL create one Engine submission timestamp inside the existing commit transaction, use it to build the final ledger row and `ledger_record_hash`, and then use that same value for ledger `declared_at`, index `terminal_at`, status `updated_at`, and queue `completed_at`. Candidate validation or dry-submit before the transaction SHALL produce only a side-effect-free validation plan and SHALL NOT build, freeze, carry into commit, or advertise a final ledger row/timestamp/hash. It SHALL use read-only queue/cache/result/receipt evaluation and SHALL NOT write queue-load trace/log, canonical cache pages, normalized result/receipt content, transaction artifacts or authority files. The final accepted rejection boundary MAY continue to record its existing diagnostic trace/log. After acquiring the existing transaction lock, submit SHALL reload/revalidate mutable index, queue, replacement and terminal facts, apply accepted canonicalization writes, and only then generate the timestamp and row. Therefore a normal submitted row SHALL be deterministically reconstructable from existing direct owners without new recovery state.

Audited late-submit SHALL persist only its irreducible late-accept context on the existing work-unit index record before the bundle ledger append is reported durable: non-empty accepted reason, prior terminal status `timed_out`, and superseded retry work IDs. It SHALL use the same single submission timestamp rule. This bounded context SHALL NOT copy `output_files`, `source_claims`, cache trails, actor execution, result refs, receipt refs, the complete ledger row, or separately copy facts already owned by terminal queue/index records.

The late-accept context SHALL NOT be consumed by gates as coverage authority. It exists only so the existing work-unit owner can deterministically rebuild the same late-submit ledger-row base from current hash-valid index/result/manifest/beacon/receipt/output/cache/queue facts, recompute `ledger_record_hash`, and require equality with the submitted index/status hash before restoration. It SHALL NOT be listed as a second ledger or accepted without matching submitted binding facts.

Audited late-accepted rows SHALL continue to preserve their existing hash-covered late-accept fields. Declaration recovery audit SHALL be recorded in the existing transaction/trace/log surfaces outside the restored row; the restored row SHALL remain byte-semantically/hash identical to the originally submitted declaration and SHALL NOT gain a second recovery-row schema.

#### Scenario: Creation context binds queue and work unit

- **WHEN** a gate reads a delegated output ledger row
- **THEN** it SHALL be able to identify the queue demand, work-unit attempt, result, runtime receipt, outputs, source/cache declarations and creation reason

#### Scenario: Normal submit is reconstructable without new state

- **WHEN** normal submit accepts a work unit
- **THEN** Engine SHALL build the final row/hash from the transaction-owned timestamp before committing ledger, index, status and queue terminal surfaces
- **AND** those four surfaces SHALL use the same submission timestamp
- **AND** reconstructing from existing direct owners SHALL reproduce the appended row and index/status hash exactly
- **AND** gate coverage SHALL still come only from `rb_output_declarations.jsonl`

#### Scenario: Pre-transaction validation cannot precompute declaration authority

- **WHEN** dry-submit or normal submit prepare validates a candidate before the commit transaction
- **THEN** its plan SHALL contain no final `declared_at` or `ledger_record_hash`
- **AND** recursive bundle/trace/log snapshots SHALL show no prepare-time mutation before the final rejection or locked commit boundary
- **AND** the locked commit SHALL revalidate mutable facts, apply accepted canonicalization writes, and create the only final timestamp/hash used by all terminal surfaces

#### Scenario: Late-submit preserves only irreducible context

- **WHEN** late-submit accepts a timed-out work unit
- **THEN** the index SHALL preserve only its reason, prior terminal status, and superseded retry IDs in addition to the shared submission timestamp
- **AND** direct result/output/cache/receipt/actor facts SHALL NOT be copied into a recovery witness or shadow row

#### Scenario: Reconstruction facts cannot become parallel authority

- **WHEN** reconstructable submitted facts exist but the bundle ledger row is absent
- **THEN** gates SHALL continue to fail delegated coverage until Engine recovery restores the bundle ledger row
- **AND** no reader SHALL count index/result/queue reconstruction facts directly as coverage

#### Scenario: Half late-accept rows are invalid

- **WHEN** a ledger row carries incomplete late-accept audit fields
- **THEN** ledger schema validation SHALL reject it


### Requirement: Work-unit submit SHALL write bundle-level output declaration ledger

For delegated work, Engine-owned work-unit completion SHALL write the single bundle-level `rb_output_declarations.jsonl` ledger. Normal `operate-work-unit submit` remains the standard path for claimed attempts and audited `late-submit` remains the narrow completion exception for eligible timed-out attempts.

The existing work-unit CLI SHALL expose one explicit `node DPT_FRAMEWORK/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <id>` operation for an already-submitted `work_id` whose bundle ledger row is missing. Recovery SHALL NOT complete queue demand, rerun research, accept a new result, create a new work unit, or count as a new successful delegated execution. It SHALL only restore one missing Engine-written declaration through the existing work-unit owner. Structured recovery diagnostics and Gate hints SHALL use this exact existing-owner command shape with the resolved absolute bundle and work ID; they SHALL NOT invent a separate recovery CLI or require a result path.

Recovery SHALL first require a valid remaining ledger file or an absent/empty ledger surface with no malformed/conflicting rows. It SHALL then verify submitted index and status binding, canonical assigned result hash, manifest, beacon, runtime receipt, outputs, cache/source claims, queue terminal history, reconstructable timestamp/late-accept context and replacement conflicts. Every failed recovery prerequisite SHALL return a structured primary root with `repair_kind`, `missing_fact`, `write_to`, and `rerun`; dependent recovery checks SHALL short-circuit rather than produce a cascade.

- For a current normal or late submission with all required reconstructable facts, recovery SHALL rebuild the row, require its recomputed hash to equal both submitted index and status hashes, and append it without changing the work-unit result or original hashes.
- For a legacy pre-unified-timestamp/pre-context attempt, recovery MAY restore a row only when remaining direct surfaces plus original submit trace/transaction evidence reproduce one row whose hash already equals the submitted index/status hash. If an actually submitted attempt cannot be reconstructed exactly, recovery SHALL block with `repair.kind: missing_contract`; it SHALL NOT offer external backup copying, manual row construction, a replacement attempt, an invented timestamp/audit field, index/status hash rebinding, or a second recovery-row schema as though an accepted operation existed.
- Missing, ambiguous, conflicting or drifted evidence SHALL block. The response SHALL identify the failed prerequisite and one nearest action; it SHALL never advise hand-writing hashes or ledger JSONL.

Recovery SHALL be idempotent. An identical restored row SHALL return unchanged/success without duplicate append. A different existing row for the same `work_id`, another submitted replacement for the same queue demand, or an invalid ledger prefix SHALL fail closed.

#### Scenario: Successful submit writes reconstructable ledger facts

- **WHEN** a delegated work unit submits successfully
- **THEN** the Engine SHALL append exactly one bundle ledger row and durably persist all irreducible reconstruction facts on existing owner surfaces
- **AND** success SHALL be reported only after both bind durably to index/status and queue postconditions

#### Scenario: Exact missing row is restored without new execution

- **WHEN** a submitted work unit retains all reconstructable direct facts but its bundle ledger row is missing
- **THEN** `recover-declaration` SHALL deterministically rebuild and append the original hash-identical row and emit an audited recovery event outside the restored row
- **AND** it SHALL not alter queue completion, actor provenance, result/output/cache content or research artifacts

#### Scenario: Legacy recovery requires original-hash reconstruction

- **WHEN** a legacy submitted work unit has no ledger row but remaining authority and original submit/transaction evidence reproduce one row matching the recorded hash
- **THEN** `recover-declaration` MAY append that original row and record recovery audit in trace/log/transaction evidence
- **AND** it SHALL preserve existing index/status hashes unchanged

#### Scenario: Missing proof blocks legacy reconstruction

- **WHEN** any required submitted binding or original trace/transaction evidence is missing, ambiguous or drifted
- **THEN** recovery SHALL block without ledger/index/status mutation
- **AND** the response SHALL expose one `missing_contract` boundary and SHALL NOT present external backup copying, manual declaration construction, or a new work-unit attempt as an accepted repair
- **AND** the response SHALL name `repair_kind`, the earliest unavailable proof in `missing_fact`, the legal recovery/attempt boundary in `write_to`, and the exact checkpoint in `rerun`

#### Scenario: Repeated recovery is idempotent

- **WHEN** the exact recovered row is already present
- **THEN** recovery SHALL return unchanged/success without appending a second row

#### Scenario: Conflicting row or malformed ledger fails closed

- **WHEN** the ledger contains a different row for the work ID, a submitted replacement conflict, or an invalid/truncated prefix
- **THEN** recovery SHALL not append or rewrite rows
- **AND** diagnostics SHALL expose that direct integrity root
