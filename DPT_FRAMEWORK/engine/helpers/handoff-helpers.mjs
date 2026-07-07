// handoff-helpers.mjs — Trace-backed lifecycle handoff validation
// @impl CPT-003, CPT-004, GSK-007

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = join(__dirname, '..', '..', 'workflows');

export const BOOTSTRAP_TARGET_NODES = new Set([
  'phases/phase-instantiation.md',
  'phases/phase-hitl1.md',
  'phases/phase-setup.md',
]);

export const COVERED_PREFLIGHT_TARGET_NODES = new Set([
  'phases/phase-seed-topics.md',
  'phases/phase-wave0.md',
  'phases/phase-wave1.md',
  'phases/phase-wave2.md',
  'phases/phase-hitl2.md',
  'phases/phase-readiness.md',
  'phases/phase-rerun.md',
]);

export const COVERED_ENTRY_TARGET_NODES = new Set([
  ...COVERED_PREFLIGHT_TARGET_NODES,
  'phases/phase-final.md',
]);

export const COVERED_SOURCE_NODES = new Set([
  'phases/phase-setup.md',
  'phases/phase-seed-topics.md',
  'phases/phase-wave0.md',
  'phases/phase-wave1.md',
  'phases/phase-wave2.md',
  'phases/phase-hitl2.md',
  'phases/phase-readiness.md',
  'phases/phase-rerun.md',
]);

export function gateKeyToEnum(gateKey) {
  return String(gateKey || '').replace(/-/g, '_');
}

export function gateEnumToKey(gateEnum) {
  return String(gateEnum || '').replace(/_/g, '-');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function loadHandoffTopology({ workflowsDir = WORKFLOWS_DIR } = {}) {
  const manifest = readJson(join(workflowsDir, 'manifest.json'));
  const chain = readJson(join(workflowsDir, 'transitions.chain.json'));
  const nodeToPhase = new Map();
  const gateToNode = new Map();
  const nodeToGate = new Map();

  for (const phase of manifest.phases || []) {
    nodeToPhase.set(phase.node, phase);
    if (phase.gate) {
      gateToNode.set(phase.gate, phase.node);
      nodeToGate.set(phase.node, phase.gate);
    }
  }

  return { manifest, chain, nodeToPhase, gateToNode, nodeToGate };
}

export function readTraceEventsWithIndex(bundlePath) {
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) {
    return { ok: false, reason: `rb_trace.jsonl not found in ${bundlePath}`, events: [] };
  }

  const raw = readFileSync(tracePath, 'utf-8');
  const events = [];
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      events.push({ index: events.length, lineNumber: i + 1, event: JSON.parse(line) });
    } catch (err) {
      return {
        ok: false,
        reason: `rb_trace.jsonl line ${i + 1} is not valid JSON: ${err.message}`,
        events: [],
      };
    }
  }

  return { ok: true, events };
}

function edgeForAttempt(traceEvent, topology) {
  const e = traceEvent.event;
  if (e.event !== 'gate_attempt' || e.passed !== true || !e.next) return null;
  if (!e.gate || !e.currentNodeRef) return null;

  const sourceNode = topology.gateToNode.get(e.gate);
  if (!sourceNode || sourceNode !== e.currentNodeRef) return null;
  if (!topology.nodeToPhase.has(e.next)) return null;

  const transitions = topology.chain[sourceNode] || {};
  const outcome = Object.entries(transitions).find(([, target]) => target === e.next)?.[0] || null;
  if (!outcome) return null;

  return {
    sourceGate: e.gate,
    sourceGateEnum: gateKeyToEnum(e.gate),
    sourceNode,
    targetNode: e.next,
    targetGate: topology.nodeToGate.get(e.next) || null,
    targetGateEnum: topology.nodeToGate.get(e.next) ? gateKeyToEnum(topology.nodeToGate.get(e.next)) : 'none',
    outcome,
    degraded: e.degraded === true,
    degradedReason: e.degraded_reason || null,
    degradedRules: Array.isArray(e.degraded_rules) ? e.degraded_rules : [],
  };
}

function supersededBy(events, candidate) {
  const source = candidate.event;
  for (const item of events) {
    if (item.index <= candidate.index) continue;
    const e = item.event;
    if (e.event !== 'gate_attempt') continue;
    if (e.gate !== source.gate || e.currentNodeRef !== source.currentNodeRef) continue;
    if (e.passed !== true || e.next !== source.next) {
      return item;
    }
  }
  return null;
}

function findBoundLoad(events, handoff) {
  let found = null;
  for (const item of events) {
    if (item.index <= handoff.index) continue;
    const e = item.event;
    if (e.event !== 'load_complete') continue;
    if (e.entry !== handoff.targetNode) continue;
    if (e.handoff_source_attempt_index !== handoff.index) continue;
    if (e.handoff_source_gate !== handoff.sourceGate) continue;
    if (e.handoff_source_node !== handoff.sourceNode) continue;
    if (e.handoff_target_node !== handoff.targetNode) continue;
    found = item;
  }
  return found;
}

function makeHandoff(traceEvent, edge, events, { requireLoad = false } = {}) {
  const superseder = supersededBy(events, traceEvent);
  if (superseder) {
    return {
      ok: false,
      reason: `source gate "${traceEvent.event.gate}" pass at trace index ${traceEvent.index} is superseded by gate_attempt at trace index ${superseder.index}`,
      superseder,
    };
  }

  const handoff = {
    index: traceEvent.index,
    event: traceEvent.event,
    sourceGate: edge.sourceGate,
    sourceGateEnum: edge.sourceGateEnum,
    sourceNode: edge.sourceNode,
    targetNode: edge.targetNode,
    targetGate: edge.targetGate,
    targetGateEnum: edge.targetGateEnum,
    outcome: edge.outcome,
    degraded: edge.degraded === true,
    degradedReason: edge.degradedReason || null,
    degradedRules: edge.degradedRules || [],
    sourceAttemptTs: traceEvent.event.ts || null,
    loadComplete: null,
  };

  const loadComplete = findBoundLoad(events, handoff);
  if (loadComplete) handoff.loadComplete = loadComplete;

  if (requireLoad && !loadComplete) {
    return {
      ok: false,
      reason: `missing route-bound load_complete(entry="${handoff.targetNode}") for source gate "${handoff.sourceGate}" trace index ${handoff.index}`,
      handoff,
    };
  }

  return { ok: true, handoff };
}

function latestLegalPassedHandoff(events, topology, predicate = () => true, opts = {}) {
  for (let i = events.length - 1; i >= 0; i--) {
    const item = events[i];
    const edge = edgeForAttempt(item, topology);
    if (!edge) continue;
    if (!predicate(edge, item)) continue;
    const made = makeHandoff(item, edge, events, opts);
    if (made.ok) return made.handoff;
  }
  return null;
}

function contextFor(bundlePath) {
  const trace = readTraceEventsWithIndex(bundlePath);
  if (!trace.ok) return { ok: false, reason: trace.reason };

  try {
    return { ok: true, events: trace.events, topology: loadHandoffTopology() };
  } catch (err) {
    return { ok: false, reason: `failed to load workflow handoff topology: ${err.message}` };
  }
}

export function validateEnterPhaseTarget(bundlePath, targetNode) {
  const ctx = contextFor(bundlePath);
  if (!ctx.ok) return { ok: false, reason: ctx.reason, advice: [] };

  const latest = latestLegalPassedHandoff(ctx.events, ctx.topology);
  if (!latest) {
    return {
      ok: false,
      reason: 'no latest passed deterministic gate_attempt with non-null next was found',
      advice: ['Rerun the source gate and use its check.next value with enter-phase.'],
    };
  }

  if (latest.targetNode !== targetNode) {
    return {
      ok: false,
      reason: `requested node "${targetNode}" is not authorized by latest deterministic handoff; latest check.next is "${latest.targetNode}" from ${latest.sourceGate}`,
      advice: [`Run enter-phase with the latest check.next: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node ${latest.targetNode}`],
      latest,
    };
  }

  return { ok: true, handoff: latest };
}

export function validateSourceGateStatusSync(bundlePath, sourceGateEnum) {
  let topology;
  try {
    topology = loadHandoffTopology();
  } catch (err) {
    return { ok: false, reason: `failed to load workflow handoff topology: ${err.message}`, advice: [] };
  }

  const sourceGate = gateEnumToKey(sourceGateEnum);
  const sourceNode = topology.gateToNode.get(sourceGate);
  if (!sourceNode) {
    return { ok: false, reason: `unknown source gate "${sourceGateEnum}"`, advice: ['Check manifest.json for valid gate values.'] };
  }

  const isCovered = COVERED_SOURCE_NODES.has(sourceNode);
  if (!isCovered) {
    return { ok: true, covered: false, sourceGate, sourceNode };
  }

  const trace = readTraceEventsWithIndex(bundlePath);
  if (!trace.ok) return { ok: false, reason: trace.reason, advice: [] };
  const ctx = { events: trace.events, topology };

  const latest = latestLegalPassedHandoff(ctx.events, ctx.topology);
  if (!latest) {
    return {
      ok: false,
      reason: 'no latest passed deterministic gate_attempt with non-null next was found',
      advice: [`Rerun the source gate before syncing status: ${sourceGate}`],
    };
  }

  if (latest.sourceGate !== sourceGate) {
    if (
      sourceGate === 'setup-ready' &&
      latest.sourceGate === 'hitl1-recorded' &&
      latest.targetNode === 'phases/phase-setup.md'
    ) {
      return {
        ok: true,
        covered: false,
        sourceGate,
        sourceNode,
        bootstrapCompatibility: 'hitl1_to_setup',
        latest,
      };
    }

    return {
      ok: false,
      reason: `source gate "${sourceGate}" is not the latest deterministic handoff; latest source gate is "${latest.sourceGate}"`,
      advice: [
        `If you just passed ${latest.sourceGate}, consume its check.next first: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node ${latest.targetNode}`,
        `Then sync the source gate with: node DPT_FRAMEWORK/cli/advance-status.mjs --bundle ${bundlePath} --to ${latest.sourceGateEnum}`,
      ],
      latest,
    };
  }

  const made = makeHandoff({ index: latest.index, event: latest.event }, {
    sourceGate: latest.sourceGate,
    sourceGateEnum: latest.sourceGateEnum,
    sourceNode: latest.sourceNode,
    targetNode: latest.targetNode,
    targetGate: latest.targetGate,
    targetGateEnum: latest.targetGateEnum,
    outcome: latest.outcome,
    degraded: latest.degraded === true,
    degradedReason: latest.degradedReason || null,
    degradedRules: latest.degradedRules || [],
  }, ctx.events, { requireLoad: COVERED_ENTRY_TARGET_NODES.has(latest.targetNode) });

  if (!made.ok) {
    return {
      ok: false,
      reason: made.reason,
      advice: [`Run: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node ${latest.targetNode}`],
      latest,
    };
  }

  return { ok: true, covered: true, handoff: made.handoff };
}

export function checkPhaseHandoffPreflight(bundlePath, currentNodeRef) {
  if (BOOTSTRAP_TARGET_NODES.has(currentNodeRef)) {
    return { ok: true, skipped: true, reason: 'bootstrap target exempt from handoff preflight' };
  }
  if (!COVERED_PREFLIGHT_TARGET_NODES.has(currentNodeRef)) {
    return { ok: true, skipped: true, reason: 'target is not a covered gate preflight node' };
  }

  const ctx = contextFor(bundlePath);
  if (!ctx.ok) {
    return { ok: false, inspect: [ctx.reason], advice: ['Fix trace/topology inputs before rerunning this gate.'] };
  }

  const latest = latestLegalPassedHandoff(ctx.events, ctx.topology);
  if (!latest) {
    return {
      ok: false,
      inspect: [`Missing witnessed handoff into ${currentNodeRef}. Expected a prior gate_attempt(passed=true,next="${currentNodeRef}") followed by route-bound load_complete.`],
      advice: [`Run enter-phase with the source gate check.next before this gate: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node ${currentNodeRef}`],
    };
  }

  if (latest.targetNode !== currentNodeRef) {
    return {
      ok: false,
      inspect: [`Latest deterministic handoff targets ${latest.targetNode}, not current node ${currentNodeRef}.`],
      advice: [`Continue from the latest checked handoff target, or rerun the predecessor gate for ${currentNodeRef} and then: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node ${currentNodeRef}`],
      handoff: latest,
    };
  }

  const made = makeHandoff({ index: latest.index, event: latest.event }, {
    sourceGate: latest.sourceGate,
    sourceGateEnum: latest.sourceGateEnum,
    sourceNode: latest.sourceNode,
    targetNode: latest.targetNode,
    targetGate: latest.targetGate,
    targetGateEnum: latest.targetGateEnum,
    outcome: latest.outcome,
    degraded: latest.degraded === true,
    degradedReason: latest.degradedReason || null,
    degradedRules: latest.degradedRules || [],
  }, ctx.events, { requireLoad: true });

  if (!made.ok) {
    return {
      ok: false,
      inspect: [made.reason],
      advice: [`Run enter-phase with the source gate check.next before this gate: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node ${currentNodeRef}`],
      handoff: latest,
    };
  }

  const handoff = made.handoff;

  const statusPath = join(bundlePath, 'rb_status.json');
  if (!existsSync(statusPath)) {
    return { ok: false, inspect: ['rb_status.json not found'], advice: ['Restore rb_status.json before rerunning this gate.'] };
  }

  let status;
  try {
    status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  } catch (err) {
    return { ok: false, inspect: [`rb_status.json is not valid JSON: ${err.message}`], advice: ['rb_status.json is Engine-owned. Restore it from checkpoint/rollback or rerun the valid Engine transition path before rerunning this gate; do not hand-edit status authority.'] };
  }

  const expectedCurrent = handoff.sourceGateEnum;
  const expectedNext = handoff.targetGateEnum;
  const inspect = [];
  if (status.current_gate !== expectedCurrent) {
    inspect.push(`rb_status.json#/current_gate expected "${expectedCurrent}" for witnessed predecessor ${handoff.sourceGate}, got "${status.current_gate}"`);
  }
  if (status.next_gate !== expectedNext) {
    inspect.push(`rb_status.json#/next_gate expected "${expectedNext}" for current node ${currentNodeRef}, got "${status.next_gate}"`);
  }

  if (inspect.length > 0) {
    return {
      ok: false,
      inspect,
      advice: [`After enter-phase, sync the source gate: node DPT_FRAMEWORK/cli/advance-status.mjs --bundle ${bundlePath} --to ${handoff.sourceGateEnum}`],
      handoff,
    };
  }

  return { ok: true, handoff };
}
