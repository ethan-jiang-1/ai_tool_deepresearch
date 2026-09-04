import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverTestFiles } from '../../scripts/test-shard.mjs';
import { lptOrder } from '../../scripts/run-tests.mjs';

// Claim: test-runner-discovery-contract (verification-plan.yaml).
// The wrapper shares test-shard.mjs discovery: skip `.test-*` disposable
// output dirs, skip symlinked dirs, collect nested `*.test.mjs`.
test('discovery skips .test-* dirs, symlinked dirs, and collects nested test files', () => {
  const root = mkdtempSync(join(tmpdir(), 'test-runner-entry-'));
  try {
    writeFileSync(join(root, 'a.test.mjs'), '');
    mkdirSync(join(root, 'sub'));
    writeFileSync(join(root, 'sub', 'b.test.mjs'), '');
    mkdirSync(join(root, '.test-disposable'));
    writeFileSync(join(root, '.test-disposable', 'c.test.mjs'), '');
    mkdirSync(join(root, 'real-target'));
    writeFileSync(join(root, 'real-target', 'd.test.mjs'), '');
    symlinkSync(join(root, 'real-target'), join(root, 'linkdir'));

    const found = discoverTestFiles(root);
    // real-target/ is a real directory: its test file is collected. The
    // symlinked dir is skipped, so 'linkdir/d.test.mjs' must be absent.
    assert.deepEqual(found.sort(), ['a.test.mjs', 'real-target/d.test.mjs', 'sub/b.test.mjs']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Claim: test-runner-lpt-ordering-contract (verification-plan.yaml).
test('lptOrder sorts weighted files descending, appends unweighted in relative order', () => {
  const files = ['a.test.mjs', 'b.test.mjs', 'c.test.mjs', 'd.test.mjs', 'e.test.mjs'];
  const weights = { 'a.test.mjs': 5, 'b.test.mjs': 50, 'c.test.mjs': 20 };
  const ordered = lptOrder(files, weights);
  assert.deepEqual(ordered, ['b.test.mjs', 'c.test.mjs', 'a.test.mjs', 'd.test.mjs', 'e.test.mjs']);
});

test('lptOrder keeps ties and unweighted files in discovery order', () => {
  const files = ['x.test.mjs', 'y.test.mjs', 'z.test.mjs'];
  const weights = { 'x.test.mjs': 10, 'y.test.mjs': 10 };
  assert.deepEqual(lptOrder(files, weights), ['x.test.mjs', 'y.test.mjs', 'z.test.mjs']);
  assert.deepEqual(lptOrder(files, {}), files);
});

test('lptOrder never changes the executed file set', () => {
  const files = ['a.test.mjs', 'b.test.mjs', 'c.test.mjs'];
  const weights = { 'c.test.mjs': 1, 'a.test.mjs': 9 };
  assert.deepEqual([...lptOrder(files, weights)].sort(), [...files].sort());
  // And the identity holds for the degenerate no-weights case.
  assert.deepEqual(lptOrder(files, {}), files);
});
