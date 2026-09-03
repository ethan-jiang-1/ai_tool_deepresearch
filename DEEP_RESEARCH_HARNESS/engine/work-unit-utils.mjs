// @impl FRE-005, FIO-001
// Work-unit utilities: path helpers, serialization, hashing, ledger I/O, safety checks, trace/diagnostic wrappers.

import {
  existsSync,
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { createTrace } from './trace.mjs';
import { logToRun, readBundleName } from './logger.mjs';
import { WorkUnitLedgerRecordSchema } from '../schema/contracts/work-unit.mjs';
import {
  WORK_UNIT_OUTPUT_LEDGER,
  DEFAULT_KIND_CONTRACTS,
} from './work-unit-constants.mjs';
import {
  CACHE_BASE_LEAF_FILES,
  hasExplicitDegradedCapture as sharedHasExplicitDegradedCapture,
  inspectCacheLeaf,
} from './helpers/cache-leaf-contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function now() {
  return new Date().toISOString();
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function rel(bundleDir, absolutePath) {
  return path.relative(bundleDir, absolutePath).split(path.sep).join('/');
}

export function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function hashValue(value) {
  return sha256(stableStringify(value));
}

export function ledgerPath(bundleDir) {
  return path.join(bundleDir, WORK_UNIT_OUTPUT_LEDGER);
}

export function readLedgerRows(bundleDir) {
  const filePath = ledgerPath(bundleDir);
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf-8').split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function appendLedgerRow(bundleDir, row) {
  appendFileSync(ledgerPath(bundleDir), `${JSON.stringify(row)}\n`);
}

export function isSafeBundleRelative(ref) {
  if (!ref || path.isAbsolute(ref)) return false;
  return !ref.split(/[\\/]+/).includes('..');
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isPathInsideDir(candidatePath, rootDir) {
  const relative = path.relative(path.resolve(rootDir), path.resolve(candidatePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function recordSubmitNormalization(normalizations, detail) {
  normalizations.push({
    ...detail,
    normalized_at: now(),
  });
}

export function logCliPath() {
  return path.resolve(__dirname, '..', 'cli', 'log-event.mjs');
}

export function bundleName(bundleDir) {
  const fromStatus = readBundleName(bundleDir);
  return fromStatus === '<unknown>' ? path.basename(bundleDir) : fromStatus;
}

export function defaultKindContract(kind) {
  return clone(DEFAULT_KIND_CONTRACTS[kind] || {
    actor_policy: {
      delegated_role_key: null,
      phase_agent_fallback: 'prohibited',
    },
    task_brief: 'Complete the assigned delegated work and return only through the work-unit result contract.',
    output_contract: {
      required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'output_files', 'cache_trails'],
      output_files: {
        required: true,
        allowed_roles: ['reference', 'evidence_summary', 'source_yaml', 'question_list', 'other'],
        reference_requires_source_url: true,
      },
      source_claims: {
        allowed: kind === 'wave1_topic_deepening',
        accepted_requires_cache_or_degraded: kind === 'wave1_topic_deepening',
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

export function kindContractForQueueItem(queueItem, kind) {
  const base = defaultKindContract(kind);
  return {
    actor_policy: clone(base.actor_policy),
    task_brief: queueItem.task_brief || queueItem.payload?.task_brief || base.task_brief,
    output_contract: clone(queueItem.output_contract || queueItem.payload?.output_contract || base.output_contract),
    cache_policy: clone(queueItem.cache_policy || queueItem.payload?.cache_policy || base.cache_policy),
  };
}

export function traceWorkUnitEvent(bundleDir, event, detail) {
  const trace = createTrace(path.join(bundleDir, 'rb_trace.jsonl'), { consoleEcho: false });
  // TRW-007: writer/bundle are centrally stamped by traceEntry (canonical basename);
  // no hand-passed readBundleName bundle here anymore.
  trace.traceEntry(event, { source: 'work-unit', ...detail });
}

export function emitWorkUnitInspectDiagnostics(bundleDir, { issues, source = 'work-unit-inspect' } = {}) {
  if (!issues || issues.length === 0) return;
  const diagnostic = {
    issue_count: issues.length,
    issues: issues.slice(0, 20),
  };
  try {
    const trace = createTrace(path.join(bundleDir, 'rb_trace.jsonl'), { consoleEcho: false });
    trace.traceEntry('diagnostic', {
      source,
      kind: 'work_unit_inspect_failed',
      ...diagnostic,
    });
    if (issues.some((issue) => /transaction/i.test(issue))) {
      trace.traceEntry('diagnostic', {
        source,
        kind: 'work_unit_transaction_mismatch',
        ...diagnostic,
      });
    }
    if (issues.some((issue) => /ledger|provenance|output file|cache trail|submitted result|unsupported delegated ledger/i.test(issue))) {
      trace.traceEntry('diagnostic', {
        source,
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

export function computeWorkUnitLedgerRecordHash(row) {
  const { ledger_record_hash: _existing, ...base } = row;
  return hashValue(base);
}

export function readWorkUnitLedgerRows(bundleDir) {
  return readLedgerRows(bundleDir).map((row) => {
    const parsed = WorkUnitLedgerRecordSchema.parse(row);
    const expected = computeWorkUnitLedgerRecordHash(row);
    if (parsed.ledger_record_hash !== expected) {
      throw new Error(`ledger_record_hash mismatch for ${parsed.work_id}`);
    }
    return parsed;
  });
}

export function findSubmittedLedgerRow(bundleDir, workId) {
  return readWorkUnitLedgerRows(bundleDir).find((row) => row.work_id === workId);
}

export function validateCacheTrailContent(cacheDir, trail, { pageText = null } = {}) {
  const pagePath = path.join(cacheDir, 'page.md');
  const metaPath = path.join(cacheDir, 'meta.json');
  const resolvedPageText = pageText ?? (existsSync(pagePath) ? readFileSync(pagePath, 'utf-8') : '');
  const meta = existsSync(metaPath) ? readOptionalJson(metaPath) : null;
  const result = inspectCacheLeaf({ availableFiles: CACHE_BASE_LEAF_FILES, pageText: resolvedPageText, meta });
  if (!result.ok) throw new Error(`cache trail ${trail} has incomplete cache content: ${result.issue}`);
}

export function readOptionalJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function hasExplicitDegradedCapture(pageText, meta) {
  return sharedHasExplicitDegradedCapture(pageText, meta);
}
