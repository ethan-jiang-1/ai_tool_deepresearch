// code-impl-ids-guard.test.mjs
// Real-tree contract for check-code-impl-ids.mjs (RET-011): the checker passes
// on the current repository tree (proving the propose-time measurement baseline
// still holds and the BUG- namespace exclusion works on the real surface), and
// the aggregated governance health entry discovers the new checker through its
// check-*.mjs naming convention. Fixture-level red/green behavior lives in
// code-impl-ids-fixture-contract.test.mjs so each asset path keeps one route
// identity.
//
// D4 escaping constraint (design.md): this file MUST NOT contain a literal
// `@impl <unregistered-ID>` sequence — a literal tag line here would be scanned
// by the checker itself (tests/ is a covered surface) and fail the real-tree
// case below. Build any tag lines by string concatenation.
// @impl RET-011

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const CHECKER = join(REPO_ROOT, 'openspec', 'governance', 'check-code-impl-ids.mjs');
const CHECK_ALL = join(REPO_ROOT, 'openspec', 'governance', 'check-all.mjs');

function runChecker(root) {
  return spawnSync(process.execPath, [CHECKER, root], { encoding: 'utf8', timeout: 30000 });
}

describe('check-code-impl-ids real-tree contract', () => {
  it('passes on the real tree (measurement baseline + BUG- exclusion hold)', () => {
    const result = runChecker(REPO_ROOT);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /clean \(\d+ files, \d+ @impl lines, \d+ tokens validated\)\./);
    assert.equal(result.stderr, '');
  });

  it('is discovered by the aggregated governance health entry', () => {
    const result = spawnSync(process.execPath, [CHECK_ALL], {
      encoding: 'utf8',
      timeout: 60000,
    });
    assert.ok(
      result.stdout.includes('PASS check-code-impl-ids.mjs'),
      `aggregated entry did not pass the new checker:\n${result.stdout}\n${result.stderr}`,
    );
  });
});
