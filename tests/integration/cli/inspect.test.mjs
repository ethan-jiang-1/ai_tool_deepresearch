// @impl INT-001: inspect.mjs integration test
import { describe, it, before, after } from 'node:test';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE = join(process.cwd(), 'tests/fixtures/DPT_FRAMEWORK');
const INSPECT = join(FIXTURE, 'cli/inspect.mjs');

describe('inspect.mjs integration', () => {
  let tmpDir;

  before(() => {
    tmpDir = mkdtempSync('dpt_rb_test_');
    cpSync(FIXTURE, join(tmpDir, 'DPT_FRAMEWORK'), { recursive: true });
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes on complete bundle', () => {
    const bundleDir = join(tmpDir, 'dpt_rb_complete');
    mkdirSync(bundleDir, { recursive: true });
    const dirs = ['seed_topics', 'reference', 'artifacts/wave1', 'artifacts/wave2', '_cache', 'final'];
    for (const d of dirs) mkdirSync(join(bundleDir, d), { recursive: true });
    const files = ['START_FROM_HERE.md', 'rb_plan.md', 'rb_profile.yaml', 'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl'];
    for (const f of files) writeFileSync(join(bundleDir, f), '');
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`Expected exit 0, got ${result.status}\n${result.stdout}`);
  });

  it('fails on missing directory', () => {
    const bundleDir = join(tmpDir, 'dpt_rb_missing');
    mkdirSync(bundleDir, { recursive: true });
    const dirs = ['seed_topics', 'reference', 'artifacts/wave1', 'artifacts/wave2', '_cache']; // missing final/
    for (const d of dirs) mkdirSync(join(bundleDir, d), { recursive: true });
    const files = ['START_FROM_HERE.md', 'rb_plan.md', 'rb_profile.yaml', 'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl'];
    for (const f of files) writeFileSync(join(bundleDir, f), '');
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 1) throw new Error(`Expected exit 1, got ${result.status}\n${result.stdout}`);
  });
});
