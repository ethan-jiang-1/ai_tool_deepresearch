# DPT_FRAMEWORK

Deep Research Framework (`DPT_FRAMEWORK/`) 的运行时入口说明。

## 触发规则

**用户提到 `DPT_FRAMEWORK` 并表达了一个疑问/问题 → 这是 Deep Research 触发信号。不是代码探索请求。**

不要浏览文件结构。直接走 `command_playbook/start-research.md` 流程：定名 → 创建 bundle → 写入 research question → 加载第一个 phase node。

## 第一条

**想做什么事？打开 `COMMANDS.md` 找到对应的命令。** 不要凭记忆工作。

运行具体 bundle 时，先打开 active bundle 里的 `START_FROM_HERE.md` 和控制文件。

## 目录性质

`DPT_FRAMEWORK/` 是 reusable framework assets，不是某一次 run 的工作目录。

- `DPT_FRAMEWORK/` 在 workflow 执行期间视为 read-only framework surface。
- 同一套 `DPT_FRAMEWORK/` 可以服务多个 `dpt_rb_*` production run bundle 或 `dpt_disp_*` disposable experiment bundle。
- 当前 run 的 truth 只来自 active bundle，不来自 chat memory，也不写回 framework。
- “单主 workflow” 指 v1 只有一个 canonical Deep Research workflow package；不表示只能有一个 run bundle。

## 运行时边界

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
- `command_playbook/`：Agent/operator 可读命令说明。

## Workflow Foundation 目标 surface

这些 surface 是 workflow-foundation 的目标结构，当前不要当作已实现目录或当前 CLI contract：

- `workflows/manifest.json` 和 `workflows/nodes/`：v1 只有一个 canonical Deep Research workflow，不使用 `workflows/<workflow-name>/` namespace。
- `schema/contracts/gate-definition.mjs`：未来 gate definition JSON 的 executable schema。
- `schema/gate_definitions/`：未来 read-only gate definition JSON，不保存 pass/fail。
- `engine/gates/`：未来 gate definition loader/evaluator。
- `cli/gates/`：未来 one gate per external CLI wrapper。Gate 命令必须显式接收 active bundle path；具体 flag 由实现 contract 决定。

## Run Bundle 外形

Production run bundle 位于 repo root，当前命名形态：

```text
dpt_rb_<name>/
```

- 当前 production 实例化入口接收显式 `<name>`，创建 `dpt_rb_<name>/`。
- 如果目标目录已存在，必须报错停止；不能覆盖或复用旧 bundle。
- 自动英文 slug 和 collision suffix 是 workflow-foundation target，不是当前 production CLI 行为。
- Disposable experiment bundle 使用 `dpt_disp_*`，也是 mutable runtime context。

当前 canonical run bundle 目录外形：

```text
dpt_rb_<name>/
  START_FROM_HERE.md
  rb_plan.md
  rb_profile.yaml
  rb_status.json
  rb_queue.json
  rb_trace.jsonl

  seed_topics/
  reference/
  artifacts/
    wave1/
    wave2/
  final/
  _cache/
```

`_cache/gate-results/` 和 `_cache/projections/` 是 workflow-foundation target/cache convention，不是当前 `inspect-bundle.mjs` required shape。

运行时优先读取 active bundle 里的 `START_FROM_HERE.md` 和控制文件。`rb_profile.yaml` 承载 HITL/user decisions；`rb_status.json` 承载 phase/gate 状态摘要；`rb_trace.jsonl` 是 append-only audit。

## 执行模式

- 操作前 reload active bundle 的控制文件。
- Queue 为空且无法 refill 时才能停止。
- 停止授权: 仅 final_delivery / decision_blocker / empty_queue_after_refill。
- 面向 run 的命令必须显式接收 active bundle 路径；现有 bundle 工具使用明确的 `<bundleDir>`。
- 不要依赖 chat memory 判断当前 run 状态；必须以 active bundle、可用的 check/gate CLI output 和 trace 为准。

## 质量保障

- `node DPT_FRAMEWORK/cli/validate-bundle.mjs <bundleDir>` — bundle 控制文件 Zod 校验。
- `node DPT_FRAMEWORK/cli/inspect-bundle.mjs <bundleDir>` — bundle 目录结构检查。
