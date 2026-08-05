// @impl EXA-006

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

const REPO = path.resolve(new URL('../../..', import.meta.url).pathname);

describe('Agent Experiment explicit creator/preparation targets', () => {
  it('creates disposable and production-shaped bundles only under the explicit target', () => {
    const target = mkdtempSync(path.join(tmpdir(), 'agent-experiment-target-'));
    try {
      let result = spawnSync(process.execPath, [
        path.join(REPO, 'experiments_env/shared/new-disposable-bundle.mjs'),
        'explicit-target', '--case', 'case-999', '--target-dir', target,
      ], { cwd: REPO, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const disposable = result.stdout.trim().split(/\r?\n/).at(-1);
      assert.equal(path.dirname(disposable), realpathSync(target));
      assert.ok(path.basename(disposable).startsWith('dpt_disp_case-999_'));

      result = spawnSync(process.execPath, [
        path.join(REPO, 'DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs'),
        `explicit-target-${Date.now()}`, '--target-dir', target,
      ], { cwd: REPO, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const production = result.stdout.trim().split(/\r?\n/).at(-1);
      assert.equal(path.dirname(production), realpathSync(target));
      assert.ok(path.basename(production).startsWith('dpt_rb_'));
      assert.equal(existsSync(path.join(REPO, path.basename(disposable))), false);
      assert.equal(existsSync(path.join(REPO, path.basename(production))), false);
    } finally { rmSync(target, { recursive: true, force: true }); }
  });

  it('keeps iterative and rerun preparation explicit-target capable without env/latest discovery', () => {
    for (const rel of [
      'experiments_env/shared/prepare-iterative-interaction-case.mjs',
      'experiments_env/shared/prepare-rerun-direction-canary.mjs',
      'experiments_env/shared/run-fixture-backed-case.mjs',
    ]) {
      const source = readFileSync(path.join(REPO, rel), 'utf8');
      assert.match(source, /--target-dir/);
      assert.doesNotMatch(source, /latest[-_ ]run|DPT_AGENT_EXPERIMENT_CONTEXT|process\.env\.[A-Z_]*CONTEXT/i);
    }
  });
});
