## 0. Test And Playbook Asset Placement

- [ ] 0.1 Keep this change's primary verification in repo-root regression tests under `tests/`; do not add `DPT_FRAMEWORK/` test files, new `experiments_playbook/` cases, or real-environment E2E for this change.
- [ ] 0.2 Reuse the existing test assets where possible: `tests/schema/contracts/status.test.mjs`, `tests/integration/cli/instantiate-run-bundle.test.mjs`, `tests/integration/cli/validate-bundle.test.mjs`, `tests/integration/cli/enter-phase.test.mjs`, `tests/integration/cli/advance-status.test.mjs`, `tests/integration/cli/check-reentry.test.mjs`, `tests/engine/command-contract-docs.test.mjs`, `tests/engine/work-unit-submit.test.mjs`, `tests/integration/cli/operate-work-unit.test.mjs`, and `tests/integration/cli/operate-queue-validation.test.mjs`.
- [ ] 0.3 Add focused version-management static coverage in `tests/engine/version-management.test.mjs` because current tests scan `RUN.md` wording but do not own the repo-root CHANGELOG / RUN banner / stale framework-local CHANGELOG contract.
- [ ] 0.4 Audit existing controlled playbook/helper assets that depend on status fixtures or real `enter-phase` / `advance-status`: `experiments_env/shared/new-disposable-bundle.mjs`, `experiments_env/shared/work-unit-playbook-utils.mjs`, `experiments_env/shared/run-fixture-backed-case.mjs`, and `experiments_playbook/exp_handoff-witnessing/case-501-standard-handoff-witnessing.mjs`; update existing assets only when needed for `current_node: null` templates or `enter-phase` current_node writes.

## 1. Current Node Status Coordinate

- [ ] 1.1 实现 CMI-006/CPT-007: update `rb_status.json` template and `StatusSchema` so new bundles include `current_node: null`, populated nodes are strings, and legacy bundles without the field remain valid.
- [ ] 1.2 实现 CPT-003/CPT-007: update `enter-phase.mjs` so successful route-bound load writes `rb_status.json.current_node` to the target node after `load_complete`.
- [ ] 1.3 实现 CPT-007: update `advance-status.mjs` so status synchronization preserves existing `current_node` while updating only the gate window fields and `phase_transition`.
- [ ] 1.4 Add status schema/template coverage in `tests/schema/contracts/status.test.mjs`, `tests/integration/cli/instantiate-run-bundle.test.mjs`, and `tests/integration/cli/validate-bundle.test.mjs` for `current_node: null`, populated string nodes, and legacy absence.
- [ ] 1.5 Add `enter-phase` coverage in `tests/integration/cli/enter-phase.test.mjs` proving successful route-bound entry writes `rb_status.json.current_node` while preserving Markdown-only success stdout.
- [ ] 1.6 Add `advance-status` coverage in `tests/integration/cli/advance-status.test.mjs` proving status synchronization preserves `current_node` while updating `current_gate`, `next_gate`, and `phase_transition`.
- [ ] 1.7 Add failure-path coverage in `tests/integration/cli/enter-phase.test.mjs` proving `current_node` write failure returns diagnostic JSON instead of successful Markdown.

## 2. Reentry And Boot Guidance

- [ ] 2.1 实现 BUS-003/ACS-004: update `START_FROM_HERE.md` template and `command_playbook/start-research.md` so Agents understand non-null `current_node` as the resume phase coordinate distinct from `current_gate`/`next_gate`.
- [ ] 2.2 实现 RRD-007: update reentry/status diagnostic output to surface `rb_status.json.current_node` when present and report legacy absence without failing solely for absence.
- [ ] 2.3 Add regression coverage in `tests/integration/cli/check-reentry.test.mjs` for present current_node, initial `current_node: null`, and legacy status without current_node.
- [ ] 2.4 Add command-surface/static guidance coverage in `tests/engine/command-contract-docs.test.mjs` proving active-bundle resume docs do not tell the Agent to infer the current phase from `current_gate` alone.

## 3. Work-Unit Submit Queue Postcondition

- [ ] 3.1 实现 DEW-011: update work-unit submit success path to verify durable `rb_queue.json` postconditions after write/reload.
- [ ] 3.2 实现 DEW-011: ensure submit failure diagnostics name missing queue postconditions and advise Engine queue/work-unit repair, not manual `rb_queue.json` edits.
- [ ] 3.3 Add core regression coverage in `tests/engine/work-unit-submit.test.mjs` proving successful submit reloads durable `rb_queue.json`, removes the queue item from `delegated_in_flight`, and records terminal history.
- [ ] 3.4 Add CLI regression coverage in `tests/integration/cli/operate-work-unit.test.mjs` proving submit success reports only after durable queue postconditions hold.
- [ ] 3.5 Add failure-path coverage in `tests/engine/work-unit-submit.test.mjs` for a simulated missing queue postcondition causing structured submit failure rather than false success.
- [ ] 3.6 Add failure-path coverage in `tests/engine/work-unit-submit.test.mjs` for partial submit/rollback failure diagnostics marking work-unit/queue completion state as suspect.

## 4. Queue Topic Identity And Supplementary Demand

- [ ] 4.1 实现 QIV-001/AGQ-021: update enqueue topic resolution so explicit `payload.topic_slug` / `lineage.topic_slug` are authoritative and validated against `topic_registry`.
- [ ] 4.2 实现 QIV-001/AGQ-021: keep `queue_item_id` parsing as fallback only when no explicit topic slug exists, and do not reject valid explicit topic tasks solely due to iteration suffixes.
- [ ] 4.3 Add enqueue validation coverage in `tests/integration/cli/operate-queue-validation.test.mjs` for `wave1-deepen-<topic>-v2` with valid `payload.topic_slug` passing validation.
- [ ] 4.4 Add enqueue validation coverage in `tests/integration/cli/operate-queue-validation.test.mjs` that conflicting explicit `payload.topic_slug` and `lineage.topic_slug` still fail closed.
- [ ] 4.5 Add enqueue validation coverage in `tests/integration/cli/operate-queue-validation.test.mjs` that topic-scoped tasks with no resolvable explicit or fallback slug still fail closed.
- [ ] 4.6 Add enqueue validation coverage in `tests/integration/cli/operate-queue-validation.test.mjs` that valid `lineage.topic_slug` alone can provide explicit topic identity when `payload.topic_slug` is absent.

## 5. Versioning And Documentation

- [ ] 5.1 实现 VEM-001/VEM-002/VEM-004: update repo-root `CHANGELOG.md` with target version `v0.6` and a concise summary of current_node, submit postcondition, and queue topic identity changes.
- [ ] 5.2 实现 RUE-001/VEM-003: update `DPT_FRAMEWORK/RUN.md` version banner to match the latest repo-root `CHANGELOG.md` entry, `v0.6`.
- [ ] 5.3 Ensure Agent-facing docs avoid saying `enter-phase` completes a phase or that `current_node` is gate pass evidence.
- [ ] 5.4 Remove stale `DPT_FRAMEWORK/CHANGELOG.md` so the repo does not expose two competing changelog authorities.
- [ ] 5.5 Add `tests/engine/version-management.test.mjs` coverage so repo-root `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` remain aligned for `v0.6`, the proposal-declared version is visible, and stale `DPT_FRAMEWORK/CHANGELOG.md` is not retained.

## 6. Verification

- [ ] 6.1 Run targeted Node regression tests for the assets named in section 0: status schema/template, phase transition/status, work-unit submit, queue enqueue validation, bundle validation, command-surface guidance, version-management consistency, and reentry diagnostics.
- [ ] 6.2 Run `node openspec/governance/check-project-reqs.mjs` and ensure it reports 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired issues.
- [ ] 6.3 Run `node openspec/governance/check-project-specs.mjs` and ensure it reports 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader issues.
- [ ] 6.4 Run `openspec status --change "stabilize-runtime-position-and-queue"` and confirm the change remains apply-ready.
- [ ] 6.5 Run existing controlled handoff witnessing playbook `node experiments_playbook/exp_handoff-witnessing/case-501-standard-handoff-witnessing.mjs` to verify real `enter-phase` / `advance-status` lifecycle still passes after `current_node` status writes.
