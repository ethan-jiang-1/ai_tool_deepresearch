# Proposal: prototype-workflow-next

## Why

`prototype-gate-loop` 和 `prototype-gate-fork` 已经验证了 Gate/Fork 可以输出一个 next node key，但还没有验证：当这个 next MD 不是孤立文件、而是声明依赖其他 MD 时，Engine 如何确保依赖被真实加载、去重、按顺序执行并可审计。

真实 workflow 中，一个入口 MD 往往需要规则、上下文或子步骤。如果这些依赖靠 Agent 自己记得读取，就会回到 V12 的 agent 自治理。本 change 将 `workflow-next` 简化成 single-entry Markdown closure loader：上游只传入一个 next MD fileRef，Engine 负责解析并执行它的 `requires` 依赖闭包。

## What Changes

- **调整** `experiments/prototype-workflow-next/`：从 `workflow.json + cursor` 线性 runner 改成 single-entry loader
- **删除** manifest/steps/cursor 语义：`workflow-next` 不决定下一个是谁，只接收调用方给出的 `fileRef`
- **新增/保留** `loadNextMarkdown(fileRef, state, runtime)`：加载一个 entry MD 及其依赖闭包
- **保留** MD dependency 机制：entry/dependency MD 的 JSON frontmatter 通过 `requires` 声明依赖 MD
- **保留** load observability：runtime receipts 和 trace events 暴露 load start、file read、cache hit、dependency resolution、file execution、load complete/error
- **更新** Agent 辅助测试 playbook：`command_experiments/exp_workflow-next/test-{simple,medium,complex}.md` 改为 single-entry loader 场景
- 纯 JavaScript (Node.js ESM)，仅用批准的 `zod` 依赖，不新增 npm 依赖

**Prototype scope clarification:** 本 change 只验证“一个 next MD 如何带着依赖闭包活起来”。多节点控制流、状态转移、retry/complete/halt 由 `prototype-workflow-fsm` 承接。

## Capabilities

### New Capabilities

- `workflow-manifest-loading`: 重新定义为 single-entry loader runtime 初始化；runtime 不需要 manifest，创建时不得预加载任何 MD。**Req: WML-001**
- `workflow-dynamic-md-load`: 调用方传入一个 fileRef，loader just-in-time 加载并执行该 entry MD 的 dependency closure。**Req: WDM-001**
- `workflow-md-dependencies`: MD frontmatter `requires` 声明依赖 MD；Engine 递归解析依赖闭包，处理缺失、循环、菱形依赖和依赖优先执行。**Req: WMD-001**
- `workflow-next-observability`: loader 通过 runtime receipts 和 trace events 暴露 load start、file read、cache hit、dependency resolution、file execution、load complete/error。**Req: WLO-001**

### Modified Capabilities

- `agent-testing`: AGT-004 的 workflow-next playbook 改为 simple/medium/complex single-entry loader 测试，不改动 AGT-001/002/003 的行为。**Req: AGT-004**

## Impact

- 更新 OpenSpec change：`openspec/changes/prototype-workflow-next/`
- 更新实验目录：`experiments/prototype-workflow-next/`
- 更新 Agent 测试 playbook 目录：`DPT_FRAMEWORK/command_experiments/exp_workflow-next/`
- 更新 requirement registry 中 WML-001, WDM-001, WLO-001 的描述；不废弃旧 ID，因为本 change 未归档
- 不修改 gate-loop/gate-fork/subagent/FSM 的现有行为
