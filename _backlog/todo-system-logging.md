# TODO: system-logging（系统日志/可观测性——把"老忘"的日志做对）

> 状态: 待设计 | 优先级: 中（leverage 高——上线/排障时极关键，但当前可 park） | 创建: 2026-06-25
>
> 暂不开 OpenSpec change——本文件是 backlog 记录。但优先级高于其它 parked TODO：日志是跨切关注点，每个功能都受益，且**框架已经半建成却被遗忘**（见下），拾起来成本低、收益大。
>
> 相关: `todo-phase-recover.md`（recover 把 `rb_trace.jsonl` 当 ground truth）、`todo-context-reground.md`（reground 共享同一 ground-truth 基座）

## Why

用户原话："所有系统的 logging，这老忘……上线后的日志实在太重要了，我们看怎么把这事儿做对。"

这不是"没做过"，而是"**做过一半、散落各处、关键部分没接上**"。当前日志状态有四个相互叠加的问题：

### 1. 已有 4 个 sink，但写法不一致、互相漂移

| Sink | 路径 | schema | 写入者 | 读取者 |
|------|------|--------|--------|--------|
| **A** gate 审计 | `<bundle>/rb_trace.jsonl` | `TraceEntrySchema`（仅 `{ts, event}` + passthrough，`schema/contracts/trace.mjs:5-8`） | **两种写法**：`writeGateAttempt()` helper（`gate-helpers.mjs:268-308`，仅 2 个 gate 用）+ **7 个 gate CLI 各自 inline `appendFileSync`**（bypass helper） | `readTraceEvents()`（`gate-helpers.mjs:322-332`）——**只用来数子任务** |
| **B** subagent 生命周期 | `<bundle>/_trace_subagent.jsonl` | **无 Zod schema**，shape 散在调用点 | `subagent-relay.mjs` 私有 `traceEntry()`（`:84-97`） | **无**（write-only） |
| **C** queue 操作 | `<bundle>/_trace_agq_cli.jsonl` | **无 Zod schema** | `queue-manager.mjs` 私有 `traceEntry()`（`:60-72`） | `checkOneReceipt()`（`queue-manager.mjs:302-308`）做 `trace:` receipt |
| **D** 人读诊断 | `<bundle>/_logs/run.log` | 自由文本 `[ts] LEVEL gate:X PASS/FAIL {json}` | **只有** `writeGateAttempt()`（`:273-286`） | **无** |

**漂移点**：7 个 inline 写 trace 的 gate **同时跳过了 `run.log`**（因为它们不走 `writeGateAttempt`）。于是 `run.log` 和 `rb_trace.jsonl` 对这 7 个 gate 的记录**永远对不上**。

### 2. 已经建好的 logger / trace 能力是**死代码**

- **`engine/logger.mjs`**（`createLogger`，leveled，`debug/info/warn/error`，`:38-83`）有完整 OpenSpec 合约（`openspec/specs/logger/spec.md` LOG-001/002/003）+ 76 行测试（`tests/engine/logger.test.mjs`）——**生产代码零导入**。
- **LOG-003 "logger 注入"**：`workflow-chain.mjs` 的 `assessNode`/`readMarkdownFile` 等都接了 `logger = null` 尾参（`:318,364,444,474,512`），但**没有任何 caller 传 logger**——所有 `if (logger) logger.xxx(...)` 分支全是死的。
- **`trace.mjs`** 的 `traceInit`（写 `run_start`）、`traceSummary`——**生产从不调用**，仅测试用。`node_exec`/`run_start`/`run_end`/`node_load` 等事件类型在 `trace.mjs:22-25` 定义了 icon，**没有任何代码写这些事件**——死事件类型。

### 3. spec 已经要求的事件**没写**（明确的 spec 违规）

`framework-runtime-boundary.md:275` 要求 `rb_trace.jsonl` MUST 包含：gate attempts、pass/fail events、**repair events**、**waiting/block events**、audit history。

| 事件类 | 已记录? | 现状 |
|--------|--------|------|
| Gate attempts + pass/fail | ✅ 部分 | `gate_attempt`，但"why"退化成 `inspect_count`/`advice_count` 整数，正文不在 trace |
| Subagent dispatch/collect/merge | ✅ | Sink B |
| Queue enqueue/claim/complete/fail/preempt | ✅ | Sink C |
| **Repair loop 迭代** | ❌ | `convergeRepair()`（`subagent-relay.mjs:929-946`）**整段零 trace/log**——最清晰的 spec 违规 |
| **Fork/branch 决策** | ❌ | `forkRouter()`/`classifyBranch()` 的分支判定从不记录 |
| **Phase 转移 / lifecycle** | ❌ | `node_exec`/`run_start`/`run_end` 定义了却没人写；phase 进度只能从 `gate_attempt` 序列间接推断 |
| **HITL1/HITL2 决策**（人选了什么、rationale、谁、何时） | ❌ | 只记 gate outcome，决策本身散在 checkpoint 文件，无统一审计行 |
| **Errors / exceptions** | ❌ | Engine 直接 `throw`，process exit，无 error trace 事件；`writeGateAttempt` 连自己的写错都静默吞（`:284,302,305`） |
| **Timing / duration** | ❌ | 每个事件有 `ts`，但**无 `duration`/`started_at`/`ended_at`、无成对 start/end**——任何 phase 的墙钟时长不可恢复 |
| **Run begin/end 标记** | ❌ | `run_start` 定义从不调用；无 `run_end` |

### 4. 没有 correlation / 可观测性工具

- **无 runId/traceId/correlation id**（grep `runId|traceId|correlation|run_id` 框架内零命中）。三个 trace 文件 + run.log **无法缝合成一条时间线**，只能靠"都在同一个 bundle 目录"隐式关联。
- **无 schema 化**：Sink B、C 无 Zod schema，shape 只活在调用点字面量里。"Trace 是真相"（`framework-runtime-boundary.md:251-264`）——真相需要可解析，但现状连 per-event-type schema 都没有。
- **无读回/渲染工具**：`traceSummary` 生产从不调；Sink B、C write-only；`inspect-bundle.mjs:12` 只检查 `rb_trace.jsonl` **存在**，不渲染任何日志内容。**没有一个工具能把一次 run 的日志读出来给人看。**

**system-logging 验证"这次 run 到底发生了什么"——不是再加一个 sink，而是把已有的 4 个 sink、死掉的 logger、spec 要求却没写的事件，统一、激活、补全，并做出能读回的工具。**

## 核心挑战：不是 greenfield，是"把半成品接上"

与其它 TODO 不同，logging 的难点**不在设计新机制**（trace.mjs / logger.mjs / 4 个 sink / charter 哲学 都已存在），而在：

1. **统一写路径**——8 个 gate trace 写入点收成 1 个（消灭 run.log/trace 漂移）。
2. **激活死代码**——`logger.mjs` 接进 production（LOG-003 注入点已就位，只是没人传）。
3. **补全 mandated-but-unwritten 事件**——repair、fork、phase transition、HITL decision、error、duration（charter 已要求）。
4. **加 correlation + schema 化**——runId + per-event-type Zod schema，让"真相"可缝合、可机器校验。
5. **做读回工具**——summary / timeline / post-mortem 视图。

charter 已经定调哲学——**"Trace 是真相，Log 是解释"**（`framework-runtime-boundary.md:251-264`）：`rb_trace.jsonl` 是机器可校验的真相，`_logs/run.log` 是给人看的解释，console 永远不是 verdict（`project-charter.md:246`）。本 TODO 在这个哲学内填空，不推翻它。

## 现有基础设施（可复用 / 待激活）

| 基础设施 | 位置 | 状态 / 如何用 |
|---------|------|--------------|
| **trace 工厂** | `engine/trace.mjs:46-138` `createTrace()` | 生产在用（Sink B/C）。但 `traceInit`/`run_start`/`traceSummary` **死**——激活它们 |
| **leveled logger** | `engine/logger.mjs:38-83` `createLogger()` | **完全死代码**，有合约（LOG-001/002/003）+ 测试。接入 production |
| **LOG-003 注入点** | `workflow-chain.mjs:318,364,444,474,512` `logger=null` 尾参 | 已就位，无人传 logger。从 caller 把 logger 传进去即激活 |
| **gate 写入 helper** | `gate-helpers.mjs:268-308` `writeGateAttempt()` | 同时写 Sink A + Sink D。**让 7 个 inline gate 改走它**即消灭漂移 |
| **trace 读取 helper** | `gate-helpers.mjs:322-332` `readTraceEvents()` | 唯一的 trace 读回点，但只数子任务。扩展为通用读回 |
| **3 个 trace sink + run.log** | 见上表 | 统一 schema + 加 runId |
| **bundle 审计工具** | `DPT_FRAMEWORK/inspect-bundle.mjs:12` | 现在只查存在性。扩展为日志渲染器（post-mortem 入口） |
| **charter 哲学** | `framework-runtime-boundary.md:251-264,275`；`project-charter.md:77,88,246` | "Trace 是真相，Log 是解释" + MUST 事件清单。本 TODO 的权威依据 |
| **现有合约** | `openspec/specs/logger/spec.md`（LOG-001/002/003）、`openspec/specs/trace-writer/spec.md`（TRW-001/002） | 已 accepted。logger 这块照合约实现即可 |

## 关键设计问题（开放，留给 `/opsx:explore`）

### 1. 单一写路径：所有 gate 走 `writeGateAttempt()`？

7 个 gate CLI 各自 inline 写 `rb_trace.jsonl`、跳过 `run.log`（`check-gate-hitl1/instantiation/readiness/seed-topics/setup/wave0/wave1/wave2`）。收成统一走 `writeGateAttempt()` 即消灭漂移 + 自动获得 `run.log`。

**这是最低成本、最高确定性的一项**——纯重构，无新概念。可以作为本 TODO 的 Phase 1 立即做。

### 2. 激活 `logger.mjs`：在哪一层注入？

LOG-003 注入点已在 `workflow-chain.mjs` 就位。问题是从哪个 caller 创建 logger 并传下去：

- **gate CLI 层**？每个 gate CLI `createLogger()` 后传给 engine 调用——但 gate CLI 调的 engine 函数（`resolveNodeTransitionDetailed` 等）是否接 logger？
- **phase 执行层**？由驱动 phase 的入口（Driver / Agent harness）创建一个 run-scoped logger。
- **倾向**：run-scoped logger，写进 bundle 的 `_logs/`（与 run.log 协同或合并），在 run 开始时创建、结束时 flush。

### 3. 补全哪些 mandated 事件，写进哪个 sink？

charter 275 要求 repair / waiting/block 事件进 `rb_trace.jsonl`。但 repair 发生在 `subagent-relay.mjs` 的 `convergeRepair`（同一 bundle 的 Sink B 域）。

**张力**：repair 事件该写进 Sink A（`rb_trace.jsonl`，charter 指定）还是 Sink B（`_trace_subagent.jsonl`，subagent 域）？

- 选 A → 符合 charter，但 subagent-relay 要跨域写 rb_trace.jsonl。
- 选 B → 域内自洽，但 charter 的"统一真相源"落空，post-mortem 要缝合 A+B。
- **倾向**：**runId + 统一事件命名空间**——事件物理上可写在各自域 sink，但 runId 让它们可缝合；同时 charter 明确要求的 audit-critical 事件（repair outcome、HITL decision、phase transition）**额外镜像一份到 rb_trace.jsonl**（单一审计真相）。explore 时定边界。

### 4. runId / correlation 怎么生成和注入？

无 runId 是缝合 4 个 sink 的根本障碍。问题：

- **谁生成**？run 开始时（instantiation phase？）生成一个 run-scoped id 写进 bundle。
- **怎么注入每个事件**？4 个 sink 各自的 `traceEntry()` 都加一个 `runId` 字段——需要从 bundle 状态读 runId 并传进每个 trace 调用，或 trace 工厂在 init 时绑定。
- **跨 process**？一次 run 可能跨多个 CLI 调用（每个 gate 是独立 `node` 进程）。runId 必须持久化在 bundle（如 `rb_status.json` 或独立 `rb_run.json`），每个 CLI 启动时读取。

### 5. schema 化到什么程度？

- **最小**：给 Sink B、C 补 Zod schema（对齐 Sink A 的 `TraceEntrySchema` 但加 per-event-type 字段）。
- **完整**：每个事件类型一个 schema（`GateAttemptEvent`、`SubagentDispatchEvent`、`RepairIterationEvent`…），trace 写入时校验。
- **倾向**：audit-critical 事件（gate、repair、HITL、phase transition）强制 schema；诊断性事件（subagent 内部 slot 生命周期）宽松。匹配"真相需校验、解释可宽松"的哲学。

### 6. 读回 / 可观测性工具做什么？

至少三档：

- **`traceSummary()` 激活**：run 结束时输出 `{events, passed, failed}` 摘要（已写好，从不调）。
- **timeline 渲染**：`inspect-bundle.mjs` 扩展——把 4 个 sink 按 runId + ts 缝合成一条时间线，给人看。post-mortem 的主入口。
- **gate-integrity 复核**：检查 trace 事件是否与 gate result 一致（anti-cheating §1 "禁止伪造 trace" 的读侧）。

### 7. per-bundle vs 全局聚合？

现在 4 个 sink 全 per-bundle。post-mortem 单 bundle 够用；但**跨 run 的趋势**（哪些 gate 常失败、平均跑几轮、哪类 topic repair 多）需要全局聚合。

**倾向 Phase 1 只做 per-bundle**（符合 charter "trace 留在 bundle"，`project-charter.md:77`）；全局聚合（telemetry）作为 Phase 2 / Non-Goal，因为涉及把 bundle 数据外送（隐私 + anti-cheating §8 精神）。

## 实验范围

**Phase 1（低风险、高确定，可先做）：**
- 统一 gate 写路径（7 个 inline → `writeGateAttempt()`），消灭 run.log/trace 漂移
- 激活 `traceInit`/`run_start` + `traceSummary`/`run_end`（已写好，接上调用点）
- 激活 `logger.mjs`（run-scoped logger 注入已就位的 LOG-003 点）
- 加 runId（持久化在 bundle，每个 CLI 启动读取，注入所有 sink）

**Phase 2（补全事件 + schema）：**
- repair 事件（`convergeRepair`）+ fork/branch 决策 trace（填 charter 275 违规）
- phase transition 事件（`node_exec` 等，激活死事件类型）
- HITL decision 审计行 + error capture + duration/成对 start-end
- Sink B、C 补 Zod schema；audit-critical 事件强制 schema

**Phase 3（读回工具）：**
- `inspect-bundle.mjs` 扩展为 timeline 渲染器（post-mortem 入口）
- gate-integrity 复核（trace ↔ gate result 一致性）

**Non-Goals:**
- 不做全局 telemetry / 跨 run 聚合（隐私 + 外送，Phase 2 另议）
- 不把 console.log 当 verdict（charter 已禁，维持）
- 不做实时 streaming / 远程日志后端（prototype/launch 阶段 per-bundle 文件足够）
- 不重写已有 sink 的存储格式（runId + schema 是叠加，不是替换）

## 与其它 TODO 的关系

- **`todo-phase-recover.md`**：recover 把 `rb_trace.jsonl` 当 ground truth（`readLastPassedGate()` 重建当前 phase）。**logging 的 Phase 1/2 直接喂养 recover**——trace 不可信、不可读，recover 就没有真相源。
- **`todo-context-reground.md`**：reground 读工程总图 + profile 作为 grounding 基座，与 logging 的 ground-truth 基座是同一套 control files。设计时对齐"真相源"。
- **核心 evidence 流水线**（extraction/quality/explore/final-eval）：每个都新增 trace 事件（quality discard、explore 收敛信号、final-eval auto_rerun）。**logging 是它们可调试的前提**——不先把日志做对，后面流水线的失焦/失败都无法 post-mortem。

## 下一步（中优先级——建议在 launch 前抬起，但当前可 park）

1. `/opsx:explore system-logging` — 定：Phase 1 边界（哪些是纯激活、零风险）、repair 事件写哪个 sink、runId 生成与注入点、schema 化程度、读回工具范围
2. 可考虑**拆成 2-3 个 OpenSpec change**（按 Phase 1/2/3），而非一个大 change——Phase 1 是纯重构 + 激活死代码，scope 小、风险低，可独立先走
3. Phase 1 实施：统一 gate 写路径 + 激活 run_start/traceSummary + 激活 logger + runId
4. Phase 2/3 依 explore 结果排期
