## Context

This change replaces the current relay-based delegated sub-agent production path with one work-unit path:

```text
queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate
```

The current system splits delegated completion across queue state, relay slot directories, runtime receipts, relay commit/merge, queue completion, output ledger declarations, and gate provenance. That split made the Phase Agent interpret whether several partial surfaces meant "delegated work is done." The replacement pushes that interpretation back into the Engine: `operate-work-unit submit` is the only successful delegated completion transition, and wave gates read successful work-unit ledger coverage.

The main constraints are:

- OpenSpec delta specs define the accepted-spec replacement. Main specs are not hand-edited during propose/apply.
- The Engine owns schemas, state transitions, receipts, trace, ledger append, and gate checks.
- The LLM Agent owns research judgment, search/read/write behavior, repair reasoning, and synthesis.
- Markdown remains the Agent-facing flow/control surface.
- No dependencies are added; implementation remains Node.js ESM with built-ins, `zod`, and `yaml`.
- Historical run bundles are not migrated by this change.

## Goals / Non-Goals

**Goals:**

1. Expose exactly one production delegated-work path in active specs, framework docs, runtime docs, phase docs, tests, and playbooks.
2. Split queue demand identity (`queue_item_id`) from delegated execution attempt identity (`work_id`).
3. Replace top-level slot/current delegated completion with nested queue v2: `active_window`, `refill_pool`, `delegated_in_flight`, and `terminal_history`.
4. Add Engine-owned work-unit allocation and attempt state in `_work_units/_index.json`.
5. Add `operate-work-unit claim/submit/fail/timeout/abandon/inspect` as the delegated CLI boundary.
6. Keep `rb_output_declarations.jsonl` as the only production submission ledger, with work-unit-only provenance fields.
7. Make gates ledger-first: successful work-unit ledger rows provide coverage; index/manifest/result/receipt/beacon/files provide cross-checks.
8. Support future parallel fan-out through `claim --count N` without allowing sub-agents or multiple schedulers to allocate IDs.
9. Add lease/deadline timeout recovery for sub-agents that do not return.
10. Add hygiene checks so old relay authority tokens cannot remain in active production guidance.
11. Align release surfaces for the mechanism change as `v0.3 -> v0.4`.
12. Give the new delegated-work mechanism a clean accepted-spec home through `delegated-work-units`, rather than leaving the work-unit concept only as patches inside old relay/sub-agent capability names.

**Non-Goals:**

- No migration of historical `dpt_rb_*` bundles.
- No second production ledger such as `_work_units/_ledger.jsonl` in v1.
- No first-valid-submit-wins speculative racing in v1.
- No background wakeup system or durable external sub-agent orchestration.
- No JS replacement for research judgment, evidence selection, synthesis, or repair strategy.
- No preservation of the old relay as a production route.

## Decisions

### Decision 1: Replace relay authority, do not add a parallel path

The target production path is one path:

```text
queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate
```

Old relay surfaces are removal targets in active production guidance: `_subagents/wave_NN/slot_MM`, `slot_result_ref`, `drive-relay-slot`, and `subagent_slot_presence`.

Alternative considered: keep relay and work units side by side while gates accept either. Rejected because the primary failure is ambiguity across multiple authority surfaces. A mixed state would preserve the problem and keep teaching future Agents two plausible ways to complete delegated work.

### Decision 2: Queue item and work unit are separate identities

`queue_item_id` identifies the demand item: what the phase says needs work.

`work_id` identifies one Engine-allocated delegated execution attempt for that demand.

This split prevents the queue from using the same field for demand identity and attempt identity. Queue records and docs should call demand records "queue items" or "queue demand items"; "work unit" is reserved for `_work_units/waveN/{work_id}/`.

Alternative considered: keep queue `work_id` and add an attempt ID elsewhere. Rejected because active specs/code already overloaded `work_id`; keeping that overload would make `claim`, `submit`, ledger, and gate semantics harder to audit.

### Decision 3: Queue v2 owns demand location; index owns attempt state

Target `rb_queue.json` v2:

```text
active_window        ordered queue-front window of unclaimed demand
refill_pool          ordered overflow demand
delegated_in_flight  demand currently bound to one non-terminal delegated attempt
terminal_history     completed or permanently closed queue demand
```

`delegated_in_flight` is keyed by `queue_item_id`. A `queue_item_id` must appear in exactly one active location: `active_window`, `refill_pool`, `delegated_in_flight`, or terminal history. Attempt statuses such as `failed`, `timed_out`, and `abandoned` are work-unit statuses, not queue demand completion.

Alternative considered: keep current slot-shaped queue and attach work units to slots. Rejected because current-only slot completion is the mechanism that makes out-of-order returns and parallel fan-out brittle.

### Decision 4: `work_id` is structured but `_index.json` is allocation truth

Canonical format:

```text
wu-w{wave}-b{batch_index}-{kind_code}-i{claim_index}
```

Validation regex:

```text
^wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4}$
```

The directory path is `_work_units/waveN/{work_id}/`, where `waveN` must match the encoded wave and manifest.

`b000` is the initial phase-drain batch. `b001+` opens only after gate failure or explicit refill. Ordinary claims in the same drain increment `claim_index`, not `batch_index`. Timeout retry of the same still-valid demand stays in the current batch by default and receives a new `work_id` with a higher `claim_index` and higher `attempt_index`.

`_work_units/_index.json` stores counters, kind registry, work-unit records, leases, runtime refs, status counts, and inspect projections. Status counts and projections are derived caches; `inspect` fails them if they disagree with `work_units`.

Alternative considered: opaque UUID-only IDs. Rejected because this system benefits from human-readable troubleshooting and batch/kind clues during long Agent runs. The manifest and index remain the structured authority when encoded hints disagree.

### Decision 5: `claim --count N` is an in-flight allocation transaction

`claim --count N` claims up to N contiguous eligible delegated queue items from the front of `active_window`. It does not skip a non-delegated, blocking, wrong-phase, expired, or otherwise ineligible queue-front item. It creates work-unit envelopes, moves demand into `delegated_in_flight`, writes leases, updates `_index.json`, compacts/refills the active window, and returns prompts.

The response includes:

- `requested_count`
- `claimed_count`
- `claimed_work_ids`
- `in_flight_count`
- `unclaimed_delegated_count`
- `blocked_by_queue_item_id`
- `phase_drained`

`phase_drained=true` only when the phase has no unclaimed queue demand and no non-terminal or expired delegated in-flight attempt.

Alternative considered: `claim --count N` only prints prompts while leaving queue state unchanged. Rejected because prompt-only fan-out has no deterministic in-flight authority and would recreate the relay ambiguity.

### Decision 6: Submit is the only successful delegated completion transition

Canonical submit:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit <bundle> --work-id <id> --result <result.json> [--runtime-agent-id <id>]
```

Submit is file-based because result payloads and diagnostics must be inspectable and hashable as files.

A successful submit atomically:

- validates manifest, beacon, receipt nonce, runtime receipt, result schema, output files, and cache trails;
- verifies `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, and `queue_item_snapshot_hash` bindings;
- writes result/status/agent artifacts under `_work_units/waveN/{work_id}/`;
- completes the bound `queue_item_id`;
- appends exactly one `rb_output_declarations.jsonl` row;
- updates `_work_units/_index.json` with `submitted`, `result_hash`, and `ledger_record_hash`.

Invalid submit is a non-terminal rejection. It records `last_submit_rejection`, emits diagnostics, writes no ledger row, completes no queue item, and leaves the attempt `claimed` so a corrected result can be submitted.

Alternative considered: invalid submit marks the attempt `failed`. Rejected because schema/receipt formatting errors are often correctable without allocating a new work attempt. Terminal failure must be explicit.

### Decision 7: Terminal attempt transitions are explicit and fail closed

Terminal commands:

```bash
operate-work-unit fail <bundle> --work-id <id> --reason <reason>
operate-work-unit timeout <bundle> --work-id <id> --reason <reason>
operate-work-unit abandon <bundle> --work-id <id> --reason <reason>
```

They mark the attempt `failed`, `timed_out`, or `abandoned`, append no ledger row, and do not complete the bound queue item. The Engine removes the in-flight binding and requeues the same demand or creates an approved replacement with lineage before another claim.

Repeating the same terminal status with the same reason is idempotent. A terminal command against `submitted`, or against a different terminal status/reason, fails closed. Late submit against a terminal attempt fails closed.

Alternative considered: allow late submit from timed-out attempts if the output looks valid. Rejected for v1 because it introduces first-wins racing and ambiguous queue completion.

### Decision 8: Leases and runtime refs support timeout recovery without platform lock-in

Each claimed attempt stores `timeout_ms`, `claimed_at`, `deadline_at`, and optional `last_observed_at`. `inspect` reports expired in-flight attempts but does not mutate state.

Runtime metadata is stored as optional `runtime_refs`:

```json
{
  "platform": "codex",
  "runtime_agent_id": "optional-runtime-agent-id",
  "spawn_request_id": "optional-spawn-request-id",
  "thread_id": "optional-thread-id",
  "session_id": "optional-session-id",
  "cancel_ref": "optional-platform-cancel-reference",
  "opaque": {}
}
```

These fields help diagnose or cancel external sub-agent work, but Engine authority is still `work_id`, `queue_item_id`, lease/deadline, nonce, and state transition.

Alternative considered: model coding-agent native IDs as authority. Rejected because native runtime identity is platform-specific and may be unavailable at claim time.

### Decision 9: Ledger remains bundle-root and gate-readable

`rb_output_declarations.jsonl` remains the single production submission ledger. Successful work-unit submit appends one row with work-unit-only fields:

- `work_id`
- `queue_item_id`
- `wave`
- `kind`
- `producer_rule`
- `work_unit_ref`
- `result_ref`
- `runtime_receipt_ref`
- `receipt_nonce`
- `output_files`
- `cache_trails`
- `creation_reason`
- `result_hash`
- `ledger_record_hash`

`_work_units/_index.json` is the allocation/attempt registry. It is not pass coverage. Manifests, receipts, beacons, result files, output files, and cache trails are cross-check surfaces.

Alternative considered: add `_work_units/_ledger.jsonl`. Rejected for v1 because two production ledgers would create another reconciliation surface.

### Decision 10: Gates are aggregate validators over submitted work units

Gate coverage comes only from matching `rb_output_declarations.jsonl` rows produced by submit. Gate checks become:

- `work_unit_ledger_exists`
- `work_unit_output_coverage`
- `work_unit_submission_presence`
- `delegated_bypass_suspected`

Gate pass requires matching ledger rows plus successful cross-check against index, manifest, result, receipt, beacon, hashes, output files, and cache trails. Direct/orphan artifacts and old relay artifacts are diagnostics for failure, not alternate coverage.

Alternative considered: let gates scan `_work_units/` directly for valid-looking outputs. Rejected because filesystem presence alone cannot prove Engine-accepted submission.

### Decision 11: OpenSpec cleanup is delta-first

This change writes delta specs under `openspec/changes/replace-subagent-relay-with-work-units/specs/**/spec.md`. It does not hand-edit `openspec/specs/**/spec.md` during propose/apply. Main specs become clean through archive/sync after the replacement is accepted.

Old terms may remain only in active change artifacts when they explicitly identify removal targets or negative hygiene cases.

Archive-facing `ADDED` and `MODIFIED` requirements should use long-lived positive wording. They should avoid concrete legacy runtime paths or old command names as examples, because those examples would become main-spec noise after archive. Concrete old tokens belong in `REMOVED` requirements, proposal/design cleanup context, tasks, and hygiene scans.

Alternative considered: directly edit main specs first to remove noise. Rejected because it would bypass the project OpenSpec lifecycle and lose review trace.

### Decision 12: Add a positive delegated-work-units capability

`delegated-work-units` is added as the clean capability home for the new production delegated-work mechanism. Existing capabilities still need `MODIFIED` and `REMOVED` deltas because old requirements live there today, but the core concept should not be discoverable only by reading old relay/sub-agent capability names.

The new capability defines the stable model: queue demand item, Engine-allocated work unit, attempt lease, work-unit envelope, file-based submit, terminal attempt transitions, submitted ledger coverage, and non-work-unit delegated artifacts as diagnostics only.

Alternative considered: keep "New Capabilities: none" and express all work-unit behavior as modifications to old capabilities. Rejected because archive would leave future coding agents with a lower-signal reading path and would make the new concept look like a footnote to the removed mechanism.

### Decision 13: Treat capability names as main-spec signal

Main-spec capability directory names are part of the contract surface. They are the first thing a future coding agent scans, so old mechanism names must not remain as active-looking production homes after archive.

OpenSpec `RENAMED Requirements` changes requirement titles, not capability folders. Therefore this change SHALL use a capability replacement pattern:

1. Put long-lived positive requirements in new or existing positive homes.
2. Distinguish actor names from mechanism names: `sub-agent` remains valid; `relay`, `slot`, `drive-relay-slot`, and `_subagents/` are retired production mechanism terms.
3. Keep actor-centric `subagent-*` capabilities only when their archive-facing content describes work-unit-mediated sub-agent contracts.
4. Keep old relay/slot capability directories only as delta carriers for exact-title `REMOVED Requirements` or short migration context.
5. During archive/sync readiness, verify that retired old capability directories are absent from active main specs or contain no production requirements.
6. Move retired capability IDs/prefixes to the governance deprecated/no-spec-directory form only after their main-spec requirements are removed.

The archive-facing capability map is:

| Old capability name | Archive target |
| --- | --- |
| `relay-provenance-gate` | Replace with `work-unit-provenance-gate` or an equivalently named work-unit/delegated provenance gate home; do not keep relay as the gate capability name. |
| `subagent-collect` | Likely retire or rename; "collect" is old slot-return language. Positive submit semantics live in `delegated-work-units`, `agentic-queue`, and `agent-output-declaration`. |
| `subagent-directory-contract` | May remain if rewritten as the sub-agent work-unit envelope/directory view; old `_subagents/` relay directory authority is removed. |
| `subagent-dispatch` | May remain if dispatch means Engine work-unit claim creating bounded sub-agent prompts; old relay slot dispatch is removed. |
| `subagent-node-contract` | May remain if rewritten as sub-agent task/result/receipt contracts over work-unit identity; old relay driver guidance is removed. |
| `subagent-relay-driver` | Retire; positive CLI semantics live in `framework-engine`. |
| `subagent-repair` | Likely retire or absorb; current content is all-slots repair. Positive retry/repair semantics live in `delegated-work-units`, `agentic-queue`, and `repair-loop`. |
| `subagent-runtime-logging` | Keep if it remains actor-runtime logging and all relay/slot authority is gone; otherwise absorb into `logging-conventions` and `logger`. |
| `subagent-slots` | Retire; positive lifecycle semantics live in work-unit attempt state. |
| `cmd-subagent-environment` | Keep unless it teaches relay/slot authority; the sub-agent actor still exists. |

Alternative considered: retire every `subagent-*` capability. Rejected because it would confuse the surviving actor (`sub-agent`) with the retired transport (`relay/slot`) and would remove useful homes for actor-facing task, prompt, logging, and environment contracts.

Alternative considered: rely on requirement-body cleanup while leaving old relay capability names in place. Rejected because `relay-provenance-gate` preserves a low-signal entry point and makes the replacement look like a variant of the removed relay system.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Half replacement leaves two delegated paths visible | Add hygiene tests over active specs/docs/framework/tests/playbooks for old authority tokens, old gate check names, concrete `_subagents/wave_00/slot_00`-style paths, and production relay wording. |
| Queue v2 migration underestimates indirect queue assumptions | Treat queue identity split, active-window/refill, pending counts, projection, inspect, repair, `check-reentry`, and CLI tests as first-class tasks. |
| Submit transaction updates many files and can tear | Use bundle-scoped lock, temp files, atomic rename, and `_work_units/_transactions/{tx_id}.json` journal; make `inspect` fail on uncommitted journals or mismatches. |
| Invalid submit semantics are confused with terminal failure | Tests must prove invalid submit leaves status `claimed`, writes `last_submit_rejection`, appends no ledger, and accepts corrected same-attempt submit. |
| Timeout retry creates duplicate work on disk | Terminal state is authoritative. Late submit against `timed_out` or `abandoned` fails closed; platform cancellation remains best-effort. |
| Readable `work_id` fields drift from manifest/index | Validation rejects encoded field mismatch across path, index, manifest, result, and ledger. |
| Gate coverage accidentally comes from index/filesystem | Gate helper tests must prove index/manifest/output files alone cannot pass without submit-written ledger rows. |
| Requirement registry drift | Apply tasks must update `openspec/governance/req-registry.yaml`, mark replaced relay production IDs as deprecated where appropriate, and run governance checks. |
| Title-carried requirement IDs are removed without header repair | Archive/sync hygiene must verify affected main specs carry those IDs in the `> req:` header before governance is considered clean. |
| Old mechanism names remain as empty or positive-looking main-spec directories | Treat capability-name cleanup as an archive readiness gate; retired old capability dirs must be removed or reduced to non-production/no-spec-directory governance entries after their requirements are removed, while actor-centric sub-agent dirs must pass the actor-vs-mechanism test. |
| Version surfaces are already inconsistent | Treat version alignment as release hygiene in apply; target bump is `v0.3 -> v0.4`. |

## Migration Plan

1. Finalize this proposal, design, delta specs, and tasks.
2. In apply, update registry IDs before implementation so tasks/specs/code can cite stable requirements.
3. Implement queue v2 schemas and migration helpers for new bundles/tests; do not migrate historical production bundles.
4. Implement work-unit core: ID allocator, `_work_units/_index.json`, directory envelope, manifest/beacon/task/result schemas, lock, and journal.
5. Implement `operate-work-unit claim/submit/fail/timeout/abandon/inspect`.
6. Switch output declaration ledger writing from relay/slot completion to work-unit submit.
7. Switch gate helpers and gate definitions to work-unit ledger-first checks.
8. Rewrite Agent-facing workflow/shared docs and guidelines so only `operate-work-unit` is taught for delegated work.
9. Rewrite regression tests and controlled E2E playbooks around work-unit claim/submit/gate behavior.
10. Remove active production demand for old relay CLI/files/tests/docs; leave old terms only in explicit cleanup or failure-history contexts.
11. Run unit/integration tests, controlled E2E playbooks, governance checks, and hygiene scans.
12. Archive/sync the change so main specs become the clean single source of truth.

Rollback strategy during apply is to revert the apply branch before archive/sync. After archive/sync, rollback would require a new OpenSpec change because accepted specs would have changed.

## Open Questions

- None blocking for v1. Future speculative racing may add `attempt_group_id`, but v1 uses timeout/abandon before retry.
