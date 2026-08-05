// @impl DEW-004, DEW-022, DEW-024, SNC-005, REF-006
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
  readWorkUnitLedgerRows,
} from './work-unit-utils.mjs';
import {
  loadWorkUnitIndex,
  validateWorkIdBinding,
} from './work-unit-index.mjs';
import {
  LEGACY_WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
  WORK_UNIT_ASSIGNMENT_CONTRACT_VERSIONS,
  WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION,
  WORK_UNIT_SUBMISSION_CONTRACT_VERSION,
  WorkUnitBeaconSchema,
  WorkUnitManifestSchema,
  WorkUnitResultSchema,
  WorkUnitRuntimeReceiptEventSchema,
} from '../schema/contracts/work-unit.mjs';
import { CanonicalPlanSchema } from '../schema/contracts/plan.mjs';
import { parse as parseYaml } from 'yaml';

import { queueItemSnapshotHash, queuePath, queueStateFromFile } from './queue-manager-core.mjs';
import { createQueue, loadQueue } from './queue-manager-lifecycle.mjs';
import { kindContractForQueueItem } from './work-unit-utils.mjs';
import { resolveWorkUnitAssignmentContract } from './work-unit-assignment-contract.mjs';
import { loadCurrentSubmittedLedgerFact } from './work-unit-submitted-ledger.mjs';
import {
  cacheLeafMapping,
  resolveCacheLeafContract,
} from './helpers/cache-leaf-contract.mjs';
import { evaluateTopicLayouts, resolveStructuredTopicBinding } from './helpers/topic-layout.mjs';

function validationRepairError(message, repair = {}) {
  const error = new Error(message);
  error.repair_contract = repair;
  return error;
}

export function readAndValidateManifest(bundleDir, index, record) {
  const manifestPath = path.join(bundleDir, record.paths.manifest_ref);
  if (!existsSync(manifestPath)) throw new Error(`Missing manifest: ${record.paths.manifest_ref}`);
  const manifest = WorkUnitManifestSchema.parse(readJson(manifestPath));
  validateWorkIdBinding({ ...manifest, kindRegistry: index.kind_registry });
  for (const field of ['work_id', 'queue_item_id', 'wave', 'kind', 'kind_code', 'receipt_nonce', 'queue_item_snapshot_hash']) {
    if (manifest[field] !== record[field]) throw new Error(`manifest/index mismatch for ${record.work_id}: ${field}`);
  }
  const recordSubmissionVersion = record.submission_contract_version;
  const manifestSubmissionVersion = manifest.submission_contract_version;
  if (recordSubmissionVersion || manifestSubmissionVersion) {
    if (recordSubmissionVersion !== WORK_UNIT_SUBMISSION_CONTRACT_VERSION
      || manifestSubmissionVersion !== recordSubmissionVersion) {
      throw new Error(`manifest/index mismatch for ${record.work_id}: submission_contract_version`);
    }
  }
  const recordAssignmentVersion = record.assignment_contract_version;
  const manifestAssignmentVersion = manifest.assignment_contract_version;
  if (recordAssignmentVersion || manifestAssignmentVersion) {
    if (!WORK_UNIT_ASSIGNMENT_CONTRACT_VERSIONS.includes(recordAssignmentVersion)
      || manifestAssignmentVersion !== recordAssignmentVersion) {
      throw new Error(`manifest/index mismatch for ${record.work_id}: assignment_contract_version`);
    }
    const observedSnapshotHash = queueItemSnapshotHash(manifest.queue_item);
    if (observedSnapshotHash !== record.queue_item_snapshot_hash) {
      throw new Error(`embedded queue snapshot hash mismatch for ${record.work_id}`);
    }
    const boundV1BaseOutputContract = recordAssignmentVersion === LEGACY_WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION
      ? (() => {
        const { required_outputs: _requiredOutputs, ...boundBase } = manifest.output_contract;
        return boundBase;
      })()
      : null;
    const baseOutputContract = boundV1BaseOutputContract
      || kindContractForQueueItem(manifest.queue_item, record.kind).output_contract;
    const expectedOutputContract = resolveWorkUnitAssignmentContract({
      assignmentContractVersion: recordAssignmentVersion,
      kind: record.kind,
      queueItem: manifest.queue_item,
      topicBinding: {
        topic_uid: manifest.queue_item.payload?.topic_uid,
        topic_slug: manifest.queue_item.payload?.topic_slug,
      },
      baseOutputContract,
    });
    if (hashValue(manifest.output_contract) !== hashValue(expectedOutputContract)) {
      throw new Error(`manifest assignment output_contract drift for ${record.work_id}`);
    }
  } else if (Object.hasOwn(manifest.output_contract, 'required_outputs')) {
    throw new Error(`legacy manifest unexpectedly carries required_outputs for ${record.work_id}`);
  }
  if (record.actor_contract_version || manifest.actor_contract_version) {
    if (record.actor_contract_version !== 'work-unit.actor.v1' || manifest.actor_contract_version !== record.actor_contract_version) throw new Error(`manifest/index mismatch for ${record.work_id}: actor_contract_version`);
    if (JSON.stringify(manifest.actor_execution) !== JSON.stringify(record.actor_execution)) throw new Error(`manifest/index mismatch for ${record.work_id}: actor_execution`);
  }
  return manifest;
}

export function validateManifestTopicBinding(bundleDir, manifest) {
  const queueItem = manifest.queue_item;
  const hasTopicBinding = Boolean(queueItem?.payload?.topic_uid || queueItem?.payload?.topic_slug || queueItem?.lineage?.topic_uid || queueItem?.lineage?.topic_slug);
  if (!hasTopicBinding) return null;

  const planPath = path.join(bundleDir, 'rb_plan.md');
  if (!existsSync(planPath)) return null;
  const raw = readFileSync(planPath, 'utf8');
  const frontmatter = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) throw new Error('canonical topic plan frontmatter is unreadable during work-unit submit');
  const planFrontmatter = parseYaml(frontmatter[1]);
  if (planFrontmatter?.topic_registry_version !== '2') return null;
  const plan = CanonicalPlanSchema.safeParse(planFrontmatter);
  if (!plan.success) throw new Error('canonical topic plan is invalid during work-unit submit');

  const resolved = resolveStructuredTopicBinding(evaluateTopicLayouts(plan.data.topic_registry), manifest);
  if (!resolved.ok) throw new Error(`work-unit topic binding invalid: ${resolved.reason_code}`);
  return resolved;
}

export function readAndValidateBeacon(bundleDir, record, manifest) {
  const beaconPath = path.join(bundleDir, record.paths.beacon_ref);
  if (!existsSync(beaconPath)) throw new Error(`Missing beacon: ${record.paths.beacon_ref}`);
  const beacon = WorkUnitBeaconSchema.parse(readJson(beaconPath));
  const canonicalBundleDir = path.resolve(bundleDir);
  if (beacon.bundle_dir !== canonicalBundleDir) {
    throw new Error(`beacon/bundle root mismatch for ${record.work_id}: expected ${canonicalBundleDir} got ${beacon.bundle_dir}`);
  }
  for (const field of ['work_id', 'queue_item_id', 'kind', 'receipt_nonce']) {
    if (beacon[field] !== record[field]) throw new Error(`beacon/index mismatch for ${record.work_id}: ${field}`);
    if (beacon[field] !== manifest[field]) throw new Error(`beacon/manifest mismatch for ${record.work_id}: ${field}`);
  }
  if (beacon.assignment_contract_version !== record.assignment_contract_version
    || beacon.assignment_contract_version !== manifest.assignment_contract_version) {
    throw new Error(`beacon assignment_contract_version drift for ${record.work_id}`);
  }
  if (beacon.submission_contract_version !== record.submission_contract_version
    || beacon.submission_contract_version !== manifest.submission_contract_version) {
    throw new Error(`beacon submission_contract_version drift for ${record.work_id}`);
  }
  if (hashValue(beacon.output_contract) !== hashValue(manifest.output_contract)) {
    throw new Error(`beacon output_contract drift for ${record.work_id}`);
  }
  if (beacon.result_schema_ref !== manifest.paths.result_schema_ref) throw new Error(`beacon/manifest mismatch for ${record.work_id}: result_schema_ref`);
  if (beacon.runtime_receipt_ref !== manifest.paths.runtime_receipt_ref) throw new Error(`beacon/manifest mismatch for ${record.work_id}: runtime_receipt_ref`);
  if (record.actor_contract_version || beacon.actor_contract_version) {
    if (beacon.actor_contract_version !== record.actor_contract_version) throw new Error(`beacon/index mismatch for ${record.work_id}: actor_contract_version`);
    if (JSON.stringify(beacon.actor_execution) !== JSON.stringify(record.actor_execution)) throw new Error(`beacon/index mismatch for ${record.work_id}: actor_execution`);
  }
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
  const normalized = { ...candidate };
  const validationIssues = [];
  const required = Array.isArray(outputContract?.required_result_fields)
    ? outputContract.required_result_fields.filter((field) => typeof field === 'string' && field.length > 0)
    : [];
  for (const field of required) {
    if (!Object.hasOwn(candidate, field)) {
      validationIssues.push({
        code: 'required_result_field_missing',
        path: [field],
        message: `result missing required field from work-unit output contract: ${field}`,
      });
    }
  }
  if (!Object.hasOwn(candidate, 'schema_version')) {
    validationIssues.push({
      code: 'required_result_field_missing',
      path: ['schema_version'],
      message: 'result missing required schema_version work-unit.result.v1',
    });
  }
  for (const field of ['work_id', 'queue_item_id', 'kind']) {
    if (normalized[field] !== undefined && normalized[field] !== record[field]) {
      validationIssues.push({
        code: 'result_binding_mismatch',
        path: [field],
        message: `result/index mismatch for ${record.work_id}: ${field}; expected ${record[field]} got ${normalized[field]}`,
      });
    }
  }
  const strictAttemptBinding = record.submission_contract_version === WORK_UNIT_SUBMISSION_CONTRACT_VERSION;
  if (normalized.receipt_nonce !== undefined && normalized.receipt_nonce !== record.receipt_nonce) {
    const hasCompleteBinding = normalized.work_id === record.work_id
      && normalized.queue_item_id === record.queue_item_id
      && normalized.kind === record.kind;
    const insideAssignedDir = isPathInsideDir(resultPath, path.join(bundleDir, record.paths.work_unit_dir));
    if (strictAttemptBinding || !hasCompleteBinding || !insideAssignedDir) {
      validationIssues.push({
        code: 'result_binding_mismatch',
        path: ['receipt_nonce'],
        message: `result/index mismatch for ${record.work_id}: receipt_nonce; expected ${record.receipt_nonce} got ${normalized.receipt_nonce}`,
      });
    } else {
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
  }

  const parsed = WorkUnitResultSchema.safeParse(normalized);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      if (issue.code === 'unrecognized_keys') {
        for (const key of issue.keys || []) {
          validationIssues.push({
            code: 'unrecognized_result_field',
            path: [...issue.path, key],
            message: `result field is not allowed by work-unit.result.v1: ${key}`,
          });
        }
      } else {
        validationIssues.push({
          code: `result_schema_${issue.code}`,
          path: issue.path,
          message: `result schema violation at /${issue.path.join('/')}: ${issue.message}`,
        });
      }
    }
  }

  if (record.actor_contract_version) {
    if (normalized.actor_contract_version !== record.actor_contract_version) {
      validationIssues.push({
        code: 'result_binding_mismatch',
        path: ['actor_contract_version'],
        message: `result/index mismatch for ${record.work_id}: actor_contract_version; expected ${record.actor_contract_version} got ${normalized.actor_contract_version ?? '<missing>'}`,
      });
    }
    if (normalized.execution_actor_class !== record.actor_execution.execution_actor_class) {
      validationIssues.push({
        code: 'result_binding_mismatch',
        path: ['execution_actor_class'],
        message: `result/index mismatch for ${record.work_id}: execution_actor_class; expected ${record.actor_execution.execution_actor_class} got ${normalized.execution_actor_class ?? '<missing>'}`,
      });
    }
  } else if (normalized.actor_contract_version || normalized.execution_actor_class) {
    for (const field of ['actor_contract_version', 'execution_actor_class']) {
      if (normalized[field] !== undefined) {
        validationIssues.push({
          code: 'legacy_result_actor_binding_forbidden',
          path: [field],
          message: `legacy result for ${record.work_id} must not invent ${field}`,
        });
      }
    }
  }

  if (validationIssues.length > 0) {
    const deduplicated = [...new Map(validationIssues.map((issue) => [`${issue.code}:${issue.path.join('/')}`, issue])).values()];
    const error = new Error(deduplicated.map((issue) => issue.message).join('; '));
    error.validation_issues = deduplicated;
    throw error;
  }
  return parsed.data;
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

    const strictAttemptBinding = record.submission_contract_version === WORK_UNIT_SUBMISSION_CONTRACT_VERSION;
    const autofilled = [];
    for (const field of ['work_id', 'queue_item_id', 'kind']) {
      if (eventCandidate[field] === undefined) {
        if (strictAttemptBinding) {
          throw new Error(`runtime receipt missing exact attempt binding for ${record.work_id} line ${index + 1}: ${field}`);
        }
        eventCandidate[field] = record[field];
        autofilled.push(field);
      } else if (eventCandidate[field] !== record[field]) {
        throw new Error(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: ${field}`);
      }
    }
    if (eventCandidate.receipt_nonce === undefined) {
      if (strictAttemptBinding) {
        throw new Error(`runtime receipt missing exact attempt binding for ${record.work_id} line ${index + 1}: receipt_nonce`);
      }
      eventCandidate.receipt_nonce = record.receipt_nonce;
      autofilled.push('receipt_nonce');
    } else if (eventCandidate.receipt_nonce !== record.receipt_nonce) {
      const receiptHasCompleteBinding = parsed.work_id === record.work_id
        && parsed.queue_item_id === record.queue_item_id
        && parsed.kind === record.kind;
      if (strictAttemptBinding || !allowNonceNormalization || !receiptHasCompleteBinding) {
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

    const eventResult = WorkUnitRuntimeReceiptEventSchema.safeParse(eventCandidate);
    if (!eventResult.success) {
      const error = new Error(`Runtime receipt line ${index + 1} fails receipt schema: ${eventResult.error.issues.map((issue) => `${issue.path.join('/') || '/'}: ${issue.message}`).join('; ')}`);
      error.receipt_line = index + 1;
      throw error;
    }
    const event = eventResult.data;
    for (const field of WORK_UNIT_REQUIRED_RECEIPT_FIELDS) {
      if (event[field] !== record[field]) throw new Error(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: ${field}`);
    }
    if (record.actor_contract_version) {
      if (event.actor_contract_version !== record.actor_contract_version) throw new Error(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: actor_contract_version`);
      if (event.execution_actor_class !== record.actor_execution.execution_actor_class) throw new Error(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: execution_actor_class`);
    } else if (event.actor_contract_version || event.execution_actor_class) {
      throw new Error(`legacy runtime receipt for ${record.work_id} must not invent actor binding`);
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
  const outputIndexesByPath = new Map();
  for (const [index, entry] of outputFiles.entries()) {
    if (allowedRoles && !allowedRoles.has(entry.role)) {
      throw validationRepairError(`output_files role '${entry.role}' is not allowed by this work-unit output contract; allowed roles: ${[...allowedRoles].join(', ')}`, {
        repair_kind: 'agent_action',
        json_pointer: `/output_files/${index}/role`,
      });
    }
    if (!isSafeBundleRelative(entry.path)) throw validationRepairError(`output_files path escapes bundle: ${entry.path}`, {
      repair_kind: 'agent_action',
      json_pointer: `/output_files/${index}/path`,
    });
    const normalizedPath = path.posix.normalize(entry.path);
    const priorIndexes = outputIndexesByPath.get(normalizedPath) || [];
    priorIndexes.push(index);
    outputIndexesByPath.set(normalizedPath, priorIndexes);
    if (!existsSync(path.join(bundleDir, entry.path))) throw validationRepairError(`declared output file missing: ${entry.path}`, {
      repair_kind: 'agent_action',
      write_to: path.join(path.resolve(bundleDir), entry.path),
      json_pointer: `/output_files/${index}/path`,
    });
    if (entry.role === 'reference' && outputContract?.output_files?.reference_requires_source_url && !entry.source_url) {
      throw validationRepairError(`reference output missing source_url: ${entry.path}`, {
        repair_kind: 'agent_action',
        json_pointer: `/output_files/${index}/source_url`,
      });
    }
  }
  for (const [outputPath, indexes] of outputIndexesByPath) {
    if (indexes.length > 1) {
      throw validationRepairError(`output_files contains duplicate normalized path ${outputPath}`, {
        repair_kind: 'agent_action',
        json_pointer: `/output_files/${indexes[1]}/path`,
      });
    }
  }
  for (const required of outputContract?.required_outputs || []) {
    const indexes = outputIndexesByPath.get(required.path) || [];
    if (indexes.length === 0) {
      throw validationRepairError(`output_files missing required output path ${required.path} with role ${required.role}`, {
        repair_kind: 'agent_action',
        write_to: 'result.json#/output_files',
      });
    }
    const index = indexes[0];
    if (outputFiles[index].role !== required.role) {
      throw validationRepairError(`required output ${required.path} must use canonical role ${required.role}; got ${outputFiles[index].role}`, {
        repair_kind: 'agent_action',
        json_pointer: `/output_files/${index}/role`,
      });
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
  for (const [index, trail] of trails.entries()) {
    if (!isSafeBundleRelative(trail)) throw validationRepairError(`cache_trails path escapes bundle: ${trail}`, {
      repair_kind: 'agent_action',
      json_pointer: `/cache_trails/${index}`,
    });
    if (!trail.startsWith(`${cachePolicy?.root || '_cache/'}`)) throw validationRepairError(`cache_trails path not under ${cachePolicy?.root || '_cache/'}: ${trail}`, {
      repair_kind: 'agent_action',
      json_pointer: `/cache_trails/${index}`,
    });
    const full = path.join(bundleDir, trail);
    if (!existsSync(full)) throw validationRepairError(`cache trail directory missing: ${trail}`, {
      repair_kind: 'agent_action',
      write_to: path.resolve(full),
      json_pointer: `/cache_trails/${index}`,
    });
    if (!statSync(full).isDirectory()) throw validationRepairError(`cache_trails path is not a directory: ${trail}`, {
      repair_kind: 'agent_action',
      write_to: path.resolve(full),
      json_pointer: `/cache_trails/${index}`,
    });
    const virtualPage = record
      ? canonicalizeCacheLeafPage(full, trail, record, normalizations, { writeCanonicalCache })
      : null;
    if (virtualPage !== null) virtualCachePages.set(trail, virtualPage);
    const directFiles = new Set(readdirSync(full).filter((entry) => {
      try { return statSync(path.join(full, entry)).isFile(); } catch { return false; }
    }));
    const missing = resolveCacheLeafContract(cachePolicy)
      .filter((entry) => !(directFiles.has(entry) || (entry === 'page.md' && virtualCachePages.has(trail))));
    if (missing.length > 0) throw validationRepairError(`cache trail ${trail} missing ${missing.join(', ')}`, {
      repair_kind: 'agent_action',
      write_to: path.join(path.resolve(full), missing[0]),
      json_pointer: `/cache_trails/${index}`,
    });
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

function priorOutputObservation(row, entry, reasonCode, extra = {}) {
  return {
    path: entry.path,
    role: entry.role,
    work_id: row.work_id,
    wave: row.wave,
    kind: row.kind,
    eligible: reasonCode === null,
    reason_code: reasonCode,
    ...extra,
  };
}

export function buildSourceRefLineage(bundleDir, currentManifest) {
  const contract = currentManifest?.output_contract?.source_claims || {};
  const allowedPriorRoles = Array.isArray(contract.prior_submitted_output_roles)
    ? contract.prior_submitted_output_roles
    : [];
  const currentAssignedPaths = [...new Set(currentManifest?.queue_item?.writes_to || [])].filter(isSafeBundleRelative);
  const result = {
    current_assigned_paths: currentAssignedPaths,
    prior_submitted_output_roles: [...allowedPriorRoles],
    eligible_prior_outputs: [],
    observed_prior_outputs: [],
    authority_error: null,
  };
  if (contract.allowed !== true || allowedPriorRoles.length === 0) return result;

  const currentBinding = validateManifestTopicBinding(bundleDir, currentManifest);
  const currentTopicUid = currentBinding?.topic_uid || null;
  let rows;
  let index;
  let queue;
  try {
    rows = readWorkUnitLedgerRows(bundleDir);
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
    queue = readQueueForSubmit(bundleDir, { sideEffects: false });
  } catch (error) {
    result.authority_error = error.message || String(error);
    return result;
  }

  for (const row of rows) {
    if (row.work_id === currentManifest.work_id) continue;
    const record = index.work_units[row.work_id];
    let priorManifest = null;
    let priorBinding = null;
    let authorityReason = null;
    if (!record || record.status !== 'submitted') {
      authorityReason = 'prior_submitted_binding_invalid';
    } else {
      try {
        loadCurrentSubmittedLedgerFact(bundleDir, record, { ledgerRows: rows });
        priorManifest = readAndValidateManifest(bundleDir, index, record);
        priorBinding = validateManifestTopicBinding(bundleDir, priorManifest);
      } catch {
        authorityReason = 'prior_submitted_binding_invalid';
      }
    }

    const terminal = queue.terminal_history.find((entry) => entry.work_id === row.work_id && entry.terminal_status === 'done');
    if (!authorityReason && (!terminal?.item || queueItemSnapshotHash(terminal.item) !== record.queue_item_snapshot_hash)) {
      authorityReason = 'prior_queue_binding_invalid';
    }

    for (const entry of row.output_files || []) {
      let reasonCode = authorityReason;
      if (!reasonCode && !priorBinding?.topic_uid) reasonCode = 'prior_topic_binding_missing';
      if (!reasonCode && !currentTopicUid) reasonCode = 'current_topic_binding_missing';
      if (!reasonCode && priorBinding.topic_uid !== currentTopicUid) reasonCode = 'prior_topic_mismatch';
      if (!reasonCode && row.wave !== currentManifest.wave) reasonCode = 'prior_wave_mismatch';
      if (!reasonCode && row.kind !== currentManifest.kind) reasonCode = 'prior_kind_mismatch';
      if (!reasonCode && !allowedPriorRoles.includes(entry.role)) reasonCode = 'prior_role_not_authorized';
      const observation = priorOutputObservation(row, entry, reasonCode, {
        topic_uid: priorBinding?.topic_uid || null,
      });
      result.observed_prior_outputs.push(observation);
      if (!reasonCode) result.eligible_prior_outputs.push(observation);
    }
  }
  return result;
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

export function validateSourceClaims(bundleDir, result, outputContract, {
  virtualCachePages = new Map(),
  manifest = null,
} = {}) {
  const claims = result.source_claims || [];
  const acceptedUrls = result.accepted_source_urls || [];
  if (claims.length === 0 && acceptedUrls.length === 0) return;

  const contract = outputContract?.source_claims || {};
  if (contract.allowed !== true) {
    throw new Error('source_claims[] / accepted_source_urls[] are not allowed by this work-unit output contract');
  }

  const outputPaths = new Set((result.output_files || []).map((entry) => entry.path));
  const sourceRefLineage = manifest
    ? buildSourceRefLineage(bundleDir, manifest)
    : { eligible_prior_outputs: [], observed_prior_outputs: [], prior_submitted_output_roles: [] };
  const cacheTrails = new Set(result.cache_trails || []);
  const acceptedClaimUrls = new Set();

  for (const [claimIndex, claim] of claims.entries()) {
    if (!acceptedClaimStatus(claim.acceptance_status)) continue;
    acceptedClaimUrls.add(claim.url);

    if (!isSafeBundleRelative(claim.source_ref)) {
      throw validationRepairError(`accepted source claim has unsafe source_ref: ${claim.source_ref}`, {
        repair_kind: 'agent_action',
        json_pointer: `/source_claims/${claimIndex}/source_ref`,
      });
    }
    const eligiblePrior = sourceRefLineage.eligible_prior_outputs.filter((entry) => entry.path === claim.source_ref);
    if (!outputPaths.has(claim.source_ref) && sourceRefLineage.authority_error) {
      throw validationRepairError(`prior submitted source-ref authority is unavailable while resolving '${claim.source_ref}': ${sourceRefLineage.authority_error}`, {
        code: 'source_ref_prior_authority_invalid',
        repair_kind: 'missing_contract',
        write_to: 'work-unit submitted-output lineage boundary: ledger/index/manifest/queue authority',
        details: {
          candidate_source_ref: claim.source_ref,
          searched_current_outputs: true,
          searched_prior_submitted_outputs: false,
          authority_error: sourceRefLineage.authority_error,
        },
      });
    }
    if (!outputPaths.has(claim.source_ref) && eligiblePrior.length !== 1) {
      const observedPrior = sourceRefLineage.observed_prior_outputs.filter((entry) => entry.path === claim.source_ref);
      const allowedRoles = sourceRefLineage.prior_submitted_output_roles || [];
      const priorDetail = observedPrior.length === 0
        ? 'none'
        : observedPrior.map((entry) => `work_id=${entry.work_id}, topic_uid=${entry.topic_uid || '<unbound>'}, wave=${entry.wave}, kind=${entry.kind}, role=${entry.role}, reason=${entry.reason_code || (eligiblePrior.length > 1 ? 'ambiguous_exact_path' : 'eligible')}`).join('; ');
      const message = `accepted source claim source_ref '${claim.source_ref}' was searched in current outputs (not found) and prior submitted outputs (${observedPrior.length} exact match(es)); expected a current assigned output or one exact same-topic wave=${manifest?.wave ?? '<wave>'} kind=${manifest?.kind || '<kind>'} prior output with authorized role [${allowedRoles.join(', ')}]. Prior candidates: ${priorDetail}`;
      throw validationRepairError(message, {
        code: eligiblePrior.length > 1 ? 'source_ref_prior_ambiguous' : 'source_ref_not_authorized',
        repair_kind: 'agent_action',
        json_pointer: `/source_claims/${claimIndex}/source_ref`,
        details: {
          candidate_source_ref: claim.source_ref,
          searched_current_outputs: true,
          searched_prior_submitted_outputs: true,
          prior_candidates: observedPrior,
          allowed_prior_roles: allowedRoles,
        },
      });
    }

    const refs = Array.isArray(claim.cache_trail_refs) ? claim.cache_trail_refs.filter(Boolean) : [];
    const degradedRef = claim.degraded_capture_ref || null;
    if (contract.accepted_requires_cache_or_degraded === true && refs.length === 0 && !degradedRef) {
      throw validationRepairError(`accepted source claim requires cache_trail_refs[] or degraded_capture_ref: ${claim.url}`, {
        repair_kind: 'agent_action',
        json_pointer: `/source_claims/${claimIndex}/cache_trail_refs`,
      });
    }

    const allRefs = [...refs, ...(degradedRef ? [degradedRef] : [])];
    for (const trail of allRefs) {
      if (!cacheTrails.has(trail)) {
        throw validationRepairError(`accepted source claim cache/degraded ref is not declared in cache_trails[]: ${trail}`, {
          repair_kind: 'agent_action',
          json_pointer: `/source_claims/${claimIndex}/cache_trail_refs`,
        });
      }
      const mapping = cacheTrailMapping(bundleDir, trail, { virtualCachePages });
      if (trail === degradedRef && !mapping.degraded) {
        throw validationRepairError(`degraded_capture_ref lacks explicit degraded/fetch-failure record: ${trail}`, {
          repair_kind: 'agent_action',
          json_pointer: `/source_claims/${claimIndex}/degraded_capture_ref`,
        });
      }
      const normalizedClaimUrl = normalizeUrlForSourceCache(claim.url);
      if (mapping.urls.length > 0 && !mapping.urls.includes(normalizedClaimUrl)) {
        throw validationRepairError(`accepted source claim cache trail maps to a different URL for ${claim.url}: ${trail}`, {
          repair_kind: 'agent_action',
          json_pointer: `/source_claims/${claimIndex}/url`,
        });
      }
    }
  }

  for (const [urlIndex, url] of acceptedUrls.entries()) {
    if (!acceptedClaimUrls.has(url)) {
      throw validationRepairError(`accepted_source_urls[] entry has no matching accepted source_claims[] entry: ${url}`, {
        repair_kind: 'agent_action',
        json_pointer: `/accepted_source_urls/${urlIndex}`,
      });
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
