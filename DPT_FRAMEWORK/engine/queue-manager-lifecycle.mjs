// @impl FRE-005
// Queue Manager lifecycle API: create/load/save, enqueue/claim/complete/fail, inspect, and receipts.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  QUEUE,
  SLOT_NAMES,
  QueueFailureSchema,
  QueueItemSchema,
  QueueResultSchema,
  QueueStateSchema,
  bundlePath,
  canonicalQueueFileShape,
  check,
  clone,
  ensureTrace,
  logEvent,
  now,
  queuePath,
  queueStateFromFile,
  syncQueueHealth,
  touchQueue,
  traceEntry,
  validateQueue,
  withTimestamps,
} from './queue-manager-core.mjs';
import { firstOpenSlot, promote, refill, preempt, sortPool } from './queue-manager-window.mjs';
import { appendOutputDeclarationLedger, validateDelegatedCompletion } from './queue-manager-ledger.mjs';
import { render } from './queue-manager-render.mjs';

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
 * Create a fresh empty queue with all Queue active-window slots null and empty refill pool.
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
  logEvent('info', 'queue_load_attempt', { kind: 'queue_enqueue' });
  try {
    const file = queuePath(bundleDir);
    if (!existsSync(file)) {
      const queue = createQueue(path.basename(bundleDir));
      traceEntry('queue_loaded', { source: 'agq-load', existed: false, queue_id: queue.queue_id });
      logEvent('info', 'queue_load_done', { kind: 'queue_enqueue', queue_id: queue.queue_id, existed: false });
      return queue;
    }
    const queue = queueStateFromFile(JSON.parse(readFileSync(file, 'utf-8')), { queueId: path.basename(bundleDir) });
    traceEntry('queue_loaded', { source: 'agq-load', existed: true, queue_id: queue.queue_id });
    logEvent('info', 'queue_load_done', { kind: 'queue_enqueue', queue_id: queue.queue_id, existed: true });
    return queue;
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'queue_load_exception', { kind: 'queue_enqueue', reason: safeMsg });
    throw err;
  }
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
  logEvent('info', 'queue_save_attempt', { kind: 'queue_enqueue' });
  try {
    const parsed = validateQueue(queue);
    const persisted = canonicalQueueFileShape(parsed);
    mkdirSync(bundleDir, { recursive: true });
    writeFileSync(queuePath(bundleDir), `${JSON.stringify(persisted, null, 2)}\n`);
    traceEntry('check', { source: 'agq-save', step: 'save', passed: true, queue_id: parsed.queue_id });
    logEvent('info', 'queue_save_done', { kind: 'queue_enqueue', queue_id: parsed.queue_id });
    return parsed;
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'queue_save_exception', { kind: 'queue_enqueue', reason: safeMsg });
    throw err;
  }
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
  const target = item.targets?.controller;
  logEvent('info', 'queue_enqueue_attempt', { kind: 'queue_enqueue', work_id: prepared.work_id, target });
  try {
    const slot = mode === 'pool' ? null : firstOpenSlot(q);
    if (slot) {
      q.active_window[slot] = prepared;
      traceEntry('check', { source: 'agq-enqueue', step: 'enqueue', passed: true, work_id: prepared.work_id, slot });
      logEvent('info', 'queue_enqueue_done', { kind: 'queue_enqueue', work_id: prepared.work_id, slot, target });
    } else {
      q.refill_pool = sortPool([...q.refill_pool, prepared]);
      traceEntry('check', { source: 'agq-enqueue', step: 'enqueue', passed: true, work_id: prepared.work_id, slot: 'refill_pool' });
      logEvent('info', 'queue_enqueue_done', { kind: 'queue_enqueue', work_id: prepared.work_id, slot: 'refill_pool', target });
    }
    return validateQueue(touchQueue(syncQueueHealth(q)));
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'queue_enqueue_exception', { kind: 'queue_enqueue', work_id: item?.work_id, reason: safeMsg });
    throw err;
  }
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
  logEvent('info', 'queue_claim_attempt', { kind: 'queue_claim', actor });
  try {
    const q = clone(validateQueue(queue));
    const item = q.active_window.slot_1_current;
    if (!item) {
      q.queue_health = q.refill_pool.length > 0 ? 'thin' : 'blocked';
      q.stop_authorization_state = q.refill_pool.length > 0 ? 'unauthorized_continue_required' : 'empty_queue_after_refill';
      traceEntry('check', { source: 'agq-claim', step: 'claim', passed: false, reason: 'empty' });
      logEvent('warn', 'queue_claim_empty', { kind: 'queue_claim', actor, queue_health: q.queue_health, stop_authorization_state: q.stop_authorization_state });
      return { queue: validateQueue(touchQueue(q)), item: null, queue_health: q.queue_health, stop_authorization_state: q.stop_authorization_state };
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
    logEvent('info', 'queue_claim_done', { kind: 'queue_claim', work_id: item.work_id, actor });
    return { queue: validateQueue(touchQueue(q)), item, advice };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'queue_claim_exception', { kind: 'queue_claim', actor, reason: safeMsg });
    throw err;
  }
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
  ensureTrace(bundleDir);
  let parsedResult;
  try {
    parsedResult = QueueResultSchema.parse(result);
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'queue_complete_exception', { kind: 'queue_complete', reason: safeMsg });
    throw err;
  }

  logEvent('info', 'queue_complete_attempt', { kind: 'queue_complete', work_id: parsedResult.work_id, delegated: false });
  let q = clone(validateQueue(queue));
  const current = q.active_window.slot_1_current;
  if (!current || current.work_id !== parsedResult.work_id) {
    logEvent('error', 'queue_complete_exception', { kind: 'queue_complete', work_id: parsedResult.work_id, reason: `work_id mismatch: expected ${current?.work_id || 'none'}, got ${parsedResult.work_id}` });
    throw new Error(`complete expected current work_id ${current?.work_id || 'none'}, got ${parsedResult.work_id}`);
  }

  // ── Delegated task: validate relay provenance + declarations (AGQ-017) ──
  const isDelegated = current.targets?.delegates?.to === 'sub-agent';
  let delegationResult = null;
  if (isDelegated) {
    const delCheck = validateDelegatedCompletion(current, parsedResult, bundleDir);
    traceEntry('receipt_checked', { source: 'agq-complete', work_id: current.work_id, delegated: true, passed: delCheck.passed });
    if (!delCheck.passed) {
      traceEntry('check', { source: 'agq-complete', step: 'delegated_provenance', passed: false, detail: delCheck.inspect.join('; ') });
      logEvent('warn', 'queue_complete_reject', { kind: 'queue_complete', work_id: current.work_id, delegated: true, reason: delCheck.inspect.join('; ') });
      return { queue: validateQueue(touchQueue(q)), feedback: delCheck };
    }
    delegationResult = delCheck;
  }

  // ── Standard receipt check ──
  // AGQ-001/004: completion_receipt may be null for supplementary tasks with empty required_receipts.
  // In that case, skip the receipt check — delegated relay provenance and downstream gates decide validity.
  const currentReceipt = parsedResult.receipt || current.completion_receipt;
  if (currentReceipt !== null) {
    const receiptCheck = checkReceipts(q, { ...current, required_receipts: [currentReceipt] }, bundleDir);
    traceEntry('receipt_checked', { source: 'agq-complete', work_id: current.work_id, passed: receiptCheck.passed, receipt: currentReceipt });
    if (!receiptCheck.passed) {
      traceEntry('check', { source: 'agq-complete', step: 'completion_receipt', passed: false, detail: receiptCheck.inspect.join('; ') });
      logEvent('warn', 'queue_complete_receipt_fail', { kind: 'receipt_check', work_id: current.work_id, receipt: currentReceipt, reason: receiptCheck.inspect.join('; ') });
      return { queue: validateQueue(touchQueue(q)), feedback: receiptCheck };
    }
  } else {
    // null completion_receipt: skip receipt check; delegated relay provenance decides validity
    traceEntry('receipt_checked', { source: 'agq-complete', work_id: current.work_id, passed: true, receipt: null, note: 'null receipt — deferred to relay provenance' });
  }
  current.status = 'done';
  current.updated_at = now();
  traceEntry('queue_completed', { source: 'agq-complete', work_id: current.work_id, summary: parsedResult.summary });
  traceEntry('check', { source: 'agq-complete', step: 'completion_receipt', passed: true, work_id: current.work_id });
  q = promote(q);
  q = refill(q);
  render(q, bundleDir);

  // ── Delegated success: append output declaration ledger ──
  if (isDelegated && delegationResult?.slotResult) {
    const slotRef = parsedResult.slot_result_ref;
    logEvent('info', 'ledger_append_attempt', { kind: 'ledger_append', work_id: current.work_id, slot_result_ref: slotRef });
    try {
      appendOutputDeclarationLedger(
        bundleDir, current, slotRef,
        delegationResult.slotResult,
        delegationResult.verifiedCacheTrails || null,
      );
      logEvent('info', 'ledger_append_done', { kind: 'ledger_append', work_id: current.work_id });
    } catch (err) {
      const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
      logEvent('error', 'ledger_append_exception', { kind: 'ledger_append', work_id: current.work_id, reason: safeMsg });
      throw err;
    }
  }

  logEvent('info', 'queue_complete_done', { kind: 'queue_complete', work_id: current.work_id, delegated: isDelegated });
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
  ensureTrace(bundleDir);
  let parsedFailure;
  try {
    parsedFailure = QueueFailureSchema.parse(failure);
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'queue_fail_exception', { kind: 'queue_fail', reason: safeMsg });
    throw err;
  }

  logEvent('warn', 'queue_fail_attempt', { kind: 'queue_fail', work_id: parsedFailure.work_id, reason: parsedFailure.reason });
  let q = clone(validateQueue(queue));
  const current = q.active_window.slot_1_current;
  if (!current || current.work_id !== parsedFailure.work_id) {
    logEvent('error', 'queue_fail_exception', { kind: 'queue_fail', work_id: parsedFailure.work_id, reason: `work_id mismatch: expected ${current?.work_id || 'none'}, got ${parsedFailure.work_id}` });
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
  logEvent('warn', 'queue_fail_done', { kind: 'queue_fail', work_id: current.work_id, reason: parsedFailure.reason });
  return validateQueue(touchQueue(q));
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

export function pendingCount(queue) {
  const q = validateQueue(queue);
  const active = SLOT_NAMES.filter((slot) => q.active_window[slot] !== null).length;
  return active + q.refill_pool.length;
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
    completion_receipt: overrides.completion_receipt !== undefined ? overrides.completion_receipt : 'none',
    failure_route: overrides.failure_route || 'queue repair work',
    status: overrides.status || 'queued',
    preempted_from_slot: overrides.preempted_from_slot || 'not_applicable',
    restore_priority: overrides.restore_priority || 'normal',
    created_at: overrides.created_at || now(),
    updated_at: overrides.updated_at || now(),
    payload: overrides.payload || {},
  });
}
