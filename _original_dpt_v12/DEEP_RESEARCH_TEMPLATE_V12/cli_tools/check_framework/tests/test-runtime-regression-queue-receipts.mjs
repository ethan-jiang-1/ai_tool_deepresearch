import {
  assertHasFinding,
  assertNoFindings,
  directReferenceQueue,
  join,
  mkdirSync,
  mkdtempSync,
  planWithRunDir,
  queueReceiptFindings,
  resolve,
  rmSync,
  runIfMain,
  sequentialQueue,
  sourceIntakeQueue,
  statusInProgress,
  tmpdir,
  writeFileSync,
} from "./test-runtime-harness.mjs";

function traceWithCheckpoint() {
  return "# Trace\n\n### T001 Wave 0 transition checkpoint\n\nRecorded fixture transition.\n";
}

function withRun(fn) {
  const runRoot = mkdtempSync(join(tmpdir(), "v12-queue-receipts-"));
  try {
    const files = {
      profile: resolve(runRoot, "case.profile.md"),
      plan: resolve(runRoot, "case.plan.md"),
      status: resolve(runRoot, "case.status.md"),
      queue: resolve(runRoot, "case.queue.md"),
      trace: resolve(runRoot, "case.trace.md"),
    };
    fn(runRoot, files);
  } finally {
    rmSync(runRoot, { recursive: true, force: true });
  }
}

function findingsFor(files, { status = statusInProgress(), queue = sequentialQueue(), trace = traceWithCheckpoint(), plan = null } = {}) {
  return queueReceiptFindings(files, {
    plan: plan ?? planWithRunDir(resolve(files.queue, "..")),
    status,
    queue,
    trace,
  });
}

function topicStatus({
  accepted = 1,
  unique = 1,
  evidence = "produced_at_ref_count=0",
  question = "produced_at_ref_count=0",
  evidencePath = "seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md",
  questionPath = "seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md",
} = {}) {
  return `${statusInProgress()}

## Topic Runtime

### Topic t1/demo

- topic_id: \`t1\`
- topic_slug: \`demo\`
- accepted_topic_ref_count: \`${accepted}\`
- topic_unique_ref_count: \`${unique}\`
- topic_seed_backfill_status: \`current\`
- evidence_summary: \`${evidence}\`
- evidence_summary_path: \`${evidencePath}\`
- question_list: \`${question}\`
- question_list_path: \`${questionPath}\`
`;
}

function writeArtifactFiles(runRoot) {
  for (const relPath of [
    "seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md",
    "seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md",
  ]) {
    const fullPath = resolve(runRoot, relPath);
    mkdirSync(resolve(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, `# ${relPath}\n`);
  }
}

function queueWithRefillCandidate(candidateBlock) {
  return `${sequentialQueue()}

## Refill Pool

### Candidate Block

${candidateBlock}
`;
}

const completeCandidate = `- work_id: \`candidate-fixture\`
- candidate: \`repair fixture receipt\`
- priority_class: \`P1_state_or_gate_repair\`
- producer_rule: \`failed_gate_audit\`
- gate_gap: \`fixture gate gap remains open\`
- why_this_matters: \`fixture candidate proves Refill Pool contract fields are checked\`
- impact_scope: \`STATUS_PATH; QUEUE_PATH\`
- required_receipts: \`not_applicable\`
- prerequisite: \`fixture prerequisite\`
- promotion_trigger: \`fixture trigger\`
- done_condition: \`fixture repair completed\`
- verification: \`fixture verification\`
- writes_to: \`STATUS_PATH; QUEUE_PATH\`
- status_sync: \`fixture status synced\`
- completion_receipt: \`fixture receipt\`
- failure_route: \`queue fixture repair\`
- preempted_from_slot: \`not_applicable\`
- restore_priority: \`normal\``;

const artifactCandidate = completeCandidate
  .replace("candidate-fixture", "candidate-artifact-initial-t1")
  .replace("repair fixture receipt", "produce topic evidence summary and question list for t1 demo")
  .replace("P1_state_or_gate_repair", "P4_progressive_artifact_or_seed_backfill")
  .replace("failed_gate_audit", "topic_ref_count_changed")
  .replace("fixture gate gap remains open", "topic t1/demo has topic refs and missing initial artifacts")
  .replace("fixture candidate proves Refill Pool contract fields are checked", "initial artifact files must steer the next Wave 1 action")
  .replace("STATUS_PATH; QUEUE_PATH", "seed_topics/_artifacts/wave1_topics/t1-demo; STATUS_PATH; QUEUE_PATH")
  .replace("not_applicable", "status:topic_unique_ref_count>=1")
  .replace("fixture prerequisite", "topic_unique_ref_count>=1")
  .replace("fixture trigger", "initial artifact threshold fired")
  .replace("fixture repair completed", "evidence-summary.md and question-list.md exist for t1/demo")
  .replace("fixture verification", "artifact files exist and produced_at_ref_count is synced")
  .replace("STATUS_PATH; QUEUE_PATH", "seed_topics/_artifacts/wave1_topics/t1-demo/evidence-summary.md; seed_topics/_artifacts/wave1_topics/t1-demo/question-list.md; STATUS_PATH; QUEUE_PATH")
  .replace("fixture status synced", "evidence_summary/question_list produced_at_ref_count updated")
  .replace("fixture receipt", "artifact_steering_current:t1/demo")
  .replace("queue fixture repair", "record artifact production failure");

function topologyStatus({
  pending = "candidate-a",
  dispositions = "candidate-a -> merge_existing",
} = {}) {
  return statusInProgress(`
## Topology Delta

- pending_topic_candidates: \`${pending}\`
- candidate_dispositions: \`${dispositions}\`
`);
}

function writeHitl2Brief(runRoot) {
  const fullPath = resolve(runRoot, "seed_topics/_artifacts/wave2/human-decision-brief.md");
  mkdirSync(resolve(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, "# HITL2 decision brief\n");
}

function hitl2StatusPendingUser() {
  return statusInProgress(`
## Human Decision Checkpoints

- hitl2_wave2_readiness_decision_status: \`pending_user\`
- human_checkpoint_status: \`pending_user\`
- user_decision: \`not_started\`
- final_report_view: \`not_started\`
- final_output_dir: \`not_started\`
`).replace("- safe_to_interrupt: `no`", "- safe_to_interrupt: `yes`");
}

function hitl2StatusRecordedReady() {
  return statusInProgress(`
## Human Decision Checkpoints

- hitl2_wave2_readiness_decision_status: \`recorded\`
- human_checkpoint_status: \`recorded\`
- user_decision: \`proceed_to_readiness\`
- final_report_view: \`executive_brief\`
- final_output_dir: \`final_executive_brief\`
`);
}

function hitl2CompletionQueue({ pendingUser = false } = {}) {
  let queue = sequentialQueue()
    .replace("- receipt_check_phase: `preflight`", "- receipt_check_phase: `closeout`")
    .replace(
      "- completion_receipt: `fixture completion receipt recorded in STATUS_PATH or QUEUE_PATH`",
      "- completion_receipt: `file:seed_topics/_artifacts/wave2/human-decision-brief.md; hitl2_pending_or_recorded_ready`",
    );
  if (pendingUser) {
    queue = queue
      .replace("- queue_health: `ready`", "- queue_health: `blocked`")
      .replace("- stop_authorization_state: `unauthorized_continue_required`", "- stop_authorization_state: `decision_blocker`")
      .replace("- unauthorized_stop_next_action: `continue slot_1_current from QUEUE Active Queue`", "- unauthorized_stop_next_action: `not_applicable`");
  }
  return queue;
}

export const tests = [
  ["queue receipts: active slots do not require Refill Pool restore metadata", () => withRun((_runRoot, files) => {
    assertNoFindings(findingsFor(files), "active slots omit preempted_from_slot and restore_priority");
  })],

  ["queue receipts: active slot missing producer_rule fails", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- producer_rule: `slot_completion_refill`\n", "");
    assertHasFinding(findingsFor(files, { queue }), /slot_1_current.*producer_rule/, "missing producer_rule");
  })],

  ["queue receipts: invalid producer_rule fails", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- producer_rule: `slot_completion_refill`", "- producer_rule: `not_a_legal_rule`");
    assertHasFinding(findingsFor(files, { queue }), /invalid producer_rule: not_a_legal_rule/, "invalid producer_rule");
  })],

  ["queue receipts: boundary_hook producer_rule passes", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- producer_rule: `slot_completion_refill`", "- producer_rule: `boundary_hook`");
    assertNoFindings(findingsFor(files, { queue }), "boundary_hook producer");
  })],

  ["queue receipts: active slot missing why_this_matters fails", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- why_this_matters: `fixture task preserves Queue work-unit contract coverage`\n", "");
    assertHasFinding(findingsFor(files, { queue }), /slot_1_current.*why_this_matters/, "missing why_this_matters");
  })],

  ["queue receipts: active slot missing impact_scope fails", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- impact_scope: `STATUS_PATH; QUEUE_PATH; local run files named by writes_to`\n", "");
    assertHasFinding(findingsFor(files, { queue }), /slot_1_current.*impact_scope/, "missing impact_scope");
  })],

  ["queue receipts: active slot missing required_receipts fails", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`\n", "");
    assertHasFinding(findingsFor(files, { queue }), /slot_1_current.*required_receipts/, "missing required_receipts");
  })],

  ["queue receipts: active slot missing verification fails", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- verification: `fixture verifies declared writes_to and status_sync are present`\n", "");
    assertHasFinding(findingsFor(files, { queue }), /slot_1_current.*verification/, "missing verification");
  })],

  ["queue receipts: active slot missing completion_receipt fails", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- completion_receipt: `fixture completion receipt recorded in STATUS_PATH or QUEUE_PATH`\n", "");
    assertHasFinding(findingsFor(files, { queue }), /slot_1_current.*completion_receipt/, "missing completion_receipt");
  })],

  ["queue receipts: active slot missing failure_route fails", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- failure_route: `record fixture failure and queue repair work`\n", "");
    assertHasFinding(findingsFor(files, { queue }), /slot_1_current.*failure_route/, "missing failure_route");
  })],

  ["queue receipts: Refill Pool candidate missing contract field fails", () => withRun((_runRoot, files) => {
    const queue = queueWithRefillCandidate(completeCandidate.replace("- producer_rule: `failed_gate_audit`\n", ""));
    assertHasFinding(findingsFor(files, { queue }), /Refill Pool Candidate Block #1.*producer_rule/, "candidate missing producer_rule");
  })],

  ["queue receipts: Refill Pool candidate missing restore metadata fails", () => withRun((_runRoot, files) => {
    const queue = queueWithRefillCandidate(completeCandidate.replace("- restore_priority: `normal`", ""));
    assertHasFinding(findingsFor(files, { queue }), /Refill Pool Candidate Block #1.*restore_priority/, "candidate missing restore_priority");
  })],

  ["queue receipts: Refill Pool candidate missing preempted_from_slot fails", () => withRun((_runRoot, files) => {
    const queue = queueWithRefillCandidate(completeCandidate.replace("- preempted_from_slot: `not_applicable`\n", ""));
    assertHasFinding(findingsFor(files, { queue }), /Refill Pool Candidate Block #1.*preempted_from_slot/, "candidate missing preempted_from_slot");
  })],

  ["queue receipts: work unit without lineage fails", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- trigger: `main-agent fan-in already promoted accepted material from cache`\n", "");
    assertHasFinding(findingsFor(files, { queue }), /slot_1_current.*lineage field/, "missing lineage");
  })],

  ["queue receipts: topic refs with missing artifact steering files fail", () => withRun((_runRoot, files) => {
    const findings = findingsFor(files, { status: topicStatus() });
    assertHasFinding(findings, /missing evidence-summary receipt/, "missing evidence-summary");
    assertHasFinding(findings, /missing question-list receipt/, "missing question-list");
  })],

  ["queue receipts: stale artifact without queued refresh fails", () => withRun((runRoot, files) => {
    writeArtifactFiles(runRoot);
    const status = topicStatus({
      accepted: 3,
      unique: 3,
      evidence: "produced_at_ref_count=1",
      question: "produced_at_ref_count=1",
    });
    const queue = sequentialQueue().replace(/### slot_3_pending[\s\S]*?(?=\n### slot_4_pending)/, `### slot_3_pending

- work_id: \`fixture-slot_3_pending\`
- producer_rule: \`slot_completion_refill\`
- why_this_matters: \`fixture task preserves Queue work-unit contract coverage\`
- impact_scope: \`STATUS_PATH; QUEUE_PATH\`
- required_receipts: \`not_applicable\`
- verification: \`fixture verifies declared writes_to and status_sync are present\`
- completion_receipt: \`fixture completion receipt recorded in STATUS_PATH or QUEUE_PATH\`
- failure_route: \`record fixture failure and queue non-artifact repair work\`
- action: \`review unrelated queue state\`
- trigger: \`unrelated queue maintenance\`
- done_condition: \`unrelated queue state reviewed\`
- writes_to: \`STATUS_PATH; QUEUE_PATH\`
- status_sync: \`unrelated queue state updated\`
`);
    assertHasFinding(findingsFor(files, { status, queue }), /stale by >=2 refs/, "stale artifact");
  })],

  ["queue receipts: missing required receipt before source-intake fails", () => withRun((_runRoot, files) => {
    const queue = sourceIntakeQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `file:missing-receipt.md`");
    assertHasFinding(findingsFor(files, { queue }), /missing required file receipt/, "missing required receipt");
  })],

  ["queue receipts: unknown receipt prefix fails closed", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `mystery:receipt`");
    assertHasFinding(findingsFor(files, { queue }), /unsupported receipt prefix: mystery/, "unknown receipt prefix");
  })],

  ["queue receipts: status equality rejects substring matches", () => withRun((_runRoot, files) => {
    const status = statusInProgress("\n## Setup Ready Transition\n\n- seed_topic_intake_ready: `not_yes`\n");
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `status:seed_topic_intake_ready=yes`");
    assertHasFinding(findingsFor(files, { status, queue }), /missing required STATUS receipt/, "strict status equality");
  })],

  ["queue receipts: status _or_ alternatives pass exactly", () => withRun((_runRoot, files) => {
    const status = statusInProgress("\n## Setup Ready Transition\n\n- seed_topic_intake_ready: `gap_queue_backed`\n");
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `status:seed_topic_intake_ready=yes_or_gap_queue_backed`");
    assertNoFindings(findingsFor(files, { status, queue }), "status alternatives");
  })],

  ["queue receipts: whole-receipt or alternatives pass when either side exists", () => withRun((runRoot, files) => {
    writeFileSync(join(runRoot, "right.md"), "# Right\n");
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `file:missing-left.md or file:right.md`");
    assertNoFindings(findingsFor(files, { queue }), "whole receipt alternatives");

    const failingQueue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `file:missing-left.md or file:missing-right.md`");
    assertHasFinding(findingsFor(files, { queue: failingQueue }), /missing required file receipt: file:missing-left\.md/, "missing all whole receipt alternatives");
  })],

  ["queue receipts: completion_receipt is checked only during closeout", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- completion_receipt: `fixture completion receipt recorded in STATUS_PATH or QUEUE_PATH`", "- completion_receipt: `file:missing-completion.md`");
    assertNoFindings(findingsFor(files, { queue }), "preflight does not check completion receipt");
    const closeoutQueue = queue.replace("- receipt_check_phase: `preflight`", "- receipt_check_phase: `closeout`");
    assertHasFinding(findingsFor(files, { queue: closeoutQueue }), /missing required file receipt: file:missing-completion\.md/, "closeout checks completion receipt");
  })],

  ["queue receipts: active_window_contract_complete passes during closeout", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue()
      .replace("- receipt_check_phase: `preflight`", "- receipt_check_phase: `closeout`")
      .replace("- completion_receipt: `fixture completion receipt recorded in STATUS_PATH or QUEUE_PATH`", "- completion_receipt: `active_window_contract_complete`");
    assertNoFindings(findingsFor(files, { queue }), "active window contract complete");
  })],

  ["queue receipts: direct_reference_exception passes for already-known local source", () => withRun((_runRoot, files) => {
    const queue = directReferenceQueue("land already-known local/user-provided source without retrieval; no retrieval, no search, no fetch")
      .replace("- required_receipts: `not_applicable`", "- required_receipts: `direct_reference_exception`");
    assertNoFindings(findingsFor(files, { queue }), "direct reference exception");
  })],

  ["queue receipts: direct_reference_exception fails for ordinary work", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `direct_reference_exception`");
    assertHasFinding(findingsFor(files, { queue }), /missing direct_reference_exception receipt/, "ordinary work is not direct reference exception");
  })],

  ["queue receipts: topology_delta_disposed requires legal final dispositions", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `topology_delta_disposed`");
    assertNoFindings(findingsFor(files, { status: topologyStatus(), queue }), "legal topology disposition");
  })],

  ["queue receipts: topology_delta_disposed rejects pending disposition", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `topology_delta_disposed`");
    const status = topologyStatus({ dispositions: "candidate-a -> pending" });
    assertHasFinding(findingsFor(files, { status, queue }), /missing topology_delta_disposed receipt/, "pending topology disposition");
  })],

  ["queue receipts: hitl2 pending-user receipt requires decision blocker branch", () => withRun((runRoot, files) => {
    writeHitl2Brief(runRoot);
    const queue = hitl2CompletionQueue({ pendingUser: true });
    assertNoFindings(findingsFor(files, { status: hitl2StatusPendingUser(), queue }), "HITL2 pending-user branch");
  })],

  ["queue receipts: hitl2 recorded receipt requires readiness continuation branch", () => withRun((runRoot, files) => {
    writeHitl2Brief(runRoot);
    const queue = hitl2CompletionQueue();
    assertNoFindings(findingsFor(files, { status: hitl2StatusRecordedReady(), queue }), "HITL2 recorded proceed_to_readiness branch");
  })],

  ["queue receipts: hitl2 receipt rejects pending-user state without blocker", () => withRun((runRoot, files) => {
    writeHitl2Brief(runRoot);
    const queue = hitl2CompletionQueue();
    assertHasFinding(findingsFor(files, { status: hitl2StatusPendingUser(), queue }), /missing hitl2_pending_or_recorded_ready receipt/, "HITL2 pending-user needs blocker");
  })],

  ["queue receipts: hitl2 named receipt requires brief file itself", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue()
      .replace("- receipt_check_phase: `preflight`", "- receipt_check_phase: `closeout`")
      .replace(
        "- completion_receipt: `fixture completion receipt recorded in STATUS_PATH or QUEUE_PATH`",
        "- completion_receipt: `hitl2_pending_or_recorded_ready`",
      );
    assertHasFinding(findingsFor(files, { status: hitl2StatusRecordedReady(), queue }), /missing hitl2_pending_or_recorded_ready receipt/, "HITL2 named receipt requires brief file");
  })],

  ["queue receipts: artifact_steering_current receipt passes when current", () => withRun((runRoot, files) => {
    writeArtifactFiles(runRoot);
    const status = topicStatus({
      accepted: 1,
      unique: 1,
      evidence: "produced_at_ref_count=1",
      question: "produced_at_ref_count=1",
    });
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `artifact_steering_current:t1/demo`");
    assertNoFindings(findingsFor(files, { status, queue }), "artifact steering current");
  })],

  ["queue receipts: artifact_steering_current fails when stale", () => withRun((runRoot, files) => {
    writeArtifactFiles(runRoot);
    const status = topicStatus({
      accepted: 3,
      unique: 3,
      evidence: "produced_at_ref_count=1",
      question: "produced_at_ref_count=1",
    });
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `artifact_steering_current:t1/demo`");
    assertHasFinding(findingsFor(files, { status, queue }), /missing artifact steering current receipt/, "stale artifact steering receipt");
  })],

  ["queue receipts: artifact_refresh_not_due passes for delta one", () => withRun((runRoot, files) => {
    writeArtifactFiles(runRoot);
    const status = topicStatus({
      accepted: 2,
      unique: 2,
      evidence: "produced_at_ref_count=1",
      question: "produced_at_ref_count=1",
    });
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `artifact_refresh_not_due:t1/demo`");
    assertNoFindings(findingsFor(files, { status, queue }), "artifact refresh not due at delta one");
  })],

  ["queue receipts: artifact_refresh_not_due fails when initial artifacts are missing", () => withRun((_runRoot, files) => {
    const status = topicStatus();
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `artifact_refresh_not_due:t1/demo`");
    assertHasFinding(findingsFor(files, { status, queue }), /missing artifact refresh-not-due receipt/, "missing initial artifacts cannot be refresh-not-due");
  })],

  ["queue receipts: artifact_refresh_not_due fails at delta two without refresh repair", () => withRun((runRoot, files) => {
    writeArtifactFiles(runRoot);
    const status = topicStatus({
      accepted: 3,
      unique: 3,
      evidence: "produced_at_ref_count=1",
      question: "produced_at_ref_count=1",
    });
    const queue = sequentialQueue().replace("- required_receipts: `not_applicable`", "- required_receipts: `artifact_refresh_not_due:t1/demo`");
    assertHasFinding(findingsFor(files, { status, queue }), /missing artifact refresh-not-due receipt/, "delta two requires refresh repair");
  })],

  ["queue receipts: closeout can pass through artifact_refresh_not_due", () => withRun((runRoot, files) => {
    writeArtifactFiles(runRoot);
    const status = topicStatus({
      accepted: 2,
      unique: 2,
      evidence: "produced_at_ref_count=1",
      question: "produced_at_ref_count=1",
    });
    const queue = directReferenceQueue("land already-known local/user-provided source without retrieval; no retrieval, no search, and no fetch")
      .replace("- receipt_check_phase: `preflight`", "- receipt_check_phase: `closeout`")
      .replace(
        "- completion_receipt: `fixture completion receipt recorded in STATUS_PATH or QUEUE_PATH`",
        "- completion_receipt: `artifact_refresh_not_due:t1/demo`",
      );
    assertNoFindings(findingsFor(files, { status, queue }), "completion receipt accepts not-due artifact branch");
  })],

  ["queue receipts: queued_artifact_repair passes when artifact repair is queued", () => withRun((_runRoot, files) => {
    const status = topicStatus();
    const queue = sequentialQueue()
      .replace("- required_receipts: `not_applicable`", "- required_receipts: `queued_artifact_repair:t1/demo`")
      .replace("backfill affected topic seed", "produce topic evidence summary and question list for t1 demo");
    assertNoFindings(findingsFor(files, { status, queue }), "queued artifact repair");
  })],

  ["queue receipts: Refill Pool-only initial artifact repair fails", () => withRun((_runRoot, files) => {
    const status = topicStatus();
    const queue = queueWithRefillCandidate(artifactCandidate);
    assertHasFinding(findingsFor(files, { status, queue }), /missing evidence-summary receipt/, "refill-only initial artifact repair is not immediate enough");
    assertHasFinding(findingsFor(files, { status, queue }), /missing question-list receipt/, "refill-only initial artifact repair is not immediate enough");
  })],

  ["queue receipts: wave transition without TRACE checkpoint fails", () => withRun((_runRoot, files) => {
    assertHasFinding(findingsFor(files, { trace: "" }), /TRACE has no checkpoint receipt/, "missing trace checkpoint");
  })],

  ["queue receipts: stale TRACE pointer fails focused receipt check", () => withRun((_runRoot, files) => {
    const trace = "# Trace\n\n### T999 Wave 0 transition checkpoint\n\nDifferent checkpoint.\n";
    assertHasFinding(findingsFor(files, { trace }), /last_trace_entry does not match any TRACE entry label/, "stale trace pointer");
  })],

  ["queue receipts: native task surface cannot be authority", () => withRun((_runRoot, files) => {
    const invalidTruthPhrase = ["source", "of", "truth"].join(" ");
    const queue = sequentialQueue().replace(
      "projection_authority: `QUEUE_PATH owns native projection state; native todo/task/plan is a projection`",
      `projection_authority: \`native todo/task/plan is ${invalidTruthPhrase}\``,
    );
    assertHasFinding(findingsFor(files, { queue }), /source-of-truth wording/, "native authority");
  })],

  ["queue receipts: default search escalated to Exa fails", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace(
      "review promoted topic reference and sync Wave 1 inventory",
      "run Exa search for next topic reference",
    );
    assertHasFinding(findingsFor(files, { queue }), /mentions Exa without explicit user selection/, "unjustified Exa");
  })],

  ["queue receipts: explicit or justified Exa selection passes", () => withRun((_runRoot, files) => {
    const queue = sequentialQueue().replace(
      "review promoted topic reference and sync Wave 1 inventory",
      "run Exa search because user explicitly selected Exa search for this source-intake batch",
    );
    assertNoFindings(findingsFor(files, { queue }), "explicit Exa");
  })],
];

runIfMain(import.meta.url, tests);
