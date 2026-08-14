## MODIFIED Requirements

### Requirement: Generated result schema and submit enforcement SHALL match kind contract

For a current-version claim, `assignment_contract_version` SHALL be the
Engine-owned literal `work-unit.assignment.v3` on index, manifest and beacon.
The assigned output contract SHALL remain one strict Zod-validated object with
the existing `required_outputs[]`, result/cache/source-claim rules, exact
paths, canonical roles, and closed direct-contract identities. Generated task,
checklist and result-schema projections SHALL retain the existing current
required-output and actor-binding behavior, and formal dry-submit/submit remain
the authoritative exact-set validators.

Generated current work-unit task/result surfaces SHALL only describe the
complete current attempt profile: v3 assignment, marked
`work-unit.submission.v1`, and actor-v1 execution binding. They SHALL not offer
an actor-fillable profile selector, a marked v1/v2 recorded interpretation, a
markerless compatibility interpretation, or an unrecorded-actor fallback.

An Engine reader of an existing attempt that lacks that complete profile SHALL
return `unsupported_current_contract` before reconstructing an output contract,
normalizing a result role, or evaluating candidate content. It SHALL not apply
v3 supplementary behavior to v1/v2 bytes, use filenames or current defaults to
infer missing markers, or alter the immutable historical envelope/result.

#### Scenario: Current generated contract is closed

- **WHEN** the Engine generates a task and result schema for a new work unit
- **THEN** they SHALL project only its matching current v3 assignment,
  submission-v1 and actor-v1 bindings
- **AND** the actor SHALL receive no legacy contract or compatibility selector

#### Scenario: Old assignment cannot be reconstructed as current

- **WHEN** dry-submit or submit reads an attempt marked assignment v1/v2 or
  lacking a required current discriminator
- **THEN** it SHALL return `unsupported_current_contract` before output-contract
  reconstruction or result-role normalization
- **AND** it SHALL neither infer v3 supplementary semantics nor mutate the old
  result, task, manifest, beacon, or ledger bytes

#### Scenario: Current output remains a valid source ref

- **WHEN** an accepted source claim names a path declared by the current result
- **THEN** submit and reviewed Wave1 backing SHALL validate it through the same current-output authorization branch

#### Scenario: Supplementary work can cite prior submitted evidence

- **WHEN** a supplementary Wave1 work unit claims a new source/cache trail for topic A
- **AND** its `source_ref` names a hash-valid `evidence_summary` output submitted earlier by `wave1_topic_deepening` for the same canonical topic A
- **THEN** submit SHALL accept the prior submitted source ref
- **AND** the supplementary result SHALL NOT be required to redeclare or overwrite that evidence-summary file

#### Scenario: Depth review preserves valid prior submitted source authorization

- **WHEN** a reviewed supplementary Wave1 submitted row contains an accepted claim whose `source_ref` is the exact authorized prior `evidence_summary` for its canonical Topic, wave, and kind
- **THEN** Wave1 reviewed submitted-backing/depth review SHALL accept that source-ref authorization without requiring it in the current row's `output_files[]`
- **AND** it SHALL continue to reject a missing or invalid current cache/degraded binding for that claim

#### Scenario: Filesystem-only source ref remains invalid

- **WHEN** `source_ref` exists on disk but is absent from current outputs and valid prior submitted outputs
- **THEN** submit and reviewed Wave1 backing SHALL fail closed
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
- **AND** no hidden current-output-only rule SHALL remain solely in a verdict consumer

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
- **THEN** manifest, beacon, task and checklist SHALL expose the same top-level assignment version and two required path-role-direct-contract entries, while result schema requires each exact path-role pair once through `contains` plus path-to-role constraints and may annotate the read-only version
- **AND** `output_files.default` and the Result JSON Starter SHALL prepopulate those two exact path-role pairs once
- **AND** the result schema SHALL not advertise omission, duplication, or role other for either required path

#### Scenario: generated projections cannot select contracts

- **WHEN** an actor reads task.md or result.schema.json
- **THEN** it MAY fill only candidate result/output fields allowed by the resolved contract
- **AND** it SHALL not receive a field or CLI argument that chooses assignment version or direct contract ID

#### Scenario: supplementary result schema preserves prior lineage

- **WHEN** a supplementary Wave1 attempt has assignment_mode supplementary, empty required_outputs, and an eligible prior submitted evidence_summary
- **THEN** generated task/result guidance SHALL allow source_claims[].source_ref to name that exact prior path
- **AND** output_files[] SHALL not be required to redeclare the prior paired artifacts
- **AND** its empty required-output schema default and Result JSON Starter SHALL use `output_files: []`

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
- **THEN** recommended_action SHALL be fail_and_replace and generated/shared guidance SHALL direct fail plus a same-obligation replacement under a fresh queue ID and new work ID
- **AND** it SHALL not tell the Phase Agent or user to fill missing research meaning under the original actor provenance
