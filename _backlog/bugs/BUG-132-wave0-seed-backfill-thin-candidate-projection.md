---
bug_id: BUG-132
title: "Wave0 seed-topic backfill only records thin aggregate summaries, so submitted candidate findings are not navigable from seed topics"
severity: P2
discovered: 2026-07-27
bundle: dpt_rb_openspec-derivative-frameworks
phase: wave0
node: phases/phase-wave0.md
gate: wave0-complete
status: active
---

# BUG-132: Wave0 seed 回填过薄，候选发现无法从 seed topic 导航

## 现象

Wave0 的 source intake 已成功提交，且 `wave0-complete` Gate 通过，但 seed topic 中没有逐候选、逐来源地呈现 Wave0 发现。用户从 `seed_topics/` 阅读时只能看到少量聚合句，无法直接知道 Wave0 发现了哪些具体项目/来源。

本 run 的可复现事实：

| Topic | Wave0 source intake 候选/来源规模 | seed topic Wave0 回填 | 结果 |
| --- | ---: | ---: | --- |
| `01_openspec-architecture-and-evolution` | 13 个官方来源，另有 8 个 shared refs | 9 entries | 相对完整，但主要是官方基线摘要 |
| `02_direct-derivatives-and-compatible-implementations` | 14 个候选仓库 | 2 entries | 具体候选没有逐项导航 |
| `03_explicitly-openspec-inspired-frameworks` | 11 个候选 README | 2 entries | 具体候选没有逐项导航 |
| `04_adjacent-convergent-ai-coding-workflows` | 11 个候选 | 1 deferred entry | degraded 事实被聚合，候选清单不可逐项追踪 |

例如：

- `artifacts/wave0/02_direct-derivatives-and-compatible-implementations/source.yaml` 有 14 个候选，但 `seed_topics/02_direct-derivatives-and-compatible-implementations.md` 的 Wave0 section 只有 `wu-w0-b001-src-i0002/1` 和 `/2` 两条聚合 return-map。
- `artifacts/wave0/03_explicitly-openspec-inspired-frameworks/source.yaml` 有 11 个候选，但对应 seed topic 只有两条聚合 return-map。
- `artifacts/wave0/04_adjacent-convergent-ai-coding-workflows/source.yaml` 有 11 个候选，而对应 seed topic 只有一条总的 `defers` 记录。

Wave0 completion trace 仍记录：`submitted_work_units: 5`, `shared_reference_count: 8`, `topics: 4`，并将 Gate 判定为 pass。

## 影响

1. Seed topic 不能作为下一 Wave 的可靠导航入口；Agent/用户必须反查 `source.yaml`、cache 或日志才能知道 Wave0 发现。
2. Wave1 的搜索 guardrails 只能继承粗粒度“候选集合”，容易遗漏候选、重复搜索或错误地把未验证候选当作已覆盖。
3. Gate 的“有回填结构”与用户所需的“可消费发现”之间存在明显落差；这会让 run 看起来已完成，但研究上下文不可见。
4. Topic 04 的 degraded 情况尤其容易掩盖候选范围：一个总 deferred entry 没有保留每个候选的失败/待验证状态。

## 根因假设

Wave0 的 delegated `wave0_source_intake` result contract 主要要求每个 topic 产出 `source.yaml`，而具体 shared reference 只在跨 topic foundation/supplementary 路径中生成。`phase-wave0.md` §3.3 要求从 submitted outputs 生成 seed return-map，但没有定义：

- source.yaml 中每个 candidate/source 如何映射成 seed entry；
- candidate catalog 与 reference projection 的最小覆盖率；
- degraded fetch 时是否必须为每个 candidate 保留一个 `deferred` entry；
- Gate 如何验证 seed entries 覆盖 submitted source-intake facts，而不是只验证 token 已被替换、refs 格式正确。

因此当前实现可以用 1–2 条 aggregate return-map entries 满足结构性回填，同时把大部分 Wave0 发现留在 source.yaml/cache 中。

## 证据路径

- Bundle: `dpt_rb_openspec-derivative-frameworks/`
- Seed topics: `dpt_rb_openspec-derivative-frameworks/seed_topics/`
- Wave0 source catalogs: `dpt_rb_openspec-derivative-frameworks/artifacts/wave0/*/source.yaml`
- Wave0 completion trace: `dpt_rb_openspec-derivative-frameworks/rb_trace.jsonl`, `wave0_completion`
- Wave0 contract: `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`, §3.3 and §4

## 建议方向

1. 为 Wave0 source intake 增加机器可读的 candidate/source claim 粒度：每个候选至少包含 `candidate_id`, `source_url`, `source_status`, `relationship_hint`, `next_hop`。
2. 定义 seed projection coverage：每个 submitted candidate 必须对应一个 concrete return-map entry，或一个明确的 `defers/deferred` entry；允许 aggregate entries 作为补充，但不能替代逐候选状态。
3. 让 `inspect-wave0-output.mjs` 检查 source.yaml candidate 集合与 seed `entry_id`/refs 的覆盖关系，并在缺失时输出具体 topic/candidate repair coordinate。
4. 对 degraded source 逐候选保留失败原因和下一跳，避免一个总 deferred 记录抹平候选差异。
5. 增加 deterministic regression fixture：source intake 有 N 个 candidates 时，seed backfill 必须有 N 个 candidate-linked entries 或 N 个明确 deferred dispositions。

## 当前 run 的处理边界

这不是本次研究数据被删除：Wave0 的候选目录和 cache 仍在 bundle 中，且现有 seed 已有聚合回填。本 bug 记录的是 projection completeness/discoverability 缺陷；修复应在 framework/OpenSpec change 中完成，不通过手工伪造当前 bundle 的 ledger 或 provenance 来掩盖问题。

## 接手信息

### 已确认的 evaluator 缺口

`DPT_FRAMEWORK/engine/helpers/return-map.mjs` 的
`inspectSeedTopicReturnMaps()` 按 submitted work-unit 的 `work_id` 检查
projection：它从 valid entry 的 `entry_id`/refs 收集 work ID，再确认每个
current row 至少出现一次。它不会读取该 row 所产出的 `source.yaml`，也不会把
其中的 candidate 数量或 candidate identity 变成 projection demand。因而一个
`wu-w0-.../1` entry 可以让一个包含 14 个候选的 submitted work unit 通过本层
coverage，正是本 bug 的 false-pass seam。

目前没有一个现成 CLI 会把“14 个候选只回填 2 条”单独判红；这不是缺少证据，正是
缺少 candidate-granularity verifier 的定义。首个回归应先在这个 seam 写成红灯：
一个合法 submitted Wave0 row 的 `source.yaml` 含 N 个 candidate，而目标 seed
只有少于 N 个 candidate-bound entry/disposition 时，Wave0 inspect 必须列出缺失的
candidate coordinate。

### 真实 owner 与修复边界

- Producer contract: `phase-wave0.md` 的 §3.3 和 Wave0 result/source claim shape。
- Projection evaluator: `return-map.mjs#inspectSeedTopicReturnMaps`。
- 直接 authority 仍是 submitted row 与 `source.yaml`；seed entry 只是可导航投影，
  不得反过来创造 evidence coverage。
- 对每个 candidate 的结果可以是 materialized evidence entry，或显式
  `defers/deferred` disposition；不能要求每个候选都伪装成已接受的 reference。

### 与相邻 bug 的边界

- [BUG-138](BUG-138-seed-topic-wave-backfill-not-materialized-single-writer-missing.md)
  处理“整段没有正确回填”的基线闭环；BUG-132 只在基线已经有合法 Wave0
  return-map entry 后，继续要求 candidate-level completeness。不能以修复 BUG-138
  的一条聚合 entry 关闭本 bug。
- BUG-133 处理 Wave1 reference floor 的补充需求，不解决 Wave0 candidate catalog
  的逐项可导航性。

### 完成判据

1. 一个 source intake 的每个 submitted candidate 都有稳定 identity，且能在
   seed projection 中定位到对应 entry 或 disposition。
2. inspect 对缺失 candidate 报一个精确、可修复的 topic/candidate finding，
   不把整份 `source.yaml` 或所有下游 symptom 重复报出。
3. aggregate summaries 可以保留为阅读便利，但不能取代 candidate coverage。
4. regression 同时覆盖 accepted、deferred 和 rerun append/dedup，且不改变
   submitted-row/provenance authority。
