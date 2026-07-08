---
node_type: shared
id: shared-reference-template
shared_scope: template
authority: guidance-only
requires: []
suggested_context: []
---

# Shared: Reference File Template

Agent 创建 `reference/*.md` 文件时必须遵循此模板。一个 source 一个文件，存放在平铺的 `reference/` 目录下。

## Naming Convention

| 前缀 | 语义 | 来源 Wave |
|------|------|-----------|
| `00-shared-<slug>.md` | 共享基础 reference，覆盖 ≥2 个 topic 的跨领域知识 | Wave 0 |
| `0N-<slug>.md` | Topic 专属 reference，N = topic_registry 中的 topic 序号 | Wave 1 |
| `00-cross-<slug>.md` | 跨 topic finding 的 reference projection；可以是 existing-backed pure-synthesis projection，也可以是 submitted targeted evidence 的 fetched source | Wave 2 |

`<slug>` 为 kebab-case 标识符，描述该 source 的核心内容。

## Authority And Backing

Reference files are consumer-facing navigation artifacts. They do not gain delegated evidence authority from file presence, `_INDEX.md` presence, or `source_layer`. `source_layer` is not authority; it is only a navigation label.

Phase-owned materialization is legal only after submitted backing exists. The reference body must include scannable body refs or Markdown links to submitted source claims, accepted source URL surfaces, cache trails, explicit degraded-capture records, work-unit refs, prior-wave artifacts that themselves resolve to submitted backing, or Wave2 `W2F-xxx` ledger/index refs. Do not use a new metadata key or `_INDEX.md` column as the authority shortcut.

Wave1 topic references use `source_url` from submitted `wave1_topic_deepening` backing. Existing-backed `00-cross` references use a primary prior accepted backing source URL in `source_url`, then list additional prior-wave source/cache/work-unit refs plus `finding-index.yaml` and `cross-topic-ledger.md` refs in the body. If a `00-cross` reference claims a newly fetched public source, it must bind to submitted `wave2_targeted_evidence` coverage.

## File Format

每个 `reference/*.md` 文件包含两部分：metadata block + 标准 section body。

### Part 1: Metadata Block（必填字段以 **粗体** 标注）

Metadata block 位于文件头部——首个 `## ` header 之前。每行格式：`- key: value`（第一个 `: ` 后的部分为 value）。

This metadata block is the accepted parser contract. It is not YAML frontmatter: do not put metadata between `---` fences, do not write `source_url:` as bare YAML keys, and do not use `sources:` wrappers. `parseReferenceMetadata()` reads only bullet metadata lines before the first section.

**必填字段**（inspect CLI 会检查这些 key 是否存在）：

| Key | 类型 | 说明 |
|-----|------|------|
| **source_url** | URL 列表 | 原始来源 URL，多个用分号分隔 |
| **acceptance_status** | `accepted` / `accepted :warning:` / `EXCLUDED` | 是否采纳 |
| **source_type** | `primary` / `secondary` / `mixed` / `meta` | 来源类型 |
| **tier** | `Tier 1` / `Tier 2` / `Tier 3` / `Tier 4` | 证据层级 |
| **evidence_role** | `foundation` / `primary_topic_reference` / `deepening_reference` / `meta` | 在研究中的作用 |
| **trust_level** | `academic` / `practitioner` / `official` / `caution` / `analyst` / `community` | 信任级别 |
| **why_it_matters** | 一句话 | 为什么跟本次研究相关 |
| **accessed_at** | YYYY-MM-DD | 访问日期 |
| **related_topic** | topic 编号 | 关联的 topic（`all` 或逗号分隔列表） |

可选字段（建议填写）：`source_file`、`source_family`、`topic_unique_status`、`source_date_scope`、`related_entities`、`captured_excerpt`、`supports_claims`、`risks_or_limitations`、`excluded_reason`。

### Part 2: Standard Sections（五个 section，顺序固定）

每个文件必须包含以下五个 `## ` section header：

1. `## Key Facts` — 定量 + 定性事实的 bullet list
2. `## Core Content Capture` — narrative synthesis paragraph（一段话概括）
3. `## Relevance To This Research` — 为什么这条 source 对本次研究重要
4. `## Quotable Terms / Concepts` — 可用于最终报告的引述或概念
5. `## Risks And Limitations` — 诚实声明：此 source 不能支持什么

Section header 名称必须精确匹配（大小写敏感），不能改为 `## Key facts` 或 `## Key Facts `（尾部空格）。

## Example

```markdown
# AI Agent Taxonomy & Enterprise Deployment 2025-2026

- source_url: https://example.com/agent-taxonomy
- acceptance_status: accepted
- source_type: secondary (industry framework synthesis)
- tier: Tier 2
- evidence_role: foundation
- trust_level: practitioner
- why_it_matters: All topics use "AI agent" language — shared taxonomy needed for cross-topic comparison
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts

- Fact 1: ...
- Fact 2: ...

## Core Content Capture

This source describes...

## Relevance To This Research

This taxonomy provides the shared language for...

## Quotable Terms / Concepts

- "Key phrase from source"

## Risks And Limitations

- Limitation 1: ...
```
