// wave-depth-contracts.mjs — deterministic Wave1/Wave2 depth-adjacent checks
// @impl WAI-005, WAI-008, RWG-002, RWG-003, RWG-017, WTS-004, WTS-008, WTS-009, WTS-010, CRC-007, WPG-003, WPG-005, WPG-012

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse as parseYaml } from 'yaml';

import {
  readBundlePlan,
  readBundleProfile,
  readSubmittedWorkUnitDeclarations,
} from './gate-helpers-readers.mjs';

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

function hasExplicitDegradedCapture(pageText, meta) {
  const text = String(pageText || '').toLowerCase();
  const reason = [
    meta?.capture_status,
    meta?.fetch_status,
    meta?.degraded_capture,
    meta?.failure_reason,
    meta?.reason,
  ].filter((value) => value !== undefined && value !== null).join(' ').toLowerCase();
  return /degraded|fetch[-_ ]?failure|access[-_ ]?failure|blocked|unavailable|failed/.test(`${text} ${reason}`);
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
  const missing = ['websearch.json', 'page.md', 'meta.json'].filter((file) => !existsSync(join(dir, file)));
  if (missing.length > 0) return { ok: false, reason: `cache trail ${trail} missing ${missing.join(', ')}` };

  const pageText = readFileSync(join(dir, 'page.md'), 'utf-8');
  const meta = readJsonSafe(join(dir, 'meta.json'));
  const trimmed = pageText.trim();
  const degraded = hasExplicitDegradedCapture(pageText, meta);
  if (!trimmed) return { ok: false, reason: `cache trail ${trail} page.md is empty` };
  const nonEmptyLines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const placeholderOnly = nonEmptyLines.length <= 2 && nonEmptyLines.every((line) => /^#*\s*(cache page for|page|placeholder|todo|tbd)\b/i.test(line));
  if (placeholderOnly && !degraded) return { ok: false, reason: `cache trail ${trail} page.md is placeholder-only` };
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return { ok: false, reason: `cache trail ${trail} meta.json is missing or invalid` };
  const urls = [meta.url, meta.source_url, meta.final_url, meta.fetched_url].filter(Boolean).map(normalizeUrlForCacheMapping);
  if (urls.length === 0 && !meta.source_slug) return { ok: false, reason: `cache trail ${trail} meta.json lacks url/source mapping` };
  return { ok: true, degraded, urls, source_slug: meta.source_slug || null };
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

function issueResult(inspect, advice = []) {
  return { passed: inspect.length === 0, inspect, advice };
}

export function readWave0SourceUrls(bundlePath, topicSlug, review = null) {
  const urls = new Set();
  for (const url of Array.isArray(review?.wave0_source_urls) ? review.wave0_source_urls : []) {
    if (exactUrlKey(url)) urls.add(exactUrlKey(url));
  }
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

function submittedMaps(bundlePath) {
  const rows = readSubmittedWorkUnitDeclarations(bundlePath);
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

export function checkSourceClaimCacheMapping(bundlePath, claims, { topic = null } = {}) {
  const inspect = [];
  const advice = [];
  let maps;
  try {
    maps = submittedMaps(bundlePath);
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

export function checkWave1DepthReviewContract(bundlePath, { topic }) {
  const relPath = join('artifacts', 'wave1', topic, 'depth-review.yaml');
  const filePath = join(bundlePath, relPath);
  const inspect = [];
  const advice = [];
  if (!existsSync(filePath)) {
    return {
      passed: false,
      inspect: [`[depth_review_contract] FAIL: missing ${relPath}`],
      advice: [`Create ${relPath} after successful Wave1 work-unit submit; review must bind to submitted work-unit rows.`],
    };
  }

  let review;
  try {
    review = readYamlObject(filePath);
    if (!review) inspect.push(`[depth_review_contract] FAIL: ${relPath} must be a YAML object`);
  } catch (error) {
    return {
      passed: false,
      inspect: [`[depth_review_contract] FAIL: YAML parse error in ${relPath}: ${error.message}`],
      advice: [`Repair ${relPath} as parseable YAML.`],
    };
  }
  if (!review) return issueResult(inspect, advice);

  for (const key of ['version', 'topic_slug', 'reviewed_work_unit_refs', 'wave0_source_urls', 'source_claims', 'new_source_urls', 'new_source_floor', 'depth_dimensions', 'profile_checks', 'decision', 'supplementary_queue_item_ids']) {
    if (!(key in review)) inspect.push(`[depth_review_contract] FAIL: ${relPath} missing required key: ${key}`);
  }
  for (const key of ['reviewed_work_unit_refs', 'wave0_source_urls', 'source_claims', 'new_source_urls', 'supplementary_queue_item_ids']) {
    if (key in review && !Array.isArray(review[key])) inspect.push(`[depth_review_contract] FAIL: ${relPath} ${key} must be an array`);
  }
  if (review.topic_slug !== topic) inspect.push(`[depth_review_contract] FAIL: ${relPath} topic_slug mismatch: expected ${topic}, got ${review.topic_slug}`);
  if (!DEPTH_DECISIONS.has(review.decision)) inspect.push(`[depth_review_contract] FAIL: ${relPath} decision must be one of ${[...DEPTH_DECISIONS].join(', ')}`);
  if (review.decision !== 'accept') {
    inspect.push(`[depth_review_contract] FAIL: ${relPath} decision is ${review.decision}; Wave1 topic is not complete until decision: accept`);
    advice.push(`Repair ${topic} through supplementary wave1_topic_deepening or record a visible blocker.`);
  }
  if (review.decision === 'supplement_required' && (!Array.isArray(review.supplementary_queue_item_ids) || review.supplementary_queue_item_ids.length === 0)) {
    inspect.push(`[depth_review_contract] FAIL: ${relPath} decision=supplement_required must name supplementary_queue_item_ids[] repair work`);
  }

  const profile = readBundleProfile(bundlePath);
  const floor = deriveWave1NewSourceFloor(profile);
  if (!floor.ok) {
    inspect.push(...floor.inspect);
    advice.push('Run the accepted profile/template path or emit missing_profile_parameter; do not use hidden source-floor defaults.');
  } else {
    const required = Number(review.new_source_floor?.required);
    if (required !== floor.required) {
      inspect.push(`[source_novelty_floor] FAIL: ${relPath} new_source_floor.required=${review.new_source_floor?.required} but profile-derived required floor is ${floor.required}`);
    }
  }

  const claims = Array.isArray(review.source_claims) ? review.source_claims : [];
  const mapping = checkSourceClaimCacheMapping(bundlePath, claims, { topic });
  if (!mapping.passed) inspect.push(...mapping.inspect);
  advice.push(...mapping.advice);

  const wave0Urls = readWave0SourceUrls(bundlePath, topic, review);
  const acceptedClaims = claims.filter(isAcceptedSourceClaim);
  const seenNew = new Set();
  for (const claim of acceptedClaims) {
    const url = sourceClaimUrl(claim);
    if (!url) continue;
    const exactNew = !wave0Urls.has(url);
    if (claim.is_new_vs_wave0 === true && !exactNew) {
      inspect.push(`[source_novelty_floor] FAIL: ${topic} claim marks Wave0 URL as new: ${url}`);
    }
    if (claim.is_new_vs_wave0 !== true && exactNew) {
      inspect.push(`[source_novelty_floor] FAIL: ${topic} claim omits is_new_vs_wave0=true for exact-new URL: ${url}`);
    }
    if (exactNew && claim.is_new_vs_wave0 === true) seenNew.add(url);
  }
  const observed = seenNew.size;
  const reviewedNew = new Set((Array.isArray(review.new_source_urls) ? review.new_source_urls : [])
    .map(exactUrlKey)
    .filter(Boolean));
  for (const url of seenNew) {
    if (!reviewedNew.has(url)) inspect.push(`[source_novelty_floor] FAIL: ${relPath} new_source_urls[] omits accepted exact-new URL: ${url}`);
  }
  for (const url of reviewedNew) {
    if (!seenNew.has(url)) inspect.push(`[source_novelty_floor] FAIL: ${relPath} new_source_urls[] contains URL not backed by accepted exact-new source_claims[]: ${url}`);
  }
  if (Number(review.new_source_floor?.observed) !== observed) {
    inspect.push(`[source_novelty_floor] FAIL: ${relPath} new_source_floor.observed=${review.new_source_floor?.observed} but accepted exact-new claim count is ${observed}`);
  }
  if (floor.ok && observed < floor.required) {
    inspect.push(`[source_novelty_floor] FAIL: ${topic} observed ${observed} new accepted source URL(s), required ${floor.required}`);
    advice.push(`Enqueue supplementary wave1_topic_deepening for ${topic} with genuinely new source URLs.`);
  }

  const dims = review.depth_dimensions || {};
  for (const key of ['mechanism', 'trend_or_difficulty', 'limitation_or_dispute']) {
    if (!depthDimensionCovered(dims[key])) inspect.push(`[depth_review_contract] FAIL: ${relPath} depth_dimensions.${key} must have covered status and refs[]`);
  }

  const params = profile?.research_style_params || {};
  const checks = review.profile_checks || {};
  if (!profileCheckSatisfied(checks.counterexample_search, Boolean(params.counterexample_search))) {
    inspect.push(`[depth_review_contract] FAIL: ${relPath} missing satisfied counterexample_search profile check`);
  }
  if (!profileCheckSatisfied(checks.cross_verification, Boolean(params.cross_verification))) {
    inspect.push(`[depth_review_contract] FAIL: ${relPath} missing satisfied cross_verification profile check`);
  }

  const refs = Array.isArray(review.reviewed_work_unit_refs) ? review.reviewed_work_unit_refs : [];
  if (refs.length === 0) inspect.push(`[depth_review_contract] FAIL: ${relPath} reviewed_work_unit_refs[] must name submitted work-unit rows`);
  let submittedRefs = new Set();
  try {
    for (const row of readSubmittedWorkUnitDeclarations(bundlePath)) {
      submittedRefs.add(row.work_id);
      submittedRefs.add(row.work_unit_ref);
      submittedRefs.add(row.result_ref);
    }
  } catch (error) {
    inspect.push(`[depth_review_contract] FAIL: invalid submitted work-unit ledger while checking reviewed_work_unit_refs: ${error.message}`);
  }
  for (const ref of refs) {
    if (!safeRel(ref)) inspect.push(`[depth_review_contract] FAIL: ${relPath} reviewed work-unit ref is unsafe: ${ref}`);
    else if (submittedRefs.size > 0 && !submittedRefs.has(ref)) inspect.push(`[depth_review_contract] FAIL: ${relPath} reviewed work-unit ref is not submitted: ${ref}`);
  }

  return issueResult(inspect, advice);
}

function readFindingIndex(bundlePath) {
  const relPath = 'artifacts/wave2/finding-index.yaml';
  const filePath = join(bundlePath, relPath);
  if (!existsSync(filePath)) return { ok: false, relPath, inspect: [`[finding_index_contract] FAIL: missing ${relPath}`] };
  try {
    const data = readYamlObject(filePath);
    if (!data) return { ok: false, relPath, inspect: [`[finding_index_contract] FAIL: ${relPath} must be a YAML object`] };
    return { ok: true, relPath, data };
  } catch (error) {
    return { ok: false, relPath, inspect: [`[finding_index_contract] FAIL: YAML parse error in ${relPath}: ${error.message}`] };
  }
}

function countExpectedPairs(bundlePath, indexData) {
  const plan = readBundlePlan(bundlePath);
  const topicCount = Array.isArray(plan?.topic_registry) ? plan.topic_registry.length : Number(indexData.scan?.topic_count || 0);
  return topicCount > 1 ? (topicCount * (topicCount - 1)) / 2 : 0;
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

export function checkWave2FindingIndexContract(bundlePath) {
  const loaded = readFindingIndex(bundlePath);
  if (!loaded.ok) return { passed: false, inspect: loaded.inspect, advice: ['Repair finding-index.yaml before rerunning Wave2 gate.'] };
  const { data, relPath } = loaded;
  const inspect = [];
  const advice = [];

  for (const key of ['version', 'source_layer', 'ledger', 'synthesis', 'scan', 'findings', 'synthesis_eligibility']) {
    if (!(key in data)) inspect.push(`[finding_index_contract] FAIL: ${relPath} missing top-level key: ${key}`);
  }

  const eligibility = data.synthesis_eligibility || {};
  for (const key of ['pure_synthesis_eligible', 'scan_matrix_present', 'scan_topic_pair_coverage', 'unresolved_search_required_count', 'targeted_search_required_count', 'targeted_search_submitted_count', 'explicit_deferral_count', 'profile_params_read', 'ineligibility_reasons']) {
    if (!(key in eligibility)) inspect.push(`[synthesis_eligibility] FAIL: ${relPath} synthesis_eligibility missing key: ${key}`);
  }

  if (eligibility.scan_matrix_present !== true) {
    inspect.push('[synthesis_eligibility] FAIL: scan_matrix_present must be true before Wave2 pass');
  }

  const expectedPairs = countExpectedPairs(bundlePath, data);
  const checkedPairs = Number(data.scan?.pair_count_checked ?? 0);
  if (expectedPairs > 0 && checkedPairs <= 0) {
    inspect.push(`[synthesis_eligibility] FAIL: scan.pair_count_checked=${data.scan?.pair_count_checked ?? '<missing>'}; expected scan matrix coverage for topic pairs`);
  }

  const findings = Array.isArray(data.findings) ? data.findings : [];
  if (!Array.isArray(data.findings)) inspect.push(`[finding_index_contract] FAIL: ${relPath} findings must be an array`);

  const profile = readBundleProfile(bundlePath);
  const independentBackingFloor = Number(profile?.research_style_params?.p0p1_independent_backing);
  const needsBackingFloor = findings.some((finding) => finding?.confidence === 'high' || ['p0', 'p1'].includes(finding?.priority));
  if (needsBackingFloor && (!Number.isFinite(independentBackingFloor) || independentBackingFloor <= 0)) {
    inspect.push('[missing_profile_parameter] Missing required Wave2 profile parameter: research_style_params.p0p1_independent_backing');
  }

  const submittedReceipts = submittedWave2ReceiptRefs(bundlePath);
  let needsSearchCount = 0;
  let targetedRequiredCount = 0;
  let targetedSubmittedCount = 0;
  let explicitDeferralCount = 0;

  for (const finding of findings) {
    const id = finding?.id || '<missing-id>';
    for (const key of ['id', 'type', 'priority', 'status', 'decision', 'affected_topics', 'origin_refs', 'trigger_refs', 'search_required', 'subagent_receipt_refs', 'appears_in_synthesis', 'hitl2_handoff', 'confidence', 'independent_backing_refs', 'gap_status']) {
      if (!(key in (finding || {}))) inspect.push(`[finding_index_contract] FAIL: finding ${id} missing field: ${key}`);
    }
    if (!/^W2F-[0-9]{3}$/.test(String(finding?.id || ''))) inspect.push(`[finding_index_contract] FAIL: finding ${id} id must match W2F-xxx`);
    if (!W2_TYPES.has(finding?.type)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid type: ${finding?.type}`);
    if (!W2_PRIORITIES.has(finding?.priority)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid priority: ${finding?.priority}`);
    if (!W2_STATUSES.has(finding?.status)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid status: ${finding?.status}`);
    if (!W2_DECISIONS.has(finding?.decision)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid decision: ${finding?.decision}`);
    if (!W2_CONFIDENCE.has(finding?.confidence)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid confidence: ${finding?.confidence}`);
    if (!W2_GAP_STATUS.has(finding?.gap_status)) inspect.push(`[finding_index_contract] FAIL: finding ${id} invalid gap_status: ${finding?.gap_status}`);

    const affected = Array.isArray(finding?.affected_topics) ? finding.affected_topics : [];
    const originRefs = Array.isArray(finding?.origin_refs) ? finding.origin_refs : [];
    const triggerRefs = Array.isArray(finding?.trigger_refs) ? finding.trigger_refs : [];
    const receiptRefs = Array.isArray(finding?.subagent_receipt_refs) ? finding.subagent_receipt_refs : [];
    const backingRefs = Array.isArray(finding?.independent_backing_refs) ? finding.independent_backing_refs : [];

    if (finding?.type === 'cross_topic_resolution') {
      if (originRefs.length === 0) inspect.push(`[finding_index_contract] FAIL: cross_topic_resolution ${id} requires origin_refs[]`);
      if (triggerRefs.length === 0) inspect.push(`[finding_index_contract] FAIL: cross_topic_resolution ${id} requires trigger_refs[]`);
      if (finding.search_required !== false) inspect.push(`[finding_index_contract] FAIL: cross_topic_resolution ${id} must have search_required: false`);
    }
    if (finding?.type === 'cross_topic_emergent_question' && affected.length < 2) {
      inspect.push(`[finding_index_contract] FAIL: cross_topic_emergent_question ${id} requires affected_topics.length >= 2`);
    }
    if (['exploit_search', 'explore_search'].includes(finding?.decision)) {
      targetedRequiredCount += 1;
      if (finding.search_required !== true) inspect.push(`[finding_index_contract] FAIL: finding ${id} decision=${finding.decision} implies search_required=true`);
    }
    if (['defer_hitl2', 'requires_internal_data'].includes(finding?.decision)) {
      explicitDeferralCount += 1;
      if (finding.hitl2_handoff !== true) inspect.push(`[finding_index_contract] FAIL: finding ${id} decision=${finding.decision} implies hitl2_handoff=true`);
    }
    if (finding?.decision === 'record_only') explicitDeferralCount += 1;
    if (finding?.appears_in_synthesis === false && finding?.hitl2_handoff !== true && finding?.decision !== 'record_only') {
      inspect.push(`[finding_index_contract] FAIL: finding ${id} appears_in_synthesis=false must be hitl2_handoff=true or decision=record_only`);
    }
    if (finding?.confidence === 'high' && Number.isFinite(independentBackingFloor) && backingRefs.length < independentBackingFloor) {
      inspect.push(`[finding_index_contract] FAIL: finding ${id} confidence=high has ${backingRefs.length} independent_backing_refs, required ${independentBackingFloor}`);
    }
    if (finding?.search_required === true && receiptRefs.length === 0 && !['defer_hitl2', 'requires_internal_data', 'record_only'].includes(finding?.decision)) {
      inspect.push(`[finding_index_contract] FAIL: finding ${id} search_required=true lacks submitted receipt refs or explicit routing decision`);
    }
    if (finding?.gap_status === 'needs_search') {
      needsSearchCount += 1;
      if (!['exploit_search', 'explore_search'].includes(finding?.decision)) {
        inspect.push(`[finding_index_contract] FAIL: finding ${id} gap_status=needs_search requires decision exploit_search/explore_search`);
      }
    }
    if (finding?.gap_status === 'search_submitted') {
      targetedSubmittedCount += 1;
      if (receiptRefs.length === 0) inspect.push(`[finding_index_contract] FAIL: finding ${id} gap_status=search_submitted requires subagent_receipt_refs[]`);
    }
    for (const ref of receiptRefs) {
      if (!submittedReceipts.has(ref)) inspect.push(`[finding_index_contract] FAIL: finding ${id} subagent receipt ref is not backed by a submitted Wave2 work-unit row: ${ref}`);
    }
    if (consumerFacingBackedFindingNeedsCrossRef(finding, backingRefs)) {
      const crossRefs = crossReferenceRefsForFinding(bundlePath, id);
      if (crossRefs.length === 0 && !explicitCrossReferenceOmissionReason(finding)) {
        inspect.push(`[cross_reference_materialization] FAIL: finding ${id} is consumer-facing and backed but lacks reference/00-cross-*.md projection or explicit non-consumer/deferred/limitation omission reason`);
      }
    }
    if (['p0', 'p1'].includes(finding?.priority) && ['low', 'uncertain'].includes(finding?.confidence)) {
      const routed = ['search_submitted', 'deferred_hitl2', 'requires_internal_data', 'record_only'].includes(finding?.gap_status);
      if (!routed) {
        inspect.push(`[synthesis_eligibility] FAIL: under-backed priority finding ${id} must be submitted, deferred, internal-data routed, or record-only before pure synthesis eligibility`);
      }
    }
  }

  if (eligibility.pure_synthesis_eligible === true) {
    if (Number(eligibility.unresolved_search_required_count) !== 0) {
      inspect.push(`[synthesis_eligibility] FAIL: pure_synthesis_eligible=true but unresolved_search_required_count=${eligibility.unresolved_search_required_count}`);
    }
    if (needsSearchCount > 0) {
      inspect.push(`[synthesis_eligibility] FAIL: pure_synthesis_eligible=true but ${needsSearchCount} finding(s) have gap_status=needs_search`);
    }
  }
  if (Number.isFinite(Number(eligibility.unresolved_search_required_count)) && Number(eligibility.unresolved_search_required_count) !== needsSearchCount) {
    inspect.push(`[synthesis_eligibility] FAIL: unresolved_search_required_count=${eligibility.unresolved_search_required_count} but observed needs_search count is ${needsSearchCount}`);
  }
  if (Number.isFinite(Number(eligibility.targeted_search_required_count)) && Number(eligibility.targeted_search_required_count) !== targetedRequiredCount) {
    inspect.push(`[synthesis_eligibility] FAIL: targeted_search_required_count=${eligibility.targeted_search_required_count} but observed targeted-search decision count is ${targetedRequiredCount}`);
  }
  if (Number.isFinite(Number(eligibility.targeted_search_submitted_count)) && Number(eligibility.targeted_search_submitted_count) !== targetedSubmittedCount) {
    inspect.push(`[synthesis_eligibility] FAIL: targeted_search_submitted_count=${eligibility.targeted_search_submitted_count} but observed search_submitted count is ${targetedSubmittedCount}`);
  }
  if (Number.isFinite(Number(eligibility.explicit_deferral_count)) && Number(eligibility.explicit_deferral_count) !== explicitDeferralCount) {
    inspect.push(`[synthesis_eligibility] FAIL: explicit_deferral_count=${eligibility.explicit_deferral_count} but observed explicit routing count is ${explicitDeferralCount}`);
  }

  if (inspect.length > 0) {
    advice.push('Complete Wave2 scan/triage/gap analysis, submit targeted evidence or route gaps explicitly, then update finding-index.yaml synthesis_eligibility.');
  }
  return issueResult(inspect, advice);
}

export function topicSlugFromDepthReviewTarget(target) {
  const parts = String(target || '').split(/[\\/]+/);
  const idx = parts.findIndex((part) => part === 'wave1');
  if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  return basename(String(target || ''), '.yaml');
}
