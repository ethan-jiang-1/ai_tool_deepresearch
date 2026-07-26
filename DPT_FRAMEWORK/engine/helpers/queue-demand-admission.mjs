// @impl QIV-001, QIV-004, DEW-003
// Current-facts admission for unclaimed delegated queue demand. This module never mutates bundle state.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION } from '../../schema/contracts/work-unit.mjs';
import { CanonicalPlanSchema } from '../../schema/contracts/plan.mjs';
import { DEFAULT_KIND_REGISTRY } from '../work-unit-constants.mjs';
import { kindContractForQueueItem } from '../work-unit-utils.mjs';
import { resolveWorkUnitAssignmentContract } from '../work-unit-assignment-contract.mjs';
import { inspectCanonicalTopicState } from './canonical-topic-state.mjs';
import { evaluateTopicLayouts, resolveTopicLayout } from './topic-layout.mjs';

const SUPPORTED_KINDS = new Set(Object.keys(DEFAULT_KIND_REGISTRY.kinds));

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
export function evaluateQueueDemandAdmission({ queueItem, currentFacts = {} } = {}) {
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
    };
  } catch (error) {
    return rejected(`assignment contract rejected: ${error.message}`, 'assignment_contract_rejected');
  }
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

/** Read current bundle authority, then delegate all verdict logic to the pure evaluator. */
export function admitQueueDemand({ bundleDir, queueItem } = {}) {
  return evaluateQueueDemandAdmission({
    queueItem,
    currentFacts: {
      topicRegistry: readCanonicalTopicRegistry(bundleDir),
      topicState: inspectCanonicalTopicState({ bundlePath: bundleDir }),
      findingIndex: readFindingIndex(bundleDir),
      assignmentContractVersion: WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
    },
  });
}
