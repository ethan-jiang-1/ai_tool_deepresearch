# Unified Work Unit Replacement Impact Map

> Created: 2026-07-06
> Status: active plan companion
> Companion principle doc: `_backlog/plans/unified-delegated-work-unit-pipeline.md`
> Intended OpenSpec change: `unify-delegated-work-unit-pipeline`

## Purpose

This document maps the gap between the current repository and the target work-unit mechanism. It is about what must change, where the change lands, and how to know the repository has stopped exposing two production delegated-work paths.

Target model:

```text
work unit = one delegated execution attempt envelope
submitted work unit = one delegated task completion
phase loop = many queue demand items allocated/submitted through work units
wave gate = aggregate validation over all submitted work units for that wave
```

The principle doc explains the mechanism. This impact map explains the replacement work needed to make active specs, framework code, docs, tests, and playbooks obey that mechanism.

## Scope Judgment

This is a large but bounded mechanism replacement.

It is large because the previous delegated-work path is not isolated to one CLI. It appears in accepted specs, the requirement registry, queue/ledger code, gate helpers, gate definitions, workflow phase docs, shared protocol docs, guidelines, regression tests, and controlled E2E playbooks.

It is bounded because the replacement does not rewrite the whole research system. The unchanged center remains:

- LLM Agent owns search judgment, evidence choice, writing, repair reasoning, and synthesis.
- Markdown/playbooks remain the Agent-facing control surface.
- JS/CLI remains deterministic authority for schema, state transition, receipt, trace, ledger, and gate checks.
- Wave0/Wave1/Wave2 remain distinct by task kind and gate coverage.

The risky state is a half-replacement: adding work units while active surfaces still instruct Agents, tests, or gates to use the old relay authority tokens. The acceptable end state is one production path.

There is also a secondary impact that the old-token scan does not capture: current queue semantics use `work_id` for queue demand items, current queue file shape exposes top-level `slot_NN` fields, and current lifecycle is centered on `slot_1_current`. The replacement must split `queue_item_id` from work-unit `work_id`, move active queue state to nested `rb_queue.json` v2 shape, add `delegated_in_flight`, claim only contiguous eligible delegated items from the queue front, and complete delegated attempts by `work_id`.

A second hidden impact is naming: current schema/spec language calls queue demand records "work units" in some places. That wording must be retired from active production queue docs. After the replacement, "work unit" means only the delegated execution-attempt envelope under `_work_units/waveN/{work_id}/`.

## Estimated Size And Boundary

This is a large but controllable change.

It is large in surface area because it crosses specs, queue state, ledger fields, gate helpers, Agent-facing Markdown, tests, playbooks, and guidelines. It is not a core research-workflow redesign. The LLM still owns research judgment, Markdown still controls Agent flow, and the Engine still owns deterministic state transitions.

The implementation size should be treated as a mechanism replacement, not a whole-system rewrite:

- Replace delegated-work allocation, submission, provenance, and gate coverage.
- Rewrite queue delegated state around nested `rb_queue.json` v2 and `delegated_in_flight`.
- Rewrite positive Agent guidance so only `operate-work-unit` is taught.
- Keep search, evidence judgment, writing, synthesis, and non-delegated main-agent queue work in their existing conceptual roles.
- Do not migrate historical run bundles as part of this change.
- Do not add speculative racing, background wakeup, or a second ledger in v1.

The risk is not that the change is unbounded. The risk is partial replacement: one layer adopts work units while another layer still treats relay slots, top-level queue slots, queue `work_id`, or filesystem presence as production authority.

## Current-State Inventory

Exact authority-token scan over active surfaces currently finds references in these areas:

| Surface | Files with exact token hits |
|---------|-----------------------------|
| `openspec/specs/` | 18 |
| `openspec/governance/` | 1 |
| `DPT_FRAMEWORK/` | 26 |
| `guidelines/` | 3 |
| `tests/` | 10 |
| `experiments_playbook/` | 28 |

Tokens scanned:

- `_subagents/wave_NN/slot_MM`
- `slot_result_ref`
- `drive-relay-slot`
- `subagent_slot_presence`

During the OpenSpec proposal/apply work, broader concrete paths such as `_subagents/wave_00/slot_00/result.json` must also be reviewed and removed or rewritten from active production surfaces.

The hygiene scan also needs semantic searches beyond exact tokens:

- concrete old relay paths such as `_subagents/wave_00/slot_00`, `_subagents/wave_01/slot_00`, and `_subagents/wave_02/slot_00`
- old gate checks such as `output_declaration_ledger_exists`, `output_declaration_coverage`, and `relay_bypass_suspected`
- production guidance that still uses `relay` as the delegated-work mechanism name
- queue schema/docs that use `work_id` as queue demand identity instead of work-unit attempt identity

### Main Specs Inventory

Accepted specs currently encode the old production path across multiple capabilities, including:

- `openspec/specs/agent-output-declaration/spec.md`
- `openspec/specs/agentic-queue/spec.md`
- `openspec/specs/cache-raw-web-content/spec.md`
- `openspec/specs/experiment-observability/spec.md`
- `openspec/specs/experiment-ref-integrity/spec.md`
- `openspec/specs/framework-engine/spec.md`
- `openspec/specs/gate-skeleton/spec.md`
- `openspec/specs/logger/spec.md`
- `openspec/specs/relay-provenance-gate/spec.md`
- `openspec/specs/research-wave-gate-implementation/spec.md`
- `openspec/specs/research-wave-phase-content/spec.md`
- `openspec/specs/subagent-collect/spec.md`
- `openspec/specs/subagent-directory-contract/spec.md`
- `openspec/specs/subagent-dispatch/spec.md`
- `openspec/specs/subagent-node-contract/spec.md`
- `openspec/specs/subagent-relay-driver/spec.md`
- `openspec/specs/wave1-intake/spec.md`
- `openspec/specs/wave2-synthesis/spec.md`

These paths are an inventory of accepted-spec surfaces affected by the replacement. They are not an instruction to hand-edit `openspec/specs/` directly.

OpenSpec discipline is part of the cleanup strategy:

- The change must first express every accepted-spec replacement through delta specs under `openspec/changes/unify-delegated-work-unit-pipeline/specs/**/spec.md`.
- Delta specs must explicitly remove or rewrite production requirements that bind delegated work to relay slots, slot result references, relay stage/commit/merge, or slot-presence gate checks.
- `openspec/specs/` becomes clean only through archive/sync after the change is implemented and accepted.
- The final main specs should be the single source of truth and should not retain obsolete production wording for historical context.

Delta spec coverage should be planned before apply:

- `agentic-queue`: rename queue demand identity to `queue_item_id`, define nested `rb_queue.json` v2, front-contiguous delegated claim, `delegated_in_flight`, phase drain, and non-delegated `operate-queue` boundary.
- `framework-engine`: define `operate-work-unit` CLI, Engine-owned allocation, bundle lock, transaction journal, inspect behavior, terminal attempt commands, and file-based submit.
- `agent-output-declaration`: preserve bundle-root `rb_output_declarations.jsonl` as the only submission ledger while replacing relay fields with work-unit fields.
- `relay-provenance-gate` / `research-wave-gate-implementation` / `gate-skeleton`: replace old gate checks with work-unit checks and ledger-first coverage.
- `subagent-*` capabilities: replace relay directory/dispatch/collect/node contracts with work-unit directory, task, receipt, beacon, and submit contracts.
- `research-wave-phase-content`: rewrite Wave0/Wave1/Wave2 phase wording around the queue-drain work-unit loop.
- `experiment-observability` / `logger`: add work-unit event family and remove old relay event authority.
- `cache-raw-web-content` / `experiment-ref-integrity`: bind cache trails and output references to submitted work-unit ledger rows.

Delta specs must not add work units as an alternative. They must use `MODIFIED` / `REMOVED` requirements so accepted specs converge to one production delegated-work path after archive/sync.

### Requirement Registry

`openspec/governance/req-registry.yaml` contains requirement IDs whose accepted text names the old production path, including dispatch, collect, node-contract, and directory-contract requirements. The OpenSpec change must update, replace, or remove those registry entries so requirement IDs no longer certify the old path.

### Framework Engine And CLI

Current active framework surfaces include:

- `DPT_FRAMEWORK/cli/drive-relay-slot.mjs`
- `DPT_FRAMEWORK/cli/operate-queue.mjs`
- `DPT_FRAMEWORK/cli/check-reentry.mjs`
- `DPT_FRAMEWORK/cli/validate-subagent-logging-contract.mjs`
- `DPT_FRAMEWORK/engine/subagent-relay-stage.mjs`
- `DPT_FRAMEWORK/engine/queue-manager-ledger.mjs`
- `DPT_FRAMEWORK/engine/queue-manager-lifecycle.mjs`
- `DPT_FRAMEWORK/engine/queue-manager-core.mjs`
- `DPT_FRAMEWORK/engine/queue-manager-render.mjs`
- `DPT_FRAMEWORK/COMMANDS.md`
- `DPT_FRAMEWORK/CHANGELOG.md`

The replacement needs a new `operate-work-unit` production path and must remove active demand for the old CLI from production docs and tests. Old implementation files should be deleted or rewritten during apply. They must not remain as production entry points, inert historical references, or examples that future Agents can copy.

`operate-queue` remains valid for non-delegated main-agent queue work, but it must no longer be the delegated sub-agent completion authority. Its topic-slug fallback parsing, projection rendering, count/check output, repair behavior, and `complete` path all need review because they currently assume queue demand identity is named `work_id`, expose top-level slot semantics, and route delegated completion through queue completion.

### Gate Helpers And Gate Definitions

Current gate-related surfaces include:

- `DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs`
- `DPT_FRAMEWORK/engine/helpers/file-observability.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs`
- `DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json`
- `DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json`

These surfaces must stop scanning or accepting old sub-agent directories and slot result fields as gate authority. Gate definitions should express work-unit checks:

- `work_unit_ledger_exists`
- `work_unit_output_coverage`
- `work_unit_submission_presence`
- `delegated_bypass_suspected`

Existing production check names that encode the old path must be rewritten or removed:

- `output_declaration_ledger_exists`
- `output_declaration_coverage`
- `subagent_slot_presence`
- `relay_bypass_suspected`

Gate pass must start from matching `rb_output_declarations.jsonl` rows written by `operate-work-unit submit`, then cross-check those rows against `_work_units/_index.json`, manifest, result, runtime receipt, beacon nonce, output files, cache trails, and hashes. The index, manifest, receipt, beacon, and filesystem outputs are verification surfaces; they are not independent coverage sources. Filesystem scans remain diagnostic only.

### Workflow Phase And Shared Markdown

Current Agent-facing workflow docs still teach the old path:

- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md`
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-anti-cheating-rules.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-source-intake.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-topic-scout.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-evidence-extractor.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-claim-verifier.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-source-diagnostic.md`

These are high-risk because they are directly read by Agents. They must say, consistently, that the Phase Agent drains delegated work through `operate-work-unit claim/submit/inspect`, then runs the wave gate after the phase queue is drained.

### Guidelines

Guidelines currently carrying old production wording include:

- `guidelines/agentic-subagent-mechanism.md`
- `guidelines/agentic-queue-mechanism.md`
- `guidelines/agentic-execution-model.md`

Guidelines should explain only the accepted one-path model after the change. They should not preserve obsolete operational recipes as alternate guidance.

### Tests

Regression tests with active old-token references include:

- `tests/engine/helpers/file-observability.test.mjs`
- `tests/engine/helpers/gate-helpers-provenance.test.mjs`
- `tests/engine/helpers/ref-count.test.mjs`
- `tests/engine/queue-manager-delegated.test.mjs`
- `tests/engine/queue-manager-logging.test.mjs`
- `tests/integration/cli/check-gate-wave0-complete.test.mjs`
- `tests/integration/cli/check-gate-wave1-complete.test.mjs`
- `tests/integration/cli/drive-relay-slot.test.mjs`
- `tests/integration/cli/exit-code-convention.test.mjs`
- `tests/integration/md/subagent-logging-contract.test.mjs`

These tests should be rewritten around work-unit claim/submit, work-unit ledger fields, and gates that reject direct/orphan artifacts without consulting old sub-agent paths.

### Experiments And Playbooks

Controlled E2E playbooks include old production wording and fixtures across system logging, evidence extraction, wave gates, wave chain, engine boundary, file observability, subagent, handoff witnessing, and Wave0/Wave1/Wave2 cases.

The playbook layer should be replaced with cases that prove:

- Multiple work units are drained in a phase loop.
- Wave gates aggregate submitted work-unit coverage.
- Gate failure enqueues repair/refill work units and returns to the same loop.
- No mixed provenance path is accepted.

## Replacement Map

| Current active surface | Target surface | Required action |
|------------------------|----------------|-----------------|
| `_subagents/wave_NN/slot_MM` as delegated authority | `_work_units/waveN/{work_id}/` | Rewrite runtime directory contracts, task prompts, receipts, docs, tests, and playbooks. |
| `drive-relay-slot stage/commit/merge` | `operate-work-unit claim/submit/fail/timeout/abandon/inspect` | Add the new CLI and remove active production demand for the old CLI. |
| `slot_result_ref` | `work_unit_ref`, `result_ref`, `runtime_receipt_ref` | Change ledger schema, queue completion validation, gate helpers, fixtures, and test assertions. |
| `subagent_slot_presence` | `work_unit_submission_presence` | Change gate definitions and gate helper implementations. |
| Relay commit followed by separate queue complete | Atomic `operate-work-unit submit` | Make submit validate receipt/result/outputs/cache, complete queue, and append ledger in one transaction. |
| Invalid delegated completion as queue failure | Non-terminal `submit` rejection with `last_submit_rejection` | Keep the attempt `claimed`, write no ledger, and allow corrected submit unless Main Agent explicitly fails/timeouts/abandons. |
| Per-slot collection/merge as production happy path | Ledger aggregation by `work_id`, `wave`, and `kind` in `rb_output_declarations.jsonl` | Move gate authority to successful work-unit submission ledger coverage; do not introduce a second production ledger in v1. |
| Queue demand identity named `work_id` | Queue demand identity named `queue_item_id` | Rename schema/spec/docs/tests so `work_id` means only a delegated execution attempt. |
| Top-level `slot_NN` / `slot_1_current` queue target shape | Nested `rb_queue.json` v2: `active_window`, `refill_pool`, `delegated_in_flight`, `terminal_history` | Rewrite queue lifecycle, projection, inspect, count, repair, and CLI tests. |
| `QueueWorkUnitSchema` as queue-item naming | Queue item / queue demand schema naming | Remove active wording that calls queue demand records "work units". |
| `_index.json` or filesystem presence as pass evidence | `rb_output_declarations.jsonl` rows as gate coverage | Keep index/filesystem as cross-check surfaces only. |
| Phase docs that teach relay lifecycle | Phase docs that teach queue-drain work-unit loop | Rewrite Wave0/Wave1/Wave2 and shared protocol language. |

## New Work-Unit Surfaces To Add

The OpenSpec change should introduce or rewrite specs for:

- Delegated work-unit pipeline capability.
- Work-unit directory contract.
- Work-unit ID allocator, validator, and `_work_units/_index.json` allocation registry.
- Work-unit index schema with counters, kind registry, per-work-unit records, lease/deadline fields, terminal status counts, and inspect projection.
- Work-unit transaction journal and bundle-scoped lock semantics.
- Work-unit manifest/result/receipt schema, including `timeout_ms`, `claimed_at`, `deadline_at`, optional `last_observed_at`, and optional opaque `runtime_refs`.
- Work-unit receipt nonce and beacon binding.
- Work-unit task and beacon wording that tells sub-agents the lease/deadline and keeps `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` bound in every observable artifact.
- Nested `rb_queue.json` v2 shape with ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and queue demand `terminal_history`.
- Queue item snapshot hashing that excludes transient scheduling/runtime fields.
- `operate-work-unit` CLI behavior, including `claim`, `submit`, `fail`, `timeout`, `abandon`, and `inspect`.
- Queue-front claim semantics, including contiguous eligible delegated claims, `claimed_work_ids`, `blocked_by_queue_item_id`, and `phase_drained`.
- Non-terminal submit rejection semantics with `last_submit_rejection`.
- Idempotency and fingerprint semantics using `result_hash` and `ledger_record_hash`.
- Timeout-then-retry semantics for sub-agents that do not return.
- Work-unit ledger declaration semantics in bundle-root `rb_output_declarations.jsonl`; no `_work_units/_ledger.jsonl` or second production submission ledger in v1.
- Wave gate coverage semantics.
- Agent-facing phase loop language.
- Hygiene checks that block active old production tokens.

Framework implementation likely needs:

- `DPT_FRAMEWORK/cli/operate-work-unit.mjs`
- Work-unit engine helper(s) for claim, submit, inspect, and atomic queue+ledger mutation.
- Work-unit index helper(s) for `_work_units/_index.json` counters, allocation records, lease/deadline tracking, status updates, terminal reason storage, and inspect summaries.
- Queue helper(s) for nested v2 shape, ordered active-window compaction/refill, `delegated_in_flight`, out-of-order submit, non-terminal submit rejection, idempotent submit, expired in-flight detection, timeout recovery, and recovery diagnostics.
- Filesystem transaction helper(s) for lock, temp+rename writes, and `_work_units/_transactions/` recovery.
- Ledger append helper(s) that write successful work-unit submissions to bundle-root `rb_output_declarations.jsonl` and reject any attempt to use `_work_units/_ledger.jsonl` as production coverage.
- Result schemas for first-version work-unit kinds.
- Gate helper rewrites to consume work-unit ledger coverage.
- Updated gate definition JSON.
- Updated validation for workflow MD and accepted spec hygiene.
- Logging/trace event updates for `work_unit_claimed`, `work_unit_submitted`, `work_unit_failed`, `work_unit_timed_out`, `work_unit_retry_claimed`, `work_unit_late_submit_rejected`, `work_unit_abandoned`, `work_unit_batch_opened`, `work_unit_ledger_appended`, and `work_unit_inspect_failed`.
- File-observability updates so `_work_units/waveN/{work_id}/` is the known production runtime path and `_subagents/...` is not a valid production explanation path.
- Inspect projection updates that surface expired in-flight attempts without treating them as complete or automatically repairing them.
- Tests for queue v2 shape, contiguous front claim, lease expiry, timeout recovery, non-terminal submit rejection, late submit rejection, retry allocation, and runtime-ref opacity.

## Queue, Ledger, And Gate Semantic Changes

Queue:

- A delegated queue demand item has `queue_item_id`; a claimed delegated attempt has `work_id`.
- Queue schema/spec naming must stop calling queue demand items "work units"; "work unit" is reserved for delegated execution attempts.
- `rb_queue.json` target shape is v2 and nested: ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`. Top-level `slot_NN` fields are not the target production shape.
- `active_window` is the queue front. `claim --count N` may claim only a contiguous prefix of eligible delegated queue items and must stop at the first non-delegated, wrong-phase, expired, blocking, or otherwise ineligible item.
- Claim response must include `requested_count`, `claimed_count`, `claimed_work_ids`, `in_flight_count`, `unclaimed_delegated_count`, `blocked_by_queue_item_id`, and `phase_drained`.
- `phase_drained=true` only when the target phase has no unclaimed delegated queue demand items and no non-terminal or expired delegated in-flight attempts.
- A delegated queue item maps to one claimed work unit per execution attempt; timeout/retry and repair/refill both create a new `work_id`.
- Queue state must add `delegated_in_flight` keyed by `queue_item_id`; claim moves delegated demand items there before returning prompts.
- `delegated_in_flight` entries must record `work_id`, `wave`, `batch_id`, `kind`, `attempt_index`, `queue_item_snapshot_hash`, `claimed_at`, `timeout_ms`, `deadline_at`, and optional `last_observed_at`.
- A `queue_item_id` must appear in exactly one active queue location: `active_window`, `refill_pool`, `delegated_in_flight`, or terminal history.
- `queue_item_snapshot_hash` must hash the canonical queue demand content and exclude queue location, status, timestamps, attempt refs, runtime refs, and other transient scheduling fields.
- Claim creates the runtime envelope, assigns the canonical `work_id`, and marks the queue binding as in flight through deterministic state.
- `work_id` uses three-digit `batch_index` (`b000`, `b001`, ...) and four-digit `claim_index` (`i0001`, `i0002`, ...).
- `b000` is initial drain; `b001+` opens only after gate failure or explicit refill. Ordinary claims and timeout retry inside a drain do not change batch.
- Timeout retry of a still-valid queue demand stays in the current batch, gets the next `claim_index`, creates a new `work_id`, and increments `attempt_index`.
- Gate-failure or explicit refill opens `b001+`, records `batch_reason`, and starts a new batch-local `claim_index` sequence.
- `_work_units/_index.json` is the Engine-owned allocation registry; it records counters and every assigned work-unit binding.
- `_work_units/_index.json` must be schema-validated; inspect must flag counter drift, status-count drift, duplicate bindings, or mismatches between encoded `work_id`, index entry, manifest, queue ref, and ledger.
- `status_counts` and `inspect_projection` must be derived from `work_units`; cached projection drift is an inspect failure.
- `work_id` allocation is atomic under the queue/work-unit lock so sequential and batched claims cannot collide.
- Future parallel fan-out uses `operate-work-unit claim --count N`; the Main Agent receives N registered prompts and sub-agents never allocate IDs.
- Delegated submit completes by `work_id` / `queue_item_id` binding and must not depend on `slot_1_current` being the only completable item.
- Invalid `submit` is a non-terminal rejection. It leaves the attempt `claimed`, records `last_submit_rejection`, writes no ledger row, and allows corrected submit unless Main Agent explicitly invokes `fail`, `timeout`, or `abandon`.
- Failed, timed-out, or abandoned attempts leave the queue item uncompleted, append no ledger, leave inspectable terminal attempt status, and require a new `work_id` for retry/replacement.
- Repeating a terminal command against the same `work_id`, same terminal status, and same reason is idempotent; terminal commands against `submitted` or a different terminal status/reason fail closed.
- Attempt terminal status lives in `_work_units/_index.json`, not as queue demand completion. Queue terminal history is only for completed or permanently closed demand; retryable failure/timeout/abandon returns the demand to queue or replacement flow.
- Projection and inspect must show expired in-flight attempts. Expiry alone is diagnostic; it does not complete the queue item, append ledger, or mutate state.
- Phase drain is blocked while expired in-flight attempts remain unresolved. The Main Agent must resolve them through `submit`, `timeout`, `fail`, or `abandon` before the wave gate can run.
- Timeout recovery returns the bound demand to the queue or Engine-approved replacement flow before a new `work_id` is allocated.
- Re-claim after timeout increments `attempt_index` for the same `queue_item_id`, unless repair/refill creates a new queue item with explicit lineage.
- Version 1 does not support first-valid-submit-wins racing. A stale attempt must be marked `timed_out` or `abandoned` before equivalent work is re-claimed.
- Coding-agent native IDs, thread IDs, session IDs, spawn request IDs, and cancel handles are stored only as optional opaque `runtime_refs`. They support diagnosis or best-effort cancellation but never gate authority.

Secondary queue impacts not found by old relay token search:

- Accepted queue specs and queue schema currently use `work_id` as the queue item identifier; they must migrate to `queue_item_id` for demand identity and reserve `work_id` for delegated attempts.
- Current `QueueWorkUnitSchema` naming is misleading under the target model; active schema/spec/docs should rename or clearly replace it with queue item/demand terminology.
- Existing queue lifecycle only claims/completes `slot_1_current`; `claim --count N` changes active-window, promotion, refill, projection, inspect, and CLI test expectations for delegated work.
- Active window promotion/refill must support removing multiple delegated queue items into `delegated_in_flight` in one transaction.
- `operate-queue.mjs` topic slug fallback, count output, projection output, repair removal, and validation paths currently inspect `work_id`; those need migration to `queue_item_id` or explicit non-delegated scope.
- `check-reentry.mjs` currently derives phase from queue `work_id` prefix; it must use queue item metadata such as `phase`, `producer_rule`, `payload`, or manifest/index binding instead.
- Existing `complete()` current-only invariant must be replaced or bypassed for `operate-work-unit submit` so out-of-order delegated returns complete the correct binding.
- `operate-queue complete` must reject delegated sub-agent completion after replacement; delegated completion belongs to `operate-work-unit submit`.
- Existing queue tests that assume only `slot_1_current` can be running must be rewritten or explicitly scoped to non-delegated sequential queue behavior.
- Existing queue projections, queue health, inspect, and pending counts must show unclaimed delegated demand items, non-terminal `delegated_in_flight` work units, and expired in-flight attempts so the Agent can decide whether the phase is drained or requires timeout recovery.

Ledger:

- The canonical production work-unit submission ledger remains bundle-root `rb_output_declarations.jsonl`.
- Version 1 must not add `_work_units/_ledger.jsonl` or any second production submission ledger. `_work_units/_index.json` is allocation and attempt-state authority, not gate coverage authority.
- Ledger rows are emitted only by successful `operate-work-unit submit`.
- Invalid submit, `fail`, `timeout`, and `abandon` append no ledger row.
- Ledger rows contain `work_id`, `queue_item_id`, `wave`, `kind`, `producer_rule`, `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `output_files`, `cache_trails`, `creation_reason`, `result_hash`, and `ledger_record_hash`.
- Ledger rows must not contain old relay production fields such as `slot_result_ref`.
- Each successful `work_id` may have only one ledger row. Same-content duplicate submit is idempotent and appends no duplicate row; different-content duplicate submit fails closed.

Gate:

- Gate coverage comes only from matching Engine-written work-unit rows in `rb_output_declarations.jsonl` for the target wave.
- Gate cross-checks each counted row against `_work_units/_index.json`, manifest, result, runtime receipt, beacon, output files, cache trails, `result_hash`, and `ledger_record_hash`.
- `_work_units/_index.json`, manifest, result, receipt, beacon, and output files are necessary cross-check surfaces, but none of them can provide pass coverage without a matching ledger row.
- Gate does not scan old sub-agent directories as authority.
- Gate does not accept hand-written ledger rows, filesystem-only artifacts, old relay artifacts, `_index.json`-only submitted status, or index/manifest/result/receipt/beacon/hash mismatch as pass evidence.
- Gate check names migrate to `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`.
- Gate fail can create repair/refill queue items, which become new work units in the same loop.

External runtime boundary:

- Coding-agent platform IDs are optional diagnostics, not work-unit identity.
- Engine authority must not depend on whether a platform-specific cancellation request succeeds.
- Runtime refs can be absent at claim time and filled later from submit, receipt import, timeout, fail, or abandon diagnostics. Read-only `inspect` reports runtime refs but does not fill them.
- Gate checks must ignore runtime refs except when using them to explain diagnostics; the pass authority remains Engine-written work-unit ledger coverage.

## Phase Loop Wording To Update

All active Agent-facing phase docs should converge on this wording:

```text
1. Claim the queue-front delegated demand item with operate-work-unit claim, or claim a contiguous queue-front batch with operate-work-unit claim --count N.
2. Spawn synchronous bounded sub-agents from the generated work-unit task(s).
3. Submit each sub-agent result with operate-work-unit submit --work-id <id>; submits may arrive out of order.
4. If submit validation fails, correct the result/receipt/output bundle and retry submit, or explicitly close the attempt with fail, timeout, or abandon.
5. Resolve expired in-flight attempts with submit, timeout, fail, or abandon; expired attempts still block drain until resolved.
6. Repeat until the phase has no unclaimed delegated queue demand items and no non-terminal or expired delegated in-flight attempts.
7. Run the wave gate over aggregate submitted work-unit rows in rb_output_declarations.jsonl.
8. If the gate fails, enqueue repair/refill queue items and repeat the same loop.
```

This makes the difference clear:

- Work-unit submit proves one delegated execution attempt succeeded and completed its bound `queue_item_id`.
- Invalid submit proves nothing; it only records `last_submit_rejection` diagnostics while the attempt remains `claimed`.
- Phase drain proves there are no unclaimed delegated queue demand items and no non-terminal or expired delegated in-flight attempts for the phase.
- Wave gate proves the aggregate submitted ledger coverage is acceptable.

## Sequencing

1. Create the OpenSpec proposal, design, delta specs, and tasks first.
2. Define the target `rb_queue.json` v2 shape, ID split, work-unit index schema, queue-front contiguous claim semantics, lease/deadline fields, and delegated in-flight queue semantics before implementation.
3. Define receipt nonce/beacon binding, runtime-ref opacity, transaction journal, lock, `_work_units/_index.json` derivation checks, and idempotent submit fingerprints.
4. Define the submit state machine, including file-based result input, non-terminal validation rejection, `last_submit_rejection`, successful queue completion, and exactly-one `rb_output_declarations.jsonl` ledger append.
5. Define fail/timeout/abandon terminal attempt semantics, timeout-then-retry flow, same-batch retry behavior, gate/refill batch opening, and work-unit hash/fingerprint fields.
6. Write delta specs that replace accepted spec intent so old relay authority is not preserved as a production option; do not hand-edit main specs directly.
7. Rename queue demand identity from `work_id` to `queue_item_id` across queue schema/spec/docs, and reserve `work_id` for work-unit attempts.
8. Add `operate-work-unit claim/submit/fail/timeout/abandon/inspect`, work-unit index helpers, queue v2 helpers, queue-front claim helpers, active-window compaction/refill, and queue binding transactions.
9. Switch ledger append to bundle-root `rb_output_declarations.jsonl`, switch gate helpers to work-unit-only fields and new check names, and ensure gates treat index/manifest/result/receipt/beacon/output files as cross-check surfaces only.
10. Rewrite Wave0/Wave1/Wave2 phase docs and shared protocol docs around the phase loop, including invalid-submit correction and timeout recovery.
11. Replace regression tests and controlled E2E playbooks, including queue current-only assumptions and any `_subagents` fixtures.
12. Add hygiene checks for specs/docs/framework/tests/playbooks.
13. Archive/sync delta specs into main specs only after active production surfaces expose exactly one delegated-work path and hygiene checks pass.

## Test Plan Additions

- Queue v2 schema tests prove `active_window`, `refill_pool`, `delegated_in_flight`, and `terminal_history` are the active locations, and a `queue_item_id` cannot appear in more than one active location.
- Queue naming tests and fixtures use `queue_item_id` for demand identity; active delegated tests do not use queue `work_id` as demand identity.
- `claim --count 3` claims only contiguous eligible queue demand items from the queue front, moves them to `delegated_in_flight`, creates three work-unit envelopes, records all as `claimed`, returns three prompts, and reports `claimed_work_ids`.
- `claim --count N` stops before a non-delegated, wrong-phase, expired, blocking, or otherwise ineligible queue-front item and reports `blocked_by_queue_item_id`; it does not skip ahead unless a future accepted spec explicitly allows reordering.
- `claim --count N` with fewer than N eligible items returns a partial success; `claimed_count: 0` performs no mutation and reports `phase_drained` from queue plus in-flight state.
- Two-digit batch IDs such as `wu-w0-b00-src-i0001` fail validation; three-digit batch IDs such as `wu-w0-b000-src-i0001` pass.
- `_index.json` schema tests prove counters, `kind_counts`, `status_counts`, `inspect_projection`, encoded `work_id`, manifest refs, path refs, queue refs, and ledger refs all agree.
- Snapshot hash tests prove `queue_item_snapshot_hash` changes when semantic queue demand content changes and does not change for queue location, status, timestamps, runtime refs, or attempt refs.
- Out-of-order `submit --work-id <id>` completes the correct `queue_item_id`, updates index, appends exactly one `rb_output_declarations.jsonl` row, removes the in-flight binding, and leaves other in-flight work units untouched.
- Invalid submit leaves the attempt `claimed`, records `last_submit_rejection`, writes no ledger row, does not complete the queue item, and allows corrected submit.
- Duplicate submit with identical content is idempotent and appends no second ledger row; duplicate submit with different content fails closed.
- Failed, timed-out, or abandoned attempts do not complete the bound `queue_item_id` and do not append ledger; retry or repair/refill allocates a new `work_id`.
- Repeating a terminal command with the same status and reason is idempotent; terminal command against `submitted` or a different terminal status/reason fails closed.
- A claimed work unit with expired `deadline_at` is reported stale/expired by read-only `inspect` without state mutation.
- `operate-work-unit timeout` marks the old attempt `timed_out`, removes it from `delegated_in_flight`, records terminal reason/runtime refs when available, and appends no ledger.
- Re-claim after timeout allocates a distinct `work_id` with incremented `attempt_index` for the same `queue_item_id`, or explicit lineage for a replacement queue item.
- Timeout retry in the same drain stays in the current batch; gate-failure or explicit refill opens `b001+` with `batch_reason`.
- Late submit from a timed-out, failed, or abandoned `work_id` fails closed and emits/records `work_unit_late_submit_rejected`.
- Retry submit succeeds through the new `work_id` and completes the original `queue_item_id` binding when the demand was requeued unchanged.
- Runtime refs may be absent, partial, or platform-specific without affecting submit/gate authority.
- Receipt nonce mismatch, beacon mismatch, manifest/index mismatch, stale queue snapshot hash, uncommitted transaction journal, orphan work-unit directory, bad status counts, projection drift, and ledger/index mismatch fail inspect.
- Gates reject filesystem-only artifacts, old `_subagents` artifacts, hand-written ledger rows, `_index.json`-only submitted status, stale index/manifest/result/receipt/beacon mismatch, duplicate submit mismatch, and `_work_units/_ledger.jsonl` coverage.
- Queue tests that depend on current-only completion are rewritten or scoped to non-delegated sequential queue behavior.
- Hygiene tests prove active specs/docs/framework/tests/playbooks expose only the work-unit production path.

## Final Hygiene Requirement

Active specs, requirement registry entries, framework code/docs, workflow phase docs, guidelines, tests, and controlled E2E playbooks must contain zero production references to:

- `_subagents/wave_NN/slot_MM`
- `slot_result_ref`
- `drive-relay-slot`
- `subagent_slot_presence`
- concrete `_subagents/wave_00/slot_00`-style paths
- old production gate checks `output_declaration_ledger_exists`, `output_declaration_coverage`, and `relay_bypass_suspected`

Old terms may survive only in archived/backlog failure notes or in explicit cleanup/hygiene plans that identify what must be removed. They must not survive in active guidance, accepted requirements, executable gates, runtime docs, or tests as valid production behavior.

Semantic hygiene also requires:

- `work_id` means work-unit execution attempt in active production docs/specs/tests.
- Queue demand identity is named `queue_item_id`.
- Active queue docs/specs/tests do not call queue demand items "work units".
- Active production docs/tests do not use queue item identity as delegated provenance.
- Active production docs/tests do not expose top-level `slot_NN` queue shape as the target delegated queue model.
- Active production docs/tests do not describe `slot_1_current` as the completion authority for delegated work-unit submit.
- Active production docs/tests do not describe `_work_units/_ledger.jsonl` as a production submission ledger.
- Active production docs/tests do not imply invalid submit terminalizes the attempt automatically.
- Active production docs/tests do not treat `_work_units/_index.json`, manifest, result, receipt, beacon, or filesystem presence as pass coverage without `rb_output_declarations.jsonl`.
- Active production docs/tests do not use `relay` as the name of the production delegated-work mechanism.

The final validation should include:

```bash
rg -n "_subagents/wave_NN/slot_MM|_subagents/wave_[0-9]{2}/slot_[0-9]{2}|slot_result_ref|drive-relay-slot|subagent_slot_presence|output_declaration_ledger_exists|output_declaration_coverage|relay_bypass_suspected|_work_units/_ledger\\.jsonl" \
  openspec/specs openspec/governance DPT_FRAMEWORK guidelines tests experiments_playbook
```

The final semantic validation should also search for active production wording that keeps `QueueWorkUnitSchema`, queue-item `work_id`, top-level `slot_NN` queue shape, `slot_1_current` delegated completion, invalid-submit terminalization, or `relay` as current delegated-work guidance. The expected result after the replacement is no active production hits.
