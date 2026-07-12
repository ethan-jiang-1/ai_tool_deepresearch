// @impl CTS-001, CTS-002, CTS-003, CTS-004, SCO-013

import {
  closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync,
  readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { CanonicalPlanSchema, LegacyPlanSchema } from '../../schema/contracts/plan.mjs';
import { checkPhaseHandoffPreflight } from './handoff-helpers.mjs';

export const TOPIC_STATE_SCHEMA_VERSION = '1.0.0';
export const TOPIC_STATE_ROOT = '_diagnostics/topic-state';
export const TOPIC_STATE_OPERATIONS = Object.freeze(['inspect', 'apply', 'recover']);

const ScopeRoleSchema = z.enum(['primary', 'synthesis', 'comparison', 'supporting']);
const AddActionSchema = z.object({
  action: z.literal('add_topic'), title: z.string().min(1), slug_stem: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  must_answer: z.array(z.string().min(1)).min(1), scope_role: ScopeRoleSchema,
  depends_on_topic_uids: z.array(z.string()).default([]),
}).strict();
const UpdateActionSchema = z.object({
  action: z.literal('update_intent'), topic_uid: z.string().min(1), title: z.string().min(1),
  must_answer: z.array(z.string().min(1)).min(1), scope_role: ScopeRoleSchema,
  depends_on_topic_uids: z.array(z.string()).default([]),
}).strict();
const MigrationEntrySchema = z.object({
  source: z.enum(['registry', 'adopt']), id: z.string(), slug: z.string(), title: z.string().min(1),
  must_answer: z.array(z.string().min(1)).min(1), scope_role: ScopeRoleSchema,
  depends_on_slugs: z.array(z.string()).default([]), seed_binding: z.enum(['existing', 'new']),
}).strict();
const MigrationPlanSchema = z.object({ context: z.enum(['hitl1', 'rerun']), action: z.literal('migrate_legacy'), entries: z.array(MigrationEntrySchema).min(1) }).strict();
const MutationPlanSchema = z.object({ context: z.enum(['hitl1', 'rerun']), actions: z.array(z.discriminatedUnion('action', [AddActionSchema, UpdateActionSchema])).min(1) }).strict();
export const TopicApplyPlanSchema = z.union([MigrationPlanSchema, MutationPlanSchema]);

function hashBytes(value) { return createHash('sha256').update(value).digest('hex'); }
function fsyncPath(filePath) { const fd = openSync(filePath, constants.O_RDONLY); try { fsyncSync(fd); } finally { closeSync(fd); } }
function writeDurable(filePath, bytes, flag = 'wx') { writeFileSync(filePath, bytes, { flag }); fsyncPath(filePath); }
function safeBundle(bundlePath) {
  const resolved = path.resolve(bundlePath);
  if (!existsSync(resolved) || !lstatSync(resolved).isDirectory() || lstatSync(resolved).isSymbolicLink()) throw new Error('bundle must be a real directory');
  return resolved;
}
function splitPlan(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error('rb_plan.md frontmatter missing');
  return { frontmatter: parseYaml(match[1]), body: raw.slice(match[0].length) };
}
function renderPlan(frontmatter, body) { return `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n${body}`; }
function renderSeed(topic, existingBody = '') {
  const frontmatter = {
    topic_uid: topic.topic_uid, id: topic.id, slug: topic.slug, title: topic.title,
    must_answer: topic.must_answer, scope_role: topic.scope_role,
    depends_on_topic_uids: topic.depends_on_topic_uids,
  };
  const body = existingBody || `# ${topic.title}\n\n## 主题定位\n\n${topic.scope_role}\n\n## must_answer\n\n${topic.must_answer.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`;
  return `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n${body.startsWith('\n') ? body.slice(1) : body}`;
}
function readSeed(bundle, slug) {
  const seedPath = path.join(bundle, 'seed_topics', `${slug}.md`);
  if (!existsSync(seedPath)) return { exists: false, path: seedPath, raw: null, frontmatter: null, body: '' };
  const raw = readFileSync(seedPath, 'utf8');
  const split = splitPlan(raw);
  return { exists: true, path: seedPath, raw, frontmatter: split.frontmatter, body: split.body };
}
function workspaceRoot(bundle, create = false) {
  const diagnostics = path.join(bundle, '_diagnostics');
  const root = path.join(bundle, TOPIC_STATE_ROOT);
  if (create && !existsSync(root)) { mkdirSync(root, { recursive: true }); fsyncPath(existsSync(diagnostics) ? diagnostics : bundle); }
  for (const candidate of [diagnostics, root]) {
    if (existsSync(candidate) && (lstatSync(candidate).isSymbolicLink() || !lstatSync(candidate).isDirectory())) throw new Error(`${path.relative(bundle, candidate)} must be a real directory`);
  }
  return root;
}
function acceptedWorkspaces(bundle) {
  const root = workspaceRoot(bundle);
  if (!existsSync(root)) return [];
  return readdirSync(root).sort().flatMap((name) => {
    const manifestPath = path.join(root, name, 'prepared.json');
    if (!existsSync(manifestPath)) return [];
    try { return [{ operation_id: name, workspace: path.relative(bundle, path.join(root, name)).replaceAll('\\', '/'), manifest: JSON.parse(readFileSync(manifestPath, 'utf8')) }]; } catch { return [{ operation_id: name, workspace: path.relative(bundle, path.join(root, name)).replaceAll('\\', '/'), manifest: null }]; }
  });
}
function lifecycleAuthorization(bundle, context) {
  const status = JSON.parse(readFileSync(path.join(bundle, 'rb_status.json'), 'utf8'));
  if (context === 'hitl1') {
    const ok = status.current_node === 'phases/phase-hitl1.md' && status.current_gate === 'hitl1_recorded' && status.next_gate === 'setup_ready';
    return ok ? { ok: true, context, current_node: status.current_node, current_gate: status.current_gate, next_gate: status.next_gate }
      : { ok: false, reason_code: 'hitl1_not_authorized', reason: 'HITL1 apply requires current_node phase-hitl1 and hitl1_recorded→setup_ready window' };
  }
  const handoff = checkPhaseHandoffPreflight(bundle, 'phases/phase-rerun.md');
  const ok = handoff.ok && status.current_node === 'phases/phase-rerun.md' && status.current_gate === 'hitl2_recorded' && status.next_gate === 'rerun_ready';
  return ok ? { ok: true, context, current_node: status.current_node, current_gate: status.current_gate, next_gate: status.next_gate, source_attempt_index: handoff.handoff.index, load_witness_index: handoff.handoff.loadComplete?.index ?? null }
    : { ok: false, reason_code: 'rerun_not_authorized', reason: handoff.inspect?.[0] || 'rerun apply requires route-bound HITL2 witness and hitl2_recorded→rerun_ready window' };
}
function activeTopicWork(bundle, slugs) {
  const matches = [];
  const queuePath = path.join(bundle, 'rb_queue.json');
  if (existsSync(queuePath)) {
    const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
    for (const location of ['active_window', 'refill_pool']) for (const item of queue[location] || []) {
      const slug = item.payload?.topic_slug || item.lineage?.topic_slug;
      if (slug && slugs.has(slug) && !['completed', 'terminal'].includes(item.status)) matches.push(`rb_queue.json#/${location}/${item.queue_item_id || slug}`);
    }
  }
  const indexPath = path.join(bundle, '_work_units', '_index.json');
  if (existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    for (const item of Object.values(index.work_units || {})) {
      const slug = item.binding_context?.topic_slug || item.topic_slug;
      if (slug && slugs.has(slug) && ['queued', 'claimed', 'running'].includes(item.status)) matches.push(`_work_units/_index.json#/work_units/${item.work_id}`);
    }
  }
  return matches;
}
function canonicalBinding(bundle, plan) {
  const rows = [];
  for (const topic of plan.topic_registry) {
    const seed = readSeed(bundle, topic.slug);
    const matches = seed.exists && seed.frontmatter?.topic_uid === topic.topic_uid && seed.frontmatter?.slug === topic.slug
      && seed.frontmatter?.id === topic.id && seed.frontmatter?.title === topic.title
      && JSON.stringify(seed.frontmatter?.must_answer) === JSON.stringify(topic.must_answer)
      && seed.frontmatter?.scope_role === topic.scope_role
      && JSON.stringify(seed.frontmatter?.depends_on_topic_uids || []) === JSON.stringify(topic.depends_on_topic_uids);
    rows.push({ topic_uid: topic.topic_uid, slug: topic.slug, ok: matches, reason_code: matches ? 'bound' : (seed.exists ? 'seed_mismatch' : 'seed_missing'), fact_refs: [`rb_plan.md#/topic_registry/${topic.topic_uid}`, `seed_topics/${topic.slug}.md`] });
  }
  return rows;
}
function progressRows(bundle, plan, bindings) {
  let queue = {};
  try { queue = JSON.parse(readFileSync(path.join(bundle, 'rb_queue.json'), 'utf8')); } catch {}
  let ledgerRows = [];
  try {
    ledgerRows = readFileSync(path.join(bundle, 'rb_output_declarations.jsonl'), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch {}
  return plan.topic_registry.map((topic) => {
    const binding = bindings.find((item) => item.topic_uid === topic.topic_uid);
    if (!binding?.ok) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'blocked', reason_code: binding?.reason_code || 'binding_missing', fact_refs: binding?.fact_refs || [], recommended_action: 'Repair canonical registry/seed binding, then rerun inspect.' };
    const active = [...(queue.active_window || []), ...(queue.refill_pool || [])].filter((item) => (item.payload?.topic_slug || item.lineage?.topic_slug) === topic.slug && !['completed', 'terminal'].includes(item.status));
    const artifactRoots = ['wave0', 'wave1'].filter((wave) => existsSync(path.join(bundle, 'artifacts', wave, topic.slug)));
    const submitted = ledgerRows.filter((row) => row.status === 'submitted' && (row.binding_context?.topic_slug === topic.slug || JSON.stringify(row).includes(topic.slug)));
    if (artifactRoots.length > 0 && submitted.length > 0) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'complete', reason_code: 'submitted_artifact_facts', fact_refs: [...artifactRoots.map((wave) => `artifacts/${wave}/${topic.slug}`), ...submitted.map((row) => `rb_output_declarations.jsonl#${row.work_id || row.queue_item_id || topic.slug}`)], recommended_action: null };
    if (artifactRoots.length > 0) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'blocked', reason_code: 'artifact_without_submitted_fact', fact_refs: artifactRoots.map((wave) => `artifacts/${wave}/${topic.slug}`), recommended_action: 'Repair or submit through the existing work-unit owner, then rerun inspect.' };
    if (active.length > 0) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'in_progress', reason_code: 'active_queue_work', fact_refs: active.map((item) => `rb_queue.json#/${item.queue_item_id}`), recommended_action: 'Continue through the existing queue/work-unit owner.' };
    return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'not_started', reason_code: 'no_work_facts', fact_refs: binding.fact_refs, recommended_action: null };
  });
}

export function inspectCanonicalTopicState({ bundlePath }) {
  const bundle = safeBundle(bundlePath);
  const workspaces = acceptedWorkspaces(bundle);
  if (workspaces.length > 0) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'blocked', blockers: [{ reason_code: 'accepted_workspace', operation_id: workspaces[0].operation_id, workspace: workspaces[0].workspace, recommended_action: `node DPT_FRAMEWORK/cli/operate-topic-state.mjs recover --bundle ${bundlePath} --operation-id ${workspaces[0].operation_id}` }], topics: [] };
  const planPath = path.join(bundle, 'rb_plan.md');
  if (!existsSync(planPath) || lstatSync(planPath).isSymbolicLink() || !lstatSync(planPath).isFile()) {
    return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'invalid', blockers: [{ reason_code: 'plan_missing', recommended_action: 'Restore a regular rb_plan.md through the owning lifecycle path, then rerun inspect.' }], topics: [] };
  }
  let plan;
  try {
    plan = splitPlan(readFileSync(planPath, 'utf8')).frontmatter;
  } catch (error) {
    return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'invalid', blockers: [{ reason_code: 'plan_invalid', reason: error.message }], topics: [] };
  }
  const canonical = CanonicalPlanSchema.safeParse(plan);
  if (!canonical.success) {
    const legacy = LegacyPlanSchema.safeParse(plan);
    return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: legacy.success, mode: legacy.success ? 'legacy' : 'invalid', blockers: legacy.success ? [{ reason_code: 'legacy_migration_required', recommended_action: 'Enter sanctioned rerun and prepare explicit migrate_legacy input.' }] : [{ reason_code: 'plan_invalid', reason: canonical.error.message }], topics: [] };
  }
  const bindings = canonicalBinding(bundle, canonical.data);
  return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: bindings.every((item) => item.ok), mode: 'canonical', blockers: bindings.filter((item) => !item.ok), topics: progressRows(bundle, canonical.data, bindings) };
}

function buildMutation(bundle, parsedPlan, input) {
  const current = structuredClone(parsedPlan);
  const touched = new Map();
  if ('action' in input) {
    const existingSlugs = new Set(current.topic_registry.map((topic) => topic.slug));
    const inputSlugs = new Set(input.entries.filter((entry) => entry.source === 'registry').map((entry) => entry.slug));
    if (current.topic_registry.some((topic) => !inputSlugs.has(topic.slug))) throw new Error('migration input must account for every legacy registry slug');
    const seedDir = path.join(bundle, 'seed_topics');
    const externalSeeds = existsSync(seedDir) ? readdirSync(seedDir).filter((name) => name.endsWith('.md')).map((name) => name.slice(0, -3)).filter((slug) => !existingSlugs.has(slug)) : [];
    const adopted = new Set(input.entries.filter((entry) => entry.source === 'adopt').map((entry) => entry.slug));
    const unaccounted = externalSeeds.filter((slug) => !adopted.has(slug));
    if (unaccounted.length > 0) throw new Error(`registry-external seed requires explicit adopt: ${unaccounted.join(', ')}`);
    const uidBySlug = new Map(input.entries.map((entry) => [entry.slug, `tp_${randomUUID()}`]));
    current.topic_registry = input.entries.map((entry) => ({ topic_uid: uidBySlug.get(entry.slug), id: entry.id, slug: entry.slug, title: entry.title, must_answer: entry.must_answer, scope_role: entry.scope_role, depends_on_topic_uids: entry.depends_on_slugs.map((slug) => { if (!uidBySlug.has(slug)) throw new Error(`unknown dependency slug: ${slug}`); return uidBySlug.get(slug); }) }));
    if (new Set(current.topic_registry.map((topic) => topic.slug)).size !== current.topic_registry.length) throw new Error('migration slugs must be unique');
    for (const topic of current.topic_registry) {
      const entry = input.entries.find((item) => item.slug === topic.slug);
      const seed = readSeed(bundle, topic.slug);
      if (entry.source === 'adopt' && existingSlugs.has(topic.slug)) throw new Error(`adopt slug already exists in registry: ${topic.slug}`);
      if (entry.seed_binding === 'existing' && !seed.exists) throw new Error(`existing seed binding missing: ${topic.slug}`);
      touched.set(topic.slug, renderSeed(topic, seed.body));
    }
    current.topic_registry_version = '2';
  } else {
    const canonical = CanonicalPlanSchema.parse(current);
    const byUid = new Map(canonical.topic_registry.map((topic) => [topic.topic_uid, topic]));
    const targetUids = input.actions.filter((action) => action.action === 'update_intent').map((action) => action.topic_uid);
    if (new Set(targetUids).size !== targetUids.length) throw new Error('duplicate update target');
    let nextOrdinal = canonical.topic_registry.reduce((max, topic) => Math.max(max, Number(topic.id) || 0), 0);
    for (const action of input.actions) {
      if (action.action === 'add_topic') {
        nextOrdinal += 1;
        const id = String(nextOrdinal).padStart(2, '0');
        const slug = `${id}_${action.slug_stem}`;
        if (canonical.topic_registry.some((topic) => topic.slug === slug)) throw new Error(`duplicate slug: ${slug}`);
        const topic = { topic_uid: `tp_${randomUUID()}`, id, slug, title: action.title, must_answer: action.must_answer, scope_role: action.scope_role, depends_on_topic_uids: action.depends_on_topic_uids };
        canonical.topic_registry.push(topic); byUid.set(topic.topic_uid, topic); touched.set(slug, renderSeed(topic));
      } else {
        const topic = byUid.get(action.topic_uid); if (!topic) throw new Error(`unknown topic_uid: ${action.topic_uid}`);
        Object.assign(topic, { title: action.title, must_answer: action.must_answer, scope_role: action.scope_role, depends_on_topic_uids: action.depends_on_topic_uids });
        const seed = readSeed(bundle, topic.slug); touched.set(topic.slug, renderSeed(topic, seed.body));
      }
    }
    current.topic_registry = canonical.topic_registry;
  }
  current.derived_topic_count = current.topic_registry.length;
  CanonicalPlanSchema.parse(current);
  return { plan: current, touched };
}

export function applyCanonicalTopicState({ bundlePath, input, crashAt = null, forceDeviceMismatch = false }) {
  const bundle = safeBundle(bundlePath);
  const requestedActions = Array.isArray(input?.actions) ? input.actions.map((item) => item?.action) : [input?.action];
  const unsupported = requestedActions.find((action) => ['remove', 'remove_topic', 'retire', 'rename', 'renumber', 'delete', 'move', 'path_move', 'set_progress', 'set_status', 'override'].includes(action));
  if (unsupported) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'layout_mutation_not_supported', reason: `${unsupported} requires deferred C3B/C5 capability`, recommended_action: 'Keep current canonical state unchanged and propose/use the missing capability; do not direct-edit multiple surfaces.' };
  const parsedInput = TopicApplyPlanSchema.parse(input);
  const accepted = acceptedWorkspaces(bundle);
  if (accepted.length) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'accepted_workspace', recommended_action: `recover --operation-id ${accepted[0].operation_id}` };
  const authorization = lifecycleAuthorization(bundle, parsedInput.context);
  if (!authorization.ok) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', ...authorization };
  if ('action' in parsedInput && parsedInput.action === 'migrate_legacy' && parsedInput.context !== 'rerun') return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'migration_requires_rerun' };
  const planPath = path.join(bundle, 'rb_plan.md');
  const seedRoot = path.join(bundle, 'seed_topics');
  if (lstatSync(planPath).isSymbolicLink() || !lstatSync(planPath).isFile()) throw new Error('rb_plan.md must be a non-symlink regular file');
  if (!existsSync(seedRoot) || lstatSync(seedRoot).isSymbolicLink() || !lstatSync(seedRoot).isDirectory()) throw new Error('seed_topics must be a real directory');
  const oldRaw = readFileSync(planPath, 'utf8');
  const split = splitPlan(oldRaw);
  const mutation = buildMutation(bundle, split.frontmatter, parsedInput);
  const touchedExisting = new Set([...mutation.touched.keys()].filter((slug) => existsSync(path.join(bundle, 'seed_topics', `${slug}.md`))));
  const active = activeTopicWork(bundle, touchedExisting);
  if (active.length) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'active_topic_work', fact_refs: active, recommended_action: 'Resolve through existing queue/work-unit owner, then rerun apply.' };
  const operationId = randomUUID();
  const root = workspaceRoot(bundle, true);
  const workspace = path.join(root, operationId); mkdirSync(workspace); fsyncPath(root);
  try {
    if (forceDeviceMismatch || statSync(workspace).dev !== statSync(planPath).dev || statSync(workspace).dev !== statSync(seedRoot).dev) throw new Error('topic-state workspace and owned targets must be on the same device');
    const stagedDir = path.join(workspace, 'staged'); mkdirSync(stagedDir); fsyncPath(workspace);
    const newPlanRaw = renderPlan(mutation.plan, split.body);
    const files = [];
    const stage = (relative, bytes) => {
      const target = path.join(bundle, relative); const stagedName = hashBytes(relative); const staged = path.join(stagedDir, stagedName);
      writeDurable(staged, bytes);
      files.push({ relative, expected_sha256: existsSync(target) ? hashBytes(readFileSync(target)) : null, staged_sha256: hashBytes(bytes), staged_name: stagedName });
    };
    stage('rb_plan.md', newPlanRaw);
    for (const [slug, bytes] of mutation.touched) stage(`seed_topics/${slug}.md`, bytes);
    if (crashAt === 'before_prepared') throw Object.assign(new Error('simulated crash before_prepared'), { preserveWorkspace: false });
    const manifest = { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation_id: operationId, state: 'prepared', authorization, input_sha256: hashBytes(JSON.stringify(parsedInput)), registry_length_changed: split.frontmatter.topic_registry.length !== mutation.plan.topic_registry.length, files };
    writeDurable(path.join(workspace, 'prepared.json'), `${JSON.stringify(manifest, null, 2)}\n`); fsyncPath(workspace);
    if (crashAt === 'after_prepared') throw Object.assign(new Error('simulated crash after_prepared'), { preserveWorkspace: true });
    return recoverCanonicalTopicState({ bundlePath, operationId, crashAt });
  } catch (error) {
    if (!error.preserveWorkspace) { rmSync(workspace, { recursive: true, force: true }); fsyncPath(root); }
    throw error;
  }
}

export function recoverCanonicalTopicState({ bundlePath, operationId, crashAt = null }) {
  const bundle = safeBundle(bundlePath); const root = workspaceRoot(bundle); const workspace = path.join(root, operationId);
  const manifestPath = path.join(workspace, 'prepared.json');
  if (!existsSync(manifestPath)) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'prepared_manifest_missing' };
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let committed = 0;
  for (const file of manifest.files) {
    const target = path.join(bundle, file.relative); const staged = path.join(workspace, 'staged', file.staged_name);
    if (!existsSync(staged)) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'staged_file_missing', path: file.relative };
    if (lstatSync(staged).isSymbolicLink() || !lstatSync(staged).isFile()) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'staged_file_unsafe', path: file.relative };
    if (existsSync(target) && (lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile())) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'target_unsafe', path: file.relative };
    const current = existsSync(target) ? hashBytes(readFileSync(target)) : null;
    if (current === file.staged_sha256) continue;
    if (current !== file.expected_sha256) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'late_drift', path: file.relative };
    const temp = `${target}.topic-state-${operationId}`;
    if (existsSync(temp)) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'temporary_target_exists', path: file.relative };
    writeFileSync(temp, readFileSync(staged), { flag: 'wx' }); fsyncPath(temp); renameSync(temp, target); fsyncPath(path.dirname(target)); committed += 1;
    if (crashAt === 'after_plan' && file.relative === 'rb_plan.md') throw Object.assign(new Error('simulated crash after_plan'), { preserveWorkspace: true });
    if (crashAt === 'after_first_seed' && committed === 2) throw Object.assign(new Error('simulated crash after_first_seed'), { preserveWorkspace: true });
  }
  if (crashAt === 'before_cleanup') throw Object.assign(new Error('simulated crash before_cleanup'), { preserveWorkspace: true });
  rmSync(workspace, { recursive: true }); fsyncPath(root);
  return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'committed', operation_id: operationId, follow_up: manifest.registry_length_changed ? 'recompute_research_style' : null };
}
