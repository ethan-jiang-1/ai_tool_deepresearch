# Design: prototype-workflow-fsm

## Context

`prototype-workflow-next` 验证了线性 cursor 模型：`workflow.json` 定义 step 顺序，Engine 每次 `advanceWorkflow()` 推进一个 step，动态加载依赖闭包。但它把 workflow 当成一个列表，控制流完全在外部——调用方决定何时 advance，节点自己不知道去向。

Gate-loop 和 gate-fork 已经证明 FSM 模式在 gate 层面可行（evaluate → gateRouter → next step）。本实验把 FSM 模式提升到 workflow 级别：**整个 workflow 是一个预定义的 DAG/FSM，每个节点执行完后主动触发状态转移。**

核心架构变化：

```
workflow-next (过程式，外部推):          workflow-fsm (声明式，内部自治):
                                         
  external push                            ┌──────────────────────┐
  ┌─────────┐                              │  Machine (createMachine)
  │ cursor++│                              │                      │
  │         │                              │  m.current           │
  │ step[i] │                              │  m.canAdvance        │
  └────┬────┘                              │  m.step() ──────────┐│
       │                                   │  m.run()            ││
       ▼                                   │  m.receipts         ││
  advanceWorkflow()                        └──┬──┬───────────────┘│
       │                                      │  │                │
       ▼                                      │  │ lookup         │
  execute step                               ▼  ▼                │
       │                              resolveTransition()         │
       ▼                                   │                     │
  return { status }                 loadAndExecuteNode()          │
       │                                   │                     │
       ▼                                   ▼                     │
  caller decides next              transition() in VM sandbox ◄──┘
                                   (node self-reports status)
```

## Goals / Non-Goals

**Goals:**

- 用 `.fsm.json` 文件预定义 workflow 的状态和转移规则（状态 × 执行结果 → 下一状态）
- MD 节点通过 `transition(currentNode, status)` 在代码块内部主动上报执行结果
- Engine 根据 FSM 定义裁决下一步：advance（转移）、retry（自环重试）、complete（终止）、halt（异常停止）
- `runFSM()` 提供过程式自动运行循环（供测试和 scripting 使用）
- `Machine` 类 + `createMachine()` 提供声明式 API——定义一次，之后只 `step()`/`run()`，机器自治
- 保留 workflow-next 已验证的依赖解析、内容缓存/执行分离、receipt 可观察性

**Non-Goals:**

- 不实现并发状态/并行分支（那是 gate-fork 的领域）
- 不提升到 `DPT_FRAMEWORK/`
- 不接入 gate-loop/gate-fork 的实际 pipeline
- 不实现条件转移表达式（status string 匹配已足够）
- 不新增 npm 依赖

## Decisions

### Decision 1: FSM 定义用 JSON 文件，不嵌入 MD frontmatter

**选择：** FSM 定义独立为 `.fsm.json` 文件：

```json
{
  "name": "wf-simple",
  "initial": "wave-entry.md",
  "states": {
    "wave-entry.md": {
      "on": {
        "success": "wave-audit.md",
        "error": "wave-entry.md"
      }
    },
    "wave-audit.md": {
      "on": {
        "success": "wave-final.md",
        "error": "wave-audit.md"
      }
    },
    "wave-final.md": {
      "on": {
        "success": null
      }
    }
  }
}
```

Schema:

```javascript
const FSMDefinition = z.object({
  name: z.string(),
  initial: z.string().min(1),
  states: z.record(z.string().min(1), z.object({
    on: z.record(z.string().min(1), z.string().nullable()),
  })),
});
```

- `initial`: 起始节点名称，必须在 states 中存在
- `states.<node>.on.<status>`: 转移目标节点名。`null` 表示终止状态（complete）
- status 字符串由节点代码块自行定义，不限于 success/error

**理由：** FSM 是 workflow 的"骨架"，应该在启动时就完整可见。独立 JSON 文件让 Engine 一次加载就拿到全图，不碰 MD。这保持了 workflow-next 已验证的"Manifest/MD 分离"原则——只是 manifest 从线性 steps 数组变成了状态转移表。

**替代方案（未采用）：**
- FSM 嵌入 MD frontmatter：会把状态转移逻辑和节点内容混在一起，启动时仍需读 MD
- YAML 格式：human-readable 但需额外依赖（虽然 yaml 已批准，prototype 阶段避免不必要的解析复杂度）

### Decision 2: transition() 通过 VM 沙箱注入，做完整 FSM 查表

**选择：** `transition(currentNode, status)` 在沙箱内做完整的 FSM 查表并返回结果：

```javascript
// 在 executeFSMNode 中构建 sandbox：
const transitionResult = { value: null };
const sandbox = {
  state,
  console: { log: () => {} },
  transition: (currentNode, status) => {
    // 1. 写 receipt
    runtime.receipts.push({
      type: 'transition',
      currentNode,
      status,
      ts: new Date().toISOString(),
    });
    // 2. 查 FSM
    const result = resolveTransition(runtime.fsm, currentNode, status);
    // 3. 存结果供 Engine 读取
    transitionResult.value = { currentNode, status, ...result };
    // 4. 返回给代码块
    return result;
  },
};
```

`resolveTransition(fsm, currentNode, status)` 的逻辑：

```
fsm.states[currentNode].on[status] 存在且为 string:
  → { action: 'advance', next: '<target>' }
fsm.states[currentNode].on[status] 为 null:
  → { action: 'complete' }
currentNode 不在 states 中，或 status 不在 on 中:
  → { action: 'halt', reason: 'no matching transition for ...' }
```

**理由：** transition 在沙箱内完整执行，代码块可以拿到返回值做后续判断（如写 trace）。同时结果被 Engine 读取用于驱动 runFSM 循环。receipt 记录让所有转移行为可审计。

**替代方案（未采用）：**
- 代码块只 set 一个 status 变量，Engine 在 VM 退出后查 FSM：更简单，但代码块无法知道转移结果
- transition 异步返回：prototype 阶段不需要

### Decision 3: `runFSM()` 是过程式编排循环，带 `maxIterations` 防护

**选择：** `runFSM(fsm, state, runtime, maxIterations = 100)` 实现完整的过程式自动运行：

```javascript
function runFSM(fsm, state, runtime, maxIterations = 100) {
  let currentState = state;
  let iterations = 0;

  while (iterations < maxIterations) {
    const currentNode = runtime.currentState;
    const { state: nextState, status, error } = loadAndExecuteNode(currentNode, currentState, runtime);
    currentState = nextState;
    iterations++;

    if (error) return { finalState: currentState, outcome: 'halted', reason: error, iterations };
    if (status === null) return { finalState: currentState, outcome: 'halted', reason: '...', iterations };

    const result = resolveTransition(fsm, currentNode, status);
    if (result.action === 'complete') return { finalState: currentState, outcome: 'complete', iterations };
    if (result.action === 'halt') return { finalState: currentState, outcome: 'halted', reason: result.reason, iterations };

    runtime.currentState = result.next;
  }
  return { finalState: currentState, outcome: 'halted', reason: 'Exceeded max iterations', iterations };
}
```

默认 100 足够容纳任意合理的 retry 次数（即使 10 个节点各自环 10 次也才 100），到达上限意味着 bug 而非正常行为——halt 并报告。

**理由：** `runFSM()` 是供 coding agent 和测试使用的过程式便捷入口。带 `maxIterations` 防护让它安全可测试，不会因为 node MD 的代码逻辑 bug 导致死循环。

**替代方案（未采用）：**
- 不设 max iterations：自环 bug 会导致死循环，尤其在测试中不可接受


### Decision 4: 依赖解析和内容缓存从 workflow-next 完整复用

**选择：** 以下模块从 workflow-next 保持语义不变：

- `parseFrontmatter(md)` — 提取 `requires` 数组
- `readMarkdownFile(fileRef, runtime)` — 首次读缓存，再次读 cache_hit
- `resolveDependencyClosure(fileRef, runtime)` — DFS 依赖闭包，dependency-first
- `executeMarkdownFile(fileRef, state, runtime)` — 提取 ```js 代码块，VM 沙箱执行
- WorkflowState schema — `{ executionOrder, counters, data }`

差异只在于 `executeFSMNode`（对应 workflow-next 的 `executeMarkdownFile`）需要额外注入 `transition` 函数到沙箱，并读取 transition 结果。

**理由：** 这些是 workflow-next 已验证可行的机制，FSM 只是改变了"何时加载哪个节点、加载完去哪里"的控制流，不改变节点内部的加载和执行语义。

**替代方案（未采用）：**
- 从头重写：引入不必要的差异，让两个 prototype 难以对比

### Decision 5: FSM 节点引用使用 MD 文件名，与 workflow-next 对齐

**选择：** FSM 中的节点名（`states` 的 key 和 `on` 的 value）使用 `.md` 文件名，如 `wave-entry.md`。这与 workflow-next 的 `fileRef` 命名一致。

`nodePath()` 解析到 `nodes-workflow-fsm/` 内部。

**理由：** 保持两个 prototype 之间文件引用的可移植性。如果未来合并，fileRef 解析逻辑可以共享。

### Decision 6: `Machine` 类提供声明式 API，`step()` 是原子推进单位

**选择：** 除过程式的 `runFSM(fsm, state, runtime)` 之外，提供一个声明式的 `Machine` 类：

```javascript
class Machine {
  constructor(fsm, initialState) {
    this._fsm = fsm;
    this._state = initialState || createInitialState();
    this._current = fsm.initial;
    this._outcome = 'running';
    this._haltReason = null;
    this._contentCache = new Map();
    this._receipts = [];
    this._iterations = 0;
  }

  // Declarative getters — 外部只读
  get fsm()        // 当前 FSM 定义
  get state()      // 当前 WorkflowState
  get current()    // 当前节点名
  get outcome()    // 'running' | 'complete' | 'halted'
  get haltReason() // halt 原因
  get receipts()   // 完整审计轨迹
  get iterations() // 已执行次数
  get canAdvance() // outcome === 'running'
  get isComplete() // outcome === 'complete'
  get isHalted()   // outcome === 'halted'

  // 原子推进：执行当前节点 → 读 transition → 裁决转移
  step() { ... }

  // 自动跑到终止
  run(maxIterations = 100) { ... }
}
```

工厂函数：`createMachine(pathOrDef, initialState)` — 接受 `.fsm.json` 路径或已解析的 FSM 对象。

声明式用法：

```js
const m = createMachine('wf-simple.fsm.json');
m.current;     // 'wave-entry.md'
m.canAdvance;  // true
m.step();      // 执行 wave-entry → transition('success') → advance
m.current;     // 'wave-audit.md'
m.step();
m.step();
m.isComplete;  // true
m.receipts;    // [{ type: 'node_start', ... }, ...]
m.iterations;  // 3
```

`step()` 是原子操作——等价于 `loadAndExecuteNode` + `resolveTransition` + 状态更新的一次调用。`run()` 是 `step()` 的 while 循环包装。

**理由：** `runFSM(fsm, state, runtime)` 是过程式的——外部准备三元组、调用函数、读返回值。`Machine` 是声明式的——定义一次，之后只发指令（`step()`/`run()`），机器自己维护内部状态。这跟 XState 的 `createMachine()` → `actor.send(event)` 模式理念一致，但实现极简（100 行，零依赖）。

`Machine` 不取代 `runFSM()`——`runFSM()` 仍然存在用于 scripting 和测试场景，`Machine` 用于需要自知的、有状态的 workflow 实例的场景。

**替代方案（未采用）：**
- 只保留过程式 API：引入 XState 风格的模式不是为了模仿而模仿——声明式 getter（`canAdvance`、`isComplete`）让 Agent 判断 workflow 状态时不用手动检查返回值的字段
- 用 XState 代替自建 Machine：13KB 压缩 + npm 依赖。当前实现仅 100 行，数据结构可随时迁移到 XState

## Risks / Trade-offs

- **[Risk] 自环 FSM 可能无限循环** → **Mitigation**: `runFSM()` 默认 `maxIterations=100`，超限后返回 `halted` 而非死循环。100 足够容纳任意合理的 retry 次数，且不改变 FSM 语义——到达上限意味着 bug 而非正常行为
- **[Risk] transition 在沙箱内执行，FSM 查表在沙箱内触发** → **Mitigation**: `resolveTransition` 是纯函数（只读 FSM 定义 + 参数），不修改 runtime 状态（除了 receipt），行为可预测
- **[Risk] 两个 prototype（linear/fsm）的代码有大量重叠** → **Mitigation**: prototype 阶段允许复制，EXPERIMENT.md 记录哪些可抽取为共享模块
