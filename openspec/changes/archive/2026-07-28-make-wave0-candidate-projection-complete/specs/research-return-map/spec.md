> req: RRM-003, RRM-007

## RENAMED Requirements

- FROM: `### Requirement: Return-map inspection SHALL verify per-row current-round authority references`
- TO: `### Requirement: Return-map inspection SHALL verify current-round projection identities`

## MODIFIED Requirements

### Requirement: Shared guidance SHALL teach the same return-map shape across waves

One focused Agent-facing return-map authoring contract SHALL own the canonical
entry shape, Wave-to-section ownership, and one-time token lifecycle. It SHALL
state that evidence collection, extraction, synthesis, and Seed Topic backfill
carry short meaning statements plus bundle-relative refs so a later Agent can
navigate the result without rereading the bundle blindly. It SHALL expose the
five common fields `evidence_meaning`, `relationship`, `refs`, `status`, and
`next_hop`, plus the accepted entry-local identity metadata.

For Wave0, the guidance SHALL state that `<work_id>/<positive ordinal>` means
the exact 1-based ordinal of an element in that current work unit's
result-declared, schema-valid `artifacts/wave0/<topic>/source.yaml` array at
inspection time. It is a current projection coordinate, not a permanent
candidate ID or a snapshot guaranteed by `result_hash`. One submitted source
intake with multiple current array elements therefore requires one entry or
explicit identity-bound deferred disposition for each coordinate. A bare
`work_id` in `refs` is secondary provenance and SHALL NOT cover a Wave0
candidate. This guidance does not make the array, entry, or disposition evidence
authority.

Wave0, Wave1, Wave2, and Seed Topic materialization phase nodes SHALL load the
same contract through their actual `requires` chain at the relevant
content-production decision point. They SHALL not reproduce a second complete
generic entry template, a source-array parser, or a local projection validator.
The template remains the document-shape owner and the existing
`operate-topic-state` playbook remains the sole complete packet/repair
protocol; concise Wave-local cues may point to both without copying either
contract.

The authoring guidance SHALL distinguish one-time token lifecycle from terminal
content: a token is expected before first materialization and absent after
replacement. When inspect names an invalid entry or missing current projection,
guidance SHALL point the Agent to the named coordinate, retained packet, and
same Wave inspect. It SHALL NOT ask the Agent to reconstruct matching rules or
ask the user to perform ordinary packet/apply/inspect work.

#### Scenario: Wave0 guidance explains source-array ordinal

- **WHEN** a Wave0 Phase Agent has one current result-declared source intake
  whose `source.yaml` contains two valid array entries
- **THEN** the loaded guidance SHALL identify `<work_id>/1` and `<work_id>/2`
  as separate candidate coordinates
- **AND** it SHALL direct the Agent to form entries or explicit dispositions
  through the existing packet writer rather than hand-edit the seed

#### Scenario: Shared guidance does not create candidate authority

- **WHEN** a Wave0 card or guidance example names a candidate coordinate
- **THEN** submitted work-unit/output authority and the schema-valid source
  array SHALL remain the source of record
- **AND** the guidance SHALL not claim that a Seed Topic entry creates a
  submitted source, cache trail, reference, receipt, or an independent Gate
  authority; exact coverage remains the existing return-map evaluator's result

### Requirement: Return-map inspection SHALL verify current-round projection identities

One pure deterministic projection-readiness evaluator SHALL interpret canonical
registry/seed binding, the target Wave's current direct-authority identities,
and canonical Seed Topic appendix entries for both the applicable Wave inspect
and formal Wave gate. It SHALL inspect only the target Wave's existing slot
family:

| Wave | owned slot family | current projection identity |
| --- | --- | --- |
| Wave0 | `wave0_evidence` | each candidate coordinate in a current eligible result-declared `source.yaml` array |
| Wave1 | `wave1_mechanisms`, `wave1_trends`, `pending_questions` | each current eligible submitted `work_id` |
| Wave2 | `wave2_judgment` plus exact W2F entries in `pending_questions` | each current-round usable finding resolved to the topic |

For Wave0, the evaluator SHALL obtain candidates only through a narrow
submitted-candidate projection reader. That reader SHALL authenticate a current
eligible `wave0_source_intake` row, its validated manifest exact required tuple
`(path, role: source_yaml, direct_contract: wave0.source-metadata-array.v1)`,
and a validated result whose `hashValue(result)` equals the accepted
`result_hash` before accepting the declared output. It SHALL call the neutral
direct-output operation for that tuple and, only after a passed
`ReferenceMetadataArraySchema` result, derive ordinals
`1..snapshot_meta.validated_array_length`. The resulting coordinate is
`<work_id>/<1-based source.yaml array ordinal>`. `result_hash` binds the result
declaration rather than source bytes; this is a current inspection-time
projection, not a persistent candidate snapshot. The reader/evaluator SHALL not
discover source files by directory scan, select an optional/orphan output, infer
candidates from generic prose, collapse duplicate URLs, parse YAML, or expose a
source catalog. For Wave1 and Wave2, the existing direct row/finding identity
semantics remain unchanged.

Evaluation SHALL root-short-circuit in this order: unusable registry/seed
binding or submitted-source/finding authority parent; unavailable readable
target family or missing required card; entry identity binding; malformed,
token, generic-prose, deferred, or concrete-navigation structure; then current
identity coverage. A direct parent finding SHALL mask all dependent candidate
omissions. A malformed identity-bearing entry SHALL retain its local structural
root before an omission is reported. Historical/orphan seeds and rows SHALL not
become current targets, and a selected writer layout remains apply-admission
only rather than a read-time mutation request.

For a usable Wave0 family, a candidate is covered only by a valid entry whose
entry-local `entry_id` equals its exact candidate coordinate. A valid explicit
deferred disposition uses the same exact `entry_id`; generic `Wave0 submitted`
prose, anonymous `refs: none`, a bare work ID in `refs`, or an out-of-range /
wrong-coordinate entry SHALL not cover it. Each uncovered current coordinate
SHALL yield one blocking `return_map_current_candidate_omission` finding that
names the exact coordinate. A schema-valid empty source array creates no
candidate demand; independent Wave0 source-output/floor contracts retain their
existing verdict ownership.

For a usable Wave1/Wave2 family, the existing current work-id and W2F coverage
forms remain accepted. Wave inspect and formal gate SHALL consume the same
evaluator result; its structural and current-identity findings remain
degradation-ineligible and SHALL prevent completion handoff. The evaluator
does not create submitted evidence authority, a second receipt, a persistent
projection state, or a second Gate parser.

#### Scenario: One Wave0 entry cannot cover two submitted candidates

- **WHEN** one current eligible Wave0 submitted row has a current
  result-declared `source.yaml` with two schema-valid array elements and the
  Seed Topic contains only a valid
  `<work_id>/1` entry
- **THEN** inspect and formal Wave0 gate SHALL report exactly the uncovered
  `<work_id>/2` `return_map_current_candidate_omission`
- **AND** a bare `<work_id>` reference elsewhere SHALL not suppress that finding

#### Scenario: Duplicate URLs remain separate submitted candidates

- **WHEN** two positions in one current result-declared `source.yaml` array have
  the same URL and otherwise valid metadata
- **THEN** they SHALL remain distinct `<work_id>/1` and `<work_id>/2`
  projection identities
- **AND** one entry SHALL not satisfy both positions

#### Scenario: Exact deferred candidate disposition is complete navigation

- **WHEN** a current Wave0 candidate has no materializable consumer reference
- **AND** its entry uses the exact coordinate, `relationship: defers`,
  `status: deferred`, `refs: none`, and a limitation in `next_hop`
- **THEN** it SHALL satisfy that coordinate's projection coverage
- **AND** it SHALL not create a reference, source claim, receipt, or accepted
  evidence fact

#### Scenario: Source-output parent masks dependent candidates

- **WHEN** a current eligible Wave0 row cannot establish a hash-bound,
  declared safe, schema-valid `source.yaml` output
- **THEN** inspect and formal gate SHALL report the direct submitted-source
  authority/output root
- **AND** they SHALL not emit derived candidate omissions for that row

#### Scenario: Current direct output is not a result-hash snapshot

- **WHEN** an otherwise accepted Wave0 result still declares its required
  `source_yaml` output and the current direct output has three schema-valid
  array elements
- **THEN** the candidate reader SHALL derive `<work_id>/1`, `<work_id>/2`, and
  `<work_id>/3` from the successful direct-output cardinality
- **AND** it SHALL not claim that `result_hash` hashes or freezes the
  `source.yaml` bytes

#### Scenario: Wave1 keeps its existing row identity behavior

- **WHEN** Wave1 evaluates a current submitted row with an accepted exact
  work-id identity form
- **THEN** it SHALL retain the existing Wave1 row coverage behavior
- **AND** Wave0 source-array ordinal rules SHALL not alter it
