## 1. Review Gate

- [ ] 1.1 Review this proposal, design, and delta specs before any target surface edits.
- [ ] 1.2 Confirm that `openspec/changes/archive/` remains excluded from cleanup, hygiene failures, and file edits.

## 2. Main Spec Delta Sync Targets

- [ ] 2.1 @impl DEW-001, DEW-008: Ensure active main specs describe only the work-unit delegated path outside `openspec/changes/archive/`.
- [ ] 2.2 @impl SDC-001, SDC-002, SDC-003: Clean `subagent-directory-contract` so Purpose and Requirements describe `_work_units/waveN/{work_id}/`, not `_subagents/` relay slot authority.
- [ ] 2.3 @impl SNC-001, SNC-002, SNC-003: Clean `subagent-node-contract` so task, result, lifecycle, and prompt guidance bind work-unit identity and submit, not old relay driver/task generation.
- [ ] 2.4 @impl SUD-001, SUD-003, SUD-006: Clean `subagent-dispatch` so dispatch means Engine work-unit claim and prompt handoff, not bounded relay slots.
- [ ] 2.5 @impl AGO-003, AGO-004, AGO-005: Clean `agent-output-declaration` so examples and requirements use work-unit submit ledger rows only.
- [ ] 2.6 @impl FRE-001, FRE-004, FRE-005: Clean `framework-engine` so engine/import guidance names work-unit mechanisms, not retired relay modules.
- [ ] 2.7 @impl REL-001: Clean `repair-loop` so deterministic repair-loop semantics do not name retired delegated relay modules as production anchors.

## 3. Hygiene Gate

- [ ] 3.1 @impl RET-006, DEW-001, DEW-008: Extend `validate-work-unit-hygiene.mjs` to scan current specs, active deltas, framework surfaces, tests, guidelines, and `experiments_playbook`, while excluding `openspec/changes/archive/`.
- [ ] 3.2 @impl RET-006, DEW-008: Add allowlists only for explicit negative, deprecated, legacy/backlog, or historical contexts; stale positive relay/slot production wording SHALL fail.
- [ ] 3.3 @impl RET-006: Add regression tests proving archive exclusion, current-surface detection, and allowed negative/deprecated/legacy contexts.

## 4. Experiment Surfaces

- [ ] 4.1 @impl PLR-003, AGT-003: Update current runner surfaces so relay/slot playbooks are not listed as current production proof.
- [ ] 4.2 @impl AGT-003, DEW-001: Triage playbooks that still rely on `drive-relay-slot`, `subagent-relay`, `_subagents/wave*`, `slot_result_ref`, or `subagent_slot_presence`; migrate those with current work-unit proof value and remove those that have lost current proof/diagnostic value.
- [ ] 4.3 @impl AGT-003: For any migrated playbook, preserve Markdown Agent Flow with thin JS deterministic checkpoints per `guidelines/command-experiments.md`.
- [ ] 4.4 @impl PLR-003, AGT-003: Ensure any remaining legacy/backlog classification is temporary or has an explicit follow-on migration value; do not keep obsolete relay/slot cases as permanent visible current-surface noise.

## 5. Current Docs And Tests

- [ ] 5.1 @impl FRE-001, DEW-001: Update current framework docs and command indexes so old relay/slot terms appear only as removed or historical, not production guidance.
- [ ] 5.2 @impl DEW-008, FRE-005: Update tests that mention retired tokens so they read as negative hygiene/diagnostic tests, not successful production examples.
- [ ] 5.3 @impl DEW-001, FRE-005: Remove old code/test helpers that no longer have current work-unit proof or diagnostic value.

## 6. Verification

- [ ] 6.1 @impl RET-006: Run `node openspec/governance/check-project-reqs.mjs` and confirm PASS.
- [ ] 6.2 @impl RET-006: Run `node openspec/governance/check-project-specs.mjs` and confirm PASS.
- [ ] 6.3 @impl RET-006, DEW-001: Run `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs --json` and confirm PASS.
- [ ] 6.4 @impl RET-006: Run `npm test` and confirm PASS.
- [ ] 6.5 @impl DEW-001, DEW-008: Run focused stale-token audit outside `openspec/changes/archive/` for `drive-relay-slot`, `subagent-relay`, `_subagents/wave`, `slot_result_ref`, `subagent_slot_presence`, `relay slot`, `slot task`, and `slot result`; classify every remaining hit as allowed or fix it.
- [ ] 6.6 @impl AGT-003, PLR-003: Run affected migrated light/standard playbooks step by step from Markdown and verify trace-backed PASS; do not count legacy/backlog playbook PASS/FAIL as current proof.
