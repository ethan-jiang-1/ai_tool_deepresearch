import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { frameworkStateFindings } from "../lib/bundle.mjs";
import { countedReferenceBodyFindings, inventoryFindings } from "../checks/runtime-inventory.mjs";
import {
  preResponseGateFindings,
  queueFindings,
  rollingTaskProjectionFindings,
} from "../checks/runtime-queue.mjs";
import { queueReceiptFindings } from "../checks/runtime-queue-receipts.mjs";
import { readinessFindings } from "../checks/runtime-readiness.mjs";
import { stopAuthorizationFindings, stopAuthorizationSnapshot } from "../checks/runtime-stop-authorization.mjs";

export {
  countedReferenceBodyFindings,
  frameworkStateFindings,
  inventoryFindings,
  join,
  mkdirSync,
  mkdtempSync,
  preResponseGateFindings,
  queueFindings,
  queueReceiptFindings,
  readinessFindings,
  resolve,
  rmSync,
  rollingTaskProjectionFindings,
  stopAuthorizationFindings,
  stopAuthorizationSnapshot,
  tmpdir,
  writeFileSync,
};

const OPERATOR_VIEW_ACTIVE = `
## Operator View

- user_visible_output_authorized: \`no until final_delivery, decision_blocker, or empty_queue_after_refill\`
- routine_progress_location: \`STATUS/QUEUE/TRACE/local artifacts, not chat\`
- stop_authorization_state: \`unauthorized_continue_required\`
- unauthorized_stop_next_action: \`continue slot_1_current from QUEUE Active Queue\`
- task_projection_state: \`active\`
`;

const OPERATOR_VIEW_CLOSED = `
## Operator View

- user_visible_output_authorized: \`no until final_delivery, decision_blocker, or empty_queue_after_refill\`
- routine_progress_location: \`STATUS/QUEUE/TRACE/local artifacts, not chat\`
- stop_authorization_state: \`final_delivery\`
- unauthorized_stop_next_action: \`not_applicable\`
- task_projection_state: \`unavailable_queue_only\`
`;

export function sourceIntakeStatusSection({
  status = "not_started",
  runnerMode = "not_applicable",
  batchId = "not_applicable",
  waitState = "not_started",
  latestCandidateCards = "not_applicable",
  cachePromoteLog = "not_applicable",
} = {}) {
  return `
## Directory / Integration State

- source_intake_status: \`${status}\`
- source_intake_runner_mode: \`${runnerMode}\`
- source_intake_batch_id: \`${batchId}\`
- source_intake_wait_state: \`${waitState}\`
- latest_cache_candidate_cards: \`${latestCandidateCards}\`
- cache_promote_log: \`${cachePromoteLog}\`
`;
}

export function runningSourceStatus({
  runnerMode = "foreground_subagent_runner",
  batchId = "b1",
  latestCandidateCards = "_cache/intake/b1/candidate-cards.md",
} = {}) {
  return {
    status: "running",
    runnerMode,
    batchId,
    waitState: "running",
    latestCandidateCards,
    cachePromoteLog: "not_applicable",
  };
}

export function fanInReadyStatus({
  batchId = "b1",
  latestCandidateCards = "_cache/intake/b1/candidate-cards.md",
} = {}) {
  return {
    status: "fan_in_ready",
    runnerMode: "not_applicable",
    batchId,
    waitState: "fan_in_ready",
    latestCandidateCards,
    cachePromoteLog: "not_applicable",
  };
}

export function terminalSourceStatus({
  status = "integrated",
  batchId = "b1",
  waitState = "not_started",
  latestCandidateCards = "_cache/intake/b1/candidate-cards.md",
  cachePromoteLog = "_cache/promote-log.md",
} = {}) {
  return {
    status,
    runnerMode: "not_applicable",
    batchId,
    waitState,
    latestCandidateCards,
    cachePromoteLog,
  };
}

export function statusInProgress(extra = "", sourceIntake = {}) {
  return `
## Current Execution Snapshot

- current_mode: \`execution\`
- state: \`in_progress\`
- current_wave: \`Wave 1\`
- current_gate: \`wave0_complete\`
- next_gate: \`wave1_complete\`
- blocking_issue: \`not_applicable\`
- safe_to_interrupt: \`no\`

${OPERATOR_VIEW_ACTIVE}

${sourceIntakeStatusSection(sourceIntake)}

## Trace Pointer

- last_trace_entry: \`T001\`

${extra}
`;
}

export function statusWithCountedCacheInventory() {
  return `${statusInProgress()}

## Wave 0 Accepted Shared Reference Inventory

| local_ref_path | acceptance_status | source_type | source_family | tier | evidence_role | trust_level | source_date_scope | supports_claims | web_substance | commercial_intent | marketing_risk | cross_verification_required | cross_verification_status | content_retention_decision | seed_backfill_status | counted_for_floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _cache/intake/b1/candidate-cards.md | accepted | webpage | vendor | tier_2 | foundation | official | 2026 | claim-a | substantive | none | low | no | not_required | retain | current | yes |

## Accepted Reference Inventory

| topic | local_ref_path | acceptance_status | source_type | trust_level | tier | evidence_role | source_date_scope | supports_claims | web_substance | commercial_intent | marketing_risk | cross_verification_required | cross_verification_status | content_retention_decision | supports_must_answer | supports_mechanism | supports_trend | supports_difficulty | supports_limitation | source_family | topic_unique_status | seed_backfill_status | counted_for_floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| t1/demo | seed_topics/_reference/t1-ref.md | accepted | webpage | official | tier_2 | must_answer | 2026 | claim-b | substantive | none | low | no | not_required | retain | yes | yes | yes | yes | yes | vendor | topic_unique | current | yes |
`;
}

export function statusCompleted(readinessItems = {}, sourceIntake = {}) {
  const item = (field) => readinessItems[field] ?? "pass";
  return `
## Current Execution Snapshot

- current_mode: \`execution\`
- state: \`completed\`
- current_wave: \`Readiness Check\`
- current_gate: \`readiness_passed\`
- next_gate: \`none\`
- blocking_issue: \`not_applicable\`
- safe_to_interrupt: \`yes\`

${OPERATOR_VIEW_CLOSED}

${sourceIntakeStatusSection(sourceIntake)}

## Trace Pointer

- last_trace_entry: \`T001\`

## Readiness Check

- 30_second_local_evidence_retrieval: \`${item("30_second_local_evidence_retrieval")}\`
- mechanism_trend_difficulty_limitation_check: \`${item("mechanism_trend_difficulty_limitation_check")}\`
- cross_topic_synthesis_check: \`${item("cross_topic_synthesis_check")}\`
- topology_stability_check: \`${item("topology_stability_check")}\`
- branch_disposition_check: \`${item("branch_disposition_check")}\`
- handoff_continuity_check: \`${item("handoff_continuity_check")}\`
- post_readiness_stage_check: \`${item("post_readiness_stage_check")}\`
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
}

export function referenceBody({
  title = "Fixture Reference",
  core = "In 2026 the source describes a concrete benchmark method, a dataset scope, and a limitation. The retained material includes dates, threshold values, comparison constraints, failure modes, and source-specific definitions so the reference can be reused without chat memory or revisiting the original page.",
} = {}) {
  return `# ${title}

## Key Facts

- source_year: \`2026\`
- source_type: \`official benchmark\`

## Core Content Capture

${core}

## Relevance To This Research

This fixture supports the local gate and inventory checks for the research-run framework.

## Risks And Limitations

The fixture records that evidence can be incomplete, contested, or limited by benchmark scope.
`;
}

export function writeReferenceFile(runRoot, relPath, body = referenceBody()) {
  const fullPath = resolve(runRoot, relPath);
  mkdirSync(resolve(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, body);
}

export function activeQueueHeader({
  health = "ready",
  mode = "sequential",
  projection = "available_required_else_queue_only",
  sourceMode = "not_applicable",
  sourceBatchId = "not_applicable",
  sourceWaitState = "not_started",
  receiptCheckPhase = "preflight",
  stopAuthorizationState = health === "closed" ? "final_delivery" : "unauthorized_continue_required",
  unauthorizedStopNextAction = health === "closed" ? "not_applicable" : "continue slot_1_current from QUEUE Active Queue",
} = {}) {
  return `
## Active Queue

- queue_health: \`${health}\`
- execution_mode: \`${mode}\`
- closure_reason: \`${health === "closed" ? "readiness_passed" : "not_applicable"}\`
- autonomy_mode: \`strict_silent_autonomous\`
- pre_response_gate: \`required\`
- receipt_check_phase: \`${receiptCheckPhase}\`
- task_window_mode: \`rolling_execution_window\`
- platform_task_projection: \`${projection}\`
- projection_authority: \`QUEUE_PATH owns native projection state; native todo/task/plan is a projection\`
- projection_surfaces: \`claude_native_todo_or_task_tools_when_available / codex_native_plan_or_todo_surface_when_available / queue_only_fallback\`
- active_window: \`sequential: slot_1_current / slot_2_next / slot_3_pending / slot_4_pending / slot_5_tail\`
- projection_minimum: \`one in_progress executable task plus four pending executable tasks when a native surface is available\`
- preemption_policy: \`urgent queue-visible work may preempt pending slots; displaced slot_5_tail moves to the top of Refill Pool with preempted_from_slot and restore_priority\`
- completion_requires: \`write result, sync STATUS/QUEUE, promote/refill window, sync native projection if available, then run Pre-Response Gate\`
- slash_command_boundary: \`slash commands such as /goal may be used manually by the user but are not framework-controlled queue actions\`
- allowed_output_states: \`final_delivery / decision_blocker / empty_queue_after_refill\`
- stop_authorization_state: \`${stopAuthorizationState}\`
- unauthorized_stop_next_action: \`${unauthorizedStopNextAction}\`
- default_if_gate_fails: \`continue_with_next_tool_or_file_action\`
- batch_boundary_rule: \`completing slot_1_current authorizes queue promotion and next action, not a user report\`
- forbidden_output_states: \`milestone_complete / gate_passed / artifact_refreshed / status_synced / batch_complete / next_task_known\`
- source_intake_runner_mode: \`${sourceMode}\`
- source_intake_batch_id: \`${sourceBatchId}\`
- source_intake_wait_state: \`${sourceWaitState}\`
`;
}

function activeQueueTail() {
  return `
### slot_4_pending

- action: \`run next same-wave source or artifact repair task\`
- status_gap: \`same-wave queue must remain executable after nearer tasks close\`
- done_condition: \`next repair task is selected or a blocker is recorded\`
- writes_to: \`STATUS_PATH; QUEUE_PATH\`
- status_sync: \`queue repair pointer and next same-wave gap updated\`

### slot_5_tail

- action: \`refill next same-wave continuation task\`
- gate_gap: \`active gate may still need evidence, artifact, topology, or readiness repair\`
- done_condition: \`tail task is either restored from a preempted Refill Pool candidate or refilled from normal Refill Pool priority\`
- writes_to: \`QUEUE_PATH; STATUS_PATH\`
- status_sync: \`queue_health and tail refill source updated\`

`;
}

const ACTIVE_QUEUE_TASK_SLOTS = [
  "slot_1_current",
  "slot_2_next",
  "slot_3_pending",
  "slot_4_pending",
  "slot_5_tail",
];

function taskSectionPattern(slot) {
  return new RegExp(`(### ${slot}\\n)([\\s\\S]*?)(?=\\n### |\\n## |$)`, "m");
}

function hasBulletField(section, field) {
  return section.split(/\r?\n/).some((line) => line.trim().startsWith(`- ${field}:`));
}

function enrichTaskSection(slot, section) {
  if (/\bnot_applicable(?:_after_readiness_passed)?\b|\bnone\b/i.test(section.match(/^-\s*action:\s*`?([^\n`]+)`?/m)?.[1] ?? "")) {
    return section;
  }
  const prefix = [];
  if (!hasBulletField(section, "work_id")) {
    prefix.push(`- work_id: \`fixture-${slot}\``);
  }
  if (!hasBulletField(section, "producer_rule")) {
    prefix.push("- producer_rule: `slot_completion_refill`");
  }
  if (!hasBulletField(section, "why_this_matters")) {
    prefix.push("- why_this_matters: `fixture task preserves Queue work-unit contract coverage`");
  }
  if (!hasBulletField(section, "impact_scope")) {
    prefix.push("- impact_scope: `STATUS_PATH; QUEUE_PATH; local run files named by writes_to`");
  }
  if (!hasBulletField(section, "required_receipts")) {
    prefix.push("- required_receipts: `not_applicable`");
  }
  if (!hasBulletField(section, "verification")) {
    prefix.push("- verification: `fixture verifies declared writes_to and status_sync are present`");
  }
  if (!hasBulletField(section, "completion_receipt")) {
    prefix.push("- completion_receipt: `fixture completion receipt recorded in STATUS_PATH or QUEUE_PATH`");
  }
  if (!hasBulletField(section, "failure_route")) {
    prefix.push("- failure_route: `record fixture failure and queue repair work`");
  }
  return prefix.length > 0 ? `${prefix.join("\n")}\n${section}` : section;
}

function withQueueContractFields(queue) {
  return ACTIVE_QUEUE_TASK_SLOTS.reduce((text, slot) => {
    return text.replace(taskSectionPattern(slot), (_match, heading, section) => {
      return `${heading}${enrichTaskSection(slot, section)}`;
    });
  }, queue);
}

function closedQueueTaskSections({ omitSlot5 = false } = {}) {
  return `
### slot_1_current

- action: \`not_applicable_after_readiness_passed\`

### slot_2_next

- action: \`not_applicable_after_readiness_passed\`

### slot_3_pending

- action: \`not_applicable_after_readiness_passed\`

### slot_4_pending

- action: \`not_applicable_after_readiness_passed\`

${omitSlot5 ? "" : `### slot_5_tail

- action: \`not_applicable_after_readiness_passed\`
`}

`;
}

export function planWithRunDir(runDir) {
  return `
## Instance Config

| field | value |
| --- | --- |
| \`run_dir\` | \`${runDir}\` |
`;
}

export const SOURCE_INTAKE_BATCH_FILES = [
  "intake-request.md",
  "retrieval-results.md",
  "candidate-cards.md",
  "capture-manifest.md",
];

export function sourceIntakeWriteTargets({ batchId = "b1", runRoot = "", omit = [] } = {}) {
  const omitted = new Set(omit);
  const prefix = runRoot ? resolve(runRoot, "_cache") : "_cache";
  const targets = SOURCE_INTAKE_BATCH_FILES
    .filter((file) => !omitted.has(file))
    .map((file) => `${prefix}/intake/${batchId}/${file}`);
  if (!omitted.has("excluded.md")) {
    targets.push(`${prefix}/excluded/${batchId}-excluded.md`);
  }
  return targets.join("; ");
}

export function writeRunCacheFiles(runRoot, relPaths) {
  for (const relPath of relPaths) {
    const filePath = resolve(runRoot, "_cache", relPath);
    mkdirSync(resolve(filePath, ".."), { recursive: true });
    writeFileSync(filePath, `fixture for ${relPath}\n`);
  }
}

export function sequentialQueue() {
  return withQueueContractFields(`${activeQueueHeader()}

### slot_1_current

- action: \`review promoted topic reference and sync Wave 1 inventory\`
- trigger: \`main-agent fan-in already promoted accepted material from cache\`
- done_condition: \`accepted inventory, topic seed, status, and queue are synced to the promoted local reference\`
- writes_to: \`seed_topics/_reference/_INDEX.md; seed_topics/t1.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`Accepted Reference Inventory and t1/demo ref counts updated after promotion\`

### slot_2_next

- action: \`backfill affected topic seed\`
- status_gap: \`topic_seed_backfill_status for t1/demo is not current\`
- done_condition: \`seed topic updated\`
- writes_to: \`seed_topics/t1.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`topic_seed_backfill_status, last_seed_update_ref, and question_reconciliation_state updated\`

### slot_3_pending

- action: \`refresh topic evidence summary and question list\`
- trigger: \`accepted_topic_ref_count changed after topic artifact baseline\`
- done_condition: \`artifact updated\`
- writes_to: \`seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md; seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`evidence_summary/question_list produced_at_ref_count and topic_target fields updated\`

${activeQueueTail()}

## Blocked State

- blocked_reason: \`not_applicable\`
- interrupt_condition_matched: \`not_applicable\`
- unblock_trigger: \`not_applicable\`
- safe_to_interrupt_user: \`no\`
`);
}

export function closedQueue({ omitSlot5 = false } = {}) {
  return `${activeQueueHeader({ health: "closed", projection: "unavailable_queue_only" })}

${closedQueueTaskSections({ omitSlot5 })}

## Blocked State

- blocked_reason: \`not_applicable\`
- interrupt_condition_matched: \`not_applicable\`
- unblock_trigger: \`not_applicable\`
- safe_to_interrupt_user: \`no\`
`;
}

export function sourceIntakeQueue(writePath = sourceIntakeWriteTargets(), waitState = "running") {
  return withQueueContractFields(`${activeQueueHeader({ sourceMode: "foreground_subagent_runner", sourceBatchId: "b1", sourceWaitState: waitState })}

### slot_1_current

- action: \`run source intake search batch b1\`
- status_gap: \`source_intake_status requires a running batch before evidence can be promoted\`
- done_condition: \`candidate cards and exclusions are produced or failure is recorded\`
- writes_to: \`${writePath}\`
- status_sync: \`main agent performs fan-in before promotion\`

### slot_2_next

- action: \`review source intake candidate cards and promote accepted material\`
- trigger: \`source_intake_wait_state=fan_in_ready for batch b1\`
- done_condition: \`promote log and status inventory are synced\`
- writes_to: \`seed_topics/_reference/t1-promoted.md; seed_topics/_reference/_INDEX.md\`
- status_sync: \`accepted inventory updated only after promotion\`

### slot_3_pending

- action: \`backfill affected topic seed after promoted reference\`
- status_gap: \`promoted reference affected t1/demo and seed backfill is not current\`
- done_condition: \`topic seed cites promoted local reference path\`
- writes_to: \`seed_topics/t1.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`topic_seed_backfill_status and question_reconciliation_state updated\`

${activeQueueTail()}

## Blocked State

- blocked_reason: \`not_applicable\`
- interrupt_condition_matched: \`not_applicable\`
- unblock_trigger: \`not_applicable\`
- safe_to_interrupt_user: \`no\`
`);
}

export function inlineSourceIntakeQueue(writePath = sourceIntakeWriteTargets(), waitState = "running") {
  return sourceIntakeQueue(writePath, waitState)
    .replace("source_intake_runner_mode: `foreground_subagent_runner`", "source_intake_runner_mode: `inline_main_agent`");
}

export function notApplicableSearchQueue() {
  return sourceIntakeQueue("seed_topics/_reference/t1-direct.md", "not_started")
    .replace("source_intake_runner_mode: `foreground_subagent_runner`", "source_intake_runner_mode: `not_applicable`")
    .replace("source_intake_batch_id: `b1`", "source_intake_batch_id: `not_applicable`");
}

export function directReferenceQueue(action, writesTo = "seed_topics/_reference/t1-direct.md") {
  return withQueueContractFields(`${activeQueueHeader()}

### slot_1_current

- action: \`${action}\`
- trigger: \`already-known local/user-provided source with no retrieval, no search, and no fetch\`
- done_condition: \`reference file and index are updated\`
- writes_to: \`${writesTo}\`
- status_sync: \`inventory updated only when the local source is accepted\`

### slot_2_next

- action: \`backfill affected topic seed\`
- status_gap: \`direct reference affected a topic and seed backfill is not current\`
- done_condition: \`seed topic updated\`
- writes_to: \`seed_topics/t1.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`topic_seed_backfill_status and question_reconciliation_state updated\`

### slot_3_pending

- action: \`refresh topic evidence summary and question list\`
- trigger: \`topic artifact baseline is stale after direct reference landing\`
- done_condition: \`artifact updated\`
- writes_to: \`seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md; seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`evidence_summary/question_list produced_at_ref_count updated\`

${activeQueueTail()}

## Blocked State

- blocked_reason: \`not_applicable\`
- interrupt_condition_matched: \`not_applicable\`
- unblock_trigger: \`not_applicable\`
- safe_to_interrupt_user: \`no\`
`);
}

export function fanInQueue({
  batchId = "b1",
  includeCandidateCardPath = true,
  waitState = "fan_in_ready",
  candidateCardPath = null,
} = {}) {
  const resolvedCandidateCardPath = candidateCardPath
    ?? (includeCandidateCardPath ? `_cache/intake/${batchId}/candidate-cards.md` : "candidate cards from latest intake batch");
  return withQueueContractFields(`${activeQueueHeader({ sourceMode: "not_applicable", sourceBatchId: batchId, sourceWaitState: waitState })}

### slot_1_current

- action: \`fan-in review candidate-cards for batch ${batchId} and promote accepted material\`
- trigger: \`source_intake_wait_state=${waitState} for batch ${batchId}\`
- done_condition: \`review ${resolvedCandidateCardPath}, promote accepted material, close fan-in, and sync status\`
- writes_to: \`seed_topics/_reference/t1-promoted.md; seed_topics/_reference/_INDEX.md; seed_topics/t1.md; _cache/promote-log.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`record promotion outcome and reset active source-intake fields after fan-in closes\`

### slot_2_next

- action: \`backfill affected topic seed after promoted reference\`
- status_gap: \`promoted reference affected t1/demo and seed backfill is not current\`
- done_condition: \`topic seed cites promoted local reference path\`
- writes_to: \`seed_topics/t1.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`topic_seed_backfill_status and question_reconciliation_state updated\`

### slot_3_pending

- action: \`refresh topic evidence summary and question list after promoted reference\`
- trigger: \`topic artifact threshold fired after promoted reference\`
- done_condition: \`artifact updated if trigger fires\`
- writes_to: \`seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md; seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`evidence_summary/question_list produced_at_ref_count updated when artifact is written\`

${activeQueueTail()}

## Blocked State

- blocked_reason: \`not_applicable\`
- interrupt_condition_matched: \`not_applicable\`
- unblock_trigger: \`not_applicable\`
- safe_to_interrupt_user: \`no\`
`);
}

export function terminalCloseoutQueue({ batchId = "b1", waitState = "failed", evidencePath = "_cache/intake/b1/retrieval-results.md" } = {}) {
  return withQueueContractFields(`${activeQueueHeader({ sourceMode: "not_applicable", sourceBatchId: batchId, sourceWaitState: waitState })}

### slot_1_current

- action: \`close ${waitState} source-intake batch ${batchId} and record fan-in outcome\`
- trigger: \`source_intake_wait_state=${waitState} for batch ${batchId}\`
- done_condition: \`review ${evidencePath}, write _cache/promote-log.md, sync status, and reset active queue fields\`
- writes_to: \`_cache/promote-log.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`record ${waitState} source-intake outcome and close fan-in\`

### slot_2_next

- action: \`refill next evidence repair task\`
- status_gap: \`source intake did not produce accepted evidence and queue must remain executable\`
- done_condition: \`queue has executable follow-up\`
- writes_to: \`QUEUE_PATH; STATUS_PATH\`
- status_sync: \`next evidence repair gap recorded and active window refilled\`

### slot_3_pending

- action: \`continue topic artifact refresh after repair\`
- trigger: \`artifact trigger may fire after evidence repair succeeds\`
- done_condition: \`artifact updated if trigger fires\`
- writes_to: \`seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md; seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`artifact produced_at_ref_count fields updated if written\`

${activeQueueTail()}

## Blocked State

- blocked_reason: \`not_applicable\`
- interrupt_condition_matched: \`not_applicable\`
- unblock_trigger: \`not_applicable\`
- safe_to_interrupt_user: \`no\`
`);
}

export function queueSkeletonOutput() {
  const text = readFileSync(new URL("../../../output_templates/QUEUE.md", import.meta.url), "utf8");
  return text.match(/<!-- BEGIN QUEUE OUTPUT -->([\s\S]*?)<!-- END QUEUE OUTPUT -->/)?.[1] ?? "";
}

export function statusSkeletonOutput() {
  const text = readFileSync(new URL("../../../output_templates/STATUS.md", import.meta.url), "utf8");
  return text.match(/<!-- BEGIN STATUS OUTPUT -->([\s\S]*?)<!-- END STATUS OUTPUT -->/)?.[1] ?? "";
}

export function invalidParallelModeQueue() {
  return withQueueContractFields(`${activeQueueHeader({ mode: "parallel_subagent_batch" })}

### slot_1_current

- action: \`land next Wave 1 topic reference\`
- status_gap: \`Wave 1 accepted reference floor for t1/demo is still open\`
- done_condition: \`reference captured and status synced\`
- writes_to: \`seed_topics/_reference/t1-ref.md; seed_topics/_reference/_INDEX.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`Accepted Reference Inventory and t1/demo ref counts updated after promotion\`

### slot_2_next

- action: \`backfill affected topic seed\`
- status_gap: \`topic_seed_backfill_status for t1/demo is not current\`
- done_condition: \`seed topic updated\`
- writes_to: \`seed_topics/t1.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`topic_seed_backfill_status, last_seed_update_ref, and question_reconciliation_state updated\`

### slot_3_pending

- action: \`refresh topic evidence summary and question list\`
- trigger: \`accepted_topic_ref_count changed after topic artifact baseline\`
- done_condition: \`artifact updated\`
- writes_to: \`seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md; seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md; STATUS_PATH; QUEUE_PATH\`
- status_sync: \`evidence_summary/question_list produced_at_ref_count and topic_target fields updated\`

${activeQueueTail()}

## Blocked State

- blocked_reason: \`not_applicable\`
- interrupt_condition_matched: \`not_applicable\`
- unblock_trigger: \`not_applicable\`
- safe_to_interrupt_user: \`no\`
`);
}

export function blockedQueueInvalidInterrupt() {
  return `${activeQueueHeader({ health: "blocked" })}

### slot_1_current

- action: \`not_applicable\`

### slot_2_next

- action: \`not_applicable\`

### slot_3_pending

- action: \`not_applicable\`

### slot_4_pending

- action: \`not_applicable\`

### slot_5_tail

- action: \`not_applicable\`

## Blocked State

- blocked_reason: \`missing credential required for mainline\`
- interrupt_condition_matched: \`credential_gap\`
- unblock_trigger: \`user provides credential\`
- safe_to_interrupt_user: \`yes\`
`;
}

export function assertHasFinding(findings, pattern, label) {
  assert(
    findings.some((finding) => pattern.test(finding.message)),
    `${label}: expected finding matching ${pattern}, got:\n${findings.map((f) => `${f.code} ${f.message}`).join("\n")}`,
  );
}

export function assertNoFindings(findings, label) {
  assert.equal(
    findings.length,
    0,
    `${label}: expected no findings, got:\n${findings.map((f) => `${f.code} ${f.message}`).join("\n")}`,
  );
}

export function runTests(tests) {
  let failures = 0;
  for (const [label, run] of tests) {
    try {
      run();
      console.log(`PASS ${label}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${label}`);
      console.error(error.message);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

export function runIfMain(importMetaUrl, tests) {
  if (process.argv[1] && importMetaUrl === pathToFileURL(process.argv[1]).href) {
    runTests(tests);
  }
}
