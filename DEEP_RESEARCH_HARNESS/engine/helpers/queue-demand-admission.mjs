// @impl QIV-001, QIV-004, DEW-003
// Current-facts admission for unclaimed delegated queue demand. This module never mutates bundle state.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import { WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION } from '../../schema/contracts/work-unit.mjs';
import { CanonicalPlanSchema } from '../../schema/contracts/plan.mjs';
import { DEFAULT_KIND_REGISTRY } from '../work-unit-constants.mjs';
import { kindContractForQueueItem } from '../work-unit-utils.mjs';
import { assignmentContractFeedbackFromError, resolveWorkUnitAssignmentContract } from '../work-unit-assignment-contract.mjs';
import { loadWorkUnitIndex } from '../work-unit-index.mjs';
import { loadQueueReadOnly } from '../queue-manager-lifecycle.mjs';
import { readAndValidateManifest } from '../work-unit-validation.mjs';
import { inspectCanonicalTopicState } from './canonical-topic-state.mjs';
import { evaluateTopicLayouts, resolveTopicLayout } from './topic-layout.mjs';

const SUPPORTED_KINDS = new Set(Object.keys(DEFAULT_KIND_REGISTRY.kinds));
const WAVE0_SOURCE_ROLE = 'source_yaml';
const WAVE0_SOURCE_CONTRACT = 'wave0.source-metadata-array.v1';

export const Wave0TargetCandidateSchema = z.object({
  queue_item_id: z.string().trim().min(1),
  target: z.string().trim().min(1),
}).strict();

export const Wave0TargetOwnerSchema = z.object({
  owner_kind: z.enum(['queued', 'in_flight']),
  queue_item_id: z.string().trim().min(1),
  work_id: z.string().trim().min(1).optional(),
  target: z.string().trim().min(1),
}).strict().superRefine((owner, ctx) => {
  if (owner.owner_kind === 'in_flight' && !owner.work_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['work_id'], message: 'in_flight owner requires work_id' });
  }
  if (owner.owner_kind === 'queued' && owner.work_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['work_id'], message: 'queued owner must not carry work_id' });
  }
});

export const Wave0TargetConflictSchema = z.object({
  candidate: Wave0TargetCandidateSchema,
  owner: Wave0TargetOwnerSchema,
  reason_code: z.literal('wave0_source_target_conflict'),
  repair_kind: z.literal('agent_action'),
  rerun: z.string().trim().min(1),
}).strict().superRefine((conflict, ctx) => {
  if (conflict.candidate.target !== conflict.owner.target) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['owner', 'target'], message: 'candidate and owner targets must match' });
  }
});

export function isDelegatedWorkUnitDemand(queueItem) {
  return queueItem?.targets?.delegates?.to === 'sub-agent';
}

function rejected(reason, reason_code, detail = {}) {
  return { ok: false, applicable: true, reason, reason_code, ...detail };
}

function explicitTopicBinding(queueItem) {
  const payload = queueItem.payload || {};
  const lineage = queueItem.lineage || {};
  if (payload.topic_uid && lineage.topic_uid && payload.topic_uid !== lineage.topic_uid) {
    return { ok: false, reason: `topic_uid conflict: payload='${payload.topic_uid}' vs lineage='${lineage.topic_uid}'`, reason_code: 'topic_uid_conflict' };
  }
  if (payload.topic_slug && lineage.topic_slug && payload.topic_slug !== lineage.topic_slug) {
    return { ok: false, reason: `topic_slug conflict: payload='${payload.topic_slug}' vs lineage='${lineage.topic_slug}'`, reason_code: 'topic_slug_conflict' };
  }
  return {
    ok: true,
    topic_uid: payload.topic_uid || lineage.topic_uid || null,
    topic_slug: payload.topic_slug || lineage.topic_slug || null,
  };
}

function resolveCurrentTopicBinding(queueItem, kind, currentFacts) {
  const requested = explicitTopicBinding(queueItem);
  if (!requested.ok) return requested;
  const needsTopic = kind !== 'wave2_targeted_evidence' || requested.topic_uid || requested.topic_slug;
  if (!needsTopic) return { ok: true, topic_binding: null };
  if (!requested.topic_uid || !requested.topic_slug) {
    return { ok: false, reason: 'delegated assignment requires explicit payload topic_uid and topic_slug', reason_code: 'topic_binding_required' };
  }
  if (!Array.isArray(currentFacts.topicRegistry)) {
    return { ok: false, reason: 'canonical topic registry is invalid or unreadable', reason_code: 'canonical_topic_state_required' };
  }
  const topicState = currentFacts.topicState;
  if (topicState?.mode === 'blocked') {
    const blocker = topicState.blockers?.[0];
    return { ok: false, reason: blocker?.recommended_action || 'accepted topic-state workspace must be recovered before delegated admission', reason_code: blocker?.reason_code || 'accepted_workspace' };
  }
  if (topicState?.mode !== 'canonical') {
    return { ok: false, reason: `delegated topic-scoped work requires canonical topic state, got ${topicState?.mode || 'unavailable'}`, reason_code: 'canonical_topic_state_required' };
  }
  const resolved = resolveTopicLayout(evaluateTopicLayouts(currentFacts.topicRegistry), requested, { currentOnly: true });
  if (!resolved.ok) {
    const suggestion = resolved.current_slug ? ` Use current slug '${resolved.current_slug}'.` : '';
    return { ok: false, reason: `queue item Topic ${requested.topic_uid}/${requested.topic_slug} is not the current canonical UID/slug binding.${suggestion}`, reason_code: resolved.reason_code };
  }
  const blocker = topicState.blockers?.find((item) => item.topic_uid === resolved.topic_uid || item.slug === resolved.current_slug);
  const committed = topicState.topics?.find((item) => item.topic_uid === resolved.topic_uid);
  if (!committed || blocker) {
    return { ok: false, reason: blocker?.recommended_action || `topic '${resolved.current_slug}' lacks a committed UID-bound seed projection`, reason_code: blocker?.reason_code || committed?.reason_code || 'topic_binding_required' };
  }
  return { ok: true, topic_binding: { topic_uid: resolved.topic_uid, topic_slug: resolved.current_slug } };
}

function validateFindingBinding(queueItem, currentFacts) {
  const payloadId = queueItem.payload?.finding_id;
  const lineageId = queueItem.lineage?.finding_id;
  if (payloadId && lineageId && payloadId !== lineageId) {
    return { ok: false, reason: `finding_id conflict: payload='${payloadId}' vs lineage='${lineageId}'`, reason_code: 'finding_id_conflict' };
  }
  const findingId = payloadId || lineageId;
  if (!findingId || !currentFacts.findingIndex) return { ok: true };
  const knownIds = (currentFacts.findingIndex.findings || []).map((finding) => finding.id);
  if (!knownIds.includes(findingId)) {
    return { ok: false, reason: `finding_id '${findingId}' not found in bundle finding-index`, reason_code: 'finding_id_unknown' };
  }
  return { ok: true };
}

/**
 * Evaluate one unclaimed delegated demand against supplied current authority facts.
 * The returned normalized queue item is for the caller's immediate transaction only;
 * it is never persisted as an admission verdict.
 */
function sourceTargetFromOutputContract(outputContract) {
  const matches = (outputContract?.required_outputs || []).filter((output) => (
    output.role === WAVE0_SOURCE_ROLE && output.direct_contract === WAVE0_SOURCE_CONTRACT
  ));
  if (matches.length !== 1) {
    throw new Error(`Wave0 assignment must contain exactly one ${WAVE0_SOURCE_ROLE}/${WAVE0_SOURCE_CONTRACT} required output`);
  }
  return matches[0].path;
}

function evaluateBaseQueueDemandAdmission({ queueItem, currentFacts = {} } = {}) {
  if (!isDelegatedWorkUnitDemand(queueItem)) return { ok: true, applicable: false, queue_item: queueItem };
  if (!SUPPORTED_KINDS.has(queueItem.kind)) {
    return rejected(`delegated queue demand requires an explicit supported work-unit kind; got '${queueItem.kind || '<missing>'}'`, 'delegated_kind_required');
  }

  const kind = queueItem.kind;
  if (kind === 'wave1_topic_deepening' && queueItem.producer_rule !== 'topic_deepening') {
    return rejected('wave1_topic_deepening assignment requires producer_rule topic_deepening', 'wave1_producer_required');
  }
  const topic = resolveCurrentTopicBinding(queueItem, kind, currentFacts);
  if (!topic.ok) return rejected(topic.reason, topic.reason_code);
  const finding = validateFindingBinding(queueItem, currentFacts);
  if (!finding.ok) return rejected(finding.reason, finding.reason_code);

  const normalizedQueueItem = topic.topic_binding
    ? { ...queueItem, payload: { ...(queueItem.payload || {}), ...topic.topic_binding } }
    : queueItem;
  try {
    const kindContract = kindContractForQueueItem(normalizedQueueItem, kind);
    const outputContract = resolveWorkUnitAssignmentContract({
      assignmentContractVersion: currentFacts.assignmentContractVersion || WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
      kind,
      queueItem: normalizedQueueItem,
      topicBinding: topic.topic_binding,
      baseOutputContract: kindContract.output_contract,
    });
    return {
      ok: true,
      applicable: true,
      kind,
      queue_item: normalizedQueueItem,
      topic_binding: topic.topic_binding,
      kind_contract: kindContract,
      assignment_contract: {
        assignment_contract_version: currentFacts.assignmentContractVersion || WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
        output_contract: outputContract,
      },
      ...(kind === 'wave0_source_intake' ? {
        wave0_source_target: sourceTargetFromOutputContract(outputContract),
      } : {}),
    };
  } catch (error) {
    const assignmentContractFeedback = assignmentContractFeedbackFromError(error);
    return rejected(
      `assignment contract rejected: ${error.message}`,
      'assignment_contract_rejected',
      assignmentContractFeedback ? { assignment_contract_feedback: assignmentContractFeedback } : {},
    );
  }
}

/** Evaluate one demand against supplied facts, including ephemeral Wave0 target ownership. */
export function evaluateQueueDemandAdmission({ queueItem, currentFacts = {} } = {}) {
  const admission = evaluateBaseQueueDemandAdmission({ queueItem, currentFacts });
  if (!admission.ok || admission.kind !== 'wave0_source_intake') return admission;

  const candidate = Wave0TargetCandidateSchema.parse({
    queue_item_id: admission.queue_item.queue_item_id,
    target: admission.wave0_source_target,
  });
  const owners = z.array(Wave0TargetOwnerSchema).parse(currentFacts.wave0TargetOwners || []);
  const owner = owners.find((item) => (
    item.target === candidate.target
      && !(item.owner_kind === 'queued' && item.queue_item_id === currentFacts.excludeWave0QueueItemId)
  ));
  if (!owner) return admission;

  const conflict = Wave0TargetConflictSchema.parse({
    candidate,
    owner,
    reason_code: 'wave0_source_target_conflict',
    repair_kind: 'agent_action',
    rerun: currentFacts.targetConflictRerun || 'Rerun the same admission checkpoint from fresh current facts.',
  });
  const ownerIdentity = owner.work_id
    ? `${owner.queue_item_id}/${owner.work_id}`
    : owner.queue_item_id;
  return rejected(
    `Wave0 source target '${candidate.target}' is already owned by ${owner.owner_kind} '${ownerIdentity}'`,
    conflict.reason_code,
    {
      source_target: candidate.target,
      candidate_queue_item_id: candidate.queue_item_id,
      owner_kind: owner.owner_kind,
      owner_queue_item_id: owner.queue_item_id,
      ...(owner.work_id ? { owner_work_id: owner.work_id } : {}),
      repair_kind: conflict.repair_kind,
      rerun: conflict.rerun,
      target_conflict: conflict,
    },
  );
}

function readCanonicalTopicRegistry(bundleDir) {
  const planPath = path.join(bundleDir, 'rb_plan.md');
  if (!existsSync(planPath)) return null;
  try {
    const match = readFileSync(planPath, 'utf8').match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const parsed = CanonicalPlanSchema.safeParse(parseYaml(match[1]));
    return parsed.success ? parsed.data.topic_registry : null;
  } catch {
    return null;
  }
}

function readFindingIndex(bundleDir) {
  const indexPath = path.join(bundleDir, 'artifacts', 'wave2', 'finding-index.yaml');
  if (!existsSync(indexPath)) return null;
  try {
    return parseYaml(readFileSync(indexPath, 'utf8'));
  } catch {
    return null;
  }
}

function coreCurrentFacts(bundleDir) {
  return {
    topicRegistry: readCanonicalTopicRegistry(bundleDir),
    topicState: inspectCanonicalTopicState({ bundlePath: bundleDir }),
    findingIndex: readFindingIndex(bundleDir),
    assignmentContractVersion: WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
  };
}

function assertInFlightBinding(entry, record) {
  if (!record) throw new Error(`queue in-flight work_id ${entry.work_id} is missing from the work-unit index`);
  if (record.status !== 'claimed') throw new Error(`queue in-flight work_id ${entry.work_id} has non-claimed index status ${record.status}`);
  for (const field of ['work_id', 'queue_item_id', 'wave', 'kind', 'batch_id', 'attempt_index', 'queue_item_snapshot_hash']) {
    if (entry[field] !== record[field]) throw new Error(`queue/index in-flight binding mismatch for ${entry.work_id}: ${field}`);
  }
}

function deriveWave0TargetOwners(bundleDir, queue, currentFacts) {
  const ownersByTarget = new Map();
  const inFlight = Object.values(queue.delegated_in_flight || {})
    .filter((entry) => entry.kind === 'wave0_source_intake');
  if (inFlight.length > 0) {
    const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
    for (const entry of inFlight) {
      const record = index.work_units[entry.work_id];
      assertInFlightBinding(entry, record);
      const manifest = readAndValidateManifest(bundleDir, index, record);
      const target = sourceTargetFromOutputContract(manifest.output_contract);
      const owner = Wave0TargetOwnerSchema.parse({
        owner_kind: 'in_flight',
        queue_item_id: entry.queue_item_id,
        work_id: entry.work_id,
        target,
      });
      const existing = ownersByTarget.get(target);
      if (existing && existing.work_id !== owner.work_id) {
        throw new Error(`multiple delegated in-flight Wave0 owners exist for source target '${target}'`);
      }
      ownersByTarget.set(target, owner);
    }
  }

  for (const item of [...queue.active_window, ...queue.refill_pool]) {
    if (item.kind !== 'wave0_source_intake' || !isDelegatedWorkUnitDemand(item)) continue;
    const admission = evaluateBaseQueueDemandAdmission({ queueItem: item, currentFacts });
    if (!admission.ok || ownersByTarget.has(admission.wave0_source_target)) continue;
    ownersByTarget.set(admission.wave0_source_target, Wave0TargetOwnerSchema.parse({
      owner_kind: 'queued',
      queue_item_id: admission.queue_item.queue_item_id,
      target: admission.wave0_source_target,
    }));
  }
  return [...ownersByTarget.values()];
}

/** Read current bundle authority, then delegate all verdict logic to the pure evaluator. */
export function admitQueueDemand({
  bundleDir,
  queueItem,
  queue = null,
  excludeWave0QueueItemId = null,
  targetConflictRerun = null,
} = {}) {
  const currentFacts = coreCurrentFacts(bundleDir);
  const preliminary = evaluateBaseQueueDemandAdmission({ queueItem, currentFacts });
  if (!preliminary.ok || preliminary.kind !== 'wave0_source_intake') return preliminary;
  const queueView = queue || loadQueueReadOnly(bundleDir);
  return evaluateQueueDemandAdmission({
    queueItem,
    currentFacts: {
      ...currentFacts,
      wave0TargetOwners: deriveWave0TargetOwners(bundleDir, queueView, currentFacts),
      excludeWave0QueueItemId,
      targetConflictRerun: targetConflictRerun || 'Rerun the same admission checkpoint from fresh current facts.',
    },
  });
}
