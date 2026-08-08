# Canonical Topic State — Delta

> req: CTS-010

## ADDED Requirements

### Requirement: `operate-topic-state schema --context wave_projection` SHALL expose wave-dependent source-identity forms

The read-only `operate-topic-state schema --context wave_projection` authoring
projection SHALL expose the allowed `source_identity` form per wave: Wave0/Wave1
entries use `{ kind: "submitted_work", work_id }`, and Wave2 `wave2_judgment`
entries use `{ kind: "finding", finding_id }` with `entry_id` equal to the
finding id. An author SHALL be able to construct a valid `apply_seed_projection`
packet from the schema output alone, without reading Engine source.

#### Scenario: schema output shows the wave2 finding identity form

- **WHEN** an Agent requests the `wave_projection` schema context
- **THEN** the output shows both allowed `source_identity` forms and the slot or
  wave to which each applies
- **AND** the Wave2 `entry_id === finding_id` rule is visible

#### Scenario: a packet built from schema output is accepted

- **WHEN** an Agent builds a `wave2_judgment` entry using
  `{ kind: "finding", finding_id: "W2F-001" }` with `entry_id: "W2F-001"` per the
  schema projection
- **THEN** the apply is not rejected for a hidden `source_identity` constraint
