// dead-export-regression.test.mjs
// Locks the F-09 dead-code retirement of change
// cleanup-engine-surface-and-disambiguate-repair-kinds: retired symbols must not
// be imported anywhere, and the retired modules must not exist.
// @impl FIO-008

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const HARNESS = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS');

function walkMjs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkMjs(p, out);
    else if (name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

describe('dead-export regression (F-09)', () => {
  it('retired modules no longer exist', () => {
    assert.ok(!existsSync(join(HARNESS, 'engine', 'esm-dirname.mjs')), 'esm-dirname.mjs still exists');
    assert.ok(!existsSync(join(HARNESS, 'engine', 'queue-manager-ledger.mjs')), 'queue-manager-ledger.mjs still exists');
    assert.ok(!existsSync(join(REPO_ROOT, 'tests', 'engine', 'esm-dirname.test.mjs')), 'esm-dirname test still exists');
  });

  it('retired exports are not imported anywhere in the harness', () => {
    const sources = walkMjs(join(HARNESS, 'engine')).concat(walkMjs(join(HARNESS, 'cli')));
    // OutputDeclarationLedgerRecord is a unique name: assert zero references.
    for (const file of sources) {
      const text = readFileSync(file, 'utf8');
      assert.ok(
        !/\bOutputDeclarationLedgerRecord\b/.test(text),
        `OutputDeclarationLedgerRecord still referenced in ${file.replace(REPO_ROOT + '/', '')}`,
      );
    }
  });

  it('queue-manager-core no longer exports advice', () => {
    const core = readFileSync(join(HARNESS, 'engine', 'queue-manager-core.mjs'), 'utf8');
    assert.ok(!/export function advice\b/.test(core), 'advice() export still present');
  });

  it('test-lock vocabulary exports remain and are annotated', () => {
    const vocab = readFileSync(join(HARNESS, 'engine', 'work-unit-repair-vocabulary.mjs'), 'utf8');
    assert.ok(vocab.includes('WORK_UNIT_REPAIR_KINDS'), 'test-lock export missing');
    assert.ok(vocab.includes('REPAIR_KIND_CLI_VERB'), 'test-lock export missing');
    assert.ok(vocab.includes('Test-lock exports'), 'annotation missing');
  });
});
