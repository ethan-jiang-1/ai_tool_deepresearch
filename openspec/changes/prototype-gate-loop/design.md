# Design: prototype-gate-loop

## Context

Deep Research 的执行模型需要 **Gate 条件路由 + Repair loop + 动态段加载**。这些机制在 config.yaml 的 C&I 原则里描述了，但没有代码验证。这个 prototype 用可运行的 JavaScript 实验这些模式，成功代码后续提取到 engine 包。

## Goals / Non-Goals

**Goals:**
- 验证 Gate 状态机：条件路由 `(state) → "pass" | "fail"`，pass 加载下一段，fail 进 repair
- 验证 Repair loop：修好后重回 Gate 重判
- 验证动态段加载：Late binding，不预编译整个 DAG
- 验证 C&I 反馈环：Check 失败 → Inspect 诊断 → 反馈 → 纠正

**Non-Goals:**
- 不实现真实业务逻辑（Wave/Gate 审计/证据）
- 不追求生产级质量
- 不建立完整的测试套件
- 不集成到 DPT_FRAMEWORK/

## Decisions

### 1. 纯 JavaScript，无框架

**决策：** Gate 状态机用显式 Map/Object 转换表，不引入 XState 或任何 workflow engine。

```typescript
type GateResult = 'pass' | 'fail' | 'needs_repair';

const transitions = new Map<GateResult, Step>([
  ['pass', nextSegment],
  ['fail', repairSegment],
]);

function gateRouter(state: WorkflowState): Step {
  const result = gate.evaluate(state);
  return transitions.get(result) ?? escalateStep;
}
```

**理由：** 先验证模式，模式对了一个简单的 Map 就够。外部框架是后面的事。

### 2. Repair loop 结构

```
Gate → fail → Repair → Gate → pass → next segment
              ↑                    │
              └── loopback ────────┘
```

```typescript
function repairLoop(state: WorkflowState, maxIterations = 3): WorkflowState {
  for (let i = 0; i < maxIterations; i++) {
    const result = gate.evaluate(state);
    if (result === 'pass') return advanceSegment(state);
    if (result === 'fail') state = repairSegment.execute(state);
    if (result === 'needs_repair') state = repairSegment.execute(state);
  }
  return escalate(state); // exhausted
}
```

**关键防护：** `maxIterations` 硬上限 + state hash 检测（状态没变化说明修不了）。

### 3. 动态段加载 — Late Binding

```typescript
const segmentRegistry = new Map<string, Step>([
  ['wave0_search',     wave0SearchStep],
  ['wave0_audit',      wave0AuditStep],
  ['wave1_evidence',   wave1EvidenceStep],
  ['repair_references', repairReferencesStep],
]);

function loadNextSegment(gateOutput: string): Step {
  const step = segmentRegistry.get(gateOutput);
  if (!step) throw new Error(`Unknown segment: ${gateOutput}`);
  return step;
}
```

**理由：** Gate 输出一个字符串 key，registry 按 key 解析。删掉/重命名 step 不影响正在执行的其他 step。跟 Temporal `DynamicWorkflow` 和 LangGraph `add_conditional_edges` 一致。

### 4. C&I 反馈环

```
Check (Zod) → fail → Inspect (诊断) → 反馈 → Repair → 重回 Check
```

```typescript
function checkAndReflect(state: WorkflowState, schema: ZodSchema): WorkflowState {
  const result = schema.safeParse(state);
  if (result.success) return state;
  
  // Inspect: 生成诊断信息反馈给 LLM
  const diagnostic = inspectFailure(result.error);
  const repaired = reflectAndRepair(state, diagnostic);
  return repaired;
}
```

## Risks / Trade-offs

- **[Risk] 过度简化** → Mitigation: 实验只验证控制流模式，不追求真实数据
- **[Risk] prototype 代码被当成生产代码** → Mitigation: 放在 `experiments/` 目录，明确标记
