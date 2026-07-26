---
bug_id: BUG-129
title: "Wave1 per-topic reference materialization has same delegated_bypass as Wave0 shared refs — Phase Agent cannot create countable reference files"
severity: P2
discovered: 2026-07-26
bundle: dpt_rb_openspec-influence-landscape
phase: wave1
node: phases/phase-wave1.md
gate: wave1-complete
related: [BUG-124, BUG-128]
---

# BUG-129: Wave1 的 per-topic reference 物化与 Wave0 shared ref 有相同的 delegated_bypass 问题

## 现象

`check-gate-wave1-complete.mjs` 报 `per_topic_ref_md_count_floor` 失败：每 topic 需要 10 个 countable references，但 Phase Agent 创建的 80 个 `reference/{topic_id}-*.md` 文件全部被判为 0 countable。原因与 BUG-124 相同：Phase Agent 直接写的 reference 文件没有 work-unit backing，gate 判定为 `filesystem_only_not_backed`。

这与 Wave0 的 shared ref 问题是**同一个根因在不同 phase 的再现**。BUG-124 处理的是 `reference/00-shared-*.md`（跨 topic shared refs），本 bug 处理的是 `reference/{topic_id}-*.md`（per-topic refs）。两者的 gate 检查机制相同：reference 文件必须有 submitted work-unit provenance，Phase Agent materialization 不被接受。

## 与 BUG-124 的区别

- BUG-124：cross-topic shared refs → 连合法的 work-unit payload schema 都不存在（topic_uid 是必填的）
- BUG-129：per-topic refs → work-unit payload schema 存在（有 topic_uid），但 sub-agent task card 的 `writes_to` 不包含 reference files，`required_receipts` 也不包含它们

## 重现线索

1. Wave1 的 8 个 sub-agent 产出 `evidence-summary.md` 和 `question-list.md`，提交成功
2. Gate 报 `per_topic_ref_md_count_floor`：0/10 per topic
3. Phase Agent 按 `repair_kind: agent_action` 创建 80 个 reference files
4. Rerun gate → 全部 0 countable（`filesystem_only_not_backed`）

## 根因假设

**主因**：Wave1 的 reference materialization 模型与 Wave0 相同——reference files 必须由 delegated sub-agent 产出并声明在 work-unit `output_files[]` 中。Phase Agent materialization 不被视为合法 provenance。但 Wave1 sub-agent 的 task card（phase-wave1.md §3.1）不包含 reference file 产出要求。

**副因**：`phase-wave1.md` 的第 1 节说 "Phase Agent materializes rich reference files at `reference/{topic.slug}-<source-slug>.md` after successful submit from submitted backing"，暗示 Phase Agent 可以在 submit 之后物化 reference。但 gate 的 backing check 不接受这种物化——存在 phase instruction 和 gate contract 之间的不一致。

## 框架层面的问题

1. Phase instruction（Phase Agent 在 submit 后物化 reference）与 Gate contract（reference 必须有 work-unit backing）之间存在矛盾
2. BUG-124 和 BUG-129 指向同一个结构性 gap：**Phase Agent materialization 在整个 reference 体系中没有合法地位**

## 建议方向

- **短期**：要么 phase instruction 明确说明 Phase Agent 物化的 reference 不被 gate 计数，要么 gate 接受 Phase Agent 基于 submitted evidence 的 materialization
- **中期**：Wave1 sub-agent task card 的 `required_receipts` 和 `writes_to` 中加入 per-topic reference files，让 sub-agent 产出它们
- **长期**：与 BUG-124 一起，统一 reference materialization 的 provenance 模型
