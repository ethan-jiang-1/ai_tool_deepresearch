// @impl WUC-009, RRM-007, REF-009, RWG-018, RWG-022
// Narrow submitted-work projection for return-map and eligible-row consumers.
// Input: submitted ledger rows → Output: reader-facing projection of accepted
// delegated work → Consumers: return-map, gate coverage rows.

import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { readNormalizedSubmittedWorkUnitDeclarations } from './helpers/gate-helpers-readers.mjs';
import { evaluateDirectOutputTarget, semanticOrderedArrayDigest } from './helpers/direct-output-contract.mjs';
import { buildCanonicalTopicRegistryFact } from './helpers/topic-registry-fact.mjs';
import { acceptedTopicSlugs, resolveStructuredTopicBinding } from './helpers/topic-layout.mjs';
import { makeContractFinding } from './helpers/wave-contract-findings.mjs';
import { queueItemSnapshotHash } from './queue-manager-core.mjs';
import { hashValue, isSafeBundleRelative } from './work-unit-utils.mjs';
import {
  readAndValidateManifest,
  readAndValidateResult,
  validateCacheTrails,
  validateOutputFiles,
} from './work-unit-validation.mjs';

const PHASE_WAVES = Object.freeze({ wave0: 0, wave1: 1, wave2: 2 });

function authorityRoot(message) {
  const unsupported = /unsupported current work-unit contract/i.test(message);
  return makeContractFinding({
    id: unsupported ? 'unsupported_current_contract' : 'submitted_projection_authority',
    ruleId: unsupported ? 'unsupported_current_contract' : 'submitted_projection_authority',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'authority_integrity',
    surface: 'Engine-owned submitted work-unit authority',
    expected: 'Consistent profile, submitted ledger/index/manifest/result-path, queue snapshot, and canonical topic binding authority.',
    observed: message,
    repairKind: 'missing_contract',
    missingFact: message,
    writeTo: 'Engine-owned submitted work-unit authority recovery boundary',
    detail: `[${unsupported ? 'unsupported_current_contract' : 'submitted_projection_authority'}] ${message}`,
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

function sourceContributionRoot(bundleDir, group, {
  code,
  expected,
  observed,
  missingFact,
  repairKind,
  writeTo,
  repair,
  surface = path.resolve(bundleDir, group.target),
}) {
  return makeContractFinding({
    id: `${code}:${group.topic_uid}:${group.target}`,
    ruleId: code,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: repairKind === 'missing_contract' ? 'authority_integrity' : 'required_structure',
    surface,
    expected,
    observed,
    missingFact,
    repairKind,
    writeTo,
    repair,
    detail: `[${code}] ${missingFact}`,
    checkpointContext: {
      topic_uid: group.topic_uid,
      topic_slug: group.topic_slug,
      target: group.target,
      work_ids: group.facts.map(({ row }) => row.work_id),
    },
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

function collectSubmittedWorkUnitProjectionFacts(bundleDir, {
  phase,
  topic = null,
  topicRegistryFact,
  kind = null,
  roundScope = 'current',
} = {}) {
  const wave = PHASE_WAVES[phase];
  if (wave === undefined) throw new Error('--phase must be wave0|wave1|wave2');
  if (!['current', 'through_current'].includes(roundScope)) {
    throw new Error('roundScope must be current|through_current');
  }

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
  const warnings = [];
  for (const { ledger_row: ledgerRow, index_record: record } of normalized.facts) {
    if (record.status !== 'submitted' || record.wave !== wave) continue;
    if (kind && record.kind !== kind) continue;
    if (roundScope === 'current') {
      if (record.rerun_count === undefined || record.rerun_count === null) {
        warnings.push(`legacy submitted row ${record.work_id} without rerun_count excluded from current-round eligibility`);
        continue;
      }
      if (record.rerun_count !== rerunCount) continue;
    } else if (record.rerun_count !== undefined && record.rerun_count !== null && record.rerun_count > rerunCount) {
      continue;
    }

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

  return { passed: true, facts, root_findings: [], warnings };
}

export function collectEligibleWorkUnitProjection(bundleDir, options = {}) {
  const projection = collectSubmittedWorkUnitProjectionFacts(bundleDir, {
    ...options,
    roundScope: 'current',
  });
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

function authenticateWave0SourceFact(bundleDir, fact) {
  const { row, index_record: record, manifest } = fact;
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
  if (hashValue(result) !== fact.ledger_row.result_hash) {
    throw new Error(`submitted result hash mismatch for ${row.work_id}`);
  }
  validateOutputFiles(bundleDir, result, manifest.output_contract);
  const declaredSourceOutputs = result.output_files.filter((output) => (
    output.path === sourceTuple.path && output.role === sourceTuple.role
  ));
  if (declaredSourceOutputs.length !== 1) {
    throw new Error(`submitted result lacks the declared source_yaml output tuple for ${row.work_id}`);
  }
  validateCacheTrails(bundleDir, result, manifest.cache_policy, {
    record,
    normalizations: [],
    writeCanonicalCache: false,
  });
  return {
    ...fact,
    source_tuple: sourceTuple,
    source_contribution: fact.ledger_row.source_contribution || null,
    cache_trail_refs: [...result.cache_trails],
  };
}

function groupWave0SourceFacts(facts) {
  const groups = new Map();
  for (const fact of facts) {
    const { row, source_tuple: sourceTuple } = fact;
    const key = `${row.topic_uid}\u0000${sourceTuple.path}`;
    const group = groups.get(key) || {
      topic_uid: row.topic_uid,
      topic_slug: row.topic_slug,
      target: sourceTuple.path,
      direct_contract: sourceTuple.direct_contract,
      facts: [],
    };
    group.facts.push(fact);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function readCurrentSourceArray(bundleDir, group, directByTarget) {
  let direct = directByTarget.get(group.target);
  if (!direct) {
    direct = evaluateDirectOutputTarget({
      bundleDir,
      target: group.target,
      contractId: group.direct_contract,
    });
    directByTarget.set(group.target, direct);
  }
  if (!direct.passed) return { finding: directOutputRoot(bundleDir, direct.roots[0]), value: null };
  if (!Array.isArray(direct.validated_value)) {
    return {
      finding: sourceContributionRoot(bundleDir, group, {
        code: 'submitted_source_contribution_current_array_missing',
        expected: 'The current Wave0 direct output evaluates to a validated source metadata array.',
        observed: 'The direct-output evaluator passed without a validated array value.',
        missingFact: `${group.target} has no validated current source array for submitted contribution evaluation.`,
        repairKind: 'missing_contract',
        writeTo: 'Wave0 direct-output contract boundary',
        repair: 'Repair the direct-output contract boundary, then rerun the same Wave0 inspect.',
      }),
      value: null,
    };
  }
  return { finding: null, value: direct.validated_value };
}

function sourceCandidatesForInterval(group, fact, start, end, sourceEntries) {
  const candidates = [];
  for (let sourceOrdinal = start; sourceOrdinal <= end; sourceOrdinal += 1) {
    const source = sourceEntries[sourceOrdinal - 1];
    candidates.push({
      work_id: fact.row.work_id,
      topic_uid: fact.row.topic_uid,
      topic_slug: fact.row.topic_slug,
      source_ordinal: sourceOrdinal,
      entry_id: `${fact.row.work_id}/${sourceOrdinal}`,
      source_url: source.url,
      source_yaml_ref: fact.source_tuple.path,
      cache_trail_refs: [...fact.cache_trail_refs],
      result_ref: fact.ledger_row.result_ref,
      work_unit_ref: fact.ledger_row.work_unit_ref,
    });
  }
  return candidates;
}

function evaluateDeclaredContributionGroup(bundleDir, group, directByTarget) {
  const contributionFacts = group.facts;
  for (const fact of contributionFacts) {
    const contribution = fact.source_contribution;
    if (contribution.target !== group.target || contribution.direct_contract !== group.direct_contract) {
      return {
        finding: sourceContributionRoot(bundleDir, group, {
          code: 'submitted_source_contribution_tuple_mismatch',
          expected: 'Each submitted source_contribution names the exact current direct source_yaml tuple for its work unit.',
          observed: {
            work_id: fact.row.work_id,
            declared_target: contribution.target,
            declared_contract: contribution.direct_contract,
            required_target: group.target,
            required_contract: group.direct_contract,
          },
          missingFact: `${fact.row.work_id} does not bind its submitted source contribution to ${group.target}.`,
          repairKind: 'missing_contract',
          writeTo: 'Engine-owned submitted Wave0 source contribution boundary',
          repair: 'No legal reader-side recovery can rewrite a submitted contribution declaration. Do not hand-edit the ledger.',
          surface: path.resolve(bundleDir, 'rb_output_declarations.jsonl'),
        }),
        candidates: [],
      };
    }
  }

  const current = readCurrentSourceArray(bundleDir, group, directByTarget);
  if (current.finding) return { finding: current.finding, candidates: [] };

  let previousLength = null;
  const intervals = [];
  for (const fact of contributionFacts) {
    const contribution = fact.source_contribution;
    if (previousLength !== null && contribution.validated_length <= previousLength) {
      return {
        finding: sourceContributionRoot(bundleDir, group, {
          code: 'submitted_source_contribution_non_monotonic',
          expected: 'Ledger-ordered source contribution lengths strictly increase for one canonical topic and direct source target.',
          observed: {
            work_id: fact.row.work_id,
            previous_validated_length: previousLength,
            validated_length: contribution.validated_length,
          },
          missingFact: `${fact.row.work_id} declares source length ${contribution.validated_length} after length ${previousLength} for ${group.target}.`,
          repairKind: 'missing_contract',
          writeTo: 'Engine-owned submitted Wave0 source contribution boundary',
          repair: 'No legal reader-side recovery can infer overlapping historical ownership. Do not hand-edit the ledger or source array.',
          surface: path.resolve(bundleDir, 'rb_output_declarations.jsonl'),
        }),
        candidates: [],
      };
    }
    if (contribution.validated_length > current.value.length) {
      return {
        finding: sourceContributionRoot(bundleDir, group, {
          code: 'submitted_source_contribution_prefix_shortened',
          expected: 'The current source array retains every submitted contribution prefix.',
          observed: {
            work_id: fact.row.work_id,
            declared_length: contribution.validated_length,
            current_length: current.value.length,
          },
          missingFact: `${group.target} is shorter than the submitted ${contribution.validated_length}-entry prefix from ${fact.row.work_id}.`,
          repairKind: 'agent_action',
          writeTo: path.resolve(bundleDir, group.target),
          repair: 'Restore the current source array through the existing Wave0 content path, then rerun the same Wave0 inspect.',
        }),
        candidates: [],
      };
    }
    const currentDigest = semanticOrderedArrayDigest(current.value.slice(0, contribution.validated_length));
    if (currentDigest !== contribution.semantic_digest) {
      return {
        finding: sourceContributionRoot(bundleDir, group, {
          code: 'submitted_source_contribution_prefix_drift',
          expected: 'The current source array preserves each submitted ordered semantic prefix.',
          observed: {
            work_id: fact.row.work_id,
            declared_length: contribution.validated_length,
            expected_digest: contribution.semantic_digest,
            current_digest: currentDigest,
          },
          missingFact: `${group.target} no longer matches the submitted ${contribution.validated_length}-entry prefix from ${fact.row.work_id}.`,
          repairKind: 'agent_action',
          writeTo: path.resolve(bundleDir, group.target),
          repair: 'Restore the current source prefix through the existing Wave0 content path, then rerun the same Wave0 inspect.',
        }),
        candidates: [],
      };
    }
    intervals.push({ fact, start: (previousLength ?? 0) + 1, end: contribution.validated_length });
    previousLength = contribution.validated_length;
  }

  if (current.value.length > previousLength) {
    return {
      finding: sourceContributionRoot(bundleDir, group, {
        code: 'submitted_source_contribution_unsubmitted_suffix',
        expected: 'The current source array ends at the latest accepted submitted source contribution.',
        observed: {
          latest_declared_length: previousLength,
          current_length: current.value.length,
        },
        missingFact: `${group.target} has ${current.value.length - previousLength} current source entry or entries without a submitted contribution owner.`,
        repairKind: 'engine_operation',
        writeTo: 'Existing Wave0 work-unit submit boundary',
        repair: 'Submit the legal current Wave0 source contribution through the existing work-unit path, then rerun the same Wave0 inspect. Do not assign the suffix to an earlier work ID.',
      }),
      candidates: [],
    };
  }

  return {
    finding: null,
    candidates: intervals.flatMap(({ fact, start, end }) => sourceCandidatesForInterval(
      group,
      fact,
      start,
      end,
      current.value,
    )),
  };
}

function evaluateWave0SourceGroup(bundleDir, group, directByTarget) {
  const missingContributionFacts = group.facts.filter((fact) => !fact.source_contribution);
  if (missingContributionFacts.length > 0 && group.facts.length > 1) {
    return {
      finding: sourceContributionRoot(bundleDir, group, {
        code: 'submitted_source_contribution_missing_boundary',
        expected: 'Every row in a multi-row same-target Wave0 group has a submission-bound source contribution declaration.',
        observed: {
          work_ids: group.facts.map(({ row }) => row.work_id),
          missing_contribution_work_ids: missingContributionFacts.map(({ row }) => row.work_id),
        },
        missingFact: `${group.target} has multiple submitted Wave0 rows but lacks a provable contribution boundary for ${missingContributionFacts.map(({ row }) => row.work_id).join(', ')}.`,
        repairKind: 'missing_contract',
        writeTo: 'Engine-owned submitted Wave0 source contribution boundary',
        repair: 'No legal reader-side recovery can infer historical ordinal ownership. Do not hand-edit source.yaml or rb_output_declarations.jsonl.',
        surface: path.resolve(bundleDir, 'rb_output_declarations.jsonl'),
      }),
      candidates: [],
    };
  }

  if (missingContributionFacts.length === 1) {
    const current = readCurrentSourceArray(bundleDir, group, directByTarget);
    if (current.finding) return { finding: current.finding, candidates: [] };
    // A singleton legacy row remains readable, but establishes no reusable
    // boundary and therefore cannot diagnose an unsubmitted suffix.
    return {
      finding: null,
      candidates: sourceCandidatesForInterval(group, group.facts[0], 1, current.value.length, current.value),
    };
  }

  return evaluateDeclaredContributionGroup(bundleDir, group, directByTarget);
}

export function collectSubmittedWave0ContributionProjection(bundleDir, {
  topic = null,
  topicRegistryFact,
} = {}) {
  const lineage = collectSubmittedWorkUnitProjectionFacts(bundleDir, {
    phase: 'wave0',
    topic,
    topicRegistryFact,
    kind: 'wave0_source_intake',
    roundScope: 'through_current',
  });
  if (!lineage.passed) {
    return {
      passed: false,
      candidates: [],
      root_findings: lineage.root_findings,
      warnings: lineage.warnings,
    };
  }

  let sourceFacts;
  try {
    sourceFacts = lineage.facts.map((fact) => authenticateWave0SourceFact(bundleDir, fact));
  } catch (error) {
    return candidateProjectionFailure(`Wave0 candidate projection authority invalid: ${error.message}`, lineage.warnings);
  }

  const candidates = [];
  const directByTarget = new Map();
  for (const group of groupWave0SourceFacts(sourceFacts)) {
    const result = evaluateWave0SourceGroup(bundleDir, group, directByTarget);
    if (result.finding) {
      return {
        passed: false,
        candidates: [],
        root_findings: [result.finding],
        warnings: lineage.warnings,
      };
    }
    candidates.push(...result.candidates);
  }
  return { passed: true, candidates, root_findings: [], warnings: lineage.warnings };
}

function submittedBackingIdentityFailure(message, warnings = []) {
  return {
    passed: false,
    backing: null,
    root_findings: [makeContractFinding({
      id: 'submitted_wave0_backing_identity',
      ruleId: 'submitted_wave0_backing_identity',
      findingSource: 'checker',
      classification: 'blocking',
      blockingBasis: 'binding_integrity',
      surface: 'Engine-owned submitted Wave0 contribution projection',
      expected: 'One safe exact submitted Wave0 source identity written as <work_id>/<ordinal>.',
      observed: message,
      missingFact: message,
      repairKind: 'engine_operation',
      writeTo: 'Existing Wave0 work-unit submit and submitted-backing reader boundary',
      repair: 'Resolve one retained submitted Wave0 source identity, then rerun the same inspect.',
      detail: `[submitted_wave0_backing_identity] ${message}`,
    })],
    warnings,
  };
}

function isSafeWorkId(workId) {
  return typeof workId === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(workId);
}

/**
 * Resolve the direct submitted backing for exactly one retained Wave0 source.
 *
 * This reader intentionally exposes a single identity, not a source catalog:
 * consumers must already know both the submitted work unit and its ordinal.
 *
 * @impl REF-009
 */
export function readSubmittedWave0Backing(bundleDir, {
  work_id: workId,
  entry_id: entryId,
  topicRegistryFact = null,
} = {}) {
  if (!isSafeWorkId(workId) || typeof entryId !== 'string') {
    return submittedBackingIdentityFailure('Submitted Wave0 backing requires a safe work_id and exact entry_id.');
  }

  const expectedEntryId = entryId.match(/^([A-Za-z0-9][A-Za-z0-9_-]*)\/([1-9][0-9]*)$/);
  if (!expectedEntryId || expectedEntryId[1] !== workId) {
    return submittedBackingIdentityFailure(`entry_id '${entryId}' must exactly match '${workId}/<positive ordinal>'.`);
  }

  let registry = topicRegistryFact;
  if (!registry) {
    try {
      registry = buildCanonicalTopicRegistryFact(bundleDir);
    } catch (error) {
      return submittedBackingIdentityFailure(`Canonical topic authority is unavailable for ${entryId}: ${error.message}`);
    }
  }

  const projection = collectSubmittedWave0ContributionProjection(bundleDir, { topicRegistryFact: registry });
  if (!projection.passed) {
    return {
      passed: false,
      backing: null,
      root_findings: projection.root_findings,
      warnings: projection.warnings,
    };
  }

  const matches = projection.candidates.filter((candidate) => (
    candidate.work_id === workId && candidate.entry_id === entryId
  ));
  if (matches.length === 0) {
    return submittedBackingIdentityFailure(
      `No submitted Wave0 contribution in the retained direct source lineage owns exact source identity ${entryId}.`,
      projection.warnings,
    );
  }
  if (matches.length > 1) {
    return submittedBackingIdentityFailure(
      `Submitted Wave0 source identity ${entryId} resolves ambiguously to ${matches.length} backing candidates.`,
      projection.warnings,
    );
  }

  const [candidate] = matches;
  return {
    passed: true,
    backing: {
      work_id: candidate.work_id,
      entry_id: candidate.entry_id,
      source_ordinal: candidate.source_ordinal,
      source_url: candidate.source_url,
      source_yaml_ref: candidate.source_yaml_ref,
      cache_trail_refs: candidate.cache_trail_refs,
      result_ref: candidate.result_ref,
      work_unit_ref: candidate.work_unit_ref,
    },
    root_findings: [],
    warnings: projection.warnings,
  };
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
