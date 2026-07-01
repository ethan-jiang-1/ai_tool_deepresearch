// queue-manager.test.mjs — @impl AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006
// @impl FRE-001: Canonical test location tests/engine/queue-manager.test.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QueueItemSchema, QUEUE, QUEUE_ACTIVE_WINDOW_SLOTS, SLOT_NAMES,
  createQueue, enqueue, claim, complete, fail,
  preempt, checkReceipts, render, loadQueue, saveQueue, makeItem,
  pendingCount,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { QueueSchema, TargetSpecSchema } from '../../DPT_FRAMEWORK/schema/contracts/queue.mjs';
import {
  stageSubagentSlots, commitSlotResult, writeSlotStatus, ingestAgentReceipt,
  createSlot, SlotResult, MAX_CONCURRENT_SUBAGENTS,
} from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import { checkContentDedup } from '../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

function tempBundle() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'agq-'));
  mkdirSync(path.join(dir, '_cache'), { recursive: true });
  return dir;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function item(n, overrides = {}) {
  return makeItem({
    work_id: `work-${n}`,
    title: `Work ${n}`,
    action: `Do work ${n}`,
    ...overrides,
  });
}

describe('Queue schema (AGQ-001)', () => {
  it('accepts a valid queue item with fixed fields and payload object', () => {
    const parsed = QueueItemSchema.safeParse(item(1, { payload: { kind: 'source-intake' } }));
    assert.equal(parsed.success, true);
  });

  it('rejects missing required core fields', () => {
    const candidate = item(1);
    delete candidate.producer_rule;
    delete candidate.required_receipts;
    delete candidate.completion_receipt;
    const parsed = QueueItemSchema.safeParse(candidate);
    assert.equal(parsed.success, false);
  });

  it('rejects non-object payload', () => {
    const parsed = QueueItemSchema.safeParse({ ...item(1), payload: 'bad' });
    assert.equal(parsed.success, false);
  });
});

describe('Queue active-window constants (AGQ-019)', () => {
  it('defines the five-slot Queue wire shape independently of Relay concurrency', () => {
    assert.equal(QUEUE_ACTIVE_WINDOW_SLOTS, 5);
    assert.deepEqual(SLOT_NAMES, [
      'slot_1_current',
      'slot_2_next',
      'slot_3_pending',
      'slot_4_pending',
      'slot_5_tail',
    ]);
  });

  it('Queue active-window slot count is NOT derived from Relay sub-agent concurrency cap', () => {
    // The core architectural invariant: Queue is not the Relay work pool.
    // Without this assertion, a future developer could set both constants equal
    // and no test would fail — the decoupling would be silently lost.
    assert.notEqual(QUEUE_ACTIVE_WINDOW_SLOTS, MAX_CONCURRENT_SUBAGENTS,
      'Queue slot count must be independent of Relay concurrency cap');
    assert.equal(QUEUE_ACTIVE_WINDOW_SLOTS, 5);
    assert.equal(MAX_CONCURRENT_SUBAGENTS, 8);
  });
});

describe('TargetSpec schema (AGQ-012)', () => {
  it('accepts valid targets with delegates', () => {
    const result = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 },
    });
    assert.equal(result.success, true);
    assert.equal(result.data.delegates.timeout_ms, 600000);
  });

  it('accepts valid targets without delegates', () => {
    const result = TargetSpecSchema.safeParse({ controller: 'main-agent' });
    assert.equal(result.success, true);
    assert.equal(result.data.controller, 'main-agent');
    assert.equal(result.data.delegates, undefined);
  });

  it('accepts targets with delegates and uses default timeout_ms', () => {
    const result = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' },
    });
    assert.equal(result.success, true);
    assert.equal(result.data.delegates.timeout_ms, 600000);
  });

  it('rejects invalid controller', () => {
    const result = TargetSpecSchema.safeParse({ controller: 'sub-agent' });
    assert.equal(result.success, false);
  });

  it('rejects invalid delegates.to', () => {
    const result = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'chatgpt', role_key: 'test' },
    });
    assert.equal(result.success, false);
  });

  it('rejects missing controller', () => {
    const result = TargetSpecSchema.safeParse({
      delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' },
    });
    assert.equal(result.success, false);
  });

  it('rejects delegates without required role_key', () => {
    const result = TargetSpecSchema.safeParse({
      controller: 'main-agent',
      delegates: { to: 'sub-agent' },
    });
    assert.equal(result.success, false);
  });
});

describe('Queue item with targets (AGQ-011)', () => {
  it('accepts item with targets.delegates', () => {
    const parsed = QueueItemSchema.safeParse(item(1, {
      targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 } },
    }));
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.targets.controller, 'main-agent');
    assert.equal(parsed.data.targets.delegates.role_key, 'dpt-evidence-extractor');
  });

  it('accepts item with targets.controller only', () => {
    const parsed = QueueItemSchema.safeParse(item(1, {
      targets: { controller: 'main-agent' },
    }));
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.targets.controller, 'main-agent');
    assert.equal('delegates' in parsed.data.targets, false);
  });

  it('makeItem uses targets default', () => {
    const i = makeItem({ work_id: 'test-defaults' });
    assert.deepEqual(i.targets, { controller: 'main-agent' });
  });

  it('rejects item with missing target (old field name)', () => {
    // The old `target` field is no longer in the schema — should fail
    const candidate = { ...item(1) };
    delete candidate.targets;
    candidate.target = 'main-agent';
    const parsed = QueueItemSchema.safeParse(candidate);
    assert.equal(parsed.success, false);
  });
});

describe('Claim advice with targets.delegates (AGQ-014)', () => {
  it('claim returns delegates_required=true when delegates present', () => {
    let queue = createQueue('delegates-claim-test');
    queue = enqueue(queue, item(1, {
      targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
    }));
    const { item: claimed, advice } = claim(queue, { actor: 'main-agent' });
    assert.ok(claimed);
    assert.equal(advice.delegates_required, true);
    assert.equal(advice.delegates_config.role_key, 'dpt-source-intake');
    assert.equal(advice.delegates_config.timeout_ms, 600000);
  });

  it('claim returns delegates_required=false when no delegates', () => {
    let queue = createQueue('no-delegates-claim-test');
    queue = enqueue(queue, item(1, {
      targets: { controller: 'main-agent' },
    }));
    const { item: claimed, advice } = claim(queue, { actor: 'main-agent' });
    assert.ok(claimed);
    assert.equal(advice.delegates_required, false);
  });
});

describe('Enqueue and claim (AGQ-002)', () => {
  it('fills five active slots before using refill_pool', () => {
    let queue = createQueue('enqueue-test');
    for (let i = 1; i <= 6; i++) queue = enqueue(queue, item(i));
    assert.deepEqual(SLOT_NAMES.map((slot) => queue.active_window[slot]?.work_id), [
      'work-1',
      'work-2',
      'work-3',
      'work-4',
      'work-5',
    ]);
    assert.equal(queue.refill_pool.length, 1);
    assert.equal(queue.refill_pool[0].work_id, 'work-6');
  });

  it('claim returns only slot_1_current and marks it running', () => {
    let queue = createQueue('claim-test');
    queue = enqueue(queue, item(1));
    queue = enqueue(queue, item(2));
    const result = claim(queue, { actor: 'main-agent' });
    assert.equal(result.item.work_id, 'work-1');
    assert.equal(result.queue.active_window.slot_1_current.status, 'running');
    assert.equal(result.queue.active_window.slot_2_next.status, 'queued');
    assert.equal(Object.hasOwn(result.item, 'slot_2_next'), false);
  });
});

describe('Queue pending count (AGQ-020)', () => {
  it('returns zero for an empty queue', () => {
    assert.equal(pendingCount(createQueue('empty-count-test')), 0);
  });

  it('counts non-null active-window slots and refill_pool items', () => {
    let queue = createQueue('pending-count-test');
    for (let i = 1; i <= SLOT_NAMES.length + 2; i++) queue = enqueue(queue, item(i));
    assert.equal(pendingCount(queue), SLOT_NAMES.length + 2);
    assert.equal(SLOT_NAMES.filter((slot) => queue.active_window[slot] !== null).length, SLOT_NAMES.length);
    assert.equal(queue.refill_pool.length, 2);
  });

  it('counts mixed active-window and refill_pool depth after manual null slots', () => {
    let queue = createQueue('mixed-count-test');
    queue = enqueue(queue, item(1));
    queue = enqueue(queue, item(2));
    queue.refill_pool.push(item(3), item(4), item(5));
    queue.active_window.slot_2_next = null;
    assert.equal(pendingCount(queue), 4);
  });

  it('pendingCount does NOT include staged relay sub-agent slots', () => {
    // Spec: "The count SHALL NOT include Relay sub-agent slots."
    // Relay slots live under _subagents/ on disk; they are not Queue tasks.
    const dir = tempBundle();
    try {
      let queue = createQueue('subagent-exclusion');
      queue = enqueue(queue, item(1));
      assert.equal(pendingCount(queue), 1);

      const slots = stageSubagentSlots(baseState(), dir);
      assert.ok(slots.length > 0, 'expected at least one relay slot from pass-branch dispatch');

      assert.equal(pendingCount(queue), 1,
        'pendingCount must not include relay sub-agent slots staged on disk');
    } finally {
      cleanup(dir);
    }
  });
});

describe('Complete, promote, refill, and fail (AGQ-002, AGQ-004)', () => {
  it('complete checks receipt, promotes slot 2, and refills tail from pool', () => {
    const dir = tempBundle();
    try {
      writeFileSync(path.join(dir, 'done.json'), '{"ok":true}\n');
      let queue = createQueue('complete-test');
      for (let i = 1; i <= 6; i++) {
        queue = enqueue(queue, item(i, i === 1 ? { completion_receipt: 'json:done.json' } : {}));
      }
      const result = complete(queue, { work_id: 'work-1', receipt: 'json:done.json' }, dir);
      assert.equal(result.feedback.passed, true);
      assert.equal(result.queue.active_window.slot_1_current.work_id, 'work-2');
      assert.equal(result.queue.active_window.slot_5_tail.work_id, 'work-6');
      assert.equal(result.queue.refill_pool.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  it('missing completion receipt blocks promotion', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('missing-receipt-test');
      queue = enqueue(queue, item(1, { completion_receipt: 'file:missing.txt' }));
      queue = enqueue(queue, item(2));
      const result = complete(queue, { work_id: 'work-1' }, dir);
      assert.equal(result.feedback.passed, false);
      assert.equal(result.queue.active_window.slot_1_current.work_id, 'work-1');
      assert.match(result.feedback.inspect.join('\n'), /Missing file receipt/);
    } finally {
      cleanup(dir);
    }
  });

  it('fail creates repair work instead of chat progress', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('fail-test');
      queue = enqueue(queue, item(1));
      queue = enqueue(queue, item(2));
      queue = fail(queue, { work_id: 'work-1', reason: 'receipt missing' }, dir);
      assert.equal(queue.active_window.slot_1_current.work_id, 'work-2');
      assert.match(queue.active_window.slot_2_next.work_id, /^repair-work-1-/);
      assert.equal(queue.active_window.slot_2_next.priority_class, 'P1_state_or_gate_repair');
    } finally {
      cleanup(dir);
    }
  });
});

describe('Preemption (AGQ-003)', () => {
  it('inserts urgent work into slot_2_next without interrupting current', () => {
    let queue = createQueue('preempt-test');
    for (let i = 1; i <= 3; i++) queue = enqueue(queue, item(i));
    queue = preempt(queue, item('urgent', { priority_class: 'P1_state_or_gate_repair' }), { reason: 'urgent' });
    assert.equal(queue.active_window.slot_1_current.work_id, 'work-1');
    assert.equal(queue.active_window.slot_2_next.work_id, 'work-urgent');
    assert.equal(queue.active_window.slot_3_pending.work_id, 'work-2');
  });

  it('preserves displaced slot_5_tail with restore metadata', () => {
    let queue = createQueue('full-preempt-test');
    for (let i = 1; i <= 5; i++) queue = enqueue(queue, item(i));
    queue = preempt(queue, item('urgent', { priority_class: 'P1_state_or_gate_repair' }), { reason: 'urgent' });
    assert.equal(queue.active_window.slot_5_tail.work_id, 'work-4');
    assert.equal(queue.refill_pool[0].work_id, 'work-5');
    assert.equal(queue.refill_pool[0].preempted_from_slot, 'slot_5_tail');
    assert.equal(queue.refill_pool[0].restore_priority, 'next_tail_opening');
  });

  it('requires unsafeCurrent=true to replace current work', () => {
    let queue = createQueue('unsafe-test');
    queue = enqueue(queue, item(1));
    assert.throws(
      () => preempt(queue, item('urgent'), { reason: 'bad-state', replaceCurrent: true }),
      /unsafeCurrent=true/,
    );
    queue = preempt(queue, item('urgent'), { reason: 'bad-state', replaceCurrent: true, unsafeCurrent: true });
    assert.equal(queue.active_window.slot_1_current.work_id, 'work-urgent');
    assert.equal(queue.refill_pool[0].work_id, 'work-1');
  });
});

describe('Receipts, projection, and CLI (AGQ-004, AGQ-005, AGQ-006)', () => {
  it('unknown receipt prefix fails closed', () => {
    let queue = createQueue('receipt-test');
    queue = enqueue(queue, item(1, { required_receipts: ['chat:trust_me'] }));
    const feedback = checkReceipts(queue, queue.active_window.slot_1_current);
    assert.equal(feedback.passed, false);
    assert.match(feedback.inspect.join('\n'), /Unsupported receipt prefix/);
  });

  it('projection is generated from JSON and manual drift cannot mutate state', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('projection-test');
      queue = enqueue(queue, item(1));
      const before = JSON.stringify(queue);
      const projection = render(queue, dir);
      writeFileSync(projection, '# edited projection\nslot_1_current: fake\n');
      const after = JSON.stringify(queue);
      assert.equal(after, before);
      assert.equal(queue.active_window.slot_1_current.work_id, 'work-1');
    } finally {
      cleanup(dir);
    }
  });

  it('CLI enqueues, claims, completes, preempts, renders, and checks real files', () => {
    const dir = tempBundle();
    try {
      const cli = path.resolve('DPT_FRAMEWORK/cli/operate-queue.mjs');
      const task1 = path.join(dir, 'task1.json');
      const task2 = path.join(dir, 'task2.json');
      const urgent = path.join(dir, 'urgent.json');
      const result = path.join(dir, 'result.json');
      writeFileSync(path.join(dir, 'done.txt'), 'done\n');
      writeFileSync(task1, `${JSON.stringify(item(1, { completion_receipt: 'file:done.txt' }))}\n`);
      writeFileSync(task2, `${JSON.stringify(item(2))}\n`);
      writeFileSync(urgent, `${JSON.stringify(item('urgent', { priority_class: 'P1_state_or_gate_repair' }))}\n`);
      writeFileSync(result, `${JSON.stringify({ work_id: 'work-1', receipt: 'file:done.txt', summary: 'done' })}\n`);

      execFileSync(process.execPath, [cli, 'enqueue', dir, '--task', task1], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'enqueue', dir, '--task', task2], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'claim', dir, '--actor', 'main-agent'], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'complete', dir, '--result', result], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'preempt', dir, '--task', urgent, '--reason', 'urgent'], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'render', dir], { stdio: 'pipe' });
      execFileSync(process.execPath, [cli, 'check', dir], { stdio: 'pipe' });

      const saved = JSON.parse(readFileSync(path.join(dir, QUEUE.FILE), 'utf-8'));
      assert.equal(QUEUE.FILE, 'rb_queue.json');
      assert.equal(QueueSchema.safeParse(saved).success, true);
      assert.equal(saved.slot_1_current.work_id, 'work-2');
      assert.equal(saved.slot_2_next.work_id, 'work-urgent');
      assert.match(readFileSync(path.join(dir, QUEUE.PROJECTION), 'utf-8'), /work-urgent/);
      assert.match(readFileSync(path.join(dir, QUEUE.PROJECTION), 'utf-8'), /Generated from `rb_queue\.json`/);
    } finally {
      cleanup(dir);
    }
  });

  it('saveQueue persists the canonical rb_queue.json shape and loadQueue restores engine shape', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('canonical-file-test');
      queue = enqueue(queue, item(1));

      const savedQueue = saveQueue(dir, queue);
      const persisted = JSON.parse(readFileSync(path.join(dir, 'rb_queue.json'), 'utf-8'));
      assert.equal(savedQueue.active_window.slot_1_current.work_id, 'work-1');
      assert.equal(QueueSchema.safeParse(persisted).success, true);
      assert.equal(persisted.slot_1_current.work_id, 'work-1');
      assert.equal(Object.hasOwn(persisted, 'active_window'), false);

      const loaded = loadQueue(dir);
      assert.equal(loaded.active_window.slot_1_current.work_id, 'work-1');
      assert.equal(loaded.projection_path, QUEUE.PROJECTION);
    } finally {
      cleanup(dir);
    }
  });
});

// ── Stage 2: Delegated Queue Completion ──

function baseState(overrides = {}) {
  return {
    current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5,
    topicReadiness: 'ready', ...overrides,
  };
}

function writeRuntimeReceipt(baseDir, slot, overrides = {}) {
  const receiptFile = path.join(baseDir, slot.receiptPath);
  mkdirSync(path.dirname(receiptFile), { recursive: true });
  const common = {
    slotKey: slot.key,
    roleAgentKey: slot.roleAgentKey,
    receiptNonce: slot.receiptNonce,
    platform: overrides.platform || 'codex',
    runtimeMode: overrides.runtimeMode || 'project-agent',
  };
  writeFileSync(receiptFile, [
    JSON.stringify({ event: 'agent_runtime_started', ...common }),
    JSON.stringify({ event: 'agent_result_ready', ...common }),
  ].join('\n') + '\n');
}

function setupDelegatedFixture(bundleDir) {
  // Create a slot with committed result, receipt, and cache
  const [slot] = stageSubagentSlots(baseState(), bundleDir);
  writeRuntimeReceipt(bundleDir, slot);
  // Import receipt (needed for commitSlotResult to work with running status)
  writeSlotStatus(slot, 'running', bundleDir);
  // Create output file
  const refDir = path.join(bundleDir, 'reference');
  mkdirSync(refDir, { recursive: true });
  writeFileSync(path.join(refDir, 'source.md'), '# Source\n\nKey Facts: real facts.\n');
  // Create cache leaf with 3 files
  const cacheLeaf = path.join(bundleDir, '_cache', 'wave0', 'primary', '01_test', 's01_source');
  mkdirSync(cacheLeaf, { recursive: true });
  writeFileSync(path.join(cacheLeaf, 'websearch.json'), '[]');
  writeFileSync(path.join(cacheLeaf, 'page.md'), '# Page');
  writeFileSync(path.join(cacheLeaf, 'meta.json'), '{"url":"https://example.com"}');
  // Commit slot result with declaration
  const relay = commitSlotResult(slot, bundleDir, {
    slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
    summary: 'Done', evidenceCount: 1,
    references: [{ title: 'T', url: 'https://example.com/a', quote: 'q', relevance: 'r' }],
    confidence: 0.9, notes: [],
    output_files: [
      { path: 'reference/source.md', role: 'reference', source_url: 'https://example.com/a' },
    ],
    cache_trails: ['_cache/wave0/primary/01_test/s01_source/'],
  }, {
    platform: 'fixture',
    runtimeAgentId: 'fixture-agent-1',
  });
  return { slot, relay };
}

describe('Delegated queue completion (Stage 2)', () => {
  it('non-delegated complete() works without relay provenance', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('nondel');
      const workItem = makeItem({
        work_id: 'work-direct',
        title: 'Direct work',
        targets: { controller: 'main-agent' },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2, item } = claim(queue, { actor: 'main-agent' });
      assert.ok(item);
      const result = complete(q2, { work_id: 'work-direct', receipt: 'none', summary: 'ok' }, dir);
      assert.equal(result.feedback.passed, true);
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() rejects missing slot_result_ref', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('del1');
      const workItem = makeItem({
        work_id: 'work-del',
        title: 'Delegated work',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const result = complete(q2, { work_id: 'work-del', receipt: 'none' }, dir);
      assert.equal(result.feedback.passed, false);
      assert.ok(result.feedback.advice.includes('slot_result_ref'));
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() rejects uncommitted slot result', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('del2');
      const workItem = makeItem({
        work_id: 'work-del2',
        title: 'Delegated work 2',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      // slot_result_ref points to a non-existent file
      const result = complete(q2, {
        work_id: 'work-del2',
        receipt: 'none',
        slot_result_ref: '_subagents/wave_01/slot_00/result.json',
      }, dir);
      assert.equal(result.feedback.passed, false);
      assert.ok(result.feedback.advice.includes('not found'));
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() succeeds with full provenance and appends ledger', () => {
    const dir = tempBundle();
    try {
      const { slot, relay } = setupDelegatedFixture(dir);
      assert.equal(relay.ok, true);

      let queue = createQueue('del-ok');
      const workItem = makeItem({
        work_id: 'work-del-ok',
        title: 'Delegated intake',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });

      const result = complete(q2, {
        work_id: 'work-del-ok',
        receipt: 'none',
        summary: 'Completed via relay',
        slot_result_ref: slot.resultPath,
      }, dir);

      assert.equal(result.feedback.passed, true, `Expected pass but got: ${result.feedback.advice}`);

      // Ledger must exist and contain the declaration
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      assert.ok(existsSync(ledgerPath), 'ledger file should exist');
      const ledgerContent = readFileSync(ledgerPath, 'utf-8').trim();
      assert.ok(ledgerContent.length > 0, 'ledger should not be empty');
      const record = JSON.parse(ledgerContent);
      assert.equal(record.work_id, 'work-del-ok');
      assert.equal(record.output_files.length, 1);
      assert.equal(record.cache_trails.length, 1);
      assert.equal(record.slot_result_ref, slot.resultPath);
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() rejects missing declared output file', () => {
    const dir = tempBundle();
    try {
      const { slot } = setupDelegatedFixture(dir);
      // Remove the declared output file
      rmSync(path.join(dir, 'reference', 'source.md'));

      let queue = createQueue('del-missing');
      const workItem = makeItem({
        work_id: 'work-missing',
        title: 'Missing output',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const result = complete(q2, {
        work_id: 'work-missing', receipt: 'none',
        slot_result_ref: slot.resultPath,
      }, dir);
      assert.equal(result.feedback.passed, false);
      assert.ok(result.feedback.advice.includes('missing'));
      // Ledger must NOT be appended for failed completion
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      assert.equal(existsSync(ledgerPath), false);
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() warns but succeeds with incomplete cache leaf (Phase 1)', () => {
    const dir = tempBundle();
    try {
      const { slot } = setupDelegatedFixture(dir);
      // Remove meta.json from cache leaf — incomplete leaf, not unsafe
      rmSync(path.join(dir, '_cache', 'wave0', 'primary', '01_test', 's01_source', 'meta.json'));

      let queue = createQueue('del-cache');
      const workItem = makeItem({
        work_id: 'work-cache',
        title: 'Missing cache',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const result = complete(q2, {
        work_id: 'work-cache', receipt: 'none',
        slot_result_ref: slot.resultPath,
      }, dir);
      // Phase 1: incomplete leaf is warning, not hard-fail — complete succeeds
      assert.equal(result.feedback.passed, true, 'Incomplete cache leaf should warn but not block complete');
      // Verify the incomplete trail was filtered from the ledger
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      if (existsSync(ledgerPath)) {
        const ledgerLines = readFileSync(ledgerPath, 'utf-8').trim().split('\n').filter(Boolean);
        for (const line of ledgerLines) {
          const rec = JSON.parse(line);
          if (rec.work_id === 'work-cache') {
            // The incomplete trail should NOT be in the ledger
            const hasIncompleteTrail = (rec.cache_trails || []).some(t => t.includes('s01_source'));
            assert.equal(hasIncompleteTrail, false, 'Incomplete trail should be filtered from ledger');
          }
        }
      }
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() rejects missing runtime receipt', () => {
    const dir = tempBundle();
    try {
      const { slot } = setupDelegatedFixture(dir);
      // Remove runtime receipt
      rmSync(path.join(dir, slot.receiptPath));

      let queue = createQueue('del-norec');
      const workItem = makeItem({
        work_id: 'work-norec',
        title: 'No receipt',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const result = complete(q2, {
        work_id: 'work-norec', receipt: 'none',
        slot_result_ref: slot.resultPath,
      }, dir);
      assert.equal(result.feedback.passed, false);
      assert.ok(result.feedback.advice.includes('runtime receipt'));
    } finally {
      cleanup(dir);
    }
  });

  it('full pipeline: enqueue delegated → claim → relay → complete → ledger (AGQ-019, AGQ-020)', () => {
    // This is the only test that proves Queue and Relay compose correctly
    // in the real execution path. Every other test exercises one system in isolation.
    const dir = tempBundle();
    try {
      // 1. Build queue with a delegated task
      let queue = createQueue('pipeline');
      const workItem = makeItem({
        work_id: 'work-pipe',
        title: 'Pipeline task',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);

      // 2. Claim — verify delegates advice
      const { queue: q2, item, advice } = claim(queue, { actor: 'main-agent' });
      assert.ok(item);
      assert.equal(advice.delegates_required, true);
      assert.equal(advice.delegates_config.role_key, 'dpt-source-intake');

      // 3. Stage relay slots (what the Phase Agent does after seeing delegates_required)
      const state = baseState();
      const slots = stageSubagentSlots(state, dir);
      assert.ok(slots.length > 0, 'expected at least one relay slot');

      // 4. Execute relay pipeline for first slot
      writeRuntimeReceipt(dir, slots[0]);
      ingestAgentReceipt(slots[0], dir, { runtimeAgentId: 'pipeline-agent' });
      writeSlotStatus(slots[0], 'running', dir);

      // Need output file + cache for commitSlotResult
      const refDir = path.join(dir, 'reference');
      mkdirSync(refDir, { recursive: true });
      writeFileSync(path.join(refDir, 'source.md'), '# Pipeline output\n');
      const cacheLeaf = path.join(dir, '_cache', 'wave0', 'pipeline', 's01');
      mkdirSync(cacheLeaf, { recursive: true });
      writeFileSync(path.join(cacheLeaf, 'websearch.json'), '[]');
      writeFileSync(path.join(cacheLeaf, 'page.md'), '# Page');
      writeFileSync(path.join(cacheLeaf, 'meta.json'), '{"url":"https://example.com/p"}');

      const relay = commitSlotResult(slots[0], dir, {
        slotKey: slots[0].key, roleAgentKey: slots[0].roleAgentKey, status: 'done',
        summary: 'Pipeline done', evidenceCount: 1,
        references: [{ title: 'T', url: 'https://example.com/p', quote: 'q', relevance: 'r' }],
        confidence: 0.9, notes: [],
        output_files: [{ path: 'reference/source.md', role: 'reference', source_url: 'https://example.com/p' }],
        cache_trails: ['_cache/wave0/pipeline/s01/'],
      }, { platform: 'pipeline-test', runtimeAgentId: 'pipeline-agent' });
      assert.equal(relay.ok, true);

      // 5. Complete queue task with slot_result_ref
      const result = complete(q2, {
        work_id: 'work-pipe',
        receipt: 'none',
        summary: 'Pipeline complete',
        slot_result_ref: slots[0].resultPath,
      }, dir);
      assert.equal(result.feedback.passed, true,
        `Pipeline complete should pass, got: ${result.feedback.advice}`);

      // 6. Ledger must exist
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      assert.ok(existsSync(ledgerPath), 'ledger should be appended');

      // 7. Promote should have happened (current slot cleared after completion)
      assert.equal(result.queue.active_window.slot_1_current, null,
        'promote should clear slot_1 after completing the only queued item');
    } finally {
      cleanup(dir);
    }
  });

  it('batch: 2-slot parallel relay → single complete → ledger (AGQ-019)', () => {
    // Proves N>1 slots work: one delegated Queue task fans out to 2 Relay slots,
    // both commit independently, complete() succeeds with either slot_result_ref.
    const dir = tempBundle();
    try {
      let queue = createQueue('batch-2slot');
      const workItem = makeItem({
        work_id: 'work-batch',
        title: 'Batch task',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2, advice } = claim(queue, { actor: 'main-agent' });
      assert.equal(advice.delegates_required, true);

      // Stage 2 slots (pass-branch dispatch gives 4, take first 2)
      const allSlots = stageSubagentSlots(baseState(), dir);
      assert.ok(allSlots.length >= 2, 'need at least 2 relay slots');
      const slots = allSlots.slice(0, 2);

      // Commit both slots in parallel (sequentially in test, logically parallel)
      for (let i = 0; i < 2; i++) {
        const slot = slots[i];
        writeRuntimeReceipt(dir, slot);
        ingestAgentReceipt(slot, dir, { runtimeAgentId: `batch-agent-${i}` });
        writeSlotStatus(slot, 'running', dir);

        const outDir = path.join(dir, 'reference', `batch-${i}`);
        mkdirSync(outDir, { recursive: true });
        writeFileSync(path.join(outDir, 'source.md'), `# Batch ${i} output\n`);

        const cacheLeaf = path.join(dir, '_cache', 'wave0', `batch-${i}`, 's01');
        mkdirSync(cacheLeaf, { recursive: true });
        writeFileSync(path.join(cacheLeaf, 'websearch.json'), '[]');
        writeFileSync(path.join(cacheLeaf, 'page.md'), '# Page');
        writeFileSync(path.join(cacheLeaf, 'meta.json'), `{"url":"https://example.com/batch-${i}"}`);

        const relay = commitSlotResult(slot, dir, {
          slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
          summary: `Batch slot ${i} done`, evidenceCount: 1,
          references: [{ title: `T${i}`, url: `https://example.com/batch-${i}`, quote: 'q', relevance: 'r' }],
          confidence: 0.9, notes: [],
          output_files: [{ path: `reference/batch-${i}/source.md`, role: 'reference', source_url: `https://example.com/batch-${i}` }],
          cache_trails: [`_cache/wave0/batch-${i}/s01/`],
        }, { platform: 'batch-test', runtimeAgentId: `batch-agent-${i}` });
        assert.equal(relay.ok, true, `slot ${i} commit should pass`);
      }

      // Both slots' result.json must exist on disk
      for (const slot of slots) {
        assert.ok(existsSync(path.join(dir, slot.resultPath)), `slot ${slot.key} result.json must exist`);
      }

      // Complete with first slot's result_ref
      const result = complete(q2, {
        work_id: 'work-batch',
        receipt: 'none',
        summary: 'Batch complete',
        slot_result_ref: slots[0].resultPath,
      }, dir);
      assert.equal(result.feedback.passed, true,
        `Batch complete should pass, got: ${result.feedback.advice}`);

      // Ledger exists and references the slot
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      assert.ok(existsSync(ledgerPath), 'ledger should be appended');
      const ledger = JSON.parse(readFileSync(ledgerPath, 'utf-8'));
      assert.equal(ledger.work_id, 'work-batch');
      assert.equal(ledger.slot_result_ref, slots[0].resultPath);
      assert.equal(ledger.output_files.length, 1);

      // Promote should have cleared the current slot
      assert.equal(result.queue.active_window.slot_1_current, null);
    } finally {
      cleanup(dir);
    }
  });

  it('pipeline → gate: ledger produced by complete() is consumable by checkContentDedup', () => {
    // Proves the output declaration ledger written by the Queue↔Relay pipeline
    // is parseable and valid for the gate's content_dedup check.
    const dir = tempBundle();
    try {
      let queue = createQueue('pipe-gate');
      const workItem = makeItem({
        work_id: 'work-pg',
        title: 'Pipeline→Gate',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const slots = stageSubagentSlots(baseState(), dir);
      const slot = slots[0];

      writeRuntimeReceipt(dir, slot);
      ingestAgentReceipt(slot, dir, { runtimeAgentId: 'pg-agent' });
      writeSlotStatus(slot, 'running', dir);

      mkdirSync(path.join(dir, 'reference'), { recursive: true });
      writeFileSync(path.join(dir, 'reference', 'pg-source.md'), '# Pipeline→Gate ref\n\nSource URL: https://real-source.example.com/pg\n');

      const cacheLeaf = path.join(dir, '_cache', 'wave0', 'pg', 's01');
      mkdirSync(cacheLeaf, { recursive: true });
      writeFileSync(path.join(cacheLeaf, 'websearch.json'), '[]');
      writeFileSync(path.join(cacheLeaf, 'page.md'), '# Page');
      writeFileSync(path.join(cacheLeaf, 'meta.json'), '{"url":"https://real-source.example.com/pg"}');

      const relay = commitSlotResult(slot, dir, {
        slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
        summary: 'PG done', evidenceCount: 1,
        references: [{ title: 'PG', url: 'https://real-source.example.com/pg', quote: 'q', relevance: 'r' }],
        confidence: 0.9, notes: [],
        output_files: [{ path: 'reference/pg-source.md', role: 'reference', source_url: 'https://real-source.example.com/pg' }],
        cache_trails: ['_cache/wave0/pg/s01/'],
      }, { platform: 'pg-test', runtimeAgentId: 'pg-agent' });
      assert.equal(relay.ok, true);

      const result = complete(q2, {
        work_id: 'work-pg',
        receipt: 'none',
        summary: 'PG complete',
        slot_result_ref: slot.resultPath,
      }, dir);
      assert.equal(result.feedback.passed, true);

      // Gate's content_dedup must consume the pipeline-produced ledger
      const dedupResult = checkContentDedup(dir, {
        jaccard: 0.8, url_dedup: true, homepage_detect: false, self_ref_detect: false,
      });
      assert.equal(dedupResult.passed, true,
        `content_dedup should pass on pipeline ledger, got: ${dedupResult.inspect.join('; ')}`);
    } finally {
      cleanup(dir);
    }
  });

  it('ledger record includes non-empty creation_reason derived from queue item and slot result', () => {
    // @impl 8A.15 — creation_reason must be present and non-empty in delegated ledger records
    const dir = tempBundle();
    try {
      let queue = createQueue('cr-reason');
      const workItem = makeItem({
        work_id: 'work-cr',
        title: 'CreationReason test',
        action: 'Deepen topic: Test Topic using WebSearch and WebFetch',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const slots = stageSubagentSlots(baseState(), dir);
      const slot = slots[0];

      writeRuntimeReceipt(dir, slot);
      ingestAgentReceipt(slot, dir, { runtimeAgentId: 'cr-agent' });
      writeSlotStatus(slot, 'running', dir);

      mkdirSync(path.join(dir, 'reference'), { recursive: true });
      writeFileSync(path.join(dir, 'reference', 'cr-source.md'), '# CR Ref\n\nSource URL: https://example.com/cr\n');

      const cacheLeaf = path.join(dir, '_cache', 'wave0', 'cr', 's01');
      mkdirSync(cacheLeaf, { recursive: true });
      writeFileSync(path.join(cacheLeaf, 'websearch.json'), '[]');
      writeFileSync(path.join(cacheLeaf, 'page.md'), '# Page');
      writeFileSync(path.join(cacheLeaf, 'meta.json'), '{"url":"https://example.com/cr"}');

      const relay = commitSlotResult(slot, dir, {
        slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
        summary: 'Found 3 deep evidence sources for topic',
        evidenceCount: 1,
        references: [{ title: 'CR', url: 'https://example.com/cr', quote: 'q', relevance: 'r' }],
        confidence: 0.9, notes: [],
        output_files: [{ path: 'reference/cr-source.md', role: 'reference', source_url: 'https://example.com/cr' }],
        cache_trails: ['_cache/wave0/cr/s01/'],
      }, { platform: 'cr-test', runtimeAgentId: 'cr-agent' });
      assert.equal(relay.ok, true);

      const result = complete(q2, {
        work_id: 'work-cr',
        receipt: 'none',
        summary: 'CR complete',
        slot_result_ref: slot.resultPath,
      }, dir);
      assert.equal(result.feedback.passed, true);

      // Read the ledger and validate creation_reason
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      assert.ok(existsSync(ledgerPath));
      const ledger = JSON.parse(readFileSync(ledgerPath, 'utf-8'));

      // MUST be present and non-empty
      assert.ok(ledger.creation_reason, 'creation_reason must be present');
      assert.ok(ledger.creation_reason.length > 0, 'creation_reason must be non-empty');

      // MUST start with "Delegated: " since this is a delegated task
      assert.ok(ledger.creation_reason.startsWith('Delegated: '),
        `creation_reason should start with "Delegated: ", got: "${ledger.creation_reason}"`);

      // MUST include the action text
      assert.ok(ledger.creation_reason.includes('Deepen topic'),
        `creation_reason should include action text, got: "${ledger.creation_reason}"`);

      // MUST include the slot result summary
      assert.ok(ledger.creation_reason.includes('Found 3 deep evidence'),
        `creation_reason should include summary, got: "${ledger.creation_reason}"`);
    } finally {
      cleanup(dir);
    }
  });
});
