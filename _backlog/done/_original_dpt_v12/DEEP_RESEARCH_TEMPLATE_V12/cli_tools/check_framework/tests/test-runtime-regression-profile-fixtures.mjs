import {
  join,
  mkdtempSync,
  rmSync,
  tmpdir,
  writeFileSync,
} from "./test-runtime-harness.mjs";

export function withRunFiles({ profile = "", plan = "", status = "", queue = "", trace = "" }, fn) {
  const runRoot = mkdtempSync(join(tmpdir(), "v12-profile-regression-"));
  try {
    writeFileSync(join(runRoot, "case.profile.md"), profile);
    writeFileSync(join(runRoot, "case.plan.md"), plan);
    writeFileSync(join(runRoot, "case.status.md"), status);
    writeFileSync(join(runRoot, "case.queue.md"), queue);
    writeFileSync(join(runRoot, "case.trace.md"), trace);
    fn(runRoot);
  } finally {
    rmSync(runRoot, { recursive: true, force: true });
  }
}

function controlBacklinks() {
  return "case.profile.md case.plan.md case.status.md case.queue.md case.trace.md";
}

export function statusHeader({ gate, wave, state = "in_progress", nextGate = "none" }) {
  return `
## Current Execution Snapshot

- state: \`${state}\`
- current_mode: \`execution\`
- current_wave: \`${wave}\`
- current_gate: \`${gate}\`
- next_gate: \`${nextGate}\`
`;
}

export function planWithFloors() {
  return `
## Instance Config

| field | value |
| --- | --- |
| \`wave0_shared_doc_floor\` | \`1\` |
| \`wave1_doc_floor_per_topic\` | \`1\` |
`;
}

export function profilePlan({
  runRoot = "/tmp/v12-profile-regression",
  profile = "quick_factual",
  userChoice = "explicit_user_choice",
  wave0 = 7,
  wave1 = 5,
  primary = 2,
  secondary = 1,
  recent = 1,
  limitation = 1,
  topicComplexity = 3,
  crossTopicDependency = 2,
} = {}) {
  return `
## Instance Config

| field | value |
| --- | --- |
| \`run_dir\` | \`${runRoot}\` |
| \`artifact_dir\` | \`${join(runRoot, "seed_topics", "_artifacts")}\` |
| \`research_profile\` | \`${profile}\` |
| \`research_profile_user_choice\` | \`${userChoice}\` |
| \`wave0_shared_doc_floor\` | \`${wave0}\` |
| \`wave1_doc_floor_per_topic\` | \`${wave1}\` |
| \`primary_source_floor\` | \`${primary}\` |
| \`secondary_source_floor\` | \`${secondary}\` |
| \`recent_source_floor\` | \`${recent}\` |
| \`limitation_source_floor\` | \`${limitation}\` |
| \`topic_complexity_factor\` | \`${topicComplexity}\` |
| \`cross_topic_dependency_factor\` | \`${crossTopicDependency}\` |

## Research Profile Projection

- search_preference_projection: \`not_specified_use_profile_defaults\`
`;
}

export function profileFixture({
  runRoot = "/tmp/v12-profile-regression",
  profile = "quick_factual",
  userChoice = "explicit_user_choice",
  intakeStatus = "ready",
  finalInput = "Final report must answer whether Demo claim holds and what the evidence boundary is.",
  rootLens = "Use local evidence to answer whether Demo claim is supported and where uncertainty remains.",
  floors = "wave0=7; wave1_per_topic=5; primary=2; secondary=1; recent=1; limitation=1",
  overrides = "none",
  hitl1Input = "User chose quick_factual; final report must answer whether Demo claim holds and what the evidence boundary is.",
  rowId = "FMA-1",
  rowPhase = "wave2_synthesis",
  mappedTopics = "t1/demo",
  searchPreferenceStatus = "not_specified_use_profile_defaults",
  searchPreferenceInput = "not_specified_use_profile_defaults",
} = {}) {
  const rowStatus = intakeStatus === "gap_queue_backed" ? "gap" : "ready";
  const rowQueue = intakeStatus === "gap_queue_backed" ? "clarify root must-answer in slot_2_next" : "not_applicable";
  return `
${controlBacklinks()}

## File Role Snapshot

- role: \`run-specific research profile, root must-answer set, and human decision record\`

## Profile Binding

| field | value |
| --- | --- |
| \`artifact_dir\` | \`${join(runRoot, "seed_topics", "_artifacts")}\` |
| \`research_profile\` | \`${profile}\` |
| \`research_profile_user_choice\` | \`${userChoice}\` |

## Profile Contract

- selected_intent_contract: \`${profile} handling\`

## Root Must-Answer Set

- final_must_answer_intake_status: \`${intakeStatus}\`
- final_must_answer_user_input: \`${finalInput}\`
- root_lens_for_wave2: \`${rootLens}\`

| id | final_must_answer | intended_profile_handling | initial_answer_phase | mapped_topics | intake_status | queue_consequence |
| --- | --- | --- | --- | --- | --- | --- |
| ${rowId} | Demo claim supported? | ${profile} handling | ${rowPhase} | ${mappedTopics} | ${rowStatus} | ${rowQueue} |

## Search Preference Intake

- search_preference_intake_status: \`${searchPreferenceStatus}\`
- user_search_preference_input: \`${searchPreferenceInput}\`
- preferred_source_types: \`not_specified_use_profile_defaults\`
- preferred_source_families: \`not_specified_use_profile_defaults\`
- source_date_window: \`not_specified_use_profile_defaults\`
- geography_or_jurisdiction: \`not_specified_use_profile_defaults\`
- language_preferences: \`not_specified_use_profile_defaults\`
- must_include_sources: \`none\`
- exclusion_rules: \`none\`
- source_preference_application_rule: \`source-intake requests should use concrete preferences when present; not_specified_use_profile_defaults means use the selected research profile, topic evidence anchors, and normal trust/tier/evidence-quality rules; preferences cannot weaken evidence gates\`

## Configured Profile Parameters

- active_wave0_formula: \`max(5,min(12,4+ceil(topic_complexity_factor/2)+ceil(cross_topic_dependency_factor/2)))\`
- configured_floors: \`${floors}\`
- critical_claim_checks: \`profile default checks active\`
- must_answer_policy: \`answer or explicitly classify every root must-answer entry\`
- cost_expectation: \`quick still requires configured Wave 0 refs, per-topic Wave 1 refs, triggered topic artifacts, Wave 2 synthesis, HITL2 human decision, and Readiness\`
- manual_parameter_overrides: \`${overrides}\`

## Human Decision Checkpoints

| checkpoint | timing | status | user_input | consequence |
| --- | --- | --- | --- | --- |
| HITL1_profile_and_root_must_answer | before execution begins | recorded | ${hitl1Input} | profile parameters configured; root lens created |
| HITL2_wave2_readiness_decision | after Wave 2 synthesis | not_started | not_applicable | not_started |

## HITL2 Wave 2 Readiness Decision

- hitl2_checkpoint_status: \`not_started\`
- answerability_class: \`not_assessed\`
- human_checkpoint_status: \`not_started\`
- final_report_view: \`not_started\`
- custom_final_report_view_label: \`not_applicable\`
- custom_final_report_view_slug: \`not_applicable\`
- final_output_dir: \`not_started\`
- repair_recommendation: \`not_started\`
- user_decision: \`not_started\`
- hitl2_decision_brief_path: \`${join(runRoot, "seed_topics", "_artifacts", "wave2", "human-decision-brief.md")}\`
`;
}

export const WAVE0_PASS_AUDIT = `
## Wave 0 Foundation Gate Audit

- overall_result: \`pass\`
- wave1_entry_allowed: \`yes\`
`;

export const WAVE1_PASS_AUDIT = `
## Wave 1 Source Floor Audit

- overall_result: \`pass\`
- wave2_entry_allowed: \`yes\`

| topic | accepted_topic_refs | topic_unique_refs | primary | secondary | recent | limitation | must_answer_set_status | wave1_topic_answers | wave2_synthesis_pending | seed_backfill | webpage_diagnostic | question_reconciliation | emergent_question_protocol | exploration_decision | evidence_summary | question_list | duplicate_review | counterexample_failure_search | stop_exception | result | gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1/demo | 1 | 1 | 1 | 0 | 1 | 1 | pass | answered | synthesis_pending | current | pass | pass | pass | continue | produced | produced | pass | pass | none | pass | none |
`;

export const WAVE2_PASS_AUDIT = `
## Wave 2 Synthesis Gate Audit

- overall_result: \`pass\`
- readiness_entry_allowed: \`yes\`

| item | target | actual | result | gap |
| --- | --- | --- | --- | --- |
| synthesis_artifact | exists and cites local refs | exists | pass | none |
| synthesis_phase_must_answers | all confirmed answer_phase=wave2_synthesis entries covered | 1 / 1 | pass | none |
| topics_represented | 1 / 1 | 1 / 1 | pass | none |
| high_leverage_judgments_tagged | all identified high-leverage judgments | 1 / 1 | pass | none |
| judgments_with_local_backing_refs | all tagged judgments have >= 1 local backing_ref | 1 / 1 | pass | none |
| P0_P1_judgment_independence | each P0/P1 judgment has >= 2 independent backing refs or scarcity exception with low confidence | not_applicable | pass | none |
| unresolved_conflicts | 0 or branch disposition / queue follow-up for each | 0 | pass | none |

| topic | cross_checked_conclusions | synthesis_must_answer_status | mechanism_reflected | trend_reflected | difficulty_reflected | limitation_reflected | local_backing_refs | result | gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1/demo | 1 / 1 | covered | yes | yes | yes | yes | 1 | pass | none |

## Wave 2

- synthesis_artifact_path: \`seed_topics/_artifacts/wave2/cross-topic-synthesis.md\`
- synthesis_phase_must_answers_identified: \`1\`
- synthesis_phase_must_answers_covered: \`1\`
- high_leverage_judgments_identified: \`1\`
- answerability_class: \`ready_substantive\`
- human_checkpoint_status: \`recorded\`
- final_report_view: \`evidence_map\`
- custom_final_report_view_label: \`not_applicable\`
- custom_final_report_view_slug: \`not_applicable\`
- final_output_dir: \`final_evidence_map\`
- repair_recommendation: \`not_applicable\`
- user_decision: \`proceed_to_readiness\`
`;

export const SYNTHESIS_MATRIX_ROW = `
## Cross-Topic Conclusion Matrix

| topic | must_answer_ids | conclusion | compared_with | claim_type | severity | confidence | backing_refs | independent_ref_count | scarcity_exception | conflict_status | synthesis_artifact_anchor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1/demo | MA-1 | conclusion | t2/demo | hard_fact | P2 | high | seed_topics/_reference/t1-ref.md | 1 | none | none | seed_topics/_artifacts/wave2/cross-topic-synthesis.md |
`;

export const PROFILE_HITL2_READY = `
## Human Decision Checkpoints

| checkpoint | timing | status | user_input | consequence |
| --- | --- | --- | --- | --- |
| HITL1_profile_and_root_must_answer | before execution begins | recorded | User chose quick_factual; final report must answer whether Demo claim holds. | profile parameters configured; root lens created |
| HITL2_wave2_readiness_decision | after Wave 2 synthesis | recorded | evidence_map final report view confirmed | Readiness may proceed |

## HITL2 Wave 2 Readiness Decision

- hitl2_checkpoint_status: \`recorded\`
- answerability_class: \`ready_substantive\`
- human_checkpoint_status: \`recorded\`
- final_report_view: \`evidence_map\`
- custom_final_report_view_label: \`not_applicable\`
- custom_final_report_view_slug: \`not_applicable\`
- final_output_dir: \`final_evidence_map\`
- repair_recommendation: \`not_applicable\`
- user_decision: \`proceed_to_readiness\`
`;

export const STATUS_HITL2_READY = `
## Human Decision Checkpoints

- hitl2_wave2_readiness_decision_status: \`recorded\`
- answerability_class: \`ready_substantive\`
- human_checkpoint_status: \`recorded\`
- final_report_view: \`evidence_map\`
- custom_final_report_view_label: \`not_applicable\`
- custom_final_report_view_slug: \`not_applicable\`
- final_output_dir: \`final_evidence_map\`
- repair_recommendation: \`not_applicable\`
- user_decision: \`proceed_to_readiness\`
`;

export const STATUS_HITL2_WAVE2_BRIEF_READY = `
### Wave 2 Human Decision Brief

- answerability_class: \`ready_substantive\`
- human_checkpoint_status: \`recorded\`
- final_report_view: \`evidence_map\`
- custom_final_report_view_label: \`not_applicable\`
- custom_final_report_view_slug: \`not_applicable\`
- final_output_dir: \`final_evidence_map\`
- repair_recommendation: \`not_applicable\`
- user_decision: \`proceed_to_readiness\`
`;

export const READINESS_PASS = `
## Readiness Check

- 30_second_local_evidence_retrieval: \`pass\`
- mechanism_trend_difficulty_limitation_check: \`pass\`
- cross_topic_synthesis_check: \`pass\`
- human_checkpoint_check: \`pass\`
- topology_stability_check: \`pass\`
- branch_disposition_check: \`pass\`
- handoff_continuity_check: \`pass\`
- post_readiness_stage_check: \`pass\`
- overall_status: \`pass\`
- closeout_phase: \`closed\`

### Runtime Qualification Result

- result: \`pass\`

### 30-Second Local Evidence Retrieval Test

- tested_at: \`fixture\`
- tester: \`fixture\`
- route: \`case.profile.md -> case.status.md -> case.plan.md -> case.queue.md -> case.trace.md\`
- route_paths_checked: \`case.profile.md; case.status.md; case.plan.md; case.queue.md; case.trace.md\`
- result: \`pass\`
- elapsed_seconds: \`12\`
- gaps_found: \`none\`
`;

export function synthesisArtifactBody() {
  const paragraph = "The synthesis compares the topic-specific evidence in seed_topics/_reference/t1-ref.md against the adjacent topic frame and preserves the local path as the reusable backing reference. It explains that the current conclusion depends on a concrete benchmark method, a dated source scope, a limitation record, and a mechanism note captured in the local reference. The point is not that every topic agrees, but that the final run can retrieve the claim, inspect the local reference, and see why the confidence stays high only for a P2 hard-fact claim. ";
  return `# Cross-Topic Synthesis

## High-Leverage Judgments

- topic: t1/demo
- claim_type: hard_fact
- severity: P2
- confidence: high
- backing_refs: seed_topics/_reference/t1-ref.md

${paragraph.repeat(4)}

## Conflict And Tension Reconciliation

The fixture records a low-severity tension between topic t1/demo and t2/demo. The tension is resolved for this gate by limiting the conclusion to a P2 hard-fact claim and by keeping the backing reference local: seed_topics/_reference/t1-ref.md. If a stronger P0/P1 decision depended on this line, the run would need additional independent references or a scarcity exception with lower confidence.

${paragraph.repeat(3)}

## Cross-Topic Conclusion Matrix

| topic | must_answer_ids | conclusion | compared_with | claim_type | severity | confidence | backing_refs | independent_ref_count | scarcity_exception | conflict_status | synthesis_artifact_anchor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1/demo | MA-1 | conclusion | t2/demo | hard_fact | P2 | high | seed_topics/_reference/t1-ref.md | 1 | none | resolved | seed_topics/_artifacts/wave2/cross-topic-synthesis.md |

${paragraph.repeat(2)}
`;
}
