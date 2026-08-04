// @impl RWG-022
// Pure Wave0 submitted-reference convergence. It never selects research
// relevance or mutates a bundle; callers consume its ordered direct facts.

import { countReferences } from './ref-count.mjs';
import {
  checkReferenceIndexCoverage,
  classifyReferenceAuthority,
} from './gate-helpers-checks.mjs';
import { listMatchingBundleFiles } from './gate-helpers-readers.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import { evaluateSeedTopicProjectionReadiness } from './return-map.mjs';
import {
  collectSubmittedWave0ContributionProjection,
  readSubmittedWave0Backing,
} from '../work-unit-projection.mjs';

export const WAVE0_SHARED_REFERENCE_TARGET = 'reference/00-shared-*.md';

function requiredFloorFinding(requiredFloor) {
  return makeContractFinding({
    id: 'wave0_reference_convergence_profile_floor',
    ruleId: 'wave0_reference_convergence_profile_floor',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'authority_integrity',
    surface: 'rb_profile.yaml#/research_style_params/wave0_shared_ref_total',
    expected: 'A positive integer Wave0 shared-reference floor.',
    observed: requiredFloor,
    missingFact: 'Wave0 submitted-reference convergence cannot evaluate without a positive shared-reference floor.',
    repairKind: 'missing_contract',
    writeTo: 'Research profile authority recovery boundary',
    detail: '[wave0_reference_convergence_profile_floor] Wave0 shared-reference floor is unavailable or invalid.',
  });
}

function invalidReferenceFinding(file, classification) {
  const root = classification.root_contract || {};
  return makeContractFinding({
    id: `wave0_reference_backing:${file.relPath}:${classification.reason_code || 'unbacked'}`,
    ruleId: 'wave0_reference_backing',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: root.blocking_basis || 'binding_integrity',
    surface: file.absPath || file.relPath,
    expected: 'A submitted legacy reference output or one exact submitted-backed Wave0 Phase-owned consumer projection.',
    observed: {
      authority: classification.authority || 'unbacked',
      reason_code: classification.reason_code || 'unbacked',
    },
    missingFact: root.missing_fact || `${file.relPath} lacks accepted submitted Wave0 reference backing.`,
    repairKind: root.repair_kind || 'missing_contract',
    writeTo: root.write_to || 'Wave0 submitted-reference backing boundary',
    repair: `Repair ${file.relPath} through its submitted-backing root, then rerun the same Wave0 inspect.`,
    detail: `[wave0_reference_backing] ${file.relPath}: ${classification.reason || 'submitted backing is unavailable'}`,
  });
}

function duplicateProjectionIdentityFinding(entryId, files) {
  return makeContractFinding({
    id: `wave0_projection_identity_collision:${entryId}`,
    ruleId: 'wave0_projection_identity_collision',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'binding_integrity',
    surface: files.map((file) => file.absPath || file.relPath).join(', '),
    expected: 'At most one Phase-owned Wave0 consumer projection per exact submitted source identity.',
    observed: { entry_id: entryId, reference_paths: files.map((file) => file.relPath) },
    missingFact: `Submitted Wave0 source identity ${entryId} is bound by multiple consumer projections: ${files.map((file) => file.relPath).join(', ')}.`,
    repairKind: 'agent_action',
    writeTo: files.map((file) => file.absPath || file.relPath).join(', '),
    repair: 'Retain one exact consumer projection for this source identity and repair/remove the conflicting projection through the normal persistence path, then rerun the same Wave0 inspect.',
    detail: `[wave0_projection_identity_collision] ${entryId} has multiple Phase-owned consumer projections.`,
  });
}

function orderedCandidates(candidates) {
  return [...candidates].sort((left, right) => (
    left.topic_slug.localeCompare(right.topic_slug)
    || left.source_ordinal - right.source_ordinal
    || left.entry_id.localeCompare(right.entry_id)
  ));
}

function referenceFacts(bundlePath) {
  const files = listMatchingBundleFiles(bundlePath, WAVE0_SHARED_REFERENCE_TARGET);
  const classifications = files.map((file) => ({ file, classification: classifyReferenceAuthority(bundlePath, file) }));
  const phaseOwned = classifications.filter(({ classification }) => (
    classification.passed && classification.authority === 'phase_owned_projection'
  ));
  const legacyDelegated = classifications.filter(({ classification }) => (
    classification.passed && classification.authority === 'delegated_fetched_evidence'
  ));
  const invalid = classifications.filter(({ classification }) => !classification.passed);
  const projectionsByIdentity = new Map();
  for (const entry of phaseOwned) {
    const entryId = entry.classification.source_identity?.entry_id;
    if (!entryId) continue;
    const bound = projectionsByIdentity.get(entryId) || [];
    bound.push(entry.file);
    projectionsByIdentity.set(entryId, bound);
  }
  const collisions = [...projectionsByIdentity.entries()]
    .filter(([, filesForIdentity]) => filesForIdentity.length > 1)
    .map(([entryId, filesForIdentity]) => duplicateProjectionIdentityFinding(entryId, filesForIdentity));
  const index = checkReferenceIndexCoverage(
    bundlePath,
    phaseOwned.map(({ file }) => file),
    { rule: { id: 'wave0_reference_navigation' } },
  );
  return {
    files,
    phase_owned: phaseOwned,
    legacy_delegated: legacyDelegated,
    projected_identity_ids: new Set(projectionsByIdentity.keys()),
    independent_findings: [
      ...invalid.map(({ file, classification }) => invalidReferenceFinding(file, classification)),
      ...collisions,
      ...(index.findings || []),
    ],
    index,
  };
}

function rootResult(rootFindings, reference, { requiredFloor = null, numeric = null } = {}) {
  return {
    outcome: 'parent_root',
    required: requiredFloor,
    observed: numeric?.count ?? null,
    deficit: null,
    root_findings: rootFindings,
    independent_findings: reference?.independent_findings || [],
    reference_facts: reference,
    numeric,
  };
}

/**
 * Evaluate the next deterministic Wave0 shared-reference boundary.
 *
 * A materializable outcome intentionally contains exactly one bounded backing
 * candidate. The Phase Agent retains the semantic decision to materialize it
 * or record an allowed contribution disposition, then reruns this evaluator.
 */
export function evaluateWave0ReferenceConvergence(bundlePath, {
  topicRegistryFact = null,
  requiredFloor,
  targetGlobs = [WAVE0_SHARED_REFERENCE_TARGET],
} = {}) {
  if (!Number.isInteger(requiredFloor) || requiredFloor < 1) {
    return rootResult([requiredFloorFinding(requiredFloor)], null, { requiredFloor });
  }

  const reference = referenceFacts(bundlePath);
  const numeric = countReferences(bundlePath, {
    source: 'ledger',
    targetGlobs,
  });
  const submitted = collectSubmittedWave0ContributionProjection(bundlePath, { topicRegistryFact });
  if (!submitted.passed) {
    return rootResult(submitted.root_findings || [], reference, { requiredFloor, numeric });
  }
  const seedProjection = evaluateSeedTopicProjectionReadiness(bundlePath, {
    wave: 'wave0',
    topicRegistryFact,
  });
  const deferredIdentityIds = new Set(seedProjection.accepted_deferred_candidate_ids || []);

  const observed = numeric.count;
  const deficit = Math.max(0, requiredFloor - observed);
  if (deficit === 0) {
    return {
      outcome: 'satisfied',
      required: requiredFloor,
      observed,
      deficit,
      root_findings: [],
      independent_findings: reference.independent_findings,
      reference_facts: reference,
      numeric,
    };
  }

  const unprojected = orderedCandidates(submitted.candidates.filter((candidate) => (
    !reference.projected_identity_ids.has(candidate.entry_id)
    && !deferredIdentityIds.has(candidate.entry_id)
  )));
  if (unprojected.length > 0) {
    const selected = unprojected[0];
    const backing = readSubmittedWave0Backing(bundlePath, {
      work_id: selected.work_id,
      entry_id: selected.entry_id,
      topicRegistryFact,
    });
    if (!backing.passed) {
      return rootResult(backing.root_findings || [], reference, { requiredFloor, numeric });
    }
    return {
      outcome: 'materialize_projection',
      required: requiredFloor,
      observed,
      deficit,
      backing: backing.backing,
      root_findings: [],
      independent_findings: reference.independent_findings,
      reference_facts: reference,
      deferred_identity_ids: [...deferredIdentityIds].sort(),
      numeric,
    };
  }

  return {
    outcome: submitted.candidates.length === 0 ? 'missing_acquisition' : 'reference_floor_deficit',
    required: requiredFloor,
    observed,
    deficit,
    root_findings: [],
    independent_findings: reference.independent_findings,
    reference_facts: reference,
    deferred_identity_ids: [...deferredIdentityIds].sort(),
    numeric,
  };
}
