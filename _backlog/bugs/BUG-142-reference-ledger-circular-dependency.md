---
bug_id: BUG-142
title: "Phase-Agent-created references cannot be added to ledger after work-unit submission — circular dependency blocks gate"
severity: P1
discovered: 2026-07-28
bundle: dpt_rb_openspec-spec-bloat-context-management
phase: wave1
affected: DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs, ledger coverage check
related: [BUG-141]
---

# BUG-142: Phase Agent reference ledger circular dependency

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
