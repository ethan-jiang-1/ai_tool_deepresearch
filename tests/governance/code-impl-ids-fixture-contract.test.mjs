// code-impl-ids-fixture-contract.test.mjs
// Fixture red/green contract for check-code-impl-ids.mjs (RET-011): an
// unregistered ID on an @impl line fails naming file, token, and repair; a
// BUG-<digits> token on the same line is ignored; a registered [DEPRECATED]
// entry stays resolvable; a missing registry fails closed instead of passing
// vacuously. Real-tree behavior lives in code-impl-ids-guard.test.mjs so each
// asset path keeps one route identity.
//
// D4 escaping constraint (design.md): this file MUST NOT contain a literal
// `@impl <unregistered-ID>` sequence — a literal tag line here would be scanned
// by the checker itself (tests/ is a covered surface) and fail the real-tree
// case in the sibling suite. Build every fixture tag line via the TAG
// concatenation below so the literal substring never appears in this source.
// @impl RET-011

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const CHECKER = join(REPO_ROOT, 'openspec', 'governance', 'check-code-impl-ids.mjs');
const TAG = '@imp' + 'l'; // never write the literal tag substring in this file
const createdRoots = [];

function runChecker(root) {
  return spawnSync(process.execPath, [CHECKER, root], { encoding: 'utf8', timeout: 30000 });
}

function write(root, rel, content) {
  const target = join(root, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function fixtureRoot({ registry = null, implLines = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'code-impl-ids-'));
  createdRoots.push(root);
  if (registry !== null) {
    write(root, 'openspec/governance/req-registry.yaml', registry);
  }
  implLines.forEach((line, index) => {
    write(root, `DEEP_RESEARCH_HARNESS/engine/sample-${index}.mjs`, `${line}\n`);
  });
  return root;
}

const REGISTRY = ['RET-001: test-fixture — registered id', 'RET-002: test-fixture — deprecated id [DEPRECATED]'].join('\n');

after(() => {
  for (const root of createdRoots) rmSync(root, { recursive: true, force: true });
});

describe('check-code-impl-ids fixture contract', () => {
  it('fails an unregistered @impl ID naming file, line, token, and repair', () => {
    const root = fixtureRoot({
      registry: REGISTRY,
      implLines: [`${TAG} RET-001, ZZZ-999`],
    });
    const result = runChecker(root);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.ok(result.stderr.includes('1 violation(s)'), result.stderr);
    assert.ok(result.stderr.includes('DEEP_RESEARCH_HARNESS/engine/sample-0.mjs:1'), result.stderr);
    assert.ok(result.stderr.includes('ZZZ-999'), result.stderr);
    assert.ok(
      result.stderr.includes('register via lifecycle or correct the @impl tag'),
      result.stderr,
    );
  });

  it('ignores bug-namespace tokens alongside registered IDs', () => {
    const root = fixtureRoot({
      registry: REGISTRY,
      implLines: [`${TAG} RET-001, BUG-018`],
    });
    const result = runChecker(root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });

  it('keeps registered [DEPRECATED] entries resolvable on historical annotations', () => {
    const root = fixtureRoot({
      registry: REGISTRY,
      implLines: [`${TAG} RET-002`],
    });
    const result = runChecker(root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });

  it('fails closed when the registry is missing (no vacuous pass)', () => {
    const root = fixtureRoot({
      registry: null,
      implLines: [`${TAG} RET-001`],
    });
    const result = runChecker(root);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.ok(result.stderr.includes('registry not found'), result.stderr);
  });
});
