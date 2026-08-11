# Reference Flat Format

> req: REF-001, REF-002, REF-003, REF-004, REF-005, REF-006, REF-007, REF-008, REF-009, REF-010, REF-011

## Purpose

定义 `reference/` 目录的扁平化约定：三级命名前缀（`00-shared-` / `{topic_slug}-<qualifier>` / `00-cross-`）、rich MD 单文件单 source 格式、`_INDEX.md` 作为 canonical inventory、`README.md` 作为人类导航。对标 `deep_research_ai_cases/topics/_reference` 的成熟实践，实现"人类一眼能看明白"的 evidence 目录。
## Requirements
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

### Requirement: Rich MD reference file template

每个 `reference/*.md` 文件 SHALL 遵循一致的 rich MD 模板，包含：

1. **Metadata block**: New or rewritten reference files SHALL begin with one
   `---` delimited YAML mapping containing:
   - `source_url`: 原始 URL
   - `source_file`: 本地文件路径或 `_none_`
   - `acceptance_status`: `accepted` / `accepted ⚠️` / `EXCLUDED`
   - `source_type`: `primary` / `secondary` / `mixed` / `meta`
   - `source_family`: source 来源分类
   - `tier`: `Tier 1` / `Tier 2` / `Tier 3` / `Tier 4`
   - `evidence_role`: `foundation` / `primary_topic_reference` / `deepening_reference` / `meta`
   - `topic_unique_status`: `shared_foundation` / `topic_NN_unique`
   - `accessed_at`: YYYY-MM-DD
   - `source_date_scope`: YYYY-YYYY
   - topic binding: `related_topic_uid` containing one exact registered UID or `all`, or compatibility field `related_topic` containing `all` or comma-separated exact current/previous ids or slugs; both MAY appear only when they resolve identically
   - `trust_level`: `academic` / `practitioner` / `official` / `caution` / `analyst` / `community`
   - `why_it_matters`: 为什么这条 source 对 research 重要
   - `related_entities`: 逗号分隔的关联实体列表
   - `captured_excerpt`: `yes` / `no`
   - `supports_claims`: 该 source 支持的 claim 列表
   - `risks_or_limitations`: 已知风险或局限
   - `excluded_reason`: `_none_` 或排除原因

The required metadata contract SHALL remain the eight common keys `source_url`, `acceptance_status`, `source_type`, `tier`, `evidence_role`, `trust_level`, `why_it_matters`, and `accessed_at`, plus one resolvable topic-binding form. `related_topic_uid` and legacy `related_topic` are compatibility inputs to one canonical resolver, not two authorities. A normal first-run reference that uses the existing `related_topic` form SHALL remain valid. A rerun or historical reference that uses only an exact `related_topic_uid` SHALL also be valid. Conflict, unknown identity, or ambiguity SHALL fail as topic binding rather than as a missing raw field.

Existing bullet metadata lines of the form `- key: value` before the first
recognized semantic section SHALL remain read-compatible only; they are not the
canonical writer presentation and do not require a bulk migration. A
frontmatter-bearing reference SHALL obtain metadata only from its opening YAML
mapping. Malformed YAML, a non-mapping YAML root, or an invalid frontmatter
boundary SHALL produce one parser-owned reference-metadata root with a repair
target at the metadata block, rather than a cascade of inferred missing-field
roots.

2. **Standard semantic sections**：
   - `## Key Facts`（bullet list，定量 + 定性事实）
   - `## Core Content Capture`（narrative synthesis paragraph）
   - `## Relevance To This Research`（为什么跟本次研究相关）
   - `## Quotable Terms / Concepts`（可用于最终报告的引述或概念）
   - `## Risks And Limitations`（诚实声明：此 source 不能支持什么）

The five semantic sections SHALL remain required and non-empty. In the
fenced-code-excluded body of each required section, the shared reference-format
evaluator SHALL reject a raw document-markup signature: `<!doctype` or an
opening or closing `html`, `head`, `body`, `script`, `style`, or `iframe` tag,
case-insensitively. This is a bounded structural format rule for copied
document payloads, not an HTML sanitizer or research-quality judgment. It
SHALL ignore the same literal inside fenced code and SHALL continue to tolerate
harmless heading case, heading level, surrounding spacing, section order,
prose length, Key Facts bullet count, and ordinary Markdown or non-document
inline HTML presentation. A contaminated section SHALL report one
`reference_format` root that names the reference coordinate and section and
directs the Agent to replace the copied document markup with interpreted
Markdown facts before rerunning the same checkpoint. The evaluator SHALL not
automatically strip, rewrite, or migrate existing reference/cache/evidence
bytes. `Key Facts` count or prose-richness feedback MAY remain advisory; `Core
Content Capture` SHALL remain a distinct narrative semantic section rather than
being inferred from the Key Facts list.

#### Scenario: Reference file has complete canonical metadata

- **WHEN** an Agent creates or rewrites a reference `.md` file
- **THEN** the file SHALL contain all common required metadata fields and one resolvable topic binding in its opening YAML frontmatter mapping
- **AND** values with YAML-sensitive punctuation or prose SHALL use YAML-safe quoting or block syntax

#### Scenario: Legacy inline metadata remains readable

- **WHEN** an existing reference contains all common required metadata as bullet key-value lines before its first semantic section
- **THEN** reference format validation SHALL continue to read and validate that metadata through the same semantic reader
- **AND** the existing bundle SHALL not require a formatting-only rewrite merely to pass current inspection

#### Scenario: Invalid frontmatter has one metadata root

- **WHEN** a reference begins with an unparseable or non-mapping YAML frontmatter block
- **THEN** reference format validation SHALL report one metadata-frontmatter root that identifies the frontmatter block as the repair surface
- **AND** it SHALL not emit one missing-field finding for each key that the invalid mapping could not supply

#### Scenario: UID form satisfies topic binding

- **WHEN** a reference contains all common required metadata and exact `related_topic_uid: tp_...` but no `related_topic`
- **THEN** reference format validation SHALL treat the topic-binding requirement as present
- **AND** it SHALL resolve the UID against current canonical registry facts

#### Scenario: Legacy form remains valid for normal execution

- **WHEN** a normal first-run reference contains all common required metadata and existing `related_topic` syntax
- **THEN** reference format validation SHALL continue to accept it through the shared resolver
- **AND** this change SHALL NOT require the normal producer to enter a rerun-specific format branch

#### Scenario: Conflicting identity forms fail closed

- **WHEN** both `related_topic_uid` and `related_topic` are present but resolve differently
- **THEN** validation SHALL return one topic-binding conflict
- **AND** it SHALL NOT report the UID form as merely an unknown optional field or select the legacy field by precedence

#### Scenario: Reference file has all standard sections

- **WHEN** Agent 创建 reference `.md` 文件
- **THEN** 文件 SHALL 包含可识别且非空的 `Key Facts`、`Core Content Capture`、`Relevance To This Research`、`Quotable Terms / Concepts`、`Risks And Limitations` 五个 semantic section

#### Scenario: Raw document markup in a required section is one format root

- **WHEN** a non-code body of one required semantic section contains
  `<!doctype` or an `html`, `head`, `body`, `script`, `style`, or `iframe` tag
- **THEN** the shared reference-format evaluator SHALL return one blocking
  `reference_format` root naming that reference and section
- **AND** the repair SHALL direct the Agent to replace the copied document
  markup with interpreted Markdown facts and rerun the same checkpoint

#### Scenario: Fenced document-markup literal remains reference content

- **WHEN** one required semantic section contains one of the bounded document
  markup signatures only inside a fenced code block and is otherwise non-empty
- **THEN** the reference-format evaluator SHALL not report document-markup
  format pollution for that section
- **AND** it SHALL not strip or rewrite the fenced literal

#### Scenario: Harmless Markdown presentation does not block

- **WHEN** a reference exposes all five semantic sections but differs only in heading case, heading level, whitespace, ordering, prose length, Key Facts bullet count, ordinary Markdown, or non-document inline HTML presentation
- **THEN** reference-format parsing SHALL accept the equivalent semantic structure or emit advisory feedback
- **AND** presentation differences alone SHALL NOT fail the reference or reduce its numeric count eligibility

#### Scenario: Missing semantic section remains one format root

- **WHEN** an accepted reference lacks a non-empty `Core Content Capture` section
- **THEN** the shared reference-format evaluator SHALL return that one missing semantic-section root
- **AND** count-floor SHALL NOT repeat it as a thin-content or zero-count symptom

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

### Requirement: Wave1 sub-agent reference file format specification

Wave1 topic reference file format SHALL remain aligned with `shared-reference-template.md`, but canonical Wave1 topic reference materialization SHALL be Phase-owned after successful work-unit submit. Sub-agent role/task guidance SHALL provide source evidence, source claims, cache trails, and optional source-candidate details needed for materialization; it SHALL NOT make rich topic reference Markdown a required delegated receipt unless a separate accepted task explicitly assigns that output.

The format specification SHALL be available to the Phase Agent materialization guidance and to any work-unit task that is explicitly assigned a reference output. New rich-reference files SHALL begin with one YAML-frontmatter mapping containing the eight common metadata fields plus one resolvable topic-binding form, then expose the five required non-empty semantic sections. Legacy bullet metadata before the first recognized semantic section remains read-compatible only; it is not a second writer presentation. Heading case, level, spacing, section order, and list presentation remain tolerant. A malformed or non-mapping frontmatter block SHALL return the shared `reference_metadata_frontmatter_invalid` root at that mapping rather than field-level cascades.

#### Scenario: Phase Agent guidance includes canonical reference format

- **WHEN** the Phase Agent materializes Wave1 topic references after successful submit
- **THEN** its guidance SHALL include or point to one opening YAML-frontmatter metadata mapping and the five semantic sections
- **AND** it SHALL not tell the Agent to rewrite existing valid legacy bullet metadata merely to change presentation

#### Scenario: Sub-agent role is not canonical reference presentation owner

- **WHEN** a Wave1 work-unit task is generated for `dpt-evidence-extractor`
- **THEN** the task SHALL require submitted source evidence, source claims, cache trails, result, and receipt surfaces
- **AND** it SHALL NOT require canonical topic reference presentation as a delegated receipt unless that task explicitly assigns reference output under an accepted output contract

#### Scenario: Explicitly assigned reference output uses the shared format

- **WHEN** a future or supplementary accepted work-unit task explicitly assigns a rich reference Markdown output
- **THEN** that output SHALL use the same opening YAML-frontmatter metadata mapping and five semantic sections
- **AND** it SHALL still require submitted source/cache backing before it can count as fetched-source evidence

### Requirement: Agent-facing source.yaml and reference metadata formats SHALL be parser-aligned and complete

Agent-facing phase docs, shared schema docs, work-unit tasks, and repair diagnostics SHALL describe `artifacts/waveN/{topic}/source.yaml` in the exact shape parsed by the Engine: a top-level YAML array where each entry includes at least `url`, `title`, `retrieved_date`, and `topic_tag`. Guidance SHALL warn that wrapping entries under `sources:`, `wave:`, or `topic:` produces an object and is invalid for this parser.

Reference Markdown metadata guidance SHALL present opening YAML frontmatter as the canonical new-output form parsed by the shared reference metadata reader. Guidance SHALL describe the eight common required fields plus one topic-binding form, explain that `related_topic_uid` and legacy `related_topic` feed the same canonical resolver, and state that conflicting dual declarations fail. It SHALL explicitly state that legacy bullet metadata remains read-compatible but is not the form a new producer should choose. A malformed YAML mapping SHALL receive a parser-aligned metadata-block repair; a valid mapping missing one required field SHALL receive the existing field-specific repair. Normal first-run guidance SHALL not require a rerun-specific metadata branch, and rerun/history guidance SHALL not require mass rewriting of already covered legacy references merely to change presentation.

At the Wave0 source-intake authoring decision point, the delegated actor guidance SHALL expose only the assigned source YAML, cache, receipt, and result facts from its current work-unit contract. It SHALL NOT load `shared/shared-reference-template` as a delegated completion route, declare `reference/00-shared-<slug>.md` in current `output_files[]`, or imply that an actor-authored reference satisfies the current Wave0 shared-reference floor. After formal submit, the Phase-side materialization guidance MAY load the shared template to render a consumer reference from exact submitted backing; that later projection SHALL not retrofit a rich-reference obligation into the actor contract. A bare YAML document without Markdown sections, filesystem presence, a noncanonical filename, an index row, or an otherwise parseable reference with no formal submitted backing SHALL NOT substitute for the source or projection contract. This requirement SHALL NOT create a byte-exact formatting rule, a second parser, a generic Markdown linter, or a new reference metadata authority.

Guidance SHALL keep `reference/_INDEX.md` separate from topic identity authority: it is the accepted eight-column navigation table and must be updated by the normal Wave materialization step. Repair diagnostics SHALL distinguish an invalid/missing table parent from missing rows and SHALL give one nearest same-inspect action without asking the user to run ordinary repair commands.

#### Scenario: source.yaml top-level array is documented

- **WHEN** an Agent reads wave source output instructions
- **THEN** it SHALL see that `source.yaml` starts with YAML list entries at the top level
- **AND** it SHALL see that `{ sources: [...] }`, `wave:`, or `topic:` wrappers are invalid for the current parser

#### Scenario: source.yaml required fields are documented

- **WHEN** an Agent writes a `source.yaml` entry
- **THEN** guidance SHALL require `url`, `title`, `retrieved_date`, and `topic_tag`
- **AND** guidance SHALL state that `retrieved_date` is a string date and `topic_tag` is a string tag usable by gate diagnostics

#### Scenario: YAML serialization guidance avoids common parse failures

- **WHEN** an Agent writes field values containing colons, semicolons, arrows, brackets, or long prose
- **THEN** guidance SHALL instruct it to quote or block-string those values using YAML-safe syntax
- **AND** diagnostics SHALL prefer parser-aligned repair language over generic "cannot parse YAML array"

#### Scenario: Reference metadata uses canonical YAML frontmatter

- **WHEN** an Agent writes `reference/*.md`
- **THEN** guidance SHALL show an opening YAML frontmatter mapping as the accepted metadata form parsed by the shared reference metadata reader
- **AND** it SHALL distinguish legacy bullet compatibility from the canonical new-output form

#### Scenario: Source intake does not receive a current rich-reference completion contract

- **WHEN** a Wave0 source-intake actor receives a generated task
- **THEN** its role guidance SHALL describe only its assigned source/cache/result/receipt obligations
- **AND** it SHALL not receive a shared-reference template or an actor-owned `reference` output declaration as a current completion route

#### Scenario: Wave0 Phase materialization uses submitted backing

- **WHEN** Wave0 convergence identifies a materializable submitted source identity
- **THEN** Phase guidance SHALL use the shared reference template only after formal submit and bind the rendered reference to that exact backing
- **AND** it SHALL rerun the same inspect rather than claim that the template or index row is evidence authority

#### Scenario: Wave1 rerun repair uses normal materialization contract

- **WHEN** Wave1 rerun inspect reports UID binding or index-table drift for historical references
- **THEN** the Phase Agent SHALL repair the named reference projection or index table and rerun the same inspect
- **AND** it SHALL NOT enqueue research solely to change metadata spelling, mass-rewrite already covered historical references, or ask the user to execute the mechanical repair

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

### Requirement: Wave0 Phase-owned shared references SHALL preserve exact submitted source backing

A current Wave0 `reference/00-shared-*.md` may be a Phase-owned consumer projection only after formal submit. Its normal metadata `source_url` and scannable body backing SHALL together bind to one exact retained submitted Wave0 source identity, `<work_id>/<ordinal>`, and to the authenticated source YAML, source URL, cache, result, and work-unit coordinates returned by the existing submitted-backing reader. For one current direct source array with retained prefix contributions, that reader SHALL preserve ledger-ordered accepted source-contribution ownership across prior and current rerun submissions; generic current-round work-unit eligibility SHALL NOT make a later append re-own an earlier ordinal. The body SHALL carry that exact coordinate with the returned backing refs; `source_url` alone is not a source selector. A compatible historical delegated reference continues to use its own submitted output declaration and need not be rewritten as a Phase-owned projection.

The reference file and `_INDEX.md` row SHALL remain reader navigation surfaces. They SHALL not become submitted authority, hide a source-identity collision, or authorize a projection from a URL-only, cache-only, unsubmitted, ambiguous, superseded, filesystem-only, or hand-edited backing claim. This requirement SHALL reuse the existing reference metadata/index format and artifact-persistence boundary; it SHALL not add a new metadata key, index column, source catalog, or reference authority.

#### Scenario: Phase-owned Wave0 reference is backed by one submitted identity

- **WHEN** the Phase Agent materializes a Wave0 shared reference from one authenticated `work-a/7` source identity
- **THEN** the reference metadata and body SHALL identify the submitted source URL and scannable source/cache/work-unit backing for `work-a/7`
- **AND** the reference may be synchronized into `_INDEX.md` without the index row becoming evidence authority

#### Scenario: URL equality alone cannot materialize a projection

- **WHEN** two submitted source contributions contain the same URL or an unsubmitted source YAML contains a matching URL
- **THEN** Phase-owned materialization SHALL require one exact authenticated source identity rather than URL equality alone
- **AND** ambiguous or unsubmitted backing SHALL not create a countable reference

#### Scenario: a later rerun append preserves its prior submitted source identity

- **WHEN** an accepted Wave0 contribution owns source identities `work-a/1` through `work-a/19` and a later rerun submits the retained array plus one new source
- **THEN** the submitted-backing reader SHALL continue to resolve the prior retained identities through `work-a`
- **AND** it SHALL resolve only ordinal `20` through the later work unit rather than re-owning `work-a/1` through the later submission

#### Scenario: legacy delegated reference remains readable

- **WHEN** a historical Wave0 shared reference is declared by a successfully submitted legacy work-unit row
- **THEN** it SHALL remain valid through the recorded delegated-output provenance path
- **AND** Phase materialization SHALL not require a rewrite or duplicate projection

### Requirement: Reference metadata values SHALL be writable as valid YAML and frontmatter failures SHALL name the offending value

Reference metadata written to a `reference/*.md` opening frontmatter mapping SHALL
be valid YAML when committed. An `acceptance_status` value that the Agent-facing
template presents with an inline marker (for example `accepted :warning:`) SHALL
be documented to be quoted in YAML, so the committed mapping parses. When a
reference frontmatter parse fails, the Engine feedback SHALL name the offending
key and value (or the exact serialization rule), rather than reporting only a
generic "YAML parse failed".

#### Scenario: acceptance_status with a warning marker is committed parseable

- **WHEN** an Agent writes `acceptance_status: "accepted :warning:"` (quoted) into
  a reference frontmatter mapping and runs the reference format check
- **THEN** the mapping parses and the reference is accepted
- **AND** the unquoted form is documented as invalid in the Agent-facing template

#### Scenario: frontmatter parse failure names the offending value

- **WHEN** a reference frontmatter fails to parse
- **THEN** the Engine feedback names the offending key and value
- **AND** the feedback directs repair to the exact frontmatter line without
  requiring the Agent to infer it from a generic parser message

### Requirement: Canonical Wave1 locator derivation SHALL be documented in Agent-facing guidance

The one canonical Wave1 reference locator (which returns the exact
`reference/{topic.slug}-{token}-{digest}.md` path from normalized submitted
backing) SHALL have its derivation documented in Agent-facing guidance. The
guidance SHALL state that the canonical filename is derived from the normalized
submitted backing URL as a safe human-readable URL token plus a stable
collision-safe digest, and that an Agent-chosen filename is a repair input, not
a second locator. (The Wave1 reference-floor inspect surfacing of the exact
canonical target per candidate is governed by the Wave1 Intake delta WAI-010.)

#### Scenario: guidance documents the locator derivation

- **WHEN** an Agent reads the Wave1 reference materialization guidance
- **THEN** the guidance states that the canonical filename is derived from the
  normalized submitted backing URL as a safe human-readable URL token plus a
  stable collision-safe digest
- **AND** an Agent-chosen filename is documented as a repair input, not a second
  locator
