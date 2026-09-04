// @impl CTS-001, CTS-002, CTS-003, CTS-004, CTS-009, SCO-013

// Navigation: public API — TOPIC_STATE_SCHEMA_VERSION, TOPIC_STATE_ROOT, SEED_TOPIC_PROJECTION_ENTRY_FIELDS, SEED_TOPIC_PROJECTION_CARD_LABEL, SEED_TOPIC_PROJECTION_SLOTS, projectionSlotForId, projectionSlotsForWave, projectionSlotHeadingMatches, locateSeedProjectionSlots, renderSeedProjectionCard, renderSeedProjectionSlot, renderSeedProjectionAppendix, TopicApplyPlanSchema, …

import {
  closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync,
  readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { CanonicalPlanSchema } from '../../schema/contracts/plan.mjs';
import { WorkUnitManifestSchema } from '../../schema/contracts/work-unit.mjs';
import { checkPhaseHandoffPreflight } from './handoff-helpers.mjs';
import { readSubmittedWorkUnitDeclarations } from './gate-helpers-readers.mjs';
import { acceptedTopicSlugs, buildTopicLayoutTarget, evaluateTopicLayouts, losslessTopicSlugStem, resolveStructuredTopicBinding } from './topic-layout.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import { evaluateRerunDirection } from './rerun-direction.mjs';
import { locateCanonicalSections } from './plan-hostfile-sections.mjs';
import { evaluateSeedTopicAuthoring, renderSeedInitializationRegion } from './seed-topic-authoring-evaluator.mjs';
import { buildResearchStyleApplyCommand, RESEARCH_STYLE_WRITER_PATH } from './research-style-projection.mjs';
import {
  collectEligibleWorkUnitProjection,
  collectSubmittedWave0ContributionProjection,
  readProjectionProfileRound,
} from '../work-unit-projection.mjs';
import { loadWave2FindingIndexFact } from './wave-depth-contracts.mjs';
import {
  PROJECTION_ENTRY_FIELDS,
  evaluateProjectionEntryNavigation,
  isAcceptedDeferredProjectionEntry,
  parseProjectionEntryArea,
  upsertProjectionEntryArea,
} from './projection-entry-contract.mjs';
import {
  TOPIC_STATE_SCHEMA_VERSION,
  TopicApplyPlanSchema,
  projectTopicApplyValidationErrors,
} from './topic-state-plan-schema.mjs';
import {
  hashBytes,
  fsyncPath,
  writeDurable,
  safeBundle,
  splitPlan,
  renderPlan,
  renderSeed,
  readSeed,
  workspaceRoot,
  acceptedWorkspaces,
} from './topic-state-bundle-io.mjs';
import {
  buildWaveProjectionMutation,
} from './topic-state-wave-projection.mjs';
import {
  activeTopicWork,
  safeRemoveBlocker,
} from './topic-state-inspect.mjs';
// Facade re-exports: public names whose implementations moved to the carved modules (W2).
export { TOPIC_STATE_SCHEMA_VERSION, TopicApplyPlanSchema, describeTopicApplyPlanSchema, projectTopicApplyValidationErrors } from './topic-state-plan-schema.mjs';
export { evaluateCanonicalSeedBindings } from './topic-state-bundle-io.mjs';
export { inspectCanonicalTopicState } from './topic-state-inspect.mjs';

export { SEED_TOPIC_PROJECTION_ENTRY_FIELDS, SEED_TOPIC_PROJECTION_CARD_LABEL, SEED_TOPIC_PROJECTION_SLOTS, PROJECTION_SLOT_BY_ID, projectionSlotForId, projectionSlotsForWave, projectionSlotHeadingMatches, locateSeedProjectionSlots, renderSeedProjectionCard, renderSeedProjectionSlot, renderSeedProjectionAppendix, splitSeedProjectionCard } from "./topic-schema-projection.mjs";

export const TOPIC_STATE_ROOT = '_diagnostics/topic-state';


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

function currentProfileRerunCount(bundle) {
  const profilePath = path.join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  const count = profile?.human_decision_checkpoints?.hitl2?.rerun_count ?? 0;
  if (!Number.isInteger(count) || count < 0) throw new Error('rb_profile.yaml human_decision_checkpoints.hitl2.rerun_count must be a non-negative integer');
  return count;
}

function readSelectedResearchProfile(bundle) {
  const profilePath = path.join(bundle, 'rb_profile.yaml');
  if (!existsSync(profilePath) || lstatSync(profilePath).isSymbolicLink() || !lstatSync(profilePath).isFile()) {
    return null;
  }
  try {
    const profile = parseYaml(readFileSync(profilePath, 'utf8'));
    return typeof profile?.research_profile === 'string' ? profile.research_profile : null;
  } catch {
    return null;
  }
}

function styleProjectionCheckpoint(context) {
  return context === 'rerun'
    ? { gate: 'rerun-ready', current_node: 'phases/phase-rerun.md' }
    : { gate: 'hitl1-recorded', current_node: 'phases/phase-hitl1.md' };
}

function buildStyleProjectionHandoff(bundle, { committedTopicCount, context }) {
  const selectedProfile = readSelectedResearchProfile(bundle);
  const checkpoint = styleProjectionCheckpoint(context);
  const base = {
    owner: RESEARCH_STYLE_WRITER_PATH,
    selected_profile: selectedProfile,
    committed_topic_count: committedTopicCount,
    checkpoint,
  };
  if (!selectedProfile || selectedProfile === 'not_selected') {
    return {
      status: 'profile_unavailable',
      command: null,
      reason_code: 'selected_profile_unavailable',
      ...base,
    };
  }
  try {
    return {
      status: 'refresh_required',
      command: buildResearchStyleApplyCommand({ bundlePath: bundle, selectedProfile }),
      ...base,
    };
  } catch {
    return {
      status: 'profile_unavailable',
      command: null,
      reason_code: 'selected_profile_unavailable',
      ...base,
    };
  }
}

function validateRerunDirectionCounts(input, profileRerunCount) {
  if (input.context !== 'rerun' || !Array.isArray(input.actions)) return;
  for (const action of input.actions) {
    if (action.direction && action.direction.rerun_count !== profileRerunCount + 1) {
      throw new Error(`rerun direction count must equal accepted profile count + 1 (${profileRerunCount + 1})`);
    }
  }
}

function lifecycleAuthorization(bundle, context, projectionWave = null) {
  const status = JSON.parse(readFileSync(path.join(bundle, 'rb_status.json'), 'utf8'));
  if (context === 'hitl1') {
    const ok = status.current_node === 'phases/phase-hitl1.md' && status.current_gate === 'hitl1_recorded' && status.next_gate === 'setup_ready';
    return ok ? { ok: true, context, current_node: status.current_node, current_gate: status.current_gate, next_gate: status.next_gate }
      : { ok: false, reason_code: 'hitl1_not_authorized', reason: 'HITL1 apply requires current_node phase-hitl1 and hitl1_recorded→setup_ready window' };
  }
  if (context === 'seed_topics') {
    const handoff = checkPhaseHandoffPreflight(bundle, 'phases/phase-seed-topics.md');
    const incoming = ['setup_ready', 'rerun_ready'].includes(status.current_gate) && status.next_gate === 'seed_topics_ready';
    const ok = handoff.ok && status.current_node === 'phases/phase-seed-topics.md' && incoming;
    return ok ? {
      ok: true,
      context,
      current_node: status.current_node,
      current_gate: status.current_gate,
      next_gate: status.next_gate,
      source_attempt_index: handoff.handoff?.index ?? null,
      load_witness_index: handoff.handoff?.loadComplete?.index ?? null,
    } : {
      ok: false,
      reason_code: 'seed_topics_not_authorized',
      reason: handoff.inspect?.[0] || 'seed enrichment requires a route-bound Seed Topics handoff and setup_ready|rerun_ready→seed_topics_ready window',
    };
  }
  if (context === 'wave_projection') {
    const window = {
      wave0: { node: 'phases/phase-wave0.md', currentGate: 'seed_topics_ready', nextGate: 'wave0_complete' },
      wave1: { node: 'phases/phase-wave1.md', currentGate: 'wave0_complete', nextGate: 'wave1_complete' },
      wave2: { node: 'phases/phase-wave2.md', currentGate: 'wave1_complete', nextGate: 'wave2_complete' },
    }[projectionWave];
    if (!window) return { ok: false, reason_code: 'wave_projection_not_authorized', reason: 'Projection apply requires wave0, wave1, or wave2.' };
    const handoff = checkPhaseHandoffPreflight(bundle, window.node);
    const ok = handoff.ok
      && status.current_node === window.node
      && status.current_gate === window.currentGate
      && status.next_gate === window.nextGate;
    return ok ? {
      ok: true,
      context,
      wave: projectionWave,
      current_node: status.current_node,
      current_gate: status.current_gate,
      next_gate: status.next_gate,
      source_attempt_index: handoff.handoff?.index ?? null,
      load_witness_index: handoff.handoff?.loadComplete?.index ?? null,
    } : {
      ok: false,
      reason_code: 'wave_projection_not_authorized',
      reason: handoff.inspect?.[0] || `Projection apply requires ${window.node} and ${window.currentGate}->${window.nextGate}.`,
    };
  }
  if (context !== 'rerun') return { ok: false, reason_code: 'context_not_authorized', reason: `Unsupported topic-state context: ${context}` };
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

export function inspectSeedTopicsAuthoringAuthorization({ bundlePath }) {
  return lifecycleAuthorization(safeBundle(bundlePath), 'seed_topics');
}

function buildMutation(bundle, parsedPlan, input, { profileRerunCount = null } = {}) {
  const current = structuredClone(parsedPlan);
  const touched = new Map();
  if (input.action === 'apply_seed_projection') {
    return buildWaveProjectionMutation(bundle, current, input);
  }
  if (input.action === 'enrich_seed') {
    const canonical = CanonicalPlanSchema.parse(current);
    const topic = canonical.topic_registry.find((entry) => entry.topic_uid === input.topic_uid);
    if (!topic) throw Object.assign(new Error(`unknown topic_uid: ${input.topic_uid}`), { reason_code: 'unknown_topic_uid' });
    let seed;
    try { seed = readSeed(bundle, topic.slug); } catch (error) {
      throw Object.assign(new Error(error.message), { reason_code: /frontmatter/.test(error.message) ? 'frontmatter_invalid' : 'seed_target_unsafe' });
    }
    if (!seed.exists) throw Object.assign(new Error(`current seed missing for ${topic.slug}`), { reason_code: 'seed_missing' });
    const before = evaluateSeedTopicAuthoring({ raw: seed.raw, relativePath: `seed_topics/${topic.slug}.md`, topic });
    if (!before.passed && before.reason_code === 'frontmatter_invalid') {
      throw Object.assign(new Error(before.missing_fact), { reason_code: 'frontmatter_invalid', coordinate: before.write_to });
    }
    const frontmatter = { ...seed.frontmatter, ...input.enrichment };
    touched.set(topic.slug, renderSeed(topic, { ...seed, frontmatter }));
    return {
      plan: current,
      touched,
      cleanup_files: [],
      affected_topic_uids: [topic.topic_uid],
      selected_topic: topic,
      binding_repair: before.passed ? null : {
        field: before.write_to?.split('#/')[1] || null,
        expected: before.expected,
        observed: before.observed,
        coordinate: before.write_to || null,
      },
    };
  }
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
  if (unsupported) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'layout_mutation_not_supported', reason: `${unsupported} is not supported by canonical topic-state apply`, recommended_action: 'Use the existing owner or propose the missing ReopenResearchPass capability; do not direct-edit multiple surfaces.' };
  const parsed = TopicApplyPlanSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const validation = projectTopicApplyValidationErrors(parsed.error.issues, { input });
    return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: 'input_invalid',
      repair_kind: 'agent_action',
      repair_surface: 'retained_input',
      coordinate: validation.primary_validation_path || issue?.path?.join('.') || null,
      reason: issue?.message || 'invalid topic-state input',
      ...validation,
      rerun: 'node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle <bundle-path> --input <input-path>',
      recommended_action: 'Correct the retained complete input and rerun this same apply checkpoint.',
    };
  }
  const parsedInput = parsed.data;
  const planPath = path.join(bundle, 'rb_plan.md');
  if (!existsSync(planPath) || lstatSync(planPath).isSymbolicLink() || !lstatSync(planPath).isFile()) {
    return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: 'plan_invalid',
      repair_kind: 'missing_contract',
      reason: 'rb_plan.md must be a non-symlink regular file',
      recommended_action: 'Restore a current canonical rb_plan.md through its owning lifecycle path, then rerun this same apply checkpoint.',
    };
  }
  const oldRaw = readFileSync(planPath, 'utf8');
  let split;
  try {
    split = splitPlan(oldRaw);
  } catch (error) {
    return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: 'plan_invalid',
      repair_kind: 'missing_contract',
      reason: error.message,
      recommended_action: 'Restore a current canonical rb_plan.md through its owning lifecycle path, then rerun this same apply checkpoint.',
    };
  }
  const oldCanonical = CanonicalPlanSchema.safeParse(split.frontmatter);
  if (!oldCanonical.success) {
    return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: 'plan_invalid',
      repair_kind: 'missing_contract',
      reason: oldCanonical.error.message,
      recommended_action: 'Restore a current canonical rb_plan.md through its owning lifecycle path, then rerun this same apply checkpoint.',
    };
  }
  const accepted = acceptedWorkspaces(bundle);
  if (accepted.length) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'accepted_workspace', recommended_action: `recover --operation-id ${accepted[0].operation_id}` };
  const authorization = lifecycleAuthorization(bundle, parsedInput.context, parsedInput.wave || null);
  if (!authorization.ok) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', ...authorization };
  const profileRerunCount = parsedInput.context === 'rerun' && Array.isArray(parsedInput.actions)
    ? currentProfileRerunCount(bundle)
    : null;
  validateRerunDirectionCounts(parsedInput, profileRerunCount);
  const seedRoot = path.join(bundle, 'seed_topics');
  if (!existsSync(seedRoot) || lstatSync(seedRoot).isSymbolicLink() || !lstatSync(seedRoot).isDirectory()) throw new Error('seed_topics must be a real directory');
  if (parsedInput.action === 'mutate_layout' && hashBytes(oldRaw) !== parsedInput.expected_plan_sha256) {
    return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'plan_hash_mismatch', recommended_action: 'Rerun inspect and resubmit the complete layout baseline.' };
  }
  let mutation;
  try {
    mutation = buildMutation(bundle, split.frontmatter, parsedInput, { profileRerunCount });
  } catch (error) {
    const reason = error.message || String(error);
    if (reason.startsWith('remove_has_dependents')) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'remove_has_dependents', reason };
    if (reason.startsWith('layout_slug_collision')) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'layout_slug_collision', reason };
    if (error.reason_code) return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: error.reason_code,
      repair_kind: error.reason_code === 'seed_target_unsafe' ? 'missing_contract' : 'agent_action',
      coordinate: error.coordinate || null,
      reason,
      ...(Array.isArray(error.near_matches) && error.near_matches.length > 0 ? { near_matches: error.near_matches } : {}),
      ...(Array.isArray(error.missing_refs) && error.missing_refs.length > 0 ? { missing_refs: error.missing_refs } : {}),
      recommended_action: error.reason_code === 'frontmatter_invalid'
        ? 'Repair only the reported frontmatter syntax coordinate, then rerun this same apply checkpoint.'
        : error.reason_code.startsWith('projection_entry_ref')
          ? 'Materialize or select an existing safe reference/*.md target through the existing reference owner, then rerun this same apply checkpoint.'
        : 'Correct the direct root through its owning boundary, then rerun this same apply checkpoint.',
    };
    throw error;
  }
  if (parsedInput.action === 'mutate_layout') {
    const removeBlocker = safeRemoveBlocker(bundle, oldCanonical.data, parsedInput.remove_topic_uids);
    if (removeBlocker) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', ...removeBlocker, recommended_action: 'Preserve the topic and its history; only an unstarted dependency-free topic can be removed.' };
  }
  const active = ['enrich_seed', 'apply_seed_projection'].includes(parsedInput.action)
    ? []
    : (oldCanonical.success ? activeTopicWork(bundle, oldCanonical.data, mutation.affected_topic_uids) : []);
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
  const presentation = ['enrich_seed', 'apply_seed_projection'].includes(parsedInput.action)
    ? { body: split.body, advisory: null }
    : refreshTopicRegistryTable(split.body, split.frontmatter.topic_registry || [], mutation.plan.topic_registry);
  const newPlanRaw = ['enrich_seed', 'apply_seed_projection'].includes(parsedInput.action)
    ? oldRaw
    : renderPlan(mutation.plan, presentation.body);
  if (parsedInput.action === 'enrich_seed') {
    const staged = mutation.touched.get(mutation.selected_topic.slug);
    const post = evaluateSeedTopicAuthoring({
      raw: staged,
      relativePath: `seed_topics/${mutation.selected_topic.slug}.md`,
      topic: mutation.selected_topic,
    });
    if (!post.passed) return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: 'writer_postcondition_failed',
      repair_kind: 'missing_contract',
      coordinate: post.write_to,
      reason: post.missing_fact,
      recommended_action: 'Repair the canonical topic-state writer contract, then rerun this same apply checkpoint.',
    };
  }
  const replacementsUnchanged = hashBytes(newPlanRaw) === hashBytes(oldRaw)
    && [...mutation.touched.entries()].every(([slug, bytes]) => existsSync(path.join(seedRoot, `${slug}.md`)) && hashBytes(readFileSync(path.join(seedRoot, `${slug}.md`))) === hashBytes(bytes));
  if (replacementsUnchanged && mutation.cleanup_files.length === 0) {
    return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'unchanged',
      affected_topic_uids: mutation.affected_topic_uids,
      advisory: presentation.advisory,
      ...(parsedInput.action === 'enrich_seed' ? {
        action: 'enrich_seed', topic_uid: mutation.selected_topic.topic_uid,
        slug: mutation.selected_topic.slug, path: `seed_topics/${mutation.selected_topic.slug}.md`, binding_repair: null,
      } : parsedInput.action === 'apply_seed_projection' ? {
        action: 'apply_seed_projection', wave: mutation.projection.wave,
        topic_uid: mutation.projection.topic_uid, slots: mutation.projection.slots,
        path: `seed_topics/${mutation.selected_topic.slug}.md`,
        ...(mutation.projection.deferred_contribution ? { deferred_contribution: mutation.projection.deferred_contribution } : {}),
      } : {}),
    };
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
    if (parsedInput.action !== 'apply_seed_projection') stage('rb_plan.md', newPlanRaw);
    if (crashAt === 'before_prepared') throw Object.assign(new Error('simulated crash before_prepared'), { preserveWorkspace: false });
    const manifest = { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation_id: operationId, state: 'prepared', authorization, input_sha256: hashBytes(JSON.stringify(parsedInput)), registry_length_changed: split.frontmatter.topic_registry.length !== mutation.plan.topic_registry.length, committed_topic_count: mutation.plan.topic_registry.length, affected_topic_uids: mutation.affected_topic_uids, presentation_advisory: presentation.advisory, files, cleanup_files: mutation.cleanup_files, ...(parsedInput.action === 'enrich_seed' ? { action: 'enrich_seed', topic_uid: mutation.selected_topic.topic_uid, slug: mutation.selected_topic.slug, path: `seed_topics/${mutation.selected_topic.slug}.md`, binding_repair: mutation.binding_repair } : parsedInput.action === 'apply_seed_projection' ? { action: 'apply_seed_projection', wave: mutation.projection.wave, topic_uid: mutation.projection.topic_uid, slots: mutation.projection.slots, path: `seed_topics/${mutation.selected_topic.slug}.md` } : {}) };
    writeDurable(path.join(workspace, 'prepared.json'), `${JSON.stringify(manifest, null, 2)}\n`); fsyncPath(workspace);
    if (crashAt === 'after_prepared') throw Object.assign(new Error('simulated crash after_prepared'), { preserveWorkspace: true });
    const result = recoverCanonicalTopicState({ bundlePath, operationId, crashAt });
    return parsedInput.action === 'enrich_seed' ? {
      ...result,
      action: 'enrich_seed',
      topic_uid: mutation.selected_topic.topic_uid,
      slug: mutation.selected_topic.slug,
      path: `seed_topics/${mutation.selected_topic.slug}.md`,
      binding_repair: mutation.binding_repair,
    } : parsedInput.action === 'apply_seed_projection' ? {
      ...result,
      action: 'apply_seed_projection',
      wave: mutation.projection.wave,
      topic_uid: mutation.projection.topic_uid,
      slots: mutation.projection.slots,
      path: `seed_topics/${mutation.selected_topic.slug}.md`,
      ...(mutation.projection.deferred_contribution ? { deferred_contribution: mutation.projection.deferred_contribution } : {}),
    } : result;
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
  return {
    schema_version: TOPIC_STATE_SCHEMA_VERSION,
    operation: 'recover',
    verdict: 'committed',
    operation_id: operationId,
    ...(manifest.registry_length_changed ? {
      style_projection: buildStyleProjectionHandoff(bundle, {
        committedTopicCount: Number.isInteger(manifest.committed_topic_count)
          ? manifest.committed_topic_count
          : null,
        context: manifest.authorization?.context,
      }),
    } : {}),
    advisory: manifest.presentation_advisory || null,
    ...(manifest.action === 'enrich_seed' ? { action: manifest.action, topic_uid: manifest.topic_uid, slug: manifest.slug, path: manifest.path, binding_repair: manifest.binding_repair ?? null } : {}),
  };
}
