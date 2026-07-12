// handoff-helpers.mjs — Trace-backed lifecycle handoff validation
// @impl CPT-003, CPT-004, GSK-007

import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { PostFinalRecoveryEventSchema } from './post-final-reentry-contract.mjs';
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
      events.push({
        index: events.length,
        lineNumber: i + 1,
        rawLine: line,
        lineSha256: createHash('sha256').update(Buffer.from(line, 'utf8')).digest('hex'),
        event: JSON.parse(line),
      });
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

export function findLatestLegalHandoff(bundlePath, { targetNode = null, sourceNode = null, requireLoad = false } = {}) {
  const ctx = contextFor(bundlePath);
  if (!ctx.ok) return { ok: false, reason: ctx.reason };
  const handoff = latestLegalPassedHandoff(
    ctx.events,
    ctx.topology,
    (edge) => (!targetNode || edge.targetNode === targetNode) && (!sourceNode || edge.sourceNode === sourceNode),
    { requireLoad },
  );
  return handoff ? { ok: true, handoff, events: ctx.events, topology: ctx.topology } : { ok: false, reason: 'no matching legal passed handoff was found', events: ctx.events, topology: ctx.topology };
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

function acceptedPostFinalWorkspace(bundlePath) {
  const root = join(bundlePath, '_diagnostics', 'post-final-recovery');
  if (!existsSync(root)) return null;
  try {
    for (const name of readdirSync(root).sort()) {
      const workspace = join(root, name);
      const info = lstatSync(workspace);
      if (info.isSymbolicLink() || !info.isDirectory()) return { blocked: true, reason: `unsafe post-final recovery workspace entry: ${name}` };
      if (existsSync(join(workspace, 'manifest.json'))) return { blocked: false, operationId: name, workspace };
    }
  } catch (error) {
    return { blocked: true, reason: error.message };
  }
  return null;
}

function postFinalEdge(item, topology) {
  const parsed = PostFinalRecoveryEventSchema.safeParse(item.event);
  if (!parsed.success) return null;
  const event = parsed.data;
  const targetNode = topology.chain['phases/phase-hitl2.md']?.rerun;
  if (!targetNode || targetNode !== event.routing.target_node) return null;
  const targetGate = topology.nodeToGate.get(targetNode);
  if (!targetGate || gateKeyToEnum(targetGate) !== event.routing.target_gate_enum) return null;
  return {
    kind: 'post_final_reentry',
    sourceGate: 'hitl2-recorded',
    sourceGateEnum: 'hitl2_recorded',
    sourceNode: 'phases/phase-hitl2.md',
    targetNode,
    targetGate,
    targetGateEnum: gateKeyToEnum(targetGate),
    outcome: 'rerun',
    operationId: event.operation_id,
    eventId: event.event_id,
    eventLineSha256: item.lineSha256,
    committedAfterProfileSha256: event.committed_after_profile_sha256,
    previousFinal: event.previous_final,
    degraded: false,
    degradedReason: null,
    degradedRules: [],
  };
}

function finalLineageExists(events, edge) {
  const handoffItem = events.find((item) => item.index === edge.previousFinal.final_handoff_index);
  const loadItem = events.find((item) => item.index === edge.previousFinal.final_load_index);
  return handoffItem?.event?.event === 'gate_attempt'
    && handoffItem.event.gate === 'readiness-passed'
    && handoffItem.event.passed === true
    && handoffItem.event.next === 'phases/phase-final.md'
    && loadItem?.event?.event === 'load_complete'
    && loadItem.event.entry === 'phases/phase-final.md'
    && loadItem.event.handoff_source_attempt_index === handoffItem.index;
}

function findBoundPostFinalLoad(events, item, edge) {
  let found = null;
  for (const candidate of events) {
    const event = candidate.event;
    if (candidate.index <= item.index || event?.event !== 'load_complete' || event.entry !== edge.targetNode) continue;
    if (event.handoff_source_kind !== 'post_final_reentry') continue;
    if (event.handoff_source_event_id !== edge.eventId || event.handoff_source_event_index !== item.index) continue;
    if (event.handoff_source_event_sha256 !== edge.eventLineSha256 || event.handoff_source_operation_id !== edge.operationId) continue;
    if (event.handoff_target_node !== edge.targetNode) continue;
    found = candidate;
  }
  return found;
}

function findBoundPostFinalTransition(events, item, edge, load) {
  if (!load) return { exact: null, conflict: null };
  let exact = null;
  let conflict = null;
  for (const candidate of events) {
    const event = candidate.event;
    if (candidate.index <= load.index || event?.event !== 'phase_transition' || event.source_handoff_kind !== 'post_final_reentry') continue;
    const sameEvent = event.source_handoff_event_id === edge.eventId;
    if (!sameEvent) continue;
    const matches = event.source_handoff_event_index === item.index
      && event.source_handoff_event_sha256 === edge.eventLineSha256
      && event.source_handoff_operation_id === edge.operationId
      && event.source_handoff_load_index === load.index
      && event.to === 'hitl2_recorded'
      && event.next === edge.targetGateEnum;
    if (matches) exact = candidate;
    else conflict = candidate;
  }
  return { exact, conflict };
}

export function inspectPostFinalHandoffStage(bundlePath) {
  const workspace = acceptedPostFinalWorkspace(bundlePath);
  if (workspace) return { ok: false, reason_code: 'accepted_workspace', reason: workspace.reason || `accepted post-final recovery workspace ${workspace.operationId}`, workspace };
  const trace = readTraceEventsWithIndex(bundlePath);
  if (!trace.ok) return { ok: false, reason_code: 'trace_invalid', reason: trace.reason };
  let topology;
  try { topology = loadHandoffTopology(); } catch (error) { return { ok: false, reason_code: 'topology_invalid', reason: error.message }; }
  let selected = null;
  for (let index = trace.events.length - 1; index >= 0; index -= 1) {
    const item = trace.events[index];
    const edge = postFinalEdge(item, topology);
    if (!edge || !finalLineageExists(trace.events, edge)) continue;
    selected = { item, edge };
    break;
  }
  if (!selected) return { ok: false, reason_code: 'missing_event', reason: 'no structurally valid post_final_reentry event was found' };
  const { item, edge } = selected;
  const latestNormal = latestLegalPassedHandoff(trace.events, topology);
  if (latestNormal && latestNormal.index > item.index && latestNormal.sourceNode !== 'phases/phase-rerun.md') {
    return { ok: false, reason_code: 'superseded_event', reason: `post-final event is superseded by normal handoff at trace index ${latestNormal.index}` };
  }
  const statusPath = join(bundlePath, 'rb_status.json');
  const profilePath = join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(statusPath) || !existsSync(profilePath)) return { ok: false, reason_code: 'control_missing', reason: 'status/profile files are required' };
  const statusRaw = readFileSync(statusPath);
  const profileRaw = readFileSync(profilePath);
  const profile = parseYaml(profileRaw.toString('utf8'));
  const status = JSON.parse(statusRaw.toString('utf8'));
  const profileSha256 = createHash('sha256').update(profileRaw).digest('hex');
  const load = findBoundPostFinalLoad(trace.events, item, edge);
  const transition = findBoundPostFinalTransition(trace.events, item, edge, load);
  const descendant = trace.events.find((candidate) => candidate.index > item.index && candidate.event?.event === 'gate_attempt'
    && candidate.event.gate === 'rerun-ready' && candidate.event.currentNodeRef === edge.targetNode && candidate.event.passed === true && candidate.event.next);
  if (descendant) return { ok: true, stage: 'descendant_pipeline', handoff: { ...edge, index: item.index, event: item.event, sourceAttemptTs: item.event.ts || null, loadComplete: load, transition: transition.exact, descendant } };
  const terminal = status.current_node === 'phases/phase-final.md' && status.current_gate === 'readiness_passed' && status.next_gate === 'none';
  const rerun = status.current_node === edge.targetNode && status.current_gate === 'hitl2_recorded' && status.next_gate === edge.targetGateEnum;
  const profileMatches = profileSha256 === edge.committedAfterProfileSha256;
  if (terminal && profileMatches) return { ok: true, stage: 'pre_entry', handoff: { ...edge, index: item.index, event: item.event, sourceAttemptTs: item.event.ts || null, loadComplete: load, transition: null } };
  if (status.current_node === edge.targetNode && load) {
    if (transition.conflict) return { ok: false, reason_code: 'conflicting_transition', reason: `conflicting exceptional phase_transition at trace index ${transition.conflict.index}`, handoff: { ...edge, index: item.index, event: item.event, loadComplete: load } };
    if (!transition.exact && profileMatches) return { ok: true, stage: 'loaded_pending_status', handoff: { ...edge, index: item.index, event: item.event, sourceAttemptTs: item.event.ts || null, loadComplete: load, transition: null } };
    if (rerun && transition.exact && profileMatches) return { ok: true, stage: 'synchronized_initial_profile', handoff: { ...edge, index: item.index, event: item.event, sourceAttemptTs: item.event.ts || null, loadComplete: load, transition: transition.exact } };
    const acceptedProfile = item.event.committed_after_profile_semantics;
    const guard = item.event.rerun_guard;
    if (acceptedProfile && guard && rerun && profile?.human_decision_checkpoints?.hitl2?.rerun_count === guard.next_count) {
      const comparable = structuredClone(profile);
      comparable.human_decision_checkpoints.hitl2.rerun_count = guard.current_count;
      if (JSON.stringify(comparable) === JSON.stringify(acceptedProfile)) {
        return { ok: true, stage: 'synchronized_count_incremented', handoff: { ...edge, index: item.index, event: item.event, sourceAttemptTs: item.event.ts || null, loadComplete: load, transition: transition.exact } };
      }
    }
  }
  return { ok: false, reason_code: 'event_stage_drift', reason: 'post-final event/load/status/profile facts do not form an accepted stage', handoff: { ...edge, index: item.index, event: item.event, loadComplete: load, transition: transition.exact } };
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

  const normal = latestLegalPassedHandoff(ctx.events, ctx.topology);
  const exceptionalStage = inspectPostFinalHandoffStage(bundlePath);
  const exceptional = exceptionalStage.ok && exceptionalStage.stage === 'pre_entry' ? exceptionalStage.handoff : null;
  const latest = exceptional && (!normal || exceptional.index > normal.index) ? exceptional : normal;
  if (!latest) {
    if (exceptionalStage.reason_code === 'accepted_workspace') {
      const operationId = exceptionalStage.workspace?.operationId;
      return {
        ok: false,
        reason: exceptionalStage.reason,
        advice: operationId ? [`Run exact recovery: node DPT_FRAMEWORK/cli/operate-post-final-recovery.mjs recover --bundle ${bundlePath} --operation-id ${operationId}`] : [],
      };
    }
    return {
      ok: false,
      reason: exceptionalStage.reason_code !== 'missing_event' ? exceptionalStage.reason : 'no latest passed deterministic gate_attempt with non-null next was found',
      advice: ['Rerun the source gate and use its check.next value with enter-phase, or complete the accepted post-final recovery owner.'],
    };
  }

  if (latest.targetNode !== targetNode) {
    return {
      ok: false,
      reason: `requested node "${targetNode}" is not authorized by latest deterministic handoff; latest target is "${latest.targetNode}" from ${latest.kind === 'post_final_reentry' ? 'post_final_reentry' : latest.sourceGate}`,
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

  const normal = latestLegalPassedHandoff(ctx.events, ctx.topology);
  const exceptionalStage = sourceGateEnum === 'hitl2_recorded' ? inspectPostFinalHandoffStage(bundlePath) : null;
  if (exceptionalStage?.reason_code === 'accepted_workspace') {
    const operationId = exceptionalStage.workspace?.operationId;
    return { ok: false, reason: exceptionalStage.reason, advice: operationId ? [`node DPT_FRAMEWORK/cli/operate-post-final-recovery.mjs recover --bundle ${bundlePath} --operation-id ${operationId}`] : [] };
  }
  if (exceptionalStage && !exceptionalStage.ok && !['missing_event', 'superseded_event'].includes(exceptionalStage.reason_code)) {
    return { ok: false, reason: exceptionalStage.reason, advice: ['Resolve the named exceptional handoff conflict before status synchronization.'] };
  }
  const exceptional = exceptionalStage?.ok && ['loaded_pending_status', 'synchronized_initial_profile'].includes(exceptionalStage.stage) ? exceptionalStage.handoff : null;
  const latest = exceptional && (!normal || exceptional.index > normal.index) ? exceptional : normal;
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

  if (latest.kind === 'post_final_reentry') {
    if (!latest.loadComplete) {
      return { ok: false, reason: 'missing route-bound load_complete for accepted post-final rerun event', advice: [`Run: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node ${latest.targetNode}`], latest };
    }
    return { ok: true, covered: true, handoff: latest, exceptional: true, stage: exceptionalStage.stage };
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

  const normal = latestLegalPassedHandoff(ctx.events, ctx.topology);
  const exceptionalStage = currentNodeRef === 'phases/phase-rerun.md' ? inspectPostFinalHandoffStage(bundlePath) : null;
  if (exceptionalStage?.reason_code === 'accepted_workspace') {
    const operationId = exceptionalStage.workspace?.operationId;
    return {
      ok: false,
      inspect: [exceptionalStage.reason],
      advice: operationId ? [`node DPT_FRAMEWORK/cli/operate-post-final-recovery.mjs recover --bundle ${bundlePath} --operation-id ${operationId}`] : [],
    };
  }
  if (exceptionalStage?.ok && exceptionalStage.stage === 'pre_entry') {
    return {
      ok: false,
      inspect: ['Accepted post-final rerun event has not been consumed by route-bound enter-phase.'],
      advice: [`node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node phases/phase-rerun.md`],
      handoff: exceptionalStage.handoff,
    };
  }
  if (exceptionalStage?.ok && exceptionalStage.stage === 'loaded_pending_status') {
    return {
      ok: false,
      inspect: ['Accepted post-final rerun entry is waiting for existing HITL2 status synchronization.'],
      advice: [`node DPT_FRAMEWORK/cli/advance-status.mjs --bundle ${bundlePath} --to hitl2_recorded`],
      handoff: exceptionalStage.handoff,
    };
  }
  if (exceptionalStage && !exceptionalStage.ok && !['missing_event', 'superseded_event'].includes(exceptionalStage.reason_code)) {
    return { ok: false, inspect: [exceptionalStage.reason], advice: ['Resolve the named post-final recovery lineage conflict before rerunning this gate.'], handoff: exceptionalStage.handoff || null };
  }
  const exceptional = exceptionalStage?.ok && ['synchronized_initial_profile', 'synchronized_count_incremented'].includes(exceptionalStage.stage) ? exceptionalStage.handoff : null;
  const latest = exceptional && (!normal || exceptional.index > normal.index) ? exceptional : normal;
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

  if (latest.kind === 'post_final_reentry') {
    return { ok: true, handoff: latest, exceptional: true, stage: exceptionalStage.stage };
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
