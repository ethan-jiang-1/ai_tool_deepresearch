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
| `00-cross-<slug>.md` | 跨 topic 发现 reference，cross-topic scan 时涌现的新共享 source | Wave 2 |

`<slug>` 为 kebab-case 标识符，描述该 source 的核心内容。

## File Format

每个 `reference/*.md` 文件包含两部分：metadata block + 标准 section body。

### Part 1: Metadata Block（必填字段以 **粗体** 标注）

Metadata block 位于文件头部——首个 `## ` header 之前。每行格式：`- key: value`（第一个 `: ` 后的部分为 value）。

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
