## Context

See `proposal.md - Why` for the bug evidence. Current state that shapes the approach:

- `DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs` `evaluateTraceCompletionIntegrity`
  是 audit 的 advisory 完整性诊断（`diagnostic_only: true`，不改变 `ok/outcome`）。它同时做三件事：
  bundle 名检查（canonical basename）、witness 检查（passed gate_attempt）、ts 单调检查
  （append 序非递减）。
- phase 流程（phase-wave1.md）与 gate 定义（`trace_event_present`）约定 **completion 先写、
  gate 后跑** —— 该约定是既有行为，gate 必须依赖 completion 事件存在才能通过。
- 当前 witness 检查把"存在 passed gate_attempt"和"gate_attempt.ts <= completion.ts"两个
  正交语义揉成一个条件，导致与 phase 流程死锁：合法首轮 completion 永远早于其 witness。
- `tests/integration/cli/audit-phase-status.test.mjs` L233-289 已有 TRW-008 测试块，
  其中"合法样例"（L278-288）恰好用了 gate 先过、completion 后写的形态，未覆盖反序。

## Goals / Non-Goals

**Goals:**
- witness 检查只验证"存在匹配 gate identity 的 passed `gate_attempt`"，不再要求时序先后。
- 保持 bundle 名检查与 ts 单调检查语义完全不变（伪造检测能力不缩水）。
- 同步 TRW-008 spec 表述与测试，使 spec/实现/测试三方一致，并让"completion 早于 gate"成为
  明确合法的 lifecycle 证据形态。

**Non-Goals:**
- 不改 gate `trace_event_present` 消费路径（BUG-251 的 canonical basename fail-closed 保持）。
- 不改 phase 文档流程、不引入新命令/新状态/新 trace 事件、不改 audit 输出 JSON 结构。
- 不清理 `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 中 09-02 的手插假事件（删除会破坏
  `load_complete` 行号绑定；保留但继续被检测标记，是既有决策，见 BUG-255 关联项）。

## Decisions

### D1: witness 检查移除时序约束（只按 gate identity + passed 匹配）

`evaluateTraceCompletionIntegrity` 的 witness 判定从

```js
return candidate.event === 'gate_attempt'
  && candidate.gate === gateIdentity
  && candidate.passed === true
  && (ts === null || typeof candidate.ts !== 'string' || candidate.ts <= ts);
```

改为只保留前三项（gate identity + passed status），删除 `candidate.ts <= ts` 分支。

**Rationale**：spec（TRW-008）原文只要求"SHALL be backed by a corresponding passed
`gate_attempt` event"和"witness check SHALL match on gate identity and passed status"，
从未要求 gate 时间不晚于 completion；时序约束是实现的过度收紧。删除后实现回到 spec 意图，
并消除与 phase 流程的死锁。时序一致性不再由 witness 检查重复承担，而是由已有
`ts_monotonic`（append 序非递减）唯一负责 —— 单一职责，避免两个检查对"时间"各执一词。

**Alternatives considered**：
- (b) 改 phase 流程让 gate 先过、completion 后写 —— 与 `trace_event_present` 死锁
  （gate 前必须已有 completion 事件），需要改 gate 消费语义，破坏既有约定，否决。
- (c) 让 gate 定义改为"允许 gate 后补写 completion" —— 涉及 gate 语义大改，风险高于收益，否决。

### D2: ts 单调检查保持不动，作为唯一的时序一致性载体

`ts_monotonic` 已在 append 序上强制 ts 非递减（允许相等），这天然能检测手插假事件
（倒填 ts 插入中间会造成后续事件"更老"）。本 change 不触碰它，也不给它加新规则。

**Rationale**：伪造检测的时序面已由 ts_monotonic 覆盖；witness 检查只回答"有没有真实 gate
通过过"，两者正交（semantic-precision：witness = 存在性证据，ts 单调 = 顺序一致性证据，
不揉合成一个条件）。

### D3: spec 与测试同步成三方一致

- spec：TRW-008 Requirement 文本明确"SHALL NOT require any temporal ordering"；
  "Legitimate gate-backed completion passes audit" scenario 扩展为覆盖 completion 早于
  gate 的合法形态；新增"非单调 ts"scenario（对齐已有实现行为）。
- 测试：新增正例（completion ts 早于 passed gate_attempt ts 仍通过）；现有反例
  （无 witness / bundle 短名 / 非单调 ts）保持并继续断言。

**Rationale**：三方一致避免未来回归（有人按"gate 先过"重写实现或测试导致再次死锁）。
测试改动只在 `tests/integration/cli/audit-phase-status.test.mjs` 的 TRW-008 块内。

### D4: 责任边界

- **Engine verdict**：witness 判定、ts 单调判定、bundle 判定都是确定性 Engine 检查，
  本 change 只修正其中 witness 的判定条件。
- **Agent execution**：Agent 读 audit 输出做数据修复；本 change 不改变 Agent 修复义务
  （假事件仍会被标记，Agent 仍按既有 advisory 处理）。
- **User decision**：无新用户决策；修复方向由 BUG-255 现场证据（3 bundle 对照）确定，
  不引入新权限或 capability。

## Risks / Trade-offs

- **[Risk] 放宽时序约束后，某个"ts 倒填但单调"的伪造 completion 可能通过 witness 检查**
  → 缓解：bundle 名 fail-closed 检查（非 canonical basename 仍拒绝）与 ts_monotonic
  （append 序非递减）仍然独立拦截伪造形态；且 `trace_integrity` 是 advisory 诊断，不授予
  gate/交付权限，最坏情况是诊断噪音，不构成权限漏洞。
- **[Risk] `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 的 306 号事件（09-02 手插
  `wave0_completion`，但 bundle 为 canonical 名）修复后将不再被标记**
  → 事实与边界：306 是上一轮手插的假 completion（写于 wave0 gate 通过之前），但它携带
  canonical basename、对应 `wave0-complete` 确实真实通过（trace 363 行 passed=true）、且插入
  位置 ts 单调 —— 在 witness 只按"存在 passed gate_attempt"判定后，audit 无法仅凭 trace
  区分它与合法事件。这是 TRW-008 spec 原文语义（"backed by a corresponding passed
  `gate_attempt` event"）的意图内行为：witness 回答"该 gate 是否真实通过过"，不回答
  "completion 是否先于 gate 通过被手插"。真正的伪造防线是 BUG-251 的 gate fail-closed
  canonical basename 校验（gate 消费路径不认短名事件）与 Engine/CLI 写入者身份；audit 的
  该条 advisory 标记消失不改变 gate 权限。诚实记录：这不是修复引入的回归，而是移除
  **错误时序约束**后的固有不可区分性，已在 proposal/design 明示。
- **[Risk] 测试改动被误读为"弱化检测"**
  → 缓解：proposal/spec/design 均明示伪造检测能力（无 witness / bundle 不符 / 非单调）
  完全不变；测试新增正例的同时保留全部既有反例断言。
- **[Trade-off] 不改 09-02 假事件本身**
  → 缓解：删除会破坏 `load_complete` 的 `handoff_source_attempt_index` 行号绑定
  （上一轮已实测），保留可检测是既有决策；本 change 只消除合法事件的误报面。

## Migration Plan

- 实现为纯判定条件修改，无状态迁移、无数据迁移。
- 回滚：恢复 `phase-status-audit.mjs` 的 witness 条件、还原 spec 文本与测试用例即可；
  无 bundle 数据依赖，回滚无副作用。

## Open Questions

无（修复方向、语义边界、测试形态均由现场证据与既有 spec 确定）。
