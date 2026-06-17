# TODO: prototype-workflow-next

> 状态: 待设计 | 优先级: 高 | 创建: 2026-06-16

## Why

`prototype-gate-loop/gate-fork` 已经验证了基础动态段加载：Gate 输出一个 segment key，Engine 通过 `segmentRegistry` 找到 Step，并读取对应的 MD 文件展示/执行。

但这个模式只回答了"怎么加载一个节点"，还没有回答"一个节点依赖的上下文、规则、子流程如何一起加载"。

真实 deep research workflow 中，一个节点经常不是孤立的。比如 `wave1_evidence` 不只是一个段，它可能还需要：

- evidence 写入规则
- reference 计数规则
- topic scope 约束
- stop authorization 约束
- 前置 workflow context

如果这些依赖靠 Agent 自己记得去读，就会退回 V12 的 agent 自治理：MD 写了规则，但 Engine 不知道规则有没有被加载，也不知道依赖有没有重复、缺失或形成循环。

**prototype-workflow-next 验证"怎么自动带上依赖"**：加载入口 MD 时，Engine 递归解析该 MD frontmatter 中声明的 `requires`，计算依赖闭包，并按依赖优先顺序加载/执行所有节点。Agent 只需要请求入口节点，依赖完整性由 Engine 强制保证。

## 核心挑战：Engine 执行 Load Graph

现有动态加载是单点 late binding：

```
Gate output key ──→ loadNextSegment(key) ──→ executeMDAndRun(key)
```

目标是 load graph late binding：

```
entry key
   │
   ▼
read entry.md frontmatter
   │
   ▼
resolve requires recursively
   │
   ▼
dependency-first load plan
   │
   ▼
execute each MD + Step once
```

示例：

```
wave_entry
    │
    ├── workflow_context
    │       │
    │       └── evidence_policy
    │
    └── topic_scope
            │
            └── evidence_policy

执行顺序:
evidence_policy → workflow_context → topic_scope → wave_entry

注意:
evidence_policy 被两个节点依赖，但在一次 load graph 中只执行一次。
```

这个 prototype 的重点不是 workflow 业务逻辑，而是 **Load Graph 的确定性和可审计性**：

- 缺失依赖必须报错
- 循环依赖必须报错
- 重复依赖必须去重
- 执行顺序必须稳定
- 每个加载/执行动作必须留下 receipt

## 现有 Prototype 缺口

### gate-loop / gate-fork 现在做到了什么

```javascript
function executeMDAndRun(key, state) {
  const step = loadNextSegment(key);
  const mdPath = `experiments/prototype-gate-loop/segments-gate-loop/${key.replace(/_/g, '-')}.md`;
  const md = readFileSync(mdPath, 'utf-8');
  runMDCode(md, state);
  return { step, md };
}
```

这个模式有三个限制：

1. **只加载一个 MD**：`key` 只映射到一个文件，没有依赖闭包。
2. **依赖不可见**：如果 MD 正文说"先读 evidence rules"，Engine 不知道这个要求。
3. **无法审计完整性**：缺失、重复、循环依赖都没有 Engine 级检查。

### workflow-next 要验证什么

`prototype-workflow-next` 要把 segment MD 从"单个可加载文件"升级为"声明式 workflow node"：

```markdown
---
{
  "key": "wave_entry",
  "requires": ["workflow_context", "evidence_rules"]
}
---

# Wave Entry

我是入口节点。Engine 加载我之前，必须先加载并执行 `workflow_context` 和 `evidence_rules`。
```

Engine 读取 frontmatter 后，不相信 Agent 自己记得依赖，而是自己构建 load plan。

## 实验范围

**Goals:**

- 定义 workflow segment MD frontmatter：`key` + `requires`
- 实现 `parseSegmentFrontmatter(md)`：正则提取 `---` 块，然后 `JSON.parse()`
- 实现 `loadWorkflow(entryKey, state)`：入口函数，返回最终 state + load receipts
- 实现 `resolveDependencyClosure(entryKey)`：DFS 递归解析依赖闭包
- 实现 `executeLoadPlan(plan, state)`：按依赖优先顺序执行 MD + Step
- 缺失依赖报错，错误包含缺失 key 和 requester
- cycle 报错，错误包含路径，如 `a -> b -> a`
- duplicate dependency 在单次 load graph 中只执行一次
- trace 记录 `load_start` / `load_resolved` / `node_loaded` / `node_executed` / `load_error`

**Non-Goals:**

- 不创建生产级 workflow runtime
- 不接真实 deep research 业务流程
- 不接 subagent dispatch
- 不实现权限、模型路由、token budget
- 不把普通 Markdown 链接当依赖
- 不支持正文 `@load` / `@requires` 指令
- 不设计长期 schema 迁移策略

## 关键设计问题

### 1. Segment MD frontmatter 怎么定义？

使用 JSON frontmatter，保持项目约束：正则提取 `---` 块，然后 `JSON.parse()`，不引入 `gray-matter`。

```markdown
---
{
  "key": "wave_entry",
  "requires": ["workflow_context", "evidence_rules"]
}
---

# Wave Entry

入口节点正文。
```

最小 schema：

```javascript
const SegmentFrontmatter = z.object({
  key: z.string().min(1),
  requires: z.array(z.string().min(1)).default([]),
});
```

约束：

- `key` 必须等于 registry key，防止文件错配
- `requires` 只引用 registry key，不引用路径
- `requires` 的顺序有意义：同一层依赖按声明顺序解析和执行
- 未写 `requires` 等价于 `[]`

### 2. 依赖节点是否执行？

本 prototype 选择：**依赖节点也执行**。

原因：这里验证的是 workflow-next 的依赖加载语义，而不是 context include。一个依赖节点可能不只是说明文档，也可能是可审计的 setup step，例如：

- 初始化共享 state 字段
- 写入 trace receipt
- 校验前置条件
- 注册本轮执行约束

执行规则：

```
dependency before requester
same key executes once per load graph
entry executes last
```

示例：

```javascript
const plan = resolveDependencyClosure('wave_entry');
// ['evidence_rules', 'workflow_context', 'wave_entry']

const result = executeLoadPlan(plan, state);
```

### 3. DFS 如何处理缺失、重复、循环？

```javascript
function resolveDependencyClosure(entryKey) {
  const visiting = [];
  const visited = new Set();
  const plan = [];

  function visit(key, requester) {
    if (!segmentRegistry.has(key)) {
      throw new Error(`Missing dependency: ${key} requested by ${requester}`);
    }
    if (visiting.includes(key)) {
      const cycleStart = visiting.indexOf(key);
      const cycle = [...visiting.slice(cycleStart), key].join(' -> ');
      throw new Error(`Dependency cycle: ${cycle}`);
    }
    if (visited.has(key)) return;

    visiting.push(key);
    const meta = parseSegmentFrontmatter(readSegmentMD(key));
    for (const dep of meta.requires) {
      visit(dep, key);
    }
    visiting.pop();

    visited.add(key);
    plan.push(key);
  }

  visit(entryKey, '<entry>');
  return plan;
}
```

关键点：

- `visiting` 检测当前 DFS 栈上的 cycle
- `visited` 保证一个 key 只进入 plan 一次
- `plan.push(key)` 放在依赖访问之后，保证依赖优先
- `requester` 用于 missing dependency 错误定位

### 4. Load receipt 需要记录什么？

`loadWorkflow()` 不只返回最终 state，也返回 load receipts，证明 Engine 实际加载了什么、按什么顺序执行。

```javascript
const receipt = {
  entryKey: 'wave_entry',
  plan: ['evidence_rules', 'workflow_context', 'wave_entry'],
  executed: [
    { key: 'evidence_rules', status: 'executed' },
    { key: 'workflow_context', status: 'executed' },
    { key: 'wave_entry', status: 'executed' },
  ],
};
```

trace events：

```javascript
traceEntry('load_start', { entryKey });
traceEntry('load_resolved', { entryKey, plan });
traceEntry('node_loaded', { key, mdPath });
traceEntry('node_executed', { key, before, after });
traceEntry('load_error', { entryKey, error });
```

这让后续 Inspect 可以回答：

- 入口节点有没有被加载？
- 它依赖的规则有没有实际执行？
- 共享依赖有没有重复执行？
- 失败发生在解析、加载还是执行阶段？

### 5. MD 代码块和 Step.execute 怎么分工？

沿用现有 prototype 风格：

- MD 负责说明、展示、轻量 trace
- JS `Step.execute()` 负责 state mutation
- Engine 决定加载顺序和执行边界

不要让 MD 正文自己调用 loader，否则又会回到 agent/MD 自治理。

```javascript
function executeLoadPlan(plan, state) {
  let current = { ...state };
  const executed = [];

  for (const key of plan) {
    const step = loadNextSegment(key);
    const md = readSegmentMD(key);
    runMDCode(md, current);
    const before = current;
    current = step.execute(current);
    executed.push({ key, status: 'executed' });
    traceEntry('node_executed', { key, before, after: current });
  }

  return { state: current, executed };
}
```

## 与 gate-loop / gate-fork / subagent 的关系

`workflow-next` 不替代 gate-loop/fork，而是补齐它们的加载层。

```
Gate / Fork decision
        │
        ▼
   entry segment key
        │
        ▼
 loadWorkflow(entryKey)
        │
        ├── resolve dependency closure
        ├── load MD files
        ├── execute dependency Steps
        └── execute entry Step
        │
        ▼
    updated state + receipts
```

与现有 prototype 的关系：

| Prototype | 回答的问题 | workflow-next 的关系 |
|-----------|------------|----------------------|
| gate-loop | fail 后怎么 repair 并回到 Gate | Gate pass/fail 后的目标 key 可以交给 `loadWorkflow()` |
| gate-fork | 多分支怎么路由和汇聚 | 每个 branch key 可以拥有自己的依赖闭包 |
| subagent | pass 后怎么 fan-out 隔离执行 | dispatch 节点可依赖 slot policy、result envelope policy |
| explore-exploit | 够不够继续，下一步 dispatch 什么 | 决策结果可选择不同 entry key，loader 负责依赖完整性 |

这个实验的边界很清楚：它只验证"加载入口节点时，Engine 能否自动带上并执行依赖节点"。

## 测试场景

### 1. 单节点

```
entry
```

- `loadWorkflow('entry')`
- plan: `['entry']`
- executed: `entry`

### 2. 链式依赖

```
entry -> context -> policy
```

- plan: `['policy', 'context', 'entry']`
- 断言执行顺序依赖优先

### 3. 菱形依赖

```
entry
  ├── a ──┐
  └── b ──┴── shared
```

- plan: `['shared', 'a', 'b', 'entry']`
- `shared` 只执行一次
- `a` 和 `b` 按 entry 的 `requires` 声明顺序执行

### 4. 缺失依赖

```
entry -> missing_policy
```

- `loadWorkflow('entry')` 抛错
- 错误包含 `missing_policy` 和 requester `entry`
- trace 记录 `load_error`

### 5. 循环依赖

```
a -> b -> a
```

- `loadWorkflow('a')` 抛错
- 错误包含 `a -> b -> a`
- 不执行任何 Step

### 6. MD / Step 分工

- MD 代码块只记录 `node_loaded` 或说明性 trace
- state mutation 发生在 `Step.execute()`
- 测试断言最终 state 与 executed plan 一致

## 下一步

1. OpenSpec explore: 细化 frontmatter schema、load plan receipt、cycle/missing error shape
2. `/opsx:propose prototype-workflow-next` — 出 proposal + design + specs + tasks
3. 实现 `experiments/prototype-workflow-next/`
4. 与 gate-loop / gate-fork 做集成验证：branch key 不再直接 `executeMDAndRun()`，而是进入 `loadWorkflow()`
5. 与 subagent prototype 复盘：dispatch slot policy 是否应该作为 load dependency 自动带入
