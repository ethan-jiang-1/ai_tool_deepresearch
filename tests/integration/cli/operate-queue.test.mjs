// operate-queue.test.mjs - Queue CLI integration tests for queue v2.
// @impl AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const FIXTURE_FW = join(process.cwd(), 'DPT_FRAMEWORK');
const CLI = join(FIXTURE_FW, 'cli', 'operate-queue.mjs');

function makeTask(overrides = {}) {
  return {
    queue_item_id: 'task-001',
    title: 'Execute wave0',
    targets: { controller: 'main-agent' },
    action: 'run_phase',
    producer_rule: 'phase_queue_producer',
    lineage: {},
    priority_class: 'P4_progressive_artifact_or_seed_backfill',
    required_receipts: ['none'],
    done_condition: 'gate_wave0_complete_passed',
    verification: { engine: [], agent: [] },
    writes_to: ['artifacts/wave0/'],
    status_sync: ['rb_status.json'],
    completion_receipt: 'none',
    failure_route: 'repair_wave0',
    status: 'queued',
    payload: {},
    ...overrides,
  };
}

function makeEmptyQueue(overrides = {}) {
  return {
    schema_version: 'queue.v2',
    bundle_name: null,
    queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    active_window: [],
    refill_pool: [],
    delegated_in_flight: {},
    terminal_history: [],
    ...overrides,
  };
}

function assertNoFlagRuntimeDirs(parentDir) {
  for (const name of ['--help', '--bundle']) {
    assert.equal(existsSync(join(parentDir, name)), false, `${name}/ should not be created`);
  }
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

  it('handles help and suspicious bundle arguments before runtime side effects', () => {
    const parentDir = createTempDir('operate-queue-help-guard');

    const topHelp = spawnSync('node', [CLI, '--help'], {
      cwd: parentDir,
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.strictEqual(topHelp.status, 0);
    assert.match(topHelp.stderr, /Usage:/);
    assertNoFlagRuntimeDirs(parentDir);

    const subHelp = spawnSync('node', [CLI, 'enqueue', '--help'], {
      cwd: parentDir,
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.notStrictEqual(subHelp.status, 0);
    assert.match(subHelp.stderr, /Usage:|help/i);
    assertNoFlagRuntimeDirs(parentDir);

    const suspiciousBundle = spawnSync('node', [CLI, 'claim', '--bundle', '--actor', 'main-agent'], {
      cwd: parentDir,
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.notStrictEqual(suspiciousBundle.status, 0);
    assert.match(suspiciousBundle.stderr, /suspicious bundle argument/i);
    assertNoFlagRuntimeDirs(parentDir);

    const unsupportedBundleFlag = spawnSync('node', [CLI, '--bundle', '--help'], {
      cwd: parentDir,
      encoding: 'utf-8',
      timeout: 5000,
    });
    assert.notStrictEqual(unsupportedBundleFlag.status, 0);
    assert.match(unsupportedBundleFlag.stderr, /Usage:|help|bundle/i);
    assertNoFlagRuntimeDirs(parentDir);
  });

  it('check - inspects queue', () => {
    const r = spawnSync('node', [CLI, 'check', bundleDir], { encoding: 'utf-8', timeout: 5000 });
    const out = JSON.parse(r.stdout);
    assert.strictEqual(typeof out.passed, 'boolean', `Expected passed boolean, got: ${r.stdout?.slice(0, 200)}`);
    assert.ok(Array.isArray(out.inspect || []), 'inspect field expected');
  });

  it('enqueue - adds a task to active_window', () => {
    const taskPath = join(bundleDir, '_task.json');
    writeFileSync(taskPath, JSON.stringify(makeTask(), null, 2));

    const r = spawnSync('node', [CLI, 'enqueue', bundleDir, '--task', taskPath],
      { encoding: 'utf-8', timeout: 5000 });

    assert.strictEqual(r.status, 0, `Expected exit 0, got ${r.status}. stderr: ${r.stderr?.slice(0, 500)}`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.queue.active_window[0].queue_item_id, 'task-001');
  });

  it('count - reports pending Queue demand separately from delegated in-flight attempts', () => {
    const countDir = createTempDir('operate-queue-count');
    const testQueue = makeEmptyQueue({
      active_window: [makeTask({ queue_item_id: 'task-count-001' }), makeTask({ queue_item_id: 'task-count-002' })],
      refill_pool: [makeTask({ queue_item_id: 'task-count-003' })],
      delegated_in_flight: {
        'task-count-004': {
          queue_item_id: 'task-count-004',
          work_id: 'wu-w0-b000-src-i0001',
          wave: 0,
          kind: 'wave0_source_intake',
          batch_id: 'b000',
          attempt_index: 1,
          queue_item_snapshot_hash: 'abc123',
          claimed_at: '2026-07-06T00:00:00.000Z',
          timeout_ms: 600000,
          deadline_at: '2026-07-06T00:10:00.000Z',
        },
      },
    });
    writeFileSync(join(countDir, 'rb_queue.json'), JSON.stringify(testQueue, null, 2));
    writeFileSync(join(countDir, 'START_FROM_HERE.md'), '# Count\n');
    cpSync(FIXTURE_FW, join(countDir, 'DPT_FRAMEWORK'), { recursive: true });

    const r = spawnSync('node', [CLI, 'count', countDir], { encoding: 'utf-8', timeout: 5000 });
    assert.strictEqual(r.status, 0, `Expected exit 0, got ${r.status}. stderr: ${r.stderr?.slice(0, 500)}`);
    const out = JSON.parse(r.stdout);

    assert.deepStrictEqual(out, {
      pending: 3,
      active_window: 2,
      refill_pool: 1,
      delegated_in_flight: 1,
    });
  });

  it('render - displays queue in human-readable format', () => {
    const taskPath = join(bundleDir, '_task2.json');
    writeFileSync(taskPath, JSON.stringify(makeTask({ queue_item_id: 'task-002' }), null, 2));
    spawnSync('node', [CLI, 'enqueue', bundleDir, '--task', taskPath],
      { encoding: 'utf-8', timeout: 5000 });

    const r = spawnSync('node', [CLI, 'render', bundleDir], { encoding: 'utf-8', timeout: 5000 });
    assert.strictEqual(r.status, 0, `Expected exit 0, got ${r.status}. stderr: ${r.stderr?.slice(0, 200)}`);
    assert.ok(r.stdout.length > 0, 'render should produce output');
  });

  it('claim - fails when queue is empty on fresh queue', () => {
    const freshDir = createTempDir('operate-queue-fresh');
    writeFileSync(join(freshDir, 'rb_queue.json'), JSON.stringify(makeEmptyQueue(), null, 2));
    writeFileSync(join(freshDir, 'START_FROM_HERE.md'), '# Fresh\n');
    cpSync(FIXTURE_FW, join(freshDir, 'DPT_FRAMEWORK'), { recursive: true });

    const r = spawnSync('node', [CLI, 'claim', freshDir, '--actor', 'main-agent'],
      { encoding: 'utf-8', timeout: 5000 });

    assert.notStrictEqual(r.status, 0, 'Claim on empty queue should fail closed.');
    assert.match(r.stdout, /empty|blocked/i);
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
