// @impl RUS-004: inspect-bundle.mjs run-scoped-tmp diagnostic integration test
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const FIXTURE = join(process.cwd(), 'tests/fixtures/DEEP_RESEARCH_HARNESS');
const INSPECT = join(FIXTURE, 'cli/inspect-bundle.mjs');

function makeBundle(baseDir, name, { scriptFiles = {} } = {}) {
  const bundleDir = join(baseDir, `dpt_rb_${name}`);
  mkdirSync(bundleDir, { recursive: true });
  const dirs = ['seed_topics', 'reference', 'artifacts/wave0', 'artifacts/wave1', 'artifacts/wave2', '_cache', 'final', '_logs', '_work_units', '_scripts'];
  for (const d of dirs) mkdirSync(join(bundleDir, d), { recursive: true });
  const topFiles = ['rb_plan.md', 'rb_profile.yaml', 'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl', 'BUNDLE_MAP.md', 'BUNDLE_ENTRY.md'];
  for (const f of topFiles) writeFileSync(join(bundleDir, f), '');
  writeFileSync(join(bundleDir, '_logs', 'run.log'), '');
  writeFileSync(join(bundleDir, 'reference/_INDEX.md'), '');
  writeFileSync(join(bundleDir, 'reference/README.md'), '');
  for (const [name, content] of Object.entries(scriptFiles)) {
    writeFileSync(join(bundleDir, '_scripts', name), content);
  }
  return bundleDir;
}

describe('inspect-bundle.mjs run-scoped-tmp diagnostic (RUS-004)', () => {
  let tmpDir;

  before(() => {
    tmpDir = createTempDir('inspect-tmp-diagnostic');
    cpSync(FIXTURE, join(tmpDir, 'DEEP_RESEARCH_HARNESS'), { recursive: true });
  });

  after(cleanupAll);

  it('reports a hardcoded /tmp write path as an active-bundle blocker', () => {
    const bundle = makeBundle(tmpDir, 'tmp-hit', {
      scriptFiles: {
        'process-all-seeds.mjs': "import { writeFileSync } from 'node:fs';\nconst slug = '08_topic';\nwriteFileSync('/tmp/enrich-' + slug + '.json', data);\n",
      },
    });
    const result = spawnSync(process.execPath, [INSPECT, bundle], { encoding: 'utf-8' });
    assert.equal(result.status, 1, `stdout=${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)}`);
    assert.match(result.stdout, /Run-scoped tmp diagnostics \(RUS-004\)/);
    assert.match(result.stdout, /_scripts\/process-all-seeds\.mjs/);
    assert.match(result.stdout, /\/tmp\/enrich-/);
    assert.match(result.stdout, /active_bundle_blocker/);
  });

  it('reports nothing and exits 0 when scripts stage only under bundle _tmp/', () => {
    const bundle = makeBundle(tmpDir, 'tmp-clean', {
      scriptFiles: {
        'stager.mjs': "import { writeFileSync } from 'node:fs';\nimport { stagingFile } from 'DEEP_RESEARCH_HARNESS/engine/helpers/run-scoped-tmp.mjs';\nconst p = stagingFile('/rb', '08_topic', 'enrich');\nwriteFileSync(p, data);\n",
      },
    });
    const result = spawnSync(process.execPath, [INSPECT, bundle], { encoding: 'utf-8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /Run-scoped tmp diagnostics \(RUS-004\)/);
  });

  it('leaves unrelated missing-surface exit semantics intact', () => {
    // No _work_units/ directory → inspect fails for the missing surface, not the tmp scan.
    const bundle = makeBundle(tmpDir, 'tmp-unrelated');
    rmSync(join(bundle, '_work_units'), { recursive: true, force: true });
    const result = spawnSync(process.execPath, [INSPECT, bundle], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /missing/);
    assert.doesNotMatch(result.stdout, /Run-scoped tmp diagnostics/);
  });
});
