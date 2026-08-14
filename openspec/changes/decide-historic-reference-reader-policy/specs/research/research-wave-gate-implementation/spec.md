## MODIFIED Requirements

### Requirement: Wave gates SHALL aggregate accepted topic layouts by UID

For each canonical topic UID, Wave0 and Wave1 gate evaluators SHALL use the
shared resolver's bounded current-plus-previous slug set when locating
submitted artifact/reference coverage. Reference metadata SHALL use the same
adapter: only one exact `related_topic_uid`, the `all` sentinel, or a valid
`related_topic_uids` current subset SHALL resolve to canonical UID sets. A
reference containing retired `related_topic`, whether legacy-only or dual, SHALL
return `reference_topic_binding_legacy_unsupported` and SHALL not count toward
a Gate, reference floor, submitted provenance, or index-backed coverage.

Historical files SHALL remain at recorded paths and require no mass rewrite.
The rejection does not change current seed checks, new work eligibility, or
previous-layout resolution for UID-bound records. A rerun-added topic without
current UID-bound coverage SHALL enter the normal Wave0/Wave1 production and
reference-materialization path; no fallback reader, migration, or
metadata-only work unit is created.

Accepted slugs SHALL be alternatives for one UID, not separate mandatory
targets. Per-topic floors SHALL evaluate aggregate submitted coverage across
the UID's accepted slugs and SHALL NOT require one file per historical alias.
The same physical file or submitted row SHALL count at most once for one UID.
A previous slug SHALL NOT create a new topic, satisfy another UID, or grant
authority without existing submitted coverage.

#### Scenario: Renamed topic retains UID-bound historical wave coverage

- **WHEN** a topic's submitted Wave1 outputs remain under a unique previous
  slug after canonical rename and their reference metadata uses a current UID
  form
- **THEN** the Wave1 gate SHALL attribute those outputs to the same UID without
  requiring file moves or ledger rewrites

#### Scenario: Legacy-only reference cannot satisfy a current floor

- **WHEN** an otherwise covered historical reference uses only `related_topic`
- **THEN** the Wave1 evaluator SHALL return one
  `reference_topic_binding_legacy_unsupported` binding root
- **AND** the reference SHALL not contribute to topic attribution, provenance,
  reference navigation, or numeric floor coverage

#### Scenario: Current UID binding does not require legacy-field rewrite

- **WHEN** an existing covered reference resolves through an exact current UID
  form and has no `related_topic`
- **THEN** Wave1 SHALL retain that current binding without a metadata-only work
  unit or mass rewrite
- **AND** submitted backing and index navigation requirements SHALL remain
  unchanged

#### Scenario: Rerun-added topic uses normal Wave1 materialization

- **WHEN** a sanctioned rerun adds a topic with no current UID-bound Wave1
  coverage
- **THEN** the topic SHALL use current layout coordinates and the normal Wave1
  delegated/materialization contract
- **AND** rerun classification SHALL NOT create a second reference, gate, or
  provenance path
