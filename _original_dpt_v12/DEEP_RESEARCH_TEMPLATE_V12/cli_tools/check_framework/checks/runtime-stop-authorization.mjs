import { Finding } from "../lib/finding.mjs";
import { firstMarkdownTable, hierarchicalSectionText, parseBulletField } from "../lib/markdown.mjs";
import {
  ACTIVE_QUEUE_TASK_SLOTS,
  CLOSED_TASK_VALUES,
  INTERRUPT_CONDITION_VALUES,
  NEXT_GATE_VALUES,
  STOP_AUTHORIZATION_STATES,
} from "../contracts/constants.mjs";
import { readinessPassed } from "./runtime-readiness.mjs";
import {
  activeQueueSection,
  blockedStateSection,
  cleanField,
  isMeaningful,
  operatorViewSection,
  taskAction,
  taskSection,
} from "./runtime-shared.mjs";

function closedTaskValue(value) {
  return CLOSED_TASK_VALUES.has(cleanField(value).toLowerCase());
}

function executableAction(value) {
  const cleaned = cleanField(value);
  return isMeaningful(cleaned) && !closedTaskValue(cleaned) && !cleaned.includes("<") && !cleaned.includes(">");
}

export function executableQueueActions(queue) {
  return ACTIVE_QUEUE_TASK_SLOTS
    .map((slot) => ({ slot, action: cleanField(taskAction(queue, slot)) }))
    .filter((entry) => executableAction(entry.action));
}

export function finalDeliveryAuthorized(status, queue) {
  return readinessPassed(status)
    && cleanField(parseBulletField(status, "current_gate")) === "readiness_passed"
    && cleanField(parseBulletField(status, "next_gate")) === "none"
    && cleanField(parseBulletField(queue, "queue_health")) === "closed"
    && cleanField(parseBulletField(queue, "closure_reason")) === "readiness_passed";
}

function tableCell(row, candidateNames) {
  for (const [key, value] of Object.entries(row)) {
    const normalized = cleanField(key).toLowerCase().replace(/[\s-]+/g, "_");
    if (candidateNames.includes(normalized)) {
      return value;
    }
  }
  return null;
}

function hitl2CheckpointRowStatus(profile) {
  const table = firstMarkdownTable(hierarchicalSectionText(profile, "Human Decision Checkpoints"));
  const row = table.rows.find((candidate) => cleanField(tableCell(candidate, ["checkpoint"])).includes("HITL2_wave2_readiness_decision"));
  return cleanField(tableCell(row ?? {}, ["status"]));
}

function concreteBriefPath(value) {
  const cleaned = cleanField(value);
  return isMeaningful(cleaned) && !cleaned.includes("<") && !cleaned.includes(">") && /human-decision-brief\.md$/i.test(cleaned);
}

function hitl2BlockerText(status, queue) {
  const blocked = blockedStateSection(queue);
  return [
    parseBulletField(blocked, "blocked_reason"),
    parseBulletField(blocked, "unblock_trigger"),
    parseBulletField(status, "blocking_issue"),
  ].map((value) => cleanField(value)).join(" ");
}

function isHitl2DecisionBlocker(status, queue) {
  return /\b(HITL2|Wave\s*2\s+readiness|human[- ]decision|final report view|repair\/rerun|repair_and_rerun|stop_blocked)\b/i
    .test(hitl2BlockerText(status, queue));
}

function hitl2PendingUserReady(status, queue, profile) {
  if (!isHitl2DecisionBlocker(status, queue)) {
    return true;
  }
  const statusCheckpoint = hierarchicalSectionText(status, "Human Decision Checkpoints");
  const statusBrief = hierarchicalSectionText(status, "Wave 2 Human Decision Brief");
  const profileHitl2 = hierarchicalSectionText(profile, "HITL2 Wave 2 Readiness Decision");
  const profileCheckpointStatus = cleanField(parseBulletField(profileHitl2, "hitl2_checkpoint_status"));
  const statusDecisionStatus = cleanField(parseBulletField(statusCheckpoint, "hitl2_wave2_readiness_decision_status"));
  const statusHumanCheckpoint = cleanField(parseBulletField(statusBrief, "human_checkpoint_status")
    || parseBulletField(statusCheckpoint, "human_checkpoint_status"));
  const profileRowStatus = hitl2CheckpointRowStatus(profile);
  const briefPath = parseBulletField(statusBrief, "brief_path")
    || parseBulletField(statusCheckpoint, "hitl2_decision_brief_path")
    || parseBulletField(profileHitl2, "hitl2_decision_brief_path");
  const active = activeQueueSection(queue);
  return profileCheckpointStatus === "pending_user"
    && statusDecisionStatus === "pending_user"
    && statusHumanCheckpoint === "pending_user"
    && profileRowStatus === "pending_user"
    && cleanField(parseBulletField(active, "stop_authorization_state")) === "decision_blocker"
    && cleanField(parseBulletField(active, "unauthorized_stop_next_action")) === "not_applicable"
    && concreteBriefPath(briefPath);
}

export function concreteDecisionBlocker(status, queue, profile = "") {
  if (cleanField(parseBulletField(queue, "queue_health")) !== "blocked") {
    return false;
  }
  const blocked = blockedStateSection(queue);
  const blockedReason = parseBulletField(blocked, "blocked_reason");
  const interrupt = parseBulletField(blocked, "interrupt_condition_matched");
  const unblockTrigger = parseBulletField(blocked, "unblock_trigger");
  const safeToInterrupt = parseBulletField(blocked, "safe_to_interrupt_user");
  const blockingIssue = parseBulletField(status, "blocking_issue");
  return isMeaningful(blockedReason)
    && isMeaningful(unblockTrigger)
    && isMeaningful(blockingIssue)
    && INTERRUPT_CONDITION_VALUES.has(cleanField(interrupt))
    && cleanField(interrupt) !== "not_applicable"
    && cleanField(safeToInterrupt) === "yes"
    && hitl2PendingUserReady(status, queue, profile);
}

export function emptyQueueAfterRefillAuthorized(status, queue) {
  const active = activeQueueSection(queue);
  const outputState = parseBulletField(active, "current_output_state")
    || parseBulletField(queue, "current_output_state")
    || parseBulletField(status, "current_output_state");
  if (cleanField(outputState) !== "empty_queue_after_refill") {
    return false;
  }
  const text = `${active}\n${operatorViewSection(status)}`;
  const hasNoExecutable = /\b(no executable queue item|no executable work|queue exhausted)\b/i.test(text);
  const hasDocumentedAttempts = /\b(refill|suspend|archive|redirect)\b/i.test(text)
    && /\b(attempt|attempted|documented|tried|after)\b/i.test(text);
  return hasNoExecutable && hasDocumentedAttempts;
}

function expectedStopState(status, queue, profile) {
  if (finalDeliveryAuthorized(status, queue)) {
    return "final_delivery";
  }
  if (concreteDecisionBlocker(status, queue, profile)) {
    return "decision_blocker";
  }
  if (emptyQueueAfterRefillAuthorized(status, queue)) {
    return "empty_queue_after_refill";
  }
  return "unauthorized_continue_required";
}

function declaredStopState(status, queue) {
  const active = activeQueueSection(queue);
  const operator = operatorViewSection(status);
  return cleanField(parseBulletField(active, "stop_authorization_state")
    || parseBulletField(operator, "stop_authorization_state")
    || parseBulletField(status, "stop_authorization_state"));
}

function declaredNextAction(status, queue) {
  const active = activeQueueSection(queue);
  const operator = operatorViewSection(status);
  return cleanField(parseBulletField(active, "unauthorized_stop_next_action")
    || parseBulletField(operator, "unauthorized_stop_next_action")
    || parseBulletField(status, "unauthorized_stop_next_action"));
}

function concreteNextAction(value) {
  const cleaned = cleanField(value);
  return isMeaningful(cleaned) && !cleaned.includes("<") && !cleaned.includes(">");
}

function resumeSafeValue(status) {
  return cleanField(parseBulletField(status, "safe_to_interrupt"));
}

function statusOrQueueGapFields(status, queue) {
  return [
    ["STATUS Operator View.current_gap_or_blocker", parseBulletField(operatorViewSection(status), "current_gap_or_blocker")],
    ["QUEUE Operator View.current_gap_or_blocker", parseBulletField(queue, "current_gap_or_blocker")],
  ];
}

function postGateContinuationExpectation(currentGate) {
  if (currentGate === "wave0_complete") {
    return {
      label: "Wave 0 post-gate continuation",
      pattern: /\b(wave\s*1|wave1|topic|topic-unique|source floor|artifact|evidence summary|question[- ]list|audit)\b/i,
    };
  }
  if (currentGate === "wave1_complete") {
    return {
      label: "Wave 1 post-gate continuation",
      pattern: /\b(wave\s*2|wave2|synthesis|cross-topic|answerability|HITL2|human decision brief)\b/i,
    };
  }
  if (currentGate === "wave2_complete") {
    return {
      label: "Wave 2 post-gate continuation",
      pattern: /\b(HITL2|human decision|decision brief|answerability|readiness|final report view|repair_and_rerun|request_view_revision)\b/i,
    };
  }
  return null;
}

export function stopAuthorizationSnapshot(texts) {
  const status = texts.status ?? "";
  const queue = texts.queue ?? "";
  const profile = texts.profile ?? "";
  const actions = executableQueueActions(queue);
  const expectedState = expectedStopState(status, queue, profile);
  const declaredState = declaredStopState(status, queue);
  const declaredAction = declaredNextAction(status, queue);
  const nextAction = declaredAction || actions[0]?.action || "read QUEUE_PATH -> Active Queue and continue slot_1_current";
  return {
    expectedState,
    declaredState,
    declaredAction,
    authorized: expectedState !== "unauthorized_continue_required",
    executableActions: actions,
    nextAction,
  };
}

export function stopAuthorizationFindings(texts) {
  const findings = [];
  const status = texts.status ?? "";
  const queue = texts.queue ?? "";
  const snapshot = stopAuthorizationSnapshot(texts);
  const queueHealth = cleanField(parseBulletField(queue, "queue_health"));
  const state = cleanField(parseBulletField(status, "state"));
  const currentGate = cleanField(parseBulletField(status, "current_gate"));
  const nextGate = cleanField(parseBulletField(status, "next_gate"));
  const safeToInterrupt = resumeSafeValue(status);

  if (!nextGate || !NEXT_GATE_VALUES.has(nextGate)) {
    findings.push(new Finding("E006", `STATUS next_gate has invalid or missing enum value: ${nextGate || "missing"}`));
  }

  if (!snapshot.declaredState) {
    findings.push(new Finding("E014", "User-Visible Stop Authorization requires stop_authorization_state in STATUS Operator View or QUEUE Active Queue"));
  } else if (!STOP_AUTHORIZATION_STATES.has(snapshot.declaredState)) {
    findings.push(new Finding("E014", `stop_authorization_state has invalid value: ${snapshot.declaredState}`));
  } else if (snapshot.declaredState !== snapshot.expectedState) {
    findings.push(new Finding("E014", `stop_authorization_state must be ${snapshot.expectedState}; found ${snapshot.declaredState}`));
  }

  if (snapshot.expectedState === "unauthorized_continue_required") {
    if (!concreteNextAction(snapshot.declaredAction)) {
      findings.push(new Finding("E014", "unauthorized_continue_required requires concrete unauthorized_stop_next_action"));
    }
    if (cleanField(safeToInterrupt).startsWith("yes")) {
      findings.push(new Finding("E014", "safe_to_interrupt=yes is allowed only for final_delivery, decision_blocker, or empty_queue_after_refill"));
    }
  }

  if (snapshot.expectedState !== "unauthorized_continue_required" && safeToInterrupt && !cleanField(safeToInterrupt).startsWith("yes")) {
    findings.push(new Finding("E014", `authorized stop state ${snapshot.expectedState} must sync Resume Checkpoint.safe_to_interrupt=yes`));
  }

  if (queueHealth === "blocked" && isHitl2DecisionBlocker(status, queue) && !hitl2PendingUserReady(status, queue, texts.profile ?? "")) {
    findings.push(new Finding("E014", "HITL2 decision_blocker requires human-decision brief path plus PROFILE/STATUS pending_user state before user-visible stopping"));
  }

  if (state === "in_progress" && ["ready", "thin"].includes(queueHealth) && snapshot.executableActions.length > 0) {
    for (const [label, value] of statusOrQueueGapFields(status, queue)) {
      if (/^none\b/i.test(cleanField(value))) {
        findings.push(new Finding("E014", `${label} cannot be none while state=in_progress, queue_health=${queueHealth}, and executable queue work exists`));
      }
    }
  }

  const continuation = postGateContinuationExpectation(currentGate);
  if (continuation && !snapshot.authorized && ["ready", "thin"].includes(queueHealth)) {
    const workText = snapshot.executableActions.map((entry) => `${entry.slot}: ${entry.action}\n${taskSection(queue, entry.slot)}`).join("\n");
    const traceText = texts.trace ?? "";
    const hasContinuation = continuation.pattern.test(workText) || continuation.pattern.test(traceText);
    if (!hasContinuation) {
      findings.push(new Finding("E014", `${continuation.label} requires next-wave/HITL2 continuation work before stopping or reporting`));
    }
  }

  return findings;
}
