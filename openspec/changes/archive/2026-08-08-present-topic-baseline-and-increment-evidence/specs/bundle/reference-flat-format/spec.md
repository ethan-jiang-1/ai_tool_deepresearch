> req: REF-003, REF-004

## MODIFIED Requirements

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
for a newly indexed row. The same operation SHALL also render the derived
Reference Evidence Map owned by `reference/README.md`; `_INDEX.md` remains the
machine-readable inventory and README remains human navigation, not a second
ledger or an index substitute.

The renderer SHALL derive `source_layer` without trusting the target index that
it is repairing: `reference/00-shared-*.md` is `wave0_foundation`,
`reference/00-cross-*.md` is `wave2_cross`, and every other flat reference
file is `wave1_topic` only when its parsed existing reference metadata resolves
through the canonical Topic resolver to exactly one Topic (current or accepted
historical layout, never `all`). This includes canonical, legacy, and misnamed
Wave1 paths. A non-special file with missing, unknown, ambiguous, conflicting,
or all-Topic binding is `reference_index_layer_unclassifiable`; it SHALL block
an `_INDEX.md` write, preserve that target's bytes, and name that file/metadata
root rather than infer Wave1 from a hyphen, an old index row, or filesystem
presence. Path classification remains navigation-only and does not confer
submitted backing or current-floor eligibility.

The Reference Evidence Map SHALL still render an affected reference as
`unknown` relationship, with its reference-file coordinate and the direct
classification root, when the same direct facts make its index layer
unclassifiable. It SHALL not fabricate a Topic-specific relationship merely to
make the index or map complete. A map row's relationship is only `shared`,
`Topic-specific`, `cross-Topic`, or `unknown`: it derives from the same special
path/canonical Topic facts used for `source_layer`, but is reader terminology
rather than new evidence metadata or Topic authority.

The operation SHALL render deterministic UTF-8 bytes in stable `ref_file`
order. It may reuse a parseable existing index only to retain a valid
`YYYY-MM-DD` `date_landed` value for the same file; an invalid table supplies no
trusted retained dates. For each target that needs changing, it SHALL safely
read that target, compare complete rendered bytes, and persist the staged
payload through the existing artifact-persistence compare-and-swap boundary.
Equal target bytes are not rewritten. A rerun SHALL re-render both targets from
current direct facts and current target bytes; it SHALL not merge prose or
overwrite a changed target.

`sync-reference-index` SHALL expose one aggregate outcome:

- `committed` when at least one target changes and every required target
  persistence commits;
- `unchanged` when both complete rendered targets already equal their current
  bytes; or
- `blocked` when a direct parser/path/focus-coverage/CAS prerequisite prevents
  a required target write.

There is no cross-file atomicity guarantee. If a prior target has committed
before a later target blocks, the blocked result SHALL name the committed target
or targets and the blocked target/root. The committed target SHALL remain a
derived projection, and the sole recovery direction SHALL be to rerun the same
synchronizer against current bytes; the Agent SHALL not hand-merge `_INDEX.md`
or README. A pre-render blocker before any persistence SHALL preserve both
targets, except that an unclassifiable relationship MAY still be rendered as
the README `unknown` row described above while the `_INDEX.md` target remains
blocked.

`blocked` SHALL name the direct parser/path/focus-coverage/CAS root; it SHALL
not merge/overwrite concurrent bytes, discard a row, fabricate metadata,
author reference prose, alter a reference file, mutate submitted
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
- **THEN** a successful `_INDEX.md` synchronization SHALL render exactly N data
  rows
- **AND** no stale row for an absent file SHALL remain in the table

#### Scenario: Each wave updates the paired navigation projection

- **WHEN** Wave0, Wave1, or Wave2 has legally materialized reference files
- **THEN** its Phase closeout SHALL run the same synchronizer before the
  corresponding navigation check/gate
- **AND** changed index or README rows SHALL arise from the one renderer rather
  than hand-appended table or map text

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

#### Scenario: identical paired synchronization is idempotent

- **WHEN** both complete rendered navigation targets equal their current bytes
- **THEN** `sync-reference-index` SHALL return `unchanged`
- **AND** it SHALL not rewrite a reference, submitted authority, or gate state

#### Scenario: compare-and-swap drift is blocked per target

- **WHEN** one target changes after the synchronizer observes its expected
  digest
- **THEN** synchronization SHALL return `blocked` with that target's CAS root
- **AND** it SHALL preserve that changed target rather than merge or overwrite
  it and direct the same synchronization rerun

#### Scenario: second target CAS failure is an explicit partial projection

- **WHEN** `_INDEX.md` commits but `README.md` blocks at its own CAS boundary
- **THEN** synchronization SHALL return `blocked` naming the committed index
  target and the blocked README target
- **AND** it SHALL not claim atomic rollback, manually repair README text, or
  change submitted evidence/Gate state

#### Scenario: unclassifiable reference remains unknown to the reader

- **WHEN** a non-`00-shared-*`/`00-cross-*` reference file has metadata that
  does not resolve to exactly one canonical or accepted historical Topic
- **THEN** `sync-reference-index` SHALL return `blocked` with
  `reference_index_layer_unclassifiable` for `_INDEX.md`
- **AND** any rendered Reference Evidence Map row for that file SHALL show
  `unknown` and its direct reference/classification coordinate rather than
  invent a Topic-specific relationship

### Requirement: README.md as human navigation for reference directory

`reference/README.md` SHALL provide human-readable navigation for the
reference directory, including:

- a short description of reference evidence for this run;
- the naming convention and its limited navigation role for
  `00-shared-*`, `00-cross-*`, and `{topic_slug}-<qualifier>`;
- a short description of the rich MD reference format;
- links to `_INDEX.md` as the machine-readable inventory and to the README as
  the human overview; and
- a deterministic `Reference Evidence Map` rendered by
  `sync-reference-index`, without hand-authored evidence classifications.

The initial README template SHALL retain the orientation sections and include a
clearly non-evidentiary `Reference Evidence Map` empty state that says no
synchronized projection is yet available. It SHALL not prefill relationship,
Topic, focus, or increment labels. The first successful or partial README
target commit from `sync-reference-index` replaces that empty state with the
current derived map.

The Reference Evidence Map SHALL contain a stable reference-relationship view
and a stable per-Topic current-focus-increment view. Each displayed
relationship/status assertion SHALL carry a durable direct coordinate: a
reference file and its parsed metadata/canonical Topic coordinate for a
relationship, or the current profile and relevant Wave1 depth-review/submitted
work-unit coordinates for a current-focus status. The map SHALL explicitly say
that it is derived navigation and that submitted backing, canonical Topic
resolution, current profile round, and valid focus coverage remain the
authority.

The relationship view SHALL distinguish `shared`, `Topic-specific`,
`cross-Topic`, and `unknown` without using file counts, byte counts, prose,
`scope_role`, or an old `_INDEX.md` row as proof. It SHALL list every flat
reference other than `_INDEX.md` and README in stable path order. A
Topic-specific row SHALL name only the exactly resolved canonical Topic;
`shared` and `cross-Topic` SHALL not be presented as a canonical all-Topic
identity.

The current-focus-increment view SHALL contain one row for each current
canonical Topic and distinguish only these direct outcomes: a valid current
`covered`, `partial`, or `blocked` focus-coverage declaration; a valid current
depth review with no focus declaration (`not declared`); a parsed focus
declaration from an earlier integer rerun count that binds the current
canonical Topic (`historical context`); or `unknown` when the direct
profile/depth-review/focus-coverage facts cannot support one of the former
labels. A malformed, mismatched, or future-round declaration is `unknown`, not
historical context. `partial` and `blocked` SHALL include their visible
limitations and boundary kinds. `covered` SHALL link its submitted work-unit
refs. The map SHALL NOT claim that any individual `reference/*.md` file is the
current focus increment unless a separate accepted direct fact establishes that
binding.

The map SHALL not infer a current increment from filename, `source_layer`,
reference date/count, HITL prose, rerun rationale, historical submitted work,
or the existence of a related reference. `not declared`, `historical context`,
and `unknown` SHALL not be rendered as `covered`, a successful focus increment,
or a request to create more work. The map SHALL not alter final-delivery
backing, the Agent return map, source floors, Gate eligibility, Topic identity,
or a lifecycle route.

#### Scenario: README explains naming convention and reader map

- **WHEN** a user opens `reference/README.md`
- **THEN** the user can understand the three naming-prefix families and reach
  `_INDEX.md`
- **AND** the user can distinguish the Reference Evidence Map from both the
  submitted-backing authority and the machine-readable inventory

#### Scenario: initial README does not invent a map

- **WHEN** a newly instantiated bundle has not yet run reference
  synchronization
- **THEN** its README SHALL show the explicit non-evidentiary map empty state
- **AND** it SHALL not prefill a relationship, current focus outcome, or
  increment claim

#### Scenario: reader sees relationships without per-reference era invention

- **WHEN** the map contains shared, exactly Topic-bound, and cross-Topic
  reference files for a current Topic set
- **THEN** it SHALL show their three relationship labels with direct
  coordinates in stable path order
- **AND** it SHALL not label any individual reference as a current increment
  merely because its Topic has valid focus coverage

#### Scenario: current focus status preserves the no-declaration path

- **WHEN** a current Topic has a valid depth review without `focus_coverage`
- **THEN** its current-focus-increment row SHALL show `not declared`
- **AND** it SHALL not infer an absent or covered increment from profile prose,
  reference rows, or previous rounds

#### Scenario: limited and historical focus remain visible

- **WHEN** a current Topic has a valid current `partial` or `blocked`
  declaration, or a parsed declaration from an earlier round
- **THEN** the map SHALL show the valid limitation details or `historical
  context` respectively with direct coordinates
- **AND** it SHALL not convert either state into a clean current coverage claim

#### Scenario: unavailable direct facts remain unknown

- **WHEN** a required relationship or current-focus status cannot be resolved
  from its direct facts
- **THEN** the map SHALL show `unknown` with the available repair coordinate
- **AND** it SHALL not use a filename, index row, count, or prose fallback to
  classify the row
