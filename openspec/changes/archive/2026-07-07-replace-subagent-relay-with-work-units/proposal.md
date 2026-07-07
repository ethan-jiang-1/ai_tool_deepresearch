## Why

The current delegated sub-agent production path has become a multi-surface relay mechanism where one logical delegated completion is spread across queue task state, `_subagents/wave_NN/slot_MM` directories, runtime receipts, relay commit/merge steps, queue completion, `rb_output_declarations.jsonl`, and wave-gate provenance checks. Recent production-style work in `dpt_rb_us-iran-conflict-situation` exposed this as a systemic workflow failure, not a one-off bug. The observed failures are tracked in `_backlog/bugs/BUG-031-silent-autonomous-execution-stops-agent-idles.md` through `_backlog/bugs/BUG-036-run-log-trace-reveal-systemic-workflow-failure.md`.

The common failure shape is that real research work may happen, and a sub-agent may even produce useful files, but the system cannot reliably prove that the delegated task was claimed, executed, returned, committed, queued-complete, declared to the ledger, and covered by the gate as one atomic fact. The Phase Agent then has to interpret multiple partial surfaces and decide whether they mean completion. That is exactly the wrong boundary for this project: the LLM Agent should own research judgment and repair reasoning, while the Engine should own deterministic state transitions, receipts, ledgers, and gate-readable provenance.

The replacement model is:

```text
queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate
```

This is a direct production replacement, not an added alternate route. A work unit is one Engine-allocated delegated execution attempt for one queue demand item. A wave is not a work unit. A phase loop drains many queue demand items through many work units, and the wave gate makes one aggregate decision from submitted work-unit ledger coverage.

This change is needed now because leaving both concepts in active guidance would keep producing noise. Future coding agents must not see two plausible production paths. After this change is archived/synced, main specs, framework docs, runtime docs, phase docs, gates, tests, and playbooks should expose one delegated-work mechanism only.

The two source planning notes are:

- `_backlog/plans/unified-delegated-work-unit-pipeline.md`
- `_backlog/plans/unified-work-unit-replacement-impact-map.md`

## What Changes

- **BREAKING**: delegated work uses the single production path `queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate`.
- **BREAKING**: `_subagents/wave_NN/slot_MM`, `slot_result_ref`, `drive-relay-slot`, and `subagent_slot_presence` stop being active production authority in specs, framework docs, runtime docs, phase docs, gates, tests, and playbooks.
- **BREAKING**: queue demand identity becomes `queue_item_id`. `work_id` means only one Engine-allocated delegated execution attempt.
- **BREAKING**: target `rb_queue.json` becomes nested queue v2: `active_window`, `refill_pool`, `delegated_in_flight`, and `terminal_history`. Top-level slot/current fields are not the delegated completion authority.
- Add Engine-owned allocation registry `_work_units/_index.json`. It is the allocation and attempt-state truth for work units, not a gate coverage ledger.
- Define canonical `work_id` format: `wu-w{wave}-b{batch_index}-{kind_code}-i{claim_index}`, with three-digit batches such as `b000`, four-digit claim indexes such as `i0001`, and an Engine-owned kind registry mapping full work-unit kinds to short `kind_code` values.
- Add the production delegated CLI `operate-work-unit claim/submit/fail/timeout/abandon/inspect`.
- Keep `operate-queue` for non-delegated main-agent queue work; delegated sub-agent completion must use `operate-work-unit submit`.
- Define `claim --count N` as a real in-flight allocation transaction: it claims the contiguous eligible delegated queue-front prefix, creates N work-unit envelopes when available, and returns prompts that may be dispatched in parallel.
- Define file-based `submit` as the only successful delegated completion transaction. Successful submit validates receipt/result/outputs/cache, completes the bound queue item, updates `_work_units/_index.json`, and appends exactly one `rb_output_declarations.jsonl` row.
- Treat invalid submit as a non-terminal rejection: record `last_submit_rejection`, leave the attempt `claimed`, write no ledger row, and do not complete queue demand.
- Add explicit terminal attempt transitions: `fail`, `timeout`, and `abandon`. These close the attempt without queue completion or ledger coverage and require retry/repair/refill to allocate a new `work_id`.
- Add lease/deadline fields and timeout recovery so a sub-agent that does not return can be closed by the Main Agent and retried with a different `work_id`.
- Store platform-specific sub-agent/runtime IDs only as optional `runtime_refs`. They support diagnosis and best-effort cancellation, but never gate authority.
- Keep the bundle-root `rb_output_declarations.jsonl` as the single production submission ledger. Version 1 does not add `_work_units/_ledger.jsonl`.
- Replace relay/slot ledger fields with work-unit fields: `work_id`, `queue_item_id`, `wave`, `kind`, `producer_rule`, `work_unit_ref`, `result_ref`, `runtime_receipt_ref`, `receipt_nonce`, `output_files`, `cache_trails`, `creation_reason`, `result_hash`, and `ledger_record_hash`.
- Replace gate provenance checks with work-unit checks: `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`.
- Make Wave0, Wave1, and Wave2 differ by work-unit kind, output contract, and gate coverage only. They do not get separate delegated-work mechanisms.
- Add hygiene checks proving active production specs/docs/framework/tests/playbooks expose no old relay authority tokens or old gate-check names except in explicit removal/cleanup contexts.
- Use OpenSpec delta specs only. Do not hand-edit `openspec/specs/` during propose/apply; archive/sync is what turns the accepted specs into the cleaned single source of truth.

## Capabilities

### New Capabilities

- `delegated-work-units`: canonical positive contract for the new production delegated-work mechanism: queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate. This capability exists so the new concept has a clean main-spec home after archive instead of being scattered only through old relay/subagent capability names.
- `work-unit-provenance-gate`: canonical positive contract for delegated provenance gates. This capability replaces the relay-named gate home and defines ledger-first work-unit gate checks, diagnostics, and forensic guidance.

### Capability-Name Cleanup

Capability names are archive-facing navigation, not just storage folders. Old mechanism names SHALL NOT remain as plausible production homes in main specs after archive. The archive target is:

- keep `delegated-work-units` as the canonical positive home for the delegated-work pipeline;
- keep actor-neutral or already-positive homes such as `agentic-queue`, `framework-engine`, `workflow-directory-contract`, `agent-output-declaration`, `gate-skeleton`, `logging-conventions`, `logger`, `research-wave-phase-content`, `wave1-intake`, and `wave2-synthesis` for their own contracts;
- replace `relay-provenance-gate` with `work-unit-provenance-gate` before archive, because the current name still teaches relay as the gate concept;
- apply an actor-vs-mechanism test to `subagent-*`: `sub-agent` is still the delegated actor, while `relay`, `slot`, `drive-relay-slot`, and `_subagents/` are retired mechanism surfaces;
- keep or rewrite actor-centric `subagent-*` capabilities when they describe surviving sub-agent task, dispatch, runtime logging, or environment contracts through work units;
- retire or rename mechanism-centric `subagent-*` capabilities when their stable meaning is relay/slot collect, relay driver, slot lifecycle, or all-slots repair;
- leave `cmd-subagent-environment` out of the relay cleanup unless its content starts teaching relay/slot authority; it prepares real sub-agent runtime definitions, and the sub-agent actor still exists in the work-unit path.

### Modified Capabilities

- `agentic-queue`: queue demand identity, nested queue v2, front-contiguous delegated claim, `delegated_in_flight`, phase drain, timeout/retry queue recovery, and non-delegated `operate-queue` boundary.
- `cmd-bundle-instantiation`: initial `rb_queue.json` template becomes queue v2 and stops teaching top-level delegated slot shape.
- `cmd-subagent-environment`: setup remains real sub-agent environment preparation only and does not produce work-unit result/status/runtime outputs.
- `schema-core`: queue contract validates queue v2 demand items and separates queue demand identity from work-unit attempt identity.
- `framework-engine`: `operate-work-unit`, work-unit index, bundle lock, transaction journal, work-unit ID validation/allocation, file-based submit, terminal attempt commands, inspect diagnostics, and version alignment.
- `agent-output-declaration`: bundle-root `rb_output_declarations.jsonl` remains the production submission ledger, but relay/slot fields are replaced by work-unit-only provenance fields.
- `relay-provenance-gate`: old relay/slot provenance requirements are removed from active main specs; positive ledger-first work-unit provenance requirements live under `work-unit-provenance-gate`.
- `research-wave-gate-implementation`: Wave0/Wave1/Wave2 gates read work-unit ledger coverage and reject `_subagents` artifacts, direct/orphan outputs, hand-written ledger rows, and stale binding mismatches.
- `gate-skeleton`: gate definitions and check names expose work-unit provenance checks and remove old production check names.
- `workflow-directory-contract`: runtime bundle canonical delegated directory becomes `_work_units/` with `_work_units/_index.json`.
- `work-unit-provenance-gate`: delegated gate coverage comes from submitted work-unit ledger rows and work-unit cross-checks, with non-work-unit delegated surfaces reported only as bypass/cleanup diagnostics.
- `workflow-node-contract`: lifecycle metadata, header injection, and self-documenting guidance surfaces distinguish work-unit sub-agent task guidance from manifest lifecycle phases.
- `trace-writer`: delegated bypass diagnostics use the work-unit coverage model and `delegated_bypass_suspected`.
- `shared-node-content`: generated gate summaries describe work-unit ledger coverage.
- `queue-input-validation`: repair and stale-card checks operate over queue v2 locations and respect delegated in-flight work-unit bindings.
- `logging-conventions`: long-running delegated diagnostics bind work-unit identity and receipt nonce.
- `subagent-directory-contract`: remains only as the sub-agent's work-unit envelope/directory view; old `_subagents/` relay directory requirements are retired.
- `subagent-dispatch`: remains only when dispatch means Engine work-unit claim producing bounded sub-agent prompts; old relay slot dispatch requirements are retired.
- `subagent-collect`: retires as an active positive capability because "collect" is tied to old slot collection; positive submit/invalid-submit contracts live in `delegated-work-units`, `agentic-queue`, and `agent-output-declaration`.
- `subagent-node-contract`: remains as sub-agent task/result/receipt contract over work-unit identity; old relay driver/node guidance is retired.
- `subagent-relay-driver`: `drive-relay-slot` is removed as a production CLI path and replaced by `operate-work-unit`.
- `subagent-runtime-logging`: remains as actor-runtime logging; lifecycle events bind work-unit nonce and optional runtime refs, not slot beacons.
- `subagent-repair`: retires or absorbs into work-unit terminal/retry semantics because current content is all-slots repair; positive repair/retry behavior lives in `delegated-work-units`, `agentic-queue`, and `repair-loop`.
- `subagent-slots`: slot lifecycle/path requirements are removed from production specs; work-unit attempt state and runtime refs are the replacement.
- `file-observability`: known production runtime path becomes `_work_units/waveN/{work_id}/`; old sub-agent paths are failure/removal diagnostics only.
- `experiment-observability`: reports and projections recognize work-unit events, in-flight attempts, expired leases, retries, and no mixed provenance path.
- `logger`: run log supports work-unit claim/submit/fail/timeout/abandon/late-submit/inspect diagnostics.
- `cache-raw-web-content`: cache trails bind to submitted work-unit ledger rows.
- `experiment-ref-integrity`: engine-boundary playbooks and checks prove work-unit provenance instead of relay provenance.
- `agent-testing`: evidence-extraction experiment suite uses work-unit submit/ledger proof roles instead of delegated completion or SlotResult fixtures.
- `evidence-extraction`: `ref_count` and `cache_trails` validation derive from submitted work-unit declarations and ledger rows.
- `conditional-nodes`, `fork-repair-converge`, `gate-fork-router`, and `repair-loop`: deterministic checkpoint/fork/repair specs stop naming the old relay module as their implementation anchor.
- `research-wave-phase-content`: Wave0/Wave1/Wave2 phase docs use the queue-drain work-unit loop and aggregate gate model.
- `research-wave-experiments`: controlled E2E uses only `operate-work-unit`, including multi-work-unit drain, out-of-order submit, timeout retry, and gate-failure refill.
- `wave1-intake`: Wave1 delegated deepening uses work-unit kind/coverage instead of relay batch protocol.
- `wave2-synthesis`: Wave2 delegated evidence search uses work-unit kind/coverage; pure synthesis stays with the main Agent.

## Impact

This is a large but bounded mechanism replacement.

It is large because the old relay path is not isolated to one CLI. It appears in accepted specs, requirement registry text, queue schemas, queue lifecycle helpers, ledger appenders, gate helpers, gate definitions, Agent-facing phase docs, shared sub-agent docs, guidelines, regression tests, controlled E2E playbooks, and file-observability/reporting logic.

It is bounded because this change does not redesign the whole research system. The LLM Agent still owns search judgment, evidence choice, writing, synthesis, and repair reasoning. Markdown/playbooks still control Agent Flow. JS/CLI still owns deterministic schema validation, state transitions, receipts, trace, ledger, and gates. The change replaces delegated allocation/submission/provenance, not the full research workflow.

Primary apply surfaces:

- `DPT_FRAMEWORK/cli/`: add `operate-work-unit.mjs`; remove active production demand for `drive-relay-slot.mjs`.
- `DPT_FRAMEWORK/engine/`: add/rewrite work-unit helpers, queue v2 helpers, ledger append, gate provenance helpers, transaction recovery, and inspect diagnostics.
- `DPT_FRAMEWORK/schema/`: add/update work-unit index/manifest/result/receipt schemas, queue v2 schemas, ledger schemas, and gate definition schemas.
- `DPT_FRAMEWORK/workflows/` and `DPT_FRAMEWORK/command_playbook/`: rewrite Agent-facing delegated-work instructions so only the work-unit loop is taught.
- `guidelines/`: align stable guidance with the accepted one-path model after archive/sync.
- `tests/`: rewrite relay tests around work-unit claim/submit/idempotency/timeout/gate/hygiene behavior.
- `experiments_playbook/`: rewrite controlled E2E so delegated work is driven only by `operate-work-unit`.
- `openspec/specs/`: do not edit directly during propose/apply. This change supplies delta specs; archive/sync makes main specs clean.
- `openspec/governance/req-registry.yaml`: update during apply/archive work so requirement IDs trace the replacement and old relay production IDs are not reused.

Secondary impact that must not be missed:

- Existing queue specs/code use `work_id` as queue demand identity. That must become `queue_item_id`.
- Existing queue lifecycle assumes `slot_1_current`/current-only completion. Delegated completion must become submit-by-`work_id` with queue binding.
- Existing queue projection, active-window promotion/refill, pending counts, repair, inspect, and CLI tests must account for multiple in-flight delegated attempts.
- Existing reentry/phase detection must not parse queue `work_id` prefixes once queue demand identity is renamed.

Out of scope:

- Migrating historical run bundles.
- Adding background wakeups or durable sub-agent orchestration.
- Adding v1 speculative first-valid-submit-wins racing.
- Adding a second production ledger.
- Moving research judgment, route decisions, or repair strategy into JS.

Version impact:

- Target framework version bump is `v0.3 -> v0.4`.
- Apply should align version surfaces such as `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` as part of release hygiene, but this proposal does not use version drift as the motivation for the mechanism replacement.
