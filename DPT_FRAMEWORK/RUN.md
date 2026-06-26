# RUN.md — DPT_FRAMEWORK 入口
>**这个文件在对话中即触发**
> 你读到这段，说明用户要用 DPT_FRAMEWORK 跑一次研究。
> 这个文件就是"前门"：它的内容会直接进当前 agent 的上下文（Claude Code / Codex / Cursor / Windsurf 等任意 coding agent 通用），绕开"要不要进目录"的判断。

## 1. 先确认引擎（一句话）
当前 agent 可能有内置的"快速研究/搜索"捷径（Claude Code：`deep-research` skill；Codex / Cursor / Windsurf 等：各自的内置搜索/research）——它们通用、一次性、无 gate、无证据包。
`DPT_FRAMEWORK` 是本项目的 Deep Research 引擎：证据可追溯、多轮、gate 门控、产出可校验的 bundle。 这个bundle 运行起来就是可以产生高质量的调研/研究/探索结果。
**默认走框架**；用户没明说就先用一句话确认走哪个，再开跑——不要默认回退到该 agent 的内置研究/搜索捷径。

## 2. 开跑（框架）
完整步骤见 `command_playbook/start-research.md`，一句话版：

1. 定名（kebab-case，取英文前 6 词）
2. 建 bundle：`B=$(node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>)`
3. 把研究问题写进 `$B/rb_plan.md`
4. 加载 `workflows/nodes/phases/phase-instantiation.md`，按 instruction 执行，之后靠 gate 的 `check.next` 自驱动到 `phase-final`

人类介入点只有 `hitl1`（定方向 / profile / topics）和 `hitl2`（审 synthesis），其余 phase 均 `stop: no`，Agent 自行推进。

若已有 active bundle：别重建，打开该 bundle 的 `START_FROM_HERE.md`，读 `rb_status.json` 的 `current_gate` 续跑。

## 3. 规则与边界在哪
- 触发规则、运行时边界：`README.md`
- 命令索引：`COMMANDS.md`
- 行为规则：`CLAUDE.md`（Claude Code）/ `AGENTS.md`（Codex、Cursor、Windsurf 等读 `AGENTS.md` 的 agent）

跑某 bundle 时，以该 bundle 的 `START_FROM_HERE.md` + `rb_status.json` + `rb_trace.jsonl` 为准，别靠 chat memory。
