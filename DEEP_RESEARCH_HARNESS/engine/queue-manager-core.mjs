// @impl AGQ-001, AGQ-005, AGQ-017, AGQ-019, AGQ-020, FRE-005
// Queue Manager core foundation: trace/logger singleton, constants, schemas, validation, and shared helpers.

import { z } from 'zod';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { createTrace } from './trace.mjs';
import { createRunLogger, readBundleName } from './logger.mjs';
import {
  DelegatedInFlightSchema,
  QUEUE_ACTIVE_WINDOW_LIMIT,
  QUEUE_SCHEMA_VERSION,
  QueueDemandItemSchema,
  QueueSchema,
  QueueTerminalHistoryRecordSchema,
} from '../schema/contracts/queue.mjs';

let _trace = null;
let _bundleDir = null;
let _log = null;

export function ensureTrace(bundleDir) {
  if (!_trace && bundleDir) {
    _trace = createTrace(path.join(bundleDir, QUEUE.TRACE), { consoleEcho: false });
    _bundleDir = bundleDir;
  }
  if (!_log && bundleDir) {
    _log = createRunLogger(bundleDir);
  } else if (_log && _bundleDir !== bundleDir && bundleDir) {
    _log = createRunLogger(bundleDir);
  }
  return _trace;
}

export function traceEntry(event, detail) {
  if (_trace) {
    const bundle = _bundleDir ? readBundleName(_bundleDir) : '<unknown>';
    _trace.traceEntry(event, { bundle, ...detail });
  }
}

export function logEvent(level, event, detail) {
  if (_log) _log[level](event, detail);
}

export { DelegatedInFlightSchema, QUEUE_ACTIVE_WINDOW_LIMIT, QUEUE_SCHEMA_VERSION, QueueDemandItemSchema };
export const QueueItemSchema = QueueDemandItemSchema;

export const QUEUE = {
  FILE: 'rb_queue.json',
  PROJECTION: '_cache/agentic-queue/current-task.md',
  TRACE: 'rb_trace.jsonl',
};

const QueueHealth = z.enum(['ready', 'thin', 'blocked', 'closed']);
const StopAuthorizationState = z.enum(['unauthorized_continue_required', 'final_delivery', 'decision_blocker', 'empty_queue_after_refill']);

export const QueueStateSchema = z.object({
  schema_version: z.literal(QUEUE_SCHEMA_VERSION).default(QUEUE_SCHEMA_VERSION),
  queue_id: z.string().min(1),
  bundle_name: z.string().nullable().default(null),
  queue_health: QueueHealth.default('ready'),
  stop_authorization_state: StopAuthorizationState.default('unauthorized_continue_required'),
  active_window: z.array(QueueItemSchema).default([]),
  refill_pool: z.array(QueueItemSchema).default([]),
  delegated_in_flight: z.record(z.string(), DelegatedInFlightSchema).default({}),
  terminal_history: z.array(QueueTerminalHistoryRecordSchema).default([]),
  projection_path: z.string().default(QUEUE.PROJECTION),
  trace_path: z.string().default(QUEUE.TRACE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).strict();

export const QueueResultSchema = z.object({
  queue_item_id: z.string().min(1),
  status: z.literal('done').default('done'),
  receipt: z.string().optional(),
  summary: z.string().default(''),
  writes: z.array(z.string()).default([]),
}).strict();

export const QueueFailureSchema = z.object({
  queue_item_id: z.string().min(1),
  reason: z.string().min(1),
}).strict();

export function now() { return new Date().toISOString(); }
export function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function withTimestamps(item) {
  const ts = now();
  return QueueItemSchema.parse({ ...item, created_at: item.created_at || ts, updated_at: ts });
}

export function touchQueue(queue) { return { ...queue, updated_at: now() }; }

export function syncQueueHealth(queue) {
  const q = queue;
  const demandCount = q.active_window.length + q.refill_pool.length;
  const inFlightCount = Object.keys(q.delegated_in_flight || {}).length;
  if (demandCount === 0 && inFlightCount === 0) {
    q.queue_health = 'blocked';
    q.stop_authorization_state = 'empty_queue_after_refill';
  } else if (q.active_window.length < QUEUE_ACTIVE_WINDOW_LIMIT && q.refill_pool.length === 0) {
    q.queue_health = 'thin';
    q.stop_authorization_state = 'unauthorized_continue_required';
  } else {
    q.queue_health = 'ready';
    q.stop_authorization_state = 'unauthorized_continue_required';
  }
  return q;
}

export function bundlePath(bundleDir, relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(bundleDir, relativePath);
}

export function queuePath(bundleDir) { return path.join(bundleDir, QUEUE.FILE); }

export function queueStateFromFile(raw, { queueId = 'agentic-queue' } = {}) {
  const parsed = QueueSchema.parse(raw);
  const ts = now();
  return validateQueue({
    schema_version: parsed.schema_version,
    queue_id: queueId,
    bundle_name: parsed.bundle_name ?? null,
    queue_health: parsed.queue_health,
    stop_authorization_state: parsed.stop_authorization_state,
    active_window: parsed.active_window,
    refill_pool: parsed.refill_pool,
    delegated_in_flight: parsed.delegated_in_flight,
    terminal_history: parsed.terminal_history,
    projection_path: QUEUE.PROJECTION,
    trace_path: QUEUE.TRACE,
    created_at: ts,
    updated_at: ts,
  });
}

export function canonicalQueueFileShape(queue) {
  const q = validateQueue(queue);
  return QueueSchema.parse({
    schema_version: q.schema_version,
    bundle_name: q.bundle_name,
    queue_health: q.queue_health,
    stop_authorization_state: q.stop_authorization_state,
    active_window: q.active_window,
    refill_pool: q.refill_pool,
    delegated_in_flight: q.delegated_in_flight,
    terminal_history: q.terminal_history,
  });
}

export function validateQueue(queue) {
  const parsed = QueueStateSchema.parse(queue);
  if (parsed.active_window.length > QUEUE_ACTIVE_WINDOW_LIMIT) {
    throw new Error(`active_window cannot contain more than ${QUEUE_ACTIVE_WINDOW_LIMIT} queue items`);
  }

  const locations = [];
  for (const item of parsed.active_window) locations.push(['active_window', item.queue_item_id]);
  for (const item of parsed.refill_pool) locations.push(['refill_pool', item.queue_item_id]);
  for (const [key, value] of Object.entries(parsed.delegated_in_flight || {})) {
    if (value?.queue_item_id !== key) {
      throw new Error(`delegated_in_flight key ${key} must match queue_item_id ${value?.queue_item_id || '<missing>'}`);
    }
    locations.push(['delegated_in_flight', key]);
  }
  for (const record of parsed.terminal_history || []) {
    if (record?.queue_item_id) locations.push(['terminal_history', record.queue_item_id]);
  }

  const seen = new Map();
  for (const [location, queueItemId] of locations) {
    if (seen.has(queueItemId)) {
      throw new Error(`queue_item_id ${queueItemId} appears in both ${seen.get(queueItemId)} and ${location}`);
    }
    seen.set(queueItemId, location);
  }

  return parsed;
}

const SNAPSHOT_EXCLUDED_FIELDS = new Set([
  'status',
  'restore_priority',
  'created_at',
  'updated_at',
  'runtime_refs',
  'attempt_index',
  'claimed_at',
  'deadline_at',
  'timeout_ms',
  'last_observed_at',
  'queue_item_snapshot_hash',
  'work_id',
]);

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SNAPSHOT_EXCLUDED_FIELDS.has(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stableSort(nested)]),
    );
  }
  return value;
}

export function canonicalQueueItemSnapshot(item) {
  return stableSort(QueueItemSchema.parse(item));
}

export function queueItemSnapshotHash(item) {
  const canonical = JSON.stringify(canonicalQueueItemSnapshot(item));
  return createHash('sha256').update(canonical).digest('hex');
}

export function check(passed, message) {
  return { passed, check: passed, inspect: passed ? [] : [message], advice: passed ? 'Continue from active_window.' : message };
}

export function advice(kind, message) {
  return { passed: false, check: false, inspect: [kind], advice: message };
}
