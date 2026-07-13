> req: SNC-006

## MODIFIED Requirements

### Requirement: Generated result schema and submit enforcement SHALL match kind contract

Generated work-unit `result.schema.json` SHALL be an Agent-facing projection of the same result contract enforced by submit and the assigned kind output contract. Manifest, task, spawn prompt, beacon, result schema and submit validation SHALL agree on identity, required fields, source-claim capability, output roles and cache expectations.

For a source-claim-capable work unit, `source_claims[]` SHALL retain the strict item shape `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional nullable `degraded_capture_ref`. The schema/task SHALL explain that `source_ref` is a submitted evidence reference, not necessarily a file newly written by the current attempt.

An accepted claim's `source_ref` SHALL be valid when it is either:

1. declared in the current result's `output_files[]`; or
2. declared by a hash-valid previously submitted work-unit row that resolves to the same canonical topic UID and a compatible Wave1 evidence-output contract.

The validator SHALL resolve prior submitted outputs through one in-memory submitted-output index derived from the existing hash-valid bundle ledger and canonical topic resolver. The same pure index MAY be reused by submit, depth review, and diagnostics, but SHALL NOT be persisted as a new authority. It SHALL NOT accept filesystem presence alone, a different topic's output, an unsubmitted/invalid row, or free-text path similarity. Current-attempt cache/degraded refs SHALL still be declared and validated through the current result unless the active contract explicitly allows a prior submitted cache ref.

Generated task/checklist guidance SHALL expose both legal source-ref forms and the exact current/prior submitted paths available for the claimed topic where bounded. It SHALL not instruct supplementary work to redeclare or overwrite an existing evidence file merely to satisfy a single-attempt assumption.

Submit/dry-submit diagnostics for a source-ref failure SHALL return a stable code, the candidate `source_ref`, whether it was searched in current outputs and prior submitted outputs, any conflicting declaring `work_id`/topic, and contract-lineage repair coordinates: `missing_fact`, `write_to` naming the exact `result.json#/source_claims/<index>/source_ref`, and `rerun` naming the same dry-submit command. When the prior path is valid, submit SHALL accept it without requiring duplicate `output_files[]` declaration.

#### Scenario: Current output remains a valid source ref

- **WHEN** an accepted source claim names a path declared by the current result
- **THEN** submit SHALL validate it through the current output contract

#### Scenario: Supplementary work can cite prior submitted evidence

- **WHEN** a supplementary Wave1 work unit claims a new source/cache trail for topic A
- **AND** its `source_ref` names a hash-valid evidence-summary output submitted earlier for the same canonical topic A
- **THEN** submit SHALL accept the prior submitted source ref
- **AND** the supplementary result SHALL NOT be required to redeclare or overwrite that evidence-summary file

#### Scenario: Filesystem-only source ref remains invalid

- **WHEN** `source_ref` exists on disk but is absent from current outputs and valid prior submitted outputs
- **THEN** submit SHALL fail closed
- **AND** the diagnostic SHALL identify the missing submitted declaration rather than merely saying the path is not in current `output_files[]`

#### Scenario: Cross-topic prior source ref fails clearly

- **WHEN** a supplementary work unit for topic A names an output submitted for topic B
- **THEN** submit SHALL reject the binding
- **AND** diagnostics SHALL name the declaring work ID/topic mismatch and the exact source-claim repair target

#### Scenario: Missing source ref gives two legal repair choices in one action

- **WHEN** a source ref is neither current output nor a compatible prior submitted output
- **THEN** `missing_fact` SHALL state that the claim needs either a genuinely current assigned output or an exact compatible submitted output path
- **AND** `write_to` SHALL identify the one source-claim JSON pointer to edit
- **AND** `rerun` SHALL identify the same dry-submit command

#### Scenario: Generated envelope surfaces agree

- **WHEN** a source-claim-capable work unit is claimed
- **THEN** task, result schema and submit validation SHALL expose the same source-ref lineage semantics
- **AND** no hidden current-output-only rule SHALL remain solely in validator code
