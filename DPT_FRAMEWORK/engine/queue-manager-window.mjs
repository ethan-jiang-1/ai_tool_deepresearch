// @impl AGQ-003, AGQ-005, AGQ-019, FRE-005
// Queue Manager active-window mechanics: demand ordering, refill, and urgent preemption.

import {
  QUEUE_ACTIVE_WINDOW_LIMIT,
  clone,
  logEvent,
  now,
  syncQueueHealth,
  touchQueue,
  traceEntry,
  validateQueue,
  withTimestamps,
} from './queue-manager-core.mjs';

export function rank(item) {
  const order = { P0_preempted_restore: 0, P1_state_or_gate_repair: 1, P2_close_open_loop: 2, P3_current_gate_gap: 3, P4_progressive_artifact_or_seed_backfill: 4, P5_new_reference_intake: 5, P6_topology_triage: 6 };
  const restore = item.restore_priority === 'next_tail_opening' ? -1 : 0;
  return [restore, order[item.priority_class] ?? 99, item.created_at || ''];
}

export function sortPool(pool) {
  return [...pool].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] < rb[i]) return -1;
      if (ra[i] > rb[i]) return 1;
    }
    return 0;
  });
}

export function firstOpenPosition(queue) {
  return queue.active_window.length < QUEUE_ACTIVE_WINDOW_LIMIT ? queue.active_window.length : null;
}

export function promote(queue) {
  const q = clone(validateQueue(queue));
  q.active_window.shift();
  traceEntry('queue_promoted', { source: 'agq-promote' });
  return validateQueue(touchQueue(syncQueueHealth(q)));
}

export function refill(queue) {
  const q = clone(validateQueue(queue));
  q.refill_pool = sortPool(q.refill_pool);
  while (q.active_window.length < QUEUE_ACTIVE_WINDOW_LIMIT && q.refill_pool.length > 0) {
    const [next, ...rest] = q.refill_pool;
    q.active_window.push({ ...next, updated_at: now() });
    q.refill_pool = rest;
    traceEntry('queue_refilled', { source: 'agq-refill', queue_item_id: next.queue_item_id });
    logEvent('info', 'refill', { kind: 'queue_enqueue', queue_item_id: next.queue_item_id });
  }
  return validateQueue(touchQueue(syncQueueHealth(q)));
}

function restoreDisplaced(item, metadata = {}) {
  return {
    ...item,
    status: 'queued',
    restore_priority: 'next_tail_opening',
    updated_at: now(),
    lineage: {
      ...(item.lineage || {}),
      preempted_from: metadata.preempted_from,
      preempt_reason: metadata.reason,
    },
  };
}

export function preempt(queue, item, { reason = 'urgent_preemption', unsafeCurrent = false, replaceCurrent = false } = {}) {
  logEvent('warn', 'queue_preempt_attempt', { kind: 'queue_enqueue', reason, unsafeCurrent });
  try {
    const q = clone(validateQueue(queue));
    const urgent = withTimestamps({ ...item, producer_rule: item.producer_rule || 'urgent_preemption', priority_class: item.priority_class || 'P1_state_or_gate_repair' });

    if (replaceCurrent && !unsafeCurrent) {
      throw new Error('replaceCurrent requires unsafeCurrent=true');
    }

    if (replaceCurrent && q.active_window[0]) {
      const [current, ...rest] = q.active_window;
      q.active_window = rest;
      q.refill_pool = sortPool([restoreDisplaced(current, { preempted_from: 'active_window_front', reason }), ...q.refill_pool]);
    }

    const front = q.active_window[0];
    const insertAt = front?.status === 'running' && !unsafeCurrent ? 1 : 0;
    q.active_window.splice(insertAt, 0, urgent);

    if (q.active_window.length > QUEUE_ACTIVE_WINDOW_LIMIT) {
      const displaced = q.active_window.pop();
      q.refill_pool = sortPool([restoreDisplaced(displaced, { preempted_from: 'active_window_tail', reason }), ...q.refill_pool]);
    }
    traceEntry('queue_preempted', { source: 'agq-preempt', reason, unsafeCurrent, queue_item_id: urgent.queue_item_id, insert_at: insertAt });
    traceEntry('check', { source: 'agq-preempt', step: 'preempt', passed: true, reason });
    logEvent('warn', 'queue_preempt_done', { kind: 'queue_enqueue', reason, queue_item_id: urgent.queue_item_id, insert_at: insertAt });
    return validateQueue(touchQueue(syncQueueHealth(q)));
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'queue_preempt_exception', { kind: 'queue_enqueue', queue_item_id: item?.queue_item_id, reason: safeMsg });
    throw err;
  }
}
