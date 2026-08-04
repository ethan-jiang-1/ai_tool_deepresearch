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
| `{current-topic.slug}-{deterministic-source-qualifier}.md` | Topic 专属 canonical reference；完整 current slug 加从 normalized submitted backing URL 得到的 deterministic qualifier | Wave 1 |
| `00-cross-<slug>.md` | 跨 topic finding 的 reference projection；可以是 existing-backed pure-synthesis projection，也可以是 submitted targeted evidence 的 fetched source | Wave 2 |

`<slug>` 为 kebab-case 标识符，描述该 source 的核心内容。

## Authority And Backing

Reference files are consumer-facing navigation artifacts. They do not gain delegated evidence authority from file presence, `_INDEX.md` presence, or `source_layer`. `source_layer` is not authority; it is only a navigation label.

Phase-owned materialization is legal only after submitted backing exists. The reference body must include scannable body refs or Markdown links to submitted source claims, accepted source URL surfaces, cache trails, explicit degraded-capture records, work-unit refs, prior-wave artifacts that themselves resolve to submitted backing, or Wave2 `W2F-xxx` ledger/index refs. Do not use a new metadata key or `_INDEX.md` column as the authority shortcut.

Wave1 topic references use `source_url` from submitted `wave1_topic_deepening` backing. Existing-backed `00-cross` references use a primary prior accepted backing source URL in `source_url`, then list additional prior-wave source/cache/work-unit refs plus `finding-index.yaml` and `cross-topic-ledger.md` refs in the body. If a `00-cross` reference claims a newly fetched public source, it must bind to submitted `wave2_targeted_evidence` coverage.

For Wave0, only the Phase Agent may materialize `00-shared-<slug>.md` after
formal submit and a Wave0 convergence result returns one exact submitted source
identity. Its `source_url` plus scannable body must name `<work_id>/<ordinal>`
and the returned source-YAML, cache, result, and work-unit refs. The current
source-intake actor does not write this file, and a URL, bare work ID, file, or
index row alone cannot select its backing.

For Wave1, obtain `reference/{current-topic.slug}-{deterministic-source-qualifier}.md` from the canonical locator using one manifest-snapshot-bound submitted backing candidate. Its normalized metadata `source_url` and body refs must bind to that exact candidate's submitted source, cache/degraded trail, and work-unit coordinates. `NN-wave1-*` is legacy navigation history and a current Topic file with another name is a repair diagnostic; neither can satisfy current coverage. After persistence, run `sync-reference-index`; never hand-append index rows.

When the Phase Agent materializes a backed reference projection, write the complete file to a retained staging path first, then commit it with `operate-artifact-persistence.mjs persist` using `--expect-absent` or the observed target SHA-256. Consume the JSON verdict before updating `_INDEX.md`. This durability step does not create backing or delegated authority; the submitted source/cache/work-unit contract above remains decisive.

## File Format

每个 `reference/*.md` 文件包含两部分：opening YAML-frontmatter metadata mapping + 标准 section body。

### Part 1: Metadata Block（必填字段以 **粗体** 标注）

New files begin with one `---`-delimited YAML mapping, before the Markdown title and the first recognized semantic section. Quote YAML-sensitive values or use YAML block syntax for long prose.

This opening mapping is the canonical writer contract. `readReferenceMetadata()` supplies its semantic values to format, URL, index, count, and backing consumers. Existing legacy `- key: value` lines before the first semantic section remain read-compatible only; do not choose that retired presentation for a new file. Do not use a `sources:` wrapper or a non-mapping YAML root. If inspect reports `reference_metadata_frontmatter_invalid`, repair the opening mapping itself; if a valid mapping is missing one required key, repair that named key and rerun the same checkpoint.

**必填 contract facts**（inspect CLI 会检查这些 key 是否存在且非空）：八个 common metadata fields，加一个可解析的 Topic binding。Topic binding 可以使用 exact registered `related_topic_uid`（或 `all`），也可以兼容使用 `related_topic` 的 exact current/previous id、slug、逗号列表（或 `all`）。两种形式同时出现时必须解析一致。

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
| **related_topic_uid** | UID / `all` | Canonical binding：一个 exact registered Topic UID 或 `all` |
| **related_topic** | id / slug 列表 / `all` | Compatibility binding：exact current/previous id 或 slug，多个用逗号分隔 |

可选字段（建议填写）：`source_file`、`source_family`、`topic_unique_status`、`source_date_scope`、`related_entities`、`captured_excerpt`、`supports_claims`、`risks_or_limitations`、`excluded_reason`。

### Part 2: Required Semantic Sections

Each file must contain all five semantic sections; every section is required and non-empty：

1. `## Key Facts` — 定量 + 定性事实的 bullet list
2. `## Core Content Capture` — narrative synthesis paragraph（一段话概括）
3. `## Relevance To This Research` — 为什么这条 source 对本次研究重要
4. `## Quotable Terms / Concepts` — 可用于最终报告的引述或概念
5. `## Risks And Limitations` — 诚实声明：此 source 不能支持什么

上面的 spelling 是推荐的 canonical presentation。Parser 对 heading case、heading level（`#` 到 `######`）、空格、slash 两侧空格和 section order 宽容；bullet、numbered list 或 paragraph 等等价 list presentation 也不作为 blocking 条件。语义 section 本身仍必须可识别且非空，`Key Facts` 与 `Core Content Capture` 不能互相替代，也没有固定 Key Facts 数量要求。

## Example

```markdown
---
source_url: "https://example.com/agent-taxonomy"
acceptance_status: accepted
source_type: secondary
tier: "Tier 2"
evidence_role: foundation
trust_level: practitioner
why_it_matters: "All topics use AI agent language; shared taxonomy enables cross-topic comparison."
accessed_at: "2026-06-26"
related_topic: all
---

# AI Agent Taxonomy & Enterprise Deployment 2025-2026

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
