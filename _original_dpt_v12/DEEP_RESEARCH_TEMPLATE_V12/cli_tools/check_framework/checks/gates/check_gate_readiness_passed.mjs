import { readinessFindings, traceContinuityFindings } from "../runtime-readiness.mjs";
import { ACTIVE_QUEUE_TASK_SLOTS, CLOSED_TASK_VALUES } from "../../contracts/constants.mjs";
import { Finding } from "../../lib/finding.mjs";
import { parseBulletField } from "../../lib/markdown.mjs";
import { activeQueueSection, cleanField, taskAction, taskSection } from "../runtime-shared.mjs";
import { checkStandaloneGate } from "./check_gate_common.mjs";

function readinessClosedQueueFindings(queue) {
  const findings = [];
  const active = activeQueueSection(queue);
  if (!active) {
    return [new Finding("E007", "readiness_passed requires QUEUE ## Active Queue section")];
  }

  const health = cleanField(parseBulletField(active, "queue_health"));
  if (health !== "closed") {
    findings.push(new Finding("E007", `readiness_passed requires QUEUE queue_health=closed; found ${health || "missing"}`));
  }

  const closureReason = cleanField(parseBulletField(active, "closure_reason"));
  if (closureReason !== "readiness_passed") {
    findings.push(new Finding("E007", `readiness_passed requires QUEUE closure_reason=readiness_passed; found ${closureReason || "missing"}`));
  }

  for (const taskName of ACTIVE_QUEUE_TASK_SLOTS) {
    const section = taskSection(queue, taskName);
    if (!section) {
      findings.push(new Finding("E007", `readiness_passed requires closed QUEUE ${taskName} section`));
      continue;
    }
    const action = cleanField(taskAction(queue, taskName));
    if (!CLOSED_TASK_VALUES.has(action.toLowerCase())) {
      findings.push(new Finding("E007", `readiness_passed requires closed QUEUE ${taskName}.action; found ${action || "missing"}`));
    }
  }
  return findings;
}

export function readinessPassedGateFindings(root, files, texts) {
  return [
    ...readinessFindings(texts, { root, files }),
    ...traceContinuityFindings(texts),
    ...readinessClosedQueueFindings(texts.queue),
  ];
}

export function checkGateReadinessPassed(root) {
  return checkStandaloneGate(root, "readiness_passed", readinessPassedGateFindings);
}
