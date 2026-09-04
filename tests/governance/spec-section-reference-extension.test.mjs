// tests/governance/spec-section-reference-extension.test.mjs
// Rule-3 extension of check-spec-section-references.mjs: bare §TOKEN self-refs
// and `<file>.md §TOKEN` cross-refs inside the workflows tree must resolve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECKER = fileURLToPath(new URL('../../openspec/governance/check-spec-section-references.mjs', import.meta.url));

function makeTree(extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ssr-'));
  mkdirSync(join(root, 'openspec/specs/dummy'), { recursive: true });
  mkdirSync(join(root, 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases'), { recursive: true });
  writeFileSync(join(root, 'openspec/specs/dummy/spec.md'), '## Purpose\n\nPlaceholder.'.replace('## Purpose', '## Purpose'));
  const a = ['## 1. Intro', '', 'First phase body.', '', '## 2. Actions', '', '## 3. Allowed', '', 'See §3 for allowed work.'].join('\n');
  const b = ['## 1. Intro', '', 'cross-refs `a.md` §3 and self §2.', '', '## 2. Detail', ''].join('\n');
  writeFileSync(join(root, 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/a.md'), a);
  writeFileSync(join(root, 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/b.md'), b);
  for (const [rel, content] of Object.entries(extra)) {
    const p = join(root, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, content);
  }
  return root;
}

test('clean workflows tree passes the extended guard', () => {
  const root = makeTree();
  const res = spawnSync('node', [CHECKER, root], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
});

test('bare self §TOKEN without a matching heading fails closed with root cause', () => {
  const root = makeTree({
    'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/c.md': ['## 1. Intro', '', 'see §9 which does not exist', ''].join('\n'),
  });
  const res = spawnSync('node', [CHECKER, root], { encoding: 'utf8' });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /self section §9 not found in c\.md/);
});

test('cross-file `<file>.md §TOKEN` with missing target section fails closed', () => {
  const root = makeTree({
    'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/d.md': ['## 1. Intro', '', '`a.md` §9 is dangling', ''].join('\n'),
  });
  const res = spawnSync('node', [CHECKER, root], { encoding: 'utf8' });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /section §9 not found in a\.md/);
});

test('cross-file ref to a missing target file fails closed', () => {
  const root = makeTree({
    'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/e.md': ['## 1. Intro', '', '`missing.md` §2 is dangling', ''].join('\n'),
  });
  const res = spawnSync('node', [CHECKER, root], { encoding: 'utf8' });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /cross-ref target file not found: missing\.md/);
});
