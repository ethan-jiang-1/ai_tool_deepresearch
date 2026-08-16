// check-content-drift.test.mjs
// Integration: the content-drift checker reports zero drift on the current
// repository documents. @impl RET-006

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const CHECKER = join(REPO_ROOT, 'openspec/governance/check-content-drift.mjs');

describe('check-content-drift on the repository', () => {
  it('reports zero drift across guidance, specs, and Harness documentation', () => {
    const result = spawnSync(process.execPath, [CHECKER, REPO_ROOT], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /clean/);
  });
});
