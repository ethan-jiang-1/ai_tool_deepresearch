// @impl GSK-008
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { QueueSchema } from '../../schema/contracts/queue.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import { readTerminalNoSuccessor } from './queue-terminal-failure.mjs';

function queueFinding(bundlePath, {
  suffix,
  observed,
  missingFact,
  repairKind,
  writeTo,
  repair,
}) {
  return makeContractFinding({
    id: `phase_queue_drained:${suffix}`,
    ruleId: 'phase_queue_drained',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'authority_integrity',
    surface: resolve(bundlePath, 'rb_queue.json'),
    expected: 'Schema-valid rb_queue.json with empty active_window, refill_pool and delegated_in_flight.',
    observed,
    missingFact,
    repairKind,
    writeTo,
    repair,
    detail: `[phase_queue_drained] ${missingFact}`,
  });
}

export function checkPhaseQueueDrained(bundlePath, { phase = 'wave' } = {}) {
  const queuePath = resolve(bundlePath, 'rb_queue.json');
  if (!existsSync(queuePath)) {
    const finding = queueFinding(bundlePath, {
      suffix: 'authority_missing', observed: { exists: false },
      missingFact: 'rb_queue.json is missing; queue quiescence has no direct authority.',
      repairKind: 'missing_contract', writeTo: queuePath,
      repair: 'Restore queue authority through its accepted owner before rerunning this checkpoint; do not hand-write a drained queue.',
    });
    return { passed: false, inspect: [finding.detail], advice: [finding.repair], findings: [finding] };
  }
  let raw;
  let parsed;
  try {
    raw = readFileSync(queuePath, 'utf8');
    parsed = JSON.parse(raw);
  } catch (error) {
    const finding = queueFinding(bundlePath, {
      suffix: 'authority_unreadable', observed: error.message,
      missingFact: `rb_queue.json is not readable JSON: ${error.message}`,
      repairKind: 'missing_contract', writeTo: queuePath,
      repair: 'Repair queue authority through its accepted Engine owner, then rerun this checkpoint.',
    });
    return { passed: false, inspect: [finding.detail], advice: [finding.repair], findings: [finding] };
  }
  const validated = QueueSchema.safeParse(parsed);
  if (!validated.success) {
    const detail = validated.error.issues.map((issue) => `${issue.path.join('/') || '/'}: ${issue.message}`).join('; ');
    const finding = queueFinding(bundlePath, {
      suffix: 'authority_schema', observed: detail,
      missingFact: `rb_queue.json fails QueueSchema: ${detail}`,
      repairKind: 'missing_contract', writeTo: queuePath,
      repair: 'Repair queue authority through its accepted Engine owner, then rerun this checkpoint.',
    });
    return { passed: false, inspect: [finding.detail], advice: [finding.repair], findings: [finding] };
  }
  const queue = validated.data;
  const terminalFailure = readTerminalNoSuccessor(queue);
  const inFlight = Object.values(queue.delegated_in_flight);
  let finding = null;
  if (terminalFailure) {
    finding = queueFinding(bundlePath, {
      suffix: terminalFailure.root_id,
      observed: {
        queue_item_id: terminalFailure.queue_item_id,
        terminal_reason: terminalFailure.terminal_reason,
        failure_disposition: terminalFailure.failure_disposition,
      },
      missingFact: terminalFailure.missing_fact,
      repairKind: terminalFailure.repair_kind,
      writeTo: terminalFailure.write_to,
      repair: `${terminalFailure.repair} Rerun the ${phase} checkpoint after that boundary is resolved.`,
    });
  } else if (inFlight.length > 0) {
    finding = queueFinding(bundlePath, {
      suffix: 'delegated_in_flight', observed: inFlight.map(({ work_id, queue_item_id }) => ({ work_id, queue_item_id })),
      missingFact: `delegated_in_flight still contains ${inFlight.length} work-unit attempt(s).`,
      repairKind: 'engine_operation',
      writeTo: `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect ${resolve(bundlePath)} --work-id ${inFlight[0].work_id}`,
      repair: `Inspect the bounded in-flight attempt, follow its legal submit/repair/wait/timeout path, then rerun the ${phase} checkpoint.`,
    });
  } else if (queue.active_window.length > 0) {
    const front = queue.active_window[0];
    const delegated = front.targets?.delegates?.to === 'sub-agent';
    const mainAgentOwned = !delegated && front.targets?.controller === 'main-agent';
    finding = queueFinding(bundlePath, {
      suffix: 'active_front', observed: { queue_item_id: front.queue_item_id, targets: front.targets },
      missingFact: `active_window front demand ${front.queue_item_id} remains incomplete.`,
      repairKind: delegated || mainAgentOwned ? 'engine_operation' : 'missing_contract',
      writeTo: delegated
        ? `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim ${resolve(bundlePath)} --phase ${phase}`
        : mainAgentOwned
          ? `node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs claim ${resolve(bundlePath)}`
          : `queue owner contract for targets.controller=${front.targets?.controller || '<missing>'}`,
      repair: delegated || mainAgentOwned
        ? `Claim and complete the active-front demand through its declared ${delegated ? 'delegated work-unit' : 'main-agent queue'} owner, then rerun the ${phase} checkpoint.`
        : `Stop at the missing public owner contract for targets.controller=${front.targets?.controller || '<missing>'}; do not assign this demand to the main Agent or hand-edit queue authority.`,
    });
  } else if (queue.refill_pool.length > 0) {
    finding = queueFinding(bundlePath, {
      suffix: 'refill_only', observed: { refill_pool: queue.refill_pool.map((item) => item.queue_item_id) },
      missingFact: `refill_pool contains ${queue.refill_pool.length} demand item(s) while active_window is empty, but no sanctioned public transition owns this state.`,
      repairKind: 'missing_contract', writeTo: 'queue lifecycle contract',
      repair: `Stop at the missing queue lifecycle contract and rerun the ${phase} checkpoint only after that boundary is resolved.`,
    });
  }
  if (!finding) return { passed: true, inspect: [], advice: [], findings: [] };
  return { passed: false, inspect: [finding.detail], advice: [finding.repair], findings: [finding] };
}
