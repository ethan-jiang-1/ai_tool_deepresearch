## 1. Apply Orientation And Invariant Ledger

- [x] 1.1 @impl DEW-001, AGQ-001, FRE-001, WPG-001: Read `proposal.md`, `design.md`, every delta spec, and this task list before target-code edits; record the current apply order and any known residual risks in apply notes.
- [x] 1.2 @impl DEW-001, DEW-008, WPG-004, RWP-001: Run a baseline scan of active specs, framework docs/code, workflow docs, guidelines, tests, and playbooks for removed delegated-work authority terms; save the hit list as the cleanup ledger.
- [x] 1.3 @impl DEW-001, DEW-007, RET-001: Run the old-bearing main-spec requirement-block coverage check and prove every old-bearing block is covered by an exact-title `MODIFIED`, `REMOVED`, or `RENAMED` delta before implementation starts.
- [x] 1.4 @impl AGQ-001, FRE-001, AGO-001, WPG-001: Execute tasks in order by default; if a discovery requires reordering, update this task list or apply notes with the reason before proceeding.
- [x] 1.5 @impl DEW-001, FRE-004, RET-001: Run `node openspec/governance/check-project-reqs.mjs` before target-code edits and fix any registry drift before implementation.

## 2. OpenSpec And Archive Hygiene

- [x] 2.1 @impl DEW-001, DEW-002, DEW-005, DEW-007: Keep `delegated-work-units` as the positive main-spec home for the new mechanism and avoid expressing core work-unit concepts only inside removed relay/sub-agent capability names.
- [x] 2.2 @impl DEW-001, DEW-008, RET-002: Treat capability directory names as archive-facing signal; produce a capability retirement map before implementation and keep it updated whenever a delta spec is moved, absorbed, or retired.
- [x] 2.3 @impl DEW-001, DEW-008, WPG-001, RET-005: Ensure `relay-provenance-gate` is replaced by `work-unit-provenance-gate` before archive; it SHALL NOT remain as the active main-spec provenance gate capability name.
- [x] 2.4 @impl DEW-001, DEW-008, RET-002: Apply the actor-vs-mechanism test to `subagent-*` capabilities: keep names that describe the surviving sub-agent actor's work-unit task, prompt, dispatch, runtime logging, or environment contracts; retire or rename names whose stable meaning is relay driver, slot lifecycle, old collect/merge, or all-slots repair.
- [x] 2.5 @impl SUD-001, SDC-001, SNC-003, SRL-001, CSE-001: Keep actor-centric `subagent-dispatch`, `subagent-directory-contract`, `subagent-node-contract`, `subagent-runtime-logging`, and `cmd-subagent-environment` only if their archive-facing content contains no relay/slot authority and binds sub-agent behavior to work-unit identity.
- [x] 2.6 @impl DEW-008, RET-005: Retire, rename, or absorb `subagent-collect`, `subagent-relay-driver`, `subagent-repair`, and `subagent-slots` when their post-change content would still read as old relay/slot mechanism guidance.
- [x] 2.7 @impl DEW-008, WPG-004, GSK-001: Ensure archive-facing `ADDED` and `MODIFIED` requirements use long-lived positive wording and do not preserve concrete legacy runtime paths, command names, or check names as examples.
- [x] 2.8 @impl DEW-008, RET-001: Use `REMOVED Requirements` only for exact main-spec requirement titles that should disappear or stop being production authority after archive.
- [x] 2.9 @impl DEW-001, AGQ-018, WPG-008, SDC-003: Keep `openspec/governance/req-registry.yaml` descriptions aligned with work-unit semantics without prematurely deprecating IDs still referenced by active main or delta specs.
- [x] 2.10 @impl DEW-008, WPG-004, RWP-001: Re-run the archive-facing noise scan after spec edits and require zero old/noise token hits in `ADDED` and `MODIFIED` sections.
- [x] 2.11 @impl DEW-008, RET-005: During apply, verify whether retired old capability directories are still present in active main specs, record the finding, and defer any governance prefix/group move until archive/sync actually removes the corresponding production requirements.
- [x] 2.12 @impl DEW-008, WPG-001, RET-005: Treat `relay-provenance-gate` and `RPG-*` as removal/retirement carriers only; do not repurpose them as positive work-unit provenance requirements, and keep deprecated IDs out of active delta `> req:` declarations.

## 3. Surface Inventory And Cutover Map

Note: 3.7-3.10 are rolling section-exit guards for sections 4-14. Keep them unchecked until every section 4-14 exit has corresponding evidence in `apply-ledger.md`; per-section evidence is recorded there as each section completes.

- [x] 3.1 @impl DEW-001, FRE-001, DEW-008: Inventory all production code paths that allocate, stage, collect, commit, complete, declare, inspect, or gate delegated work; mark each path as replace, rewrite, or remove.
- [x] 3.2 @impl AGQ-001, AGQ-005, QIV-004, CMI-004: Inventory queue schema/template/projection/repair/reentry assumptions that use top-level slots or queue-item `work_id`.
- [x] 3.3 @impl AGO-003, WPG-001, WPG-002, WPG-003, WPG-007, RWG-001, GSK-001: Inventory ledger and gate helpers/definitions that use declaration coverage, submission presence, bypass diagnostics, or delegated output coverage.
- [x] 3.4 @impl RWP-001, SNC-003, LOG-007: Inventory Agent-facing phase docs, command playbooks, shared nodes, generated prompts, and `guidelines/` files that teach delegated execution.
- [x] 3.5 @impl RWE-001, EXR-001, FIO-004: Inventory regression tests and controlled E2E playbooks that need replacement rather than narrow assertion edits.
- [x] 3.6 @impl FRE-001, FRE-004, RET-001: Maintain an apply evidence ledger mapping each section 4-14 to changed surfaces, focused commands run, verdict sources, and residual risks before moving to the next section.
- [x] 3.7 @impl AGQ-001, DEW-001, WPG-001: At each section 4-14 exit, run the smallest affected deterministic check or focused regression slice; if no check exists, add the missing checker before marking the section complete.
- [x] 3.8 @impl FRE-001, WPG-006, RWP-001: Treat every failed check or concrete drift as a contract-class probe across schema, CLI/helper wiring, gate definitions, Agent-facing Markdown, validators, regression tests, and E2E surfaces.
- [x] 3.9 @impl DEW-008, FIO-004, LOG-006: At each section 4-14 exit, update the cleanup ledger for removed-path or removed-term hits and classify each hit as removed, rewritten, diagnostic-only, or cleanup-only.
- [x] 3.10 @impl SUD-001, DEW-005, GSK-001: Do not mark a section 4-14 implementation surface complete until any new helper, CLI, or check introduced there is proven wired into a real production caller.

## 4. Queue V2 Contract Foundation

- [x] 4.1 @impl AGQ-001, AGQ-005, SCO-009: Implement queue v2 schema with ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`.
- [x] 4.2 @impl AGQ-001, AGQ-005, DEW-003: Rename queue demand identity to `queue_item_id` across schema, fixtures, helper APIs, projections, and docs; reserve `work_id` for delegated attempts.
- [x] 4.3 @impl AGQ-005, AGQ-017, AGQ-020: Enforce that a `queue_item_id` appears in exactly one active queue location and that `delegated_in_flight` is keyed by `queue_item_id`.
- [x] 4.4 @impl AGQ-005, AGQ-018, DEW-003: Implement canonical queue item snapshot hashing for semantic demand fields and exclude location/status/timestamps/runtime/attempt refs.
- [x] 4.5 @impl AGQ-003, AGQ-019, QIV-004: Update preemption, repair, pending counts, projection, and reentry/phase detection to use queue v2 state and not current-slot assumptions.
- [x] 4.6 @impl AGQ-004, AGQ-019, EXR-004: Make `operate-queue complete` valid for non-delegated work and fail closed for delegated in-flight demand with advice to use work-unit submit.

## 5. Work-Unit Index, Envelope, And Transaction Core

- [x] 5.1 @impl DEW-002, FRE-005, SDC-001: Implement deterministic `work_id` parsing and validation for `wu-w{wave}-b{batch_index}-{kind_code}-i{claim_index}` with three-digit batch and four-digit claim indexes, including full `kind` to short `kind_code` registry validation.
- [x] 5.2 @impl DEW-002, FRE-005, SUD-001: Implement `_work_units/_index.json` with wave/batch counters, kind registry, work-unit records, status counts, inspect projection, lease fields, runtime refs, hashes, and rejection diagnostics.
- [x] 5.3 @impl DEW-004, SDC-001, SDC-002: Generate work-unit envelopes under `_work_units/waveN/{work_id}/` with manifest, task, result schema, beacon, runtime receipt, status, result, and agent metadata surfaces.
- [x] 5.4 @impl DEW-002, FRE-005, SDC-003: Validate encoded `work_id` fields against directory path, index entry, manifest, result, and ledger row.
- [x] 5.5 @impl FRE-001, FRE-004, FRE-005: Add bundle-scoped locking plus `_work_units/_transactions/{tx_id}.json` journaling around queue/index/envelope/ledger mutations.
- [x] 5.6 @impl FRE-005, EXO-001, FIO-001: Implement read-only work-unit inspect checks for counter drift, status-count drift, projection drift, orphan directories, duplicate bindings, expired leases, and uncommitted transactions.

## 6. Claim And Dispatch Path

- [x] 6.1 @impl DEW-003, AGQ-001, SUD-001: Implement `operate-work-unit claim <bundle> --phase waveN` to allocate one eligible delegated queue-front item into `delegated_in_flight`.
- [x] 6.2 @impl DEW-003, AGQ-014, SUD-002: Implement `claim --count N` as one Engine transaction over the contiguous eligible queue-front prefix, including partial success and zero-mutation no-claim behavior.
- [x] 6.3 @impl AGQ-014, SUD-002, EXO-006: Return `requested_count`, `claimed_count`, `claimed_work_ids`, `in_flight_count`, `unclaimed_delegated_count`, `blocked_by_queue_item_id`, `phase_drained`, and prompt refs from claim.
- [x] 6.4 @impl DEW-003, AGQ-001, SUD-001: Write `claimed_at`, `timeout_ms`, `deadline_at`, `attempt_index`, and `queue_item_snapshot_hash` to queue in-flight state, index, and manifest during claim.
- [x] 6.5 @impl SUD-001, LOG-006, SRL-001: Emit trace/log diagnostics for claim allocation, batch allocation, prompt generation, and claim rejection.

## 7. Work-Unit Task, Prompt, Receipt, And Runtime Refs

- [x] 7.1 @impl DEW-004, SNC-001, SUD-001: Generate task Markdown and spawn prompt from the work-unit manifest and kind contract.
- [x] 7.2 @impl DEW-004, SNC-001, SRL-002: Bind `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, result schema, output contract, cache policy, work-unit directory, and lease deadline in task and beacon.
- [x] 7.3 @impl DEW-004, SRL-001, SRL-004: Require lifecycle receipt events to carry `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- [x] 7.4 @impl DEW-004, SRL-002, LOG-007: Generate copyable diagnostic logging examples that bind work-unit identity and avoid non-work-unit delegated channel examples.
- [x] 7.5 @impl DEW-004, DEW-006, SRL-004: Store coding-agent runtime IDs, thread/session IDs, spawn IDs, and cancel refs only as optional diagnostic `runtime_refs`.

## 8. Submit Transaction And Completion Semantics

- [x] 8.1 @impl DEW-005, FRE-001, SNC-002: Implement file-based `operate-work-unit submit --work-id <id> --result <result.json>`.
- [x] 8.2 @impl DEW-005, AGO-001, WPG-002: Validate manifest, beacon, runtime receipt, nonce, result schema, output files, cache trails, queue binding, snapshot hash, index state, and work-unit status before commit.
- [x] 8.3 @impl DEW-005, AGQ-002, AGO-003: Atomically complete the bound `queue_item_id`, update index/result/status/agent files, and append the submitted ledger row in one transaction.
- [x] 8.4 @impl DEW-005, AGO-002, FRE-005: Implement same-content duplicate submit idempotency and fail-closed different-content duplicate submit using `result_hash` and `ledger_record_hash`.
- [x] 8.5 @impl DEW-005, AGQ-002, WPG-002: Allow out-of-order submits to complete the correct in-flight queue binding by `work_id` without touching unrelated in-flight attempts.

## 9. Rejection, Terminal Attempts, And Retry

- [x] 9.1 @impl DEW-005, LOG-006: Implement non-terminal submit rejection with `last_submit_rejection`, diagnostics, no ledger append, no queue completion, and status remaining `claimed`.
- [x] 9.2 @impl DEW-005, CRC-004, WPG-002: Ensure missing receipt, nonce mismatch, invalid result, missing output, missing cache, stale snapshot hash, and wrong `work_id` fail submit without terminalizing the attempt.
- [x] 9.3 @impl DEW-006, AGQ-001, LOG-006: Implement `fail`, `timeout`, and `abandon` commands that close attempts without queue completion or ledger coverage.
- [x] 9.4 @impl DEW-006, AGQ-014, SRL-004: Implement timeout retry so same-demand retry receives a new `work_id`, increments `attempt_index`, and stays in the current batch unless repair/refill opens a new batch.
- [x] 9.5 @impl DEW-006, SRL-004, LOG-006: Reject late submit against `failed`, `timed_out`, or `abandoned` attempts and log `work_unit_late_submit_rejected`.
- [x] 9.6 @impl DEW-006, AGQ-001, FRE-005: Implement gate-failure or explicit refill batch opening with `b001+`, `batch_reason`, new claim sequence, and lineage to prior queue/work-unit state.

## 10. Ledger, Output Declarations, And Cache Trails

- [x] 10.1 @impl DEW-007, AGO-003, WPG-001: Keep bundle-root `rb_output_declarations.jsonl` as the only production delegated submission ledger.
- [x] 10.2 @impl DEW-007, AGO-003, AGO-005: Write ledger rows with `work_id`, `queue_item_id`, `wave`, `kind`, `producer_rule`, `creation_reason`, refs, nonce, outputs, cache trails, `result_hash`, and `ledger_record_hash`.
- [x] 10.3 @impl DEW-007, AGO-006, CRC-005: Verify declared output files and cache trails during submit before ledger append.
- [x] 10.4 @impl DEW-007, CRC-004, CRC-006: Make cache presence non-authoritative unless declared by submitted work-unit ledger rows and passing cross-checks.
- [x] 10.5 @impl DEW-007, AGO-003, WPG-001, WPG-002: Prove `_work_units/_index.json`, manifest, receipt, beacon, result, cache, and filesystem presence are cross-check surfaces only, not pass coverage.
- [x] 10.6 @impl EEX-003, EEX-004, AGO-006: Update `ref_count` and `cache_trails` validation to derive from submitted work-unit declarations and Engine-written ledger rows, not delegated completion fixtures or Agent numeric claims.

## 11. Gate Provenance And Definition Wiring

- [x] 11.1 @impl DEW-007, WPG-001, WPG-003: Rewrite shared gate provenance helpers around work-unit ledger rows and output coverage.
- [x] 11.2 @impl DEW-007, WPG-002, GSK-001: Implement `work_unit_submission_presence` cross-checks against index, manifest, result, receipt, beacon, output files, cache trails, and hashes.
- [x] 11.3 @impl DEW-008, WPG-004, WPG-007, FIO-004: Implement `delegated_bypass_suspected` diagnostics for orphan/direct/non-work-unit delegated artifacts and hand-written declarations.
- [x] 11.4 @impl WPG-006, GSK-001, GSK-002: Update gate definition schema and active gate definitions to use `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`.
- [x] 11.5 @impl RWG-001, RWG-004, RWG-010: Update Wave0 gate CLI to reject delegated source intake outputs lacking submitted work-unit coverage.
- [x] 11.6 @impl RWG-002, RWG-005, RWG-011: Update Wave1 gate CLI to reject topic deepening outputs lacking submitted work-unit coverage.
- [x] 11.7 @impl RWG-003, RWG-006, RWG-007: Update Wave2 gate CLI so pure synthesis stays separate while delegated targeted evidence requires submitted work-unit coverage.
- [x] 11.8 @impl GSK-008, WPG-008, RWG-012: Ensure gate diagnostics carry work-unit binding context and mismatched refs without requiring non-work-unit channel keys.

## 12. Observability, Inspect, Trace, And Logs

- [x] 12.1 @impl EXO-001, EXO-006, DEW-006: Update experiment and bundle health projections for claimed, submitted, failed, timed_out, abandoned, expired, retry, and late-submit states.
- [x] 12.2 @impl FIO-001, FIO-002, FIO-004: Update file observability so `_work_units/waveN/{work_id}/` is the production delegated runtime path and non-work-unit delegated artifacts are diagnostics only.
- [x] 12.3 @impl TRW-005, WPG-007, LOG-006: Rename and wire delegated bypass trace/log diagnostics to the work-unit coverage model.
- [x] 12.4 @impl LOG-006, LOG-007, SRL-001: Emit accident-grade diagnostics for claim, submit, reject, ledger append, fail, timeout, abandon, retry, late submit, inspect failure, transaction mismatch, and provenance mismatch.
- [x] 12.5 @impl FRE-005, EXO-001, FIO-004: Prove inspect detects stale/missing/mismatched authority surfaces without silently healing state.

## 13. Agent-Facing Flow And Command Surface

- [x] 13.1 @impl RWP-001, RWP-002, SNC-003: Rewrite Wave0/Wave1/Wave2 phase docs around claim, dispatch, submit, rejection repair, expired-attempt resolution, drain, gate, refill, repeat.
- [x] 13.2 @impl RWP-008, SUD-001, DEW-005: Update Wave0 source intake instructions for `wave0_source_intake` work units.
- [x] 13.3 @impl RWP-009, WAI-001, WAI-006: Update Wave1 topic deepening instructions, inline backfill, and playbook references around submitted work-unit coverage.
- [x] 13.4 @impl RWP-010, WTS-001, WTS-005: Update Wave2 instructions so pure synthesis remains main-agent work and delegated targeted evidence uses `wave2_targeted_evidence` work units.
- [x] 13.5 @impl SHC-002, GSK-001, WPG-001, WPG-006: Update generated gate summaries so they teach work-unit ledger coverage at summary level and point to gate CLI output for authority.
- [x] 13.6 @impl AGQ-004, SUD-002, FRE-001: Update command docs/playbooks so `operate-work-unit` is the delegated CLI and `operate-queue` is non-delegated queue maintenance/completion.
- [x] 13.7 @impl DEW-001, DEW-008, AGQ-018: Rewrite or replace `guidelines/agentic-subagent-mechanism.md` so it teaches work-unit-mediated sub-agent execution, not Tier 3 Relay, slot lifecycle, `_subagents/`, `drive-relay-slot`, `SlotResult`, or queue `complete()` as delegated production authority.
- [x] 13.8 @impl DEW-001, AGQ-001, RWP-001: Update guideline entry points `guidelines/README.md`, `guidelines/project-charter.md`, `guidelines/agentic-execution-model.md`, `guidelines/agentic-queue-mechanism.md`, `guidelines/agentic-workflow-mechanism.md`, and `guidelines/framework-runtime-boundary.md` so they describe one delegated-work path and distinguish the surviving sub-agent actor from the retired relay/slot mechanism.
- [x] 13.9 @impl LOC-001, LOC-002, LOG-007, SRL-001: Update `guidelines/logging-conventions.md` so delegated runtime logging binds `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`, and does not teach slot-key logging as production guidance.
- [x] 13.10 @impl AGT-009, EXR-001, DEW-007: Update `guidelines/command-experiments.md` so experiment guidance converges on work-unit claim/submit, submitted ledger coverage, and gate verdicts, not `commitSlotResult()`, delegated queue `complete()`, `SlotResult`, or relay-slot fixtures as the production path.

## 14. Remove Old Production Path And Add Wiring Validators

- [x] 14.1 @impl DEW-008, SDC-001, SUD-001: Remove or rewrite production imports, command docs, examples, tests, and fixtures that still route delegated work through the replaced path.
- [x] 14.2 @impl DEW-008, SDC-001, SDC-002: Remove production slot lifecycle/path authority and rely on work-unit attempt status, envelope, and runtime refs.
- [x] 14.3 @impl DEW-008, WPG-004, FIO-004: Add a static hygiene validator that blocks removed authority tokens and unsupported delegated-provenance check names in active production surfaces.
- [x] 14.4 @impl AGQ-005, SCO-009, WDC-004: Add a static semantic validator or equivalent test that blocks queue demand `work_id`, top-level delegated slot shape, current-slot delegated completion, and index/filesystem pass coverage wording.
- [x] 14.5 @impl GSK-001, RWG-010, RWG-011: Prove new shared helpers are wired into real gate CLIs and gate definitions, not only unit-tested in isolation.
- [x] 14.6 @impl SUD-001, DEW-005, FRE-001: Prove new work-unit helpers are wired into real `operate-work-unit` CLI commands, not only exported.
- [x] 14.7 @impl COS-001, FOR-001, GAF-001, REL-001, TRW-003, TRW-005, LOC-001, LOC-002, LOC-006: Rewrite deterministic checkpoint, fork/repair, trace, and logging references so they name neutral checkpoint/work-unit/queue/gate surfaces rather than the removed relay module.

## 15. Focused Regression Tests

- [x] 15.1 @impl AGQ-005, AGQ-017, AGQ-018: Add queue v2 schema, uniqueness, snapshot hash, projection, inspect, repair, and reentry tests.
- [x] 15.2 @impl DEW-002, FRE-005, SDC-003: Add work-unit ID validation, index schema, envelope, manifest/path consistency, and malformed batch tests.
- [x] 15.3 @impl DEW-003, AGQ-014, SUD-002: Add claim and `claim --count N` tests for contiguous claims, partial success, zero-mutation, blockers, prompt output, and duplicate prevention.
- [x] 15.4 @impl DEW-005, AGO-003, WPG-002: Add submit tests for out-of-order return, atomic queue completion, exactly-one ledger append, and idempotent duplicate behavior.
- [x] 15.5 @impl DEW-005, CRC-004, WPG-002: Add invalid-submit tests for missing receipt, nonce mismatch, invalid result, missing output/cache, stale snapshot, and corrected submit.
- [x] 15.6 @impl DEW-006, SRL-004, LOG-006: Add terminal attempt tests for fail/timeout/abandon idempotency, mismatch failure, retry allocation, same-batch timeout retry, and late-submit rejection.
- [x] 15.7 @impl DEW-007, WPG-001, WPG-002, WPG-003, GSK-001: Add gate helper tests proving ledger-first coverage and rejection of hand-written rows, filesystem-only outputs, index-only state, and non-work-unit delegated artifacts.
- [x] 15.8 @impl EXO-001, FIO-004, LOG-006: Add observability/log/inspect tests for expired attempts, mixed provenance, projection drift, uncommitted transactions, and mismatch diagnostics.
- [x] 15.9 @impl FRE-001, FRE-004, RET-001: Promote each section-exit check from 3.7 into the regression suite or record why it remains a temporary smoke command with its final evidence source.

## 16. Controlled E2E Playbooks

- [x] 16.1 @impl EXR-001, EXR-002, EXR-004, EXR-006: Rewrite engine-boundary playbook cases so delegated completion uses work-unit claim/submit and delegated `operate-queue complete` fails closed.
- [x] 16.2 @impl RWE-001, RWE-002, RWG-001: Rewrite Wave0 playbooks for multi-work-unit source intake, invalid result/missing receipt/orphan output failures, timeout retry, repair/refill, and gate pass through ledger coverage.
- [x] 16.3 @impl RWE-001, RWE-003, WAI-006: Rewrite Wave1 playbooks for topic deepening, out-of-order submit, successful-submit backfill, and rejection of non-work-unit delegated artifacts.
- [x] 16.4 @impl RWE-001, RWE-004, WTS-005: Rewrite Wave2 playbooks so pure synthesis needs no delegated row and optional targeted evidence must submit by `work_id`.
- [x] 16.5 @impl RWE-005, RWE-006, AGQ-014: Rewrite full-chain and repair-loop playbooks so gates run only after phase drain and gate failure opens repair/refill batches with `batch_reason`.
- [x] 16.6 @impl RWE-007, RWE-008, RWE-009, RWE-010: Add fault-tolerance E2E for invalid submit, fail, timeout, abandon, duplicate submit, stale binding, late submit rejection, and no mixed provenance pass.
- [x] 16.7 @impl AGT-009, EEX-003, EEX-004: Rewrite evidence-extraction controlled experiment proof roles so fixture, standard, and real-Agent cases use work-unit submit, submitted ledger coverage, and work-unit cache trail validation.

## 17. Full Validation And Release Hygiene

- [x] 17.1 @impl FRE-001, FRE-004: Update `CHANGELOG.md` with framework version bump `v0.3 -> v0.4` and concise mechanism-replacement summary.
- [x] 17.2 @impl FRE-001, FRE-004: Sync `DPT_FRAMEWORK/RUN.md` version banner and runtime guide wording with the `v0.3 -> v0.4` changelog entry.
- [x] 17.3 @impl DEW-008, WPG-004, FIO-004: Run final old-token and semantic hygiene scans across active specs, governance, framework, guidelines, tests, and playbooks; active production hits must be removed or explicitly cleanup-only.
- [x] 17.4 @impl AGQ-001, FRE-001, AGO-001, WPG-001: Run focused unit/integration tests for queue v2, work-unit lifecycle, ledger/cache, gates, file observability, logging, and CLI exit conventions.
- [x] 17.5 @impl EXR-001, RWE-001, EXO-001: Run updated controlled E2E playbooks using real CLIs and disposable bundles; verdicts must come from trace JSONL, gate output, or playbook verdict artifacts.
- [x] 17.6 @impl AGQ-001, FRE-001, AGO-001, WPG-001: Run the full regression suite required by the repo and fix failures instead of burying them under focused or E2E passes.
- [x] 17.7 @impl RET-001, AGQ-001, FRE-001, WPG-001: Run `node openspec/governance/check-project-reqs.mjs`, `node openspec/governance/check-project-specs.mjs`, and `openspec validate replace-subagent-relay-with-work-units --strict`.
- [x] 17.8 @impl RET-001, DEW-008, GSK-008, LOG-006, LOG-007: During archive/sync readiness, verify main spec `> req:` headers include any IDs removed from requirement titles by this change; repair header drift before treating governance as complete.
- [x] 17.9 @impl DEW-001, DEW-008, RWP-001: Before archive, write a short residual-risk note distinguishing mechanism proof, real Agent behavior proof, negative diagnostic coverage, and deferred risks.
- [x] 17.10 @impl DEW-008, RET-006, RWP-001: Run a guidelines-specific semantic scan before archive; active `guidelines/` production guidance SHALL have zero old relay/slot authority hits, and any remaining `sub-agent` mentions SHALL refer only to the actor executing a work-unit task.

## 18. Archive/Sync Gate (Do Not Run During Apply)

- [x] 18.1 @impl DEW-008, RET-005: After archive/sync applies the delta specs to main specs, verify retired old capability directories are absent from active main specs or have no production requirements, then update governance prefixes/groups to the deprecated `no spec directory` form only after the corresponding requirements are removed.
