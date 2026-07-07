## 1. Review Gate

- [ ] 1.1 Review this proposal, design, and delta specs before any target surface edits.
- [ ] 1.2 Confirm that `openspec/changes/archive/` remains excluded from cleanup, hygiene failures, and file edits.
- [ ] 1.3 @impl DEW-008, RET-006: Refresh the focused stale-token audit outside `openspec/changes/archive/`, including active change deltas, current `_backlog` planning/bug/todo notes, top-level docs, retired-only token families, and context-sensitive token families; keep `_original_*` archives excluded; update `surface-inventory.md` before editing target surfaces.
- [ ] 1.4 @impl DEW-008, RET-006: Classify every inventory hit as `migrate`, `remove`, `negative`, `deprecated-registry`, `checker-self-reference`, `cleanup-control`, `current-work-unit-context`, `past-failure-history`, or `release-history-minimized`; no `unknown`, `legacy/backlog`, or unreviewed row may remain at archive.
- [ ] 1.5 Confirm phase boundary: until apply is explicitly approved, edits stay under `openspec/changes/clean-delegated-work-surfaces/` and necessary `openspec/governance/` metadata only.

## 2. Main Spec Delta Sync Targets

- [ ] 2.1 @impl DEW-001, DEW-008: Ensure active main specs describe only the work-unit delegated path outside `openspec/changes/archive/`.
- [ ] 2.2 @impl SDC-001, SDC-002, SDC-003: Clean `subagent-directory-contract` so Purpose and Requirements describe `_work_units/waveN/{work_id}/`, not `_subagents/` relay slot authority.
- [ ] 2.3 @impl SNC-001, SNC-002, SNC-003: Clean `subagent-node-contract` so task, result, lifecycle, and prompt guidance bind work-unit identity and submit, not old relay driver/task generation.
- [ ] 2.4 @impl SUD-001, SUD-003, SUD-006: Clean `subagent-dispatch` so dispatch means Engine work-unit claim and prompt handoff, not bounded relay slots.
- [ ] 2.5 @impl AGO-003, AGO-004, AGO-005: Clean `agent-output-declaration` so examples and requirements use work-unit submit ledger rows only.
- [ ] 2.6 @impl FRE-001, FRE-004, FRE-005: Clean `framework-engine` so engine/import guidance names work-unit mechanisms, not retired relay modules.
- [ ] 2.7 @impl REL-001: Clean `repair-loop` so deterministic repair-loop semantics do not name retired delegated relay modules as production anchors.
- [ ] 2.8 @impl WPG-001, WPG-004, WPG-008, WPG-010, WPG-011: Clean `work-unit-provenance-gate` so Purpose and provenance-forensics guidance describe work-unit ledger/index/manifest/result/receipt/beacon/lifecycle signals, not the archived relay replacement change.
- [ ] 2.9 @impl DEW-001, WPG-001: Remove stale auto-archive Purpose text such as "after archiving replace-subagent-relay-with-work-units" from `delegated-work-units` and `work-unit-provenance-gate` during OpenSpec sync/archive.
- [ ] 2.10 @impl FRE-001, AGT-001, AGT-002, AGT-003, AGT-005, AGO-003: Clean stale Purpose text in `framework-engine`, `agent-testing`, and `agent-output-declaration` where it still implies subagent relay mechanisms, old simple/medium/complex experiment taxonomy, old `test-simple`/`test-medium`/`test-complex` files, or relay slot output authority.
- [ ] 2.11 @impl FIO-001, FIO-002, FIO-004: Clean `file-observability` so Purpose and diagnostics describe work-unit file observability, non-authoritative unplanned files, and mixed-provenance blockers without leaving `TBD` or old delegated path authority.
- [ ] 2.12 @impl AGQ-005, AGQ-006, AGQ-009, AGQ-013, AGQ-019, AGQ-020: Clean `agentic-queue` so Purpose, experiment requirements, and task-card examples describe queue v2 ordered `active_window`, current capacity semantics from the queue v2 schema/constant, `queue_item_id` demand identity, and work-unit-only `work_id`; remove stale fixed five-slot/current-slot wording and old simple/medium/complex runner taxonomy where it reads as current instruction.

## 3. Hygiene Gate

- [ ] 3.1 @impl RET-006, DEW-001, DEW-008: Extend `validate-work-unit-hygiene.mjs` to scan current specs, active deltas, framework surfaces, shared experiment infra, tests, guidelines, governance metadata, top-level docs, current `_backlog` planning/bug/todo notes, `experiments_env/shared`, and `experiments_playbook`, while excluding `openspec/changes/archive/` and `_original_*` archives.
- [ ] 3.2 @impl RET-006, DEW-008: Add allowlists only for explicit negative tests/diagnostics, deprecated registry entries, checker/test self-references, cleanup-control artifacts in the active cleanup change, current-work-unit-context for context-sensitive tokens, minimized release-history wording, or explicit past-failure/removed-design backlog context; stale positive relay/slot, delegated-ledger, and old queue-slot production wording SHALL fail.
- [ ] 3.3 @impl RET-006: Add regression tests proving archive exclusion, `_original_*` exclusion, current-surface detection, current-backlog stale guidance detection, and allowed negative/deprecated/checker-self-reference/cleanup-control/current-work-unit-context/minimized-release-history/past-failure contexts.
- [ ] 3.4 @impl RET-006, DEW-008: Ensure the hygiene JSON output is useful for audit closure: file, line, code/category, and enough detail to update `surface-inventory.md`.
- [ ] 3.5 @impl RET-006, DEW-008: Treat `runtime_receipt_ref`, `receipt_nonce`, `_beacon.json`, lifecycle wording, and work-unit code-local `receiptNonce` as context-sensitive rather than retired-only; fail them only when paired with old relay/slot examples, old relay trace/log identity, or old queue slot authority.
- [ ] 3.6 @impl RET-006, AGQ-019: Add semantic hygiene coverage for old queue wording that does not contain explicit slot field names, including fixed five-slot active-window wording and queue demand examples that use `work_id` where `queue_item_id` is required; allow current queue v2 capacity wording such as `QUEUE_ACTIVE_WINDOW_LIMIT = 20` and multi-item refill/preemption tests when they use ordered array indexes and `queue_item_id`.

## 4. Experiment Surfaces

- [ ] 4.1 @impl PLR-003, AGT-003: Update current runner surfaces, including `experiments_playbook/RUN_EXPS.md` and `experiments_playbook/README.md`, so relay/slot and old queue-slot playbooks are not listed as current production proof.
- [ ] 4.2 @impl AGT-003, DEW-001: Triage playbooks that still rely on `drive-relay-slot`, `subagent-relay`, `_subagents/wave*`, `slot_result_ref`, `subagent_slot_presence`, `slotKey`, `roleAgentKey`, `relay_commit_*`, `relay_spawn_*`, `dispatch.json`, retired relay helper APIs, hand-written delegated ledger rows, or old queue slot shape; migrate those with current work-unit or queue v2 proof value and remove those that have lost current proof/diagnostic value.
- [ ] 4.3 @impl AGT-003: For any migrated playbook, preserve Markdown Agent Flow with thin JS deterministic checkpoints per `guidelines/command-experiments.md`.
- [ ] 4.4 @impl PLR-003, AGT-003: Remove the current Legacy/backlog table and README reference as permanent runner surfaces; migrate valuable cases into current Light/Standard/Heavy tables and remove obsolete cases/files or entries from current surfaces.
- [ ] 4.5 @impl PLR-003, AGT-003, WPG-011: Explicitly handle `exp_system-logging/case-76-light-spawn-prompt-logging.md`, `case-77-standard-subagent-logging.md`, and `case-79-standard-provenance-forensics.md`; they currently contain old relay/slot production paths but are not fully covered by the existing Legacy/backlog table.
- [ ] 4.6 @impl AGT-003, DEW-001: Review known old delegated ledger fixture cases (`case-121`, `case-122`, `case-125`, `case-126`, `case-154`, `case-310`, and `case-501` JS helper) and either migrate fixtures through work-unit submit or remove obsolete current-surface files.
- [ ] 4.7 @impl PLR-003, AGT-003, AGQ-019: Review old queue-control playbooks parked in the current Legacy/backlog table (`exp_agentic-queue/case-41`, `case-42`, `case-43`, `exp_file-observability/case-311`, `case-312`); migrate them to queue v2/current file-observability paths or remove them from current surfaces if their proof value is already covered. Queue playbook migrations SHALL use `active_window[index].queue_item_id` / `refill_pool[index].queue_item_id` assertions and SHALL NOT use named slot fields or queue demand `work_id`.
- [ ] 4.8 @impl AGQ-019, RET-006: Review reentry debuggability playbooks (`exp_reentry-debuggability/case-307`, `case-308`, `case-309`) that stage old queue JSON; migrate them to queue v2 fixtures or remove obsolete current-surface wording if the proof is already covered.
- [ ] 4.9 @impl PLR-003, AGT-003: For every old playbook/helper removed from runner tables because it has no current proof value, delete the corresponding current runnable file or move it out of `experiments_playbook/` current runner-readable surfaces; do not leave runnable-looking relay/slot examples behind.

## 5. Current Docs And Tests

- [ ] 5.1 @impl FRE-001, DEW-001: Update current framework docs and command indexes so old relay/slot terms are removed, or appear only as explicit rejection/deprecation/minimized release-history wording that cannot be read as production guidance.
- [ ] 5.2 @impl DEW-008, FRE-005: Update tests that mention retired tokens so they read as negative hygiene/diagnostic tests, not successful production examples.
- [ ] 5.3 @impl DEW-001, FRE-005: Remove old code/test helpers that no longer have current work-unit proof or diagnostic value.
- [ ] 5.4 @impl DEW-008, RET-006: Rewrite or remove stale terms in `DPT_FRAMEWORK/CHANGELOG.md`; keep only minimized release-history wording that cannot be read as current command guidance.
- [ ] 5.5 @impl RET-005, RET-006: Keep deprecated relay/slot requirement registry entries only as `[DEPRECATED]` metadata with no active spec-directory implication.
- [ ] 5.6 @impl DEW-008, FIO-004: Review file-observability tests that use `_subagents/wave_*` fixtures and either migrate them to work-unit fixtures or make their diagnostic-only purpose explicit.
- [ ] 5.7 @impl DEW-008, FIO-004: Review file-observability implementation and health-verifier negative tests that still name `_subagents/`; keep only if they explicitly prove non-authority rejection, otherwise migrate/remove the wording.
- [ ] 5.8 @impl DEW-008, RET-006: Review current `_backlog/bugs`, `_backlog/todos`, and `_backlog/plans` hits for retired relay/slot production wording; keep only explicit past-failure or removed-design analysis, and migrate/remove any note that still reads as current implementation guidance.

## 6. Verification

- [ ] 6.1 @impl RET-006: Run `node openspec/governance/check-project-reqs.mjs` and confirm PASS.
- [ ] 6.2 @impl RET-006: Run `node openspec/governance/check-project-specs.mjs` and confirm PASS.
- [ ] 6.3 @impl RET-006, DEW-001: Run `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs --json` and confirm PASS.
- [ ] 6.4 @impl RET-006: Run `npm test` and confirm PASS.
- [ ] 6.5 @impl DEW-001, DEW-008, AGQ-019, AGT-001, AGT-002, AGT-005: Run focused stale-token audit outside `openspec/changes/archive/` and `_original_*` archives, including active change deltas and current `_backlog` planning/bug/todo notes, for `drive-relay-slot`, `subagent-relay`, `_subagents/`, `slot_result_ref`, `subagent_slot_presence`, `relay slot`, `slot task`, `slot result`, `slotKey`, `roleAgentKey`, context-sensitive `receiptNonce`, `dispatch.json`, `relay_commit_*`, `relay_spawn_*`, `stageSubagentSlots`, `commitSlotResult`, `collectAndMergeSubagentResults`, `recordAgentSpawnRequested`, `ingestAgentReceipt`, `runProvenanceForensics`, old queue slot shapes (`slot_1_current`, `slot_2_next`, `slot_*_pending`, `slot_5_tail`, `slot_20_tail`), fixed five-slot active-window wording, queue demand `work_id` examples, and old `test-simple`/`test-medium`/`test-complex` experiment taxonomy; classify every remaining hit as allowed or fix it, and explicitly distinguish valid queue v2 capacity/multi-item test wording from old named-slot state shape.
- [ ] 6.6 @impl AGT-003, PLR-003: Run affected migrated light/standard playbooks step by step from Markdown and verify trace-backed PASS; removed old playbooks SHALL NOT appear in the current runner report.
- [ ] 6.7 @impl DEW-008, RET-006: Confirm `surface-inventory.md` has no unresolved rows and matches the final focused audit output outside `openspec/changes/archive/`.
