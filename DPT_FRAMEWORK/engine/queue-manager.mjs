// @impl AGQ-001..006, FRE-001
// Canonical engine location: DPT_FRAMEWORK/engine/queue-manager.mjs
//
// ## Role
// JS-owned Queue Manager over a 5-slot active window + refill pool.
// MD/Agent owns the work content. Engine owns deterministic state
// transitions, receipt checking, and queue health.
//
// ## Mental model — the 5-slot active window
// ```
// slot_1_current   ← the ONLY executable slot (claim/complete/fail)
// slot_2_next       ← preview: next in line
// slot_3_pending    ← preview
// slot_4_pending    ← preview
// slot_5_tail       ← preview; displaced on preempt → goes to refill pool
// refill_pool[]     ← overflow, sorted by priority
// ```
// Only slot_1 may have status 'running'. Pending slots and pool items
// are preview-only and must be 'queued'.
//
// ## Lifecycle (Phase Agent reads and acts on each step)
// ```
// createQueue(id)         → fresh empty queue
//   ↓
// makeItem(overrides)     → build work items
// enqueue(queue, item)    → fill slots/pool
// saveQueue(dir, queue)   → persist to bundle
//   ↓
// loadQueue(dir)          → reload from disk
// claim(queue)            → take slot_1 (status → 'running')
//   ↓
// complete(queue, result) → done: validates receipt, promotes, refills, renders
// fail(queue, reason)     → failed: promotes, creates repair item, refills, renders
//   ↓
// preempt(queue, item)    → insert urgent work (slot_2 or slot_1)
// inspect(queue)          → health check
// render(queue)           → write projection markdown
// ```
//
// ## C&I feedback
// Functions that perform validation return `{ passed, check, inspect?, advice? }`
// shaped feedback. MD reads the `advice` field for natural-language guidance.
//
// ## Exports
//   createQueue, loadQueue, saveQueue
//   enqueue, claim, complete, fail, preempt
//   inspect, render, makeItem
//   QueueItemSchema, QUEUE

import { z } from 'zod';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// ============================================================
// Internal: trace auto-init
// ============================================================

import { createTrace } from './trace.mjs';
let _trace = null;

/** Lazily create trace on first loadQueue call. Consumers never touch this. */
function ensureTrace(bundleDir) {
  if (!_trace && bundleDir) {
    _trace = createTrace(path.join(bundleDir, QUEUE.TRACE), { consoleEcho: false });
  }
  return _trace;
}

function traceEntry(event, detail) {
  if (_trace) _trace.traceEntry(event, detail);
}

// ============================================================
// Internal: constants, schemas, helpers
// ============================================================

import { QueueSchema, QueueWorkUnitSchema } from '../schema/contracts/queue.mjs';

// Backward-compatible alias — the authoritative definition lives in
// schema/contracts/queue.mjs as QueueWorkUnitSchema.
export const QueueItemSchema = QueueWorkUnitSchema;

/** Contract file names. Use these instead of hardcoding paths. */
export const QUEUE = {
  FILE:       'rb_queue.json',
  PROJECTION: '_cache/agentic-queue/current-task.md',
  TRACE:      '_trace_agq_cli.jsonl',
};
const SLOT_NAMES = ['slot_1_current', 'slot_2_next', 'slot_3_pending', 'slot_4_pending', 'slot_5_tail'];
const PENDING_SLOTS = SLOT_NAMES.slice(1);

const QueueHealth = z.enum(['ready', 'thin', 'blocked', 'closed']);
const StopAuthorizationState = z.enum(['unauthorized_continue_required', 'final_delivery', 'decision_blocker', 'empty_queue_after_refill']);

const QueueSlot = QueueWorkUnitSchema.nullable();
const ActiveWindowSchema = z.object({
  slot_1_current: QueueSlot, slot_2_next: QueueSlot,
  slot_3_pending: QueueSlot, slot_4_pending: QueueSlot, slot_5_tail: QueueSlot,
});

const QueueStateSchema = z.object({
  queue_id: z.string().min(1),
  queue_health: QueueHealth.default('ready'),
  stop_authorization_state: StopAuthorizationState.default('unauthorized_continue_required'),
  active_window: ActiveWindowSchema,
  refill_pool: z.array(QueueItemSchema).default([]),
  projection_path: z.string().default(QUEUE.PROJECTION),
  trace_path: z.string().default(QUEUE.TRACE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const QueueResultSchema = z.object({
  work_id: z.string().min(1),
  status: z.literal('done').default('done'),
  receipt: z.string().optional(),
  summary: z.string().default(''),
  writes: z.array(z.string()).default([]),
});

const QueueFailureSchema = z.object({
  work_id: z.string().min(1),
  reason: z.string().min(1),
  repair: QueueItemSchema.optional(),
});

function now() { return new Date().toISOString(); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function withTimestamps(item) {
  const ts = now();
  return QueueItemSchema.parse({ ...item, created_at: item.created_at || ts, updated_at: ts });
}

function touchQueue(queue) { return { ...queue, updated_at: now() }; }

function syncQueueHealth(queue) {
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

function bundlePath(bundleDir, relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(bundleDir, relativePath);
}

function queuePath(bundleDir) { return path.join(bundleDir, QUEUE.FILE); }

function queueStateFromFile(raw, { queueId = 'agentic-queue' } = {}) {
  const parsed = QueueSchema.parse(raw);
  const ts = now();
  return validateQueue({
    queue_id: queueId,
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

function canonicalQueueFileShape(queue) {
  const q = validateQueue(queue);
  return QueueSchema.parse({
    queue_health: q.queue_health,
    stop_authorization_state: q.stop_authorization_state,
    slot_1_current: q.active_window.slot_1_current,
    slot_2_next: q.active_window.slot_2_next,
    slot_3_pending: q.active_window.slot_3_pending,
    slot_4_pending: q.active_window.slot_4_pending,
    slot_5_tail: q.active_window.slot_5_tail,
    refill_pool: q.refill_pool,
  });
}

// ============================================================
// Internal: validation
// ============================================================

function validateQueue(queue) {
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
  for (const slot of PENDING_SLOTS) {
    const item = parsed.active_window[slot];
    if (item?.status === 'running') throw new Error(`Only slot_1_current may be running; ${slot} is preview-only`);
  }
  for (const item of parsed.refill_pool) {
    if (item.status === 'running') throw new Error(`refill_pool item ${item.work_id} is preview-only and cannot be running`);
  }
  return parsed;
}

// ============================================================
// Internal: pool sorting + slot mechanics
// ============================================================

function rank(item) {
  const order = { P0_preempted_restore: 0, P1_state_or_gate_repair: 1, P2_close_open_loop: 2, P3_current_gate_gap: 3, P4_progressive_artifact_or_seed_backfill: 4, P5_new_reference_intake: 5, P6_topology_triage: 6 };
  const restore = item.restore_priority === 'next_tail_opening' ? -1 : 0;
  return [restore, order[item.priority_class] ?? 99, item.created_at || ''];
}

function sortPool(pool) {
  return [...pool].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    for (let i = 0; i < ra.length; i++) { if (ra[i] < rb[i]) return -1; if (ra[i] > rb[i]) return 1; }
    return 0;
  });
}

function firstOpenSlot(queue) { return SLOT_NAMES.find(s => queue.active_window[s] === null) || null; }

// ============================================================
// Internal: C&I feedback factories
// ============================================================

function check(passed, message) {
  return { passed, check: passed, inspect: passed ? [] : [message], advice: passed ? 'Continue from slot_1_current.' : message };
}

function advice(kind, message) {
  return { passed: false, check: false, inspect: [kind], advice: message };
}

// ============================================================
// Internal: promote + refill (called by complete/fail)
// ============================================================

function promote(queue) {
  const q = clone(validateQueue(queue));
  q.active_window.slot_1_current = q.active_window.slot_2_next;
  q.active_window.slot_2_next = q.active_window.slot_3_pending;
  q.active_window.slot_3_pending = q.active_window.slot_4_pending;
  q.active_window.slot_4_pending = q.active_window.slot_5_tail;
  q.active_window.slot_5_tail = null;
  traceEntry('queue_promoted', { source: 'agq-promote' });
  return validateQueue(touchQueue(syncQueueHealth(q)));
}

function refill(queue) {
  const q = clone(validateQueue(queue));
  q.refill_pool = sortPool(q.refill_pool);
  for (const slot of SLOT_NAMES) {
    if (!q.active_window[slot] && q.refill_pool.length > 0) {
      const [next, ...rest] = q.refill_pool;
      q.active_window[slot] = { ...next, updated_at: now() };
      q.refill_pool = rest;
      traceEntry('queue_refilled', { source: 'agq-refill', slot, work_id: next.work_id });
    }
  }
  return validateQueue(touchQueue(syncQueueHealth(q)));
}

// ============================================================
// Internal: receipt checking
// ============================================================

function checkOneReceipt(queue, receipt, bundleDir) {
  if (receipt === 'none' || receipt === 'not_applicable') return { passed: true };
  if (receipt.startsWith('file:')) {
    const file = bundlePath(bundleDir, receipt.slice('file:'.length));
    return existsSync(file) ? { passed: true } : { passed: false, message: `Missing file receipt: ${receipt}` };
  }
  if (receipt.startsWith('json:')) {
    const file = bundlePath(bundleDir, receipt.slice('json:'.length));
    if (!existsSync(file)) return { passed: false, message: `Missing json receipt: ${receipt}` };
    try { JSON.parse(readFileSync(file, 'utf-8')); return { passed: true }; }
    catch { return { passed: false, message: `Invalid json receipt: ${receipt}` }; }
  }
  if (receipt.startsWith('queue:')) {
    const [field, expected] = receipt.slice('queue:'.length).split('=');
    return String(queue[field]) === expected ? { passed: true } : { passed: false, message: `Queue receipt failed: ${receipt}` };
  }
  if (receipt.startsWith('slot:')) {
    const [slot, expected] = receipt.slice('slot:'.length).split('=');
    const item = queue.active_window[slot];
    return item?.status === expected ? { passed: true } : { passed: false, message: `Slot receipt failed: ${receipt}` };
  }
  if (receipt.startsWith('trace:')) {
    const eventName = receipt.slice('trace:'.length);
    const tracePath = bundlePath(bundleDir, queue.trace_path);
    if (!existsSync(tracePath)) return { passed: false, message: `Missing trace file for receipt: ${receipt}` };
    const found = readFileSync(tracePath, 'utf-8').split('\n').filter(Boolean)
      .map(l => JSON.parse(l)).some(e => e.event === eventName);
    return found ? { passed: true } : { passed: false, message: `Trace receipt failed: ${receipt}` };
  }
  return { passed: false, message: `Unsupported receipt prefix: ${receipt}` };
}

export function checkReceipts(queue, item, bundleDir = process.cwd()) {
  const q = validateQueue(queue);
  const parsed = QueueItemSchema.parse(item);
  const receipts = parsed.required_receipts.length > 0 ? parsed.required_receipts : ['none'];
  const inspect = [];
  for (const receipt of receipts) {
    const result = checkOneReceipt(q, receipt, bundleDir);
    if (!result.passed) inspect.push(result.message);
  }
  const passed = inspect.length === 0;
  traceEntry('receipt_checked', { source: 'agq-receipt', work_id: parsed.work_id, passed, receipts });
  return passed ? check(true, 'All receipts passed')
    : { passed: false, check: false, inspect, advice: 'Add missing receipt or queue repair work before continuing.' };
}

// ============================================================
// Internal: repair item factory
// ============================================================

function makeRepairItem(failure) {
  const ts = now();
  return QueueItemSchema.parse({
    work_id: `repair-${failure.work_id}-${Date.now()}`, title: `Repair ${failure.work_id}`,
    targets: { controller: 'main-agent' }, action: `Repair failed queue work: ${failure.reason}`,
    producer_rule: 'failed_receipt_repair', lineage: { failed_work_id: failure.work_id, reason: failure.reason },
    priority_class: 'P1_state_or_gate_repair', required_receipts: ['none'],
    done_condition: 'Repair work records a corrected artifact or a concrete blocker.',
    verification: { engine: [], agent: ['Repair addresses the recorded failure.'] },
    writes_to: [], status_sync: [], completion_receipt: 'none',
    failure_route: 'record blocker or escalate repair', status: 'queued',
    preempted_from_slot: 'not_applicable', restore_priority: 'normal',
    created_at: ts, updated_at: ts, payload: { failure },
  });
}

// ============================================================
// Public API
// ============================================================

/**
 * Create a fresh empty queue with all 5 slots null and empty refill pool.
 *
 * @param {string} [queueId='agentic-queue'] — your label for this queue instance
 * @returns {object} QueueState — validated, immutable-shaped queue object
 */
export function createQueue(queueId = 'agentic-queue') {
  const ts = now();
  return QueueStateSchema.parse({
    queue_id: queueId, queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    active_window: Object.fromEntries(SLOT_NAMES.map(s => [s, null])),
    refill_pool: [], projection_path: QUEUE.PROJECTION, trace_path: QUEUE.TRACE,
    created_at: ts, updated_at: ts,
  });
}

/**
 * Load queue from a bundle directory. Auto-creates an empty queue if the
 * file doesn't exist yet. `rb_queue.json` is the only queue state file.
 *
 * @param {string} bundleDir — path to the DPT run bundle
 * @returns {object} QueueState — parsed and validated
 */
export function loadQueue(bundleDir) {
  ensureTrace(bundleDir);
  const file = queuePath(bundleDir);
  if (!existsSync(file)) {
    const queue = createQueue(path.basename(bundleDir));
    traceEntry('queue_loaded', { source: 'agq-load', existed: false, queue_id: queue.queue_id });
    return queue;
  }
  const queue = queueStateFromFile(JSON.parse(readFileSync(file, 'utf-8')), { queueId: path.basename(bundleDir) });
  traceEntry('queue_loaded', { source: 'agq-load', existed: true, queue_id: queue.queue_id });
  return queue;
}

/**
 * Persist queue state to disk. Validates before writing.
 *
 * @param {string} bundleDir — path to the DPT run bundle
 * @param {object} queue — QueueState to persist
 * @returns {object} QueueState — the validated, saved queue
 */
export function saveQueue(bundleDir, queue) {
  ensureTrace(bundleDir);
  const parsed = validateQueue(queue);
  const persisted = canonicalQueueFileShape(parsed);
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(queuePath(bundleDir), `${JSON.stringify(persisted, null, 2)}\n`);
  traceEntry('check', { source: 'agq-save', step: 'save', passed: true, queue_id: parsed.queue_id });
  return parsed;
}

/**
 * Add a work item to the queue. Fills the first open slot; if no slots
 * are open, the item goes to the refill pool.
 *
 * @param {object} queue — current QueueState
 * @param {object} item — work item (use makeItem() to construct one)
 * @param {object} [opts]
 * @param {'auto'|'pool'} [opts.mode='auto'] — 'auto' fills first open slot;
 *        'pool' always sends to refill pool regardless of open slots
 * @returns {object} QueueState — mutated queue
 */
export function enqueue(queue, item, { mode = 'auto' } = {}) {
  const q = clone(validateQueue(queue));
  const prepared = withTimestamps({ ...item, status: 'queued' });
  const slot = mode === 'pool' ? null : firstOpenSlot(q);
  if (slot) {
    q.active_window[slot] = prepared;
    traceEntry('check', { source: 'agq-enqueue', step: 'enqueue', passed: true, work_id: prepared.work_id, slot });
  } else {
    q.refill_pool = sortPool([...q.refill_pool, prepared]);
    traceEntry('check', { source: 'agq-enqueue', step: 'enqueue', passed: true, work_id: prepared.work_id, slot: 'refill_pool' });
  }
  return validateQueue(touchQueue(syncQueueHealth(q)));
}

/**
 * Claim the current work item (slot_1_current). Marks it 'running'.
 *
 * @param {object} queue — current QueueState
 * @param {object} [opts]
 * @param {string} [opts.actor='main-agent'] — who is claiming
 * @returns {{ queue: object, item: object|null }}
 *   - `item` is the claimed QueueItem, or null if slot_1 is empty
 */
export function claim(queue, { actor = 'main-agent' } = {}) {
  const q = clone(validateQueue(queue));
  const item = q.active_window.slot_1_current;
  if (!item) {
    q.queue_health = q.refill_pool.length > 0 ? 'thin' : 'blocked';
    q.stop_authorization_state = q.refill_pool.length > 0 ? 'unauthorized_continue_required' : 'empty_queue_after_refill';
    traceEntry('check', { source: 'agq-claim', step: 'claim', passed: false, reason: 'empty' });
    return { queue: validateQueue(touchQueue(q)), item: null };
  }
  item.status = 'running';
  item.updated_at = now();
  q.active_window.slot_1_current = item;

  // Build delegates advice from targets field
  const delegates = item.targets?.delegates;
  const advice = delegates
    ? { delegates_required: true, delegates_config: { role_key: delegates.role_key, timeout_ms: delegates.timeout_ms ?? 600000 } }
    : { delegates_required: false };

  traceEntry('check', { source: 'agq-claim', step: 'claim', passed: true, work_id: item.work_id });
  return { queue: validateQueue(touchQueue(q)), item, advice };
}

/**
 * Complete the current work item (slot_1_current). Validates receipts,
 * marks the item 'done', promotes the window, refills from pool, and
 * renders the projection.
 *
 * @param {object} queue — current QueueState
 * @param {object} result — { work_id, receipt?, summary?, writes? }
 * @param {string} [bundleDir] — for receipt checking + projection render (defaults to cwd)
 * @returns {{ queue: object, feedback: {passed, check, inspect?, advice?} }}
 *   - MD reads `feedback.passed` to decide next step. If false, read `advice`.
 */
export function complete(queue, result, bundleDir = process.cwd()) {
  const parsedResult = QueueResultSchema.parse(result);
  let q = clone(validateQueue(queue));
  const current = q.active_window.slot_1_current;
  if (!current || current.work_id !== parsedResult.work_id) {
    throw new Error(`complete expected current work_id ${current?.work_id || 'none'}, got ${parsedResult.work_id}`);
  }
  const receipt = parsedResult.receipt || current.completion_receipt;
  const receiptCheck = checkReceipts(q, { ...current, required_receipts: [receipt] }, bundleDir);
  traceEntry('receipt_checked', { source: 'agq-complete', work_id: current.work_id, passed: receiptCheck.passed, receipt });
  if (!receiptCheck.passed) {
    traceEntry('check', { source: 'agq-complete', step: 'completion_receipt', passed: false, detail: receiptCheck.inspect.join('; ') });
    return { queue: validateQueue(touchQueue(q)), feedback: receiptCheck };
  }
  current.status = 'done';
  current.updated_at = now();
  traceEntry('queue_completed', { source: 'agq-complete', work_id: current.work_id, summary: parsedResult.summary });
  traceEntry('check', { source: 'agq-complete', step: 'completion_receipt', passed: true, work_id: current.work_id });
  q = promote(q);
  q = refill(q);
  render(q, bundleDir);
  return { queue: validateQueue(touchQueue(q)), feedback: check(true, `Completed ${current.work_id}`) };
}

/**
 * Fail the current work item (slot_1_current). Creates a repair item,
 * promotes the window, inserts the repair work, refills, and renders.
 *
 * @param {object} queue — current QueueState
 * @param {object} failure — { work_id, reason, repair?: QueueItem }
 * @param {string} [bundleDir] — for projection render (defaults to cwd)
 * @returns {object} QueueState — mutated queue with repair item inserted
 */
export function fail(queue, failure, bundleDir = process.cwd()) {
  const parsedFailure = QueueFailureSchema.parse(failure);
  let q = clone(validateQueue(queue));
  const current = q.active_window.slot_1_current;
  if (!current || current.work_id !== parsedFailure.work_id) {
    throw new Error(`fail expected current work_id ${current?.work_id || 'none'}, got ${parsedFailure.work_id}`);
  }
  current.status = 'failed';
  current.updated_at = now();
  traceEntry('queue_failed', { source: 'agq-fail', work_id: current.work_id, reason: parsedFailure.reason });
  traceEntry('check', { source: 'agq-fail', step: 'fail', passed: true, work_id: current.work_id, reason: parsedFailure.reason });
  const repair = withTimestamps(parsedFailure.repair || makeRepairItem(parsedFailure));
  q = promote(q);
  q = q.active_window.slot_1_current
    ? preempt(q, repair, { reason: 'failure_repair' })
    : enqueue(q, repair, { mode: 'auto' });
  q = refill(q);
  render(q, bundleDir);
  return validateQueue(touchQueue(q));
}

/**
 * Insert urgent work into the queue.
 *
 * Two modes:
 * - Default: inserts into slot_2_next, shifts everything right.
 *   Displaced slot_5_tail goes to refill pool.
 * - `replaceCurrent: true` + `unsafeCurrent: true`: replaces slot_1_current.
 *   Old current goes to refill pool as preempted.
 *   Without `unsafeCurrent: true`, this throws.
 *
 * @param {object} queue — current QueueState
 * @param {object} item — the urgent work item
 * @param {object} [opts]
 * @param {string} [opts.reason='urgent_preemption']
 * @param {boolean} [opts.unsafeCurrent=false] — must be true to replace slot_1
 * @param {boolean} [opts.replaceCurrent=false] — if true, replaces slot_1 instead of inserting at slot_2
 * @returns {object} QueueState — mutated queue
 */
export function preempt(queue, item, { reason = 'urgent_preemption', unsafeCurrent = false, replaceCurrent = false } = {}) {
  const q = clone(validateQueue(queue));
  const urgent = withTimestamps({ ...item, producer_rule: item.producer_rule || 'urgent_preemption', priority_class: item.priority_class || 'P1_state_or_gate_repair' });

  if (replaceCurrent && !unsafeCurrent) {
    throw new Error('Replacing slot_1_current requires unsafeCurrent=true');
  }

  if (unsafeCurrent) {
    const displaced = q.active_window.slot_1_current;
    q.active_window.slot_1_current = urgent;
    if (displaced) {
      q.refill_pool = sortPool([{ ...displaced, status: 'queued', preempted_from_slot: 'slot_1_current', restore_priority: 'next_tail_opening', updated_at: now() }, ...q.refill_pool]);
    }
    traceEntry('queue_preempted', { source: 'agq-preempt', reason, slot: 'slot_1_current', unsafeCurrent: true });
    traceEntry('check', { source: 'agq-preempt', step: 'preempt', passed: true, reason, slot: 'slot_1_current' });
    return validateQueue(touchQueue(syncQueueHealth(q)));
  }

  const old = {};
  for (const slot of SLOT_NAMES) old[slot] = q.active_window[slot];
  const displacedTail = old.slot_5_tail;
  q.active_window.slot_2_next = urgent;
  q.active_window.slot_3_pending = old.slot_2_next;
  q.active_window.slot_4_pending = old.slot_3_pending;
  q.active_window.slot_5_tail = old.slot_4_pending;
  if (displacedTail) {
    q.refill_pool = sortPool([{ ...displacedTail, status: 'queued', preempted_from_slot: 'slot_5_tail', restore_priority: 'next_tail_opening', updated_at: now() }, ...q.refill_pool]);
  }
  traceEntry('queue_preempted', { source: 'agq-preempt', reason, slot: 'slot_2_next', unsafeCurrent: false });
  traceEntry('check', { source: 'agq-preempt', step: 'preempt', passed: true, reason, slot: 'slot_2_next' });
  return validateQueue(touchQueue(syncQueueHealth(q)));
}

/**
 * Health check on the queue. Verifies slot_1 is populated and receipts pass.
 *
 * @param {object} queue — current QueueState
 * @param {string} [bundleDir] — for receipt checking (defaults to cwd)
 * @returns {{ passed: boolean, check: boolean, inspect?: string[], advice?: string }}
 *   - MD reads `passed`. If false, read `inspect` + `advice`.
 */
export function inspect(queue, bundleDir = process.cwd()) {
  const q = validateQueue(queue);
  const issues = [];
  const current = q.active_window.slot_1_current;
  if (!current) issues.push('slot_1_current is empty');
  if (current) {
    const receipts = checkReceipts(q, current, bundleDir);
    if (!receipts.passed) issues.push(...receipts.inspect);
  }
  return issues.length === 0 ? check(true, 'Queue is executable')
    : { passed: false, check: false, inspect: issues, advice: 'Refill queue, add missing receipts, or record a blocker.' };
}

/**
 * Render the queue as a Markdown projection file.
 *
 * @param {object} queue — current QueueState
 * @param {string} [bundleDir] — where to write the projection (defaults to cwd)
 * @returns {string} — path to the written projection file
 */
export function render(queue, bundleDir = process.cwd()) {
  const q = validateQueue(queue);
  const outputPath = bundlePath(bundleDir, q.projection_path);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const lines = ['# Agentic Queue Projection', '', '> Generated from `rb_queue.json`. Do not edit this projection as queue authority.', '', `- queue_id: \`${q.queue_id}\``, `- queue_health: \`${q.queue_health}\``, `- stop_authorization_state: \`${q.stop_authorization_state}\``, '', '## Active Window', ''];
  for (const slot of SLOT_NAMES) {
    const item = q.active_window[slot];
    lines.push(`### ${slot}`);
    if (!item) { lines.push('- empty: `true`', ''); continue; }
    lines.push(`- work_id: \`${item.work_id}\``, `- title: ${item.title}`, `- targets: \`controller=${item.targets?.controller || 'unknown'}${item.targets?.delegates ? `, delegates.to=${item.targets.delegates.to}, delegates.role_key=${item.targets.delegates.role_key}` : ''}\``, `- status: \`${item.status}\``, `- action: ${item.action}`, `- required_receipts: ${item.required_receipts.map(r => `\`${r}\``).join(', ') || '`none`'}`, `- completion_receipt: \`${item.completion_receipt}\``, `- writes_to: ${item.writes_to.map(r => `\`${r}\``).join(', ') || '`none`'}`, `- failure_route: ${item.failure_route}`, '');
  }
  lines.push('## Refill Pool', '');
  for (const item of q.refill_pool) lines.push(`- \`${item.work_id}\` ${item.title} (${item.priority_class}, restore=${item.restore_priority})`);
  if (q.refill_pool.length === 0) lines.push('- empty');
  writeFileSync(outputPath, `${lines.join('\n')}\n`);
  traceEntry('projection_rendered', { source: 'agq-projection', path: q.projection_path });
  return outputPath;
}

/**
 * Factory for creating a properly-typed queue item with sensible defaults.
 * Override any fields via the `overrides` parameter.
 *
 * @param {object} [overrides] — partial QueueItem fields to override defaults
 * @returns {object} QueueItem — validated and timestamped
 */
export function makeItem(overrides = {}) {
  return QueueItemSchema.parse({
    work_id: overrides.work_id || `work-${Date.now()}`,
    title: overrides.title || 'Queue work',
    targets: overrides.targets || { controller: 'main-agent' },
    action: overrides.action || 'Perform queue work',
    producer_rule: overrides.producer_rule || 'manual_enqueue',
    lineage: overrides.lineage || { trigger: 'test' },
    priority_class: overrides.priority_class || 'P5_new_reference_intake',
    required_receipts: overrides.required_receipts || ['none'],
    done_condition: overrides.done_condition || 'Declared work is complete.',
    verification: overrides.verification || { engine: [], agent: [] },
    writes_to: overrides.writes_to || [],
    status_sync: overrides.status_sync || [],
    completion_receipt: overrides.completion_receipt || 'none',
    failure_route: overrides.failure_route || 'queue repair work',
    status: overrides.status || 'queued',
    preempted_from_slot: overrides.preempted_from_slot || 'not_applicable',
    restore_priority: overrides.restore_priority || 'normal',
    created_at: overrides.created_at || now(),
    updated_at: overrides.updated_at || now(),
    payload: overrides.payload || {},
  });
}
