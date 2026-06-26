---
title: "Instantiation Flow"
role: "instantiation protocol"
scope: "cold-start inputs, topic inference, root control-file creation, instantiation checks"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/METHODOLOGY.md"
  - "output_templates/PROFILE.md"
  - "output_templates/PLAN.md"
  - "output_templates/STATUS.md"
  - "output_templates/QUEUE.md"
  - "output_templates/TRACE.md"
  - "output_templates/RUN_ROOT_AGENTS.md"
  - "output_templates/RUN_ROOT_CLAUDE.md"
writes:
  - "<PROFILE_PATH>"
  - "<PLAN_PATH>"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
  - "<RUN_DIR>/AGENTS.md"
  - "<RUN_DIR>/CLAUDE.md"
---

# Instantiation Flow

Instantiation Mode creates one run bundle for one research run. It does not start execution.

## Input Model

Minimum input is `RUN_DIR`.

Before copying output templates from `RUN_DIR/_framework/output_templates/`, resolve the instance parameters below. Use explicit assumptions for values that are not knowable from the run directory, seed topic material, original topic material, or user request and do not block execution.

All run-binding paths written into the five root control files must be absolute filesystem paths. `original_topic_dir=not_applicable` is the only non-path exception. After rendering, `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, and `TRACE_PATH` must contain zero `<...>` angle-bracket placeholders; use concrete values in active state and brace notation only for schema/template/pattern guidance.

- `RUN_DIR`: target run bundle directory
- `FRAMEWORK_DIR`: fixed `<RUN_DIR>/_framework`
- `TEMPLATE_VERSION`: fixed by `FRAMEWORK_DIR/specs/CONSTANTS.md -> Template Package Identity.current_version`; use the lowercase value when replacing `<TEMPLATE_VERSION>`
- `PLAN_NAME`: infer from user request or seed directory when absent
- `PROFILE_PATH`: default `<RUN_DIR>/<PLAN_BASENAME>.profile.md`
- `PLAN_PATH`: default `<RUN_DIR>/<PLAN_BASENAME>.plan.md`
- `STATUS_PATH`: default `<RUN_DIR>/<PLAN_BASENAME>.status.md`
- `QUEUE_PATH`: default `<RUN_DIR>/<PLAN_BASENAME>.queue.md`
- `TRACE_PATH`: default `<RUN_DIR>/<PLAN_BASENAME>.trace.md`
- `ORIGINAL_TOPIC_DIR`: `not_applicable` unless local large-topic decomposition is needed; when used, fixed `<RUN_DIR>/original_topic`
- `TOPIC_ROOT`: fixed `<RUN_DIR>/seed_topics`
- `REFERENCE_DIR`: fixed `<RUN_DIR>/seed_topics/_reference`
- `ARTIFACT_DIR`: fixed `<RUN_DIR>/seed_topics/_artifacts`
- `FINAL_DELIVERABLE`: infer from seed/user request; otherwise write an assumption
- `FINAL_MUST_ANSWER`: user-provided questions or claims the final Deep Research result must answer; if absent during interactive profile selection, ask for them together with profile choice
- `SEARCH_PREFERENCES`: optional user guidance for source types/families, source date window, geography/jurisdiction, language, must-include sources, and exclusion rules; if absent, record `not_specified_use_profile_defaults`
- `AUDIENCE`: infer from seed/user request; otherwise write an assumption
- `ROUND_FOCUS`: infer from seed/user request; otherwise write an assumption
- `ROUND_LABEL`: infer from nearby run naming; otherwise use a clear assumption
- `RESEARCH_PROFILE`: required public run mode; ask an interactive user with the HITL1 Chinese-first labels and record the choice internally as one of `quick_factual / exploratory_map / claim_verification`; do not default or infer silently
- `WAVE0_SHARED_DOC_FLOOR`
- `TOPIC_COMPLEXITY_FACTOR`
- `CROSS_TOPIC_DEPENDENCY_FACTOR`
- `WAVE1_DOC_FLOOR_PER_TOPIC`
- `PRIMARY_SOURCE_FLOOR`
- `SECONDARY_SOURCE_FLOOR`
- `RECENT_SOURCE_FLOOR`
- `LIMITATION_SOURCE_FLOOR`
- `CRITICAL_CLAIM_CHECKS`

## Default Parameter Values

Choose a `RESEARCH_PROFILE` before deriving floor values. If an interactive user has not provided one, briefly present the choices and ask. In the same user-facing prompt, ask what questions or claims the final Deep Research result must answer. Optionally accept one sentence of search/source preference guidance, but do not require it. This is the profile-choice UX checkpoint: collect the public profile, the root-lens must-answer input, and any optional search preferences before execution begins.

Use plain Chinese-first wording for the HITL1 user prompt. Do not expose raw enum values such as `quick_factual`, `exploratory_map`, or `claim_verification` as the user-facing choices; record those canonical values internally after the user chooses.

Recommended HITL1 prompt:

```text
开始前我需要确认这轮研究的目标。你更想要哪种结果？

A. 快速事实答案（quick factual）：适合低风险、范围很窄的问题。
B. 探索地图（exploratory map）：适合先摸清领域结构、空白和下一步重点。
C. 说法验证（claim verification）：适合判断一个说法是否被证据支持、削弱或需要限定。

另外，请用一句话写下：最终报告必须回答什么问题（final must-answer）？
如果你还不确定，也可以写“我不确定，先帮我拆问题”。我会把这个不确定记录为待澄清缺口，并排入后续澄清或拆解任务，不会替你暗中假设。

如果你对搜索材料有偏好，也可以顺手说一句，例如“优先官方/学术来源”“只看 2023 年以后”“重点看中国/美国/欧盟”“排除供应商营销页”。不写也可以，我会按研究模式的默认证据规则执行。
```

- `quick_factual`: low-risk, narrow factual answer; quick relative to heavier profiles, not lightweight chat Q&A
- `exploratory_map`: exploratory coverage map; preserves unknown zones, discovery structure, and next-step priorities
- `claim_verification`: claim testing; judges support, weakening evidence, confidence, counterexamples, and limits

If the user is unsure about profile, ask which of the three deliverable shapes they want. If they still cannot choose, return `FAIL_BLOCKED` with the missing profile as the blocker. Do not use an assumption, hidden default, or agent-inferred profile for the current template version.

If the user is unsure which final questions must be answered, record the uncertainty explicitly instead of inventing a hidden root lens. A run may continue only when `PROFILE_PATH -> Root Must-Answer Set` records either concrete final must-answer entries or a `gap_queue_backed` clarification/decomposition task, and `PLAN_PATH -> Research Profile Projection` mirrors that status. Exploratory runs may phrase the final must-answer as a map deliverable, for example coverage, unknown zones, and next-step priorities, but the entry still needs to be visible.

Search preferences are optional. Do not block instantiation because the user did not specify preferred source families, date windows, geography, language, must-include sources, or exclusion rules. In that case, write `PROFILE_PATH -> Search Preference Intake.search_preference_intake_status=not_specified_use_profile_defaults`, set the preference fields to `not_specified_use_profile_defaults` or `none` as appropriate, and let source intake use the selected research profile, topic evidence anchors, and normal trust/tier/evidence-quality rules.

Do not use `quick_factual` when the seed directory, user request, final deliverable, or audience indicates management, decision-shaping, compliance, security, medical, legal, financial, irreversible, contested, or weakly sourced work unless the user explicitly insists. In those cases, recommend `claim_verification`. If the user explicitly insists on `quick_factual`, record `research_profile_user_choice=explicit_override`, the risk rationale, the confidence consequence, and the fact that all gate audits still apply to the configured values.

Record a cost expectation even for `quick_factual`. With two confirmed topics and factors `topic_complexity_factor=1` and `cross_topic_dependency_factor=1`, the minimum configured path is Wave 0 shared refs `6` plus Wave 1 refs `5` per topic before Wave 2, plus progressive topic artifacts. This profile reduces breadth relative to higher-intensity profiles; it does not remove Wave 0, Wave 1, artifact, synthesis, trace, or readiness gates.

Profiles are public run modes, not merely source-count presets. They define the run intent, Wave 1 closure posture, Wave 2 synthesis posture, and default evidence parameters. After the derived floors are written into `PROFILE_PATH` and mirrored into `PLAN_PATH`, all gates check the configured values exactly. No profile may bypass gate audits, accepted-reference inventory fields, webpage diagnostic rules, cross-verification rules, artifact requirements, seed backfill, or critical-claim checks.

Use the canonical formulas and floors in `specs/RESEARCH_PROFILES.md` unless the seed directory, user request, or final deliverable clearly requires an explicit manual parameter override. This flow must not maintain a second profile preset table. During creation, read the canonical profile row from `specs/RESEARCH_PROFILES.md`, compute the active values, and write the selected run-local configuration into `PROFILE_PATH`, with a projection into `PLAN_PATH -> Instance Config` and `PLAN_PATH -> Research Profile Projection`.

The generated `PROFILE_PATH` owns the run-local configured copy for self-contained execution. `PLAN_PATH` may mirror enough of that copy to keep gate targets readable, but `PROFILE_PATH` is authoritative for run-specific profile configuration. If you override one configured floor, filter, must-answer intensity, evidence intensity, or verification-posture parameter, explain the reason in `PROFILE_PATH -> Configured Profile Parameters.manual_parameter_overrides` and mirror the consequence into the plan.

Where:

- `topic_complexity_factor`: `0-6`, based on distinct domains, regulations, technologies, geographies, or stakeholder groups in the topic registry
- `cross_topic_dependency_factor`: `0-6`, based on how strongly topics share mechanisms, sources, risks, and comparison objects

Use this scoring anchor for both factors:

- `0`: narrow, single-domain, low-dependency run
- `1-2`: modest variation across topics or sources
- `3-4`: multiple domains, technologies, geographies, regulations, stakeholder groups, or shared mechanisms
- `5-6`: high-complexity run where several domains and cross-topic dependencies can change P0/P1 judgments

Do not lower the Wave 0 floor merely by merging topics. If topic granularity changes, reassess these factors and record the reason in `PLAN_PATH -> Instance Config`.

## Topic Registry Inference

Read `RUN_DIR/seed_topics/`, including topic seed files, README/navigation files, existing summaries, `_artifacts`, and `_reference` material when present. If only broad source material exists, read optional `RUN_DIR/original_topic/` or direct user-provided original topic material and run `command_playbooks/decompose-seed-topics.md` before treating topics as confirmed. Derive:

- topic id
- slug
- title
- seed files
- current hypothesis or gap
- why it matters
- seed must-answer set with at least one entry

Infer how each seed topic relates to the larger research topic, final deliverable, or decision problem when the seed material makes that relationship visible. Preserve that relationship in the generated plan's research-flow explanation, topic registry, or topic goal block so a later agent can understand why these seed topics exist together.

Evaluate every seed topic against the Seed Topic Intake Standard from `specs/METHODOLOGY.md`: title, slug, one or more seed `must_answer` entries, hypothesis/gap, why-now trigger, boundary/out-of-scope notes, evidence anchors or preferred source families, and why-it-matters. Optional downstream placement and future observation windows should be preserved when present. The seed `must_answer` set is a topic intake input that later projects into `question-list.md -> Topic Investigation Targets` and `evidence-summary.md -> Topic Target Coverage`; it is not expected to be complete before evidence work.

If the upper-section intake substance is thin, do not invent facts. If the topic is otherwise confirmed, keep it in the Topic Registry with `intake_status=assumption` or `intake_status=gap`, record the missing intake fields in the Seed Topic Intake Matrix or topic goal block, and add a queue candidate to clarify the intake gap before treating the topic as fully ready for Wave 1 deepening. During setup, such a run may set `seed_topic_intake_ready=gap_queue_backed` only when the gap is explicit and executable repair work is visible; this may let workspace setup finish, but it does not let Wave 0 pass its topic-start rows or Wave 1 begin. If the object is only a pending candidate, keep it outside the Topic Registry and record it in Topology Baseline, STATUS Topology Delta, QUEUE, or `original_topic/` decomposition work.

Do not assume a fixed number of topics. `Topic Registry` contains only confirmed seed topics and owns the confirmed topic count. Pending candidates are not registry rows, do not affect `derived_topic_count`, and do not create Wave 1 or Wave 2 topic rows until confirmed or formalized. If `seed_topics/` is empty or ambiguous, keep the registry and topic audit tables empty, set `derived_topic_count=0`, and create explicit pending decomposition or clarification work rather than inventing facts. If a broad original topic still needs decomposition, keep that material in `original_topic/` when used and do not count it as Wave 1 seed topics.

## Topic Root Resolution

Resolve `TOPIC_ROOT` before deriving evidence paths.

- `TOPIC_ROOT` must be `<RUN_DIR>/seed_topics`.
- `REFERENCE_DIR` must be `<RUN_DIR>/seed_topics/_reference`.
- `ARTIFACT_DIR` must be `<RUN_DIR>/seed_topics/_artifacts`.
- `topics/` is not a V12 active topic root.
- Optional `original_topic/` is an upstream decomposition directory only and never owns `_reference` or `_artifacts`.

Do not split active evidence file sets across sibling or non-canonical directories. Active references and artifacts live only under `seed_topics/`.

## Topic Index And Topology Sync

If `seed_topics/` already has a topic index or navigation entry point, preserve it as part of the input directory.

If it does not exist, do not invent one during Instantiation Mode.

When a new object becomes an independent topic, update the plan topic registry first, then sync status, then queue, then the topic index or navigation entry point, then the new topic seed file.

## Minimum Fill Rules

`PROFILE_PATH` must include:

- static `File Role Snapshot`
- Profile Binding with concrete `<PROFILE_PATH>`, `<PLAN_PATH>`, `<STATUS_PATH>`, `<QUEUE_PATH>`, `<TRACE_PATH>`, and absolute `artifact_dir`
- selected `research_profile`, user-choice status, intent contract, Wave 1 pass contract, Wave 2 synthesis contract, and quick suitability review
- Root Must-Answer Set with user-provided questions/claims or visible `gap_queue_backed` clarification route
- Search Preference Intake with optional source/date/geography/language/must-include/exclusion preferences, or `not_specified_use_profile_defaults`
- Configured Profile Parameters including floors, critical-claim checks, must-answer policy, cost expectation, and manual overrides
- Human Decision Checkpoints with HITL1 recorded, the PROFILE `HITL2_wave2_readiness_decision` row initialized as `status=not_started`, `PROFILE HITL2 Wave 2 Readiness Decision.hitl2_checkpoint_status=not_started`, and STATUS `hitl2_wave2_readiness_decision_status=not_started`

`PLAN_PATH` must include:

- static `File Role Snapshot`
- `Instance Config`
- purpose and audience
- first-time research flow mental model explaining large topic -> seed topics -> evidence digestion -> Wave 2 synthesis
- Research Profile Projection pointing to `<PROFILE_PATH>`, with only the selected profile, configured floors, root must-answer projection, and HITL2 checkpoint projection needed for execution readability
- Search Preference projection pointing to `PROFILE_PATH -> Search Preference Intake`, with `not_specified_use_profile_defaults` when the user gave no preference
- local framework authority pointers for profile presets, cost control, evidence quality, reference schema, artifact rules, gate specs, and methodology sections
- at least `max(5, topic_count)` core gaps
- topic registry with every known topic
- Seed Topic Intake Matrix with one row per known topic, carrying the `must_answer` set, `why_now`, `boundary`, `evidence_anchors`, `why_it_matters`, `intake_status`, `intake_gap`, and `queue_consequence`
- topology baseline
- output contract, including seed growth, reference, artifact, and final-output boundaries
- local execution authorities pointing to `RUN_DIR/_framework/specs/CONSTANTS.md`, `RUN_DIR/_framework/specs/METHODOLOGY.md`, `RUN_DIR/_framework/specs/GATES.md`, `RUN_DIR/_framework/specs/gates/*`, and `RUN_DIR/_framework/specs/RESEARCH_PROFILES.md`
- configured Wave 0/1/2/readiness targets for this run, with detailed gate definitions delegated to local `specs/gates/*`
- topic stop and critical claim policy, including the selected `critical_claim_checks` value and local methodology authority pointers
- Readiness is final
- one concrete goal block per topic

`STATUS_PATH` must include:

- compact `Operator View`
- User-Visible Stop Authorization initialized as `stop_authorization_state=unauthorized_continue_required`, `unauthorized_stop_next_action` pointing to `QUEUE_PATH -> Active Queue.slot_1_current`, and `safe_to_interrupt=no`
- current snapshot at `instantiation_only / Instantiation / instantiation_complete`
- gate state
- directory/integration state
- topology delta
- topology drift review
- Wave 0 block
- Wave 0 Foundation Gate Audit block
- Wave 0 Gate Rationale Note
- Wave 0 accepted and excluded shared reference inventory sections
- webpage diagnostic and content-retention fields in accepted reference inventory sections
- one Wave 1 status block per topic
- Wave 1 Source Floor Audit block with one audit row per topic
- Wave 1 Gate Rationale Note
- Wave 2 block
- Human Decision Checkpoints block with `hitl2_wave2_readiness_decision_status=not_started`, `answerability_class=not_assessed`, `human_checkpoint_status=not_started`, `final_report_view=not_started`, `custom_final_report_view_label=not_applicable`, `custom_final_report_view_slug=not_applicable`, `final_output_dir=not_started`, `repair_recommendation=not_started`, and `user_decision=not_started`
- Wave 2 Synthesis Gate Audit block with one audit row per topic
- Wave 2 Gate Rationale Note
- readiness, suspended branches, failed explorations, resume checkpoint, worklog
- Readiness Rationale Note

`QUEUE_PATH` must include:

- compact `Operator View`
- active queue
- User-Visible Stop Authorization fields in `Active Queue`: `stop_authorization_state=unauthorized_continue_required`, concrete `unauthorized_stop_next_action`, `allowed_output_states=final_delivery / decision_blocker / empty_queue_after_refill`, and `forbidden_user_prompts`
- a first execution action after instantiation
- refill pool
- promotion rules
- no-empty-queue rule
- topic seed backfill rule
- counted-webpage rule that blocks counted references until webpage diagnostic fields and content-retention decisions are synced under local methodology authority
- wave gate audit rule
- post-readiness maintenance rule

`TRACE_PATH` must include:

- static `File Role Snapshot`
- write rules
- trace entry schema
- empty trace state

## Self-Containment Rules

The instantiated run bundle must be runnable for routine execution without rereading the source template package. The runnable bundle is the five mutable root control files plus the local `RUN_DIR/_framework/` authority snapshot; root files may point to local `_framework/specs/*` for detailed rule definitions.

- Copy only bounded output template content from:
  - `output_templates/PROFILE.md` -> `PROFILE_PATH`
  - `output_templates/PLAN.md` -> `PLAN_PATH`
  - `output_templates/STATUS.md` -> `STATUS_PATH`
  - `output_templates/QUEUE.md` -> `QUEUE_PATH`
  - `output_templates/TRACE.md` -> `TRACE_PATH`
- Copy run-root agent templates from:
  - `output_templates/RUN_ROOT_AGENTS.md` -> `RUN_DIR/AGENTS.md`
  - `output_templates/RUN_ROOT_CLAUDE.md` -> `RUN_DIR/CLAUDE.md`
- Rewrite all examples into instance-specific prose.
- Put enough topic context into the plan and queue for a later agent to continue from files alone.
- Keep flow-file prose out of the instance unless it is already part of an output skeleton.
- Keep `derived_topic_count` as `= count(topic registry entries)`; do not maintain a second topic count elsewhere.
- Do not leave bare references such as "read the source template package" or "see parallel protocol"; copy the minimum execution rule into the instance itself or point to the matching local `_framework/specs/*` authority.
- Preserve enough reference schema pointers and inventory field requirements in the generated files for execution to proceed from the run bundle. Detailed field and quality authorities live in local `_framework/specs/CONSTANTS.md` and `_framework/specs/METHODOLOGY.md`; routine execution must not require rereading `flows/reference-artifact-backfill.md` from the source template package.

## Instantiation Stop Condition

Stop when the five root control files, run-root agent files, and run bundle are complete and self-contained:

- `current_mode = instantiation_only`
- `current_wave = Instantiation`
- `current_gate = instantiation_complete`
- queue points to the first execution action
- trace has no entries yet
- `RUN_DIR/AGENTS.md` and `RUN_DIR/CLAUDE.md` exist at the run root and contain the queue/stop/HITL2 continuation contract

Instantiation creates the directory/scaffold contract only: `RUN_DIR/seed_topics/`, `RUN_DIR/seed_topics/_reference/`, and `RUN_DIR/seed_topics/_artifacts/` may exist before execution, and `RUN_DIR/seed_topics/_artifacts/README.md` is the allowed scaffold README required by the work-directory contract. Do not create topic README files, reference README files, `_INDEX.md`, reference bodies, produced artifacts, final outputs, Wave 0 evidence, or execution progress in Instantiation Mode.

## Instantiation Checklist

Before delivery, confirm:

- `RUN_DIR`, `FRAMEWORK_DIR`, `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, `TRACE_PATH`, `TOPIC_ROOT`, `REFERENCE_DIR`, and `ARTIFACT_DIR` are concrete paths.
- run-root `AGENTS.md` and `CLAUDE.md` exist directly under `RUN_DIR`, not inside `_framework`, and tell agents to read the five root control files, ignore `_framework/output_templates/*.md` as execution sources, continue `unauthorized_stop_next_action` when stop is unauthorized, and stop for HITL2 only after the pending-user decision state and brief are written.
- `research_profile` is one of `quick_factual / exploratory_map / claim_verification`, selected by the user before instantiation completes.
- `PROFILE_PATH -> Root Must-Answer Set` records the final questions/claims the Deep Research result must answer, or a visible `gap_queue_backed` clarification route; missing final must-answer input must not be silently inferred.
- `PROFILE_PATH -> Search Preference Intake` records optional source/date/geography/language/must-include/exclusion guidance, or explicitly records `not_specified_use_profile_defaults`; missing search preference input must not block instantiation.
- `PROFILE_PATH -> Human Decision Checkpoints` records HITL1 and initializes the `HITL2_wave2_readiness_decision` row with `status=not_started`; `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision.hitl2_checkpoint_status=not_started`; `PROFILE_PATH -> Profile Binding.artifact_dir` is the absolute `RUN_DIR/seed_topics/_artifacts`; `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision.hitl2_decision_brief_path` is the absolute `ARTIFACT_DIR/wave2/human-decision-brief.md`.
- `PROFILE_PATH -> Configured Profile Parameters` records active formula, configured floors, must-answer policy, quick suitability review, critical-claim checks, and any manual parameter overrides; `PLAN_PATH -> Research Profile Projection` mirrors only the execution-readable subset.
- Configured floors match `specs/RESEARCH_PROFILES.md` unless an explicit override reason is recorded.
- If `research_profile=quick_factual`, the run is low-risk and narrow, or `research_profile_user_choice=explicit_override` records risk rationale and confidence consequence.
- If `research_profile=quick_factual`, `PROFILE_PATH -> Configured Profile Parameters.cost_expectation` records that "quick" still requires the configured Wave 0 floor, per-topic Wave 1 floor, triggered topic artifacts, Wave 2 synthesis, HITL2 human decision, and Readiness.
- `TOPIC_ROOT = RUN_DIR/seed_topics`, `REFERENCE_DIR = RUN_DIR/seed_topics/_reference`, and `ARTIFACT_DIR = RUN_DIR/seed_topics/_artifacts`; no active sibling or non-canonical evidence file sets are mixed with the topic-root evidence file sets.
- `PLAN_PATH.Instance Config.profile_path`, `STATUS_PATH.profile_path`, and the actual `PROFILE_PATH` match.
- `PLAN_PATH.Instance Config.queue_path`, `STATUS_PATH.queue_path`, and the actual `QUEUE_PATH` match.
- `PLAN_PATH.Instance Config.trace_path`, `STATUS_PATH.trace_path`, and the actual `TRACE_PATH` match.
- `topic registry` includes every confirmed seed topic; uncertain candidates remain outside the registry as pending decomposition, topology, or intake-clarification work.
- every known seed topic is assessed against the Seed Topic Intake Standard in `PLAN_PATH -> Seed Topic Intake Matrix` or explicit topic-goal fields, with concrete intake gaps or assumptions recorded instead of invented facts.
- `derived_topic_count` remains `= count(topic registry entries)`.
- Default floors are present, or overrides are explained.
- Every topic has a concrete plan goal block and a status Wave 1 block.
- Every topic status block includes topic seed backfill tracking fields.
- `STATUS_PATH` includes `Topology Drift Review` fields for before Wave 1 audit, before Wave 2 audit, and Readiness.
- `STATUS_PATH` includes `Wave 0 Foundation Gate Audit` and starts as `fail / wave1_entry_allowed=no`.
- `STATUS_PATH` includes Wave 0 Gate Rationale Note and it does not override the audit rows.
- `STATUS_PATH` includes Wave 0 accepted and excluded shared reference inventory sections.
- `STATUS_PATH` includes `Wave 1 Source Floor Audit` with one row per topic and starts as `fail / wave2_entry_allowed=no`.
- `STATUS_PATH` includes Wave 1 Gate Rationale Note and it does not override the audit rows.
- `STATUS_PATH` includes topic-unique reference tracking in the Wave 1 audit and accepted reference inventory.
- `STATUS_PATH` includes `Wave 2 Synthesis Gate Audit` with one row per topic and starts as `fail / readiness_entry_allowed=no`.
- `STATUS_PATH` includes Human Decision Checkpoints, Wave 2, and Wave 2 Human Decision Brief HITL2 projections, and starts HITL2 as `hitl2_wave2_readiness_decision_status=not_started`, `answerability_class=not_assessed`, `human_checkpoint_status=not_started`, `final_report_view=not_started`, `custom_final_report_view_label=not_applicable`, `custom_final_report_view_slug=not_applicable`, `final_output_dir=not_started`, `repair_recommendation=not_started`, and `user_decision=not_started`.
- `STATUS_PATH` includes Wave 2 Gate Rationale Note and Readiness Rationale Note, and neither can pass a gate without the audit.
- `STATUS_PATH` is still at the instantiation start state and does not claim execution progress.
- `STATUS_PATH` and `QUEUE_PATH` initialize `stop_authorization_state=unauthorized_continue_required`, initialize `safe_to_interrupt=no`, and name the first concrete `unauthorized_stop_next_action`.
- `QUEUE_PATH.Active Queue.slot_1_current` points to the first execution action after instantiation.
- `QUEUE_PATH` uses the sequential active queue skeleton; parallel execution is outside the current execution contract.
- `QUEUE_PATH` can repair missing lower growth-tail headings during setup but does not treat missing upper-section intake substance as solved by placeholder headings.
- `QUEUE_PATH` makes topic seed backfill part of reference completion.
- `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, and `QUEUE_PATH` preserve the profile/HITL and canonical artifact layout: `ARTIFACT_DIR/wave1_topics/{topic-id}-{topic-slug}/evidence-summary.md`, `ARTIFACT_DIR/wave1_topics/{topic-id}-{topic-slug}/question-list.md`, `ARTIFACT_DIR/wave2/cross-topic-synthesis.md`, and `ARTIFACT_DIR/wave2/human-decision-brief.md`.
- `QUEUE_PATH` work rules do not schedule or authorize Wave 1 entry until the Wave 0 Foundation Gate Audit passes.
- `QUEUE_PATH` work rules do not schedule or authorize Wave 2 entry until the Wave 1 Source Floor Audit passes.
- `QUEUE_PATH` work rules do not schedule or authorize Readiness Check entry until the Wave 2 Synthesis Gate Audit passes and the HITL2 human decision checkpoint is recorded with a readiness-eligible answerability class, `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision.hitl2_checkpoint_status=recorded`, `STATUS_PATH -> Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=recorded`, and `PROFILE_PATH -> Human Decision Checkpoints` has a `HITL2_wave2_readiness_decision` row with `status=recorded`.
- `QUEUE_PATH` limits post-readiness maintenance to bounded URL/metadata repair for already accepted references and forbids new source discovery or hidden completion stages.
- `STATUS_PATH` includes Setup Ready Transition, Gate Reopen, and Anti-Stall Budget fields.
- `TRACE_PATH` has `none_recorded_yet: yes`.
- No execution content has been initialized: `REFERENCE_DIR` may exist as an empty path anchor, and `ARTIFACT_DIR` has only the non-evidence scaffold README plus empty `wave1_topics/`, `wave2/`, and `shared/` directories. Topic README files, reference README files, `_INDEX.md`, local references, per-topic artifact directories, produced artifact files, final outputs, Wave 0 evidence, and execution progress do not exist yet.
- The run bundle is self-contained for routine execution through the five mutable control files and local `RUN_DIR/_framework/`; routine execution does not reread the source template package.

## Instantiation Reject Gate

Reject and fix if:

- unresolved instantiation placeholders remain, or runtime metavariables appear as active state instead of schema/template/pattern guidance
- skeleton examples remain as real content
- only one sample topic block remains when multiple topics are known
- seed topic upper-section intake gaps are hidden by placeholder growth-tail headings instead of recorded as assumptions, gap rows, or queue-backed clarification work; pending candidates appear inside Topic Registry instead of remaining outside it until confirmed
- `research_profile` is missing, outside the allowed enum, or uses floor values that do not match the canonical profile preset in `specs/RESEARCH_PROFILES.md` and lack an explicit override reason
- `quick_factual` is selected for management, decision-shaping, compliance, security, medical, legal, financial, irreversible, contested, or weakly sourced work without `research_profile_user_choice=explicit_override`, risk rationale, and confidence consequence
- core gaps are empty, generic, or fewer than `max(5, topic_count)`
- `PLAN_PATH` contains live progress or worklog
- `STATUS_PATH` mirrors the full active queue
- `QUEUE_PATH` mirrors full status
- `QUEUE_PATH` allows reference tasks to close without topic seed backfill or an explicit shared-foundation-only/deferred reason
- `STATUS_PATH` has topic doc counts but no per-topic seed backfill tracking
- generated files allow mixed flat and per-topic-directory artifact layouts instead of the canonical artifact layout
- `STATUS_PATH` lacks a Wave 0 Foundation Gate Audit, or the audit can pass without checking shared reference floor, source mix, retrieval readiness, and every topic's Wave 1 start point
- `STATUS_PATH` lacks Wave 0 accepted and excluded shared reference inventory sections
- `STATUS_PATH` lacks a Wave 1 Source Floor Audit, or the audit can pass without comparing every topic against all active floors and topic target coverage
- accepted reference inventory sections lack `acceptance_status`, `source_type`, `trust_level`, `source_family`, `tier`, `evidence_role`, `source_date_scope`, `supports_claims`, or seed-backfill fields
- accepted reference inventory sections lack `web_substance`, `commercial_intent`, `marketing_risk`, `cross_verification_required`, `cross_verification_status`, or `content_retention_decision`
- `QUEUE_PATH` allows webpage-derived references to count while thin, marketing-only, verification-pending for important claims, or retaining unqualified content in `Core Content Capture`
- Wave 1 accepted reference inventory lacks topic-unique status, or the audit can pass while shared foundation dominates topic-specific floors without a scarcity exception
- `QUEUE_PATH` can schedule or authorize Wave 2 entry without a passing Wave 1 Source Floor Audit
- `STATUS_PATH` lacks a Wave 2 Synthesis Gate Audit, or the audit can pass without checking every topic's Wave 2 synthesis coverage, Root Must-Answer synthesis coverage, and high-leverage judgment backing
- `STATUS_PATH` lacks the HITL2 human decision checkpoint, or Readiness can pass while HITL2 is missing, pending, `blocked_repair_required`, set to repair/rerun, lacking `PROFILE.hitl2_checkpoint_status=recorded`, lacking `STATUS.hitl2_wave2_readiness_decision_status=recorded`, or lacking the PROFILE `HITL2_wave2_readiness_decision` row `status=recorded`
- `QUEUE_PATH` can schedule or authorize a post-gate lifecycle edge without the corresponding passing gate audit in `STATUS_PATH`
- `STATUS_PATH` or `QUEUE_PATH` initializes `safe_to_interrupt=yes`, omits `stop_authorization_state`, omits `unauthorized_stop_next_action`, or treats a wave gate, batch completion, artifact refresh, status sync, known next task, "continue?", "continue or adjust direction?", or "await user review" as a valid stop state
- execution workspace is marked ready during instantiation
- trace contains entries created during instantiation without a real diagnostic event
- `PLAN_PATH` contains non-current hard-gate bypass wording instead of current `critical_claim_checks` fields
- any output file extends the run contract beyond Readiness
- any output file allows post-readiness URL repair to discover new sources, add new claims, or repair failed gates without reopening the affected wave
