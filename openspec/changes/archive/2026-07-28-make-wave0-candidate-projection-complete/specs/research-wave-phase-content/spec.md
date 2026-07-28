> req: RWP-016

## MODIFIED Requirements

### Requirement: Wave phase docs SHALL teach canonical gate-consumable refs and roles

Wave phase docs SHALL teach the direct artifact shapes consumed by gate/inspect
helpers without reproducing validator implementations. Wave0, Wave1 and Wave2
SHALL load `templates/seed-topic-template` as their document-shape contract and
use `command_playbook/operate-topic-state.md` as the sole complete Projection
Packet execution contract. They SHALL not direct Agents to discover headings,
replace tokens by hand, edit seeds directly, or build local return-map/source
array validators.

After successful submitted work or accepted finding materialization, every Wave
phase SHALL teach the existing closeout loop: read direct authority; use Agent
judgment to retain a Projection Packet for each affected current topic;
`operate-topic-state apply` in the route-bound Wave window; same Wave inspect;
then smallest-root repair and same inspect before completion evidence or formal
gate. A missing legal writer or authority path remains its direct owner or
missing-contract boundary, never a user-operated workaround.

For Wave0, direct authority means each candidate in each current eligible
submitted work unit's result-declared, schema-valid `source.yaml` array at the
same inspection boundary. The Phase Agent SHALL form one exact
`<work_id>/<1-based source.yaml ordinal>` entry or explicit identity-bound
deferred disposition for every candidate in the affected topic's retained
packet. The ordinal is a current projection coordinate, not a permanent
`result_hash` snapshot. One packet MAY carry multiple entries for one work ID
and shall be applied through the existing writer before the same Wave0 inspect.
A bare work ID, generic completion prose, or one arbitrary ordinal SHALL not be
taught as coverage for the whole source intake.

Wave1 and Wave2 retain their existing row/finding identity, role, concrete
reference navigation and closeout requirements. Evidence-bearing refs continue
to lead with concrete existing `reference/*.md` navigation; artifacts, cache,
and work-unit paths remain secondary provenance only. The phase SHALL not ask
the user to perform ordinary packet/apply/inspect work, hand-write
ledger/receipt/trace/reference state, or treat generic submitted prose as a
success substitute.

#### Scenario: Wave0 closeout enumerates one result-declared source array

- **WHEN** a Wave0 source-intake work unit has formally submitted a result that
  declares a current schema-valid `source.yaml` array with three candidates for
  one current topic
- **THEN** phase guidance SHALL direct a retained packet with three exact
  candidate entries or dispositions for that work ID
- **AND** it SHALL direct `operate-topic-state apply` followed by the same
  `inspect-wave0-output` before completion evidence

#### Scenario: Wave0 closeout preserves the one legal writer

- **WHEN** a Wave0 candidate needs a navigation entry or deferred disposition
- **THEN** guidance SHALL direct the Phase Agent through the existing packet
  writer and same inspect
- **AND** it SHALL not direct a raw Seed Topic edit, a source-authority edit,
  or a new user interaction

#### Scenario: Later Waves do not inherit Wave0 candidate rules

- **WHEN** Wave1 or Wave2 closeout runs after this change
- **THEN** their existing submitted-row or W2F identity rules SHALL remain
  authoritative
- **AND** Wave0 source-array ordinal language SHALL not be presented as their
  coverage contract
