// @impl BUM-003, BUM-005, WDC-004
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkCurrentEntryContract,
  UNSUPPORTED_CURRENT_ENTRY_CONTRACT,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/current-entry-contract.mjs';

const TMP = join(fileURLToPath(new URL('.', import.meta.url)), '.test-current-entry-contract');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function makeRoot(name, files = []) {
  const root = join(TMP, name);
  mkdirSync(root, { recursive: true });
  for (const file of files) writeFileSync(join(root, file), '# Test\n');
  return root;
}

function assertRejected(result, missingFiles) {
  assert.equal(result.passed, false);
  assert.equal(result.code, UNSUPPORTED_CURRENT_ENTRY_CONTRACT);
  assert.deepEqual(result.missing_files, missingFiles);
}

describe('current entry contract', () => {
  it('accepts exactly the same-root BUNDLE_ENTRY.md and BUNDLE_MAP.md pair', () => {
    const result = checkCurrentEntryContract(makeRoot('complete', [
      'BUNDLE_ENTRY.md',
      'BUNDLE_MAP.md',
    ]));

    assert.equal(result.passed, true);
    assert.equal(result.code, null);
    assert.deepEqual(result.missing_files, []);
  });

  it('identifies each missing member of the current pair', () => {
    assertRejected(checkCurrentEntryContract(makeRoot('missing-entry', ['BUNDLE_MAP.md'])), ['BUNDLE_ENTRY.md']);
    assertRejected(checkCurrentEntryContract(makeRoot('missing-map', ['BUNDLE_ENTRY.md'])), ['BUNDLE_MAP.md']);
    assertRejected(checkCurrentEntryContract(makeRoot('missing-both')), ['BUNDLE_ENTRY.md', 'BUNDLE_MAP.md']);
  });

  it('does not treat legacy-only root shapes as substitutes', () => {
    assertRejected(checkCurrentEntryContract(makeRoot('run-bundle-only', ['RUN_BUNDLE.md'])), ['BUNDLE_ENTRY.md', 'BUNDLE_MAP.md']);
    assertRejected(checkCurrentEntryContract(makeRoot('start-here-only', ['START_FROM_HERE.md'])), ['BUNDLE_ENTRY.md', 'BUNDLE_MAP.md']);
    assertRejected(checkCurrentEntryContract(makeRoot('map-only', ['BUNDLE_MAP.md'])), ['BUNDLE_ENTRY.md']);
  });

  it('accepts a complete pair with legacy historical debris', () => {
    const result = checkCurrentEntryContract(makeRoot('pair-plus-debris', [
      'BUNDLE_ENTRY.md',
      'BUNDLE_MAP.md',
      'RUN_BUNDLE.md',
      'START_FROM_HERE.md',
    ]));

    assert.equal(result.passed, true);
    assert.equal(result.code, null);
    assert.deepEqual(result.missing_files, []);
  });
});
