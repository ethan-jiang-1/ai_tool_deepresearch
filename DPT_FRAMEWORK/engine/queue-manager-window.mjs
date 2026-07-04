// @impl FRE-005
// Queue Manager active-window mechanics: pool ordering, promote/refill, and urgent preemption.

import {
  SLOT_NAMES,
  clone,
  logEvent,
  now,
  syncQueueHealth,
  touchQueue,
  traceEntry,
  validateQueue,
  withTimestamps,
} from './queue-manager-core.mjs';

// ============================================================
// Internal: pool sorting + slot mechanics
// ============================================================

export function rank(item) {
  const order = { P0_preempted_restore: 0, P1_state_or_gate_repair: 1, P2_close_open_loop: 2, P3_current_gate_gap: 3, P4_progressive_artifact_or_seed_backfill: 4, P5_new_reference_intake: 5, P6_topology_triage: 6 };
  const restore = item.restore_priority === 'next_tail_opening' ? -1 : 0;
  return [restore, order[item.priority_class] ?? 99, item.created_at || ''];
}

export function sortPool(pool) {
  return [...pool].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    for (let i = 0; i < ra.length; i++) { if (ra[i] < rb[i]) return -1; if (ra[i] > rb[i]) return 1; }
    return 0;
  });
}

export function firstOpenSlot(queue) { return SLOT_NAMES.find(s => queue.active_window[s] === null) || null; }

// ============================================================
// Internal: promote + refill (called by complete/fail)
// ============================================================

export function promote(queue) {
  const q = clone(validateQueue(queue));
  for (let i = 0; i < SLOT_NAMES.length - 1; i++) {
    q.active_window[SLOT_NAMES[i]] = q.active_window[SLOT_NAMES[i + 1]];
  }
  q.active_window[SLOT_NAMES.at(-1)] = null;
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
      logEvent('info', 'refill', { kind: 'queue_enqueue', slot, work_id: next.work_id });
    }
  }
  return validateQueue(touchQueue(syncQueueHealth(q)));
}

/**
 * Insert urgent work into the queue.
 *
 * Two modes:
 * - Default: inserts into slot_2_next, shifts everything right.
 *   Displaced tail slot goes to refill pool.
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
  logEvent('warn', 'queue_preempt_attempt', { kind: 'queue_enqueue', reason, slot: replaceCurrent ? 'slot_1_current' : 'slot_2_next', unsafeCurrent });
  try {
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
      logEvent('warn', 'queue_preempt_done', { kind: 'queue_enqueue', reason, slot: 'slot_1_current', unsafeCurrent: true });
      return validateQueue(touchQueue(syncQueueHealth(q)));
    }

    const old = {};
    for (const slot of SLOT_NAMES) old[slot] = q.active_window[slot];
    const insertIndex = 1;
    const tailSlot = SLOT_NAMES.at(-1);
    const displacedTail = old[tailSlot];
    q.active_window[SLOT_NAMES[insertIndex]] = urgent;
    for (let i = insertIndex + 1; i < SLOT_NAMES.length; i++) {
      q.active_window[SLOT_NAMES[i]] = old[SLOT_NAMES[i - 1]];
    }
    if (displacedTail) {
      q.refill_pool = sortPool([{ ...displacedTail, status: 'queued', preempted_from_slot: tailSlot, restore_priority: 'next_tail_opening', updated_at: now() }, ...q.refill_pool]);
    }
    traceEntry('queue_preempted', { source: 'agq-preempt', reason, slot: 'slot_2_next', unsafeCurrent: false });
    traceEntry('check', { source: 'agq-preempt', step: 'preempt', passed: true, reason, slot: 'slot_2_next' });
    logEvent('warn', 'queue_preempt_done', { kind: 'queue_enqueue', reason, slot: 'slot_2_next' });
    return validateQueue(touchQueue(syncQueueHealth(q)));
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'queue_preempt_exception', { kind: 'queue_enqueue', work_id: item?.work_id, reason: safeMsg });
    throw err;
  }
}
