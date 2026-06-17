# Design: prototype-workflow-load

## Context

已完成的 `prototype-gate-loop` / `prototype-gate-fork` 验证了单段 MD 动态加载：Gate 或 Fork 输出一个 segment key，Engine 找到 Step，读取对应 MD，执行 trace 代码块和 Step mutation。

这次实验要摸索的是另一层问题：workflow 的 step 顺序可以预先知道，但 step MD 的内容不一定应该启动时全部进入上下文。更接近 deep research 的运行方式是：

```
load workflow manifest
        │
        ▼
cursor points to step 0
        │
        ▼
advanceWorkflow()
        │
        ├── just-in-time read current step MD
        ├── parse current step requires
        ├── just-in-time read dependency MDs
        ├── execute dependencies
        └── execute current step
```

本 prototype 是摸索型实验：目标不是一开始就设计生产 runtime，而是搭一个可观察装置，看动态加载、依赖加载、缓存和错误恢复的语义是否清楚。

## Goals / Non-Goals

**Goals:**

- 用 `workflow.json` 定义 step MD 文件顺序，但 manifest load 不预读 step MD
- 每次 `advanceWorkflow(state, runtime)` 只推进一个 workflow step
- step MD 通过 JSON frontmatter `requires` 声明依赖 MD
- Engine 递归解析依赖闭包，依赖优先执行，单次 closure 内去重
- 缓存 MD 内容/frontmatter，但不缓存执行结果；同一 MD 再次被调用仍执行
- trace/receipt 明确显示 read、cache hit、dependency resolution、execute、error
- 实验完成后 `EXPERIMENT.md` 记录观察结果和后续设计建议

**Non-Goals:**

- 不提升到 `DPT_FRAMEWORK/workflows/`
- 不接入 gate-loop/gate-fork/subagent 的实际 pipeline
- 不实现生产级权限、token budget、并发或远程加载
- 不支持正文 `@load` / `@requires` 指令
- 不把普通 Markdown 链接当依赖
- 不新增 npm 依赖

## Decisions

### Decision 1: Workflow 顺序由 `workflow.json` 定义，MD 内容 lazy load

**选择：** 实验目录放一个 `workflow.json`：

```json
{
  "name": "prototype-workflow-load",
  "steps": ["wave-entry.md", "audit.md", "next-wave.md"]
}
```

`loadWorkflowManifest(path)` 只读取并校验 manifest，不读取 `steps` 指向的 MD 文件。`createWorkflowRuntime(manifest)` 初始化：

```javascript
const WorkflowManifest = z.object({
  name: z.string(),
  steps: z.array(z.string().min(1)).min(1),
});

const runtime = {
  manifest,
  cursor: 0,
  contentCache: new Map(),
  executionLog: [],
  receipts: [],
};
```

**理由：** 这能把两个概念拆开观察：workflow 已知，但内容 lazy。启动时知道下一步有哪些文件，不代表已经把这些 MD 放进上下文或缓存。

**替代方案（未采用）：**

- 在测试代码里写 steps 数组：更小，但 workflow 感弱，不容易观察 manifest 与 lazy content 的边界
- 用 workflow.md frontmatter 定义 steps：更 MD-speaking，但会把 workflow manifest 实验和 MD frontmatter 实验混在一起

### Decision 2: 入口和依赖都用 MD 文件名，不用 segmentRegistry key

**选择：** loader API 使用 `fileRef`，例如 `wave-entry.md`。文件都在 `segments-workflow-load/` 下解析：

```javascript
function segmentPath(fileRef) {
  return join(baseDir, 'segments-workflow-load', fileRef);
}
```

核心 API：

```javascript
loadWorkflowManifest(path)
createWorkflowRuntime(manifest)
advanceWorkflow(state, runtime)
loadMarkdownFile(fileRef, state, runtime)
readMarkdownFile(fileRef, runtime)
resolveDependencyClosure(fileRef, runtime)
executeMarkdownFile(fileRef, state, runtime)
```

**理由：** 用户想验证的是"按文件名一个个动态加载 MD"，不是 gate-loop 里的 key → Step registry。这里如果继续叫 `key`，会误导成预注册段路由。

**替代方案（未采用）：**

- `segmentRegistry: Map<string, Step>`：适合 gate/fork，但会掩盖本实验的文件动态加载问题
- 任意路径加载：过早扩大范围；prototype 只允许实验目录内的 fileRef，避免路径语义干扰实验目标

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
return state;
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

**替代方案（未采用）：**

- 正文 `@load` 指令：更像 playbook，但解析边界弱
- 普通 Markdown 链接：无法区分说明链接和加载依赖

### Decision 4: 内容缓存，执行不缓存

**选择：** `readMarkdownFile(fileRef, runtime)` 第一次读文件并缓存 `{ md, frontmatter }`；后续同一 fileRef 返回 cache hit。但 `executeMarkdownFile()` 每次调用都会重新执行该 MD 的实验代码块。

```
第一次 advance:
file_read workflow-context.md
file_executed workflow-context.md

第二次 advance 再依赖它:
cache_hit workflow-context.md
file_executed workflow-context.md
```

**理由：** 这能同时观察两件事：动态加载是否真的发生，和已加载内容再次参与执行时副作用是否可控。缓存执行结果会让实验看不到重复调用语义。

**替代方案（未采用）：**

- 一次运行只执行一次：更安全，但不利于摸索"已加载 MD 再被引用时怎么办"
- 每次都重读文件：看不出内容缓存和动态执行的区别

### Decision 5: `advanceWorkflow()` 是原子推进；失败不移动 cursor

**选择：** `advanceWorkflow()` 一次只处理当前 cursor 指向的 step。它先解析完整依赖计划；如果 missing/cycle/frontmatter parse error 发生，不执行任何文件，不推进 cursor，并记录 `load_error`。

伪代码：

```javascript
function advanceWorkflow(state, runtime) {
  if (runtime.cursor >= runtime.manifest.steps.length) {
    return { state, status: 'complete', runtime };
  }

  const step = runtime.manifest.steps[runtime.cursor];
  traceEntry('advance_start', { cursor: runtime.cursor, step });

  try {
    const plan = resolveDependencyClosure(step, runtime);
    const nextState = executeLoadPlan(plan, state, runtime);
    runtime.cursor += 1;
    traceEntry('advance_complete', { cursor: runtime.cursor, step, plan });
    return { state: nextState, status: 'advanced', runtime, plan };
  } catch (error) {
    traceEntry('load_error', { cursor: runtime.cursor, step, error: error.message });
    return { state, status: 'error', runtime, error };
  }
}
```

**理由：** cursor 不前进让错误恢复可观察。若失败后 cursor 已移动，debug 时很难判断当前 workflow 处于哪个 step。

**替代方案（未采用）：**

- 先执行部分依赖，失败后保留部分 state：更接近某些 runtime，但 prototype 阶段会让错误语义过早复杂

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

**理由：** DFS 简单可审计，能直接暴露 missing/cycle/diamond 三类核心问题。

**替代方案（未采用）：**

- 拓扑排序：适合全图已知场景，但本实验强调 just-in-time 从当前 step 读依赖闭包

### Decision 7: JS 代码块用正则提取 + `node:vm` 执行；state 为显式 schema

**选择：** `executeMarkdownFile(fileRef, state, runtime)` 的实现分两步：

1. **提取：** 用正则 `` /```(?:js|javascript)\n([\s\S]*?)```/ `` 从 MD 正文中提取第一个 JS 代码块。如果没有代码块，该文件等价于 no-op（不抛错，记录 `no_code_block` receipt）。
2. **执行：** 用 `node:vm.Script` + `vm.createContext()` 沙箱执行，注入 `state` 和 `console`（`console.log` 转发到 trace event）。禁止 `require`/`import`/`process`/`fs`——prototype MD 代码块只能做纯数据变换。

`state` 对象有显式 Zod schema，初始化后流入每次 advance：

```javascript
const WorkflowState = z.object({
  executionOrder: z.array(z.string()).default([]),
  counters: z.record(z.string(), z.number()).default({}),
  data: z.record(z.string(), z.unknown()).default({}),
});
```

其中：
- `executionOrder`：记录已执行 fileRef 的顺序，用于测试断言
- `counters`：MD code block 可 `state.counters.xxx++` 来验证执行/重复执行次数
- `data`：通用 payload，MD code block 可写入任意 key，但 prototype 仅用于调试观察

`createInitialState()` 返回 `WorkflowState.parse({})`。

**理由：** `node:vm` 比 `eval` 安全且可审计——能显式控制沙箱内可用的 binding。state schema 让所有 MD code block 共享一套可预期的副作用面，测试断言的依据不再散落在各个 code block 的 prose 里。

**替代方案（未采用）：**

- `eval()`：最简单但无隔离，code block 可访问文件系统和模块——对 prototype 过于宽松
- 支持多个 code block 顺序执行：引入执行顺序语义，prototype 阶段每个 MD 一个 code block 已足够观察
- state 用任意 object 不校验：测试会依赖隐式 key 约定，容易写错字段名而不报错

## Risks / Trade-offs

- **[Risk] 依赖 MD 可执行会让 state mutation 难推理** → **Mitigation**: EXPERIMENT.md 必须记录这个语义是否清楚；测试用 executionOrder 和 counters 显式观察副作用
- **[Risk] 内容缓存但执行重跑可能与直觉冲突** → **Mitigation**: receipt 同时记录 `cache_hit` 和 `file_executed`，让两者区别可见
- **[Risk] prototype 被误认为生产 loader** → **Mitigation**: 只放 `experiments/prototype-workflow-load/`，proposal/design 明确这是摸索型实验
- **[Risk] 不接 gate/fork 导致集成价值不明显** → **Mitigation**: 保持实验独立，EXPERIMENT.md 只总结可迁移模式；是否集成留给后续 change
- **[Risk] JS code block 执行自由度过大** → **Mitigation**: Decision 7 采用 `node:vm` 沙箱执行，显式控制可访问 binding（仅 `state` + `console`），禁止文件系统/模块访问；生产化是否允许 MD 携带代码另行设计
