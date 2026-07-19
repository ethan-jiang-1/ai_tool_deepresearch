// wave-depth-contracts.mjs — deterministic Wave1/Wave2 depth-adjacent checks
// @impl WAI-005, WAI-008, RWG-002, RWG-003, RWG-017, WTS-004, WTS-008, WTS-009, WTS-010, CRC-007, WPG-003, WPG-005, WPG-012

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve as resolvePath } from 'node:path';
import { parse as parseYaml } from 'yaml';

import {
  readBundlePlan,
  readBundleProfile,
  readSubmittedWorkUnitDeclarations,
} from './gate-helpers-readers.mjs';
import { inspectCacheLeaf } from './cache-leaf-contract.mjs';
import { evaluateTopicLayouts } from './topic-layout.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';

const DEPTH_DECISIONS = new Set(['accept', 'supplement_required', 'blocked_contract']);
const ACCEPTED_SOURCE_STATUSES = new Set(['accepted', 'countable', 'accepted_countable']);
const COVERED_STATUSES = new Set(['covered', 'satisfied', 'complete', 'completed', 'attempted', 'not_required']);
const W2_TYPES = new Set(['wave1_legacy_question', 'cross_topic_resolution', 'cross_topic_emergent_question']);
const W2_PRIORITIES = new Set(['p0', 'p1', 'p2']);
const W2_STATUSES = new Set(['resolved', 'partial', 'open', 'deferred']);
const W2_DECISIONS = new Set(['use_existing_evidence', 'exploit_search', 'explore_search', 'defer_hitl2', 'requires_internal_data', 'record_only']);
const W2_CONFIDENCE = new Set(['high', 'medium', 'low', 'uncertain']);
const W2_GAP_STATUS = new Set(['no_gap', 'needs_search', 'search_submitted', 'deferred_hitl2', 'requires_internal_data', 'record_only']);
const W2_CROSS_REF_OMISSION_RE = /(?:non[-_ ]?consumer|not[-_ ]?consumer[-_ ]?facing|process[-_ ]?only|internal|defer(?:red)?|limitation|not[-_ ]?source[-_ ]?backed)/i;

function safeRel(ref) {
  return typeof ref === 'string' && ref.length > 0 && !ref.startsWith('/') && !ref.split(/[\\/]+/).includes('..');
}

export function exactUrlKey(url) {
  return String(url || '').trim();
}

export function normalizeUrlForCacheMapping(url) {
  try {
    const parsed = new URL(String(url || '').trim());
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return String(url || '').trim();
  }
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function cacheTrailStatus(bundlePath, trail) {
  if (!safeRel(trail)) return { ok: false, reason: `unsafe cache trail path: ${trail}` };
  const dir = join(bundlePath, trail);
  if (!existsSync(dir)) return { ok: false, reason: `cache trail directory missing: ${trail}` };
  if (!statSync(dir).isDirectory()) return { ok: false, reason: `cache trail is not a directory: ${trail}` };
  const availableFiles = readdirSync(dir).filter((file) => statSync(join(dir, file)).isFile());
  const pageText = existsSync(join(dir, 'page.md')) ? readFileSync(join(dir, 'page.md'), 'utf-8') : '';
  const meta = existsSync(join(dir, 'meta.json')) ? readJsonSafe(join(dir, 'meta.json')) : null;
  const result = inspectCacheLeaf({ availableFiles, pageText, meta });
  if (!result.ok) return { ok: false, reason: `cache trail ${trail} ${result.issue}` };
  return { ok: true, degraded: result.degraded, urls: result.urls, source_slug: result.source_slug };
}

function isAcceptedSourceClaim(claim) {
  const status = String(claim?.acceptance_status || '').trim().toLowerCase();
  return ACCEPTED_SOURCE_STATUSES.has(status);
}

function sourceClaimUrl(claim) {
  return exactUrlKey(claim?.url);
}

function readYamlObject(filePath) {
  const parsed = parseYaml(readFileSync(filePath, 'utf-8'));
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}

function issueResult(inspect, advice = [], findings = []) {
  return { passed: inspect.length === 0, inspect, advice, findings };
}

function depthFinding(rule, {
  defaultRuleId,
  id,
  blockingBasis,
  surface,
  expected,
  observed,
  missingFact,
  repairKind,
  writeTo,
  repair,
  detail,
}) {
  const ruleId = rule?.id || defaultRuleId;
  return makeContractFinding({
    id,
    ruleId,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis,
    surface,
    expected,
    observed,
    missingFact,
    repairKind,
    writeTo,
    repair,
    detail,
  });
}

function canonicalizeSubmittedWorkUnitRef(ref) {
  if (!safeRel(ref)) return { safe: false, original: ref, canonical: null, changed: false };
  const canonical = String(ref).replace(/\/+$/g, '');
  return {
    safe: true,
    original: ref,
    canonical,
    changed: canonical !== ref,
  };
}

export function readWave0SourceUrls(bundlePath, topicSlug) {
  const urls = new Set();
  const sourcePath = join(bundlePath, 'artifacts', 'wave0', topicSlug, 'source.yaml');
  if (existsSync(sourcePath)) {
    try {
      const parsed = parseYaml(readFileSync(sourcePath, 'utf-8'));
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (exactUrlKey(entry?.url)) urls.add(exactUrlKey(entry.url));
        }
      }
    } catch {
      // The Wave0 gate owns source.yaml parse failure. This helper only uses it if readable.
    }
  }
  return urls;
}

export function deriveWave1NewSourceFloor(profile) {
  const params = profile?.research_style_params;
  const missing = [];
  if (!params || typeof params !== 'object') {
    missing.push('research_style_params');
  } else {
    if (!Number.isFinite(Number(params.wave1_per_topic_ref_floor))) missing.push('research_style_params.wave1_per_topic_ref_floor');
    if (!Number.isFinite(Number(params.topic_unique_ratio))) missing.push('research_style_params.topic_unique_ratio');
  }
  if (missing.length > 0) {
    return {
      ok: false,
      code: 'missing_profile_parameter',
      missing,
      inspect: [`[missing_profile_parameter] Missing required Wave1 new-source floor parameter(s): ${missing.join(', ')}`],
    };
  }
  const perTopicFloor = Number(params.wave1_per_topic_ref_floor);
  const topicUniqueRatio = Number(params.topic_unique_ratio);
  if (perTopicFloor <= 0 || topicUniqueRatio < 0 || topicUniqueRatio > 1) {
    return {
      ok: false,
      code: 'missing_profile_parameter',
      missing: ['research_style_params.wave1_per_topic_ref_floor/topic_unique_ratio'],
      inspect: [`[missing_profile_parameter] Invalid Wave1 floor parameter values: wave1_per_topic_ref_floor=${params.wave1_per_topic_ref_floor}, topic_unique_ratio=${params.topic_unique_ratio}`],
    };
  }
  return {
    ok: true,
    required: Math.max(1, Math.ceil(perTopicFloor * topicUniqueRatio)),
    source: 'ceil(wave1_per_topic_ref_floor * topic_unique_ratio)',
  };
}

function submittedMaps(bundlePath, selectedRows = null) {
  const rows = selectedRows || readSubmittedWorkUnitDeclarations(bundlePath);
  const cacheTrails = new Set();
  const outputPaths = new Map();
  const cacheTrailRows = new Map();
  for (const row of rows) {
    for (const trail of row.cache_trails || []) {
      cacheTrails.add(trail);
      cacheTrailRows.set(trail, row);
    }
    for (const output of row.output_files || []) {
      outputPaths.set(output.path, row);
    }
  }
  return { rows, cacheTrails, outputPaths, cacheTrailRows };
}

function workUnitLabel(row) {
  return row?.work_id ? ` (work_id: ${row.work_id})` : '';
}

export function checkSourceClaimCacheMapping(bundlePath, claims, { topic = null, rows = null } = {}) {
  const inspect = [];
  const advice = [];
  let maps;
  try {
    maps = submittedMaps(bundlePath, rows);
  } catch (error) {
    return {
      passed: false,
      inspect: [`[source_claim_cache_mapping] FAIL: invalid submitted work-unit ledger: ${error.message}`],
      advice: ['Repair work-unit ledger/index/hash drift before rerunning the gate.'],
    };
  }

  for (const claim of claims || []) {
    if (!isAcceptedSourceClaim(claim)) continue;
    const url = sourceClaimUrl(claim);
    const label = topic ? `${topic} ${url}` : url;
    if (!url) {
      inspect.push(`[source_claim_cache_mapping] FAIL: accepted source claim lacks url${topic ? ` (topic: ${topic})` : ''}`);
      continue;
    }
    const sourceRow = claim.source_ref ? maps.outputPaths.get(claim.source_ref) : null;
    if (!claim.source_ref || !safeRel(claim.source_ref)) {
      inspect.push(`[source_claim_cache_mapping] FAIL: accepted source claim ${label} lacks safe source_ref`);
    } else if (!sourceRow) {
      inspect.push(`[source_claim_cache_mapping] FAIL: accepted source claim ${label} source_ref is not covered by submitted work-unit output: ${claim.source_ref}`);
    }

    const refs = Array.isArray(claim.cache_trail_refs) ? claim.cache_trail_refs.filter(Boolean) : [];
    const degradedRef = claim.degraded_capture_ref || null;
    if (refs.length === 0 && !degradedRef) {
      inspect.push(`[source_claim_cache_mapping] FAIL: accepted source claim ${label} has no cache_trail_refs[] or degraded_capture_ref`);
      continue;
    }

    const allRefs = [...refs, ...(degradedRef ? [degradedRef] : [])];
    let mapped = false;
    for (const trail of allRefs) {
      if (!maps.cacheTrails.has(trail)) {
        inspect.push(`[source_claim_cache_mapping] FAIL: accepted source claim ${label} cache trail is not in a submitted ledger row: ${trail}`);
        continue;
      }
      const cacheRow = maps.cacheTrailRows.get(trail);
      const status = cacheTrailStatus(bundlePath, trail);
      if (!status.ok) {
        inspect.push(`[source_claim_cache_mapping] FAIL: accepted source claim ${label} cache trail invalid${workUnitLabel(cacheRow || sourceRow)}: ${status.reason}`);
        continue;
      }
      if (trail === degradedRef && !status.degraded) {
        inspect.push(`[source_claim_cache_mapping] FAIL: degraded_capture_ref for ${label} does not record an explicit degraded/fetch-failure reason${workUnitLabel(cacheRow || sourceRow)}: ${trail}`);
        continue;
      }
      const normalizedClaimUrl = normalizeUrlForCacheMapping(url);
      if (status.urls.length > 0 && !status.urls.includes(normalizedClaimUrl)) {
        inspect.push(`[source_claim_cache_mapping] FAIL: accepted source claim ${label} cache trail ${trail} maps to different URL(s)${workUnitLabel(cacheRow || sourceRow)}: ${status.urls.join(', ')}`);
        continue;
      }
      mapped = true;
    }
    if (!mapped) {
      advice.push(`Repair accepted source claim ${label} by submitting a matching cache leaf or explicit degraded-capture record through a work unit.`);
    }
  }
  return issueResult(inspect, advice);
}

function depthDimensionCovered(value) {
  if (!value || typeof value !== 'object') return false;
  return COVERED_STATUSES.has(String(value.status || '').trim().toLowerCase()) && Array.isArray(value.refs);
}

function profileCheckSatisfied(value, required) {
  if (!required) return true;
  if (!value || typeof value !== 'object') return false;
  const status = String(value.status || '').trim().toLowerCase();
  return COVERED_STATUSES.has(status) && Array.isArray(value.refs);
}

export function checkWave1DepthReviewContract(bundlePath, { topic, rule = null }) {
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
    expected: 'reviewed_work_unit_refs[] resolves to hash-valid submitted Wave1 declaration rows.',
    observed: { reviewed_work_unit_refs: refs },
    missingFact: `${relPath} has an unsafe, empty, or unresolved reviewed_work_unit_refs[] binding; derived source/cache/novelty checks were not run.`,
    repairKind: 'agent_action',
    writeTo: `${filePath}#reviewed_work_unit_refs`,
    repair: `Replace reviewed_work_unit_refs[] with exact submitted work-unit refs for ${topic}, then rerun Wave1 inspect.`,
    detail: inspect.filter((line) => /reviewed work-unit ref|reviewed_work_unit_refs/.test(line)).join('; '),
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
      ? `node DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle ${resolvePath(bundlePath)} --style ${profile.research_profile}`
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

  return { ...issueResult(inspect, advice, findings), diagnostics, masked_rule_ids: [...new Set(maskedRuleIds)] };
}

// @impl RRM-007
export function loadWave2FindingIndexFact(bundlePath) {
  const relPath = 'artifacts/wave2/finding-index.yaml';
  const filePath = join(bundlePath, relPath);
  if (!existsSync(filePath)) return { ok: false, kind: 'missing', relPath, inspect: [`[finding_index_contract] FAIL: missing ${relPath}`] };
  try {
    const data = readYamlObject(filePath);
    if (!data) return { ok: false, kind: 'object_shape', relPath, inspect: [`[finding_index_contract] FAIL: ${relPath} must be a YAML object`] };
    return { ok: true, relPath, data };
  } catch (error) {
    return { ok: false, kind: 'yaml_parse', observed: error.message, relPath, inspect: [`[finding_index_contract] FAIL: YAML parse error in ${relPath}: ${error.message}`] };
  }
}

function pairKey(left, right) {
  return [left, right].sort().join('\u0000');
}

export function evaluateWave2PairFacts(plan, indexData) {
  const registry = Array.isArray(plan?.topic_registry) ? plan.topic_registry : [];
  const layouts = evaluateTopicLayouts(registry).referenceLayouts;
  const canonical = layouts.map((layout) => ({
    key: layout.topic_uid || `legacy:${layout.current.id}:${layout.current.slug}`,
    slug: layout.current.slug,
    tokens: [layout.topic_uid, layout.current.slug, ...layout.previous.map((item) => item.slug)].filter(Boolean),
  }));
  const keyToSlug = new Map(canonical.map((topic) => [topic.key, topic.slug]));
  const tokenOwners = new Map();
  for (const topic of canonical) {
    for (const token of topic.tokens) {
      if (!tokenOwners.has(token)) tokenOwners.set(token, new Set());
      tokenOwners.get(token).add(topic.key);
    }
  }
  const expectedPairKeys = [];
  for (let left = 0; left < canonical.length; left += 1) {
    for (let right = left + 1; right < canonical.length; right += 1) {
      expectedPairKeys.push(pairKey(canonical[left].key, canonical[right].key));
    }
  }

  const issues = [];
  const scan = indexData?.scan;
  const eligibility = indexData?.synthesis_eligibility;
  if (!scan || typeof scan !== 'object' || Array.isArray(scan)) {
    issues.push({ code: 'pair_scan_parent_invalid', detail: 'scan must be an object' });
  }
  if (!eligibility || typeof eligibility !== 'object' || Array.isArray(eligibility)
      || !Object.prototype.hasOwnProperty.call(eligibility, 'scan_topic_pair_coverage')) {
    issues.push({ code: 'pair_coverage_parent_invalid', detail: 'synthesis_eligibility.scan_topic_pair_coverage is required' });
  }
  if (issues.length > 0) {
    return { usable: false, complete: false, issues, expected_count: expectedPairKeys.length, expected_pair_keys: expectedPairKeys };
  }

  const rawContainer = eligibility.scan_topic_pair_coverage;
  let entries;
  if (Array.isArray(rawContainer)) entries = rawContainer;
  else if (rawContainer && typeof rawContainer === 'object' && !Array.isArray(rawContainer)
      && Object.keys(rawContainer).length === 1 && Array.isArray(rawContainer.pairs)) entries = rawContainer.pairs;
  else {
    return {
      usable: false,
      complete: false,
      issues: [{ code: 'pair_container_invalid', detail: 'scan_topic_pair_coverage must be an array or { pairs: [...] }' }],
      expected_count: expectedPairKeys.length,
      expected_pair_keys: expectedPairKeys,
    };
  }

  const observed = new Map();
  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
        || Object.keys(entry).some((key) => !['pair', 'refs'].includes(key))
        || !Array.isArray(entry.pair) || entry.pair.length !== 2
        || entry.pair.some((token) => typeof token !== 'string' || !token.trim())
        || (Object.prototype.hasOwnProperty.call(entry, 'refs') && !Array.isArray(entry.refs))) {
      issues.push({ code: 'pair_entry_invalid', index, detail: `pair entry ${index} must use { pair: [topicA, topicB], refs?: [...] }` });
      return;
    }
    const resolved = entry.pair.map((token) => {
      const owners = tokenOwners.get(token);
      return owners?.size === 1 ? [...owners][0] : null;
    });
    if (resolved.some((key) => key === null)) {
      issues.push({ code: 'pair_topic_unknown', index, detail: `pair entry ${index} contains an unknown or ambiguous topic token` });
      return;
    }
    if (resolved[0] === resolved[1]) {
      issues.push({ code: 'pair_self_invalid', index, detail: `pair entry ${index} resolves both endpoints to ${keyToSlug.get(resolved[0])}` });
      return;
    }
    const key = pairKey(resolved[0], resolved[1]);
    if (observed.has(key)) {
      issues.push({ code: 'pair_duplicate_invalid', index, detail: `pair entry ${index} duplicates ${observed.get(key).join(' / ')}` });
      return;
    }
    observed.set(key, resolved.map((keyValue) => keyToSlug.get(keyValue)).sort());
  });
  if (issues.length > 0) {
    return { usable: false, complete: false, issues, expected_count: expectedPairKeys.length, expected_pair_keys: expectedPairKeys };
  }

  const topicCount = canonical.length;
  const checkedCount = scan.pair_count_checked;
  if (!Number.isInteger(scan.topic_count) || scan.topic_count !== topicCount) {
    issues.push({ code: 'pair_topic_count_mismatch', detail: `scan.topic_count=${scan.topic_count}; canonical topic count=${topicCount}` });
  }
  if (!Number.isInteger(scan.pair_count_expected) || scan.pair_count_expected !== expectedPairKeys.length) {
    issues.push({ code: 'pair_count_expected_mismatch', detail: `scan.pair_count_expected=${scan.pair_count_expected}; canonical expected=${expectedPairKeys.length}` });
  }
  if (!Number.isInteger(checkedCount) || checkedCount < 0 || checkedCount > expectedPairKeys.length) {
    issues.push({ code: 'pair_count_checked_bounds', detail: `scan.pair_count_checked=${checkedCount}; expected integer in 0..${expectedPairKeys.length}` });
  } else if (checkedCount !== observed.size) {
    issues.push({ code: 'pair_count_checked_mismatch', detail: `scan.pair_count_checked=${checkedCount}; observed unique pairs=${observed.size}` });
  }
  if (topicCount > 1 && observed.size === 0) {
    issues.push({ code: 'pair_scan_empty', detail: 'multi-topic Wave2 requires at least one structured checked pair' });
  }
  const observedPairKeys = [...observed.keys()].sort();
  const expectedSet = new Set(expectedPairKeys);
  const missingPairKeys = expectedPairKeys.filter((key) => !observed.has(key));
  return {
    usable: issues.length === 0,
    complete: issues.length === 0 && observed.size === expectedSet.size && missingPairKeys.length === 0,
    issues,
    topic_count: topicCount,
    expected_count: expectedPairKeys.length,
    observed_count: observed.size,
    expected_pair_keys: [...expectedPairKeys].sort(),
    observed_pair_keys: observedPairKeys,
    observed_pairs: observedPairKeys.map((key) => observed.get(key)),
    missing_pairs: missingPairKeys.map((key) => key.split('\u0000').map((keyValue) => keyToSlug.get(keyValue)).sort()),
  };
}

function submittedWave2ReceiptRefs(bundlePath) {
  try {
    return new Set(readSubmittedWorkUnitDeclarations(bundlePath)
      .filter((row) => row.wave === 2)
      .map((row) => row.runtime_receipt_ref));
  } catch {
    return new Set();
  }
}

function crossReferenceRefsForFinding(bundlePath, findingId) {
  const referenceDir = join(bundlePath, 'reference');
  if (!existsSync(referenceDir) || !statSync(referenceDir).isDirectory()) return [];
  const id = String(findingId || '').toLowerCase();
  const refs = [];
  for (const entry of readdirSync(referenceDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.startsWith('00-cross-') || !entry.name.endsWith('.md')) continue;
    const relPath = `reference/${entry.name}`;
    if (entry.name.toLowerCase().includes(id)) {
      refs.push(relPath);
      continue;
    }
    try {
      const content = readFileSync(join(referenceDir, entry.name), 'utf-8');
      if (content.includes(findingId)) refs.push(relPath);
    } catch { /* ignore unreadable candidate */ }
  }
  return refs;
}

function explicitCrossReferenceOmissionReason(finding) {
  const candidates = [
    finding?.consumer_reference_omission_reason,
    finding?.cross_reference_omission_reason,
    finding?.omission_reason,
    finding?.limitation_reason,
  ].filter((value) => typeof value === 'string' && value.trim());
  return candidates.find((value) => W2_CROSS_REF_OMISSION_RE.test(value)) || null;
}

function consumerFacingBackedFindingNeedsCrossRef(finding, backingRefs) {
  if (finding?.appears_in_synthesis !== true) return false;
  if (!Array.isArray(backingRefs) || backingRefs.length === 0) return false;
  if (['defer_hitl2', 'requires_internal_data', 'record_only'].includes(finding?.decision)) return false;
  if (['needs_search', 'deferred_hitl2', 'requires_internal_data', 'record_only'].includes(finding?.gap_status)) return false;
  return true;
}

export function checkWave2FindingIndexContract(bundlePath, { rule = null, loadedFact = null } = {}) {
  const loaded = loadedFact || loadWave2FindingIndexFact(bundlePath);
  if (!loaded.ok) {
    const filePath = resolvePath(bundlePath, loaded.relPath);
    const missing = loaded.kind === 'missing';
    return {
      passed: false,
      inspect: loaded.inspect,
      advice: ['Repair finding-index.yaml before rerunning Wave2 gate.'],
      findings: [depthFinding(rule, {
        defaultRuleId: 'finding_index_contract',
        id: `${rule?.id || 'finding_index_contract'}:${loaded.kind}`,
        blockingBasis: missing ? 'required_structure' : 'authority_integrity',
        surface: filePath,
        expected: 'A parseable YAML object satisfying the Wave2 finding-index contract.',
        observed: loaded.observed || { exists: !missing, object_shape: loaded.kind === 'object_shape' },
        missingFact: missing
          ? `${loaded.relPath} is missing.`
          : `${loaded.relPath} does not provide a parseable YAML object${loaded.observed ? `: ${loaded.observed}` : '.'}`,
        repairKind: 'agent_action',
        writeTo: filePath,
        repair: `Repair ${loaded.relPath} as the accepted Wave2 finding-index YAML object.`,
        detail: loaded.inspect[0],
      })],
    };
  }
  const { data, relPath } = loaded;
  const inspect = [];
  const advice = [];
  const rootFindings = [];
  const maskedRuleIds = [];
  let contentIssue = false;
  let profileDecisionIssue = false;
  let pairFacts = null;

  const missingTopLevel = new Set();
  for (const key of ['version', 'source_layer', 'ledger', 'synthesis', 'scan', 'findings', 'synthesis_eligibility']) {
    if (!(key in data)) {
      missingTopLevel.add(key);
      inspect.push(`[finding_index_contract] FAIL: ${relPath} missing top-level key: ${key}`);
    }
  }
  if (missingTopLevel.size > 0) contentIssue = true;

  const eligibilityUsable = !missingTopLevel.has('synthesis_eligibility') && data.synthesis_eligibility && typeof data.synthesis_eligibility === 'object';
  const eligibility = eligibilityUsable ? data.synthesis_eligibility : {};
  const missingEligibility = new Set();
  if (!eligibilityUsable) {
    maskedRuleIds.push('synthesis_eligibility');
    contentIssue = true;
  } else {
    for (const key of ['pure_synthesis_eligible', 'scan_matrix_present', 'scan_topic_pair_coverage', 'unresolved_search_required_count', 'targeted_search_required_count', 'targeted_search_submitted_count', 'explicit_deferral_count', 'profile_params_read', 'ineligibility_reasons']) {
      if (!(key in eligibility)) {
        missingEligibility.add(key);
        inspect.push(`[synthesis_eligibility] FAIL: ${relPath} synthesis_eligibility missing key: ${key}`);
      }
    }
    if (missingEligibility.size > 0) contentIssue = true;
  }

  if (eligibilityUsable && !missingEligibility.has('scan_matrix_present') && eligibility.scan_matrix_present !== true) {
    inspect.push('[synthesis_eligibility] FAIL: scan_matrix_present must be true before Wave2 pass');
    contentIssue = true;
  }

  if (missingTopLevel.has('scan') || !data.scan || typeof data.scan !== 'object') {
    maskedRuleIds.push('scan_pair_coverage');
    contentIssue = true;
  } else {
    pairFacts = evaluateWave2PairFacts(readBundlePlan(bundlePath), data);
    if (!pairFacts.usable) {
      for (const issue of pairFacts.issues) inspect.push(`[scan_pair_coverage] FAIL: ${issue.code}: ${issue.detail}`);
      contentIssue = true;
    }
  }

  const findingsUsable = !missingTopLevel.has('findings') && Array.isArray(data.findings);
  const findings = findingsUsable ? data.findings : [];
  if (!missingTopLevel.has('findings') && !Array.isArray(data.findings)) {
    inspect.push(`[finding_index_contract] FAIL: ${relPath} findings must be an array`);
    contentIssue = true;
  }
  if (!findingsUsable) {
    maskedRuleIds.push('per_finding_contract', 'derived_finding_counts');
    contentIssue = true;
  }

  const profile = readBundleProfile(bundlePath);
  const independentBackingFloor = Number(profile?.research_style_params?.p0p1_independent_backing);
  const needsBackingFloor = findings.some((finding) => finding?.confidence === 'high' || ['p0', 'p1'].includes(finding?.priority));
  if (needsBackingFloor && (!Number.isFinite(independentBackingFloor) || independentBackingFloor <= 0)) {
    inspect.push('[missing_profile_parameter] Missing required Wave2 profile parameter: research_style_params.p0p1_independent_backing');
    profileDecisionIssue = true;
  }

  const submittedReceipts = submittedWave2ReceiptRefs(bundlePath);
  let needsSearchCount = 0;
  let targetedRequiredCount = 0;
  let targetedSubmittedCount = 0;
  let explicitDeferralCount = 0;

  let canCountNeedsSearch = findingsUsable;
  let canCountTargetedRequired = findingsUsable;
  let canCountTargetedSubmitted = findingsUsable;
  let canCountExplicitDeferral = findingsUsable;

  for (const finding of findings) {
    const inspectBeforeFinding = inspect.length;
    const id = finding?.id || '<missing-id>';
    const requiredFields = ['id', 'type', 'priority', 'status', 'decision', 'affected_topics', 'origin_refs', 'trigger_refs', 'search_required', 'subagent_receipt_refs', 'appears_in_synthesis', 'hitl2_handoff', 'confidence', 'independent_backing_refs', 'gap_status'];
    const missingFields = new Set();
    for (const key of requiredFields) {
      if (!(key in (finding || {}))) {
        missingFields.add(key);
        inspect.push(`[finding_index_contract] FAIL: finding ${id} missing field: ${key}`);
      }
    }
    if (!missingFields.has('id') && !/^W2F-[0-9]{3}$/.test(String(finding.id))) inspect.push(`[finding_index_contract] FAIL: finding ${id} id must match W2F-xxx`);
    if (!missingFields.has('type') && !W2_TYPES.has(finding.type)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid type: ${finding.type}`);
    if (!missingFields.has('priority') && !W2_PRIORITIES.has(finding.priority)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid priority: ${finding.priority}`);
    if (!missingFields.has('status') && !W2_STATUSES.has(finding.status)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid status: ${finding.status}`);
    if (!missingFields.has('decision') && !W2_DECISIONS.has(finding.decision)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid decision: ${finding.decision}`);
    if (!missingFields.has('confidence') && !W2_CONFIDENCE.has(finding.confidence)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid confidence: ${finding.confidence}`);
    if (!missingFields.has('gap_status') && !W2_GAP_STATUS.has(finding.gap_status)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid gap_status: ${finding.gap_status}`);

    const affected = !missingFields.has('affected_topics') && Array.isArray(finding.affected_topics) ? finding.affected_topics : [];
    const originRefs = !missingFields.has('origin_refs') && Array.isArray(finding.origin_refs) ? finding.origin_refs : [];
    const triggerRefs = !missingFields.has('trigger_refs') && Array.isArray(finding.trigger_refs) ? finding.trigger_refs : [];
    const receiptRefs = !missingFields.has('subagent_receipt_refs') && Array.isArray(finding.subagent_receipt_refs) ? finding.subagent_receipt_refs : [];
    const backingRefs = !missingFields.has('independent_backing_refs') && Array.isArray(finding.independent_backing_refs) ? finding.independent_backing_refs : [];

    if (finding?.type === 'cross_topic_resolution') {
      if (!missingFields.has('origin_refs') && originRefs.length === 0) inspect.push(`[finding_index_contract] FAIL: cross_topic_resolution ${id} requires origin_refs[]`);
      if (!missingFields.has('trigger_refs') && triggerRefs.length === 0) inspect.push(`[finding_index_contract] FAIL: cross_topic_resolution ${id} requires trigger_refs[]`);
      if (!missingFields.has('search_required') && finding.search_required !== false) inspect.push(`[finding_index_contract] FAIL: cross_topic_resolution ${id} must have search_required: false`);
    }
    if (finding?.type === 'cross_topic_emergent_question' && !missingFields.has('affected_topics') && affected.length < 2) {
      inspect.push(`[finding_index_contract] FAIL: cross_topic_emergent_question ${id} requires affected_topics.length >= 2`);
    }
    if (missingFields.has('decision')) canCountTargetedRequired = canCountExplicitDeferral = false;
    if (missingFields.has('gap_status')) canCountNeedsSearch = canCountTargetedSubmitted = false;
    if (!missingFields.has('decision') && ['exploit_search', 'explore_search'].includes(finding.decision)) {
      targetedRequiredCount += 1;
      if (missingFields.has('search_required')) maskedRuleIds.push(`${id}:decision_search_required`);
      else if (finding.search_required !== true) inspect.push(`[finding_index_contract] FAIL: finding ${id} decision=${finding.decision} implies search_required=true`);
    }
    if (!missingFields.has('decision') && ['defer_hitl2', 'requires_internal_data'].includes(finding.decision)) {
      explicitDeferralCount += 1;
      if (missingFields.has('hitl2_handoff')) maskedRuleIds.push(`${id}:decision_hitl2_handoff`);
      else if (finding.hitl2_handoff !== true) inspect.push(`[finding_index_contract] FAIL: finding ${id} decision=${finding.decision} implies hitl2_handoff=true`);
    }
    if (!missingFields.has('decision') && finding.decision === 'record_only') explicitDeferralCount += 1;
    if (!missingFields.has('appears_in_synthesis') && finding.appears_in_synthesis === false && !missingFields.has('decision')) {
      if (missingFields.has('hitl2_handoff')) maskedRuleIds.push(`${id}:synthesis_hitl2_handoff`);
      else if (finding.hitl2_handoff !== true && finding.decision !== 'record_only') {
      inspect.push(`[finding_index_contract] FAIL: finding ${id} appears_in_synthesis=false must be hitl2_handoff=true or decision=record_only`);
      }
    }
    if (!missingFields.has('confidence') && finding.confidence === 'high' && Number.isFinite(independentBackingFloor) && !missingFields.has('independent_backing_refs') && backingRefs.length < independentBackingFloor) {
      inspect.push(`[finding_index_contract] FAIL: finding ${id} confidence=high has ${backingRefs.length} independent_backing_refs, required ${independentBackingFloor}`);
    }
    if (!missingFields.has('search_required') && finding.search_required === true && !missingFields.has('decision') && !missingFields.has('subagent_receipt_refs') && receiptRefs.length === 0 && !['defer_hitl2', 'requires_internal_data', 'record_only'].includes(finding.decision)) {
      inspect.push(`[finding_index_contract] FAIL: finding ${id} search_required=true lacks submitted receipt refs or explicit routing decision`);
    }
    if (!missingFields.has('gap_status') && finding.gap_status === 'needs_search') {
      needsSearchCount += 1;
      if (missingFields.has('decision')) maskedRuleIds.push(`${id}:gap_status_decision`);
      else if (!['exploit_search', 'explore_search'].includes(finding.decision)) {
        inspect.push(`[finding_index_contract] FAIL: finding ${id} gap_status=needs_search requires decision exploit_search/explore_search`);
      }
    }
    if (!missingFields.has('gap_status') && finding.gap_status === 'search_submitted') {
      targetedSubmittedCount += 1;
      if (missingFields.has('subagent_receipt_refs')) maskedRuleIds.push(`${id}:search_submitted_receipts`);
      else if (receiptRefs.length === 0) inspect.push(`[finding_index_contract] FAIL: finding ${id} gap_status=search_submitted requires subagent_receipt_refs[]`);
    }
    for (const ref of receiptRefs) {
      if (!submittedReceipts.has(ref)) inspect.push(`[finding_index_contract] FAIL: finding ${id} subagent receipt ref is not backed by a submitted Wave2 work-unit row: ${ref}`);
    }
    if (![...missingFields].some((field) => ['appears_in_synthesis', 'independent_backing_refs', 'decision', 'gap_status'].includes(field)) && consumerFacingBackedFindingNeedsCrossRef(finding, backingRefs)) {
      const crossRefs = crossReferenceRefsForFinding(bundlePath, id);
      if (crossRefs.length === 0 && !explicitCrossReferenceOmissionReason(finding)) {
        inspect.push(`[cross_reference_materialization] FAIL: finding ${id} is consumer-facing and backed but lacks reference/00-cross-*.md projection or explicit non-consumer/deferred/limitation omission reason`);
      }
    }
    if (!missingFields.has('priority') && !missingFields.has('confidence') && !missingFields.has('gap_status') && ['p0', 'p1'].includes(finding.priority) && ['low', 'uncertain'].includes(finding.confidence)) {
      const routed = ['search_submitted', 'deferred_hitl2', 'requires_internal_data', 'record_only'].includes(finding?.gap_status);
      if (!routed) {
        inspect.push(`[synthesis_eligibility] FAIL: under-backed priority finding ${id} must be submitted, deferred, internal-data routed, or record-only before pure synthesis eligibility`);
      }
    }
    if (inspect.length > inspectBeforeFinding) contentIssue = true;
  }

  if (eligibilityUsable && !missingEligibility.has('pure_synthesis_eligible') && eligibility.pure_synthesis_eligible === true) {
    if (!missingEligibility.has('unresolved_search_required_count') && Number(eligibility.unresolved_search_required_count) !== 0) {
      inspect.push(`[synthesis_eligibility] FAIL: pure_synthesis_eligible=true but unresolved_search_required_count=${eligibility.unresolved_search_required_count}`);
      contentIssue = true;
    }
    if (canCountNeedsSearch && needsSearchCount > 0) {
      inspect.push(`[synthesis_eligibility] FAIL: pure_synthesis_eligible=true but ${needsSearchCount} finding(s) have gap_status=needs_search`);
      contentIssue = true;
    }
  }
  if (eligibilityUsable && canCountNeedsSearch && !missingEligibility.has('unresolved_search_required_count') && Number.isFinite(Number(eligibility.unresolved_search_required_count)) && Number(eligibility.unresolved_search_required_count) !== needsSearchCount) {
    inspect.push(`[synthesis_eligibility] FAIL: unresolved_search_required_count=${eligibility.unresolved_search_required_count} but observed needs_search count is ${needsSearchCount}`);
    contentIssue = true;
  } else if (!canCountNeedsSearch) maskedRuleIds.push('unresolved_search_required_count');
  if (eligibilityUsable && canCountTargetedRequired && !missingEligibility.has('targeted_search_required_count') && Number.isFinite(Number(eligibility.targeted_search_required_count)) && Number(eligibility.targeted_search_required_count) !== targetedRequiredCount) {
    inspect.push(`[synthesis_eligibility] FAIL: targeted_search_required_count=${eligibility.targeted_search_required_count} but observed targeted-search decision count is ${targetedRequiredCount}`);
    contentIssue = true;
  } else if (!canCountTargetedRequired) maskedRuleIds.push('targeted_search_required_count');
  if (eligibilityUsable && canCountTargetedSubmitted && !missingEligibility.has('targeted_search_submitted_count') && Number.isFinite(Number(eligibility.targeted_search_submitted_count)) && Number(eligibility.targeted_search_submitted_count) !== targetedSubmittedCount) {
    inspect.push(`[synthesis_eligibility] FAIL: targeted_search_submitted_count=${eligibility.targeted_search_submitted_count} but observed search_submitted count is ${targetedSubmittedCount}`);
    contentIssue = true;
  } else if (!canCountTargetedSubmitted) maskedRuleIds.push('targeted_search_submitted_count');
  if (eligibilityUsable && canCountExplicitDeferral && !missingEligibility.has('explicit_deferral_count') && Number.isFinite(Number(eligibility.explicit_deferral_count)) && Number(eligibility.explicit_deferral_count) !== explicitDeferralCount) {
    inspect.push(`[synthesis_eligibility] FAIL: explicit_deferral_count=${eligibility.explicit_deferral_count} but observed explicit routing count is ${explicitDeferralCount}`);
    contentIssue = true;
  } else if (!canCountExplicitDeferral) maskedRuleIds.push('explicit_deferral_count');

  if (inspect.length > 0) {
    advice.push('Complete Wave2 scan/triage/gap analysis, submit targeted evidence or route gaps explicitly, then update finding-index.yaml synthesis_eligibility.');
  }
  const filePath = resolvePath(bundlePath, relPath);
  if (contentIssue) rootFindings.push(depthFinding(rule, {
    defaultRuleId: 'finding_index_contract',
    id: `${rule?.id || 'finding_index_contract'}:content`,
    blockingBasis: 'required_structure',
    surface: filePath,
    expected: 'finding-index.yaml satisfies required top-level, per-finding, scan, eligibility, backing and handoff contracts.',
    observed: { contract_violations: true },
    missingFact: `${relPath} violates one or more direct Wave2 finding-index facts; inspect detail names the exact field or finding.`,
    repairKind: 'agent_action',
    writeTo: filePath,
    repair: `Repair the named finding-index facts in ${relPath}, including any required submitted receipt or explicit routing binding.`,
    detail: inspect.join('; '),
  }));
  if (profileDecisionIssue) {
    const recordedProfile = readBundleProfile(bundlePath)?.research_profile;
    rootFindings.push(depthFinding(rule, {
    defaultRuleId: 'finding_index_contract',
    id: `${rule?.id || 'finding_index_contract'}:profile_floor`,
    blockingBasis: 'recorded_human_decision',
    surface: resolvePath(bundlePath, 'rb_profile.yaml'),
    expected: 'Recorded research-style parameters define the Wave2 independent-backing floor.',
    observed: { p0p1_independent_backing: readBundleProfile(bundlePath)?.research_style_params?.p0p1_independent_backing ?? null },
    missingFact: 'Wave2 cannot derive the independent-backing floor because research_style_params.p0p1_independent_backing is missing or invalid.',
    repairKind: recordedProfile && recordedProfile !== 'not_selected' ? 'engine_operation' : 'user_decision',
    writeTo: recordedProfile && recordedProfile !== 'not_selected'
      ? `node DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle ${resolvePath(bundlePath)} --style ${recordedProfile}`
      : 'phases/phase-hitl1.md research-style parameter decision owner',
    repair: recordedProfile && recordedProfile !== 'not_selected'
      ? 'Recompute the complete recorded research style through apply-research-style.mjs, then rerun Wave2 inspect.'
      : 'The existing HITL1 owner must record a research-profile decision before style computation and Wave2 inspect can rerun.',
    detail: `[${rule?.id || 'finding_index_contract'}] missing Wave2 independent-backing profile parameter.`,
    }));
  }
  return { ...issueResult(inspect, advice, rootFindings), pair_facts: pairFacts, masked_rule_ids: [...new Set(maskedRuleIds)] };
}

export function topicSlugFromDepthReviewTarget(target) {
  const parts = String(target || '').split(/[\\/]+/);
  const idx = parts.findIndex((part) => part === 'wave1');
  if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  return basename(String(target || ''), '.yaml');
}
