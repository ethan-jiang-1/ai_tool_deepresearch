import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  gateKeyToEnum,
  inspectPostFinalHandoffStage,
  loadHandoffTopology,
  readTraceEventsWithIndex,
} from './handoff-helpers.mjs';

export const PHASE_STATUS_AUDIT_OUTCOMES = [
  'passed',
  'post_final_recovery_pending',
  'post_final_reentry_pending_load',
  'post_final_reentry_pending_status_sync',
  'status_drift',
  'manual_bypass_suspected',
  'missing_witness',
  'failed_gate_downstream_status',
  'bootstrap_exception',
];

const BOOTSTRAP_STATUS_WINDOWS = new Map([
  ['setup_ready|seed_topics_ready', 'template_initial_setup_window'],
  ['hitl1_recorded|setup_ready', 'hitl1_to_setup_bootstrap_window'],
]);

function readJsonFile(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf-8'));
}

function phaseKeyForNode(topology, node) {
  return topology.nodeToPhase.get(node)?.key || null;
}

function nodeForGateEnum(topology, gateEnum) {
  return topology.gateToNode.get(String(gateEnum || '').replace(/_/g, '-')) || null;
}

function phaseOrderIndex(topology, node) {
  return (topology.manifest.phases || []).findIndex((phase) => phase.node === node);
}

function statusClaimsAtOrAfterFailedSource(topology, status, failedAttempt) {
  const sourceNode = topology.gateToNode.get(failedAttempt.gate);
  if (!sourceNode) return false;
  const sourceIndex = phaseOrderIndex(topology, sourceNode);
  if (sourceIndex < 0) return false;

  const currentNode = nodeForGateEnum(topology, status.current_gate);
  const nextNode = nodeForGateEnum(topology, status.next_gate);
  const currentIndex = currentNode ? phaseOrderIndex(topology, currentNode) : -1;
  const nextIndex = status.next_gate === 'none'
    ? Number.POSITIVE_INFINITY
    : (nextNode ? phaseOrderIndex(topology, nextNode) : -1);

  return currentIndex >= sourceIndex || nextIndex > sourceIndex;
}

function latestStatusTransition(events) {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i].event;
    if (event.event === 'phase_transition') return events[i];
  }
  return null;
}

function latestGateAttempt(events) {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i].event;
    if (event.event === 'gate_attempt') return events[i];
  }
  return null;
}

function findRouteBoundLoad(events, {
  afterIndex,
  sourceGate,
  sourceNode,
  targetNode,
}) {
  for (const item of events) {
    if (item.index <= afterIndex) continue;
    const event = item.event;
    if (event.event !== 'load_complete') continue;
    if (event.entry !== targetNode) continue;
    if (event.handoff_source_gate !== sourceGate) continue;
    if (event.handoff_source_node !== sourceNode) continue;
    if (event.handoff_target_node !== targetNode) continue;
    if (event.handoff_source_attempt_index !== afterIndex) continue;
    return item;
  }
  return null;
}

function candidateLegalWindows(events, topology) {
  const windows = [];
  for (const item of events) {
    const event = item.event;
    if (event.event !== 'gate_attempt' || event.passed !== true || !event.next) continue;
    const sourceNode = topology.gateToNode.get(event.gate);
    if (!sourceNode || sourceNode !== event.currentNodeRef) continue;
    if (!topology.nodeToPhase.has(event.next)) continue;
    const load = findRouteBoundLoad(events, {
      afterIndex: item.index,
      sourceGate: event.gate,
      sourceNode,
      targetNode: event.next,
    });
    if (!load) continue;
    const currentGate = gateKeyToEnum(event.gate);
    const targetGate = topology.nodeToGate.get(event.next);
    windows.push({
      currentGate,
      nextGate: targetGate ? gateKeyToEnum(targetGate) : 'none',
      sourceGate: event.gate,
      sourceNode,
      targetNode: event.next,
      targetPhase: phaseKeyForNode(topology, event.next),
      attemptIndex: item.index,
      loadIndex: load.index,
    });
  }
  return windows;
}

function hasFinalFiles(bundlePath) {
  const finalDir = join(bundlePath, 'final');
  if (!existsSync(finalDir)) return false;
  try {
    return readdirSync(finalDir, { withFileTypes: true }).some((entry) => {
      if (entry.isDirectory()) return false;
      if (entry.name.startsWith('.')) return false;
      return true;
    });
  } catch {
    return false;
  }
}

function legalFinalWindow(events, topology, status) {
  if (status.current_gate !== 'readiness_passed' || status.next_gate !== 'none') return null;
  return candidateLegalWindows(events, topology)
    .find((window) =>
      window.sourceGate === 'readiness-passed' &&
      window.targetNode === 'phases/phase-final.md' &&
      window.currentGate === 'readiness_passed' &&
      window.nextGate === 'none'
    ) || null;
}

function adviceForOutcome(outcome, bundlePath, latestWindow = null) {
  if (outcome === 'passed' || outcome === 'bootstrap_exception') return [];
  const base = [
    'Treat phase status drift as diagnostic-only; do not hand-edit rb_status.json.',
    'Return to the latest legal phase target or rerun the predecessor gate, then consume check.next through enter-phase before advance-status.',
  ];
  if (latestWindow) {
    base.push(`Latest legal target is ${latestWindow.targetNode}; repair from source gate ${latestWindow.sourceGate}.`);
  } else {
    base.push(`Run the current legal gate and handoff path for bundle ${bundlePath}.`);
  }
  return base;
}

export function auditPhaseStatus(bundlePath) {
  const inspect = [];
  const trace = readTraceEventsWithIndex(bundlePath);
  if (!trace.ok) {
    return {
      ok: false,
      outcome: 'missing_witness',
      inspect: [trace.reason],
      advice: adviceForOutcome('missing_witness', bundlePath),
      diagnostic_only: true,
    };
  }

  let topology;
  try {
    topology = loadHandoffTopology();
  } catch (err) {
    return {
      ok: false,
      outcome: 'missing_witness',
      inspect: [`failed to load workflow handoff topology: ${err.message}`],
      advice: adviceForOutcome('missing_witness', bundlePath),
      diagnostic_only: true,
    };
  }

  const statusPath = join(bundlePath, 'rb_status.json');
  if (!existsSync(statusPath)) {
    return {
      ok: false,
      outcome: 'missing_witness',
      inspect: ['rb_status.json not found'],
      advice: adviceForOutcome('missing_witness', bundlePath),
      diagnostic_only: true,
    };
  }

  let status;
  try {
    status = readJsonFile(statusPath);
  } catch (err) {
    return {
      ok: false,
      outcome: 'status_drift',
      inspect: [`rb_status.json is not valid JSON: ${err.message}`],
      advice: adviceForOutcome('status_drift', bundlePath),
      diagnostic_only: true,
    };
  }

  const postFinal = inspectPostFinalHandoffStage(bundlePath);
  if (postFinal.reason_code === 'accepted_workspace') {
    const operationId = postFinal.workspace?.operationId;
    return {
      ok: false,
      outcome: 'post_final_recovery_pending',
      inspect: [postFinal.reason],
      advice: operationId ? [`node DPT_FRAMEWORK/cli/operate-post-final-recovery.mjs recover --bundle ${bundlePath} --operation-id ${operationId}`] : [],
      diagnostic_only: true,
    };
  }
  if (postFinal.ok && postFinal.stage === 'pre_entry') {
    return {
      ok: false,
      outcome: 'post_final_reentry_pending_load',
      inspect: ['Accepted post-final reentry event is waiting for route-bound rerun entry.'],
      advice: [`node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node phases/phase-rerun.md`],
      diagnostic_only: true,
    };
  }
  if (postFinal.ok && postFinal.stage === 'loaded_pending_status') {
    return {
      ok: false,
      outcome: 'post_final_reentry_pending_status_sync',
      inspect: ['Accepted post-final rerun entry is waiting for existing HITL2 status synchronization.'],
      advice: [`node DPT_FRAMEWORK/cli/advance-status.mjs --bundle ${bundlePath} --to hitl2_recorded`],
      diagnostic_only: true,
    };
  }
  if (postFinal.ok && ['synchronized_initial_profile', 'synchronized_count_incremented', 'descendant_pipeline'].includes(postFinal.stage)) {
    return {
      ok: true,
      outcome: 'passed',
      inspect: [`Accepted exceptional handoff stage: ${postFinal.stage}`],
      advice: [],
      status: { current_gate: status.current_gate, next_gate: status.next_gate },
      latest_legal_window: {
        currentGate: 'hitl2_recorded',
        nextGate: 'rerun_ready',
        sourceGate: 'hitl2-recorded',
        sourceNode: 'phases/phase-hitl2.md',
        targetNode: 'phases/phase-rerun.md',
        attemptIndex: postFinal.handoff.index,
        loadIndex: postFinal.handoff.loadComplete?.index ?? null,
        exceptional: true,
      },
      diagnostic_only: true,
    };
  }

  const statusKey = `${status.current_gate}|${status.next_gate}`;
  const finalFilesExist = hasFinalFiles(bundlePath);
  const windows = candidateLegalWindows(trace.events, topology);
  const latestWindow = windows.at(-1) || null;
  const exactWindow = windows.find((window) =>
    window.currentGate === status.current_gate &&
    window.nextGate === status.next_gate
  );

  const latestAttempt = latestGateAttempt(trace.events);
  if (
    latestAttempt?.event?.event === 'gate_attempt' &&
    latestAttempt.event.passed === false &&
    latestAttempt.event.next == null &&
    (
      statusClaimsAtOrAfterFailedSource(topology, status, latestAttempt.event) ||
      (latestWindow && status.current_gate !== latestWindow.currentGate)
    )
  ) {
    inspect.push(`Latest gate_attempt for ${latestAttempt.event.gate} failed with next:null, but rb_status.json claims downstream window ${status.current_gate}/${status.next_gate}.`);
    return {
      ok: false,
      outcome: 'failed_gate_downstream_status',
      inspect,
      advice: adviceForOutcome('failed_gate_downstream_status', bundlePath, latestWindow),
      status: { current_gate: status.current_gate, next_gate: status.next_gate },
      latest_legal_window: latestWindow,
      diagnostic_only: true,
    };
  }

  if (finalFilesExist) {
    const finalWindow = legalFinalWindow(trace.events, topology, status);
    if (!finalWindow) {
      inspect.push('final/ contains report-like files before legal readiness-to-final handoff and route-bound Final entry; premature final output is diagnostic only, not delivery evidence.');
      return {
        ok: false,
        outcome: 'status_drift',
        inspect,
        advice: adviceForOutcome('status_drift', bundlePath, latestWindow),
        status: { current_gate: status.current_gate, next_gate: status.next_gate },
        latest_legal_window: latestWindow,
        diagnostic_only: true,
      };
    }
  }

  if (exactWindow) {
    const transition = latestStatusTransition(trace.events);
    if (!transition || transition.event.to !== status.current_gate || transition.event.next !== status.next_gate) {
      inspect.push(`rb_status.json matches a witnessed handoff window, but phase_transition witness for ${status.current_gate}/${status.next_gate} is missing.`);
      return {
        ok: false,
        outcome: 'missing_witness',
        inspect,
        advice: adviceForOutcome('missing_witness', bundlePath, exactWindow),
        status: { current_gate: status.current_gate, next_gate: status.next_gate },
        latest_legal_window: exactWindow,
        diagnostic_only: true,
      };
    }
    return {
      ok: true,
      outcome: 'passed',
      inspect,
      advice: [],
      status: { current_gate: status.current_gate, next_gate: status.next_gate },
      latest_legal_window: exactWindow,
      diagnostic_only: true,
    };
  }

  if (!latestWindow && BOOTSTRAP_STATUS_WINDOWS.has(statusKey)) {
    const exception = BOOTSTRAP_STATUS_WINDOWS.get(statusKey);
    return {
      ok: true,
      outcome: 'bootstrap_exception',
      inspect: [`bootstrap exception applied: ${exception}`],
      advice: [],
      bootstrap_exception: exception,
      status: { current_gate: status.current_gate, next_gate: status.next_gate },
      diagnostic_only: true,
    };
  }

  if (!latestWindow) {
    inspect.push(`rb_status.json claims ${status.current_gate}/${status.next_gate}, but no witnessed passed gate + route-bound load_complete handoff was found.`);
    return {
      ok: false,
      outcome: 'manual_bypass_suspected',
      inspect,
      advice: adviceForOutcome('manual_bypass_suspected', bundlePath),
      status: { current_gate: status.current_gate, next_gate: status.next_gate },
      latest_legal_window: null,
      diagnostic_only: true,
    };
  }

  const claimedNode = nodeForGateEnum(topology, status.next_gate);
  if (claimedNode && claimedNode !== latestWindow.targetNode) {
    inspect.push(`rb_status.json next_gate "${status.next_gate}" points to ${claimedNode}, but latest legal handoff target is ${latestWindow.targetNode}.`);
    return {
      ok: false,
      outcome: 'manual_bypass_suspected',
      inspect,
      advice: adviceForOutcome('manual_bypass_suspected', bundlePath, latestWindow),
      status: { current_gate: status.current_gate, next_gate: status.next_gate },
      latest_legal_window: latestWindow,
      diagnostic_only: true,
    };
  }

  inspect.push(`rb_status.json window ${status.current_gate}/${status.next_gate} does not match latest witnessed legal window ${latestWindow.currentGate}/${latestWindow.nextGate}.`);
  return {
    ok: false,
    outcome: 'status_drift',
    inspect,
    advice: adviceForOutcome('status_drift', bundlePath, latestWindow),
    status: { current_gate: status.current_gate, next_gate: status.next_gate },
    latest_legal_window: latestWindow,
    diagnostic_only: true,
  };
}
