# Design: prototype-workflow-next

## Context

`prototype-gate-loop` / `prototype-gate-fork` 已经验证了单段 MD 动态加载：上游裁决输出一个 node key，Engine 找到对应 MD 并执行。`prototype-workflow-fsm` 进一步承接多节点控制流和状态转移。

`workflow-next` 的职责因此收窄为更底层的问题：

```
upstream decision
        │
        ▼
one next MD fileRef
        │
        ▼
loadNextMarkdown(fileRef)
        │
        ├── read entry MD just in time
        ├── parse entry requires
        ├── recursively read dependency MDs
        ├── execute dependency-first load plan
        └── return updated state + receipts
```

本 prototype 是 single-entry Markdown closure loader，不是 workflow runner。

## Goals / Non-Goals

**Goals:**

- `createWorkflowRuntime()` 初始化 loader runtime，不读取任何 MD
- `loadNextMarkdown(fileRef, state, runtime)` 加载一个 entry MD 及其依赖闭包
- MD 通过 JSON frontmatter `requires` 声明依赖 MD
- Engine 递归解析依赖闭包，依赖优先执行，单次 closure 内去重
- 缓存 MD 内容/frontmatter，但不缓存执行结果；同一 MD 再次被调用仍执行
- trace/receipt 明确显示 read、cache hit、dependency resolution、execute、load complete/error
- 实验完成后 `EXPERIMENT.md` 记录观察结果和后续设计建议

**Non-Goals:**

- 不使用 `workflow.json`、`steps[]`、`cursor`
- 不表达多节点控制流、状态转移、retry、complete 或 halt
- 不提升到 `DPT_FRAMEWORK/workflows/`
- 不接入 gate-loop/gate-fork/subagent/FSM 的实际 pipeline
- 不实现生产级权限、token budget、并发或远程加载
- 不支持正文 `@load` / `@requires` 指令
- 不把普通 Markdown 链接当依赖
- 不新增 npm 依赖

## Decisions

### Decision 1: Runtime 不持有 manifest/cursor

**选择：** `createWorkflowRuntime()` 只初始化 loader 所需的 process-local 状态：

```javascript
const runtime = {
  contentCache: new Map(),
  executionLog: [],
  receipts: [],
};
```

**理由：** `workflow-next` 不决定下一个节点；上游 Gate/Fork/FSM 已经决定了一个 next fileRef。这里如果继续保留 cursor，会和 `prototype-workflow-fsm` 的控制流职责重叠。

### Decision 2: 入口和依赖都用 MD 文件名

**选择：** loader API 使用 `fileRef`，例如 `wave-entry.md`。文件都在 `nodes-workflow-next/` 下解析：

```javascript
function nodePath(fileRef) {
  return join(baseDir, 'nodes-workflow-next', fileRef);
}
```

核心 API：

```javascript
createWorkflowRuntime()
createInitialState()
loadNextMarkdown(fileRef, state, runtime)
readMarkdownFile(fileRef, runtime)
resolveDependencyClosure(fileRef, runtime)
executeMarkdownFile(fileRef, state, runtime)
executeLoadPlan(plan, state, runtime)
```

**理由：** 本实验验证的是“给定一个 next MD 文件，Engine 如何带上依赖闭包”，不是 registry key 路由，也不是 workflow manifest。

### Decision 3: `requires` 只存在于 JSON frontmatter

**选择：** step MD 使用 JSON frontmatter：

````markdown
---
{
  "requires": ["workflow-context.md", "evidence-rules.md"]
}
---

# Wave Entry

```js
state.executionOrder.push('wave-entry.md');
```
````

Schema：

```javascript
const SegmentFrontmatter = z.object({
  requires: z.array(z.string().min(1)).default([]),
});
```

`parseFrontmatter(md)` 用正则提取开头 `---` block，然后 `JSON.parse()`；没有 frontmatter 等价于 `{ requires: [] }`。

**理由：** Engine 必须能稳定读取依赖，不让 Agent 从正文 prose 里自我解释。JSON frontmatter 对齐项目现有 Markdown frontmatter 约束。

### Decision 4: 内容缓存，执行不缓存

**选择：** `readMarkdownFile(fileRef, runtime)` 第一次读文件并缓存 `{ md, frontmatter }`；后续同一 fileRef 返回 cache hit。但 `executeMarkdownFile()` 每次调用都会重新执行该 MD 的实验代码块。

```
第一次 load:
file_read shared-lib.md
file_executed shared-lib.md

第二次 load 再依赖它:
cache_hit shared-lib.md
file_executed shared-lib.md
```

**理由：** 这能同时观察两个生命周期：内容可缓存，执行副作用仍重新发生。

### Decision 5: `loadNextMarkdown()` 是原子执行边界

**选择：** `loadNextMarkdown(fileRef, state, runtime)` 先解析完整依赖计划；如果 missing/cycle/frontmatter parse error 发生，不执行任何文件，并记录 `load_error`。

伪代码：

```javascript
function loadNextMarkdown(fileRef, state, runtime) {
  receipt('load_start', { entry: fileRef });
  try {
    const plan = resolveDependencyClosure(fileRef, runtime);
    receipt('dependency_resolved', { entry: fileRef, plan });
    const nextState = executeLoadPlan(plan, state, runtime);
    receipt('load_complete', { entry: fileRef, plan });
    return { state: nextState, status: 'loaded', runtime, plan };
  } catch (error) {
    receipt('load_error', { entry: fileRef, error: error.message });
    return { state, status: 'error', runtime, error: error.message };
  }
}
```

**理由：** 失败时无 cursor/currentState 需要维护；调用方根据 error 决定下一步。解析阶段已经发生的 file read/cache receipts 保留为真实证据。

### Decision 6: 依赖闭包用 DFS，单次 closure 内去重

**选择：** `resolveDependencyClosure(fileRef, runtime)` 使用 DFS：

- `visiting` 检测 cycle
- `visited` 保证同一次 closure 中同一 fileRef 只进入 plan 一次
- `plan.push(fileRef)` 在依赖之后，保证 dependency-first
- 同层依赖按 `requires` 声明顺序稳定解析

示例：

```
entry.md
  ├── a.md ──┐
  └── b.md ──┴── shared.md

plan: shared.md, a.md, b.md, entry.md
```

### Decision 7: JS 代码块用正则提取 + `node:vm` 执行；state 为显式 schema

**选择：** `executeMarkdownFile(fileRef, state, runtime)` 提取第一个 JS code block 并在 `node:vm` 沙箱执行，只注入 `state` 和 silent `console`。无 code block 等价于 no-op，记录 `no_code_block`。

`state` schema：

```javascript
const WorkflowState = z.object({
  executionOrder: z.array(z.string()).default([]),
  counters: z.record(z.string(), z.number()).default({}),
  data: z.record(z.string(), z.unknown()).default({}),
});
```

**理由：** state schema 让 MD code block 的副作用面可测试，VM 沙箱让 prototype 可审计。

## Risks / Trade-offs

- **[Risk] 依赖 MD 可执行会让 state mutation 难推理** → **Mitigation**: tests/receipts 显式记录执行顺序与 counters
- **[Risk] 内容缓存但执行重跑可能与直觉冲突** → **Mitigation**: receipt 同时记录 `cache_hit` 和 `file_executed`
- **[Risk] single-entry loader 被误认为完整 workflow runtime** → **Mitigation**: proposal/design/EXPERIMENT 明确控制流属于 `prototype-workflow-fsm`
- **[Risk] JS code block 执行自由度过大** → **Mitigation**: VM 只暴露 `state` 和 `console`，禁止模块/文件系统访问
