## 1. Governance And Proposal Readiness

- [x] 1.1 Review proposal/design/spec deltas against `_backlog/bugs/BUG-033` and `BUG-037` through `BUG-043`, plus `dpt_rb_aidlc-investigation/` evidence, before apply.
- [x] 1.2 Run `openspec status --change "harden-autonomous-research-return-map" --json` and confirm apply-required artifacts are present.
- [x] 1.3 Run `node openspec/governance/check-project-reqs.mjs` and fix requirement registry/spec traceability issues for BUI-002, CDP-005, CRC-007, DEW-009, DEW-010, CPT-006, RRM-001, RRM-002, RRM-003, SWE-005, SNC-004, REF-007, and RWG-016.
- [x] 1.4 Run `node openspec/governance/check-project-specs.mjs` and fix delta/main spec structure issues.
- [x] 1.5 Risk burn-down: confirm every changed requirement has a target implementation surface and focused test/validator surface before editing framework code.
- [x] 1.6 Scope lock: record that this change SHALL NOT add filesystem/hybrid delegated coverage fallback, hand-written ledger repair, status auto-repair, JS lifecycle walker, or return-map gate authority.
- [x] 1.7 Authority lock: classify every new check as one of delegated coverage authority, binding cross-check, phase handoff audit, inspect/advice diagnostic, or Agent-facing guidance; fix any ambiguous task/spec wording.
- [x] 1.8 Return-map lock: confirm RRM implementation is guidance/inspect/advice/backfill-shape validation only and does not replace ledger, gate attempt, handoff, readiness, or final-delivery evidence.
- [x] 1.9 Surfacing lock: confirm SWE implementation treats `surfacing_intent` as a would-have-surfaced diagnostic followed by aborting user-facing surfacing, not as permission to surface.
- [x] 1.10 Drift/leak lock: confirm CPT audit outcomes use the closed vocabulary and BUI repo-root leak diagnostics distinguish active-bundle blockers from cleanup debris.
- [x] 1.11 Implementation surface map: before apply, record the concrete target files/modules and focused test files for each changed requirement ID in this task list or `design.md`.
- [x] 1.12 Bug-probe proof-boundary lock: before editing framework code, classify each bug-probe as deterministic-boundary, MD-controller-boundary, Sub-agent-actor-boundary, or mixed. Do not close an MD-controller or Sub-agent-actor bug with static/unit/integration tests alone.
- [x] 1.13 Fixture discipline: bug-probe fixtures should be minimal disposable bundle shapes derived from the historical failure signatures, not copied/repaired historical runs; fixture-backed tests may prove Engine rejection/diagnostics but must not claim to prove real Agent search, writing, judgment, silence, or feedback-following.
- [x] 1.14 Playbook lock: plan controlled `experiments_playbook/` coverage for BUG-033, BUG-039, BUG-042, and BUG-043, and for BUG-037/BUG-040 if the apply claim includes real Sub-agent compliance rather than only Engine rejection and prompt rendering.

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

Use this matrix as the apply-time failure replay plan. The rule is not "unit first, playbook last." The rule is "prove the bug at the layer where it failed." Unit and integration tests are still valuable guardrails for deterministic contracts, but MD-controller behavior, Sub-agent write compliance, feedback-following, and `stop: no` silence need controlled playbook evidence.

| Bug probe | Proof boundary | Minimal failure shape to replay | Deterministic guardrail | Controlled experiment / playbook proof | Covered tasks |
| --- | --- | --- | --- | --- | --- |
| BUG-033 wave0 failed gate jumps to final | Mixed; MD controller proof required | `rb_status.json` remains between `seed_topics_ready` and `wave0_complete`, latest wave0 gate failed, yet `final/report.md` exists | Unit/integration tests classify premature final output and impossible final delivery window | Required standard playbook: run a wave gate failure loop, feed the Phase Agent gate feedback, and verify it repairs/stays in phase without writing `final/` or surfacing | 8.1, 8.3, 8.6, 9.4 |
| BUG-037 repo-root runtime leak | Mixed; Sub-agent actor proof required if fixing producer compliance | repo root contains `_work_units/`, `artifacts/`, `_cache/`, `reference/`, `final/`, or accidental command-output file while active bundle has same valid basenames | Path classifier and `inspect-bundle`/preflight fixture distinguish valid bundle dirs, active-bundle blocker, and cleanup debris | Required heavy Sub-agent playbook when claiming producer fix: real work unit writes under `bundle_dir`, no repo-root leak, Engine feedback remains Agent-readable | 2.1, 2.2, 4.1, 4.4 |
| BUG-038 undocumented `source.yaml` shape | Mostly deterministic; controller proof optional | `source.yaml` is a top-level object with `wave`, `topic`, or `sources`, or entries omit `retrieved_date` / `topic_tag` | Parser/gate tests name object keys and exact missing paths; docs/static checks lock top-level array examples | Optional standard repair-readability playbook only if applying new Agent-facing repair text and wanting proof the Phase Agent fixes shape from feedback | 5.1, 5.3, 6.1, 6.5 |
| BUG-039 sub-agent chat-only return | Sub-agent actor proof required | work unit has no `result.json`, empty `runtime-receipt.jsonl`, missing declared outputs/cache, or Phase Agent receives research text only | Submit tests reject absent files and prompt/static checks require write-before-return | Required heavy Sub-agent playbook: native Sub-agent receives work-unit task, writes required files before returning, and Phase Agent submits instead of transcribing chat text | 2.3, 2.4, 2.5, 2.6, 3.4 |
| BUG-040 invented `receipt_nonce` | Mixed; Sub-agent actor proof required if fixing compliance | `_beacon.json` nonce differs from nonce in `runtime-receipt.jsonl` or `result.json` | Submit integration rejects mismatched receipt/result nonce; rendering tests inline exact identity block | Required in the same Sub-agent playbook as BUG-039 or a focused standard playbook: Sub-agent preserves nonce from task/beacon through receipt and result | 2.1, 2.2, 3.1, 3.4 |
| BUG-041 filesystem-only shared refs | Deterministic authority; controller proof useful for repair loop | countable `reference/00-shared-*.md` files exist, but no submitted ledger row declares them | Gate tests prove ledger-only counting and explicit no-filesystem-fallback behavior | Optional standard playbook: after ledger-only feedback, Phase Agent creates/repairs through work-unit submit rather than hand-writing ledger rows | 3.3, 3.4, 6.2, 6.5 |
| BUG-042 hand-edited status skips wave1/wave2 | Mixed; MD controller proof required | `rb_status.json` claims downstream phase while trace lacks passed gate, route-bound `load_complete`, or `phase_transition` witnesses | Audit tests cover `manual_bypass_suspected`, `failed_gate_downstream_status`, `missing_witness`, no mutation | Required standard playbook: feed status-drift feedback to the Phase Agent and verify it returns to latest legal phase instead of entering HITL2/readiness | 8.1, 8.2, 8.4, 8.5, 8.6 |
| BUG-043 non-HITL surfacing | MD controller proof required | non-terminal `stop: no` phase would surface progress/report/user-choice without legal HITL entry | Static/trace tests lock `surfacing_intent` event shape and diagnostic-only semantics | Required standard/heavy playbook: Phase Agent reaches would-have-surfaced moment, logs intent, aborts user-facing surfacing, and continues/holds silently | 9.1, 9.2, 9.3, 9.4, 9.5 |
| Cache placeholder from AIDLC run | Mostly deterministic; actor proof if external capture claim changes | declared cache leaf has zero-byte `page.md`, header-only placeholder, unrelated synthesized topic summary, or missing `meta.json.url` mapping | Cache classifier and submit/gate fixtures reject incomplete declared cache content before coverage pass | Optional standard/heavy playbook only if claiming Agent/Sub-agent can recover by retrying fetch, replacement source, or explicit degraded capture | 6.3, 6.5, 7.7, 7.8, 7.9 |
| Post-submit result drift | Deterministic authority | ledger row has `result_hash`, current `result.json` changes after submit, or output/cache binding no longer matches | Submit-then-mutate integration fixture fails gate/preflight and names `work_id`; no playbook needed | Not required; a playbook would add cost without testing the failing authority boundary | 3.1, 3.2, 3.4, 6.5 |
| Return-map prose-only backfill | Mixed; controller proof optional but valuable | seed-topic or wave artifact contains useful conclusion/prose but lacks `evidence_meaning`, `relationship`, `refs`, `status`, or `next_hop` | Static/validator tests report missing fields and prove diagnostic-only behavior | Optional standard re-entry playbook: future Agent follows return map through refs/cache/work-unit/finding surfaces without treating it as gate authority | 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9 |

## 2. Work-Unit Producer And Role Contract

- [x] 2.1 Implement DEW-009 and SNC-004: generated work-unit `task.md` includes active `bundle_dir`, exact identity fields, beacon refs, and absolute paths for required result, receipt, output, and cache surfaces.
- [x] 2.2 Implement DEW-009 and SNC-004: Phase Agent spawn/claim output inlines exact `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, `bundle_dir`, and write-before-return checklist.
- [x] 2.3 Implement DEW-009: task contract requires sub-agent to write required files before returning, and to return failure rather than chat-only content when files cannot be written.
- [x] 2.4 Implement SNC-004: write-producing sub-agent roles explicitly declare filesystem write capability or required write tools, and validation/review rejects assigning write-producing work units to roles that cannot write files.
- [x] 2.5 Add/update regression tests for work-unit task generation and spawn text so relative runtime refs are paired with active-bundle absolute paths and exact identity fields.
- [x] 2.6 Add/update validators or tests for write-producing role capability declarations.

## 3. Submit, Ledger, And Drift Enforcement

- [x] 3.1 Implement DEW-010: submit/gate binding checks compare ledger row hashes with current result, manifest, beacon, receipt, index, output files, and cache trails.
- [x] 3.2 Implement DEW-010: post-submit mutation of `result.json` fails delegated gate coverage with a named `work_id` and repair-targeted diagnostic.
- [x] 3.3 Ensure DEW-010 diagnostics do not advise hand-editing `rb_output_declarations.jsonl` or `rb_status.json`.
- [x] 3.4 Add regression tests for submitted result hash drift, missing ledger row, and filesystem-only delegated output rejection.

## 4. Bundle Isolation Diagnostics

- [x] 4.1 Implement BUI-002: inspection or preflight reports repo-root runtime-looking leaks such as `_work_units/`, `artifacts/`, `_cache/`, `reference/`, or `final/` when an active bundle root is known.
- [x] 4.2 Implement BUI-002: active bundle root paths with the same basenames are accepted and not misclassified as leaks.
- [x] 4.3 Implement BUI-002: diagnostics distinguish current active-bundle blockers from unassociated old cleanup debris.
- [x] 4.4 Add regression tests for repo-root leak diagnostics, valid bundle-root runtime directories, active-bundle blocker classification, and cleanup-debris classification.

## 5. Source And Reference Format Guidance

- [x] 5.1 Implement REF-007: Agent-facing workflow/shared docs and work-unit tasks describe `source.yaml` as a top-level YAML array with required `url`, `title`, `retrieved_date`, and `topic_tag`.
- [x] 5.2 Implement REF-007: reference Markdown metadata guidance clearly states the accepted metadata format is not YAML frontmatter.
- [x] 5.3 Add/update tests or validators that lock parser-aligned guidance for `source.yaml` and reference metadata examples.

## 6. Wave Gate Diagnostics

- [x] 6.1 Implement RWG-016: wave gates distinguish YAML parse failure, top-level object-vs-array shape, and missing required source fields.
- [x] 6.2 Implement RWG-016: wave gates name ledger-only counting gaps when files exist without submitted work-unit declarations.
- [x] 6.3 Implement RWG-016 and CRC-007: cache coverage diagnostics name reference path, source URL when available, mapping via `meta.json.url` or source slug, required cache leaf files, and incomplete/placeholder `page.md` content.
- [x] 6.4 Implement RWG-016: repeated gate failure advice preserves silent execution and does not recommend phase bypass or user surfacing.
- [x] 6.5 Add regression tests for YAML shape diagnostics, ledger-only count diagnostics, cache coverage diagnostics, and hash drift diagnostics.

## 7. Research Return Map And Cache Content

- [x] 7.1 Implement RRM-001/RRM-003: add shared Agent-facing return-map guidance with the minimum fields `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`.
- [x] 7.2 Implement RRM-001/RRM-002: update Wave0 source-intake guidance and seed-topic backfill instructions so Wave0 backfill explains what each important source/reference says, which must-answer or hypothesis it affects, and where to read source/reference/cache/work-unit evidence.
- [x] 7.3 Implement RRM-001/RRM-002: update Wave1 deepening guidance and backfill instructions so mechanism/trend/open-question updates include meaning statements and refs to `evidence-summary.md`, `question-list.md`, reference files, cache leaves, and work-unit surfaces.
- [x] 7.4 Implement RRM-001/RRM-002: update Wave2 synthesis/backfill guidance so seed-topic backfill preserves finding IDs and links to `cross-topic-ledger.md`, `finding-index.yaml`, and source artifacts used by the findings.
- [x] 7.5 Implement RRM-001/RRM-003: add inspect/advice or validator coverage for backfill/artifacts that contain only naked evidence lists or unsupported prose without return-map fields.
- [x] 7.6 Implement RRM-001/RRM-003: ensure return-map validators/inspectors are diagnostic only and do not create, revoke, or substitute delegated gate coverage, phase handoff, readiness, or final-delivery evidence.
- [x] 7.7 Implement CRC-007: update work-unit submit/cache helpers or wave gate preflight so accepted source cache leaves require non-empty fetched `page.md` content or explicit degraded-capture/fetch-failure records.
- [x] 7.8 Implement CRC-007: ensure placeholder-only `page.md`, zero-byte `page.md`, missing `meta.json.url` mapping, or synthesized topic summaries are diagnosed as incomplete cache content rather than accepted fetched-page cache.
- [x] 7.9 Add regression tests for Wave0/Wave1/Wave2 return-map backfill shape, missing return-map fields, return-map diagnostic-only behavior, valid cache content capture, placeholder/empty cache rejection, and explicit degraded-capture handling.

## 8. Phase Status Drift Audit

- [x] 8.1 Implement CPT-006: add or extend phase transition audit using `rb_trace.jsonl`, manifest, transition chain, and `rb_status.json` to detect impossible status windows.
- [x] 8.2 Implement CPT-006: audit reports manual bypass suspicion when status advances without the required passed gate, route-bound `load_complete`, and `phase_transition`.
- [x] 8.3 Implement CDP-005: final artifacts count as delivery evidence only after legal readiness-to-final handoff and route-bound Final entry; premature `final/` files are reported as phase-boundary violations.
- [x] 8.4 Implement CPT-006: audit remains diagnostic and does not mutate status.
- [x] 8.5 Implement CPT-006: audit output uses the closed outcomes `passed`, `status_drift`, `manual_bypass_suspected`, `missing_witness`, `failed_gate_downstream_status`, and `bootstrap_exception`.
- [x] 8.6 Add regression tests for failed-gate downstream status, skipped wave1/wave2 suspicion, missing witness, explicit bootstrap exception, premature final output, and legal witnessed handoff pass.

## 9. Silent Surfacing Observability

- [x] 9.1 Implement SWE-005: Agent-facing silent execution guidance defines `surfacing_intent` as a would-have-surfaced diagnostic followed by aborting the prohibited user-facing pause in non-terminal `stop: no`.
- [x] 9.2 Implement SWE-005: provide or reuse a trace/log CLI path for diagnostic `surfacing_intent` events with bundle, node, intent type, and reason.
- [x] 9.3 Implement SWE-005: document and enforce that `surfacing_intent` is diagnostic only, not gate pass, handoff, HITL authorization, final delivery, or status synchronization evidence.
- [x] 9.4 Implement SWE-005: diagnostics can flag missing intent evidence or illegal surfacing suspicion without claiming deterministic interception of all chat output.
- [x] 9.5 Add tests/validators for silent execution wording and trace/log shape.

## 10. Controlled Playbook Evidence Plan

- [x] 10.1 During apply, choose existing or new `experiments_playbook/` locations for autonomous research hardening cases and record the production distance ledger for each case.
- [x] 10.2 Add/run required standard MD-controller playbook for BUG-033: after repeated wave gate failure feedback, the Phase Agent must remain in the legal phase/repair loop, must not write `final/`, must not claim final delivery, and must not surface to the user.
- [x] 10.3 Add/run required standard MD-controller playbook for BUG-042: after status-drift or manual-bypass audit feedback, the Phase Agent must return to the latest legal phase target instead of entering HITL2/readiness/final from edited status.
- [x] 10.4 Add/run required standard or heavy silent-execution playbook for BUG-043: in a non-terminal `stop: no` node, a would-have-surfaced moment logs `surfacing_intent`, aborts user-facing surfacing, and continues/holds silently according to Engine feedback.
- [ ] 10.5 Add/run required heavy Sub-agent actor playbook for BUG-039 and BUG-040 when claiming the producer path is fixed: a native Sub-agent receives a work-unit task, reads the beacon/task/schema, writes required result/receipt/output/cache files before returning, preserves exact nonce/identity fields, and submit succeeds without Phase Agent transcribing chat text.
- [ ] 10.6 Add/run heavy Sub-agent or standard controller playbook for BUG-037 if the apply claim includes real producer containment: the work unit completes with all writes under `bundle_dir`, repo root remains free of runtime leaks, and inspection feedback is visible to the Phase Agent.
- [x] 10.7 Consider a standard controller playbook for BUG-041 if repair-loop behavior is in scope: after ledger-only count feedback, the Phase Agent repairs by creating/retrying submitted work units rather than hand-writing ledger rows or switching to filesystem fallback.
- [x] 10.8 Playbook evidence must not hide Agent decisions inside inline JS. Inline JS may create fixtures and run deterministic checkpoints, but MD-controller proof requires the Agent-facing playbook loop to read feedback and decide the next action.

## 11. Version And Current Guidance Cleanup

- [x] 11.1 Update `DPT_FRAMEWORK/CHANGELOG.md` for target `v0.5` with concise notes on autonomous work-unit hardening and research return-map/cache-content capture.
- [x] 11.2 Update `DPT_FRAMEWORK/RUN.md` version banner to match the latest CHANGELOG entry.
- [x] 11.3 Scan current framework docs, workflow Markdown, tests, guidelines, and runnable playbooks outside `openspec/changes/archive/` for wording that encourages hand-written delegated outputs, status edits, non-HITL surfacing, evidence-list-only backfill, or placeholder cache trails; migrate or remove current-surface drift covered by this change.

## 12. Apply Slice Discipline

- [x] 12.1 Slice A governance/static wording: finish tasks 1, 5, static wording portions of 9, and any static validators before runtime behavior changes.
- [x] 12.2 Slice B producer path: finish tasks 2 and related 4 diagnostics before relying on new submit/gate behavior.
- [x] 12.3 Slice C delegated authority and cache: finish tasks 3, 6, and CRC portions of 7 with focused tests before phase audit work.
- [x] 12.4 Slice D phase boundary and surfacing: finish tasks 8 and runtime/trace-log SWE portions of 9 with explicit diagnostic-only assertions.
- [x] 12.5 Slice E return-map and cleanup: finish RRM portions of 7 plus version/current-surface cleanup after authority-bearing paths are stable.
- [ ] 12.6 Slice F controlled playbook evidence: run required task-10 playbooks after the relevant deterministic guardrails are implemented, and treat failed playbooks as design feedback rather than as flaky optional demos.
- [x] 12.7 After each slice, run the focused tests/validators for the touched requirement IDs and record residual risk before starting the next slice.

## 13. Verification

- [x] 13.1 Run focused regression tests added for DEW-009, DEW-010, BUI-002, CDP-005, CRC-007, REF-007, RRM-001 through RRM-003, RWG-016, CPT-006, SNC-004, and SWE-005.
- [ ] 13.2 Run required controlled playbooks from task 10 and record which bug-probes they close versus which deterministic guardrails they merely complement.
- [x] 13.3 Run `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`.
- [x] 13.4 Run `npm test`.
- [x] 13.5 Run `node openspec/governance/check-project-reqs.mjs` and confirm 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired.
- [x] 13.6 Run `node openspec/governance/check-project-specs.mjs` and confirm 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader.
- [x] 13.7 Record apply evidence and any residual risk in this task list before requesting archive.

### 13.A Apply Evidence And Residual Risk

- Focused regression tests passed: return-map diagnostics, wave inspect return-map, phase-status audit, wave0 gate diagnostics, log-event surfacing intent, inspect-bundle leak diagnostics, work-unit claim/submit/binding/cache checks, parser-aligned guidance, no phase-bypass advice, workflow node validators.
- Full verification passed: `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`, `npm test` (1155 tests), `node openspec/governance/check-project-reqs.mjs`, `node openspec/governance/check-project-specs.mjs`, and `openspec validate harden-autonomous-research-return-map --strict`.
- Playbook validation passed: `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_autonomous-research-hardening` (5/5) and `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/` (89/89).
- Standard controlled playbooks run and recorded PASS in `_temp/exp_verdicts.jsonl`: case-601 (BUG-033), case-602 (BUG-042), and case-603 (BUG-043).
- Heavy native Sub-agent playbooks case-604 (BUG-039/040) and case-605 (BUG-037) were added and validated, but were not run in this apply pass because they require explicit real native Sub-agent actor execution. They remain the residual actor-boundary risk; deterministic producer, submit, cache, nonce, and bundle containment guardrails are covered by unit/integration tests but do not prove real Sub-agent compliance.
