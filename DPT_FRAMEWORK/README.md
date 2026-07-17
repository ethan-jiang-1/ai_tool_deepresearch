# DPT_FRAMEWORK

Deep Research Framework (`DPT_FRAMEWORK/`) 的运行时入口说明。

框架采用 recommendation-first 的两点交互节奏：HITL1 对齐，静默自主研究，HITL2 审阅，Final 交付；用户主动问答不会自动变成新的 checkpoint 或运行权力。

> **最快触发**：把本目录下的 `RUN.md` 拖进对话——文件内容会直接进上下文，触发本框架，绕开"要不要进目录"的判断。

## 触发规则（最高优先）

**用户有研究意图 → 触发本框架。** 这是 Deep Research 触发信号，不是代码探索请求。触发信号包括但不限于：

- 用户提到 `DPT_FRAMEWORK`——**哪怕只是贴出本目录的路径**——并带一个问题；
- 用户说"研究/调研/deep research/research report/帮我查…/…是什么"等研究意图；
- 任何"我要就某个话题得到一份有来源、可核查的研究报告"的需求。

**本框架就是项目的 Deep Research 引擎。** 用户要研究就用它跑，**不要**调用任何内置 "deep research" skill 或通用 research workflow——那些是替代品，本框架才是主体。入口 `RUN.md` Section 0 有完整禁用指令。

不要浏览文件结构。直接走 `command_playbook/start-research.md` 流程：Agent 派生或使用已提供的 bundle 名称 → 创建 bundle → 写入 research question → 加载第一个 phase node。

## 第一条

**想做什么事？打开 `COMMANDS.md` 找到对应的命令。** 不要凭记忆工作。

运行具体 bundle 时，先打开 active bundle 里的 `BUNDLE_MAP.md` 和控制文件。旧 bundle 只有 `START_FROM_HERE.md` 时，把它当作 deprecated fallback。

## 目录性质

`DPT_FRAMEWORK/` 是 reusable framework assets，不是某一次 run 的工作目录。

- `DPT_FRAMEWORK/` 在 workflow 执行期间视为 read-only framework surface。
- 同一套 `DPT_FRAMEWORK/` 可以服务多个 `dpt_rb_*` production run bundle 或 `dpt_disp_*` disposable experiment bundle。
- 当前 run 的 truth 只来自 active bundle，不来自 chat memory，也不写回 framework。
- “单主 workflow” 指 v1 只有一个 canonical Deep Research workflow package；不表示只能有一个 run bundle。

## 运行时边界

Active bundle root 是本次 run、CLI invocation、task card 或实验明确选中的 `dpt_rb_*` / `dpt_disp_*` 目录。它是 runtime truth 的根。裸 runtime path（如 `rb_queue.json`、`rb_trace.jsonl`、`rb_output_declarations.jsonl`、`reference/`、`artifacts/`、`_cache/`、`_logs/`、`final/`、`_work_units/...`）都相对于 active bundle root，不相对于 repo root，也不相对于 `DPT_FRAMEWORK/`。

例如，如果 active bundle root 是 `dpt_rb_climate-policy/`，那么 `_work_units/wave1/wu-w1-b000-deep-i0001/` 指的是 `dpt_rb_climate-policy/_work_units/wave1/wu-w1-b000-deep-i0001/`。

运行时有三种坐标，不要混用：

- `repo_command_root`：执行 `node DPT_FRAMEWORK/...` 的仓库根，只是命令位置。
- `framework_root`：`DPT_FRAMEWORK/`，只读 reusable framework assets。
- `active_bundle_root`：当前选中的 `dpt_rb_*` / `dpt_disp_*`，唯一 runtime truth 根。

运行 workflow 时，不要把这些内容写入 `DPT_FRAMEWORK/`：

- HITL answer / profile decision
- gate result / gate attempt
- repair attempt / retry state
- trace / receipt / runtime log
- research artifact / evidence / final output

这些内容必须写入 active `dpt_rb_*` 或 `dpt_disp_*`。

## 当前可执行 surface

这些 surface 当前已经存在，可直接使用：

- `COMMANDS.md`：命令索引。
- `cli/`：当前 framework-level CLI，包括 `instantiate-run-bundle.mjs`、`validate-bundle.mjs`、`inspect-bundle.mjs`、`operate-queue.mjs`。
- `schema/contracts/`：当前 executable schema contracts，包括 `gate.mjs`、`plan.mjs`、`profile.mjs`、`queue.mjs`、`status.mjs`、`trace.mjs`。
- `engine/`：当前 deterministic engine code 和 trace utility。
- `rb_templates/`：实例化 run bundle 时 materialize 的初始模板。
- `command_playbook/`：Agent-facing command instructions and diagnostic/maintenance playbooks; not a human/operator co-runner surface for autonomous pipeline execution.

## Workflow Foundation / runtime surface

这些 surface 是当前 workflow-foundation 运行时结构；具体行为仍以已存在的 CLI/schema/engine contract 为准：

- `workflows/manifest.json` 和 `workflows/nodes/`：v1 只有一个 canonical Deep Research workflow，不使用 `workflows/<workflow-name>/` namespace。
- `schema/gate_definitions/`：read-only gate definition JSON，不保存 pass/fail。
- `schema/contracts/gate.mjs`：当前 gate transition-table contract；不是 gate definition JSON 的 Zod schema。
- `engine/gates/`：per-gate engine modules 的目标位置；当前共享 helper 位于 `engine/helpers/gate-helpers.mjs`。
- `cli/gates/`：one gate per external CLI wrapper。Gate 命令必须显式接收 active bundle path；具体 flag 由实现 contract 决定。

## Run Bundle 外形

Production run bundle 位于 repo root，当前命名形态：

```text
dpt_rb_<name>/
```

- 当前 production 实例化入口接收显式 `<name>`，创建 `dpt_rb_<name>/`；Agent-facing playbooks derive this name from the research request unless a name was already supplied before framework execution.
- 如果目标目录已存在，必须报错停止；不能覆盖或复用旧 bundle。
- 自动英文 slug 和 collision suffix 是 workflow-foundation target，不是当前 production CLI 行为。
- Disposable experiment bundle 使用 `dpt_disp_*`，也是 mutable runtime bundle root when selected.

当前 canonical run bundle 目录外形：

```text
dpt_rb_<name>/
  BUNDLE_MAP.md
  rb_plan.md
  rb_profile.yaml
  rb_status.json
  rb_queue.json
  rb_trace.jsonl

  _logs/
    run.log

  seed_topics/
  reference/
  artifacts/
    wave0/
    wave1/
    wave2/
  final/
  _cache/
  _work_units/
```

`_cache/gate-results/` 和 `_cache/projections/` 是 workflow-foundation target/cache convention，不是当前 `inspect-bundle.mjs` required shape。

运行时优先读取 active bundle 里的 `BUNDLE_MAP.md` 和控制文件；旧 `START_FROM_HERE.md` 只作 deprecated fallback。`BUNDLE_MAP.md` 是 passive map，不是 phase node、command playbook 或 gate authority。`rb_profile.yaml` 承载 HITL/user decisions；`rb_status.json` 承载 phase/gate 状态摘要；`rb_trace.jsonl` 是 append-only audit。

## 执行模式

- 操作前 reload active bundle 的控制文件。
- Queue 为空且无法 refill 时才能停止。
- 停止授权: 仅 final_delivery / decision_blocker / empty_queue_after_refill。
- 面向 run 的命令必须显式接收 active bundle 路径；现有 bundle 工具使用明确的 `<bundleDir>`。
- 不要依赖 chat memory 判断当前 run 状态；必须以 active bundle、可用的 check/gate CLI output 和 trace 为准。

## 质量保障

- `node DPT_FRAMEWORK/cli/validate-bundle.mjs <bundleDir>` — bundle 控制文件 Zod 校验。
- `node DPT_FRAMEWORK/cli/inspect-bundle.mjs <bundleDir>` — bundle 目录结构检查。
