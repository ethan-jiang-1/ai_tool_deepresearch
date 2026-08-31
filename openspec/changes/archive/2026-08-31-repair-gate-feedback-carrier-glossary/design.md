# Design: repair-gate-feedback-carrier-glossary

## Context

现状（2026-08-31 实证，全部坐标可复核）：

- `CONTEXT.md:57` 术语行与 `:72` 罗塞塔行声明 gate/phase 门禁面载体字段为
  `hints[].resolution_owner`，权威源 `openspec/specs/engine/check-inspect-feedback/spec.md`。
- `resolution_owner` 全仓库仅存在于 `CONTEXT.md` 与两个锁测试
  （`tests/integration/md/repair-directive-lock.test.mjs:45`、
  `tests/integration/md/guidance-terminology-pointer-consistency.test.mjs:58`）；
  `git log -S resolution_owner` 仅一个 commit（f089a16dc，即归档 change
  `2026-08-30-disambiguate-feedback-repair-surfaces` 的 apply commit）。
- 真实载体：`repair_kind` —— `check-inspect-feedback/spec.md:57`（hints[] including
  `repair_kind`）、`DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs`
  `GATE_REPAIR_KINDS`（五值：agent_action / engine_operation / user_decision /
  external_action / missing_contract，与 CONTEXT 枚举逐值一致）、全部 gate helpers 发射代码。
- 归档 change `2026-08-30-disambiguate-feedback-repair-surfaces` 的改名只有 work-unit
  半边落地（`work-unit-repair-vocabulary.mjs` → `WORK_UNIT_RECOVERY_ACTIONS`，
  `work-unit-attempt-disposition.mjs:52` 发射 `recovery_action`）；gate 半边
  （tasks 2.2，[x]）未出现在该 commit 的 --stat 中；tasks 6.1"全系统再无 repair_kind
  跨层混用"与树不符。

**Finding（evidence honesty）**：上述归档 change 的 tasks 2.2/6.1 完成声明与树不符。
本 change 在此记录该 finding；归档工件不可改，不回写历史。

## Goals / Non-Goals

- **Goals**：`CONTEXT.md` 词汇投影对齐 accepted contract；两个锁测试升级为从
  engine/schema 导出派生（decision-table 既有范式），并加 negative lock 防退役词回归。
- **Non-Goals**：不补完 gate 侧字段改名（engine/spec/CLI/consumer 全动，爆炸半径大且
  spec 与代码现已一致，改名失去动机）；不改 RUN.md/engine/schema/specs；不新增 checker；
  不动 README/AGENTS 共享段、host_tools 文档（深挖已降级为可选/不成立）。

## D1: 恢复 `repair_kind` 而不是补完改名

08-30 change 的动机是 `repair_kind` 一名两义（gate 责任面 vs work-unit 恢复面）造成
Agent 串味。该前提已失效：work-unit 恢复面已物理改名为 `recovery_action`，
`repair_kind` 现在唯一对应"责任主体划分"词汇（gate hints、queue admission、work-unit
validation 反馈共用同一 `GATE_REPAIR_KINDS` 五值集）。因此最小且语义正确的修复是让
`CONTEXT.md` 回到 `repair_kind`，而不是为消歧一个已不存在的冲突去改 engine。

**Semantic-precision reflection**：读者 = 解析结构化反馈的 Agent；有界问题 =
"哪个字段告诉我由谁处置本次门禁未通过"；必须保留的区别 = 三个反馈面三个载体名
（`repair_kind` / `recovery_action` / `repair_directive`）；正常推理停止点 = 行内
五值 + 权威源坐标已可回答，更深语义去 owner spec；unknown = 无。

**Source of Record**：gate/phase 面语义 = `openspec/specs/engine/check-inspect-feedback/spec.md`；
可执行枚举 = `DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs` `GATE_REPAIR_KINDS`。
罗塞塔行不复制枚举定义，只投影并列出可执行坐标。

**责任边界**：无 permission/capability 变化；Engine 判定、Agent 执行、用户决策均不变；
本 change 不创造任何 runtime authority。

## D2: 锁从导出派生（单向 presence 锁 → 双向派生锁）

`repair-directive-lock.test.mjs` 新增：ESM 导入 `GATE_REPAIR_KINDS`，逐值断言其出现在
`CONTEXT.md` Gate/Phase 罗塞塔行内；既有 file-observability 六值发射断言保持不变。
Row 2（work-unit 恢复面）保持摘要式"等"不改枚举全列：它的双向锁已由
`tests/engine/work-unit-recovery-decision-table.test.mjs` 拥有（本次零改动、保持绿），
CONTEXT 行只是导航摘要，不做第二份枚举全列。净效果：删除一个幽灵术语，把 2 个
presence 锁升级为派生锁；不新增任何 checker、状态或 fallback。

## D3: negative lock（单点）

`repair-directive-lock.test.mjs`（三面区分锁的 owner）加一条
`assert.ok(!context.includes('resolution_owner'))`：防止退役词以任何形式回到词汇
正典。只放这一处——两处重复断言违反本仓库自身的反冗余取向，且该文件就是
F-03 术语行锁的单一 owner。范围仅 `CONTEXT.md`（归档历史不在断言范围）。

## D4: rider

`CONTEXT.md:55` 英文句内全角"。"改半角"。 "。同文件 1 字符，与载体修正同一 diff，
语言约定（README：精确 token/推理边界分段归一）的顺手归一。

## Open Questions

无——范围已由用户确认（只修值得修的：本项；其余候选已明确不做）。
