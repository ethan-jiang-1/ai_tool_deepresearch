// tests/governance/check-spec-section-references.test.mjs
// 2026-09-01-spec-section-reference-guard：§ 坐标可达性 + 退役散文禁令的 fixture 双向断言。
// @impl VER-002
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHECKER = 'openspec/governance/check-spec-section-references.mjs';

function makeRoot(good) {
  const root = mkdtempSync(join(tmpdir(), 'spec-ref-guard-'));
  const specDir = join(root, 'openspec', 'specs', 'demo');
  const nodeDir = join(root, 'DEEP_RESEARCH_HARNESS', 'workflows', 'nodes', 'phases');
  mkdirSync(specDir, { recursive: true });
  mkdirSync(nodeDir, { recursive: true });
  writeFileSync(join(nodeDir, 'phase-demo.md'), '# Phase: Demo\n\n### 3.4 Seed Projection Update\n\n- body\n');
  const refs = good
    ? 'Claims SHALL follow `phase-demo.md` §3.4 for projection updates.'
    : 'Claims SHALL follow `phase-demo.md` §9.9 for projection updates.';
  const retired = good ? 'Those V1 fields SHALL NOT appear in current registered playbooks (retired).' : 'Those V1 fields SHALL be retired from current registered playbooks.';
  writeFileSync(join(specDir, 'spec.md'), `# Demo\n\n## Requirements\n\n### Requirement: Demo\n\n${refs} ${retired}\n`);
  return root;
}

function runChecker(root) {
  try {
    const out = execFileSync(process.execPath, [join(process.cwd(), CHECKER), root], { encoding: 'utf8' });
    return { status: 0, out };
  } catch (err) {
    return { status: err.status, out: String(err.stdout || '') + String(err.stderr || '') };
  }
}

test('clean root passes with zero violations', () => {
  const root = makeRoot(true);
  try {
    const { status, out } = runChecker(root);
    assert.equal(status, 0, out);
    assert.match(out, /0 violations/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing section coordinate and retired prose each produce one file:line root', () => {
  const root = makeRoot(false);
  try {
    const { status, out } = runChecker(root);
    assert.equal(status, 1, out);
    assert.match(out, /section §9\.9 not found in phase-demo\.md/);
    assert.match(out, /SHALL be retired/);
    assert.match(out, /spec\.md:\d+/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
