## Context

见 `proposal.md` Why。约束：ACR-002/004 当前把 Charter-then-context 锁在六处入口；GCO-008 拓扑测试从根 `## Before Anything Else` 抽同步块；入口选择短语锁在 `tests/integration/md/dpt-research-entry-routing-contract.test.mjs`、`continue-run-bundle-contract.test.mjs` 与 `tests/integration/deep-research-harness-entry-contract.test.mjs`；GCO-001 要求根 `AGENTS.md` 首屏指向 `invariants-brief.md`；`CLAUDE.md` 必须保持指向 `AGENTS.md` 的 symlink。

## Goals / Non-Goals

**Goals:**
- Always-loaded 入口变成可检查的下一步（打开哪个文件 / 何时算完）。
- 所有权预读只挂在改行为支。
- 入口防错短语仍出现在根 `## Deep Research Routing` 与 Harness 研究支，既有 RUE/ACS 回归保持绿。
- ACR 回归改锁新过程，不锁旧 essay。

**Non-Goals:**
- 不改入口决策树、不收成「无短语的真指针」。
- 不合并反馈面、不改 `CONTEXT.md` 罗塞塔、不改 `RUN.md` 恢复表、不改 phase 正文、不改 Engine。
- 不声称真实 Agent 行为（无 `agent_flow_e2e`）。

## Decisions

1. **复用 phase 的 `## 0. Execution Brief` 标题，不造新概念。**
   备选：新建 `## Start Here` 或「任务分类器」表 → 拒绝。WNC 已把 Execution Brief 定为有界动作核；换标题要多锁一个 heading，且像第四张路由。

2. **根文件保留 `## Deep Research Routing`，把测试已锁的英文防错短语留在该节。**
   备选：只留中文三行、改入口回归 → 拒绝。那是第二条哲学（真指针），会碰 RUE-006/ACS-005。本 change 只改「何时读 Charter」。

3. **Harness 保留 `## 共享项目上下文` 标题，改正文；退役 `## ⚡ 第一优先`。**
   备选：删掉共享上下文节 → 拒绝。GCO-008 拓扑测试与 ACR 用该 heading 定位成对同步。正文仍按序写出 `../openspec/constitution/project-charter.md` 与 `../CONTEXT.md`，并写明不是 research entry、跑研究不必先读。`## ⚡ 第一优先` 由 Execution Brief 取代。

4. **README 两处预读跟着 ACR 走，不扩成第二份 Brief。**
   根 README `## Start Here` 指向 `AGENTS.md` Execution Brief，不再写「每个实质性任务先 Charter」。Harness README 的共享上下文保留 non-entry 句，去掉「触发前必读 Charter」。
   备选：README 不动 → 拒绝。ACR-004 现锁 README 顺序，不动则回归必红。

5. **Hard Rules / Do Not Read / OpenSpec 表留在根 `AGENTS.md` Brief 之后，作 in-file reference。**
   备选：整页只留 Brief → 拒绝。工程约束（无 Python、apply 前只读、测试放置）没有别的 always-loaded 载体。

6. **无新 requirement ID。** ACR-002/004 标题保持稳定锚点，只换全文。registry 描述在 apply 同步 main spec 时改一句。

7. **GCO-008 拓扑测试改定位，不改 GCO 正文。**
   `tests/integration/md/project-guidance-topology-contract.test.mjs` 现从根 `## Before Anything Else` 抽同步块，并从 Harness `## 共享项目上下文` 断言 Charter 路径在 CONTEXT 前。根块改抽 `## 0. Execution Brief`；Harness 块标题不动，坐标顺序靠决策 3 保住。GCO-008 只要求「root/Harness route ordering and required synchronized blocks」，不点名旧 heading。

8. **入口防错短语清单（apply 不得丢；来源为现测）。**
   根 `## Deep Research Routing`（`dpt-research-entry-routing-contract`）：`explicitly supplied reachable existing bundle candidate`；`same-root \`BUNDLE_ENTRY.md\` + \`BUNDLE_MAP.md\` preflight`；`continue-run-bundle.md`；`unsupported_current_entry_contract`；`With no supplied existing candidate` + `DEEP_RESEARCH_HARNESS/RUN.md`；`discovered, bare, or unreachable file does not select a run`；`` `research`, `deep-research`, or an equivalent one-shot shortcut` ``；`request-specific WebSearch/WebFetch`；`collect/synthesize evidence manually`；`later phase instructions authorize subsequent legal research work`。同节或 Hard Rules 须保留 `current run bundle root` 与 `bare runtime paths always resolve under that root`（`guidance-terminology-pointer-consistency`）。
   Harness `AGENTS.md`（同测 + `continue-run-bundle-contract` + `deep-research-harness-entry-contract`）：`continue-run-bundle.md`；`同根 \`BUNDLE_ENTRY.md\` + \`BUNDLE_MAP.md\``；`unsupported_current_entry_contract`；`preflight 失败，不等于「没有 explicit candidate」`；`禁止因此 fallback 读 \`RUN.md\``；`` `research`、`deep-research` ``；`直接 WebSearch/WebFetch`；`HITL1 probe 与后续 phase 已授权的 research`；`不能保证宿主不会预先匹配 skill 或注入工具`；`` `start-research.md` 只是 RUN.md 后的下游 new-run playbook` ``；`current run bundle root`。现测里「本框架就是项目的 Deep Research 引擎」已与文件现词面不一致且 match 失败时两侧都是 `undefined`（同步断言空转）；apply 不恢复该旧身份句，按文件现词面写 Brief。

## 三原则应用记录

- **语义边界：** 读者 = 本轮 Coding Agent；问题 = 下一个文件是哪一个、何时完成；区别 = 研究 / 改行为 / 已有 named next；停止点 = 点名文件已在上下文或那个 next 已执行。
- **direct Source of Record / 最短闭环：** 选 run → `continue-run-bundle.md` canonical 节；所有权 → Charter；术语 → `CONTEXT.md` 一行；确定性 → Engine。闭环：用户话 → Brief 一行 → 打开一个 owner。
- **net simplification：** 删除强制双预读与 `## Before Anything Else`；不增加 check / state / recovery / 新文件。
- **责任：** User 仍只在 HITL1/HITL2 做新语义；Agent 执行 Brief 点名的下一步；Engine 不读 Brief。

## Risks / Trade-offs

- [研究 Agent 不再先读 Charter，把 Harness 当代码库逛] → Harness Brief 第一句仍是「这是研究，不是代码探索」；入口防错短语仍在 Routing 节；既有入口回归继续跑。
- [改行为 Agent 跳过 Charter] → Brief 改行为行把 Charter 写成该支的打开目标，完成条件是 change/spec 已打开；ACR 回归锁该行仍含 Charter 在 CONTEXT 之前。
- [入口回归因 Brief 改写丢短语] → apply 时先对根 Routing 节贴回现测锁定的英文短语，再跑 `dpt-research-entry-routing-contract` 与 `continue-run-bundle-contract`。
- [Harness「本框架/本 Harness」同步测试] → 只改 `AGENTS.md`；`CLAUDE.md` 保持 symlink。现测旧身份句已空转，按文件现词面写，不恢复「本框架/引擎」。
- [漏改 GCO-008 拓扑测试导致 apply 红] → 任务 3.2 显式改 `project-guidance-topology-contract.test.mjs`；verification-plan 有独立 claim。

## Migration Plan

无运行时迁移。apply：plan-review → 改四份散文 → 改 ACR 回归与 GCO-008 拓扑测试定位 → 同步 main spec 与 registry 描述 → 跑 verification-plan 列出的 md/integration 回归。回滚：`git revert` 同一批提交。

## Open Questions

无。用户已确认三行 Brief 稿与「人看不懂不重要」的验收尺子。
