## 1. Governance And Proposal Readiness

- [ ] 1.1 Review proposal/design/spec deltas against `_backlog/bugs/BUG-033` and `BUG-037` through `BUG-043`, plus `dpt_rb_aidlc-investigation/` evidence, before apply.
- [ ] 1.2 Run `openspec status --change "harden-autonomous-research-return-map" --json` and confirm apply-required artifacts are present.
- [ ] 1.3 Run `node openspec/governance/check-project-reqs.mjs` and fix requirement registry/spec traceability issues for BUI-002, CDP-005, CRC-007, DEW-009, DEW-010, CPT-006, RRM-001, RRM-002, RRM-003, SWE-005, SNC-004, REF-007, and RWG-016.
- [ ] 1.4 Run `node openspec/governance/check-project-specs.mjs` and fix delta/main spec structure issues.
- [ ] 1.5 Risk burn-down: confirm every changed requirement has a target implementation surface and focused test/validator surface before editing framework code.
- [ ] 1.6 Scope lock: record that this change SHALL NOT add filesystem/hybrid delegated coverage fallback, hand-written ledger repair, status auto-repair, JS lifecycle walker, or return-map gate authority.
- [ ] 1.7 Authority lock: classify every new check as one of delegated coverage authority, binding cross-check, phase handoff audit, inspect/advice diagnostic, or Agent-facing guidance; fix any ambiguous task/spec wording.
- [ ] 1.8 Return-map lock: confirm RRM implementation is guidance/inspect/advice/backfill-shape validation only and does not replace ledger, gate attempt, handoff, readiness, or final-delivery evidence.
- [ ] 1.9 Surfacing lock: confirm SWE implementation treats `surfacing_intent` as a would-have-surfaced diagnostic followed by aborting user-facing surfacing, not as permission to surface.
- [ ] 1.10 Drift/leak lock: confirm CPT audit outcomes use the closed vocabulary and BUI repo-root leak diagnostics distinguish active-bundle blockers from cleanup debris.
- [ ] 1.11 Implementation surface map: before apply, record the concrete target files/modules and focused test files for each changed requirement ID in this task list or `design.md`.
- [ ] 1.12 Bug-probe lock: before editing framework code, ensure every row in the Bug-Probe Regression Matrix below has at least one focused unit or integration regression target; add a controlled experiment plan only when the failure depends on real Agent/sub-agent/playbook behavior that cannot be proven by deterministic regression tests.
- [ ] 1.13 Fixture discipline: bug-probe fixtures should be minimal disposable bundle shapes derived from the historical failure signatures, not copied/repaired historical runs; fixture-backed tests must not claim to prove real Agent search, writing, or judgment unless an experiment actually exercises that actor path.

### 1.A Expected Implementation Surface Map

Use this map during apply to keep work scoped. Update it if implementation discovers a better local surface, but do not leave a requirement without an explicit code/docs/test target before editing framework code.

| Req | Primary surfaces | Focused verification intent |
| --- | --- | --- |
| BUI-002 | `inspect-bundle` / bundle inspection helpers / optional gate preflight | repo-root leak, valid bundle-root dirs, active-bundle blocker vs cleanup debris |
| DEW-009 | work-unit claim/task generation and claim/spawn output | absolute `bundle_dir`, exact identity fields, write-before-return checklist |
| DEW-010 | work-unit submit, ledger hash binding, gate/preflight cross-check helpers | post-submit drift, missing ledger row, no hand-written ledger/status advice |
| SNC-004 | sub-agent role specs, generated task Markdown, spawn prompt validation | beacon-first path resolution, write-capable role declaration, no final delivery assignment |
| REF-007 | shared/workflow docs, work-unit task text, source/reference diagnostics | top-level YAML array guidance, required fields, non-frontmatter reference metadata |
| RWG-016 | wave gate diagnostics and shared gate helper diagnostics | YAML shape, ledger-only gaps, cache mapping, hash drift, no phase bypass advice |
| CRC-007 | work-unit submit cache validation plus gate/preflight re-check | fetched/degraded page content required, placeholder/empty rejection, undeclared cache non-authority |
| RRM-001..003 | shared return-map guidance, wave/backfill instructions, inspect/advice shape checks | consistent fields, diagnostic-only validator, no gate/evidence authority substitution |
| CPT-006 | phase transition audit command/helper | closed outcomes, missing witness, manual bypass suspicion, diagnostic-only no mutation |
| CDP-005 | readiness/final inspection or phase status audit | premature `final/` non-authority, legal readiness-to-final delivery evidence |
| SWE-005 | silent execution guidance and trace/log event path | would-have-surfaced diagnostic then abort, diagnostic-only event shape |

### 1.B Bug-Probe Regression Matrix

Use this matrix as the apply-time failure replay plan. Prefer `tests/` unit or integration coverage whenever the bug can be reproduced through schemas, helpers, CLIs, gates, trace, or bundle fixtures. Add or update `experiments_playbook/` only for the small number of cases where the proof question is whether an Agent-facing loop follows Markdown, reads Engine feedback, invokes a real Sub-agent, or stays silent across a multi-step run.

| Bug probe | Minimal failure shape to replay | Primary regression asset | Integration coverage | Experiment candidate if regression is insufficient | Covered tasks |
| --- | --- | --- | --- | --- | --- |
| BUG-033 wave0 failed gate jumps to final | `rb_status.json` remains between `seed_topics_ready` and `wave0_complete`, latest wave0 gate failed, yet `final/report.md` exists | Unit tests for readiness/final inspection and phase audit classification of premature final output | Disposable bundle integration fixture with failed gate trace, no legal Final `load_complete`, and final artifact present | Standard playbook for gate-fail repair loop that must stay in current phase and not produce final delivery | 8.1, 8.3, 8.6, 9.4 |
| BUG-037 repo-root runtime leak | repo root contains `_work_units/`, `artifacts/`, `_cache/`, `reference/`, `final/`, or accidental command-output file while active bundle has same valid basenames | Unit tests for path classifier: active bundle root valid, repo-root leak, active-bundle-associated blocker, unrelated cleanup debris | `inspect-bundle` or preflight integration fixture with both bundle-root valid dirs and repo-root leaked dirs | Light/standard playbook only if leak detection must be shown as Agent-readable feedback inside a real bundle run | 2.1, 2.2, 4.1, 4.4 |
| BUG-038 undocumented `source.yaml` shape | `source.yaml` is a top-level object with `wave`, `topic`, or `sources`, or entries omit `retrieved_date` / `topic_tag` | Unit tests for YAML parser diagnostics naming object keys and exact missing paths | Wave gate integration fixture with failed object wrapper, then valid top-level array pass | No experiment unless Agent-facing docs need a real playbook check for repair readability | 5.1, 5.3, 6.1, 6.5 |
| BUG-039 sub-agent chat-only return | work unit has no `result.json`, empty `runtime-receipt.jsonl`, missing declared outputs/cache, or Phase Agent receives research text only | Unit tests for task/spawn text requiring write-before-return and submit rejection for missing files | Work-unit submit integration fixture that keeps attempt unsubmitted/rejected when files are absent | Heavy sub-agent playbook only if role/tool availability or native Sub-agent compliance must be verified | 2.3, 2.4, 2.5, 2.6, 3.4 |
| BUG-040 invented `receipt_nonce` | `_beacon.json` nonce differs from nonce in `runtime-receipt.jsonl` or `result.json` | Unit tests for exact identity block rendering and nonce mismatch diagnostics | Work-unit submit integration fixture rejecting mismatched receipt/result nonce and naming the mismatched surface | Standard playbook only if spawn prompt readability needs live Sub-agent validation | 2.1, 2.2, 3.1, 3.4 |
| BUG-041 filesystem-only shared refs | countable `reference/00-shared-*.md` files exist, but no submitted ledger row declares them | Unit tests for ledger-only counting diagnostic and explicit no-filesystem-fallback behavior | Wave gate integration fixture with countable file present but missing ledger row | No experiment unless Agent repair loop needs proof that advice creates new work-unit path instead of hand-written ledger | 3.3, 3.4, 6.2, 6.5 |
| BUG-042 hand-edited status skips wave1/wave2 | `rb_status.json` claims downstream phase while trace lacks passed gate, route-bound `load_complete`, or `phase_transition` witnesses | Unit tests for closed audit outcomes: `manual_bypass_suspected`, `failed_gate_downstream_status`, `missing_witness` | Bundle integration fixture with failed wave0 gate and edited status to `wave2_complete` or HITL2 window | Standard playbook for status-drift feedback only if Agent must demonstrate returning to latest legal phase | 8.1, 8.2, 8.4, 8.5, 8.6 |
| BUG-043 non-HITL surfacing | non-terminal `stop: no` phase records no legal HITL entry but Agent attempts progress/report/user-choice surfacing | Unit/static tests for silent wording, `surfacing_intent` event shape, and diagnostic-only semantics | Trace/log integration fixture with would-have-surfaced event followed by abort/no HITL authorization | Standard/heavy playbook if the actual proof is that a Markdown-driven Agent loop logs intent and continues silently | 9.1, 9.2, 9.3, 9.4, 9.5 |
| Cache placeholder from AIDLC run | declared cache leaf has zero-byte `page.md`, header-only placeholder, unrelated synthesized topic summary, or missing `meta.json.url` mapping | Unit tests for cache content classifier: fetched content, degraded capture, fetch failure, placeholder, empty, synthesized summary | Work-unit submit/gate integration fixture rejecting incomplete declared cache content before coverage pass | Standard playbook only if external fetch/degraded-capture guidance needs end-to-end Agent proof | 6.3, 6.5, 7.7, 7.8, 7.9 |
| Post-submit result drift | ledger row has `result_hash`, current `result.json` changes after submit, or output/cache binding no longer matches | Unit tests for hash/binding comparison and repair-targeted diagnostic wording | Work-unit submit then mutate fixture, followed by gate/preflight integration failure naming `work_id` | No experiment; this should stay deterministic | 3.1, 3.2, 3.4, 6.5 |
| Return-map prose-only backfill | seed-topic or wave artifact contains useful conclusion/prose but lacks `evidence_meaning`, `relationship`, `refs`, `status`, or `next_hop` | Unit/static validator tests for missing return-map fields and diagnostic-only behavior | Integration fixture where malformed return map is reported but does not affect delegated gate/handoff/readiness authority | Standard playbook only if future Agent re-entry/readability needs a real bundle walkthrough | 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9 |

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
- [ ] 4.3 Implement BUI-002: diagnostics distinguish current active-bundle blockers from unassociated old cleanup debris.
- [ ] 4.4 Add regression tests for repo-root leak diagnostics, valid bundle-root runtime directories, active-bundle blocker classification, and cleanup-debris classification.

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
- [ ] 7.6 Implement RRM-001/RRM-003: ensure return-map validators/inspectors are diagnostic only and do not create, revoke, or substitute delegated gate coverage, phase handoff, readiness, or final-delivery evidence.
- [ ] 7.7 Implement CRC-007: update work-unit submit/cache helpers or wave gate preflight so accepted source cache leaves require non-empty fetched `page.md` content or explicit degraded-capture/fetch-failure records.
- [ ] 7.8 Implement CRC-007: ensure placeholder-only `page.md`, zero-byte `page.md`, missing `meta.json.url` mapping, or synthesized topic summaries are diagnosed as incomplete cache content rather than accepted fetched-page cache.
- [ ] 7.9 Add regression tests for Wave0/Wave1/Wave2 return-map backfill shape, missing return-map fields, return-map diagnostic-only behavior, valid cache content capture, placeholder/empty cache rejection, and explicit degraded-capture handling.

## 8. Phase Status Drift Audit

- [ ] 8.1 Implement CPT-006: add or extend phase transition audit using `rb_trace.jsonl`, manifest, transition chain, and `rb_status.json` to detect impossible status windows.
- [ ] 8.2 Implement CPT-006: audit reports manual bypass suspicion when status advances without the required passed gate, route-bound `load_complete`, and `phase_transition`.
- [ ] 8.3 Implement CDP-005: final artifacts count as delivery evidence only after legal readiness-to-final handoff and route-bound Final entry; premature `final/` files are reported as phase-boundary violations.
- [ ] 8.4 Implement CPT-006: audit remains diagnostic and does not mutate status.
- [ ] 8.5 Implement CPT-006: audit output uses the closed outcomes `passed`, `status_drift`, `manual_bypass_suspected`, `missing_witness`, `failed_gate_downstream_status`, and `bootstrap_exception`.
- [ ] 8.6 Add regression tests for failed-gate downstream status, skipped wave1/wave2 suspicion, missing witness, explicit bootstrap exception, premature final output, and legal witnessed handoff pass.

## 9. Silent Surfacing Observability

- [ ] 9.1 Implement SWE-005: Agent-facing silent execution guidance defines `surfacing_intent` as a would-have-surfaced diagnostic followed by aborting the prohibited user-facing pause in non-terminal `stop: no`.
- [ ] 9.2 Implement SWE-005: provide or reuse a trace/log CLI path for diagnostic `surfacing_intent` events with bundle, node, intent type, and reason.
- [ ] 9.3 Implement SWE-005: document and enforce that `surfacing_intent` is diagnostic only, not gate pass, handoff, HITL authorization, final delivery, or status synchronization evidence.
- [ ] 9.4 Implement SWE-005: diagnostics can flag missing intent evidence or illegal surfacing suspicion without claiming deterministic interception of all chat output.
- [ ] 9.5 Add tests/validators for silent execution wording and trace/log shape.

## 10. Version And Current Guidance Cleanup

- [ ] 10.1 Update `DPT_FRAMEWORK/CHANGELOG.md` for target `v0.5` with concise notes on autonomous work-unit hardening and research return-map/cache-content capture.
- [ ] 10.2 Update `DPT_FRAMEWORK/RUN.md` version banner to match the latest CHANGELOG entry.
- [ ] 10.3 Scan current framework docs, workflow Markdown, tests, guidelines, and runnable playbooks outside `openspec/changes/archive/` for wording that encourages hand-written delegated outputs, status edits, non-HITL surfacing, evidence-list-only backfill, or placeholder cache trails; migrate or remove current-surface drift covered by this change.

## 11. Apply Slice Discipline

- [ ] 11.1 Slice A governance/static wording: finish tasks 1, 5, static wording portions of 9, and any static validators before runtime behavior changes.
- [ ] 11.2 Slice B producer path: finish tasks 2 and related 4 diagnostics before relying on new submit/gate behavior.
- [ ] 11.3 Slice C delegated authority and cache: finish tasks 3, 6, and CRC portions of 7 with focused tests before phase audit work.
- [ ] 11.4 Slice D phase boundary and surfacing: finish tasks 8 and runtime/trace-log SWE portions of 9 with explicit diagnostic-only assertions.
- [ ] 11.5 Slice E return-map and cleanup: finish RRM portions of 7 plus version/current-surface cleanup after authority-bearing paths are stable.
- [ ] 11.6 After each slice, run the focused tests/validators for the touched requirement IDs and record residual risk before starting the next slice.

## 12. Verification

- [ ] 12.1 Run focused regression tests added for DEW-009, DEW-010, BUI-002, CDP-005, CRC-007, REF-007, RRM-001 through RRM-003, RWG-016, CPT-006, SNC-004, and SWE-005.
- [ ] 12.2 Run `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`.
- [ ] 12.3 Run `npm test`.
- [ ] 12.4 Run `node openspec/governance/check-project-reqs.mjs` and confirm 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired.
- [ ] 12.5 Run `node openspec/governance/check-project-specs.mjs` and confirm 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader.
- [ ] 12.6 Record apply evidence and any residual risk in this task list before requesting archive.
