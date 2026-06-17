# Experiment: prototype-workflow-load

## 实验目的

探索 workflow 动态加载模式：workflow 的 step 顺序预先已知（`workflow.json` manifest），但 step MD 内容不在启动时预加载；Engine 每次推进 cursor 时才动态加载当前 MD 及其依赖 MD。

核心待验证假设：
1. Manifest load 与 step MD load 是两个独立步骤，可以物理分离
2. 同一次 advance 内依赖 MD 按声明顺序优先执行
3. 内容缓存与执行缓存可以有不同的生命周期（内容一读永存，执行每次重新发生）
4. DFS 依赖闭包可以稳定处理 missing/cycle/diamond 三类核心问题

## 实验环境和依赖

- 零 import 依赖（从 gate-loop/gate-fork/subagent 原型中验证模式）
- 批准依赖：`zod`（schema 校验）
- Node.js >=20, 纯 JavaScript ESM
- 文件都在 `experiments/prototype-workflow-load/` 下，与其他原型物理隔离

## 实验结果

### 单元测试

```
$ node --test experiments/prototype-workflow-load/workflow-load.test.mjs
▶ 7.1 Manifest Loading — 6 tests ✓
▶ 7.2 Step-by-Step Dynamic Load — 2 tests ✓
▶ 7.3 Dependency-First Chain — 1 test ✓
▶ 7.4 Diamond Dependency — 2 tests ✓
▶ 7.5 Cache Visibility — 1 test ✓
▶ 7.6 Missing Dependency — 2 tests ✓
▶ 7.7 Cycle Dependency — 2 tests ✓
▶ 7.8 Complete — 1 test ✓
▶ 7.9 Observability — 3 tests ✓
▶ Frontmatter Parsing — 4 tests ✓
▶ No-Code-Block Execution — 1 test ✓
▶ segmentPath — 2 tests ✓
────────────────────────────────
27 tests, 0 failures
```

### Agent 辅助测试 Playbook

| Playbook | 复杂度 | Checks | 结果 |
|----------|--------|--------|------|
| test-simple | 简单 | 5 | ✓ |
| test-medium | 中等 | 4 | ✓ |
| test-complex | 复杂 | 10 | ✓ |

## 动态加载观察

### 观察 1: Manifest load 与 step MD load 正确分离

启动时 `loadWorkflowManifest()` + `createWorkflowRuntime()` 不读任何 step MD。`runtime.contentCache` 初始为空，`runtime.cursor = 0`。首次 `advanceWorkflow()` 才触发 `file_read`。这个分离做到了，语义清晰。

### 观察 2: 依赖优先执行顺序可预测

Chain 场景 `entry → context → policy` 正确生成 plan `[policy, context, entry]`。DFS 的 visiting/visited 双集合方案对 single-closure 内的去重和 order 控制都够用。

### 观察 3: 内容缓存与执行缓存的分离

同一 MD 在后续 advance 中被再次引用时，receipt 正确记录 `cache_hit`（不再读磁盘）+ 新的 `file_executed`（重新执行 code block）。这个分离是有用的——让观察者知道哪些内容被复用、哪些执行重复发生。

### 观察 4: Zod parse() 的隐式拷贝

一个重要发现：`z.object().parse()` 对数组字段创建新数组（深拷贝元素），而不是保留引用。这意味着 MD code block 中 `state.executionOrder.push(...)` 这类操作必须依赖 `executeMarkdownFile` → `executeLoadPlan` 的 state 链式传递（每次返回新 state）。不熟悉 Zod 行为的开发者可能会认为 mutate 原始 state 即可——这在测试和 playbook 中都遇到了，已在测试中通过 `result.state` 模式解决。

**建议**: 生产化时在 STATE_MUTATION.md 中明确文档化这个行为，或考虑用 mutable proxy 包装。

### 观察 5: 错误恢复语义清晰

Missing/cycle/malformed 三种错误都正确阻止了 cursor 前进且不执行任何文件。error receipt 包含足够的上下文让调用方决定下一步。这验证了 Decision 5（原子推进）的可行性。

## 未解决问题

1. **跨 advance 的依赖共享** — 当前 `resolveDependencyClosure` 每次创建新的 visiting/visited 集合。如果 step 1 加载了 `shared.md`，step 2 再次声明对它的依赖，step 2 的 closure 会重新 resolve（但内容缓存命中）。这是预期行为还是应该跳过已在先前 advance 中执行过的依赖？目前 design 没有明确表态。

2. **MD code block 执行安全边界** — 当前用 `node:vm` + 5s timeout + 禁止 require/fs/process。这对 prototype 足够，但生产化时需要考虑：是否允许 MD 携带 code？如果禁止，execute 语义是否降级为纯数据注入？

3. **并发 advance** — 当前是严格串行的 cursor 模型。如果未来需要分支 workflow（类似 gate-fork 的 1→N），动态加载和依赖闭包解析的语义需要重新审视。

4. **manifest 变体** — 当前只支持 `workflow.json` 的 steps 数组。是否需要支持 step groups、条件步骤、或从其他 manifest 引用步骤？这些留给后续 change。

## 可迁移模式

以下模式在 prototype 中验证可行，可在生产设计中复用：

- **Manifest ↔ Content 分离**: 启动时只读结构，运行时按需读内容
- **DFS visiting/visited 双集合**: 处理 cycle 检测 + diamond 去重，足够覆盖 prototype 阶段的依赖图
- **Receipt 驱动的可观察性**: receipt 数组记录 load 全过程，trace 文件供外部工具消费
- **Content cache ≠ execution cache**: 两个不同生命周期的缓存，receipt 同时暴露两者

## 相关实验

- `prototype-gate-loop` — 单段 MD 动态加载（Gate → load segment）
- `prototype-gate-fork` — 多分支 MD 动态加载（Fork → 多 segment 并行）
- `prototype-subagent` — subagent 调度中的 MD 加载

本实验在之前实验的基础上增加了两维：workflow 级别的 step-by-step 推进，和 MD 间的显式依赖声明与解析。
