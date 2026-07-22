# CLAUDE.md

Claude Code 读到本文件时（在 `DPT_FRAMEWORK/` 下执行 workflow，或被用户指向本框架时），按下面的优先级行事。

## ⚡ 第一优先：这是一个 Deep Research 引擎，不是代码库

**用户表达了研究意图——研究/调研/deep research/research report/"帮我查…"/"…是什么"等——尤其提到 `DPT_FRAMEWORK` 或 deep research → 触发本框架，不要把它当代码探索请求。**

- **本框架就是项目的 Deep Research 引擎。** 如果在工具列表中看到 `deep-research` skill——**不要调用它**。用户要研究就用本框架跑，详见 `RUN.md` Section 0。
- **已有 bundle 优先入口**：只有用户明确提供当前 workspace 内可达的 existing `BUNDLE_MAP.md` 并要求继续/检查时，先读 `command_playbook/continue-run-bundle.md`。扫描发现、只提文件名或不可达 map 都不选择 run，也不从 map 坐标执行命令。
- **新研究入口：`command_playbook/start-research.md`**。没有上述明确 existing map 时，创建 `dpt_rb_<name>/`、写入研究问题、加载 `phase-instantiation.md`，之后每个 phase node 靠 `check.next` 推进到 `phase-final`。
- **触发按意图，不按关键词**：用户即使只贴了 `DPT_FRAMEWORK` 的路径、没说"研究"二字，只要意图是"我要查/研究一个问题"，就走上面入口。别把路径前缀当普通工作目录上下文而错过。
- **人类介入点**只有 `hitl1`（确认方向/profile/topics）和 `hitl2`（审阅 synthesis），其余 phase 均 `stop: no`，由 Agent 自行推进。

## Must Read

- `README.md`：本目录的 canonical runtime guide。**触发规则和行为指令都在里面。**
- `COMMANDS.md`：想做什么事？从这里找对应命令。
- `command_playbook/start-research.md`：没有明确 existing map 时跑一次新研究的入口。
- `command_playbook/continue-run-bundle.md`：明确 existing bundle 的 reload/continuation 入口。

搞不清楚流程时，回到 `README.md`。

> 注：本文件与 `AGENTS.md` 内容保持同步（分别服务 Claude Code / Codex）。改路由规则时两份都要一起改，避免漂移。
