> req: SNC-006

## ADDED Requirements

### Requirement: Generated result schema and submit enforcement SHALL match kind contract

Generated work-unit `result.schema.json` SHALL be an Agent-facing projection of the same work-unit result contract enforced by submit-time validation and the assigned kind output contract. Submit-time validation SHALL enforce any kind-level output constraint that the generated schema advertises before submitted-ledger append.

The generated schema SHALL const-bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` for the assigned work unit. It SHALL expose `output_files[]` items with required `path` and `role`, optional `source_url`, and optional `source_slug`, with `additionalProperties: false`; `role` SHALL be constrained to the assigned work unit output contract's `output_files.allowed_roles`. Submit-time validation SHALL enforce the same allowed role set before ledger append. This requirement does not define gate-specific path-to-role coverage policy unless that policy is already encoded in the assigned kind output contract.

When the assigned output contract does not allow source claims, the generated schema SHALL omit `source_claims` and `accepted_source_urls`. When the assigned output contract allows source claims, the generated schema SHALL expose `source_claims[]` items with exactly `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional nullable `degraded_capture_ref`, with `additionalProperties: false`; it SHALL also expose `accepted_source_urls[]`.

For every field listed by `output_contract.required_result_fields`, the generated schema and submit validator SHALL express the same semantics. A field SHALL NOT be advertised as required in the output contract while generated schema or submit validation silently treats it as defaulted or optional, unless the output contract is corrected to stop listing it as required.

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

#### Scenario: required result fields have one entrance meaning

- **WHEN** a registered work-unit kind declares `output_contract.required_result_fields`
- **THEN** each declared field SHALL be required by both generated `result.schema.json` and submit validation
- **OR** the kind output contract SHALL remove that field from `required_result_fields` when submit intentionally supplies a default
- **AND** tests SHALL prove the generated schema, output contract, and submit validator agree for that field
