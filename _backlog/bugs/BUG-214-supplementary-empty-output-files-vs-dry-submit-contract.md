---
bug_id: BUG-214
title: supplementary task.md 允许空 output_files[]，但 dry-submit 强制非空，supplementary 首次提交必被拒
severity: P2
phase: wave1
status: open
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-09)
surfaced_at: 2026-08-09
---

# BUG-214: supplementary `wave1_topic_deepening` 的 task.md 与 dry-submit validator 对 `output_files[]` 要求矛盾

## Observation

在 `dpt_rb_mature-open-source-deep-research-harness` run 的 Wave1 中，为补
reference floor 创建了 3 个 supplementary `wave1_topic_deepening` task cards
（`payload.assignment_mode: supplementary`，`required_receipts: []`，不要求
evidence-summary/question-list 对）。

生成的 `task.md` 的 Result JSON Starter 里 `output_files` 为 `[]`（sub-agent
按 contract 不产出 evidence-summary/question-list），且 Completion Contract 说
"Required direct outputs: none for this assignment"。

但 `operate-work-unit dry-submit` 对全部 3 个 supplementary 结果拒绝：

```
missing_output: output_files[] is required by the work-unit output contract
```

3 个 sub-agent 都按 task.md 提交了 `output_files: []`，都被 dry-submit 拒绝，
必须把 cache trail 目录塞进 `output_files`（role `other`）才能通过。

## Why it matters

- task.md（Engine 生成）明确说 output 可为空，dry-submit（Engine 校验）强制
  非空 —— 两个 Engine 生成的 surface 直接矛盾，sub-agent 无法一次通过。
- 本 run 3 个 supplementary 全部踩中，被迫给 cache trail 目录加
  `role: other` 的 output_files 声明（语义上是 cache，不是 output file）。
- 与 spec `subagent-node-contract` §175（"supplementary Wave1 contract with
  snapshot-bound `payload.assignment_mode: supplementary` and empty
  required_outputs SHALL continue to expose eligible prior submitted
  evidence_summary lineage and SHALL not require current declarations for the
  paired artifacts"）部分一致 —— 但 dry-submit 的 `missing_output` 强制
  output_files 非空，说明 validator 未对齐 supplementary 语义。

## Repro

1. 创建 supplementary `wave1_topic_deepening` task card（assignment_mode
   supplementary，required_receipts []，不产 evidence-summary）
2. sub-agent 按 task.md 提交 `output_files: []`
3. `operate-work-unit dry-submit` → `missing_output: output_files[] is required`

## Suggested direction

- dry-submit 对 `payload.assignment_mode: supplementary` 且空 `required_outputs`
  的 attempt，应接受空 `output_files[]`（或只要求 cache/source claims），与
  task.md 的 "Required direct outputs: none" 对齐。
- 或 task.md 生成时对 supplementary 也要求声明 cache trails 为 `output_files`，
  使两个 surface 一致。

## Verification

提交 supplementary work unit 且 `output_files: []` → dry-submit 应按 task.md
语义接受。当前 head 拒绝 `missing_output`。
