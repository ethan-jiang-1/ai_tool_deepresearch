# Proposal: 2026-09-04-fix-audit-completion-witness-timing

## Why

来源：`_backlog/bugs/BUG-255-audit-completion-witness-timing-deadlock.md`（2026-09-04 由
`dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 全量数据完整性体检发现）。

`audit-phase-status.mjs` 的 trace completion witness 检查与 phase 文档/gate 定义时序死锁：

1. **phase 文档**（`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md`）："record
   or refresh the existing `wave1_completion` evidence through the normal phase logging
   path, **then run the formal gate**" —— completion **先写**、gate **后跑**。
2. **gate 定义**（`schema/gate_definitions/gate-wave1-complete.definition.json` 规则
   `trace_event_present`）："The phase **must write a completion trace event before the
   gate**" —— gate 运行前 trace 里必须有 completion 事件，否则 gate 直接失败。
3. **audit 实现**（`engine/helpers/phase-status-audit.mjs` `evaluateTraceCompletionIntegrity`）：
   witness 检查要求存在 `gate_attempt(passed=true)` 且 **`gate_attempt.ts <= completion.ts`**
   （gate 通过时间不晚于 completion 写入时间）。

1/2 与 3 对同一个 completion 事件无法同时满足：按 phase 文档流程（completion 先写 → gate
后过），首轮 completion 的 ts 必然早于其 passed gate_attempt 的 ts，audit 必然报
`trace_integrity_unsupported_completion`（no passed gate_attempt witness）。

现场取证：`dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 09-04 两条合法 `log-event` 写入的
`wave1_completion`@13:38:47 / `wave2_completion`@13:58:00（writer: cli、canonical bundle、
对应 gate 真实 passed）被误报；对照 `dpt_rb_chinese-ai-inference-chips-vs-nvidia` 与
`dpt_rb_ai-coding-evolution` 两个已完成 bundle 首轮 completion 全部同样误报 —— 证明是
harness 通用语义 bug，不是单 bundle 数据问题。

## What Changes

- **MODIFIED `engine/trace-writer`（TRW-008）**：audit 的 trace completion witness 检查
  不再要求 `gate_attempt.ts <= completion.ts` 时序关系。witness 判定只验证"存在匹配 gate
  identity 的 `gate_attempt(passed=true)`"；时序一致性继续由已有的 `ts_monotonic`
  （append 顺序 ts 非递减）检查承担。
- **保持既有伪造检测能力不变**：bundle 名不符（非 canonical basename）、无 passed
  gate_attempt witness、非单调 ts 三类 findings 仍全部报告。
- **同步 TRW-008 spec 表述**：`openspec/specs/engine/trace-writer/spec.md` 的 Requirement
  "Audit SHALL verify trace completion events have passed gate witnesses" 明确 witness 检查
  只按 gate identity + passed status 匹配、不施加时序先后约束；"Legitimate gate-backed
  completion passes audit" scenario 覆盖 completion 早于 gate 的合法形态。
- **同步测试**：`tests/integration/cli/audit-phase-status.test.mjs` 的 TRW-008 用例新增
  "completion 先写、gate 后过仍合法"的正例，与"无 witness 仍被标记"的反例并存。

**不做**：不修改 gate `trace_event_present` 消费路径（BUG-251 已 fail-closed canonical
basename）、不改 phase 文档流程（completion 先写是既有约定）、不动 bundle 数据（假事件保留
可检测）、不引入新命令/新状态/新 trace 事件。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `engine/trace-writer`: TRW-008 的 audit completion witness 检查从"passed gate_attempt
  且 ts 不晚于 completion"改为"passed gate_attempt 匹配 gate identity 即可"，消除与
  phase 文档/gate 定义（completion 先写）的死锁；时序一致性交给既有 `ts_monotonic` 检查。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `engine/trace-writer` | `openspec/specs/engine/trace-writer/spec.md`（TRW-008 全文）、`DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs` `evaluateTraceCompletionIntegrity`、`tests/integration/cli/audit-phase-status.test.mjs` L233-289、`openspec/governance/req-registry.yaml`（TRW: engine/trace-writer） | Modify | TRW-008 拥有 audit completion witness 语义，本 change 修改该语义的时序约束；delta 在 `specs/engine/trace-writer/spec.md` |
| `engine/cli-inspect-output-conventions` | `openspec/specs/engine/cli-inspect-output-conventions/spec.md` | Excluded | 该 capability 约束 wave inspect CLIs（`inspect-wave{0,1,2}-output.mjs`）；`audit-phase-status.mjs` 不属于它，其输出结构（`{check,inspect,advice,hints}` 与 trace_integrity 诊断块）本 change 不变 |
| `engine/cli-exit-code-conventions` | `openspec/specs/engine/cli-exit-code-conventions/spec.md` | Excluded | audit 退出码约定（0/1/2）不变 |
| `lifecycle/gate-status-trace-handoff` | `openspec/specs/engine/trace-writer/spec.md`、`openspec/governance/semantic-fact-families.yaml` | Excluded | 该语义 family 是 semantic-closure 记录对象，非 capability；本 change 不改 status/queue/work-unit/bundle 生命周期行为 |

## Impact

- **代码**：`DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs`
  （`evaluateTraceCompletionIntegrity` witness 检查，约 1 处条件）。
- **spec**：`openspec/specs/engine/trace-writer/spec.md`（TRW-008 Requirement 文本 + 1 个
  scenario 扩展）。
- **测试**：`tests/integration/cli/audit-phase-status.test.mjs`（TRW-008 describe 块新增
  正例用例；现有用例保持通过）。
- **行为影响**：`audit-phase-status` 对合法 bundle 的 `trace_integrity` 不再误报首轮
  completion；对伪造事件（bundle 短名 / 无 witness / 非单调 ts）的检测能力不变。
  `trace_integrity` 仍是 advisory 诊断（`diagnostic_only`），不改变 audit 的 `ok/outcome`。
- **兼容性**：无破坏性变化；既有 gate 通过记录、handoff witness、phase 文档流程全部不动。
