## MODIFIED Requirements

### Requirement: HITL1 Gate feedback exposes the profile-schema root for unsupported access shapes

When the recorded research-access observation is malformed or uses an unsupported
current shape, HITL1 Gate feedback SHALL expose the existing `profile_schema_valid`
root and its existing `missing_contract` repair boundary. It SHALL suppress the
dependent `research_access_available` field rule and SHALL not inspect old URL,
fetch, candidate, source-class, reason, or access-boundary fields to classify an
owner or produce a second taxonomy.

When the observation is absent or `unprobed`, the Gate SHALL retain its existing
recorded-observation rule, bounded direct-sample probe repair, and same-check rerun.
For a completed schema-valid current direct-sample observation, the Gate SHALL not
produce a blocking unavailable-root feedback message. Its China/overseas outcome is
a Phase Agent access-alignment input, not a deterministic defect or an external
prerequisite that the user can acknowledge away. The Gate SHALL not discover
providers, validate credentials, launch an adapter, write the observation, choose a
network change, create a second user decision path, migrate an old profile, or
derive a current observation from historical fields.

#### Scenario: Unsupported legacy envelope has one schema root

- **WHEN** a selected bundle contains a parseable legacy URL/fetch/search/candidate,
  source-class, or access-boundary research-access envelope
- **THEN** HITL1 SHALL return one blocking `profile_schema_valid` finding with
  `repair_kind: missing_contract`
- **AND** it SHALL not emit `research_access_available`, adapter-owner,
  external-action, or legacy-boundary feedback

#### Scenario: Current unavailable outcome is not misreported as a missing adapter

- **WHEN** a schema-valid current observation has `status: unavailable`
- **THEN** the Gate SHALL not identify a Claude adapter, `WebSearch`, `WebFetch`, or
  provider-specific missing surface as its root cause
- **AND** the Phase retains responsibility for any required user alignment before it
  invokes the Gate

#### Scenario: Missing or unprobed observation retains the current HITL1 loop

- **WHEN** `research_access` is absent or has `status: unprobed`
- **THEN** HITL1 SHALL retain the existing direct-sample probe repair and same-Gate
  rerun boundary
- **AND** it SHALL not make the field globally required or authorize Setup

#### Scenario: Existing completed current observation retains its Gate path

- **WHEN** the profile has a complete schema-valid current direct-sample observation
- **THEN** the Gate SHALL retain its existing successful recorded-observation path
- **AND** it SHALL not require a second adapter checker or provider preflight
