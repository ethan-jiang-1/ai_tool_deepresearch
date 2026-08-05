// @impl FRE-005
// Queue Manager LOG-006 accident-grade diagnostic regression coverage.

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createQueue,
  enqueue,
  claim,
  complete,
  fail,
  preempt,
  loadQueue,
  saveQueue,
  makeItem,
} from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

describe('LOG-006 accident-grade diagnostics', () => {
  it('loadQueue writes load attempt/done events', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    const q = loadQueue(dir);
    const logFile = path.join(dir, '_logs', 'run.log');
    const content = readFileSync(logFile, 'utf-8');
    assert.ok(content.includes('queue_load_attempt'));
    assert.ok(content.includes('queue_load_done'));
    assert.ok(content.includes('"kind":"queue_enqueue"'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('saveQueue writes save attempt/done events', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    loadQueue(dir);
    const q = saveQueue(dir, createQueue('test'));
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('queue_save_attempt'));
    assert.ok(content.includes('queue_save_done'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('enqueue writes attempt/done events with fine-grained names', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    loadQueue(dir);
    let q = createQueue('test');
    q = enqueue(q, makeItem({ queue_item_id: 'task-1', title: 'Test' }));
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('queue_enqueue_attempt'));
    assert.ok(content.includes('queue_enqueue_done'));
    assert.ok(content.includes('"kind":"queue_enqueue"'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('claim writes attempt/empty events when empty', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    loadQueue(dir);
    const q = createQueue('test');
    claim(q);
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('queue_claim_attempt'));
    assert.ok(content.includes('queue_claim_empty'));
    assert.ok(content.includes('"kind":"queue_claim"'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('complete writes attempt/receipt_fail events on missing receipt', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    loadQueue(dir);
    let q = createQueue('test');
    q = enqueue(q, makeItem({
      queue_item_id: 'task-1', title: 'Test',
      required_receipts: ['file:nonexistent.md'],
      completion_receipt: 'file:nonexistent.md',
    }));
    claim(q);
    complete(q, { queue_item_id: 'task-1', receipt: 'file:nonexistent.md' }, dir);
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('queue_complete_attempt'));
    assert.ok(content.includes('queue_complete_receipt_fail'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('fail writes attempt/done events', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    loadQueue(dir);
    let q = createQueue('test');
    q = enqueue(q, makeItem({ queue_item_id: 'task-1', title: 'Test' }));
    claim(q);
    fail(q, { queue_item_id: 'task-1', reason: 'test failure' }, dir);
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('queue_fail_attempt'));
    assert.ok(content.includes('queue_fail_done'));
    assert.ok(content.includes('"kind":"queue_fail"'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('fine event maps to broad kind', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    loadQueue(dir);
    let q = createQueue('test');
    q = enqueue(q, makeItem({ queue_item_id: 'task-1', title: 'Test' }));
    q = claim(q).queue;
    complete(q, { queue_item_id: 'task-1' }, dir);
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('queue_enqueue_done') && content.includes('"kind":"queue_enqueue"'));
    assert.ok(content.includes('queue_claim_done') && content.includes('"kind":"queue_claim"'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('preempt writes attempt/done events', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    loadQueue(dir);
    let q = createQueue('test');
    q = enqueue(q, makeItem({ queue_item_id: 'task-1', title: 'Test' }));
    q = enqueue(q, makeItem({ queue_item_id: 'task-2', title: 'Test 2' }));
    q = preempt(q, makeItem({ queue_item_id: 'urgent-1', title: 'Urgent' }), { reason: 'test_preempt' });
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('queue_preempt_attempt'));
    assert.ok(content.includes('queue_preempt_done'));
    assert.ok(content.includes('"reason":"test_preempt"'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('complete logs reject on delegated validation failure', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    loadQueue(dir);
    let q = createQueue('test');
    q = enqueue(q, makeItem({
      queue_item_id: 'task-1', title: 'Delegated',
      targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-test', timeout_ms: 60000 } },
    }));
    claim(q);
    // delegated demand completed through operate-queue should trigger reject
    complete(q, { queue_item_id: 'task-1', receipt: 'none' }, dir);
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('queue_complete_attempt'));
    assert.ok(content.includes('queue_complete_reject'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('complete logs exception on queue_item_id mismatch', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    loadQueue(dir);
    let q = createQueue('test');
    q = enqueue(q, makeItem({ queue_item_id: 'task-1', title: 'Test' }));
    claim(q);
    assert.throws(() => {
      complete(q, { queue_item_id: 'wrong-id' }, dir);
    });
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('queue_complete_exception'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('fail logs exception on queue_item_id mismatch', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'test-qm-log-'));
    loadQueue(dir);
    let q = createQueue('test');
    q = enqueue(q, makeItem({ queue_item_id: 'task-1', title: 'Test' }));
    claim(q);
    assert.throws(() => {
      fail(q, { queue_item_id: 'wrong-id', reason: 'test' }, dir);
    });
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('queue_fail_exception'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('enqueue without logger init writes nothing (pure in-memory)', () => {
    // createQueue() does NOT call ensureTrace, so _log is null
    const q = createQueue('no-logger');
    const q2 = enqueue(q, makeItem({ queue_item_id: 'task-1', title: 'No Log' }));
    // No temp dir, no log file created — just verify it doesn't throw
    assert.ok(q2);
  });

  it('claim without logger init writes nothing', () => {
    const q = createQueue('no-logger');
    const result = claim(q);
    assert.equal(result.item, null);
  });
});
