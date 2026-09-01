// topic-state-inspect.mjs
// Inspect read-model, blockers, and progress rows (W2 carve).
// @impl CTS-002

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
} from './topic-state-plan-schema.mjs';
import {
  hashBytes,
  safeBundle,
  splitPlan,
  acceptedWorkspaces,
  evaluateCanonicalSeedBindings,
} from './topic-state-bundle-io.mjs';
import { SEED_TOPIC_PROJECTION_ENTRY_FIELDS, SEED_TOPIC_PROJECTION_CARD_LABEL, SEED_TOPIC_PROJECTION_SLOTS, PROJECTION_SLOT_BY_ID, projectionSlotForId, projectionSlotsForWave, projectionSlotHeadingMatches, locateSeedProjectionSlots, renderSeedProjectionCard, renderSeedProjectionSlot, renderSeedProjectionAppendix, splitSeedProjectionCard } from "./topic-schema-projection.mjs";

export function activeTopicWork(bundle, plan, affectedTopicUids) {
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

export function safeRemoveBlocker(bundle, plan, removedTopicUids) {
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

export function readSubmittedTopicFacts(bundle, layouts) {
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

export function progressRows(bundle, plan, bindings) {
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

export function topicStateBlockerFinding(bundlePath, blocker) {
  const reasonCode = blocker.reason_code || 'topic_state_prerequisite_invalid';
  const recommended = blocker.recommended_action || null;
  const engineCommand = typeof recommended === 'string' && recommended.startsWith('node ');
  const basis = reasonCode.includes('binding') || reasonCode.includes('mismatch')
    ? 'binding_integrity'
    : (reasonCode.includes('submitted') || reasonCode === 'artifact_without_submitted_fact' ? 'authority_integrity' : 'required_structure');
  const repairKind = engineCommand ? 'engine_operation' : 'missing_contract';
  const writeTo = engineCommand
    ? recommended
    : `Canonical topic-state prerequisite boundary '${reasonCode}'`;
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
    repair: recommended || 'Use the owning topic-state/work-unit boundary; no direct authority edit is currently authorized.',
  });
}

export function withTopicStateFindings(result, bundlePath) {
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
  if (workspaces.length > 0) return withTopicStateFindings({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'blocked', blockers: [{ reason_code: 'accepted_workspace', operation_id: workspaces[0].operation_id, workspace: workspaces[0].workspace, recommended_action: `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs recover --bundle ${bundlePath} --operation-id ${workspaces[0].operation_id}` }], topics: [] }, bundlePath);
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
    return withTopicStateFindings({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'invalid', blockers: [{ reason_code: 'plan_invalid', reason: canonical.error.message }], topics: [] }, bundlePath);
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
