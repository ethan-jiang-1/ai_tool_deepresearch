## Why

RUE-006 已要求入口选择规则只有一处 canonical 陈述、其余 surface 只留指针；回归却按「每个 always-loaded 面都必须出现那串防错短语」来证明安全。指针因此被逼成缩写重述，封面改了多次问题仍在。来源：本会话对历次入口 change 的复盘，以及用户确认的下一刀——改证明方式，不再改 Brief 封面。

## What Changes

- 完整入口选择决策树只锁在 `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` 的 **Entry Selection (canonical)**。
- 根 / Harness `AGENTS.md`、根 `## Deep Research Routing`、Harness README / RUN / COMMANDS / `start-research.md` 的**指针/路由块**只留真指针：playbook 路径、节名 `Entry Selection (canonical)`、边界名 `unsupported_current_entry_contract`。禁止在这些块里复述选择程序。同文件后文的 pair 操作句（README「第一条」、RUN reload、目录图）不是第二棵树。
- 根 Execution Brief 三行表保留（哪一文件、完成条件）；Harness Brief 仍是研究 / 改行为两支。研究支只写「打开哪一文件」，不把决策树抄进单元格。
- 入口回归从「每个 surface 都出现短语」改为：canonical 节有全文；指针面有指针且没有第二棵树。清掉已空转的「本框架就是项目的 Deep Research 引擎」同步断言。
- **不改** Engine / Gate / phase 正文 / `CONTEXT.md` / `RUN.md` 恢复表。不新增 capability、requirement ID、路由概念或 glossary。不声称真实 Agent 行为。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `bundle/run-entry`: RUE-006 补上可观察的证明形状——完整规则只锁 canonical 节；指针面不得复述程序；文档回归按此裁决，不再把短语出现在每个 surface 当作安全证明。
- `agent/agent-context-routing`: ACR-002 去掉「`## Deep Research Routing` = 指针 + 锁住的入口防错短语」；该节改为真指针。ACR-004 把伴随回归从「保留各面短语」改为「canonical 全文 + 指针非复述」。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md` RUE-006（约 219–305 行）：已要求单一 canonical 与「point instead of restating」；未规定回归必须锁指针面短语 | Modify | 正文已禁复述，但证明义务未写进 requirement；现测与正文打架。本 change 把证明形状写进 RUE-006 |
| `agent/agent-context-routing` | `openspec/specs/agent/agent-context-routing/spec.md` ACR-002 第 134–137 行「pointer plus the locked entry-safety phrases」；ACR-004 第 295–300 行要求伴随跑「research-entry routing / continue-run-bundle pointer / harness entry-route token」合同 | Modify | ACR-002 把 8-30 reshape 留下的短语锁写成规范；ACR-004 把现测的短语合同绑成 apply 义务。必须改这两处才能换证明 |
| `agent/agent-command-surface` | `openspec/specs/agent/agent-command-surface/spec.md` ACS-005（约 391–450 行）playbook 程序；`continue-run-bundle-contract.test.mjs` `@impl ACS-005, RUE-006` | Verify-only | playbook 程序与「entry guidance 指向 playbook」不变。第一则「四份 AGENTS 必须出现短语」是 RUE-006 证明过宽，随 RUE-006 改测，不改 ACS-005 正文 |
| `bundle/run-entry` | 同 spec RUE-002；`dpt-research-entry-routing-contract.test.mjs` 对 `RUN.md` §0 的捷径禁令 | Verify-only | RUE-002：§0 禁 shortcut 不是选择决策树；本 change 不改该节 |
| `governance/guidance-constitution` | GCO-001 `invariants-brief`；GCO-008 拓扑测试 | Verify-only | Brief 标题与共享上下文节不动。若 invariants-brief 第 9 条仍复述决策树，改为指向 canonical，不改 GCO 正文 |
| `workflow/workflow-node-contract` | phase `## 0. Execution Brief` | Excluded | phase 动作核不在范围 |

## Impact

- 根 / Harness `AGENTS.md`（`CLAUDE.md` 仍是 symlink，不另写）
- 根 `README.md` 仅当 Routing 指针句需要与 Brief 对齐时触及；不改 scoped-reading / adr
- `DEEP_RESEARCH_HARNESS/README.md` 触发规则段去掉决策树复述，保留意图触发与非研究 carve-out
- `DEEP_RESEARCH_HARNESS/COMMANDS.md`、`RUN.md`（仅入口指针句，不动 §0 与恢复表）、`command_playbook/start-research.md`
- `openspec/guidance/models/invariants-brief.md` 第 9 条若仍复述树则改为指针
- `openspec/specs/bundle/run-entry/spec.md`、`openspec/specs/agent/agent-context-routing/spec.md` 与 registry 描述句
- `tests/integration/md/dpt-research-entry-routing-contract.test.mjs`
- `tests/integration/md/continue-run-bundle-contract.test.mjs`（第一则）
- `tests/integration/deep-research-harness-entry-contract.test.mjs`（routeFiles 短语循环）
- 既有 ACR / GCO / harness-entry-doc-consistency / guidance-terminology 回归保持其非选择树断言
- 无 CLI / schema / gate / runtime bundle 行为变化

## Direct Source of Record 与净简化

- 选择规则的 Source of Record：`continue-run-bundle.md` Entry Selection (canonical)。指针面不是第二份规则。
- 最短闭环：always-loaded 面点名 canonical 节 → Agent 打开那一节 → 按该节裁决。不再在 8 个面同步同一棵树。
- net simplification：删除各面缩写重述与「本框架就是引擎」空转锁；不增加 check / state / recovery / 新文件。证明从「短语在场」改为「一处全文、别处无第二棵树」。

## Semantic Precision

读者是拿到本轮用户话的 Coding Agent。有界问题：**入口选择规则的全文在哪一节，其它面是不是第二份规则。** 必须保留的区别：Brief「打开哪一文件」≠ 选择程序本身；canonical 全文 ≠ 指针；`unsupported_current_entry_contract` 是边界名，不是把 preflight 抄回封面。正常推理停止点：打开 canonical 节，或确认指针面没有第二棵树。不新增路由概念。

## 责任边界

- User：已确认改证明方式、不改 Brief 三行过程、不测真实 Agent。
- Agent：改指针散文、改回归断言、同步 RUE-006 / ACR-002 / ACR-004。
- Engine：不读 Brief，不裁决选择规则写得好不好；确定性裁决只覆盖「canonical 有全文 / 指针面无复述 / symlink 形态」。
