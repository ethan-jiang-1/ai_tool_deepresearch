# Rerun Topic Integration

> req: RTI-001, RTI-002, RTI-003

## Purpose

当 HITL2 用户选择 rerun 并新增 topic 时，确保该 topic 的 reference 文件符合规范格式、wave2 cross-topic 合成完整覆盖新 topic（全量重合成而非 delta/append）、gate 能检测内容质量逃逸。消除 BUG-007：三个链断裂在 rerun 增量 topic 场景同时触发导致 gate 全绿但语义集成未发生。

## Requirements

### Requirement: Sub-agent reference file format specification

`phase-wave1-subagent.md` SHALL 包含 reference 文件格式规范，与 `shared-reference-template.md` 的 metadata block 格式对齐。

格式规范 SHALL 包含：
- 文件命名：`reference/{topic.slug}-<source-slug>.md`
- 元数据块：9 个必填字段（`source_url`、`acceptance_status`、`source_type`、`tier`、`evidence_role`、`trust_level`、`why_it_matters`、`accessed_at`、`related_topic`），使用 `- key: value` 格式，位于首个 `## ` header 之前
- 5 个标准 section header：`## Key Facts`、`## Core Content Capture`、`## Relevance To This Research`、`## Quotable Terms / Concepts`、`## Risks And Limitations`，顺序固定

该规范 SHALL 与 `shared-reference-template.md` 保持一致。Phase Agent 构造 task card 时 SHALL 将此格式规范内联到 `action` 字段中（已存在于 `phase-wave1.md` L58 和 L285-289）。

#### Scenario: Sub-agent role definition includes reference format

- **WHEN** Phase Agent 读取 `phase-wave1-subagent.md` 以构造 sub-agent 的任务上下文
- **THEN** §2 Artifacts section SHALL 在 evidence-summary 和 question-list 格式规范之后，包含 reference 文件格式规范
- **AND** 格式规范 SHALL 引用 `shared-reference-template.md` 的具体字段和 section header 名称

#### Scenario: Task card action text includes reference format checklist

- **WHEN** Phase Agent 为 wave1 deepening 创建 task card
- **THEN** `action` 字段 SHALL 包含 reference 文件格式的完整 checklist（9 个 metadata 字段名 + 5 个 `##` section header 名）
- **AND** checklist SHALL 明确指出使用 metadata block 格式（`- key: value`），不使用 YAML frontmatter（`---`）

### Requirement: Wave2 full re-synthesis on action:add rerun

`phase-wave2.md` 的 Rerun-Aware Behavior section SHALL 区分 `action: add` 和 `action: supplement` 两种 rerun 场景。

当 `action: add`（新增 topic）时，Phase Agent SHALL 执行全量重合成：
- 重读所有 topic 的 evidence-summary.md（包括新增 topic）
- 重建 cross-topic scan matrix（从 N×N 扩展为 (N+1)×(N+1)）
- 从 scratch 重新生成 `synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml`
- 旧 synthesis 可保留为 `synthesis.prev-rerun-N.md` 备份，但不作为 baseline

当 `action: supplement`（已有 topic 增加维度）时，保持当前 delta/append 模式。

#### Scenario: action:add triggers full wave2 re-synthesis

- **WHEN** seed topic 文件 `## 本轮重跑方向` section 中 `action: add`
- **THEN** Phase Agent SHALL 重读所有 topic（包括新增）的 evidence-summary.md
- **AND** Phase Agent SHALL 重建 scan matrix 覆盖全部 (N+1)×(N+1)/2 对 topic pair
- **AND** Phase Agent SHALL 从 scratch 生成 synthesis.md（不保留 delta section header 标记）
- **AND** Phase Agent SHALL NOT 使用 delta/append 模式

#### Scenario: action:supplement keeps delta/append mode

- **WHEN** seed topic 文件 `## 本轮重跑方向` section 中 `action: supplement`
- **THEN** Phase Agent SHALL 保留已有 synthesis 为 baseline
- **AND** 新增分析作为 delta section 追加（`## Delta Synthesis (Rerun N)`）

### Requirement: Gate content quality rules for reference files

Gate wave1-complete SHALL 包含以下内容质量规则，在 structural check 之上提供 semantic quality 验证：

1. **`source_url_article_level`**：reference 文件的 `source_url` SHALL 指向 article 级 URL（path depth ≥ 2），SHALL NOT 为 homepage（path 为 `/`、空、或仅 `/index.*`）。检测范围：filesystem 中所有 `reference/*{topic}*.md` 文件，不依赖 declaration ledger。

2. **`key_facts_min_lines`**：reference 文件的 `## Key Facts` section SHALL 包含至少 5 行以 `- ` 开头的实质性条目。检测范围：filesystem 中所有 `reference/*{topic}*.md` 文件。

3. **`ledger_coverage`**：filesystem 中 `reference/*{topic}*.md` 的文件数 SHALL ≤ `rb_output_declarations.jsonl` 中 `role === 'reference'` 且 path 匹配同一 glob 的声明数。若 filesystem 中的 reference 文件未被声明进 ledger，gate SHALL fail。

#### Scenario: Homepage URL rejected by article-level check

- **WHEN** reference 文件包含 `source_url: https://m-en.yna.co.kr/`
- **THEN** `source_url_article_level` rule SHALL fail
- **AND** inspect SHALL 列出该文件路径和 homepage URL

#### Scenario: Article URL passes article-level check

- **WHEN** reference 文件包含 `source_url: https://m-en.yna.co.kr/view/AEN20260113007053315`
- **THEN** `source_url_article_level` rule SHALL pass

#### Scenario: Thin Key Facts section fails min-lines check

- **WHEN** reference 文件的 `## Key Facts` section 仅含 3 行 `- ` 条目
- **THEN** `key_facts_min_lines` rule SHALL fail
- **AND** inspect SHALL 列出该文件路径和实际行数

#### Scenario: Filesystem-ledger mismatch detected

- **WHEN** filesystem 中有 8 个 `reference/05_south-korea-factor-*.md` 文件
- **AND** `rb_output_declarations.jsonl` 中仅 3 个 `role === 'reference'` 声明指向该 topic
- **THEN** `ledger_coverage` rule SHALL fail
- **AND** inspect SHALL 列出未被声明的文件路径

### Requirement: content_dedup filesystem fallback

`checkContentDedup()` SHALL 当 declaration ledger 中 `role === 'reference'` 的 entry 数量为 0 时，回退扫描 `reference/` 目录中匹配 topic slug pattern 的文件。

Fallback 模式下：
- 扫描 filesystem 获取 `reference/*{topic}*.md` 文件列表
- 对每个文件执行与 ledger 模式相同的检查：URL dedup、homepage detect、self-referential check、Jaccard clone detection
- `source_url` 从文件内容中解析（metadata block 中的 `- source_url:` 行）
- 若文件使用 YAML frontmatter 格式（`---`），`source_url` 解析失败时 gate SHALL fail 并返回 inspect 说明格式不兼容

#### Scenario: Empty ledger triggers filesystem fallback

- **WHEN** `rb_output_declarations.jsonl` 存在但不含任何 `role === 'reference'` 的 declaration
- **THEN** `checkContentDedup()` SHALL 扫描 `reference/` 目录
- **AND** 对扫描到的文件执行完整的 dedup + homepage + self-ref + Jaccard 检查

#### Scenario: YAML frontmatter reference fails fallback

- **WHEN** filesystem fallback 遇到使用 YAML frontmatter（`---`）格式的 reference 文件
- **AND** 无法从 frontmatter 中解析出 `source_url`
- **THEN** `content_dedup` SHALL fail
- **AND** inspect SHALL 说明该文件格式不支持，需转换为 metadata block 格式
