# Design: prototype-gate-fork

## Context

真实 deep research 的 Gate 不是二元的。例如 Wave 0 Gate Audit 可以分叉：
- `pass` → Wave 1 证据搜索
- `fail_topic_readiness` → 话题分解修复
- `fail_reference_floor` → 补充共享参考
- `blocked` → 等待人工

每个分支是不同的 Step。本实验验证这个 1→N 分叉模式。

## Goals / Non-Goals

**Goals:**
- Gate 分叉到 3+ 分支
- 每分支独立执行
- 多分支 fail → 共享 repair → 重回 Gate
- 与 gate-loop 的 loopback 模式正交（可组合）

**Non-Goals:**
- 不实现真实 Gate 审计逻辑
- 不追求生产级质量
- 不 import gate-loop 代码 — 两个实验保持独立，命名对齐即可

## Decisions

### 1. Guard-based 多路路由 (GAF-001)

Gate 检查状态值 → 返回 Branch 枚举 → `Map<Branch, Step>` 多路分发。与 gate-loop 的 Map 转换表模式一致，只是 key 从 3 个变成 4+ 个。

```javascript
const Branch = z.enum(['pass', 'fail_a', 'fail_b', 'blocked']);

function forkRouter(state) {
  const branch = evaluateBranch(state);  // 返回 Branch
  const step = forkMap.get(branch);
  if (!step) throw new Error(`No fork for: ${branch}`);
  return { branch, step };
}

const forkMap = new Map([
  ['pass',    passStep],
  ['fail_a',  failAStep],
  ['fail_b',  failBStep],
  ['blocked', blockedStep],
]);
```

**Reason:** 显式 Map 让路由表一目了然。加新分支只需在 Map 加一行 + 一个新 Step，不需要改 router 逻辑。返回 `{ branch, step }` 结构让调用方可以检查路由决策。

### 2. 分支独立执行 (GAF-001, COS-001)

每个 Branch Step 有完全不同的 `execute()` 逻辑和副作用。Step 定义后注册到 Decision 1 的 `forkMap` 中。

```javascript
// 4 个独立 Step，各自有不同的 state mutation
const passStep    = new Step('pass_branch',    (s) => ({ ...s, current_gate: 'wave_next' }));
const failAStep   = new Step('fail_a_branch',  (s) => ({ ...s, topicRepairAttempted: true }));
const failBStep   = new Step('fail_b_branch',  (s) => ({ ...s, ref_count: s.ref_count + 1 }));
const blockedStep = new Step('blocked_branch', (s) => ({ ...s, current_gate: 'blocked_hitl' }));
```

**Reason:** 每个分支代表真实的 workflow 路径，必须独立可测。测试可以 `failAStep.execute(mockState)` 而不加载完整 router。Step 的 `name` 属性（如 `'fail_a_branch'`）用于 trace 和调试，JS export 名（`failAStep`）用于代码导入。

### 3. 共享 Repair 汇聚 (FOR-001)

多个 fail 分支汇聚到一个 `sharedRepairStep`，该 Step 同时处理 reference 和 topic 两类问题。修复后重回 `evaluateBranch()` 重判，Gate 可能分到不同分支。

```javascript
const sharedRepairStep = new Step('shared_repair', (s) => {
  const repaired = { ...s };
  if (repaired.ref_count < repaired.ref_floor) {
    repaired.ref_count = Math.min(repaired.ref_count + 2, repaired.ref_floor);
  }
  if (repaired.topicReadiness !== 'ready' && repaired.topicReadiness !== 'blocked') {
    repaired.topicReadiness = 'ready';
  }
  return repaired;
});

function convergeRepair(state, maxIterations = 3) {
  let current = { ...state };
  const seen = new Set();
  for (let i = 0; i < maxIterations; i++) {
    const branch = evaluateBranch(current);
    if (branch === 'pass' || branch === 'blocked') {
      return { state: current, outcome: branch, iterations: i };
    }
    if (seen.has(hashState(current))) {
      return { state: current, outcome: 'stalled', iterations: i };
    }
    seen.add(hashState(current));
    current = sharedRepairStep.execute(current);
  }
  const finalBranch = evaluateBranch(current);
  return { state: current, outcome: finalBranch, iterations: maxIterations };
}
```

**Reason:** 真实 workflow 中多个失败模式（参考不足、话题未就绪）经常同时出现。共享 Repair 一次性解决所有问题，避免分支专用的 repair 导致重复代码。Stall 检测（state hash 不变）和 `maxIterations` 双重保护防无限循环。Terminal 分支（`pass`、`blocked`）立即退出循环。

**与 gate-loop 的差异：** gate-loop 的 `repairLoop` 在 maxIterations 耗尽后返回 `"escalated"`（统一哨兵值）。gate-fork 的 `convergeRepair` 返回实际的最终 branch 名（如 `"fail_a"`）——调用方可以通过检查 outcome 是否为 `"pass"` 来判断是否成功，也可以根据具体 branch 采取不同处理。这个选择是为了保持 fork 路由的语义透明：耗尽后仍然告诉你"卡在哪个分支上"。

### 4. 优先级路由 (GAF-001)

多维状态评估时，多个 fail 条件可能同时成立（如 ref_count < floor 且 topicReadiness !== 'ready'）。`evaluateBranch()` 必须按显式优先级返回唯一 Branch：

```javascript
function evaluateBranch(state) {
  const s = WorkflowState.parse(state);
  if (s.topicReadiness === 'blocked') return 'blocked';  // 最高优先
  if (s.topicReadiness !== 'ready') return 'fail_b';     // 结构性问题
  if (s.ref_count < s.ref_floor) return 'fail_a';        // 数据量问题
  return 'pass';                                          // 全部满足
}
```

**优先级顺序：** `blocked` > `fail_b` (topic) > `fail_a` (reference) > `pass`

**Reason:** blocked 是人工阻塞，必须立即停止，不能尝试自动 repair。fail_b（topic 未就绪）是结构性问题，应先于 fail_a（数据量不足）处理——话题结构不对时补充参考没意义。没有这个优先级，同时满足多个 fail 条件时结果不确定。

### 5. State Schema 扩展 (GAF-001, COS-001)

在 gate-loop 的 `{ current_gate, ref_count, ref_floor }` 基础上增加 `topicReadiness` 字段，支持多维路由。

```javascript
const WorkflowState = z.object({
  current_gate: z.string(),
  ref_count: z.number().default(0),
  ref_floor: z.number().default(5),
  topicReadiness: z.enum(['ready', 'not_ready', 'blocked']).default('ready'),
});
```

**Reason:** gate-loop 只靠 `ref_count vs ref_floor` 一维判断，fork 需要多维状态才能分叉。`topicReadiness` 选 `enum` 而非 `boolean`：`blocked` 是不同于 `not_ready` 的语义（需要人工 vs 可自动修复）。

### 6. 实验独立，命名对齐

两个 prototype 实验（gate-loop、gate-fork）各自独立，不共享代码。但命名保持一致，便于将来抽象到共用库。

| gate-loop | gate-fork | 用途 |
|-----------|-----------|------|
| `evaluate()` | `evaluateBranch()` | 评估返回路由决策 |
| `gateRouter()` | `forkRouter()` | 路由到 Step |
| `repairLoop()` | `convergeRepair()` | 修复 + 回判 |
| `WorkflowState` | `WorkflowState` | Zod schema（同名，gate-fork 扩展了 `topicReadiness` 字段）|
| `Step` | `Step` | 可执行段（同名） |
| `segmentRegistry` | `segmentRegistry` | 动态段注册表（同名） |
| `loadNextSegment()` | `loadNextSegment()` | 动态加载（同名） |
| `trace.mjs` | `trace.mjs` | 痕迹系统（完全一致） |

**Reason:** 当前是实验阶段，独立可以确保每个实验的结论干净（"fork 的正确性不依赖 loop 的实现细节"）。命名对齐确保将来合并时容易识别等价概念。

## Risks

- **[Risk] 分支数量膨胀** → Mitigation: `evaluateBranch()` 返回枚举，新增分支只在 Map 加一行，不会导致 if/else 蔓延。
- **[Risk] 多维条件重叠** → Mitigation: `evaluateBranch()` 显式优先级（blocked > fail_b > fail_a > pass），同一时刻只返回一个 Branch。spec 和测试覆盖了所有重叠组合。
- **[Risk] 共享 Repair 不够定制化** → Mitigation: 当前实验用 `sharedRepairStep` 覆盖所有 fail 类型。未来若需要分支专属 repair，可以在 `convergeRepair()` 中按 `branch` 参数选择不同 repair Step，当前架构支持此扩展。
