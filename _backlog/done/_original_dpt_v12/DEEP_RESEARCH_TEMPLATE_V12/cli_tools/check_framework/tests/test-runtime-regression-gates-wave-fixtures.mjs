import {
  join,
  mkdtempSync,
  rmSync,
  tmpdir,
  writeFileSync,
} from "./test-runtime-harness.mjs";

export function withRunFiles({ profile = "", plan = "", status = "", queue = "", trace = "" }, fn) {
  const runRoot = mkdtempSync(join(tmpdir(), "v12-gate-regression-"));
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

export const WAVE0_PASS_AUDIT = `
## Setup Ready Transition

- seed_topic_intake_ready: \`yes\`

## Wave 0 Foundation Gate Audit

- overall_result: \`pass\`
- wave1_entry_allowed: \`yes\`

| topic | wave1_start_point | source_entry_points | core_terms_ready | result | gap |
| --- | --- | --- | --- | --- | --- |
| t1/demo | ready | ready | ready | pass | none |
`;

export const WAVE0_INVENTORY_ROW = `
## Wave 0 Accepted Shared Reference Inventory

| local_ref_path | acceptance_status | source_type | source_family | tier | evidence_role | trust_level | source_date_scope | supports_claims | web_substance | commercial_intent | marketing_risk | cross_verification_required | cross_verification_status | content_retention_decision | seed_backfill_status | counted_for_floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| seed_topics/_reference/00-shared-r1.md | accepted | webpage | benchmark | tier_1 | foundation;limitation;comparison | official | 2026 | shared foundation | substantive | none | low | no | not_required | retain | current | yes |
`;

export const WAVE1_PASS_AUDIT = `
## Wave 1 Source Floor Audit

- overall_result: \`pass\`
- wave2_entry_allowed: \`yes\`

| topic | accepted_topic_refs | topic_unique_refs | primary | secondary | recent | limitation | must_answer_set_status | wave1_topic_answers | wave2_synthesis_pending | seed_backfill | webpage_diagnostic | question_reconciliation | emergent_question_protocol | exploration_decision | evidence_summary | question_list | duplicate_review | counterexample_failure_search | stop_exception | result | gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1/demo | 1 | 1 | 1 | 0 | 1 | 1 | pass | answered | synthesis_pending | current | pass | pass | pass | continue | produced | produced | pass | pass | none | pass | none |
`;

export const WAVE1_ACCEPTED_ROW = `
## Accepted Reference Inventory

| topic | local_ref_path | acceptance_status | source_type | trust_level | tier | evidence_role | source_date_scope | supports_claims | web_substance | commercial_intent | marketing_risk | cross_verification_required | cross_verification_status | content_retention_decision | supports_must_answer | supports_mechanism | supports_trend | supports_difficulty | supports_limitation | source_family | topic_unique_status | seed_backfill_status | counted_for_floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1/demo | seed_topics/_reference/t1-ref.md | accepted | webpage | official | tier_1 | must_answer;limitation | 2026 | claim-b | substantive | none | low | no | not_required | retain | yes | yes | yes | yes | yes | benchmark | topic_unique | current | yes |
`;

export function wave1TopicBlock({ acceptedCount = 1, producedCount = 1 } = {}) {
  return `
### Topic t1/demo

- topic_id: \`t1\`
- topic_slug: \`demo\`
- accepted_topic_ref_count: \`${acceptedCount}\`
- topic_unique_ref_count: \`1\`
- topic_seed_backfill_status: \`current\`
- question_reconciliation_state: \`reconciled\`
- emergent_question_protocol_state: \`executed\`
- exploration_exploitation_decision: \`exploit_current_line\`
- exploration_trigger_refs: \`seed_topics/_reference/t1-ref.md\`
- exploration_queue_consequence: \`continue targeted verification in the active queue\`
- topic_target_wave1_status: \`completed\`
- topic_target_wave2_synthesis_status: \`ready\`
- evidence_summary: \`produced_at_ref_count=${producedCount}\`
- evidence_summary_path: \`seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md\`
- question_list: \`produced_at_ref_count=${producedCount}\`
- question_list_path: \`seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md\`
`;
}

export function wave1EvidenceSummaryBody({ producedCount = 1 } = {}) {
  const paragraph = "seed_topics/_reference/t1-ref.md records the local benchmark method, dated scope, limitation, and current judgment. This fixture repeats enough concrete material to count as a substantive Wave 1 topic artifact with local backing, mechanism detail, and a queue-visible consequence for future verification. ";
  return `# Evidence Summary

produced_at_ref_count: ${producedCount}

## Key Evidence

${paragraph.repeat(4)}

## Mechanism

${paragraph.repeat(3)}

## Current Judgment

${paragraph.repeat(3)}

## Topic Target Coverage

| target_ids | coverage_status | backing_refs | queue_consequence | last_updated_ref_count |
| --- | --- | --- | --- | --- |
| TT-1 | covered | seed_topics/_reference/t1-ref.md | continue targeted verification in the active queue | ${producedCount} |

${paragraph.repeat(2)}
`;
}

export function wave1QuestionListBody({ producedCount = 1 } = {}) {
  const paragraph = "The question ledger reconciles the active research questions against seed_topics/_reference/t1-ref.md and preserves the current routing state for handoff. It is intentionally repetitive in the fixture so body quality checks can distinguish a useful artifact from an empty shell. ";
  return `# Question List

produced_at_ref_count: ${producedCount}

## Topic Investigation Targets

| target_id | target_question | origin | status | profile_relevance | evidence_refs | next_action | last_updated_ref_count |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TT-1 | Does the fixture claim hold under the local benchmark? | seed | answered | fixture profile requires local benchmark answer | seed_topics/_reference/t1-ref.md | targeted verification remains queued | ${producedCount} |

## Question Reconciliation

- [resolved] The first topic question is answered by seed_topics/_reference/t1-ref.md.
- [open] A lower-priority follow-up remains tracked with queue consequence.

## Emergent Question Protocol

- new_concept: checked; no new topic object emerged from seed_topics/_reference/t1-ref.md.
- contradiction: checked; no contradiction against the fixture hypothesis.
- missing_information_gap: checked; no material public-source gap changed the target.
- noise_pattern: checked; no systematic excluded-source pattern changed the route.
- result: no_new_questions_after_protocol.

## Exploration / Exploitation Decision

- decision: exploit_current_line
- trigger_refs: seed_topics/_reference/t1-ref.md
- unresolved_questions: low-priority follow-up remains open but does not block the target.
- counterexample_failure_search: queued same-line verification after current artifact repair.
- queue_consequence: continue targeted verification in the active queue
- next_action: targeted verification, not broad exploration.
- last_updated_ref_count: ${producedCount}

${paragraph.repeat(5)}
`;
}

export function legacyWave1QuestionListBody() {
  const paragraph = "seed_topics/_reference/t1-ref.md is cited here, but this legacy artifact only lists target rows and a generic consequence, so it should not authorize Wave 1 gate passage. ";
  return `# Question List

produced_at_ref_count: 1

## Topic Investigation Targets

| target_id | target_question | origin | status | profile_relevance | evidence_refs | next_action | last_updated_ref_count |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TT-1 | Does the fixture claim hold under the local benchmark? | seed | answered | fixture profile requires local benchmark answer | seed_topics/_reference/t1-ref.md | none | 1 |

## Exploration Consequence

${paragraph.repeat(8)}
`;
}

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

const STATUS_HITL2_READY = `
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

const STATUS_HITL2_WAVE2_READY = `
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

const STATUS_HITL2_WAVE2_BRIEF_READY = `
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

export const TRACE_WITH_CHECKPOINT = `
# Trace

### T001 Wave 2 transition checkpoint

- gate_transition: \`wave2_complete -> readiness_passed\`
- evidence_bundle: \`seed_topics/_artifacts/wave2/cross-topic-synthesis.md; seed_topics/_reference/t1-ref.md\`
- queue_consequence: \`readiness local evidence retrieval\`
- status_pointer_sync: \`T001 Wave 2 transition checkpoint\`
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

export const V12_9_READINESS_PASS = `${STATUS_HITL2_READY}\n${STATUS_HITL2_WAVE2_READY}\n${STATUS_HITL2_WAVE2_BRIEF_READY}\n${READINESS_PASS}`;

export function planWithFloors() {
  return `
## Instance Config

| field | value |
| --- | --- |
| \`wave0_shared_doc_floor\` | \`1\` |
| \`wave1_doc_floor_per_topic\` | \`1\` |

## Topic Registry

| id | slug | title | seed_files | current_hypothesis | why_it_matters | must_answer |
| --- | --- | --- | --- | --- | --- | --- |
| t1 | demo | Demo Topic | seed_topics/t1-demo.md | Demo claim | Demo matters | Demo must answer |

## Seed Topic Intake Matrix

| topic | must_answer | why_now | boundary | evidence_anchors | why_it_matters | intake_status | intake_gap | queue_consequence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1/demo | Demo must answer | 2026 trigger | Demo boundary | Official source route | Demo matters | ready | none | not_applicable |
`;
}

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
