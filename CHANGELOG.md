# Changelog

## v0.7

- Wave gates now support trace-durable degraded handoff for eligible repeated quality-threshold failures while runtime-truth blockers still fail closed.
- Retired historical content-similarity and URL-shape heuristics from active gates, health checks, playbooks, and Agent guidance in favor of ledger, provenance, hash, cache, and root-cause diagnostics.

## v0.6

- Runtime position and queue truth are more durable: `rb_status.json.current_node` records the loaded phase node, work-unit submit verifies queue postconditions before success, and explicit topic slugs unblock supplementary queue tasks with iteration labels.
- Repo-root `CHANGELOG.md` is the single version-history source, aligned with the `DPT_FRAMEWORK/RUN.md` banner.

## v0.5

- Autonomous work-unit return handling, provenance checks, cache evidence trails, phase-status diagnostics, and silent-execution surfacing logs were hardened around the v0.4 work-unit lifecycle.
- Wave guidance, inspect tools, and regression/playbook coverage were expanded for return-map diagnostics, premature final output detection, and cache/ledger consistency.

## v0.4

- Delegated sub-agent execution moved to the production work-unit lifecycle, with `queue_item_id` as queue demand identity and Engine-allocated `work_id` for delegated attempts.
- Phase handoff witnessing, HITL2/rerun routing, and controlled playbook coverage were tightened around route-bound `enter-phase` and source-gate `advance-status`.

## v0.3

- Agent-facing command surfaces made HITL-only interaction boundaries, terminal Final delivery, phase-boundary terminology, main-spec bridge deltas, and CLI exit-code conventions discoverable and regression-tested.

## v0.2

- Sub-agent relay logging and provenance forensics were introduced, with nonce-anchored lifecycle evidence, diagnostic gate guidance, and controlled E2E verdict records.

## v0.1

- 初始版本。DPT_FRAMEWORK 入口 `RUN.md` 支持 drag-trigger，Agent 读到即启动多阶段 gate 驱动的 Deep Research 流程。
