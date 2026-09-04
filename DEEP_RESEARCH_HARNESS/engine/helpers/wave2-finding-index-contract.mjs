// wave2-finding-index-contract.mjs
// Wave2 finding-index contract cluster (W3 carve).
// @impl WTS-004, WTS-008, WTS-009, WTS-010

// wave-depth-contracts.mjs — deterministic Wave1/Wave2 depth-adjacent checks
// @impl WAI-005, WAI-008, RWG-002, RWG-003, RWG-005, RWG-017, WTS-004, WTS-008, WTS-009, WTS-010, CRC-007, WPG-003, WPG-005, WPG-012

// Navigation: public API — loadWave2FindingIndexFact, evaluateWave2PairFacts, checkWave2FindingIndexContract, topicSlugFromDepthReviewTarget
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
} from './wave-depth-verdicts.mjs';
import {
  CARRIED_BINDING_KEYS,
} from './wave1-depth-review-contract.mjs';

export const W2_TYPES = new Set(['wave1_legacy_question', 'cross_topic_resolution', 'cross_topic_emergent_question']);

export const W2_PRIORITIES = new Set(['p0', 'p1', 'p2']);

export const W2_STATUSES = new Set(['resolved', 'partial', 'open', 'deferred']);

export const W2_DECISIONS = new Set(['use_existing_evidence', 'exploit_search', 'explore_search', 'defer_hitl2', 'requires_internal_data', 'record_only']);

export const W2_CONFIDENCE = new Set(['high', 'medium', 'low', 'uncertain']);

export const W2_GAP_STATUS = new Set(['no_gap', 'needs_search', 'search_submitted', 'deferred_hitl2', 'requires_internal_data', 'record_only']);

export const W2_CROSS_REF_OMISSION_RE = /(?:non[-_ ]?consumer|not[-_ ]?consumer[-_ ]?facing|process[-_ ]?only|internal|defer(?:red)?|limitation|not[-_ ]?source[-_ ]?backed)/i;

export const ACCEPTED_SOURCE_STATUSES = new Set(['accepted', 'countable', 'accepted_countable']);

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

export function pairKey(left, right) {
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

export function submittedWave2ReceiptRefs(bundlePath) {
  try {
    return new Set(readSubmittedWorkUnitDeclarations(bundlePath)
      .filter((row) => row.wave === 2)
      .map((row) => row.runtime_receipt_ref));
  } catch {
    return new Set();
  }
}

export function crossReferenceRefsForFinding(bundlePath, findingId) {
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

export function explicitCrossReferenceOmissionReason(finding) {
  const candidates = [
    finding?.consumer_reference_omission_reason,
    finding?.cross_reference_omission_reason,
    finding?.omission_reason,
    finding?.limitation_reason,
  ].filter((value) => typeof value === 'string' && value.trim());
  return candidates.find((value) => W2_CROSS_REF_OMISSION_RE.test(value)) || null;
}

export function consumerFacingBackedFindingNeedsCrossRef(finding, backingRefs) {
  if (finding?.appears_in_synthesis !== true) return false;
  if (!Array.isArray(backingRefs) || backingRefs.length === 0) return false;
  if (['defer_hitl2', 'requires_internal_data', 'record_only'].includes(finding?.decision)) return false;
  if (['needs_search', 'deferred_hitl2', 'requires_internal_data', 'record_only'].includes(finding?.gap_status)) return false;
  return true;
}

export function carriedBindingFinding(rule, bundlePath, relPath, id, detail, observed = null) {
  const filePath = resolvePath(bundlePath, relPath);
  return depthFinding(rule, {
    defaultRuleId: 'finding_index_contract',
    id,
    blockingBasis: 'binding_integrity',
    surface: filePath,
    expected: 'An exact Wave1 carried-target binding on a structurally valid finding.',
    observed,
    missingFact: detail,
    repairKind: 'agent_action',
    writeTo: filePath,
    repair: `Repair ${relPath} wave1_target_bindings and rerun the same Wave2 checkpoint.`,
    detail: `[wave1_target_binding] ${detail}`,
  });
}

export function inspectCarriedTargetClosure(bundlePath, { rule, relPath, findings }) {
  const selected = selectWave1CarriedTargetReceiptForWave2(bundlePath);
  if (selected.kind === 'legacy' || selected.kind === 'unavailable') return { inspect: [], findings: [] };
  if (selected.kind !== 'current') return { inspect: selected.findings.map((finding) => finding.detail), findings: selected.findings };

  const receiptTargets = new Map(selected.receipt.targets.map((target) => [
    `${target.topic_uid}\u0000${target.target_id}`,
    target,
  ]));
  const bindingFindings = [];
  const covered = new Set();
  for (const finding of findings) {
    const bindings = finding?.wave1_target_bindings;
    if (bindings === undefined) continue;
    if (!Array.isArray(bindings)) {
      bindingFindings.push(carriedBindingFinding(rule, bundlePath, relPath, `wave1_target_bindings:${finding?.id || 'unknown'}:shape`, `Finding ${finding?.id || '<unknown>'} wave1_target_bindings must be an array.`, bindings));
      continue;
    }
    for (const binding of bindings) {
      if (!binding || typeof binding !== 'object' || Array.isArray(binding) || Object.keys(binding).length !== CARRIED_BINDING_KEYS.length || !CARRIED_BINDING_KEYS.every((key) => Object.hasOwn(binding, key))) {
        bindingFindings.push(carriedBindingFinding(rule, bundlePath, relPath, `wave1_target_bindings:${finding?.id || 'unknown'}:item_shape`, `Finding ${finding?.id || '<unknown>'} has a malformed wave1 target binding.`, binding));
        continue;
      }
      const target = receiptTargets.get(`${binding.topic_uid}\u0000${binding.target_id}`);
      const exact = target
        && binding.receipt_sha256 === selected.receipt.receipt_sha256
        && binding.intent_sha256 === target.intent_sha256
        && binding.target_revision === target.target_revision;
      if (!exact) {
        bindingFindings.push(carriedBindingFinding(rule, bundlePath, relPath, `wave1_target_bindings:${finding?.id || 'unknown'}:stale`, `Finding ${finding?.id || '<unknown>'} binding does not equal a target in the selected Wave1 receipt.`, binding));
        continue;
      }
      if (W2_DECISIONS.has(finding.decision) && W2_GAP_STATUS.has(finding.gap_status)) covered.add(`${target.topic_uid}\u0000${target.target_id}`);
    }
  }
  const missing = [...receiptTargets.keys()].filter((key) => !covered.has(key));
  if (missing.length > 0) {
    bindingFindings.push(carriedBindingFinding(rule, bundlePath, relPath, 'wave1_target_bindings:coverage', `Selected Wave1 receipt targets lack an exact valid finding binding: ${missing.join(', ')}.`, { missing_targets: missing }));
  }
  return { inspect: bindingFindings.map((finding) => finding.detail), findings: bindingFindings };
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

  const carriedClosure = inspectCarriedTargetClosure(bundlePath, { rule, relPath, findings });
  inspect.push(...carriedClosure.inspect);
  rootFindings.push(...carriedClosure.findings);

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
      ? `node DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs --bundle ${resolvePath(bundlePath)} --style ${recordedProfile}`
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
