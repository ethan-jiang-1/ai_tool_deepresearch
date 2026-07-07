## 1. Current Node Status Coordinate

- [ ] 1.1 实现 CMI-006/CPT-007: update `rb_status.json` template and `StatusSchema` so new bundles include `current_node` and legacy bundles without it remain valid.
- [ ] 1.2 实现 CPT-003/CPT-007: update `enter-phase.mjs` so successful route-bound load writes `rb_status.json.current_node` to the target node after `load_complete`.
- [ ] 1.3 实现 CPT-007: update `advance-status.mjs` so status synchronization preserves existing `current_node` while updating only the gate window fields and `phase_transition`.
- [ ] 1.4 Add regression coverage for status schema/template acceptance, `enter-phase` current_node update, and `advance-status` preserving current_node.

## 2. Reentry And Boot Guidance

- [ ] 2.1 实现 BUS-003: update `START_FROM_HERE.md` template so Agents understand `current_node` as the resume phase coordinate distinct from `current_gate`/`next_gate`.
- [ ] 2.2 实现 RRD-007: update reentry/status diagnostic output to surface `rb_status.json.current_node` when present and report legacy absence without failing solely for absence.
- [ ] 2.3 Add regression coverage for reentry/diagnostic output with present current_node and legacy status without current_node.

## 3. Work-Unit Submit Queue Postcondition

- [ ] 3.1 实现 DEW-011: update work-unit submit success path to verify durable `rb_queue.json` postconditions after write/reload.
- [ ] 3.2 实现 DEW-011: ensure submit failure diagnostics name missing queue postconditions and advise Engine queue/work-unit repair, not manual `rb_queue.json` edits.
- [ ] 3.3 Add regression coverage proving successful submit removes the queue item from `delegated_in_flight` and records terminal history.
- [ ] 3.4 Add regression coverage for a simulated missing queue postcondition causing structured submit failure rather than false success.

## 4. Queue Topic Identity And Supplementary Demand

- [ ] 4.1 实现 QIV-001/AGQ-021: update enqueue topic resolution so explicit `payload.topic_slug` / `lineage.topic_slug` are authoritative and validated against `topic_registry`.
- [ ] 4.2 实现 QIV-001/AGQ-021: keep `queue_item_id` parsing as fallback only when no explicit topic slug exists, and do not reject valid explicit topic tasks solely due to iteration suffixes.
- [ ] 4.3 Add regression coverage for `wave1-deepen-<topic>-v2` with valid `payload.topic_slug` passing enqueue validation.
- [ ] 4.4 Add regression coverage that conflicting explicit `payload.topic_slug` and `lineage.topic_slug` still fail closed.
- [ ] 4.5 Add regression coverage that topic-scoped tasks with no resolvable explicit or fallback slug still fail closed.

## 5. Versioning And Documentation

- [ ] 5.1 Update `DPT_FRAMEWORK/CHANGELOG.md` with target version `v0.6` and a concise summary of current_node, submit postcondition, and queue topic identity changes.
- [ ] 5.2 Update `DPT_FRAMEWORK/RUN.md` version banner to match `v0.6`.
- [ ] 5.3 Ensure Agent-facing docs avoid saying `enter-phase` completes a phase or that `current_node` is gate pass evidence.

## 6. Verification

- [ ] 6.1 Run targeted Node regression tests for phase transition/status, work-unit submit, queue enqueue validation, bundle validation, and reentry diagnostics.
- [ ] 6.2 Run `node openspec/governance/check-project-reqs.mjs` and ensure it reports 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired issues.
- [ ] 6.3 Run `node openspec/governance/check-project-specs.mjs` and ensure it reports 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader issues.
- [ ] 6.4 Run `openspec status --change "stabilize-runtime-position-and-queue"` and confirm the change remains apply-ready.
