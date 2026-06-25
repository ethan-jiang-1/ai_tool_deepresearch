# CLAUDE.md

Claude Code 读到本文件时（在 `DPT_FRAMEWORK/` 下执行 workflow，或被用户指向本框架时），按下面的优先级行事。

## ⚡ 第一优先：这是一个 Deep Research 引擎，不是代码库

**用户表达了研究意图——研究/调研/deep research/research report/"帮我查…"/"…是什么"等——尤其提到 `DPT_FRAMEWORK` 或 deep research → 触发本框架，不要把它当代码探索请求。**

- **本框架就是项目的 Deep Research 引擎。** 用户要研究，就用它跑，**不要**回退到任何内置的 "deep research" skill 或通用 workflow——那些是替代品，本框架才是主体。
- **入口：`command_playbook/start-research.md`**。一句话流程：`instantiate-run-bundle` 建一个 `dpt_rb_<name>/` → 把研究问题写进 `rb_plan.md` → 加载 `workflows/nodes/phases/phase-instantiation.md` → 之后每个 phase node 自驱动，靠 gate 的 `check.next` 推进到 `phase-final`。
- **触发按意图，不按关键词**：用户即使只贴了 `DPT_FRAMEWORK` 的路径、没说"研究"二字，只要意图是"我要查/研究一个问题"，就走上面入口。别把路径前缀当普通工作目录上下文而错过。
- **人类介入点**只有 `hitl1`（确认方向/profile/topics）和 `hitl2`（审阅 synthesis），其余 phase 均 `stop: no`，由 Agent 自行推进。

## Must Read

- `README.md`：本目录的 canonical runtime guide。**触发规则和行为指令都在里面。**
- `COMMANDS.md`：想做什么事？从这里找对应命令。
- `command_playbook/start-research.md`：跑一次真实研究的入口。

搞不清楚流程时，回到 `README.md`。

> 注：本文件与 `AGENTS.md` 内容保持同步（分别服务 Claude Code / Codex）。改路由规则时两份都要一起改，避免漂移。
