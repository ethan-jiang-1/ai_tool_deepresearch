---
title: "Output Skeleton - PLAN"
role: "copyable output skeleton"
scope: "template source for PLAN_PATH only"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/RESEARCH_PROFILES.md"
  - "specs/METHODOLOGY.md"
writes:
  - "<PLAN_PATH>"
---

# Output Skeleton - PLAN

Copy only the content between `BEGIN PLAN OUTPUT` and `END PLAN OUTPUT` into `PLAN_PATH`.

Replace every instantiation placeholder before delivery. Runtime metavariables may remain only inside explicit schema/template/pattern guidance. Do not copy this file's frontmatter.

<!-- BEGIN PLAN OUTPUT -->
# <PLAN_NAME>

> profile: `<PROFILE_PATH>`
> status: `<STATUS_PATH>`
> queue: `<QUEUE_PATH>`
> trace: `<TRACE_PATH>`
> This file is the design-time execution blueprint. Runtime authority is split across the five root control files: PROFILE records user intent, profile choice, root must-answer set, optional search preferences, and HITL decisions; PLAN projects the execution design; STATUS records current run state and audits; QUEUE records executable actions; TRACE records diagnostics.

## File Role Snapshot

- role: `design-time blueprint`
- not_authority_for: `run-specific profile decisions, live progress, active queue, diagnostic history, evidence body`
- routine_navigation: `use <PROFILE_PATH> for user intent/profile decisions, <STATUS_PATH> for run state, <QUEUE_PATH> for active actions, <TRACE_PATH> for diagnostic turns, and Runtime Command Entrypoint below for local framework commands`
- static_note: `this snapshot must not be used as live execution state`

## Pre-Work Framework Boundary

- framework_snapshot: `<RUN_DIR>/_framework`
- framework_readonly_rule: `pre-work framework snapshot is read-only after instantiation; read it for policy, commands, and read-only diagnostics only; do not edit, regenerate, normalize, or write run state inside _framework`
- framework_repair_rule: `missing same-version snapshot paths may be repaired only through <RUN_DIR>/_framework/command_playbooks/repair-framework-snapshot.md; never hand-edit _framework and never copy _framework/output_templates over root control files`

## Instance Config

| field | value |
| --- | --- |
| `plan_name` | `<PLAN_NAME>` |
| `template_version` | `<TEMPLATE_VERSION>` |
| `round_label` | `<ROUND_LABEL>` |
| `profile_path` | `<PROFILE_PATH>` |
| `plan_path` | `<PLAN_PATH>` |
| `status_path` | `<STATUS_PATH>` |
| `queue_path` | `<QUEUE_PATH>` |
| `trace_path` | `<TRACE_PATH>` |
| `run_dir` | `<RUN_DIR>` |
| `framework_dir` | `<RUN_DIR>/_framework` |
| `framework_command_index` | `<RUN_DIR>/_framework/COMMANDS.md` |
| `framework_cli_check` | `<RUN_DIR>/_framework/cli_tools/check_framework.mjs` |
| `runtime_profile` | `<PROFILE_PATH>` |
| `runtime_plan` | `<PLAN_PATH>` |
| `runtime_status` | `<STATUS_PATH>` |
| `runtime_queue` | `<QUEUE_PATH>` |
| `runtime_trace` | `<TRACE_PATH>` |
| `original_topic_dir` | `<ORIGINAL_TOPIC_DIR>` |
| `topic_root` | `<RUN_DIR>/seed_topics` |
| `reference_dir` | `<RUN_DIR>/seed_topics/_reference` |
| `artifact_dir` | `<RUN_DIR>/seed_topics/_artifacts` |
| `final_dir_rule` | `profile_default -> final; executive_brief -> final_executive_brief; evidence_map -> final_evidence_map; claim_judgment -> final_claim_judgment; technical_deep_dive -> final_technical_deep_dive; custom -> final_custom_{custom_final_report_view_slug}` |
| `final_deliverable` | `<FINAL_DELIVERABLE>` |
| `audience` | `<AUDIENCE>` |
| `round_focus` | `<ROUND_FOCUS>` |
| `research_profile` | `<quick_factual / exploratory_map / claim_verification>` |
| `research_profile_user_choice` | `<explicit_user_choice / explicit_user_choice_after_clarification / explicit_override>` |
| `derived_topic_count` | `= count(topic registry entries)` |
| `wave0_shared_doc_floor` | `<WAVE0_SHARED_DOC_FLOOR>` |
| `topic_complexity_factor` | `<0-6; based on distinct domains/regulations/technologies/geographies/stakeholders>` |
| `cross_topic_dependency_factor` | `<0-6; based on shared mechanisms/sources/risks/comparison objects>` |
| `wave1_doc_floor_per_topic` | `<WAVE1_DOC_FLOOR_PER_TOPIC>` |
| `primary_source_floor` | `<PRIMARY_SOURCE_FLOOR>` |
| `secondary_source_floor` | `<SECONDARY_SOURCE_FLOOR>` |
| `recent_source_floor` | `<RECENT_SOURCE_FLOOR>` |
| `limitation_source_floor` | `<LIMITATION_SOURCE_FLOOR>` |
| `critical_claim_checks` | `<CRITICAL_CLAIM_CHECKS>` |
| `must_answer_policy` | `<profile-derived intensity; answer_phase values wave1_topic / wave2_synthesis>` |

## Research Profile Projection

`<PROFILE_PATH>` is the Source of Record only for user-intent facts: selected profile, root must-answer set, optional HITL1 search preferences, configured profile parameters, manual overrides, and HITL1/HITL2 human decisions. This plan keeps the execution-readable projection needed for gate targets, source intake, and topic design; it does not make PROFILE the authority for live state, active work, diagnostics, or evidence bodies.

- run_profile_record: `<PROFILE_PATH>`
- canonical_profile_authority: `<RUN_DIR>/_framework/specs/RESEARCH_PROFILES.md`
- `research_profile`: `<quick_factual / exploratory_map / claim_verification>`
- `configured_floors`: `wave0=<WAVE0_SHARED_DOC_FLOOR>; wave1_per_topic=<WAVE1_DOC_FLOOR_PER_TOPIC>; primary=<PRIMARY_SOURCE_FLOOR>; secondary=<SECONDARY_SOURCE_FLOOR>; recent=<RECENT_SOURCE_FLOOR>; limitation=<LIMITATION_SOURCE_FLOOR>`
- `root_must_answer_projection`: `<FMA ids from PROFILE_PATH -> Root Must-Answer Set, or gap_queue_backed>`
- `search_preference_projection`: `<PROFILE Search Preference Intake summary, or not_specified_use_profile_defaults>`
- `hitl2_checkpoint_projection`: `<not_started / pending_user / recorded / blocked>`
- hitl2_source_of_record_rule: `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision is the Source of Record; STATUS Human Decision Checkpoints, STATUS Wave 2, and STATUS Wave 2 Human Decision Brief must match it before Readiness; Readiness also requires PROFILE hitl2_checkpoint_status=recorded, STATUS Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=recorded, and the PROFILE Human Decision Checkpoints HITL2_wave2_readiness_decision row status=recorded`
- final_output_dir_mapping: `profile_default -> <RUN_DIR>/final; executive_brief -> <RUN_DIR>/final_executive_brief; evidence_map -> <RUN_DIR>/final_evidence_map; claim_judgment -> <RUN_DIR>/final_claim_judgment; technical_deep_dive -> <RUN_DIR>/final_technical_deep_dive; custom -> <RUN_DIR>/final_custom_{custom_final_report_view_slug}`
- sync_rule: `if this projection diverges from PROFILE_PATH, repair PROFILE/PLAN/STATUS sync before execution continues; request_view_revision is an intermediate blocked state that must queue concrete final report view clarification and cannot enter Readiness`

## Run Bundle Boundary

- run_dir: `<RUN_DIR>`
- framework_dir: `<RUN_DIR>/_framework`
- framework_rule: `read-only by contract and immutable after instantiation; contains specs, flows, output_templates, command_playbooks, cli_tools, README, COMMANDS, and VERSION-LOG; does not contain run-specific state and must not be edited during run work`
- cli_tools_rule: `_framework/cli_tools may run read-only checks and output diagnostics; it must not write gate state, evidence, artifacts, topics, or final output`
- snapshot_outputs_rule: `<RUN_DIR>/_framework/output_templates/*.md are placeholder skeletons only; they may contain placeholders and are not runtime control files`
- instantiated_control_files_rule: `<PROFILE_PATH>, <PLAN_PATH>, <STATUS_PATH>, <QUEUE_PATH>, and <TRACE_PATH> are instantiated root control files; instantiation placeholders must be resolved there before qualification; runtime metavariables may remain only in schema/template/pattern guidance`
- original_topic_dir: `<ORIGINAL_TOPIC_DIR>`
- original_topic_rule: `optional upstream large-topic material and decomposition drafts only; not a formal seed topic root and not counted in Wave 1`
- cache_dir_rule: `<RUN_DIR>/_cache is optional source intake staging; it is not evidence, does not count toward source floors, and main-agent fan-in must promote useful material to <RUN_DIR>/seed_topics/_reference before counting`
- source_intake_flow: `<RUN_DIR>/_framework/flows/source-intake-flow.md owns provider profiles and the stable intake request / normalized candidate-card / promotion interface; default provider remains native_search unless QUEUE work explicitly selects or justifies Exa-specific capability`
- source_preference_rule: `source-intake requests must read PROFILE_PATH -> Search Preference Intake; concrete preferences guide source_preferences, method_constraints, date windows, geography/jurisdiction, language, must-include sources, and exclusion_rules; not_specified_use_profile_defaults means use selected research profile, topic evidence anchors, and normal trust/tier/evidence-quality rules`
- source_intake_runner_rule: `runner_mode is inline_main_agent / foreground_subagent_runner; delegated runners are foreground queue-visible work, not detached background work; retrieval/search/fetch runners write only exact run-local _cache intake/captures/excluded paths; main agent must fan-in before promotion, evidence counting, gate passage, or final citation`
- cache_shape: `<RUN_DIR>/_cache/intake/{batch-id}/intake-request.md; <RUN_DIR>/_cache/intake/{batch-id}/retrieval-results.md; <RUN_DIR>/_cache/intake/{batch-id}/candidate-cards.md; <RUN_DIR>/_cache/intake/{batch-id}/capture-manifest.md; <RUN_DIR>/_cache/excluded/{batch-id}-excluded.md; <RUN_DIR>/_cache/promote-log.md (main-agent fan-in/promotion only); optional concrete captures under <RUN_DIR>/_cache/captures/ are listed by capture-manifest.md`
- seed_topics_rule: `<RUN_DIR>/seed_topics is the only formal topic execution root`
- reference_dir_rule: `<RUN_DIR>/seed_topics/_reference`
- artifact_dir_rule: `<RUN_DIR>/seed_topics/_artifacts`
- final_dir_rule: `write final interpretation output according to the HITL2 final_output_dir mapping: profile_default -> <RUN_DIR>/final; executive_brief -> <RUN_DIR>/final_executive_brief; evidence_map -> <RUN_DIR>/final_evidence_map; claim_judgment -> <RUN_DIR>/final_claim_judgment; technical_deep_dive -> <RUN_DIR>/final_technical_deep_dive; custom -> <RUN_DIR>/final_custom_{custom_final_report_view_slug}; final outputs do not authorize gates or count as references`

## Runtime Command Entrypoint

This section is the minimal command recovery surface. If chat context forgets the framework, use this section first.

- command_authority: `<RUN_DIR>/_framework/COMMANDS.md`
- command_authority_rule: `open the local command index first, then the local command playbook it routes to`
- cli_helper: `<RUN_DIR>/_framework/cli_tools/check_framework.mjs`
- cli_helper_rule: `read-only diagnostics only; helper output never writes gate evidence or authorizes gate passage by itself`
- runtime_profile: `<PROFILE_PATH>`
- runtime_plan: `<PLAN_PATH>`
- runtime_status: `<STATUS_PATH>`
- runtime_queue: `<QUEUE_PATH>`
- runtime_trace: `<TRACE_PATH>`
- runtime_binding_rule: `all post-instantiation commands operate on the instantiated root control files above, not on <RUN_DIR>/_framework/output_templates/*.md`
- source_template_rule: `do not use the source template package for active execution after qualification; use this run-local framework snapshot`

### Snapshot vs Instantiated Control Files

- `_framework/output_templates/PROFILE.md`, `_framework/output_templates/PLAN.md`, `_framework/output_templates/STATUS.md`, `_framework/output_templates/QUEUE.md`, and `_framework/output_templates/TRACE.md` are output skeletons and may contain placeholders.
- The instantiated files are `<PROFILE_PATH>`, `<PLAN_PATH>`, `<STATUS_PATH>`, `<QUEUE_PATH>`, and `<TRACE_PATH>` directly under `RUN_DIR`.
- Runtime commands must read and write only the instantiated root control files and mutable run directories allowed by their playbook.
- Never overwrite instantiated root control files from `_framework/output_templates/*.md` after qualification.

## Execution Dependency Contract

Runtime execution follows one dependency chain:

```text
PROFILE intent, root must-answer, and configured profile parameters
-> PLAN targets and configured gates
-> STATUS gaps and audit rows
-> QUEUE executable tasks
-> local file writes plus STATUS/QUEUE sync
-> TRACE checkpoint when a gate or diagnostic turn changes state
```

`PROFILE_PATH` does not run the research. It records user intent, profile choices, root must-answer set, optional search preferences, configured profile parameters, and HITL1/HITL2 human decisions. `PLAN_PATH` defines topic identity, gate targets, PROFILE-backed configured-floor projections, source-intake preference projection, and local authority pointers. `STATUS_PATH` records current state, gaps, audit rows, counters, exceptions, and trace pointers. `QUEUE_PATH` is the only active execution action ledger, but it must not invent work without a source.

Every active queue task must satisfy `<RUN_DIR>/_framework/specs/QUEUE_CONTRACT.md -> Queue Work Unit Contract`: `work_id`, `action`, `producer_rule`, one lineage field (`source_gap / status_gap / gate_gap / plan_target / trigger`), `why_this_matters`, `impact_scope`, `required_receipts`, `done_condition`, `verification`, `writes_to`, `status_sync`, `completion_receipt`, and `failure_route`. A queue task that says only "continue research", "summarize", "advance wave", or "update status" is not executable enough for Deep Research.

Queue completion is valid only when the declared local writes, status sync, verification, and completion receipt happened. If the task discovers that a needed artifact, backfill, reference body, topic target update, question-list update, Wave 2 synthesis row, or trace checkpoint is missing, the correct action is queue refill or gate correction, not wave advancement.

## Reference Schema Authority

Accepted references are Authoritative Copies under `<REFERENCE_DIR>`. Counted reference field names are defined in `<RUN_DIR>/_framework/specs/CONSTANTS.md -> Local Reference File Fields`; reference quality, webpage diagnostics, accepted/excluded semantics, and content-retention rules are defined in `<RUN_DIR>/_framework/specs/METHODOLOGY.md`.

- reference_schema_authority: `<RUN_DIR>/_framework/specs/CONSTANTS.md`
- reference_quality_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md`
- counted_reference_rule: `counted references must be promoted local reference files, never _cache, artifacts, chat notes, or multi-source summaries`
- reference_filename_rule: `counted Wave 0/shared references use 00-shared-* filenames; counted Wave 1 topic references use {topic-id}-* filenames; opaque ref-NNN-* names are not the counted-reference convention for this template`
- webpage_diagnostic_rule: `webpage-derived references must expose substance, commercial intent, marketing risk, verification status, and content-retention decision before counting`
- local_copy_rule: `accepted references must retain reusable hard content in local files without relying on chat memory or routine URL revisits`

## Purpose And Audience

This round exists to provide reliable raw material for `<FINAL_DELIVERABLE>`.

The target reader is `<AUDIENCE>`.

The round focus is `<ROUND_FOCUS>`.

- evidence_quality_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md`
- wave0_floor_authority: `PROFILE_PATH configured profile parameters, projected into PLAN_PATH Instance Config for execution readability`
- research_profile_authority: `<RUN_DIR>/_framework/specs/RESEARCH_PROFILES.md`

## Research Flow Mental Model

This run turns the larger research need behind `<FINAL_DELIVERABLE>` into seed topics, digests evidence topic by topic, then recombines the findings into Wave 2 synthesis through the selected `research_profile`. Multi-topic runs compare topics when the profile requires comparison; single-topic runs still produce locally backed synthesis rows instead of skipping Wave 2.

The operating model is:

```text
large topic or final deliverable need
-> seed topics
-> Wave 0 shared foundation
-> Wave 1 topic-by-topic evidence digestion
-> question reconciliation and emergent questions
-> Wave 2 synthesis
-> Readiness
```

Seed topics are decomposition handles, not random prompts. Each seed topic should isolate one decision-relevant angle, carry one or more concrete seed `must_answer` entries, define its boundary, name likely evidence routes, and explain why the angle matters now. When a seed topic is derived from `original_topic/`, its boundary and evidence routes must preserve the original context constraints and search guardrails needed to prevent generic external search.

This matters because broad research without seed topics tends to collect disconnected notes. Seed topics make first searches specific, let evidence accumulate into reusable local references, and create comparable units for Wave 2. By synthesis time, `quick_factual` runs should support a factual conclusion, `exploratory_map` runs should expose coverage and unknowns, and `claim_verification` runs should judge support, weakening evidence, counterexamples, confidence, and limits.

## Core Gaps

List at least `max(5, derived_topic_count)` concrete gaps. Each gap must state what is missing and why it affects `<FINAL_DELIVERABLE>`.

- Gap 1:
- Gap 2:
- Gap 3:
- Gap 4:
- Gap 5:

## Control Map

- plan is design-time only
- status is run-time state
- queue is the execution action authority
- trace is append-only diagnostic history
- active queue tasks must be derived from PLAN targets, STATUS gaps, gate gaps, source gaps, or explicit triggers and must satisfy the Queue Work Unit Contract in `specs/QUEUE_CONTRACT.md`
- user-visible stopping is controlled by `QUEUE_PATH -> Active Queue.stop_authorization_state` and mirrored in `STATUS_PATH -> Operator View`; the normal middle-run value is `unauthorized_continue_required`
- references are evidence
- artifacts are derived synthesis
- topic `question-list.md` carries the full Wave 1 exploration ledger: Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, and Exploration / Exploitation Decision; it is not a copy of the seed field
- topic `question-list.md` is the exploration ledger, not optional notes
- `setup_ready` is a non-research transition gate, not a separate wave; it only confirms the execution workspace, navigation stubs, directories, status/queue sync, seed growth sections, and seed intake assessed as `yes` or `gap_queue_backed`. `seed_topic_intake_ready=yes` requires `derived_topic_count > 0` and all confirmed topics intake-ready; `derived_topic_count=0` must use `gap_queue_backed` with concrete decomposition/intake queue work.
- default gate path is `instantiation_complete -> setup_ready -> wave0_complete -> wave1_complete -> wave2_complete -> readiness_passed`
- Wave 0, Wave 1, Wave 2, and Readiness transitions must append distinct TRACE checkpoints with exact single `gate_transition` field values (`wave0_complete`, `wave1_complete`, `wave2_complete`, `readiness_passed`) and update `STATUS_PATH -> Trace Pointer.last_trace_entry`; correction entries do not satisfy missing transition coverage
- Wave 0, Wave 1, and Wave 2 passage are not user-visible stop points; after each passage, keep `stop_authorization_state=unauthorized_continue_required`, keep `safe_to_interrupt=no`, set `unauthorized_stop_next_action` to the next concrete continuation action, and start that non-chat action unless a concrete decision blocker is recorded
- Readiness is final; if readiness fails, refill Wave 2 or earlier work.

## Topic Registry

Confirmed topic count, numbering, and slug authority live here. Other files may cite topic ids and slugs, but must not maintain a second topic registry.

Only confirmed seed topics belong in this registry. Pending candidates, broad undecomposed objects, weak topic ideas, or user-still-thinking branches stay outside this table in `Topology Baseline.pending_topic_candidates`, `STATUS_PATH -> Topology Delta`, queue-backed decomposition or intake clarification work, or optional `original_topic/` material. Pending candidates do not affect `derived_topic_count` and do not create Wave 1 or Wave 2 audit rows until confirmed or formalized.

Runtime topology changes are append-only. If evidence digging formalizes a new topic, append the next stable topic id at the end of this registry, then sync the Seed Topic Intake Matrix, Topic Goals, STATUS Topology Delta, QUEUE, TRACE, and the new topic seed file under `TOPIC_ROOT`. Never insert before existing rows, reorder rows, or renumber existing topics.

`TOPIC_ROOT` is fixed to `<RUN_DIR>/seed_topics`. `topics/` is not a V12 active topic root.

| id | slug | title | seed_files | current_hypothesis | why_it_matters | must_answer |
| --- | --- | --- | --- | --- | --- | --- |
| `{id}` | `{slug}` | `<title>` | `<seed files>` | `<hypothesis/gap>` | `<why>` | `<question 1; question 2; ...>` |

The `must_answer` field is the seed hard-question set, not a single-question limit and not the final runtime ledger. Every confirmed topic must have at least one seed must-answer entry; multi-question topics should list stable numbered or semicolon-separated entries. During Wave 1, maintain Topic Investigation Targets inside `ARTIFACT_DIR/wave1_topics/{topic-id}-{topic-slug}/question-list.md` and Topic Target Coverage inside `ARTIFACT_DIR/wave1_topics/{topic-id}-{topic-slug}/evidence-summary.md`. Target rows use `target_id`, `target_question`, `origin`, `status`, `profile_relevance`, `evidence_refs`, `next_action`, and `last_updated_ref_count`; coverage rows use `target_ids`, `coverage_status`, `backing_refs`, `queue_consequence`, and `last_updated_ref_count`. The same `question-list.md` must also carry the four-section Wave 1 Exploration Ledger Contract: Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, and Exploration / Exploitation Decision.

If there are no confirmed seed topics yet, keep only the table header, set `derived_topic_count=0`, record pending decomposition or clarification in `Topology Baseline` / `STATUS_PATH -> Topology Delta`, and make `QUEUE_PATH` point to concrete seed-topic decomposition or intake work.

## Seed Topic Intake Matrix

This matrix is the intake-readiness surface. It does not replace `Topic Registry` as the id, slug, numbering, and seed-file Source of Record.

Duplicate one row per confirmed topic in `Topic Registry`. Missing upper-section substance for a confirmed topic must stay visible here as `intake_status=assumption` or `intake_status=gap` with a concrete `topic_intake_gap` and queue-backed clarification work. Pending candidates do not appear in this matrix until they become confirmed registry topics. For topics derived from `original_topic/`, the `boundary` and `evidence_anchors` cells must include original context constraints: source anchor, in-scope limits, out-of-scope limits, search guardrails, and evidence route. The matching seed file must also expose the same marker labels; PLAN-only or seed-only context markers are not search-ready. Do not add extra matrix columns for this; make the existing fields concrete enough to stop generic search.

| topic | must_answer | why_now | boundary | evidence_anchors | why_it_matters | intake_status | intake_gap | queue_consequence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `{id}/{slug}` | `<question 1; question 2; ...>` | `<time window or trigger>` | `<scope, out-of-scope, and original context constraints>` | `<preferred source families / evidence routes / search guardrails>` | `<final-deliverable or audience relevance>` | `<ready / assumption / gap>` | `<none or missing upper-section field>` | `<none or concrete queue candidate>` |

## Input Directory Navigation

- run_dir: `<RUN_DIR>`
- framework_dir: `<RUN_DIR>/_framework`
- framework_command_index: `<RUN_DIR>/_framework/COMMANDS.md`
- framework_cli_check: `<RUN_DIR>/_framework/cli_tools/check_framework.mjs`
- original_topic_dir: `<ORIGINAL_TOPIC_DIR>`
- topic_root: `<RUN_DIR>/seed_topics`
- topic index or navigation entry point:
- relationship to `topic registry`:
- reference_dir_rule: `REFERENCE_DIR must be <RUN_DIR>/seed_topics/_reference`
- artifact_dir_rule: `ARTIFACT_DIR must be <RUN_DIR>/seed_topics/_artifacts`
- refresh rule: `update this only after plan registry and status topology sync`

## Topology Baseline

- carry_forward_topics:
- new_topics:
- recent_change:
- pending_topic_candidates:
- runtime_delta_rule: `discovered candidates start in STATUS Topology Delta; only formalize_new_topic appends Topic Registry; merge_existing / suspend / archive / redirect do not change topic count`

Current effective topic count is derived from `Topic Registry`; do not maintain a second count.

## Output Contract

- important sources land in `<REFERENCE_DIR>` as reusable Authoritative Copies
- runtime commands are recovered through `Runtime Command Entrypoint`, local `_framework/COMMANDS.md`, and the five instantiated root control files
- seed files grow with evidence-backed sections
- artifacts land in `<ARTIFACT_DIR>` and cite local references
- `seed_topics/_reference/_INDEX.md` supports 30-second local evidence retrieval and stays navigation-only
- reference completion means `reference file + _INDEX entry + affected topic seed backfill + STATUS sync`; artifacts do not replace seed growth
- final interpretation output lands in the HITL2-recorded `final_output_dir` using the deterministic mapping `profile_default -> <RUN_DIR>/final`, `executive_brief -> <RUN_DIR>/final_executive_brief`, `evidence_map -> <RUN_DIR>/final_evidence_map`, `claim_judgment -> <RUN_DIR>/final_claim_judgment`, `technical_deep_dive -> <RUN_DIR>/final_technical_deep_dive`, and `custom -> <RUN_DIR>/final_custom_{custom_final_report_view_slug}`; it cites local references/artifacts and is not gate evidence
- final delivery is the first normal post-execution user-visible stop after HITL2 and Readiness closeout; the only earlier planned user stop is the explicit HITL2 `pending_user` decision state after the Wave 2 human-decision brief and PROFILE/STATUS/QUEUE projections are written. Middle-wave recaps, "continue?", "continue or adjust direction?", and "await user review" are not valid output contract states while queue work exists

### Local Execution Authorities

- seed_lifecycle_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md -> Seed Topic Origin And Lifecycle`
- seed_intake_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md -> Seed Topic Intake Standard`
- seed_growth_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md -> Topic Seed Backfill`
- reference_authority: `<RUN_DIR>/_framework/specs/CONSTANTS.md -> Local Reference File Fields and <RUN_DIR>/_framework/specs/METHODOLOGY.md -> Reference Quality`
- artifact_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md -> Artifacts`
- topic_target_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md -> Seed Topic Intake Standard / Artifacts / Question List As Exploration Ledger`
- question_list_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md -> Question List As Exploration Ledger`
- queue_lineage_authority: `<RUN_DIR>/_framework/specs/QUEUE_CONTRACT.md -> Queue Work Unit Contract and <RUN_DIR>/_framework/flows/queue-agentic-flow.md -> Queue Agentic Flow`
- trace_checkpoint_authority: `<RUN_DIR>/_framework/specs/CHARTER.md -> Trace Checkpoint and <RUN_DIR>/_framework/output_templates/TRACE.md -> Write Rules`
- webpage_diagnostic_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md -> Webpage Material Diagnostic Gate`

## Wave Design

Gate definitions live in `<RUN_DIR>/_framework/specs/gates/`; this run records only the configured targets and local audit surfaces. Start boundary gates are hook-enforced receipt specs, not `current_gate` enum values.

| gate | authority | configured target in this run | audit surface |
| --- | --- | --- | --- |
| `instantiation_complete` | `specs/gates/instantiation-complete.md` | root control files and run bundle rendered | `check-instantiation` |
| `setup_ready` | `specs/gates/setup-ready.md` | execution workspace, navigation stubs, seed growth sections, intake assessed as ready only when `derived_topic_count > 0`, or `gap_queue_backed` with concrete decomposition/intake queue work when zero-topic or gap-backed, and status/queue sync ready | `STATUS_PATH -> Setup Ready Transition` |
| `wave0_complete` | `specs/gates/wave0-complete.md` | `wave0_shared_doc_floor=<WAVE0_SHARED_DOC_FLOOR>` plus configured high-trust/risk/comparison/retrieval checks and ready topic start rows | `STATUS_PATH -> Wave 0 Foundation Gate Audit` |
| `wave1_complete` | `specs/gates/wave1-complete.md` | per-topic floor `<WAVE1_DOC_FLOOR_PER_TOPIC>`; primary `<PRIMARY_SOURCE_FLOOR>`; secondary `<SECONDARY_SOURCE_FLOOR>`; recent `<RECENT_SOURCE_FLOOR>`; limitation `<LIMITATION_SOURCE_FLOOR>`; `answer_phase=wave1_topic` must-answer entries resolved, classified, downgraded, or queue-backed; `answer_phase=wave2_synthesis` entries preserved with synthesis route | `STATUS_PATH -> Wave 1 Source Floor Audit` |
| `wave2_complete` | `specs/gates/wave2-complete.md` | every active topic represented in profile-specific synthesis with local backing refs; all `answer_phase=wave2_synthesis` must-answer entries covered by synthesis rows; single-topic runs use `not_applicable_single_topic` only for comparison, not for skipping synthesis | `STATUS_PATH -> Wave 2 Synthesis Gate Audit` |
| `readiness_passed` | `specs/gates/readiness-passed.md` | Readiness items pass, HITL2 human decision is recorded with no repair-required blocker, runtime qualification passes, `STATUS.state=completed`, `STATUS.next_gate=none`, `Readiness Check.closeout_phase=closed`, and queue closes with `closure_reason=readiness_passed` | `STATUS_PATH -> Readiness Check` |

Start boundary gate specs:

| start boundary | authority | enforcing hook / receipt |
| --- | --- | --- |
| `wave0_start` | `specs/gates/wave0-start.md` | `hook_setup_to_wave0_start`; `QUEUE_CONTRACT -> setup_ready -> Wave 0 start` |
| `wave1_start` | `specs/gates/wave1-start.md` | `hook_wave0_closeout_to_wave1_start`; `QUEUE_CONTRACT -> Wave 0 closeout -> Wave 1 start` |
| `wave2_start` | `specs/gates/wave2-start.md` | `hook_wave1_closeout_to_wave2_start`; `QUEUE_CONTRACT -> Wave 1 closeout -> Wave 2 start` |

Gate rule summary:

- later waves cannot begin until the prior audit passes and the matching entry flag is `yes`
- counted evidence must be accepted promoted local references, not `_cache`, artifacts, chat memory, or final output
- if a passed gate is invalidated by later evidence or topology change, reopen the last affected gate and refill same-wave repair work

## Topic Goals

Duplicate one block per confirmed topic in `Topic Registry`. Pending candidates do not get Topic Goals blocks until confirmed. Each field must contain concrete prose, not only a keyword.

### Topic `{id}`: `{slug}`

- registry_ref:
- intake_status:
- intake_gap:
- must_answer_set:
- wave1_deepen_focus:
- evidence_priority:
- difficulty_focus:
- trend_question:
- stop_assessment_focus:
- source_dedup_note:
- original_context_constraints:
- runtime_topology_note:

## Topic Stop And Critical Claim Policy

- topic_stop_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md -> Stop Conditions`
- critical_claim_policy: `<CRITICAL_CLAIM_CHECKS>`
- research_profile_policy: `<quick_factual / exploratory_map / claim_verification>`
- critical_claim_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md -> Critical Claim Checks`
- anti_stall_authority: `<RUN_DIR>/_framework/specs/METHODOLOGY.md -> Anti-Stall Degradation`

## Success State

- reusable references exist
- each topic has a reusable evidence package, not only temporary search notes
- each topic has evidence-backed mechanism/trend/difficulty
- important claims trace to references
- trend, difficulty, dispute, and failure modes have dedicated evidence where relevant
- suspended branches are explicit
- next agent can continue from seed/reference/artifact/status/queue/trace
<!-- END PLAN OUTPUT -->
