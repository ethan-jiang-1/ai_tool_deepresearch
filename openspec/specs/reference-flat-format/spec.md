# Reference Flat Format

> req: REF-001, REF-002, REF-003, REF-004, REF-005

## Purpose

定义 `reference/` 目录的扁平化约定：三级命名前缀（`00-shared-` / `00-cross-` / `0N-`）、rich MD 单文件单 source 格式、`_INDEX.md` 作为 canonical inventory、`README.md` 作为人类导航。对标 `deep_research_ai_cases/topics/_reference` 的成熟实践，实现"人类一眼能看明白"的 evidence 目录。

## Requirements

### Requirement: Flat reference directory with three-level naming prefixes

`reference/` SHALL 为扁平目录（无子目录），所有 reference 文件以 `.md` 结尾、平铺在同一层级。文件命名 SHALL 使用三级前缀：

- `00-shared-<slug>.md` — 共享基础 reference，由 wave 0 产出，覆盖 ≥2 个 topic 的跨领域知识
- `00-cross-<slug>.md` — 跨 topic 发现 reference，由 wave 2 产出，在 cross-topic scan 时涌现的新共享 source
- `0N-<slug>.md`（N 为 1-based topic 序号，与 `rb_plan.md` 的 `topic_registry` 中的 topic id 一致）— topic 专属 reference，由 wave 1 产出，覆盖单个 topic 的 source

`<slug>` SHALL 为 kebab-case 标识符，描述该 source 的核心内容。

#### Scenario: Wave 0 produces shared foundation references only

- **WHEN** wave 0 检索共享基础 evidence
- **THEN** Agent 为每条共享 source 创建 `reference/00-shared-<slug>.md`
- **AND** 文件名以 `00-shared-` 开头

#### Scenario: Wave 1 produces topic-specific references

- **WHEN** wave 1 为 topic 03 检索深挖 evidence
- **THEN** Agent 为每条 topic 专属 source 创建 `reference/03-<slug>.md`
- **AND** 前缀编号 `03` 与 topic_registry 中该 topic 的 id 一致

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

#### Scenario: Wave1 phase instructs agent to create topic-prefixed files

- **WHEN** Agent 读取 `phase-wave1.md` 的 Expected Artifacts 节
- **THEN** 指令 SHALL 要求创建 `reference/0N-<slug>.md`（按 topic_registry 中的 topic id）
