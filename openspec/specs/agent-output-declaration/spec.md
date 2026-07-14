# agent-output-declaration Specification

> req: AGO-001, AGO-002, AGO-003, AGO-004, AGO-005, AGO-006, AGO-007

> delta-synced: add-audited-late-accept-for-timed-out-work-units (AGO-003, AGO-005)

## Purpose

Define the Agent output declaration contract for Engine-submitted work-unit ledger rows. The bundle-level output ledger and downstream gates share one authoritative record of Agent-produced files and cache trails through `operate-work-unit submit`.
## Requirements
### Requirement: Engine SHALL consume declaration ledger, not scan directories to discover Agent outputs

The Engine and gates SHALL consume submitted work-unit rows in `rb_output_declarations.jsonl` as the production evidence of delegated outputs. Filesystem scanning MAY produce diagnostics for orphaned or bypass artifacts, but SHALL NOT create gate pass coverage without a matching Engine-written ledger row.

Current output declaration guidance SHALL describe work-unit submit rows as delegated output authority. It SHALL NOT describe retired delegated results, old result references, or queue completion as delegated ledger authority.

#### Scenario: orphan output is diagnostic only

- **WHEN** an output file exists under a phase-owned directory without a matching submitted work-unit ledger row
- **THEN** gate provenance SHALL treat it as bypass-suspected diagnostic evidence
- **AND** the file SHALL NOT satisfy delegated output coverage

#### Scenario: old result reference is not output authority

- **WHEN** a delegated output declaration lacks submitted work-unit provenance
- **THEN** the Engine SHALL NOT count it as delegated output authority
- **AND** any retired result reference SHALL be removed from current proof surfaces or treated as rejected diagnostic evidence only

### Requirement: Production and experiments SHALL converge at schema-validated declaration

Production SHALL obtain declarations from real work-unit submit results. Engine-layer experiments MAY use fixture work-unit results, but those fixtures SHALL pass the same work-unit result schema and enter the same submit / ledger / gate path as production after the declaration point.

Current experiment fixtures SHALL NOT hand-write old delegated ledger rows as current gate proof. Fixture-backed delegated evidence SHALL converge through work-unit result schema validation, submit, ledger append, and gate checks. Old fixture rows that cannot be migrated to this path and no longer diagnose current behavior SHALL be removed from current playbooks/tests.

#### Scenario: Experiment fixture uses same downstream pipeline

- **WHEN** an Engine-layer playbook provides a fixture work-unit result containing `output_files[]` and `cache_trails[]`
- **AND** that fixture passes work-unit result schema validation
- **THEN** submit and gate SHALL process it through the same code path as a production sub-agent result

#### Scenario: Production sub-agent uses same downstream pipeline

- **WHEN** a real sub-agent submits a work-unit result with declarations
- **THEN** `operate-work-unit submit` SHALL validate and ledger it using the same code path used by fixture-backed Engine tests

#### Scenario: old ledger fixture is not current proof

- **WHEN** an experiment uses a hand-written delegated ledger row that does not come from work-unit submit
- **THEN** the experiment SHALL be migrated to work-unit submit or removed from current experiment surfaces
- **AND** its verdict SHALL NOT count as current delegated production proof while it remains unmigrated

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

#### Scenario: creation context binds queue and work unit

- **WHEN** a gate reads a delegated output ledger row
- **THEN** it SHALL be able to identify the queue demand, work-unit attempt, result file, runtime receipt, and creation reason from the row

#### Scenario: half-audit rows are invalid

- **WHEN** a submitted row omits `late_accept` or has `late_accept: false`
- **BUT** it carries late-accept companion fields
- **THEN** ledger schema validation SHALL reject the row

### Requirement: Work-unit result declares output files and cache trails

A submitted work-unit result SHALL declare output files and cache trails through the kind-specific result schema. The Engine SHALL verify those declarations during `operate-work-unit submit` before writing the bundle-level output declaration ledger row.

#### Scenario: submit verifies declared outputs

- **WHEN** a result declares an output file that does not exist
- **THEN** `operate-work-unit submit` SHALL reject the result as non-terminal
- **AND** no `rb_output_declarations.jsonl` row SHALL be appended

### Requirement: Work-unit ledger rows include submit fingerprints

Each Engine-written output declaration ledger row for delegated work SHALL include `result_hash` and `ledger_record_hash`. Same-content duplicate submit SHALL return success without a duplicate ledger append; different-content duplicate submit SHALL fail closed.

#### Scenario: duplicate submit is idempotent only for same content

- **WHEN** the same submitted `work_id` is submitted again with the same result hash and ledger record hash
- **THEN** submit SHALL return success without appending a duplicate row
- **AND** a duplicate submit with different content SHALL fail closed

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

#### Scenario: successful submit appends one ledger row

- **WHEN** a delegated work unit submits successfully
- **THEN** the Engine SHALL append exactly one `rb_output_declarations.jsonl` row for that `work_id`
- **AND** the row SHALL include `work_id`, `queue_item_id`, `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `output_files`, and `cache_trails`

#### Scenario: audited late-submit writes one ledger row

- **WHEN** an eligible timed-out targeted work unit is accepted through `late-submit`
- **THEN** the Engine SHALL append one submitted ledger row for the targeted `work_id`
- **AND** the row SHALL include hash-covered late-accept audit fields

#### Scenario: ledger fields are work-unit fields

- **WHEN** current specs or playbooks show a delegated output declaration row
- **THEN** the row SHALL use work-unit provenance fields
- **AND** it SHALL NOT use retired relay/slot fields as current schema examples

### Requirement: Wave1 submitted ledger SHALL canonicalize required output roles

For `wave1_topic_deepening` submitted work units, the submitted ledger row SHALL use canonical roles for required Wave1 output paths before gate consumption:

- `artifacts/wave1/{topic}/evidence-summary.md` SHALL be represented as role `evidence_summary`.
- `artifacts/wave1/{topic}/question-list.md` SHALL be represented as role `question_list`.

If the submitted result declares either required path as role `other`, `operate-work-unit submit` SHALL deterministically normalize that ledger declaration before appending `rb_output_declarations.jsonl`. The submit transaction SHALL emit a visible normalization diagnostic in structured output, trace/log, or an equivalent Engine diagnostic surface. The diagnostic SHALL name the output path, submitted role, normalized canonical role, and reason. The normalization SHALL be narrow: it applies only to these required Wave1 paths for the assigned Wave1 topic. `other` SHALL remain valid for genuinely extra non-blocking outputs.

This requirement SHALL NOT create a general submitted-ledger amendment mechanism for historical bad rows. Already-submitted rows with wrong roles remain outside this change's migration scope unless repaired by a future accepted amend path or replacement/supplementary work-unit submit.

#### Scenario: evidence summary role is normalized before ledger append

- **WHEN** a `wave1_topic_deepening` result declares `artifacts/wave1/01_topic/evidence-summary.md` with role `other`
- **THEN** successful submit SHALL append a ledger row whose declaration for that path uses role `evidence_summary`
- **AND** submit diagnostics SHALL report the path, original role `other`, and normalized role `evidence_summary`

#### Scenario: question list role is normalized before ledger append

- **WHEN** a `wave1_topic_deepening` result declares `artifacts/wave1/01_topic/question-list.md` with role `other`
- **THEN** successful submit SHALL append a ledger row whose declaration for that path uses role `question_list`
- **AND** submit diagnostics SHALL report the path, original role `other`, and normalized role `question_list`

#### Scenario: extra outputs may remain other

- **WHEN** a `wave1_topic_deepening` result declares an additional non-required file with role `other`
- **THEN** submit SHALL NOT rewrite that extra output solely because required path normalization exists
- **AND** gate coverage SHALL NOT count the extra `other` output as required evidence-summary or question-list coverage

#### Scenario: historical submitted rows are not amended

- **WHEN** an existing ledger row already contains a required Wave1 path with role `other`
- **THEN** this change SHALL NOT require in-place ledger mutation
- **AND** repair SHALL use replacement/supplementary work-unit submit or a future accepted amend mechanism
