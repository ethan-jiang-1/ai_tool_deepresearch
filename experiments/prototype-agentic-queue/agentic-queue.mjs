// @impl AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006
// prototype-agentic-queue: JS-owned Queue Manager API over a 5-slot active window.

import { z } from 'zod';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { traceEntry } from './trace.mjs';

export const QUEUE_FILE = 'rb_queue.agq.json';
export const DEFAULT_PROJECTION_PATH = '_cache/agentic-queue/current-task.md';
export const DEFAULT_TRACE_PATH = '_trace_agq_cli.jsonl';
export const SLOT_NAMES = [
  'slot_1_current',
  'slot_2_next',
  'slot_3_pending',
  'slot_4_pending',
  'slot_5_tail',
];
const PENDING_SLOTS = SLOT_NAMES.slice(1);

export const QueueHealth = z.enum(['ready', 'thin', 'blocked', 'closed']);
export const StopAuthorizationState = z.enum([
  'unauthorized_continue_required',
  'final_delivery',
  'decision_blocker',
  'empty_queue_after_refill',
]);
export const Target = z.enum(['main-agent', 'sub-agent', 'engine']);
export const ItemStatus = z.enum(['queued', 'running', 'done', 'failed', 'blocked']);
export const PriorityClass = z.enum([
  'P0_preempted_restore',
  'P1_state_or_gate_repair',
  'P2_close_open_loop',
  'P3_current_gate_gap',
  'P4_progressive_artifact_or_seed_backfill',
  'P5_new_reference_intake',
  'P6_topology_triage',
]);
export const RestorePriority = z.enum(['normal', 'next_tail_opening']);

const JsonObject = z.record(z.string(), z.unknown());

export const QueueItemSchema = z.object({
  work_id: z.string().min(1),
  title: z.string().min(1),
  target: Target,
  action: z.string().min(1),
  producer_rule: z.string().min(1),
  lineage: JsonObject,
  priority_class: PriorityClass,
  required_receipts: z.array(z.string()),
  done_condition: z.string().min(1),
  verification: z.object({
    engine: z.array(z.string()).default([]),
    agent: z.array(z.string()).default([]),
  }),
  writes_to: z.array(z.string()),
  status_sync: z.array(z.string()),
  completion_receipt: z.string(),
  failure_route: z.string().min(1),
  status: ItemStatus.default('queued'),
  preempted_from_slot: z.string().default('not_applicable'),
  restore_priority: RestorePriority.default('normal'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  payload: JsonObject,
});

const QueueSlot = QueueItemSchema.nullable();
export const ActiveWindowSchema = z.object({
  slot_1_current: QueueSlot,
  slot_2_next: QueueSlot,
  slot_3_pending: QueueSlot,
  slot_4_pending: QueueSlot,
  slot_5_tail: QueueSlot,
});

export const QueueStateSchema = z.object({
  queue_id: z.string().min(1),
  queue_health: QueueHealth.default('ready'),
  stop_authorization_state: StopAuthorizationState.default('unauthorized_continue_required'),
  active_window: ActiveWindowSchema,
  refill_pool: z.array(QueueItemSchema).default([]),
  projection_path: z.string().default(DEFAULT_PROJECTION_PATH),
  trace_path: z.string().default(DEFAULT_TRACE_PATH),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const QueueResultSchema = z.object({
  work_id: z.string().min(1),
  status: z.literal('done').default('done'),
  receipt: z.string().optional(),
  summary: z.string().default(''),
  writes: z.array(z.string()).default([]),
});

export const QueueFailureSchema = z.object({
  work_id: z.string().min(1),
  reason: z.string().min(1),
  repair: QueueItemSchema.optional(),
});

function now() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function withTimestamps(item) {
  const ts = now();
  return QueueItemSchema.parse({
    ...item,
    created_at: item.created_at || ts,
    updated_at: ts,
  });
}

function touchQueue(queue) {
  return { ...queue, updated_at: now() };
}

function syncQueueHealth(queue) {
  const q = queue;
  const hasCurrent = Boolean(q.active_window.slot_1_current);
  const hasOpenSlot = SLOT_NAMES.some((slot) => q.active_window[slot] === null);
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

function queuePath(bundleDir) {
  return path.join(bundleDir, QUEUE_FILE);
}

export function createEmptyQueue(queueId = 'agentic-queue') {
  const ts = now();
  return QueueStateSchema.parse({
    queue_id: queueId,
    queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    active_window: Object.fromEntries(SLOT_NAMES.map((slot) => [slot, null])),
    refill_pool: [],
    projection_path: DEFAULT_PROJECTION_PATH,
    trace_path: DEFAULT_TRACE_PATH,
    created_at: ts,
    updated_at: ts,
  });
}

export function loadQueue(bundleDir) {
  const file = queuePath(bundleDir);
  if (!existsSync(file)) {
    const queue = createEmptyQueue(path.basename(bundleDir));
    traceEntry('queue_loaded', { source: 'agq-load', existed: false, queue_id: queue.queue_id });
    return queue;
  }
  const queue = QueueStateSchema.parse(JSON.parse(readFileSync(file, 'utf-8')));
  traceEntry('queue_loaded', { source: 'agq-load', existed: true, queue_id: queue.queue_id });
  return queue;
}

export function saveQueue(bundleDir, queue) {
  const parsed = validateQueue(queue);
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(queuePath(bundleDir), `${JSON.stringify(parsed, null, 2)}\n`);
  traceEntry('queue_saved', { source: 'agq-save', queue_id: parsed.queue_id });
  return parsed;
}

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
  for (const slot of PENDING_SLOTS) {
    const item = parsed.active_window[slot];
    if (item?.status === 'running') {
      throw new Error(`Only slot_1_current may be running; ${slot} is preview-only`);
    }
  }
  for (const item of parsed.refill_pool) {
    if (item.status === 'running') {
      throw new Error(`refill_pool item ${item.work_id} is preview-only and cannot be running`);
    }
  }
  return parsed;
}

export function hashQueueState(queue) {
  const stable = JSON.stringify(validateQueue(queue));
  return createHash('sha256').update(stable).digest('hex');
}

function rank(item) {
  const order = {
    P0_preempted_restore: 0,
    P1_state_or_gate_repair: 1,
    P2_close_open_loop: 2,
    P3_current_gate_gap: 3,
    P4_progressive_artifact_or_seed_backfill: 4,
    P5_new_reference_intake: 5,
    P6_topology_triage: 6,
  };
  const restore = item.restore_priority === 'next_tail_opening' ? -1 : 0;
  return [restore, order[item.priority_class] ?? 99, item.created_at || ''];
}

function sortPool(pool) {
  return [...pool].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] < rb[i]) return -1;
      if (ra[i] > rb[i]) return 1;
    }
    return 0;
  });
}

function firstOpenSlot(queue) {
  return SLOT_NAMES.find((slot) => queue.active_window[slot] === null) || null;
}

export function enqueue(queue, item, { mode = 'auto' } = {}) {
  const q = clone(validateQueue(queue));
  const prepared = withTimestamps({ ...item, status: 'queued' });
  const slot = mode === 'pool' ? null : firstOpenSlot(q);
  if (slot) {
    q.active_window[slot] = prepared;
    traceEntry('queue_enqueue', { source: 'agq-enqueue', work_id: prepared.work_id, slot });
  } else {
    q.refill_pool = sortPool([...q.refill_pool, prepared]);
    traceEntry('queue_enqueue', { source: 'agq-enqueue', work_id: prepared.work_id, slot: 'refill_pool' });
  }
  return validateQueue(touchQueue(syncQueueHealth(q)));
}

export function claimCurrent(queue, { actor = 'main-agent' } = {}) {
  const q = clone(validateQueue(queue));
  const item = q.active_window.slot_1_current;
  if (!item) {
    q.queue_health = q.refill_pool.length > 0 ? 'thin' : 'blocked';
    q.stop_authorization_state = q.refill_pool.length > 0
      ? 'unauthorized_continue_required'
      : 'empty_queue_after_refill';
    traceEntry('queue_claim_empty', { source: 'agq-claim', actor });
    return { queue: validateQueue(touchQueue(q)), item: null, feedback: advice('empty_queue_after_refill', 'No current work is available after refill.') };
  }
  item.status = 'running';
  item.updated_at = now();
  q.active_window.slot_1_current = item;
  traceEntry('queue_claimed', { source: 'agq-claim', actor, work_id: item.work_id });
  return { queue: validateQueue(touchQueue(q)), item };
}

export function promote(queue) {
  const q = clone(validateQueue(queue));
  q.active_window.slot_1_current = q.active_window.slot_2_next;
  q.active_window.slot_2_next = q.active_window.slot_3_pending;
  q.active_window.slot_3_pending = q.active_window.slot_4_pending;
  q.active_window.slot_4_pending = q.active_window.slot_5_tail;
  q.active_window.slot_5_tail = null;
  traceEntry('queue_promoted', { source: 'agq-promote' });
  return validateQueue(touchQueue(syncQueueHealth(q)));
}

export function refill(queue) {
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

function makeRepairItem(failure) {
  const ts = now();
  return QueueItemSchema.parse({
    work_id: `repair-${failure.work_id}-${Date.now()}`,
    title: `Repair ${failure.work_id}`,
    target: 'main-agent',
    action: `Repair failed queue work: ${failure.reason}`,
    producer_rule: 'failed_receipt_repair',
    lineage: { failed_work_id: failure.work_id, reason: failure.reason },
    priority_class: 'P1_state_or_gate_repair',
    required_receipts: ['none'],
    done_condition: 'Repair work records a corrected artifact or a concrete blocker.',
    verification: { engine: [], agent: ['Repair addresses the recorded failure.'] },
    writes_to: [],
    status_sync: [],
    completion_receipt: 'none',
    failure_route: 'record blocker or escalate repair',
    status: 'queued',
    preempted_from_slot: 'not_applicable',
    restore_priority: 'normal',
    created_at: ts,
    updated_at: ts,
    payload: { failure },
  });
}

export function failCurrent(queue, failure, bundleDir = process.cwd()) {
  const parsedFailure = QueueFailureSchema.parse(failure);
  let q = clone(validateQueue(queue));
  const current = q.active_window.slot_1_current;
  if (!current || current.work_id !== parsedFailure.work_id) {
    throw new Error(`failCurrent expected current work_id ${current?.work_id || 'none'}, got ${parsedFailure.work_id}`);
  }
  current.status = 'failed';
  current.updated_at = now();
  traceEntry('queue_failed', { source: 'agq-fail', work_id: current.work_id, reason: parsedFailure.reason });
  const repair = withTimestamps(parsedFailure.repair || makeRepairItem(parsedFailure));
  q = promote(q);
  q = q.active_window.slot_1_current
    ? preempt(q, repair, { reason: 'failure_repair' })
    : enqueue(q, repair, { mode: 'active' });
  q = refill(q);
  renderProjection(q, bundleDir);
  return validateQueue(touchQueue(q));
}

export function completeCurrent(queue, result, bundleDir = process.cwd()) {
  const parsedResult = QueueResultSchema.parse(result);
  let q = clone(validateQueue(queue));
  const current = q.active_window.slot_1_current;
  if (!current || current.work_id !== parsedResult.work_id) {
    throw new Error(`completeCurrent expected current work_id ${current?.work_id || 'none'}, got ${parsedResult.work_id}`);
  }
  const receipt = parsedResult.receipt || current.completion_receipt;
  const receiptCheck = checkReceipts(q, { ...current, required_receipts: [receipt] }, bundleDir);
  traceEntry('receipt_checked', { source: 'agq-complete', work_id: current.work_id, passed: receiptCheck.passed, receipt });
  if (!receiptCheck.passed) {
    traceEntry('check', { source: 'agq-complete', step: 'completion_receipt', passed: false, detail: receiptCheck.inspect.join('; ') });
    return {
      queue: validateQueue(touchQueue(q)),
      feedback: receiptCheck,
    };
  }
  current.status = 'done';
  current.updated_at = now();
  traceEntry('queue_completed', { source: 'agq-complete', work_id: current.work_id, summary: parsedResult.summary });
  traceEntry('check', { source: 'agq-complete', step: 'completion_receipt', passed: true, work_id: current.work_id });
  q = promote(q);
  q = refill(q);
  renderProjection(q, bundleDir);
  return {
    queue: validateQueue(touchQueue(q)),
    feedback: check(true, `Completed ${current.work_id}`),
  };
}

export function preempt(queue, item, { reason = 'urgent_preemption', unsafeCurrent = false, replaceCurrent = false } = {}) {
  const q = clone(validateQueue(queue));
  const urgent = withTimestamps({
    ...item,
    producer_rule: item.producer_rule || 'urgent_preemption',
    priority_class: item.priority_class || 'P1_state_or_gate_repair',
  });

  if (replaceCurrent && !unsafeCurrent) {
    throw new Error('Replacing slot_1_current requires unsafeCurrent=true');
  }

  if (unsafeCurrent) {
    const displaced = q.active_window.slot_1_current;
    q.active_window.slot_1_current = urgent;
    if (displaced) {
      q.refill_pool = sortPool([
        {
          ...displaced,
          status: 'queued',
          preempted_from_slot: 'slot_1_current',
          restore_priority: 'next_tail_opening',
          updated_at: now(),
        },
        ...q.refill_pool,
      ]);
    }
    traceEntry('queue_preempted', { source: 'agq-preempt', reason, slot: 'slot_1_current', unsafeCurrent: true });
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
    q.refill_pool = sortPool([
      {
        ...displacedTail,
        status: 'queued',
        preempted_from_slot: 'slot_5_tail',
        restore_priority: 'next_tail_opening',
        updated_at: now(),
      },
      ...q.refill_pool,
    ]);
  }
  traceEntry('queue_preempted', { source: 'agq-preempt', reason, slot: 'slot_2_next', unsafeCurrent: false });
  return validateQueue(touchQueue(syncQueueHealth(q)));
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
  return passed
    ? check(true, 'All receipts passed')
    : {
      passed: false,
      check: false,
      inspect,
      advice: 'Add missing receipt or queue repair work before continuing.',
    };
}

function checkOneReceipt(queue, receipt, bundleDir) {
  if (receipt === 'none' || receipt === 'not_applicable') return { passed: true };
  if (receipt.startsWith('file:')) {
    const file = bundlePath(bundleDir, receipt.slice('file:'.length));
    return existsSync(file)
      ? { passed: true }
      : { passed: false, message: `Missing file receipt: ${receipt}` };
  }
  if (receipt.startsWith('json:')) {
    const file = bundlePath(bundleDir, receipt.slice('json:'.length));
    if (!existsSync(file)) return { passed: false, message: `Missing json receipt: ${receipt}` };
    try {
      JSON.parse(readFileSync(file, 'utf-8'));
      return { passed: true };
    } catch {
      return { passed: false, message: `Invalid json receipt: ${receipt}` };
    }
  }
  if (receipt.startsWith('queue:')) {
    const expr = receipt.slice('queue:'.length);
    const [field, expected] = expr.split('=');
    return String(queue[field]) === expected
      ? { passed: true }
      : { passed: false, message: `Queue receipt failed: ${receipt}` };
  }
  if (receipt.startsWith('slot:')) {
    const expr = receipt.slice('slot:'.length);
    const [slot, expected] = expr.split('=');
    const item = queue.active_window[slot];
    return item?.status === expected
      ? { passed: true }
      : { passed: false, message: `Slot receipt failed: ${receipt}` };
  }
  if (receipt.startsWith('trace:')) {
    const eventName = receipt.slice('trace:'.length);
    const tracePath = bundlePath(bundleDir, queue.trace_path);
    if (!existsSync(tracePath)) return { passed: false, message: `Missing trace file for receipt: ${receipt}` };
    const found = readFileSync(tracePath, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .some((event) => event.event === eventName);
    return found ? { passed: true } : { passed: false, message: `Trace receipt failed: ${receipt}` };
  }
  return { passed: false, message: `Unsupported receipt prefix: ${receipt}` };
}

export function inspectQueue(queue, bundleDir = process.cwd()) {
  const q = validateQueue(queue);
  const issues = [];
  const current = q.active_window.slot_1_current;
  if (!current) issues.push('slot_1_current is empty');
  if (current) {
    const receipts = checkReceipts(q, current, bundleDir);
    if (!receipts.passed) issues.push(...receipts.inspect);
  }
  return issues.length === 0
    ? check(true, 'Queue is executable')
    : {
      passed: false,
      check: false,
      inspect: issues,
      advice: 'Refill queue, add missing receipts, or record a blocker.',
    };
}

export function renderProjection(queue, bundleDir = process.cwd()) {
  const q = validateQueue(queue);
  const outputPath = bundlePath(bundleDir, q.projection_path);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const lines = [
    '# Agentic Queue Projection',
    '',
    '> Generated from `rb_queue.agq.json`. Do not edit this projection as queue authority.',
    '',
    `- queue_id: \`${q.queue_id}\``,
    `- queue_health: \`${q.queue_health}\``,
    `- stop_authorization_state: \`${q.stop_authorization_state}\``,
    '',
    '## Active Window',
    '',
  ];
  for (const slot of SLOT_NAMES) {
    const item = q.active_window[slot];
    lines.push(`### ${slot}`);
    if (!item) {
      lines.push('- empty: `true`', '');
      continue;
    }
    lines.push(
      `- work_id: \`${item.work_id}\``,
      `- title: ${item.title}`,
      `- target: \`${item.target}\``,
      `- status: \`${item.status}\``,
      `- action: ${item.action}`,
      `- required_receipts: ${item.required_receipts.map((r) => `\`${r}\``).join(', ') || '`none`'}`,
      `- completion_receipt: \`${item.completion_receipt}\``,
      `- writes_to: ${item.writes_to.map((r) => `\`${r}\``).join(', ') || '`none`'}`,
      `- failure_route: ${item.failure_route}`,
      '',
    );
  }
  lines.push('## Refill Pool', '');
  for (const item of q.refill_pool) {
    lines.push(`- \`${item.work_id}\` ${item.title} (${item.priority_class}, restore=${item.restore_priority})`);
  }
  if (q.refill_pool.length === 0) lines.push('- empty');
  writeFileSync(outputPath, `${lines.join('\n')}\n`);
  traceEntry('projection_rendered', { source: 'agq-projection', path: q.projection_path });
  return outputPath;
}

function check(passed, message) {
  return {
    passed,
    check: passed,
    inspect: passed ? [] : [message],
    advice: passed ? 'Continue from slot_1_current.' : message,
  };
}

function advice(kind, message) {
  return {
    passed: false,
    check: false,
    inspect: [kind],
    advice: message,
  };
}

export function makeQueueItem(overrides = {}) {
  return QueueItemSchema.parse({
    work_id: overrides.work_id || `work-${Date.now()}`,
    title: overrides.title || 'Queue work',
    target: overrides.target || 'main-agent',
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
