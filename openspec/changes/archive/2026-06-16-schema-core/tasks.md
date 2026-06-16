# Tasks: schema-core

## 1. 目录和依赖

- [x] 1.1 创建 `DPT_FRAMEWORK/schema/` 及 `DPT_FRAMEWORK/schema/contracts/` 目录
- [x] 1.2 `npm install zod` (项目仅批准的 npm 依赖之一)

## 2. Enum 定义

- [x] 2.1 `enums.mjs`：CurrentGate (6), StopAuthorizationState (4), QueueHealth (4), RunState (4), ResearchProfile (3), GateResult (2)

## 3. Contract 定义

- [x] 3.1 `contracts/status.mjs`：StatusSchema
- [x] 3.2 `contracts/queue.mjs`：QueueSchema
- [x] 3.3 `contracts/profile.mjs`：ProfileSchema
- [x] 3.4 `contracts/plan.mjs`：PlanSchema (frontmatter only)
- [x] 3.5 `contracts/trace.mjs`：TraceSchema = z.array(TraceEntrySchema)
- [x] 3.6 `contracts/gate.mjs`：GateMachineState (8 states) + GateEventType (10 events)
- [x] 3.7 `contracts/gate.mjs`：GATE_TRANSITIONS 转换表 (12 transitions)
- [x] 3.8 `contracts/gate.mjs`：validateTransitions() 辅助函数 (检测死状态)

## 4. Requirement 追踪机制

- [x] 4.1 创建 `DPT_FRAMEWORK/req-registry.yaml` (空, 只增不删)
- [x] 4.2 创建 `DPT_FRAMEWORK/cli/check-req-ids.mjs`：扫描 spec/ 检查重复和未注册
- [x] 4.3 为本 change 注册 requirement ID：SCO-001 (6 enums), SCO-002 (6 contracts), SCO-003 (gate transitions), SCO-004 (direct node import)

## 5. Barrel 导出

- [x] 5.1 `index.mjs`：re-export 所有 enum、contract

## 6. 基本自测 (不依赖 test-infra)

- [x] 6.1 创建 `tests/schema/` 目录
- [x] 6.2 `tests/schema/enums.test.mjs`：6 个 enum 各测 accept + reject (node:test + node:assert)
- [x] 6.3 `tests/schema/contracts.test.mjs`：6 个 contract 各测 valid skeleton + invalid field
- [x] 6.4 `tests/schema/gate.test.mjs`：转换表无死状态, 正确 transitions
- [x] 6.5 `node --test tests/schema/` 全部通过
