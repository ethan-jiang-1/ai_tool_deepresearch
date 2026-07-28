> req: REF-001, REF-003, REF-005, REF-008

## MODIFIED Requirements

### Requirement: Flat reference directory with three-level naming prefixes

`reference/` SHALL be a flat directory with no reference subdirectories. Every
reference file SHALL end in `.md` and remain at the same directory level. The
directory has three reference families:

- `00-shared-<slug>.md` — Wave0 shared foundation reference covering at least
  two Topics;
- `reference/{topic.slug}-{qualifier}.md` — Wave1 Topic-specific consumer
  reference for one backing source;
- `00-cross-<slug>.md` — Wave2 cross-Topic discovery reference.

For a current Wave1 Topic, `{topic.slug}` SHALL be the complete current
canonical registry slug, including its ordinal prefix where the registry uses
one. `{qualifier}` SHALL be produced by the one canonical Wave1 locator from a
normalized submitted backing URL/fact: a safe human-readable URL token plus a
stable collision-safe digest. The locator SHALL use the same URL normalization
as backing comparison, so harmless URL representation differences cannot choose
a different path. It SHALL return either one safe exact path or a direct
unresolved-backing root; an Agent-chosen filename, a shortened topic ordinal,
or a broad filename glob SHALL not be a second locator.

The locator SHALL classify a Wave1 file as exactly one of:

- `canonical_current`: the exact current locator path for authenticated
  submitted backing;
- `legacy`: a recognized historical `NN-wave1-*` layout, which remains
  readable and indexable navigation history;
- `misnamed_current`: a file whose metadata resolves to the current Topic but
  whose path is not that Topic/backing's canonical locator.

Only `canonical_current` is eligible to satisfy a current Wave1 Topic's
reference-floor coverage after existing backing, format, and numeric-eligibility
checks pass. `legacy` and `misnamed_current` are repair inputs, not alternate
success paths. They SHALL not be blindly moved, renamed, or treated as new
evidence; a canonical projection may be materialized only from the same already
authenticated submitted backing through the legal Phase path. Wave0 and Wave2
families retain their accepted names and authority contracts.

#### Scenario: Wave1 produces one canonical full-slug reference

- **WHEN** submitted Wave1 backing for current Topic
  `01_meal-timing-blood-glucose-insulin` is suitable for a consumer reference
- **THEN** the locator SHALL return one path beginning
  `reference/01_meal-timing-blood-glucose-insulin-`
- **AND** the suffix SHALL be repeatable from normalized submitted backing and
  collision-safe without an Agent-chosen filename

#### Scenario: Wave 0 produces shared foundation references only

- **WHEN** Wave0 materializes shared foundation evidence
- **THEN** the Phase Agent SHALL create `reference/00-shared-<slug>.md`
- **AND** the file name SHALL retain the `00-shared-` prefix

#### Scenario: Wave 1 produces topic-specific references with slug-based prefix

- **WHEN** Wave1 materializes submitted backing for Topic
  `01_meal-timing-blood-glucose-insulin`
- **THEN** the canonical locator SHALL return
  `reference/01_meal-timing-blood-glucose-insulin-<qualifier>.md`
- **AND** the complete current Topic slug SHALL precede the deterministic
  qualifier so that that Topic's current references naturally group together

#### Scenario: Wave 2 produces cross-topic discovery references

- **WHEN** Wave2 cross-topic work materializes a new shared source
- **THEN** the Phase Agent SHALL create `reference/00-cross-<slug>.md`
- **AND** the file name SHALL retain the `00-cross-` prefix distinct from the
  Wave0 foundation family

#### Scenario: legacy Wave1 name remains readable but not current coverage

- **WHEN** `reference/01-wave1-deepening.md` is a readable historical file
  whose metadata resolves to a current Topic
- **THEN** the locator SHALL classify it as `legacy`
- **AND** it SHALL remain eligible for navigation/index rendering but SHALL not
  satisfy that current Topic's Wave1 reference floor

#### Scenario: a current misnamed reference is a repair coordinate

- **WHEN** a backed Wave1 reference resolves to the current Topic but has a
  noncanonical filename
- **THEN** evaluation SHALL return the canonical locator coordinate as a
  materialization repair input
- **AND** it SHALL not count the noncanonical path through a broad slug match

#### Scenario: Directory is flat and scannable

- **WHEN** a user lists `reference/`
- **THEN** all reference files SHALL be visible in one directory level
- **AND** no `reference/<topic>/` or `reference/00_shared/` reference
  subdirectory SHALL be introduced

### Requirement: _INDEX.md as canonical reference inventory

`reference/_INDEX.md` SHALL be the machine-readable reference inventory. It
SHALL contain the accepted eight-column Markdown table:

| Column | Meaning |
| --- | --- |
| `ref_file` | reference filename/path |
| `source_type` | primary / secondary / mixed / meta |
| `trust_level` | academic / practitioner / official / caution / analyst / community |
| `tier` | Tier 1-4 |
| `related_topic` | consumer-navigation Topic label; not canonical Topic authority |
| `source_layer` | `wave0_foundation` / `wave1_topic` / `wave2_cross` |
| `acceptance_status` | accepted / accepted warning / EXCLUDED |
| `date_landed` | YYYY-MM-DD navigation date |

Its header SHALL contain bundle/run name, last-updated date, and actual
reference count. A prose link list or a per-Topic count summary SHALL not
substitute for the accepted table. `related_topic` and `source_layer` remain
navigation projections and SHALL not override reference metadata, canonical
Topic resolution, or submitted backing authority.

The framework SHALL provide one narrow `sync-reference-index` operation that
renders the complete table from committed flat reference files and their
accepted metadata/path classification. It SHALL include all reference families,
excluding only `_INDEX.md` and `README.md`; preserve Wave0/Wave2 rows during a
Wave1 sync; classify legacy Wave1 rows as `source_layer: wave1_topic`; retain a
valid existing `date_landed` for an existing row; and use the sync date only
for a newly indexed row. It SHALL write only `reference/_INDEX.md`, through the
existing artifact-persistence compare-and-swap boundary, with exactly one
visible outcome:

- `committed` when rendered bytes replace the expected current target;
- `unchanged` when rendered bytes already equal the target;
- `blocked` when a direct path/metadata/table/CAS prerequisite prevents a
  write.

The renderer SHALL derive `source_layer` without trusting the target index that
it is repairing: `reference/00-shared-*.md` is `wave0_foundation`,
`reference/00-cross-*.md` is `wave2_cross`, and every other flat reference
file is `wave1_topic` only when its parsed existing reference metadata resolves
through the canonical Topic resolver to exactly one Topic (current or accepted
historical layout, never `all`). This includes canonical, legacy, and misnamed
Wave1 paths. A non-special file with missing, unknown, ambiguous, conflicting,
or all-Topic binding is `reference_index_layer_unclassifiable`; synchronization
SHALL return `blocked`, preserve the target bytes, and name that file/metadata
root rather than infer Wave1 from a hyphen, an old index row, or filesystem
presence. Path classification remains navigation-only and does not confer
submitted backing or current-floor eligibility.

The operation SHALL render deterministic UTF-8 bytes in stable `ref_file`
order. It may reuse a parseable existing index only to retain a valid
`YYYY-MM-DD` `date_landed` value for the same file; an invalid table supplies no
trusted retained dates. Before creating a staging payload or invoking
`persistBundleFile()`, it SHALL safely read the current target and compare the
complete rendered bytes. Equal bytes return `unchanged` without a persistence
operation. Different bytes use the observed target digest as the CAS
precondition, stage exactly those rendered bytes, and map the persistence
result to `committed` or `blocked`. The underlying persistence primitive has no
`unchanged` verdict, so synchronization SHALL not pretend a successful rename
was an unchanged result.

`blocked` SHALL preserve the target and name the direct parser/path/CAS root;
it SHALL not merge/overwrite concurrent bytes, discard a row, fabricate
metadata, author reference prose, alter a reference file, mutate submitted
declarations/receipts/cache trails, append a gate attempt, or create evidence
authority. The operation is an explicit mechanical Phase action, not a
background controller or a replacement for normal reference materialization.

Index validation SHALL check the table parent before per-file row coverage. If
the required table/header cannot be parsed, inspect and gate SHALL return one
`reference_index_table_invalid` root with `reference/_INDEX.md` as the repair
target and SHALL mask per-file `missing_index_row` or wrong-layer symptoms until
the parent is valid. Once the table is valid, independently missing or
wrong-layer rows remain blocking navigation drift.

#### Scenario: synchronization preserves all flat reference families

- **WHEN** a bundle contains committed Wave0, legacy/current Wave1, and Wave2
  reference files
- **THEN** `sync-reference-index` SHALL render one row for every such file
  without discarding another Wave's row
- **AND** a legacy Wave1 row SHALL retain `source_layer: wave1_topic` without
  becoming current-floor coverage

#### Scenario: _INDEX.md header contains run metadata

- **WHEN** `_INDEX.md` is rendered or updated
- **THEN** its header SHALL contain the bundle/run name, last-updated date, and
  actual reference-count summary

#### Scenario: _INDEX.md has one row per reference file

- **WHEN** `reference/` contains N flat `.md` reference files excluding
  `_INDEX.md` and `README.md`
- **THEN** a successful synchronization SHALL render exactly N data rows
- **AND** no stale row for an absent file SHALL remain in the table

#### Scenario: Each wave updates _INDEX.md

- **WHEN** Wave0, Wave1, or Wave2 has legally materialized reference files
- **THEN** its Phase closeout SHALL run the same synchronizer before the
  corresponding navigation check/gate
- **AND** new rows SHALL arise from the one renderer rather than hand-appended
  table text

#### Scenario: Summary list is one parent failure

- **WHEN** `_INDEX.md` contains human-readable links or counts but no accepted
  eight-column table
- **THEN** Wave inspect/gate SHALL report one invalid-table parent root
- **AND** it SHALL NOT emit one missing-row blocker for every reference until
  that table parent is repaired

#### Scenario: Valid table still exposes actual missing rows

- **WHEN** `_INDEX.md` has the accepted table but omits one materialized
  reference or gives it the wrong `source_layer`
- **THEN** reference index coverage SHALL identify that file after parent
  validation passes
- **AND** the nearest action SHALL be to synchronize the table and rerun the
  same Wave inspect

#### Scenario: invalid index is one parent root

- **WHEN** `_INDEX.md` is empty, malformed, or contains only a human-readable
  list instead of the accepted table
- **THEN** Wave1 inspect/gate SHALL report exactly one
  `reference_index_table_invalid` parent root
- **AND** it SHALL not emit one missing-row finding for every reference before
  the table parent is repaired

#### Scenario: identical synchronization is idempotent

- **WHEN** the complete rendered inventory bytes equal the current
  `reference/_INDEX.md`
- **THEN** `sync-reference-index` SHALL return `unchanged`
- **AND** it SHALL not rewrite a reference, submitted authority, or gate state

#### Scenario: compare-and-swap drift is blocked

- **WHEN** the target changes after the synchronizer observes its expected
  digest
- **THEN** synchronization SHALL return `blocked` with the CAS root
- **AND** the sole recovery direction SHALL be to rerun the same synchronization
  against current bytes rather than merge or overwrite them

#### Scenario: unclassifiable flat reference blocks synchronization

- **WHEN** a non-`00-shared-*`/`00-cross-*` reference file has metadata that
  does not resolve to exactly one canonical or accepted historical Topic
- **THEN** `sync-reference-index` SHALL return `blocked` with
  `reference_index_layer_unclassifiable`
- **AND** it SHALL preserve the previous `_INDEX.md` rather than borrow a layer
  from that previous table or invent a Wave1 row

### Requirement: Phase nodes enforce reference file naming convention

Phase-node Expected Artifacts and Allowed Actions SHALL teach the accepted flat
reference families and SHALL NOT direct an Agent to create
`reference/<topic>/` directories or a reference `source.yaml`. Wave1 guidance
SHALL direct the Phase Agent to obtain the exact current full-slug path from the
canonical Wave1 locator after formal submit, rather than to invent a
`0N-<slug>`/`NN-wave1-*` name or scan for a loosely matching file. It SHALL
teach that only submitted backing makes materialization legal and that a
noncanonical historical file is navigation history requiring a canonical
projection repair when the convergence result says so.

#### Scenario: Wave0 phase instructs agent to create 00-shared files

- **WHEN** an Agent reads Wave0 Expected Artifacts
- **THEN** it SHALL be directed to create `reference/00-shared-<slug>.md`
- **AND** it SHALL not be directed to create `reference/<topic>/source.yaml`

#### Scenario: Wave1 phase instructs agent to create topic-slug-prefixed files

- **WHEN** an Agent reads Wave1 Expected Artifacts after accepted submitted
  backing exists
- **THEN** it SHALL be directed to use
  `reference/{current-topic.slug}-{deterministic-source-qualifier}.md`
- **AND** it SHALL not be directed to choose `reference/0N-<slug>.md`,
  `NN-wave1-*`, or a filename that merely contains the Topic slug

### Requirement: Phase-owned reference materializations SHALL preserve submitted source backing

Phase-owned reference files SHALL be consumer-facing projections, not alternate
delegated evidence authority. A Phase-owned reference SHALL identify concrete
backing from submitted source claims, accepted source URLs, cache trails,
explicit degraded-capture records, work-unit refs, prior-wave artifacts that
themselves bind to submitted/prior accepted backing, or Wave2 ledger/index
findings. It SHALL NOT introduce accepted fetched-source evidence that lacks
submitted work-unit or prior accepted backing.

For Wave1 Topic references, backing SHALL come from submitted
`wave1_topic_deepening` rows and their source/cache/degraded-capture claims.
The canonical Wave1 locator SHALL receive only normalized submitted backing
facts for the same manifest-snapshot-bound current Topic. A current canonical
consumer projection may be created from that backing after formal submit; it
SHALL bind its normalized metadata `source_url` and scannable submitted
source/cache/work-unit body refs to that same returned candidate, not merely to
another submitted row with a compatible URL. It SHALL not repair or fabricate
actor-owned result semantics, cache declarations, receipts, ledger rows,
provenance, source URL, or acceptance merely to reach a reference floor. A
rejected, claimed, filesystem-only, dry-submit-only,
index-only, unbound-submitted-row, legacy-filename-only, or
misnamed-filename-only input SHALL not unlock materialization or countable
coverage.

For Wave2 existing-backed cross references, backing SHALL ultimately bind to
already submitted Wave0/Wave1 source/cache/degraded-capture/work-unit evidence
plus Wave2 `W2F-xxx` ledger/index process evidence. For Wave2 new external
evidence, backing SHALL come from submitted `wave2_targeted_evidence` rows.
Existing Wave2 `source_url` and body-backing rules remain unchanged.

This change SHALL not require a new reference metadata key or `_INDEX.md`
column to classify Phase-owned projections. Classification SHALL reuse existing
reference metadata, canonical Topic resolution, submitted source/cache/degraded
facts, and output declarations. A previous or newly rendered `source_layer`
navigation label is neither an input to backing classification nor sufficient
authority by itself. A reference must pass the existing backing, format, and
numeric-eligibility checks in addition to being `canonical_current` before it
contributes to a current Wave1 floor.

#### Scenario: Wave1 topic reference cites submitted backing

- **WHEN** the Phase Agent writes a canonical current Wave1 reference from
  accepted submitted backing
- **THEN** its body SHALL cite the submitted source/cache/work-unit backing
  through scanable bundle-relative refs or Markdown links
- **AND** the reference may be synchronized into `_INDEX.md` without that row
  becoming evidence authority

#### Scenario: legacy filename cannot fabricate coverage

- **WHEN** a legacy or misnamed Wave1 reference has no authentic submitted
  backing for its claimed source
- **THEN** the Phase Agent SHALL not create a canonical counterpart merely from
  that file or index row
- **AND** convergence SHALL report the direct backing/projection root rather
  than count the file

#### Scenario: rejected work cannot unlock materialization

- **WHEN** a Wave1 candidate has not passed formal submit
- **THEN** the Phase Agent SHALL not materialize its consumer reference or
  index row as submitted-backed evidence
- **AND** it SHALL return to the existing dry-submit, actor-return,
  fail-and-replace, or contract-owner boundary

#### Scenario: source layer is not authority by itself

- **WHEN** `_INDEX.md` lists a reference row with a legal source layer but the
  reference cannot bind to submitted or prior accepted backing
- **THEN** the row SHALL not make the reference accepted evidence or current
  floor coverage
- **AND** inspect/gate SHALL diagnose missing backing rather than infer it from
  navigation metadata

#### Scenario: Wave2 existing-backed cross reference cites prior evidence

- **WHEN** the Phase Agent materializes an existing-backed Wave2 cross
  reference
- **THEN** its body SHALL cite its `W2F-xxx` process fact, finding-index or
  cross-topic-ledger context, and concrete prior submitted backing
- **AND** it SHALL remain legal without inventing a new Wave2 delegated row

#### Scenario: cross reference source_url is prior accepted backing

- **WHEN** a Wave2 cross reference is existing-backed rather than newly fetched
- **THEN** its metadata `source_url` SHALL resolve to prior accepted submitted
  backing
- **AND** a synthetic or unaccepted URL SHALL not be accepted from the
  cross-reference file alone

#### Scenario: unbacked reference is diagnostic, not authority

- **WHEN** a reference file is parseable but cannot bind to submitted or prior
  accepted backing
- **THEN** it MAY remain a diagnostic filesystem artifact or navigation record
- **AND** it SHALL not satisfy evidence authority, consumer-floor coverage, or
  delegated-output coverage
