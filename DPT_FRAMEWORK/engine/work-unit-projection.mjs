// @impl RRM-007, RWG-018
// Narrow submitted-work projection for return-map and eligible-row consumers.

import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { readNormalizedSubmittedWorkUnitDeclarations } from './helpers/gate-helpers-readers.mjs';
import { evaluateDirectOutputTarget } from './helpers/direct-output-contract.mjs';
import { buildCanonicalTopicRegistryFact } from './helpers/topic-registry-fact.mjs';
import { acceptedTopicSlugs, resolveStructuredTopicBinding } from './helpers/topic-layout.mjs';
import { makeContractFinding } from './helpers/wave-contract-findings.mjs';
import { queueItemSnapshotHash } from './queue-manager-core.mjs';
import { hashValue, isSafeBundleRelative } from './work-unit-utils.mjs';
import {
  readAndValidateManifest,
  readAndValidateResult,
  validateOutputFiles,
} from './work-unit-validation.mjs';

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

function candidateProjectionFailure(message, warnings = []) {
  return { passed: false, candidates: [], root_findings: [authorityRoot(message)], warnings };
}

function directOutputRoot(bundleDir, directRoot) {
  const integrity = directRoot.root_class === 'contract_integrity';
  return makeContractFinding({
    id: `wave0_candidate_direct_output:${directRoot.code}`,
    ruleId: 'wave0_candidate_direct_output',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: integrity ? 'authority_integrity' : 'required_structure',
    surface: path.resolve(bundleDir, directRoot.coordinate),
    expected: directRoot.expected,
    observed: directRoot.observed,
    missingFact: `${directRoot.coordinate}: ${directRoot.observed}`,
    repairKind: integrity ? 'missing_contract' : 'agent_action',
    writeTo: path.resolve(bundleDir, directRoot.coordinate),
    repair: `Repair ${directRoot.coordinate}, then rerun the same Wave0 inspect.`,
    detail: `[wave0_candidate_direct_output] ${directRoot.code}: ${directRoot.observed}`,
    checkpointContext: { direct_root: directRoot },
  });
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

function collectEligibleWorkUnitProjectionFacts(bundleDir, {
  phase,
  topic = null,
  topicRegistryFact,
  kind = null,
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
  if (normalized.facts.length === 0) return { passed: true, facts: [], root_findings: [], warnings: [] };

  const facts = [];
  let legacyCount = 0;
  for (const { ledger_row: ledgerRow, index_record: record } of normalized.facts) {
    if (record.status !== 'submitted' || record.wave !== wave) continue;
    if (kind && record.kind !== kind) continue;
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
      facts.push({
        ledger_row: ledgerRow,
        index_record: record,
        manifest,
        row: {
          work_id: record.work_id,
          result_path: record.paths.result_ref,
          rerun_count: record.rerun_count,
          topic_uid: binding.topic_uid,
          topic_slug: binding.current_slug,
          accepted_slugs: acceptedTopicSlugs(topicRegistryFact.layouts, binding.topic_uid),
          kind: record.kind,
          status: record.status,
        },
      });
    } catch (error) {
      return projectionFailure(`Submitted projection authority invalid: ${error.message}`);
    }
  }

  const warnings = legacyCount > 0
    ? [`eligible_rows: ${legacyCount} legacy submitted row(s) without rerun_count excluded (not current-round authority)`]
    : [];
  return { passed: true, facts, root_findings: [], warnings };
}

export function collectEligibleWorkUnitProjection(bundleDir, options = {}) {
  const projection = collectEligibleWorkUnitProjectionFacts(bundleDir, options);
  if (!projection.passed) {
    return {
      passed: false,
      rows: [],
      root_findings: projection.root_findings,
      warnings: projection.warnings,
    };
  }
  return {
    passed: true,
    rows: projection.facts.map(({ row }) => row),
    root_findings: [],
    warnings: projection.warnings,
  };
}

export function collectEligibleWave0CandidateProjection(bundleDir, {
  topic = null,
  topicRegistryFact,
} = {}) {
  const eligible = collectEligibleWorkUnitProjectionFacts(bundleDir, {
    phase: 'wave0',
    topic,
    topicRegistryFact,
    kind: 'wave0_source_intake',
  });
  if (!eligible.passed) {
    return {
      passed: false,
      candidates: [],
      root_findings: eligible.root_findings,
      warnings: eligible.warnings,
    };
  }

  const candidates = [];
  for (const { row, index_record: record, manifest } of eligible.facts) {
    try {
      const sourceTuples = (manifest.output_contract?.required_outputs || []).filter((output) => (
        output.role === 'source_yaml' && output.direct_contract === 'wave0.source-metadata-array.v1'
      ));
      if (sourceTuples.length !== 1) {
        throw new Error(`Wave0 candidate projection requires exactly one source_yaml direct-output tuple for ${row.work_id}`);
      }
      const [sourceTuple] = sourceTuples;
      const result = readAndValidateResult(
        bundleDir,
        path.resolve(bundleDir, row.result_path),
        record,
        { outputContract: manifest.output_contract },
      );
      if (hashValue(result) !== record.result_hash) {
        throw new Error(`submitted result hash mismatch for ${row.work_id}`);
      }
      validateOutputFiles(bundleDir, result, manifest.output_contract);
      const declaredSourceOutputs = result.output_files.filter((output) => (
        output.path === sourceTuple.path && output.role === sourceTuple.role
      ));
      if (declaredSourceOutputs.length !== 1) {
        throw new Error(`submitted result lacks the declared source_yaml output tuple for ${row.work_id}`);
      }

      const direct = evaluateDirectOutputTarget({
        bundleDir,
        target: sourceTuple.path,
        contractId: sourceTuple.direct_contract,
      });
      if (!direct.passed) {
        return {
          passed: false,
          candidates: [],
          root_findings: [directOutputRoot(bundleDir, direct.roots[0])],
          warnings: eligible.warnings,
        };
      }
      const length = direct.snapshot_meta?.validated_array_length;
      if (!Number.isInteger(length) || length < 0) {
        throw new Error(`Wave0 direct output lacks validated array cardinality for ${row.work_id}`);
      }
      for (let sourceOrdinal = 1; sourceOrdinal <= length; sourceOrdinal += 1) {
        candidates.push({
          work_id: row.work_id,
          topic_uid: row.topic_uid,
          topic_slug: row.topic_slug,
          source_ordinal: sourceOrdinal,
          entry_id: `${row.work_id}/${sourceOrdinal}`,
        });
      }
    } catch (error) {
      return candidateProjectionFailure(`Wave0 candidate projection authority invalid: ${error.message}`, eligible.warnings);
    }
  }
  return { passed: true, candidates, root_findings: [], warnings: eligible.warnings };
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
