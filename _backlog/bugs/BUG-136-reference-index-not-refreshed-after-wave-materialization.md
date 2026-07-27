---
bug_id: BUG-136
title: "reference/_INDEX.md remains the initial empty template after reference materialization"
severity: P2
discovered: 2026-07-27
bundle: dpt_rb_openspec-influence-landscape
phase: wave1
node: phases/phase-wave1.md
gate: wave1-complete
status: active
---

# BUG-136: reference/_INDEX.md 在 reference 产出后没有更新

## 现象

`dpt_rb_openspec-influence-landscape/reference/` 已有 96 个实际 reference
Markdown 文件，但 [`reference/_INDEX.md`](../../dpt_rb_openspec-influence-landscape/reference/_INDEX.md)
仍停留在初始模板：

```text
Last updated: _(populated on first wave update)_
Reference count: 0
```

表头存在，但没有任何数据行，也没有 `Last updated` 日期或真实计数。

对当前文件执行框架的 index validator，结果为：

```json
{
  "valid": false,
  "errors": ["_INDEX.md: table has fewer than 1 data row"]
}
```

## 契约对照

`openspec/specs/reference-flat-format/spec.md` 明确规定：

- `_INDEX.md` 是 machine-readable canonical reference inventory；
- `reference/` 中有 N 个 reference 文件时，table 必须恰好有 N 行；
- 每个 Wave 产出 reference 后，Agent 必须在 gate 前更新 `_INDEX.md`、日期和计数。

本 bundle 的 `reference/README.md` 也把 `_INDEX.md` 定义为 machine-readable
inventory，并要求每个 reference 一行。

## 影响

1. 用户和后续 Agent 从 canonical 入口看不到已经产出的证据文件。
2. reference 目录的 filesystem truth 与 navigation truth 分裂，无法可靠地
   判断哪些 source 已 materialize、属于哪个 wave、是否 accepted。
3. Wave1/Wave2 的 index coverage、source-layer 和 consumer navigation 检查
   可能失败或只能产生下游症状。

## 根因假设

Wave materialization 已写入 reference 文件，但没有在同一正常 producer/closeout
路径中执行 `_INDEX.md` 的 append-and-refresh；或者 index 更新责任只停留在
guidance，没有被当前 phase 的完成动作稳定承接。

## 建议方向

1. 将 `_INDEX.md` 更新绑定到每个 Wave 的 reference materialization closeout，
   使用已接受 reference metadata 生成八列 row。
2. 在 inspect/gate 前提供明确的 `reference/_INDEX.md` repair coordinate，
   并验证行数、文件名、source_layer、acceptance_status 与 metadata 一致。
3. 增加回归：有 N 个 reference 文件且 index 为初始空模板时，inspect 必须
   稳定报告 index coverage/root，并在合法更新后通过。

## 接手信息

### 已确认的红灯与代码 owner

当前 `_INDEX.md` 经过 `validateIndexMD()` 的结果是
`_INDEX.md: table has fewer than 1 data row`。正式 index coverage owner 位于
`DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs` 的
`checkReferenceIndexCoverage()`：它先将无效表报告为单一
`reference_index_table_invalid` root，再 mask 每个 reference 的 missing-row
symptom。不要为 96 个文件生成 96 个同根 diagnosis。

Wave1 Phase contract 已明确写出：每个 submitted source 的 Phase-owned reference
materialization 后，更新 `_INDEX.md`。因此缺口在 materialization closeout，不在
reference 文件的 evidence authority。

### 修复顺序与边界

- 先与 [BUG-137](BUG-137-reference-topic-filenames-omit-full-topic-slug.md) 统一
  canonical filename/Topic binding，或在同一原子 materialization step 中完成；
  否则会生成一张完整但引用错误文件名的 index。
- 不能只把 `Reference count: 0` 改为 `96`。每一个 row 都必须从已接受 metadata
  派生八列，并记录正确的 `source_layer`。
- index 是 consumer navigation projection，不能用补 index row 的方式创造 submitted
  backing 或掩盖 filename/provenance defect。

### 完成判据

1. N 个 flat materialized references 对应恰好 N 个 accepted table row，含真实的
   Last updated 与 count summary。
2. 无效 parent table 只报一个 root；修好 parent 后，缺一行/错 source_layer 才报
   精确 row coordinate。
3. Wave0/Wave1/Wave2 materialization 都走同一 index append/refresh contract，
   并覆盖 rerun append/idempotency。
