// @impl FRE-005
// Queue Manager core foundation: trace/logger singleton, constants, schemas, validation, and shared helpers.

import { z } from 'zod';
import path from 'node:path';

import { createTrace } from './trace.mjs';
import { createRunLogger, readBundleName } from './logger.mjs';
import { QueueSchema, QueueWorkUnitSchema } from '../schema/contracts/queue.mjs';
import {
  QUEUE_ACTIVE_WINDOW_SLOTS,
  SLOT_NAMES,
  PENDING_SLOT_NAMES,
} from '../schema/contracts/queue-slots.mjs';

let _trace = null;
let _bundleDir = null;
let _log = null;

/** Lazily create trace + logger on first loadQueue call. Consumers never touch this. */
export function ensureTrace(bundleDir) {
  if (!_trace && bundleDir) {
    _trace = createTrace(path.join(bundleDir, QUEUE.TRACE), { consoleEcho: false });
    _bundleDir = bundleDir;
  }
  if (!_log && bundleDir) {
    _log = createRunLogger(bundleDir);
  } else if (_log && _bundleDir !== bundleDir && bundleDir) {
    // Bundle changed — rebind logger to new bundle's _logs/run.log
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

// ── Logger helpers: log only the closed-set events (LOC-006) ──

/** @param {string} event — must be in LOC-006 closed-set */
export function logEvent(level, event, detail) {
  if (_log) _log[level](event, detail);
}


// ============================================================
// Internal: constants, schemas, helpers
// ============================================================


export { QUEUE_ACTIVE_WINDOW_SLOTS, SLOT_NAMES };

// Backward-compatible alias — the authoritative definition lives in
// schema/contracts/queue.mjs as QueueWorkUnitSchema.
export const QueueItemSchema = QueueWorkUnitSchema;

/** Contract file names. Use these instead of hardcoding paths. */
export const QUEUE = {
  FILE:       'rb_queue.json',
  PROJECTION: '_cache/agentic-queue/current-task.md',
  TRACE:      'rb_trace.jsonl',
};

const QueueHealth = z.enum(['ready', 'thin', 'blocked', 'closed']);
const StopAuthorizationState = z.enum(['unauthorized_continue_required', 'final_delivery', 'decision_blocker', 'empty_queue_after_refill']);

const QueueSlot = QueueWorkUnitSchema.nullable();
const ActiveWindowSchema = z.object(Object.fromEntries(SLOT_NAMES.map((slot) => [slot, QueueSlot])));

export const QueueStateSchema = z.object({
  queue_id: z.string().min(1),
  bundle_name: z.string().nullable().default(null),
  queue_health: QueueHealth.default('ready'),
  stop_authorization_state: StopAuthorizationState.default('unauthorized_continue_required'),
  active_window: ActiveWindowSchema,
  refill_pool: z.array(QueueItemSchema).default([]),
  projection_path: z.string().default(QUEUE.PROJECTION),
  trace_path: z.string().default(QUEUE.TRACE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const QueueResultSchema = z.object({
  work_id: z.string().min(1),
  status: z.literal('done').default('done'),
  receipt: z.string().optional(),
  summary: z.string().default(''),
  writes: z.array(z.string()).default([]),
  slot_result_ref: z.string().optional(),
});

export const QueueFailureSchema = z.object({
  work_id: z.string().min(1),
  reason: z.string().min(1),
  repair: QueueItemSchema.optional(),
});

export function now() { return new Date().toISOString(); }
export function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function withTimestamps(item) {
  const ts = now();
  return QueueItemSchema.parse({ ...item, created_at: item.created_at || ts, updated_at: ts });
}

export function touchQueue(queue) { return { ...queue, updated_at: now() }; }

export function syncQueueHealth(queue) {
  const q = queue;
  const hasCurrent = Boolean(q.active_window.slot_1_current);
  const hasOpenSlot = SLOT_NAMES.some(s => q.active_window[s] === null);
  if (!hasCurrent && q.refill_pool.length === 0) {
    q.queue_health = 'blocked';
    q.stop_authorization_state = 'empty_queue_after_refill';
  } else if (hasOpenSlot || q.refill_pool.length === 0) {
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
    queue_id: queueId,
    bundle_name: parsed.bundle_name ?? null,
    queue_health: parsed.queue_health,
    stop_authorization_state: parsed.stop_authorization_state,
    active_window: Object.fromEntries(SLOT_NAMES.map((slot) => [slot, parsed[slot] ?? null])),
    refill_pool: parsed.refill_pool,
    projection_path: QUEUE.PROJECTION,
    trace_path: QUEUE.TRACE,
    created_at: ts,
    updated_at: ts,
  });
}

export function canonicalQueueFileShape(queue) {
  const q = validateQueue(queue);
  return QueueSchema.parse({
    bundle_name: q.bundle_name,
    queue_health: q.queue_health,
    stop_authorization_state: q.stop_authorization_state,
    ...Object.fromEntries(SLOT_NAMES.map((slot) => [slot, q.active_window[slot]])),
    refill_pool: q.refill_pool,
  });
}

// ============================================================
// Internal: validation
// ============================================================

export function validateQueue(queue) {
  const parsed = QueueStateSchema.parse(queue);
  const ids = [];
  for (const slot of SLOT_NAMES) {
    const item = parsed.active_window[slot];
    if (item) ids.push(item.work_id);
  }
  for (const item of parsed.refill_pool) ids.push(item.work_id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Queue work_id values must be unique across active window and refill_pool');
  }
  for (const slot of PENDING_SLOT_NAMES) {
    const item = parsed.active_window[slot];
    if (item?.status === 'running') throw new Error(`Only slot_1_current may be running; ${slot} is preview-only`);
  }
  for (const item of parsed.refill_pool) {
    if (item.status === 'running') throw new Error(`refill_pool item ${item.work_id} is preview-only and cannot be running`);
  }
  return parsed;
}

// ============================================================
// Internal: C&I feedback factories
// ============================================================

export function check(passed, message) {
  return { passed, check: passed, inspect: passed ? [] : [message], advice: passed ? 'Continue from slot_1_current.' : message };
}

export function advice(kind, message) {
  return { passed: false, check: false, inspect: [kind], advice: message };
}
