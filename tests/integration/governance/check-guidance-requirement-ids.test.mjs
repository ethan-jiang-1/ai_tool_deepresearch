// check-guidance-requirement-ids.test.mjs
// Locks RET-010: guidance/operations/constitution prose requirement-ID tokens
// must resolve against the registry. Real tree PASS plus injected-violation
// FAIL behavior.
// @impl RET-010

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const CHECKER = join(REPO_ROOT, 'openspec', 'governance', 'check-guidance-requirement-ids.mjs');

function runChecker(root) {
  return spawnSync(process.execPath, [CHECKER, root], { encoding: 'utf8', timeout: 60000 });
}

describe('guidance requirement-ID guard (RET-010)', () => {
  it('real tree passes', () => {
    const result = runChecker(REPO_ROOT);
    assert.equal(result.status, 0, `expected exit 0\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  });

  it('injected unregistered ID fails with a named repair', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'guidance-ids-'));
    try {
      mkdirSync(join(tmp, 'openspec', 'governance'), { recursive: true });
      mkdirSync(join(tmp, 'openspec', 'guidance'), { recursive: true });
      writeFileSync(
        join(tmp, 'openspec', 'governance', 'req-registry.yaml'),
        'prefixes:\n  ZZZ: demo-capability\n\nZZZ-001: demo-capability - alive\nRUE-001: run-entry - real\n',
      );
      writeFileSync(join(tmp, 'openspec', 'guidance', 'note.md'), 'See ZZZ-999 and RUE-001.\n');
      const result = runChecker(tmp);
      assert.equal(result.status, 1, `expected exit 1\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
      assert.ok(result.stderr.includes('ZZZ-999'), 'stderr must name the unresolved token');
      assert.ok(result.stderr.includes('note.md'), 'stderr must name the file');
      assert.ok(!result.stderr.includes('RUE-001'), 'registered token must not be reported');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('registered but deprecated IDs remain resolvable', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'guidance-ids-'));
    try {
      mkdirSync(join(tmp, 'openspec', 'governance'), { recursive: true });
      mkdirSync(join(tmp, 'openspec', 'guidance'), { recursive: true });
      writeFileSync(
        join(tmp, 'openspec', 'governance', 'req-registry.yaml'),
        'OLD-001: old-cap — retired [DEPRECATED]\n',
      );
      writeFileSync(join(tmp, 'openspec', 'guidance', 'note.md'), 'Historical note cites OLD-001.\n');
      const result = runChecker(tmp);
      assert.equal(result.status, 0, `deprecated ID should resolve\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
