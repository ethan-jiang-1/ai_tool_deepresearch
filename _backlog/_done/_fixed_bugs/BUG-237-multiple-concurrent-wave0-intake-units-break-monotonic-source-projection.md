# BUG-237: 新 topic 用多个并发 wave0 source-intake work unit（共享同一 source.yaml）会破坏 submitted source contribution 单调投影，wave0 gate 永久阻塞

> 状态: 活跃 | 优先级: P1 | 严重度: P2 | 更新: 2026-08-20 | source: 真实 run 执行（dpt_rb_enterprise-ai-transformation-six-cases，rerun 3 add Walmart topic 10）

## Why（完整上下文）

Deep Research 的 wave0 要求每个 topic 的 `source.yaml` 由 submitted work unit 以**单调追加链**构建：每个新提交的 work unit 声明一个 `source_contribution`，其长度必须比链上上一个严格递增（`evaluateDeclaredContributionGroup` → `submitted_source_contribution_non_monotonic`）。

为快速给新 topic（Walmart）采集全维度来源，我并行启动了 3 个 `wave0_source_intake` work unit（业务 8 条 / 组织人员 7 条 / 思想方法论 6 条），三者**都写同一个 `artifacts/wave0/10_walmart-ai-transformation/source.yaml`**。提交后：

1. `rb_output_declarations.jsonl` 有 3 行，每行都声明同一 source.yaml 作为 `source_yaml` output。
2. `collectSubmittedWave0ContributionProjection` 的 `evaluateWave0SourceGroup` 对该 target 分组，`authenticateWave0SourceFact` 逐行把 validated_length 校验为**当前 source.yaml 长度（21）**（因为每行都指向同一文件）。
3. 链变成 21, 21, 21（或 21 之后 21），**非严格递增** → `submitted_source_contribution_non_monotonic`，`repair_kind: missing_contract`，`candidates: []`。
4. wave0 gate 的 `wave0_reference_backing` / source projection 全部 fail（133 个失败），Walmart 的 00-shared 无法绑定，gate 永久阻塞。

## 复现

1. add_topic 一个新 topic。
2. 并行 claim 3 个（或更多）`wave0_source_intake` work unit，各自写同一个 `source.yaml`（append）。
3. 全部 submit。
4. `inspect-wave0-output` → `submitted_source_contribution_non_monotonic`（或 multi-row 的 missing_boundary），gate 卡死。

## 影响（本 run 实账）

- 新 topic 用多并发 wave0 unit 是自然的并行策略，但框架只支持单调单链 → 直接 `missing_contract`，无合法恢复。
- `missing_contract` 明示 "Do not hand-edit the ledger or source array"——Agent 不能修复，只能 operator 介入或框架补能力。
- 本 run 被迫：移除 Walmart 的 00-shared（共享 floor 已由既有 6 家满足），并需 operator 决策 ledger 归并。

## 为什么是框架缺陷（不是纯 Agent 执行错误）

- 并行采集新 topic 的 source.yaml 是合理的 operator/Agent 策略；框架没有在 claim/提交时拒绝多行同 target，而是等到投影阶段才 `missing_contract` fail-closed。
- 单调投影假设"一个 topic 的 source.yaml 由单链追加"，没有多 work unit 并发写同一 source.yaml 的合并语义（应按 cache_trails/URL 归属，或要求严格串行）。
- 若单行 work unit 贡献一个可识别的有序区间，投影应能合并多行成单调整体；当前实现不支持。

## Owner / 最小修复方向

`evaluateWave0SourceGroup` / `evaluateDeclaredContributionGroup`（`DEEP_RESEARCH_HARNESS/engine/work-unit-projection.mjs`）：

1. 多行同 target 时，若各行 source_contribution 有明确边界（length + semantic_digest），支持**区间合并**而非要求每行 validated_length 严格递增（当前 source.yaml 长度是全体，不是单行）。
2. 或让 `authenticateWave0SourceFact` 按 work unit 的 cache_trails（URL 集合）计算每行实际贡献长度，而不是读当前 source.yaml 全长度。
3. 在 claim/enqueue 阶段检测"同一 topic 已有 in-flight wave0 source-intake"并引导串行（或明确支持并行合并）。
4. 增加确定性测试：新 topic + 3 个并发 wave0 source-intake unit（各自 append 不同区间）→ gate 通过且投影可归属。

## 关联

- `DEEP_RESEARCH_HARNESS/engine/work-unit-projection.mjs`：`evaluateWave0SourceGroup`（~466）、`evaluateDeclaredContributionGroup`、`authenticateWave0SourceFact`（~237）
- 本 run 实账：`dpt_rb_enterprise-ai-transformation-six-cases`（rerun 3，Walmart topic 10，3 个并发 wave0 unit）
- 已有 C5/post-final 相关修复：[BUG-236](../bugs/BUG-236-post-final-recovery-second-rerun-blocked-by-nonprimary-final-drift.md)
