## Why

当前 `experiments/prototype-*` 和 `DPT_FRAMEWORK/` 之间每个原型实验都各自拷贝了一份 engine 代码和 trace 工具（6 份 `trace.mjs`、6 份 engine `.mjs`），引擎间还存在代码重复（`workflow-fsm` 复制了 `workflow-next` 的 loader 函数）。实验验证通过的机制无法被生产环境直接使用——因为代码在 `experiments/` 里，不在 `DPT_FRAMEWORK/` 里。这违背了"实验做出来，框架自然能用"的设计意图。注意：`subagent` 的 fork/repair 逻辑看似与 `gate-fork` 相似，但实际是独立运行时语义（启动真实 native subagent），Phase 4 已将 `gate-fork` 重写为通用 `forkGate`，两者解耦。

## What Changes

- **新增 `DPT_FRAMEWORK/engine/`**：6 个生产级引擎（queue-manager、gate-loop、gate-fork、subagent-relay、workflow-loader、workflow-fsm）作为唯一真实来源，实验和生产 import 同一份代码
- **新增 `DPT_FRAMEWORK/engine/trace.mjs`**：统一 trace writer，替代 6 份 prototype 拷贝；与 `schema/contracts/trace.mjs`（校验器）配对，前者管写入、后者管格式校验
- **新增 `experiments/shared/`**：实验共享基础设施目录；`new-disposable-bundle.mjs`（一次性 bundle 搭建工具）从 `DPT_FRAMEWORK/command_experiments/scripts/` 搬入——这是纯实验工具，生产从不创建 `dpt_disp_*`
- **修复引擎间代码重复**：`workflow-fsm.mjs` 不再内嵌 loader 逻辑，改为 `import from workflow-loader.mjs`。注意：`subagent-relay.mjs` 的 fork/repair/dispatch 是独立运行时逻辑（启动真实 native subagent），与 `gate-fork.mjs` 的通用 `forkGate` 无关——subagent 保留自己的完整实现，不 import gate-fork
- **升级 `schema/contracts/queue.mjs`**：从骨架（`z.null()` 槽位 + `z.array(z.unknown())` 补充池）升级为基于已验证 `QueueItemSchema` 的正式 `QueueWorkUnitSchema`
- **更新 19 个命令实验 playbook** 的 import 路径：engine 从 `DPT_FRAMEWORK/engine/`，trace 从 `DPT_FRAMEWORK/engine/trace.mjs`，bundle 搭建从 `experiments/shared/`
- **移动实验入口目录**：`DPT_FRAMEWORK/command_experiments/` → `experiments_playbook/`——实验 playbook 不是框架代码，与 `experiments/` 并列，实验相关东西聚在一处
- **清理 `experiments/prototype-*/`**：移除已搬走的 `.mjs` 文件（engine、trace、CLI、test），移除无用的 `package.json`（目录下无 JS 代码），只保留 `EXPERIMENT.md` 和 `nodes-*/`
- **更新 `guidelines/command-experiments.md`**：change 落地后执行 Post-Activation Cleanup——降级 activation 前的迁移措辞，将 landed surfaces 标记为 Current

## Capabilities

### New Capabilities

- `framework-engine`: 6 个生产级引擎统一位于 `DPT_FRAMEWORK/engine/`，实验和生产 import 同一个来源。`workflow-fsm.mjs` 依赖 `workflow-loader.mjs` 通过 import 而非代码复制；`subagent-relay.mjs` 是独立运行时（fork/repair/dispatch 逻辑自成一体，不依赖 gate-fork）。
- `trace-writer`: 统一的 append-only JSONL trace writer 位于 `DPT_FRAMEWORK/engine/trace.mjs`，与 `schema/contracts/trace.mjs` 配对（写入 + 校验）。
- `experiment-shared-infra`: 实验共享基础设施目录 `experiments/shared/`，存放生产环境不需要的实验搭建工具（如 disposable bundle 创建）。

### Modified Capabilities

- `schema-core`: `queue.mjs` contract 从骨架（`z.null()` 槽位 + `z.array(z.unknown())` 补充池）升级为基于已验证 `QueueItemSchema` 的正式 `QueueWorkUnitSchema`。

## Impact

- **DPT_FRAMEWORK/engine/**: 新增 6 个 engine 文件
- **DPT_FRAMEWORK/engine/trace.mjs**: 新增统一 trace writer（工厂模式，替代 6 份 prototype 拷贝）
- **DPT_FRAMEWORK/cli/**: 新增 `operate-queue.mjs`（从 agentic-queue-cli.mjs）
- **DPT_FRAMEWORK/schema/contracts/queue.mjs**: 升级
- **experiments_playbook/**: `DPT_FRAMEWORK/command_experiments/` 整体移至 repo 根 `experiments_playbook/`（6 个 exp_*, 20 个 playbook），import 路径不变
- **DPT_FRAMEWORK/command_experiments/**: 目录整体移出，`scripts/new-disposable-bundle.mjs` 早已搬至 `experiments/shared/`，原位置不留空目录
- **tests/engine/**: 新增 6 个 engine 测试 + trace writer 测试
- **experiments/shared/**: 新增目录，放置 `new-disposable-bundle.mjs`
- **experiments/prototype-*/**: 移除所有 `.mjs` 文件，目录变薄
