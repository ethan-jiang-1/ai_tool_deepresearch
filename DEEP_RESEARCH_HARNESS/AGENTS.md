# AGENTS.md

Codex 读到本文件时（在 `DEEP_RESEARCH_HARNESS/` 下执行 workflow，或被用户指向这个 Deep Research Harness 时），按下面的优先级行事。

## 共享项目上下文

开始任何 Deep Research Harness work 前，先读 `../openspec/constitution/project-charter.md`，再读
`../CONTEXT.md`。根 `CONTEXT.md` 是全项目唯一的术语对齐 glossary；它不替代
applicable accepted/executable contract，也不在 `DEEP_RESEARCH_HARNESS/` 创建第二份
`CONTEXT.md`。

完成这个 pre-read 后，再按本目录的 `README.md`、`COMMANDS.md` 和 selected
playbook 进入具体操作。这个 pre-read 不是 Deep Research Harness research entry，不选择 run，也不
授权 request-specific research；下方既有的 `continue-run-bundle.md` / `RUN.md`
选择规则保持不变。

## ⚡ 第一优先：这是一个 Deep Research Harness，不是代码库

**用户表达了研究意图——研究/调研/deep research/research report/"帮我查…"/"…是什么"等——尤其提到 `DEEP_RESEARCH_HARNESS` 或 deep research → 触发这个 Harness，不要把它当代码探索请求。**

- **本 Harness 就是项目的 Deep Research Harness。** 对已选择的研究，只有用户明确提供当前 workspace 内可达的 existing bundle candidate（目录或其中的文件）并要求继续/检查时，才先检查同根 `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md`；通过后读 `command_playbook/continue-run-bundle.md`，其目录解析为本次操作的 canonical absolute current run bundle root。显式 candidate 缺少任一文件即报告 `unsupported_current_entry_contract` 并停止；不得读 legacy entry、回落 `RUN.md`、新建/另选 bundle、迁移、upgrade 或提供 human-only Harness command。没有 explicit candidate 才读 `RUN.md`。扫描发现、只提文件名或不可达路径都不选择 run，也不从文件坐标执行命令；人仍可在 Harness operational contract 外直接阅读历史 Markdown。
- **entry 前不做替代研究。** 在上述 selected entry 读完前，不调用 `research`、`deep-research` 或等价 one-shot shortcut，不对该 request 直接 WebSearch/WebFetch，也不手工收集或综合 evidence。此限制只覆盖 entry 前；`RUN.md` 进入的 HITL1 probe 与后续 phase 已授权的 research 仍按其原有 contract 执行。仓库 guidance 不能保证宿主不会预先匹配 skill 或注入工具。
- **`start-research.md` 只是 RUN.md 后的下游 new-run playbook。** 没有上述明确 existing map 时，先读 `RUN.md`，再由其 Section 2 进入 `command_playbook/start-research.md` 创建 `dpt_rb_<name>/`、写入研究问题、加载 `phase-instantiation.md`；之后每个 phase node 靠 `check.next` 推进到 `phase-final`。
- **触发按意图，不按关键词**：用户即使只贴了 `DEEP_RESEARCH_HARNESS` 的路径、没说"研究"二字，只要意图是"我要查/研究一个问题"，就走上面入口。别把路径前缀当普通工作目录上下文而错过。
- **人类介入点**只有 `hitl1`（确认方向/profile/topics）和 `hitl2`（审阅 synthesis），其余 phase 均 `stop: no`，由 Agent 自行推进。

## Must Read

- `README.md`：本目录的 canonical runtime guide。**触发规则和行为指令都在里面。**
- `COMMANDS.md`：想做什么事？从这里找对应命令。
- `command_playbook/start-research.md`：`RUN.md` 已选定新研究 entry 后使用的下游 playbook。
- `command_playbook/continue-run-bundle.md`：明确 existing bundle 的 reload/continuation 入口。

搞不清楚流程时，回到 `README.md`。

> 注：本文件与 `CLAUDE.md` 内容保持同步（分别服务 Codex / Claude Code）。改路由规则时两份都要一起改，避免漂移。
