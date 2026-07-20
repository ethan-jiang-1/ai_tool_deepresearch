> req: SNC-006

## MODIFIED Requirements

### Requirement: Generated result schema and submit enforcement SHALL match kind contract

Generated work-unit `result.schema.json` SHALL be an Agent-facing projection of the same result contract enforced by submit and the assigned kind output contract. Manifest, task, spawn prompt, beacon, result schema and submit validation SHALL agree on identity, required fields, source-claim capability, output roles and cache expectations.

For a source-claim-capable work unit, `source_claims[]` SHALL retain the strict item shape `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional nullable `degraded_capture_ref`. The schema/task SHALL explain that `source_ref` is a submitted evidence reference, not necessarily a file newly written by the current attempt.

The kind output contract SHALL explicitly declare `source_claims.prior_submitted_output_roles[]`. Values SHALL be unique non-empty role strings and a subset of the same contract's `output_files.allowed_roles[]`; if `source_claims.allowed` is not true, the prior-role list SHALL be absent or empty. For `wave1_topic_deepening`, the default SHALL be exactly `['evidence_summary']`; absence or an empty list SHALL mean that prior submitted outputs are not accepted for that kind. This field SHALL be projected consistently into manifest, generated task/checklist, result-schema guidance, dry-submit and formal submit validation.

An accepted claim's `source_ref` SHALL be valid when it is either:

1. declared in the current result's `output_files[]`; or
2. declared by a hash-valid previously submitted work-unit row whose canonical topic UID, wave and kind equal the current attempt, and whose exact output role is listed in the current kind contract's `source_claims.prior_submitted_output_roles[]`.

The validator SHALL resolve prior submitted outputs through one in-memory submitted-output index derived from the existing hash-valid bundle ledger row, its bound work-unit index/manifest/queue-item topic payload, and the canonical topic resolver. The same pure index MAY be reused by submit, depth review, and diagnostics, but SHALL NOT be persisted as a new authority. It SHALL NOT infer Topic identity from output filename or queue-id text. It SHALL NOT accept filesystem presence alone, an unresolved/ambiguous topic binding, a different topic's output, a different wave/kind, an output role absent from `prior_submitted_output_roles[]`, an unsubmitted/invalid row, or free-text path similarity. Current-attempt cache/degraded refs SHALL still be declared and validated through the current result unless the active contract explicitly allows a prior submitted cache ref.

Generated task/checklist guidance SHALL expose both legal source-ref forms and the exact current/prior submitted paths available for the claimed topic where bounded. It SHALL not instruct supplementary work to redeclare or overwrite an existing evidence file merely to satisfy a single-attempt assumption.

Submit/dry-submit diagnostics for a source-ref failure SHALL return a stable code, the candidate `source_ref`, whether it was searched in current outputs and prior submitted outputs, any conflicting declaring `work_id`/topic, and contract-lineage repair coordinates: `repair_kind: agent_action`, `missing_fact`, `write_to` naming the exact `result.json#/source_claims/<index>/source_ref`, and `rerun` naming the same dry-submit command. When the prior path is valid, submit SHALL accept it without requiring duplicate `output_files[]` declaration.


For a current-version claim, the assigned output contract SHALL be one strict Zod-validated object containing assignment_contract_version and required_outputs[] in addition to existing result/cache/source-claim rules. Each required output SHALL contain one concrete bundle-relative path, one canonical role, and one closed direct_contract identity. Cross-field validation SHALL reject unknown IDs, duplicate normalized paths, conflicting roles, unsafe or pattern paths, kind-incompatible direct contracts, and any queue/payload override before generation.

Manifest and beacon SHALL carry the same validated output contract. Generated task/checklist SHALL show each required path, absolute path, role and contract ID. Generated result.schema.json SHALL const-bind or conditionally require the corresponding output_files[] path-role declarations closely enough that it cannot advertise role other or omission as schema-valid for a current required output; formal dry-submit/submit SHALL remain the authoritative exact set validator. The projection SHALL not expose a contract selector to the actor.

A supplementary Wave1 contract with empty required_outputs SHALL continue to expose eligible prior submitted evidence_summary lineage and SHALL not require current declarations for the paired artifacts. Wave2 targeted evidence remains on its existing result/cache/source contract with no v1 direct content blocker when required_outputs is empty.

Generated guidance SHALL require the actor to author and verify assigned outputs before work_done and SHALL tell the Phase Agent to run dry-submit after return. V1 SHALL not require native actors to execute the Engine CLI. After work_done, guidance SHALL allow the Phase Agent to repair only meaning-preserving mechanical roots; a semantic_content root SHALL direct existing terminalization and replacement-attempt execution, not Phase Agent authorship or a user-operated pipeline.

#### Scenario: Current output remains a valid source ref

- **WHEN** an accepted source claim names a path declared by the current result
- **THEN** submit SHALL validate it through the current output contract

#### Scenario: Supplementary work can cite prior submitted evidence

- **WHEN** a supplementary Wave1 work unit claims a new source/cache trail for topic A
- **AND** its `source_ref` names a hash-valid `evidence_summary` output submitted earlier by `wave1_topic_deepening` for the same canonical topic A
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

#### Scenario: Wrong prior kind or role remains invalid

- **WHEN** the exact path was previously submitted for the same Topic but under another wave/kind or with role `question_list`, `reference`, or `other`
- **THEN** a default `wave1_topic_deepening` supplementary attempt SHALL reject it because only prior `evidence_summary` is contract-authorized
- **AND** diagnostics SHALL name the observed wave/kind/role and the current contract's allowed prior roles

#### Scenario: Prior role list must be part of the kind contract

- **WHEN** a kind contract declares a duplicate prior role, a role absent from `output_files.allowed_roles[]`, or prior roles while source claims are disabled
- **THEN** kind-contract validation SHALL reject the contract before claim guidance or submit validation diverge

#### Scenario: Topic identity is not inferred from output path

- **WHEN** a prior submitted path looks like the current Topic slug but its bound manifest/queue-item topic payload is missing, ambiguous, or resolves to another UID
- **THEN** the prior path SHALL not enter the submitted-output candidate index
- **AND** diagnostics SHALL report the unresolved/mismatched binding rather than accepting filename similarity

#### Scenario: Missing source ref gives one repair coordinate

- **WHEN** a source ref is neither current output nor an exact contract-authorized prior submitted output
- **THEN** `missing_fact` SHALL state that the claim needs either a genuinely current assigned output or an exact same-topic/wave/kind prior path with an allowed role
- **AND** `repair_kind` SHALL be `agent_action`
- **AND** `write_to` SHALL identify the one source-claim JSON pointer to edit
- **AND** `rerun` SHALL identify the same dry-submit command

#### Scenario: Generated envelope surfaces agree

- **WHEN** a source-claim-capable work unit is claimed
- **THEN** task, result schema and submit validation SHALL expose the same source-ref lineage semantics
- **AND** no hidden current-output-only rule SHALL remain solely in validator code

#### Scenario: wave0 schema omits unsupported source claim fields

- **WHEN** the Engine generates a `result.schema.json` for a `wave0_source_intake` work unit whose output contract does not allow source claims
- **THEN** the schema SHALL NOT include `source_claims`
- **AND** it SHALL NOT include `accepted_source_urls`
- **AND** submit-time validation SHALL reject a non-empty `source_claims[]` or `accepted_source_urls[]` result for that same work unit contract

#### Scenario: wave1 schema exposes strict source claim items

- **WHEN** the Engine generates a `result.schema.json` for a `wave1_topic_deepening` work unit whose output contract allows source claims
- **THEN** the schema SHALL include `source_claims[]`
- **AND** each `source_claims[]` item SHALL allow only `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional nullable `degraded_capture_ref`
- **AND** submit-time validation SHALL reject an extra key in a `source_claims[]` item for that same work unit contract

#### Scenario: output file role enum follows output contract

- **WHEN** the Engine generates a `result.schema.json` for any registered work-unit kind
- **THEN** `output_files[].role` SHALL be constrained to that kind's `output_contract.output_files.allowed_roles`
- **AND** a role absent from that allowed role list SHALL NOT be advertised as schema-valid

#### Scenario: submit rejects role outside output contract

- **WHEN** a work-unit result declares an `output_files[].role` absent from the assigned kind's `output_contract.output_files.allowed_roles`
- **THEN** `operate-work-unit submit` SHALL reject the result before ledger append
- **AND** the rejection diagnostic SHALL identify the invalid output role or allowed role contract

#### Scenario: identity fields are const-bound

- **WHEN** the Engine generates a `result.schema.json` for a claimed work unit
- **THEN** `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` SHALL be const-bound to the manifest values
- **AND** an Agent reading only the generated task and result schema SHALL have the exact identity values needed for a submit-ready result

#### Scenario: generated envelope surfaces agree

- **WHEN** `operate-work-unit claim` generates a work-unit envelope
- **THEN** `manifest.json`, `task.md`, spawn prompt, `_beacon.json`, and `result.schema.json` SHALL expose the same `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`
- **AND** they SHALL expose source-claim, output-file, cache, and required-result expectations that do not contradict the assigned output/cache contract or submit validator

#### Scenario: required result fields have one entrance meaning

- **WHEN** a registered work-unit kind declares `output_contract.required_result_fields`
- **THEN** each declared field SHALL be required by both generated `result.schema.json` and submit validation
- **OR** the kind output contract SHALL remove that field from `required_result_fields` when submit intentionally supplies a default
- **AND** tests SHALL prove the generated schema, output contract, and submit validator agree for that field

#### Scenario: result schema projects exact required path-role pairs

- **WHEN** a current primary Wave1 envelope is generated
- **THEN** manifest, beacon, task, checklist and result schema SHALL expose the same two required path-role-direct-contract entries and assignment version
- **AND** the result schema SHALL not advertise role other for either required path

#### Scenario: generated projections cannot select contracts

- **WHEN** an actor reads task.md or result.schema.json
- **THEN** it MAY fill only candidate result/output fields allowed by the resolved contract
- **AND** it SHALL not receive a field or CLI argument that chooses assignment version or direct contract ID

#### Scenario: supplementary result schema preserves prior lineage

- **WHEN** a supplementary Wave1 attempt has empty required_outputs and an eligible prior submitted evidence_summary
- **THEN** generated task/result guidance SHALL allow source_claims[].source_ref to name that exact prior path
- **AND** output_files[] SHALL not be required to redeclare the prior paired artifacts

#### Scenario: empty Wave2 direct-output set adds no content blocker

- **WHEN** a wave2_targeted_evidence assignment uses its existing empty required-receipt shape
- **THEN** generated output_contract.required_outputs SHALL be empty
- **AND** existing result, output, cache, source and provenance validation SHALL remain in force without a new Wave2 artifact-content rule

#### Scenario: actor verifies but Phase Agent invokes dry-submit

- **WHEN** a native actor completes a current direct-output assignment
- **THEN** its guidance SHALL require exact write verification before work_done
- **AND** Phase Agent guidance SHALL invoke dry-submit after return rather than requiring the native actor to own the CLI

#### Scenario: semantic rejection does not transfer authorship

- **WHEN** Phase Agent dry-submit observes repair_scope semantic_content after work_done
- **THEN** generated/shared guidance SHALL direct terminalization and a replacement work unit
- **AND** it SHALL not tell the Phase Agent or user to fill missing research meaning under the original actor provenance

