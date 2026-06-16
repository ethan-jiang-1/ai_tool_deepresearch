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

## Decisions

### 1. Guard-based 多路路由

```javascript
type Branch = 'pass' | 'fail_a' | 'fail_b' | 'blocked';

function gateForkRouter(state: WorkflowState): Step {
  const branch = gate.evaluateBranch(state);  // 返回分支名
  return segmentRegistry.get(branch) ?? escalateStep;
}
```

与 gate-loop 的 Map 转换表一致，只是 key 从 2 个变成 N 个。

### 2. 分支独立执行

```javascript
const branches = new Map<Branch, Step>([
  ['pass',    nextWaveStep],
  ['fail_a',  repairTopicStep],
  ['fail_b',  repairRefsStep],
  ['blocked', escalateStep],
]);
```

每个 Step 可以有完全不同的 execute() 逻辑和副作用。

### 3. 共享 Repair 汇聚

```javascript
function convergeRepair(branch: Branch, state: WorkflowState): WorkflowState {
  // 多条 fail 路径汇聚到一个 shared repair segment
  const repair = sharedRepairFor(branch);
  const repaired = repairLoop(state, repair, maxIterations: 3);
  return gateForkRouter(repaired); // 修好重判
}
```

## Risks

- **[Risk] 分支数量膨胀** → Mitigation: Gate 评估函数返回枚举，新增分支只在 Map 加一行
