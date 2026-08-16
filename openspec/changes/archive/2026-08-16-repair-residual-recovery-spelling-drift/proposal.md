# Proposal: repair-residual-recovery-spelling-drift

## Why

第二轮清理计划 `_backlog/plans/midrun-burden-reduction-and-residual-drift.md`(2026-08-16
全仓复查)确认第一轮 `guidance-drift-cleanup-machine-guards` 修复零回退,但残留 6 处同类漂移
(R1–R6,§1.1)。其中 R1/R2 是 recovery 反馈的 `repair_kind` 在**文档 prose** 里回退成下划线
拼写(`recover_transaction`),按文档比对永远匹配不上引擎发射的 `'recover-transaction'`;R3 是
决策表锁定测试对文档面完全盲区。其余 R4/R5/R6 是无指针 / 无具体下一跳 / 裸文件名歧义。
本 change 把这一类残留一次修掉,并把"拼写漂移"从人工复查改为机器锁死。

## What Changes

全部为已核验的事实校准(证据编号与目标坐标以当前树为准,apply 时复核):

- **R1/R2(连字符化)**:`DEEP_RESEARCH_HARNESS/COMMANDS.md:134` 与
  `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md:141` 的
  `repair_kind: recover_transaction` → `repair_kind: recover-transaction`,与引擎
  `work-unit-transaction.mjs:270,277,689,744` 发射值一致。
- **R3(测试锁死)**:`tests/engine/work-unit-recovery-decision-table.test.mjs` 的
  CLI-verb 拼写扫描面从 4 个引擎文件 + RUN.md 扩到全部 DRH 文档面
  (`COMMANDS.md`、`shared-subagent-protocol.md`、`cli/README.md`、
  `command_playbook/provenance-forensics-guide.md`、`workflows/nodes/phases/phase-wave{0,1,2}.md`)。
  新扫描断言"修复前两处命中、修复后零处",把下划线 recovery 拼写从此锁死。
- **R4(指针)**:`RUN.md:16` 的 "pre-pipeline routing exception" 补指针到其定义处
  `openspec/specs/agent/agent-command-surface/spec.md`(pre-pipeline routing exception 段落)。
- **R5(下一跳)**:`CONTEXT.md:79` Working Boundary 与 `openspec/README.md:49-52` 的
  "非权威…then stop" 措辞补具体下一跳。当前树核对:`CONTEXT.md:79-83` 已有分类下一跳
  ("For capability behavior, read the applicable accepted spec; for deterministic
  facts, inspect the executable contract or selected run bundle; for a procedure,
  read its operation guide"),缺具体路径/命令 → 补指向 `openspec/README.md` control
  map 与 `openspec/specs/README.md` 的具体引用;`openspec/README.md:49-52` 的
  "leave this map and use the approved OpenSpec lifecycle" 补具体命令
  (生命周期命令,以该文件既有措辞风格为准)。
- **R6(全名)**:`COMMANDS.md:138` 与 `shared-subagent-protocol.md` no-edit 列表的裸
  `_status.json` 写全名(`_work_units/<wave>/<work_id>/_status.json`),消除与 bundle
  `rb_status.json` 的歧义。

**零 Engine 行为变化**:不触碰任何 .mjs / schema / gate definition / run bundle。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `engine/check-inspect-feedback`:MODIFY CHI-004(Attempt recovery feedback)——CLI-verb
  拼写规则从"引擎发射的 `repair_kind` + RUN.md 决策表"扩展到**全部 Agent-facing recovery
  guidance 文档面**:任何描述 work-unit recovery `repair_kind` 的文档 prose 都不得使用
  下划线拼写,决策表回归 SHALL 扫描这些文档面。这是 R1/R2/R3 的 spec 依据。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/check-inspect-feedback` | CHI-004 spec:162-283;`work-unit-transaction.mjs:270,277,689,744`;`COMMANDS.md:134`;`shared-subagent-protocol.md:141` | Modify | 现有拼写规则只锁引擎发射值 + RUN.md 决策表,不锁文档面 prose;R1/R2 修复 + R3 扫描面扩展需要该约束覆盖文档面 |
| `agent/subagent-node-contract` | 全 spec(417 行);shared-subagent-protocol.md 现状 | Excluded | R2/R6 的 shared-subagent-protocol.md 措辞是文档校准,不改变任何 SNC requirement 的可观察行为(beacon-first、身份绑定、文件验证等契约均不动) |
| `workflow/shared-node-content` | 全 spec(145 行) | Excluded | shared-subagent-protocol.md 不在该 spec 的 5 个 shared node 清单内;无 requirement 涉及 no-edit 列表措辞 |
| `bundle/run-entry` | 全 spec(295 行);RUN.md:16 | Excluded | R4 是 RUN.md 措辞加指针(指向 agent-command-surface 既有定义),不改变 RUE requirement 语义 |
| `agent/agent-context-routing` | 全 spec(285 行);CONTEXT.md:77-83;openspec/README.md:45-55 | Excluded | R5 是对 ACR-001 既有"direct readers to existing authority"的执行改进(补具体路径),不改变 requirement |
| `engine/cli-exit-code-conventions` | CLE spec 现状 | Excluded | 本 change 不触碰任何 CLI 退出码或命令登记 |

## Impact

- **目标文件**:`DEEP_RESEARCH_HARNESS/COMMANDS.md`、`DEEP_RESEARCH_HARNESS/RUN.md`、
  `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md`、
  `DEEP_RESEARCH_HARNESS/cli/README.md`(仅扫描面,视内容决定是否需校准)、
  `DEEP_RESEARCH_HARNESS/command_playbook/provenance-forensics-guide.md`(仅扫描面)、
  `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave{0,1,2}.md`(仅扫描面)、
  `CONTEXT.md`、`openspec/README.md`。
- **测试**:`tests/engine/work-unit-recovery-decision-table.test.mjs`(扫描面扩展)。
- **spec**:`openspec/changes/repair-residual-recovery-spelling-drift/specs/engine/check-inspect-feedback/spec.md`
  (1 个 delta,MODIFIED requirement;无 New capability、无新 requirement ID)。
- **无影响**:无 schema/state/Gate/controller/CLI 行为变化;无 run bundle 兼容性影响;
  不触碰 C2 的 markdown 瘦身范围(本 change 只修 R1–R6 六处,不做 wave §9 / §7 去重)。

## 语义反思(semantic-precision)

本 change 不引入任何新的 reader-facing surface、state、projection 或 command。它只校准
**既有文档措辞与其声明的事实所有者之间的关系**:

- 读者:运行中的 Phase Agent / 维护者,读到 recovery 反馈与 no-edit 清单。
- 有界问题:"当前文档说的 `repair_kind` 值 / 文件坐标,是否与引擎与文件系统真相一致?"
- 必须保留的区别:文档面(Agent 可读指引,不决定 machine state)↔ 引擎发射值
  (deterministic fact,唯一拼写真相源);work-unit 级 `_status.json` ↔ bundle 级
  `rb_status.json`。
- 正常推理停止点:文档与引擎/文件系统比对一致即停;不再需要人工逐仓复查拼写漂移
  (R3 测试接管)。

## 简洁准入两问(simple-reliable-control)

1. **direct Source of Record**:recovery `repair_kind` 拼写的真相源是引擎
   `work-unit-transaction.mjs` 的发射值与 CHI-004 spec;文档面只是展示,必须与之一致。
   每处漂移都收敛到一个已存在的事实所有者,不新建真相。
2. **最短合法闭环 + net simplification**:修复 = "文档 ↔ 引擎/文件系统" 直接对照;
   删除(两处下划线漂移、一处裸文件名、两处无指针措辞)多于增加(仅测试扫描面扩展);
   新增的确定性检查(文档面拼写扫描)是**替代**人工复查,不是叠加新控制层。

## 责任边界(user decision / Agent execution / Engine verdict)

- **User decision**:无。本 change 无方向性拍板项;计划 §Non-Goals 已排除 hook/CI 与
  loader 改动。
- **Agent execution**:R1/R2/R4/R5/R6 文档校准、R3 测试扫描面扩展、delta spec 与任务执行。
- **Engine verdict**:拼写一致性由确定性回归(integration)裁决;引擎发射值与既有行为零变化。
