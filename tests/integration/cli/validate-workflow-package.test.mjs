// validate-workflow-package.test.mjs — Workflow package consistency validator CLI test
// @impl WNC-007

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const CLI = join(process.cwd(), 'DPT_FRAMEWORK', 'cli', 'validate-workflow-package.mjs');

describe('validate-workflow-package.mjs integration', () => {
  let tmpRoot;
  const dirs = []; // track per-test subdirs for cleanup

  /** Create a fresh fixture directory under tmpRoot. Returns { wd, gd }. */
  function scaffold(label) {
    const base = join(tmpRoot, label);
    mkdirSync(base, { recursive: true });
    dirs.push(base);

    const wd = join(base, 'workflows');
    const nd = join(wd, 'nodes');
    const gd = join(base, 'gate_defs');
    mkdirSync(wd, { recursive: true });
    mkdirSync(join(nd, 'phases'), { recursive: true });
    mkdirSync(join(nd, 'shared'), { recursive: true });
    mkdirSync(gd, { recursive: true });
    return { base, wd, nd, gd };
  }

  before(() => {
    tmpRoot = createTempDir('validate-pkg');
  });

  after(cleanupAll);

  it('exits 0 when package is consistent', () => {
    const { wd, nd, gd } = scaffold('consistent');

    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({
      phases: [
        { key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' },
        { key: 'final', node: 'phases/phase-final.md', gate: null },
      ],
      shared: ['shared/shared-profile.md'],
    }));

    writeFileSync(join(nd, 'phases/phase-setup.md'),
      '---\n{"node_type":"phase","id":"phase-setup","phase":"setup","gate":"setup-ready","stop":"no","requires":[],"suggested_context":[]}\n---\n# Setup\n');
    writeFileSync(join(nd, 'phases/phase-final.md'),
      '---\n{"node_type":"phase","id":"phase-final","phase":"final","gate":null,"stop":"no","requires":[],"suggested_context":[]}\n---\n# Final\n');
    writeFileSync(join(nd, 'shared/shared-profile.md'),
      '---\n{"node_type":"shared","id":"shared-profile","requires":[]}\n---\n# Profile\n');
    writeFileSync(join(gd, 'gate-setup-ready.definition.json'),
      JSON.stringify({ gate: 'setup-ready', rules: [] }));
    writeFileSync(join(wd, 'transitions.chain.json'), JSON.stringify({
      'phases/phase-setup.md': { passed: 'phases/phase-final.md' },
    }));

    const r = spawnSync('node', [CLI, '--workflows-dir', wd, '--gate-defs-dir', gd],
      { encoding: 'utf-8', timeout: 10000 });

    const out = JSON.parse(r.stdout);
    assert.strictEqual(r.status, 0, `Expected exit 0, got ${r.status}`);
    assert.strictEqual(out.passed, true);
    assert.deepStrictEqual(out.issues, []);
  });

  it('exits 1 when consistency issues found (missing node)', () => {
    const { wd, gd } = scaffold('missing-node');

    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({
      phases: [{ key: 'ghost', node: 'phases/phase-ghost.md', gate: 'ghost-gate' }],
      shared: [],
    }));

    const r = spawnSync('node', [CLI, '--workflows-dir', wd, '--gate-defs-dir', gd],
      { encoding: 'utf-8', timeout: 10000 });

    const out = JSON.parse(r.stdout);
    assert.strictEqual(r.status, 1);
    assert.strictEqual(out.passed, false);
    assert.ok(out.issues.length > 0);
  });

  it('reports gate_binding_mismatch', () => {
    const { wd, nd, gd } = scaffold('gate-mismatch');

    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({
      phases: [{ key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' }],
      shared: [],
    }));
    writeFileSync(join(nd, 'phases/phase-setup.md'),
      '---\n{"node_type":"phase","id":"phase-setup","phase":"setup","gate":"WRONG_GATE","stop":"no","requires":[],"suggested_context":[]}\n---\n# Setup\n');

    const r = spawnSync('node', [CLI, '--workflows-dir', wd, '--gate-defs-dir', gd],
      { encoding: 'utf-8', timeout: 10000 });

    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.passed, false);
    assert.ok(out.issues.some(i => i.class === 'gate_binding_mismatch'),
      `Expected gate_binding_mismatch, got: ${out.issues.map(i => i.class).join(', ')}`);
  });

  it('reports transition table consistency issues', () => {
    const { wd, nd, gd } = scaffold('transition-issues');

    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({
      phases: [{ key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' }],
      shared: [],
    }));
    writeFileSync(join(nd, 'phases/phase-setup.md'),
      '---\n{"node_type":"phase","id":"phase-setup","phase":"setup","gate":"setup-ready","stop":"no","requires":[],"suggested_context":[]}\n---\n# Setup\n');
    writeFileSync(join(gd, 'gate-setup-ready.definition.json'),
      JSON.stringify({ gate: 'setup-ready', rules: [] }));
    writeFileSync(join(wd, 'transitions.chain.json'), JSON.stringify({
      'phases/phase-setup.md': { passed: 'phases/phase-ghost.md' },
      'phases/phase-unknown.md': { passed: 'phases/phase-setup.md' },
    }));

    const r = spawnSync('node', [CLI, '--workflows-dir', wd, '--gate-defs-dir', gd],
      { encoding: 'utf-8', timeout: 10000 });

    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.passed, false);
    const classes = out.issues.map(i => i.class);
    assert.ok(classes.some(c => c.startsWith('transition_')),
      `Expected transition_* issue, got: ${classes.join(', ')}`);
  });

  it('reports unresolvable dependency refs', () => {
    const { wd, nd, gd } = scaffold('unresolvable-dep');

    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({
      phases: [{ key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' }],
      shared: [],
    }));
    writeFileSync(join(nd, 'phases/phase-setup.md'),
      '---\n{"node_type":"phase","id":"phase-setup","phase":"setup","gate":"setup-ready","stop":"no","requires":["nonexistent-dep"],"suggested_context":[]}\n---\n# Setup\n');
    writeFileSync(join(gd, 'gate-setup-ready.definition.json'),
      JSON.stringify({ gate: 'setup-ready', rules: [] }));

    const r = spawnSync('node', [CLI, '--workflows-dir', wd, '--gate-defs-dir', gd],
      { encoding: 'utf-8', timeout: 10000 });

    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.passed, false);
    assert.ok(out.issues.some(i => i.class === 'unresolvable_dependency'),
      `Expected unresolvable_dependency, got: ${out.issues.map(i => i.class).join(', ')}`);
  });
});
