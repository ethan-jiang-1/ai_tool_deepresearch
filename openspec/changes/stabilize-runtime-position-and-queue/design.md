## Context

本 change 来自 `_backlog/plans/formal-run-bugfix-change-split.md` 的第一个 change，覆盖 `_backlog/bugs/BUG-057-rb-status-json-missing-current-node.md`、`BUG-044-queue-stale-after-work-unit-submit.md`、`BUG-056-queue-slug-derivation-blocks-supplementary-tasks.md`。

当前框架已有 trace-backed handoff：gate pass 写 `gate_attempt.next`，`enter-phase` 消费该 node 并写 route-bound `load_complete`，`advance-status` 再同步 `current_gate` / `next_gate`。问题是 `rb_status.json` 只记录 gate window，不记录 Agent 当前应继续读取的 lifecycle node。恢复时只能扫 trace 或推断，和 `silent-wave-execution` / `runtime-reentry-debuggability` 的 durable-state 目标不一致。

同时，work-unit submit 的成功路径理论上会完成 queue demand，但真实 run 中出现 `_work_units/_index.json` 和 ledger 已 terminal、`rb_queue.json.delegated_in_flight` 却残留的状态。这会让后续 claim 和 queue health 判断卡死。第三个问题是 queue input validation 把 `queue_item_id` 反推 topic slug 当成 blocking authority，导致同一 topic 的第二轮补充任务无法 enqueue。

## Goals / Non-Goals

**Goals:**

- 让 `rb_status.json` 成为可直接回答“当前 phase node 是谁”的 durable runtime surface。
- 保持 gate window 权威仍由 `advance-status` 管理；`enter-phase` 只同步当前 control surface，不完成 phase 或选择 gate。
- 让 successful work-unit submit 具备 queue durable postcondition：bound queue item 不再留在 `delegated_in_flight`，并出现在 terminal history。
- 让 topic-scoped supplementary tasks 可以使用 suffix 或 iteration ID，只要显式 `payload.topic_slug` / `lineage.topic_slug` 合法。

**Non-Goals:**

- 不实现 degraded gate pass、force advance、gate fatigue 策略或 `content_dedup` KISS 简化。
- 不恢复 Wave1/Wave2 深度协议，也不要求 Phase Agent 在本 change 中生成二轮 deepening 任务。
- 不启用 Wave0/Wave1 并行 claim；并行属于后续 `harden-run-entry-and-agent-discipline`。
- 不把 `current_node` 变成 lifecycle walker；JS 仍不执行 Markdown phase work。
- 不在本 change 中设计完整 timeout sweeper。`BUG-044` 的 timeout 线索可以作为后续 queue repair improvement，但本 change 只要求 submit 成功路径的 durable consistency。

## Decisions

### `current_node` means active loaded control surface

`rb_status.json.current_node` SHALL store the canonical workflow node ref most recently loaded by an authorized successful `enter-phase`, such as `phases/phase-wave1.md`.

Rationale: after `enter-phase --node phases/phase-wave1.md` and `advance-status --to wave0_complete`, the Agent is executing Wave1 even though `current_gate` is `wave0_complete`. Clearing `current_node` during `advance-status` would recreate the ambiguity from `BUG-057`.

Alternative rejected: derive current node from `next_gate`. This is lossy for multi-outcome branches, bootstrap windows, and in-flight handoff states. It also forces humans and tools to redo manifest/trace inference when status could carry the active coordinate directly.

### `enter-phase` updates status narrowly

`enter-phase` SHALL update only `current_node` after successful route-bound node load. It SHALL NOT update `current_gate` or `next_gate`, SHALL NOT append `phase_transition`, and SHALL NOT claim the target phase's work is complete.

Rationale: accepted handoff semantics already distinguish handoff (`enter-phase`) from status synchronization (`advance-status`) and work completion (target gate). This design adds one status coordinate without collapsing those boundaries.

Alternative rejected: make `advance-status` compute and write `current_node`. That would leave a gap between `enter-phase` and `advance-status`, exactly when the next Markdown control surface has already been loaded and a crash/reentry may occur.

### Work-unit submit success includes queue postcondition verification

`operate-work-unit submit` already owns delegated completion authority. On success it must verify the durable queue file after write, not merely mutate an in-memory queue object. The success postcondition is:

- the submitted work unit is terminal/submitted in `_work_units/_index.json`;
- the submitted `queue_item_id` is absent from `rb_queue.json.delegated_in_flight`;
- `rb_queue.json.terminal_history` contains a terminal record for that queue item/work unit; and
- refill behavior remains valid under queue schema.

If this postcondition cannot be proven, submit SHALL return failure/diagnostic rather than silently reporting success.

Alternative rejected: rely on later gate/reentry diagnostics. That leaves the Agent with a success signal followed by a stuck queue, which is the failure shape in `BUG-044`.

### Explicit topic slug wins over queue item ID parsing

For enqueue validation, `payload.topic_slug` is the preferred topic identity. `lineage.topic_slug` may also declare identity and must match payload when both exist. `queue_item_id` parsing is a fallback only when no explicit topic slug exists.

If explicit topic slug is present and valid in `topic_registry`, enqueue SHALL NOT reject solely because a recognized `queue_item_id` pattern would parse a different suffix-derived slug.

Rationale: `queue_item_id` is queue demand identity and may contain iteration labels (`-v2`, `-supplement`, `-deep`). It is not a stable structural encoding of topic identity.

Alternative rejected: add more ID patterns for every supplementary naming shape. That keeps the brittle convention as authority and will fail again when a new valid suffix appears.

## Risks / Trade-offs

- `current_node` could drift from trace if a write partially fails -> update status only after `load_complete` succeeds, and test failure rollback/no partial gate-window mutation.
- Existing tooling may assume `enter-phase` never touches status -> restrict the mutation to `current_node` and preserve Markdown stdout success shape.
- Queue postcondition verification may turn rare persistence anomalies into submit failures -> preferred over false success; diagnostics should name the missing postcondition and advise retry/repair through Engine paths.
- Relaxing queue-item-id mismatch could hide accidental wrong IDs -> explicit `payload.topic_slug` / `lineage.topic_slug` still validates against `topic_registry`; ID parsing remains fallback for older/minimal task cards.

## Migration Plan

- New bundles SHALL include `current_node` in `rb_status.json` template.
- Existing bundles without `current_node` remain readable; schema accepts absence for backward compatibility until the next successful `enter-phase` populates it.
- `START_FROM_HERE.md` and reentry diagnostics should tell Agents to prefer `rb_status.json.current_node` when present, and otherwise fall back to existing trace/reentry checks.
- Apply phase updates `DPT_FRAMEWORK/CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` banner to target version `v0.6`.

## Open Questions

None. The change intentionally leaves degraded gate routing, timeout sweeping, Wave depth behavior, and parallel claim policy to later planned changes.
