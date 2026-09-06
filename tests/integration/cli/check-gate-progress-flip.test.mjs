// Gate CLI pass flips Progress (PHS-006) — integration
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-instantiation-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_prog_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function sha256(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function runGate(bundleDir) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundleDir, '--current-node', 'phases/phase-instantiation.md'], {
    encoding: 'utf-8',
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
}

describe('gate CLI pass flips plan Progress (PHS-006)', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('flips the passed gate line in rb_plan.md## Progress and records the post-flip plan hash in the checkpoint', () => {
    const name = unique('flip');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    if (r.status !== 0) throw new Error(`new-disposable-bundle failed: ${r.stderr}`);
    const bundleDir = track(r.stdout.trim());

    const before = readFileSync(join(bundleDir, 'rb_plan.md'), 'utf8');
    assert.match(before, /- \[ \] instantiation-complete/);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);
    assert.equal(result.status, 0);
    assert.equal(output.check.passed, true);

    const after = readFileSync(join(bundleDir, 'rb_plan.md'), 'utf8');
    assert.match(after, /- \[x\] instantiation-complete \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\)/);
    // No cycle block was spawned by a non-rerun gate.
    assert.doesNotMatch(after, /### Rerun cycle /);

    // The same pass's checkpoint manifest records rb_plan.md hash AFTER the flip.
    const ckptDir = join(bundleDir, '_checkpoints');
    assert.ok(existsSync(ckptDir), '_checkpoints must exist');
    const ckptFiles = readdirSync(ckptDir).filter((f) => f.endsWith('-instantiation-complete.json'));
    assert.ok(ckptFiles.length >= 1, `no instantiation checkpoint in ${ckptDir}`);
    const newest = ckptFiles.sort().pop();
    const manifest = JSON.parse(readFileSync(join(ckptDir, newest), 'utf8'));
    assert.ok(manifest.hashes && manifest.hashes['rb_plan.md'], 'checkpoint must record rb_plan.md hash');
    assert.equal(manifest.hashes['rb_plan.md'].sha256, sha256(after));
  });
});
