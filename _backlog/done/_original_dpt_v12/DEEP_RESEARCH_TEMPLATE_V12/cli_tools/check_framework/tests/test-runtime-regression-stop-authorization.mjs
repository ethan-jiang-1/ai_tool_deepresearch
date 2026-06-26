import {
  assertHasFinding,
  assertNoFindings,
  activeQueueHeader,
  closedQueue,
  preResponseGateFindings,
  runIfMain,
  sequentialQueue,
  statusCompleted,
  statusInProgress,
  stopAuthorizationFindings,
} from "./test-runtime-harness.mjs";

function findings(texts) {
  return [
    ...stopAuthorizationFindings(texts),
    ...preResponseGateFindings(texts),
  ];
}

function replaceAll(text, replacements) {
  let next = text;
  for (const [from, to] of replacements) {
    next = next.replace(from, to);
  }
  return next;
}

function administrativeOnlyQueue() {
  return `${activeQueueHeader()}

### slot_1_current

- action: \`record administrative closeout marker\`
- trigger: \`administrative marker requested\`
- done_condition: \`administrative marker recorded\`
- writes_to: \`STATUS_PATH; QUEUE_PATH\`
- status_sync: \`administrative marker synced\`

### slot_2_next

- action: \`record queue housekeeping marker\`
- trigger: \`housekeeping marker requested\`
- done_condition: \`housekeeping marker recorded\`
- writes_to: \`STATUS_PATH; QUEUE_PATH\`
- status_sync: \`housekeeping marker synced\`

### slot_3_pending

- action: \`record status housekeeping marker\`
- trigger: \`status marker requested\`
- done_condition: \`status marker recorded\`
- writes_to: \`STATUS_PATH; QUEUE_PATH\`
- status_sync: \`status marker synced\`

### slot_4_pending

- action: \`record next housekeeping marker\`
- trigger: \`next marker requested\`
- done_condition: \`next marker recorded\`
- writes_to: \`STATUS_PATH; QUEUE_PATH\`
- status_sync: \`next marker synced\`

### slot_5_tail

- action: \`record tail housekeeping marker\`
- trigger: \`tail marker requested\`
- done_condition: \`tail marker recorded\`
- writes_to: \`STATUS_PATH; QUEUE_PATH\`
- status_sync: \`tail marker synced\`

## Blocked State

- blocked_reason: \`not_applicable\`
- interrupt_condition_matched: \`not_applicable\`
- unblock_trigger: \`not_applicable\`
- safe_to_interrupt_user: \`no\`
`;
}

function hitl2PendingProfile() {
  return `
## Human Decision Checkpoints

| checkpoint | timing | status | user input | consequence |
| --- | --- | --- | --- | --- |
| \`HITL2_wave2_readiness_decision\` | \`after Wave 2 synthesis assessment\` | \`pending_user\` | \`final report view, repair/rerun, or stop blocked pending\` | \`waiting for explicit HITL2 decision\` |

## HITL2 Wave 2 Readiness Decision

- hitl2_checkpoint_status: \`pending_user\`
- answerability_class: \`ready_substantive\`
- human_checkpoint_status: \`pending_user\`
- final_report_view: \`not_started\`
- custom_final_report_view_label: \`not_applicable\`
- custom_final_report_view_slug: \`not_applicable\`
- final_output_dir: \`not_started\`
- repair_recommendation: \`evidence is ready; user must choose final view or repair/rerun\`
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
- repair_recommendation: \`evidence is ready; user must choose final view or repair/rerun\`
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
- repair_recommendation: \`evidence is ready; user must choose final view or repair/rerun\`
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

export const tests = [
  [
    "wave0 passed with executable queue and safe interrupt fails",
    () => {
      const status = statusInProgress().replace("- safe_to_interrupt: `no`", "- safe_to_interrupt: `yes`");
      const texts = { status, queue: sequentialQueue(), trace: "" };
      assertHasFinding(findings(texts), /safe_to_interrupt=yes is allowed only/, "wave0 passed with executable queue and safe interrupt fails");
    },
  ],
  [
    "pseudo next gate wave1_start fails",
    () => {
      const status = statusInProgress().replace("- next_gate: `wave1_complete`", "- next_gate: `wave1_start`");
      const texts = { status, queue: sequentialQueue(), trace: "" };
      assertHasFinding(findings(texts), /next_gate has invalid or missing enum value: wave1_start/, "pseudo next gate wave1_start fails");
    },
  ],
  [
    "current gap none with executable queue fails",
    () => {
      const status = statusInProgress()
        .replace("- task_projection_state: `active`", "- current_gap_or_blocker: `none`\n- task_projection_state: `active`");
      const texts = { status, queue: sequentialQueue(), trace: "" };
      assertHasFinding(findings(texts), /current_gap_or_blocker.*cannot be none/, "current gap none with executable queue fails");
    },
  ],
  [
    "gate pass without post-gate continuation fails",
    () => {
      const texts = { status: statusInProgress(), queue: administrativeOnlyQueue(), trace: "" };
      assertHasFinding(findings(texts), /Wave 0 post-gate continuation requires/, "gate pass without post-gate continuation fails");
    },
  ],
  [
    "continue or adjust direction queue task fails",
    () => {
      const queue = sequentialQueue().replace("review promoted topic reference and sync Wave 1 inventory", "continue or adjust direction?");
      const texts = { status: statusInProgress(), queue, trace: "" };
      assertHasFinding(findings(texts), /forbidden routine user-output work.*continue or adjust direction/, "continue or adjust direction queue task fails");
    },
  ],
  [
    "fan-in candidate-card recap response fails before stop authorization",
    () => {
      const response = "※ recap: Topic 02 returned 44 EXA candidate cards waiting for review. 候选卡片等待审查。";
      const texts = { status: statusInProgress(), queue: sequentialQueue(), trace: "", response };
      assertHasFinding(findings(texts), /proposed assistant response is forbidden.*assistant recap marker/, "fan-in candidate-card recap response fails before stop authorization");
    },
  ],
  [
    "fixed unauthorized continuation passes",
    () => {
      const texts = { status: statusInProgress(), queue: sequentialQueue(), trace: "" };
      assertNoFindings(findings(texts), "fixed unauthorized continuation passes");
    },
  ],
  [
    "final delivery allows stop",
    () => {
      const texts = { status: statusCompleted(), queue: closedQueue(), trace: "" };
      assertNoFindings(findings(texts), "final delivery allows stop");
    },
  ],
  [
    "HITL2 blocker without pending-user state fails",
    () => {
      const status = hitl2PendingStatus().replace("hitl2_wave2_readiness_decision_status: `pending_user`", "hitl2_wave2_readiness_decision_status: `not_started`");
      const texts = { profile: hitl2PendingProfile(), status, queue: hitl2BlockedQueue(), trace: "" };
      assertHasFinding(findings(texts), /HITL2 decision_blocker requires human-decision brief path plus PROFILE\/STATUS pending_user state/, "HITL2 blocker without pending-user state fails");
    },
  ],
  [
    "HITL2 pending-user blocker allows stop",
    () => {
      const texts = { profile: hitl2PendingProfile(), status: hitl2PendingStatus(), queue: hitl2BlockedQueue(), trace: "" };
      assertNoFindings(findings(texts), "HITL2 pending-user blocker allows stop");
    },
  ],
];

runIfMain(import.meta.url, tests);
