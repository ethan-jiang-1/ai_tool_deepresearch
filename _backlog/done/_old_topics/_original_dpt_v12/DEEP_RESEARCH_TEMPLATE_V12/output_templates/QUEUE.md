---
title: "Output Skeleton - QUEUE"
role: "copyable output skeleton"
scope: "template source for QUEUE_PATH only"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/METHODOLOGY.md"
  - "specs/QUEUE_CONTRACT.md"
  - "flows/queue-agentic-flow.md"
writes:
  - "<QUEUE_PATH>"
---

# Output Skeleton - QUEUE

Copy only the content between `BEGIN QUEUE OUTPUT` and `END QUEUE OUTPUT` into `QUEUE_PATH`.

Replace every instantiation placeholder before delivery. Runtime metavariables may remain only inside explicit schema/template/pattern guidance. Do not copy this file's frontmatter.

<!-- BEGIN QUEUE OUTPUT -->
# <PLAN_NAME> Execution Queue

> profile: `<PROFILE_PATH>`
> plan: `<PLAN_PATH>`
> status: `<STATUS_PATH>`
> trace: `<TRACE_PATH>`
> This file records continuous execution actions, refill candidates, and promotion rules. It does not replace the design blueprint, full status file, or diagnostic trace.
> Queue contract authority: `<RUN_DIR>/_framework/specs/QUEUE_CONTRACT.md`; action flow authority: `<RUN_DIR>/_framework/flows/queue-agentic-flow.md`. This file is runtime Queue data, not the mechanism SSOT.

## Operator View

- where_we_are: `Ready to initialize execution workspace after qualification`
- what_cannot_happen_yet: `Wave 0 cannot complete before Wave 0 audit passes; later waves and Readiness are blocked by their gate audits`
- next_valid_action: `complete slot_1_current, refill before closing it, then promote slot_2_next`
- current_gap_or_blocker: `active queue work exists; sync Blocked State only if a true mainline blocker appears`
- evidence_to_inspect: `new reference files, <REFERENCE_DIR>/_INDEX.md, affected seed_topics files, STATUS audit inventories, and _cache candidate-cards only when source intake is active`
- command_entrypoint_to_inspect: `<PLAN_PATH> -> Runtime Command Entrypoint; local command index at <RUN_DIR>/_framework/COMMANDS.md`

## Pre-Work Framework Boundary

- framework_snapshot: `<RUN_DIR>/_framework`
- framework_readonly_rule: `pre-work framework snapshot is read-only after instantiation; read it for policy, commands, and read-only diagnostics only; do not edit, regenerate, normalize, or write run state inside _framework`
- framework_repair_rule: `missing same-version snapshot paths may be repaired only through <RUN_DIR>/_framework/command_playbooks/repair-framework-snapshot.md; never hand-edit _framework and never copy _framework/output_templates over root control files`

## Active Queue

- queue_health: `ready`
- execution_mode: `sequential`
- autonomy_mode: `strict_silent_autonomous`
- pre_response_gate: `required`
- receipt_check_phase: `preflight`
- task_window_mode: `rolling_execution_window`
- platform_task_projection: `available_required_else_queue_only`
- projection_authority: `QUEUE_PATH owns native projection state; native todo/task/plan is a projection`
- projection_surfaces: `claude_native_todo_or_task_tools_when_available / codex_native_plan_or_todo_surface_when_available / queue_only_fallback`
- active_window: `sequential: slot_1_current / slot_2_next / slot_3_pending / slot_4_pending / slot_5_tail`
- projection_minimum: `one in_progress executable task plus four pending executable tasks when a native surface is available`
- completion_requires: `write result, sync STATUS/QUEUE, verify declared result and completion receipt, promote/refill window, sync native projection if available, then run Pre-Response Gate`
- slash_command_boundary: `slash commands such as /goal may be used manually by the user but are not framework-controlled queue actions`
- allowed_output_states: `final_delivery / decision_blocker / empty_queue_after_refill`
- stop_authorization_state: `unauthorized_continue_required`
- unauthorized_stop_next_action: `execute slot_1_current: initialize execution workspace, verify directory scaffolding, and prepare topic seed growth sections`
- safe_to_interrupt_default: `no`
- default_if_gate_fails: `continue_with_next_tool_or_file_action`
- batch_boundary_rule: `completing slot_1_current authorizes queue promotion and next action, not a user report`
- forbidden_output_states: `milestone_complete / gate_passed / artifact_refreshed / status_synced / batch_complete / next_task_known`
- forbidden_user_prompts: `continue? / continue or adjust direction? / await user review / report progress and wait`
- user_update_policy: `do not stop for routine progress`
- context_load_policy: `evidence_cards_first; do not load full search results, full webpages, raw database/API payloads, large local-file excerpts, large candidate URL lists, or low-alignment material into main conversation by default`
- source_intake: `source retrieval/search/local lookup/database or API query/fetch/page triage writes to <RUN_DIR>/_cache first through flows/source-intake-flow.md; main-agent fan-in promotes only reviewed material to <REFERENCE_DIR> using provenance filenames (00-shared-* for Wave 0 shared foundation, {topic-id}-* for Wave 1 topic evidence); direct <REFERENCE_DIR> creation is allowed only for already-known local/user-provided sources whose task text states no retrieval, no search, and no fetch; _cache is not evidence and cannot count`
- source_intake_runner_mode: `not_applicable`
- source_intake_batch_id: `not_applicable`
- source_intake_wait_state: `not_started`
- source_intake_wait_rule: `STATUS/QUEUE source-intake split: QUEUE fields are active control state only; STATUS.source_intake_status records lifecycle state. State table: running = slot_1_current is source intake and writes exact run-local _cache/intake/{batch-id}/intake-request.md, retrieval-results.md, candidate-cards.md, capture-manifest.md, and _cache/excluded/{batch-id}-excluded.md; fan_in_ready = slot_1_current is main-agent candidate-card review/promotion for a concrete batch and must name the same valid run-local _cache/intake/{batch-id}/candidate-cards.md as STATUS.latest_cache_candidate_cards plus _cache/promote-log.md in writes_to; fan_in_ready is never pending user review and must continue as local Queue work; integrated/failed/suspended = latest batch outcome in STATUS.source_intake_status only, with active fields reset exactly to not_applicable / not_applicable / not_started and STATUS.source_intake_wait_state=not_started after closeout unless slot_1_current is still closing fan-in; none/unknown/n/a are not valid reset substitutes; no detached background source intake`
- queue_contract_authority: `<RUN_DIR>/_framework/specs/QUEUE_CONTRACT.md`
- queue_flow_authority: `<RUN_DIR>/_framework/flows/queue-agentic-flow.md`
- boundary_hook_authority: `<RUN_DIR>/_framework/flows/queue-agentic-flow.md -> Boundary Hook Execution Protocol; runtime hook work units remain Queue-visible foreground work and must not copy the hook catalog into QUEUE.md`
- queue_runtime_role: `runtime data carrier only; do not treat this file as the Queue mechanism SSOT`
- task_lineage_rule: `each active task must name work_id, action, producer_rule, one lineage field (source_gap / status_gap / gate_gap / plan_target / trigger), why_this_matters, impact_scope, required_receipts, done_condition, verification, writes_to, status_sync, completion_receipt, and failure_route; generic continue/summarize/advance/update tasks are not executable Deep Research queue work`
- gate_transition_trace_rule: `Wave 0, Wave 1, Wave 2, and Readiness closeouts require distinct TRACE entries with exact gate_transition field values wave0_complete / wave1_complete / wave2_complete / readiness_passed; a correction or missed-checkpoint note is diagnostic only and cannot replace the missing transition checkpoint`
- search_provider_boundary: `default search route is native_search; Exa may appear only when user explicitly selected Exa search or the work unit explains the Exa-specific capability required`
- user_visible_stop_authorization_rule: `QUEUE_PATH Active Queue owns stop_authorization_state; while state is unauthorized_continue_required, STATUS Resume Checkpoint.safe_to_interrupt must be no and unauthorized_stop_next_action must name the next concrete tool/file/search/check/refill/promotion action`
- trigger_semantics: `trigger lineage fields and producer-rule promotion conditions are QUEUE promotion/refill conditions only; they do not execute hidden event handlers, write files outside the active task, or bypass slot_1_current / Refill Pool promotion`
- plan_status_queue_rule: `PLAN defines targets and projects PROFILE-backed floors; STATUS exposes current gaps and audit rows; QUEUE converts those gaps into local writes and status sync; if a needed writeback is missing, refill or repair instead of advancing the wave`
- refill_policy: `sequential keeps slot_1_current / slot_2_next / slot_3_pending / slot_4_pending / slot_5_tail non-empty; Refill Pool stores candidates and any task displaced by preemption`
- preemption_policy: `urgent gate repair, blocker prevention, missing initial artifact production, stale artifact repair, source-intake fan-in, HITL2 human decision, or state-correction work may preempt pending slots. Do not interrupt slot_1_current unless continuing it would write incorrect state, cross a gate illegally, or waste work against a known blocker. When initial topic artifacts are missing after the first topic-unique ref, put the two-artifact production task in slot_1_current or slot_2_next before any further Wave 1 source-intake, cross-topic handoff, or topic deepening; Refill Pool-only production is not a receipt. When all five slots are full, insert the urgent task at the earliest valid pending position, shift lower-priority tasks back, and move the displaced slot_5_tail to the top of Refill Pool with preempted_from_slot=slot_5_tail and restore_priority=next_tail_opening.`
- interruption_policy: `interrupt only for a decision_blocker: prepared HITL2 pending-user decision after the Wave 2 human-decision brief and PROFILE/STATUS projections exist, another missing user decision required for the mainline, missing credential/access/material required for the mainline, high-risk irreversible action, or no executable queue item after documented refill/suspend/archive/redirect attempts`
- initial_window_render_rule: `if derived_topic_count=0, do not schedule Wave 0 source intake in any active slot; replace the whole active window with concrete seed-topic decomposition or intake clarification work and keep Wave 0 evidence gates failed until at least one topic is confirmed or the run is explicitly closed as blocked`
- zero_topic_initial_window_rule: `when derived_topic_count=0, render slot_1_current as scaffold/setup assessment, slot_2_next as pending seed-topic decomposition or intake clarification, slot_3_pending through slot_5_tail as follow-up decomposition/intake repair or user clarification writeback; no task in the initial window may retrieve sources, create Wave 0 shared references, or count evidence floors`

### Zero-Topic Setup Replacement Template

Use this shape to replace source-intake/deepening slots when `derived_topic_count=0`.

- work_id: `zero-topic-decomposition-{n}`
- action: `decompose or clarify seed topics before evidence execution`
- producer_rule: `initial_window_render`
- status_gap: `PLAN.Instance Config.derived_topic_count=0 or PLAN Topic Registry has no confirmed executable topic`
- why_this_matters: `Deep Research cannot start evidence retrieval without at least one confirmed seed topic or a documented blocked closeout`
- impact_scope: `<PLAN_PATH> Topic Registry / Seed Topic Intake Matrix / Topic Goals; <STATUS_PATH> Setup Ready Transition; <QUEUE_PATH>; <TOPIC_ROOT>`
- required_receipts: `file:<PLAN_PATH>; file:<STATUS_PATH>; queue:source_intake_wait_state=not_started`
- done_condition: `at least one confirmed seed topic is created with required intake context, or the run records a real blocker with no executable decomposition route`
- verification: `check-seed-intake reports confirmed topic readiness or concrete gap_queue_backed repair; check-gate-setup-ready does not see source-intake/Wave0 evidence work in active slots`
- writes_to: `<PLAN_PATH>; topic seed files under <TOPIC_ROOT>; <STATUS_PATH>; <QUEUE_PATH>; <TRACE_PATH> only when a diagnostic correction is needed`
- status_sync: `derived_topic_count / seed_topic_intake_ready / topic_intake_gaps / setup_ready_status / next_scoring_action`
- completion_receipt: `status:seed_topic_intake_ready=yes or queue:queue_health=blocked`
- failure_route: `keep setup_ready failed or gap_queue_backed; queue the next decomposition/intake repair; do not schedule source intake`

### slot_1_current

- work_id: `setup-repair-001`
- action: `initialize execution workspace, verify directory scaffolding, and prepare topic seed growth sections`
- producer_rule: `initial_window_render`
- source_gap: `STATUS.Directory / Integration State and Setup Ready Transition are not ready after instantiation`
- why_this_matters: `setup is the last cheap correction point before evidence execution; missing framework/navigation/seed surfaces would make later source work drift`
- impact_scope: `<RUN_DIR>/_framework; <PLAN_PATH>; <STATUS_PATH>; <QUEUE_PATH>; <TOPIC_ROOT>; <REFERENCE_DIR>; <ARTIFACT_DIR>`
- required_receipts: `file:<PLAN_PATH>; file:<STATUS_PATH>; file:<QUEUE_PATH>; dir:<RUN_DIR>/_framework`
- done_condition: `RUN_DIR/_framework exists as read-only rules snapshot; PLAN Runtime Command Entrypoint points to local RUN_DIR/_framework/COMMANDS.md, local cli_tools/check_framework.mjs, and the five instantiated root control files; TOPIC_ROOT = RUN_DIR/seed_topics; REFERENCE_DIR = RUN_DIR/seed_topics/_reference; ARTIFACT_DIR = RUN_DIR/seed_topics/_artifacts; instantiated artifact scaffold exists at ARTIFACT_DIR/README.md, ARTIFACT_DIR/wave1_topics/, ARTIFACT_DIR/wave2/, and ARTIFACT_DIR/shared/; TOPIC_ROOT/README.md, REFERENCE_DIR/README.md, and REFERENCE_DIR/_INDEX.md exist or are intentionally refreshed; every topic seed has stable growth sections ready for backfill; and any missing upper-section intake substance is recorded as a topic_intake_gap rather than hidden by placeholder headings`
- verification: `run <RUN_DIR>/_framework/cli_tools/check_framework.mjs --gate check-gate-setup-ready <RUN_DIR> or record the exact failing setup/seed/surface receipt and queue repair`
- writes_to: `<TOPIC_ROOT>/README.md; topic seed files under <TOPIC_ROOT>; <REFERENCE_DIR>/README.md; <REFERENCE_DIR>/_INDEX.md; <STATUS_PATH>`
- status_sync: `set current_mode=execution, current_wave=Wave 0, current_gate=setup_ready, update Directory / Integration State and Setup Ready Transition, set framework_command_index_ready/framework_cli_tools_ready/runtime_command_entrypoint_ready, set topic_root_alignment/reference_dir_alignment and preserve artifact_dir_alignment=scaffolded unless real artifact drift is found, set seed_growth_sections_ready fields, set seed_topic_intake_ready=yes only when derived_topic_count > 0 and all confirmed topics meet intake standard; set gap_queue_backed when derived_topic_count=0 has concrete decomposition/intake clarification queue work or when all missing upper-section fields have concrete queue repair; and record topic_intake_gap fields or assumptions where upper-section substance is missing`
- completion_receipt: `status:setup_ready_status=ready_or_gap_queue_backed; index:<REFERENCE_DIR>/_INDEX.md exists; file:<ARTIFACT_DIR>/README.md`
- failure_route: `record setup/intake/surface gap in <STATUS_PATH>; insert setup_repair work before any Wave 0 retrieval or Wave 1 deepening`

### slot_2_next

- work_id: `setup-retrieval-smoke-001`
- action: `run setup retrieval smoke test and record the route`
- producer_rule: `setup_repair`
- status_gap: `STATUS.Directory / Integration State.evidence_retrieval_30s_ready is not ready`
- why_this_matters: `the next agent must be able to recover evidence routes from files, not chat memory`
- impact_scope: `<STATUS_PATH>; <QUEUE_PATH>; TOPIC_ROOT/REFERENCE_DIR/ARTIFACT_DIR navigation`
- required_receipts: `file:<TOPIC_ROOT>/README.md; file:<REFERENCE_DIR>/_INDEX.md; file:<ARTIFACT_DIR>/README.md`
- done_condition: `starting from TOPIC_ROOT/README.md or STATUS_PATH, locate profile, plan, queue, trace, REFERENCE_DIR/_INDEX.md, topic seed entry points, and ARTIFACT_DIR/README.md; record elapsed time, route, and gaps`
- verification: `route_paths_checked resolve inside <RUN_DIR> and elapsed time is recorded; missing route creates repair work`
- writes_to: `<STATUS_PATH>`
- status_sync: `update Directory / Integration State, evidence_retrieval_30s_ready, and Resume Checkpoint`
- completion_receipt: `status:evidence_retrieval_30s_ready=yes`
- failure_route: `record missing navigation receipt in <STATUS_PATH>; queue setup_repair for the missing README/index/path binding`

### slot_3_pending

This default `slot_3_pending` applies only when `derived_topic_count > 0`. When `derived_topic_count=0`, replace it with the `zero_topic_initial_window_rule` shape above.

- work_id: `wave0-source-intake-b001`
- action: `run Wave 0 source intake batch for next high-value shared reference`
- producer_rule: `failed_gate_audit`
- gate_gap: `Wave 0 Foundation Gate Audit accepted shared reference floor is open`
- why_this_matters: `Wave 0 needs shared foundation evidence before topic-specific deepening can be trusted`
- impact_scope: `<RUN_DIR>/_cache/intake/wave0-b001; <RUN_DIR>/_cache/excluded; STATUS source_intake fields; QUEUE source_intake active fields`
- required_receipts: `status:seed_topic_intake_ready=yes; status:derived_topic_count>0; queue:source_intake_wait_state=not_started`
- done_condition: `one concrete source-intake batch has an intake request, retrieval results, candidate cards, capture manifest listing any optional concrete captures, and exclusions or a recorded fail/suspend outcome under RUN_DIR/_cache; no REFERENCE_DIR, topic seed, artifact, status inventory count, or gate field is promoted by the runner`
- verification: `cache files exist for the concrete batch id or cache failure/suspend notes exist; no REFERENCE_DIR promotion happened during runner work`
- writes_to: `<RUN_DIR>/_cache/intake/wave0-b001/intake-request.md; <RUN_DIR>/_cache/intake/wave0-b001/retrieval-results.md; <RUN_DIR>/_cache/intake/wave0-b001/candidate-cards.md; <RUN_DIR>/_cache/intake/wave0-b001/capture-manifest.md; <RUN_DIR>/_cache/excluded/wave0-b001-excluded.md`
- status_sync: `set STATUS.source_intake_status=running and mirror QUEUE source_intake_runner_mode=foreground_subagent_runner or inline_main_agent, source_intake_batch_id=wave0-b001, source_intake_wait_state=running, latest_cache_candidate_cards=<RUN_DIR>/_cache/intake/wave0-b001/candidate-cards.md; when cache output/failure is ready, move QUEUE to fan-in with source_intake_runner_mode=not_applicable, same concrete source_intake_batch_id, and source_intake_wait_state=fan_in_ready while STATUS.source_intake_status=fan_in_ready mirrors the same batch and candidate-card path`
- completion_receipt: `file:<RUN_DIR>/_cache/intake/wave0-b001/candidate-cards.md or file:<RUN_DIR>/_cache/excluded/wave0-b001-excluded.md; status:source_intake_status=fan_in_ready_or_failed_or_suspended`
- failure_route: `write failure/suspend note under _cache; queue source_intake_fan_in closeout or fallback native_search intake route`

### slot_4_pending

- work_id: `wave0-source-fanin-b001`
- action: `fan-in Wave 0 source-intake candidate cards and promote accepted shared reference`
- producer_rule: `source_intake_fan_in`
- trigger: `source_intake_wait_state=fan_in_ready for wave0-b001 with candidate cards under <RUN_DIR>/_cache/intake/wave0-b001/candidate-cards.md`
- why_this_matters: `_cache material is not evidence until main-agent fan-in reviews and promotes it`
- impact_scope: `<REFERENCE_DIR>; <REFERENCE_DIR>/_INDEX.md; <STATUS_PATH>; <QUEUE_PATH>; affected topic seeds when applicable; _cache/promote-log.md`
- required_receipts: `file:<RUN_DIR>/_cache/intake/wave0-b001/candidate-cards.md; queue:source_intake_wait_state=fan_in_ready`
- done_condition: `main agent reviews candidate cards/captures/exclusions, promotes one accepted Authoritative Copy when available, updates _INDEX and Wave 0 inventory, writes _cache/promote-log.md, and resets source-intake active fields after closeout`
- verification: `promote-log exists; accepted refs have local reference files and _INDEX rows, or failure/suspend outcome is recorded; source_intake active fields reset`
- writes_to: `<REFERENCE_DIR>/00-shared-{source-slug}.md when accepted; <REFERENCE_DIR>/_INDEX.md; <STATUS_PATH>; <QUEUE_PATH>; <RUN_DIR>/_cache/promote-log.md`
- status_sync: `Wave 0 accepted shared reference inventory, source_intake_status latest outcome, source_intake_wait_state reset, latest_cache_candidate_cards, cache_promote_log, and next foundation gap`
- completion_receipt: `file:<RUN_DIR>/_cache/promote-log.md; queue:source_intake_wait_state=not_started`
- failure_route: `record fan-in failure in promote-log and STATUS; queue repair for reference quality, _INDEX, source-intake reset, or fallback intake`

### slot_5_tail

- work_id: `wave0-refill-next-gap-001`
- action: `refill next Wave 0 foundation or intake repair task after fan-in`
- producer_rule: `slot_completion_refill`
- gate_gap: `Wave 0 Foundation Gate Audit may still have open shared-source, topic-start, or intake gaps after first fan-in`
- why_this_matters: `the active window must keep executable repair/evidence work visible instead of ending with a recap`
- impact_scope: `<QUEUE_PATH>; <STATUS_PATH>; Wave 0 Foundation Gate Audit`
- required_receipts: `queue:source_intake_wait_state=not_started`
- done_condition: `queue chooses the highest-value remaining Wave 0 foundation/intake gap, or records a blocker if no executable repair exists`
- verification: `slot_5_tail is filled with a contract-complete work unit or Blocked State records a valid decision_blocker/empty_queue_after_refill path`
- writes_to: `<QUEUE_PATH>; <STATUS_PATH>`
- status_sync: `next Wave 0 foundation gap, queue_health, and gate audit repair pointer`
- completion_receipt: `active_window_contract_complete`
- failure_route: `record empty-queue-after-refill attempt and add queue_thin_refill or blocker_path work`

## Blocked State

- blocked_reason: `not_applicable`
- interrupt_condition_matched: `not_applicable`
- interrupt_condition_allowed_values: `not_applicable / mainline_blockage / high_risk_action`
- unblock_trigger: `not_applicable`
- stop_authorization_state_when_active: `decision_blocker`
- unauthorized_stop_next_action_when_active: `not_applicable`
- safe_to_interrupt_user: `not_applicable_until_active; yes when this Blocked State is activated for a concrete decision_blocker`

When active, sync `STATUS_PATH.state = blocked`, `STATUS_PATH.blocking_issue`, `STATUS_PATH.Operator View.stop_authorization_state=decision_blocker`, `STATUS_PATH.Operator View.unauthorized_stop_next_action=not_applicable`, and `STATUS_PATH.Resume Checkpoint.safe_to_interrupt=yes`. Do not activate this section for a passed wave gate, routine progress, known next task, or user-review prompt. The planned HITL2 activation is valid only after `ARTIFACT_DIR/wave2/human-decision-brief.md` exists and PROFILE/STATUS HITL2 fields are set to `pending_user`.

## Refill Pool

Repeat candidate blocks as needed. Do not collapse multiple candidates into one comma-separated line.

- refill_pool_ordering_rule: `candidate promotion ignores physical order until all stronger sort keys tie. Promote only ready/prerequisite satisfied candidates whose promotion_trigger is active. Sort ready candidates by priority_class, then current wave/gate affinity, then restore_priority, then physical order.`
- refill_pool_priority_order: `P0_preempted_restore -> P1_state_or_gate_repair -> P2_close_open_loop -> P3_current_gate_gap -> P4_progressive_artifact_or_seed_backfill -> P5_new_reference_intake -> P6_topology_triage`

### Candidate Block

- work_id: `candidate-source-intake-{batch-id}`
- candidate: `run source-intake batch for next high-value reference need`
- priority_class: `P5_new_reference_intake`
- producer_rule: `queue_thin_refill`
- source_gap: `<which Wave 0 / Wave 1 / Wave 2 evidence or gate gap this batch is meant to close>`
- why_this_matters: `source intake is the controlled foreground route for retrieval/search/fetch work; it keeps noisy material in _cache until fan-in`
- impact_scope: `<RUN_DIR>/_cache/intake/{batch-id}; <RUN_DIR>/_cache/excluded/{batch-id}-excluded.md; STATUS/QUEUE source_intake fields`
- required_receipts: `status:seed_topic_intake_ready=yes`
- done_condition: `a concrete batch id is assigned; intake request, retrieval results, candidate cards, capture manifest listing any optional concrete captures, and excluded notes are written only under RUN_DIR/_cache; runner does not write REFERENCE_DIR, _INDEX, topic seeds, artifacts, status inventories, trace, or gate fields; if retrieval fails or should suspend, the outcome is recorded in cache notes and the queue moves to fan-in closeout rather than direct reference landing`
- verification: `batch cache files or failure/suspend notes exist; no REFERENCE_DIR/_INDEX/topic/artifact writes happened in runner work`
- writes_to: `<RUN_DIR>/_cache/intake/{batch-id}/intake-request.md; <RUN_DIR>/_cache/intake/{batch-id}/retrieval-results.md; <RUN_DIR>/_cache/intake/{batch-id}/candidate-cards.md; <RUN_DIR>/_cache/intake/{batch-id}/capture-manifest.md; <RUN_DIR>/_cache/excluded/{batch-id}-excluded.md`
- status_sync: `STATUS.source_intake_status=running; mirror QUEUE source_intake_runner_mode=foreground_subagent_runner or inline_main_agent; source_intake_batch_id={batch-id}; source_intake_wait_state=running; latest_cache_candidate_cards=<RUN_DIR>/_cache/intake/{batch-id}/candidate-cards.md; after runner output/failure, queue next slot_1_current as main-agent fan-in with source_intake_runner_mode=not_applicable, same concrete batch id, source_intake_wait_state=fan_in_ready, and STATUS.source_intake_status=fan_in_ready with the same candidate-card path`
- prerequisite: `execution started`
- promotion_trigger: `current task closes or queue becomes thin`
- completion_receipt: `file:<RUN_DIR>/_cache/intake/{batch-id}/candidate-cards.md or file:<RUN_DIR>/_cache/excluded/{batch-id}-excluded.md; status:source_intake_status=fan_in_ready_or_failed_or_suspended`
- failure_route: `record retrieval/search/fetch failure in _cache; queue source_intake_fan_in closeout or native_search fallback if Exa failed softly`
- preempted_from_slot: `not_applicable unless this candidate was displaced by an urgent insertion`
- restore_priority: `normal unless preempted_from_slot is set; preempted tasks use next_tail_opening before ordinary Refill Pool candidates`

### Candidate Block

- work_id: `candidate-source-fanin-{batch-id}`
- candidate: `fan-in source-intake candidate cards and promote accepted material`
- priority_class: `P2_close_open_loop`
- producer_rule: `source_intake_fan_in`
- trigger: `source_intake_wait_state=fan_in_ready with a concrete source_intake_batch_id and latest_cache_candidate_cards pointing to <RUN_DIR>/_cache/intake/{batch-id}/candidate-cards.md`
- why_this_matters: `candidate cards are not counted evidence until the main agent reviews, promotes, indexes, and syncs them`
- impact_scope: `<REFERENCE_DIR>; <REFERENCE_DIR>/_INDEX.md; affected topic seeds; artifact receipts when topic ref count changes; <STATUS_PATH>; <QUEUE_PATH>; _cache/promote-log.md`
- required_receipts: `file:<RUN_DIR>/_cache/intake/{batch-id}/candidate-cards.md; status:source_intake_status=fan_in_ready`
- done_condition: `main agent reviews <RUN_DIR>/_cache/intake/{batch-id}/candidate-cards.md plus needed captures/exclusions; accepted source material becomes an Authoritative Copy with reusable hard content, webpage diagnostic fields, content retention decision, pruned Core Content Capture where needed, and provenance filename (00-shared-* for Wave 0 shared foundation, {topic-id}-* for Wave 1 topic evidence); _INDEX is updated; relevant topic seed growth sections are backfilled with local reference paths plus question reconciliation / emergent check when a topic is affected or shared-foundation-only reason is recorded; if the first topic-unique ref triggers initial artifacts, produce evidence-summary.md and question-list.md in this task or promote the two-artifact production task into slot_1_current/slot_2_next before any further Wave 1 source-intake, cross-topic handoff, or topic deepening; thresholded refresh may be queued with producer_rule=topic_ref_count_changed; _cache/promote-log.md is written; source-intake outcome is closed as integrated, failed, or suspended`
- verification: `_cache/promote-log.md exists; promoted accepted refs have local files and _INDEX entries; affected topic seeds/artifact steering are current, refresh-not-due, or explicitly queued`
- writes_to: `one exact new reference file under <REFERENCE_DIR> when accepted; <REFERENCE_DIR>/_INDEX.md; affected topic seed file(s) under TOPIC_ROOT when applicable; declared <ARTIFACT_DIR> artifacts only when this task explicitly covers artifact production/refresh; <STATUS_PATH>; <QUEUE_PATH>; <RUN_DIR>/_cache/promote-log.md`
- status_sync: `docs_landed / accepted_topic_ref_count / topic_unique_ref_count / topic source counts / webpage diagnostic inventory fields / topic_seed_backfill_status / last_seed_update_ref / seed_backfill_gap / gap / next_scoring_action / STATUS.source_intake_status latest outcome; after closeout reset QUEUE active source_intake_runner_mode=not_applicable, source_intake_batch_id=not_applicable, source_intake_wait_state=not_started; STATUS records latest concrete batch id, source_intake_wait_state=not_started, candidate-card path when available, and cache_promote_log=<RUN_DIR>/_cache/promote-log.md`
- prerequisite: `candidate cards exist for a concrete batch`
- promotion_trigger: `source-intake runner produced candidate cards, exclusions, failure, or suspend record`
- completion_receipt: `file:<RUN_DIR>/_cache/promote-log.md; queue:source_intake_wait_state=not_started; artifact_steering_current:{topic-id}/{topic-slug} or artifact_refresh_not_due:{topic-id}/{topic-slug} or queued_artifact_repair:{topic-id}/{topic-slug}`
- failure_route: `record fan-in failure in STATUS and promote-log; queue reference quality, index, seed backfill, artifact steering, or source-intake reset repair`
- preempted_from_slot: `not_applicable unless this candidate was displaced by an urgent insertion`
- restore_priority: `normal unless preempted_from_slot is set; preempted tasks use next_tail_opening before ordinary Refill Pool candidates`

### Candidate Block

- work_id: `candidate-direct-reference-{source-slug}`
- candidate: `land already-known local/user-provided source without retrieval`
- priority_class: `P5_new_reference_intake`
- producer_rule: `queue_thin_refill`
- trigger: `already-known local/user-provided source is available and the task explicitly says no retrieval, no search, and no fetch`
- why_this_matters: `direct reference creation is allowed only when the source is already supplied; otherwise source work must use _cache intake`
- impact_scope: `<REFERENCE_DIR>; <REFERENCE_DIR>/_INDEX.md; affected topic seeds; <STATUS_PATH>; artifact steering candidates`
- required_receipts: `direct_reference_exception`
- done_condition: `task text explicitly states the source is already-known local/user-provided and no retrieval, no search, and no fetch was used; reference is captured as an Authoritative Copy with reusable hard content and provenance filename (00-shared-* for Wave 0 shared foundation, {topic-id}-* for Wave 1 topic evidence); indexed; relevant topic seed growth section updated with local reference paths plus question reconciliation / emergent check when a topic is affected; if the first topic-unique ref triggers initial artifacts, produce evidence-summary.md and question-list.md in this task or promote the two-artifact production task into slot_1_current/slot_2_next before any further Wave 1 source-intake, cross-topic handoff, or topic deepening; thresholded refresh may be queued with producer_rule=topic_ref_count_changed; and status synced`
- verification: `reference file exists with accepted-reference fields and reusable body; _INDEX contains it; topic seed and artifact steering status are current, refresh-not-due, or queued`
- writes_to: `one exact new reference file under <REFERENCE_DIR>; <REFERENCE_DIR>/_INDEX.md; affected topic seed file(s) under TOPIC_ROOT; <STATUS_PATH>`
- status_sync: `docs_landed / accepted_topic_ref_count / topic_unique_ref_count / topic source counts / webpage diagnostic inventory fields when applicable / topic_seed_backfill_status / last_seed_update_ref / seed_backfill_gap / gap / next_scoring_action`
- prerequisite: `source is already-known local/user-provided and direct task text says all three: no retrieval, no search, and no fetch`
- promotion_trigger: `current task closes or queue becomes thin`
- completion_receipt: `index:<REFERENCE_DIR>/_INDEX.md contains {source-slug}; artifact_steering_current:{topic-id}/{topic-slug} or artifact_refresh_not_due:{topic-id}/{topic-slug} or queued_artifact_repair:{topic-id}/{topic-slug}`
- failure_route: `if source needs retrieval/search/fetch, move work to source-intake candidate; otherwise queue reference quality/index/seed backfill repair`
- preempted_from_slot: `not_applicable unless this candidate was displaced by an urgent insertion`
- restore_priority: `normal unless preempted_from_slot is set; preempted tasks use next_tail_opening before ordinary Refill Pool candidates`

### Candidate Block

- work_id: `candidate-seed-intake-repair-{topic-id}`
- candidate: `clarify seed topic intake gap`
- priority_class: `P3_current_gate_gap`
- producer_rule: `setup_repair`
- status_gap: `PLAN Seed Topic Intake Matrix or STATUS topic block shows missing must_answer, why_now, boundary, evidence_anchors, or why_it_matters`
- why_this_matters: `a vague confirmed topic makes first evidence searches generic and can corrupt Wave 0/Wave 1 direction`
- impact_scope: `<PLAN_PATH> Seed Topic Intake Matrix; affected topic seed; <STATUS_PATH>; <QUEUE_PATH>; setup_ready gate`
- required_receipts: `file:<PLAN_PATH>; file:<STATUS_PATH>`
- done_condition: `missing upper-section intake field is resolved from seed material, recorded as an assumption/gap on a confirmed topic with queue consequence, or moved outside Topic Registry as a pending candidate with concrete decomposition or clarification work; first evidence route is concrete enough to avoid generic search`
- verification: `check-seed-intake passes for affected topic or reports gap_queue_backed with concrete repair still queued`
- writes_to: `affected topic seed file under TOPIC_ROOT when clarification is local; <PLAN_PATH> topic registry or topic goal block if topic identity changes; <STATUS_PATH>; <QUEUE_PATH>`
- status_sync: `topic_intake_gap / topic boundary / must_answer / evidence anchors / next_scoring_action`
- prerequisite: `a known topic is missing must_answer, why-now, boundary, evidence anchor, or why-it-matters substance`
- promotion_trigger: `setup detects an intake gap or first evidence search would be generic`
- completion_receipt: `status:seed_topic_intake_ready=yes_or_gap_queue_backed`
- failure_route: `keep setup_ready as gap_queue_backed or failed; block Wave 0 topic-start/Wave 1 deepening and queue decomposition/intake repair`
- preempted_from_slot: `not_applicable unless this candidate was displaced by an urgent insertion`
- restore_priority: `normal unless preempted_from_slot is set; preempted tasks use next_tail_opening before ordinary Refill Pool candidates`

### Candidate Block

- work_id: `candidate-topology-triage-{candidate-id}`
- candidate: `triage topology delta candidate`
- priority_class: `P6_topology_triage`
- producer_rule: `topology_delta`
- trigger: `STATUS_PATH.Topology Delta.pending_topic_candidates != none OR evidence digging identifies a repeated unclassified concept, independent object cluster, topic split, topic merge, boundary breach, contradiction cluster, or redirect target`
- why_this_matters: `topic topology changes after evidence digging must be synchronized deliberately, not silently folded into existing topics`
- impact_scope: `<PLAN_PATH> Topic Registry/Seed Topic Intake Matrix/Topic Goals; affected seed files; <STATUS_PATH>; <QUEUE_PATH>; <TRACE_PATH>; affected gates`
- required_receipts: `status:pending_topic_candidates=*`
- done_condition: `candidate is classified as exactly one of merge_existing / formalize_new_topic / suspend / archive / redirect; weak signals remain as [涌现] questions; STATUS_PATH.Topology Delta records trigger refs, candidate disposition, affected gates, and reopen consequence; Topology Drift Review.unresolved_new_topic_candidates is synced to Topology Delta.pending_topic_candidates; if formalize_new_topic is selected, PLAN Topic Registry append-at-end, Seed Topic Intake Matrix row, Topic Goals block, topic seed file physically under TOPIC_ROOT, queue refill, and TRACE topology_formalization entry are all complete before topology_sync_state=synced`
- verification: `topology_sync_state=synced only after plan/status/queue/trace/seed sync; affected passed gate is reopened when needed`
- writes_to: `<PLAN_PATH> only when formalizing a new topic; affected topic seed file(s) under TOPIC_ROOT; new topic seed file physically under TOPIC_ROOT when formalized; <STATUS_PATH>; <QUEUE_PATH>; <TRACE_PATH>`
- status_sync: `pending_topic_candidates / candidate_dispositions / trigger_refs / affected_gates / new_topic_ids / reopen_consequence / topology_sync_state / gate_reopen_state / reopened_from_gate / reopen_reason / invalidated_claims / current_wave / current_gate`
- prerequisite: `execution has begun and the candidate is backed by triggering evidence, repeated search pattern, contradiction, boundary breach, split, merge, or redirect signal`
- promotion_trigger: `STATUS_PATH.Topology Delta has pending candidates; before Wave 1 audit; before Wave 2 audit; during Readiness topology stability review`
- completion_receipt: `topology_delta_disposed`
- failure_route: `record topology triage failure in STATUS; keep affected gate open/reopened and queue setup/topic/artifact repair`
- preempted_from_slot: `not_applicable unless this candidate was displaced by an urgent insertion`
- restore_priority: `normal unless preempted_from_slot is set; preempted tasks use next_tail_opening before ordinary Refill Pool candidates`

### Candidate Block

- work_id: `candidate-artifact-initial-{topic-id}`
- candidate: `produce topic evidence summary and question list artifacts (initial)`
- priority_class: `P4_progressive_artifact_or_seed_backfill`
- producer_rule: `topic_ref_count_changed`
- trigger: `topic.topic_unique_ref_count >= 1 AND any of evidence_summary/question_list produced_at_ref_count = 0`
- why_this_matters: `artifact steering files are required receipts for the next search/deepening decision; without them the agent searches blind`
- impact_scope: `<ARTIFACT_DIR>/wave1_topics/{topic-id}-{topic-slug}; <STATUS_PATH> topic artifact counters; affected topic investigation targets; <QUEUE_PATH>`
- required_receipts: `status:topic_unique_ref_count>=1; status:topic_seed_backfill_status=current_or_deferred_queue_backed`
- done_condition: `evidence summary and question list produced at seed_topics/_artifacts/wave1_topics/{topic-id}-{topic-slug}/evidence-summary.md and seed_topics/_artifacts/wave1_topics/{topic-id}-{topic-slug}/question-list.md; evidence-summary includes Key Evidence, Mechanism, Current Judgment, and Topic Target Coverage sections; Topic Target Coverage records target_ids, coverage_status, backing_refs, queue_consequence, and last_updated_ref_count; question-list satisfies the Wave 1 Exploration Ledger Contract with Topic Investigation Targets (target_id, target_question, origin, status, profile_relevance, evidence_refs, next_action, last_updated_ref_count), Question Reconciliation, Emergent Question Protocol, and Exploration / Exploitation Decision sections; reconciliation runs before any [涌现] questions; Emergent Question Protocol records [涌现] questions or no_new_questions_after_protocol across new_concept / contradiction / missing_information_gap / noise_pattern checks; decision records decision, trigger_refs, unresolved_questions, counterexample_failure_search, queue_consequence, next_action, and last_updated_ref_count; artifacts cite current accepted refs by local path where evidence-backed, not only short ids; ARTIFACT_DIR/README.md updated; status synced with evidence_summary.produced_at_ref_count and question_list.produced_at_ref_count = accepted_topic_ref_count`
- verification: `both artifact files exist, cite local reference paths where evidence-backed, expose target coverage plus the four-section exploration ledger, and STATUS produced_at_ref_count / exploration fields match accepted_topic_ref_count`
- writes_to: `<ARTIFACT_DIR>/wave1_topics/{topic-id}-{topic-slug}/evidence-summary.md; <ARTIFACT_DIR>/wave1_topics/{topic-id}-{topic-slug}/question-list.md; <ARTIFACT_DIR>/README.md; <STATUS_PATH> (topic block evidence_summary/question_list/topic_target_wave1_status/topic_target_wave2_synthesis_status/gap fields)`
- status_sync: `evidence_summary.produced_at_ref_count / question_list.produced_at_ref_count / topic_target_wave1_status / topic_target_wave2_synthesis_status / question_reconciliation_state / emergent_question_protocol_state / emergent_questions_added / no_new_questions_after_protocol / exploration_exploitation_decision / exploration_trigger_refs / exploration_queue_consequence / gap / next_scoring_action`
- prerequisite: `topic.topic_unique_ref_count >= 1; shared-foundation-only references do not trigger initial topic artifacts`
- promotion_trigger: `condition is met immediately when prerequisite is true; do not defer — queue production progressively after first topic-unique ref, not after floor completion`
- completion_receipt: `artifact_steering_current:{topic-id}/{topic-slug}; file:<ARTIFACT_DIR>/wave1_topics/{topic-id}-{topic-slug}/evidence-summary.md; file:<ARTIFACT_DIR>/wave1_topics/{topic-id}-{topic-slug}/question-list.md`
- failure_route: `record artifact missing/thin/stale gap in STATUS; promote initial artifact production into slot_1_current/slot_2_next before any further Wave 1 source-intake, cross-topic handoff, or topic deepening when initial artifacts are missing, or queue refresh when thresholded/gate-audit freshness requires it`
- preempted_from_slot: `not_applicable unless this candidate was displaced by an urgent insertion`
- restore_priority: `normal unless preempted_from_slot is set; preempted tasks use next_tail_opening before ordinary Refill Pool candidates`

### Candidate Block

- work_id: `candidate-artifact-refresh-{topic-id}`
- candidate: `refresh topic evidence summary and question list artifacts (incremental)`
- priority_class: `P4_progressive_artifact_or_seed_backfill`
- producer_rule: `topic_ref_count_changed`
- trigger: `min(evidence_summary.produced_at_ref_count, question_list.produced_at_ref_count) > 0 AND accepted_topic_ref_count - min(evidence_summary.produced_at_ref_count, question_list.produced_at_ref_count) >= 2`
- why_this_matters: `thresholded stale artifact steering hides what the new evidence changed and can send the next search in the wrong direction`
- impact_scope: `<ARTIFACT_DIR>/wave1_topics/{topic-id}-{topic-slug}; <STATUS_PATH> topic artifact counters; Topic Investigation Targets; <QUEUE_PATH>`
- required_receipts: `file:<ARTIFACT_DIR>/wave1_topics/{topic-id}-{topic-slug}/evidence-summary.md; file:<ARTIFACT_DIR>/wave1_topics/{topic-id}-{topic-slug}/question-list.md`
- done_condition: `evidence summary updated to incorporate new refs (those with accepted_topic_ref_count > previous produced_at_ref_count) in Key Evidence / Mechanism / Current Judgment / Topic Target Coverage sections, question list updates Topic Investigation Targets, reconciles against new evidence with state markers before any new [涌现] entries, reruns Emergent Question Protocol with [涌现] or no_new_questions_after_protocol result, refreshes Exploration / Exploitation Decision with trigger_refs and queue_consequence, local reference path citations added for every new key judgment, produced_at_ref_count synced to current accepted_topic_ref_count`
- verification: `produced_at_ref_count equals accepted_topic_ref_count for evidence_summary and question_list; question-list records the four-section exploration ledger and exploration/exploitation consequence`
- writes_to: `<ARTIFACT_DIR>/wave1_topics/{topic-id}-{topic-slug}/evidence-summary.md; <ARTIFACT_DIR>/wave1_topics/{topic-id}-{topic-slug}/question-list.md; <STATUS_PATH> (topic block evidence_summary/question_list/topic_target_wave1_status/topic_target_wave2_synthesis_status/gap fields)`
- status_sync: `evidence_summary.produced_at_ref_count / question_list.produced_at_ref_count / topic_target_wave1_status / topic_target_wave2_synthesis_status / question_reconciliation_state / emergent_question_protocol_state / emergent_questions_added / no_new_questions_after_protocol / exploration_exploitation_decision / exploration_trigger_refs / exploration_queue_consequence / gap / next_scoring_action`
- prerequisite: `topic artifact exists (produced_at_ref_count > 0) AND delta >= 2`
- promotion_trigger: `condition is met when delta reaches 2; do not defer`
- completion_receipt: `artifact_steering_current:{topic-id}/{topic-slug}`
- failure_route: `record thresholded stale artifact gap; queue refresh repair before Wave 1 audit, Wave 2 entry, or topic deepening that depends on the new evidence`
- preempted_from_slot: `not_applicable unless this candidate was displaced by an urgent insertion`
- restore_priority: `normal unless preempted_from_slot is set; preempted tasks use next_tail_opening before ordinary Refill Pool candidates`

### Candidate Block

- work_id: `candidate-hitl2-brief`
- candidate: `prepare Wave 2 human decision brief`
- priority_class: `P1_state_or_gate_repair`
- producer_rule: `hitl2_readiness_path`
- trigger: `Wave 2 synthesis assessment exists, or Wave 2 cannot answer the root must-answer contract and needs a repair/rerun decision before Readiness`
- why_this_matters: `HITL2 is the only normal mid-run user decision point after execution starts; it must be backed by local evidence and synced state before asking`
- impact_scope: `<PROFILE_PATH>; <STATUS_PATH>; <QUEUE_PATH>; <TRACE_PATH>; <ARTIFACT_DIR>/wave2/human-decision-brief.md; Readiness entry`
- required_receipts: `file:<ARTIFACT_DIR>/wave2/cross-topic-synthesis.md or status:answerability_class=blocked_repair_required`
- done_condition: `ARTIFACT_DIR/wave2/human-decision-brief.md exists and PROFILE_PATH HITL2 Wave 2 Readiness Decision, STATUS Human Decision Checkpoints, STATUS Wave 2, and STATUS Wave 2 Human Decision Brief fields are synced. Before asking the user, set PROFILE hitl2_checkpoint_status=pending_user, STATUS hitl2_wave2_readiness_decision_status=pending_user, the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row status=pending_user, human_checkpoint_status=pending_user, QUEUE queue_health=blocked, stop_authorization_state=decision_blocker, unauthorized_stop_next_action=not_applicable, and STATUS Resume Checkpoint.safe_to_interrupt=yes. The brief uses Chinese-first user-facing copy, explains what can be answered / what cannot yet be answered / what repair would add, avoids raw enum labels in user choices, and records canonical answerability/user-decision values internally after the user answers. If ready, it offers final report view/synthesis lens options and records PROFILE hitl2_checkpoint_status, STATUS hitl2_wave2_readiness_decision_status, the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row, final_report_view, custom_final_report_view_label/custom_final_report_view_slug when custom, and final_output_dir from the deterministic mapping before Readiness; if the user selects request_view_revision, it queues concrete view-clarification work and cannot enter Readiness until the revised final_report_view/final_output_dir are recorded and user_decision is replaced with proceed_to_readiness; if blocked, it names concrete missing topics, evidence, synthesis coverage, or profile-parameter work and records repair/rerun or stop-blocked consequence`
- verification: `brief exists; PROFILE/STATUS/QUEUE HITL2 pending_user or recorded fields agree; stop_authorization_state is decision_blocker only after brief and projections exist`
- writes_to: `<PROFILE_PATH>; <ARTIFACT_DIR>/wave2/human-decision-brief.md; <STATUS_PATH>; <QUEUE_PATH>; <TRACE_PATH> when the decision reopens or blocks a gate`
- status_sync: `PROFILE_PATH HITL2 Source of Record hitl2_checkpoint_status plus PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row status; STATUS Human Decision Checkpoints hitl2_wave2_readiness_decision_status; STATUS Human Decision Checkpoints / Wave 2 / Wave 2 Human Decision Brief answerability_class / human_checkpoint_status / final_report_view / custom_final_report_view_label / custom_final_report_view_slug / final_output_dir / repair_recommendation / user_decision / readiness_gate_eligible / Readiness Check.human_checkpoint_check / blocking_issue when waiting for user / stop_authorization_state / unauthorized_stop_next_action / safe_to_interrupt`
- prerequisite: `Wave 2 synthesis work has enough local evidence to classify answerability, or the agent has identified why answerability is blocked`
- promotion_trigger: `after Wave 2 synthesis audit pass; before Readiness; when Wave 2 synthesis fails because Root Must-Answer synthesis coverage, topic topology, local backing refs, or conflict handling is insufficient`
- completion_receipt: `file:<ARTIFACT_DIR>/wave2/human-decision-brief.md; hitl2_pending_or_recorded_ready`
- failure_route: `keep Wave 2/Readiness gate open; queue synthesis, profile/status/queue sync, or human-decision brief repair`
- preempted_from_slot: `not_applicable unless this candidate was displaced by an urgent insertion`
- restore_priority: `normal unless preempted_from_slot is set; preempted tasks use next_tail_opening before ordinary Refill Pool candidates`

## Promotion Rules

- when_current_finishes: `promote slot_2_next into slot_1_current, shift slot_3_pending -> slot_2_next, slot_4_pending -> slot_3_pending, slot_5_tail -> slot_4_pending, then refill slot_5_tail from the highest restore_priority Refill Pool candidate`
- when_queue_becomes_thin: `promote highest-value ready candidate and replenish empty pending slots until all five active slots are executable or a blocker is recorded`
- when_urgent_preempts: `insert urgent work into the earliest valid pending slot, shift lower-priority pending tasks toward slot_5_tail, and move displaced slot_5_tail to the top of Refill Pool with preempted_from_slot=slot_5_tail and restore_priority=next_tail_opening`
- when_blocked: `write blocker and unblock trigger`
- when_to_suspend_branch: `when a branch no longer advances the mainline or cannot be unblocked cheaply`
- gate_pass_continuation: `update status gate fields, append the required distinct TRACE checkpoint with exact gate_transition field value wave0_complete / wave1_complete / wave2_complete / readiness_passed for the boundary being closed, update STATUS.Trace Pointer.last_trace_entry to the newest trace label, set stop_authorization_state=unauthorized_continue_required and safe_to_interrupt=no except final Readiness delivery, set unauthorized_stop_next_action to the next concrete continuation action, refill next wave, and continue without a user-visible recap`
- task_completion_closeout: `do not close or promote a task until declared writes_to and status_sync are done; if they cannot be done, mark the exact gap in STATUS and refill QUEUE with repair work instead of advancing`
- gate_reopen_repair: `restore current_gate to last still-valid prior gate, set current_wave to affected work, record reopened_from_gate / reopen_reason / invalidated_claims, refill same-wave queue work using producer_rule=gate_reopen, and write trace`
- topology_delta_triage: `record candidate first in STATUS_PATH.Topology Delta without changing PLAN_PATH.Topic Registry; sync Topology Drift Review.unresolved_new_topic_candidates to the same unresolved candidate; queue triage with producer_rule=topology_delta; choose exactly one of merge_existing / formalize_new_topic / suspend / archive / redirect for each candidate. If formalize_new_topic, append the next stable topic id at the end of Topic Registry, add PLAN Seed Topic Intake Matrix row and Topic Goals block, create topic seed file physically under TOPIC_ROOT, set topology_sync_state only after plan/status/queue/trace/seed sync, and refill intake clarification, Wave 1 evidence, seed backfill, and artifact work for the new topic. If an affected gate had already passed, reopen the last valid affected gate and refill concrete same-wave repair work before continuing. Never rerun command_playbooks/instantiate-run-bundle.md for a runtime topology delta.`
- reference_landing_closeout: `work produced by producer_rule=reference_landed or producer_rule=source_intake_fan_in cannot close until the reference is an Authoritative Copy rather than a summary-only note; filename preserves provenance (00-shared-* for Wave 0 shared foundation, {topic-id}-* for Wave 1 topic evidence); Core Content Capture preserves reusable hard content such as numbers, dates, methods, mechanisms, constraints, case details, definitions, limitations, counterexamples, disputes, and source-specific context; Webpage Material Diagnostic Gate fields are present; thin/empty or failed webpage material is excluded; high-marketing-risk or strong-commercial-intent webpage claims are independently verified before counting for neutral factual, market-reality, outcome, benchmark, or P0/P1 claims; unqualified webpage content is pruned without removing qualified evidence particles; affected topic seed files are backfilled with local reference paths or a shared-foundation-only reason is recorded; existing 待验证问题 is reconciled and Emergent Question Protocol is run when a topic is affected; produced or refreshed question-list writes the four-section exploration ledger including Exploration / Exploitation Decision, trigger_refs, and queue_consequence; initial artifact production is completed or promoted into slot_1_current/slot_2_next before further Wave 1 evidence work when first topic-unique refs land; thresholded refresh may be queued with producer_rule=topic_ref_count_changed; and STATUS inventory fields are synced`
- topic_deepening_fan_in: `main agent must update topic file with 本轮新增证据, 本轮新增机制理解, 本轮新增趋势与难点, 当前判断（本轮综合后） using local reference paths; then (1) reconcile 待验证问题 against newly landed evidence (remove fully-resolved, mark partially-resolved with local ref path and what was learned, retain genuinely open, mark internal-data-only, note obvious gaps for later — revision only, no new questions during reconciliation); then (2) run Emergent Question Protocol (check new_concept, contradiction, missing_information_gap, noise_pattern including step-1 noted gaps) and add [涌现] questions or no_new_questions_after_protocol; then (3) update question-list.md's Exploration / Exploitation Decision with decision, trigger_refs, unresolved_questions, counterexample_failure_search, queue_consequence, next_action, and last_updated_ref_count. The operations are paired: reconciliation cleans, emergent refills, decision routes. Order must not be reversed.`
- topic_ref_count_artifact_steering: `when a topic receives new accepted refs and status sync is complete, use producer_rule=topic_ref_count_changed to check artifact staleness across evidence_summary and question_list: (a) if either produced_at_ref_count = 0 AND topic_unique_ref_count >= 1, produce initial evidence-summary.md and question-list.md immediately or promote that production into slot_1_current/slot_2_next before any further Wave 1 source-intake, cross-topic handoff, or topic deepening (progressive — do not wait for floor completion; shared-foundation-only refs do not trigger initial topic artifacts; Refill Pool-only production is invalid); (b) if both produced_at_ref_count values are > 0 AND accepted_topic_ref_count - min(evidence_summary.produced_at_ref_count, question_list.produced_at_ref_count) >= 2, queue two-artifact refresh at high priority; (c) otherwise no artifact action needed. This rule ensures artifact production/refresh is triggered by topic-unique reference landing or later material reference deltas, not deferred to wave gate audit.`
- before_marking_wave0_complete: `run Wave 0 Foundation Gate Audit; if shared refs, 00-shared-* reference filenames, source mix, accepted shared inventory required fields, reference body quality, webpage diagnostic and content-retention checks, excluded shared inventory or Unavailable-After-Search Records where applicable, retrieval, unresolved intake gaps, zero confirmed topics, or topic start rows fail, keep Wave 0 open and refill foundation/intake work; if it passes, write a distinct Wave 0 transition trace whose gate_transition field value is wave0_complete and sync STATUS.Trace Pointer.last_trace_entry`
- before_starting_wave1: `require STATUS_PATH.Wave 0 Foundation Gate Audit.overall_result=pass and wave1_entry_allowed=yes; Wave 0 closeout is incomplete until a concrete non-chat Wave 1 continuation action is promoted or started, or a real blocker is recorded`
- before_wave1_audit: `run topology drift review; formalize new independent topic candidates or record archive / suspend / redirect disposition with reopen trigger`
- before_marking_wave1_complete: `run Wave 1 Source Floor Audit across every topic; verify {topic-id}-* reference filenames, accepted inventory counts, seed backfill, Topic Investigation Targets with wave1_topic-style answers and synthesis-pending routes, question reconciliation, substantial local-path-citing artifacts, structured Scarcity / Stop Exception Records, duplicate review, and counterexample/failure search; if any topic is below floor or has unaccounted topic target entries without a justified structured stop exception, keep Wave 1 open and refill reference/backfill/artifact work; if it passes, write a distinct Wave 1 transition trace whose gate_transition field value is wave1_complete and sync STATUS.Trace Pointer.last_trace_entry`
- before_starting_wave2: `require STATUS_PATH.Wave 1 Source Floor Audit.overall_result=pass and wave2_entry_allowed=yes; Wave 1 closeout is incomplete until a concrete non-chat Wave 2 synthesis/action is promoted or started, or a real blocker is recorded`
- before_wave2_audit: `run topology drift review; formalize new independent topic candidates or record archive / suspend / redirect disposition with reopen trigger`
- before_marking_wave2_complete: `run Wave 2 Synthesis Gate Audit; verify ARTIFACT_DIR/wave2/cross-topic-synthesis.md exists as the Wave 2 synthesis artifact, has substantive synthesis body, local reference path citations, conflict/tension reconciliation, all answer_phase=wave2_synthesis must-answer entries covered or explicitly not required, and a populated Cross-Topic Conclusion Matrix whose backing_refs resolve under REFERENCE_DIR and whose must_answer_ids map to covered synthesis entries; for derived_topic_count=1, require not_applicable_single_topic plus at least one locally backed high-leverage synthesis conclusion instead of an empty matrix; if synthesis coverage, judgment tags, local backing refs, matrix rows, or conflict handling fail, keep Wave 2 open and refill synthesis work; if it passes, write a distinct Wave 2 transition trace whose gate_transition field value is wave2_complete and sync STATUS.Trace Pointer.last_trace_entry`
- wave2_audit_hitl2_path: `prepare the Wave 2 human decision brief before Readiness; classify answerability, ask for final report view when ready_substantive, ask for insufficiency-report vs repair choice when ready_insufficient_judgment, record final_output_dir using the deterministic mapping, or record blocked_repair_required with concrete repair/rerun recommendations; request_view_revision is only an intermediate blocked state and must queue concrete view-clarification work; Wave 2 closeout is incomplete until the HITL2 pending-user decision blocker is activated with brief and projections ready, the HITL2 decision is recorded and resumed, or a non-HITL2 concrete blocker is recorded`
- before_readiness_check: `require STATUS_PATH.Wave 2 Synthesis Gate Audit.overall_result=pass, readiness_entry_allowed=yes, PROFILE_PATH.HITL2 Wave 2 Readiness Decision as Source of Record, PROFILE_PATH.HITL2 Wave 2 Readiness Decision.hitl2_checkpoint_status=recorded, STATUS_PATH.Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=recorded, PROFILE_PATH.Human Decision Checkpoints HITL2_wave2_readiness_decision row status=recorded, and matching projections in STATUS Human Decision Checkpoints, STATUS Wave 2, and STATUS Wave 2 Human Decision Brief with human_checkpoint_status=recorded, answerability_class in ready_substantive / ready_insufficient_judgment, user_decision=proceed_to_readiness, final_report_view recorded as profile_default / executive_brief / evidence_map / claim_judgment / technical_deep_dive / custom, custom label and slug present when final_report_view=custom, and final_output_dir mapped as profile_default -> final; executive_brief -> final_executive_brief; evidence_map -> final_evidence_map; claim_judgment -> final_claim_judgment; technical_deep_dive -> final_technical_deep_dive; custom -> final_custom_{custom_final_report_view_slug}; request_view_revision, blocked_repair_required, repair_and_rerun, or stop_blocked cannot enter Readiness`
- during_readiness_check: `run final topology drift review and record route in STATUS_PATH.Topology Drift Review; run 30-second local evidence retrieval after Wave 2 artifact and matrix exist, recording concrete route_paths_checked that resolve inside RUN_DIR`
- before_marking_readiness_passed: `confirm all Readiness items pass, STATUS_PATH.Anti-Stall Budget is within budget with denominator recorded, runtime qualification returned PASS, and Trace Pointer points to the latest checkpoint; then write a distinct Readiness closeout trace whose gate_transition field value is readiness_passed, set STATUS.state=completed, set STATUS.current_gate=readiness_passed, set STATUS.next_gate=none, set Readiness Check.overall_status=pass, set Readiness Check.closeout_phase=closed, and close queue through queue_health=closed with closure_reason=readiness_passed`
- readiness_passed_stop_state: `set stop_authorization_state=final_delivery, unauthorized_stop_next_action=not_applicable, and STATUS Resume Checkpoint.safe_to_interrupt=yes only after readiness_passed closeout is fully written`

## Wave Gate Audit Rule

- wave0_completion_unit: `all Wave 0 Foundation Gate Audit global items, accepted shared inventory rows, excluded shared inventory rows where applicable, and topic rows pass, with allowed unavailable-after-search records only where explicitly permitted`
- wave1_completion_unit: `all topic rows pass Wave 1 Source Floor Audit or carry a justified early_saturation / suspend / archive / redirect exception; complete is valid only when all active floors, topic target coverage, artifact, and backfill checks pass`
- wave2_completion_unit: `all Wave 2 Synthesis Gate Audit global items and topic rows pass, cross-topic-synthesis.md is substantive as the Wave 2 synthesis artifact and cites local reference paths, every answer_phase=wave2_synthesis must-answer entry is covered or explicitly not required, Cross-Topic Conclusion Matrix is populated with must_answer_ids where applicable, every high-leverage judgment is tagged and locally backed, and single-topic runs use not_applicable_single_topic only as a comparison reason while still producing locally backed synthesis rows`
- configured_floor_rule: `use the PROFILE-backed research_profile and configured floors projected into PLAN_PATH.Instance Config; do not substitute hard-coded default floor numbers during execution`
- count_rule: `count accepted topic-relevant references only; shared Wave 0 refs count for a topic only when explicitly accepted for that topic and backfilled into that topic seed; each topic should normally have at least half of its counted Wave 1 floor from topic-unique references or a scarcity exception with confidence effect and queue consequence; webpage-derived references count only after passing the Webpage Material Diagnostic Gate; thin/empty, unverified high-marketing-risk neutral claims, and unpruned reusable webpage bodies cannot count`
- count_authority: `accepted_topic_ref_count, topic_unique_ref_count, accepted reference inventory with local provenance filenames (00-shared-* or {topic-id}-*) and acceptance_status=accepted/source_type/trust_level/source_family/tier=tier_1..tier_4/evidence_role/source_date_scope/supports_claims/topic_unique_status/seed_backfill_status/counted_for_floor=yes/web_substance/commercial_intent/marketing_risk/cross_verification_required/cross_verification_status/content_retention_decision, and the Wave 1 Source Floor Audit row are authoritative for gates; loose readable summaries are not sufficient`
- independence_rule: `review source-family duplication and independence before counting topic references or P0/P1 synthesis judgments`
- breadth_rule: `multi-source reference files do not replace source breadth, source-type floors, or limitation/failure-mode coverage; one reference file normally represents one source`
- artifact_rule: `evidence summaries, question lists, and synthesis artifacts do not count as references; produced artifacts must have substantive body, local reference path citations when evidence-backed, and synchronized produced_at_ref_count before they can support gate readiness`
- failed_audit_action: `update the relevant STATUS_PATH gate audit with failing rows, keep or restore current_gate to the last valid gate, refill same-wave queue work, and continue`
- wave2_complete_action: `start Readiness Check as a separate phase; do not close the run, empty the queue, or ask only for user review until a post-Wave-2 retrieval/handoff test and readiness closeout pass unless a real blocker is recorded`
- premature_gate_correction_trace: `if status had claimed a gate passed or started the next wave before the relevant audit passed, write a TRACE_PATH diagnostic entry explaining the correction`
- gate_reopen_rule: `if later evidence invalidates a passed gate, refill concrete repair work using producer_rule=gate_reopen rather than silently continuing under the passed gate`

## No-Empty-Queue Rule

- no_empty_queue_is_insufficient_by_itself: `No-Empty-Queue keeps work available; Rolling Task Projection keeps native task surfaces aligned; Pre-Response Gate decides whether the agent is allowed to speak`
- if_next_task_known: `If you know the next task, do it. Do not tell the user you know it.`
- recap_rule: `A recap is not progress. A file write, reference capture, artifact update, gate audit, or queue promotion is progress.`
- batch_end_rule: `When a batch ends, run the Pre-Response Gate. If it fails, the next assistant action must be another tool/action batch.`
- stop_authorization_rule: `unauthorized_continue_required is the normal middle-run state; it forbids safe interrupt and requires unauthorized_stop_next_action`
- before_closing_slot_1_current: `refill active queue first`
- must_refill_to: `sequential: slot_1_current / slot_2_next / slot_3_pending / slot_4_pending / slot_5_tail`
- only_allowed_empty_condition: `true mainline blockage that satisfies Autonomous Execution Protocol interrupt conditions or readiness_passed`
- readiness_passed_queue_shape: `keep the heading "## Active Queue"; set queue_health=closed and closure_reason=readiness_passed; set all five active slots to none or not_applicable_after_readiness_passed`
- forbidden_closeout_shape: `do not rename ## Active Queue to a separate closed-queue heading; downstream runtime qualification uses the Active Queue anchor`

## Rolling Task Projection Rule

- projection_authority_rule: `QUEUE_PATH owns native projection state; native todo/task/plan surfaces are projections only`
- projection_when_available: `if a native Todo/Task/Plan surface is available, mirror the active executable window: slot_1_current / slot_2_next / slot_3_pending / slot_4_pending / slot_5_tail`
- projection_when_unavailable: `if no native surface is available, set platform_task_projection=unavailable_queue_only and continue from QUEUE_PATH`
- projection_refill_rule: `before closing slot_1_current, promote/refill the active executable window and sync the native projection if available`
- projection_forbidden_tasks: `do not create native or queue tasks for report progress, recap, ask user to continue, tell user next task, summarize and wait, await user review, or use /goal`
- slash_command_boundary: `/goal and other slash commands may be useful when the user invokes them manually, but they are not framework-controlled queue actions`

## Topic Seed Backfill Rule

- reference_completion_unit: `reference file with reusable hard content + _INDEX entry + affected topic seed update + question reconciliation / emergent question check when a topic is affected + STATUS sync`
- webpage_diagnostic_completion: `webpage-derived reference completion requires substance check, commercial/marketing risk check, cross-verification status, and content_retention_decision; thin/empty material is excluded; high-marketing-risk or strong-commercial-intent material cannot count for neutral factual, market-reality, outcome, benchmark, or P0/P1 claims without verification; unqualified content is pruned or kept only as a minimal excluded stub`
- topic_seed_update_target: `append into 本轮新增证据 / 本轮新增机制理解 / 本轮新增趋势与难点 / 当前判断（本轮综合后）; reconcile 待验证问题 against new evidence (revision of existing list, not append); then run Emergent Question Protocol to add [涌现] questions (generation of new list entries)`
- citation_rule: `every new key judgment added to a topic seed must cite local reference paths`
- shared_foundation_exception: `if a Wave 0 reference is genuinely shared foundation and not yet assignable to any topic seed, record shared-foundation-only reason in STATUS and create a follow-up candidate when the affected topic becomes clear`
- artifact_rule: `artifact creation does not replace topic seed backfill; artifacts cite references after seed growth is updated or explicitly deferred with a queue candidate; topic artifacts use seed_topics/_artifacts/wave1_topics/{topic-id}-{topic-slug}/evidence-summary.md and question-list.md`

## Anti-Stall Budget Rule

- budget: `maximum 3 open degraded limitations affecting P0/P1 judgments, and maximum 20% of active topic must-answer claims relying on degraded evidence; record the must-answer claim denominator before using the percentage`
- if_exceeded: `stop normal advancement, refill queue work for evidence repair or record blocker`
- status_sync: `update STATUS_PATH.Anti-Stall Budget`
- before_readiness_passed: `confirm STATUS_PATH.Anti-Stall Budget is present, denominator is recorded, and any degraded P0/P1 claims have confidence effect plus queue or handoff consequence`

## Post-Readiness Maintenance Rule

- post_readiness_allowed_scope: `bounded URL or metadata repair for already accepted local references only`
- post_readiness_forbidden_scope: `new source discovery, new claims, new research objects, hidden completion stage, or gate repair without reopening the relevant earlier wave`
- if_substantive_gap_found: `restore current_gate to the last valid affected gate, refill Wave 1 or Wave 2 queue work, and write TRACE_PATH diagnostic entry`

<!-- END QUEUE OUTPUT -->
