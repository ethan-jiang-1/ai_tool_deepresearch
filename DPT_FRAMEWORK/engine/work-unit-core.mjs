// @impl DEW-002, DEW-004, FRE-005, SDC-001, SDC-002, SDC-003, EXO-001, FIO-001
// Work-unit core: ID/index/envelope/transaction/inspect helpers.

import {
  existsSync,
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { queueItemSnapshotHash } from './queue-manager-core.mjs';
import { loadQueue, saveQueue } from './queue-manager-lifecycle.mjs';
import { preempt, refill } from './queue-manager-window.mjs';
import { createTrace } from './trace.mjs';
import { logToRun, readBundleName } from './logger.mjs';
import {
  WORK_UNIT_BEACON_SCHEMA_VERSION,
  WORK_UNIT_ID_PATTERN,
  WORK_UNIT_INDEX_SCHEMA_VERSION,
  WORK_UNIT_MANIFEST_SCHEMA_VERSION,
  WorkUnitBeaconSchema,
  WorkUnitAgentFileSchema,
  WorkUnitIndexSchema,
  WorkUnitLedgerRecordSchema,
  WorkUnitManifestSchema,
  WorkUnitResultSchema,
  WorkUnitRuntimeReceiptEventSchema,
  WorkUnitStatusFileSchema,
} from '../schema/contracts/work-unit.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const WORK_UNITS = {
  ROOT: '_work_units',
  INDEX: '_work_units/_index.json',
  TRANSACTIONS: '_work_units/_transactions',
  LOCK: '_work_units/.lock',
};

export const WORK_UNIT_OUTPUT_LEDGER = 'rb_output_declarations.jsonl';

export const DEFAULT_KIND_REGISTRY = Object.freeze({
  kinds: Object.freeze({
    wave0_source_intake: 'src',
    wave1_topic_deepening: 'deep',
    wave2_targeted_evidence: 'targ',
  }),
  codes: Object.freeze({
    src: 'wave0_source_intake',
    deep: 'wave1_topic_deepening',
    targ: 'wave2_targeted_evidence',
  }),
});

export const WORK_UNIT_REQUIRED_RECEIPT_FIELDS = Object.freeze(['work_id', 'queue_item_id', 'kind', 'receipt_nonce']);

export const DEFAULT_KIND_CONTRACTS = Object.freeze({
  wave0_source_intake: Object.freeze({
    task_brief: 'Research the assigned source-intake demand, write declared reference/source outputs, and return only through the work-unit result contract.',
    output_contract: Object.freeze({
      required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'summary', 'output_files', 'cache_trails'],
      output_files: Object.freeze({
        required: true,
        allowed_roles: ['reference', 'source_yaml', 'other'],
        reference_requires_source_url: true,
      }),
    }),
    cache_policy: Object.freeze({
      required: true,
      root: '_cache/',
      leaf_files: ['websearch.json', 'page.md', 'meta.json'],
      authority: 'verified_during_submit',
    }),
  }),
  wave1_topic_deepening: Object.freeze({
    task_brief: 'Deepen the assigned topic with bounded evidence work, declared outputs, and submit-ready cache trails.',
    output_contract: Object.freeze({
      required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'summary', 'output_files', 'cache_trails'],
      output_files: Object.freeze({
        required: true,
        allowed_roles: ['reference', 'evidence_summary', 'question_list', 'other'],
        reference_requires_source_url: true,
      }),
    }),
    cache_policy: Object.freeze({
      required: true,
      root: '_cache/',
      leaf_files: ['websearch.json', 'page.md', 'meta.json'],
      authority: 'verified_during_submit',
    }),
  }),
  wave2_targeted_evidence: Object.freeze({
    task_brief: 'Perform only the assigned targeted evidence search and return declared evidence outputs for submit validation.',
    output_contract: Object.freeze({
      required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'summary', 'output_files', 'cache_trails'],
      output_files: Object.freeze({
        required: true,
        allowed_roles: ['reference', 'evidence_summary', 'other'],
        reference_requires_source_url: true,
      }),
    }),
    cache_policy: Object.freeze({
      required: true,
      root: '_cache/',
      leaf_files: ['websearch.json', 'page.md', 'meta.json'],
      authority: 'verified_during_submit',
    }),
  }),
});

function now() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rel(bundleDir, absolutePath) {
  return path.relative(bundleDir, absolutePath).split(path.sep).join('/');
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashValue(value) {
  return sha256(stableStringify(value));
}

function ledgerPath(bundleDir) {
  return path.join(bundleDir, WORK_UNIT_OUTPUT_LEDGER);
}

function readLedgerRows(bundleDir) {
  const filePath = ledgerPath(bundleDir);
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf-8').split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function appendLedgerRow(bundleDir, row) {
  appendFileSync(ledgerPath(bundleDir), `${JSON.stringify(row)}\n`);
}

function isSafeBundleRelative(ref) {
  if (!ref || path.isAbsolute(ref)) return false;
  return !ref.split(/[\\/]+/).includes('..');
}

function logCliPath() {
  return path.resolve(__dirname, '..', 'cli', 'log-event.mjs');
}

function bundleName(bundleDir) {
  const fromStatus = readBundleName(bundleDir);
  return fromStatus === '<unknown>' ? path.basename(bundleDir) : fromStatus;
}

function defaultKindContract(kind) {
  return clone(DEFAULT_KIND_CONTRACTS[kind] || {
    task_brief: 'Complete the assigned delegated work and return only through the work-unit result contract.',
    output_contract: {
      required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'summary', 'output_files', 'cache_trails'],
      output_files: {
        required: true,
        allowed_roles: ['reference', 'evidence_summary', 'source_yaml', 'question_list', 'other'],
        reference_requires_source_url: true,
      },
    },
    cache_policy: {
      required: false,
      root: '_cache/',
      leaf_files: ['websearch.json', 'page.md', 'meta.json'],
      authority: 'verified_during_submit',
    },
  });
}

function kindContractForQueueItem(queueItem, kind) {
  const base = defaultKindContract(kind);
  return {
    task_brief: queueItem.task_brief || queueItem.payload?.task_brief || base.task_brief,
    output_contract: clone(queueItem.output_contract || queueItem.payload?.output_contract || base.output_contract),
    cache_policy: clone(queueItem.cache_policy || queueItem.payload?.cache_policy || base.cache_policy),
  };
}

export function workUnitsRoot(bundleDir) {
  return path.join(bundleDir, WORK_UNITS.ROOT);
}

export function workUnitIndexPath(bundleDir) {
  return path.join(bundleDir, WORK_UNITS.INDEX);
}

export function transactionDir(bundleDir) {
  return path.join(bundleDir, WORK_UNITS.TRANSACTIONS);
}

function ensureWorkUnitDirs(bundleDir) {
  mkdirSync(workUnitsRoot(bundleDir), { recursive: true });
  mkdirSync(transactionDir(bundleDir), { recursive: true });
}

export function parseWorkId(workId) {
  const match = String(workId).match(WORK_UNIT_ID_PATTERN);
  if (!match?.groups) {
    throw new Error(`Invalid work_id '${workId}': expected wu-w{wave}-b{batch_index}-{kind_code}-i{claim_index}`);
  }
  return {
    work_id: workId,
    wave: Number.parseInt(match.groups.wave, 10),
    batch_id: `b${match.groups.batch}`,
    batch_index: Number.parseInt(match.groups.batch, 10),
    kind_code: match.groups.kind_code,
    claim_index: Number.parseInt(match.groups.claim, 10),
  };
}

export function resolveKindCode(kindRegistry, kind) {
  const code = kindRegistry.kinds[kind];
  if (!code) throw new Error(`No kind_code registered for kind '${kind}'`);
  if (kindRegistry.codes[code] !== kind) throw new Error(`Kind registry is not bijective for kind '${kind}' and code '${code}'`);
  return code;
}

export function resolveKind(kindRegistry, kindCode) {
  const kind = kindRegistry.codes[kindCode];
  if (!kind) throw new Error(`No kind registered for kind_code '${kindCode}'`);
  if (kindRegistry.kinds[kind] !== kindCode) throw new Error(`Kind registry is not bijective for code '${kindCode}' and kind '${kind}'`);
  return kind;
}

export function validateWorkIdBinding({ work_id, kindRegistry, wave, batch_id, batch_index, claim_index, kind, kind_code }) {
  const parsed = parseWorkId(work_id);
  const expectedKind = resolveKind(kindRegistry, parsed.kind_code);
  const issues = [];
  if (wave !== undefined && parsed.wave !== wave) issues.push(`wave mismatch: id=${parsed.wave} surface=${wave}`);
  if (batch_id !== undefined && parsed.batch_id !== batch_id) issues.push(`batch_id mismatch: id=${parsed.batch_id} surface=${batch_id}`);
  if (batch_index !== undefined && parsed.batch_index !== batch_index) issues.push(`batch_index mismatch: id=${parsed.batch_index} surface=${batch_index}`);
  if (claim_index !== undefined && parsed.claim_index !== claim_index) issues.push(`claim_index mismatch: id=${parsed.claim_index} surface=${claim_index}`);
  if (kind_code !== undefined && parsed.kind_code !== kind_code) issues.push(`kind_code mismatch: id=${parsed.kind_code} surface=${kind_code}`);
  if (kind !== undefined && expectedKind !== kind) issues.push(`kind mismatch: id=${expectedKind} surface=${kind}`);
  if (issues.length > 0) throw new Error(`work_id binding invalid for ${work_id}: ${issues.join('; ')}`);
  return { ...parsed, kind: expectedKind };
}

function computeStatusCounts(workUnits) {
  const counts = { claimed: 0, submitted: 0, failed: 0, timed_out: 0, abandoned: 0 };
  for (const record of Object.values(workUnits || {})) counts[record.status] += 1;
  return counts;
}

function countTraceEvents(bundleDir, eventName) {
  const tracePath = path.join(bundleDir, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return 0;
  try {
    return readFileSync(tracePath, 'utf-8').split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce((count, line) => {
        try {
          const entry = JSON.parse(line);
          return entry.event === eventName ? count + 1 : count;
        } catch {
          return count;
        }
      }, 0);
  } catch {
    return 0;
  }
}

function computeWorkUnitHealthProjection(workUnits, { nowMs = Date.now(), lateSubmitRejections = 0 } = {}) {
  const statusCounts = computeStatusCounts(workUnits);
  const byWave = {};
  let expired = 0;
  let retries = 0;
  let submitRejections = 0;
  let nonterminal = 0;

  for (const record of Object.values(workUnits || {})) {
    const wave = `wave${record.wave}`;
    byWave[wave] = (byWave[wave] || 0) + 1;
    if (record.status === 'claimed') {
      nonterminal += 1;
      if (Number.isFinite(Date.parse(record.deadline_at)) && Date.parse(record.deadline_at) < nowMs) expired += 1;
    }
    if ((record.attempt_index || 1) > 1) retries += 1;
    if (record.last_submit_rejection) submitRejections += 1;
  }

  return {
    total: Object.keys(workUnits || {}).length,
    ...statusCounts,
    expired,
    retries,
    submit_rejections: submitRejections,
    late_submit_rejections: lateSubmitRejections,
    nonterminal,
    by_wave: byWave,
  };
}

function computeInspectProjection(workUnits, generatedAt = now()) {
  const byWave = {};
  let nonterminal = 0;
  for (const record of Object.values(workUnits || {})) {
    const key = `wave${record.wave}`;
    byWave[key] = (byWave[key] || 0) + 1;
    if (record.status === 'claimed') nonterminal += 1;
  }
  return {
    generated_at: generatedAt,
    total: Object.keys(workUnits || {}).length,
    by_wave: byWave,
    nonterminal,
  };
}

export function createEmptyWorkUnitIndex({ kindRegistry = DEFAULT_KIND_REGISTRY } = {}) {
  const ts = now();
  return WorkUnitIndexSchema.parse({
    schema_version: WORK_UNIT_INDEX_SCHEMA_VERSION,
    kind_registry: clone(kindRegistry),
    waves: {},
    work_units: {},
    status_counts: computeStatusCounts({}),
    inspect_projection: computeInspectProjection({}, ts),
    updated_at: ts,
  });
}

export function loadWorkUnitIndex(bundleDir, { createIfMissing = false } = {}) {
  ensureWorkUnitDirs(bundleDir);
  const filePath = workUnitIndexPath(bundleDir);
  if (!existsSync(filePath)) {
    const index = createEmptyWorkUnitIndex();
    if (createIfMissing) writeJson(filePath, index);
    return index;
  }
  return WorkUnitIndexSchema.parse(readJson(filePath));
}

export function saveWorkUnitIndex(bundleDir, index, { recompute = true } = {}) {
  const next = clone(index);
  if (recompute) {
    const ts = now();
    next.status_counts = computeStatusCounts(next.work_units);
    next.inspect_projection = computeInspectProjection(next.work_units, ts);
    next.updated_at = ts;
  }
  const parsed = WorkUnitIndexSchema.parse(next);
  writeJson(workUnitIndexPath(bundleDir), parsed);
  return parsed;
}

function waveKey(wave) {
  return `wave${wave}`;
}

function batchId(batchIndex) {
  return `b${String(batchIndex).padStart(3, '0')}`;
}

function claimId(claimIndex) {
  return `i${String(claimIndex).padStart(4, '0')}`;
}

function ensureBatch(index, wave, { batchReason = 'initial_phase_drain', lineage } = {}) {
  const key = waveKey(wave);
  if (!index.waves[key]) index.waves[key] = { current_batch_index: 0, batches: {} };
  const waveState = index.waves[key];
  const id = batchId(waveState.current_batch_index);
  if (!waveState.batches[id]) {
    waveState.batches[id] = {
      batch_index: waveState.current_batch_index,
      batch_reason: batchReason,
      next_claim_index: 1,
      opened_at: now(),
      ...(lineage ? { lineage } : {}),
    };
  }
  return waveState.batches[id];
}

function nextAttemptIndex(index, queueItemId) {
  let maxAttempt = 0;
  for (const record of Object.values(index.work_units || {})) {
    if (record.queue_item_id === queueItemId) maxAttempt = Math.max(maxAttempt, record.attempt_index);
  }
  return maxAttempt + 1;
}

export function allocateWorkId(index, { wave, kind, queue_item_id, batchReason = 'initial_phase_drain', lineage }) {
  const kind_code = resolveKindCode(index.kind_registry, kind);
  const batch = ensureBatch(index, wave, { batchReason, lineage });
  const claim_index = batch.next_claim_index;
  const work_id = `wu-w${wave}-${batchId(batch.batch_index)}-${kind_code}-${claimId(claim_index)}`;
  if (index.work_units[work_id]) throw new Error(`work_id collision: ${work_id}`);
  batch.next_claim_index += 1;
  return {
    work_id,
    wave,
    batch_id: batchId(batch.batch_index),
    batch_index: batch.batch_index,
    claim_index,
    kind,
    kind_code,
    attempt_index: nextAttemptIndex(index, queue_item_id),
  };
}

function refsForWorkUnit(bundleDir, { wave, work_id }) {
  const dir = path.join(workUnitsRoot(bundleDir), `wave${wave}`, work_id);
  return {
    abs_dir: dir,
    refs: {
      work_unit_dir: rel(bundleDir, dir),
      manifest_ref: rel(bundleDir, path.join(dir, 'manifest.json')),
      task_ref: rel(bundleDir, path.join(dir, 'task.md')),
      result_schema_ref: rel(bundleDir, path.join(dir, 'result.schema.json')),
      beacon_ref: rel(bundleDir, path.join(dir, '_beacon.json')),
      runtime_receipt_ref: rel(bundleDir, path.join(dir, 'runtime-receipt.jsonl')),
      status_ref: rel(bundleDir, path.join(dir, '_status.json')),
      result_ref: rel(bundleDir, path.join(dir, 'result.json')),
      agent_ref: rel(bundleDir, path.join(dir, '_agent.json')),
    },
  };
}

function resultSchemaDocument(manifest) {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: `Work-unit result for ${manifest.kind}`,
    type: 'object',
    required: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'output_files', 'cache_trails'],
    properties: {
      schema_version: { const: 'work-unit.result.v1' },
      work_id: { const: manifest.work_id },
      queue_item_id: { const: manifest.queue_item_id },
      kind: { const: manifest.kind },
      receipt_nonce: { const: manifest.receipt_nonce },
      summary: { type: 'string' },
      output_files: { type: 'array', items: { type: 'object' } },
      cache_trails: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
  };
}

function jsonBlock(value) {
  return JSON.stringify(value, null, 2);
}

function absolutePathMap(manifest, bundleDir) {
  const refs = {
    bundle_dir: path.resolve(bundleDir),
    work_unit_dir: manifest.paths.work_unit_dir,
    manifest_ref: manifest.paths.manifest_ref,
    task_ref: manifest.paths.task_ref,
    result_schema_ref: manifest.paths.result_schema_ref,
    beacon_ref: manifest.paths.beacon_ref,
    runtime_receipt_ref: manifest.paths.runtime_receipt_ref,
    status_ref: manifest.paths.status_ref,
    result_ref: manifest.paths.result_ref,
    agent_ref: manifest.paths.agent_ref,
  };
  return Object.fromEntries(Object.entries(refs).map(([key, value]) => [
    key,
    key === 'bundle_dir' ? value : path.join(path.resolve(bundleDir), value),
  ]));
}

function lifecycleReceiptExample(manifest, event) {
  return {
    schema_version: 'work-unit.receipt-event.v1',
    event,
    work_id: manifest.work_id,
    queue_item_id: manifest.queue_item_id,
    kind: manifest.kind,
    receipt_nonce: manifest.receipt_nonce,
    ts: '<ISO8601>',
  };
}

function logDetailExample(manifest, lifecycleEvent) {
  return {
    lifecycle_event: lifecycleEvent,
    work_id: manifest.work_id,
    queue_item_id: manifest.queue_item_id,
    kind: manifest.kind,
    receipt_nonce: manifest.receipt_nonce,
  };
}

function taskMarkdown(manifest, bundleDir) {
  const logCli = logCliPath();
  const abs = absolutePathMap(manifest, bundleDir);
  const workStartedReceipt = lifecycleReceiptExample(manifest, 'work_started');
  const fileWrittenReceipt = lifecycleReceiptExample(manifest, 'file_written');
  const workDoneReceipt = lifecycleReceiptExample(manifest, 'work_done');
  const searchLog = logDetailExample(manifest, 'search_started');
  const fileLog = { ...logDetailExample(manifest, 'file_written'), path: '<bundle-relative-output-path>' };
  const errorLog = { ...logDetailExample(manifest, 'error'), reason: '<short-reason>' };
  return [
    `# Work Unit ${manifest.work_id}`,
    '',
    manifest.task_brief,
    '',
    '## Binding',
    '',
    `- work_id: \`${manifest.work_id}\``,
    `- queue_item_id: \`${manifest.queue_item_id}\``,
    `- kind: \`${manifest.kind}\``,
    `- receipt_nonce: \`${manifest.receipt_nonce}\``,
    `- bundle_dir: \`${path.resolve(bundleDir)}\``,
    `- deadline_at: \`${manifest.deadline_at}\``,
    `- work_unit_dir: \`${manifest.paths.work_unit_dir}\``,
    `- beacon: \`${manifest.paths.beacon_ref}\``,
    `- result_schema: \`${manifest.paths.result_schema_ref}\``,
    `- result_path: \`${manifest.paths.result_ref}\``,
    `- runtime_receipt: \`${manifest.paths.runtime_receipt_ref}\``,
    '',
    'Preserve these identity fields exactly in every lifecycle receipt event and in `result.json`.',
    'Read `_beacon.json` before writing runtime files. Resolve every runtime write by joining the beacon `bundle_dir` with the bundle-relative path from this task.',
    'Returning research findings in chat without writing the required files is a work-unit failure, not completion.',
    '',
    '## Absolute Runtime Paths',
    '',
    'Use these absolute paths for file I/O; keep bundle-relative refs in result JSON and ledger-facing fields.',
    '',
    '```json',
    jsonBlock(abs),
    '```',
    '',
    '## Write-Before-Return Checklist',
    '',
    '- Verify `_beacon.json`, `task.md`, and `result.schema.json` were read from the active `bundle_dir`.',
    '- Write every declared output file under `bundle_dir` only.',
    '- Write required cache leaves under `bundle_dir`; cache `page.md` must contain fetched page content or an explicit degraded/fetch-failure record, not an empty or placeholder header.',
    '- In `result.json`, declare `cache_trails` as bundle-relative cache leaf directory paths only, for example `_cache/wave0/primary/<queue_item_id>/<source_slug>`; do not list `websearch.json`, `page.md`, or `meta.json` file paths.',
    '- In written research outputs, include return-map cues for important evidence: `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`. These cues are diagnostic navigation only; submitted ledger rows and gate outputs remain authority.',
    '- Append `runtime-receipt.jsonl` lifecycle events carrying the exact `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.',
    '- Write `result.json` at the declared result path and verify it preserves the exact identity fields.',
    '- If any required write or verification fails, return a failure summary and do not claim success.',
    '',
    '## Output Contract',
    '',
    '```json',
    jsonBlock(manifest.output_contract),
    '```',
    '',
    '## Cache Policy',
    '',
    '```json',
    jsonBlock(manifest.cache_policy),
    '```',
    '',
    '## Lifecycle Receipt',
    '',
    `Append JSONL events to \`${manifest.paths.runtime_receipt_ref}\`. Every event must carry \`work_id\`, \`queue_item_id\`, \`kind\`, and \`receipt_nonce\`.`,
    '',
    '```jsonl',
    JSON.stringify(workStartedReceipt),
    JSON.stringify(fileWrittenReceipt),
    JSON.stringify(workDoneReceipt),
    '```',
    '',
    '## Diagnostic Logging',
    '',
    'Copy these examples when useful. Logs are diagnostic only; submit and gate authority come from Engine validation and the submitted ledger row.',
    '',
    '```bash',
    `node ${logCli} --bundle "${path.resolve(bundleDir)}" --level info --msg "work_unit_search_started" --detail '${JSON.stringify(searchLog)}'`,
    `node ${logCli} --bundle "${path.resolve(bundleDir)}" --level info --msg "work_unit_file_written" --detail '${JSON.stringify(fileLog)}'`,
    `node ${logCli} --bundle "${path.resolve(bundleDir)}" --level error --msg "work_unit_error" --detail '${JSON.stringify(errorLog)}'`,
    '```',
    '',
    '## Runtime Refs',
    '',
    'Coding-agent runtime IDs, thread IDs, session IDs, spawn request IDs, and cancel refs are optional diagnostic `runtime_refs` only. They are not queue, submit, ledger, or gate authority.',
    '',
    'Write the assigned result to the declared result path, verify all declared files exist under the active bundle root, and preserve the identity fields exactly.',
    'Completion is accepted only when the main Agent submits this work unit through `operate-work-unit submit`.',
    '',
  ].join('\n');
}

export function spawnPromptForWorkUnit(manifest, bundleDir = null) {
  const parsed = WorkUnitManifestSchema.parse(manifest);
  const resolvedBundleDir = bundleDir ? path.resolve(bundleDir) : null;
  const absResult = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.result_ref) : parsed.paths.result_ref;
  const absReceipt = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.runtime_receipt_ref) : parsed.paths.runtime_receipt_ref;
  const absBeacon = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.beacon_ref) : parsed.paths.beacon_ref;
  const absTask = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.task_ref) : parsed.paths.task_ref;
  const absSchema = resolvedBundleDir ? path.join(resolvedBundleDir, parsed.paths.result_schema_ref) : parsed.paths.result_schema_ref;
  return [
    `You are executing delegated work unit ${parsed.work_id}.`,
    '',
    resolvedBundleDir ? `Active bundle_dir: ${resolvedBundleDir}` : 'Read bundle_dir from the assigned _beacon.json before writing files.',
    `Open task.md first: ${absTask}`,
    `Open _beacon.json first: ${absBeacon}`,
    `Open result schema: ${absSchema}`,
    `Use exactly these identity fields in lifecycle receipts and result.json: work_id=${parsed.work_id}, queue_item_id=${parsed.queue_item_id}, kind=${parsed.kind}, receipt_nonce=${parsed.receipt_nonce}. Do not generate a new nonce.`,
    `Write lifecycle JSONL events to ${absReceipt}.`,
    `Write the final result JSON to ${absResult}.`,
    'Before returning, verify every declared output file, required cache leaf, runtime receipt, and result JSON exists under the active bundle_dir.',
    'In result.json, cache_trails must list cache leaf directory paths only; do not list websearch.json, page.md, or meta.json file paths.',
    'When writing evidence summaries, source notes, or backfill-ready content, include return-map fields: evidence_meaning, relationship, refs, status, next_hop.',
    'If you cannot write or verify the files, return a failure summary instead of research text.',
    `Keep any coding-agent runtime IDs only under optional runtime_refs diagnostic metadata; they are not authority.`,
    'Do not mutate queue, work-unit index, output ledger, or gate state. Return the result path to the main Agent for operate-work-unit submit.',
  ].join('\n');
}

export function writeWorkUnitEnvelope(bundleDir, manifest) {
  const parsed = WorkUnitManifestSchema.parse(manifest);
  const dir = path.join(bundleDir, parsed.paths.work_unit_dir);
  mkdirSync(dir, { recursive: true });
  writeJson(path.join(bundleDir, parsed.paths.manifest_ref), parsed);
  writeFileSync(path.join(bundleDir, parsed.paths.task_ref), taskMarkdown(parsed, bundleDir));
  writeJson(path.join(bundleDir, parsed.paths.result_schema_ref), resultSchemaDocument(parsed));
  writeJson(path.join(bundleDir, parsed.paths.beacon_ref), WorkUnitBeaconSchema.parse({
    schema_version: WORK_UNIT_BEACON_SCHEMA_VERSION,
    work_id: parsed.work_id,
    queue_item_id: parsed.queue_item_id,
    kind: parsed.kind,
    bundle: bundleName(bundleDir),
    bundle_dir: path.resolve(bundleDir),
    receipt_nonce: parsed.receipt_nonce,
    deadline_at: parsed.deadline_at,
    work_unit_dir: parsed.paths.work_unit_dir,
    manifest_ref: parsed.paths.manifest_ref,
    task_ref: parsed.paths.task_ref,
    result_schema_ref: parsed.paths.result_schema_ref,
    result_ref: parsed.paths.result_ref,
    runtime_receipt_ref: parsed.paths.runtime_receipt_ref,
    log_cli: logCliPath(),
    output_contract: parsed.output_contract,
    cache_policy: parsed.cache_policy,
    required_receipt_fields: [...WORK_UNIT_REQUIRED_RECEIPT_FIELDS],
    runtime_refs: parsed.runtime_refs || {},
    runtime_refs_authority: 'diagnostic_only',
  }));
  writeFileSync(path.join(bundleDir, parsed.paths.runtime_receipt_ref), '');
  writeJson(path.join(bundleDir, parsed.paths.status_ref), WorkUnitStatusFileSchema.parse({
    work_id: parsed.work_id,
    status: 'claimed',
    updated_at: now(),
  }));
  writeJson(path.join(bundleDir, parsed.paths.agent_ref), WorkUnitAgentFileSchema.parse({
    work_id: parsed.work_id,
    runtime_refs: parsed.runtime_refs || {},
    updated_at: now(),
  }));
  return parsed;
}

function traceWorkUnitEvent(bundleDir, event, detail) {
  const trace = createTrace(path.join(bundleDir, 'rb_trace.jsonl'), { consoleEcho: false });
  trace.traceEntry(event, { source: 'work-unit', bundle: readBundleName(bundleDir), ...detail });
}

function emitWorkUnitInspectDiagnostics(bundleDir, { issues, source = 'work-unit-inspect' } = {}) {
  if (!issues || issues.length === 0) return;
  const diagnostic = {
    issue_count: issues.length,
    issues: issues.slice(0, 20),
  };
  try {
    const trace = createTrace(path.join(bundleDir, 'rb_trace.jsonl'), { consoleEcho: false });
    trace.traceEntry('diagnostic', {
      source,
      bundle: readBundleName(bundleDir),
      kind: 'work_unit_inspect_failed',
      ...diagnostic,
    });
    if (issues.some((issue) => /transaction/i.test(issue))) {
      trace.traceEntry('diagnostic', {
        source,
        bundle: readBundleName(bundleDir),
        kind: 'work_unit_transaction_mismatch',
        ...diagnostic,
      });
    }
    if (issues.some((issue) => /ledger|provenance|output file|cache trail|submitted result|unsupported delegated ledger/i.test(issue))) {
      trace.traceEntry('diagnostic', {
        source,
        bundle: readBundleName(bundleDir),
        kind: 'work_unit_provenance_mismatch',
        ...diagnostic,
      });
    }
  } catch { /* diagnostics must not mask inspect output */ }
  logToRun(bundleDir, 'warn', 'work_unit_inspect_failed', {
    kind: 'work_unit_inspect',
    ...diagnostic,
  });
  if (issues.some((issue) => /transaction/i.test(issue))) {
    logToRun(bundleDir, 'warn', 'work_unit_transaction_mismatch', {
      kind: 'work_unit_inspect',
      ...diagnostic,
    });
  }
  if (issues.some((issue) => /ledger|provenance|output file|cache trail|submitted result|unsupported delegated ledger/i.test(issue))) {
    logToRun(bundleDir, 'warn', 'work_unit_provenance_mismatch', {
      kind: 'work_unit_inspect',
      ...diagnostic,
    });
  }
}

function createWorkUnitInIndex(bundleDir, index, {
  queueItem,
  wave,
  kind = queueItem.kind,
  timeout_ms,
  creation_reason = 'claim',
  batchReason = 'initial_phase_drain',
  runtime_refs = {},
} = {}) {
  if (!queueItem?.queue_item_id) throw new Error('queueItem.queue_item_id is required');
  if (!kind) throw new Error('work-unit kind is required');
  const timeoutMs = timeout_ms || queueItem.targets?.delegates?.timeout_ms || 600000;
  const allocation = allocateWorkId(index, {
    wave,
    kind,
    queue_item_id: queueItem.queue_item_id,
    batchReason,
  });
  const claimedAt = now();
  const deadlineAt = new Date(Date.parse(claimedAt) + timeoutMs).toISOString();
  const { refs } = refsForWorkUnit(bundleDir, allocation);
  const receiptNonce = `wu-${randomUUID()}`;
  const kindContract = kindContractForQueueItem(queueItem, kind);
  const manifest = WorkUnitManifestSchema.parse({
    schema_version: WORK_UNIT_MANIFEST_SCHEMA_VERSION,
    ...allocation,
    task_brief: kindContract.task_brief,
    queue_item_id: queueItem.queue_item_id,
    producer_rule: queueItem.producer_rule,
    creation_reason,
    queue_item_snapshot_hash: queueItemSnapshotHash(queueItem),
    receipt_nonce: receiptNonce,
    claimed_at: claimedAt,
    timeout_ms: timeoutMs,
    deadline_at: deadlineAt,
    output_contract: kindContract.output_contract,
    cache_policy: kindContract.cache_policy,
    runtime_refs,
    paths: refs,
    queue_item: clone(queueItem),
  });
  validateWorkIdBinding({ ...manifest, kindRegistry: index.kind_registry });
  writeWorkUnitEnvelope(bundleDir, manifest);
  const record = {
    work_id: manifest.work_id,
    queue_item_id: manifest.queue_item_id,
    wave: manifest.wave,
    batch_id: manifest.batch_id,
    batch_index: manifest.batch_index,
    claim_index: manifest.claim_index,
    attempt_index: manifest.attempt_index,
    kind: manifest.kind,
    kind_code: manifest.kind_code,
    status: 'claimed',
    producer_rule: manifest.producer_rule,
    creation_reason: manifest.creation_reason,
    queue_item_snapshot_hash: manifest.queue_item_snapshot_hash,
    receipt_nonce: manifest.receipt_nonce,
    claimed_at: manifest.claimed_at,
    timeout_ms: manifest.timeout_ms,
    deadline_at: manifest.deadline_at,
    runtime_refs: manifest.runtime_refs,
    paths: manifest.paths,
  };
  index.work_units[record.work_id] = record;
  return { record, manifest };
}

export function createWorkUnit(bundleDir, options = {}) {
  return withWorkUnitTransaction(bundleDir, 'create_work_unit', () => {
    const index = loadWorkUnitIndex(bundleDir, { createIfMissing: true });
    const { record, manifest } = createWorkUnitInIndex(bundleDir, index, options);
    const saved = saveWorkUnitIndex(bundleDir, index);
  return { index: saved, record: saved.work_units[record.work_id], manifest, spawn_prompt: spawnPromptForWorkUnit(manifest, bundleDir) };
  });
}

function requireWorkUnitRecord(index, workId) {
  const record = index.work_units[workId];
  if (!record) throw new Error(`Unknown work_id '${workId}'`);
  return record;
}

function readAndValidateManifest(bundleDir, index, record) {
  const manifestPath = path.join(bundleDir, record.paths.manifest_ref);
  if (!existsSync(manifestPath)) throw new Error(`Missing manifest: ${record.paths.manifest_ref}`);
  const manifest = WorkUnitManifestSchema.parse(readJson(manifestPath));
  validateWorkIdBinding({ ...manifest, kindRegistry: index.kind_registry });
  for (const field of ['work_id', 'queue_item_id', 'wave', 'kind', 'kind_code', 'receipt_nonce', 'queue_item_snapshot_hash']) {
    if (manifest[field] !== record[field]) throw new Error(`manifest/index mismatch for ${record.work_id}: ${field}`);
  }
  return manifest;
}

function readAndValidateBeacon(bundleDir, record, manifest) {
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

function readAndValidateResult(resultPath, record) {
  if (!resultPath) throw new Error('--result is required');
  if (!existsSync(resultPath)) throw new Error(`Result file not found: ${resultPath}`);
  const result = WorkUnitResultSchema.parse(readJson(resultPath));
  for (const field of ['work_id', 'queue_item_id', 'kind', 'receipt_nonce']) {
    if (result[field] !== record[field]) throw new Error(`result/index mismatch for ${record.work_id}: ${field}`);
  }
  return result;
}

function validateSubmitRuntimeReceipt(bundleDir, record) {
  const receiptPath = path.join(bundleDir, record.paths.runtime_receipt_ref);
  if (!existsSync(receiptPath)) throw new Error(`Missing runtime receipt: ${record.paths.runtime_receipt_ref}`);
  const raw = readFileSync(receiptPath, 'utf-8');
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error(`Runtime receipt has no lifecycle events: ${record.paths.runtime_receipt_ref}`);
  const events = [];
  lines.forEach((line, index) => {
    const event = WorkUnitRuntimeReceiptEventSchema.parse(JSON.parse(line));
    for (const field of WORK_UNIT_REQUIRED_RECEIPT_FIELDS) {
      if (event[field] !== record[field]) throw new Error(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: ${field}`);
    }
    events.push(event);
  });
  return events;
}

function validateOutputFiles(bundleDir, result, outputContract) {
  const outputFiles = result.output_files || [];
  if (outputContract?.output_files?.required && outputFiles.length === 0) {
    throw new Error('output_files[] is required by the work-unit output contract');
  }
  for (const entry of outputFiles) {
    if (!isSafeBundleRelative(entry.path)) throw new Error(`output_files path escapes bundle: ${entry.path}`);
    if (!existsSync(path.join(bundleDir, entry.path))) throw new Error(`declared output file missing: ${entry.path}`);
    if (entry.role === 'reference' && outputContract?.output_files?.reference_requires_source_url && !entry.source_url) {
      throw new Error(`reference output missing source_url: ${entry.path}`);
    }
  }
}

function validateCacheTrails(bundleDir, result, cachePolicy) {
  const trails = result.cache_trails || [];
  if (cachePolicy?.required && trails.length === 0) throw new Error('cache_trails[] is required by the work-unit cache policy');
  for (const trail of trails) {
    if (!isSafeBundleRelative(trail)) throw new Error(`cache_trails path escapes bundle: ${trail}`);
    if (!trail.startsWith(`${cachePolicy?.root || '_cache/'}`)) throw new Error(`cache_trails path not under ${cachePolicy?.root || '_cache/'}: ${trail}`);
    const full = path.join(bundleDir, trail);
    if (!existsSync(full)) throw new Error(`cache trail directory missing: ${trail}`);
    if (!statSync(full).isDirectory()) throw new Error(`cache_trails path is not a directory: ${trail}`);
    const directFiles = new Set(readdirSync(full).filter((entry) => {
      try { return statSync(path.join(full, entry)).isFile(); } catch { return false; }
    }));
    const missing = (cachePolicy?.leaf_files || ['websearch.json', 'page.md', 'meta.json'])
      .filter((entry) => !directFiles.has(entry));
    if (missing.length > 0) throw new Error(`cache trail ${trail} missing ${missing.join(', ')}`);
    validateCacheTrailContent(full, trail);
  }
}

function readOptionalJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
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

function validateCacheTrailContent(cacheDir, trail) {
  const pagePath = path.join(cacheDir, 'page.md');
  const metaPath = path.join(cacheDir, 'meta.json');
  const pageText = existsSync(pagePath) ? readFileSync(pagePath, 'utf-8') : '';
  const meta = existsSync(metaPath) ? readOptionalJson(metaPath) : null;
  const trimmed = pageText.trim();
  if (!trimmed) throw new Error(`cache trail ${trail} has incomplete cache content: page.md is empty`);
  const nonEmptyLines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const placeholderOnly = nonEmptyLines.length <= 2 && nonEmptyLines.every((line) => /^#*\s*(cache page for|page|placeholder|todo|tbd)\b/i.test(line));
  if (placeholderOnly && !hasExplicitDegradedCapture(trimmed, meta)) {
    throw new Error(`cache trail ${trail} has incomplete cache content: page.md is placeholder-only`);
  }
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    throw new Error(`cache trail ${trail} has incomplete cache content: meta.json is missing or invalid`);
  }
  const urlLike = meta.url || meta.source_url || meta.final_url || meta.fetched_url || meta.source_slug;
  if (!urlLike) throw new Error(`cache trail ${trail} has incomplete cache content: meta.json lacks url/source mapping`);
}

function validateQueueBindingForSubmit(bundleDir, record, manifest) {
  const queue = loadQueue(bundleDir);
  const inFlight = queue.delegated_in_flight?.[record.queue_item_id];
  if (!inFlight) throw new Error(`queue_item_id ${record.queue_item_id} is not delegated in flight`);
  if (inFlight.work_id !== record.work_id) throw new Error(`queue in-flight binding mismatch for ${record.queue_item_id}: ${inFlight.work_id}`);
  if (inFlight.queue_item_snapshot_hash !== record.queue_item_snapshot_hash) throw new Error(`queue snapshot hash mismatch for ${record.queue_item_id}`);
  if (queueItemSnapshotHash(manifest.queue_item) !== record.queue_item_snapshot_hash) throw new Error(`manifest queue item snapshot hash is stale for ${record.work_id}`);
  return queue;
}

function captureFileSnapshot(filePath) {
  return existsSync(filePath)
    ? { exists: true, content: readFileSync(filePath) }
    : { exists: false, content: null };
}

function restoreFileSnapshot(filePath, snapshot) {
  if (snapshot.exists) {
    writeFileSync(filePath, snapshot.content);
  } else {
    rmSync(filePath, { force: true });
  }
}

function captureSubmitSnapshot(bundleDir, record) {
  const files = [
    workUnitIndexPath(bundleDir),
    path.join(bundleDir, 'rb_queue.json'),
    ledgerPath(bundleDir),
    path.join(bundleDir, record.paths.result_ref),
    path.join(bundleDir, record.paths.status_ref),
  ];
  return files.map((filePath) => ({ filePath, snapshot: captureFileSnapshot(filePath) }));
}

function restoreSubmitSnapshot(snapshot) {
  const failures = [];
  for (const entry of snapshot.slice().reverse()) {
    try {
      restoreFileSnapshot(entry.filePath, entry.snapshot);
    } catch (err) {
      failures.push({ path: entry.filePath, reason: err.message || String(err) });
    }
  }
  return { ok: failures.length === 0, failures };
}

function verifySubmitDurablePostcondition(bundleDir, record) {
  const missing = [];
  let queue = null;
  let index = null;

  try {
    queue = loadQueue(bundleDir);
  } catch (err) {
    missing.push(`rb_queue.json reload failed: ${err.message || String(err)}`);
  }

  if (queue) {
    if (queue.delegated_in_flight?.[record.queue_item_id]) {
      missing.push(`rb_queue.json delegated_in_flight still contains ${record.queue_item_id}`);
    }
    const hasTerminal = (queue.terminal_history || []).some((entry) => (
      entry.queue_item_id === record.queue_item_id &&
      entry.work_id === record.work_id &&
      entry.terminal_status === 'done'
    ));
    if (!hasTerminal) {
      missing.push(`rb_queue.json terminal_history lacks done record for ${record.queue_item_id}/${record.work_id}`);
    }
  }

  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
    if (index.work_units?.[record.work_id]?.status !== 'submitted') {
      missing.push(`_work_units/_index.json does not mark ${record.work_id} submitted`);
    }
  } catch (err) {
    missing.push(`_work_units/_index.json reload failed: ${err.message || String(err)}`);
  }

  try {
    const ledgerRow = findSubmittedLedgerRow(bundleDir, record.work_id);
    if (!ledgerRow || ledgerRow.queue_item_id !== record.queue_item_id) {
      missing.push(`rb_output_declarations.jsonl lacks submitted ledger row for ${record.work_id}`);
    }
  } catch (err) {
    missing.push(`rb_output_declarations.jsonl reload failed: ${err.message || String(err)}`);
  }

  return { ok: missing.length === 0, missing, queue, index };
}

function buildSubmitDurabilityFailure(prepared, error, rollback) {
  const missing = error.missing_postconditions || [error.message || String(error)];
  const rollbackFailures = rollback?.failures || [];
  return {
    ok: false,
    work_id: prepared.record.work_id,
    queue_item_id: prepared.record.queue_item_id,
    status: rollback?.ok ? 'claimed' : 'suspect',
    reason_code: 'queue_postcondition_failed',
    reason: `Submit durable queue postcondition failed: ${missing.join('; ')}`,
    missing_postconditions: missing,
    rollback: {
      attempted: true,
      restored: Boolean(rollback?.ok),
      failures: rollbackFailures,
    },
    suspect_state: !rollback?.ok,
    inspect: [
      ...missing.map((item) => `Missing submit postcondition: ${item}`),
      ...(rollback?.ok
        ? ['Submit writes were rolled back to the prior durable state.']
        : ['Submit rollback could not be proven; work-unit/queue completion state is suspect.']),
    ],
    advice: 'Repair through Engine queue/work-unit tooling; do not hand-edit rb_queue.json or work-unit ledgers.',
  };
}

function buildLedgerRow({ record, result, resultHash, declaredAt }) {
  const base = {
    declared_at: declaredAt,
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    wave: record.wave,
    kind: record.kind,
    producer_rule: record.producer_rule,
    creation_reason: record.creation_reason,
    work_unit_ref: record.paths.work_unit_dir,
    result_ref: record.paths.result_ref,
    runtime_receipt_ref: record.paths.runtime_receipt_ref,
    receipt_nonce: record.receipt_nonce,
    output_files: result.output_files || [],
    cache_trails: result.cache_trails || [],
    result_hash: resultHash,
  };
  return WorkUnitLedgerRecordSchema.parse({
    ...base,
    ledger_record_hash: computeWorkUnitLedgerRecordHash(base),
  });
}

export function computeWorkUnitLedgerRecordHash(row) {
  const { ledger_record_hash: _existing, ...base } = row;
  return hashValue(base);
}

export function readWorkUnitLedgerRows(bundleDir) {
  return readLedgerRows(bundleDir).map((row) => {
    const parsed = WorkUnitLedgerRecordSchema.parse(row);
    const expected = computeWorkUnitLedgerRecordHash(parsed);
    if (parsed.ledger_record_hash !== expected) {
      throw new Error(`ledger_record_hash mismatch for ${parsed.work_id}`);
    }
    return parsed;
  });
}

function findSubmittedLedgerRow(bundleDir, workId) {
  return readWorkUnitLedgerRows(bundleDir).find((row) => row.work_id === workId);
}

function reasonCodeForSubmit(message) {
  if (/runtime receipt|lifecycle events/i.test(message)) return 'missing_receipt';
  if (/receipt_nonce|nonce|receipt mismatch/i.test(message)) return 'nonce_mismatch';
  if (/result\/index mismatch.*work_id|Unknown work_id|work_id/i.test(message)) return 'wrong_work_id';
  if (/output_files|declared output file/i.test(message)) return 'missing_output';
  if (/cache_trails|cache trail/i.test(message)) return 'missing_cache';
  if (/snapshot hash|stale/i.test(message)) return 'stale_snapshot';
  if (/duplicate submit/i.test(message)) return 'duplicate_content_mismatch';
  return 'invalid_result';
}

function submitRejectionPayload(record, reason, resultPath) {
  return {
    rejected_at: now(),
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    status: record.status,
    reason,
    reason_code: reasonCodeForSubmit(reason),
    result_path: resultPath ? path.resolve(resultPath) : null,
  };
}

function recordSubmitRejection(bundleDir, { work_id, resultPath, reason }) {
  let index;
  let record;
  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
    record = requireWorkUnitRecord(index, work_id);
  } catch {
    return {
      ok: false,
      work_id,
      status: 'unknown',
      reason,
      reason_code: reasonCodeForSubmit(reason),
      inspect: [reason],
      advice: 'Use a known claimed work_id from operate-work-unit claim.',
    };
  }

  if (['failed', 'timed_out', 'abandoned'].includes(record.status)) {
    const rejected = submitRejectionPayload(record, `late submit rejected for terminal status ${record.status}: ${reason}`, resultPath);
    traceWorkUnitEvent(bundleDir, 'work_unit_late_submit_rejected', {
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      terminal_status: record.status,
      terminal_reason: record.terminal_reason || null,
      reason_code: rejected.reason_code,
    });
    logToRun(bundleDir, 'warn', 'work_unit_late_submit_rejected', {
      kind: 'work_unit_submit',
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      terminal_status: record.status,
      terminal_reason: record.terminal_reason || null,
      runtime_refs: record.runtime_refs || {},
    });
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      last_submit_rejection: rejected,
      inspect: [rejected.reason],
      advice: 'Terminal work-unit attempts cannot be submitted; allocate a replacement work unit when retry is allowed.',
    };
  }

  if (record.status !== 'claimed') {
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      reason,
      reason_code: reasonCodeForSubmit(reason),
      inspect: [reason],
      advice: 'Submit is only accepted for claimed attempts, except same-content duplicate submitted attempts.',
    };
  }

  return withWorkUnitTransaction(bundleDir, 'reject_work_unit_submit', ({ tx_id }) => {
    const rejection = submitRejectionPayload(record, reason, resultPath);
    record.last_submit_rejection = rejection;
    index.work_units[record.work_id] = record;
    writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitStatusFileSchema.parse({
      work_id: record.work_id,
      status: 'claimed',
      last_submit_rejection: rejection,
      updated_at: rejection.rejected_at,
    }));
    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    traceWorkUnitEvent(bundleDir, 'work_unit_submit_rejected', {
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      kind: record.kind,
      receipt_nonce: record.receipt_nonce,
      reason_code: rejection.reason_code,
    });
    logToRun(bundleDir, 'warn', 'work_unit_submit_rejected', {
      kind: 'work_unit_submit',
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      reason_code: rejection.reason_code,
      reason,
    });
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: 'claimed',
      last_submit_rejection: rejection,
      inspect: [reason],
      advice: 'Correct the result/receipt/output/cache issue and submit the same claimed work_id again, or close the attempt explicitly.',
      index: savedIndex,
    };
  });
}

function prepareWorkUnitSubmit(bundleDir, { work_id, resultPath }) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);

  if (record.status === 'submitted') {
    const result = readAndValidateResult(resultPath, record);
    const resultHash = hashValue(result);
    const ledgerRow = findSubmittedLedgerRow(bundleDir, record.work_id);
    if (record.result_hash === resultHash && ledgerRow?.ledger_record_hash === record.ledger_record_hash) {
      return { duplicate: true, index, record, result, result_hash: resultHash, ledger_record_hash: record.ledger_record_hash, ledger_row: ledgerRow };
    }
    throw new Error(`different-content duplicate submit rejected for ${record.work_id}`);
  }
  if (record.status !== 'claimed') throw new Error(`work_id ${record.work_id} is ${record.status}; submit requires claimed`);

  const result = readAndValidateResult(resultPath, record);
  const resultHash = hashValue(result);
  const manifest = readAndValidateManifest(bundleDir, index, record);
  readAndValidateBeacon(bundleDir, record, manifest);
  validateSubmitRuntimeReceipt(bundleDir, record);
  const queue = validateQueueBindingForSubmit(bundleDir, record, manifest);
  validateOutputFiles(bundleDir, result, manifest.output_contract);
  validateCacheTrails(bundleDir, result, manifest.cache_policy);
  const ledgerRow = buildLedgerRow({ record, result, resultHash, declaredAt: now() });
  return { duplicate: false, index, record, manifest, queue, result, result_hash: resultHash, ledger_row: ledgerRow, ledger_record_hash: ledgerRow.ledger_record_hash };
}

export function submitWorkUnit(bundleDir, { work_id, resultPath, afterQueueSave = null } = {}) {
  let prepared;
  try {
    prepared = prepareWorkUnitSubmit(bundleDir, { work_id, resultPath });
  } catch (error) {
    return recordSubmitRejection(bundleDir, { work_id, resultPath, reason: error.message || String(error) });
  }
  if (prepared.duplicate) {
    return {
      ok: true,
      duplicate: true,
      work_id: prepared.record.work_id,
      queue_item_id: prepared.record.queue_item_id,
      status: 'submitted',
      result_hash: prepared.result_hash,
      ledger_record_hash: prepared.ledger_record_hash,
    };
  }

  try {
    return withWorkUnitTransaction(bundleDir, 'submit_work_unit', ({ tx_id }) => {
      const index = prepared.index;
      let queue = prepared.queue;
      const record = index.work_units[prepared.record.work_id];
      const submittedAt = now();
      const snapshot = captureSubmitSnapshot(bundleDir, record);

      try {
        writeJson(path.join(bundleDir, record.paths.result_ref), prepared.result);
        writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitStatusFileSchema.parse({
          work_id: record.work_id,
          status: 'submitted',
          result_hash: prepared.result_hash,
          ledger_record_hash: prepared.ledger_record_hash,
          updated_at: submittedAt,
        }));

        record.status = 'submitted';
        record.result_hash = prepared.result_hash;
        record.ledger_record_hash = prepared.ledger_record_hash;
        record.terminal_at = submittedAt;
        index.work_units[record.work_id] = record;

        delete queue.delegated_in_flight[record.queue_item_id];
        queue.terminal_history.push({
          queue_item_id: record.queue_item_id,
          terminal_status: 'done',
          completed_at: submittedAt,
          work_id: record.work_id,
          reason: prepared.result.summary || undefined,
          item: prepared.manifest.queue_item,
        });
        queue = refill(queue);

        appendLedgerRow(bundleDir, prepared.ledger_row);
        const savedIndex = saveWorkUnitIndex(bundleDir, index);
        const savedQueue = saveQueue(bundleDir, queue);
        if (typeof afterQueueSave === 'function') {
          afterQueueSave({ bundleDir, record: clone(record), savedQueue: clone(savedQueue), savedIndex: clone(savedIndex) });
        }

        const postcondition = verifySubmitDurablePostcondition(bundleDir, record);
        if (!postcondition.ok) {
          const err = new Error(`submit durable queue postcondition failed: ${postcondition.missing.join('; ')}`);
          err.missing_postconditions = postcondition.missing;
          throw err;
        }

        traceWorkUnitEvent(bundleDir, 'work_unit_ledger_appended', {
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: prepared.ledger_record_hash,
          output_count: (prepared.ledger_row.output_files || []).length,
          cache_trail_count: (prepared.ledger_row.cache_trails || []).length,
        });
        logToRun(bundleDir, 'info', 'work_unit_ledger_appended', {
          kind: 'ledger_append',
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: prepared.ledger_record_hash,
        });
        traceWorkUnitEvent(bundleDir, 'work_unit_submitted', {
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          wave: record.wave,
          kind: record.kind,
          receipt_nonce: record.receipt_nonce,
          result_hash: prepared.result_hash,
          ledger_record_hash: prepared.ledger_record_hash,
        });
        logToRun(bundleDir, 'info', 'work_unit_submitted', {
          kind: 'work_unit_submit',
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          result_hash: prepared.result_hash,
          ledger_record_hash: prepared.ledger_record_hash,
        });

        return {
          ok: true,
          duplicate: false,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          status: 'submitted',
          result_hash: prepared.result_hash,
          ledger_record_hash: prepared.ledger_record_hash,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          queue: postcondition.queue,
          index: postcondition.index,
        };
      } catch (error) {
        const rollback = restoreSubmitSnapshot(snapshot);
        error.submit_failure_payload = buildSubmitDurabilityFailure(prepared, error, rollback);
        throw error;
      }
    });
  } catch (error) {
    if (error.submit_failure_payload) return error.submit_failure_payload;
    throw error;
  }
}

function statusToEvent(status) {
  if (status === 'failed') return 'work_unit_failed';
  if (status === 'timed_out') return 'work_unit_timed_out';
  if (status === 'abandoned') return 'work_unit_abandoned';
  return 'work_unit_terminal';
}

function statusToQueueTerminal(status) {
  if (status === 'failed') return 'failed';
  if (status === 'abandoned') return 'cancelled';
  return 'blocked';
}

export function closeWorkUnitAttempt(bundleDir, { work_id, status, reason } = {}) {
  if (!['failed', 'timed_out', 'abandoned'].includes(status)) throw new Error(`unsupported terminal status: ${status}`);
  if (!reason) throw new Error('--reason is required');

  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  if (record.status === status && record.terminal_reason === reason) {
    return { ok: true, duplicate: true, work_id: record.work_id, queue_item_id: record.queue_item_id, status: record.status, reason };
  }
  if (record.status === 'submitted') {
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      inspect: [`work_id ${record.work_id} is already submitted`],
      advice: 'Submitted attempts cannot be terminalized.',
    };
  }
  if (record.status !== 'claimed') {
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      inspect: [`work_id ${record.work_id} is already ${record.status}`],
      advice: 'A terminal attempt can only be repeated idempotently with the same status and reason.',
    };
  }

  const manifest = readAndValidateManifest(bundleDir, index, record);
  return withWorkUnitTransaction(bundleDir, `work_unit_${status}`, ({ tx_id }) => {
    let queue = loadQueue(bundleDir);
    const inFlight = queue.delegated_in_flight?.[record.queue_item_id];
    if (!inFlight || inFlight.work_id !== record.work_id) {
      throw new Error(`queue in-flight binding missing for ${record.work_id}`);
    }
    delete queue.delegated_in_flight[record.queue_item_id];

    const closedAt = now();
    record.status = status;
    record.terminal_reason = reason;
    record.terminal_at = closedAt;
    index.work_units[record.work_id] = record;
    writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitStatusFileSchema.parse({
      work_id: record.work_id,
      status,
      updated_at: closedAt,
    }));

    if (status === 'timed_out') {
      const retryItem = {
        ...manifest.queue_item,
        status: 'queued',
        updated_at: closedAt,
        lineage: {
          ...(manifest.queue_item.lineage || {}),
          retry_of_work_id: record.work_id,
          retry_reason: reason,
          attempt_index: record.attempt_index + 1,
        },
      };
      queue = preempt(queue, retryItem, { reason: 'work_unit_timeout_retry' });
    } else {
      queue.terminal_history.push({
        queue_item_id: record.queue_item_id,
        terminal_status: statusToQueueTerminal(status),
        completed_at: closedAt,
        work_id: record.work_id,
        reason,
        item: manifest.queue_item,
      });
      queue = refill(queue);
    }

    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    const savedQueue = saveQueue(bundleDir, queue);
    const event = statusToEvent(status);
    traceWorkUnitEvent(bundleDir, event, {
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      wave: record.wave,
      kind: record.kind,
      receipt_nonce: record.receipt_nonce,
      reason,
    });
    logToRun(bundleDir, status === 'timed_out' ? 'warn' : 'info', event, {
      kind: 'work_unit_terminal',
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status,
      reason,
      runtime_refs: record.runtime_refs || {},
    });
    return {
      ok: true,
      duplicate: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status,
      reason,
      retry_requeued: status === 'timed_out',
      queue: savedQueue,
      index: savedIndex,
    };
  });
}

export function openWorkUnitBatch(bundleDir, { phase, reason, lineage = {} } = {}) {
  const wave = parsePhase(phase);
  if (!reason) throw new Error('--reason is required');
  return withWorkUnitTransaction(bundleDir, 'open_work_unit_batch', ({ tx_id }) => {
    const index = loadWorkUnitIndex(bundleDir, { createIfMissing: true });
    const key = waveKey(wave);
    if (!index.waves[key]) index.waves[key] = { current_batch_index: 0, batches: {} };
    const waveState = index.waves[key];
    const nextIndex = Math.max(1, waveState.current_batch_index + 1);
    waveState.current_batch_index = nextIndex;
    const id = batchId(nextIndex);
    waveState.batches[id] = {
      batch_index: nextIndex,
      batch_reason: reason,
      next_claim_index: 1,
      opened_at: now(),
      lineage: {
        prior_work_unit_count: Object.values(index.work_units || {}).filter((record) => record.wave === wave).length,
        prior_status_counts: computeStatusCounts(Object.fromEntries(
          Object.entries(index.work_units || {}).filter(([, record]) => record.wave === wave),
        )),
        ...lineage,
      },
    };
    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    traceWorkUnitEvent(bundleDir, 'work_unit_batch_opened', {
      tx_id,
      phase,
      wave,
      batch_id: id,
      batch_reason: reason,
    });
    logToRun(bundleDir, 'info', 'work_unit_batch_opened', {
      kind: 'work_unit_batch',
      tx_id,
      phase,
      batch_id: id,
      batch_reason: reason,
    });
    return { ok: true, phase, wave, batch_id: id, batch_reason: reason, index: savedIndex };
  });
}

function parsePhase(phase) {
  const match = String(phase || '').match(/^wave(?<wave>[0-9]+)$/);
  if (!match?.groups) throw new Error(`--phase must be waveN, got '${phase}'`);
  return Number.parseInt(match.groups.wave, 10);
}

function defaultKindForWave(wave) {
  if (wave === 0) return 'wave0_source_intake';
  if (wave === 1) return 'wave1_topic_deepening';
  if (wave === 2) return 'wave2_targeted_evidence';
  return null;
}

function itemWave(item) {
  if (Number.isInteger(item.payload?.wave)) return item.payload.wave;
  if (Number.isInteger(item.lineage?.wave)) return item.lineage.wave;
  if (typeof item.kind === 'string') {
    const match = item.kind.match(/^wave(?<wave>[0-9]+)_/);
    if (match?.groups) return Number.parseInt(match.groups.wave, 10);
  }
  return null;
}

function isEligibleDelegatedItem(item, wave) {
  if (!item || item.targets?.delegates?.to !== 'sub-agent') return false;
  const waveFromItem = itemWave(item);
  return waveFromItem === null || waveFromItem === wave;
}

function countUnclaimedDelegated(queue, wave) {
  return [...queue.active_window, ...queue.refill_pool]
    .filter((item) => isEligibleDelegatedItem(item, wave)).length;
}

function phaseInFlight(queue, wave) {
  return Object.values(queue.delegated_in_flight || {})
    .filter((entry) => entry.wave === wave);
}

export function claimWorkUnits(bundleDir, { phase, count = 1, batchReason = 'initial_phase_drain' } = {}) {
  const wave = parsePhase(phase);
  const requestedCount = Number.parseInt(String(count), 10);
  if (!Number.isInteger(requestedCount) || requestedCount < 1) throw new Error('--count must be a positive integer');

  const previewQueue = loadQueue(bundleDir);
  const previewFront = previewQueue.active_window[0];
  if (!previewFront || !isEligibleDelegatedItem(previewFront, wave) || !(previewFront.kind || defaultKindForWave(wave))) {
    const blockedBy = previewFront && !isEligibleDelegatedItem(previewFront, wave) ? previewFront.queue_item_id : null;
    return {
      ok: false,
      requested_count: requestedCount,
      claimed_count: 0,
      claimed_work_ids: [],
      in_flight_count: phaseInFlight(previewQueue, wave).length,
      unclaimed_delegated_count: countUnclaimedDelegated(previewQueue, wave),
      blocked_by_queue_item_id: blockedBy,
      phase_drained: countUnclaimedDelegated(previewQueue, wave) === 0 && phaseInFlight(previewQueue, wave).length === 0,
      prompt_refs: [],
      queue: previewQueue,
    };
  }

  return withWorkUnitTransaction(bundleDir, 'claim_work_units', ({ tx_id }) => {
    let queue = previewQueue;
    const index = loadWorkUnitIndex(bundleDir, { createIfMissing: true });
    const claimed = [];
    let blockedBy = null;

    for (let i = 0; i < requestedCount; i += 1) {
      const front = queue.active_window[0];
      if (!front) break;
      if (!isEligibleDelegatedItem(front, wave)) {
        blockedBy = front.queue_item_id;
        break;
      }
      const kind = front.kind || defaultKindForWave(wave);
      if (!kind) {
        blockedBy = front.queue_item_id;
        break;
      }
      if (queue.delegated_in_flight[front.queue_item_id]) {
        throw new Error(`queue_item_id ${front.queue_item_id} is already delegated in flight`);
      }

      queue.active_window.shift();
      const { record, manifest } = createWorkUnitInIndex(bundleDir, index, {
        queueItem: front,
        wave,
        kind,
        creation_reason: 'claim',
        batchReason,
      });
      queue.delegated_in_flight[front.queue_item_id] = {
        queue_item_id: front.queue_item_id,
        work_id: record.work_id,
        wave: record.wave,
        batch_id: record.batch_id,
        kind: record.kind,
        attempt_index: record.attempt_index,
        queue_item_snapshot_hash: record.queue_item_snapshot_hash,
        claimed_at: record.claimed_at,
        timeout_ms: record.timeout_ms,
        deadline_at: record.deadline_at,
      };
      claimed.push({ record, manifest });
      const claimEvent = record.attempt_index > 1 ? 'work_unit_retry_claimed' : 'work_unit_claimed';
      traceWorkUnitEvent(bundleDir, claimEvent, {
        tx_id,
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        wave: record.wave,
        kind: record.kind,
        receipt_nonce: record.receipt_nonce,
        attempt_index: record.attempt_index,
      });
      logToRun(bundleDir, 'info', claimEvent, {
        kind: 'queue_claim',
        tx_id,
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        wave: record.wave,
        work_unit_kind: record.kind,
        attempt_index: record.attempt_index,
      });
    }

    queue = refill(queue);
    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    const savedQueue = saveQueue(bundleDir, queue);
    const inFlight = phaseInFlight(savedQueue, wave);
    const unclaimedDelegated = countUnclaimedDelegated(savedQueue, wave);
    const response = {
      ok: claimed.length > 0,
      requested_count: requestedCount,
      claimed_count: claimed.length,
      claimed_work_ids: claimed.map(({ record }) => record.work_id),
      in_flight_count: inFlight.length,
      unclaimed_delegated_count: unclaimedDelegated,
      blocked_by_queue_item_id: blockedBy,
      phase_drained: unclaimedDelegated === 0 && inFlight.length === 0,
      prompt_refs: claimed.map(({ record, manifest }) => ({
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        task_ref: manifest.paths.task_ref,
        beacon_ref: manifest.paths.beacon_ref,
        result_schema_ref: manifest.paths.result_schema_ref,
        runtime_receipt_ref: manifest.paths.runtime_receipt_ref,
        spawn_prompt: spawnPromptForWorkUnit(manifest, bundleDir),
      })),
    };
    traceWorkUnitEvent(bundleDir, claimed.length > 0 ? 'work_unit_batch_claimed' : 'work_unit_claim_rejected', {
      tx_id,
      requested_count: requestedCount,
      claimed_count: claimed.length,
      blocked_by_queue_item_id: blockedBy,
      phase: `wave${wave}`,
    });
    return { ...response, queue: savedQueue, index: savedIndex };
  });
}

export function transactionPath(bundleDir, txId) {
  return path.join(transactionDir(bundleDir), `${txId}.json`);
}

function writeTransaction(bundleDir, tx) {
  writeJson(transactionPath(bundleDir, tx.tx_id), tx);
}

export function withWorkUnitTransaction(bundleDir, operation, fn) {
  ensureWorkUnitDirs(bundleDir);
  const lockPath = path.join(bundleDir, WORK_UNITS.LOCK);
  mkdirSync(lockPath);
  const tx = {
    schema_version: 'work-unit.transaction.v1',
    tx_id: `tx-${Date.now()}-${randomUUID().slice(0, 8)}`,
    operation,
    status: 'started',
    started_at: now(),
    committed_at: null,
  };
  try {
    writeTransaction(bundleDir, tx);
    const result = fn({ tx_id: tx.tx_id });
    writeTransaction(bundleDir, { ...tx, status: 'committed', committed_at: now() });
    return result;
  } catch (error) {
    writeTransaction(bundleDir, { ...tx, status: 'failed', error: error.message || String(error), committed_at: null });
    try {
      traceWorkUnitEvent(bundleDir, 'work_unit_transaction_failed', {
        tx_id: tx.tx_id,
        operation,
        reason: error.message || String(error),
      });
      logToRun(bundleDir, 'error', 'work_unit_transaction_failed', {
        kind: 'work_unit_transaction',
        tx_id: tx.tx_id,
        operation,
        reason: error.message || String(error),
      });
    } catch { /* preserve original transaction error */ }
    throw error;
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}

function listWorkUnitDirs(bundleDir) {
  const root = workUnitsRoot(bundleDir);
  if (!existsSync(root)) return [];
  const dirs = [];
  for (const waveName of readdirSync(root, { withFileTypes: true })) {
    if (!waveName.isDirectory() || !/^wave[0-9]+$/.test(waveName.name)) continue;
    const waveDir = path.join(root, waveName.name);
    for (const entry of readdirSync(waveDir, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(rel(bundleDir, path.join(waveDir, entry.name)));
    }
  }
  return dirs;
}

function transactionIssues(bundleDir) {
  const dir = transactionDir(bundleDir);
  if (!existsSync(dir)) return [];
  const issues = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const tx = readJson(path.join(dir, entry.name));
    if (tx.status !== 'committed') issues.push(`uncommitted transaction ${entry.name}: status=${tx.status || '<missing>'}`);
  }
  return issues;
}

function runtimeReceiptIssues(bundleDir, record) {
  const receiptPath = path.join(bundleDir, record.paths.runtime_receipt_ref);
  if (!existsSync(receiptPath)) return [`missing runtime receipt: ${record.paths.runtime_receipt_ref}`];
  const issues = [];
  const raw = readFileSync(receiptPath, 'utf-8');
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  lines.forEach((line, index) => {
    let parsed;
    try {
      parsed = WorkUnitRuntimeReceiptEventSchema.parse(JSON.parse(line));
    } catch (error) {
      issues.push(`runtime receipt invalid for ${record.work_id} line ${index + 1}: ${error.message}`);
      return;
    }
    for (const field of WORK_UNIT_REQUIRED_RECEIPT_FIELDS) {
      if (parsed[field] !== record[field]) {
        issues.push(`runtime receipt mismatch for ${record.work_id} line ${index + 1}: ${field}`);
      }
    }
  });
  return issues;
}

function beaconIssues(bundleDir, record) {
  const beaconPath = path.join(bundleDir, record.paths.beacon_ref);
  if (!existsSync(beaconPath)) return [`missing beacon: ${record.paths.beacon_ref}`];
  const issues = [];
  try {
    const beacon = WorkUnitBeaconSchema.parse(readJson(beaconPath));
    for (const field of ['work_id', 'queue_item_id', 'kind', 'receipt_nonce']) {
      if (beacon[field] !== record[field]) issues.push(`beacon/index mismatch for ${record.work_id}: ${field}`);
    }
    if (beacon.work_unit_dir !== record.paths.work_unit_dir) issues.push(`beacon/index mismatch for ${record.work_id}: work_unit_dir`);
    if (beacon.result_schema_ref !== record.paths.result_schema_ref) issues.push(`beacon/index mismatch for ${record.work_id}: result_schema_ref`);
    if (beacon.runtime_receipt_ref !== record.paths.runtime_receipt_ref) issues.push(`beacon/index mismatch for ${record.work_id}: runtime_receipt_ref`);
  } catch (error) {
    issues.push(`beacon invalid for ${record.work_id}: ${error.message}`);
  }
  return issues;
}

function ledgerIssues(bundleDir, index) {
  const issues = [];
  const unsupportedLedger = path.join(workUnitsRoot(bundleDir), '_ledger.jsonl');
  if (existsSync(unsupportedLedger)) {
    issues.push('unsupported delegated ledger present: _work_units/_ledger.jsonl; production submissions use rb_output_declarations.jsonl');
  }

  let rows = [];
  try {
    rows = readWorkUnitLedgerRows(bundleDir);
  } catch (error) {
    issues.push(`work-unit ledger invalid: ${error.message}`);
    return issues;
  }
  const rowsByWorkId = new Map();
  for (const row of rows) {
    if (rowsByWorkId.has(row.work_id)) issues.push(`duplicate work-unit ledger row: ${row.work_id}`);
    rowsByWorkId.set(row.work_id, row);
    const record = index.work_units[row.work_id];
    if (!record) {
      issues.push(`ledger row without index record: ${row.work_id}`);
      continue;
    }
    if (record.status !== 'submitted') issues.push(`ledger row for non-submitted work unit: ${row.work_id} status=${record.status}`);
  }

  for (const [workId, record] of Object.entries(index.work_units || {})) {
    if (record.status !== 'submitted') continue;
    const row = rowsByWorkId.get(workId);
    if (!row) {
      issues.push(`submitted work unit missing ledger row: ${workId}`);
      continue;
    }
    for (const field of ['queue_item_id', 'wave', 'kind', 'producer_rule', 'creation_reason', 'receipt_nonce']) {
      if (row[field] !== record[field]) issues.push(`ledger/index mismatch for ${workId}: ${field}`);
    }
    if (row.work_unit_ref !== record.paths.work_unit_dir) issues.push(`ledger/index mismatch for ${workId}: work_unit_ref`);
    if (row.result_ref !== record.paths.result_ref) issues.push(`ledger/index mismatch for ${workId}: result_ref`);
    if (row.runtime_receipt_ref !== record.paths.runtime_receipt_ref) issues.push(`ledger/index mismatch for ${workId}: runtime_receipt_ref`);
    if (row.result_hash !== record.result_hash) issues.push(`ledger/index mismatch for ${workId}: result_hash`);
    if (row.ledger_record_hash !== record.ledger_record_hash) issues.push(`ledger/index mismatch for ${workId}: ledger_record_hash`);

    const resultPath = path.join(bundleDir, record.paths.result_ref);
    if (!existsSync(resultPath)) {
      issues.push(`submitted work unit missing result file: ${record.paths.result_ref}`);
    } else {
      try {
        const result = WorkUnitResultSchema.parse(readJson(resultPath));
        if (hashValue(result) !== record.result_hash) issues.push(`submitted result hash mismatch: ${workId}`);
      } catch (error) {
        issues.push(`submitted result invalid for ${workId}: ${error.message}`);
      }
    }

    for (const output of row.output_files || []) {
      if (!isSafeBundleRelative(output.path) || !existsSync(path.join(bundleDir, output.path))) {
        issues.push(`ledger output file missing or unsafe for ${workId}: ${output.path}`);
      }
    }
    for (const trail of row.cache_trails || []) {
      const full = path.join(bundleDir, trail);
      if (!isSafeBundleRelative(trail) || !trail.startsWith('_cache/') || !existsSync(full) || !statSync(full).isDirectory()) {
        issues.push(`ledger cache trail missing or unsafe for ${workId}: ${trail}`);
        continue;
      }
      try {
        validateCacheTrailContent(full, trail);
      } catch (error) {
        issues.push(`ledger cache trail incomplete for ${workId}: ${error.message}`);
      }
    }
  }

  return issues;
}

export function inspectWorkUnits(bundleDir, { nowMs = Date.now(), emitDiagnostics = false, diagnosticSource = 'work-unit-inspect' } = {}) {
  const issues = [];
  const indexPath = workUnitIndexPath(bundleDir);
  const root = workUnitsRoot(bundleDir);
  const emptyProjection = computeWorkUnitHealthProjection({}, {
    nowMs,
    lateSubmitRejections: countTraceEvents(bundleDir, 'work_unit_late_submit_rejected'),
  });
  if (!existsSync(indexPath) && !existsSync(root)) {
    return { passed: true, check: true, inspect: [], projection: emptyProjection, advice: 'No work units have been allocated.' };
  }

  issues.push(...transactionIssues(bundleDir));

  let index;
  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  } catch (error) {
    const invalidIssues = [`work-unit index invalid: ${error.message}`];
    if (emitDiagnostics) emitWorkUnitInspectDiagnostics(bundleDir, { issues: invalidIssues, source: diagnosticSource });
    return {
      passed: false,
      check: false,
      inspect: invalidIssues,
      projection: emptyProjection,
      advice: '_work_units/_index.json is Engine-owned. Restore it from a checkpoint or repair through Engine work-unit tooling before continuing; do not hand-edit work-unit authority files.',
    };
  }

  const projection = computeWorkUnitHealthProjection(index.work_units, {
    nowMs,
    lateSubmitRejections: countTraceEvents(bundleDir, 'work_unit_late_submit_rejected'),
  });

  const expectedCounts = computeStatusCounts(index.work_units);
  if (JSON.stringify(expectedCounts) !== JSON.stringify(index.status_counts)) {
    issues.push(`status-count drift: expected ${JSON.stringify(expectedCounts)} got ${JSON.stringify(index.status_counts)}`);
  }

  const expectedProjection = computeInspectProjection(index.work_units, index.inspect_projection.generated_at);
  const projectionComparable = ({ total, by_wave, nonterminal }) => ({ total, by_wave, nonterminal });
  if (JSON.stringify(projectionComparable(expectedProjection)) !== JSON.stringify(projectionComparable(index.inspect_projection))) {
    issues.push('inspect projection drift: total/by_wave/nonterminal do not match work_units');
  }
  issues.push(...ledgerIssues(bundleDir, index));

  const nonterminalByQueueItem = new Map();
  const indexedDirs = new Set();
  for (const [workId, record] of Object.entries(index.work_units)) {
    try {
      validateWorkIdBinding({ ...record, kindRegistry: index.kind_registry });
    } catch (error) {
      issues.push(error.message);
    }
    indexedDirs.add(record.paths.work_unit_dir);
    if (record.status === 'claimed') {
      const existing = nonterminalByQueueItem.get(record.queue_item_id);
      if (existing) issues.push(`duplicate non-terminal queue binding for ${record.queue_item_id}: ${existing} and ${workId}`);
      nonterminalByQueueItem.set(record.queue_item_id, workId);
      if (Date.parse(record.deadline_at) < nowMs) issues.push(`expired lease: ${workId} deadline_at=${record.deadline_at}`);
    }

    const manifestPath = path.join(bundleDir, record.paths.manifest_ref);
    if (!existsSync(manifestPath)) {
      issues.push(`missing manifest: ${record.paths.manifest_ref}`);
      continue;
    }
    try {
      const manifest = WorkUnitManifestSchema.parse(readJson(manifestPath));
      validateWorkIdBinding({ ...manifest, kindRegistry: index.kind_registry });
      for (const field of ['queue_item_id', 'kind', 'receipt_nonce', 'queue_item_snapshot_hash']) {
        if (manifest[field] !== record[field]) issues.push(`manifest/index mismatch for ${workId}: ${field}`);
      }
      if (manifest.paths.work_unit_dir !== record.paths.work_unit_dir) issues.push(`manifest/index mismatch for ${workId}: work_unit_dir`);
    } catch (error) {
      issues.push(`manifest invalid for ${workId}: ${error.message}`);
    }
    issues.push(...beaconIssues(bundleDir, record));
    issues.push(...runtimeReceiptIssues(bundleDir, record));
  }

  for (const [waveName, waveState] of Object.entries(index.waves || {})) {
    for (const [id, batch] of Object.entries(waveState.batches || {})) {
      const wave = Number.parseInt(waveName.replace('wave', ''), 10);
      const maxClaim = Math.max(0, ...Object.values(index.work_units)
        .filter((record) => record.wave === wave && record.batch_id === id)
        .map((record) => record.claim_index));
      if (batch.next_claim_index <= maxClaim) {
        issues.push(`counter drift: ${waveName}/${id} next_claim_index=${batch.next_claim_index} max_claim_index=${maxClaim}`);
      }
    }
  }

  for (const dir of listWorkUnitDirs(bundleDir)) {
    if (!indexedDirs.has(dir)) issues.push(`orphan work-unit directory: ${dir}`);
  }

  if (issues.length === 0) {
    return { passed: true, check: true, inspect: [], projection, advice: 'Work-unit index and envelope surfaces are consistent.' };
  }
  if (emitDiagnostics) emitWorkUnitInspectDiagnostics(bundleDir, { issues, source: diagnosticSource });
  return { passed: false, check: false, inspect: issues, projection, advice: 'Resolve work-unit index/envelope drift before running delegated gates.' };
}
