# Changelog

## v0.14

- Work-unit submit now has a read-only `operate-work-unit dry-submit` preflight that reports structured repair diagnostics and planned normalizations without ledger, queue, status, receipt, trace, log, transaction, or cache alias side effects.
- Wave0/Wave1 Sub-agent fetch guidance now separates per-URL fallback from multi-URL small-batch or bounded-parallel fetching, uses JS/Node-first tiers, and removes Python fetch fallback.
- Wave0/Wave1 phase guidance now derives delegated candidate targets from explicit profile/runtime floors plus a conservative planning margin, with gate repair/refill handling remaining gaps.

## v0.13

- Judgment-layer contracts now align Wave1 required-output role coverage, submit-time normalization diagnostics, and depth-review work-unit ref canonicalization across submit, gate, phase docs, and tests.
- Return-map navigation now requires evidence-bearing entries to enumerate concrete existing `reference/*.md` refs, keeps internal refs as secondary provenance, and labels inspect failures according to command pass/fail.
- Wave2 `00-cross` authority now has focused guards for submitted targeted evidence versus existing-backed Phase-owned projections, while active gate definitions are covered by a static rule-id audit.

## v0.12

- Work-unit claim now emits truthful `result.schema.json` projections for wave0/wave1/wave2, including const-bound identity, strict output/source item shapes, role enums, and omitted unsupported source fields.
- Submit now enforces assigned kind output-role contracts and required-result metadata before ledger append while preserving existing receipt/output/cache/source validation.
- Phase queue examples and hygiene now use schema-parsed `queue_item_id` task-card/result contracts, covering seed-topics and active phase Markdown drift.

## v0.11

- Repo-root agent behavior files now suppress built-in research shortcuts when `DPT_FRAMEWORK/` is the selected or relevant research entry path.
- New production and disposable bundles now use `BUNDLE_MAP.md` as the passive root map; legacy `START_FROM_HERE.md` is diagnostic compatibility only.
- Instantiation gate, inspect/reentry advice, file-observability, docs, and tests now use the bundle-map contract.

## v0.10

- Wave0/Wave1 delegated execution guidance now uses bounded top-up batch claims, active polling, submit/repair/terminalize loops, and drain-before-gate ordering for independent work units.
- Wave1 topic references and Wave2 existing-backed `00-cross` references are now Phase-owned consumer projections backed by submitted source/cache/degraded/work-unit evidence, while new fetched evidence remains ledger-bound.
- Gate, provenance, inspect, and file-observability diagnostics now distinguish projection backing drift, delegated bypass, missing index rows, and cache/source-claim mismatches.

## v0.9

- Work-unit submit now canonicalizes bounded LLM-shaped drift for result wrappers, runtime receipts, cache `page-content.md`, and constrained nonce repair while keeping ledger/receipt authority fail-closed.
- `operate-queue.mjs` and `operate-work-unit.mjs` now handle help and suspicious positional bundle arguments before runtime side effects, avoiding flag-named bundle directories.
- Phase handoff auditing and lifecycle gate coverage were hardened so failed or missing source-gate handoffs, manual status edits, and premature final files cannot authorize downstream delivery.

## v0.8

- Restored Wave1 depth contracts with per-topic depth reviews, exact new-source floors, structured source claims, supplementary repair loops, and cache-backed accepted source coverage.
- Restored Wave2 synthesis depth contracts with scan matrix, confidence triage, gap analysis, finding-index eligibility, and targeted evidence receipt checks before synthesis pass.

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
