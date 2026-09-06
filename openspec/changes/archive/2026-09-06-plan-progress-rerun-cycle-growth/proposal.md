## Why

`rb_plan.md## Progress` 是 Engine 独家写入的 presentation，但当前实现只在 `setup-ready` gate pass 时翻一次行——其余 9 个 gate（instantiation、hitl1、seed-topics、wave0/1/2、hitl2、readiness、rerun-ready）的 CLI 从不写 Progress（根因见 design.md §根因）。后果：真实 bundle 已经跑完两轮 RERUN（`dpt_rb_harness-agent-selection-project-execution-pilot/rb_trace.jsonl` 里 seed-topics-ready / wave0/1/2 / hitl2 / readiness / rerun-ready 全部多次 `passed: true`，且 checkpoint 目录完整），但 `rb_plan.md` 的 Progress 永远停在 `setup-ready`（2026-09-06T04:19:33）——用户观察到的「跑了 RERUN 但 Progress 没更新」正是这个缺口。用户建议（2026-09-06，用户原话见会话记录）：**让靠谱的 node（Engine gate 流程）主动在每道 gate 做完时 checkoff；并且 Progress 不是固定 10 行勾到底，而是每次 rerun 长出一节新的 progress**。

## What Changes

- **所有 gate pass 都主动翻转 Progress**：`writePlanProgress` 从 setup-ready 独占改为通用 gate-attempt 路径——instantiation / hitl1 / setup / seed-topics / wave0 / wave1 / wave2 / hitl2 / readiness / rerun-ready 任一 gate pass 时，Engine（`writer: engine`）把该 gate 在**当前 cycle 块**内对应行翻成 `- [x] <gate> (<ISO8601 ts>)`。幂等：同 cycle 内重复 pass 只刷新时间戳、不重复加行。写入是 best-effort：失败绝不反转 gate verdict（保持 PHS-008 语义）。
- **rerun 让 Progress 增长**：`rerun-ready` gate pass 时，Engine 在当前块的 `rerun-ready` 行勾选后，**追加一个「Rerun cycle N」新块**（N 为递增序号），预填该 cycle 会重跑的全部 gate（seed-topics-ready、wave0-complete、wave1-complete、wave2-complete、hitl2-recorded、readiness-passed、rerun-ready）为未勾状态；之后该 cycle 内每道 gate pass 就在这个新块里勾选。基线块（10 个 gate）保持原样。Progress 随 rerun 一轮一轮「长出来」，与真实生命周期一一对应。
- **audit 浮出 stale（该勾没勾）**：`phase-status-audit.mjs` 已计算 `stale`（consumed gate 但 Progress 未勾）却从未浮出——本 change 让 audit 把它作为 **non-blocking advisory** 输出（spec PHS-010 已允许「MAY be reported as advisory presentation staleness」），tamper 证据（无 witness 的勾选）仍保持 blocking integrity outcome。
- **补一个 reconcile 工具**（Engine 写、presentation-only）：`reconcile-plan-progress.mjs` 从 `rb_trace.jsonl`（route-bound `gate_attempt` witnesses，与 audit 同一判定）与现有 Progress 基线清单重建当前状态（含 cycle 块），用于存量 bundle 一次性修复「Progress 冻结」，并接入 repair playbook；它不创造任何 gate 语义、不写 trace/checkpoint/status，重建结果仍受 audit 的 tamper/stale 检查约束。
- **不改变**：Progress 仍是 presentation，不是第二个生命周期 authority；trace/checkpoint 仍由 gate CLIs 独家写；Agent/人工手勾仍构成 tamper 证据；gate 顺序、manifest、queue、status 语义均不动。

## Capabilities

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/plan-hostfile-sections` | `openspec/specs/research/plan-hostfile-sections/spec.md`（PHS-006「Engine writes Progress on gate pass」、PHS-008、PHS-010）、`DEEP_RESEARCH_HARNESS/rb_templates/rb_plan.md.tmpl`、`DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-plan-progress.mjs` | Modify | Progress 契约（翻转时机、幂等、tamper/staleness）全部由该 spec 的 PHS-006/PHS-010 拥有；本 change 改的是这些 REQUIREMENTS 的行为（全 gate 翻转 + per-cycle 增长块 + stale advisory） |
| `research/research-wave-gate-implementation` | `openspec/specs/research/research-wave-gate-implementation/`（grep 无 Progress 契约）、gate CLIs 实现 | Verify-only | gate CLI 的 check/verdict/trace 契约不变；只新增「pass 时调用共享 Progress writer」这一实现挂接，属于 plan-hostfile-sections 契约的消费方 |
| `research/phase-status-audit` | `openspec/specs/` 无该 capability；audit 行为由 plan-hostfile-sections PHS-010 拥有（`plan_progress_tamper_suspected` 定义在 `DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs` 且 spec 有 Requirement「Progress checkbox states are Engine-owned and tamper-evident」） | Excluded | 不新建 capability；audit 的 Progress 相关行为并入 plan-hostfile-sections 的 delta |
| `workflow/rerun-incremental-node` | `openspec/specs/workflow/`、`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md`（含 `bundle/run-entry` 对照） | Excluded | rerun phase 的 intent/流程契约不变；cycle 块是 Progress presentation 的形态变化，不是 rerun 生命周期契约变化 |

### New Capabilities

- 无。

### Modified Capabilities

- `research/plan-hostfile-sections`：PHS-006「Engine writes Progress on gate pass」从 setup-ready 独占扩展为**所有 gate pass 翻转**，并新增 **per-rerun-cycle 增长块**（rerun-ready pass 时 spawn 下一 cycle 的预填块，cycle 内幂等翻转）；PHS-010 从「staleness MAY be reported」落实为 **audit 输出 non-blocking advisory stale**，tamper 判定扩展为按 cycle 块绑定。

## Impact

- **代码**（apply 时）：
  - `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-plan-progress.mjs` — `writePlanProgress` 扩展：当前块定位（基线块或最后一个 `### Rerun cycle N` 块）、cycle 内幂等翻转、`rerun-ready` pass 时 spawn 下一块。
  - `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-attempt-audit.mjs` — `writeGateAttempt` 通用路径在 pass 时调用 `writePlanProgress`（best-effort，不改变 verdict/exit code）。
  - `DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs` — 解析 cycle 块；tamper 按块绑定；stale 以 advisory 浮出（non-blocking，不进 `outcomes`）。
  - 新增 `DEEP_RESEARCH_HARNESS/cli/reconcile-plan-progress.mjs`（+ repair playbook 引用）。
  - `DEEP_RESEARCH_HARNESS/rb_templates/rb_plan.md.tmpl` — 保持 10 行基线清单不变（cycle 块由 Engine 运行时追加，不进模板）。
- **测试**：`tests/engine/`（Progress writer 单测：块定位/幂等/spawn）、`tests/integration/`（真实 gate CLI pass 后 Progress 翻转）、`tests/` 下 deterministic_e2e（audit tamper/stale advisory 全链路）。见 `verification-plan.yaml`。
- **不触碰**：`openspec/changes/` 以外的 run bundle 运行时状态；不反向修改任何既有 gate CLI 的 verdict/trace/checkpoint 行为；不新增依赖（纯 Node ESM + 现有 yaml/zod）。
