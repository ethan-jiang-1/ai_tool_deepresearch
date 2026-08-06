// @impl RET-003, RET-006
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(ROOT, 'tests', '.test-tmp');
const CHECK = join(ROOT, 'openspec/governance/check-capability-discovery.mjs');

function proposal({ heading = true, row, skip = null } = {}) {
  const lines = [
    '# Proposal',
    '',
    ...(skip ? [skip, ''] : []),
    ...(heading ? [
      '## Capability Discovery',
      '',
      '| Candidate path | Evidence read | Decision | Reason |',
      '| --- | --- | --- | --- |',
      ...(row === null ? [] : [row ?? '| agent/demo-capability | Current main spec | Modify | Existing behavior owns the requested change. |']),
    ] : []),
    '',
  ];
  return lines.join('\n');
}

function withFixture(content, callback) {
  const root = mkdtempSync(join(TMP, 'discovery-'));
  try {
    const path = join(root, 'openspec/changes/demo-change/proposal.md');
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function run(root) {
  return spawnSync(process.execPath, [CHECK, '--change', 'demo-change'], {
    cwd: root,
    encoding: 'utf8',
  });
}

describe('capability discovery governance check', () => {
  it('accepts a complete discovery record without judging the decision', () => withFixture(proposal(), (root) => {
    const result = run(root);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }));

  it('accepts an inline-code candidate path', () => withFixture(proposal({
    row: '| `agent/demo-capability` | Current main spec | Modify | Existing behavior owns the requested change. |',
  }), (root) => {
    const result = run(root);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }));

  it('rejects a missing discovery heading', () => withFixture(proposal({ heading: false }), (root) => {
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /missing the ## Capability Discovery heading/);
  }));

  it('rejects a non-canonical candidate path', () => withFixture(proposal({
    row: '| demo-capability | Current main spec | Modify | Existing behavior owns the requested change. |',
  }), (root) => {
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /invalid candidate path demo-capability/);
  }));

  it('rejects an unsupported disposition', () => withFixture(proposal({
    row: '| agent/demo-capability | Current main spec | Reuse | Existing behavior owns the requested change. |',
  }), (root) => {
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /unsupported Decision Reuse/);
  }));

  it('rejects a missing reason', () => withFixture(proposal({
    row: '| agent/demo-capability | Current main spec | Modify |  |',
  }), (root) => {
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /has no Reason/);
  }));

  it('accepts a skip_specs record with an explicit non-applicability reason', () => withFixture(proposal({
    row: null,
    skip: 'skip_specs: true — No delta-spec applicability because this change alters no accepted behavior.',
  }), (root) => {
    const result = run(root);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }));

  it('rejects skip_specs without an explicit non-applicability reason', () => withFixture(proposal({
    row: null,
    skip: 'skip_specs: true',
  }), (root) => {
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /requires a non-empty delta-spec non-applicability reason/);
  }));
});
