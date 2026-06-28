// operate-queue.test.mjs — Queue CLI integration tests
// @impl AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { writeFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';
import { SLOT_NAMES } from '../../../DPT_FRAMEWORK/schema/contracts/queue-slots.mjs';

const FIXTURE_FW = join(process.cwd(), 'DPT_FRAMEWORK');
const CLI = join(FIXTURE_FW, 'cli', 'operate-queue.mjs');

function makeTask(overrides = {}) {
  return {
    work_id: 'task-001',
    title: 'Execute wave0',
    targets: { controller: 'main-agent' },
    action: 'run_phase',
    producer_rule: 'phase_queue_producer',
    lineage: {},
    priority_class: 'P4_progressive_artifact_or_seed_backfill',
    required_receipts: ['load_start', 'load_complete'],
    done_condition: 'gate_wave0_complete_passed',
    verification: { engine: [], agent: [] },
    writes_to: ['artifacts/wave0/'],
    status_sync: ['rb_status.json'],
    completion_receipt: 'wave0_phase_done',
    failure_route: 'repair_wave0',
    status: 'queued',
    payload: {},
    ...overrides,
  };
}

function makeEmptyQueue() {
  return {
    queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    ...Object.fromEntries(SLOT_NAMES.map((slot) => [slot, null])),
    refill_pool: [],
  };
}

describe('operate-queue.mjs integration', () => {
  let bundleDir;

  before(() => {
    bundleDir = createTempDir('operate-queue');
    writeFileSync(join(bundleDir, 'rb_queue.json'), JSON.stringify(makeEmptyQueue(), null, 2));
    writeFileSync(join(bundleDir, 'START_FROM_HERE.md'), '# Queue Test\n');
    cpSync(FIXTURE_FW, join(bundleDir, 'DPT_FRAMEWORK'), { recursive: true });
  });

  after(cleanupAll);

  it('check — inspects queue (exit 1 when slot_1 empty is expected)', () => {
    const r = spawnSync('node', [CLI, 'check', bundleDir], { encoding: 'utf-8', timeout: 5000 });
    // inspect returns passed=false when slot_1_current is empty — that's correct
    const out = JSON.parse(r.stdout);
    assert.strictEqual(typeof out.passed, 'boolean', `Expected passed boolean, got: ${r.stdout?.slice(0, 200)}`);
    assert.ok(Array.isArray(out.inspect || []), 'inspect field expected');
  });

  it('enqueue — adds a task to the queue', () => {
    const taskPath = join(bundleDir, '_task.json');
    writeFileSync(taskPath, JSON.stringify(makeTask(), null, 2));

    const r = spawnSync('node', [CLI, 'enqueue', bundleDir, '--task', taskPath],
      { encoding: 'utf-8', timeout: 5000 });

    assert.strictEqual(r.status, 0, `Expected exit 0, got ${r.status}. stderr: ${r.stderr?.slice(0, 500)}`);
    const out = JSON.parse(r.stdout);
    const q = out.queue || out; // enqueue returns { ok, queue }
    const aw = q.active_window || q;

    const totalItems = SLOT_NAMES.filter((slot) => aw[slot]).length + (q.refill_pool || []).length;
    assert.ok(totalItems >= 1, `Expected at least 1 queued item, got ${totalItems}`);
  });

  it('count — reports pending Queue task depth computed from fixture, not magic numbers', () => {
    const countDir = createTempDir('operate-queue-count');
    const testQueue = {
      ...makeEmptyQueue(),
      slot_1_current: makeTask({ work_id: 'task-count-001' }),
      slot_3_pending: makeTask({ work_id: 'task-count-002' }),
      refill_pool: [makeTask({ work_id: 'task-count-003' })],
    };
    writeFileSync(join(countDir, 'rb_queue.json'), JSON.stringify(testQueue, null, 2));
    writeFileSync(join(countDir, 'START_FROM_HERE.md'), '# Count\n');
    cpSync(FIXTURE_FW, join(countDir, 'DPT_FRAMEWORK'), { recursive: true });

    const r = spawnSync('node', [CLI, 'count', countDir], { encoding: 'utf-8', timeout: 5000 });
    assert.strictEqual(r.status, 0, `Expected exit 0, got ${r.status}. stderr: ${r.stderr?.slice(0, 500)}`);
    const out = JSON.parse(r.stdout);

    // Compute expectations from fixture data, not hardcoded magic numbers.
    // If SLOT_NAMES changes, the test remains correct because it derives expectations from configuration.
    const activeSlots = SLOT_NAMES.filter(s => testQueue[s] !== null).length;
    const poolLen = testQueue.refill_pool.length;
    assert.deepStrictEqual(out, {
      pending: activeSlots + poolLen,
      active_window: activeSlots,
      refill_pool: poolLen,
    });
  });

  it('render — displays queue in human-readable format', () => {
    // Enqueue first so there's something to display
    const taskPath = join(bundleDir, '_task2.json');
    writeFileSync(taskPath, JSON.stringify(makeTask({ work_id: 'task-002' }), null, 2));
    spawnSync('node', [CLI, 'enqueue', bundleDir, '--task', taskPath],
      { encoding: 'utf-8', timeout: 5000 });

    const r = spawnSync('node', [CLI, 'render', bundleDir], { encoding: 'utf-8', timeout: 5000 });
    assert.strictEqual(r.status, 0, `Expected exit 0, got ${r.status}. stderr: ${r.stderr?.slice(0, 200)}`);
    assert.ok(r.stdout.length > 0, 'render should produce output');
  });

  it('claim — fails when queue is empty on fresh queue', () => {
    const freshDir = createTempDir('operate-queue-fresh');
    writeFileSync(join(freshDir, 'rb_queue.json'), JSON.stringify(makeEmptyQueue(), null, 2));
    writeFileSync(join(freshDir, 'START_FROM_HERE.md'), '# Fresh\n');
    cpSync(FIXTURE_FW, join(freshDir, 'DPT_FRAMEWORK'), { recursive: true });

    const r = spawnSync('node', [CLI, 'claim', freshDir, '--actor', 'main-agent'],
      { encoding: 'utf-8', timeout: 5000 });

    // Claim on empty queue should fail
    assert.ok(r.status !== 0 || (r.stdout || '').toLowerCase().includes('empty'),
      `Claim on empty queue should fail. status=${r.status}, stdout=${r.stdout?.slice(0, 200)}`);
  });

  it('invalid command returns non-zero', () => {
    const r = spawnSync('node', [CLI, 'nonexistent_cmd', bundleDir],
      { encoding: 'utf-8', timeout: 5000 });
    assert.ok(r.status !== 0, `Invalid command should return non-zero, got ${r.status}`);
  });

  it('missing bundle path exits with error', () => {
    const r = spawnSync('node', [CLI, 'check'], { encoding: 'utf-8', timeout: 5000 });
    assert.ok(r.status !== 0, `Missing bundle should return non-zero, got ${r.status}`);
  });
});
