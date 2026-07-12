// @impl DEW-004, SNC-005, REF-006
// Work-unit validation: manifest/beacon/result reading, runtime receipt validation,
// output file validation, cache trail validation, source claim validation, queue binding validation.

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
  WORK_UNIT_REQUIRED_RECEIPT_FIELDS,
} from './work-unit-constants.mjs';
import {
  isSafeBundleRelative,
  isPlainObject,
  isPathInsideDir,
  recordSubmitNormalization,
  hashValue,
  readOptionalJson,
  readJson,
  hasExplicitDegradedCapture,
  validateCacheTrailContent,
} from './work-unit-utils.mjs';
import {
  validateWorkIdBinding,
} from './work-unit-index.mjs';
import {
  WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION,
  WorkUnitBeaconSchema,
  WorkUnitManifestSchema,
  WorkUnitResultSchema,
  WorkUnitRuntimeReceiptEventSchema,
} from '../schema/contracts/work-unit.mjs';

import { queueItemSnapshotHash, queuePath, queueStateFromFile } from './queue-manager-core.mjs';
import { createQueue, loadQueue } from './queue-manager-lifecycle.mjs';
import {
  cacheLeafMapping,
  resolveCacheLeafContract,
} from './helpers/cache-leaf-contract.mjs';

export function readAndValidateManifest(bundleDir, index, record) {
  const manifestPath = path.join(bundleDir, record.paths.manifest_ref);
  if (!existsSync(manifestPath)) throw new Error(`Missing manifest: ${record.paths.manifest_ref}`);
  const manifest = WorkUnitManifestSchema.parse(readJson(manifestPath));
  validateWorkIdBinding({ ...manifest, kindRegistry: index.kind_registry });
  for (const field of ['work_id', 'queue_item_id', 'wave', 'kind', 'kind_code', 'receipt_nonce', 'queue_item_snapshot_hash']) {
    if (manifest[field] !== record[field]) throw new Error(`manifest/index mismatch for ${record.work_id}: ${field}`);
  }
  return manifest;
}

export function readAndValidateBeacon(bundleDir, record, manifest) {
  const beaconPath = path.join(bundleDir, record.paths.beacon_ref);
  if (!existsSync(beaconPath)) throw new Error(`Missing beacon: ${record.paths.beacon_ref}`);
  const beacon = WorkUnitBeaconSchema.parse(readJson(beaconPath));
  for (const field of ['work_id', 'queue_item_id', 'kind', 'receipt_nonce']) {
    if (beacon[field] !== record[field]) throw new Error(`beacon/index mismatch for ${record.work_id}: ${field}`);
    if (beacon[field] !== manifest[field]) throw new Error(`beacon/manifest mismatch for ${record.work_id}: ${field}`);
  }
  if (beacon.result_schema_ref !== manifest.paths.result_schema_ref) throw new Error(`beacon/manifest mismatch for ${record.work_id}: result_schema_ref`);
  if (beacon.runtime_receipt_ref !== manifest.paths.runtime_receipt_ref) throw new Error(`beacon/manifest mismatch for ${record.work_id}: runtime_receipt_ref`);
  return beacon;
}

export function readAndValidateResult(bundleDir, resultPath, record, { normalizations = [], outputContract = null } = {}) {
  if (!resultPath) throw new Error('--result is required');
  if (!existsSync(resultPath)) throw new Error(`Result file not found: ${resultPath}`);
  const raw = readJson(resultPath);
  let candidate = raw;
  if (isPlainObject(raw) && Object.hasOwn(raw, 'result')) {
    const keys = Object.keys(raw);
    if (keys.length !== 1) {
      throw new Error(`unsafe result wrapper for ${record.work_id}: result has sibling keys ${keys.filter((key) => key !== 'result').join(', ')}`);
    }
    if (!isPlainObject(raw.result)) throw new Error(`unsafe result wrapper for ${record.work_id}: result value must be an object`);
    candidate = raw.result;
    recordSubmitNormalization(normalizations, {
      kind: 'result_wrapper_unwrapped',
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      surface_ref: record.paths.result_ref,
      candidate_result_path: path.resolve(resultPath),
    });
  }
  if (!isPlainObject(candidate)) throw new Error(`result must be a JSON object for ${record.work_id}`);
  validateRequiredResultFields(candidate, outputContract);

  const normalized = { ...candidate };
  for (const field of ['work_id', 'queue_item_id', 'kind']) {
    if (normalized[field] !== undefined && normalized[field] !== record[field]) {
      throw new Error(`result/index mismatch for ${record.work_id}: ${field}`);
    }
  }
  if (normalized.receipt_nonce !== undefined && normalized.receipt_nonce !== record.receipt_nonce) {
    const hasCompleteBinding = normalized.work_id === record.work_id
      && normalized.queue_item_id === record.queue_item_id
      && normalized.kind === record.kind;
    const insideAssignedDir = isPathInsideDir(resultPath, path.join(bundleDir, record.paths.work_unit_dir));
    if (!hasCompleteBinding || !insideAssignedDir) {
      throw new Error(`result/index mismatch for ${record.work_id}: receipt_nonce`);
    }
    recordSubmitNormalization(normalizations, {
      kind: 'nonce_normalized_from_record',
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      surface_ref: record.paths.result_ref,
      candidate_result_path: path.resolve(resultPath),
      field: 'receipt_nonce',
      from: String(normalized.receipt_nonce),
      to: record.receipt_nonce,
    });
    normalized.receipt_nonce = record.receipt_nonce;
  }

  const result = WorkUnitResultSchema.parse(normalized);
  for (const field of ['work_id', 'queue_item_id', 'kind', 'receipt_nonce']) {
    if (result[field] !== record[field]) throw new Error(`result/index mismatch for ${record.work_id}: ${field}`);
  }
  return result;
}

export function validateRequiredResultFields(rawResult, outputContract) {
  const required = Array.isArray(outputContract?.required_result_fields)
    ? outputContract.required_result_fields.filter((field) => typeof field === 'string' && field.length > 0)
    : [];
  const missing = required.filter((field) => !Object.hasOwn(rawResult, field));
  if (missing.length > 0) {
    throw new Error(`result missing required field(s) from work-unit output contract: ${missing.join(', ')}`);
  }
}

export function validateSubmitRuntimeReceipt(bundleDir, record, { normalizations = [], allowNonceNormalization = false } = {}) {
  const receiptPath = path.join(bundleDir, record.paths.runtime_receipt_ref);
  if (!existsSync(receiptPath)) throw new Error(`Missing runtime receipt: ${record.paths.runtime_receipt_ref}`);
  const raw = readFileSync(receiptPath, 'utf-8');
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error(`Runtime receipt has no lifecycle events: ${record.paths.runtime_receipt_ref}`);
  const events = [];
  lines.forEach((line, index) => {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new Error(`Runtime receipt line ${index + 1} is invalid JSONL: ${error.message || String(error)}`);
    }
    if (!isPlainObject(parsed)) throw new Error(`Runtime receipt line ${index + 1} must be a JSON object`);
    const eventCandidate = { ...parsed };
    if (eventCandidate.schema_version === undefined) {
      eventCandidate.schema_version = WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION;
      recordSubmitNormalization(normalizations, {
        kind: 'receipt_schema_defaulted',
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        surface_ref: record.paths.runtime_receipt_ref,
        line: index + 1,
        field: 'schema_version',
        to: WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION,
      });
    } else if (eventCandidate.schema_version !== WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION) {
      throw new Error(`runtime receipt schema_version mismatch for ${record.work_id} line ${index + 1}`);
    }

    const autofilled = [];
    for (const field of ['work_id', 'queue_item_id', 'kind']) {
      if (eventCandidate[field] === undefined) {
        eventCandidate[field] = record[field];
        autofilled.push(field);
      } else if (eventCandidate[field] !== record[field]) {
        throw new Error(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: ${field}`);
      }
    }
    if (eventCandidate.receipt_nonce === undefined) {
      eventCandidate.receipt_nonce = record.receipt_nonce;
      autofilled.push('receipt_nonce');
    } else if (eventCandidate.receipt_nonce !== record.receipt_nonce) {
      const receiptHasCompleteBinding = parsed.work_id === record.work_id
        && parsed.queue_item_id === record.queue_item_id
        && parsed.kind === record.kind;
      if (!allowNonceNormalization || !receiptHasCompleteBinding) {
        throw new Error(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: receipt_nonce`);
      }
      recordSubmitNormalization(normalizations, {
        kind: 'nonce_normalized_from_record',
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        surface_ref: record.paths.runtime_receipt_ref,
        line: index + 1,
        field: 'receipt_nonce',
        from: String(eventCandidate.receipt_nonce),
        to: record.receipt_nonce,
      });
      eventCandidate.receipt_nonce = record.receipt_nonce;
    }
    if (autofilled.length > 0) {
      recordSubmitNormalization(normalizations, {
        kind: 'receipt_binding_identity_autofilled',
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        surface_ref: record.paths.runtime_receipt_ref,
        line: index + 1,
        fields: autofilled,
      });
    }

    const event = WorkUnitRuntimeReceiptEventSchema.parse(eventCandidate);
    for (const field of WORK_UNIT_REQUIRED_RECEIPT_FIELDS) {
      if (event[field] !== record[field]) throw new Error(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: ${field}`);
    }
    events.push(event);
  });
  return {
    events,
    canonical_content: `${events.map((event) => JSON.stringify(event)).join('\n')}\n`,
  };
}

export function validateOutputFiles(bundleDir, result, outputContract) {
  const outputFiles = result.output_files || [];
  if (outputContract?.output_files?.required && outputFiles.length === 0) {
    throw new Error('output_files[] is required by the work-unit output contract');
  }
  const allowedRoles = Array.isArray(outputContract?.output_files?.allowed_roles)
    ? new Set(outputContract.output_files.allowed_roles)
    : null;
  if (outputFiles.length > 0 && (!allowedRoles || allowedRoles.size === 0)) {
    throw new Error('output_files[].role cannot be accepted because this work-unit output contract has no allowed_roles');
  }
  for (const entry of outputFiles) {
    if (allowedRoles && !allowedRoles.has(entry.role)) {
      throw new Error(`output_files role '${entry.role}' is not allowed by this work-unit output contract; allowed roles: ${[...allowedRoles].join(', ')}`);
    }
    if (!isSafeBundleRelative(entry.path)) throw new Error(`output_files path escapes bundle: ${entry.path}`);
    if (!existsSync(path.join(bundleDir, entry.path))) throw new Error(`declared output file missing: ${entry.path}`);
    if (entry.role === 'reference' && outputContract?.output_files?.reference_requires_source_url && !entry.source_url) {
      throw new Error(`reference output missing source_url: ${entry.path}`);
    }
  }
}

export function canonicalizeCacheLeafPage(cacheDir, trail, record, normalizations, { writeCanonicalCache = true } = {}) {
  const pagePath = path.join(cacheDir, 'page.md');
  const pageContentPath = path.join(cacheDir, 'page-content.md');
  const hasPage = existsSync(pagePath) && statSync(pagePath).isFile();
  const hasPageContent = existsSync(pageContentPath) && statSync(pageContentPath).isFile();
  if (!hasPageContent) return null;

  const sidecar = readFileSync(pageContentPath, 'utf-8');
  if (hasPage) {
    const page = readFileSync(pagePath, 'utf-8');
    if (page !== sidecar) {
      throw new Error(`cache trail ${trail} has divergent page.md and page-content.md`);
    }
    return null;
  }

  if (writeCanonicalCache) writeFileSync(pagePath, sidecar);
  recordSubmitNormalization(normalizations, {
    kind: 'cache_page_content_canonicalized',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    surface_ref: `${trail}/page.md`,
    sidecar_ref: `${trail}/page-content.md`,
  });
  return sidecar;
}

export function validateCacheTrails(bundleDir, result, cachePolicy, { record = null, normalizations = [], writeCanonicalCache = true } = {}) {
  const trails = result.cache_trails || [];
  if (cachePolicy?.required && trails.length === 0) throw new Error('cache_trails[] is required by the work-unit cache policy');
  const virtualCachePages = new Map();
  for (const trail of trails) {
    if (!isSafeBundleRelative(trail)) throw new Error(`cache_trails path escapes bundle: ${trail}`);
    if (!trail.startsWith(`${cachePolicy?.root || '_cache/'}`)) throw new Error(`cache_trails path not under ${cachePolicy?.root || '_cache/'}: ${trail}`);
    const full = path.join(bundleDir, trail);
    if (!existsSync(full)) throw new Error(`cache trail directory missing: ${trail}`);
    if (!statSync(full).isDirectory()) throw new Error(`cache_trails path is not a directory: ${trail}`);
    const virtualPage = record
      ? canonicalizeCacheLeafPage(full, trail, record, normalizations, { writeCanonicalCache })
      : null;
    if (virtualPage !== null) virtualCachePages.set(trail, virtualPage);
    const directFiles = new Set(readdirSync(full).filter((entry) => {
      try { return statSync(path.join(full, entry)).isFile(); } catch { return false; }
    }));
    const missing = resolveCacheLeafContract(cachePolicy)
      .filter((entry) => !(directFiles.has(entry) || (entry === 'page.md' && virtualCachePages.has(trail))));
    if (missing.length > 0) throw new Error(`cache trail ${trail} missing ${missing.join(', ')}`);
    validateCacheTrailContent(full, trail, { pageText: virtualCachePages.get(trail) ?? null });
  }
  return { virtualCachePages };
}

const ACCEPTED_SOURCE_CLAIM_STATUSES = new Set(['accepted', 'countable', 'accepted_countable']);

export function acceptedClaimStatus(status) {
  return ACCEPTED_SOURCE_CLAIM_STATUSES.has(String(status || '').trim().toLowerCase());
}

export function normalizeUrlForSourceCache(url) {
  try {
    const parsed = new URL(String(url || '').trim());
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return String(url || '').trim();
  }
}

export function cacheTrailMapping(bundleDir, trail, { virtualCachePages = new Map() } = {}) {
  const cacheDir = path.join(bundleDir, trail);
  const pageText = virtualCachePages.has(trail)
    ? virtualCachePages.get(trail)
    : readFileSync(path.join(cacheDir, 'page.md'), 'utf-8');
  const meta = readOptionalJson(path.join(cacheDir, 'meta.json'));
  const mapping = cacheLeafMapping(meta);
  return {
    degraded: hasExplicitDegradedCapture(pageText, meta),
    urls: mapping.urls.map(normalizeUrlForSourceCache),
    source_slug: mapping.source_slug,
  };
}

export function validateSourceClaims(bundleDir, result, outputContract, { virtualCachePages = new Map() } = {}) {
  const claims = result.source_claims || [];
  const acceptedUrls = result.accepted_source_urls || [];
  if (claims.length === 0 && acceptedUrls.length === 0) return;

  const contract = outputContract?.source_claims || {};
  if (contract.allowed !== true) {
    throw new Error('source_claims[] / accepted_source_urls[] are not allowed by this work-unit output contract');
  }

  const outputPaths = new Set((result.output_files || []).map((entry) => entry.path));
  const cacheTrails = new Set(result.cache_trails || []);
  const acceptedClaimUrls = new Set();

  for (const claim of claims) {
    if (!acceptedClaimStatus(claim.acceptance_status)) continue;
    acceptedClaimUrls.add(claim.url);

    if (!isSafeBundleRelative(claim.source_ref)) {
      throw new Error(`accepted source claim has unsafe source_ref: ${claim.source_ref}`);
    }
    if (!outputPaths.has(claim.source_ref)) {
      throw new Error(`accepted source claim source_ref is not declared in output_files[]: ${claim.source_ref}`);
    }

    const refs = Array.isArray(claim.cache_trail_refs) ? claim.cache_trail_refs.filter(Boolean) : [];
    const degradedRef = claim.degraded_capture_ref || null;
    if (contract.accepted_requires_cache_or_degraded === true && refs.length === 0 && !degradedRef) {
      throw new Error(`accepted source claim requires cache_trail_refs[] or degraded_capture_ref: ${claim.url}`);
    }

    const allRefs = [...refs, ...(degradedRef ? [degradedRef] : [])];
    for (const trail of allRefs) {
      if (!cacheTrails.has(trail)) {
        throw new Error(`accepted source claim cache/degraded ref is not declared in cache_trails[]: ${trail}`);
      }
      const mapping = cacheTrailMapping(bundleDir, trail, { virtualCachePages });
      if (trail === degradedRef && !mapping.degraded) {
        throw new Error(`degraded_capture_ref lacks explicit degraded/fetch-failure record: ${trail}`);
      }
      const normalizedClaimUrl = normalizeUrlForSourceCache(claim.url);
      if (mapping.urls.length > 0 && !mapping.urls.includes(normalizedClaimUrl)) {
        throw new Error(`accepted source claim cache trail maps to a different URL for ${claim.url}: ${trail}`);
      }
    }
  }

  for (const url of acceptedUrls) {
    if (!acceptedClaimUrls.has(url)) {
      throw new Error(`accepted_source_urls[] entry has no matching accepted source_claims[] entry: ${url}`);
    }
  }
}

function readQueueForSubmit(bundleDir, { sideEffects = true } = {}) {
  if (sideEffects) return loadQueue(bundleDir);
  const file = queuePath(bundleDir);
  if (!existsSync(file)) return createQueue(path.basename(bundleDir));
  return queueStateFromFile(JSON.parse(readFileSync(file, 'utf-8')), { queueId: path.basename(bundleDir) });
}

export function validateQueueBindingForSubmit(bundleDir, record, manifest, { sideEffects = true, requireInFlight = true } = {}) {
  const queue = readQueueForSubmit(bundleDir, { sideEffects });
  if (queueItemSnapshotHash(manifest.queue_item) !== record.queue_item_snapshot_hash) throw new Error(`manifest queue item snapshot hash is stale for ${record.work_id}`);
  if (!requireInFlight) return queue;

  const inFlight = queue.delegated_in_flight?.[record.queue_item_id];
  if (!inFlight) throw new Error(`queue_item_id ${record.queue_item_id} is not delegated in flight`);
  if (inFlight.work_id !== record.work_id) throw new Error(`queue in-flight binding mismatch for ${record.queue_item_id}: ${inFlight.work_id}`);
  if (inFlight.queue_item_snapshot_hash !== record.queue_item_snapshot_hash) throw new Error(`queue snapshot hash mismatch for ${record.queue_item_id}`);
  return queue;
}
