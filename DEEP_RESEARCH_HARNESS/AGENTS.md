# AGENTS.md

在 `DEEP_RESEARCH_HARNESS/` 下，或用户把本目录 / `RUN.md` 丢进对话时，按下面做。

## 0. Execution Brief

用户是在查问题、要报告、或点名本 Harness → 这是研究，不是代码探索。**本 Harness 就是项目的 Deep Research Harness。**

| 这一轮是 | 打开 | 完成 | 此刻不要 |
|---|---|---|---|
| 研究 / 续跑 / 报告 | 给了可达 existing bundle candidate（目录或其中的文件）→ 打开 `command_playbook/continue-run-bundle.md` 的 **Entry Selection (canonical)**（含 `unsupported_current_entry_contract`）。没给 → 打开 `RUN.md`。 | selected entry 已在上下文 | entry 前不调用 `research`、`deep-research` 或等价 one-shot shortcut，不对该 request 直接 WebSearch/WebFetch，也不手工收集或综合 evidence |
| 改本目录行为 | 回到仓库根，走根 `AGENTS.md` Execution Brief 的「改行为」行 | 根 Brief 那一行完成 | 把本目录当代码库逛完再改 |

入口选择的完整规则只有一处 canonical 表述：`command_playbook/continue-run-bundle.md` 的 "Entry Selection (canonical)" 节；本文件只放指针。
`start-research.md` 只是 RUN.md 后的下游 new-run playbook。新研究先读 `RUN.md`，再由其 Section 2 进入 `command_playbook/start-research.md`。
此限制只覆盖 entry 前；`RUN.md` 进入的 HITL1 probe 与后续 phase 已授权的 research 仍按其原有 contract 执行。仓库 guidance 不能保证宿主不会预先匹配 skill 或注入工具。
触发按意图，不按关键词：用户即使只贴了 `DEEP_RESEARCH_HARNESS` 的路径、没说"研究"二字，只要意图是研究，就走上面入口。人仍可在 Harness operational contract 外直接阅读历史 Markdown。

HITL 只有 hitl1 / hitl2。其余 `stop: no`，自己往下走。
想找命令：`COMMANDS.md`。搞不清流程：`README.md`。

## 共享项目上下文

根项目坐标按序是 `../openspec/constitution/project-charter.md`，再是
`../CONTEXT.md`。根 `CONTEXT.md` 是全项目唯一的术语对齐 glossary；它不替代
applicable accepted/executable contract，也不在 `DEEP_RESEARCH_HARNESS/` 创建第二份
`CONTEXT.md`。

这些坐标不是 Deep Research Harness research entry，不选择 run，也不
授权 request-specific research；跑研究不必先读它们。入口选择仍只走
`continue-run-bundle.md` / `RUN.md`。

按本目录的 `README.md`、`COMMANDS.md` 和 selected
playbook 进入具体操作。

## Must Read

- `README.md`：本目录的 canonical runtime guide。**触发规则和行为指令都在里面。**
- `COMMANDS.md`：想做什么事？从这里找对应命令。
- `command_playbook/start-research.md`：`RUN.md` 已选定新研究 entry 后使用的下游 playbook。
- `command_playbook/continue-run-bundle.md`：明确 existing bundle 的 reload/continuation 入口。

搞不清楚流程时，回到 `README.md`。

> 注：本文件是唯一真实入口文件；`CLAUDE.md` 是指向本文件的 symlink（Claude Code 读到的即本文件）。改路由规则只改这一份。
