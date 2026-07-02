---
title: "Shared Constants"
role: "shared package-version, enum, and field-set authority"
scope: "template identity, current version, stable enum values, placeholders, and reusable field names"
reads: []
writes: []
---

# Shared Constants

This file is the low-level Source of Record for stable names and values. It defines package identity, the current template version, enum values, placeholders, and reusable field names. It does not define gate logic, research method, or source-of-record semantics.

## Template Package Identity

- template_family: `DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE`
- current_version: `v12.17`
- version_placeholder: `<TEMPLATE_VERSION>`
- version_log: `VERSION-LOG.md`
- version_rule: `this section is the only current-version authority; changelog entries, generated run files, and CLI diagnostics are projections`

## Placeholder Classes

Angle-bracket tokens have two different meanings. Do not collapse them into one "unresolved placeholder" rule.

- instantiation_placeholders: angle-bracket concrete run parameters that exist only in template skeletons and must be resolved in root control files before `instantiation_complete`, such as `<RUN_DIR>`, `<PROFILE_PATH>`, `<PLAN_PATH>`, `<STATUS_PATH>`, `<QUEUE_PATH>`, `<TRACE_PATH>`, `<PLAN_NAME>`, `<PLAN_BASENAME>`, `<TEMPLATE_VERSION>`, `<ROUND_LABEL>`, `<ORIGINAL_TOPIC_DIR>`, `<FINAL_DELIVERABLE>`, `<AUDIENCE>`, `<ROUND_FOCUS>`, configured floor placeholders, and topic registry rows for confirmed topics.
- runtime_metavariables: schema or pattern variables used inside documented template, filename-pattern, trace-schema, or refill-candidate instructions. In generated root control files these must use brace notation, such as `{batch-id}`, `{topic-id}`, `{topic-slug}`, `{source-or-claim-slug}`, `{ref-file}`, `{local ref paths}`, `{NN}`, and `{YYYY-MM-DD HH:MM}`.
- rule: generated root control files must contain no angle-bracket token matching `<...>`. Use concrete absolute paths for run-root path bindings and concrete values for active state, configured paths, counts, topic rows, inventory rows, gate flags, active queue tasks, references, artifacts, and trace entries. Reusable schema/template/pattern guidance may keep brace-style metavariables only.
- fail_condition: a token like `<batch-id>` is valid in a source template skeleton but invalid anywhere in generated `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, or `TRACE_PATH`. In generated files, write `{batch-id}` only inside explicit reusable pattern guidance, never in the active `slot_1_current` for a concrete source-intake batch, `STATUS.latest_cache_candidate_cards`, an accepted reference inventory row, a topic artifact path, or a trace entry.

## Run State Enums

- current_mode: `instantiation_only / execution`
- state: `not_started / in_progress / blocked / completed`
- current_wave: `Instantiation / Wave 0 / Wave 1 / Wave 2 / Readiness Check`
- current_gate: `instantiation_complete / setup_ready / wave0_complete / wave1_complete / wave2_complete / readiness_passed`
- next_gate: `instantiation_complete / setup_ready / wave0_complete / wave1_complete / wave2_complete / readiness_passed / none`
- distance_to_next_gate: `far / mid / near`
- queue_health: `ready / thin / blocked / closed`
- execution_mode: `sequential`
- queue_producer_rule: `initial_window_render / setup_repair / slot_completion_refill / queue_thin_refill / urgent_preemption / failed_gate_audit / gate_reopen / topology_delta / reference_landed / topic_ref_count_changed / source_intake_fan_in / hitl2_readiness_path / blocker_path / boundary_hook`
- receipt_check_phase: `preflight / closeout`
- stop_authorization_state: `unauthorized_continue_required / final_delivery / decision_blocker / empty_queue_after_refill`
- unauthorized_stop_next_action: `concrete next tool/file/search/check/refill/promotion/action path, or not_applicable only when stop_authorization_state is authorized`
- next_scoring_action: `+reference / +backfill / +artifact / +index / +decision`
- interrupt_condition_matched: `not_applicable / mainline_blockage / high_risk_action`
- wave0_completion_status: `not_started / in_progress / passed / failed`
- wave_topic_status: `not_started / in_progress / passed / blocked`
- readiness_check_item: `pass / partial / fail`
- gate_audit: `not_started / in_progress / pass / fail`
- source_floor_audit: `not_started / in_progress / pass / fail`
- source_intake_status: `not_started / running / fan_in_ready / integrated / failed / suspended`
- source_intake_runner_mode: `inline_main_agent / foreground_subagent_runner / not_applicable`
- source_intake_wait_state: `not_started / running / fan_in_ready / integrated / failed / suspended`
- seed_topic_intake_ready: `yes / gap_queue_backed / no / not_assessed`
- seed_topic_intake_status: `not_started / ready / gap_queue_backed / no / not_assessed`
- topic_intake_status: `not_started / ready / assumption / gap / not_assessed`
- human_checkpoint_status: `not_started / pending_user / recorded / blocked / not_applicable`
- answerability_class: `not_assessed / ready_substantive / ready_insufficient_judgment / blocked_repair_required`
- hitl2_user_decision: `not_started / proceed_to_readiness / request_view_revision / repair_and_rerun / stop_blocked`
- final_report_view: `not_started / profile_default / executive_brief / evidence_map / claim_judgment / technical_deep_dive / custom`

## Research And Evidence Enums

- research_profile: `quick_factual / exploratory_map / claim_verification`
- must_answer_initial_phase: `wave1_topic / wave2_synthesis / pending_decomposition`
- must_answer_answer_phase: `wave1_topic / wave2_synthesis`
- must_answer_status: `candidate / confirmed / answered / partial / downgraded / unknown_classified / synthesis_pending / queued / blocked / retired`
- exploration_exploitation_decision: `not_assessed / continue / exploit_current_line / explore_new_line / topology_candidate / complete / early_saturation_review / suspend / archive / redirect`
- acceptance_status: `accepted / reviewed_uncounted / excluded / background`
- tier: `tier_1 / tier_2 / tier_3 / tier_4`
- evidence_role: `foundation / must_answer / mechanism / trend / difficulty / limitation / comparison / synthesis_backing / discovery_only`
- topic_unique_status: `topic_unique / shared_foundation / both / not_applicable`
- seed_backfill_status: `current / deferred_queue_backed / shared_foundation_only / not_applicable`
- counted_for_floor: `yes / no`
- trust_level: `official / academic / practitioner / community`
- captured_excerpt: `yes / partial / no`
- web_substance: `substantive / thin / none / not_webpage`
- commercial_intent: `none / mild / strong / unknown`
- marketing_risk: `low / medium / high`
- cross_verification_required: `yes / no`
- cross_verification_status: `verified / pending / unavailable_after_search / not_required`
- content_retention_decision: `retain / prune_partial / exclude_source`
- primary_source_coverage: `insufficient / sufficient / saturated`
- claim_type: `hard_fact / analysis_judgment / trend_speculation`
- confidence: `low / medium / high`
- severity: `P0 / P1 / P2 / P3`

## Topic And Topology Enums

- topic_stop_decision: `not_assessed / continue / complete / early_saturation / suspend / archive / redirect`
- branch_disposition: `discard / compress / suspend / archive / redirect`
- topology_sync_state: `synced / status_pending / plan_pending`
- topology_delta_decision: `not_applicable / pending / merge_existing / formalize_new_topic / suspend / archive / redirect`
- topology_delta_disposition: `merge_existing / formalize_new_topic / suspend / archive / redirect`

## Local Reference File Fields

The field names below are the canonical local reference schema field set. `specs/METHODOLOGY.md` defines reference-quality semantics; `output_templates/PLAN.md` and `flows/reference-artifact-backfill.md` project this field set into copyable templates.

- `source_url`
- `source_file`
- `acceptance_status`
- `source_type`
- `source_family`
- `tier`
- `evidence_role`
- `topic_unique_status`
- `accessed_at`
- `source_date_scope`
- `related_topic`
- `trust_level`
- `why_it_matters`
- `related_entities`
- `seed_backfill_status`
- `captured_excerpt`
- `supports_claims`
- `web_substance`
- `commercial_intent`
- `marketing_risk`
- `cross_verification_required`
- `cross_verification_status`
- `content_retention_decision`
- `risks_or_limitations`
- `excluded_reason`

## Local Reference Section Names

- `Key Facts`
- `Core Content Capture`
- `Relevance To This Research`
- `Quotable Terms / Concepts`
- `Risks And Limitations`
