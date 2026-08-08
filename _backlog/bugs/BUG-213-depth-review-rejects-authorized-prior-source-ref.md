---
bug_id: BUG-213
title: depth-review 的 validateSubmittedClaimBacking 拒绝合法的 prior submitted source_ref，违反 subagent-node-contract §169
severity: P1
phase: wave1
status: open
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-09)
surfaced_at: 2026-08-09
---

# BUG-213: `validateSubmittedClaimBacking` 硬性要求 `source_ref` 在当前 `output_files[]`

## Observation

在 `dpt_rb_mature-open-source-deep-research-harness` run 的 Wave1 中，supplementary
`wave1_topic_deepening` work units 的 `source_claims[].source_ref` 指向 authorized
prior `artifacts/wave1/<topic>/evidence-summary.md`（task.md 的 "eligible prior
outputs" 明确列出该路径，spec 也授权）。dry-submit/formal submit 均接受。但
`inspect-wave1-output.mjs` 的 depth-review 检查在
`validateSubmittedClaimBacking`（`wave1-reference-convergence.mjs:104-108`）拒绝：

```js
if (!safeRelPath(claim.source_ref)
    || !row.output_files?.some((output) => output.path === claim.source_ref)
    || !existsSync(join(bundlePath, claim.source_ref))) {
  return { ok: false, reason: 'accepted source claim lacks a submitted source output' };
}
```

它要求 `source_ref` 精确出现在**当前** `output_files[]`。supplementary 的
`source_ref` 指向 prior evidence-summary（不在当前 output_files），故被拒 → 报
`per_topic_depth_review_contract: submitted_backing_cache_mapping_invalid`。

## Spec violation

`openspec/specs/agent/subagent-node-contract/spec.md`：
- §160-163：accepted claim 的 `source_ref` SHALL 合法，当它 (1) 在当前
  `output_files[]`，**或** (2) 由 hash-valid 先前 submitted work-unit row 声明，
  且 same canonical topic UID/wave/kind + authorized prior role。
- §169："When the prior path is valid, submit SHALL accept it without requiring
  duplicate `output_files[]` declaration."
- §184-189 Scenario "Supplementary work can cite prior submitted evidence":
  supplementary work unit 的 `source_ref` 命名 hash-valid prior `evidence_summary`
  → submit SHALL accept，不要求 redeclare/overwrite。

当前 `validateSubmittedClaimBacking` 只实现 branch (1)，缺失 branch (2)，违反
§169 与 Scenario 184-189。

## Repro

1. 提交 supplementary `wave1_topic_deepening` work unit，`source_ref` 指向
   authorized prior `evidence-summary.md`（在 task.md "eligible prior outputs"）
2. 把它加入 `depth-review.yaml#reviewed_work_unit_refs`
3. 运行 `inspect-wave1-output.mjs` → `per_topic_depth_review_contract` 报
   `submitted_backing_cache_mapping_invalid: accepted source claim lacks a
   submitted source output`

## Why it matters

- 这是我在本 run 中**误判需要 supersede 的直接根因**：validator 报错后，我没有
  意识到这是 Engine 违反 spec（prior source_ref 合法），而是走了 supersede 修正，
  进而触发 BUG-212。
- 任何按 spec 正确使用 prior source_ref 的 supplementary work unit 都会被
  depth-review 误拒，forcing 用户走 supersede（引入 BUG-212）或手改 result。
- 与已修 BUG-089（"submit 拒 prior submitted source_ref"，closed）在**不同检查面**：
  BUG-089 是 submit/dry-submit；本 bug 是 depth-review 的
  `validateSubmittedClaimBacking`。

## Suggested direction

- `validateSubmittedClaimBacking` 应实现 §160-163 branch (2)：当 `source_ref`
  匹配 hash-valid prior submitted row（same topic/wave/kind + authorized role）
  时接受，不要求当前 output_files 重复声明。可用 spec 提到的 in-memory
  submitted-output index（§165）。
- 与 `readSubmittedWorkUnitDeclarations` 复用，避免新增 authority。

## Verification

提交 supplementary work unit 引用 prior evidence_summary → depth-review 应接受。
当前 head 拒绝并报 `submitted_backing_cache_mapping_invalid`。
