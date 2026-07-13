> req: REF-002, REF-003, REF-007

## MODIFIED Requirements

### Requirement: Rich MD reference file template

每个 `reference/*.md` 文件 SHALL 遵循一致的 rich MD 模板，包含：

1. **Metadata block**（文件头部，无 YAML fence，colon-separated key-value）：
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

2. **Standard semantic sections**：
   - `## Key Facts`（bullet list，定量 + 定性事实）
   - `## Core Content Capture`（narrative synthesis paragraph）
   - `## Relevance To This Research`（为什么跟本次研究相关）
   - `## Quotable Terms / Concepts`（可用于最终报告的引述或概念）
   - `## Risks And Limitations`（诚实声明：此 source 不能支持什么）

The five semantic sections SHALL remain required and non-empty, but the shared parser SHALL identify them tolerantly across harmless heading case, heading level, surrounding spacing, and section order differences. Exact `##` level, a fixed section order, a fixed prose character count, and a fixed number of `Key Facts` bullets SHALL NOT be blocking authority. `Key Facts` count or prose-richness feedback MAY remain advisory; `Core Content Capture` SHALL remain a distinct narrative semantic section rather than being inferred from the Key Facts list.

#### Scenario: Reference file has complete metadata

- **WHEN** Agent 创建 reference `.md` 文件
- **THEN** 文件 SHALL 包含所有 common required metadata 字段和一个可解析 topic binding
- **AND** 字段格式遵循 colon-separated key-value 约定

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

#### Scenario: Harmless Markdown presentation does not block

- **WHEN** a reference exposes all five semantic sections but differs only in heading case, heading level, whitespace, ordering, prose length, or Key Facts bullet count
- **THEN** reference-format parsing SHALL accept the equivalent semantic structure or emit advisory feedback
- **AND** presentation differences alone SHALL NOT fail the reference or reduce its numeric count eligibility

#### Scenario: Missing semantic section remains one format root

- **WHEN** an accepted reference lacks a non-empty `Core Content Capture` section
- **THEN** the shared reference-format evaluator SHALL return that one missing semantic-section root
- **AND** count-floor SHALL NOT repeat it as a thin-content or zero-count symptom


### Requirement: _INDEX.md as canonical reference inventory

`reference/_INDEX.md` SHALL 作为 machine-readable reference inventory table。格式为 Markdown table，包含以下列：

| Column | 说明 |
|--------|------|
| `ref_file` | 文件名 |
| `source_type` | primary / secondary / mixed / meta |
| `trust_level` | academic / practitioner / official / caution / analyst / community |
| `tier` | Tier 1-4 |
| `related_topic` | consumer-navigation topic label; not canonical topic authority |
| `source_layer` | `wave0_foundation` / `wave1_topic` / `wave2_cross` |
| `acceptance_status` | accepted / accepted ⚠️ / EXCLUDED |
| `date_landed` | YYYY-MM-DD（文件创建日期） |

Header 行 SHALL 包含 Run 名称、Last updated 日期、reference 计数摘要。

每个 wave 完成时 Agent SHALL 更新 `_INDEX.md`：新增该 wave 产出的 reference 条目，更新 Last updated 日期和计数摘要。Rerun classification SHALL reuse this same normal Wave materialization responsibility; topic-state mutation SHALL NOT rewrite the reference index. A prose link list or per-topic count summary SHALL NOT substitute for the accepted machine-readable table.

Index validation SHALL check the table parent before per-file row coverage. If the required table/header cannot be parsed, inspect and gate SHALL return one `reference_index_table_invalid` or equivalent root with `reference/_INDEX.md` as the repair target and SHALL mask per-file `missing_index_row` symptoms until the parent is valid. Once the table is valid, independently missing or wrong-layer rows SHALL remain blocking navigation drift. The `related_topic` column remains a projection and SHALL NOT override reference metadata's canonical resolver result.

#### Scenario: _INDEX.md header contains run metadata

- **WHEN** `_INDEX.md` 被创建或更新
- **THEN** header 行 SHALL 包含 Run 名称、Last updated 日期、refs counted 摘要

#### Scenario: _INDEX.md has one row per reference file

- **WHEN** `reference/` 中有 N 个 `.md` reference 文件（不含 `_INDEX.md` 和 `README.md`）
- **THEN** `_INDEX.md` 的 table SHALL 包含恰好 N 行数据

#### Scenario: Each wave updates _INDEX.md

- **WHEN** wave 0/1/2 完成 reference 文件创建
- **THEN** Agent SHALL 在 gate check 前更新 `_INDEX.md`
- **AND** 新条目 SHALL 出现在 table 中

#### Scenario: Summary list is one parent failure

- **WHEN** `_INDEX.md` contains human-readable links/counts but no accepted eight-column table
- **THEN** Wave inspect/gate SHALL report one invalid-table parent root
- **AND** SHALL NOT emit one missing-row blocker for every reference file until the table is repaired

#### Scenario: Valid table still exposes actual missing rows

- **WHEN** `_INDEX.md` has the accepted table but omits one materialized Wave1 reference or gives it the wrong `source_layer`
- **THEN** reference index coverage SHALL identify that file after parent validation passes
- **AND** the nearest action SHALL be to repair the table row and rerun the same Wave1 inspect


### Requirement: Agent-facing source.yaml and reference metadata formats SHALL be parser-aligned and complete

Agent-facing phase docs, shared schema docs, work-unit tasks, and repair diagnostics SHALL describe `artifacts/waveN/{topic}/source.yaml` in the exact shape parsed by the Engine: a top-level YAML array where each entry includes at least `url`, `title`, `retrieved_date`, and `topic_tag`. Guidance SHALL warn that wrapping entries under `sources:`, `wave:`, or `topic:` produces an object and is invalid for this parser.

Reference Markdown metadata SHALL be documented as bullet or colon-separated metadata in the accepted project format, not YAML frontmatter. Guidance SHALL describe the eight common required fields plus one topic-binding form, explain that `related_topic_uid` and legacy `related_topic` feed the same canonical resolver, and state that conflicting dual declarations fail. Normal first-run guidance MAY retain its current legacy producer form; rerun/history guidance SHALL NOT require mass rewriting of already covered references merely to change identity spelling.

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

#### Scenario: Reference metadata is not YAML frontmatter

- **WHEN** an Agent writes `reference/*.md`
- **THEN** guidance SHALL identify the accepted metadata format parsed by `parseReferenceMetadata()`
- **AND** it SHALL warn that YAML frontmatter fences are not the current reference metadata contract

#### Scenario: Wave1 rerun repair uses normal materialization contract

- **WHEN** Wave1 rerun inspect reports UID binding or index-table drift for historical references
- **THEN** the Phase Agent SHALL repair the named reference projection or index table and rerun the same inspect
- **AND** it SHALL NOT enqueue research solely to change metadata spelling, mass-rewrite already covered historical references, or ask the user to execute the mechanical repair
