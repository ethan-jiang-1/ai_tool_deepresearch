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
import { WorkUnitManifestSchema } from '../../schema/contracts/work-unit.mjs';
import { checkPhaseHandoffPreflight } from './handoff-helpers.mjs';
import { readSubmittedWorkUnitDeclarations } from './gate-helpers-readers.mjs';
import { acceptedTopicSlugs, buildTopicLayoutTarget, evaluateTopicLayouts, losslessTopicSlugStem, resolveStructuredTopicBinding } from './topic-layout.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import { evaluateRerunDirection } from './rerun-direction.mjs';
import { locateCanonicalSections } from './plan-hostfile-sections.mjs';
import { evaluateSeedTopicAuthoring } from './seed-topic-authoring-evaluator.mjs';

export const TOPIC_STATE_SCHEMA_VERSION = '1.0.0';
export const TOPIC_STATE_ROOT = '_diagnostics/topic-state';
export const TOPIC_STATE_OPERATIONS = Object.freeze(['inspect', 'apply', 'recover']);

const ScopeRoleSchema = z.enum(['primary', 'synthesis', 'comparison', 'supporting']);
const RerunDirectionCandidateSchema = z.object({
  rerun_count: z.number().int().nonnegative(),
  action: z.enum(['add', 'supplement']),
  new_search_dimensions: z.string().min(1),
  adjusted_depth: z.string().min(1),
  search_guardrails: z.string().min(1),
  rationale_excerpt: z.string().min(1),
}).strict();
const AddActionSchema = z.object({
  action: z.literal('add_topic'), title: z.string().min(1), slug_stem: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  must_answer: z.array(z.string().min(1)).min(1), scope_role: ScopeRoleSchema,
  depends_on_topic_uids: z.array(z.string()).default([]),
  direction: RerunDirectionCandidateSchema.optional(),
}).strict();
const UpdateActionSchema = z.object({
  action: z.literal('update_intent'), topic_uid: z.string().min(1), title: z.string().min(1),
  must_answer: z.array(z.string().min(1)).min(1), scope_role: ScopeRoleSchema,
  depends_on_topic_uids: z.array(z.string()).default([]),
  direction: RerunDirectionCandidateSchema.optional(),
}).strict();
const SetRerunDirectionActionSchema = z.object({
  action: z.literal('set_rerun_direction'), topic_uid: z.string().min(1), direction: RerunDirectionCandidateSchema,
}).strict();
const MigrationEntrySchema = z.object({
  source: z.enum(['registry', 'adopt']), id: z.string(), slug: z.string(), title: z.string().min(1),
  must_answer: z.array(z.string().min(1)).min(1), scope_role: ScopeRoleSchema,
  depends_on_slugs: z.array(z.string()).default([]), seed_binding: z.enum(['existing', 'new']),
}).strict();
const MigrationPlanSchema = z.object({ context: z.enum(['hitl1', 'rerun']), action: z.literal('migrate_legacy'), entries: z.array(MigrationEntrySchema).min(1) }).strict();
const MutationPlanSchema = z.object({
  context: z.enum(['hitl1', 'rerun']),
  actions: z.array(z.discriminatedUnion('action', [AddActionSchema, UpdateActionSchema, SetRerunDirectionActionSchema])).min(1),
}).strict().superRefine((plan, issue) => {
  const existingTargets = new Set();
  for (const [index, action] of plan.actions.entries()) {
    const carriesDirection = Object.hasOwn(action, 'direction');
    if (plan.context === 'hitl1' && carriesDirection) issue.addIssue({ code: z.ZodIssueCode.custom, path: ['actions', index, 'direction'], message: 'HITL1 actions cannot carry rerun direction' });
    if (plan.context === 'rerun' && action.action !== 'set_rerun_direction' && !carriesDirection) issue.addIssue({ code: z.ZodIssueCode.custom, path: ['actions', index, 'direction'], message: 'sanctioned rerun add/update requires direction' });
    if (action.action === 'set_rerun_direction' && plan.context !== 'rerun') issue.addIssue({ code: z.ZodIssueCode.custom, path: ['actions', index], message: 'set_rerun_direction requires sanctioned rerun' });
    if (carriesDirection) {
      const expectedAction = action.action === 'add_topic' ? 'add' : 'supplement';
      if (action.direction.action !== expectedAction) issue.addIssue({ code: z.ZodIssueCode.custom, path: ['actions', index, 'direction', 'action'], message: `${action.action} requires direction action ${expectedAction}` });
    }
    if (action.action !== 'add_topic') {
      if (existingTargets.has(action.topic_uid)) issue.addIssue({ code: z.ZodIssueCode.custom, path: ['actions', index, 'topic_uid'], message: 'one existing UID may have only one ordered action' });
      existingTargets.add(action.topic_uid);
    }
  }
});
const LayoutTargetEntrySchema = z.object({
  topic_uid: z.string().min(1),
  title: z.string().min(1),
  slug_stem: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
}).strict();
const LayoutPlanSchema = z.object({
  context: z.literal('rerun'),
  action: z.literal('mutate_layout'),
  expected_plan_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  topics: z.array(LayoutTargetEntrySchema),
  remove_topic_uids: z.array(z.string().min(1)).default([]),
}).strict();
export const TopicApplyPlanSchema = z.union([MigrationPlanSchema, MutationPlanSchema, LayoutPlanSchema]);

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
function refreshTopicRegistryTable(body, oldRegistry, finalRegistry) {
  const candidates = locateCanonicalSections(body, 'Topic Registry')
    .map((section) => ({ ...section, content: body.slice(section.contentStart, section.end) }));
  if (candidates.length === 0) return { body, advisory: 'topic_registry_table_missing' };
  const section = candidates.find((candidate) => {
    const [header, separator] = candidate.content.trim().split('\n');
    return header === '| # | Slug | Title | Status |' && /^\|[-: ]+\|[-: ]+\|[-: ]+\|[-: ]+\|$/.test(separator || '');
  });
  if (!section) return { body, advisory: 'topic_registry_table_nonstandard' };
  const lines = section.content.trimEnd().split('\n');
  const statusByUid = new Map();
  const uidByOldSlug = new Map(oldRegistry.map((topic) => [topic.slug, topic.topic_uid]));
  for (const line of lines.slice(2)) {
    if (!line.startsWith('|')) continue;
    const cells = line.slice(1, -1).split('|').map((cell) => cell.trim());
    if (cells.length !== 4) continue;
    const topicUid = uidByOldSlug.get(cells[1]);
    if (topicUid) statusByUid.set(topicUid, cells[3]);
  }
  const escapeCell = (value) => String(value).replaceAll('|', '\\|');
  const rows = finalRegistry.map((topic) => `| ${escapeCell(topic.id)} | ${escapeCell(topic.slug)} | ${escapeCell(topic.title)} | ${escapeCell(statusByUid.get(topic.topic_uid) || 'pending')} |`);
  const replacement = `| # | Slug | Title | Status |\n|---|------|-------|--------|\n${rows.join('\n')}`;
  const normalized = replacement.replace(/^\n+|\n+$/g, '');
  const rendered = `${body.slice(section.start, section.headerEnd)}\n\n${normalized}\n`;
  return { body: `${body.slice(0, section.start)}${rendered}${body.slice(section.end)}`, advisory: null };
}
function newSeedEnrichment() {
  return {
    hypothesis: 'pending — seed-topics Agent must derive the initial hypothesis, gap, or tension',
    in_scope: 'pending — seed-topics Agent must define the research boundary',
    out_of_scope: 'pending — seed-topics Agent must define what will not be deepened',
    search_guardrails: {
      required_terms: ['pending — seed-topics Agent must identify required search terms'],
      forbidden_broadening: ['pending — seed-topics Agent must identify forbidden broadening'],
    },
    evidence_route: {
      preferred_sources: ['pending — seed-topics Agent must identify preferred source types'],
      noise_to_avoid: ['pending — seed-topics Agent must identify likely source noise'],
    },
  };
}

function renderNewSeedBody(topic) {
  return `# ${topic.title}

## 主题定位

pending — seed-topics Agent must enrich this section.

## must_answer

${topic.must_answer.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## 初始假设、缺口或张力

**已知**：pending — derive only from recorded Topic/profile facts.
**缺口**：pending — identify what Wave0 evidence intake must establish.
**张力**：pending — identify claims, conflicts, or narrative bias requiring independent verification.

## why now

- pending — identify the current trigger, time window, or milestone.

## 研究边界与不深挖范围

**在范围内**：
- pending — define the concrete research boundary.

**不深挖**：
- pending — define excluded directions.

## 证据锚点与优先来源

- pending — identify preferred primary/secondary sources and known noise.

## 为什么对最终交付物重要

pending — state the concrete contribution this Topic should make to the final deliverable.

## 下游位置（可选）

- pending — identify downstream report sections or leave explicitly unassigned.

---

## ═══ 研究轮次追加区 ═══

> 后续 Wave 必须用提交/接受的直接证据替换各自唯一占位 token；不要追加第二套回填区。

## 历史摘要

*(seed-topics: 本 topic 为新建，无历史轮次)*

## 本轮新增证据
__BACKFILL_WAVE0_EVIDENCE__

## 本轮新增机制理解
__BACKFILL_WAVE1_MECHANISMS__

## 本轮新增趋势与难点
__BACKFILL_WAVE1_TRENDS__

## 当前判断
__BACKFILL_WAVE2_JUDGMENT__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
`;
}

function renderRerunDirection(direction) {
  return `## 本轮重跑方向\n\n- rerun_count: ${direction.rerun_count}\n- action: ${direction.action}\n- new_search_dimensions: ${direction.new_search_dimensions}\n- adjusted_depth: ${direction.adjusted_depth}\n- search_guardrails: ${direction.search_guardrails}\n- rationale_excerpt: ${direction.rationale_excerpt}\n`;
}

function replaceRerunDirection(body, direction) {
  const withoutDirections = String(body || '').replace(/##\s*本轮重跑方向[^\n]*[\s\S]*?(?=\n##\s+|$)/g, '').trimEnd();
  const rendered = `${withoutDirections}\n\n${renderRerunDirection(direction)}`;
  const checked = evaluateRerunDirection(rendered, direction.rerun_count);
  if (checked.state !== 'matching' || checked.structural_roots.length > 0 || checked.fields.action !== direction.action) {
    throw new Error('canonical rerun direction render failed round-trip validation');
  }
  return rendered;
}

function renderSeed(topic, existingSeed = null, direction = null) {
  const canonicalFrontmatter = {
    topic_uid: topic.topic_uid, id: topic.id, slug: topic.slug, title: topic.title,
    must_answer: topic.must_answer, scope_role: topic.scope_role,
    depends_on_topic_uids: topic.depends_on_topic_uids,
  };
  const frontmatter = existingSeed?.exists
    ? { ...(existingSeed.frontmatter || {}), ...canonicalFrontmatter }
    : { ...canonicalFrontmatter, ...newSeedEnrichment() };
  const body = direction
    ? replaceRerunDirection(existingSeed?.exists ? existingSeed.body : renderNewSeedBody(topic), direction)
    : (existingSeed?.exists ? existingSeed.body : renderNewSeedBody(topic));
  return `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n${body.startsWith('\n') ? body.slice(1) : body}`;
}

function currentProfileRerunCount(bundle) {
  const profilePath = path.join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  const count = profile?.human_decision_checkpoints?.hitl2?.rerun_count ?? 0;
  if (!Number.isInteger(count) || count < 0) throw new Error('rb_profile.yaml human_decision_checkpoints.hitl2.rerun_count must be a non-negative integer');
  return count;
}

function validateRerunDirectionCounts(input, profileRerunCount) {
  if (input.context !== 'rerun' || !Array.isArray(input.actions)) return;
  for (const action of input.actions) {
    if (action.direction && action.direction.rerun_count !== profileRerunCount + 1) {
      throw new Error(`rerun direction count must equal accepted profile count + 1 (${profileRerunCount + 1})`);
    }
  }
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
  return ok ? {
    ok: true,
    context,
    current_node: status.current_node,
    current_gate: status.current_gate,
    next_gate: status.next_gate,
    source_attempt_index: handoff.handoff.kind === 'post_final_reentry' ? null : handoff.handoff.index,
    load_witness_index: handoff.handoff.loadComplete?.index ?? null,
    ...(handoff.handoff.kind === 'post_final_reentry' ? {
      source_handoff_kind: 'post_final_reentry',
      source_handoff_event_id: handoff.handoff.eventId,
      source_handoff_event_index: handoff.handoff.index,
      source_handoff_event_sha256: handoff.handoff.eventLineSha256,
      source_handoff_operation_id: handoff.handoff.operationId,
      source_handoff_after_profile_sha256: handoff.handoff.committedAfterProfileSha256,
      source_handoff_transition_index: handoff.handoff.transition?.index ?? null,
      source_handoff_transition_binding: handoff.handoff.transition?.event ?? null,
      status_snapshot: {
        current_node: status.current_node,
        current_gate: status.current_gate,
        next_gate: status.next_gate,
      },
    } : {}),
  }
    : { ok: false, reason_code: 'rerun_not_authorized', reason: handoff.inspect?.[0] || 'rerun apply requires route-bound HITL2 witness and hitl2_recorded→rerun_ready window' };
}
function activeTopicWork(bundle, plan, affectedTopicUids) {
  const affected = new Set(affectedTopicUids);
  if (affected.size === 0) return [];
  const layouts = evaluateTopicLayouts(plan.topic_registry);
  const matches = [];
  const queuePath = path.join(bundle, 'rb_queue.json');
  if (existsSync(queuePath)) {
    const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
    for (const location of ['active_window', 'refill_pool']) for (const item of queue[location] || []) {
      const resolved = resolveStructuredTopicBinding(layouts, item);
      if (resolved.ok && affected.has(resolved.topic_uid) && ['queued', 'running', 'blocked'].includes(item.status)) matches.push(`rb_queue.json#/${location}/${item.queue_item_id}`);
    }
  }
  const indexPath = path.join(bundle, '_work_units', '_index.json');
  if (existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    for (const item of Object.values(index.work_units || {})) {
      if (item.status !== 'claimed') continue;
      try {
        const manifest = JSON.parse(readFileSync(path.join(bundle, item.paths.manifest_ref), 'utf8'));
        const resolved = resolveStructuredTopicBinding(layouts, manifest);
        if (resolved.ok && affected.has(resolved.topic_uid)) matches.push(`_work_units/_index.json#/work_units/${item.work_id}`);
      } catch {
        matches.push(`_work_units/_index.json#/work_units/${item.work_id}`);
      }
    }
  }
  return matches;
}

function safeRemoveBlocker(bundle, plan, removedTopicUids) {
  const removed = new Set(removedTopicUids);
  if (removed.size === 0) return null;
  const layouts = evaluateTopicLayouts(plan.topic_registry);
  const queuePath = path.join(bundle, 'rb_queue.json');
  if (existsSync(queuePath)) {
    const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
    const records = [
      ...(queue.active_window || []).map((item) => ({ ref: `rb_queue.json#/active_window/${item.queue_item_id}`, item })),
      ...(queue.refill_pool || []).map((item) => ({ ref: `rb_queue.json#/refill_pool/${item.queue_item_id}`, item })),
      ...(queue.terminal_history || []).map((record) => ({ ref: `rb_queue.json#/terminal_history/${record.queue_item_id}`, item: record.item })),
    ];
    for (const record of records) {
      const resolved = resolveStructuredTopicBinding(layouts, record.item);
      if (resolved.ok && removed.has(resolved.topic_uid)) return { reason_code: 'remove_has_history', fact_refs: [record.ref] };
      if (!resolved.ok && record.item && (record.item.payload?.topic_slug || record.item.lineage?.topic_slug)) return { reason_code: 'remove_history_unresolved', fact_refs: [record.ref] };
    }
  }

  const indexPath = path.join(bundle, '_work_units', '_index.json');
  if (existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    for (const record of Object.values(index.work_units || {})) {
      const ref = `_work_units/_index.json#/work_units/${record.work_id}`;
      try {
        const manifest = JSON.parse(readFileSync(path.join(bundle, record.paths.manifest_ref), 'utf8'));
        const resolved = resolveStructuredTopicBinding(layouts, manifest);
        if (resolved.ok && removed.has(resolved.topic_uid)) return { reason_code: 'remove_has_history', fact_refs: [ref] };
        if (!resolved.ok) return { reason_code: 'remove_history_unresolved', fact_refs: [ref] };
      } catch {
        return { reason_code: 'remove_history_unresolved', fact_refs: [ref] };
      }
    }
  }

  for (const topicUid of removed) {
    for (const slug of acceptedTopicSlugs(layouts, topicUid)) {
      for (const relative of [`artifacts/wave0/${slug}`, `artifacts/wave1/${slug}`, `reference/${slug}`]) {
        if (existsSync(path.join(bundle, relative))) return { reason_code: 'remove_has_history', fact_refs: [relative] };
      }
      const referenceRoot = path.join(bundle, 'reference');
      if (existsSync(referenceRoot)) {
        const matched = readdirSync(referenceRoot).find((name) => name === `${slug}.md` || name.startsWith(`${slug}-`) || name.startsWith(`${slug}_`));
        if (matched) return { reason_code: 'remove_has_history', fact_refs: [`reference/${matched}`] };
      }
    }
  }
  return null;
}
// @impl CTS-001, RRM-007
export function evaluateCanonicalSeedBindings(bundle, plan) {
  const rows = [];
  for (const topic of plan.topic_registry) {
    const relativePath = `seed_topics/${topic.slug}.md`;
    const seedPath = path.join(bundle, relativePath);
    if (!existsSync(seedPath)) {
      rows.push({ topic_uid: topic.topic_uid, slug: topic.slug, ok: false, reason_code: 'seed_missing', fact_refs: [`rb_plan.md#/topic_registry/${topic.topic_uid}`, relativePath] });
      continue;
    }
    const evaluation = evaluateSeedTopicAuthoring({
      raw: readFileSync(seedPath, 'utf8'),
      relativePath,
      topic,
    });
    rows.push({
      topic_uid: topic.topic_uid,
      slug: topic.slug,
      ok: evaluation.passed,
      reason_code: evaluation.passed ? 'bound' : 'seed_mismatch',
      authoring_reason_code: evaluation.passed ? null : evaluation.reason_code,
      fact_refs: [`rb_plan.md#/topic_registry/${topic.topic_uid}`, relativePath],
    });
  }
  return rows;
}
function readSubmittedTopicFacts(bundle, layouts) {
  let ledgerRows;
  try {
    ledgerRows = readSubmittedWorkUnitDeclarations(bundle);
  } catch (error) {
    return { byUid: new Map(), blocker: { reason_code: 'submitted_topic_binding_unresolved', reason: error.message, recommended_action: 'Repair submitted work-unit authority through the existing work-unit owner, then rerun inspect.' } };
  }

  const byUid = new Map();
  for (const row of ledgerRows) {
    const workUnitDir = path.resolve(bundle, row.work_unit_ref);
    if (workUnitDir !== bundle && !workUnitDir.startsWith(`${bundle}${path.sep}`)) {
      return { byUid: new Map(), blocker: { reason_code: 'submitted_topic_binding_unresolved', work_id: row.work_id, reason: 'work_unit_ref escapes bundle', recommended_action: 'Repair submitted work-unit authority through the existing work-unit owner, then rerun inspect.' } };
    }
    const manifestPath = path.join(workUnitDir, 'manifest.json');
    let manifest;
    try {
      manifest = WorkUnitManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
    } catch (error) {
      return { byUid: new Map(), blocker: { reason_code: 'submitted_topic_binding_unresolved', work_id: row.work_id, reason: `manifest snapshot unreadable: ${error.message}`, fact_refs: [row.work_unit_ref], recommended_action: 'Repair submitted work-unit authority through the existing work-unit owner, then rerun inspect.' } };
    }
    if (manifest.work_id !== row.work_id || manifest.queue_item_id !== row.queue_item_id) {
      return { byUid: new Map(), blocker: { reason_code: 'submitted_topic_binding_unresolved', work_id: row.work_id, reason: 'ledger and manifest identity mismatch', fact_refs: [row.work_unit_ref], recommended_action: 'Repair submitted work-unit authority through the existing work-unit owner, then rerun inspect.' } };
    }
    const resolved = resolveStructuredTopicBinding(layouts, manifest);
    if (!resolved.ok) {
      return { byUid: new Map(), blocker: { reason_code: 'submitted_topic_binding_unresolved', work_id: row.work_id, binding_reason_code: resolved.reason_code, fact_refs: [row.work_unit_ref], recommended_action: 'Repair the immutable queue-item topic binding through the existing work-unit owner, then rerun inspect.' } };
    }
    const rows = byUid.get(resolved.topic_uid) || [];
    rows.push({ row, binding: resolved });
    byUid.set(resolved.topic_uid, rows);
  }
  return { byUid, blocker: null };
}

function progressRows(bundle, plan, bindings) {
  let queue = {};
  try { queue = JSON.parse(readFileSync(path.join(bundle, 'rb_queue.json'), 'utf8')); } catch {}
  const layouts = evaluateTopicLayouts(plan.topic_registry);
  const submitted = readSubmittedTopicFacts(bundle, layouts);
  const topics = plan.topic_registry.map((topic) => {
    const binding = bindings.find((item) => item.topic_uid === topic.topic_uid);
    if (!binding?.ok) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'blocked', reason_code: binding?.reason_code || 'binding_missing', fact_refs: binding?.fact_refs || [], recommended_action: 'Repair canonical registry/seed binding, then rerun inspect.' };
    const active = [...(queue.active_window || []), ...(queue.refill_pool || [])].filter((item) => resolveStructuredTopicBinding(layouts, item).topic_uid === topic.topic_uid && ['queued', 'running', 'blocked'].includes(item.status));
    const artifactRoots = acceptedTopicSlugs(layouts, topic.topic_uid).flatMap((slug) => ['wave0', 'wave1'].filter((wave) => existsSync(path.join(bundle, 'artifacts', wave, slug))).map((wave) => `artifacts/${wave}/${slug}`));
    const submittedRows = submitted.byUid.get(topic.topic_uid) || [];
    if (artifactRoots.length > 0 && submittedRows.length > 0) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'complete', reason_code: 'submitted_artifact_facts', fact_refs: [...artifactRoots, ...submittedRows.map(({ row }) => `rb_output_declarations.jsonl#${row.work_id}`)], recommended_action: null };
    if (artifactRoots.length > 0) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'blocked', reason_code: 'artifact_without_submitted_fact', fact_refs: artifactRoots, recommended_action: 'Repair or submit through the existing work-unit owner, then rerun inspect.' };
    if (active.length > 0) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'in_progress', reason_code: 'active_queue_work', fact_refs: active.map((item) => `rb_queue.json#/${item.queue_item_id}`), recommended_action: 'Continue through the existing queue/work-unit owner.' };
    return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'not_started', reason_code: 'no_work_facts', fact_refs: binding.fact_refs, recommended_action: null };
  });
  return { topics, blocker: submitted.blocker };
}

function topicStateBlockerFinding(bundlePath, blocker) {
  const reasonCode = blocker.reason_code || 'topic_state_prerequisite_invalid';
  const recommended = blocker.recommended_action || null;
  const engineCommand = typeof recommended === 'string' && recommended.startsWith('node ');
  const userDecision = reasonCode === 'legacy_migration_required';
  const basis = reasonCode.includes('binding') || reasonCode.includes('mismatch')
    ? 'binding_integrity'
    : (reasonCode.includes('submitted') || reasonCode === 'artifact_without_submitted_fact' ? 'authority_integrity' : 'required_structure');
  const repairKind = engineCommand ? 'engine_operation' : (userDecision ? 'user_decision' : 'missing_contract');
  const writeTo = engineCommand
    ? recommended
    : (userDecision ? 'phases/phase-rerun.md' : `Canonical topic-state prerequisite boundary '${reasonCode}'`);
  const observed = {
    reason_code: reasonCode,
    reason: blocker.reason || null,
    fact_refs: blocker.fact_refs || [],
  };
  return makeContractFinding({
    id: `canonical_topic_state:${reasonCode}`,
    ruleId: 'canonical_topic_state_prerequisite',
    findingSource: 'checker',
    blockingBasis: basis,
    surface: blocker.workspace || blocker.path || 'rb_plan.md + UID-bound seed/topic authority',
    expected: 'Canonical topic registry, seed bindings, submitted-topic authority, and accepted workspace state are internally consistent.',
    observed,
    missingFact: `Canonical topic-state prerequisite failed: ${reasonCode}${blocker.reason ? ` — ${blocker.reason}` : ''}`,
    repairKind,
    writeTo,
    detail: `Canonical topic-state prerequisite failed: ${reasonCode}`,
    repair: recommended || (userDecision
      ? 'The existing rerun owner must record explicit migration semantics before canonical topic-state apply can continue.'
      : 'Use the owning topic-state/work-unit boundary; no direct authority edit is currently authorized.'),
  });
}

function withTopicStateFindings(result, bundlePath) {
  return {
    ...result,
    blockers: (result.blockers || []).map((blocker) => ({
      ...blocker,
      finding: topicStateBlockerFinding(bundlePath, blocker),
    })),
  };
}

export function inspectCanonicalTopicState({ bundlePath }) {
  const bundle = safeBundle(bundlePath);
  const workspaces = acceptedWorkspaces(bundle);
  if (workspaces.length > 0) return withTopicStateFindings({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'blocked', blockers: [{ reason_code: 'accepted_workspace', operation_id: workspaces[0].operation_id, workspace: workspaces[0].workspace, recommended_action: `node DPT_FRAMEWORK/cli/operate-topic-state.mjs recover --bundle ${bundlePath} --operation-id ${workspaces[0].operation_id}` }], topics: [] }, bundlePath);
  const planPath = path.join(bundle, 'rb_plan.md');
  if (!existsSync(planPath) || lstatSync(planPath).isSymbolicLink() || !lstatSync(planPath).isFile()) {
    return withTopicStateFindings({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'invalid', blockers: [{ reason_code: 'plan_missing', recommended_action: 'Restore a regular rb_plan.md through the owning lifecycle path, then rerun inspect.' }], topics: [] }, bundlePath);
  }
  let plan;
  try {
    plan = splitPlan(readFileSync(planPath, 'utf8')).frontmatter;
  } catch (error) {
    return withTopicStateFindings({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'invalid', blockers: [{ reason_code: 'plan_invalid', reason: error.message }], topics: [] }, bundlePath);
  }
  const canonical = CanonicalPlanSchema.safeParse(plan);
  if (!canonical.success) {
    const legacy = LegacyPlanSchema.safeParse(plan);
    return withTopicStateFindings({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: legacy.success, mode: legacy.success ? 'legacy' : 'invalid', blockers: legacy.success ? [{ reason_code: 'legacy_migration_required', recommended_action: 'Enter sanctioned rerun and prepare explicit migrate_legacy input.' }] : [{ reason_code: 'plan_invalid', reason: canonical.error.message }], topics: [] }, bundlePath);
  }
  const bindings = evaluateCanonicalSeedBindings(bundle, canonical.data);
  const progress = progressRows(bundle, canonical.data, bindings);
  const blockers = [...bindings.filter((item) => !item.ok), ...(progress.blocker ? [progress.blocker] : [])];
  const layoutBaseline = canonical.data.topic_registry.map((topic) => {
    const slugStem = losslessTopicSlugStem(topic.slug);
    return {
      topic_uid: topic.topic_uid,
      title: topic.title,
      ...(slugStem ? { slug_stem: slugStem } : { slug_stem_required: true }),
    };
  });
  return withTopicStateFindings({
    schema_version: TOPIC_STATE_SCHEMA_VERSION,
    operation: 'inspect',
    passed: blockers.length === 0,
    mode: 'canonical',
    plan_sha256: hashBytes(readFileSync(planPath)),
    layout_baseline: { context: 'rerun', action: 'mutate_layout', expected_plan_sha256: hashBytes(readFileSync(planPath)), topics: layoutBaseline, remove_topic_uids: [] },
    blockers,
    topics: progress.topics,
  }, bundlePath);
}

function buildMutation(bundle, parsedPlan, input, { profileRerunCount = null } = {}) {
  const current = structuredClone(parsedPlan);
  const touched = new Map();
  if (input.action === 'mutate_layout') {
    CanonicalPlanSchema.parse(current);
    const target = buildTopicLayoutTarget(current.topic_registry, input);
    const oldByUid = new Map(current.topic_registry.map((topic) => [topic.topic_uid, topic]));
    const finalByUid = new Map(target.topic_registry.map((topic) => [topic.topic_uid, topic]));
    const cleanupFiles = [];
    for (const topicUid of target.affected_topic_uids) {
      const oldTopic = oldByUid.get(topicUid);
      const finalTopic = finalByUid.get(topicUid);
      const oldSeed = readSeed(bundle, oldTopic.slug);
      if (!oldSeed.exists) throw new Error(`current seed missing for ${oldTopic.slug}`);
      if (finalTopic) touched.set(finalTopic.slug, renderSeed(finalTopic, oldSeed));
      if (!finalTopic || finalTopic.slug !== oldTopic.slug) {
        cleanupFiles.push({ relative: `seed_topics/${oldTopic.slug}.md`, expected_sha256: hashBytes(oldSeed.raw) });
      }
    }
    current.topic_registry = target.topic_registry;
    current.derived_topic_count = current.topic_registry.length;
    CanonicalPlanSchema.parse(current);
    return { plan: current, touched, cleanup_files: cleanupFiles, affected_topic_uids: target.affected_topic_uids };
  }
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
      touched.set(topic.slug, renderSeed(topic, seed));
    }
    current.topic_registry_version = '2';
  } else {
    const canonical = CanonicalPlanSchema.parse(current);
    const byUid = new Map(canonical.topic_registry.map((topic) => [topic.topic_uid, topic]));
    const targetUids = input.actions.filter((action) => action.action !== 'add_topic').map((action) => action.topic_uid);
    if (new Set(targetUids).size !== targetUids.length) throw new Error('duplicate update target');
    let nextOrdinal = canonical.topic_registry.reduce((max, topic) => Math.max(max, Number(topic.id) || 0), 0);
    for (const action of input.actions) {
      if (action.action === 'add_topic') {
        nextOrdinal += 1;
        const id = String(nextOrdinal).padStart(2, '0');
        const slug = `${id}_${action.slug_stem}`;
        if (canonical.topic_registry.some((topic) => topic.slug === slug)) throw new Error(`duplicate slug: ${slug}`);
        const topic = { topic_uid: `tp_${randomUUID()}`, id, slug, title: action.title, must_answer: action.must_answer, scope_role: action.scope_role, depends_on_topic_uids: action.depends_on_topic_uids };
        canonical.topic_registry.push(topic); byUid.set(topic.topic_uid, topic); touched.set(slug, renderSeed(topic, null, action.direction || null));
      } else if (action.action === 'update_intent') {
        const topic = byUid.get(action.topic_uid); if (!topic) throw new Error(`unknown topic_uid: ${action.topic_uid}`);
        Object.assign(topic, { title: action.title, must_answer: action.must_answer, scope_role: action.scope_role, depends_on_topic_uids: action.depends_on_topic_uids });
        const seed = readSeed(bundle, topic.slug); touched.set(topic.slug, renderSeed(topic, seed, action.direction || null));
      } else {
        const topic = byUid.get(action.topic_uid); if (!topic) throw new Error(`unknown topic_uid: ${action.topic_uid}`);
        const seed = readSeed(bundle, topic.slug); if (!seed.exists) throw new Error(`current seed missing for ${topic.slug}`);
        touched.set(topic.slug, renderSeed(topic, seed, action.direction));
      }
    }
    current.topic_registry = canonical.topic_registry;
  }
  current.derived_topic_count = current.topic_registry.length;
  CanonicalPlanSchema.parse(current);
  return { plan: current, touched, cleanup_files: [], affected_topic_uids: [...touched.keys()].map((slug) => current.topic_registry.find((topic) => topic.slug === slug)?.topic_uid).filter(Boolean) };
}

export function applyCanonicalTopicState({ bundlePath, input, crashAt = null, forceDeviceMismatch = false }) {
  const bundle = safeBundle(bundlePath);
  const requestedActions = Array.isArray(input?.actions) ? input.actions.map((item) => item?.action) : [input?.action];
  const imperativeLayoutAction = requestedActions.find((action) => ['remove', 'remove_topic', 'rename', 'renumber'].includes(action));
  if (imperativeLayoutAction) return {
    schema_version: TOPIC_STATE_SCHEMA_VERSION,
    operation: 'apply',
    verdict: 'blocked',
    reason_code: 'layout_mutation_not_supported',
    reason: `${imperativeLayoutAction} is not an accepted imperative action; use one complete mutate_layout target during sanctioned rerun.`,
    recommended_action: 'Run inspect to obtain the complete mutate_layout baseline, then submit that target through the sanctioned rerun path; do not direct-edit multiple surfaces.',
  };
  const unsupported = requestedActions.find((action) => ['retire', 'delete', 'move', 'path_move', 'set_progress', 'set_status', 'override'].includes(action));
  if (unsupported) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'layout_mutation_not_supported', reason: `${unsupported} is not supported by canonical topic-state apply`, recommended_action: 'Use the existing owner or propose the missing C5 capability; do not direct-edit multiple surfaces.' };
  const parsedInput = TopicApplyPlanSchema.parse(input);
  const accepted = acceptedWorkspaces(bundle);
  if (accepted.length) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'accepted_workspace', recommended_action: `recover --operation-id ${accepted[0].operation_id}` };
  const authorization = lifecycleAuthorization(bundle, parsedInput.context);
  if (!authorization.ok) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', ...authorization };
  const profileRerunCount = parsedInput.context === 'rerun' && Array.isArray(parsedInput.actions)
    ? currentProfileRerunCount(bundle)
    : null;
  validateRerunDirectionCounts(parsedInput, profileRerunCount);
  if ('action' in parsedInput && parsedInput.action === 'migrate_legacy' && parsedInput.context !== 'rerun') return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'migration_requires_rerun' };
  const planPath = path.join(bundle, 'rb_plan.md');
  const seedRoot = path.join(bundle, 'seed_topics');
  if (lstatSync(planPath).isSymbolicLink() || !lstatSync(planPath).isFile()) throw new Error('rb_plan.md must be a non-symlink regular file');
  if (!existsSync(seedRoot) || lstatSync(seedRoot).isSymbolicLink() || !lstatSync(seedRoot).isDirectory()) throw new Error('seed_topics must be a real directory');
  const oldRaw = readFileSync(planPath, 'utf8');
  if (parsedInput.action === 'mutate_layout' && hashBytes(oldRaw) !== parsedInput.expected_plan_sha256) {
    return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'plan_hash_mismatch', recommended_action: 'Rerun inspect and resubmit the complete layout baseline.' };
  }
  const split = splitPlan(oldRaw);
  let mutation;
  try {
    mutation = buildMutation(bundle, split.frontmatter, parsedInput, { profileRerunCount });
  } catch (error) {
    const reason = error.message || String(error);
    if (reason.startsWith('remove_has_dependents')) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'remove_has_dependents', reason };
    if (reason.startsWith('layout_slug_collision')) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'layout_slug_collision', reason };
    throw error;
  }
  const oldCanonical = CanonicalPlanSchema.safeParse(split.frontmatter);
  if (parsedInput.action === 'mutate_layout') {
    const removeBlocker = safeRemoveBlocker(bundle, oldCanonical.data, parsedInput.remove_topic_uids);
    if (removeBlocker) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', ...removeBlocker, recommended_action: 'Preserve the topic and its history; only an unstarted dependency-free topic can be removed.' };
  }
  const active = oldCanonical.success ? activeTopicWork(bundle, oldCanonical.data, mutation.affected_topic_uids) : [];
  if (active.length) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'active_topic_work', fact_refs: active, recommended_action: 'Resolve through existing queue/work-unit owner, then rerun apply.' };
  if (parsedInput.action === 'mutate_layout') {
    const finalBySlug = new Map(mutation.plan.topic_registry.map((topic) => [topic.slug, topic]));
    const oldByUid = new Map(oldCanonical.data.topic_registry.map((topic) => [topic.topic_uid, topic]));
    for (const slug of mutation.touched.keys()) {
      const target = path.join(seedRoot, `${slug}.md`);
      const finalTopic = finalBySlug.get(slug);
      const oldTopic = oldByUid.get(finalTopic.topic_uid);
      if (existsSync(target) && slug !== oldTopic?.slug) {
        return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'seed_target_exists', path: `seed_topics/${slug}.md`, recommended_action: 'Remove or repair the unexplained target through its existing owner, then rerun apply.' };
      }
      if (existsSync(target) && (lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile())) {
        return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'seed_target_unsafe', path: `seed_topics/${slug}.md` };
      }
    }
  }
  const presentation = refreshTopicRegistryTable(split.body, split.frontmatter.topic_registry || [], mutation.plan.topic_registry);
  const newPlanRaw = renderPlan(mutation.plan, presentation.body);
  const replacementsUnchanged = hashBytes(newPlanRaw) === hashBytes(oldRaw)
    && [...mutation.touched.entries()].every(([slug, bytes]) => existsSync(path.join(seedRoot, `${slug}.md`)) && hashBytes(readFileSync(path.join(seedRoot, `${slug}.md`))) === hashBytes(bytes));
  if (replacementsUnchanged && mutation.cleanup_files.length === 0) {
    return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'unchanged', affected_topic_uids: mutation.affected_topic_uids, follow_up: null, advisory: presentation.advisory };
  }
  const operationId = randomUUID();
  const root = workspaceRoot(bundle, true);
  const workspace = path.join(root, operationId); mkdirSync(workspace); fsyncPath(root);
  try {
    if (forceDeviceMismatch || statSync(workspace).dev !== statSync(planPath).dev || statSync(workspace).dev !== statSync(seedRoot).dev) throw new Error('topic-state workspace and owned targets must be on the same device');
    const stagedDir = path.join(workspace, 'staged'); mkdirSync(stagedDir); fsyncPath(workspace);
    const files = [];
    const stage = (relative, bytes) => {
      const target = path.join(bundle, relative); const stagedName = hashBytes(relative); const staged = path.join(stagedDir, stagedName);
      writeDurable(staged, bytes);
      files.push({ relative, expected_sha256: existsSync(target) ? hashBytes(readFileSync(target)) : null, staged_sha256: hashBytes(bytes), staged_name: stagedName });
    };
    for (const [slug, bytes] of mutation.touched) stage(`seed_topics/${slug}.md`, bytes);
    stage('rb_plan.md', newPlanRaw);
    if (crashAt === 'before_prepared') throw Object.assign(new Error('simulated crash before_prepared'), { preserveWorkspace: false });
    const manifest = { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation_id: operationId, state: 'prepared', authorization, input_sha256: hashBytes(JSON.stringify(parsedInput)), registry_length_changed: split.frontmatter.topic_registry.length !== mutation.plan.topic_registry.length, affected_topic_uids: mutation.affected_topic_uids, presentation_advisory: presentation.advisory, files, cleanup_files: mutation.cleanup_files };
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
  let seedCommitted = 0;
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
    writeFileSync(temp, readFileSync(staged), { flag: 'wx' }); fsyncPath(temp); renameSync(temp, target); fsyncPath(path.dirname(target));
    if (crashAt === 'after_plan' && file.relative === 'rb_plan.md') throw Object.assign(new Error('simulated crash after_plan'), { preserveWorkspace: true });
    if (file.relative.startsWith('seed_topics/')) seedCommitted += 1;
    if (crashAt === 'after_first_seed' && seedCommitted === 1) throw Object.assign(new Error('simulated crash after_first_seed'), { preserveWorkspace: true });
  }
  if (crashAt === 'before_cleanup') throw Object.assign(new Error('simulated crash before_cleanup'), { preserveWorkspace: true });
  let cleanupCommitted = 0;
  for (const cleanup of manifest.cleanup_files || []) {
    const target = path.join(bundle, cleanup.relative);
    if (!existsSync(target)) continue;
    if (lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile()) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'cleanup_target_unsafe', path: cleanup.relative };
    if (hashBytes(readFileSync(target)) !== cleanup.expected_sha256) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'late_drift', path: cleanup.relative };
    rmSync(target); fsyncPath(path.dirname(target)); cleanupCommitted += 1;
    if (crashAt === 'after_first_cleanup' && cleanupCommitted === 1) throw Object.assign(new Error('simulated crash after_first_cleanup'), { preserveWorkspace: true });
  }
  rmSync(workspace, { recursive: true }); fsyncPath(root);
  return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'committed', operation_id: operationId, follow_up: manifest.registry_length_changed ? 'recompute_research_style' : null, advisory: manifest.presentation_advisory || null };
}
