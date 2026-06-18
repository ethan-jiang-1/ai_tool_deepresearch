# Backlog: 消除 experiments ↔ DPT_FRAMEWORK 之间的代码拷贝

**日期**: 2026-06-18
**状态**: 已 OpenSpec propose → `openspec/changes/dedup-experiments-framework/`
**来源**: openspec explore prototype-agentic-queue 后的深度讨论
**关联**: `openspec/changes/dedup-experiments-framework/`（4 artifacts 齐全，待 apply）

## 问题

当前 `experiments/prototype-*` 和 `DPT_FRAMEWORK/` 之间存在严重的代码拷贝：

- **`trace.mjs` × 6 份**：3 种变体（agentic-queue 静默版、gate-loop/gate-fork/subagent 彩色版、workflow-next/fsm 图标版），API 完全一致但各自拷贝
- **Engine `.mjs` × 6 份**：每个引擎只在 prototype 目录里，不在框架里，生产环境用不了
- **引擎间互拷**：`subagent.mjs` 复制了 `gate-fork.mjs` 的 fork router（evaluateBranch/forkRouter/convergeRepair）；`workflow-fsm` 复制了 `workflow-next` 的 loader 逻辑
- **命令实验 playbook** import 指向 `experiments/prototype-*` 而非框架

核心矛盾：实验环境和真实环境用的是两套拷贝，而不是同一份代码。违背了"实验做出来，框架自然能用"的设计意图。

## 讨论演化（关键转折）

这次讨论不是一次就得出最终方案的，经历了三次关键修正：

### 第一轮：核心洞察

用户的原始表述：

> "做实验的时候，核心的东西用的和实际的是一样的，不需要两个拷贝。如果有两个拷贝拷来拷去就很复杂了。"

**结论**：engine 代码应该只有一份，在 `DPT_FRAMEWORK/` 里。实验 import 框架，生产也 import 框架——同一份代码。

### 第二轮：实验基础设施不进框架

> "为了搭建实验，做实验的东西，贡献的东西，不应该放在 DPT_FRAMEWORK。放在 experiments 里面搞一个 shared 的子目录，因为为了做实验的代码，它用不着到最后实际的环境里。"

**修正**：不是所有共享代码都进 `DPT_FRAMEWORK/`。纯实验搭建工具（如 disposable bundle 创建脚本）应该放在 `experiments/shared/`——生产环境从来不需要创建 `dpt_disp_*`。

### 第三轮：trace.mjs 是生产代码

> "trace.mjs 这个倒还不一定，因为这个东西呢，它确实有一点生产环境需要，它还是有道理的。"

**再修正**：`trace.mjs` 不是纯实验工具。它是 **trace writer**——负责往 `rb_trace.jsonl` 写事件。`DPT_FRAMEWORK/schema/contracts/trace.mjs` 只是 Zod schema 校验器（管"格式对不对"），不管写入。两者配对：writer 管"怎么写"，schema 管"格式对不对"。生产环境也需要写 trace，所以 trace writer 应该进 `DPT_FRAMEWORK/trace/`。

### 第四轮：new-disposable-bundle.mjs 是实验基础设施

> "搭一个实验的bundle这个事儿，是不是也存在类似的情况？"

**确认**：`new-disposable-bundle.mjs` 创建一次性 `dpt_disp_*`——只有实验用。生产用 `instantiate-run-bundle.md` + `rb_templates/` 创建永久的 `dpt_rb_*`。所以它属于 `experiments/shared/`。

### 最终三层架构

| 层 | 位置 | 谁用 |
|---|------|------|
| 生产代码（engine、trace writer、CLI） | `DPT_FRAMEWORK/` | 生产 + 实验共享 |
| 实验共享基础设施（bundle 搭建工具等） | `experiments/shared/` | 只有实验用 |
| 实验特有 fixtures（MD 节点、文档） | `experiments/prototype-*/` | 单个实验特有 |

## 当前全貌（6 个实验家族）

| 原型 | Engine 文件 | trace 变体 | MD 节点 | CLI | playbook 形状 |
|------|------------|-----------|---------|-----|-------------|
| agentic-queue | `agentic-queue.mjs` (613行) | 静默版 | placeholder | 有 | 多脚本分阶段 |
| gate-loop | `gate-loop.mjs` | 彩色版 | 4个 | 无 | 单脚本内联 |
| gate-fork | `gate-fork.mjs` | 彩色版(同gate-loop) | 5个 | 无 | 单脚本内联 |
| subagent | `subagent.mjs` (含fork副本) | 彩色版(同gate-loop) | 无 | 无 | 混合(内联+Agent Flow) |
| workflow-next | `workflow-next.mjs` | 图标版 | 18个 | 无 | 单脚本内联 |
| workflow-fsm | `workflow-fsm.mjs` | 图标版(扩workflow-next) | 9 fsm.json + 16 md | 无 | 单脚本内联 |

**引擎间依赖链**：`workflow-fsm` 复用了 `workflow-next` 的 loader 模式（但没 import——代码重复）。`subagent` 复制了 `gate-fork` 的 fork router。搬入同一目录后用 import 替代——这是搬移的核心价值之一。

**3 种 playbook 形状**：
- **纯内联 .mjs（单次运行）**：workflow-next、workflow-fsm、gate-fork、gate-loop
- **多脚本分阶段内联 .mjs**：agentic-queue（持久化 `rb_queue.agq.json` 跨脚本）
- **混合（内联 + Agent Flow）**：subagent（LLM 参与 spawn subagent、提取 JSON、写 relay 文件）

## 目标架构

```
DPT_FRAMEWORK/                     ← 生产代码（实验和生产共享）
  engine/                          ← 新增：引擎代码唯一真实来源
    queue-manager.mjs              ← 从 experiments/prototype-agentic-queue/agentic-queue.mjs
    gate-loop.mjs                  ← 从 experiments/prototype-gate-loop/gate-loop.mjs
    gate-fork.mjs                  ← 从 experiments/prototype-gate-fork/gate-fork.mjs
    subagent-relay.mjs             ← 从 experiments/prototype-subagent/subagent.mjs
                                     (不再内嵌 fork router → import from gate-fork.mjs)
    workflow-loader.mjs            ← 从 experiments/prototype-workflow-next/workflow-next.mjs
    workflow-fsm.mjs               ← 从 experiments/prototype-workflow-fsm/workflow-fsm.mjs
                                     (不再内嵌 loader → import from workflow-loader.mjs)
  trace/
    trace.mjs                      ← 统一 trace writer，替代 6 份拷贝
                                     （生产写 rb_trace.jsonl 用它，实验验证也用它；
                                       schema/contracts/trace.mjs 管格式校验，两者配对）
  cli/
    validate-bundle.mjs            (现有，不变)
    inspect-bundle.mjs             (现有，不变)
    queue.mjs                      ← 从 experiments/.../agentic-queue-cli.mjs
  schema/
    contracts/
      queue.mjs                    ← 从骨架升级：用 QueueWorkUnitSchema 替换 null 槽位
    (其余不变)
  command_experiments/
    exp_*/                          ← playbook 的 import 路径更新

experiments/
  shared/                           ← 新增：实验共享基础设施（只有实验用，不进生产）
    new-disposable-bundle.mjs       ← 搭建一次性 dpt_disp_* bundle（生产不用这个——
                                       生产用 instantiate-run-bundle.md + rb_templates/）
  prototype-agentic-queue/          ← 变薄：只保留 EXPERIMENT.md + nodes-*/
  prototype-gate-loop/              ← 变薄
  prototype-gate-fork/              ← 变薄
  prototype-subagent/               ← 变薄
  prototype-workflow-next/          ← 变薄
  prototype-workflow-fsm/           ← 变薄
```

### 两条 import 路径

```
实验 playbook 内联脚本：
  import { createEmptyQueue }  from '../DPT_FRAMEWORK/engine/queue-manager.mjs';
  import { setTraceFile }      from '../DPT_FRAMEWORK/trace/trace.mjs';
       ^^^                              ^^^
  生产引擎                              生产 trace writer
  （实验 + 生产共享）                    （生产用它写 rb_trace.jsonl，实验用它做验证判决）

实验 playbook Step 1 搭建 bundle：
  B=$(node experiments/shared/new-disposable-bundle.mjs ...)
       ^^^
  实验基础设施（生产不需要创建一次性 bundle）

生产 run bundle：
  import { createEmptyQueue }  from './DPT_FRAMEWORK/engine/queue-manager.mjs';
  import { setTraceFile }      from './DPT_FRAMEWORK/trace/trace.mjs';
  （路径完全一样，同一份代码）
```

### 关键原则：什么东西放哪里

| 类型 | 放哪里 | 原因 |
|------|--------|------|
| **Engine `.mjs`** | `DPT_FRAMEWORK/engine/` | 生产要跑，实验也要跑——同一个来源 |
| **`trace.mjs`**（trace writer） | `DPT_FRAMEWORK/trace/` | 生产用它写 `rb_trace.jsonl`，实验用同样的 writer 做验证判决；`schema/contracts/trace.mjs` 管校验——两者配对 |
| **CLI** | `DPT_FRAMEWORK/cli/` | 生产和实验都用命令行操作 |
| **Schema contracts** | `DPT_FRAMEWORK/schema/` | 生产用，实验 bundle 也用同一个 schema |
| **`new-disposable-bundle.mjs`** | `experiments/shared/` | 纯实验基础设施——生产从不创建 `dpt_disp_*` |
| **MD nodes**（fixtures） | `experiments/prototype-*/nodes-*/` | 实验特定测试数据，每个实验有自己的 |
| **`.fsm.json` 定义** | `experiments/prototype-*/nodes-*/` | workflow-fsm 的测试 fixture |
| **EXPERIMENT.md** | `experiments/prototype-*/` | 实验文档 |
| **Unit tests** | `DPT_FRAMEWORK/tests/engine/` | 引擎的测试随引擎走 |
| **Command experiment playbooks** | `DPT_FRAMEWORK/command_experiments/exp_*/` | Agent 可执行的实验剧本 |

## 关键设计决策

### `trace.mjs` → `DPT_FRAMEWORK/trace/`

`trace.mjs` 是 **trace writer**——负责往 `rb_trace.jsonl` 里写入 trace 事件。`DPT_FRAMEWORK/schema/contracts/trace.mjs` 只是 Zod schema 校验器，不管写入。两者配对：一个管"怎么写"，一个管"格式对不对"。生产环境必须用 trace writer，所以它是生产代码。

**统一方案**：3 种变体的差异通过 `createTrace(options?)` 工厂消除：
```js
const trace = createTrace({
  consoleEcho: true,  // agentic-queue 的测试设为 false
  icons: { ... }       // 可自定义，不传就用默认集
});
```

### Engine `.mjs` → `DPT_FRAMEWORK/engine/`

6 个引擎搬入同一目录后，引擎间终于可以互相 import——之前各 prototype 目录互相隔离，代码只能复制。搬移同时修复两处代码重复：
- `subagent-relay.mjs` → `import { evaluateBranch, forkRouter, convergeRepair } from './gate-fork.mjs'`
- `workflow-fsm.mjs` → `import { resolveDependencyClosure, executeLoadPlan, ... } from './workflow-loader.mjs'`

### `new-disposable-bundle.mjs` → `experiments/shared/`

创建一次性 `dpt_disp_*` bundle，每个实验 playbook 的 Step 1 都调用它。但生产从不创建一次性 bundle——生产用 `instantiate-run-bundle.md` + `rb_templates/` 创建永久的 `dpt_rb_*`。纯实验基础设施。

### `schema/contracts/queue.mjs` 升级

基于 `agentic-queue.mjs` 中已验证的 `QueueItemSchema`（work_id, title, target, action, producer_rule, priority_class, required_receipts, completion_receipt, failure_route, writes_to, status, payload, preempted_from_slot, restore_priority, created_at, updated_at），将 5 个 slot 从 `z.null()` 升级为 `QueueWorkUnitSchema.nullable()`，`refill_pool` 从 `z.array(z.unknown())` 升级为 `z.array(QueueWorkUnitSchema)`。向后兼容（`.nullable()` 允许 null 槽位）。

## 实施概要

1. 统一 `trace.mjs` → `DPT_FRAMEWORK/trace/`（`createTrace` 工厂，替代 6 份拷贝）
2. 建立 `DPT_FRAMEWORK/engine/`，搬入 6 个引擎，修复引擎间 import
3. 移动 CLI → `DPT_FRAMEWORK/cli/queue.mjs`
4. 移动 `new-disposable-bundle.mjs` → `experiments/shared/`
5. 移动 6 个测试文件 → `DPT_FRAMEWORK/tests/engine/`
6. 更新 19 个 playbook 的 import 路径（engine 从 `DPT_FRAMEWORK/engine/`，trace 从 `DPT_FRAMEWORK/trace/`，bundle 工具从 `experiments/shared/`）
7. 升级 `schema/contracts/queue.mjs` 从骨架到正式 schema
8. 清理 `experiments/prototype-*/`（移除已搬走的 .mjs 文件，保留 EXPERIMENT.md + nodes-*/）
9. 全量验证：所有单元测试 + 19 个 playbook + governance checks

## 不做的事

- **不合并 playbook**：19 个 playbook 保持各实验家族独立
- **不改变 MD 节点格式**：gate 族的 `new Function` 和 workflow 族的 `node:vm` 沙箱各保持原样
- **不动 `validate-bundle.mjs` 和 `inspect-bundle.mjs`**：路径不需要变
- **不实现 `ds.mjs`**：这是另一个 OpenSpec change 的事

## 下一步

OpenSpec change 已创建：`openspec/changes/dedup-experiments-framework/`（proposal + design + 4 specs + tasks）。待 `/opsx:apply` 执行实施。
