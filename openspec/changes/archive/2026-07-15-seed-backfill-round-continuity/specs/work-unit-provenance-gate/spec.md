# Work Unit Provenance Gate (delta)

> req: WPG-001, WPG-002, WPG-003, WPG-004
> delta: WPG-015

## ADDED Requirements

### Requirement: Work unit index record SHALL carry Engine-owned rerun_count

The work unit index record (`_work_units/_index.json`) SHALL include an optional `rerun_count` field (non-negative integer). `operate-work-unit claim` SHALL read the current `rerun_count` from `rb_profile.yaml` and write it into the index record at claim time. The field SHALL be Engine-owned — the Agent SHALL NOT write or modify this field through any CLI operation.

When `rb_profile.yaml` has `rerun_count` present and greater than 0, the claim operation SHALL write that value. When the field is absent or 0 (first run, no rerun), the claim operation MAY write `rerun_count: 0` or omit the field. Legacy index records without this field SHALL be treated as `legacy_unbound` by consumers.

Consumers that need round identification (inspect authority checks, eligible-row filtering) SHALL use this field as the authoritative round binding for submitted work. Queue item lineage or manifest fields SHALL NOT serve as alternative round authority.

#### Scenario: Claim writes current rerun_count

- **WHEN** profile `rerun_count` is 2 and `operate-work-unit claim` creates a work unit
- **THEN** the index record SHALL include `"rerun_count": 2`

#### Scenario: Legacy record without field is legacy_unbound

- **WHEN** a work unit index record was created before v0.29 and lacks `rerun_count`
- **THEN** consumers SHALL treat it as `legacy_unbound`
- **AND** it SHALL NOT be eligible as current-round authority
