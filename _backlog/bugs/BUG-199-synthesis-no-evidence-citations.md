---
bug_id: BUG-199
title: "Final synthesis claims evidence-backed findings but cites zero evidence files — no traceable citation trail"
severity: P1
discovered: 2026-08-03
bundle: dpt_rb_agentic-rd-org-delivery-systems-2026
phase: final
node: phases/phase-final.md
related: BUG-195 (missing_cache), BUG-196 (work_done no transition), BUG-197 (reenqueue blocked)
---

# BUG-199: Final synthesis with zero evidence citations

## 现象

`final/synthesis-2026-08-03.md`（226 行）声称完成了：
- 5 层分析、6 假设验证、趋势矩阵、风险分类表、90 天试点设计
- "已收集 ~125 个来源"

但 grep 全文，**对证据文件的引用数为 0**：

```
$ grep -cE "artifacts/|reference/|source.yaml|_cache/" final/synthesis-2026-08-03.md
0
```

也就是说：这份 final report 声称 evidence-backed，但全文没有任何一行指向
`reference/00-shared-*.md`、`artifacts/wave0/*/source.yaml`、`_cache/` 或任何
submitted work-unit 证据。读者无法从报告追溯到任何一手来源。

## 用户直觉 vs 实际

用户说 "reference 只有这么一点信息，感觉上很不对"。核查后发现要拆两层：

**第一层：`reference/` 只有 11 个文件 —— 这是设计如此，不是缺货。**

`reference/` 是**投影层**（materialized projection），不是证据仓库：
- 9 个 `00-shared-*.md`（wave0 共享参考）
- 2 个 wave1 topic 参考（02、04 两个 submitted 的 topic）
- 真实证据在别处且是完整的：
  - `artifacts/wave0/*/source.yaml`：16+15+15+15+24 = **85 sources** ✓
  - `_cache/`：397 个文件（每 topic 45-77 个 leaf）✓
  - `rb_output_declarations.jsonl`：5 个 wave0 work units 全部 submitted ✓

**第二层（真问题）：final synthesis 无引用 + 3 个 wave1 topic 证据成孤儿。**

- `synthesis` 全文 0 处证据引用 —— 这是违反项目核心原则（evidence-backed
  research report）的直接证据
- Wave1 有 5 个 topic 的 `evidence-summary.md` 都写出来了（磁盘上 31-43 行
  不等），但 **只有 02、04 两个 work unit submitted**；01、03、05 的 work unit
  status 是 `failed`，evidence 文件躺在磁盘上但**不在 ledger 覆盖范围内**——
  正是 `shared-subagent-protocol.md` §8 说的 "diagnostic only, not production
  authority"

## 根因

两条叠加：

1. **BUG-195/196/197 连锁**：Wave1 3 个 topic 因 `missing_cache` fail，`work_done`
   不转 status，queue 拒绝 reenqueue —— 导致 Wave1 半途而废，Agent 被迫
   "with what we have" 直接跳到 final。这条链已经单独报过 card。

2. **Final phase 生成 synthesis 时没有强制引用链校验**（新问题）：
   - `phase-final.md` 允许 Agent 生成报告，但没有像 wave gate 那样检查
     "每个 finding 至少指向一个 submitted evidence 文件"
   - Agent 在 degraded 状态下写了一篇"看起来完整"的综合报告，但内容与
     `reference/`、`artifacts/` 完全脱节
   - 结果：报告声称 125 来源、6 假设验证，实际上没有任何可审计的证据链接

## 影响

- **P1**：final report 是用户唯一会读的交付物。一份"零引用"的综合报告：
  - 无法审计：任何一个 finding 都无从验证出处
  - 违反 evidence-backed 原则：内容可能是 LLM 合成，不是证据推导
  - 浪费了 85 sources + 397 cache files 的取证资产——都躺在仓库里但报告不指它们
- 用户在看 `reference/` 时感觉"很不对"——直觉准确，只是指向错了文件：
  该质疑的不是 reference 目录大小，而是 synthesis 为何不引用这些证据

## 建议修复方向

1. **Gate 层强制**：`check-gate-final-complete.mjs` 增加一条
   `synthesis_evidence_citations` 规则：synthesis 中每个 claim/section 至少
   引用一个 submitted evidence 表面（`reference/`、`artifacts/`、`_cache/`
   或 ledger work_id）。零引用 → gate fail。

2. **Phase-final guidance**：`phase-final.md` 明确要求 synthesis 的
   Key Claims 部分必须带 `[ref: reference/00-shared-<slug>.md]` 或
   `[src: artifacts/wave0/<topic>/source.yaml#sNN]` 形式的引用，没有引用
   的 finding 不算 delivered。

3. **孤儿证据清理**：wave1 topic 01/03/05 的 evidence-summary.md 在磁盘上但
   work unit failed。要么走 BUG-197 修复后的 reenqueue 路径正式 submit 它们，
   要么明确标记为 "not_submitted_diagnostic" 并在报告中排除。

## 本次 trace 证据

- `final/synthesis-2026-08-03.md` 226 行，`grep -cE "artifacts/|reference/|source.yaml|_cache/"` = 0
- `reference/` 11 文件（9 shared + 2 wave1）—— 投影层，设计如此
- `artifacts/wave0/*/source.yaml` = 85 sources —— 完整
- `_cache/` = 397 files —— 完整
- Wave1: wu-w1-b000-deep-i0001/0003/0005 status=failed（证据文件在磁盘但未 submit）
