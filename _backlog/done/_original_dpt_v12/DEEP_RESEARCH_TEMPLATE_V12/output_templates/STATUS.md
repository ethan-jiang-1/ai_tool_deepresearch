---
title: "Output Skeleton - STATUS"
role: "copyable output skeleton"
scope: "template source for STATUS_PATH only"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/METHODOLOGY.md"
writes:
  - "<STATUS_PATH>"
---

# Output Skeleton - STATUS

Copy only the content between `BEGIN STATUS OUTPUT` and `END STATUS OUTPUT` into `STATUS_PATH`.

Replace every instantiation placeholder before delivery. Runtime metavariables may remain only inside explicit schema/template/pattern guidance. Do not copy this file's frontmatter.

<!-- BEGIN STATUS OUTPUT -->
# <PLAN_NAME> Status

> profile: `<PROFILE_PATH>`
> plan: `<PLAN_PATH>`
> queue: `<QUEUE_PATH>`
> trace: `<TRACE_PATH>`
> This file records run-time state, blockers, recovery context, and branch disposition. Continuous actions live in `<QUEUE_PATH>`; diagnostic decisions live in `<TRACE_PATH>`.

## Operator View

- where_we_are: `Instantiation; state=not_started; current_gate=instantiation_complete`
- what_cannot_happen_yet: `Wave 1 cannot start until Wave 0 audit passes; Wave 2 cannot start until Wave 1 audit passes; Readiness cannot start until Wave 2 audit passes and the HITL2 human decision checkpoint is recorded`
- next_valid_action: `read <QUEUE_PATH> -> Active Queue and initialize execution workspace`
- current_gap_or_blocker: `shared ground truth, reference index, produced artifacts, and seed growth sections are not initialized; artifact scaffold exists only as non-evidence structure`
- evidence_to_inspect: `Wave audit inventories in this file plus local references under <REFERENCE_DIR> after execution begins`
- command_entrypoint_to_inspect: `<PLAN_PATH> -> Runtime Command Entrypoint; local command index at <RUN_DIR>/_framework/COMMANDS.md`
- profile_to_inspect: `<PROFILE_PATH>`
- user_visible_output_authorized: `no until final_delivery, decision_blocker, or empty_queue_after_refill`
- routine_progress_location: `STATUS/QUEUE/TRACE/local artifacts, not chat`
- stop_authorization_state: `unauthorized_continue_required`
- unauthorized_stop_next_action: `read <QUEUE_PATH> -> Active Queue and execute slot_1_current`
- stop_authorization_rule: `middle-wave progress, gate passage, batch completion, status sync, artifact refresh, and known next task do not authorize a user-visible stop`
- task_projection_state: `needs_sync`

## Pre-Work Framework Boundary

- framework_snapshot: `<RUN_DIR>/_framework`
- framework_readonly_rule: `pre-work framework snapshot is read-only after instantiation; read it for policy, commands, and read-only diagnostics only; do not edit, regenerate, normalize, or write run state inside _framework`
- framework_repair_rule: `missing same-version snapshot paths may be repaired only through <RUN_DIR>/_framework/command_playbooks/repair-framework-snapshot.md; never hand-edit _framework and never copy _framework/output_templates over root control files`

## Current Execution Snapshot

- state: `not_started`
- current_mode: `instantiation_only`
- current_wave: `Instantiation`
- execution_style: `silent_autonomous_long_run`
- blocking_issue: `not_applicable`
- required_next_step: `initialize execution workspace`
- largest_gap_if_stop_now: `execution workspace and shared ground truth are not initialized`
- safe_to_interrupt: `no`

## Queue Pointer

- queue_path: `<QUEUE_PATH>`
- last_queue_refill: `not_started`
- queue_authority_note: `read queue for active actions`

When `QUEUE_PATH.Active Queue.queue_health = blocked`, sync `state = blocked`, `blocking_issue`, `stop_authorization_state`, `unauthorized_stop_next_action`, and `Resume Checkpoint.safe_to_interrupt` with `QUEUE_PATH.Blocked State`. A blocker is valid only when it is a concrete decision blocker, not a wave milestone or progress recap.

## Trace Pointer

- trace_path: `<TRACE_PATH>`
- last_trace_entry: `not_started`
- wave0_transition_trace: `not_started`
- wave1_transition_trace: `not_started`
- wave2_transition_trace: `not_started`
- readiness_closeout_trace: `not_started`
- transition_coverage_rule: `each field above must name a distinct non-correction TRACE entry with exact gate_transition field value wave0_complete / wave1_complete / wave2_complete / readiness_passed when that transition has been reached; a correction or missed-checkpoint note does not satisfy coverage`

## Gate State

- current_gate: `instantiation_complete`
- next_gate: `setup_ready`
- distance_to_next_gate: `far`
- next_scoring_action: `+index`
- stalled_scoring_actions_since_last_gap_reduction: `0`
- last_gap_reduction: `instantiation completed`
- gate_reopen_state: `not_applicable`
- reopened_from_gate: `not_applicable`
- reopen_reason: `not_applicable`
- invalidated_claims: `not_applicable`

## Human Decision Checkpoints

- hitl1_profile_and_root_must_answer_status: `recorded`
- hitl1_record_path: `<PROFILE_PATH> -> Profile Binding, Root Must-Answer Set, and Human Decision Checkpoints`
- hitl1_rule: `execution cannot begin without an explicit research_profile and visible final must-answer intake or gap_queue_backed clarification route; user-facing prompt uses Chinese-first labels such as 快速事实答案（quick factual）, 探索地图（exploratory map）, and 说法验证（claim verification）, while internal fields keep canonical enum values`
- hitl2_wave2_readiness_decision_status: `not_started`
- hitl2_trigger: `after Wave 2 synthesis assessment; before Readiness closeout`
- answerability_class: `not_assessed`
- human_checkpoint_status: `not_started`
- final_report_view: `not_started`
- custom_final_report_view_label: `not_applicable`
- custom_final_report_view_slug: `not_applicable`
- final_output_dir: `not_started`
- repair_recommendation: `not_started`
- user_decision: `not_started`
- hitl2_rule: `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision is the Source of Record; this STATUS section, STATUS Wave 2, and STATUS Wave 2 Human Decision Brief are projections and must match PROFILE before Readiness; Readiness also requires PROFILE hitl2_checkpoint_status=recorded, this section hitl2_wave2_readiness_decision_status=recorded, and the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row status=recorded`
- hitl2_decision_brief_path: `<ARTIFACT_DIR>/wave2/human-decision-brief.md`
- final_output_dir_mapping: `profile_default -> <RUN_DIR>/final; executive_brief -> <RUN_DIR>/final_executive_brief; evidence_map -> <RUN_DIR>/final_evidence_map; claim_judgment -> <RUN_DIR>/final_claim_judgment; technical_deep_dive -> <RUN_DIR>/final_technical_deep_dive; custom -> <RUN_DIR>/final_custom_{custom_final_report_view_slug}`
- hitl2_pending_user_stop_rule: `after Wave 2 synthesis assessment, do not ask the user until ARTIFACT_DIR/wave2/human-decision-brief.md exists, PROFILE/STATUS HITL2 fields are synced as pending_user, QUEUE queue_health=blocked, stop_authorization_state=decision_blocker, unauthorized_stop_next_action=not_applicable, and Resume Checkpoint.safe_to_interrupt=yes; before that, continue local HITL2 preparation under unauthorized_continue_required`
- readiness_consequence: `Readiness blocked until hitl2_wave2_readiness_decision_status=recorded, PROFILE hitl2_checkpoint_status=recorded, the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row has status=recorded, answerability_class is ready_substantive or ready_insufficient_judgment, human_checkpoint_status=recorded, user_decision=proceed_to_readiness, final_report_view is concrete, and final_output_dir follows final_output_dir_mapping; request_view_revision is an intermediate blocked state that must queue concrete final report view clarification and later be replaced by user_decision=proceed_to_readiness after the revised final_report_view is recorded; repair_and_rerun, stop_blocked, and blocked_repair_required keep Readiness blocked`

## Plan / Status Sync

- profile_path: `<PROFILE_PATH>`
- plan_placeholders_cleared: `yes`
- profile_plan_sync: `profile_path, selected research_profile, configured floors, root must-answer set, and HITL2 decision fields agree between PROFILE_PATH and PLAN/STATUS projections`
- placeholder_semantics: `instantiation placeholders cleared; runtime metavariables allowed only in explicit schema/template/pattern guidance, never active state values`
- topology_sync_state: `synced`

## Directory / Integration State

- seed_readme_ready: `no`
- framework_readonly_boundary_ready: `no`
- framework_command_index_ready: `no`
- framework_cli_tools_ready: `no`
- runtime_command_entrypoint_ready: `no`
- original_topic_dir_status: `optional_not_present`
- cache_dir_status: `optional_created_on_first_source_intake`
- source_intake_status: `not_started`
- source_intake_runner_mode: `not_applicable`
- source_intake_batch_id: `not_applicable`
- source_intake_wait_state: `not_started`
- latest_cache_candidate_cards: `not_applicable`
- cache_promote_log: `not_applicable`
- reference_readme_ready: `no`
- artifact_readme_ready: `yes`
- reference_index_ready: `no`
- evidence_retrieval_30s_ready: `no`
- topic_root_alignment: `not_started`
- reference_dir_alignment: `not_started`
- artifact_dir_alignment: `scaffolded`
- seed_backfill_status: `not_started`
- seed_topic_intake_status: `not_started`
- topic_intake_gaps: `not_assessed`
- seed_growth_sections_ready: `no`
- artifact_status: `scaffolded_no_artifacts`

## Setup Ready Transition

- setup_ready_status: `not_started`
- execution_workspace_ready: `no`
- navigation_stubs_ready: `no`
- topic_root_alignment_ready: `no`
- seed_growth_sections_ready: `no`
- seed_topic_intake_ready: `not_assessed`
- status_queue_sync_ready: `no`
- setup_ready_gate_rule: `non-research transition only; cannot satisfy evidence floors; seed_topic_intake_ready uses yes / gap_queue_backed / no / not_assessed; yes requires derived_topic_count > 0 and every confirmed topic meeting the intake standard; gap_queue_backed may pass setup only when plan/status/queue expose concrete decomposition/intake repair that still blocks Wave 0 topic-start passage and Wave 1 deepening until resolved`

## Anti-Stall Budget

- open_degraded_limitations_affecting_P0_P1: `0 / 3`
- active_topic_must_answer_claims_with_degraded_evidence: `0% / 20%`
- must_answer_claim_denominator: `not_started`
- degraded_claim_count: `0`
- budget_status: `pass`
- required_action_if_exceeded: `refill queue work for evidence repair or record blocker`

## Topology Delta

- new_topics: `none`
- pending_topic_candidates: `none`
- candidate_dispositions: `none`
- trigger_refs: `none`
- affected_gates: `none`
- new_topic_ids: `none`
- reopen_consequence: `none`
- recent_change: `instantiated from seed baseline`
- formalization_sync_note: `not_applicable`

When evidence digging discovers a possible new topic, split, merge, or redirect, record the candidate here before changing `PLAN_PATH -> Topic Registry`. Every candidate must receive exactly one disposition: `merge_existing / formalize_new_topic / suspend / archive / redirect`; when multiple candidates exist, keep candidate entries and disposition entries semicolon-separated in the same order. `Topology Drift Review.unresolved_new_topic_candidates` must not carry a candidate that is absent from `Topology Delta.pending_topic_candidates`. Formalized topics must sync plan, status, queue, trace, and the new topic seed file under `TOPIC_ROOT` before `topology_sync_state` returns to `synced`.

## Topology Drift Review

- before_wave1_audit: `not_started`
- before_wave2_audit: `not_started`
- readiness_review: `not_started`
- unresolved_new_topic_candidates: `none`
- disposition_rule: `formalize new independent topics before advancing, or record archive / suspend / redirect with reopen trigger`

## Wave 0

- target_floor: `<WAVE0_SHARED_DOC_FLOOR>`
- docs_landed: `0`
- accepted_shared_ref_count: `0`
- high_trust_shared_ref_count: `0`
- constraint_or_risk_ref_count: `0`
- comparison_practice_failure_ref_count: `0`
- shared_foundation_only_refs: `none`
- completion_status: `not_started`
- foundation_sufficiency_check: `not_started`
- gap: `shared ground truth not started`

## Wave 0 Foundation Gate Audit

- audit_status: `not_started`
- overall_result: `fail`
- wave1_entry_allowed: `no`
- last_audited_at: `not_started`
- audit_rule: `require derived_topic_count > 0, then compare shared reference floor, high-trust majority, risk coverage, comparison/practice/failure coverage, topic start readiness, source entry points, and 30-second retrieval before wave0_complete; 0 / 0 topic-start coverage cannot pass`
- high_trust_rule: `normally trust_level=official or trust_level=academic; practitioner counts only with auditable method/data plus independent verification; community does not count as high-trust`
- premature_gate_correction: `not_applicable`

| item | target | actual | result | gap |
| --- | --- | --- | --- | --- |
| accepted_shared_refs | `>= <WAVE0_SHARED_DOC_FLOOR>` | `0` | `fail` | `shared refs not started` |
| high_trust_shared_refs | `>= floor(<WAVE0_SHARED_DOC_FLOOR> / 2) + 1` | `0` | `fail` | `high-trust majority not established` |
| constraint_or_risk_refs | `>= 1` | `0` | `fail` | `no constraint / limitation / risk source` |
| comparison_practice_failure_refs | `>= 1 or unavailable-after-search record` | `0` | `fail` | `no comparison / practice review / failure analysis source or recorded search route` |
| topic_start_points_ready | `<derived_topic_count> / <derived_topic_count>` | `0 / <derived_topic_count>` | `fail` | `topic starts not audited` |
| source_entry_points_ready | `<derived_topic_count> / <derived_topic_count>` | `0 / <derived_topic_count>` | `fail` | `source buckets not mapped` |
| local_retrieval_30s | `pass` | `fail` | `fail` | `_INDEX / README navigation not verified` |
| accepted_shared_inventory | `every counted shared ref has local-path inventory row with required fields` | `0 / 0` | `fail` | `shared inventory not started` |
| webpage_diagnostic | `every counted webpage ref has substance, marketing, verification, and content-retention fields passing the Webpage Material Diagnostic Gate` | `0 / 0` | `fail` | `webpage diagnostics not started` |

Duplicate one row per confirmed topic in `PLAN_PATH -> Topic Registry`. If no confirmed topics exist yet, keep this table empty, keep `overall_result=fail`, keep `wave1_entry_allowed=no`, and keep decomposition/intake work visible in `QUEUE_PATH`; do not treat `0 / 0` topic-start coverage as pass.

| topic | wave1_start_point | source_entry_points | core_terms_ready | result | gap |
| --- | --- | --- | --- | --- | --- |
| `{id}/{slug}` | `not_ready` | `not_ready` | `not_ready` | `fail` | `<specific missing start point>` |

Do not set `overall_result=pass` or `wave1_entry_allowed=yes` until every global item and topic row is `pass` or carries an explicit unavailable-after-search record where allowed. The record must include attempted search route, queries or source routes, excluded source notes where any were found, and queue consequence.

### Unavailable-After-Search Records

Record one row for each Wave 0 item that is allowed to pass through an unavailable-after-search exception. Free-text mentions are not gate-authoritative; this table is the structured exception surface.

| item | attempted_search_route | attempted_queries_or_sources | excluded_inventory_refs | queue_consequence | confidence_effect |
| --- | --- | --- | --- | --- | --- |
| `comparison_practice_failure_refs` | `not_started` | `not_started` | `not_applicable` | `keep Wave 0 failed until evidence or record is completed` | `not_applicable` |

### Wave 0 Gate Rationale Note

- gate_authority: `not_authoritative; audit rows, entry flags, and inventories decide gate state`
- evidence_that_changed_gate_state: `not_started`
- unresolved_items: `shared foundation not started`
- why_unresolved_items_do_not_block_gate: `not_applicable; gate is failed`
- what_would_reopen_gate_after_pass: `later evidence invalidates shared terms, source entry points, accepted shared inventory, or retrieval route`

### Wave 0 Accepted Shared Reference Inventory

Duplicate rows for every shared reference counted toward the Wave 0 floor. Numeric counts are summaries only; this inventory is the evidence-path audit surface.

| local_ref_path | acceptance_status | source_type | source_family | tier | evidence_role | trust_level | source_date_scope | supports_claims | web_substance | commercial_intent | marketing_risk | cross_verification_required | cross_verification_status | content_retention_decision | supports_foundation_terms | supports_constraints_or_risks | supports_comparison_practice_failure | seed_backfill_status | counted_for_floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<REFERENCE_DIR>/{ref-file}.md` | `accepted` | `<primary / secondary / standard / regulation / dataset / other>` | `<publisher/source family>` | `tier_1` | `foundation` | `<official / academic / practitioner / community>` | `<date or date range>` | `<claim ids or short claim list>` | `<substantive / thin / none / not_webpage>` | `<none / mild / strong / unknown>` | `<low / medium / high>` | `<yes / no>` | `<verified / pending / unavailable_after_search / not_required>` | `<retain / prune_partial / exclude_source>` | `no` | `no` | `no` | `not_applicable` | `no` |

### Wave 0 Excluded Shared Reference Inventory

Record reviewed but uncounted shared sources when they affected search, exclusion, unavailable-after-search reasoning, or gate reasoning.

| local_ref_path_or_url | source_type | exclusion_reason | useful_as_background | attempted_search_route | follow_up |
| --- | --- | --- | --- | --- | --- |
| `<path-or-url>` | `<source type>` | `<why it does not count>` | `no` | `<query/source route>` | `<none or queue candidate>` |

## Wave 1

Duplicate one block per confirmed topic in `PLAN_PATH -> Topic Registry`. Do not leave the sample block as the only topic block when confirmed topics exist.

### Topic `{id}`: `{slug}`

- topic_id: `{id}`
- topic_slug: `{slug}`
- readable_ref_summary: `0 readable refs noted; not gate-authoritative`
- accepted_topic_ref_count: `0`
- topic_unique_ref_count: `0`
- primary_count: `0`
- primary_source_coverage: `insufficient`
- secondary_count: `0`
- recent_count: `0`
- limitation_count: `0`
- topic_seed_backfill_status: `not_started`
- topic_intake_status: `not_assessed`
- topic_intake_gap: `not_assessed`
- seed_growth_sections_ready: `unknown`
- last_seed_update_ref: `none`
- seed_backfill_gap: `not_started`
- topic_stop_decision: `not_assessed`
- early_saturation_reason: `not_applicable`
- early_saturation_minimum_exploration_record: `not_started`
- branch_record_required: `no`
- source_family_duplicate_review: `not_started`
- counterexample_failure_search: `not_started`
- question_reconciliation_state: `not_started`
- emergent_question_protocol_state: `not_started`
- emergent_questions_added: `0`
- no_new_questions_after_protocol: `not_started`
- exploration_exploitation_decision: `not_assessed`
- exploration_trigger_refs: `not_started`
- exploration_queue_consequence: `not_started`
- topic_target_wave1_status: `not_started`
- topic_target_wave2_synthesis_status: `not_started`
- evidence_summary: `produced_at_ref_count=0`
- evidence_summary_path: `<RUN_DIR>/seed_topics/_artifacts/wave1_topics/{id}-{slug}/evidence-summary.md`
- question_list: `produced_at_ref_count=0`
- question_list_path: `<RUN_DIR>/seed_topics/_artifacts/wave1_topics/{id}-{slug}/question-list.md`
- source_floor_audit_status: `not_started`
- source_floor_gap: `not_audited`
- wave2_gate_eligible: `no`
- status: `not_started`
- gap: `<topic gap>`

`evidence_summary` and `question_list` record the baseline accepted-reference count at which they were last produced: `produced_at_ref_count=N` where `0` means not yet produced. Initial production is triggered only after `topic_unique_ref_count >= 1` and seed backfill is active; shared-foundation-only references do not satisfy the initial artifact threshold. `evidence_summary_path` and `question_list_path` must follow the canonical layout under `<RUN_DIR>/seed_topics/_artifacts/wave1_topics/{id}-{slug}/`. When `produced_at_ref_count < accepted_topic_ref_count`, the artifact is stale and the queue should promote production if N=0 and the topic-unique threshold is met, or refresh if N>0 and delta >= 2. Missing initial artifacts block further Wave 1 source-intake, cross-topic handoff, or topic deepening unless the two-artifact production repair is foregrounded in `slot_1_current` or `slot_2_next`; Refill Pool-only production is not active repair. Stale artifacts block only when delta >= 2, before Wave 1 gate audit freshness, or when the next decision depends on the new evidence; delta 1 uses `artifact_refresh_not_due` when both artifacts already exist and no refresh work is explicitly queued.

`topic_target_wave1_status` audits confirmed Topic Investigation Targets from `PROFILE_PATH -> Root Must-Answer Set` links, topic seed `must_answer`, and the topic `question-list.md` Topic Investigation Targets section. They must be answered with local evidence, partially answered with downgrade/queue consequence, classified as unknown/limitation where the selected profile permits, or blocked with a concrete reason. `topic_target_wave2_synthesis_status` audits confirmed targets that depend on synthesis. Wave 1 may pass with these only when they are preserved as `synthesis_pending` or queue-backed with a concrete Wave 2 route; Wave 2 must later cover them in the synthesis artifact and matrix.

`question_reconciliation_state`, `emergent_question_protocol_state`, `emergent_questions_added`, `no_new_questions_after_protocol`, `exploration_exploitation_decision`, `exploration_trigger_refs`, and `exploration_queue_consequence` are the status-level projection of the topic's exploration ledger. They must sync with the seed topic `待验证问题` section and `question-list.md`. A topic with new accepted evidence cannot be marked complete, early-saturated, or Wave 1 passed while these fields are `not_started`, `not_assessed`, stale, disconnected from local reference paths, or inconsistent with the four required `question-list.md` sections: `Topic Investigation Targets`, `Question Reconciliation`, `Emergent Question Protocol`, and `Exploration / Exploitation Decision`.

When `topic_stop_decision = suspend / archive / redirect`, add or update the matching record in `Suspended Branches`. When `topic_stop_decision = early_saturation`, keep `early_saturation_reason` explicit and require `early_saturation_minimum_exploration_record`, `no_new_questions_after_protocol`, attempted counterexample/failure-mode routes, unresolved questions, and queue consequence. When `topic_stop_decision = complete`, every active floor, seed backfill, topic target coverage, question reconciliation, Emergent Question Protocol, evidence summary and question list, source-family duplicate review, and counterexample/failure-mode search must be recorded as passed.

For gate decisions, `accepted_topic_ref_count`, the accepted reference inventory, and the `Wave 1 Source Floor Audit` row are authoritative. Keep `readable_ref_summary` as a human-readable note only; do not use it to pass Wave 1.

Do not mark a topic Wave 1 block `passed` unless its accepted references have been backfilled into the topic seed growth sections or explicitly recorded as shared-foundation-only / deferred with a concrete queue candidate.

## Wave 1 Source Floor Audit

- audit_status: `not_started`
- overall_result: `fail`
- wave2_entry_allowed: `no`
- last_audited_at: `not_started`
- audit_rule: `compare every topic against wave1_doc_floor_per_topic, primary_source_floor, secondary_source_floor, recent_source_floor, limitation_source_floor, topic target handling under the selected research_profile, seed backfill, webpage diagnostic and content-retention gate, question reconciliation, evidence summary / question list freshness (produced_at_ref_count matches accepted_topic_ref_count), duplicate review, and counterexample/failure-mode search before wave1_complete`
- shared_reference_counting_rule: `Wave 0 shared refs count for a topic only when explicitly accepted for that topic and backfilled into that topic seed`
- premature_gate_correction: `not_applicable`

Duplicate one row per confirmed topic in `PLAN_PATH -> Topic Registry`. If no confirmed topics exist yet, keep this table empty and queue decomposition/intake work.

| topic | accepted_topic_refs | topic_unique_refs | primary | secondary | recent | limitation | must_answer_set_status | wave1_topic_answers | wave2_synthesis_pending | seed_backfill | webpage_diagnostic | question_reconciliation | emergent_question_protocol | exploration_decision | evidence_summary | question_list | duplicate_review | counterexample_failure_search | stop_exception | result | gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `{id}/{slug}` | `0 / <WAVE1_DOC_FLOOR_PER_TOPIC>` | `0 / ceil(<WAVE1_DOC_FLOOR_PER_TOPIC> / 2) or scarcity_exception` | `0 / <PRIMARY_SOURCE_FLOOR>` | `0 / <SECONDARY_SOURCE_FLOOR>` | `0 / <RECENT_SOURCE_FLOOR>` | `0 / <LIMITATION_SOURCE_FLOOR>` | `not_started` | `not_started` | `not_started` | `not_started` | `not_started` | `not_started` | `not_started` | `not_assessed` | `not_started` | `not_started` | `not_started` | `not_started` | `none` | `fail` | `<specific missing floors/questions/exploration gap>` |

Do not set `overall_result=pass` or `wave2_entry_allowed=yes` until every topic row is `pass` or has a justified stop exception recorded in Wave 1 and Suspended Branches where required. Numeric source-type counts in this audit must match counted rows in `Accepted Reference Inventory`; loose summaries do not authorize Wave 1 passage. A topic row cannot pass with `must_answer_set_status`, `wave1_topic_answers`, `wave2_synthesis_pending`, `question_reconciliation`, `emergent_question_protocol`, or `exploration_decision` unset after accepted topic evidence has landed.

### Scarcity / Stop Exception Records

Record one row for every topic whose Wave 1 audit uses a scarcity, early saturation, suspend, archive, redirect, or other stop exception. Free-text `stop_exception=yes` is not sufficient.

| topic | exception_type | reason | attempted_routes | unresolved_questions | confidence_effect | queue_consequence | branch_record |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `{id}/{slug}` | `<scarcity / early_saturation / suspend / archive / redirect>` | `<why floor cannot or should not be met now>` | `<queries/source routes/search attempts>` | `<question-list anchors or none-after-protocol>` | `<confidence downgrade or not_applicable>` | `<repair, suspend, archive, continue, or topology consequence>` | `<Suspended Branches entry or not_applicable>` |

### Wave 1 Gate Rationale Note

- gate_authority: `not_authoritative; audit rows, entry flags, and inventories decide gate state`
- evidence_that_changed_gate_state: `not_started`
- unresolved_items: `topic evidence floors not started`
- why_unresolved_items_do_not_block_gate: `not_applicable; gate is failed`
- what_would_reopen_gate_after_pass: `later evidence invalidates counted topic references, seed backfill, source-family independence, stop exception, or counterexample/failure-mode search`

### Accepted Reference Inventory

Duplicate rows for every reference counted toward a Wave 1 source floor. Numeric counts are summaries only; this inventory is the evidence-path audit surface.

| topic | local_ref_path | acceptance_status | source_type | trust_level | tier | evidence_role | source_date_scope | supports_claims | web_substance | commercial_intent | marketing_risk | cross_verification_required | cross_verification_status | content_retention_decision | supports_must_answer | supports_mechanism | supports_trend | supports_difficulty | supports_limitation | source_family | topic_unique_status | seed_backfill_status | counted_for_floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `{id}/{slug}` | `<REFERENCE_DIR>/{ref-file}.md` | `accepted` | `<primary / secondary / trend / limitation / other>` | `<official / academic / practitioner / community>` | `tier_1` | `must_answer` | `<date or date range>` | `<claim ids or short claim list>` | `<substantive / thin / none / not_webpage>` | `<none / mild / strong / unknown>` | `<low / medium / high>` | `<yes / no>` | `<verified / pending / unavailable_after_search / not_required>` | `<retain / prune_partial / exclude_source>` | `no` | `no` | `no` | `no` | `no` | `<publisher/source family>` | `<topic_unique / shared_foundation / both / not_applicable>` | `not_applicable` | `no` |

### Excluded Reference Inventory

Record reviewed but uncounted sources when they affected search, exclusion, or gate reasoning.

| topic | local_ref_path_or_url | source_type | source_family | exclusion_reason | useful_as_background | attempted_search_route | follow_up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `{id}/{slug}` | `<path-or-url>` | `<source type>` | `<publisher/source family>` | `<why it does not count>` | `no` | `<query/source route>` | `<none or queue candidate>` |

## Wave 2

- synthesis_file: `not_started`
- synthesis_artifact_path: `<ARTIFACT_DIR>/wave2/cross-topic-synthesis.md`
- cross_checks_done: `0`
- topics_represented: `0 / <derived_topic_count>`
- synthesis_phase_must_answers_identified: `0`
- synthesis_phase_must_answers_covered: `0`
- high_leverage_judgments_identified: `0`
- high_leverage_judgments_tagged: `0`
- judgments_with_local_backing_refs: `0`
- unresolved_conflicts: `not_started`
- synthesis_gate_audit_status: `not_started`
- readiness_gate_eligible: `no`
- answerability_class: `not_assessed`
- human_checkpoint_status: `not_started`
- final_report_view: `not_started`
- custom_final_report_view_label: `not_applicable`
- custom_final_report_view_slug: `not_applicable`
- final_output_dir: `not_started`
- repair_recommendation: `not_started`
- user_decision: `not_started`
- hitl2_projection_rule: `projection of PROFILE_PATH -> HITL2 Wave 2 Readiness Decision; must match PROFILE_PATH, STATUS Human Decision Checkpoints, and STATUS Wave 2 Human Decision Brief before Readiness; recorded-state readiness is owned by PROFILE hitl2_checkpoint_status, STATUS Human Decision Checkpoints hitl2_wave2_readiness_decision_status, and the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row`
- status: `not_started`

## Wave 2 Synthesis Gate Audit

- audit_status: `not_started`
- overall_result: `fail`
- readiness_entry_allowed: `no`
- last_audited_at: `not_started`
- audit_rule: `require derived_topic_count > 0, synthesis artifact, Root Must-Answer synthesis coverage, per-topic cross-check coverage, judgment tags, local backing refs, unresolved conflicts, and topic representation before wave2_complete; 0 / 0 topic coverage or empty topic rows cannot enter Readiness`
- premature_gate_correction: `not_applicable`

| item | target | actual | result | gap |
| --- | --- | --- | --- | --- |
| synthesis_artifact | `exists and cites local refs` | `not_started` | `fail` | `no Wave 2 synthesis artifact` |
| synthesis_phase_must_answers | `all confirmed answer_phase=wave2_synthesis entries covered by synthesis rows or explicit no-synthesis-required note when none exist` | `not_started` | `fail` | `Root Must-Answer synthesis coverage not audited` |
| topics_represented | `<derived_topic_count> / <derived_topic_count>` | `0 / <derived_topic_count>` | `fail` | `topic coverage not audited` |
| high_leverage_judgments_tagged | `all identified high-leverage judgments` | `0 / 0` | `fail` | `judgment set not identified` |
| judgments_with_local_backing_refs | `all tagged judgments have >= 1 local backing_ref` | `0 / 0` | `fail` | `backing refs not audited` |
| P0_P1_judgment_independence | `each P0/P1 judgment has >= 2 independent backing refs or scarcity exception with low confidence` | `not_started` | `fail` | `critical judgment independence not audited` |
| unresolved_conflicts | `0 or branch disposition / queue follow-up for each` | `not_started` | `fail` | `conflicts not audited` |

Duplicate one row per confirmed topic in `PLAN_PATH -> Topic Registry`. If no confirmed topics exist yet, keep this table empty, keep `overall_result=fail`, keep `readiness_entry_allowed=no`, and route back to decomposition/intake work; do not treat `0 / 0` topic coverage as pass.

| topic | cross_checked_conclusions | synthesis_must_answer_status | mechanism_reflected | trend_reflected | difficulty_reflected | limitation_reflected | local_backing_refs | result | gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `{id}/{slug}` | `0 / 2, or not_applicable_single_topic with >=1 locally backed synthesis conclusion when derived_topic_count=1` | `not_started` | `no` | `no` | `no` | `no` | `0` | `fail` | `<specific synthesis gap>` |

Do not set `overall_result=pass` or `readiness_entry_allowed=yes` until every global item and topic row is `pass` or carries an explicit not-applicable reason. In a single-topic run, the only valid cross-topic not-applicable reason is `not_applicable_single_topic`; the matrix must still contain at least one high-leverage single-topic synthesis conclusion with local backing refs.

### Wave 2 Gate Rationale Note

- gate_authority: `not_authoritative; audit rows, entry flags, matrix, and inventories decide gate state`
- evidence_that_changed_gate_state: `not_started`
- unresolved_items: `Wave 2 synthesis not started`
- why_unresolved_items_do_not_block_gate: `not_applicable; gate is failed`
- what_would_reopen_gate_after_pass: `later evidence invalidates Wave 2 synthesis conclusions, P0/P1 backing independence, conflict disposition, or topic representation`

### Cross-Topic Conclusion Matrix

Duplicate rows for each counted high-leverage or cross-topic conclusion. In a single-topic run, use at least one row with `compared_with=not_applicable_single_topic`; do not leave the matrix empty. When a row answers one or more `answer_phase=wave2_synthesis` entries, list their stable ids in `must_answer_ids`; use `not_applicable` only when the conclusion is not part of Root Must-Answer synthesis coverage.

| topic | must_answer_ids | conclusion | compared_with | claim_type | severity | confidence | backing_refs | independent_ref_count | scarcity_exception | conflict_status | synthesis_artifact_anchor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `{id}/{slug}` | `<MA-ids or not_applicable>` | `<conclusion>` | `<topic/object compared with>` | `<hard_fact / analysis_judgment / trend_speculation>` | `<P0 / P1 / P2 / P3>` | `<low / medium / high>` | `{local ref paths}` | `0` | `<none or reason>` | `<none / resolved / unresolved-with-queue>` | `<artifact path + anchor>` |

### Wave 2 Human Decision Brief

Write this section from `ARTIFACT_DIR/wave2/human-decision-brief.md` before Readiness closeout. The brief is user-facing UX support, not gate evidence and not a substitute for the Wave 2 audit.

The user-facing brief must use Chinese-first wording. It should explain, in plain language, what can be answered now, what cannot yet be answered or needs caution, and what repair/rerun work would add. Do not expose raw internal enum values as choices; write canonical values only in the fields below.

- brief_path: `<ARTIFACT_DIR>/wave2/human-decision-brief.md`
- answerability_class: `not_assessed`
- human_checkpoint_status: `not_started`
- final_report_view: `not_started`
- custom_final_report_view_label: `not_applicable`
- custom_final_report_view_slug: `not_applicable`
- final_output_dir: `not_started`
- repair_recommendation: `not_started`
- user_decision: `not_started`
- hitl2_projection_rule: `projection of PROFILE_PATH -> HITL2 Wave 2 Readiness Decision; must match PROFILE_PATH, STATUS Human Decision Checkpoints, and STATUS Wave 2 before Readiness; recorded-state readiness is owned by PROFILE hitl2_checkpoint_status, STATUS Human Decision Checkpoints hitl2_wave2_readiness_decision_status, and the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row`
- final_output_dir_mapping: `profile_default -> <RUN_DIR>/final; executive_brief -> <RUN_DIR>/final_executive_brief; evidence_map -> <RUN_DIR>/final_evidence_map; claim_judgment -> <RUN_DIR>/final_claim_judgment; technical_deep_dive -> <RUN_DIR>/final_technical_deep_dive; custom -> <RUN_DIR>/final_custom_{custom_final_report_view_slug}`
- hitl2_pending_user_stop_rule: `this section may authorize the user-facing HITL2 stop only after the brief exists and PROFILE/STATUS HITL2 fields are pending_user; QUEUE and STATUS must then show queue_health=blocked, stop_authorization_state=decision_blocker, unauthorized_stop_next_action=not_applicable, and safe_to_interrupt=yes`
- readiness_consequence: `Readiness blocked until PROFILE hitl2_checkpoint_status=recorded, STATUS Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=recorded, the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row has status=recorded, answerability_class is ready_substantive or ready_insufficient_judgment, human_checkpoint_status=recorded, user_decision=proceed_to_readiness, final_report_view is concrete, and final_output_dir follows final_output_dir_mapping; request_view_revision is an intermediate blocked state that must queue concrete final report view clarification and later be replaced by user_decision=proceed_to_readiness after the revised final_report_view is recorded; repair_and_rerun, stop_blocked, and blocked_repair_required keep Readiness blocked`

| answerability_class | required brief content | allowed user decision | readiness consequence |
| --- | --- | --- | --- |
| `ready_substantive` | `what can be answered, local backing refs, final report view choices` | `proceed_to_readiness / request_view_revision` | `may enter Readiness only when PROFILE hitl2_checkpoint_status=recorded, STATUS hitl2_wave2_readiness_decision_status=recorded, the PROFILE checkpoint row status=recorded, user_decision=proceed_to_readiness, final_report_view is concrete, and final_output_dir follows the mapping; request_view_revision must queue view clarification and cannot enter Readiness until replaced by proceed_to_readiness` |
| `ready_insufficient_judgment` | `why the honest answer is insufficient/unconfirmed, search routes, confidence limits, optional repair path` | `proceed_to_readiness / repair_and_rerun / request_view_revision` | `may enter Readiness only when insufficiency is locally backed, PROFILE hitl2_checkpoint_status=recorded, STATUS hitl2_wave2_readiness_decision_status=recorded, the PROFILE checkpoint row status=recorded, user_decision=proceed_to_readiness, final_report_view is concrete, and final_output_dir follows the mapping; repair_and_rerun or request_view_revision keeps Readiness blocked` |
| `blocked_repair_required` | `missing topic/evidence/synthesis coverage, recommended added topics or rerun route` | `repair_and_rerun / stop_blocked` | `cannot enter Readiness` |

## Readiness Check

- closeout_rule: `only readiness_passed may mark the run complete, ready for final handoff, or awaiting only user review`
- closeout_phase: `not_started / readiness_preflight / readiness_closeout_writeback / closed`
- 30_second_local_evidence_retrieval: `fail`
- mechanism_trend_difficulty_limitation_check: `fail`
- cross_topic_synthesis_check: `fail`
- human_checkpoint_check: `fail`
- topology_stability_check: `fail`
- branch_disposition_check: `fail`
- handoff_continuity_check: `fail`
- post_readiness_stage_check: `fail`
- overall_status: `fail`
- partial_rule: `partial is diagnostic only and counts as fail until repaired to pass`
- wave2_synthesis_continuity_note: `multi-topic runs require cross-topic comparison; single-topic runs require locally backed synthesis rows with compared_with=not_applicable_single_topic`
- runtime_qualification_closeout_rule: `readiness_preflight means every Readiness item except Runtime Qualification Result is pass, including human_checkpoint_check with PROFILE hitl2_checkpoint_status=recorded, STATUS hitl2_wave2_readiness_decision_status=recorded, PROFILE checkpoint row status=recorded, and no repair-required blocker, and runtime qualification may run; readiness_closeout_writeback means runtime qualification returned PASS and the execution agent must write Runtime Qualification Result, set overall_status=pass, set closeout_phase=closed, set state=completed, advance current_gate to readiness_passed, set next_gate=none, and close queue through queue_health=closed while preserving the Active Queue anchor`

### Readiness Rationale Note

- readiness_authority: `not_authoritative; readiness checklist and retrieval test decide readiness state`
- evidence_that_changed_readiness_state: `not_started`
- unresolved_items: `handoff retrieval and final continuity not tested`
- why_unresolved_items_do_not_block_readiness: `not_applicable; readiness is failed`
- what_would_reopen_after_pass: `substantive evidence problem in accepted references, invalidated synthesis judgment, topology drift, or failed retrieval continuity`

### 30-Second Local Evidence Retrieval Test

- tested_at: `not_started`
- tester: `not_started`
- route: `not_started`
- route_paths_checked: `not_started`
- result: `fail`
- elapsed_seconds: `not_started`
- gaps_found: `README/status to profile, plan, queue, trace, reference index, key refs, topic seeds, and artifacts not tested`

### Runtime Qualification Result

- tested_at: `not_started`
- verifier: `<RUNTIME_QUALIFICATION_PATH or DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_V12/command_playbooks/check-runtime.md>`
- result: `not_started`
- status_effect: `not_started`

During `readiness_preflight`, this section may remain `not_started` while runtime qualification runs read-only. When runtime qualification passes, enter `readiness_closeout_writeback`: record the structured checklist result here before setting `overall_status=pass`, `closeout_phase=closed`, `state=completed`, `current_gate=readiness_passed`, `next_gate=none`, `stop_authorization_state=final_delivery`, `unauthorized_stop_next_action=not_applicable`, and `safe_to_interrupt=yes`. Do not use this section to override failed Readiness items.

## Suspended Branches

Records all non-mainline branch dispositions, not only suspended branches.

- none_recorded_yet: `yes`

When first real disposition appears, delete `none_recorded_yet` and add fields: `branch / disposition / why / confirmed_so_far / still_missing / reopen_trigger`. Use canonical dispositions: `discard / compress / suspend / archive / redirect`.

## Failed Explorations

Record representative failed explorations only when the lesson prevents repeated waste.

- none_recorded_yet: `yes`

When first representative miss appears, delete `none_recorded_yet` and add fields: `exploration / why_tried / what_found / why_failed / lesson`.

## Resume Checkpoint

- last_completed_step: `instantiation completed`
- last_verified_result: `control files generated; qualification result comes from the latest external check-instantiation result, not this skeleton field`
- safe_to_interrupt: `no`
- queue_resume_entry: `read <QUEUE_PATH> -> Active Queue`
- trace_resume_entry: `read <TRACE_PATH> -> Trace Entries`
- resume_precheck: `confirm execution entry prerequisites before Wave 0`
- do_not_forget: `initialize README, _INDEX, reference/artifact file sets, trace entry point, and topic seed growth sections before Wave 0`

## Worklog

- instantiation completed
<!-- END STATUS OUTPUT -->
