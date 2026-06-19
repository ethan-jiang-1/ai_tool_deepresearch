# Experiment: prototype-workflow-chain

## 实验目的

探索 single-entry Markdown closure loader：上游 Gate/Fork/FSM 只决定一个 next MD fileRef，Engine 负责在运行时加载这个入口 MD，并自动解析它在 JSON frontmatter `requires` 中声明的依赖闭包。

核心待验证假设：

1. Loader 不需要 `workflow.json`、`steps[]` 或 `cursor`；入口由调用方显式给出
2. 自包含 MD 可被单独加载
3. 带依赖的 MD 可由 Engine 递归解析闭包，并按依赖优先顺序加载
4. 内容缓存和加载计数分离：MD 内容可复用（cache_hit），每次加载 Engine 写入 executionOrder 和 counters
5. Missing/cycle/malformed frontmatter 失败时不加载任何 MD，并留下 `load_error`

## 实验边界

- 本实验只验证”一个 next MD 如何带着依赖闭包活起来”
- 不负责 workflow 控制流、状态转移、重试、终止或完整 DAG 运行
- 多节点推进由 `prototype-workflow-fsm` 承接
- 零新增依赖；Node.js >=20, ESM, `zod`
- **重要：MD content 是 Agent-readable — Engine 不执行 code block。** JS code block 在 prototype 节点中保留为 dead code，仅供历史参考

## 当前 API

```javascript
const runtime = createWorkflowRuntime();
const state = createState();
const result = assessNode('chain-entry.md', state, runtime);
```

成功返回：

```javascript
{
  status: 'loaded',
  state,
  runtime,
  plan: ['chain-policy.md', 'chain-context.md', 'chain-entry.md']
}
```

失败返回：

```javascript
{
  status: 'error',
  state,
  runtime,
  error: '...'
}
```

## 实验结果

### 单元测试

```bash
node --test tests/engine/workflow-chain.test.mjs
```

覆盖场景：

- runtime 初始化无 manifest/cursor
- self-contained entry just-in-time load
- 多次显式选择 entry，无 cursor 语义
- chain dependency order
- diamond dependency dedup
- cache hit + re-load
- missing/cycle/malformed error path
- MD without code block loads normally
- path traversal rejection

### Agent 辅助测试 Playbook

| Playbook | 复杂度 | 目标 |
|----------|--------|------|
| test-simple | 简单 | 自包含 entry，调用前无 preload，调用后单 entry load |
| test-medium | 中等 | dependency-first + 跨调用 cache hit/re-load |
| test-complex | 复杂 | missing/cycle/malformed error + 同 runtime recovery |

## 观察

### 观察 1: single-entry 比 manifest/cursor 更符合 loader 边界

`workflow-chain` 不再决定”下一个是谁”。上游已经做出决策，loader 只负责：

```
entry fileRef -> dependency closure -> dependency-first load -> receipts
```

这让 `workflow-chain` 和 `workflow-fsm` 的边界清楚：FSM 负责控制流，workflow-chain 负责单个 MD closure 的完整性。

### 观察 2: 依赖也加载，MD 内容返回给 Agent

依赖 MD 的内容（frontmatter + body）全部返回给 Agent 读取和判断。Engine 写入 executionOrder 和 counters 做确定性状态追踪，但不执行任何 code block。

### 观察 3: 内容 cache 与加载生命周期不同

同一个依赖跨两次 `assessNode()` 被引用时：

```
第一次: file_read + file_loaded
第二次: cache_hit + file_loaded
```

内容缓存命中时不重复读盘，但每次加载 Engine 仍写入 state（executionOrder、counters）。

### 观察 4: 错误不推进任何 workflow 状态

因为本 prototype 没有 cursor/currentState，missing/cycle/malformed 的语义更简单：返回 `status: 'error'`，不加载任何 MD，调用方决定下一步。解析阶段已经发生的 `file_read/cache_hit` receipts 保留为真实证据。

## 相关实验

- `prototype-gate-loop` — Gate pass/fail 后选择一个 next node
- `prototype-gate-fork` — Fork 选择多个 branch node
- `prototype-workflow-fsm` — 多节点 FSM 控制流与自动运行循环
- `prototype-subagent` — subagent dispatch/collect/merge
