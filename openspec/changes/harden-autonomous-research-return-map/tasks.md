## 1. Governance And Proposal Readiness

- [ ] 1.1 Review proposal/design/spec deltas against `_backlog/bugs/BUG-033` and `BUG-037` through `BUG-043`, plus `dpt_rb_aidlc-investigation/` evidence, before apply.
- [ ] 1.2 Run `openspec status --change "harden-autonomous-research-return-map" --json` and confirm apply-required artifacts are present.
- [ ] 1.3 Run `node openspec/governance/check-project-reqs.mjs` and fix requirement registry/spec traceability issues for BUI-002, CDP-005, CRC-007, DEW-009, DEW-010, CPT-006, RRM-001, RRM-002, RRM-003, SWE-005, SNC-004, REF-007, and RWG-016.
- [ ] 1.4 Run `node openspec/governance/check-project-specs.mjs` and fix delta/main spec structure issues.

## 2. Work-Unit Producer And Role Contract

- [ ] 2.1 Implement DEW-009 and SNC-004: generated work-unit `task.md` includes active `bundle_dir`, exact identity fields, beacon refs, and absolute paths for required result, receipt, output, and cache surfaces.
- [ ] 2.2 Implement DEW-009 and SNC-004: Phase Agent spawn/claim output inlines exact `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, `bundle_dir`, and write-before-return checklist.
- [ ] 2.3 Implement DEW-009: task contract requires sub-agent to write required files before returning, and to return failure rather than chat-only content when files cannot be written.
- [ ] 2.4 Implement SNC-004: write-producing sub-agent roles explicitly declare filesystem write capability or required write tools, and validation/review rejects assigning write-producing work units to roles that cannot write files.
- [ ] 2.5 Add/update regression tests for work-unit task generation and spawn text so relative runtime refs are paired with active-bundle absolute paths and exact identity fields.
- [ ] 2.6 Add/update validators or tests for write-producing role capability declarations.

## 3. Submit, Ledger, And Drift Enforcement

- [ ] 3.1 Implement DEW-010: submit/gate binding checks compare ledger row hashes with current result, manifest, beacon, receipt, index, output files, and cache trails.
- [ ] 3.2 Implement DEW-010: post-submit mutation of `result.json` fails delegated gate coverage with a named `work_id` and repair-targeted diagnostic.
- [ ] 3.3 Ensure DEW-010 diagnostics do not advise hand-editing `rb_output_declarations.jsonl` or `rb_status.json`.
- [ ] 3.4 Add regression tests for submitted result hash drift, missing ledger row, and filesystem-only delegated output rejection.

## 4. Bundle Isolation Diagnostics

- [ ] 4.1 Implement BUI-002: inspection or preflight reports repo-root runtime-looking leaks such as `_work_units/`, `artifacts/`, `_cache/`, `reference/`, or `final/` when an active bundle root is known.
- [ ] 4.2 Implement BUI-002: active bundle root paths with the same basenames are accepted and not misclassified as leaks.
- [ ] 4.3 Add regression tests for repo-root leak diagnostics and valid bundle-root runtime directories.

## 5. Source And Reference Format Guidance

- [ ] 5.1 Implement REF-007: Agent-facing workflow/shared docs and work-unit tasks describe `source.yaml` as a top-level YAML array with required `url`, `title`, `retrieved_date`, and `topic_tag`.
- [ ] 5.2 Implement REF-007: reference Markdown metadata guidance clearly states the accepted metadata format is not YAML frontmatter.
- [ ] 5.3 Add/update tests or validators that lock parser-aligned guidance for `source.yaml` and reference metadata examples.

## 6. Wave Gate Diagnostics

- [ ] 6.1 Implement RWG-016: wave gates distinguish YAML parse failure, top-level object-vs-array shape, and missing required source fields.
- [ ] 6.2 Implement RWG-016: wave gates name ledger-only counting gaps when files exist without submitted work-unit declarations.
- [ ] 6.3 Implement RWG-016 and CRC-007: cache coverage diagnostics name reference path, source URL when available, mapping via `meta.json.url` or source slug, required cache leaf files, and incomplete/placeholder `page.md` content.
- [ ] 6.4 Implement RWG-016: repeated gate failure advice preserves silent execution and does not recommend phase bypass or user surfacing.
- [ ] 6.5 Add regression tests for YAML shape diagnostics, ledger-only count diagnostics, cache coverage diagnostics, and hash drift diagnostics.

## 7. Research Return Map And Cache Content

- [ ] 7.1 Implement RRM-001/RRM-003: add shared Agent-facing return-map guidance with the minimum fields `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`.
- [ ] 7.2 Implement RRM-001/RRM-002: update Wave0 source-intake guidance and seed-topic backfill instructions so Wave0 backfill explains what each important source/reference says, which must-answer or hypothesis it affects, and where to read source/reference/cache/work-unit evidence.
- [ ] 7.3 Implement RRM-001/RRM-002: update Wave1 deepening guidance and backfill instructions so mechanism/trend/open-question updates include meaning statements and refs to `evidence-summary.md`, `question-list.md`, reference files, cache leaves, and work-unit surfaces.
- [ ] 7.4 Implement RRM-001/RRM-002: update Wave2 synthesis/backfill guidance so seed-topic backfill preserves finding IDs and links to `cross-topic-ledger.md`, `finding-index.yaml`, and source artifacts used by the findings.
- [ ] 7.5 Implement RRM-001/RRM-003: add inspect/advice or validator coverage for backfill/artifacts that contain only naked evidence lists or unsupported prose without return-map fields.
- [ ] 7.6 Implement CRC-007: update work-unit submit/cache helpers or wave gate preflight so accepted source cache leaves require non-empty fetched `page.md` content or explicit degraded-capture/fetch-failure records.
- [ ] 7.7 Implement CRC-007: ensure placeholder-only `page.md`, zero-byte `page.md`, missing `meta.json.url` mapping, or synthesized topic summaries are diagnosed as incomplete cache content rather than accepted fetched-page cache.
- [ ] 7.8 Add regression tests for Wave0/Wave1/Wave2 return-map backfill shape, missing return-map fields, valid cache content capture, placeholder/empty cache rejection, and explicit degraded-capture handling.

## 8. Phase Status Drift Audit

- [ ] 8.1 Implement CPT-006: add or extend phase transition audit using `rb_trace.jsonl`, manifest, transition chain, and `rb_status.json` to detect impossible status windows.
- [ ] 8.2 Implement CPT-006: audit reports manual bypass suspicion when status advances without the required passed gate, route-bound `load_complete`, and `phase_transition`.
- [ ] 8.3 Implement CDP-005: final artifacts count as delivery evidence only after legal readiness-to-final handoff and route-bound Final entry; premature `final/` files are reported as phase-boundary violations.
- [ ] 8.4 Implement CPT-006: audit remains diagnostic and does not mutate status.
- [ ] 8.5 Add regression tests for failed-gate downstream status, skipped wave1/wave2 suspicion, premature final output, and legal witnessed handoff pass.

## 9. Silent Surfacing Observability

- [ ] 9.1 Implement SWE-005: Agent-facing silent execution guidance defines `surfacing_intent` logging before any known prohibited user-facing pause in non-terminal `stop: no`.
- [ ] 9.2 Implement SWE-005: provide or reuse a trace/log CLI path for diagnostic `surfacing_intent` events with bundle, node, intent type, and reason.
- [ ] 9.3 Implement SWE-005: document and enforce that `surfacing_intent` is diagnostic only, not gate pass, handoff, HITL authorization, final delivery, or status synchronization evidence.
- [ ] 9.4 Implement SWE-005: diagnostics can flag missing intent evidence or illegal surfacing suspicion without claiming deterministic interception of all chat output.
- [ ] 9.5 Add tests/validators for silent execution wording and trace/log shape.

## 10. Version And Current Guidance Cleanup

- [ ] 10.1 Update `DPT_FRAMEWORK/CHANGELOG.md` for target `v0.5` with concise notes on autonomous work-unit hardening and research return-map/cache-content capture.
- [ ] 10.2 Update `DPT_FRAMEWORK/RUN.md` version banner to match the latest CHANGELOG entry.
- [ ] 10.3 Scan current framework docs, workflow Markdown, tests, guidelines, and runnable playbooks outside `openspec/changes/archive/` for wording that encourages hand-written delegated outputs, status edits, non-HITL surfacing, evidence-list-only backfill, or placeholder cache trails; migrate or remove current-surface drift covered by this change.

## 11. Verification

- [ ] 11.1 Run focused regression tests added for DEW-009, DEW-010, BUI-002, CDP-005, CRC-007, REF-007, RRM-001 through RRM-003, RWG-016, CPT-006, SNC-004, and SWE-005.
- [ ] 11.2 Run `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`.
- [ ] 11.3 Run `npm test`.
- [ ] 11.4 Run `node openspec/governance/check-project-reqs.mjs` and confirm 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired.
- [ ] 11.5 Run `node openspec/governance/check-project-specs.mjs` and confirm 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader.
- [ ] 11.6 Record apply evidence and any residual risk in this task list before requesting archive.
