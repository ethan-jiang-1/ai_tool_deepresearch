# BUG-255 — audit trace completion witness 时序检查与 phase 文档流程死锁

> 报障日期：2026-09-04 · 报障人：Deep Research Harness Coding Agent（本轮 bundle 数据完整性体检）
> Severity：中（不影响 gate 通过 / Final 交付；污染 audit 输出，导致合法 bundle 永远报 `trace_integrity.ok=false`）
> 涉及文件：`DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs`（`evaluateTraceCompletionIntegrity` witness 检查）、`openspec/specs/engine/trace-writer/spec.md`（TRW-008）

## 一、现象

对**任意按 phase 文档流程正常完成的 run bundle** 运行
`node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <bundle>`，`trace_integrity.ok` 恒为
`false`，首轮 completion 事件全部报 `trace_integrity_unsupported_completion`（no passed gate_attempt witness）。

现场证据（三个 bundle 全部中招）：

| Bundle | trace_integrity.ok | findings 数 | 被误报的合法事件 |
|---|---|---|---|
| `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` | false | 11（其中 2 条为误报） | `wave1_completion` @13:38:47（writer: cli，canonical bundle）、`wave2_completion` @13:58:00（writer: cli，canonical bundle） |
| `dpt_rb_chinese-ai-inference-chips-vs-nvidia` | false | 3 | `wave0/1/2_completion` 首轮全部（161/242/322/354 行附近） |
| `dpt_rb_ai-coding-evolution` | false | 3 | 同上模式 |

被误报事件特征：**由合法 `log-event` CLI 写入（`"writer":"cli"`）、携带 canonical bundle basename、且对应 gate 有真实的 `gate_attempt(passed=true)`** —— 只是 completion 的 ts 早于该 passed gate_attempt 的 ts。

## 二、根因：三处权威语义互相矛盾（死锁）

1. **phase 文档**（`workflows/nodes/phases/phase-wave1.md`）：
   > "Only after inspect passes, **record or refresh the existing `wave1_completion` evidence** through the normal phase logging path, **then run the formal gate**"
   → 流程要求 **completion 先写、gate 后跑**。

2. **gate 定义**（`schema/gate_definitions/gate-wave1-complete.definition.json` 规则 `trace_event_present`）：
   > "The phase **must write a completion trace event before the gate**."
   → 与 phase 文档一致：completion 必须先存在，gate 才能过。**这是硬前提**——gate 运行前 trace 里必须有 completion 事件，否则 `trace_event_present` 直接失败。

3. **audit witness 检查**（`phase-status-audit.mjs` `evaluateTraceCompletionIntegrity`）：
   ```js
   const witnessed = events.some((other) => {
     const candidate = other.event ?? other;
     return candidate.event === 'gate_attempt'
       && candidate.gate === gateIdentity
       && candidate.passed === true
       && (ts === null || typeof candidate.ts !== 'string' || candidate.ts <= ts);
   });
   ```
   → 要求存在 `gate_attempt.passed=true` 且 **`gate_attempt.ts <= completion.ts`**（gate 通过时间不晚于 completion 写入时间）。

4. **TRW-008 测试的"合法样例"**（`tests/integration/cli/audit-phase-status.test.mjs` L278-288）也是 gate(00:00:00) → completion(00:00:01)，即测试假设 **gate 先过、completion 后写**。

**死锁**：gate 定义要求 completion 在 gate 前存在（否则 gate 不过），而 audit 要求 completion 在 gate 通过之后写入（否则报无 witness）。两者对**同一个 completion 事件**无法同时满足——任何按 phase 文档流程（先写 completion → 跑 gate → gate 通过）正常走完的 bundle，其首轮 completion 事件必然被 audit 误报。

## 三、影响

- `audit-phase-status` 的 `trace_integrity` 诊断永远无法归零（对正常流程 bundle），成为持续的噪音 finding，掩盖真正需要人工看的伪造事件。
- 不阻塞 gate、不影响 Final 交付（`trace_integrity` 是 advisory 诊断，`diagnostic_only: true`，不改变 `ok/outcome`）——但违背 TRW-008 的原始意图（**检测**伪造 completion），且让用户误以为 bundle 数据仍有问题。
- 上一轮修复报告（`dpt_rb_glm-5-3-deepseek-v4-domestic-chips/_diagnostics/data-integrity-repair-report-2026-09-04.md`）把 924/944 当作"4 行手插假事件"的一部分处理，实际这 2 行是**合法 log-event 写入**，是本次体检新识别出的**误报**。

## 四、修复方向（推荐 a）

- **(a) 改 audit（推荐）**：`evaluateTraceCompletionIntegrity` 的 witness 检查去掉 `candidate.ts <= ts` 时序约束，改为仅验证"存在匹配 gate identity 的 `gate_attempt(passed=true)`"。时序一致性继续由 `ts_monotonic`（append 顺序非递减）承担。
  - 效果：伪造事件仍被检出（无 passed gate_attempt 匹配 / bundle 名不符 / 非单调 ts 三者仍然成立），合法事件（924/944）不再误报。
  - 需要同步：更新 TRW-008 spec 的"witness"表述（去掉"gate attempt 不晚于 completion"的隐含语义）、更新测试 L278-288 的合法样例（允许 completion 在 gate 前）。
- **(b) 改流程（不推荐）**：要求 gate 通过后再补写 completion —— 与 `trace_event_present` 死锁，需要 gate 先接受"无 completion"再在 passed 后补写，工程上更复杂且破坏现有 phase 文档约定。

## 五、关联已知项（非本 bug）

- `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 中 09-02 手插的 4 条假 completion（`wave0_completion`@13:19:57、`final_report_complete`@14:15、`wave1_completion`@15:00、`wave2_completion`@16:00，均为旧短名 bundle 或插入在错误位置）由 BUG-251 修复后的检测标记，**不可删除**（上一轮尝试删除会破坏 `load_complete` 的 `handoff_source_attempt_index` 行号绑定，已恢复原状）；本 bug 修复后它们仍会被 audit 正确标记，属预期。
- 同 bundle 的 `diagnostic`@14:54:07 与 `wave2_completion`@16:00 的非单调 ts 由上述手插假事件插入位置造成，同样保留可检测。
