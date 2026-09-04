// wave1-depth-review-contract.mjs
// Wave1 depth-review and focus-coverage contract (W3 carve).
// @impl WAI-008, RWG-002

// wave-depth-contracts.mjs — deterministic Wave1/Wave2 depth-adjacent checks
// @impl WAI-005, WAI-008, RWG-002, RWG-003, RWG-005, RWG-017, WTS-004, WTS-008, WTS-009, WTS-010, CRC-007, WPG-003, WPG-005, WPG-012

// Navigation: public API — evaluateWave1FocusCoverage, readWave0SourceUrls, deriveWave1NewSourceFloor, checkSourceClaimCacheMapping, checkWave1DepthReviewContract
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve as resolvePath } from 'node:path';
import { parse as parseYaml } from 'yaml';

import {
  readBundlePlan,
  readBundleProfile,
  readNormalizedSubmittedWorkUnitDeclarations,
  readSubmittedWorkUnitDeclarations,
} from './gate-helpers-readers.mjs';
import { inspectCacheLeaf } from './cache-leaf-contract.mjs';
import { evaluateTopicLayouts } from './topic-layout.mjs';
import { buildCanonicalTopicRegistryFact } from './topic-registry-fact.mjs';
import { resolveTopicLayout } from './topic-layout.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import { selectWave1CarriedTargetReceiptForWave2 } from './wave-carried-target-receipts.mjs';
import { normalizeWave1ReferenceUrl } from './reference-url.mjs';
import { resolveReviewedWave1SubmittedBacking } from './wave1-reference-convergence.mjs';
import { readProjectionProfileRound } from '../work-unit-projection.mjs';

import {
  readYamlObject,
  issueResult,
  depthFinding,
  submittedFactByRef,
  canonicalizeSubmittedWorkUnitRef,
  safeRel,
} from './wave-depth-verdicts.mjs';
import {
  isAcceptedSourceClaim,
  sourceClaimUrl,
  readWave0SourceUrls,
  checkSourceClaimCacheMapping,
  deriveWave1NewSourceFloor,
} from './wave1-source-claim-mapping.mjs';

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value);
  return actual.length === expected.size && actual.every((key) => expected.has(key));
}

export function focusCoverageIssue(issues, code, detail) {
  issues.push({ code, detail: `[${code}] FAIL: ${detail}` });
}

export function evaluateWave1FocusCoverage(bundlePath, {
  topic,
  review,
  topicRegistryFact = null,
} = {}) {
  if (!Object.hasOwn(review || {}, 'focus_coverage')) {
    return { passed: true, status: 'none', outcome: null, inspect: [], issues: [] };
  }

  const issues = [];
  const focus = review.focus_coverage;
  if (!hasExactKeys(focus, FOCUS_ROOT_KEYS)) {
    focusCoverageIssue(issues, 'focus_coverage_shape_invalid', 'focus_coverage must contain exactly topic_uid, rerun_count, outcome, and commitments.');
    return { passed: false, status: 'invalid', outcome: null, inspect: issues.map((issue) => issue.detail), issues };
  }

  let resolvedTopicRegistryFact = topicRegistryFact;
  let topicBinding = null;
  try {
    if (!resolvedTopicRegistryFact?.layouts) resolvedTopicRegistryFact = buildCanonicalTopicRegistryFact(bundlePath);
    topicBinding = resolveTopicLayout(resolvedTopicRegistryFact.layouts, { topic_slug: topic }, { currentOnly: true });
    if (!topicBinding.ok) {
      focusCoverageIssue(issues, 'focus_coverage_topic_invalid', `current Topic ${topic} cannot resolve: ${topicBinding.reason_code}.`);
    } else if (typeof focus.topic_uid !== 'string' || !focus.topic_uid.trim() || focus.topic_uid !== topicBinding.topic_uid) {
      focusCoverageIssue(issues, 'focus_coverage_topic_mismatch', `topic_uid must equal current canonical Topic UID ${topicBinding.topic_uid}.`);
    }
  } catch (error) {
    focusCoverageIssue(issues, 'focus_coverage_topic_invalid', `current Topic authority is unavailable: ${error.message}`);
  }

  let currentRerunCount = null;
  try {
    currentRerunCount = readProjectionProfileRound(bundlePath);
    if (!Number.isInteger(focus.rerun_count) || focus.rerun_count < 0 || focus.rerun_count !== currentRerunCount) {
      focusCoverageIssue(issues, 'focus_coverage_round_mismatch', `rerun_count must equal current profile rerun_count ${currentRerunCount}.`);
    }
  } catch (error) {
    focusCoverageIssue(issues, 'focus_coverage_round_invalid', `current profile rerun authority is unavailable: ${error.message}`);
  }

  if (!FOCUS_OUTCOMES.has(focus.outcome)) {
    focusCoverageIssue(issues, 'focus_coverage_outcome_invalid', 'outcome must be covered, partial, or blocked.');
  }
  if (!Array.isArray(focus.commitments) || focus.commitments.length === 0) {
    focusCoverageIssue(issues, 'focus_coverage_commitments_invalid', 'commitments must be a non-empty array.');
    return { passed: false, status: 'invalid', outcome: null, inspect: issues.map((issue) => issue.detail), issues };
  }

  let normalized;
  try {
    normalized = readNormalizedSubmittedWorkUnitDeclarations(bundlePath);
  } catch (error) {
    focusCoverageIssue(issues, 'focus_coverage_submitted_authority_invalid', `submitted work-unit authority is invalid: ${error.message}`);
  }
  const factsByRef = normalized ? submittedFactByRef(normalized.facts) : new Map();
  const reviewedRefs = new Set((Array.isArray(review.reviewed_work_unit_refs) ? review.reviewed_work_unit_refs : [])
    .map(canonicalizeSubmittedWorkUnitRef)
    .filter((ref) => ref.safe && ref.canonical)
    .map((ref) => ref.canonical));
  const reviewedBacking = topicBinding?.ok
    ? resolveReviewedWave1SubmittedBacking(bundlePath, { topic, topicRegistryFact: resolvedTopicRegistryFact, review })
    : null;
  if (reviewedBacking && !reviewedBacking.ok) {
    focusCoverageIssue(issues, 'focus_coverage_reviewed_binding_invalid', `reviewed submitted binding is not valid for current Topic: [${reviewedBacking.root.code}] ${reviewedBacking.root.detail}`);
  }

  const seenIds = new Set();
  let coveredCount = 0;
  let limitedCount = 0;
  for (const [index, commitment] of focus.commitments.entries()) {
    const label = `commitments[${index}]`;
    if (!isPlainObject(commitment) || !FOCUS_COMMITMENT_STATES.has(commitment.state)) {
      focusCoverageIssue(issues, 'focus_coverage_commitment_invalid', `${label} must be a covered or limited commitment object.`);
      continue;
    }
    const expectedKeys = commitment.state === 'covered' ? FOCUS_COVERED_KEYS : FOCUS_LIMITED_KEYS;
    if (!hasExactKeys(commitment, expectedKeys)) {
      focusCoverageIssue(issues, 'focus_coverage_commitment_shape_invalid', `${label} has keys incompatible with state ${commitment.state}.`);
      continue;
    }
    if (typeof commitment.id !== 'string' || !commitment.id.trim()) {
      focusCoverageIssue(issues, 'focus_coverage_commitment_id_invalid', `${label}.id must be a non-empty string.`);
    } else if (seenIds.has(commitment.id)) {
      focusCoverageIssue(issues, 'focus_coverage_commitment_id_duplicate', `${label}.id duplicates ${commitment.id}.`);
    } else {
      seenIds.add(commitment.id);
    }
    if (typeof commitment.statement !== 'string' || !commitment.statement.trim()) {
      focusCoverageIssue(issues, 'focus_coverage_commitment_statement_invalid', `${label}.statement must be a non-empty string.`);
    }

    if (commitment.state === 'limited') {
      limitedCount += 1;
      if (typeof commitment.limitation !== 'string' || !commitment.limitation.trim()) {
        focusCoverageIssue(issues, 'focus_coverage_limitation_invalid', `${label}.limitation must be a non-empty string.`);
      }
      if (!FOCUS_BOUNDARY_KINDS.has(commitment.boundary_kind)) {
        focusCoverageIssue(issues, 'focus_coverage_boundary_invalid', `${label}.boundary_kind must be external_action, user_decision, or missing_contract.`);
      }
      continue;
    }

    coveredCount += 1;
    if (!Array.isArray(commitment.submitted_work_unit_refs) || commitment.submitted_work_unit_refs.length === 0) {
      focusCoverageIssue(issues, 'focus_coverage_refs_invalid', `${label}.submitted_work_unit_refs must be a non-empty array.`);
      continue;
    }
    for (const ref of commitment.submitted_work_unit_refs) {
      const canonical = canonicalizeSubmittedWorkUnitRef(ref);
      if (!canonical.safe || !canonical.canonical) {
        focusCoverageIssue(issues, 'focus_coverage_ref_unsafe', `${label} contains an unsafe submitted work-unit ref.`);
        continue;
      }
      if (!reviewedRefs.has(canonical.canonical)) {
        focusCoverageIssue(issues, 'focus_coverage_ref_not_reviewed', `${label} ref ${canonical.original} is not in reviewed_work_unit_refs[].`);
        continue;
      }
      const fact = factsByRef.get(canonical.canonical);
      const record = fact?.index_record;
      if (!fact || !record) {
        focusCoverageIssue(issues, 'focus_coverage_ref_unresolved', `${label} ref ${canonical.original} is not a hash-valid submitted work-unit row.`);
        continue;
      }
      if (record.status !== 'submitted' || record.wave !== 1 || record.kind !== 'wave1_topic_deepening') {
        focusCoverageIssue(issues, 'focus_coverage_ref_wave_invalid', `${label} ref ${canonical.original} is not a submitted Wave1 topic-deepening row.`);
        continue;
      }
      if (!Object.hasOwn(record, 'rerun_count') || record.rerun_count !== currentRerunCount) {
        focusCoverageIssue(issues, 'focus_coverage_ref_round_mismatch', `${label} ref ${canonical.original} lacks explicit current rerun_count ${currentRerunCount}.`);
      }
    }
  }

  if (focus.outcome === 'covered' && (coveredCount !== focus.commitments.length || limitedCount !== 0)) {
    focusCoverageIssue(issues, 'focus_coverage_outcome_matrix_invalid', 'outcome=covered requires every commitment to be covered.');
  } else if (focus.outcome === 'partial' && (coveredCount === 0 || limitedCount === 0)) {
    focusCoverageIssue(issues, 'focus_coverage_outcome_matrix_invalid', 'outcome=partial requires at least one covered and one limited commitment.');
  } else if (focus.outcome === 'blocked' && (coveredCount !== 0 || limitedCount === 0)) {
    focusCoverageIssue(issues, 'focus_coverage_outcome_matrix_invalid', 'outcome=blocked requires one or more limited commitments and no covered commitments.');
  }

  return issues.length > 0
    ? { passed: false, status: 'invalid', outcome: null, inspect: issues.map((issue) => issue.detail), issues }
    : {
      passed: true,
      status: focus.outcome === 'covered' ? 'covered' : 'limited',
      outcome: focus.outcome,
      inspect: [],
      issues: [],
      limitations: focus.commitments
        .filter((commitment) => commitment.state === 'limited')
        .map(({ id, limitation, boundary_kind: boundaryKind }) => ({ id, limitation, boundary_kind: boundaryKind })),
    };
}

export const DEPTH_DECISIONS = new Set(['accept', 'supplement_required', 'blocked_contract']);

export const COVERED_STATUSES = new Set(['covered', 'satisfied', 'complete', 'completed', 'attempted', 'not_required']);

export const CARRIED_BINDING_KEYS = ['receipt_sha256', 'topic_uid', 'intent_sha256', 'target_id', 'target_revision'];

export const FOCUS_OUTCOMES = new Set(['covered', 'partial', 'blocked']);

export const FOCUS_COMMITMENT_STATES = new Set(['covered', 'limited']);

export const FOCUS_BOUNDARY_KINDS = new Set(['external_action', 'user_decision', 'missing_contract']);

export const FOCUS_ROOT_KEYS = new Set(['topic_uid', 'rerun_count', 'outcome', 'commitments']);

export const FOCUS_COVERED_KEYS = new Set(['id', 'statement', 'state', 'submitted_work_unit_refs']);

export const FOCUS_LIMITED_KEYS = new Set(['id', 'statement', 'state', 'limitation', 'boundary_kind']);

export function checkWave1DepthReviewContract(bundlePath, { topic, rule = null, topicRegistryFact = null }) {
  const relPath = join('artifacts', 'wave1', topic, 'depth-review.yaml');
  const filePath = join(bundlePath, relPath);
  const inspect = [];
  const advice = [];
  const findings = [];
  const maskedRuleIds = [];
  const diagnostics = [];
  if (!existsSync(filePath)) {
    const detail = `[depth_review_contract] FAIL: missing ${relPath}`;
    return {
      passed: false,
      inspect: [detail],
      advice: [`Create ${relPath} after successful Wave1 work-unit submit; review must bind to submitted work-unit rows.`],
      findings: [depthFinding(rule, {
        defaultRuleId: 'per_topic_depth_review_contract',
        id: `${rule?.id || 'per_topic_depth_review_contract'}:${topic}:missing`,
        blockingBasis: 'required_structure',
        surface: filePath,
        expected: 'A parseable Wave1 depth-review.yaml bound to reviewed submitted work-unit rows.',
        observed: { exists: false },
        missingFact: `Wave1 depth review ${relPath} is missing for topic ${topic}.`,
        repairKind: 'agent_action',
        writeTo: filePath,
        repair: `Create ${relPath} from reviewed submitted work-unit facts and Phase judgments.`,
        detail,
      })],
      masked_rule_ids: ['source_claim_cache_mapping', 'source_novelty_floor', 'new_source_floor_comparison', 'depth_dimensions', 'profile_checks', 'decision_implications', 'reviewed_work_unit_refs_binding'],
    };
  }

  let review;
  try {
    review = readYamlObject(filePath);
    if (!review) inspect.push(`[depth_review_contract] FAIL: ${relPath} must be a YAML object`);
  } catch (error) {
    const detail = `[depth_review_contract] FAIL: YAML parse error in ${relPath}: ${error.message}`;
    return {
      passed: false,
      inspect: [detail],
      advice: [`Repair ${relPath} as parseable YAML.`],
      findings: [depthFinding(rule, {
        defaultRuleId: 'per_topic_depth_review_contract',
        id: `${rule?.id || 'per_topic_depth_review_contract'}:${topic}:yaml_parse`,
        blockingBasis: 'authority_integrity',
        surface: filePath,
        expected: 'Parseable YAML object for the Wave1 depth-review contract.',
        observed: error.message,
        missingFact: `${relPath} cannot be parsed as YAML: ${error.message}`,
        repairKind: 'agent_action',
        writeTo: filePath,
        repair: `Repair ${relPath} as a parseable YAML object.`,
        detail,
      })],
      masked_rule_ids: ['source_claim_cache_mapping', 'source_novelty_floor', 'new_source_floor_comparison', 'depth_dimensions', 'profile_checks', 'decision_implications', 'reviewed_work_unit_refs_binding'],
    };
  }
  if (!review) {
    const detail = inspect[0] || `[depth_review_contract] FAIL: ${relPath} must be a YAML object`;
    return {
      ...issueResult(inspect, advice, [depthFinding(rule, {
        defaultRuleId: 'per_topic_depth_review_contract',
        id: `${rule?.id || 'per_topic_depth_review_contract'}:${topic}:object_shape`,
        blockingBasis: 'required_structure',
        surface: filePath,
        expected: 'A YAML object for the Wave1 depth-review contract.',
        observed: review,
        missingFact: `${relPath} is not a YAML object.`,
        repairKind: 'agent_action',
        writeTo: filePath,
        repair: `Rewrite ${relPath} as the accepted depth-review YAML object.`,
        detail,
      })]),
      masked_rule_ids: ['source_claim_cache_mapping', 'source_novelty_floor', 'new_source_floor_comparison', 'depth_dimensions', 'profile_checks', 'decision_implications', 'reviewed_work_unit_refs_binding'],
    };
  }

  let agentArtifactIssue = false;
  let profileDecisionIssue = false;
  let submittedBindingIssue = false;
  let reviewedBindingIssue = false;
  let reviewedBindingRoot = null;
  let supplementaryWorkIssue = false;

  const requiredKeys = ['version', 'topic_slug', 'reviewed_work_unit_refs', 'depth_dimensions', 'profile_checks', 'decision', 'supplementary_queue_item_ids'];
  const missingKeys = new Set();
  for (const key of requiredKeys) {
    if (!(key in review)) {
      missingKeys.add(key);
      inspect.push(`[depth_review_contract] FAIL: ${relPath} missing required key: ${key}`);
      if (key !== 'reviewed_work_unit_refs') agentArtifactIssue = true;
    }
  }
  const invalidArrays = new Set();
  for (const key of ['reviewed_work_unit_refs', 'supplementary_queue_item_ids']) {
    if (key in review && !Array.isArray(review[key])) {
      invalidArrays.add(key);
      inspect.push(`[depth_review_contract] FAIL: ${relPath} ${key} must be an array`);
      if (key !== 'reviewed_work_unit_refs') agentArtifactIssue = true;
    }
  }
  if (!missingKeys.has('topic_slug') && review.topic_slug !== topic) {
    inspect.push(`[depth_review_contract] FAIL: ${relPath} topic_slug mismatch: expected ${topic}, got ${review.topic_slug}`);
    agentArtifactIssue = true;
  }
  if (missingKeys.has('decision')) {
    maskedRuleIds.push('decision_implications');
  } else if (!DEPTH_DECISIONS.has(review.decision)) {
    inspect.push(`[depth_review_contract] FAIL: ${relPath} decision must be one of ${[...DEPTH_DECISIONS].join(', ')}`);
    agentArtifactIssue = true;
    maskedRuleIds.push('decision_implications');
  } else {
    if (review.decision !== 'accept') {
      inspect.push(`[depth_review_contract] FAIL: ${relPath} decision is ${review.decision}; Wave1 topic is not complete until decision: accept`);
      advice.push(`Repair ${topic} through supplementary wave1_topic_deepening or record a visible blocker.`);
      supplementaryWorkIssue = true;
    }
    if (review.decision === 'supplement_required' && !missingKeys.has('supplementary_queue_item_ids') && !invalidArrays.has('supplementary_queue_item_ids') && review.supplementary_queue_item_ids.length === 0) {
      inspect.push(`[depth_review_contract] FAIL: ${relPath} decision=supplement_required must name supplementary_queue_item_ids[] repair work`);
      agentArtifactIssue = true;
    }
  }

  const profile = readBundleProfile(bundlePath);
  const floor = deriveWave1NewSourceFloor(profile);
  if (!floor.ok) {
    inspect.push(...floor.inspect);
    advice.push('Run the accepted profile/template path or emit missing_profile_parameter; do not use hidden source-floor defaults.');
    profileDecisionIssue = true;
  }

  if (missingKeys.has('depth_dimensions') || !review.depth_dimensions || typeof review.depth_dimensions !== 'object') {
    maskedRuleIds.push('depth_dimensions');
  } else {
    for (const key of ['mechanism', 'trend_or_difficulty', 'limitation_or_dispute']) {
      if (!depthDimensionCovered(review.depth_dimensions[key])) {
        inspect.push(`[depth_review_contract] FAIL: ${relPath} depth_dimensions.${key} must have covered status and refs[]`);
        agentArtifactIssue = true;
      }
    }
  }

  const params = profile?.research_style_params || {};
  if (missingKeys.has('profile_checks') || !review.profile_checks || typeof review.profile_checks !== 'object') {
    maskedRuleIds.push('profile_checks');
  } else {
    if (!profileCheckSatisfied(review.profile_checks.counterexample_search, Boolean(params.counterexample_search))) {
      inspect.push(`[depth_review_contract] FAIL: ${relPath} missing satisfied counterexample_search profile check`);
      agentArtifactIssue = true;
    }
    if (!profileCheckSatisfied(review.profile_checks.cross_verification, Boolean(params.cross_verification))) {
      inspect.push(`[depth_review_contract] FAIL: ${relPath} missing satisfied cross_verification profile check`);
      agentArtifactIssue = true;
    }
  }

  const refsUsable = !missingKeys.has('reviewed_work_unit_refs') && !invalidArrays.has('reviewed_work_unit_refs');
  const refs = refsUsable ? review.reviewed_work_unit_refs : [];
  if (!refsUsable) {
    reviewedBindingIssue = true;
    maskedRuleIds.push('reviewed_work_unit_refs_binding', 'source_claim_cache_mapping', 'source_novelty_floor', 'new_source_floor_comparison');
  }
  else if (refs.length === 0) {
    inspect.push(`[depth_review_contract] FAIL: ${relPath} reviewed_work_unit_refs[] must name submitted work-unit rows`);
    reviewedBindingIssue = true;
    maskedRuleIds.push('source_claim_cache_mapping', 'source_novelty_floor', 'new_source_floor_comparison');
  }
  let submittedRows = [];
  try {
    submittedRows = readSubmittedWorkUnitDeclarations(bundlePath);
  } catch (error) {
    inspect.push(`[depth_review_contract] FAIL: invalid submitted work-unit ledger while checking reviewed_work_unit_refs: ${error.message}`);
    submittedBindingIssue = true;
    maskedRuleIds.push('source_claim_cache_mapping', 'source_novelty_floor', 'new_source_floor_comparison');
  }

  const rowByRef = new Map();
  for (const row of submittedRows) {
    for (const ref of [row.work_id, row.work_unit_ref, row.result_ref]) {
      if (ref) rowByRef.set(ref, row);
    }
  }
  const reviewedRows = [];
  if (!submittedBindingIssue && refsUsable) {
    for (const ref of refs) {
      const canonical = canonicalizeSubmittedWorkUnitRef(ref);
      if (!canonical.safe) {
        inspect.push(`[depth_review_contract] FAIL: ${relPath} reviewed work-unit ref is unsafe: ${ref}`);
        reviewedBindingIssue = true;
        continue;
      }
      if (canonical.changed) {
        diagnostics.push(`[depth_review_contract] canonicalized ${relPath} reviewed_work_unit_refs[] from "${canonical.original}" to "${canonical.canonical}" before submitted-row comparison.`);
      }
      const row = rowByRef.get(canonical.canonical);
      if (!row) {
        inspect.push(`[depth_review_contract] FAIL: ${relPath} reviewed work-unit ref is not submitted on accepted work-unit surfaces: ${canonical.original}${canonical.changed ? ` (canonical: ${canonical.canonical})` : ''}`);
        reviewedBindingIssue = true;
        continue;
      }
      if (!reviewedRows.some((candidate) => candidate.work_id === row.work_id)) reviewedRows.push(row);
    }
  }

  if (!submittedBindingIssue && !reviewedBindingIssue && refsUsable) {
    let resolvedTopicRegistryFact = topicRegistryFact;
    try {
      if (!resolvedTopicRegistryFact?.layouts) resolvedTopicRegistryFact = buildCanonicalTopicRegistryFact(bundlePath);
    } catch (error) {
      reviewedBindingRoot = {
        code: 'wave1_reference_topic_invalid',
        detail: `Current Topic binding is invalid: ${error.message}`,
      };
    }
    if (!reviewedBindingRoot) {
      const resolvedBacking = resolveReviewedWave1SubmittedBacking(bundlePath, {
        topic,
        topicRegistryFact: resolvedTopicRegistryFact,
        review,
      });
      if (!resolvedBacking.ok) reviewedBindingRoot = resolvedBacking.root;
    }
    if (reviewedBindingRoot) {
      inspect.push(`[depth_review_contract] FAIL: ${relPath} submitted current-topic binding failed [${reviewedBindingRoot.code}]: ${reviewedBindingRoot.detail}`);
      reviewedBindingIssue = true;
    }
  }

  if (reviewedBindingIssue) {
    maskedRuleIds.push('source_claim_cache_mapping', 'source_novelty_floor', 'new_source_floor_comparison');
  } else if (!submittedBindingIssue && reviewedRows.length > 0) {
    const claims = reviewedRows.flatMap((row) => row.source_claims || []);
    const mapping = checkSourceClaimCacheMapping(bundlePath, claims, { topic, rows: reviewedRows });
    if (!mapping.passed) {
      inspect.push(...mapping.inspect);
      supplementaryWorkIssue = true;
    }
    advice.push(...mapping.advice);

    const wave0Urls = readWave0SourceUrls(bundlePath, topic);
    const seenNew = new Set();
    for (const claim of claims.filter(isAcceptedSourceClaim)) {
      const url = sourceClaimUrl(claim);
      if (!url) continue;
      const exactNew = !wave0Urls.has(url);
      if ((claim.is_new_vs_wave0 === true) !== exactNew) {
        diagnostics.push(`[depth_review_projection_drift] ignored submitted is_new_vs_wave0=${claim.is_new_vs_wave0} for ${url}; Engine-derived exact-new=${exactNew}.`);
      }
      if (exactNew) seenNew.add(url);
    }
    const observed = seenNew.size;
    if (floor.ok && observed < floor.required) {
      inspect.push(`[source_novelty_floor] FAIL: ${topic} observed ${observed} new accepted source URL(s), required ${floor.required}`);
      advice.push(`Enqueue supplementary wave1_topic_deepening for ${topic} with genuinely new source URLs.`);
      supplementaryWorkIssue = true;
    }

    const legacyProjectionKeys = ['wave0_source_urls', 'source_claims', 'new_source_urls', 'new_source_floor']
      .filter((key) => Object.hasOwn(review, key));
    if (legacyProjectionKeys.length > 0) {
      diagnostics.push(`[depth_review_projection_drift] ignored non-authoritative legacy projection field(s) for verdict: ${legacyProjectionKeys.join(', ')}; reviewed submitted rows, Wave0 source authority, and profile parameters were derived directly.`);
    }
  }

  let focusCoverage = evaluateWave1FocusCoverage(bundlePath, {
    topic,
    review,
    topicRegistryFact,
  });
  if (!focusCoverage.passed) {
    inspect.push(...focusCoverage.inspect);
    agentArtifactIssue = true;
  } else if (focusCoverage.status === 'limited' && supplementaryWorkIssue) {
    const detail = '[focus_coverage] FAIL: a limited commitment contradicts an existing Wave1 supplementary repair root.';
    inspect.push(detail);
    focusCoverage = {
      ...focusCoverage,
      passed: false,
      status: 'invalid',
      outcome: null,
      inspect: [detail],
      issues: [{ code: 'focus_coverage_repair_available', detail }],
    };
    agentArtifactIssue = true;
  }

  if (agentArtifactIssue) findings.push(depthFinding(rule, {
    defaultRuleId: 'per_topic_depth_review_contract',
    id: `${rule?.id || 'per_topic_depth_review_contract'}:${topic}:depth_review_content`,
    blockingBasis: 'required_structure',
    surface: filePath,
    expected: 'The depth review satisfies its required identity, arrays, judgments, decision closure and submitted-ref binding shape.',
    observed: { contract_violations: true },
    missingFact: `${relPath} violates one or more direct depth-review structure or binding facts; inspect detail names the exact field(s).`,
    repairKind: 'agent_action',
    writeTo: filePath,
    repair: `Repair the named depth-review fields in ${relPath}.`,
    detail: inspect.join('; '),
  }));
  if (reviewedBindingIssue) findings.push(depthFinding(rule, {
    defaultRuleId: 'per_topic_depth_review_contract',
    id: `${rule?.id || 'per_topic_depth_review_contract'}:${topic}:reviewed_work_unit_refs_binding`,
    blockingBasis: 'binding_integrity',
    surface: filePath,
    expected: 'reviewed_work_unit_refs[] resolves to hash-valid submitted Wave1 rows whose immutable manifest binds the current Topic.',
    observed: {
      reviewed_work_unit_refs: refs,
      binding_root: reviewedBindingRoot?.code || null,
    },
    missingFact: reviewedBindingRoot
      ? `${relPath} cannot use its reviewed work-unit refs for ${topic}: [${reviewedBindingRoot.code}] ${reviewedBindingRoot.detail}`
      : `${relPath} has an unsafe, empty, or unresolved reviewed_work_unit_refs[] binding; derived source/cache/novelty checks were not run.`,
    repairKind: 'missing_contract',
    writeTo: `Submitted Wave1 current-topic backing/replacement owner boundary for ${topic}`,
    repair: `Do not invent reviewed_work_unit_refs[]. No existing legal submitted-work or replacement owner is established by this failure path; preserve the no-path and rerun Wave1 inspect only after one becomes available.`,
    detail: reviewedBindingRoot
      ? `[${reviewedBindingRoot.code}] ${reviewedBindingRoot.detail}`
      : inspect.filter((line) => /reviewed work-unit ref|reviewed_work_unit_refs/.test(line)).join('; '),
  }));
  if (profileDecisionIssue) findings.push(depthFinding(rule, {
    defaultRuleId: 'per_topic_depth_review_contract',
    id: `${rule?.id || 'per_topic_depth_review_contract'}:${topic}:profile_floor`,
    blockingBasis: 'recorded_human_decision',
    surface: resolvePath(bundlePath, 'rb_profile.yaml'),
    expected: 'Recorded research-style parameters define the Wave1 new-source floor.',
    observed: { profile_floor_available: false },
    missingFact: `Wave1 cannot derive the required new-source floor for ${topic} from the recorded profile parameters.`,
    repairKind: profile?.research_profile && profile.research_profile !== 'not_selected' ? 'engine_operation' : 'user_decision',
    writeTo: profile?.research_profile && profile.research_profile !== 'not_selected'
      ? `node DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs --bundle ${resolvePath(bundlePath)} --style ${profile.research_profile}`
      : 'phases/phase-hitl1.md research-style parameter decision owner',
    repair: profile?.research_profile && profile.research_profile !== 'not_selected'
      ? 'Recompute the complete recorded research style through apply-research-style.mjs, then rerun Wave1 inspect.'
      : 'The existing HITL1 owner must record a research-profile decision before style computation and Wave1 inspect can rerun.',
    detail: floor?.inspect?.join('; ') || `[${rule?.id || 'per_topic_depth_review_contract'}] missing profile parameter for Wave1 floor derivation.`,
  }));
  if (submittedBindingIssue) findings.push(depthFinding(rule, {
    defaultRuleId: 'per_topic_depth_review_contract',
    id: `${rule?.id || 'per_topic_depth_review_contract'}:${topic}:submitted_ledger`,
    blockingBasis: 'authority_integrity',
    surface: resolvePath(bundlePath, 'rb_output_declarations.jsonl'),
    expected: 'Schema-valid and hash-valid submitted work-unit rows for reviewed_work_unit_refs[].',
    observed: { submitted_ledger_valid: false },
    missingFact: `Wave1 depth review for ${topic} cannot validate reviewed work-unit refs because submitted declaration authority is invalid.`,
    repairKind: 'missing_contract',
    writeTo: 'Submitted declaration integrity boundary for Wave1 depth review',
    repair: 'Restore submitted declaration integrity through the work-unit Engine owner.',
    detail: inspect.join('; '),
  }));
  if (supplementaryWorkIssue) findings.push(depthFinding(rule, {
    defaultRuleId: 'per_topic_depth_review_contract',
    id: `${rule?.id || 'per_topic_depth_review_contract'}:${topic}:supplementary_work`,
    blockingBasis: 'required_floor',
    surface: filePath,
    expected: 'Reviewed submitted Wave1 evidence satisfies cache mapping, decision closure and the profile-derived new-source floor.',
    observed: { supplementary_work_required: true },
    missingFact: `Topic ${topic} still requires legal supplementary Wave1 work to satisfy submitted source/cache or new-source-floor facts.`,
    repairKind: 'engine_operation',
    writeTo: `operate-queue enqueue plus operate-work-unit claim/submit for supplementary wave1_topic_deepening topic ${topic}`,
    repair: `Enqueue and execute supplementary wave1_topic_deepening for ${topic}, then update the depth review from submitted facts.`,
    detail: inspect.join('; '),
  }));

  return {
    ...issueResult(inspect, advice, findings),
    diagnostics,
    focus_coverage: focusCoverage,
    masked_rule_ids: [...new Set(maskedRuleIds)],
  };
}

// @impl RRM-007

export function depthDimensionCovered(value) {
  if (!value || typeof value !== 'object') return false;
  return COVERED_STATUSES.has(String(value.status || '').trim().toLowerCase()) && Array.isArray(value.refs);
}

export function profileCheckSatisfied(value, required) {
  if (!required) return true;
  if (!value || typeof value !== 'object') return false;
  const status = String(value.status || '').trim().toLowerCase();
  return COVERED_STATUSES.has(status) && Array.isArray(value.refs);
}
