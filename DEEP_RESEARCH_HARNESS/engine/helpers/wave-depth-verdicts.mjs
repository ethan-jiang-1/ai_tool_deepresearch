// wave-depth-verdicts.mjs
// Shared verdict trio + fact-by-ref index used by wave1 and wave2 depth contracts (W3 carve).
// @impl WAI-005, RWG-017

// wave-depth-contracts.mjs — deterministic Wave1/Wave2 depth-adjacent checks
// @impl WAI-005, WAI-008, RWG-002, RWG-003, RWG-005, RWG-017, WTS-004, WTS-008, WTS-009, WTS-010, CRC-007, WPG-003, WPG-005, WPG-012

// Navigation: public API — exactUrlKey, normalizeUrlForCacheMapping, evaluateWave1FocusCoverage, readWave0SourceUrls, deriveWave1NewSourceFloor, checkSourceClaimCacheMapping, checkWave1DepthReviewContract, loadWave2FindingIndexFact, evaluateWave2PairFacts, checkWave2FindingIndexContract, topicSlugFromDepthReviewTarget
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



export function readYamlObject(filePath) {
  const parsed = parseYaml(readFileSync(filePath, 'utf-8'));
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}

export function issueResult(inspect, advice = [], findings = []) {
  return { passed: inspect.length === 0, inspect, advice, findings };
}

export function depthFinding(rule, {
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

export function submittedFactByRef(facts) {
  const byRef = new Map();
  for (const fact of facts) {
    const row = fact.ledger_row || {};
    for (const ref of [row.work_id, row.work_unit_ref, row.result_ref]) {
      const canonical = canonicalizeSubmittedWorkUnitRef(ref);
      if (canonical.safe && canonical.canonical) byRef.set(canonical.canonical, fact);
    }
  }
  return byRef;
}

/**
 * Validate the optional, Phase-owned focus declaration without interpreting
 * commitment prose. Submitted backing remains authoritative through the
 * normalized ledger and the reviewed depth-review binding.
 */

export function canonicalizeSubmittedWorkUnitRef(ref) {
  if (!safeRel(ref)) return { safe: false, original: ref, canonical: null, changed: false };
  const canonical = String(ref).replace(/\/+$/g, '');
  return {
    safe: true,
    original: ref,
    canonical,
    changed: canonical !== ref,
  };
}

export function safeRel(ref) {
  return typeof ref === 'string' && ref.length > 0 && !ref.startsWith('/') && !ref.split(/[\\/]+/).includes('..');
}
