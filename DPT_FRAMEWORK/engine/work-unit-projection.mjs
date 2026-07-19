// @impl RRM-007
// Narrow submitted-work projection for return-map and eligible-row consumers.

import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { readNormalizedSubmittedWorkUnitDeclarations } from './helpers/gate-helpers-readers.mjs';
import { buildCanonicalTopicRegistryFact } from './helpers/topic-registry-fact.mjs';
import { acceptedTopicSlugs, resolveStructuredTopicBinding } from './helpers/topic-layout.mjs';
import { makeContractFinding } from './helpers/wave-contract-findings.mjs';
import { queueItemSnapshotHash } from './queue-manager-core.mjs';
import { isSafeBundleRelative } from './work-unit-utils.mjs';
import { readAndValidateManifest } from './work-unit-validation.mjs';

const PHASE_WAVES = Object.freeze({ wave0: 0, wave1: 1, wave2: 2 });

function authorityRoot(message) {
  return makeContractFinding({
    id: 'submitted_projection_authority',
    ruleId: 'submitted_projection_authority',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'authority_integrity',
    surface: 'Engine-owned submitted work-unit authority',
    expected: 'Consistent profile, submitted ledger/index/manifest/result-path, queue snapshot, and canonical topic binding authority.',
    observed: message,
    repairKind: 'missing_contract',
    missingFact: message,
    writeTo: 'Engine-owned submitted work-unit authority recovery boundary',
    detail: `[submitted_projection_authority] ${message}`,
  });
}

function projectionFailure(message, warnings = []) {
  return { passed: false, rows: [], root_findings: [authorityRoot(message)], warnings };
}

export function readProjectionProfileRound(bundleDir) {
  const profilePath = path.join(bundleDir, 'rb_profile.yaml');
  if (!existsSync(profilePath)) throw new Error('rb_profile.yaml is missing');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error('rb_profile.yaml must contain an object');
  const checkpoints = profile.human_decision_checkpoints;
  const hitl2 = checkpoints?.hitl2;
  if (!checkpoints || typeof checkpoints !== 'object' || Array.isArray(checkpoints)
    || !hitl2 || typeof hitl2 !== 'object' || Array.isArray(hitl2)) {
    throw new Error('rb_profile.yaml human_decision_checkpoints.hitl2 must be an object');
  }
  if (!Object.hasOwn(hitl2, 'rerun_count')) return 0;
  if (!Number.isInteger(hitl2.rerun_count) || hitl2.rerun_count < 0) {
    throw new Error('rb_profile.yaml human_decision_checkpoints.hitl2.rerun_count must be a non-negative integer');
  }
  return hitl2.rerun_count;
}

function requireRegularResult(bundleDir, resultRef) {
  if (!isSafeBundleRelative(resultRef)) throw new Error(`unsafe result path: ${resultRef}`);
  const resultPath = path.resolve(bundleDir, resultRef);
  const bundleRoot = path.resolve(bundleDir);
  if (resultPath === bundleRoot || !resultPath.startsWith(`${bundleRoot}${path.sep}`)) {
    throw new Error(`result path escapes bundle: ${resultRef}`);
  }
  if (!existsSync(resultPath)) throw new Error(`submitted result path is missing: ${resultRef}`);
  const stats = lstatSync(resultPath);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`submitted result path is not a regular file: ${resultRef}`);
}

export function collectEligibleWorkUnitProjection(bundleDir, {
  phase,
  topic = null,
  topicRegistryFact,
} = {}) {
  const wave = PHASE_WAVES[phase];
  if (wave === undefined) throw new Error('--phase must be wave0|wave1|wave2');

  let rerunCount;
  try {
    rerunCount = readProjectionProfileRound(bundleDir);
  } catch (error) {
    return projectionFailure(`Eligible projection profile authority invalid: ${error.message}`);
  }

  if (!topicRegistryFact?.layouts || !Array.isArray(topicRegistryFact?.topic_registry)) {
    return projectionFailure('Eligible projection requires one validated canonical topic-registry fact.');
  }

  let normalized;
  try {
    normalized = readNormalizedSubmittedWorkUnitDeclarations(bundleDir);
  } catch (error) {
    return projectionFailure(`Submitted declaration authority invalid: ${error.message}`);
  }
  if (normalized.facts.length === 0) return { passed: true, rows: [], root_findings: [], warnings: [] };

  const rows = [];
  let legacyCount = 0;
  for (const { ledger_row: ledgerRow, index_record: record } of normalized.facts) {
    if (record.status !== 'submitted' || record.wave !== wave) continue;
    if (record.rerun_count === undefined || record.rerun_count === null) {
      legacyCount += 1;
      continue;
    }
    if (record.rerun_count !== rerunCount) continue;

    try {
      const manifest = readAndValidateManifest(bundleDir, { kind_registry: normalized.kind_registry }, record);
      const recomputedHash = queueItemSnapshotHash(manifest.queue_item);
      if (recomputedHash !== record.queue_item_snapshot_hash || recomputedHash !== manifest.queue_item_snapshot_hash) {
        throw new Error(`manifest queue-item snapshot hash mismatch for ${record.work_id}`);
      }
      if (ledgerRow.result_ref !== record.paths.result_ref) throw new Error(`ledger/index mismatch for ${record.work_id}: result_ref`);
      requireRegularResult(bundleDir, record.paths.result_ref);
      const binding = resolveStructuredTopicBinding(topicRegistryFact.layouts, manifest);
      if (!binding.ok) throw new Error(`work-unit topic binding invalid for ${record.work_id}: ${binding.reason_code}`);
      if (topic && !acceptedTopicSlugs(topicRegistryFact.layouts, binding.topic_uid).includes(topic)) continue;
      rows.push({
        work_id: record.work_id,
        result_path: record.paths.result_ref,
        rerun_count: record.rerun_count,
        topic_uid: binding.topic_uid,
        topic_slug: binding.current_slug,
        accepted_slugs: acceptedTopicSlugs(topicRegistryFact.layouts, binding.topic_uid),
        kind: record.kind,
        status: record.status,
      });
    } catch (error) {
      return projectionFailure(`Submitted projection authority invalid: ${error.message}`);
    }
  }

  const warnings = legacyCount > 0
    ? [`eligible_rows: ${legacyCount} legacy submitted row(s) without rerun_count excluded (not current-round authority)`]
    : [];
  return { passed: true, rows, root_findings: [], warnings };
}

export function collectEligibleRows(bundleDir, phase, topic = null, topicRegistryFact = null) {
  let fact = topicRegistryFact;
  if (!fact) {
    try {
      fact = buildCanonicalTopicRegistryFact(bundleDir);
    } catch (error) {
      return projectionFailure(`Eligible projection plan authority invalid: ${error.message}`);
    }
  }
  return collectEligibleWorkUnitProjection(bundleDir, { phase, topic, topicRegistryFact: fact });
}
