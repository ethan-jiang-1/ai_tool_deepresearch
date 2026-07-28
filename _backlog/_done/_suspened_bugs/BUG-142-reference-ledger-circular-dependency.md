---
bug_id: BUG-142
title: "Phase-Agent-created references cannot be added to ledger after work-unit submission — circular dependency blocks gate"
severity: P1
discovered: 2026-07-28
bundle: dpt_rb_openspec-spec-bloat-context-management
phase: wave1
affected: DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs, ledger coverage check
related: [BUG-141]
status: suspended_pending_valid_current_head_observation
current_contracts: [RWG-017, WPG-012]
current_head_change: openspec/changes/archive/2026-07-28-converge-wave1-reference-projections
---

# BUG-142: Phase Agent reference ledger circular dependency

## Suspended Disposition (2026-07-29)

**Suspended pending a valid current-head observation.** The observed bundle predates the
accepted submitted-backing -> Phase-owned reference projection convergence in
[`converge-wave1-reference-projections`](../../../openspec/changes/archive/2026-07-28-converge-wave1-reference-projections/).
Current contracts keep `rb_output_declarations.jsonl` as Engine-written
delegated coverage authority (`WPG-012`), while `RWG-017` gives the Phase Agent
the separate consumer-navigation projection/index/depth/seed closeout from
submitted backing. A Phase-owned reference therefore must not be retrofitted
into the delegated ledger.

The first current-head real-Agent attempt was externally cancelled before
native completion. It produced no child result, dry/formal submit, closeout,
inspect, case checks, or completion record; see
[`6649b6c9-94da-4cc2-aef2-b2ab3e0ecccb.json`](../../../.exp-bundles/_reports/6649b6c9-94da-4cc2-aef2-b2ab3e0ecccb.json).
It proves neither a current closeout failure nor a fix. The next valid
observation must retain a real child return, submitted backing, canonical
closeout, inspect, and native completion before this bug is closed or a new
change is admitted.

Consequently, the historical repair proposals below are not current action
authority: no ledger mutation, submitted-output supplement, receipt rewrite,
or filesystem-only reference may be used to bypass submitted evidence. Reopen
only when a valid current-head Agent-flow completion has materialized a
canonical submitted-backed projection and the same inspect/Gate still directs
the Phase Agent to an exhausted `operate-work-unit claim/submit` path.

## 现象

Wave1 gate 的 `per_topic_ref_md_count_floor` 和 `ledger_coverage` 无法通过，因为 Phase Agent 创建的 reference 文件（`reference/{topic}-*.md`）未被声明在 `rb_output_declarations.jsonl` 中。

Gate 提示 `repair_kind: engine_operation`，指向 `operate-work-unit claim/submit path`，但：
1. 所有 5 个 topic 的 work-unit 已经 submitted
2. Queue 为空，`operate-queue check` 返回 active_window=0, refill_pool=0
3. 尝试 `operate-queue enqueue` 补充任务被拒绝：`assignment contract rejected: Wave1 source intake assignment receipts do not match the canonical topic-bound set`
4. 尝试 `operate-work-unit claim` 返回 `claimed: 0, unclaimed: 0`
5. 尝试 `operate-work-unit replace` 返回 `ok: false`

## 根因

这是一个 **循环依赖**：

1. Gate 要求 reference 文件在 ledger 中有声明
2. Ledger 声明只能来自 submitted work-unit output_files
3. 每个 topic 只能有一个 wave1 work-unit（assignment contract）
4. 所有 topic 的 work-unit 已经 submitted，无法创建新的
5. Submitted work-unit 不可修改
6. Phase Agent 无法通过任何 engine operation 将文件加入 ledger

**设计 gap**：框架假设 delegated sub-agent 会在 wave1 中同时产出 evidence artifacts 和 reference files。但如果 sub-agent 只产出了 evidence artifacts（evidence-summary.md, question-list.md）而没有产出 reference files，Phase Agent 没有合法的 engine path 来补充 reference ledger entries。

这与 BUG-141 的 `shared_ref_count_floor` 问题同根但更严重——BUG-141 有间歇性 gate pass，而 wave1 gate 完全没有 workaround path。

## 建议修复

1. **允许 Phase Agent 通过 `operate-artifact-persistence.mjs persist` 将 Phase-owned reference 写入 ledger**，而不需要 delegated work-unit backing
2. **或在 assignment contract 中为 reference outputs 预留 slot**，使 sub-agent task card 的 required_receipts 包含 reference files
3. **或提供 `operate-work-unit supplement` 命令**，允许在已 submitted 的 work-unit 上追加 output_files declaration
4. **长期**：区分 "evidence authority"（必须 work-unit backed）和 "navigation artifact"（Phase Agent 可创建），reference 文件属于后者

## 临时 workaround

无合法 workaround。当前唯一可行路径是接受 gate degradation 手动推进，或修改 sub-agent task card 模板使其 mandatory 产出 reference files。
