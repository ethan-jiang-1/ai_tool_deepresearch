// Deterministic Wave1 carried-target receipt selection and normalization.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { readBundlePlan } from './gate-helpers-readers.mjs';
import { findLatestLegalHandoff } from './handoff-helpers.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';

export const CARRIED_TARGET_RECEIPT_VERSION = 'wave1-carried-targets/v1';

const TARGET_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA256 = /^[0-9a-f]{64}$/;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeText(value) {
  return value.normalize('NFC').replace(/\r\n?/g, '\n').trim();
}

function declarationFinding(bundlePath, topic, relPath, code, detail, observed = null) {
  const surface = resolvePath(bundlePath, relPath);
  return makeContractFinding({
    id: `carried_target_declaration:${topic.topic_uid}:${code}`,
    ruleId: 'per_topic_depth_review_contract',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'required_structure',
    surface,
    expected: 'One current depth-review.yaml with a valid carried_targets declaration.',
    observed,
    missingFact: detail,
    repairKind: 'agent_action',
    writeTo: surface,
    repair: `Repair ${relPath} carried_targets, then rerun the same Wave1 checkpoint.`,
    detail: `[carried_target_declaration] ${detail}`,
  });
}

export function currentIntentSha256(topic) {
  const payload = {
    title: normalizeText(String(topic.title || '')),
    must_answer: (topic.must_answer || []).map((value) => normalizeText(String(value))),
    scope_role: normalizeText(String(topic.scope_role || '')),
    depends_on_topic_uids: (topic.depends_on_topic_uids || []).map((value) => String(value)),
  };
  return sha256(JSON.stringify(payload));
}

function readCandidate(bundlePath, topic) {
  const candidates = [topic.slug, ...(topic.previous_layouts || []).map((layout) => layout.slug)]
    .filter((slug) => typeof slug === 'string' && slug)
    .map((slug) => ({ slug, relPath: join('artifacts', 'wave1', slug, 'depth-review.yaml') }))
    .filter(({ relPath }) => existsSync(join(bundlePath, relPath)));
  return candidates;
}

/**
 * Select every canonical Topic's one current depth review and build the
 * versioned receipt carried only by a passing Wave1 Gate.
 */
export function selectWave1CarriedTargetReceipt(bundlePath) {
  const plan = readBundlePlan(bundlePath);
  const topics = Array.isArray(plan?.topic_registry) ? plan.topic_registry : [];
  const findings = [];
  const targets = [];

  for (const topic of topics) {
    const candidates = readCandidate(bundlePath, topic);
    const fallback = join('artifacts', 'wave1', topic.slug || '<unknown-topic>', 'depth-review.yaml');
    if (candidates.length !== 1) {
      const detail = candidates.length === 0
        ? `No depth review resolves to canonical topic ${topic.topic_uid}.`
        : `More than one depth review resolves to canonical topic ${topic.topic_uid}: ${candidates.map(({ relPath }) => relPath).join(', ')}.`;
      findings.push(declarationFinding(bundlePath, topic, candidates[0]?.relPath || fallback, candidates.length === 0 ? 'missing' : 'ambiguous', detail, { candidate_count: candidates.length }));
      continue;
    }

    const candidate = candidates[0];
    let review;
    try {
      review = parseYaml(readFileSync(join(bundlePath, candidate.relPath), 'utf8'));
    } catch (error) {
      findings.push(declarationFinding(bundlePath, topic, candidate.relPath, 'yaml_parse', `Cannot parse ${candidate.relPath}: ${error.message}`, error.message));
      continue;
    }
    if (!review || typeof review !== 'object' || Array.isArray(review) || !Array.isArray(review.carried_targets)) {
      findings.push(declarationFinding(bundlePath, topic, candidate.relPath, 'shape', `${candidate.relPath} must contain carried_targets as an explicit array.`, review?.carried_targets ?? null));
      continue;
    }

    const localIds = new Set();
    for (let index = 0; index < review.carried_targets.length; index++) {
      const item = review.carried_targets[index];
      const itemPath = `${candidate.relPath}#carried_targets[${index}]`;
      if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).length !== 2 || !Object.hasOwn(item, 'target_id') || !Object.hasOwn(item, 'target_text')) {
        findings.push(declarationFinding(bundlePath, topic, candidate.relPath, `item_${index}_shape`, `${itemPath} must be exactly { target_id, target_text }.`, item));
        continue;
      }
      if (typeof item.target_id !== 'string' || !TARGET_ID.test(item.target_id) || localIds.has(item.target_id)) {
        findings.push(declarationFinding(bundlePath, topic, candidate.relPath, `item_${index}_id`, `${itemPath}.target_id must be a declaration-local unique identifier.`, item.target_id));
        continue;
      }
      if (typeof item.target_text !== 'string' || !normalizeText(item.target_text)) {
        findings.push(declarationFinding(bundlePath, topic, candidate.relPath, `item_${index}_text`, `${itemPath}.target_text must be a nonempty string after normalization.`, item.target_text));
        continue;
      }
      localIds.add(item.target_id);
      const normalized = { target_id: item.target_id, target_text: normalizeText(item.target_text) };
      targets.push({
        topic_uid: topic.topic_uid,
        intent_sha256: currentIntentSha256(topic),
        target_id: normalized.target_id,
        target_revision: sha256(JSON.stringify(normalized)),
      });
    }
  }

  if (findings.length > 0) return { ok: false, findings, receipt: null };
  targets.sort((left, right) => `${left.topic_uid}\u0000${left.target_id}`.localeCompare(`${right.topic_uid}\u0000${right.target_id}`));
  const pairs = new Set();
  for (const target of targets) {
    const pair = `${target.topic_uid}\u0000${target.target_id}`;
    if (pairs.has(pair)) throw new Error(`duplicate carried-target receipt pair: ${pair}`);
    pairs.add(pair);
  }
  const receipt = {
    contract_version: CARRIED_TARGET_RECEIPT_VERSION,
    receipt_sha256: null,
    targets,
  };
  receipt.receipt_sha256 = sha256(JSON.stringify({ contract_version: receipt.contract_version, targets: receipt.targets }));
  return { ok: true, findings: [], receipt };
}

export function isValidCarriedTargetReceipt(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.contract_version !== CARRIED_TARGET_RECEIPT_VERSION || !SHA256.test(value.receipt_sha256) || !Array.isArray(value.targets)) return false;
  const pairs = new Set();
  let previous = null;
  for (const target of value.targets) {
    if (!target || typeof target !== 'object' || Array.isArray(target) || Object.keys(target).length !== 4) return false;
    if (!Object.hasOwn(target, 'topic_uid') || !Object.hasOwn(target, 'intent_sha256') || !Object.hasOwn(target, 'target_id') || !Object.hasOwn(target, 'target_revision')) return false;
    if (typeof target.topic_uid !== 'string' || !target.topic_uid || !SHA256.test(target.intent_sha256) || typeof target.target_id !== 'string' || !TARGET_ID.test(target.target_id) || !SHA256.test(target.target_revision)) return false;
    const pair = `${target.topic_uid}\u0000${target.target_id}`;
    if (pairs.has(pair) || (previous !== null && previous.localeCompare(pair) >= 0)) return false;
    pairs.add(pair);
    previous = pair;
  }
  return value.receipt_sha256 === sha256(JSON.stringify({ contract_version: value.contract_version, targets: value.targets }));
}

function handoffFinding(bundlePath, code, detail, observed = null) {
  return makeContractFinding({
    id: `wave1_carried_target_handoff:${code}`,
    ruleId: 'finding_index_contract',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'authority_integrity',
    surface: resolvePath(bundlePath, 'rb_trace.jsonl'),
    expected: 'A route-bound Wave1 Gate handoff with a complete carried-target receipt.',
    observed,
    missingFact: detail,
    repairKind: 'engine_operation',
    writeTo: 'Wave1 Gate/handoff persistence boundary',
    repair: 'Repair or rerun the legal Wave1 Gate handoff; do not hand-edit trace or bind an old receipt in Wave2.',
    detail: `[wave1_carried_target_handoff] ${detail}`,
  });
}

/** Select the exact Wave1-to-Wave2 receipt, preserving no-receipt legacy paths. */
export function selectWave1CarriedTargetReceiptForWave2(bundlePath) {
  const selected = findLatestLegalHandoff(bundlePath, {
    sourceNode: 'phases/phase-wave1.md',
    targetNode: 'phases/phase-wave2.md',
    requireLoad: true,
  });
  if (!selected.ok) return { kind: 'unavailable', findings: [] };
  const receipt = selected.handoff.event.carried_target_receipt;
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt) || !Object.hasOwn(receipt, 'contract_version')) {
    return { kind: 'legacy', findings: [] };
  }
  if (receipt.contract_version !== CARRIED_TARGET_RECEIPT_VERSION || !isValidCarriedTargetReceipt(receipt)) {
    return {
      kind: 'invalid',
      findings: [handoffFinding(bundlePath, 'invalid_receipt', 'The selected Wave1 trace presents a carried-target receipt contract but its receipt is missing or malformed.', receipt)],
    };
  }
  const plan = readBundlePlan(bundlePath);
  const currentTopics = new Map((plan?.topic_registry || []).map((topic) => [topic.topic_uid, topic]));
  const drift = receipt.targets.find((target) => {
    const topic = currentTopics.get(target.topic_uid);
    return !topic || currentIntentSha256(topic) !== target.intent_sha256;
  });
  if (drift) {
    return {
      kind: 'intent_drift',
      findings: [handoffFinding(bundlePath, 'current_intent_mismatch', `The selected Wave1 receipt target ${drift.topic_uid}/${drift.target_id} does not match current canonical intent.`, drift)],
    };
  }
  return { kind: 'current', receipt, findings: [] };
}
