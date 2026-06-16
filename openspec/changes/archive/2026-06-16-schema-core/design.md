# Design: schema-core

## Context

所有 prototype 都需要 Zod schema 来定义控制文件格式和 Gate 转换逻辑。这是地基。

## Goals / Non-Goals

**Goals:**
- 6 个 enum + 6 个 contract，最小可用
- 纯 JavaScript (.mjs)，`node` 直接 import，无需编译
- 后续 change 可扩展

**Non-Goals:**
- 不实现完整 25 enum（等需要时加）
- 不实现 QueueWorkUnit fields（等 queue engine）
- 不实现 AcceptedReference（等 evidence）

## Decisions

### 1. 文件结构

```
DPT_FRAMEWORK/schema/
  enums.mjs             ← 6 个 z.enum()
  contracts/
    status.mjs          ← StatusSchema (rb_status.json)
    queue.mjs           ← QueueSchema (rb_queue.json)
    profile.mjs         ← ProfileSchema (rb_profile.yaml)
    plan.mjs            ← PlanSchema (rb_plan.md frontmatter)
    trace.mjs           ← TraceSchema (rb_trace.jsonl)
    gate.mjs            ← GateTransitionTable + GateMachineState
  index.mjs             ← barrel 导出
```

### 2. 6 个 Enum

```javascript
// enums.mjs
export const CurrentGate = z.enum([
  'instantiation_complete', 'setup_ready',
  'wave0_complete', 'wave1_complete',
  'wave2_complete', 'readiness_passed',
]);

export const StopAuthorizationState = z.enum([
  'unauthorized_continue_required', 'final_delivery',
  'decision_blocker', 'empty_queue_after_refill',
]);

export const QueueHealth = z.enum(['ready', 'thin', 'blocked', 'closed']);
export const RunState = z.enum(['not_started', 'in_progress', 'blocked', 'completed']);
export const ResearchProfile = z.enum(['quick_factual', 'exploratory_map', 'claim_verification']);
export const GateResult = z.enum(['pass', 'fail']);
```

### 3. 6 个 Contract

**StatusSchema:**
```javascript
export const StatusSchema = z.object({
  current_mode: z.literal('execution'),
  state: RunState,
  current_gate: CurrentGate,
  next_gate: CurrentGate,
});
```

**QueueSchema:**
```javascript
// 骨架阶段 slots 为 null；后续 change 替换为 QueueWorkUnitSchema
const QueueSlot = z.null(); // TODO: z.null().or(QueueWorkUnitSchema) when queue engine lands

export const QueueSchema = z.object({
  queue_health: QueueHealth,
  stop_authorization_state: StopAuthorizationState,
  slot_1_current: QueueSlot,
  slot_2_next: QueueSlot,
  slot_3_pending: QueueSlot,
  slot_4_pending: QueueSlot,
  slot_5_tail: QueueSlot,
  refill_pool: z.array(z.unknown()), // TODO: z.array(QueueWorkUnitSchema)
});
```

**ProfileSchema:**
```javascript
export const ProfileSchema = z.object({
  plan_basename: z.string(),
  research_profile: ResearchProfile,
  root_must_answer_set: z.array(z.string()),
  human_decision_checkpoints: z.object({
    hitl1: z.object({ status: z.literal('recorded') }),
    hitl2: z.object({ status: z.literal('not_started') }),
  }),
});
```

**PlanSchema (frontmatter only):**
```javascript
export const PlanSchema = z.object({
  plan_basename: z.string(),
  derived_topic_count: z.number().min(0),
  topic_registry: z.array(z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
  })),
});
```

**TraceSchema:**
```javascript
export const TraceEntrySchema = z.object({
  timestamp: z.string(),
  gate_transition: CurrentGate.nullable(),
  evidence_bundle: z.string(),
  queue_consequence: z.string(),
  status_pointer_sync: z.string(),
  continuation_action_started: z.string().optional(),
});

export const TraceSchema = z.array(TraceEntrySchema);
```

**GateTransitionTable:**
```javascript
export type GateMachineState =
  | 'instantiation_complete'
  | 'setup_ready'
  | 'wave0_complete'
  | 'wave1_complete'
  | 'wave2_complete'
  | 'hitl2_pending_user'
  | 'readiness_passed'
  | 'blocked_terminal';

export type GateEventType =
  | 'PASS_SETUP'
  | 'PASS_WAVE0'
  | 'PASS_WAVE1'
  | 'PASS_WAVE2'
  | 'HITL2_PENDING'
  | 'USER_PROCEED'
  | 'USER_REPAIR'
  | 'USER_VIEW_REVISION'
  | 'USER_STOP_BLOCKED'
  | 'REOPEN';

export const GATE_TRANSITIONS: Record<GateMachineState, Array<{
  event: GateEventType;
  next: GateMachineState;
}>> = {
  instantiation_complete: [
    { event: 'PASS_SETUP',   next: 'setup_ready' },
  ],
  setup_ready: [
    { event: 'PASS_WAVE0',   next: 'wave0_complete' },
  ],
  wave0_complete: [
    { event: 'PASS_WAVE1',   next: 'wave1_complete' },
    { event: 'REOPEN',       next: 'setup_ready' },
  ],
  wave1_complete: [
    { event: 'PASS_WAVE2',   next: 'wave2_complete' },
    { event: 'REOPEN',       next: 'wave0_complete' },
  ],
  wave2_complete: [
    { event: 'HITL2_PENDING',  next: 'hitl2_pending_user' },
    { event: 'REOPEN',         next: 'wave1_complete' },
  ],
  hitl2_pending_user: [
    { event: 'USER_PROCEED',         next: 'readiness_passed' },
    { event: 'USER_REPAIR',          next: 'wave1_complete' },
    { event: 'USER_VIEW_REVISION',   next: 'hitl2_pending_user' },
    { event: 'USER_STOP_BLOCKED',    next: 'blocked_terminal' },
  ],
  readiness_passed: [],   // terminal
  blocked_terminal: [],   // terminal
};
```

### 4. 无需编译

手写 `.mjs`，`node` 直接 import。测试时直接引用 `DPT_FRAMEWORK/schema/index.mjs`。

## Risks

- **[Risk] schema 膨胀回 25 enum** → Mitigation: 只加 change 明确需要的，抵制"先定义了再说"
