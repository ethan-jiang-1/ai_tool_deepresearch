> req: CTS-009

## ADDED Requirements

### Requirement: Wave0 deferred-contribution packets SHALL atomically expand exact current source identities

The existing `context: wave_projection`, `action: apply_seed_projection` input SHALL additionally accept one strict Wave0 contribution-scoped deferred-disposition form: its sole `wave0_evidence` update SHALL contain `deferred_contribution` with `source_identity: { kind: submitted_work, work_id }`, one `evidence_meaning`, and one `next_hop`. The existing `submitted_work` value is a source-identity wire discriminator, not aggregate coverage. In this form it is a contribution selector, not a complete individual source identity: only the writer may pair the work ID with derived `<work_id>/<ordinal>` entry IDs. The form SHALL not accept a bare aggregate acknowledgement, a caller-selected ordinal range, file paths, raw Markdown, another Wave's identity form, or caller-selected relationship/status/refs values.

Before workspace creation, the existing topic-state writer SHALL resolve the current authenticated submitted contribution and derive every currently unprojected source identity it owns. It SHALL expand that one input atomically into individual persisted return-map entries whose identities are exact `<work_id>/<ordinal>` values and whose deferred disposition preserves the submitted contribution's supplied meaning and next hop. For each derived entry, the writer SHALL use the existing explicit-limitation values `relationship: defers`, `refs: [none]`, and `status: deferred`; `next_hop` SHALL satisfy the existing limitation rule. The expansion SHALL not create submitted authority, reference files, cache facts, a source catalog, a new status, or a second transaction mechanism.

The writer SHALL reject an unsubmitted, ambiguous, superseded, cross-topic, or no-longer-current contribution; a conflicting already materialized/deferred source identity; and any packet that would overwrite a different disposition. Exact replay of an already committed equivalent contribution form SHALL remain idempotent. Existing explicit Wave0 entry packets SHALL remain valid and retain their existing validation and navigation requirements. A later submitted append contribution SHALL own only its own source identities and SHALL not be implicitly deferred by an earlier contribution packet.

#### Scenario: one deferred intent expands only its contribution interval

- **WHEN** a current submitted Wave0 contribution owns identities `work-a/1` through `work-a/19` and a later contribution owns `work-b/20`
- **THEN** one valid deferred-contribution packet for `work-a` SHALL persist deferred entries only for `work-a/1` through `work-a/19`
- **AND** `work-b/20` SHALL remain available for its own projection or deferred disposition

#### Scenario: deferred expansion is atomic and collision-safe

- **WHEN** a contribution-scoped deferred packet would collide with an already materialized entry or a different persisted deferred disposition
- **THEN** topic-state apply SHALL reject before workspace publication
- **AND** it SHALL not persist a partial subset of the contribution identities

#### Scenario: equivalent deferred replay is idempotent

- **WHEN** the same accepted contribution-scoped deferred packet is replayed after its successful commit
- **THEN** the writer SHALL leave the seed projection unchanged without duplicating identity-bound entries or consuming another token
- **AND** the result SHALL preserve the same apply/recover ownership boundary

#### Scenario: explicit entry packets remain supported

- **WHEN** a Wave0 Phase Agent supplies valid explicit entries for exact current source identities
- **THEN** the writer SHALL continue to validate and commit them through the existing packet path
- **AND** it SHALL not require conversion to the deferred-contribution form
