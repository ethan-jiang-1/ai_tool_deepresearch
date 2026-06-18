## Context

当前 `experiments/prototype-*` 每个目录包含完整的 engine 代码（`*.mjs`）+ `trace.mjs` + `*.test.mjs`。这些代码已经过 19 个命令实验 playbook 的验证（全部 PASS）。但它们在 `experiments/` 而非 `DPT_FRAMEWORK/` 里——生产 run bundle 无法 import，实验验证的成果不能直接用于生产。

核心矛盾：实验环境和生产环境用的是**两套拷贝**，而不是同一份代码。

这个 change 不改变任何 engine 的行为逻辑——只改变**代码的物理位置和 import 路径**，使得："实验做的时候，核心的东西用的和实际的是一样的。"

## Goals / Non-Goals

**Goals:**
- 6 个生产级 engine 统一位于 `DPT_FRAMEWORK/engine/`，实验和生产 import 同一个来源
- 统一 trace writer 位于 `DPT_FRAMEWORK/trace/trace.mjs`，与 `schema/contracts/trace.mjs` 配对
- 实验共享基础设施位于 `experiments/shared/`（不进生产环境）
- 引擎间代码重复用 import 替代（`subagent-relay` → `gate-fork`，`workflow-fsm` → `workflow-loader`）
- `schema/contracts/queue.mjs` 从骨架升级
- 所有 19 个 playbook 和 6 个测试文件的 import 路径更新后仍然 PASS

**Non-Goals:**
- 不改变任何 engine 的行为逻辑或 API 签名
- 不合并 19 个 playbook
- 不改变 MD 节点的格式或执行模型
- 不实现 `ds.mjs`（dispatch scheduler）
- 不改变 `validate-bundle.mjs` 和 `inspect-bundle.mjs` 的逻辑

## Decisions

### Decision 1: `DPT_FRAMEWORK/engine/` 作为引擎唯一真实来源

**选择**：将所有 engine `.mjs` 从 `experiments/prototype-*/` 移动到 `DPT_FRAMEWORK/engine/`，6 个文件：

| 原路径 | 新路径 |
|--------|--------|
| `experiments/prototype-agentic-queue/agentic-queue.mjs` | `DPT_FRAMEWORK/engine/queue-manager.mjs` |
| `experiments/prototype-gate-loop/gate-loop.mjs` | `DPT_FRAMEWORK/engine/gate-loop.mjs` |
| `experiments/prototype-gate-fork/gate-fork.mjs` | `DPT_FRAMEWORK/engine/gate-fork.mjs` |
| `experiments/prototype-subagent/subagent.mjs` | `DPT_FRAMEWORK/engine/subagent-relay.mjs` |
| `experiments/prototype-workflow-next/workflow-next.mjs` | `DPT_FRAMEWORK/engine/workflow-loader.mjs` |
| `experiments/prototype-workflow-fsm/workflow-fsm.mjs` | `DPT_FRAMEWORK/engine/workflow-fsm.mjs` |

**理由**：这些是生产运行时要调用的确定性机制（queue、gate、loader、FSM、subagent relay）。`DPT_FRAMEWORK/` 是框架代码的规范位置。生产 run bundle 通过 `../DPT_FRAMEWORK/engine/` 引用，实验 playbook 内联脚本也从同一路径引用。

**替代方案**：不移动，各 prototype 保持自己的 engine 拷贝。被拒绝——违背"同一份代码"原则。

### Decision 2: `trace.mjs` → `DPT_FRAMEWORK/trace/`

**选择**：将统一后的 trace writer 放在 `DPT_FRAMEWORK/trace/trace.mjs`。

**理由**：`trace.mjs` 是 append-only JSONL writer——负责往 `rb_trace.jsonl` 写入 trace 事件。这是生产运行时的核心操作。`DPT_FRAMEWORK/schema/contracts/trace.mjs` 是 Zod schema 校验器（管"格式对不对"），trace writer 管"怎么写进去"。两者配对：生产 run 既需要 schema 校验格式，也需要 writer 写入事件。

**统一方案**：6 份拷贝有 3 种变体（静默版、彩色 echo 版、图标版），API 完全一致。统一为 `createTrace(options?)` 工厂函数，通过 options 控制 console echo 和图标集。当前各 engine 的调用代码改为传入对应的 options。

**替代方案**：放在 `experiments/shared/`。被拒绝——生产 run 需要 trace writer 来写 `rb_trace.jsonl`，所以它必须是框架代码。

### Decision 3: `new-disposable-bundle.mjs` → `experiments/shared/`

**选择**：将 disposable bundle 创建工具从 `DPT_FRAMEWORK/command_experiments/scripts/` 移动到 `experiments/shared/`。

**理由**：这个脚本创建一次性 `dpt_disp_*` bundle——只有实验用。生产从不创建 disposable bundle（生产用 `command_playbook/instantiate-run-bundle.md` + `rb_templates/` 创建永久的 `dpt_rb_*`）。它是纯实验基础设施，不该放在 `DPT_FRAMEWORK/` 里。

19 个 playbook 的 Step 1 改为：
```bash
B=$(node experiments/shared/new-disposable-bundle.mjs ...)
```

**替代方案**：留在 `DPT_FRAMEWORK/command_experiments/scripts/`。被拒绝——"为了做实验的东西放在 experiments 里"是用户明确的设计原则。

### Decision 4: 引擎间依赖用 import 替代代码复制

**选择**：
- `subagent-relay.mjs` 不再内嵌 `evaluateBranch`/`forkRouter`/`convergeRepair`，改为 `import { evaluateBranch, forkRouter, convergeRepair } from './gate-fork.mjs'`
- `workflow-fsm.mjs` 不再内嵌 loader 逻辑，改为 `import { resolveDependencyClosure, executeLoadPlan, createInitialState, createWorkflowRuntime, nodePath, parseFrontmatter, readMarkdownFile } from './workflow-loader.mjs'`

**理由**：引擎搬入同一目录 `DPT_FRAMEWORK/engine/` 后，它们终于可以互相 import。之前各 prototype 目录互相隔离（在 `experiments/` 下），代码只能复制。现在消除这些复制，让依赖关系显式化。

### Decision 5: `schema/contracts/queue.mjs` 升级

**选择**：将 `rb_queue.json` 的 5 个 slot 字段从 `z.null()` 升级为 `QueueWorkUnitSchema`（基于 `agentic-queue.mjs` 中已验证的 `QueueItemSchema`），`refill_pool` 从 `z.array(z.unknown())` 升级为 `z.array(QueueWorkUnitSchema)`。

**理由**：实验已验证 `QueueItemSchema` 的字段设计（work_id, title, target, action, producer_rule, priority_class, required_receipts, completion_receipt, failure_route, writes_to, status, payload, preempted_from_slot, restore_priority, created_at, updated_at）。生产 schema 可以直接受益。

`QueueItemSchema` 中实验特有的字段（如 `preempted_from_slot`、`restore_priority`）保留——它们在生产中仍然有用（抢占和恢复是通用队列操作）。

## Risks / Trade-offs

- **Import 路径大面积变更**：19 个 playbook + 6 个测试文件的 import 语句需要更新。→ 按 phase 逐步执行，每个 phase 完成后运行相关测试验证。
- **`trace.mjs` 统一可能遗漏边缘行为**：3 种变体的差异需要仔细对比。→ Phase 1 集中处理，编写 trace 自身的单元测试。
- **引擎间 import 可能引入循环依赖**：`workflow-fsm` import `workflow-loader`，如果 loader 反过来依赖 fsm 会出问题。→ 检查依赖方向：loader 是底层（被 fsm 依赖），不应反向引用。
- **`schema/contracts/queue.mjs` 升级可能影响现有 bundle**：如果现有 `dpt_rb_*` bundle 的 `rb_queue.json` 用 null 槽位，升级后 Zod 校验会失败。→ `QueueWorkUnitSchema` 每个槽位用 `.nullable()` 保持向后兼容。

## Open Questions

- `experiments/shared/` 未来还会有哪些工具？目前只有 `new-disposable-bundle.mjs`，但目录结构预留扩展空间。
- `agentic-queue-cli.mjs` 搬到 `DPT_FRAMEWORK/cli/queue.mjs` 后，未来是否合并进 `ds.mjs`？这是另一个 OpenSpec change 的事。
