# Experiment: prototype-workflow-chain

## 实验目的

探索 single-entry Markdown closure loader：上游 Gate/Fork/FSM 只决定一个 next MD fileRef，Engine 负责在运行时加载这个入口 MD，并自动解析/执行它在 JSON frontmatter `requires` 中声明的依赖闭包。

核心待验证假设：

1. Loader 不需要 `workflow.json`、`steps[]` 或 `cursor`；入口由调用方显式给出
2. 自包含 MD 可被单独加载执行
3. 带依赖的 MD 可由 Engine 递归解析闭包，并按依赖优先顺序执行
4. 内容缓存和执行缓存必须分离：内容可复用，执行每次重新发生
5. Missing/cycle/malformed frontmatter 失败时不执行任何 MD，并留下 `load_error`

## 实验边界

- 本实验只验证“一个 next MD 如何带着依赖闭包活起来”
- 不负责 workflow 控制流、状态转移、重试、终止或完整 DAG 运行
- 多节点推进由 `prototype-workflow-fsm` 承接
- 零新增依赖；Node.js >=20, ESM, `zod`

## 当前 API

```javascript
const runtime = createWorkflowRuntime();
const state = createInitialState();
const result = loadNextMarkdown('chain-entry.md', state, runtime);
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
node --test experiments/prototype-workflow-chain/workflow-chain.test.mjs
```

覆盖场景：

- runtime 初始化无 manifest/cursor
- self-contained entry just-in-time load
- 多次显式选择 entry，无 cursor 语义
- chain dependency order
- diamond dependency dedup
- cache hit + re-execute
- missing/cycle/malformed error path
- no-code-block no-op
- path traversal rejection

### Agent 辅助测试 Playbook

| Playbook | 复杂度 | 目标 |
|----------|--------|------|
| test-simple | 简单 | 自包含 entry，调用前无 preload，调用后单 entry load/execute |
| test-medium | 中等 | dependency-first + 跨调用 cache hit/re-execute |
| test-complex | 复杂 | missing/cycle/malformed error + 同 runtime recovery |

## 观察

### 观察 1: single-entry 比 manifest/cursor 更符合 loader 边界

`workflow-chain` 不再决定“下一个是谁”。上游已经做出决策，loader 只负责：

```
entry fileRef -> dependency closure -> dependency-first execution -> receipts
```

这让 `workflow-chain` 和 `workflow-fsm` 的边界清楚：FSM 负责控制流，workflow-chain 负责单个 MD closure 的完整性。

### 观察 2: 依赖也执行，才能验证“MD 活起来”

依赖不是普通 include。依赖 MD 可能初始化 state、写 trace、执行前置检查。Prototype 保留 dependency-first execution，而不是 load-only context include。

### 观察 3: 内容 cache 与执行生命周期不同

同一个依赖跨两次 `loadNextMarkdown()` 被引用时：

```
第一次: file_read + file_executed
第二次: cache_hit + file_executed
```

这能同时观察 I/O 缓存和执行副作用。

### 观察 4: 错误不推进任何 workflow 状态

因为本 prototype 没有 cursor/currentState，missing/cycle/malformed 的语义更简单：返回 `status: 'error'`，不执行任何 MD，调用方决定下一步。解析阶段已经发生的 `file_read/cache_hit` receipts 保留为真实证据。

## 未解决问题

1. **生产化是否允许 MD 代码块执行** — prototype 用 VM 沙箱执行 JS code block；生产 workflow 可能需要更严格的执行模型。
2. **依赖是否需要 load-only 模式** — 当前所有依赖默认执行。若未来需要纯上下文 include，应另开设计，不混入这个 prototype。
3. **共享 loader 抽取时机** — `workflow-fsm` 复用了相同语义，但 prototype 阶段保持复制，避免过早抽象。

## 可迁移模式

- Single-entry loader API：上游传入一个 next MD，loader 负责 closure 完整性
- DFS visiting/visited：cycle 检测 + diamond 去重
- Dependency-first execution
- Content cache != execution cache
- Receipt/trace 驱动可观察性

## 相关实验

- `prototype-gate-loop` — Gate pass/fail 后选择一个 next node
- `prototype-gate-fork` — Fork 选择多个 branch node
- `prototype-workflow-fsm` — 多节点 FSM 控制流与自动运行循环
- `prototype-subagent` — subagent dispatch/collect/merge
