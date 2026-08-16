// handoff-helpers.mjs — Trace-backed lifecycle handoff validation
// @impl CPT-003, CPT-004, GSK-007

// Navigation: public API — BOOTSTRAP_TARGET_NODES, COVERED_PREFLIGHT_TARGET_NODES, COVERED_ENTRY_TARGET_NODES, COVERED_SOURCE_NODES, gateKeyToEnum, gateEnumToKey, loadHandoffTopology, readTraceEventsWithIndex, findLatestLegalHandoff, inspectPostFinalHandoffStage, evaluateFinalEntryAdmission, validateEnterPhaseTarget, validateSourceGateStatusSync, checkPhaseHandoffPreflight
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { PostFinalRecoveryEventSchema } from './post-final-reentry-contract.mjs';
import { computeResearchStyleParams } from './research-style-params.mjs';
import { makeContractFinding, projectFindingCompatibility } from './wave-contract-findings.mjs';
import { readGateDefinitionSnapshot } from '../../schema/contracts/gate-definition.mjs';
import {
  digestFinalReportInventoryEntries,
  readFinalReportInventory,
} from './final-report-series.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_DIR = join(__dirname, '..', '..');
const WORKFLOWS_DIR = join(__dirname, '..', '..', 'workflows');
const RESEARCH_STYLES_DIR = join(FRAMEWORK_DIR, 'schema', 'research-styles');
const RERUN_DEFINITION_PATH = join(FRAMEWORK_DIR, 'schema', 'gate_definitions', 'gate-rerun-ready.definition.json');

const POST_FINAL_OWNERS = Object.freeze({
  pre_entry: { kind: 'enter_phase', target_ref: 'phases/phase-rerun.md' },
  loaded_pending_status: { kind: 'advance_status', target_ref: 'hitl2_recorded' },
  synchronized_initial_profile: { kind: 'topic_state', target_ref: 'canonical-topic-state' },
  synchronized_count_incremented: { kind: 'rerun_gate', target_ref: 'rerun_ready' },
  descendant_pipeline: { kind: 'current_owner', target_ref: 'current lifecycle owner' },
});

function withOwner(value, owner = POST_FINAL_OWNERS[value.stage]) {
  return owner ? { ...value, owner: { ...owner } } : value;
}

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

function handoffFailure(input, extras = {}) {
  const compatibility = projectFindingCompatibility(makeContractFinding({
    findingSource: 'checker',
    classification: 'blocking',
    ...input,
  }));
  return { ok: false, ...compatibility, ...extras };
}

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
    { requireLoad, bundlePath },
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

function canonicalTopicCount(bundlePath) {
  const raw = readFileSync(join(bundlePath, 'rb_plan.md'), 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error('rb_plan.md frontmatter is missing');
  const plan = parseYaml(match[1]);
  if (!Array.isArray(plan?.topic_registry)) throw new Error('canonical topic_registry is missing');
  return plan.topic_registry.length;
}

function classifyPostFinalProfile(bundlePath, current, accepted, guard) {
  if (!current || !accepted || !guard) return { ok: false, reason: 'profile lineage inputs are incomplete' };
  const acceptedCount = accepted?.human_decision_checkpoints?.hitl2?.rerun_count ?? 0;
  const currentCount = current?.human_decision_checkpoints?.hitl2?.rerun_count;
  if (acceptedCount !== guard.current_count || ![guard.current_count, guard.next_count].includes(currentCount)) {
    return { ok: false, reason: 'rerun_count is outside the event-bound current/next delta' };
  }
  if (current.research_profile !== accepted.research_profile) return { ok: false, reason: 'research_profile drifted from the event-bound value' };

  let projection;
  try {
    const definition = readJson(join(RESEARCH_STYLES_DIR, `${accepted.research_profile}.json`));
    projection = computeResearchStyleParams({ styleDefinition: definition, topicCount: canonicalTopicCount(bundlePath) });
  } catch (error) {
    return { ok: false, reason: `cannot compute event-bound research style projection: ${error.message}` };
  }
  const acceptedStyle = accepted.research_style_params;
  const currentStyle = current.research_style_params;
  const unchangedStyle = JSON.stringify(currentStyle) === JSON.stringify(acceptedStyle);
  const projectedStyle = JSON.stringify(currentStyle) === JSON.stringify(projection);
  if (!unchangedStyle && !projectedStyle) return { ok: false, reason: 'research_style_params match neither event-bound values nor the exact current projection' };

  const comparable = structuredClone(current);
  comparable.human_decision_checkpoints.hitl2.rerun_count = acceptedCount;
  comparable.research_style_params = acceptedStyle;
  if (JSON.stringify(comparable) !== JSON.stringify(accepted)) return { ok: false, reason: 'profile contains unrelated event-lineage drift' };

  return {
    ok: true,
    count: currentCount === guard.current_count ? 'current' : 'next',
    style: unchangedStyle ? 'event_bound' : 'projected',
    projectionDiffers: JSON.stringify(projection) !== JSON.stringify(acceptedStyle),
  };
}

function inspectNormalDescendant(events, latest, item, status) {
  if (!latest || latest.index <= item.index) return null;
  const handoff = makeHandoff({ index: latest.index, event: latest.event }, latest, events);
  if (!handoff.ok) return { ok: false, reason_code: 'descendant_handoff_invalid', reason: handoff.reason };
  const current = handoff.handoff;
  const sourceWindow = status.next_gate === current.sourceGateEnum;
  if (!current.loadComplete) {
    if (status.current_node !== current.sourceNode || !sourceWindow) return { ok: false, reason_code: 'descendant_source_drift', reason: 'passed descendant Gate is not aligned with the current source node/status window' };
    return withOwner({ ok: true, stage: 'descendant_pipeline', handoff: current, lineage: { event: item.event, index: item.index, eventLineSha256: item.lineSha256 } }, { kind: 'enter_phase', target_ref: current.targetNode });
  }
  if (status.current_node !== current.targetNode) return { ok: false, reason_code: 'descendant_load_drift', reason: 'route-bound descendant load does not match the current target node' };
  const transitions = events.filter((candidate) => candidate.index > current.loadComplete.index && candidate.event?.event === 'phase_transition');
  const exact = transitions.find((candidate) => candidate.event.to === current.sourceGateEnum && candidate.event.next === current.targetGateEnum) || null;
  const conflict = transitions.find((candidate) => !exact || candidate.index !== exact.index) || null;
  if (conflict) return { ok: false, reason_code: 'descendant_transition_conflict', reason: `conflicting descendant phase_transition at trace index ${conflict.index}` };
  if (!exact) {
    if (!sourceWindow) return { ok: false, reason_code: 'descendant_status_drift', reason: 'loaded descendant target no longer has the source Gate status window' };
    return withOwner({ ok: true, stage: 'descendant_pipeline', handoff: { ...current, transition: null }, lineage: { event: item.event, index: item.index, eventLineSha256: item.lineSha256 } }, { kind: 'advance_status', target_ref: current.sourceGateEnum });
  }
  if (status.current_gate !== current.sourceGateEnum || status.next_gate !== current.targetGateEnum) {
    return { ok: false, reason_code: 'descendant_status_drift', reason: 'descendant phase_transition does not match the resulting status window' };
  }
  return withOwner({ ok: true, stage: 'descendant_pipeline', handoff: { ...current, transition: exact }, lineage: { event: item.event, index: item.index, eventLineSha256: item.lineSha256 } });
}

function continuousNormalDescendant(events, topology, item) {
  const handoffs = [];
  for (const candidate of events) {
    if (candidate.index <= item.index) continue;
    const edge = edgeForAttempt(candidate, topology);
    if (!edge) continue;
    const made = makeHandoff(candidate, edge, events);
    if (!made.ok) continue;
    handoffs.push(made.handoff);
  }
  if (handoffs.length === 0) return { ok: true, latest: null };
  if (handoffs[0].sourceNode !== 'phases/phase-rerun.md') {
    return { ok: false, reason: 'normal descendant lineage does not begin at the accepted rerun node' };
  }
  for (let index = 1; index < handoffs.length; index += 1) {
    if (handoffs[index].sourceNode !== handoffs[index - 1].targetNode) {
      return { ok: false, reason: `normal descendant lineage is discontinuous at trace index ${handoffs[index].index}` };
    }
  }
  const finalHandoffs = handoffs.filter((handoff) => handoff.sourceNode === 'phases/phase-readiness.md' && handoff.targetNode === 'phases/phase-final.md');
  if (finalHandoffs.length === 0) return { ok: true, latest: handoffs.at(-1) };
  if (finalHandoffs.length !== 1 || finalHandoffs[0].index !== handoffs.at(-1).index) {
    return { ok: false, reason: 'post-final descendant lineage contains conflicting authority after a newer Final handoff' };
  }
  return { ok: true, latest: handoffs.at(-1), newerFinal: finalHandoffs[0] };
}

function retiredPostFinalWitness(item, edge) {
  return {
    event: item.event,
    index: item.index,
    eventLineSha256: item.lineSha256,
    operationId: edge.operationId,
    eventId: edge.eventId,
    previousFinal: edge.previousFinal,
  };
}

function proveNewerFinalAppend(inventory, priorInventorySha256) {
  const removable = inventory.primary_series.primary_entries
    .filter((entry) => entry.kind === 'revision')
    .slice()
    .reverse();
  const removedTargets = [];
  for (const entry of removable) {
    removedTargets.push(entry.target);
    const removed = new Set(removedTargets);
    const priorEntries = inventory.entries.filter((item) => !removed.has(item.path));
    if (digestFinalReportInventoryEntries(priorEntries) === priorInventorySha256) {
      return {
        matched: true,
        removed_targets: [...removedTargets],
        current_target: inventory.primary_series.latest?.target || null,
      };
    }
  }
  return { matched: false };
}

function inspectNewerFinalStage({ bundlePath, item, edge, descendantChain, status }) {
  const handoff = descendantChain.newerFinal;
  const retiredEvent = retiredPostFinalWitness(item, edge);
  const base = {
    ok: true,
    handoff,
    retired_event: retiredEvent,
    lineage: retiredEvent,
  };

  if (!handoff.loadComplete) {
    return withOwner({ ...base, stage: 'newer_final_entry_pending' }, {
      kind: 'enter_phase',
      target_ref: 'phases/phase-final.md',
    });
  }
  if (status.current_node !== 'phases/phase-final.md') {
    return {
      ok: false,
      reason_code: 'newer_final_load_drift',
      reason: 'newer Final load exists but rb_status.json does not retain the Final current-node coordinate',
      handoff,
      retired_event: retiredEvent,
    };
  }
  if (status.current_gate !== 'readiness_passed' || status.next_gate !== 'none') {
    return withOwner({ ...base, stage: 'newer_final_loaded_pending_status' }, {
      kind: 'advance_status',
      target_ref: 'readiness_passed',
    });
  }

  let inventory;
  try {
    inventory = readFinalReportInventory(bundlePath);
  } catch (error) {
    return {
      ok: false,
      reason_code: 'newer_final_inventory_invalid',
      reason: `cannot read newer Final inventory: ${error.message}`,
      handoff,
      retired_event: retiredEvent,
    };
  }
  if (!inventory.primary_series.valid) {
    const first = inventory.primary_series.blockers[0];
    return {
      ok: false,
      reason_code: 'newer_final_inventory_invalid',
      reason: `newer Final primary inventory is invalid: ${first.code}: ${first.detail}`,
      handoff,
      retired_event: retiredEvent,
    };
  }
  if (inventory.sha256 === edge.previousFinal.final_inventory_sha256) {
    return withOwner({ ...base, stage: 'newer_final_delivery_pending', inventory }, {
      kind: 'current_owner',
      target_ref: 'phases/phase-final.md',
    });
  }
  const appendProof = proveNewerFinalAppend(inventory, edge.previousFinal.final_inventory_sha256);
  if (!appendProof.matched) {
    return {
      ok: false,
      reason_code: 'newer_final_inventory_drift',
      reason: 'newer Final inventory is neither the accepted prior inventory nor a proven immutable canonical append',
      handoff,
      retired_event: retiredEvent,
    };
  }
  return withOwner({ ...base, stage: 'retired_by_newer_final', inventory, append_proof: appendProof }, {
    kind: 'current_owner',
    target_ref: 'phases/phase-final.md',
  });
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
  const descendantChain = continuousNormalDescendant(trace.events, topology, item);
  if (!descendantChain.ok) return { ok: false, reason_code: 'descendant_lineage_drift', reason: descendantChain.reason };
  const latestNormal = descendantChain.latest;
  const statusPath = join(bundlePath, 'rb_status.json');
  const profilePath = join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(statusPath) || !existsSync(profilePath)) return { ok: false, reason_code: 'control_missing', reason: 'status/profile files are required' };
  const statusRaw = readFileSync(statusPath);
  const profileRaw = readFileSync(profilePath);
  const profile = parseYaml(profileRaw.toString('utf8'));
  const status = JSON.parse(statusRaw.toString('utf8'));
  if (descendantChain.newerFinal) {
    return inspectNewerFinalStage({ bundlePath, item, edge, descendantChain, status });
  }
  const profileSha256 = createHash('sha256').update(profileRaw).digest('hex');
  const load = findBoundPostFinalLoad(trace.events, item, edge);
  const transition = findBoundPostFinalTransition(trace.events, item, edge, load);
  const acceptedProfile = item.event.committed_after_profile_semantics;
  const guard = item.event.rerun_guard;
  const profileClass = classifyPostFinalProfile(bundlePath, profile, acceptedProfile, guard);
  const definitionDigest = createHash('sha256').update(readGateDefinitionSnapshot(RERUN_DEFINITION_PATH).rawBytes).digest('hex');
  if (currentCountBeforeIncrement(profile, guard) && definitionDigest !== guard.definition_sha256) {
    return { ok: false, reason_code: 'rerun_rule_drift', reason: 'active rerun-limit definition drifted before the bound count increment' };
  }
  const descendant = inspectNormalDescendant(trace.events, latestNormal, item, status);
  if (descendant) return descendant;
  const terminal = status.current_node === 'phases/phase-final.md' && status.current_gate === 'readiness_passed' && status.next_gate === 'none';
  const rerun = status.current_node === edge.targetNode && status.current_gate === 'hitl2_recorded' && status.next_gate === edge.targetGateEnum;
  const profileMatches = profileSha256 === edge.committedAfterProfileSha256;
  if (terminal && profileMatches) return withOwner({ ok: true, stage: 'pre_entry', handoff: { ...edge, index: item.index, event: item.event, sourceAttemptTs: item.event.ts || null, loadComplete: load, transition: null } });
  if (status.current_node === edge.targetNode && load) {
    if (transition.conflict) return { ok: false, reason_code: 'conflicting_transition', reason: `conflicting exceptional phase_transition at trace index ${transition.conflict.index}`, handoff: { ...edge, index: item.index, event: item.event, loadComplete: load } };
    if (!transition.exact && profileMatches) return withOwner({ ok: true, stage: 'loaded_pending_status', handoff: { ...edge, index: item.index, event: item.event, sourceAttemptTs: item.event.ts || null, loadComplete: load, transition: null } });
    if (rerun && transition.exact && profileClass.ok) {
      const handoff = { ...edge, index: item.index, event: item.event, sourceAttemptTs: item.event.ts || null, loadComplete: load, transition: transition.exact };
      if (profileClass.count === 'current') {
        const owner = profileClass.style === 'projected' && profileClass.projectionDiffers
          ? { kind: 'current_owner', target_ref: 'rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count' }
          : POST_FINAL_OWNERS.synchronized_initial_profile;
        return withOwner({ ok: true, stage: 'synchronized_initial_profile', handoff, profile_class: profileClass }, owner);
      }
      return withOwner({ ok: true, stage: 'synchronized_count_incremented', handoff, profile_class: profileClass });
    }
  }
  return { ok: false, reason_code: 'event_stage_drift', reason: 'post-final event/load/status/profile facts do not form an accepted stage', handoff: { ...edge, index: item.index, event: item.event, loadComplete: load, transition: transition.exact } };
}

function currentCountBeforeIncrement(profile, guard) {
  return profile?.human_decision_checkpoints?.hitl2?.rerun_count !== guard?.next_count;
}

function setupReadyRouteBinding(bundlePath, traceEvent) {
  const event = traceEvent.event;
  if (event.gate !== 'setup-ready') return { ok: true };
  if (typeof event.gate_attempt_id !== 'string' || !event.gate_attempt_id || typeof event.plan_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(event.plan_sha256)) {
    return { ok: false, reason: 'setup-ready route is missing a valid gate_attempt_id or plan_sha256 binding' };
  }
  if (typeof event.checkpoint_ref !== 'string' || !/^_checkpoints\/[^/]+\.json$/.test(event.checkpoint_ref) || event.checkpoint_ref.includes('..')) {
    return { ok: false, reason: 'setup-ready route checkpoint_ref must directly name one bundle-relative _checkpoints/*.json file' };
  }
  const checkpointPath = join(bundlePath, event.checkpoint_ref);
  let checkpoint;
  try {
    const info = lstatSync(checkpointPath);
    if (info.isSymbolicLink() || !info.isFile()) return { ok: false, reason: 'setup-ready route checkpoint_ref is not a regular non-symlink file' };
    checkpoint = JSON.parse(readFileSync(checkpointPath, 'utf-8'));
  } catch (error) {
    return { ok: false, reason: `setup-ready route checkpoint is unreadable: ${error.message}` };
  }
  const evaluation = checkpoint.content_evaluation_ref;
  if (checkpoint.trigger !== 'setup_route_pending' || checkpoint.route_state !== 'pending' || Object.hasOwn(checkpoint, 'gate_result_ref')) {
    return { ok: false, reason: 'setup-ready route checkpoint does not have the required pending checkpoint shape' };
  }
  if (checkpoint.gate_attempt_id !== event.gate_attempt_id || !evaluation || evaluation.gate !== event.gate || evaluation.passed !== event.passed || evaluation.currentNodeRef !== event.currentNodeRef || evaluation.candidate_next !== event.next) {
    return { ok: false, reason: 'setup-ready route checkpoint facts do not bind the gate_attempt trace' };
  }
  const checkpointHash = checkpoint.hashes?.['rb_plan.md']?.sha256;
  let currentHash;
  try { currentHash = createHash('sha256').update(readFileSync(join(bundlePath, 'rb_plan.md'))).digest('hex'); } catch (error) { return { ok: false, reason: `setup-ready route cannot read current rb_plan.md: ${error.message}` }; }
  if (checkpointHash !== event.plan_sha256 || currentHash !== event.plan_sha256) {
    return { ok: false, reason: 'setup-ready route checkpoint, trace, and current rb_plan.md hashes do not agree' };
  }
  return { ok: true, checkpoint };
}

function makeHandoff(traceEvent, edge, events, { requireLoad = false, bundlePath = null } = {}) {
  const superseder = supersededBy(events, traceEvent);
  if (superseder) {
    return {
      ok: false,
      reason: `source gate "${traceEvent.event.gate}" pass at trace index ${traceEvent.index} is superseded by gate_attempt at trace index ${superseder.index}`,
      superseder,
    };
  }

  if (edge.sourceGate === 'setup-ready') {
    if (!bundlePath) return { ok: false, reason: 'setup-ready route binding requires an explicit bundle path' };
    const setupBinding = setupReadyRouteBinding(bundlePath, traceEvent);
    if (!setupBinding.ok) return { ok: false, reason: setupBinding.reason };
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
    sourceAttemptLineSha256: traceEvent.lineSha256 || null,
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

function routeBoundFinalLoads(events, topology) {
  const loads = [];
  for (const item of events) {
    const edge = edgeForAttempt(item, topology);
    if (!edge || edge.sourceNode !== 'phases/phase-readiness.md' || edge.targetNode !== 'phases/phase-final.md') continue;
    const handoff = {
      index: item.index,
      sourceGate: edge.sourceGate,
      sourceNode: edge.sourceNode,
      targetNode: edge.targetNode,
    };
    const loadComplete = findBoundLoad(events, handoff);
    if (loadComplete) loads.push({ ...handoff, loadComplete });
  }
  return loads;
}

/**
 * Evaluate only the filesystem/provenance baseline that must exist before the
 * first route-bound load for a newly authorized Final handoff. This is not a
 * publisher, delivery, or user-feedback verdict.
 */
export function evaluateFinalEntryAdmission(bundlePath, handoff) {
  if (handoff?.sourceNode !== 'phases/phase-readiness.md' || handoff?.targetNode !== 'phases/phase-final.md') {
    return { ok: true, applicable: false, mode: 'not_final' };
  }
  const ctx = contextFor(bundlePath);
  if (!ctx.ok) return { ok: false, reason: ctx.reason };

  const existingLoad = findBoundLoad(ctx.events, handoff);
  if (existingLoad) {
    return { ok: true, applicable: true, mode: 'already_bound', loadComplete: existingLoad };
  }

  let inventory;
  try {
    inventory = readFinalReportInventory(bundlePath);
  } catch (error) {
    return { ok: false, reason: `cannot read Final inventory before entry: ${error.message}` };
  }
  if (!inventory.primary_series.valid) {
    const first = inventory.primary_series.blockers[0];
    return { ok: false, reason: `Final primary inventory is invalid before entry: ${first.code}: ${first.detail}` };
  }

  const earlierFinalLoads = routeBoundFinalLoads(ctx.events, ctx.topology)
    .filter((item) => item.index !== handoff.index);
  if (earlierFinalLoads.length === 0) {
    if (inventory.primary_series.classification !== 'empty') {
      return {
        ok: false,
        reason: `first Final entry requires an empty primary inventory; found ${inventory.primary_series.classification}. A pre-0edb58310 Final load ({entry, plan, ts} only) is outside the readability guarantee and cannot be admitted as a route-bound Final load.`,
        inventory,
      };
    }
    return { ok: true, applicable: true, mode: 'first_empty', inventory };
  }

  const postFinal = inspectPostFinalHandoffStage(bundlePath);
  if (!postFinal.ok) {
    return {
      ok: false,
      reason: `later Final entry requires one accepted retired C5 witness: ${postFinal.reason}`,
      inventory,
    };
  }
  if (postFinal.stage !== 'newer_final_entry_pending' || postFinal.handoff?.index !== handoff.index || !postFinal.retired_event) {
    return {
      ok: false,
      reason: 'later Final entry is not the unique entry-pending descendant of an accepted C5 lineage',
      inventory,
    };
  }
  if (inventory.sha256 !== postFinal.retired_event.previousFinal.final_inventory_sha256) {
    return {
      ok: false,
      reason: 'Final inventory drifted from the accepted C5 prior-inventory digest before later Final entry',
      inventory,
      retired_event: postFinal.retired_event,
    };
  }
  return {
    ok: true,
    applicable: true,
    mode: 'post_c5_prior_inventory',
    inventory,
    retired_event: postFinal.retired_event,
  };
}

export function validateEnterPhaseTarget(bundlePath, targetNode) {
  const ctx = contextFor(bundlePath);
  if (!ctx.ok) return { ok: false, reason: ctx.reason, advice: [] };

  const normal = latestLegalPassedHandoff(ctx.events, ctx.topology, () => true, { bundlePath });
  const exceptionalStage = inspectPostFinalHandoffStage(bundlePath);
  const exceptional = exceptionalStage.ok && exceptionalStage.stage === 'pre_entry' ? exceptionalStage.handoff : null;
  const latest = exceptional && (!normal || exceptional.index > normal.index) ? exceptional : normal;
  if (!latest) {
    const rejectedSetup = [...ctx.events].reverse().find((item) => {
      const edge = edgeForAttempt(item, ctx.topology);
      return edge?.sourceGate === 'setup-ready' && edge.targetNode === targetNode;
    });
    if (rejectedSetup) {
      const binding = setupReadyRouteBinding(bundlePath, rejectedSetup);
      if (!binding.ok) {
        return {
          ok: false,
          reason: binding.reason,
          advice: ['Repair the named setup-ready route persistence fact and rerun the same setup-ready Gate.'],
        };
      }
    }
    if (exceptionalStage.reason_code === 'accepted_workspace') {
      const operationId = exceptionalStage.workspace?.operationId;
      return {
        ok: false,
        reason: exceptionalStage.reason,
        advice: operationId ? [`Run exact recovery: node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs recover --bundle ${bundlePath} --operation-id ${operationId}`] : [],
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
      advice: [`Run enter-phase with the latest check.next: node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node ${latest.targetNode}`],
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

  const normal = latestLegalPassedHandoff(ctx.events, ctx.topology, () => true, { bundlePath });
  const exceptionalStage = sourceGateEnum === 'hitl2_recorded' ? inspectPostFinalHandoffStage(bundlePath) : null;
  if (exceptionalStage?.reason_code === 'accepted_workspace') {
    const operationId = exceptionalStage.workspace?.operationId;
    return { ok: false, reason: exceptionalStage.reason, advice: operationId ? [`node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs recover --bundle ${bundlePath} --operation-id ${operationId}`] : [] };
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
        `If you just passed ${latest.sourceGate}, consume its check.next first: node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node ${latest.targetNode}`,
        `Then sync the source gate with: node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle ${bundlePath} --to ${latest.sourceGateEnum}`,
      ],
      latest,
    };
  }

  if (latest.kind === 'post_final_reentry') {
    if (!latest.loadComplete) {
      return { ok: false, reason: 'missing route-bound load_complete for accepted post-final rerun event', advice: [`Run: node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node ${latest.targetNode}`], latest };
    }
    return { ok: true, covered: true, handoff: latest, exceptional: true, stage: exceptionalStage.stage };
  }

  const made = makeHandoff({ index: latest.index, event: latest.event, lineSha256: latest.sourceAttemptLineSha256 }, {
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
  }, ctx.events, { requireLoad: COVERED_ENTRY_TARGET_NODES.has(latest.targetNode), bundlePath });

  if (!made.ok) {
    return {
      ok: false,
      reason: made.reason,
      advice: [`Run: node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node ${latest.targetNode}`],
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
    return handoffFailure({
      id: 'handoff_preflight_inputs_invalid',
      ruleId: 'handoff_preflight_inputs_invalid',
      blockingBasis: 'configuration_integrity',
      surface: 'workflow topology and rb_trace.jsonl',
      expected: 'Parseable workflow topology and trace inputs for deterministic handoff validation.',
      observed: ctx.reason,
      missingFact: ctx.reason,
      repairKind: 'missing_contract',
      writeTo: 'Gate handoff-preflight input contract boundary',
      detail: ctx.reason,
      repair: 'Fix trace/topology inputs before rerunning this gate.',
    });
  }

  const normal = latestLegalPassedHandoff(ctx.events, ctx.topology, () => true, { bundlePath });
  const exceptionalStage = currentNodeRef === 'phases/phase-rerun.md' ? inspectPostFinalHandoffStage(bundlePath) : null;
  if (exceptionalStage?.reason_code === 'accepted_workspace') {
    const operationId = exceptionalStage.workspace?.operationId;
    return {
      ...handoffFailure({
        id: 'handoff_post_final_recovery_required',
        ruleId: 'handoff_post_final_recovery_required',
        blockingBasis: 'authority_integrity',
        surface: exceptionalStage.workspace?.workspace || '_diagnostics/post-final-recovery',
        expected: 'The accepted post-final recovery workspace is completed before Gate preflight.',
        observed: exceptionalStage.reason,
        missingFact: exceptionalStage.reason,
        repairKind: operationId ? 'engine_operation' : 'missing_contract',
        writeTo: operationId
          ? `node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs recover --bundle ${bundlePath} --operation-id ${operationId}`
          : 'Post-final recovery workspace contract boundary',
        detail: exceptionalStage.reason,
        repair: operationId ? `node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs recover --bundle ${bundlePath} --operation-id ${operationId}` : null,
      }),
    };
  }
  if (exceptionalStage?.ok && exceptionalStage.stage === 'pre_entry') {
    return handoffFailure({
      id: 'handoff_post_final_entry_missing',
      ruleId: 'handoff_post_final_entry_missing',
      blockingBasis: 'binding_integrity',
      surface: 'rb_trace.jsonl#route-bound load_complete',
      expected: 'The accepted post-final rerun event is consumed by enter-phase.',
      observed: 'route-bound rerun load_complete absent',
      missingFact: 'Accepted post-final rerun event has not been consumed by route-bound enter-phase.',
      repairKind: 'engine_operation',
      writeTo: `node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node phases/phase-rerun.md`,
      detail: 'Accepted post-final rerun event has not been consumed by route-bound enter-phase.',
      repair: `node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node phases/phase-rerun.md`,
    }, { handoff: exceptionalStage.handoff });
  }
  if (exceptionalStage?.ok && exceptionalStage.stage === 'loaded_pending_status') {
    return handoffFailure({
      id: 'handoff_post_final_status_pending',
      ruleId: 'handoff_post_final_status_pending',
      blockingBasis: 'binding_integrity',
      surface: 'rb_status.json HITL2 rerun window',
      expected: 'Existing HITL2 source-gate status synchronization after route-bound rerun entry.',
      observed: 'status synchronization pending',
      missingFact: 'Accepted post-final rerun entry is waiting for existing HITL2 status synchronization.',
      repairKind: 'engine_operation',
      writeTo: `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle ${bundlePath} --to hitl2_recorded`,
      detail: 'Accepted post-final rerun entry is waiting for existing HITL2 status synchronization.',
      repair: `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle ${bundlePath} --to hitl2_recorded`,
    }, { handoff: exceptionalStage.handoff });
  }
  if (exceptionalStage && !exceptionalStage.ok && !['missing_event', 'superseded_event'].includes(exceptionalStage.reason_code)) {
    return handoffFailure({
      id: 'handoff_post_final_lineage_conflict',
      ruleId: 'handoff_post_final_lineage_conflict',
      blockingBasis: 'binding_integrity',
      surface: 'post-final recovery lineage',
      expected: 'One valid non-conflicting post-final rerun lineage.',
      observed: exceptionalStage.reason,
      missingFact: exceptionalStage.reason,
      repairKind: 'missing_contract',
      writeTo: 'Post-final recovery lineage repair boundary',
      detail: exceptionalStage.reason,
      repair: 'Resolve the named post-final recovery lineage conflict before rerunning this gate.',
    }, { handoff: exceptionalStage.handoff || null });
  }
  const exceptional = exceptionalStage?.ok && ['synchronized_initial_profile', 'synchronized_count_incremented'].includes(exceptionalStage.stage) ? exceptionalStage.handoff : null;
  const latest = exceptional && (!normal || exceptional.index > normal.index) ? exceptional : normal;
  if (!latest) {
    const detail = `Missing witnessed handoff into ${currentNodeRef}. Expected a prior gate_attempt(passed=true,next="${currentNodeRef}") followed by route-bound load_complete.`;
    return handoffFailure({
      id: 'handoff_witness_missing',
      ruleId: 'handoff_witness_missing',
      blockingBasis: 'binding_integrity',
      surface: 'rb_trace.jsonl#gate_attempt+load_complete',
      expected: `A passed predecessor Gate handoff and route-bound load_complete into ${currentNodeRef}.`,
      observed: 'no current legal handoff witness',
      missingFact: detail,
      repairKind: 'missing_contract',
      writeTo: `Predecessor Gate handoff boundary for ${currentNodeRef}`,
      detail,
      repair: 'Rerun the legal predecessor Gate and consume its check.next through enter-phase.',
    });
  }

  if (latest.targetNode !== currentNodeRef) {
    const detail = `Latest deterministic handoff targets ${latest.targetNode}, not current node ${currentNodeRef}.`;
    return handoffFailure({
      id: 'handoff_target_mismatch',
      ruleId: 'handoff_target_mismatch',
      blockingBasis: 'binding_integrity',
      surface: 'latest deterministic Gate handoff',
      expected: currentNodeRef,
      observed: latest.targetNode,
      missingFact: detail,
      repairKind: 'engine_operation',
      writeTo: `node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node ${latest.targetNode}`,
      detail,
      repair: `Continue from the latest checked handoff target: node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node ${latest.targetNode}`,
    }, { handoff: latest });
  }

  if (latest.kind === 'post_final_reentry') {
    return { ok: true, handoff: latest, exceptional: true, stage: exceptionalStage.stage };
  }

  const made = makeHandoff({ index: latest.index, event: latest.event, lineSha256: latest.sourceAttemptLineSha256 }, {
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
  }, ctx.events, { requireLoad: true, bundlePath });

  if (!made.ok) {
    return handoffFailure({
      id: 'handoff_load_binding_missing',
      ruleId: 'handoff_load_binding_missing',
      blockingBasis: 'binding_integrity',
      surface: 'rb_trace.jsonl#load_complete',
      expected: `A route-bound load_complete for the witnessed handoff into ${currentNodeRef}.`,
      observed: made.reason,
      missingFact: made.reason,
      repairKind: 'engine_operation',
      writeTo: `node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node ${currentNodeRef}`,
      detail: made.reason,
      repair: `Run enter-phase with the source gate check.next before this gate: node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node ${currentNodeRef}`,
    }, { handoff: latest });
  }

  const handoff = made.handoff;

  const statusPath = join(bundlePath, 'rb_status.json');
  if (!existsSync(statusPath)) {
    return handoffFailure({
      id: 'handoff_status_authority_missing',
      ruleId: 'handoff_status_authority_missing',
      blockingBasis: 'authority_integrity',
      surface: 'rb_status.json',
      expected: 'Engine-owned status authority for the witnessed handoff window.',
      observed: 'file absent',
      missingFact: 'rb_status.json not found.',
      repairKind: 'missing_contract',
      writeTo: 'Engine-owned status recovery boundary',
      detail: 'rb_status.json not found',
      repair: 'Restore rb_status.json through checkpoint/rollback or the valid Engine transition owner before rerunning this Gate.',
    });
  }

  let status;
  try {
    status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  } catch (err) {
    const detail = `rb_status.json is not valid JSON: ${err.message}`;
    return handoffFailure({
      id: 'handoff_status_authority_invalid',
      ruleId: 'handoff_status_authority_invalid',
      blockingBasis: 'authority_integrity',
      surface: 'rb_status.json',
      expected: 'Parseable Engine-owned status authority.',
      observed: err.message,
      missingFact: detail,
      repairKind: 'missing_contract',
      writeTo: 'Engine-owned status recovery boundary',
      detail,
      repair: 'rb_status.json is Engine-owned. Restore it from checkpoint/rollback or rerun the valid Engine transition path before rerunning this gate; do not hand-edit status authority.',
    });
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
    return handoffFailure({
      id: 'handoff_status_window_mismatch',
      ruleId: 'handoff_status_window_mismatch',
      blockingBasis: 'binding_integrity',
      surface: 'rb_status.json current_gate/next_gate',
      expected: { current_gate: expectedCurrent, next_gate: expectedNext },
      observed: { current_gate: status.current_gate, next_gate: status.next_gate },
      missingFact: inspect.join('; '),
      repairKind: 'engine_operation',
      writeTo: `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle ${bundlePath} --to ${handoff.sourceGateEnum}`,
      detail: inspect.join('; '),
      repair: `After enter-phase, sync the source gate: node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle ${bundlePath} --to ${handoff.sourceGateEnum}`,
    }, { handoff });
  }

  return { ok: true, handoff, traceEvents: ctx.events };
}
