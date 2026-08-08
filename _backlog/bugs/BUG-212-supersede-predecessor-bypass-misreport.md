---
bug_id: BUG-212
title: supersede 后 predecessor 声明 rows 被 delegated_bypass 误报，gate 硬阻塞
severity: P1
phase: wave1
status: open
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-09)
surfaced_at: 2026-08-09
---

# BUG-212: `scanDelegatedBypassSuspicion` 不排除 supersession_relation predecessor

## Observation

在 `dpt_rb_mature-open-source-deep-research-harness` run 的 Wave1 中，为补
reference floor 对 3 个 `wave1_topic_deepening` supplementary work units
（`wu-w1-b000-deep-i0008/09/10`）执行了合法的 `operate-work-unit supersede`，
创建 successor（`wu-w1-b000-deep-i0011/12/13`）用正确 `source_ref` 重提。supersede
成功后，`check-gate-wave1-complete.mjs` 硬阻塞在：

```
wave1_delegated_bypass_suspected: 3 output declaration row(s) are not
submitted work-unit ledger rows for wave1
```

Root cause：`scanDelegatedBypassSuspicion`（`gate-helpers-provenance.mjs`）的
`nonSubmittedDeclarationRows` 用 raw reader `readOutputDeclarations`
（`gate-helpers-readers.mjs:239`，读取全部历史 rows）对比 normalized
`readSubmittedWorkUnitDeclarations`（同文件 339，经
`evaluateNormalizedSubmittedWorkUnitLedger` **排除**带 `supersession_relation`
的 predecessor）。supersede 后 predecessor 保留 `_status.json: submitted` +
index `supersession_relation`（`work-unit-supersession.mjs:880`），于是：
- raw reader 仍含 predecessor rows
- normalized set 排除它们
- bypass 检查把 3 个 predecessor rows 误判为 "hand-written declarations"

而 coverage 实际完整：successor 承担全部 source/cache，queue drained，
`operate-work-unit inspect` 报 passed: true。

## Spec violation

`openspec/specs/agent/work-unit-provenance-gate/spec.md` §81-87：
"superseded missing predecessor row is historical only" —— WHEN a predecessor
has one valid immutable supersession relation and matching successor lineage,
THEN Gate MAY report historical acceptance **without reconstructing or counting
that predecessor**. 当前检查器直接失败，未将 superseded predecessor 视为
historical。

## Repro

1. 提交一个 `wave1_topic_deepening` work unit（含 source_claims + cache trails）
2. `operate-work-unit supersede` 该 work unit，claim+submit successor
3. 运行 `check-gate-wave1-complete.mjs` → `wave1_delegated_bypass_suspected`
   报 predecessor rows 为 bypass
4. `_work_units/_index.json` 里 predecessor 有 `supersession_relation` 且
   status 仍 `submitted`

## Why it matters

- supersede 是 sanctioned 操作（spec + protocol 支持），但任何 supersede 都会
  触发此误报，使 gate 无法通过。
- 用户级无法绕过：不能手改 `rb_output_declarations.jsonl`（硬规则 + spec
  work-unit-provenance-gate §禁止），supersede 不可逆，无 reconcile 命令。
- 违反 gate spec 的 "historical only" 语义，把合法 lineage 状态误判为作弊信号。

## Suggested direction

- `nonSubmittedDeclarationRows` 或 raw reader 应排除带 `supersession_relation`
  的 rows（只扫 current lineage leaf），或复用
  `readSubmittedWorkUnitDeclarations`（已排除 superseded）作为对比基准。
- `readOutputDeclarations`（raw）用于 bypass 时需与 normalized set 对齐。

## Verification

提交 + supersede 一个 wave1 work unit → gate 应通过（predecessor 视为 historical，
不报 bypass）。当前 head 报 3 个 bypass。
