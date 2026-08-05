// @impl AGQ-004, AGQ-005, AGQ-019, FRE-005
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { QUEUE } from '../../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import { QueueSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/queue.mjs';
import { cleanup, item, tempBundle } from '../../engine/queue-manager-fixtures.mjs';

it('production queue CLI enqueues, claims, completes, preempts, renders, and checks real files', () => {
  const dir = tempBundle();
  try {
    const cli = path.resolve('DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs');
    const task1 = path.join(dir, 'task1.json');
    const task2 = path.join(dir, 'task2.json');
    const urgent = path.join(dir, 'urgent.json');
    const result = path.join(dir, 'result.json');
    writeFileSync(path.join(dir, 'done.txt'), 'done\n');
    writeFileSync(task1, `${JSON.stringify(item(1, { completion_receipt: 'file:done.txt' }))}\n`);
    writeFileSync(task2, `${JSON.stringify(item(2))}\n`);
    writeFileSync(urgent, `${JSON.stringify(item('urgent', { priority_class: 'P1_state_or_gate_repair' }))}\n`);
    writeFileSync(result, `${JSON.stringify({ queue_item_id: 'queue-1', receipt: 'file:done.txt', summary: 'done' })}\n`);

    execFileSync(process.execPath, [cli, 'enqueue', dir, '--task', task1], { stdio: 'pipe' });
    execFileSync(process.execPath, [cli, 'enqueue', dir, '--task', task2], { stdio: 'pipe' });
    execFileSync(process.execPath, [cli, 'claim', dir, '--actor', 'main-agent'], { stdio: 'pipe' });
    execFileSync(process.execPath, [cli, 'complete', dir, '--result', result], { stdio: 'pipe' });
    execFileSync(process.execPath, [cli, 'preempt', dir, '--task', urgent, '--reason', 'urgent'], { stdio: 'pipe' });
    execFileSync(process.execPath, [cli, 'render', dir], { stdio: 'pipe' });
    execFileSync(process.execPath, [cli, 'check', dir], { stdio: 'pipe' });

    const saved = JSON.parse(readFileSync(path.join(dir, QUEUE.FILE), 'utf-8'));
    assert.equal(QueueSchema.safeParse(saved).success, true);
    assert.equal(saved.active_window[0].queue_item_id, 'queue-urgent');
    assert.equal(saved.active_window[1].queue_item_id, 'queue-2');
    assert.match(readFileSync(path.join(dir, QUEUE.PROJECTION), 'utf-8'), /queue-urgent/);
    assert.match(readFileSync(path.join(dir, QUEUE.PROJECTION), 'utf-8'), /Generated from `rb_queue\.json`/);
  } finally {
    cleanup(dir);
  }
});
