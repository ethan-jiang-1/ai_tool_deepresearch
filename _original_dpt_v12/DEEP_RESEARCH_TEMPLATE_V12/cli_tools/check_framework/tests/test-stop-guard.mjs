import assert from "node:assert/strict";
import {
  join,
  mkdirSync,
  mkdtempSync,
  rmSync,
  runIfMain,
  sequentialQueue,
  statusCompleted,
  statusInProgress,
  tmpdir,
  writeFileSync,
  closedQueue,
  activeQueueHeader,
} from "./test-runtime-harness.mjs";
import { stopDecisionForEvent } from "../../stop_guard/claude-stop-guard.mjs";

function hitl2PendingProfile() {
  return `
## Human Decision Checkpoints

| checkpoint | timing | status | user input | consequence |
| --- | --- | --- | --- | --- |
| \`HITL2_wave2_readiness_decision\` | \`after Wave 2 synthesis assessment\` | \`pending_user\` | \`final report view pending\` | \`waiting for explicit HITL2 decision\` |

## HITL2 Wave 2 Readiness Decision

- hitl2_checkpoint_status: \`pending_user\`
- answerability_class: \`ready_substantive\`
- human_checkpoint_status: \`pending_user\`
- final_report_view: \`not_started\`
- custom_final_report_view_label: \`not_applicable\`
- custom_final_report_view_slug: \`not_applicable\`
- final_output_dir: \`not_started\`
- repair_recommendation: \`user must choose final report view or repair/rerun\`
- user_decision: \`not_started\`
- hitl2_decision_brief_path: \`/tmp/v12-hitl2/seed_topics/_artifacts/wave2/human-decision-brief.md\`
`;
}

function hitl2PendingStatus() {
  return statusInProgress(`
## Human Decision Checkpoints

- hitl2_wave2_readiness_decision_status: \`pending_user\`
- answerability_class: \`ready_substantive\`
- human_checkpoint_status: \`pending_user\`
- final_report_view: \`not_started\`
- custom_final_report_view_label: \`not_applicable\`
- custom_final_report_view_slug: \`not_applicable\`
- final_output_dir: \`not_started\`
- repair_recommendation: \`user must choose final report view or repair/rerun\`
- user_decision: \`not_started\`
- hitl2_decision_brief_path: \`/tmp/v12-hitl2/seed_topics/_artifacts/wave2/human-decision-brief.md\`

## Wave 2 Human Decision Brief

- brief_path: \`/tmp/v12-hitl2/seed_topics/_artifacts/wave2/human-decision-brief.md\`
- answerability_class: \`ready_substantive\`
- human_checkpoint_status: \`pending_user\`
- final_report_view: \`not_started\`
- custom_final_report_view_label: \`not_applicable\`
- custom_final_report_view_slug: \`not_applicable\`
- final_output_dir: \`not_started\`
- repair_recommendation: \`user must choose final report view or repair/rerun\`
- user_decision: \`not_started\`
`)
    .replace("- state: `in_progress`", "- state: `blocked`")
    .replace("- current_wave: `Wave 1`", "- current_wave: `Wave 2`")
    .replace("- current_gate: `wave0_complete`", "- current_gate: `wave2_complete`")
    .replace("- next_gate: `wave1_complete`", "- next_gate: `readiness_passed`")
    .replace("- blocking_issue: `not_applicable`", "- blocking_issue: `HITL2 Wave 2 readiness decision pending_user`")
    .replace("- safe_to_interrupt: `no`", "- safe_to_interrupt: `yes`")
    .replace("- stop_authorization_state: `unauthorized_continue_required`", "- stop_authorization_state: `decision_blocker`")
    .replace("- unauthorized_stop_next_action: `continue slot_1_current from QUEUE Active Queue`", "- unauthorized_stop_next_action: `not_applicable`");
}

function hitl2BlockedQueue() {
  return `${activeQueueHeader({
    health: "blocked",
    stopAuthorizationState: "decision_blocker",
    unauthorizedStopNextAction: "not_applicable",
  })}

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

- blocked_reason: \`HITL2 Wave 2 readiness decision pending_user\`
- interrupt_condition_matched: \`mainline_blockage\`
- unblock_trigger: \`user chooses final report view, repair/rerun, or stop blocked\`
- safe_to_interrupt_user: \`yes\`
`;
}

function writeRun(root, { profile = "# profile\n", status = statusInProgress(), queue = sequentialQueue() } = {}) {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "case.profile.md"), profile);
  writeFileSync(join(root, "case.plan.md"), "# plan\n");
  writeFileSync(join(root, "case.status.md"), status);
  writeFileSync(join(root, "case.queue.md"), queue);
  writeFileSync(join(root, "case.trace.md"), "# trace\n");
}

export const tests = [
  [
    "Stop guard blocks incomplete V12-looking run root",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-stop-guard-"));
      try {
        mkdirSync(join(runRoot, "_framework"), { recursive: true });
        writeFileSync(join(runRoot, "case.plan.md"), "# incomplete plan\n");
        const decision = stopDecisionForEvent({ cwd: runRoot });
        assert.equal(decision.decision, "block");
        assert.match(decision.reason, /could not identify exactly one complete V12 run root/);
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "Stop guard allows ordinary non-run directory",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-stop-guard-non-run-"));
      try {
        writeFileSync(join(runRoot, "notes.md"), "# ordinary notes\n");
        const decision = stopDecisionForEvent({ cwd: runRoot });
        assert.equal(decision.decision, "approve");
        assert.match(decision.reason, /found no complete run control-file set/);
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "Stop guard blocks ambiguous parent directory with multiple run roots",
    () => {
      const parent = mkdtempSync(join(tmpdir(), "v12-stop-guard-parent-"));
      try {
        writeRun(join(parent, "run-a"));
        writeRun(join(parent, "run-b"));
        const decision = stopDecisionForEvent({ cwd: parent });
        assert.equal(decision.decision, "block");
        assert.match(decision.reason, /could not identify exactly one complete V12 run root/);
      } finally {
        rmSync(parent, { recursive: true, force: true });
      }
    },
  ],
  [
    "Stop guard prefers DEEP_RESEARCH_RUN_ROOT over event cwd",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-stop-guard-"));
      const nonRun = mkdtempSync(join(tmpdir(), "v12-stop-guard-non-run-"));
      const previous = process.env.DEEP_RESEARCH_RUN_ROOT;
      try {
        writeRun(runRoot);
        process.env.DEEP_RESEARCH_RUN_ROOT = runRoot;
        const decision = stopDecisionForEvent({ cwd: nonRun });
        assert.equal(decision.decision, "block");
        assert.match(decision.reason, /Continue: continue slot_1_current from QUEUE Active Queue/);
      } finally {
        if (previous === undefined) {
          delete process.env.DEEP_RESEARCH_RUN_ROOT;
        } else {
          process.env.DEEP_RESEARCH_RUN_ROOT = previous;
        }
        rmSync(runRoot, { recursive: true, force: true });
        rmSync(nonRun, { recursive: true, force: true });
      }
    },
  ],
  [
    "Stop guard prefers DEEP_RESEARCH_RUN_ROOT over event run_root",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-stop-guard-"));
      const wrongRun = mkdtempSync(join(tmpdir(), "v12-stop-guard-wrong-"));
      const previous = process.env.DEEP_RESEARCH_RUN_ROOT;
      try {
        writeRun(runRoot);
        writeRun(wrongRun, { status: statusCompleted(), queue: closedQueue() });
        process.env.DEEP_RESEARCH_RUN_ROOT = runRoot;
        const decision = stopDecisionForEvent({ run_root: wrongRun });
        assert.equal(decision.decision, "block");
        assert.match(decision.reason, /Continue: continue slot_1_current from QUEUE Active Queue/);
      } finally {
        if (previous === undefined) {
          delete process.env.DEEP_RESEARCH_RUN_ROOT;
        } else {
          process.env.DEEP_RESEARCH_RUN_ROOT = previous;
        }
        rmSync(runRoot, { recursive: true, force: true });
        rmSync(wrongRun, { recursive: true, force: true });
      }
    },
  ],
  [
    "Stop guard blocks unauthorized stop and names next action",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-stop-guard-"));
      try {
        writeRun(runRoot);
        const decision = stopDecisionForEvent({ cwd: runRoot });
        assert.equal(decision.decision, "block");
        assert.match(decision.reason, /Continue: continue slot_1_current from QUEUE Active Queue/);
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "Stop guard allows final delivery",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-stop-guard-"));
      try {
        writeRun(runRoot, { status: statusCompleted(), queue: closedQueue() });
        const decision = stopDecisionForEvent({ cwd: runRoot });
        assert.equal(decision.decision, "approve");
        assert.match(decision.reason, /final_delivery/);
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "Stop guard blocks fake HITL2 blocker",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-stop-guard-"));
      try {
        const status = hitl2PendingStatus().replace("hitl2_wave2_readiness_decision_status: `pending_user`", "hitl2_wave2_readiness_decision_status: `not_started`");
        writeRun(runRoot, { profile: hitl2PendingProfile(), status, queue: hitl2BlockedQueue() });
        const decision = stopDecisionForEvent({ cwd: runRoot });
        assert.equal(decision.decision, "block");
        assert.match(decision.reason, /Deep Research stop not authorized/);
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "Stop guard allows HITL2 pending-user blocker",
    () => {
      const runRoot = mkdtempSync(join(tmpdir(), "v12-stop-guard-"));
      try {
        writeRun(runRoot, { profile: hitl2PendingProfile(), status: hitl2PendingStatus(), queue: hitl2BlockedQueue() });
        const decision = stopDecisionForEvent({ cwd: runRoot });
        assert.equal(decision.decision, "approve");
        assert.match(decision.reason, /decision_blocker/);
      } finally {
        rmSync(runRoot, { recursive: true, force: true });
      }
    },
  ],
  [
    "Stop guard allows stop_hook_active loop prevention",
    () => {
      const decision = stopDecisionForEvent({ stop_hook_active: true, cwd: "/does/not/matter" });
      assert.equal(decision.decision, "approve");
      assert.match(decision.reason, /stop_hook_active=true/);
    },
  ],
];

runIfMain(import.meta.url, tests);
