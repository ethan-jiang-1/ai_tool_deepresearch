# Engine Gap: supersede 后 predecessor 声明 rows 被 delegated_bypass 误报

> 记录: 2026-08-09 | 来源: `dpt_rb_mature-open-source-deep-research-harness` run

## 症状

Wave1 补 reference floor 时，supplementary `wave1_topic_deepening` work units 的 source_claim `source_ref` 指向 authorized prior `evidence-summary.md`。按 spec `subagent-node-contract` §169 / Scenario 184-189，这是合法形式（submit 应接受）。但 `validateSubmittedClaimBacking`（wave1-reference-convergence.mjs:104-108）错误地要求 `source_ref` 在**当前** `output_files[]`，导致 depth_review 拒绝。

我据此错误判断需要修正，走了 `supersede` 创建 successor（用 cache-trail source_ref 重提）。supersede 后：

- predecessor 保留 `_status.json: submitted` + index `supersession_relation`
- normalized submitted reader（`evaluateNormalizedSubmittedWorkUnitLedger`）**排除** superseded predecessor
- raw reader（`readOutputDeclarations`）**不排除**，predecessor 声明 rows 仍在
- `scanDelegatedBypassSuspicion` 用 raw 对比 normalized → 3 个 predecessor rows 误报为 "hand-written declarations"

## 违反的 Spec

- `openspec/specs/agent/work-unit-provenance-gate/spec.md` §81-87：superseded predecessor 应视为 historical，Gate MAY 不计数、不视为 bypass
- `openspec/specs/agent/subagent-node-contract/spec.md` §169 / §184-189：prior submitted source_ref 应被 submit 接受，不要求 output_files 重复声明

## 两个独立 Engine 缺陷

1. **`validateSubmittedClaimBacking` 不认 authorized prior source_ref**（违反 subagent-node-contract §169）→ 导致 supplementary 被误判需要 supersede
2. **`scanDelegatedBypassSuspicion` 不排除 supersession_relation predecessor**（违反 work-unit-provenance-gate §81-87）→ supersede 后 gate 硬阻塞

## 当前 run 状态

- reference floor 全部通过（topic 03=9、05=9、06=10，≥8）
- depth-review 通过（含 successor refs）
- seed projections 全部填充
- queue drained，work-unit inspect passed
- **唯一阻塞**: `wave1_delegated_bypass_suspected` 误报 3 个 superseded predecessor rows

## 修复方向（Engine 侧）

- `validateSubmittedClaimBacking` 应接受 authorized prior source_ref（同 topic/wave/kind submitted row 的 evidence_summary output）
- `scanDelegatedBypassSuspicion` 的 `nonSubmittedDeclarationRows` 应排除有 `supersession_relation` 的 rows，或 raw reader 应返回 current lineage leaf only

## 用户处置

不能手改 `rb_output_declarations.jsonl`（硬规则 + spec 禁止）。supersede 不可逆。需 Engine 修复或用户决策（接受 degraded / 修 Engine / 撤销 supersede 的声明影响）。
