// drift-guard-checkers.test.mjs
// Unit contracts for the four drift-guard checkers: each checker gives a
// deterministic pass on the real tree and a deterministic fail on a minimal
// fixture with one injected violation.
// @impl F-11 drift-guard checker family

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const GOV = join(REPO_ROOT, 'openspec/governance');
const createdRoots = [];

function runChecker(script, cwdOrRoot) {
  const result = spawnSync(process.execPath, [join(GOV, script)], {
    cwd: typeof cwdOrRoot === 'string' && cwdOrRoot === REPO_ROOT ? REPO_ROOT : undefined,
    encoding: 'utf8',
    timeout: 30000,
  });
  if (typeof cwdOrRoot === 'string' && cwdOrRoot !== REPO_ROOT) {
    const r2 = spawnSync(process.execPath, [join(GOV, script), cwdOrRoot], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 30000,
    });
    return r2;
  }
  return result;
}

function write(root, rel, content) {
  const target = join(root, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'drift-guard-checkers-'));
  createdRoots.push(root);
  return root;
}

after(() => {
  for (const root of createdRoots) rmSync(root, { recursive: true, force: true });
});

describe('check-guidance-pointer-targets', () => {
  it('passes on the real tree', () => {
    const r = runChecker('check-guidance-pointer-targets.mjs', REPO_ROOT);
    assert.equal(r.status, 0, r.stderr);
  });

  it('fails on a broken pointer', () => {
    const root = tempRoot();
    write(root, 'README.md', 'See `broken/thing.md` for details.\n');
    const r = runChecker('check-guidance-pointer-targets.mjs', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /broken\/thing\.md/);
  });
});

describe('check-surface-inventory', () => {
  it('passes on the real tree', () => {
    const r = runChecker('check-surface-inventory.mjs', REPO_ROOT);
    assert.equal(r.status, 0, r.stderr);
  });

  it('fails when the harness README drops the directory-as-truth pointer', () => {
    const root = tempRoot();
    write(root, 'DEEP_RESEARCH_HARNESS/README.md', '# Harness\n\n- `cli/`: some tools.\n');
    const r = runChecker('check-surface-inventory.mjs', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /directory-as-truth pointer/);
  });
});

describe('check-phase-node-structure', () => {
  it('passes on the real tree', () => {
    const r = runChecker('check-phase-node-structure.mjs', REPO_ROOT);
    assert.equal(r.status, 0, r.stderr);
  });

  it('fails when a middle phase loses its enter-phase instruction', () => {
    const root = tempRoot();
    const src = readFileSync(join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md'), 'utf8');
    write(root, 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md', src.replaceAll('enter-phase.mjs', 'enter-phase-removed.mjs'));
    const r = runChecker('check-phase-node-structure.mjs', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /enter-phase/);
  });
});

describe('check-spec-req-ids', () => {
  it('passes on the real tree', () => {
    const r = runChecker('check-spec-req-ids.mjs', REPO_ROOT);
    assert.equal(r.status, 0, r.stderr);
  });

  it('fails on an unregistered header ID', () => {
    const root = tempRoot();
    write(root, 'openspec/specs/x/demo/spec.md', [
      '> req: ZZZ-001',
      '',
      '## Requirements',
      '### Requirement: Demo requirement',
      '',
      '#### Scenario: Demo scenario',
      '- **WHEN** x',
      '- **THEN** y',
      '',
    ].join('\n'));
    write(root, 'openspec/governance/req-registry.yaml', '# empty registry\n');
    const r = runChecker('check-spec-req-ids.mjs', root);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /ZZZ-001 not registered/);
  });
});
