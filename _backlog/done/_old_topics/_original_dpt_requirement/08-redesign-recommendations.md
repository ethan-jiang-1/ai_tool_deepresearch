# 08 — Spec Coding 重写建议架构

## 核心原则

1. **Schema-first**：所有 enum、contract、invariant 用 TypeScript 类型定义，Markdown 文档从代码生成
2. **框架执行规则，Agent 生产内容**：Engine 防止违规，Agent 只做搜索/阅读/写证据/综合
3. **保持 Markdown 互操作**：新系统读写相同的 Markdown 文件格式
4. **显式状态机**：Gate 转换、Queue 生命周期、HITL 状态都是代码建模的状态机
5. **写入时验证**：更新任何控制文件时立即验证，不做事后 CLI 检查

---

## 技术栈

```
纯 Node.js + TypeScript

 运行时:       Node.js ≥20
 语言:         TypeScript (strict mode)
 Schema:       Zod (运行时验证) + TypeScript 类型（编译时）
 CLI:          Commander.js + Ink (React TUI)
 文件处理:     unified/remark (Markdown AST 解析/生成)
 测试:         Vitest
 包管理:       pnpm
```

### 为什么这个组合

| 需求 | 选型 | 理由 |
|------|------|------|
| Schema/Validation | **Zod** | TypeScript 原生，运行时验证 + 类型推导一体，不需要维护分离的 type 和 validator |
| CLI 框架 | **Commander.js** | 成熟稳定，与 Claude Code CLI 风格一致 |
| 终端 UI | **Ink** | React 组件化 TUI，适合展示 gate 进度、队列状态等复杂终端界面 |
| Markdown 解析 | **unified/remark** | AST 级别的 Markdown 读写，精确控制字段位置，比正则可靠 |
| 状态机 | **XState** | 可视化、可测试的状态机库，适合 Gate 转换和 HITL 流程 |
| 测试 | **Vitest** | 快，TypeScript 原生，Vite 生态 |

---

## 推荐架构

```
┌─────────────────────────────────────────────────────────────┐
│                  deep-research CLI (TypeScript)               │
│  deep-research init    → 实例化 Run Bundle                   │
│  deep-research run     → 启动 Queue 驱动的执行循环           │
│  deep-research status  → 显示运行状态和 gate 进度            │
│  deep-research gate    → 运行指定 gate 的审计                │
│  deep-research final   → 生成最终报告                        │
│  deep-research validate → 全面验证 Run Bundle 一致性         │
├─────────────────────────────────────────────────────────────┤
│                  Core Engine (TypeScript/Node.js)             │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  RunBundle       │  │  Schema Layer   │                   │
│  │  - create()      │  │  (Zod)          │                   │
│  │  - validate()    │  │  - Enums        │                   │
│  │  - load/save     │  │  - Contracts    │                   │
│  └────────┬────────┘  │  - Validators   │                   │
│           │            └────────┬────────┘                   │
│  ┌────────┴────────────────────┴──────────┐                 │
│  │           State Manager                 │                 │
│  │  - 5 control files (atomic r/w)        │                 │
│  │  - Source of Record enforcement        │                 │
│  │  - Cross-file consistency              │                 │
│  └────────┬───────────────────────────────┘                 │
│           │                                                  │
│  ┌────────┴──────────┐  ┌──────────────────┐               │
│  │  Queue Engine      │  │  Gate Engine      │               │
│  │  - 5-slot window  │  │  - State machine  │               │
│  │  - Producer rules │  │  - Audit runner   │               │
│  │  - Receipt check  │  │  - Gate reopen    │               │
│  │  - Boundary hooks │  │  - Floor checks   │               │
│  └────────┬──────────┘  └────────┬─────────┘               │
│           │                      │                           │
│  ┌────────┴──────────────────────┴──────────┐               │
│  │           Evidence Manager                │               │
│  │  - Reference CRUD + field validation     │               │
│  │  - Webpage Diagnostic Gate               │               │
│  │  - Reference filename provenance         │               │
│  │  - _INDEX.md sync                        │               │
│  │  - Topic seed backfill                   │               │
│  └────────┬─────────────────────────────────┘               │
│           │                                                  │
│  ┌────────┴──────────┐  ┌──────────────────┐               │
│  │  Artifact Manager  │  │  HITL Manager     │               │
│  │  - Lifecycle       │  │  - HITL1 capture  │               │
│  │  - Freshness       │  │  - HITL2 state    │               │
│  │  - Ledger contract │  │  - Answerability  │               │
│  └────────────────────┘  └──────────────────┘               │
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │          Agent Interface                  │               │
│  │  - LLM Agent calls Engine APIs           │               │
│  │  - Engine validates before persisting    │               │
│  │  - Engine enforces stop authorization    │               │
│  │  - Agent produces content, not rules     │               │
│  └──────────────────────────────────────────┘               │
├─────────────────────────────────────────────────────────────┤
│              File I/O Layer                                   │
│  - Markdown reader/writer (unified/remark, V12 compat)       │
│  - Atomic multi-file updates                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Schema Layer 设计要点

### Zod 定义所有 Enum 和 Contract

```typescript
// schema/enums.ts
import { z } from 'zod';

// ===== 研究模式 =====
export const ResearchProfile = z.enum([
  'quick_factual',
  'exploratory_map',
  'claim_verification',
]);
export type ResearchProfile = z.infer<typeof ResearchProfile>;

// ===== 接受状态 =====
export const AcceptanceStatus = z.enum([
  'accepted',
  'reviewed_uncounted',
  'excluded',
  'background',
]);
export type AcceptanceStatus = z.infer<typeof AcceptanceStatus>;

// ===== 证据层 =====
export const Tier = z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']);
export type Tier = z.infer<typeof Tier>;

// ===== Gate 枚举 =====
export const CurrentGate = z.enum([
  'instantiation_complete',
  'setup_ready',
  'wave0_complete',
  'wave1_complete',
  'wave2_complete',
  'readiness_passed',
]);
export type CurrentGate = z.infer<typeof CurrentGate>;

// ===== 停止授权状态 =====
export const StopAuthorizationState = z.enum([
  'unauthorized_continue_required',
  'final_delivery',
  'decision_blocker',
  'empty_queue_after_refill',
]);
export type StopAuthorizationState = z.infer<typeof StopAuthorizationState>;

// ===== Producer Rule =====
export const ProducerRule = z.enum([
  'initial_window_render',
  'setup_repair',
  'slot_completion_refill',
  'queue_thin_refill',
  'urgent_preemption',
  'failed_gate_audit',
  'gate_reopen',
  'topology_delta',
  'reference_landed',
  'topic_ref_count_changed',
  'source_intake_fan_in',
  'hitl2_readiness_path',
  'blocker_path',
  'boundary_hook',
]);
export type ProducerRule = z.infer<typeof ProducerRule>;

// ===== 探索/利用决策 =====
export const ExplorationExploitationDecision = z.enum([
  'not_assessed',
  'continue',
  'exploit_current_line',
  'explore_new_line',
  'topology_candidate',
  'complete',
  'early_saturation_review',
  'suspend',
  'archive',
  'redirect',
]);
export type ExplorationExploitationDecision = z.infer<
  typeof ExplorationExploitationDecision
>;

// ===== HITL2 可回答性 =====
export const AnswerabilityClass = z.enum([
  'not_assessed',
  'ready_substantive',
  'ready_insufficient_judgment',
  'blocked_repair_required',
]);
export type AnswerabilityClass = z.infer<typeof AnswerabilityClass>;

// ... 其余 ~25 个 enum 定义
```

### Contract 定义为 Zod Schema

```typescript
// schema/queue.ts
import { z } from 'zod';

// ===== Receipt =====
export const Receipt = z.string().regex(
  /^(file:|dir:|status:|queue:|trace:|index:|artifact_steering_current:|artifact_refresh_not_due:|queued_artifact_repair:|direct_reference_exception|active_window_contract_complete|topology_delta_disposed|hitl2_pending_or_recorded_ready)/,
  'Invalid receipt format'
);
export type Receipt = z.infer<typeof Receipt>;

// ===== Queue Work Unit (活跃槽位) =====
export const QueueWorkUnit = z.object({
  work_id: z.string(),
  action: z.string(),
  producer_rule: ProducerRule,
  // 谱系字段（恰好一个）
  source_gap: z.string().optional(),
  status_gap: z.string().optional(),
  gate_gap: z.string().optional(),
  plan_target: z.string().optional(),
  trigger: z.string().optional(),
  // 元数据
  why_this_matters: z.string(),
  impact_scope: z.array(z.string()),
  required_receipts: z.array(Receipt),
  done_condition: z.string(),
  verification: z.string(),
  writes_to: z.array(z.string()),
  status_sync: z.array(z.string()),
  completion_receipt: z.array(Receipt),
  failure_route: z.string(),
}).refine(
  (data) => {
    const lineageFields = [
      data.source_gap, data.status_gap,
      data.gate_gap, data.plan_target, data.trigger,
    ];
    return lineageFields.filter(Boolean).length === 1;
  },
  { message: 'Exactly one lineage field (source_gap | status_gap | gate_gap | plan_target | trigger) is required' }
);
export type QueueWorkUnit = z.infer<typeof QueueWorkUnit>;

// ===== Active Queue (5 槽位) =====
export const ActiveQueue = z.object({
  stop_authorization_state: StopAuthorizationState,
  unauthorized_stop_next_action: z.string(),
  queue_health: z.enum(['ready', 'thin', 'blocked', 'closed']),
  slot_1_current: QueueWorkUnit.nullable(),
  slot_2_next: QueueWorkUnit.nullable(),
  slot_3_pending: QueueWorkUnit.nullable(),
  slot_4_pending: QueueWorkUnit.nullable(),
  slot_5_tail: QueueWorkUnit.nullable(),
  refill_pool: z.array(QueueWorkUnit),
  closure_reason: z.string().optional(),
});
export type ActiveQueue = z.infer<typeof ActiveQueue>;
```

### Markdown ↔ Zod 双向转换

```typescript
// markdown/queue-reader.ts
import { fromMarkdown } from 'remark';
import { ActiveQueue } from '../schema/queue.js';

/**
 * 从 QUEUE.md 文件解析 ActiveQueue 对象。
 * 使用 remark AST 精确定位 ## Active Queue 区域，
 * 逐行解析字段名/值对，然后通过 Zod 验证。
 */
export function parseQueue(markdown: string): ActiveQueue {
  const ast = fromMarkdown(markdown);
  // ... 遍历 AST 提取字段 ...
  const raw = extractFields(ast, 'Active Queue');
  return ActiveQueue.parse(raw); // Zod 在运行时验证
}

/**
 * 将 ActiveQueue 对象序列化回 QUEUE.md 格式。
 * 保留未修改的段落不变，只更新 ## Active Queue 区域。
 */
export function serializeQueue(queue: ActiveQueue, originalMd: string): string {
  const updatedSection = renderQueueSection(queue);
  return replaceSection(originalMd, 'Active Queue', updatedSection);
}
```

---

## 状态机设计

### Gate 状态机 (XState)

```typescript
// engine/gate-machine.ts
import { createMachine, assign } from 'xstate';

export const gateMachine = createMachine({
  id: 'gate',
  initial: 'instantiation_complete',
  states: {
    instantiation_complete: {
      on: {
        PASS_SETUP: { target: 'setup_ready' },
      },
    },
    setup_ready: {
      on: {
        PASS_WAVE0: { target: 'wave0_complete' },
      },
      entry: 'checkBoundaryHook_setup_to_wave0',
    },
    wave0_complete: {
      on: {
        PASS_WAVE1: { target: 'wave1_complete' },
        REOPEN: { target: 'setup_ready' },
      },
      entry: ['writeTraceCheckpoint', 'checkBoundaryHook_wave0_to_wave1'],
    },
    wave1_complete: {
      on: {
        PASS_WAVE2: { target: 'wave2_complete' },
        REOPEN: { target: 'wave0_complete' },
      },
      entry: ['writeTraceCheckpoint', 'checkBoundaryHook_wave1_to_wave2'],
    },
    wave2_complete: {
      on: {
        HITL2_PENDING: { target: 'hitl2_pending_user' },
        REOPEN: { target: 'wave1_complete' },
      },
      entry: ['writeTraceCheckpoint', 'prepareHITL2Brief'],
    },
    hitl2_pending_user: {
      on: {
        USER_PROCEED: { target: 'readiness_passed' },
        USER_REPAIR: { target: 'wave1_complete' }, // reopen to relevant gate
        USER_VIEW_REVISION: { target: 'hitl2_pending_user' }, // 自我循环，排队澄清
        USER_STOP_BLOCKED: { target: 'blocked_terminal' },
      },
    },
    readiness_passed: {
      type: 'final',
      entry: ['writeTraceCheckpoint', 'closeQueue', 'authorizeFinalDelivery'],
    },
    blocked_terminal: {
      type: 'final',
    },
  },
}, {
  actions: {
    writeTraceCheckpoint: (ctx, evt) => { /* ... */ },
    checkBoundaryHook_setup_to_wave0: (ctx, evt) => { /* ... */ },
    // ...
  },
  guards: {
    auditPassed: (ctx, evt) => evt.audit.overallResult === 'pass',
  },
});
```

### HITL2 子状态机

```
not_started
  → (agent writes brief + syncs PROFILE/STATUS/QUEUE)
  → pending_user
      ├── proceed_to_readiness → recorded → (enter Readiness)
      ├── request_view_revision → pending_user (loop: queue clarification)
      ├── repair_and_rerun → (reopen affected gate + refill queue)
      └── stop_blocked → blocked_terminal
```

---

## 关键简化

### 1. 消除 Projection Map 反模式

旧系统：规则在 CHARTER.md 定义 → 投影到 PLAN.md/STATUS.md/QUEUE.md → 手动保持同步

新系统：
```
Zod Schema (唯一权威)
  ├── TypeScript 类型 → 编译时检查
  ├── Zod parse() → 运行时验证
  └── Markdown 文档 ← 从 Schema 自动生成（不是手动维护）
```

### 2. 统一 Gate 模型

当前 6 个 gate + 4 个 start boundary gate → 新系统：
- **6 个主要 gate**（保持为 XState 状态）
- Start boundary gates → **gate 转换的 guard**（`checkBoundaryHook_*`），不需要独立概念
- 每个 gate: `{ prerequisites: Receipt[], auditFn: (bundle) => AuditResult }`

### 3. CLI vs Engine 边界清晰

```
CLI 层 (Commander.js + Ink)
  ├── 命令解析 + 用户交互
  ├── HITL1/HITL2 终端提示
  ├── 进度展示（gate 状态、queue 窗口）
  └── 调用 Engine API

Engine 层 (纯 TypeScript，无终端依赖)
  ├── 所有业务逻辑
  ├── 文件读写（通过 Markdown I/O 层）
  ├── 状态管理 + 验证
  └── 可测试（不依赖终端/Agent）
```

### 4. Agent 角色重定义

| 旧（V12 Markdown Governance） | 新（Spec Coding Engine） |
|-----------|-----|
| Agent 读取规范并自行判断执行 | Agent 调用 Engine API |
| Agent 决定 gate 是否通过 | Engine 运行审计（Agent 只补充证据内容） |
| Agent 维护 Queue 的 5 个槽位 | Engine 管理 Queue，Agent 执行 `slot_1_current` |
| Agent 检查 receipt 是否存在 | Engine 验证 receipt，缺失时抛错拒绝继续 |
| Agent 判断何时停止 | Engine 强制 stop_authorization_state |
| Agent 写 Markdown 遵循字段约定 | Engine 通过 Zod 验证后写入，不合规的字段被拒绝 |
| 规范在 prose 里 | 规范在 Zod schema + XState config 里 |

---

## 项目结构建议

```
deep-research/
  packages/
    schema/                    ← @deep-research/schema
      src/
        enums.ts               ← 所有 z.enum() 定义
        contracts/
          queue.ts             ← QueueWorkUnit, ActiveQueue, RefillPool
          reference.ts         ← AcceptedReference, ExcludedReference
          profile.ts           ← ProfileBinding, ConfiguredParameters
          plan.ts              ← TopicRegistry, InstanceConfig
          status.ts            ← GateAudit, WaveStatus, TopologyDelta
          trace.ts             ← TraceEntry, TracePointer
          hitl.ts              ← HITL2Decision, AnswerabilityClassification
          gate.ts              ← GateAuditResult, FloorConfig
        invariants.ts          ← INV-* 规则的验证函数
      __tests__/
      generated/               ← 从 schema 自动生成的 Markdown 文档

    engine/                    ← @deep-research/engine
      src/
        state/
          gate-machine.ts      ← XState gate 状态机
          hitl-machine.ts      ← XState HITL2 状态机
          queue-manager.ts     ← 5 槽位管理 + promotion/refill
        gate/
          audit-runner.ts      ← 执行 gate 审计
          floor-checker.ts     ← 证据地板计算
        evidence/
          reference-manager.ts ← Reference CRUD + 字段验证
          webpage-diagnostic.ts← 网页材料诊断
          backfill.ts          ← 话题种子回填
        artifact/
          artifact-manager.ts  ← Artifact 生命周期 + 新鲜度
          question-ledger.ts   ← 探索账本契约验证
        execution/
          receipt-checker.ts   ← Receipt 前置条件验证
          boundary-hooks.ts    ← 6 个生命周期 hook
          stop-auth.ts         ← 用户可见停止授权
        hitl/
          hitl-manager.ts      ← HITL1/HITL2 交互管理
      __tests__/

    markdown/                  ← @deep-research/markdown
      src/
        reader.ts              ← Markdown → Zod object 解析
        writer.ts              ← Zod object → Markdown 序列化
        atomic.ts              ← 多文件原子更新
        v12-compat.ts          ← V12 格式兼容层
      __tests__/

    cli/                       ← @deep-research/cli
      src/
        commands/
          init.ts              ← deep-research init
          run.ts               ← deep-research run
          status.ts            ← deep-research status
          gate.ts              ← deep-research gate
          validate.ts          ← deep-research validate
          final.ts             ← deep-research final
        ui/
          gate-progress.tsx    ← Ink 组件：gate 进度条
          queue-view.tsx       ← Ink 组件：queue 窗口
          hitl-prompt.tsx      ← Ink 组件：HITL 交互
      __tests__/

    agent/                     ← @deep-research/agent (Agent SDK 集成)
      src/
        toolkit.ts             ← Agent 可调用的 Engine API
        context.ts             ← 注入 PROFILE/PLAN/STATUS/QUEUE/TRACE
      __tests__/

  pnpm-workspace.yaml
  tsconfig.base.json
```

---

## 迁移策略

### 阶段 1：Schema
- 用 Zod 定义所有 enum 和 contract（对齐 CONSTANTS.md + CHARTER.md）
- 实现 V12 Markdown 兼容 reader——新系统能加载现有 Run Bundle
- 实现 `deep-research validate`——跨 5 文件一致性检查

### 阶段 2：Engine
- Gate 状态机 (XState)
- Queue Engine (5 槽位 + receipt checker)
- Evidence Manager (reference CRUD + 网页诊断)
- Artifact Manager (生命周期 + 探索账本)

### 阶段 3：CLI + Agent Integration
- Commander.js CLI
- Agent Toolkit（Agent 调用 Engine API）
- 与 Claude Code 的 `/opsx` 命令集成

### 阶段 4：Migration
- V12 → 新格式迁移
- 向后兼容层
- 废弃 check_framework.mjs（功能被 Engine 替代）

---

## 与现有 Claude Code / OpenSpec 的集成

项目已初始化 OpenSpec。每个 Engine 模块可以作为一个 OpenSpec change：

- `proposal.md` 描述模块 API 和行为
- `specs/` 使用 Zod schema 作为规范（代替 prose spec）
- `tasks.md` 分解实现步骤
- `/opsx:apply` 逐步推进实现
