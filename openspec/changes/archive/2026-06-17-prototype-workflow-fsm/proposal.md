# Proposal: prototype-workflow-fsm

## Why

`prototype-workflow-next` 验证了"manifest 定义 step 顺序、cursor 逐个推进、动态加载"的模式。但它有一个根本局限：**控制流在外部**。`advanceWorkflow()` 从外部一次次调用，cursor 线性递增——节点执行完就完了，不知道自己的去向，无法表达分支、重试或条件转移。

真实的 deep research workflow 需要：节点跑完后根据自己的执行状态（成功/失败/需修复/阻塞）决定下一步。这是一个 DAG/FSM 问题，不是线性 cursor 问题。

## What Changes

- **新增** `experiments/prototype-workflow-fsm/`：完全自包含的 FSM workflow 实验，零 import 依赖
- **新增** FSM 定义文件（`.fsm.json`）：声明所有状态节点和转移规则（status → next node），支持自环（重试）、多分支、终止状态（null target）
- **新增** `transition()` 沙箱注入：MD 代码块末尾调用 `transition(currentNode, status)`，Engine 查 FSM 定义裁决下一步
- **新增** `runFSM()` 过程式运行循环：加载节点 → 执行代码块 → 读取 transition 结果 → 查 FSM → advance/retry/halt/complete，带 `maxIterations=100` 防死循环
- **新增** 声明式 `Machine` 类 + `createMachine()` 工厂：自知的活实例——`m.step()` 执行当前节点并裁决转移，`m.run()` 跑到底，所有状态通过 getter 暴露（`current`、`outcome`、`canAdvance`、`isComplete`、`receipts` 等）
- 保留 workflow-next 已验证的语义：`requires` frontmatter + DFS 依赖闭包、内容缓存/执行分离、receipt 可观察性、trace JSONL 裁决、`node:vm` 沙箱执行
- **新增** Agent 辅助测试 playbook：`command_experiments/exp_workflow-fsm/test-{simple,medium,complex}.md`

## Capabilities

### New Capabilities

- `workflow-fsm-definition`: FSM 定义文件的加载、校验和结构。定义文件声明 name、initial 状态、每个节点在各执行状态下的转移目标。Engine 启动时加载 FSM，不预读任何 MD。**Req: WFS-001**
- `workflow-fsm-transition`: MD 代码块通过 `node:vm` 沙箱调用 `transition(currentNode, status)`，Engine 查 FSM 裁决：advance（转移到目标节点）、retry（自环，重试当前节点）、complete（目标为 null，工作流结束）、halt（无匹配转移规则）。transition 结果写入 receipt 和 trace。**Req: WFS-002**
- `workflow-fsm-runtime`: `runFSM()` 顶层运行循环——从 initial 状态开始，逐节点加载执行，根据 transition 结果驱动状态转移，直到 complete 或 halt。错误不破坏 runtime 状态，可从 halted 状态恢复。**Req: WFS-003**

### Modified Capabilities

<!-- 本 change 不修改任何已存在的 capability spec -->

## Impact

- 新增 OpenSpec change：`openspec/changes/prototype-workflow-fsm/`
- 新增实验目录：`experiments/prototype-workflow-fsm/`
- 新增 Agent 测试 playbook 目录：`DPT_FRAMEWORK/command_experiments/exp_workflow-fsm/`
- 更新 requirement registry：新增 WFS-001, WFS-002, WFS-003
- 不修改 workflow-next/gate-loop/gate-fork 的现有行为
