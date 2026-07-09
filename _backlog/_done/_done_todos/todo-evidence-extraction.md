# DONE: evidence-extraction（核心已落地）

> 状态: ✅ DONE（核心） | 完成归档: 2026-07-09 | DONE-015  
> 落地 change: `openspec/changes/archive/2026-07-02-implement-evidence-extraction/`  
> 后续语义层: 见活跃 [`../../todos/todo-evidence-quality.md`](../../todos/todo-evidence-quality.md)

## 已落地（不再作为活跃 todo）

- work-unit `operate-work-unit submit` → `rb_output_declarations.jsonl` ledger 权威
- Engine `countReferences()` / `isCountable()`（`DPT_FRAMEWORK/engine/helpers/ref-count.mjs`）
- CCC + Key Facts 结构门槛、`cache_coverage`、file-observability diagnostic
- `shared-reference-template.md` 与 wave0/1 gate 的 ledger-mode 计数

## 明确不再做（地基已变）

- **CandidateCard schema / cache→card→promote** — V12 路径；当前是 work-unit → reference materialization，不是 CandidateCard 流水线
- **subagent-relay / mergeResults** — 已退役，由 work-unit 取代

## 残余（并入 evidence-quality，不单独立项）

- 语义质量字段（substance / tier / commercial / retention）— 结构可数 ≠ 语义够格
- 非 delegated 主 Agent reference 与 ledger 路径的完全对等（若仍有缺口）

---

以下为归档前原文（保留供对照；期望以「已落地 / 不再做」为准）。

# TODO: evidence-extraction

> 状态: 待设计 | 优先级: 高 | 更新: 2026-07-07

## Why

当前 work-unit 路径已经让 delegated evidence 通过 `operate-work-unit submit` 写入 `rb_output_declarations.jsonl`。下一步的 evidence-extraction 不应再依赖历史 transport 结构，而应围绕 current bundle-root runtime truth 建立更好的 evidence capture：

- Sub-agent actor 负责搜索、阅读、提取证据，并在 work-unit result 中声明 `output_files` 与 `cache_trails`。
- Engine 通过 submit 验证 result、receipt、cache、output declaration，并写 submitted ledger row。
- Gate 和 reentry 使用 submitted declaration 及其 cross-check surfaces，不把未声明文件算作 coverage。

问题不在“是否已有来源文件”，而在“reference 是否捕获了足够可审计的干货”。很多来源现在只有元数据或摘要，缺少数字、日期、方法、机制、限制和原文证据点。

## Current Direction

设计一个 declaration-first 的 evidence extraction layer：

- 定义 enriched reference Markdown 的最低内容结构。
- 让 work-unit result 明确声明 enriched reference 路径、source role、cache trail 和 creation reason。
- 建立 `isCountableReference()`：只有 accepted、substantive、带 Core Content Capture、来源和 cache 可追溯的 reference 才能计数。
- 建立 `countDeclaredReferences(bundle)`：从 submitted ledger rows 和 declaration-derived index 计算 countable coverage。
- file-observability 继续作为 diagnostic：发现 orphan / explained / cache gap，但不扩大 pass coverage。

## Proposed Reference Shape

```markdown
# <title>

- source_url: <url>
- acceptance_status: accepted | reviewed_uncounted | excluded
- source_type: primary | secondary | dataset | official | expert | other
- tier: Tier 1 | Tier 2 | Tier 3 | Tier 4
- trust_level: official | academic | practitioner | community | unknown
- evidence_role: foundation | must_answer | mechanism | limitation | counterexample
- related_topic: <topic-slug>

## Key Facts
- ...

## Core Content Capture
<numbers, dates, methods, mechanisms, constraints, limitations>

## Relevance To This Research
...

## Risks And Limitations
...
```

## Design Questions

- Which reference fields belong in schema versus Markdown convention?
- Should countability be computed only from submitted ledger rows, or from a declaration-derived projection cached under `_cache/`?
- How should non-delegated main-Agent references enter the same declaration path?
- What is the smallest Engine check that proves a reference has substance without pretending to judge semantic quality?

## Non-Goals

- Do not evaluate final report quality here.
- Do not replace Agent judgment about relevance.
- Do not count filesystem-only files as evidence coverage.
- Do not introduce a compatibility path for retired delegated transport.

## Next Step

Open an OpenSpec explore/propose when this becomes active work. The proposal should modify accepted specs before changing framework behavior.
