# Proposal: 提升 rerun 上限并修正 rerun 剔除指引

## Why

用户跑 harness 后反馈两条 rerun 体感：(1) 最大 rerun 次数 10 太低，希望提到 32；(2) `phase-rerun.md` 里「剔除 topic」的指引与实际能力自相矛盾。需求来源：`_backlog/plans/rerun-limit-raise-and-scope-pruning.md`（诉求 A 与 B1-a）。

## What Changes

- 把 rerun 最大次数从 10 提升到 32：`DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-rerun-ready.definition.json` 的 `rerun_count_valid` 规则 `value: 11 → 33`（`operator: less_than`，即 `rerun_count < 33`），并同步 `failure_message` 文案为「maximum of 32」。
- 修正 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md` Stage 2 的陈旧行：把 `remove/rename/renumber/path move → unsupported C3B` 改为指向 `mutate_layout` 的完整语义（rename/reorder/renumber 支持；safe-remove 仅限无依赖、无历史 topic；已研究 topic 的剔除 = 起新 bundle，本 bundle 不支持原地 retire），与 Stage 3 及 `command_playbook/operate-topic-state.md` 对齐。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `workflow/rerun-incremental-node`: rerun loop 保护的边界值从 10 提升到 32（REI-003 明示「改边界值需一个独立 accepted behavior change」，本 change 即该 change）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| workflow/rerun-incremental-node | openspec/specs/workflow/rerun-incremental-node/spec.md（REI-003） | Modify | 边界值变化是可观察行为变化，且 REI-003 明示需独立 change |
| workflow/rerun-topic-integration | openspec/specs/workflow/rerun-topic-integration/spec.md | Verify-only | 仅确认 rename/remove 语义用于 B1-a doc 修复；spec 文本已正确，无需改 |
| research/canonical-topic-state | openspec/specs/research/canonical-topic-state/spec.md | Verify-only | safe-remove 语义（仅限无依赖、无历史）已正确，无需改 |
| research/research-styles | openspec/specs/research/research-styles/spec.md | Verify-only | 上限消费者走同一 evaluator，无 style 行为变化 |
| research/post-final-recovery | openspec/specs/research/post-final-recovery/spec.md | Verify-only | post-final guard 读同一 definition/evaluator；仅需迁移标注（definition_sha256 变更） |

## Impact

- 契约：`DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-rerun-ready.definition.json`
- Markdown：`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md`
- 测试：`tests/engine/helpers/rerun-availability.test.mjs`（补 boundary 回归）、`tests/integration/md/iterative-interaction-contract.test.mjs`（确认不硬编码数字）
- 无 API / 依赖变化。

## Semantic-Precision Reflection

- 读者 / 有界问题：rerun 边界值是一个「gate definition 拥有的数字」，不是 spec 里的具名概念。本 change 只移动该数字，不新增 state / projection / status / concept / command / view。
- 必须保留的区别：`safe-remove`（仅限从未开工、无依赖、无历史 topic）与「已研究 topic 的剔除」（本 bundle 不支持，走新 bundle）是两个不同语义，Stage 2 不得再混写成一行 unsupported。
- 正常推理停止点：`rerun_count` 达到边界后，`rerun_count_valid` 报 `limit_reached`，进入「accept current / start new bundle」的用户决策边界，不再尝试绕过 gate 或重置计数。

## Authority Boundary

- user decision：达到上限时「接受当前结果 or 起新 bundle」由用户决定。
- Agent execution：改 definition 数值、修正 Markdown、跑回归测试是 Agent 的机械执行。
- Engine verdict：`evaluateRerunAvailability` 仍是唯一语义解释者（formal gate / HITL2 advice / post-final recovery 共用），不新增第二个数字或比较。
