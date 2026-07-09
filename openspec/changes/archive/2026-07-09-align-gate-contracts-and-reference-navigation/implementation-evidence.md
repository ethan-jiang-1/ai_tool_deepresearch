# Implementation Evidence: align-gate-contracts-and-reference-navigation

## Scope Read Before Target-Code Edits

Read before framework/test edits:

- `openspec/changes/align-gate-contracts-and-reference-navigation/proposal.md`
- `openspec/changes/align-gate-contracts-and-reference-navigation/design.md`
- `openspec/changes/align-gate-contracts-and-reference-navigation/tasks.md`
- all delta specs under `openspec/changes/align-gate-contracts-and-reference-navigation/specs/`
- `_backlog/bugs/BUG-068-wave1-role-set-inconsistency-and-depth-review-ref-drift.md`
- gate/systemic portions of `_backlog/bugs/BUG-069-silent-autonomous-execution-unreachable-contract-not-self-sufficient.md`
- `_backlog/bugs/BUG-070-seed-topic-map-refs-not-resolvable-to-reference-files.md`
- `openspec/changes/archive/2026-07-08-stabilize-agent-facing-work-unit-contracts/implementation-evidence.md`
- archived `2026-07-08-stabilize-agent-facing-work-unit-contracts` delta specs for `agentic-queue` and `subagent-node-contract`
- active main specs `openspec/specs/agentic-queue/spec.md` and `openspec/specs/subagent-node-contract/spec.md`
- current framework surfaces listed in the apply-time audit sections below

OpenSpec CLI note: `openspec status --change align-gate-contracts-and-reference-navigation --json` and `openspec instructions apply --change align-gate-contracts-and-reference-navigation --json` were attempted before implementation, but the local shell reported `openspec: command not found`. Manual apply followed the change artifacts and governance scripts.

Governance baseline before target-code edits:

- Registered pending IDs `AGO-007`, `GSK-011`, `IOC-005`, `RRM-004`, `RWG-018`, `RWP-016`, and `WPG-013` in `openspec/governance/req-registry.yaml`.
- Resolved pre-existing archived baseline drift by adding `AGQ-023` and `SNC-006` to active main spec `> req:` lines. The requirements were already present in the main spec bodies; the missing trace IDs were not judgment-layer drift.
- PASS: `node openspec/governance/check-project-reqs.mjs`

## Judgment-Layer Source-of-Record Decisions

| Truth type | Source of record | Apply decision |
| --- | --- | --- |
| Delegated output coverage | Submitted work-unit ledger rows plus gate-consumed canonical path/role selectors | Wave1 required output paths must enter the ledger with `evidence_summary` or `question_list`; `other` remains valid only for extra non-blocking outputs. |
| Artifact existence/schema/format | Active bundle artifacts under `artifacts/`, `seed_topics/`, `reference/`, plus active schema/helper checks | Framework docs teach shape; bundle files remain runtime truth. |
| Work-unit review provenance | Submitted work-unit rows: `work_id`, `work_unit_ref`, `result_ref` | Harmless trailing slash on safe Wave1 reviewed refs may be canonicalized before comparison. |
| Consumer navigation | Concrete existing bundle-relative `reference/*.md` refs | Return-map internal refs are secondary provenance and cannot satisfy evidence-bearing navigation alone. |
| Evidence authority | Submitted ledgers, reference backing checks, cache trails, and accepted gate surfaces | Return maps navigate evidence; they do not make evidence count for delegated coverage. |
| Diagnostic severity | The command/gate pass/fail computation | A finding counted into `check.passed: false` is blocking for that command, not diagnostic-only. |
| Producer guidance | Active phase docs, task cards, generated work-unit surfaces | Guidance must teach the checker-consumed shape and repair target without requiring Engine source reading. |

## Rule/Output Contract Closure Inventory

This section is updated as implementation proceeds. Closure state means producer instruction, runtime authority, checker implementation, diagnostic feedback, and regression guard all describe the same deterministic fact.

| Gate / command | Rule / check id | Implementation route | Runtime surface | Producer instruction | Diagnostic / advice wording | Consequence | Drift status | Test guard |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `operate-work-unit submit` | `wave1_required_output_role_normalization` | submit path before ledger append | `rb_output_declarations.jsonl output_files[]` | Wave1 work-unit task/phase docs | Names path, original role, normalized role, reason through submit normalizations/trace/log | submit-normalized | fixed | `node --test tests/engine/work-unit-submit.test.mjs` |
| `wave1-complete` | `wave1_work_unit_output_coverage` | `checkWorkUnitOutputCoverage()` | submitted ledger canonical roles and required Wave1 artifact paths | `phase-wave1.md`, work-unit output contract | Blocking coverage diagnostic | blocking | fixed for new submits; gate selectors unchanged | `node --test tests/engine/work-unit-submit.test.mjs` |
| `wave1-complete` | `per_topic_depth_review_contract` | `checkWave1DepthReviewContract()` | `artifacts/wave1/{topic}/depth-review.yaml reviewed_work_unit_refs[]` plus submitted rows | `phase-wave1.md` | Blocking depth-review diagnostic plus non-blocking canonicalization diagnostic | blocking | fixed | `node --test tests/engine/wave-depth-contracts.test.mjs`; `node --test tests/integration/cli/check-gate-wave1-complete.test.mjs` |
| `inspect-wave*-output` | `return_map_navigation` | `return-map.mjs` and inspect CLIs | `seed_topics/*.md` return-map refs and `reference/*.md` files | seed/wave phase docs | Blocking navigation diagnostic names entry line, expected concrete ref, classification, and repair target | blocking for inspect failure | fixed | `node --test tests/engine/helpers/return-map.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs` |
| `wave2-complete` | `finding_index_contract` and `wave2_*cross*` checks | `checkWave2FindingIndexContract()`, `classifyReferenceAuthority()`, provenance helpers | Wave2 finding index, cross-topic ledger, submitted Wave2 rows, prior submitted backing, `reference/00-cross-*.md` | `phase-wave2.md` | Blocking provenance diagnostics distinguish submitted targeted evidence from existing-backed projection repair | blocking where authority missing | aligned; guarded in this change | `node --test tests/engine/helpers/gate-helpers-provenance.test.mjs` |
| static audit | active gate rule ids/check names | `tests/schema/gate-rule-audit.test.mjs` | active `schema/gate_definitions/*.definition.json` plus CLI/helper dispatch | explicit exemptions for non-Agent-produced scaffolds; phase docs/workflows for Agent-produced surfaces | test failure names gate/rule/check or missing inventory field | blocking in tests | fixed | `node --test tests/schema/gate-rule-audit.test.mjs` |

### Active Gate Rule IDs Audited

The apply-time static audit reads only current active `DPT_FRAMEWORK/schema/gate_definitions/*.definition.json`. It enumerates 122 active rule ids and expands them into rule-id-granular closure inventory in `tests/schema/gate-rule-audit.test.mjs`.

| Gate | Active rule ids |
| --- | --- |
| `instantiation-complete` | `bundle_dir_exists`, `bundle_map_exists`, `rb_plan_exists`, `rb_profile_exists`, `rb_status_exists`, `rb_queue_exists`, `rb_trace_exists`, `seed_topics_exists`, `reference_exists`, `artifacts_exists`, `cache_exists`, `final_exists`, `work_units_exists`, `bundle_name_valid`, `status_current_mode`, `status_current_gate`, `status_next_gate` |
| `hitl1-recorded` | `profile_exists`, `profile_schema_valid`, `research_profile_not_default`, `must_answer_non_empty`, `hitl1_status_recorded`, `hitl1_recorded_at_non_empty`, `status_current_gate`, `status_next_gate` |
| `setup-ready` | `rb_plan_exists`, `rb_profile_exists`, `rb_status_exists`, `rb_queue_exists`, `rb_trace_exists`, `seed_topics_exists`, `reference_exists`, `artifacts_exists`, `cache_exists`, `final_exists`, `work_units_exists`, `plan_schema_valid`, `profile_schema_valid`, `status_schema_valid`, `queue_schema_valid`, `hitl1_marker_recorded`, `status_current_gate`, `status_next_gate`, `basename_consistency`, `plan_body_non_empty`, `plan_body_no_unfilled_marker` |
| `seed-topics-ready` | `seed_topics_dir_non_empty`, `slug_consistency`, `per_file_title_non_empty`, `per_file_slug_stem_consistency` |
| `wave0-complete` | `reference_index_md_exists`, `reference_readme_exists`, `reference_dir_exists`, `shared_ref_count_floor`, `no_example_com_shared_ref_url`, `per_topic_source_yaml_exists`, `per_topic_reference_schema_valid`, `per_topic_count_floor`, `trace_event_wave0_completion`, `cache_coverage`, `wave0_work_unit_ledger_exists`, `wave0_work_unit_output_coverage`, `wave0_work_unit_submission_presence`, `wave0_delegated_bypass_suspected` |
| `wave1-complete` | `wave1_dir_exists`, `per_topic_evidence_summary_exists`, `per_topic_question_list_exists`, `per_topic_depth_review_contract`, `per_topic_ref_md_count_floor`, `no_example_com_ref_url`, `reference_format`, `reference_source_url_parseable`, `reference_index_coverage`, `key_facts_min_lines`, `ledger_coverage`, `question_list_has_four_sections`, `source_url_present`, `key_findings_non_empty`, `no_stale_mechanisms_token`, `no_stale_trends_token`, `no_stale_pending_questions_token`, `trace_event_wave1_completion`, `cache_coverage`, `wave1_work_unit_ledger_exists`, `wave1_work_unit_output_coverage`, `wave1_work_unit_submission_presence`, `wave1_delegated_bypass_suspected` |
| `wave2-complete` | `synthesis_exists`, `synthesis_non_empty`, `ledger_exists`, `ledger_non_empty`, `ledger_fixed_sections`, `index_exists`, `index_yaml_parse`, `finding_index_contract`, `synthesis_finding_id_ref`, `cross_artifact_references`, `wave1_evidence_ref`, `rerun_add_full_synthesis`, `backfill_judgment_token_absent`, `backfill_questions_token_absent`, `trace_event_wave2_completion`, `wave2_cross_reference_index_coverage`, `wave2_work_unit_cross_ref_coverage`, `wave2_work_unit_submission_presence`, `wave2_delegated_bypass_suspected` |
| `hitl2-recorded` | `decision_brief_exists`, `decision_brief_non_empty`, `profile_yaml_parseable`, `hitl2_status_recorded`, `user_decision_non_empty`, `user_decision_valid_enum` |
| `readiness-passed` | `seed_topics_non_empty`, `reference_index_exists`, `wave2_synthesis_exists`, `hitl2_decision_brief_exists`, `all_prior_gates_passed`, `profile_yaml_parseable`, `trace_jsonl_parseable` |
| `rerun-ready` | `rerun_rationale_present`, `rerun_count_valid`, `bundle_structure_valid` |

For each active rule id, the static inventory records artifact category, producer instruction or non-Agent-produced source, runtime authority, implementation route, diagnostic/pass-fail classification, and test guard. Unknown checks, unsupported delegated-provenance checks, missing deterministic `failure_message`, unknown work-unit selector shapes, missing inventory fields, missing existing guards, and active diagnostic-only severity wording fail the audit.

## Drift Found And Classification

| Finding | Classification | Decision |
| --- | --- | --- |
| Wave1 required paths can be submitted with role `other`, but gate coverage filters by canonical required roles. | confirmed in-scope drift | Fix by narrow submit-time normalization before ledger append; do not broaden gate coverage to accept `other` for required paths. |
| `phase-wave1.md` depth-review example uses a trailing slash while helper exact-matches submitted refs. | confirmed in-scope drift | Fix docs and canonicalize safe trailing slash before comparison. |
| Return-map validation treats internal refs and concrete `reference/*.md` refs as equivalent and marks counted failures diagnostic-only. | confirmed in-scope drift | Require concrete existing `reference/*.md` refs for evidence-bearing entries and align blocking/diagnostic wording with pass/fail. |
| No active static audit proves gate rule IDs/check names map to supported implementation surfaces. | confirmed in-scope drift | Add static audit coverage for active definitions only. |
| Wave2 `00-cross` reference authority split could drift into either over-strict or over-loose policy. | high-risk surface verified aligned | Current helpers preserve the split: submitted `wave2_targeted_evidence` backs new fetched evidence; existing-backed Phase-owned projections require prior accepted backing plus W2F/finding-index/cross-topic-ledger refs; `source_layer` / index coverage alone is not authority. Added focused guard without broad Wave2 code edits. |
| Historical bad submitted rows may contain wrong roles. | deferred historical issue | Do not mutate history or add broad amend tooling in this change. |
| Research-quality preferences in summaries, rankings, or synthesis style. | out of scope | Do not promote advisory quality preferences into blocking deterministic gates. |

## Normalization Decisions And Diagnostics

- Allowed normalization: Wave1 `artifacts/wave1/{topic}/evidence-summary.md` from role `other` to `evidence_summary` before ledger append.
- Allowed normalization: Wave1 `artifacts/wave1/{topic}/question-list.md` from role `other` to `question_list` before ledger append.
- Allowed normalization: safe Wave1 depth-review refs may drop trailing slashes before comparison.
- Required diagnostics: each normalization must be visible and name the affected path/ref, original value, normalized value, and deterministic reason.
- Not allowed: historical ledger mutation, gate-time equivalence of `other` for required outputs, automatic conversion from internal/glob return-map refs into concrete references, or any normalization of research meaning.

## Touched Surfaces By Family

- Submit: `DPT_FRAMEWORK/engine/work-unit-submit.mjs`
  - Added narrow Wave1 required-output role normalization before result hash, ledger row build, and durable append.
  - Normalization applies only to `artifacts/wave1/{topic}/evidence-summary.md` and `artifacts/wave1/{topic}/question-list.md` when submitted as role `other`.
  - Extra `other` outputs remain `other`; no historical ledger amendment path was added.
- Tests: `tests/engine/work-unit-submit.test.mjs`
  - Added regression proving required Wave1 roles normalize before ledger append, extra `other` remains non-blocking, and duplicate submit of the original Agent-shaped result hashes to the canonical saved content.
- Depth-review: `DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs`
  - Canonicalizes safe trailing slash `reviewed_work_unit_refs[]` before submitted-row comparison.
  - Still rejects absolute or unsafe refs and refs not bound to submitted work-unit surfaces.
- Gate CLI: `DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs`
  - Emits depth-review canonicalization diagnostics separately from blocking depth-review failures.
- Phase docs: `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
  - Updated depth-review example to use `_work_units/wave1/<work_id>` without trailing slash.
- Tests: `tests/engine/wave-depth-contracts.test.mjs`, `tests/integration/cli/check-gate-wave1-complete.test.mjs`
  - Added helper and gate coverage for trailing slash canonicalization, unsafe/unsubmitted refs, Wave1 gate role normalization, and a fixture-level failure when required artifacts exist on disk but canonical submitted coverage is missing.
- Return-map helpers: `DPT_FRAMEWORK/engine/helpers/return-map.mjs`
  - Added deterministic entry extraction and evidence-bearing vs limitation predicates from `relationship`, `status`, `refs`, and `next_hop`.
  - Added concrete `reference/*.md` extraction with safe bundle-relative path checks, active bundle existence validation, and glob/count-summary rejection.
  - Evidence-bearing seed-topic entries fail when they have only `artifacts/`, `_cache/`, or `_work_units/` refs; explicit limitation/no-materializable-evidence entries may omit concrete references.
  - Return maps remain navigation only; delegated coverage and evidence authority stay with submitted ledgers, backing checks, and cache/source validators.
- Inspect CLIs: `DPT_FRAMEWORK/cli/inspect-wave0-output.mjs`, `inspect-wave1-output.mjs`, `inspect-wave2-output.mjs`
  - Replaced contradictory `return_map_diagnostic_only: true` with `return_map_classification`, which is `blocking` when return-map findings are counted into command failure and `diagnostic-only` only when they are not.
- Phase docs: `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`, `phase-wave0.md`, `phase-wave1.md`, `phase-wave2.md`
  - Updated return-map guidance so concrete existing `reference/*.md` is primary consumer navigation, internal build surfaces are secondary provenance, glob/count refs are forbidden, and limitation entries are explicit deterministic states.
- Tests: `tests/engine/helpers/return-map.test.mjs`, `tests/integration/cli/inspect-wave-return-map.test.mjs`
  - Added concrete reference, glob/count, missing ref, internal-only, explicit limitation, and inspect classification coverage.
- Wave2 authority audit: `DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs`, `DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs`, `DPT_FRAMEWORK/schema/gate_definitions/gate-wave2-complete.definition.json`, `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md`, `DPT_FRAMEWORK/cli/inspect-wave2-output.mjs`
  - Verified aligned without broad code edits.
  - `classifyReferenceAuthority()` treats submitted reference outputs as delegated fetched evidence, classifies Wave2 `00-cross` refs with submitted targeted accepted URLs as `delegated_fetched_evidence`, classifies existing-backed `00-cross` refs as `phase_owned_projection` only with prior accepted backing plus W2F/finding-index/cross-topic-ledger refs and submitted prior backing locators, and does not use `source_layer` alone as authority.
  - Wave2 gate definition wording preserves the same split and states that `source_layer` is navigation metadata, not evidence authority.
- Tests: `tests/engine/helpers/gate-helpers-provenance.test.mjs`
  - Added focused Wave2 cases proving submitted targeted evidence backs new `00-cross` refs, existing-backed projections pass without new Wave2 rows, and index coverage / `source_layer: wave2_cross` alone cannot establish authority.
- Static gate audit: `tests/schema/gate-rule-audit.test.mjs`
  - Reads only current active `DPT_FRAMEWORK/schema/gate_definitions/*.definition.json`.
  - Fails unknown `check` / `check:mode` names, unsupported delegated-provenance check names, missing gate CLI files, missing deterministic `failure_message`, unknown work-unit selector shapes, missing rule-id artifact-contract inventory, missing closure fields, missing existing test guard, and any active gate-definition diagnostic-only severity wording.
  - Expands the design's grouped rows into 122 active rule-id inventory entries while keeping archived OpenSpec changes out of scope.
- Release/version surfaces: `CHANGELOG.md`, `DPT_FRAMEWORK/RUN.md`
  - Added framework `v0.13` summary for judgment-layer alignment and synced the RUN entry banner.

## Verification Log

- PASS: `node openspec/governance/check-project-reqs.mjs`
- PASS: `node openspec/governance/check-project-specs.mjs`
- PASS: `node --test tests/engine/work-unit-submit.test.mjs`
- PASS: `node --test tests/engine/wave-depth-contracts.test.mjs`
- PASS: `node --test tests/integration/cli/check-gate-wave1-complete.test.mjs`
- PASS: `node --test tests/engine/helpers/return-map.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs`
- PASS: `node --test tests/integration/md/wave-depth-contract-guidance.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs tests/integration/md/phase-wave2-md-structure.test.mjs`
- PASS: `node --test tests/engine/helpers/gate-helpers-provenance.test.mjs`
- PASS: `node --test tests/schema/gate-rule-audit.test.mjs`
- PASS: `node --test tests/engine/work-unit-submit.test.mjs tests/engine/wave-depth-contracts.test.mjs tests/engine/helpers/return-map.test.mjs tests/engine/helpers/gate-helpers-provenance.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/schema/gate-rule-audit.test.mjs`
- PASS: `node --test tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs`
- PASS: `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`
- PASS: `node DPT_FRAMEWORK/cli/validate-phase-templates.mjs DPT_FRAMEWORK/workflows/nodes/phases/phase-setup.md DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md DPT_FRAMEWORK/workflows/nodes/phases/phase-readiness.md DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md DPT_FRAMEWORK/workflows/nodes/phases/phase-instantiation.md DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md DPT_FRAMEWORK/workflows/nodes/phases/phase-final.md`
- PASS: `node --test tests/integration/md/wave-depth-contract-guidance.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs tests/integration/md/phase-wave2-md-structure.test.mjs tests/integration/md/phase-seedtopics-queue-loop.test.mjs tests/integration/md/phase-wave1-queue-loop.test.mjs tests/integration/md/phase-wave2-queue-loop.test.mjs`
- PASS: `node --check tests/schema/gate-rule-audit.test.mjs`
- UNAVAILABLE: `openspec validate align-gate-contracts-and-reference-navigation --strict` failed with `openspec: command not found`; local apply used change artifacts plus Node governance checks.

## Deferred Findings

- Historical submitted-ledger row amendment remains deferred; repair via supplementary/replacement work units unless a future change accepts amend tooling.
- Research-quality and semantic synthesis preferences remain outside this deterministic judgment-layer change.
- Archived OpenSpec changes and historical gate wording remain outside static audit scope; only current framework definitions are audited.
- No additional lifecycle/queue/routing or HITL UX drift was found that met the deterministic judgment-layer in-scope rule for this change.

## Final Consistency Review

Proposal, design, delta specs, tasks, implementation, diagnostics, and tests now describe the same judgment-layer contract model:

- Delegated coverage authority is submitted ledger path/role truth, with narrow Wave1 required-output role normalization before ledger append and no gate-time broadening of `other`.
- Depth-review provenance authority is submitted work-unit refs after safe spelling canonicalization; unsafe and unsubmitted refs remain blocking.
- Return maps are consumer navigation, not evidence authority; evidence-bearing entries need concrete existing `reference/*.md` refs unless explicitly limited.
- Wave2 `00-cross` preserves the targeted-evidence vs existing-backed projection split; `source_layer` / index rows remain navigation metadata only.
- Blocking/diagnostic wording follows command pass/fail, and static audit now fails active rule/check inventory drift.
- Apply stop lines were respected: no broad ledger amend path, no replacement gate engine, no source-layer-alone acceptance, and no research-quality preference promoted into a blocking deterministic gate.

Residual risk is limited to historical bad submitted rows, which remain intentionally deferred to supplementary/replacement work units or a future explicit amend-tooling change.
