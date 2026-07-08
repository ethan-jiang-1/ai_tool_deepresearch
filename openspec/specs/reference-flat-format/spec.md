# Reference Flat Format

> req: REF-001, REF-002, REF-003, REF-004, REF-005, REF-006, REF-007, REF-008

## Purpose

定义 `reference/` 目录的扁平化约定：三级命名前缀（`00-shared-` / `{topic_slug}-<qualifier>` / `00-cross-`）、rich MD 单文件单 source 格式、`_INDEX.md` 作为 canonical inventory、`README.md` 作为人类导航。对标 `deep_research_ai_cases/topics/_reference` 的成熟实践，实现"人类一眼能看明白"的 evidence 目录。

## Requirements

### Requirement: Flat reference directory with three-level naming prefixes

`reference/` SHALL 为扁平目录（无子目录），所有 reference 文件以 `.md` 结尾、平铺在同一层级。文件命名 SHALL 使用三级前缀：

- `00-shared-<slug>.md` — 共享基础 reference，由 wave 0 产出，覆盖 ≥2 个 topic 的跨领域知识
- `{topic_slug}-<qualifier>.md` — topic 专属 reference，由 wave 1 产出，覆盖单个 topic 的 source。`{topic_slug}` SHALL 为 topic 的完整 slug（含 `NN_` 编号前缀，如 `01_meal-timing-...`），`<qualifier>` SHALL 为该 source 的短标识符（如作者名、机构名、关键词）
- `00-cross-<slug>.md` — 跨 topic 发现 reference，由 wave 2 产出，在 cross-topic scan 时涌现的新共享 source

`<slug>` SHALL 为 kebab-case 标识符，描述该 source 的核心内容。

#### Scenario: Wave 0 produces shared foundation references only

- **WHEN** wave 0 检索共享基础 evidence
- **THEN** Agent 为每条共享 source 创建 `reference/00-shared-<slug>.md`
- **AND** 文件名以 `00-shared-` 开头

#### Scenario: Wave 1 produces topic-specific references with slug-based prefix

- **WHEN** wave 1 为 topic（slug = `01_meal-timing-blood-glucose-insulin`）检索深挖 evidence
- **THEN** Agent 为每条 topic 专属 source 创建 `reference/01_meal-timing-blood-glucose-insulin-<qualifier>.md`
- **AND** 文件名以 topic 的完整 slug 开头，后跟 `-` 和 qualifier
- **AND** `ls reference/` 下同一 topic 的 reference 文件自然聚拢（共享 `01_meal-timing-...` 前缀）

#### Scenario: Wave 2 produces cross-topic discovery references

- **WHEN** wave 2 cross-topic scan 发现新的 ≥2 topic 共享 source
- **THEN** Agent 创建 `reference/00-cross-<slug>.md`
- **AND** 文件名以 `00-cross-` 开头，与 wave 0 的 `00-shared-` 区分

#### Scenario: Directory is flat and scannable

- **WHEN** 用户执行 `ls reference/`
- **THEN** 所有 reference 文件在同一层级可见
- **AND** 不存在 `reference/<topic>/` 或 `reference/00_shared/` 等子目录

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
   - `related_topic`: topic 编号（`all` 或逗号分隔列表）
   - `trust_level`: `academic` / `practitioner` / `official` / `caution` / `analyst` / `community`
   - `why_it_matters`: 为什么这条 source 对 research 重要
   - `related_entities`: 逗号分隔的关联实体列表
   - `captured_excerpt`: `yes` / `no`
   - `supports_claims`: 该 source 支持的 claim 列表
   - `risks_or_limitations`: 已知风险或局限
   - `excluded_reason`: `_none_` 或排除原因

2. **Standard sections**（Markdown `##` headers）：
   - `## Key Facts`（bullet list，定量 + 定性事实）
   - `## Core Content Capture`（narrative synthesis paragraph）
   - `## Relevance To This Research`（为什么跟本次研究相关）
   - `## Quotable Terms / Concepts`（可用于最终报告的引述或概念）
   - `## Risks And Limitations`（诚实声明：此 source 不能支持什么）

#### Scenario: Reference file has complete metadata

- **WHEN** Agent 创建 reference `.md` 文件
- **THEN** 文件 SHALL 包含所有 required metadata 字段
- **AND** 字段格式遵循 colon-separated key-value 约定

#### Scenario: Reference file has all standard sections

- **WHEN** Agent 创建 reference `.md` 文件
- **THEN** 文件 SHALL 包含 `## Key Facts`、`## Core Content Capture`、`## Relevance To This Research`、`## Quotable Terms / Concepts`、`## Risks And Limitations` 五个 section

### Requirement: _INDEX.md as canonical reference inventory

`reference/_INDEX.md` SHALL 作为 machine-readable reference inventory table。格式为 Markdown table，包含以下列：

| Column | 说明 |
|--------|------|
| `ref_file` | 文件名 |
| `source_type` | primary / secondary / mixed / meta |
| `trust_level` | academic / practitioner / official / caution / analyst / community |
| `tier` | Tier 1-4 |
| `related_topic` | 关联 topic |
| `source_layer` | `wave0_foundation` / `wave1_topic` / `wave2_cross` |
| `acceptance_status` | accepted / accepted ⚠️ / EXCLUDED |
| `date_landed` | YYYY-MM-DD（文件创建日期） |

Header 行 SHALL 包含 Run 名称、Last updated 日期、reference 计数摘要。

每个 wave 完成时 Agent SHALL 更新 `_INDEX.md`：新增该 wave 产出的 reference 条目，更新 Last updated 日期和计数摘要。

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

### Requirement: README.md as human navigation for reference directory

`reference/README.md` SHALL 提供人类可读的 reference 目录导航，包含：

- Reference evidence 的简短说明（本次 run 的 purpose）
- Naming convention：`00-shared-*` / `00-cross-*` / `0N-*` 的语义
- Reference format：每个文件遵循的 rich MD 模板简述
- Navigation：指向 `_INDEX.md`（machine-readable inventory）和本 README（human overview）

#### Scenario: README explains naming convention

- **WHEN** 用户打开 `reference/README.md`
- **THEN** 能立即理解 `00-shared-`、`00-cross-`、`0N-` 三种前缀的语义

### Requirement: Phase nodes enforce reference file naming convention

Phase node body 中的 Expected Artifacts 和 Allowed Actions 节 SHALL 明确要求 Agent 按三级前缀创建 reference 文件，SHALL NOT 指示 Agent 创建 `reference/<topic>/` 子目录或 `source.yaml` 文件。

#### Scenario: Wave0 phase instructs agent to create 00-shared files

- **WHEN** Agent 读取 `phase-wave0.md` 的 Expected Artifacts 节
- **THEN** 指令 SHALL 要求创建 `reference/00-shared-<slug>.md`（非 `reference/<topic>/source.yaml`）

#### Scenario: Wave1 phase instructs agent to create topic-slug-prefixed files

- **WHEN** Agent 读取 `phase-wave1.md` 的 Expected Artifacts 节
- **THEN** 指令 SHALL 要求创建 `reference/{topic_slug}-<qualifier>.md`（topic_slug 为含 `NN_` 前缀的完整 slug）
- **AND** SHALL NOT 要求创建 `reference/0N-<slug>.md`（`0N-` 前缀已被 slug 内置的 `NN_` 取代）

### Requirement: Wave1 sub-agent reference file format specification

Wave1 topic reference file format SHALL remain aligned with `shared-reference-template.md`, but canonical Wave1 topic reference materialization SHALL be Phase-owned after successful work-unit submit. Sub-agent role/task guidance SHALL provide source evidence, source claims, cache trails, and optional source-candidate details needed for materialization; it SHALL NOT make rich topic reference Markdown a required delegated receipt unless a separate accepted task explicitly assigns that output.

The format specification SHALL be available to the Phase Agent materialization guidance and to any work-unit task that is explicitly assigned a reference output. The format SHALL align with `shared-reference-template.md`:

- **Metadata block**: at the top of the file, before the first `## ` header. Each line in `- key: value` format. 9 required fields: `source_url`, `acceptance_status`, `source_type`, `tier`, `evidence_role`, `trust_level`, `why_it_matters`, `accessed_at`, `related_topic`
- **5 standard sections** (`## ` headers, fixed order): Key Facts, Core Content Capture, Relevance To This Research, Quotable Terms / Concepts, Risks And Limitations
- **Explicitly exclude YAML frontmatter**: reference files SHALL NOT use `---` wrapped YAML frontmatter format

#### Scenario: Phase Agent guidance includes reference format spec

- **WHEN** the Phase Agent materializes Wave1 topic references after successful submit
- **THEN** the materialization guidance SHALL include or point to the reference metadata and section format
- **AND** the generated reference SHALL list 9 metadata field names and 5 section header names
- **AND** the reference SHALL forbid YAML frontmatter format

#### Scenario: Sub-agent role is not canonical reference presentation owner

- **WHEN** a Wave1 work-unit task is generated for `dpt-evidence-extractor`
- **THEN** the task SHALL require submitted source evidence, source claims, cache trails, result, and receipt surfaces
- **AND** it SHALL NOT require canonical topic reference presentation as a delegated receipt unless that task explicitly assigns reference output under an accepted output contract

#### Scenario: Explicitly assigned reference output uses same format

- **WHEN** a future or supplementary accepted work-unit task explicitly assigns a rich reference Markdown output
- **THEN** that output SHALL use the same metadata block and five standard sections
- **AND** it SHALL still require submitted source/cache backing before it can count as fetched-source evidence

### Requirement: Agent-facing source.yaml and reference metadata formats SHALL be parser-aligned and complete

Agent-facing phase docs, shared schema docs, work-unit tasks, and repair diagnostics SHALL describe `artifacts/waveN/{topic}/source.yaml` in the exact shape parsed by the Engine: a top-level YAML array where each entry includes at least `url`, `title`, `retrieved_date`, and `topic_tag`. Guidance SHALL warn that wrapping entries under `sources:`, `wave:`, or `topic:` produces an object and is invalid for this parser.

Reference Markdown metadata SHALL be documented as bullet or colon-separated metadata in the accepted project format, not YAML frontmatter. Guidance SHALL include enough examples for an Agent to write valid files without inferring schema shape from gate errors.

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

### Requirement: Phase-owned reference materializations SHALL preserve submitted source backing

Phase-owned reference files SHALL be consumer-facing projections, not alternate delegated evidence authority. A Phase-owned reference SHALL identify concrete backing from submitted source claims, accepted source URLs, cache trails, explicit degraded-capture records, work-unit refs, prior-wave artifacts that themselves bind to submitted/prior accepted backing, or Wave2 ledger/index findings. It SHALL NOT introduce accepted fetched-source evidence that lacks submitted work-unit or prior accepted backing.

For Wave1 topic references, backing SHALL come from submitted `wave1_topic_deepening` rows and their source/cache/degraded-capture claims. For Wave2 existing-backed cross references, backing SHALL ultimately bind to already submitted Wave0/Wave1 source/cache/degraded-capture/work-unit evidence plus Wave2 `W2F-xxx` ledger/index process evidence. For Wave2 new external evidence, backing SHALL come from submitted `wave2_targeted_evidence` rows.

This change SHALL NOT require a new required reference metadata key or a new required `_INDEX.md` column to classify Phase-owned projections. Classification SHALL use the existing reference metadata block, `_INDEX.md` rows and `source_layer`, submitted source claims, accepted source URL surfaces, cache/degraded-capture/work-unit ledgers, output declarations, and Wave2 `W2F-xxx` ledger/index refs. `source_layer` is a navigation label and SHALL NOT be sufficient authority by itself.

For existing-backed Wave2 `00-cross` references, the required `source_url` metadata field SHALL point to a primary already accepted backing source URL when the current reference format requires a single URL. It SHALL NOT introduce a novel external URL. Additional prior-wave backing sources, work-unit refs, cache refs, and `W2F-xxx` refs SHALL be listed in the reference body using bundle-relative refs or Markdown links that gates/inspectors can scan. If no single accepted primary source URL exists, the Phase Agent SHALL split the finding into source-backed references, repair backing/index records, or record a limitation rather than inventing a synthetic public URL.

#### Scenario: Wave1 topic reference cites submitted backing

- **WHEN** the Phase Agent writes `reference/{topic_slug}-<source-slug>.md`
- **THEN** the reference SHALL cite submitted Wave1 source claims, accepted source URL surfaces, cache trails, explicit degraded-capture records, or work-unit refs for its `source_url`
- **AND** those backing refs SHALL appear as bundle-relative refs or Markdown links in the reference body where gates or inspectors can scan them
- **AND** `_INDEX.md` SHALL include a row for the reference

#### Scenario: Wave2 existing-backed cross reference cites prior evidence

- **WHEN** the Phase Agent writes `reference/00-cross-*.md` during pure synthesis
- **THEN** the reference SHALL cite a `W2F-xxx` id and concrete Wave0/Wave1 backing refs
- **AND** it SHALL NOT claim new fetched-source discovery unless targeted evidence was submitted

#### Scenario: cross reference source_url is prior accepted backing

- **WHEN** the Phase Agent writes an existing-backed `reference/00-cross-*.md`
- **THEN** its `source_url` metadata SHALL identify a primary prior accepted backing source URL when a single source URL is required by the flat reference format
- **AND** any additional backing sources or work-unit refs SHALL appear as bundle-relative refs or Markdown links in the reference body
- **AND** a synthetic or newly searched public URL SHALL NOT be used to satisfy `source_url`

#### Scenario: unbacked reference is diagnostic, not authority

- **WHEN** a reference file exists with a source URL or claim that cannot be tied to submitted or prior accepted backing
- **THEN** gates or inspectors SHALL report it as unbacked drift or repair input
- **AND** it SHALL NOT count as delegated fetched-source coverage

#### Scenario: source layer is not authority by itself

- **WHEN** `_INDEX.md` lists a reference row with `source_layer: wave2_cross` or another legal navigation layer
- **AND** the reference lacks deterministic backing through submitted source claims, accepted source URL surfaces, cache/degraded-capture/work-unit ledgers, or Wave2 finding refs
- **THEN** the row SHALL NOT make the reference accepted evidence
- **AND** gates or inspectors SHALL diagnose missing backing rather than infer authority from the layer label
