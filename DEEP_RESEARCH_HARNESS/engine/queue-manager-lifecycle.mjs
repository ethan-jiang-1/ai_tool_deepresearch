// @impl FRE-005
// Queue Manager lifecycle API: create/load/save, enqueue/claim/complete/fail, inspect, and receipts.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  QUEUE,
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
import { firstOpenPosition, promote, refill, preempt, sortPool } from './queue-manager-window.mjs';
import { render } from './queue-manager-render.mjs';
import { readBundlePlan } from './helpers/gate-helpers-readers.mjs';
import {
  admitSeedTopicMaterializeDeclaration,
  evaluateSeedTopicAuthoring,
} from './helpers/seed-topic-authoring-evaluator.mjs';
import { inspectSeedTopicsAuthoringAuthorization } from './helpers/canonical-topic-state.mjs';

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
  if (receipt.startsWith('trace:')) {
    const eventName = receipt.slice('trace:'.length);
    const tracePath = bundlePath(bundleDir, queue.trace_path);
    if (!existsSync(tracePath)) return { passed: false, message: `Missing trace file for receipt: ${receipt}` };
    const found = readFileSync(tracePath, 'utf-8').split('\n').filter(Boolean)
      .map(l => JSON.parse(l)).some(e => e.event === eventName);
    return found ? { passed: true } : { passed: false, message: `Trace receipt failed: ${receipt}` };
  }
  if (receipt.startsWith('work_unit:')) {
    return { passed: false, message: `Work-unit receipt must be validated by operate-work-unit submit: ${receipt}` };
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
  traceEntry('receipt_checked', { source: 'agq-receipt', queue_item_id: parsed.queue_item_id, passed, receipts });
  return passed ? check(true, 'All receipts passed')
    : { passed: false, check: false, inspect, advice: 'Add missing receipt or queue repair work before continuing.' };
}

// ============================================================
// Internal: repair item factory
// ============================================================

function makeRepairItem(failure) {
  const ts = now();
  return QueueItemSchema.parse({
    queue_item_id: `repair-${failure.queue_item_id}-${Date.now()}`, title: `Repair ${failure.queue_item_id}`,
    targets: { controller: 'main-agent' }, action: `Repair failed queue work: ${failure.reason}`,
    producer_rule: 'failed_receipt_repair', lineage: { failed_queue_item_id: failure.queue_item_id, reason: failure.reason },
    priority_class: 'P1_state_or_gate_repair', required_receipts: ['none'],
    done_condition: 'Repair work records a corrected artifact or a concrete blocker.',
    verification: { engine: [], agent: ['Repair addresses the recorded failure.'] },
    writes_to: [], status_sync: [], completion_receipt: 'none',
    failure_route: 'record blocker or escalate repair', status: 'queued',
    restore_priority: 'normal',
    created_at: ts, updated_at: ts, payload: { failure },
  });
}

// ============================================================
// Public API
// ============================================================

/**
 * Create a fresh empty queue with an ordered active window and empty refill pool.
 *
 * @param {string} [queueId='agentic-queue'] — your label for this queue instance
 * @returns {object} QueueState — validated, immutable-shaped queue object
 */
export function createQueue(queueId = 'agentic-queue') {
  const ts = now();
  return QueueStateSchema.parse({
    queue_id: queueId, queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    schema_version: 'queue.v2',
    active_window: [], refill_pool: [], delegated_in_flight: {}, terminal_history: [],
    projection_path: QUEUE.PROJECTION, trace_path: QUEUE.TRACE,
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

export function loadQueueReadOnly(bundleDir) {
  const file = queuePath(bundleDir);
  if (!existsSync(file)) return createQueue(path.basename(bundleDir));
  return queueStateFromFile(JSON.parse(readFileSync(file, 'utf-8')), { queueId: path.basename(bundleDir) });
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

export function recordQueueAssignmentModeRepaired(detail) {
  traceEntry('queue_assignment_mode_repaired', {
    source: 'agq-repair',
    ...detail,
  });
}

/**
 * Add a queue demand item. Fills the active window until the v2 limit; if
 * the window is full, the item goes to the refill pool.
 *
 * @param {object} queue — current QueueState
 * @param {object} item — work item (use makeItem() to construct one)
 * @param {object} [opts]
 * @param {'auto'|'pool'} [opts.mode='auto'] — 'auto' appends to active_window
 *        when possible; 'pool' always sends to refill_pool
 * @returns {object} QueueState — mutated queue
 */
export function enqueue(queue, item, { mode = 'auto' } = {}) {
  const q = clone(validateQueue(queue));
  const prepared = withTimestamps({ ...item, status: 'queued' });
  const target = item.targets?.controller;
  logEvent('info', 'queue_enqueue_attempt', { kind: 'queue_enqueue', queue_item_id: prepared.queue_item_id, target });
  try {
    const position = mode === 'pool' ? null : firstOpenPosition(q);
    if (position !== null) {
      q.active_window.push(prepared);
      traceEntry('check', { source: 'agq-enqueue', step: 'enqueue', passed: true, queue_item_id: prepared.queue_item_id, position });
      logEvent('info', 'queue_enqueue_done', { kind: 'queue_enqueue', queue_item_id: prepared.queue_item_id, position, target });
    } else {
      q.refill_pool = sortPool([...q.refill_pool, prepared]);
      traceEntry('check', { source: 'agq-enqueue', step: 'enqueue', passed: true, queue_item_id: prepared.queue_item_id, location: 'refill_pool' });
      logEvent('info', 'queue_enqueue_done', { kind: 'queue_enqueue', queue_item_id: prepared.queue_item_id, location: 'refill_pool', target });
    }
    return validateQueue(touchQueue(syncQueueHealth(q)));
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'queue_enqueue_exception', { kind: 'queue_enqueue', queue_item_id: item?.queue_item_id, reason: safeMsg });
    throw err;
  }
}

function delegatedClaimPhase(item) {
  const explicit = item?.payload?.phase || item?.lineage?.phase;
  if (/^wave[0-9]+$/.test(String(explicit || ''))) return explicit;
  const match = String(item?.kind || '').match(/^wave([0-9]+)_/);
  return match ? `wave${match[1]}` : '<waveN>';
}

function delegatedClaimCommand(item, bundleDir) {
  const bundle = bundleDir ? path.resolve(bundleDir) : '<bundle-path>';
  const role = item?.targets?.delegates?.role_key || '<role-key>';
  return `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim ${bundle} --phase ${delegatedClaimPhase(item)} --actor-outcome <available|unavailable> --actor-source native_probe --actor-role-key ${role} --actor-reason <probe-reason> --execution-actor <delegated_subagent|phase_agent_fallback>`;
}

/**
 * Claim the current non-delegated queue item. Marks the queue-front item running.
 *
 * @param {object} queue — current QueueState
 * @param {object} [opts]
 * @param {string} [opts.actor='main-agent'] — who is claiming
 * @param {string|null} [opts.bundleDir=null] — resolved bundle path for repair feedback
 * @returns {{ queue: object, item: object|null }}
 *   - `item` is the claimed QueueItem, or null if the active window is empty
 */
export function claim(queue, { actor = 'main-agent', bundleDir = null } = {}) {
  logEvent('info', 'queue_claim_attempt', { kind: 'queue_claim', actor });
  try {
    const q = clone(validateQueue(queue));
    const item = q.active_window[0];
    if (!item) {
      q.queue_health = q.refill_pool.length > 0 ? 'thin' : 'blocked';
      q.stop_authorization_state = q.refill_pool.length > 0 ? 'unauthorized_continue_required' : 'empty_queue_after_refill';
      traceEntry('check', { source: 'agq-claim', step: 'claim', passed: false, reason: 'empty' });
      logEvent('warn', 'queue_claim_empty', { kind: 'queue_claim', actor, queue_health: q.queue_health, stop_authorization_state: q.stop_authorization_state });
      return {
        queue: validateQueue(touchQueue(q)),
        item: null,
        reason_code: 'empty_active_window',
        repair_kind: 'engine_operation',
        missing_fact: 'Queue claim found no item in the active window after current refill state was evaluated.',
        write_to: 'Queue demand owner: enqueue/refill through operate-queue before claiming.',
        rerun: `node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs claim ${bundleDir ? path.resolve(bundleDir) : '<bundle-path>'} --actor ${actor}`,
        queue_health: q.queue_health,
        stop_authorization_state: q.stop_authorization_state,
      };
    }
    if (item.targets?.delegates?.to === 'sub-agent') {
      const rerun = delegatedClaimCommand(item, bundleDir);
      const feedback = {
        passed: false,
        check: false,
        inspect: [`Queue item ${item.queue_item_id} requires delegated work-unit claim.`],
        advice: 'Use operate-work-unit claim for delegated queue demand; operate-queue claim is for non-delegated main-agent work.',
      };
      traceEntry('check', { source: 'agq-claim', step: 'claim', passed: false, queue_item_id: item.queue_item_id, reason: 'delegated_requires_work_unit_claim' });
      logEvent('warn', 'queue_claim_reject', { kind: 'queue_claim', queue_item_id: item.queue_item_id, actor, reason: 'delegated_requires_work_unit_claim' });
      return {
        queue: validateQueue(q),
        item: null,
        reason_code: 'delegated_requires_work_unit_claim',
        blocked_by_queue_item_id: item.queue_item_id,
        repair_kind: 'engine_operation',
        missing_fact: `Queue item ${item.queue_item_id} is delegated to role '${item.targets.delegates.role_key}' and cannot be claimed by operate-queue.`,
        write_to: `operate-work-unit claim arguments for role '${item.targets.delegates.role_key}': actor observation and execution actor class`,
        rerun,
        feedback,
      };
    }
    item.status = 'running';
    item.updated_at = now();
    q.active_window[0] = item;

    traceEntry('check', { source: 'agq-claim', step: 'claim', passed: true, queue_item_id: item.queue_item_id });
    logEvent('info', 'queue_claim_done', { kind: 'queue_claim', queue_item_id: item.queue_item_id, actor });
    return { queue: validateQueue(touchQueue(q)), item, advice: { delegates_required: false } };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'queue_claim_exception', { kind: 'queue_claim', actor, reason: safeMsg });
    throw err;
  }
}

/**
 * Complete the current non-delegated queue-front item. Validates receipts,
 * marks the item 'done', promotes the window, refills from pool, and
 * renders the projection.
 *
 * @param {object} queue — current QueueState
 * @param {object} result — { queue_item_id, receipt?, summary?, writes? }
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

  logEvent('info', 'queue_complete_attempt', { kind: 'queue_complete', queue_item_id: parsedResult.queue_item_id, delegated: false });
  let q = clone(validateQueue(queue));
  const inFlight = q.delegated_in_flight?.[parsedResult.queue_item_id];
  if (inFlight) {
    const feedback = {
      passed: false,
      check: false,
      inspect: [`Delegated queue item ${parsedResult.queue_item_id} is in flight as work unit ${inFlight.work_id}.`],
      advice: 'Use operate-work-unit submit for delegated sub-agent completion.',
    };
    traceEntry('check', { source: 'agq-complete', step: 'delegated_complete_rejected', passed: false, queue_item_id: parsedResult.queue_item_id, work_id: inFlight.work_id });
    logEvent('warn', 'queue_complete_reject', { kind: 'queue_complete', queue_item_id: parsedResult.queue_item_id, work_id: inFlight.work_id, delegated: true, reason: 'delegated_requires_work_unit_submit' });
    return { queue: validateQueue(touchQueue(q)), feedback };
  }
  const current = q.active_window[0];
  if (!current || current.queue_item_id !== parsedResult.queue_item_id) {
    logEvent('error', 'queue_complete_exception', { kind: 'queue_complete', queue_item_id: parsedResult.queue_item_id, reason: `queue_item_id mismatch: expected ${current?.queue_item_id || 'none'}, got ${parsedResult.queue_item_id}` });
    throw new Error(`complete expected current queue_item_id ${current?.queue_item_id || 'none'}, got ${parsedResult.queue_item_id}`);
  }

  const isDelegated = current.targets?.delegates?.to === 'sub-agent';
  if (isDelegated) {
    const feedback = {
      passed: false,
      check: false,
      inspect: [`Delegated queue item ${current.queue_item_id} cannot be completed through operate-queue complete.`],
      advice: 'Use operate-work-unit submit for delegated sub-agent completion.',
    };
    traceEntry('check', { source: 'agq-complete', step: 'delegated_complete_rejected', passed: false, queue_item_id: current.queue_item_id });
    logEvent('warn', 'queue_complete_reject', { kind: 'queue_complete', queue_item_id: current.queue_item_id, delegated: true, reason: 'delegated_requires_work_unit_submit' });
    return { queue: validateQueue(touchQueue(q)), feedback };
  }

  const currentReceipt = parsedResult.receipt || current.completion_receipt;
  if (currentReceipt !== null) {
    const receiptCheck = checkReceipts(q, { ...current, required_receipts: [currentReceipt] }, bundleDir);
    traceEntry('receipt_checked', { source: 'agq-complete', queue_item_id: current.queue_item_id, passed: receiptCheck.passed, receipt: currentReceipt });
    if (!receiptCheck.passed) {
      traceEntry('check', { source: 'agq-complete', step: 'completion_receipt', passed: false, detail: receiptCheck.inspect.join('; ') });
      logEvent('warn', 'queue_complete_receipt_fail', { kind: 'receipt_check', queue_item_id: current.queue_item_id, receipt: currentReceipt, reason: receiptCheck.inspect.join('; ') });
      return { queue: validateQueue(touchQueue(q)), feedback: receiptCheck };
    }
  } else {
    traceEntry('receipt_checked', { source: 'agq-complete', queue_item_id: current.queue_item_id, passed: true, receipt: null, note: 'null receipt — non-delegated no-op' });
  }
  if (current.producer_rule === 'seed_topic_materialize') {
    const plan = readBundlePlan(bundleDir);
    const declaration = admitSeedTopicMaterializeDeclaration({
      item: current,
      topicRegistry: plan?.topic_registry,
    });
    if (!declaration.passed) {
      const feedback = {
        passed: false,
        check: false,
        inspect: [declaration.missing_fact],
        advice: 'Repair the queue-producer declaration through its owner, then rerun the same completion checkpoint.',
      };
      traceEntry('check', { source: 'agq-complete', step: 'seed_topic_declaration', passed: false, queue_item_id: current.queue_item_id });
      logEvent('warn', 'queue_complete_seed_declaration_fail', { kind: 'seed_topic_declaration', queue_item_id: current.queue_item_id });
      return {
        queue: validateQueue(q),
        feedback,
        persist_queue: false,
        repair_kind: declaration.repair_kind,
        missing_fact: declaration.missing_fact,
        write_to: declaration.write_to,
        rerun: `node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs complete ${path.resolve(bundleDir)} --result <result.json>`,
      };
    }
    const raw = readFileSync(path.join(bundleDir, declaration.relative_path), 'utf8');
    const authoring = evaluateSeedTopicAuthoring({
      raw,
      relativePath: declaration.relative_path,
      topic: declaration.topic,
    });
    if (!authoring.passed) {
      const authorization = inspectSeedTopicsAuthoringAuthorization({ bundlePath: bundleDir });
      const queueRerun = `node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs complete ${path.resolve(bundleDir)} --result <result.json>`;
      const enrichApply = `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle ${path.resolve(bundleDir)} --input <retained-enrich-seed-${declaration.topic.topic_uid}.json>`;
      const repair = !authorization.ok ? {
        repair_kind: 'missing_contract',
        missing_fact: `${authoring.missing_fact} No validated Seed Topics authoring window is currently available.`,
        write_to: 'Seed Topics lifecycle authorization boundary',
        advice: 'Keep the queue item nonterminal; return through the current lifecycle owner before retrying completion.',
      } : authoring.reason_code === 'canonical_binding_mismatch' ? {
        repair_kind: 'engine_operation',
        missing_fact: authoring.missing_fact,
        write_to: enrichApply,
        advice: 'Submit the retained complete enrich_seed input through canonical topic-state, then rerun this same completion checkpoint.',
      } : {
        repair_kind: 'agent_action',
        missing_fact: authoring.missing_fact,
        write_to: authoring.write_to,
        advice: 'Repair only the reported frontmatter syntax coordinate, run canonical topic-state enrich_seed, then rerun this same completion checkpoint.',
      };
      const feedback = {
        passed: false,
        check: false,
        inspect: [repair.missing_fact],
        advice: repair.advice,
      };
      traceEntry('check', { source: 'agq-complete', step: 'seed_topic_authoring', passed: false, queue_item_id: current.queue_item_id, reason_code: authoring.reason_code });
      logEvent('warn', 'queue_complete_seed_authoring_fail', { kind: 'seed_topic_authoring', queue_item_id: current.queue_item_id, reason_code: authoring.reason_code });
      return {
        queue: validateQueue(q),
        feedback,
        persist_queue: false,
        repair_kind: repair.repair_kind,
        missing_fact: repair.missing_fact,
        write_to: repair.write_to,
        rerun: queueRerun,
      };
    }
  }
  current.status = 'done';
  current.updated_at = now();
  q = promote(q);
  q.terminal_history.push({
    queue_item_id: current.queue_item_id,
    terminal_status: 'done',
    completed_at: now(),
    reason: parsedResult.summary || undefined,
    item: current,
  });
  traceEntry('queue_completed', { source: 'agq-complete', queue_item_id: current.queue_item_id, summary: parsedResult.summary });
  traceEntry('check', { source: 'agq-complete', step: 'completion_receipt', passed: true, queue_item_id: current.queue_item_id });
  q = refill(q);
  render(q, bundleDir);

  logEvent('info', 'queue_complete_done', { kind: 'queue_complete', queue_item_id: current.queue_item_id, delegated: false });
  return { queue: validateQueue(touchQueue(q)), feedback: check(true, `Completed ${current.queue_item_id}`) };
}

/**
 * Fail the current queue-front item. Creates a repair item,
 * promotes the window, inserts the repair work, refills, and renders.
 *
 * @param {object} queue — current QueueState
 * @param {object} failure — { queue_item_id, reason, repair?: QueueItem }
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

  logEvent('warn', 'queue_fail_attempt', { kind: 'queue_fail', queue_item_id: parsedFailure.queue_item_id, reason: parsedFailure.reason });
  let q = clone(validateQueue(queue));
  const current = q.active_window[0];
  if (!current || current.queue_item_id !== parsedFailure.queue_item_id) {
    logEvent('error', 'queue_fail_exception', { kind: 'queue_fail', queue_item_id: parsedFailure.queue_item_id, reason: `queue_item_id mismatch: expected ${current?.queue_item_id || 'none'}, got ${parsedFailure.queue_item_id}` });
    throw new Error(`fail expected current queue_item_id ${current?.queue_item_id || 'none'}, got ${parsedFailure.queue_item_id}`);
  }
  current.status = 'failed';
  current.updated_at = now();
  q = promote(q);
  q.terminal_history.push({
    queue_item_id: current.queue_item_id,
    terminal_status: 'failed',
    completed_at: now(),
    reason: parsedFailure.reason,
    item: current,
  });
  traceEntry('queue_failed', { source: 'agq-fail', queue_item_id: current.queue_item_id, reason: parsedFailure.reason });
  traceEntry('check', { source: 'agq-fail', step: 'fail', passed: true, queue_item_id: current.queue_item_id, reason: parsedFailure.reason });
  const repair = withTimestamps(parsedFailure.repair || makeRepairItem(parsedFailure));
  q = q.active_window.length > 0
    ? preempt(q, repair, { reason: 'failure_repair' })
    : enqueue(q, repair, { mode: 'auto' });
  q = refill(q);
  render(q, bundleDir);
  logEvent('warn', 'queue_fail_done', { kind: 'queue_fail', queue_item_id: current.queue_item_id, reason: parsedFailure.reason });
  return validateQueue(touchQueue(q));
}

/**
 * Health check on the queue. Verifies queue-front demand or delegated attempts need action.
 *
 * @param {object} queue — current QueueState
 * @param {string} [bundleDir] — for receipt checking (defaults to cwd)
 * @returns {{ passed: boolean, check: boolean, inspect?: string[], advice?: string }}
 *   - MD reads `passed`. If false, read `inspect` + `advice`.
 */
export function inspect(queue, bundleDir = process.cwd()) {
  const q = validateQueue(queue);
  const issues = [];
  const current = q.active_window[0];
  const inFlight = Object.values(q.delegated_in_flight || {});
  const expired = inFlight.filter((entry) => entry.deadline_at && Date.parse(entry.deadline_at) < Date.now());
  if (!current && inFlight.length === 0) issues.push('active_window is empty and no delegated work units are in flight');
  for (const entry of expired) issues.push(`delegated work unit expired: ${entry.work_id} for ${entry.queue_item_id}`);
  if (current && !current.targets?.delegates) {
    const receipts = checkReceipts(q, current, bundleDir);
    if (!receipts.passed) issues.push(...receipts.inspect);
  }
  return issues.length === 0 ? check(true, 'Queue is executable')
    : { passed: false, check: false, inspect: issues, advice: 'Refill queue, add missing receipts, or record a blocker.' };
}

export function pendingCount(queue) {
  const q = validateQueue(queue);
  return q.active_window.length + q.refill_pool.length;
}

/**
 * Factory for creating a properly-typed queue item with sensible defaults.
 * Override any fields via the `overrides` parameter.
 *
 * @param {object} [overrides] — partial QueueItem fields to override defaults
 * @returns {object} QueueItem — validated and timestamped
 */
export function makeItem(overrides = {}) {
  if (Object.prototype.hasOwnProperty.call(overrides, 'work_id')) {
    throw new Error('Queue demand identity is queue_item_id; work_id is reserved for Engine-allocated work-unit attempts.');
  }
  const { preempted_from_slot: _oldPreemptedFromSlot, ...rest } = overrides;
  return QueueItemSchema.parse({
    queue_item_id: overrides.queue_item_id || `queue-${Date.now()}`,
    title: overrides.title || 'Queue work',
    targets: overrides.targets || { controller: 'main-agent' },
    kind: overrides.kind,
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
    restore_priority: overrides.restore_priority || 'normal',
    created_at: overrides.created_at || now(),
    updated_at: overrides.updated_at || now(),
    payload: overrides.payload || {},
    ...rest,
  });
}
