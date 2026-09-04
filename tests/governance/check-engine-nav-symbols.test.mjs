// tests/governance/check-engine-nav-symbols.test.mjs
// Navigation-comment symbol guard: symbols listed in `// Navigation: public API`
// must be declared in the same file; first ghost fails closed with root cause.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECKER = fileURLToPath(new URL('../../openspec/governance/check-engine-nav-symbols.mjs', import.meta.url));

function makeHarness(files) {
  const root = mkdtempSync(join(tmpdir(), 'nav-'));
  mkdirSync(join(root, 'DEEP_RESEARCH_HARNESS/engine'), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(root, `DEEP_RESEARCH_HARNESS/engine/${name}`), content);
  }
  return root;
}

test('all-real nav symbols pass (exports, consts, functions, trailing ellipsis)', () => {
  const root = makeHarness({
    'good.mjs': [
      '// Navigation: public API — EXPORTED_CONST, exportedFn, ExportedClass, …',
      'export const EXPORTED_CONST = 1;',
      'export function exportedFn() {}',
      'export class ExportedClass {}',
      '',
    ].join('\n'),
  });
  const res = spawnSync('node', [CHECKER, root], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /0 ghosts/);
});

test('ghost nav symbol fails closed with file:line:symbol', () => {
  const root = makeHarness({
    'ghosty.mjs': [
      '// Navigation: public API — realOne, doesNotExist',
      'export const realOne = 1;',
      '',
    ].join('\n'),
  });
  const res = spawnSync('node', [CHECKER, root], { encoding: 'utf8' });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /ghost navigation symbol: doesNotExist/);
  assert.match(res.stderr, /ghosty\.mjs:1/);
});
