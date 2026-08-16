// check-project-specs-h1.test.mjs
// Locks RET-009: main specs must begin with exactly one level-one title.
// @impl RET-009

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const CHECK_SPECS = join(REPO_ROOT, 'openspec', 'governance', 'check-project-specs.mjs');

function fixtureWith(specBody) {
  const root = mkdtempSync(join(tmpdir(), 'specs-h1-'));
  mkdirSync(join(root, 'openspec', 'specs', 'demo', 'capability'), { recursive: true });
  writeFileSync(join(root, 'openspec', 'specs', 'demo', 'capability', 'spec.md'), specBody);
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [CHECK_SPECS, root], { encoding: 'utf8', timeout: 60000 });
}

const BODY = ['## Purpose', '', 'Demo purpose.', '', '## Requirements', '', '### Requirement: Demo', '', 'Demo SHALL exist.', ''].join('\n');

describe('check-project-specs H1 structure (RET-009)', () => {
  it('missingH1 fails when the spec begins with a > req: line', () => {
    const root = fixtureWith(`> req: DMO-001\n\n${BODY}`);
    try {
      const result = run(root);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /missingH1|Missing level-one title/);
      assert.match(result.stderr, /capability\/spec\.md/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('duplicateH1 fails when the spec carries two level-one titles', () => {
    const root = fixtureWith(`# capability\n\n> req: DMO-001\n\n${BODY}\n\n# second\n`);
    try {
      const result = run(root);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /duplicateH1|Duplicate level-one title/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('single level-one title passes', () => {
    const root = fixtureWith(`# capability\n\n> req: DMO-001\n\n${BODY}`);
    try {
      const result = run(root);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
