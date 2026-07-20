// @impl DEW-002, DEW-003, DEW-004, DEW-014, EXO-001, SWE-006
// Work-unit lifecycle: create, parse phase, eligibility, claim, close, batch open.

import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { parse as parseYaml } from 'yaml';

import {
  WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
  WORK_UNIT_MANIFEST_SCHEMA_VERSION,
  WorkUnitManifestSchema,
  WorkUnitStatusFileSchema,
} from '../schema/contracts/work-unit.mjs';
import { evaluateActorDecision } from './work-unit-actor.mjs';
import {
  now,
  clone,
  writeJson,
  traceWorkUnitEvent,
  kindContractForQueueItem,
  hashValue,
} from './work-unit-utils.mjs';
import {
  allocateWorkId,
  validateWorkIdBinding,
  computeStatusCounts,
  loadWorkUnitIndex,
  createEmptyWorkUnitIndex,
  saveWorkUnitIndex,
  requireWorkUnitRecord,
  withWorkUnitTransaction,
  waveKey,
  batchId,
  workUnitIndexPath,
} from './work-unit-index.mjs';
import {
  refsForWorkUnit,
  writeWorkUnitEnvelope,
  spawnPromptForWorkUnit,
} from './work-unit-envelope.mjs';
import {
  readAndValidateManifest,
} from './work-unit-validation.mjs';
import {
  timeoutPreflightWorkUnit,
} from './work-unit-timeout-preflight.mjs';
import { continuationForClaimedWork } from './helpers/continuation-cue.mjs';

import { queueItemSnapshotHash } from './queue-manager-core.mjs';
import { loadQueue, loadQueueReadOnly, saveQueue } from './queue-manager-lifecycle.mjs';
import { preempt, refill } from './queue-manager-window.mjs';
import { logToRun } from './logger.mjs';
import { CanonicalPlanSchema } from '../schema/contracts/plan.mjs';
import { resolveWorkUnitAssignmentContract } from './work-unit-assignment-contract.mjs';

function readProfileRerunCount(bundleDir) {
  try {
    const profilePath = path.join(bundleDir, 'rb_profile.yaml');
    if (!existsSync(profilePath)) return 0;
    const raw = readFileSync(profilePath, 'utf8');
    const profile = parseYaml(raw);
    return profile?.human_decision_checkpoints?.hitl2?.rerun_count ?? 0;
  } catch { return 0; }
}

function createWorkUnitInIndex(bundleDir, index, {
  queueItem,
  wave,
  kind = queueItem.kind,
  timeout_ms,
  creation_reason = 'claim',
  batchReason = 'initial_phase_drain',
  runtime_refs = {},
  actor_execution,
  assignment_contract,
} = {}) {
  if (!queueItem?.queue_item_id) throw new Error('queueItem.queue_item_id is required');
  if (!kind) throw new Error('work-unit kind is required');
  const timeoutMs = timeout_ms || queueItem.targets?.delegates?.timeout_ms || 600000;
  const allocation = allocateWorkId(index, {
    wave,
    kind,
    queue_item_id: queueItem.queue_item_id,
    batchReason,
  });
  const claimedAt = now();
  const deadlineAt = new Date(Date.parse(claimedAt) + timeoutMs).toISOString();
  const { refs } = refsForWorkUnit(bundleDir, allocation);
  const receiptNonce = `wu-${randomUUID()}`;
  const kindContract = kindContractForQueueItem(queueItem, kind);
  const outputContract = assignment_contract?.output_contract || kindContract.output_contract;
  const assignmentContractVersion = assignment_contract?.assignment_contract_version;
  const manifest = WorkUnitManifestSchema.parse({
    schema_version: WORK_UNIT_MANIFEST_SCHEMA_VERSION,
    ...allocation,
    task_brief: kindContract.task_brief,
    queue_item_id: queueItem.queue_item_id,
    producer_rule: queueItem.producer_rule,
    creation_reason,
    queue_item_snapshot_hash: queueItemSnapshotHash(queueItem),
    receipt_nonce: receiptNonce,
    claimed_at: claimedAt,
    timeout_ms: timeoutMs,
    deadline_at: deadlineAt,
    ...(assignmentContractVersion ? { assignment_contract_version: assignmentContractVersion } : {}),
    output_contract: outputContract,
    cache_policy: kindContract.cache_policy,
    runtime_refs,
    ...(actor_execution ? {
      actor_contract_version: 'work-unit.actor.v1',
      actor_execution,
    } : {}),
    paths: refs,
    queue_item: clone(queueItem),
  });
  validateWorkIdBinding({ ...manifest, kindRegistry: index.kind_registry });
  writeWorkUnitEnvelope(bundleDir, manifest);
  const record = {
    work_id: manifest.work_id,
    queue_item_id: manifest.queue_item_id,
    wave: manifest.wave,
    batch_id: manifest.batch_id,
    batch_index: manifest.batch_index,
    claim_index: manifest.claim_index,
    attempt_index: manifest.attempt_index,
    rerun_count: readProfileRerunCount(bundleDir),
    kind: manifest.kind,
    kind_code: manifest.kind_code,
    status: 'claimed',
    producer_rule: manifest.producer_rule,
    creation_reason: manifest.creation_reason,
    queue_item_snapshot_hash: manifest.queue_item_snapshot_hash,
    receipt_nonce: manifest.receipt_nonce,
    claimed_at: manifest.claimed_at,
    timeout_ms: manifest.timeout_ms,
    deadline_at: manifest.deadline_at,
    ...(manifest.assignment_contract_version ? { assignment_contract_version: manifest.assignment_contract_version } : {}),
    runtime_refs: manifest.runtime_refs,
    actor_contract_version: manifest.actor_contract_version,
    actor_execution: manifest.actor_execution,
    paths: manifest.paths,
  };
  index.work_units[record.work_id] = record;
  return { record, manifest };
}

function claimCommandArg(value) {
  const text = String(value);
  return /^[A-Za-z0-9_./:-]+$/.test(text) ? text : JSON.stringify(text);
}

function actorClaimRepair({ bundleDir, phase, requestedCount, decision, actorPolicy }) {
  const reasonCode = decision.reason || 'actor_preflight_rejected';
  const observation = decision.observation || {};
  let repairKind = 'agent_action';
  let executionActorClass = decision.execution_actor_class;
  let missingFact = `Actor preflight rejected claim: ${reasonCode}.`;

  if (reasonCode === 'fallback_unnecessary') {
    repairKind = 'engine_operation';
    executionActorClass = 'delegated_subagent';
    missingFact = `Role '${observation.role_key}' was observed available, so phase_agent_fallback is unnecessary.`;
  } else if (decision.verdict === 'no_claim' && observation.outcome === 'unavailable' && actorPolicy?.phase_agent_fallback === 'allowed') {
    repairKind = 'engine_operation';
    executionActorClass = 'phase_agent_fallback';
    missingFact = `Role '${observation.role_key}' is unavailable (${reasonCode}); this kind permits one explicit Phase Agent fallback claim.`;
  } else if (reasonCode === 'kind_actor_policy_mismatch') {
    repairKind = 'missing_contract';
    missingFact = `Queue kind actor policy does not bind the planned delegated role '${observation.role_key}'.`;
  } else if (reasonCode === 'phase_agent_fallback_prohibited') {
    repairKind = 'external_action';
    executionActorClass = 'delegated_subagent';
    missingFact = `Role '${observation.role_key}' is unavailable and the active kind prohibits Phase Agent fallback.`;
  } else if (observation.outcome === 'unknown') {
    repairKind = 'agent_action';
    missingFact = `A current role-bound actor observation is required for '${observation.role_key}' before claim; observed ${reasonCode}.`;
  }

  const rerunObservation = observation.outcome === 'unknown'
    ? {
      outcome: '<available|unavailable>',
      source: 'native_probe',
      role_key: observation.role_key,
      reason_code: '<probe-reason>',
    }
    : observation;
  const rerun = [
    'node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim',
    claimCommandArg(path.resolve(bundleDir)),
    '--phase', claimCommandArg(phase),
    '--count', claimCommandArg(requestedCount),
    '--actor-outcome', claimCommandArg(rerunObservation.outcome),
    '--actor-source', claimCommandArg(rerunObservation.source),
    '--actor-role-key', claimCommandArg(rerunObservation.role_key),
    '--actor-reason', claimCommandArg(rerunObservation.reason_code),
    '--execution-actor', claimCommandArg(executionActorClass),
  ].join(' ');
  return {
    reason_code: reasonCode,
    repair_kind: repairKind,
    missing_fact: missingFact,
    write_to: `operate-work-unit claim arguments for role '${observation.role_key}': actor observation and execution actor class`,
    rerun,
  };
}

export function createWorkUnit(bundleDir, options = {}) {
  let assignmentContract = options.assignment_contract;
  if (!assignmentContract && options.queueItem) {
    const kind = options.kind || options.queueItem.kind;
    const receipts = options.queueItem.required_receipts;
    const hasCurrentAssignmentFacts = (kind === 'wave0_source_intake' && receipts?.some((receipt) => receipt.startsWith('file:')))
      || (kind === 'wave1_topic_deepening' && Object.hasOwn(options.queueItem.payload || {}, 'assignment_mode'))
      || (kind === 'wave2_targeted_evidence' && Array.isArray(receipts) && receipts.length === 0);
    if (hasCurrentAssignmentFacts) {
      const kindContract = kindContractForQueueItem(options.queueItem, kind);
      assignmentContract = {
        assignment_contract_version: WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
        output_contract: resolveWorkUnitAssignmentContract({
          assignmentContractVersion: WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
          kind,
          queueItem: options.queueItem,
          topicBinding: {
            topic_uid: options.queueItem.payload?.topic_uid,
            topic_slug: options.queueItem.payload?.topic_slug,
          },
          baseOutputContract: kindContract.output_contract,
        }),
      };
    }
  }
  return withWorkUnitTransaction(bundleDir, 'create_work_unit', () => {
    const index = loadWorkUnitIndex(bundleDir, { createIfMissing: true });
    const { record, manifest } = createWorkUnitInIndex(bundleDir, index, {
      ...options,
      assignment_contract: assignmentContract,
    });
    const saved = saveWorkUnitIndex(bundleDir, index);
    return { index: saved, record: saved.work_units[record.work_id], manifest, spawn_prompt: spawnPromptForWorkUnit(manifest, bundleDir) };
  });
}

export function parsePhase(phase) {
  const match = String(phase || '').match(/^wave(?<wave>[0-9]+)$/);
  if (!match?.groups) throw new Error(`--phase must be waveN, got '${phase}'`);
  return Number.parseInt(match.groups.wave, 10);
}

export function defaultKindForWave(wave) {
  if (wave === 0) return 'wave0_source_intake';
  if (wave === 1) return 'wave1_topic_deepening';
  if (wave === 2) return 'wave2_targeted_evidence';
  return null;
}

export function itemWave(item) {
  if (Number.isInteger(item.payload?.wave)) return item.payload.wave;
  if (Number.isInteger(item.lineage?.wave)) return item.lineage.wave;
  if (typeof item.kind === 'string') {
    const match = item.kind.match(/^wave(?<wave>[0-9]+)_/);
    if (match?.groups) return Number.parseInt(match.groups.wave, 10);
  }
  return null;
}

export function isEligibleDelegatedItem(item, wave) {
  if (!item || item.targets?.delegates?.to !== 'sub-agent') return false;
  const waveFromItem = itemWave(item);
  return waveFromItem === null || waveFromItem === wave;
}

export function countUnclaimedDelegated(queue, wave) {
  return [...queue.active_window, ...queue.refill_pool]
    .filter((item) => isEligibleDelegatedItem(item, wave)).length;
}

export function phaseInFlight(queue, wave) {
  return Object.values(queue.delegated_in_flight || {})
    .filter((entry) => entry.wave === wave);
}

export function openWorkUnitBatch(bundleDir, { phase, reason, lineage = {} } = {}) {
  const wave = parsePhase(phase);
  if (!reason) throw new Error('--reason is required');
  return withWorkUnitTransaction(bundleDir, 'open_work_unit_batch', ({ tx_id }) => {
    const index = loadWorkUnitIndex(bundleDir, { createIfMissing: true });
    const key = waveKey(wave);
    if (!index.waves[key]) index.waves[key] = { current_batch_index: 0, batches: {} };
    const waveState = index.waves[key];
    const nextIndex = Math.max(1, waveState.current_batch_index + 1);
    waveState.current_batch_index = nextIndex;
    const id = batchId(nextIndex);
    waveState.batches[id] = {
      batch_index: nextIndex,
      batch_reason: reason,
      next_claim_index: 1,
      opened_at: now(),
      lineage: {
        prior_work_unit_count: Object.values(index.work_units || {}).filter((record) => record.wave === wave).length,
        prior_status_counts: computeStatusCounts(Object.fromEntries(
          Object.entries(index.work_units || {}).filter(([, record]) => record.wave === wave),
        )),
        ...lineage,
      },
    };
    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    traceWorkUnitEvent(bundleDir, 'work_unit_batch_opened', {
      tx_id,
      phase,
      wave,
      batch_id: id,
      batch_reason: reason,
    });
    logToRun(bundleDir, 'info', 'work_unit_batch_opened', {
      kind: 'work_unit_batch',
      tx_id,
      phase,
      batch_id: id,
      batch_reason: reason,
    });
    return { ok: true, phase, wave, batch_id: id, batch_reason: reason, index: savedIndex };
  });
}

function previewClaimCandidates(queue, wave, requestedCount, executionActorClass) {
  const first = queue.active_window[0];
  if (!first || !isEligibleDelegatedItem(first, wave)) {
    return { candidates: [], blocked_by_queue_item_id: first?.queue_item_id || null };
  }
  const effectiveCount = executionActorClass === 'phase_agent_fallback' ? 1 : requestedCount;
  const plannedRoleKey = first.targets?.delegates?.role_key || null;
  const candidates = [];
  let blockedBy = null;
  for (let index = 0; index < effectiveCount; index += 1) {
    const item = queue.active_window[index];
    if (!item || !isEligibleDelegatedItem(item, wave)) {
      blockedBy = item?.queue_item_id || null;
      break;
    }
    const roleKey = item.targets?.delegates?.role_key || null;
    if (roleKey !== plannedRoleKey) {
      blockedBy = item.queue_item_id;
      break;
    }
    const kind = item.kind || defaultKindForWave(wave);
    const actorPolicy = kindContractForQueueItem(item, kind).actor_policy;
    candidates.push({ item, kind, role_key: roleKey, actor_policy: actorPolicy });
    if (!kind || !actorPolicy || actorPolicy.delegated_role_key !== roleKey) break;
  }
  return { candidates, planned_role_key: plannedRoleKey, blocked_by_queue_item_id: blockedBy };
}

function topicBindingForClaim(bundleDir, queueItem, kind) {
  if (kind === 'wave2_targeted_evidence') {
    return {
      topic_uid: queueItem.payload?.topic_uid,
      topic_slug: queueItem.payload?.topic_slug,
    };
  }
  const topicUid = queueItem.payload?.topic_uid;
  const topicSlug = queueItem.payload?.topic_slug;
  if (!topicUid || !topicSlug) throw new Error('current assignment requires explicit payload topic_uid and topic_slug');

  const planPath = path.join(bundleDir, 'rb_plan.md');
  if (existsSync(planPath)) {
    const raw = readFileSync(planPath, 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) throw new Error('canonical Topic binding cannot be read from rb_plan.md');
    const plan = CanonicalPlanSchema.parse(parseYaml(match[1]));
    const topic = plan.topic_registry.find((entry) => entry.topic_uid === topicUid);
    if (!topic || topic.slug !== topicSlug) {
      throw new Error(`queue item Topic ${topicUid}/${topicSlug} is not the current canonical UID/slug binding`);
    }
  }
  return { topic_uid: topicUid, topic_slug: topicSlug };
}

function preflightClaimAssignments(bundleDir, candidates) {
  return candidates.map((candidate) => {
    const queueItem = candidate.item;
    try {
      const kindContract = kindContractForQueueItem(queueItem, candidate.kind);
      const outputContract = resolveWorkUnitAssignmentContract({
        assignmentContractVersion: WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
        kind: candidate.kind,
        queueItem,
        topicBinding: topicBindingForClaim(bundleDir, queueItem, candidate.kind),
        baseOutputContract: kindContract.output_contract,
      });
      return {
        ...candidate,
        queue_item_id: queueItem.queue_item_id,
        queue_item_snapshot_hash: queueItemSnapshotHash(queueItem),
        queue_item_full_hash: hashValue(queueItem),
        assignment_contract: {
          assignment_contract_version: WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
          output_contract: outputContract,
        },
      };
    } catch (error) {
      throw new Error(`assignment preflight failed for queue item ${queueItem.queue_item_id}: ${error.message}`);
    }
  });
}

function loadIndexView(bundleDir) {
  return existsSync(workUnitIndexPath(bundleDir))
    ? loadWorkUnitIndex(bundleDir)
    : createEmptyWorkUnitIndex();
}

function recheckClaimPlan(bundleDir, plans, { existed: expectedIndexExisted, hash: expectedIndexHash }) {
  const assignmentView = loadQueueReadOnly(bundleDir);
  const assignmentCandidates = plans.map((plan, index) => ({
    ...plan,
    item: assignmentView.active_window[index],
  }));
  preflightClaimAssignments(bundleDir, assignmentCandidates);

  const queue = loadQueueReadOnly(bundleDir);
  for (let index = 0; index < plans.length; index += 1) {
    const current = queue.active_window[index];
    const plan = plans[index];
    if (!current || current.queue_item_id !== plan.queue_item_id) {
      throw new Error(`planned queue prefix identity drift at ${plan.queue_item_id}`);
    }
    if (queueItemSnapshotHash(current) !== plan.queue_item_snapshot_hash) {
      throw new Error(`planned queue snapshot drift at ${plan.queue_item_id}`);
    }
    if (hashValue(current) !== plan.queue_item_full_hash) {
      throw new Error(`planned queue prefix drift at ${plan.queue_item_id}`);
    }
  }
  const indexExists = existsSync(workUnitIndexPath(bundleDir));
  if (indexExists !== expectedIndexExisted) throw new Error('planned work-unit index presence drift before claim mutation');
  const index = loadIndexView(bundleDir);
  if (indexExists && hashValue(index) !== expectedIndexHash) {
    throw new Error('planned work-unit index snapshot drift before claim mutation');
  }
  return { queue, index };
}

export function claimWorkUnits(bundleDir, {
  phase,
  count = 1,
  batchReason = 'initial_phase_drain',
  actorObservation = null,
  executionActorClass = 'delegated_subagent',
} = {}) {
  const wave = parsePhase(phase);
  const requestedCount = Number.parseInt(String(count), 10);
  if (!Number.isInteger(requestedCount) || requestedCount < 1) throw new Error('--count must be a positive integer');

  const previewQueue = loadQueueReadOnly(bundleDir);
  const preview = previewClaimCandidates(previewQueue, wave, requestedCount, executionActorClass);
  const previewFront = previewQueue.active_window[0];
  if (preview.candidates.length === 0) {
    const blockedBy = previewFront && !isEligibleDelegatedItem(previewFront, wave) ? previewFront.queue_item_id : null;
    return {
      ok: false,
      requested_count: requestedCount,
      claimed_count: 0,
      claimed_work_ids: [],
      in_flight_count: phaseInFlight(previewQueue, wave).length,
      unclaimed_delegated_count: countUnclaimedDelegated(previewQueue, wave),
      blocked_by_queue_item_id: blockedBy,
      phase_drained: countUnclaimedDelegated(previewQueue, wave) === 0 && phaseInFlight(previewQueue, wave).length === 0,
      prompt_refs: [],
      queue: previewQueue,
    };
  }

  const assignmentPlans = preflightClaimAssignments(bundleDir, preview.candidates);
  const previewIndexExisted = existsSync(workUnitIndexPath(bundleDir));
  const previewIndex = loadIndexView(bundleDir);
  const previewIndexPlan = {
    existed: previewIndexExisted,
    hash: previewIndexExisted ? hashValue(previewIndex) : null,
  };

  const decision = evaluateActorDecision({
    observation: actorObservation,
    executionActorClass,
    plannedRoleKey: preview.planned_role_key,
    actorPolicy: assignmentPlans[0].actor_policy,
  });
  const actorPreflight = {
    verdict: decision.verdict,
    reason: decision.reason,
    planned_role_key: preview.planned_role_key,
    requested_execution_actor_class: decision.execution_actor_class,
    observation: decision.observation,
    recommended_action: decision.recommended_action,
  };
  if (decision.verdict !== 'allow_claim') {
    if (decision.verdict === 'no_claim') {
      traceWorkUnitEvent(bundleDir, 'work_unit_claim_rejected', {
        phase,
        requested_count: requestedCount,
        claimed_count: 0,
        actor_preflight: actorPreflight,
      });
      logToRun(bundleDir, 'warn', 'work_unit_claim_rejected', {
        kind: 'queue_claim',
        phase,
        requested_count: requestedCount,
        claimed_count: 0,
        actor_preflight: actorPreflight,
      });
    }
    const repair = actorClaimRepair({
      bundleDir,
      phase,
      requestedCount,
      decision,
      actorPolicy: assignmentPlans[0].actor_policy,
    });
    return {
      ok: false,
      requested_count: requestedCount,
      claimed_count: 0,
      claimed_work_ids: [],
      in_flight_count: phaseInFlight(previewQueue, wave).length,
      unclaimed_delegated_count: countUnclaimedDelegated(previewQueue, wave),
      blocked_by_queue_item_id: preview.blocked_by_queue_item_id,
      phase_drained: false,
      prompt_refs: [],
      actor_preflight: actorPreflight,
      recommended_action: decision.recommended_action,
      ...repair,
      queue: previewQueue,
    };
  }
  const actorExecution = {
    execution_actor_class: decision.execution_actor_class,
    delegated_role_key: preview.planned_role_key,
    observation: { ...decision.observation, recorded_at: now() },
    policy_decision: decision.policy_decision,
    fallback_from: decision.fallback_from,
  };
  const effectiveCount = decision.execution_actor_class === 'phase_agent_fallback' ? 1 : assignmentPlans.length;
  const effectivePlans = assignmentPlans.slice(0, effectiveCount);

  return withWorkUnitTransaction(bundleDir, 'claim_work_units', ({ tx_id }) => {
    let { queue, index } = recheckClaimPlan(bundleDir, effectivePlans, previewIndexPlan);
    const claimed = [];
    let blockedBy = preview.blocked_by_queue_item_id;

    for (let i = 0; i < effectiveCount; i += 1) {
      const front = queue.active_window[0];
      if (!front) break;
      if (!isEligibleDelegatedItem(front, wave)) {
        blockedBy = front.queue_item_id;
        break;
      }
      const plan = effectivePlans[i];
      const kind = front.kind || defaultKindForWave(wave);
      if (!kind) {
        blockedBy = front.queue_item_id;
        break;
      }
      if (queue.delegated_in_flight[front.queue_item_id]) {
        throw new Error(`queue_item_id ${front.queue_item_id} is already delegated in flight`);
      }

      queue.active_window.shift();
      const { record, manifest } = createWorkUnitInIndex(bundleDir, index, {
        queueItem: front,
        wave,
        kind,
        creation_reason: 'claim',
        batchReason,
        actor_execution: actorExecution,
        assignment_contract: plan.assignment_contract,
      });
      queue.delegated_in_flight[front.queue_item_id] = {
        queue_item_id: front.queue_item_id,
        work_id: record.work_id,
        wave: record.wave,
        batch_id: record.batch_id,
        kind: record.kind,
        attempt_index: record.attempt_index,
        queue_item_snapshot_hash: record.queue_item_snapshot_hash,
        claimed_at: record.claimed_at,
        timeout_ms: record.timeout_ms,
        deadline_at: record.deadline_at,
      };
      claimed.push({ record, manifest });
      const claimEvent = record.attempt_index > 1 ? 'work_unit_retry_claimed' : 'work_unit_claimed';
      traceWorkUnitEvent(bundleDir, claimEvent, {
        tx_id,
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        wave: record.wave,
        kind: record.kind,
        receipt_nonce: record.receipt_nonce,
        attempt_index: record.attempt_index,
        actor_contract_version: record.actor_contract_version,
        actor_execution: record.actor_execution,
      });
      logToRun(bundleDir, 'info', claimEvent, {
        kind: 'queue_claim',
        tx_id,
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        wave: record.wave,
        work_unit_kind: record.kind,
        attempt_index: record.attempt_index,
        execution_actor_class: record.actor_execution.execution_actor_class,
      });
    }

    queue = refill(queue);
    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    const savedQueue = saveQueue(bundleDir, queue);
    const inFlight = phaseInFlight(savedQueue, wave);
    const unclaimedDelegated = countUnclaimedDelegated(savedQueue, wave);
    const response = {
      ok: claimed.length > 0,
      requested_count: requestedCount,
      claimed_count: claimed.length,
      claimed_work_ids: claimed.map(({ record }) => record.work_id),
      in_flight_count: inFlight.length,
      unclaimed_delegated_count: unclaimedDelegated,
      blocked_by_queue_item_id: blockedBy,
      phase_drained: unclaimedDelegated === 0 && inFlight.length === 0,
      prompt_refs: claimed.map(({ record, manifest }) => ({
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        bundle_dir: path.resolve(bundleDir),
        task_ref: manifest.paths.task_ref,
        task_path: path.join(path.resolve(bundleDir), manifest.paths.task_ref),
        beacon_ref: manifest.paths.beacon_ref,
        beacon_path: path.join(path.resolve(bundleDir), manifest.paths.beacon_ref),
        result_schema_ref: manifest.paths.result_schema_ref,
        result_schema_path: path.join(path.resolve(bundleDir), manifest.paths.result_schema_ref),
        runtime_receipt_ref: manifest.paths.runtime_receipt_ref,
        runtime_receipt_path: path.join(path.resolve(bundleDir), manifest.paths.runtime_receipt_ref),
        result_path: path.join(path.resolve(bundleDir), manifest.paths.result_ref),
        spawn_prompt: spawnPromptForWorkUnit(manifest, bundleDir),
        actor_contract_version: record.actor_contract_version,
        actor_execution: record.actor_execution,
      })),
      actor_preflight: { ...actorPreflight, verdict: 'allow_claim' },
      recommended_action: decision.recommended_action,
    };
    const continuation = continuationForClaimedWork({ claimedWorkIds: response.claimed_work_ids });
    if (continuation) response.continuation = continuation;
    traceWorkUnitEvent(bundleDir, claimed.length > 0 ? 'work_unit_batch_claimed' : 'work_unit_claim_rejected', {
      tx_id,
      requested_count: requestedCount,
      claimed_count: claimed.length,
      blocked_by_queue_item_id: blockedBy,
      phase: `wave${wave}`,
      actor_preflight: response.actor_preflight,
    });
    return { ...response, queue: savedQueue, index: savedIndex };
  });
}

function statusToEvent(status) {
  if (status === 'failed') return 'work_unit_failed';
  if (status === 'timed_out') return 'work_unit_timed_out';
  if (status === 'abandoned') return 'work_unit_abandoned';
  return 'work_unit_terminal';
}

function statusToQueueTerminal(status) {
  if (status === 'failed') return 'failed';
  if (status === 'abandoned') return 'cancelled';
  return 'blocked';
}

export function closeWorkUnitAttempt(bundleDir, { work_id, status, reason, force = false, nowMs = Date.now() } = {}) {
  if (!['failed', 'timed_out', 'abandoned'].includes(status)) throw new Error(`unsupported terminal status: ${status}`);
  if (!reason) throw new Error('--reason is required');

  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  if (record.status === status && record.terminal_reason === reason) {
    return { ok: true, duplicate: true, work_id: record.work_id, queue_item_id: record.queue_item_id, status: record.status, reason };
  }
  if (record.status === 'submitted') {
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      inspect: [`work_id ${record.work_id} is already submitted`],
      advice: 'Submitted attempts cannot be terminalized.',
    };
  }
  if (record.status !== 'claimed') {
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      inspect: [`work_id ${record.work_id} is already ${record.status}`],
      advice: 'A terminal attempt can only be repeated idempotently with the same status and reason.',
    };
  }

  const timeoutPreflight = status === 'timed_out'
    ? timeoutPreflightWorkUnit(bundleDir, { work_id: record.work_id, nowMs })
    : null;
  if (status === 'timed_out' && !force && !timeoutPreflight.timeout_eligible) {
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      timeout_preflight: timeoutPreflight,
      recommended_action: timeoutPreflight.recommended_action,
      progress: timeoutPreflight.progress,
      inspect: timeoutPreflight.inspect,
      advice: timeoutPreflight.advice,
    };
  }

  const manifest = readAndValidateManifest(bundleDir, index, record);
  return withWorkUnitTransaction(bundleDir, `work_unit_${status}`, ({ tx_id }) => {
    let queue = loadQueue(bundleDir);
    const inFlight = queue.delegated_in_flight?.[record.queue_item_id];
    if (!inFlight || inFlight.work_id !== record.work_id) {
      throw new Error(`queue in-flight binding missing for ${record.work_id}`);
    }
    delete queue.delegated_in_flight[record.queue_item_id];

    const closedAt = now();
    record.status = status;
    record.terminal_reason = reason;
    record.terminal_at = closedAt;
    index.work_units[record.work_id] = record;
    writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitStatusFileSchema.parse({
      work_id: record.work_id,
      status,
      updated_at: closedAt,
    }));

    const actorSpawnUnavailable = status === 'failed' && reason.startsWith('actor_spawn_unavailable:');
    if (status === 'timed_out' || actorSpawnUnavailable) {
      const retryItem = {
        ...manifest.queue_item,
        status: 'queued',
        updated_at: closedAt,
        lineage: {
          ...(manifest.queue_item.lineage || {}),
          retry_of_work_id: record.work_id,
          retry_reason: reason,
          attempt_index: record.attempt_index + 1,
        },
      };
      queue = preempt(queue, retryItem, { reason: actorSpawnUnavailable ? 'work_unit_actor_spawn_retry' : 'work_unit_timeout_retry' });
    } else {
      queue.terminal_history.push({
        queue_item_id: record.queue_item_id,
        terminal_status: statusToQueueTerminal(status),
        completed_at: closedAt,
        work_id: record.work_id,
        reason,
        item: manifest.queue_item,
      });
      queue = refill(queue);
    }

    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    const savedQueue = saveQueue(bundleDir, queue);
    const event = statusToEvent(status);
    const forcedTimeoutAudit = status === 'timed_out' && force ? {
      forced_timeout: true,
      force_reason: reason,
      preflight_timeout_eligible: Boolean(timeoutPreflight?.timeout_eligible),
      preflight_recommended_action: timeoutPreflight?.recommended_action || null,
      default_timeout_would_refuse: !timeoutPreflight?.timeout_eligible,
      effective_timeout_at: timeoutPreflight?.effective_timeout_at || null,
      latest_engine_observed_progress_at: timeoutPreflight?.progress?.latest_engine_observed_progress_at || null,
      lease_anchor_at: timeoutPreflight?.lease_anchor_at || null,
      progress_sources: timeoutPreflight?.progress?.sources || [],
    } : {};
    traceWorkUnitEvent(bundleDir, event, {
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      wave: record.wave,
      kind: record.kind,
      receipt_nonce: record.receipt_nonce,
      reason,
      ...forcedTimeoutAudit,
    });
    if (status === 'timed_out' && force && !timeoutPreflight?.timeout_eligible) {
      traceWorkUnitEvent(bundleDir, 'work_unit_forced_timeout', {
        tx_id,
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        wave: record.wave,
        kind: record.kind,
        receipt_nonce: record.receipt_nonce,
        reason,
        ...forcedTimeoutAudit,
      });
    }
    logToRun(bundleDir, status === 'timed_out' ? 'warn' : 'info', event, {
      kind: 'work_unit_terminal',
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status,
      reason,
      runtime_refs: record.runtime_refs || {},
      ...forcedTimeoutAudit,
    });
    return {
      ok: true,
      duplicate: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status,
      reason,
      retry_requeued: status === 'timed_out' || actorSpawnUnavailable,
      ...(timeoutPreflight ? { timeout_preflight: timeoutPreflight } : {}),
      ...forcedTimeoutAudit,
      queue: savedQueue,
      index: savedIndex,
    };
  });
}
