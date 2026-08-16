// @impl POF-001, POF-002, POF-003

import {
  closeSync,
  constants,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { readGateDefinitionSnapshot } from '../../schema/contracts/gate-definition.mjs';
import { ProfileSchema } from '../../schema/contracts/profile.mjs';
import { appendExactTraceLine } from '../trace.mjs';
import { normalizedBundleBasenameFromPath } from './bundle-identity.mjs';
import { readFinalReportInventory } from './final-report-series.mjs';
import { findLatestLegalHandoff, inspectPostFinalHandoffStage, loadHandoffTopology, readTraceEventsWithIndex } from './handoff-helpers.mjs';
import { readBundlePlan, readBundleProfile } from './gate-helpers-readers.mjs';
import { evaluateRerunAvailability } from './rerun-availability.mjs';
import {
  parsePostFinalRecoveryEvent,
  POST_FINAL_RECOVERY_SCHEMA_VERSION,
  PostFinalBundleIdentitySchema as BundleIdentitySchema,
  PostFinalDigestSchema as DigestSchema,
  PostFinalExpectedLineageSchema as ExpectedFinalLineageSchema,
  PostFinalOperationIdSchema as OperationIdSchema,
  PostFinalRecoveryEventSchema as RecoveryEventSchema,
  PostFinalRerunGuardSchema as RerunGuardSchema,
  PostFinalRoutingSchema as RoutingSchema,
} from './post-final-reentry-contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = path.join(__dirname, '..', '..');
const WORKFLOWS_ROOT = path.join(FRAMEWORK_ROOT, 'workflows');
const RERUN_RULE_PATH = path.join(FRAMEWORK_ROOT, 'schema', 'gate_definitions', 'gate-rerun-ready.definition.json');

export { POST_FINAL_RECOVERY_SCHEMA_VERSION } from './post-final-reentry-contract.mjs';
export const POST_FINAL_RECOVERY_ROOT = '_diagnostics/post-final-recovery';
export const POST_FINAL_RECOVERY_ACTION = 'post_final_rerun';
export const POST_FINAL_RECOVERY_OPERATIONS = Object.freeze(['inspect', 'apply', 'recover']);
export const POST_FINAL_RECOVERY_STAGES = Object.freeze([
  'pre_entry',
  'loaded_pending_status',
  'synchronized_initial_profile',
  'synchronized_count_incremented',
  'descendant_pipeline',
  'newer_final_entry_pending',
  'newer_final_loaded_pending_status',
  'newer_final_delivery_pending',
  'retired_by_newer_final',
]);


function normalizeSemanticText(value) {
  const normalized = String(value).replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();
  if (normalized.includes('\0')) throw new Error('semantic text cannot contain NUL');
  if (!normalized) throw new Error('semantic text must be non-empty');
  return normalized;
}

const SemanticTextSchema = z.string().transform((value, context) => {
  try { return normalizeSemanticText(value); } catch (error) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: error.message });
    return z.NEVER;
  }
});

export const PostFinalRecoveryRequestSchema = z.object({
  schema_version: z.literal(POST_FINAL_RECOVERY_SCHEMA_VERSION),
  action: z.literal(POST_FINAL_RECOVERY_ACTION),
  reason: SemanticTextSchema,
  requested_scope: SemanticTextSchema,
  expected_bundle_identity: BundleIdentitySchema,
  expected_final_lineage: ExpectedFinalLineageSchema,
}).strict();

const NextActionSchema = z.object({
  kind: z.enum(['prepare_request', 'recover', 'enter_phase', 'advance_status', 'topic_state', 'rerun_gate', 'current_owner', 'new_bundle_decision', 'repair_owner']),
  command: z.string().min(1).nullable().default(null),
  target_ref: z.string().min(1).nullable().default(null),
  operation_id: OperationIdSchema.nullable().default(null),
  delivery_stage: z.enum(['delivery_pending', 'refinement']).optional(),
}).strict();

export const PostFinalRecoveryResultSchema = z.object({
  schema_version: z.literal(POST_FINAL_RECOVERY_SCHEMA_VERSION),
  operation: z.enum(POST_FINAL_RECOVERY_OPERATIONS),
  verdict: z.enum(['eligible', 'committed', 'cleaned', 'unchanged', 'recover_required', 'blocked']),
  reason_code: z.string().min(1),
  reason: z.string().min(1),
  operation_id: OperationIdSchema.nullable(),
  workspace: z.string().min(1).nullable(),
  stage: z.enum(POST_FINAL_RECOVERY_STAGES).nullable(),
  facts: z.record(z.string(), z.unknown()).nullable(),
  warnings: z.array(z.string()),
  next_action: NextActionSchema.nullable(),
}).strict().superRefine((value, context) => {
  const allowed = {
    inspect: new Set(['eligible', 'unchanged', 'recover_required', 'blocked']),
    apply: new Set(['committed', 'unchanged', 'recover_required', 'blocked']),
    recover: new Set(['committed', 'cleaned', 'blocked']),
  };
  if (!allowed[value.operation].has(value.verdict)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['verdict'], message: 'verdict is not valid for operation' });
  if (['eligible', 'committed', 'cleaned', 'unchanged', 'recover_required'].includes(value.verdict) && !value.next_action) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['next_action'], message: `${value.verdict} requires one next action` });
  }
  if (value.verdict === 'recover_required' && (!value.operation_id || value.next_action?.kind !== 'recover')) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['operation_id'], message: 'recover_required requires an operation-bound recover action' });
  }
  if (value.verdict === 'eligible' && value.next_action?.kind !== 'prepare_request') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['next_action'], message: 'eligible requires prepare_request action' });
  }
});

const PreparedManifestSchema = z.object({
  schema_version: z.literal(POST_FINAL_RECOVERY_SCHEMA_VERSION),
  state: z.literal('prepared'),
  action: z.literal(POST_FINAL_RECOVERY_ACTION),
  operation_id: OperationIdSchema,
  event_id: z.string().min(1),
  request_sha256: DigestSchema,
  bundle_identity: BundleIdentitySchema,
  final_lineage: ExpectedFinalLineageSchema,
  before_profile_sha256: DigestSchema,
  after_profile_sha256: DigestSchema,
  terminal_status_sha256: DigestSchema,
  final_inventory_sha256: DigestSchema,
  routing: RoutingSchema,
  rerun_guard: RerunGuardSchema,
  trace_prefix_byte_length: z.number().int().nonnegative(),
  trace_prefix_sha256: DigestSchema,
  trace_prefix_line_count: z.number().int().nonnegative(),
  event_line_sha256: DigestSchema,
  files: z.object({
    request: z.literal('request.json'),
    before_profile: z.literal('profile.before.yaml'),
    after_profile: z.literal('profile.after.yaml'),
    event_line: z.literal('event.jsonl'),
  }).strict(),
  commit_order: z.tuple([z.literal('rb_profile.yaml'), z.literal('terminal_status_recheck'), z.literal('post_final_reentry'), z.literal('workspace_cleanup')]),
  created_at: z.string().datetime(),
}).strict();

export class PostFinalRecoveryCrashError extends Error {
  constructor(boundary) {
    super(`simulated crash at ${boundary}`);
    this.name = 'PostFinalRecoveryCrashError';
    this.boundary = boundary;
    this.preserveWorkspace = true;
  }
}

function hashBytes(value) { return createHash('sha256').update(value).digest('hex'); }
function canonicalDigest(value) { return hashBytes(Buffer.from(JSON.stringify(value), 'utf8')); }
function fsyncPath(filePath) { const descriptor = openSync(filePath, constants.O_RDONLY); try { fsyncSync(descriptor); } finally { closeSync(descriptor); } }
function writeDurable(filePath, bytes, flag = 'wx') { writeFileSync(filePath, bytes, { flag }); fsyncPath(filePath); }
function relativeRef(bundle, absolute) { return path.relative(bundle, absolute).replaceAll('\\', '/'); }
function invokeHook(hooks, name, detail) { if (typeof hooks?.[name] === 'function') hooks[name](detail); }

function result(value) { return PostFinalRecoveryResultSchema.parse({ warnings: [], facts: null, operation_id: null, workspace: null, stage: null, next_action: null, ...value, schema_version: POST_FINAL_RECOVERY_SCHEMA_VERSION }); }

function safeBundle(bundlePath) {
  const absolute = path.resolve(bundlePath);
  if (!existsSync(absolute)) throw new Error(`bundle not found: ${bundlePath}`);
  const info = lstatSync(absolute);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('bundle must be a real directory');
  return realpathSync(absolute);
}

function ensureRealDirectory(directoryPath, parentPath) {
  if (!existsSync(directoryPath)) { mkdirSync(directoryPath); fsyncPath(parentPath); }
  const info = lstatSync(directoryPath);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`${directoryPath} must be a real directory`);
}

function recoveryRoot(bundle, create = false) {
  const diagnostics = path.join(bundle, '_diagnostics');
  const root = path.join(bundle, POST_FINAL_RECOVERY_ROOT);
  if (create) {
    ensureRealDirectory(diagnostics, bundle);
    ensureRealDirectory(root, diagnostics);
  }
  return root;
}

function inspectWorkspaceRoot(bundle) {
  const root = recoveryRoot(bundle);
  if (!existsSync(root)) return { accepted: [], warnings: [], blocked: null };
  const rootInfo = lstatSync(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) return { accepted: [], warnings: [], blocked: 'post-final recovery root is unsafe' };
  const accepted = [];
  const warnings = [];
  for (const name of readdirSync(root).sort()) {
    const workspace = path.join(root, name);
    const info = lstatSync(workspace);
    if (info.isSymbolicLink() || !info.isDirectory()) return { accepted, warnings, blocked: `unsafe post-final recovery root entry: ${name}` };
    const manifestPath = path.join(workspace, 'manifest.json');
    if (!existsSync(manifestPath)) { warnings.push(`unaccepted post-final recovery residue: ${relativeRef(bundle, workspace)}`); continue; }
    try {
      const manifest = PreparedManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
      accepted.push({ operation_id: manifest.operation_id, workspace, workspace_ref: relativeRef(bundle, workspace), manifest });
    } catch (error) {
      return { accepted, warnings, blocked: `invalid prepared post-final recovery manifest at ${relativeRef(bundle, manifestPath)}: ${error.message}` };
    }
  }
  return { accepted, warnings, blocked: null };
}

function acceptedOwnerWorkspace(bundle, relativeRoot, manifestName, commandFor) {
  const root = path.join(bundle, relativeRoot);
  if (!existsSync(root)) return null;
  const info = lstatSync(root);
  if (info.isSymbolicLink() || !info.isDirectory()) return { blocked: `${relativeRoot} is unsafe` };
  for (const name of readdirSync(root).sort()) {
    const workspace = path.join(root, name);
    const workspaceInfo = lstatSync(workspace);
    if (workspaceInfo.isSymbolicLink() || !workspaceInfo.isDirectory()) return { blocked: `${relativeRoot}/${name} is unsafe` };
    const manifestPath = path.join(workspace, manifestName);
    if (existsSync(manifestPath)) return { operation_id: name, workspace: relativeRef(bundle, workspace), command: commandFor(name) };
  }
  return null;
}

function finalInventory(bundle) {
  const inventory = readFinalReportInventory(bundle);
  const primarySeries = inventory.primary_series;
  if (!primarySeries.valid) {
    const first = primarySeries.blockers[0];
    throw new Error(`Final primary inventory is invalid: ${first.code}: ${first.detail}`);
  }
  if (primarySeries.latest === null) throw new Error('final primary inventory has no delivered report file');
  return inventory;
}

function logicalBundleIdentity(bundle, status, profile, plan) {
  const normalized = normalizedBundleBasenameFromPath(bundle);
  if (!normalized) throw new Error('bundle directory name does not match accepted production/disposable naming');
  const statusBundle = String(status?.bundle || '');
  const planBasename = String(plan?.plan_basename || '');
  const profileBasename = String(profile?.plan_basename || '');
  if (!statusBundle || statusBundle !== planBasename || planBasename !== profileBasename || profileBasename !== normalized) {
    throw new Error(`bundle identity mismatch: status=${statusBundle}, plan=${planBasename}, profile=${profileBasename}, normalized=${normalized}`);
  }
  return BundleIdentitySchema.parse({ status_bundle: statusBundle, plan_basename: planBasename, normalized_bundle_basename: normalized });
}

function routingFacts() {
  const topology = loadHandoffTopology();
  const targetNode = topology.chain['phases/phase-hitl2.md']?.rerun;
  if (!targetNode) throw new Error('HITL2 rerun transition is unavailable');
  const targetGate = topology.nodeToGate.get(targetNode);
  if (!targetGate) throw new Error('rerun target gate is unavailable in workflow manifest');
  return {
    source_node: 'phases/phase-hitl2.md',
    outcome: 'rerun',
    target_node: targetNode,
    source_gate_enum: 'hitl2_recorded',
    target_gate_enum: targetGate.replaceAll('-', '_'),
    transition_table_sha256: hashBytes(readFileSync(path.join(WORKFLOWS_ROOT, 'transitions.chain.json'))),
  };
}

function rerunGuard(profile, { includeNextIncrement }) {
  const { rawBytes, definition } = readGateDefinitionSnapshot(RERUN_RULE_PATH);
  const availability = evaluateRerunAvailability({ definition, profile, includeNextIncrement });
  if (!availability.supported) throw new Error(availability.reason);
  return {
    guard: RerunGuardSchema.parse({
      rule_id: 'rerun_count_valid',
      definition_sha256: hashBytes(rawBytes),
      current_count: availability.currentCount,
      next_count: availability.evaluatedCount,
      limit: availability.exclusiveLimit,
    }),
    availability,
  };
}

function isQuiescent(bundle) {
  const reasons = [];
  const queuePath = path.join(bundle, 'rb_queue.json');
  if (existsSync(queuePath)) {
    const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
    for (const location of ['active_window', 'refill_pool']) {
      for (const item of queue[location] || []) if (['queued', 'running', 'blocked'].includes(item.status)) reasons.push(`rb_queue.json#/${location}/${item.queue_item_id || 'item'}`);
    }
    if (Object.keys(queue.delegated_in_flight || {}).length > 0) reasons.push('rb_queue.json#/delegated_in_flight');
  }
  const indexPath = path.join(bundle, '_work_units', '_index.json');
  if (existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    for (const item of Object.values(index.work_units || {})) if (item.status === 'claimed') reasons.push(`_work_units/_index.json#/work_units/${item.work_id || 'claimed'}`);
  }
  return reasons;
}

function finalFacts(bundle) {
  const statusPath = path.join(bundle, 'rb_status.json');
  const profilePath = path.join(bundle, 'rb_profile.yaml');
  if (!existsSync(statusPath) || !existsSync(profilePath)) throw new Error('status/profile control files are required');
  const statusRaw = readFileSync(statusPath);
  const profileRaw = readFileSync(profilePath);
  const status = JSON.parse(statusRaw.toString('utf8'));
  const profile = ProfileSchema.parse(parseYaml(profileRaw.toString('utf8')));
  const plan = readBundlePlan(bundle);
  const identity = logicalBundleIdentity(bundle, status, profile, plan);
  const handoff = findLatestLegalHandoff(bundle, { targetNode: 'phases/phase-final.md', sourceNode: 'phases/phase-readiness.md', requireLoad: true });
  if (!handoff.ok) throw new Error(handoff.reason);
  if (status.current_node !== 'phases/phase-final.md' || status.current_gate !== 'readiness_passed' || status.next_gate !== 'none') throw new Error('runtime is not in the terminal Final status window');
  const inventory = finalInventory(bundle);
  const { guard, availability } = rerunGuard(profile, { includeNextIncrement: true });
  return {
    status, statusRaw, profile, profileRaw, identity, inventory, primary_series: inventory.primary_series, guard, availability,
    routing: routingFacts(),
    lineage: ExpectedFinalLineageSchema.parse({
      final_handoff_index: handoff.handoff.index,
      final_load_index: handoff.handoff.loadComplete.index,
      status_sha256: hashBytes(statusRaw),
      profile_sha256: hashBytes(profileRaw),
      final_inventory_sha256: inventory.sha256,
      rerun_guard: guard,
    }),
  };
}

function nextActionForStage(bundlePath, stage, operationId = null, owner = null) {
  if (stage === 'newer_final_entry_pending') return { kind: 'enter_phase', command: `node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node phases/phase-final.md`, target_ref: 'phases/phase-final.md', operation_id: operationId };
  if (stage === 'newer_final_loaded_pending_status') return { kind: 'advance_status', command: `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle ${bundlePath} --to readiness_passed`, target_ref: 'readiness_passed', operation_id: operationId };
  if (stage === 'newer_final_delivery_pending') return { kind: 'current_owner', command: null, target_ref: 'phases/phase-final.md', operation_id: operationId, delivery_stage: 'delivery_pending' };
  if (stage === 'pre_entry') return { kind: 'enter_phase', command: `node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node phases/phase-rerun.md`, target_ref: 'phases/phase-rerun.md', operation_id: operationId };
  if (stage === 'loaded_pending_status') return { kind: 'advance_status', command: `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle ${bundlePath} --to hitl2_recorded`, target_ref: 'hitl2_recorded', operation_id: operationId };
  if (owner?.kind === 'current_owner') return { kind: owner.kind, command: null, target_ref: owner.target_ref, operation_id: operationId };
  if (stage === 'synchronized_initial_profile') return { kind: 'topic_state', command: `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs inspect --bundle ${bundlePath}`, target_ref: 'canonical-topic-state', operation_id: operationId };
  if (stage === 'synchronized_count_incremented') return { kind: 'rerun_gate', command: `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-rerun-ready.mjs --bundle ${bundlePath} --current-node phases/phase-rerun.md`, target_ref: 'rerun_ready', operation_id: operationId };
  return { kind: 'current_owner', command: null, target_ref: 'current lifecycle owner', operation_id: operationId };
}

function inspectInternal({ bundlePath }) {
  const bundle = safeBundle(bundlePath);
  const workspaces = inspectWorkspaceRoot(bundle);
  if (workspaces.blocked) return result({ operation: 'inspect', verdict: 'blocked', reason_code: 'workspace_root_unsafe', reason: workspaces.blocked, warnings: workspaces.warnings, next_action: { kind: 'repair_owner', command: null, target_ref: POST_FINAL_RECOVERY_ROOT, operation_id: null } });
  if (workspaces.accepted.length > 1) return result({ operation: 'inspect', verdict: 'blocked', reason_code: 'ambiguous_recovery_owner', reason: 'Multiple accepted post-final recovery workspaces exist.', warnings: workspaces.warnings });
  if (workspaces.accepted.length === 1) {
    const owner = workspaces.accepted[0];
    return result({ operation: 'inspect', verdict: 'recover_required', reason_code: 'accepted_workspace', reason: 'An accepted post-final recovery operation owns recovery.', operation_id: owner.operation_id, workspace: owner.workspace_ref, warnings: workspaces.warnings, next_action: { kind: 'recover', command: `node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs recover --bundle ${bundlePath} --operation-id ${owner.operation_id}`, target_ref: owner.workspace_ref, operation_id: owner.operation_id } });
  }
  const artifactOwner = acceptedOwnerWorkspace(bundle, '_diagnostics/artifact-persistence', 'operation.json', () => `node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs sweep --bundle ${bundlePath}`);
  if (artifactOwner?.blocked) return result({ operation: 'inspect', verdict: 'blocked', reason_code: 'artifact_workspace_unsafe', reason: artifactOwner.blocked, warnings: workspaces.warnings });
  if (artifactOwner) return result({ operation: 'inspect', verdict: 'blocked', reason_code: 'artifact_persistence_owner', reason: 'Artifact persistence owns the nearest recovery.', warnings: workspaces.warnings, next_action: { kind: 'repair_owner', command: artifactOwner.command, target_ref: artifactOwner.workspace, operation_id: null } });
  const topicOwner = acceptedOwnerWorkspace(bundle, '_diagnostics/topic-state', 'prepared.json', (id) => `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs recover --bundle ${bundlePath} --operation-id ${id}`);
  if (topicOwner?.blocked) return result({ operation: 'inspect', verdict: 'blocked', reason_code: 'topic_workspace_unsafe', reason: topicOwner.blocked, warnings: workspaces.warnings });
  if (topicOwner) return result({ operation: 'inspect', verdict: 'blocked', reason_code: 'topic_state_owner', reason: 'Canonical topic-state recovery owns the nearest action.', warnings: workspaces.warnings, next_action: { kind: 'repair_owner', command: topicOwner.command, target_ref: topicOwner.workspace, operation_id: null } });
  const active = inspectPostFinalHandoffStage(bundle);
  if (!active.ok && !['missing_event', 'superseded_event'].includes(active.reason_code)) return result({ operation: 'inspect', verdict: 'blocked', reason_code: 'accepted_lineage_drift', reason: active.reason, warnings: workspaces.warnings });
  if (active.ok && active.stage !== 'retired_by_newer_final') {
    const lineage = active.lineage || { event: active.handoff.event, index: active.handoff.index, eventLineSha256: active.handoff.eventLineSha256 };
    const event = lineage.event;
    return result({ operation: 'inspect', verdict: 'unchanged', reason_code: 'already_committed', reason: 'An accepted post-final recovery lineage is already active.', operation_id: event.operation_id, stage: active.stage, warnings: workspaces.warnings, facts: { request_sha256: event.request_sha256, event_id: event.event_id, event_index: lineage.index, event_line_sha256: lineage.eventLineSha256 }, next_action: nextActionForStage(bundlePath, active.stage, event.operation_id, active.owner) });
  }
  let facts;
  try { facts = finalFacts(bundle); } catch (error) {
    return result({ operation: 'inspect', verdict: 'blocked', reason_code: 'fresh_final_ineligible', reason: error.message, warnings: workspaces.warnings });
  }
  const activeWork = isQuiescent(bundle);
  if (activeWork.length > 0) return result({ operation: 'inspect', verdict: 'blocked', reason_code: 'bundle_not_quiescent', reason: `Active queue/work-unit facts block post-final recovery: ${activeWork[0]}`, warnings: workspaces.warnings, next_action: { kind: 'repair_owner', command: null, target_ref: activeWork[0], operation_id: null } });
  if (!facts.availability.available) return result({ operation: 'inspect', verdict: 'blocked', reason_code: 'rerun_limit_exhausted', reason: `Next rerun count ${facts.guard.next_count} would fail limit < ${facts.guard.limit}.`, warnings: workspaces.warnings, facts: { rerun_guard: facts.guard }, next_action: { kind: 'new_bundle_decision', command: null, target_ref: 'start a new bundle for the requested scope', operation_id: null } });
  return result({
    operation: 'inspect', verdict: 'eligible', reason_code: 'eligible', reason: 'Latest legal Final lineage is eligible for one audited post-final rerun request.', warnings: workspaces.warnings,
    facts: { request_bindings: { expected_bundle_identity: facts.identity, expected_final_lineage: facts.lineage }, resolved_target: facts.routing.target_node },
    next_action: { kind: 'prepare_request', command: null, target_ref: 'retained post-final request JSON, then apply', operation_id: null },
  });
}

export function inspectPostFinalRecovery({ bundlePath } = {}) { return inspectInternal({ bundlePath }); }

function rationaleFor(request) { return `Post-final rerun reason:\n${request.reason}\n\nRequested scope:\n${request.requested_scope}`; }

function requestDigest(request) { return canonicalDigest(PostFinalRecoveryRequestSchema.parse(request)); }

function buildEvent({ facts, request, operationId, afterProfile, afterProfileRaw }) {
  return RecoveryEventSchema.parse({
    ts: new Date().toISOString(), bundle: facts.status.bundle, event: 'post_final_reentry', schema_version: POST_FINAL_RECOVERY_SCHEMA_VERSION,
    action: POST_FINAL_RECOVERY_ACTION, operation_id: operationId, event_id: `post_final_reentry:${operationId}`,
    request_sha256: requestDigest(request), reason: request.reason, requested_scope: request.requested_scope,
    decision_checkpoint: 'hitl2', decision: 'rerun', decision_source: 'explicit_post_final_request', execution_actor: 'phase_agent',
    logical_bundle_identity: facts.identity,
    previous_final: { final_handoff_index: facts.lineage.final_handoff_index, final_load_index: facts.lineage.final_load_index, status_sha256: facts.lineage.status_sha256, profile_sha256: facts.lineage.profile_sha256, final_inventory_sha256: facts.lineage.final_inventory_sha256 },
    previous_profile_semantics: facts.profile,
    committed_after_profile_sha256: hashBytes(afterProfileRaw), committed_after_profile_semantics: afterProfile,
    routing: facts.routing, rerun_guard: facts.guard,
  });
}

function exactRequestMatchesFacts(request, facts) {
  return JSON.stringify(request.expected_bundle_identity) === JSON.stringify(facts.identity)
    && JSON.stringify(request.expected_final_lineage) === JSON.stringify(facts.lineage);
}

function atomicReplace(filePath, bytes, operationId) {
  const temporary = `${filePath}.post-final-${operationId}`;
  if (existsSync(temporary)) throw new Error(`temporary target exists: ${temporary}`);
  writeDurable(temporary, bytes);
  renameSync(temporary, filePath);
  fsyncPath(path.dirname(filePath));
}

function validatePreparedCurrentFacts(bundle, manifest) {
  const statusRaw = readFileSync(path.join(bundle, 'rb_status.json'));
  if (hashBytes(statusRaw) !== manifest.terminal_status_sha256) return { ok: false, reason_code: 'terminal_status_drift', reason: 'Terminal status bytes changed after acceptance.' };
  const status = JSON.parse(statusRaw.toString('utf8'));
  if (status.current_node !== 'phases/phase-final.md' || status.current_gate !== 'readiness_passed' || status.next_gate !== 'none') return { ok: false, reason_code: 'terminal_status_drift', reason: 'Terminal Final coordinate/window changed after acceptance.' };
  const route = routingFacts();
  if (route.target_node !== manifest.routing.target_node || route.target_gate_enum !== manifest.routing.target_gate_enum) return { ok: false, reason_code: 'routing_drift', reason: 'HITL2 rerun target/window changed after acceptance.' };
  const { guard: currentGuard, availability } = rerunGuard(readBundleProfile(bundle), { includeNextIncrement: true });
  if (!availability.available) return { ok: false, reason_code: 'rerun_limit_exhausted', reason: 'The required next rerun increment is no longer available.' };
  if (currentGuard.definition_sha256 !== manifest.rerun_guard.definition_sha256 || currentGuard.current_count !== manifest.rerun_guard.current_count || currentGuard.next_count !== manifest.rerun_guard.next_count || currentGuard.limit !== manifest.rerun_guard.limit) return { ok: false, reason_code: 'rerun_rule_drift', reason: 'Active rerun-limit facts changed after acceptance.' };
  if (finalInventory(bundle).sha256 !== manifest.final_inventory_sha256) return { ok: false, reason_code: 'final_inventory_drift', reason: 'Final artifact inventory changed after acceptance.' };
  return { ok: true };
}

function suffixAuthorityNeutral(items) {
  const relevant = new Set(['gate_attempt', 'load_complete', 'phase_transition', 'post_final_reentry']);
  const changed = items.find((item) => relevant.has(item.event?.event));
  return changed
    ? { ok: false, reason_code: 'trace_authority_suffix', reason: `Trace suffix contains authority event ${changed.event.event}.` }
    : { ok: true };
}

function recoverPrepared({ bundlePath, operationId, hooks = null }) {
  const bundle = safeBundle(bundlePath);
  const inspection = inspectWorkspaceRoot(bundle);
  if (inspection.blocked) return result({ operation: 'recover', verdict: 'blocked', reason_code: 'workspace_root_unsafe', reason: inspection.blocked });
  if (inspection.accepted.length > 1) return result({ operation: 'recover', verdict: 'blocked', reason_code: 'ambiguous_recovery_owner', reason: 'Multiple accepted post-final recovery workspaces exist.' });
  const owner = inspection.accepted.find((item) => item.operation_id === operationId);
  if (!owner) return result({ operation: 'recover', verdict: 'blocked', reason_code: 'prepared_manifest_missing', reason: `Accepted operation ${operationId} was not found.` });
  const { manifest, workspace } = owner;
  const beforePath = path.join(workspace, manifest.files.before_profile);
  const afterPath = path.join(workspace, manifest.files.after_profile);
  const eventPath = path.join(workspace, manifest.files.event_line);
  for (const required of [beforePath, afterPath, eventPath]) {
    if (!existsSync(required) || lstatSync(required).isSymbolicLink() || !lstatSync(required).isFile()) return result({ operation: 'recover', verdict: 'blocked', reason_code: 'staged_file_missing', reason: `Required staged file is missing or unsafe: ${relativeRef(bundle, required)}`, operation_id: operationId, workspace: owner.workspace_ref });
  }
  const beforeBytes = readFileSync(beforePath);
  const afterBytes = readFileSync(afterPath);
  const eventBytes = readFileSync(eventPath);
  if (hashBytes(beforeBytes) !== manifest.before_profile_sha256 || hashBytes(afterBytes) !== manifest.after_profile_sha256 || hashBytes(eventBytes) !== manifest.event_line_sha256) return result({ operation: 'recover', verdict: 'blocked', reason_code: 'staged_hash_drift', reason: 'Prepared staged bytes no longer match the manifest.', operation_id: operationId, workspace: owner.workspace_ref });
  const profilePath = path.join(bundle, 'rb_profile.yaml');
  const currentProfile = readFileSync(profilePath);
  if (hashBytes(currentProfile) === manifest.before_profile_sha256) {
    atomicReplace(profilePath, afterBytes, operationId);
    invokeHook(hooks, 'afterProfileCommit', { operationId, workspace });
  } else if (hashBytes(currentProfile) !== manifest.after_profile_sha256) {
    return result({ operation: 'recover', verdict: 'blocked', reason_code: 'profile_drift', reason: 'Profile matches neither accepted old nor staged new bytes.', operation_id: operationId, workspace: owner.workspace_ref });
  }
  const facts = validatePreparedCurrentFacts(bundle, manifest);
  if (!facts.ok) return result({ operation: 'recover', verdict: 'blocked', reason_code: facts.reason_code, reason: facts.reason, operation_id: operationId, workspace: owner.workspace_ref });
  invokeHook(hooks, 'beforeEventAppend', { operationId, workspace });
  const append = appendExactTraceLine({ tracePath: path.join(bundle, 'rb_trace.jsonl'), lineBytes: eventBytes, expectedPrefixByteLength: manifest.trace_prefix_byte_length, expectedPrefixSha256: manifest.trace_prefix_sha256, eventId: manifest.event_id, validateSuffix: suffixAuthorityNeutral });
  if (!append.ok) return result({ operation: 'recover', verdict: 'blocked', reason_code: append.reason_code, reason: append.reason, operation_id: operationId, workspace: owner.workspace_ref });
  invokeHook(hooks, 'afterEventAppend', { operationId, workspace, append });
  invokeHook(hooks, 'beforeCleanup', { operationId, workspace, append });
  rmSync(workspace, { recursive: true });
  fsyncPath(recoveryRoot(bundle));
  return result({ operation: 'recover', verdict: append.appended ? 'committed' : 'cleaned', reason_code: append.appended ? 'committed' : 'already_committed', reason: append.appended ? 'Prepared profile and exact recovery event are durable.' : 'Exact event/profile were already durable; remaining workspace was cleaned.', operation_id: operationId, stage: 'pre_entry', facts: { event_index: append.index, event_line_sha256: append.line_sha256 }, next_action: nextActionForStage(bundlePath, 'pre_entry', operationId) });
}

export function applyPostFinalRecovery({ bundlePath, input, operationId = randomUUID(), hooks = null } = {}) {
  const request = PostFinalRecoveryRequestSchema.parse(input);
  const bundle = safeBundle(bundlePath);
  const initialInspection = inspectInternal({ bundlePath });
  if (initialInspection.verdict === 'recover_required') return { ...initialInspection, operation: 'apply' };
  if (initialInspection.verdict === 'unchanged') {
    const active = inspectPostFinalHandoffStage(bundle);
    const digest = active.ok ? (active.lineage?.event || active.handoff.event).request_sha256 : null;
    if (digest === requestDigest(request)) return result({ ...initialInspection, operation: 'apply' });
    return result({ operation: 'apply', verdict: 'blocked', reason_code: 'different_request_same_final', reason: 'A different accepted post-final request already owns this Final lineage.' });
  }
  if (initialInspection.verdict !== 'eligible') return result({ ...initialInspection, operation: 'apply' });
  const facts = finalFacts(bundle);
  if (!exactRequestMatchesFacts(request, facts)) return result({ operation: 'apply', verdict: 'blocked', reason_code: 'request_lineage_mismatch', reason: 'Request identity or expected Final lineage does not match current inspect facts.' });
  const root = recoveryRoot(bundle, true);
  const workspace = path.join(root, OperationIdSchema.parse(operationId));
  mkdirSync(workspace, { mode: 0o700 });
  fsyncPath(root);
  const requestPath = path.join(workspace, 'request.json');
  const beforePath = path.join(workspace, 'profile.before.yaml');
  const afterPath = path.join(workspace, 'profile.after.yaml');
  const eventPath = path.join(workspace, 'event.jsonl');
  const manifestPath = path.join(workspace, 'manifest.json');
  const manifestNext = path.join(workspace, 'manifest.json.next');
  let prepared = false;
  try {
    const afterProfile = structuredClone(facts.profile);
    afterProfile.human_decision_checkpoints.hitl2.status = 'recorded';
    afterProfile.human_decision_checkpoints.hitl2.user_decision = 'rerun';
    afterProfile.human_decision_checkpoints.hitl2.rationale = rationaleFor(request);
    ProfileSchema.parse(afterProfile);
    const afterRaw = Buffer.from(`${stringifyYaml(afterProfile).trimEnd()}\n`, 'utf8');
    const event = buildEvent({ facts, request, operationId, afterProfile, afterProfileRaw: afterRaw });
    const eventRaw = Buffer.from(JSON.stringify(event), 'utf8');
    const traceRaw = readFileSync(path.join(bundle, 'rb_trace.jsonl'));
    writeDurable(requestPath, `${JSON.stringify(request, null, 2)}\n`);
    writeDurable(beforePath, facts.profileRaw);
    writeDurable(afterPath, afterRaw);
    writeDurable(eventPath, eventRaw);
    invokeHook(hooks, 'beforePreparedPublication', { operationId, workspace });
    const manifest = PreparedManifestSchema.parse({
      schema_version: POST_FINAL_RECOVERY_SCHEMA_VERSION, state: 'prepared', action: POST_FINAL_RECOVERY_ACTION, operation_id: operationId, event_id: event.event_id,
      request_sha256: event.request_sha256, bundle_identity: facts.identity, final_lineage: facts.lineage,
      before_profile_sha256: hashBytes(facts.profileRaw), after_profile_sha256: hashBytes(afterRaw), terminal_status_sha256: hashBytes(facts.statusRaw), final_inventory_sha256: facts.inventory.sha256,
      routing: facts.routing, rerun_guard: facts.guard, trace_prefix_byte_length: traceRaw.length, trace_prefix_sha256: hashBytes(traceRaw), trace_prefix_line_count: traceRaw.toString('utf8').split('\n').filter(Boolean).length,
      event_line_sha256: hashBytes(eventRaw), files: { request: 'request.json', before_profile: 'profile.before.yaml', after_profile: 'profile.after.yaml', event_line: 'event.jsonl' },
      commit_order: ['rb_profile.yaml', 'terminal_status_recheck', 'post_final_reentry', 'workspace_cleanup'], created_at: new Date().toISOString(),
    });
    writeDurable(manifestNext, `${JSON.stringify(manifest, null, 2)}\n`);
    renameSync(manifestNext, manifestPath);
    fsyncPath(workspace);
    prepared = true;
    invokeHook(hooks, 'afterPreparedPublication', { operationId, workspace, manifest });
    const recovered = recoverPrepared({ bundlePath, operationId, hooks });
    return result({ ...recovered, operation: 'apply' });
  } catch (error) {
    if (!prepared && !error.preserveWorkspace) {
      rmSync(workspace, { recursive: true, force: true });
      fsyncPath(root);
    }
    throw error;
  }
}

export function recoverPostFinalRecovery({ bundlePath, operationId, hooks = null } = {}) {
  return recoverPrepared({ bundlePath, operationId: OperationIdSchema.parse(operationId), hooks });
}

export { parsePostFinalRecoveryEvent } from './post-final-reentry-contract.mjs';
export function inspectActivePostFinalRecoveryStage(bundlePath) {
  const bundle = safeBundle(bundlePath);
  const workspaces = inspectWorkspaceRoot(bundle);
  if (workspaces.accepted.length > 0) return { ok: false, reason_code: 'accepted_workspace', workspaces };
  return inspectPostFinalHandoffStage(bundle);
}
