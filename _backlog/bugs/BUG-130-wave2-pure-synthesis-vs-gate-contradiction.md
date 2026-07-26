---
bug_id: BUG-130
title: "Wave2 pure synthesis path contradicts gate contract — Phase Agent materialization flagged as delegated_bypass"
severity: P1
discovered: 2026-07-26
bundle: dpt_rb_openspec-influence-landscape
phase: wave2
node: phases/phase-wave2.md
gate: wave2-complete
related: [BUG-124, BUG-129]
---

# BUG-130: Wave2 的 "pure synthesis path" 与 gate contract 矛盾

## 现象

`phase-wave2.md` 的 execution brief（§0）明确描述了 "Pure synthesis path: Phase Agent reads existing submitted evidence and writes synthesis artifacts"。Phase Agent 按此路径直接产出了 `synthesis.md`、`cross-topic-ledger.md`、和 `finding-index.yaml`。

但 `check-gate-wave2-complete.mjs` 报了两个失败：

1. **`wave2_delegated_bypass_suspected`**：Phase Agent 直接写的 synthesis 产物被标记为可疑的非委托产出
2. **`finding_index_contract`**：finding 的 `subagent_receipt_refs` 要求引用 submitted Wave2 work-unit rows，但 pure synthesis path 没有运行任何 Wave2 delegated work units

此外，`wave1_target_binding` 要求每个 Wave1 work-unit receipt 都绑定到一个 finding，但 finding-index.yaml 的 schema 要求 `subagent_receipt_refs` 只能是 Wave2 work-unit IDs（Wave1 work unit IDs 被拒绝为 "not backed by a submitted Wave2 work-unit row"）。

这三个要求共同导致：在不运行 Wave2 delegated work units 的情况下，`finding_index_contract` 无法被满足。但 phase instruction 明确说可以 pure synthesis。

## 重现线索

1. 完成 Wave1，不运行任何 Wave2 delegated work units（按 pure synthesis path）
2. Phase Agent 直接写 `synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml`
3. `check-gate-wave2-complete.mjs` → `wave2_delegated_bypass_suspected` + `finding_index_contract` 失败
4. 无法通过 gate

## 根因假设

**主因**：`phase-wave2.md` 的 instruction 和 `check-gate-wave2-complete.mjs` 的 contract 之间存在文档-代码漂移。Instruction 说 Phase Agent 可以直接写 synthesis artifacts，但 gate 的 schema 要求这些 artifacts 绑定到 submitted Wave2 work-unit rows。两者互斥——如果 phase instruction 正确，gate 的 `subagent_receipt_refs` 和 `independent_backing_refs` 要求应该对 pure synthesis 路径有豁免或不同的校验逻辑。

**副因**：`finding-index.yaml` schema 的 `subagent_receipt_refs` 字段没有区分 "没有 Wave2 work units 因为使用了 pure synthesis path" 和 "有 Wave2 work units 但没有正确引用"。空数组在两种情况下都合法，但 gate 的 `wave1_target_binding` 检查期望这些 receipt refs 能覆盖所有 Wave1 work units，而 schema 又不接受 Wave1 work unit IDs。

**第三因**：与 BUG-124/BUG-129 相同的模式——Phase Agent materialization 在整个框架中没有一致的合法性模型。有些 phase 明确允许（seed-topics 的 seed file 物化，wave2 的 pure synthesis），但 gate 的 backing 检查不承认这种 provenance。

## 框架层面的问题

1. Phase instruction 和 gate contract 之间的不一致是最严重的问题——Agent 遵循 instruction 会导致 gate 失败
2. `finding-index.yaml` 的 schema 假设 Wave2 总是有 delegated work units，没有 pure synthesis 的合法 schema shape
3. `wave2_delegated_bypass_suspected` 规则的存在暗示 gate 不信任 phase instruction 中描述的 pure synthesis path

## 建议方向

- **短期（关键）**：让 `phase-wave2.md` 和 `check-gate-wave2-complete.mjs` 对齐——要么 gate 接受 pure synthesis 路径（Phase Agent 物化的 artifacts 有合法地位），要么 phase instruction 移除 pure synthesis 路径的描述
- **短期**：`finding-index.yaml` schema 增加对 pure synthesis 模式的支持——`subagent_receipt_refs` 可以为空，`wave1_target_binding` 不要求 Wave2 receipt refs 来覆盖 Wave1 work units
- **中期**：与 BUG-124/BUG-129 一起，建立统一的 "Phase Agent materialization vs delegated provenance" 模型
