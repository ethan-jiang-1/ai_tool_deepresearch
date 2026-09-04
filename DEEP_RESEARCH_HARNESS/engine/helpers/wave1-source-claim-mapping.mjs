// wave1-source-claim-mapping.mjs
// Wave1 source-claim/cache-mapping/floor cluster (W3 carve).
// @impl WAI-005, RWG-017

// wave-depth-contracts.mjs — deterministic Wave1/Wave2 depth-adjacent checks
// @impl WAI-005, WAI-008, RWG-002, RWG-003, RWG-005, RWG-017, WTS-004, WTS-008, WTS-009, WTS-010, CRC-007, WPG-003, WPG-005, WPG-012

// Navigation: public API — exactUrlKey, normalizeUrlForCacheMapping, readWave0SourceUrls, deriveWave1NewSourceFloor, checkSourceClaimCacheMapping
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
  canonicalizeSubmittedWorkUnitRef,
  issueResult,
  safeRel,
} from './wave-depth-verdicts.mjs';
import {
  ACCEPTED_SOURCE_STATUSES,
} from './wave2-finding-index-contract.mjs';

export function exactUrlKey(url) {
  return String(url || '').trim();
}

export function normalizeUrlForCacheMapping(url) {
  return normalizeWave1ReferenceUrl(url) || String(url || '').trim();
}

export function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function cacheTrailStatus(bundlePath, trail) {
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

export function isAcceptedSourceClaim(claim) {
  const status = String(claim?.acceptance_status || '').trim().toLowerCase();
  return ACCEPTED_SOURCE_STATUSES.has(status);
}

export function sourceClaimUrl(claim) {
  return exactUrlKey(claim?.url);
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

export function submittedMaps(bundlePath, selectedRows = null) {
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

export function workUnitLabel(row) {
  return row?.work_id ? ` (work_id: ${row.work_id})` : '';
}
