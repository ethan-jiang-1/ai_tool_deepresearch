// @impl INT-001: inspect-bundle.mjs integration test
import { describe, it, before, after } from 'node:test';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const FIXTURE = join(process.cwd(), 'tests/fixtures/DPT_FRAMEWORK');
const INSPECT = join(FIXTURE, 'cli/inspect-bundle.mjs');

describe('inspect-bundle.mjs integration', () => {
  let tmpDir;

  before(() => {
    tmpDir = createTempDir('inspect-bundle');
    cpSync(FIXTURE, join(tmpDir, 'DPT_FRAMEWORK'), { recursive: true });
  });

  after(cleanupAll);

  it('passes on complete bundle', () => {
    const bundleDir = join(tmpDir, 'dpt_rb_complete');
    mkdirSync(bundleDir, { recursive: true });
    const dirs = ['seed_topics', 'reference', 'artifacts/wave0', 'artifacts/wave1', 'artifacts/wave2', '_cache', 'final'];
    for (const d of dirs) mkdirSync(join(bundleDir, d), { recursive: true });
    const files = ['START_FROM_HERE.md', 'rb_plan.md', 'rb_profile.yaml', 'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl', 'reference/_INDEX.md', 'reference/README.md'];
    for (const f of files) writeFileSync(join(bundleDir, f), '');
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 0) throw new Error(`Expected exit 0, got ${result.status}\n${result.stdout}`);
  });

  it('fails on missing directory', () => {
    const bundleDir = join(tmpDir, 'dpt_rb_missing');
    mkdirSync(bundleDir, { recursive: true });
    // All REQUIRED paths present except final/
    const dirs = ['seed_topics', 'reference', 'artifacts/wave0', 'artifacts/wave1', 'artifacts/wave2', '_cache'];
    for (const d of dirs) mkdirSync(join(bundleDir, d), { recursive: true });
    const files = ['START_FROM_HERE.md', 'rb_plan.md', 'rb_profile.yaml', 'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl', 'reference/_INDEX.md', 'reference/README.md'];
    for (const f of files) writeFileSync(join(bundleDir, f), '');
    const result = spawnSync('node', [INSPECT, bundleDir], { encoding: 'utf-8', timeout: 5000 });
    if (result.status !== 1) throw new Error(`Expected exit 1, got ${result.status}\n${result.stdout}`);
  });
});
