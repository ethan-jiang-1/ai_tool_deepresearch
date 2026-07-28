## Why

BUG-141（`_backlog/bugs/BUG-141-wave0-gate-contradictory-passed.md`）观察到 Wave0 疲劳阈值后的合法 degraded handoff 同时输出了 `check.passed: true` 和同一 unresolved quality rule 的 `check.failed_rule_ids`。当前 accepted degradation policy 有意保留可路由的降级交接；问题不是 boolean 算术，而是 public verdict 把「仍阻塞路由」与「随交接携带的质量债务」投影成了同一个字段。

现在修复这层歧义，能让 Phase Agent、`enter-phase`、trace reader 和维护者不必回读完整 findings 或历史约定，就能判断当前 Gate 是否可进入下一控制面，以及那是否为 clean pass。

## What Changes

- 为 formal Gate 的 public `check` summary 明确三类互斥 verdict：clean pass、blocking failure、degraded handoff。
- 规定 `failed_rule_ids` 只列仍阻塞当前 routing 的 rule；已被 degradation policy 接纳并随 handoff 保留的质量债务只出现在 `degraded_rules`，完整 finding/diagnostic/trace 仍保留。
- 统一 Wave0/Wave1/Wave2 的 summary-classification projection，并审计 Gate trace、`enter-phase` 和 Agent-facing handoff guidance，确保 consumer 不会把 degraded handoff 当作 clean quality pass。
- 用 focused regression 覆盖 clean、blocking、degraded、ineligible blocker、durability/routing failure 和 attempt-trend continuity；保留一个 current-head disposable bundle degradation observation 作为 deterministic handoff-continuity evidence。
- 不改变 evidence、queue、ledger、receipt、runtime status 或 degradation eligibility；不新增 persisted verdict state、controller、retry path 或第二个 validator。
- 此 change 需要 framework patch version bump，目标版本为 `v0.59`。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `gate-skeleton`: existing `GSK-004` Gate public-summary projection, durable failed-envelope fallback, and attempt-trend semantics.
- `research-wave-gate-implementation`: existing `RWG-021` Wave0/Wave1/Wave2 degraded-handoff projection and Phase-facing consumption contract.

## Impact

- Affected code: the three Wave Gate CLIs, their shared result/projection helper where it removes duplicated classification, trace-writing fallback, and only the handoff guidance that consumes Gate output.
- Affected API: compatible additive/clarifying `check` semantics for `passed`, `failed_rule_ids`, `degraded`, `degraded_rules`, and `next`; a degraded route remains legal but explicitly non-clean.
- Direct Source of Record remains the schema-parsed Gate definition, checker-owned structured findings, routing resolution, and trace durability result. The public summary is a read-only projection, not a new authority.
- The semantic level answers one bounded reader question: “Can this Gate legally hand off now, and is that handoff clean or carrying declared quality debt?” It preserves the distinction between blocking failures and carried debt, so normal consumers can stop at the summary; full findings remain available for diagnosis.
- The control loop remains `direct findings -> one summary classification -> existing routing/durable witness -> one existing next action`. Reusing the current degradation eligibility fact removes the overlapping `failed_rule_ids` claim instead of adding a status, fallback tree, controller, or duplicate evaluator.
- Engine owns deterministic classification and durable verdict; Agent reads `check.next` and degraded context then follows the existing legal handoff. No user decision, host capability, or new mutation authority is introduced.
