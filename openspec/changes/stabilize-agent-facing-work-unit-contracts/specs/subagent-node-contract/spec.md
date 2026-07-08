> req: SNC-006

## ADDED Requirements

### Requirement: Generated work-unit result schema SHALL match submit contract

Generated work-unit `result.schema.json` SHALL be an Agent-facing projection of the same work-unit result contract enforced by submit-time validation.

The generated schema SHALL const-bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` for the assigned work unit. It SHALL expose `output_files[]` items with exactly `path`, `role`, optional `source_url`, and optional `source_slug`, with `additionalProperties: false`; `role` SHALL be constrained to the assigned work unit output contract's `output_files.allowed_roles`.

When the assigned output contract does not allow source claims, the generated schema SHALL omit `source_claims` and `accepted_source_urls`. When the assigned output contract allows source claims, the generated schema SHALL expose `source_claims[]` items with exactly `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional nullable `degraded_capture_ref`, with `additionalProperties: false`; it SHALL also expose `accepted_source_urls[]`.

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

#### Scenario: identity fields are const-bound

- **WHEN** the Engine generates a `result.schema.json` for a claimed work unit
- **THEN** `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` SHALL be const-bound to the manifest values
- **AND** an Agent reading only the generated task and result schema SHALL have the exact identity values needed for a submit-ready result
