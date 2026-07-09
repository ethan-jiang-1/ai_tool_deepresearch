# agent-output-declaration Specification

> req: AGO-001, AGO-002, AGO-003, AGO-004, AGO-005, AGO-006, AGO-007

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

Work-unit ledger declarations SHALL preserve creation context through `work_id`, `queue_item_id`, `wave`, `kind`, `producer_rule`, `creation_reason`, `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `result_hash`, and `ledger_record_hash`.

#### Scenario: creation context binds queue and work unit

- **WHEN** a gate reads a delegated output ledger row
- **THEN** it SHALL be able to identify the queue demand, work-unit attempt, result file, runtime receipt, and creation reason from the row

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

For delegated work, `operate-work-unit submit` SHALL write the bundle-level `rb_output_declarations.jsonl` ledger. Queue completion SHALL NOT write delegated work ledger rows. The ledger SHALL remain the single production submission ledger and SHALL use work-unit-only provenance fields.

The ledger row SHALL use work-unit provenance fields such as `work_id`, `queue_item_id`, `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `output_files`, and `cache_trails`. Current production guidance SHALL NOT use retired relay/slot ledger fields as the delegated ledger contract.

#### Scenario: successful submit appends one ledger row

- **WHEN** a delegated work unit submits successfully
- **THEN** the Engine SHALL append exactly one `rb_output_declarations.jsonl` row for that `work_id`
- **AND** the row SHALL include `work_id`, `queue_item_id`, `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `output_files`, and `cache_trails`

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
