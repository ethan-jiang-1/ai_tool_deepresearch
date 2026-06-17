# Proposal: prototype-workflow-load

## Why

`prototype-gate-loop` 和 `prototype-gate-fork` 已经验证了 Gate 输出 key 后加载一个 MD segment 的模式，但还没有验证一个已定义 workflow 如何在运行时逐步、即时地加载 MD。真实 workflow 中，当前 MD 还可能引用其他 MD 作为规则、上下文或子步骤；这些依赖如果靠 Agent 自己记得读取，就会回到 V12 的 agent 自治理。

本 change 用一个可观察的实验装置摸索：workflow 顺序已知，但 step MD 不预加载；Engine 每次推进 cursor 时才动态加载当前 MD，并自动加载该 MD 声明的依赖 MD，最后通过 trace/receipt 看加载顺序、缓存、重复执行和错误恢复是否可控。

## What Changes

- **新增** `experiments/prototype-workflow-load/`：完全自包含实验，命名对齐 gate-loop/gate-fork/subagent，零 import 依赖
- **新增** workflow manifest：`workflow.json` 只定义 step MD 文件顺序，不预加载任何 step 内容
- **新增** just-in-time MD loader：`advanceWorkflow(state, runtime)` 每次只推进一个 workflow step，走到哪个 step 才加载哪个 MD
- **新增** MD dependency 机制：step MD 的 JSON frontmatter 通过 `requires` 声明依赖 MD，Engine 解析依赖闭包并按依赖优先顺序加载/执行
- **新增** load observability：runtime 记录 content cache、execution log、receipts、trace events，用来观察动态加载是否符合预期
- **新增** Agent 辅助测试 playbook：`command_experiments/workflow-load/test-{simple,medium,complex}.md`，用于手动观察动态加载实验
- 纯 JavaScript (Node.js ESM)，仅用批准的 `zod` 依赖，不新增 npm 依赖

**Prototype scope clarification:** 本 change 是摸索型 prototype，不声称已经找到生产级 workflow loader 的最终抽象。它的成功标准是让动态加载行为可运行、可观察、可复盘；`EXPERIMENT.md` 必须记录哪些语义清楚、哪些语义别扭、哪些应留到生产化设计。

## Capabilities

### New Capabilities

- `workflow-manifest-loading`: workflow manifest 定义 step MD 文件顺序；加载 manifest 不得预读 step MD。**Req: WML-001**
- `workflow-dynamic-md-load`: workflow cursor 每次推进一个 step，当前 step MD 在推进时才被动态加载；内容/frontmatter 可缓存，但执行每次重新发生。**Req: WDM-001**
- `workflow-md-dependencies`: step MD frontmatter `requires` 声明依赖 MD；Engine 递归解析依赖闭包，处理缺失、循环、菱形依赖和依赖优先执行。**Req: WMD-001**
- `workflow-load-observability`: loader 通过 runtime receipts 和 trace events 暴露 manifest load、file read、cache hit、dependency resolution、file execution、load error。**Req: WLO-001**

### Modified Capabilities

- `agent-testing`: 新增 AGT-004 需求（workflow-load 专用的 Agent 辅助测试 playbook，simple/medium/complex 三级），不改动 AGT-001/002/003 的行为。**Req: AGT-004**

## Impact

- 新增 OpenSpec change：`openspec/changes/prototype-workflow-load/`
- 新增实验目录：`experiments/prototype-workflow-load/`
- 新增 Agent 测试 playbook 目录：`DPT_FRAMEWORK/command_experiments/workflow-load/`
- 更新 requirement registry：新增 WML-001, WDM-001, WMD-001, WLO-001, AGT-004
- 不修改 gate-loop/gate-fork/subagent 的现有行为；本实验独立运行，后续再决定是否抽取共享 loader
