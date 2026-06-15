---
title: "Output Skeleton - PROFILE"
role: "copyable output skeleton"
scope: "template source for PROFILE_PATH only"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/RESEARCH_PROFILES.md"
  - "specs/METHODOLOGY.md"
writes:
  - "<PROFILE_PATH>"
---

# Output Skeleton - PROFILE

Copy only the content between `BEGIN PROFILE OUTPUT` and `END PROFILE OUTPUT` into `PROFILE_PATH`.

Replace every instantiation placeholder before delivery. Runtime metavariables may remain only inside explicit schema/template/pattern guidance. Do not copy this file's frontmatter.

<!-- BEGIN PROFILE OUTPUT -->
# <PLAN_NAME> Research Profile

> plan: `<PLAN_PATH>`
> status: `<STATUS_PATH>`
> queue: `<QUEUE_PATH>`
> trace: `<TRACE_PATH>`
> This file is the run-specific user-intent and human-decision record. Shared profile policy lives in `<RUN_DIR>/_framework/specs/RESEARCH_PROFILES.md`; this file records the selected profile, root must-answer set, optional search preferences, configured parameters, and HITL1/HITL2 human decisions for this run.

## File Role Snapshot

- role: `run-specific research profile, root must-answer set, and human decision record`
- source_of_record_for: `research_profile selection, root must-answer set, optional HITL1 search preferences, configured profile parameters, manual profile overrides, HITL1/HITL2 human decisions, final_report_view`
- not_authority_for: `topic registry, gate passage, accepted reference counts, active queue execution, trace history`
- routine_navigation: `use this file for user intent; use <PLAN_PATH> for execution blueprint, <STATUS_PATH> for current run state, <QUEUE_PATH> for active work, and <TRACE_PATH> for diagnostic turns`

## Pre-Work Framework Boundary

- framework_snapshot: `<RUN_DIR>/_framework`
- framework_readonly_rule: `pre-work framework snapshot is read-only after instantiation; read it for policy, commands, and read-only diagnostics only; do not edit, regenerate, normalize, or write run state inside _framework`
- framework_repair_rule: `missing same-version snapshot paths may be repaired only through <RUN_DIR>/_framework/command_playbooks/repair-framework-snapshot.md; never hand-edit _framework and never copy _framework/output_templates over root control files`

## Profile Binding

| field | value |
| --- | --- |
| `profile_path` | `<PROFILE_PATH>` |
| `plan_path` | `<PLAN_PATH>` |
| `status_path` | `<STATUS_PATH>` |
| `queue_path` | `<QUEUE_PATH>` |
| `trace_path` | `<TRACE_PATH>` |
| `artifact_dir` | `<RUN_DIR>/seed_topics/_artifacts` |
| `research_profile` | `<quick_factual / exploratory_map / claim_verification>` |
| `research_profile_user_choice` | `<explicit_user_choice / explicit_user_choice_after_clarification / explicit_override>` |
| `final_deliverable` | `<FINAL_DELIVERABLE>` |
| `audience` | `<AUDIENCE>` |
| `round_focus` | `<ROUND_FOCUS>` |

## Profile Contract

- canonical_profile_authority: `<RUN_DIR>/_framework/specs/RESEARCH_PROFILES.md`
- selected_intent_contract: `<quick factual answer / exploratory coverage map / claim verification judgment>`
- wave1_pass_contract: `<profile-critical questions resolved, downgraded, queued, or explicitly classified as limits/unknowns>`
- wave2_synthesis_contract: `<factual conclusion / coverage map and priorities / claim judgment ledger>`
- quick_suitability_review: `<not_applicable / low_risk_narrow / explicit_override_with_risk_rationale_and_confidence_consequence>`
- profile_boundary: `profile governs intent, Wave 1 closure posture, Wave 2 synthesis posture, and default evidence parameters; it cannot weaken gate audits, accepted-reference inventory fields, webpage diagnostic rules, cross-verification, artifact production, seed backfill, source-family duplicate review, or critical-claim checks`

## Root Must-Answer Set

This is the concrete run-specific list captured with the profile choice. It is not stored in the shared profile authority. Each entry must later map into topic investigation targets, Wave 2 synthesis coverage rows, or a queue-backed clarification/decomposition route.

- final_must_answer_user_input: `<user-provided questions/claims, or explicit unsure>`
- final_must_answer_intake_status: `<ready / gap_queue_backed>`
- root_lens_for_wave2: `<how the final result will judge whether seed topics answer the original need>`
- mapping_rule: `map each root must-answer entry to one or more topic evidence-summary coverage rows; mark answer_phase=wave1_topic when a topic can answer it independently, answer_phase=wave2_synthesis when synthesis is required`

| id | final_must_answer | intended_profile_handling | initial_answer_phase | mapped_topics | intake_status | queue_consequence |
| --- | --- | --- | --- | --- | --- | --- |
| `<FMA-1>` | `<question or claim the final result must answer>` | `<quick_factual / exploratory_map / claim_verification handling>` | `<wave1_topic / wave2_synthesis / pending_decomposition>` | `<topic ids or pending>` | `<ready / gap>` | `<none or concrete queue task>` |

## Search Preference Intake

These preferences are optional HITL1 guidance for source intake. Do not make the user fill every field. If the user gives no preference, record `not_specified_use_profile_defaults` and continue with the selected research profile plus normal evidence-quality rules.

- search_preference_intake_status: `<not_specified_use_profile_defaults / recorded / partial_recorded>`
- user_search_preference_input: `<optional user source/date/geography/language preference text, or not_specified_use_profile_defaults>`
- preferred_source_types: `<not_specified_use_profile_defaults / official; academic; practitioner; community; standards; regulation; dataset; filing; benchmark; local_user_provided>`
- preferred_source_families: `<not_specified_use_profile_defaults or concrete publishers, institutions, databases, repositories, standards bodies, communities>`
- source_date_window: `<not_specified_use_profile_defaults or concrete date window such as 2023-2026 / latest_available / historical_baseline_allowed>`
- geography_or_jurisdiction: `<not_specified_use_profile_defaults or concrete geography/jurisdiction>`
- language_preferences: `<not_specified_use_profile_defaults or concrete languages>`
- must_include_sources: `<none or concrete source names/URLs/local files>`
- exclusion_rules: `<none or concrete exclusions such as vendor blogs, SEO pages, pre-2020 sources, social posts>`
- source_preference_application_rule: `source-intake requests should use these preferences when concrete; not_specified_use_profile_defaults means use the selected research profile, topic evidence anchors, and normal trust/tier/evidence-quality rules; preferences cannot weaken gate audits, webpage diagnostics, local-reference requirements, or critical-claim checks`

## Configured Profile Parameters

- active_wave0_formula: `<formula used for WAVE0_SHARED_DOC_FLOOR>`
- configured_floors: `wave0=<WAVE0_SHARED_DOC_FLOOR>; wave1_per_topic=<WAVE1_DOC_FLOOR_PER_TOPIC>; primary=<PRIMARY_SOURCE_FLOOR>; secondary=<SECONDARY_SOURCE_FLOOR>; recent=<RECENT_SOURCE_FLOOR>; limitation=<LIMITATION_SOURCE_FLOOR>`
- critical_claim_checks: `<CRITICAL_CLAIM_CHECKS>`
- must_answer_policy: `<profile-derived expected count/intensity, answer_phase handling, and whether synthesis-phase entries are expected>`
- cost_expectation: `<why this profile is proportionate; for quick_factual, state that quick still requires configured Wave 0 refs, per-topic Wave 1 refs, triggered topic artifacts, Wave 2 synthesis, HITL2 human decision, and Readiness>`
- manual_parameter_overrides: `<none or exact floor/filter/evidence-intensity/must-answer override and reason>`

## Human Decision Checkpoints

### HITL1 User Prompt Template

This is the approved user-facing tone for `HITL1_profile_and_root_must_answer`. User-facing copy must be Chinese-first. If an English term is needed, write it in bilingual form. Do not show raw enum values to the user; map the selected option to `quick_factual`, `exploratory_map`, or `claim_verification` internally.

```text
开始前我需要确认这轮研究的目标。你更想要哪种结果？

A. 快速事实答案（quick factual）：适合低风险、范围很窄的问题。
B. 探索地图（exploratory map）：适合先摸清领域结构、空白和下一步重点。
C. 说法验证（claim verification）：适合判断一个说法是否被证据支持、削弱或需要限定。

另外，请用一句话写下：最终报告必须回答什么问题（final must-answer）？
如果你还不确定，也可以写“我不确定，先帮我拆问题”。我会把这个不确定记录为待澄清缺口，并排入后续澄清或拆解任务。

如果你对搜索材料有偏好，也可以顺手说一句，例如“优先官方/学术来源”“只看 2023 年以后”“重点看中国/美国/欧盟”“排除供应商营销页”。不写也可以，我会按研究模式的默认证据规则执行。
```

| checkpoint | timing | status | user input | consequence |
| --- | --- | --- | --- | --- |
| `HITL1_profile_and_root_must_answer` | `before execution begins` | `recorded` | `<actual user profile choice plus final must-answer input, or explicit unsure text with queue-backed route>` | `profile parameters configured; root lens created or gap_queue_backed` |
| `HITL2_wave2_readiness_decision` | `after Wave 2 synthesis assessment and before Readiness closeout` | `not_started` | `final report view, insufficiency-report choice, or repair/rerun decision` | `User-facing HITL2 may interrupt only after the brief exists and this row/status plus STATUS are pending_user; Readiness may proceed only when this row has status=recorded, HITL2 detail has hitl2_checkpoint_status=recorded, STATUS Human Decision Checkpoints has hitl2_wave2_readiness_decision_status=recorded, and answerability is readiness-eligible` |

### HITL2 Wave 2 Readiness Decision

- hitl2_checkpoint_status: `not_started`
- answerability_class: `not_assessed`
- human_checkpoint_status: `not_started`
- final_report_view: `not_started`
- custom_final_report_view_label: `not_applicable`
- custom_final_report_view_slug: `not_applicable`
- final_output_dir: `not_started`
- repair_recommendation: `not_started`
- user_decision: `not_started`
- hitl2_decision_brief_path: `<ARTIFACT_DIR>/wave2/human-decision-brief.md`
- hitl2_source_of_record_rule: `this section is the HITL2 Source of Record; STATUS Human Decision Checkpoints, STATUS Wave 2, and STATUS Wave 2 Human Decision Brief must mirror these fields before Readiness; Readiness also requires this section hitl2_checkpoint_status=recorded, the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row status=recorded, and STATUS Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=recorded`
- hitl2_artifact_binding_rule: `in an instantiated run, hitl2_decision_brief_path must be the absolute PROFILE Profile Binding.artifact_dir/wave2/human-decision-brief.md path; do not leave ARTIFACT_DIR unresolved in PROFILE_PATH`
- final_output_dir_mapping: `profile_default -> <RUN_DIR>/final; executive_brief -> <RUN_DIR>/final_executive_brief; evidence_map -> <RUN_DIR>/final_evidence_map; claim_judgment -> <RUN_DIR>/final_claim_judgment; technical_deep_dive -> <RUN_DIR>/final_technical_deep_dive; custom -> <RUN_DIR>/final_custom_{custom_final_report_view_slug}`
- pending_user_stop_rule: `after Wave 2 synthesis assessment, the agent may ask the user only after hitl2_decision_brief_path exists, hitl2_checkpoint_status=pending_user, the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row status=pending_user, STATUS Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=pending_user, human_checkpoint_status=pending_user, QUEUE queue_health=blocked, stop_authorization_state=decision_blocker, unauthorized_stop_next_action=not_applicable, and STATUS Resume Checkpoint.safe_to_interrupt=yes; before that, continue local HITL2 preparation under unauthorized_continue_required`
- readiness_consequence: `Readiness blocked until hitl2_checkpoint_status=recorded, the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row has status=recorded, answerability_class is ready_substantive or ready_insufficient_judgment, human_checkpoint_status=recorded, user_decision=proceed_to_readiness, final_report_view is concrete, and final_output_dir follows final_output_dir_mapping; request_view_revision is an intermediate blocked state that must queue concrete view-clarification work and later be replaced by user_decision=proceed_to_readiness after the revised final_report_view is recorded; repair_and_rerun, stop_blocked, and blocked_repair_required keep Readiness blocked`

User-facing HITL2 copy must be Chinese-first and must not expose raw enum values. The agent may write canonical enum values only into the fields above and the table below. This prompt is not allowed as a Wave 2 recap; it is allowed only after the pending-user stop rule above is satisfied.

```text
我已经完成综合。现在需要你确认下一步：

目前证据足够回答的是：{用一两句话概括能回答的内容，并说明来自本地证据}。
仍然不足或需要谨慎的地方是：{用一两句话说明缺口、限制或不能确认的点}。
如果继续补证据/重跑（repair and rerun），我会优先补：{具体主题、证据、冲突处理或综合缺口}。

请选择下一步：
A. 继续生成最终报告（proceed to final report）：用当前证据生成最终报告。
B. 换一种报告视角（change final report view）：例如改成证据地图、结论简报、说法判断或技术深挖。
C. 继续补证据/重跑（repair and rerun）：先补缺口，再重新综合判断。
D. 停止并保留阻塞原因（stop blocked）：不生成最终报告，只记录现在为什么不能继续。
```

| answerability_class | required human-facing brief | allowed user decision | readiness consequence |
| --- | --- | --- | --- |
| `ready_substantive` | `what can be answered, local backing refs, final report view choices` | `proceed_to_readiness / request_view_revision` | `may enter Readiness only when hitl2_checkpoint_status=recorded, this checkpoint row status=recorded, STATUS hitl2_wave2_readiness_decision_status=recorded, user_decision=proceed_to_readiness, final_report_view is concrete, and final_output_dir follows the mapping; request_view_revision must queue view clarification and cannot enter Readiness until replaced by proceed_to_readiness` |
| `ready_insufficient_judgment` | `why the honest answer is insufficient/unconfirmed, search routes, confidence limits, optional repair path` | `proceed_to_readiness / repair_and_rerun / request_view_revision` | `may enter Readiness only when insufficiency is locally backed, hitl2_checkpoint_status=recorded, this checkpoint row status=recorded, STATUS hitl2_wave2_readiness_decision_status=recorded, user_decision=proceed_to_readiness, final_report_view is concrete, and final_output_dir follows the mapping; repair_and_rerun or request_view_revision keeps Readiness blocked` |
| `blocked_repair_required` | `missing topic/evidence/synthesis coverage, recommended added topics or rerun route` | `repair_and_rerun / stop_blocked` | `cannot enter Readiness` |
<!-- END PROFILE OUTPUT -->
