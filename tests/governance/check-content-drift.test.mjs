// check-content-drift.test.mjs
// Unit truth tables for the content-drift checker rules, run against fixture
// trees. @impl RET-006

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const CHECKER = join(REPO_ROOT, 'openspec/governance/check-content-drift.mjs');

function runChecker(root) {
  return spawnSync(process.execPath, [CHECKER, root], { encoding: 'utf8' });
}

// Every file is written loop-style (mkdir dirname + write immediately),
// which is the reliable pattern for the file sandbox.
function fixtureTree(files) {
  const dir = mkdtempSync(join(tmpdir(), 'drift-fixture-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  return dir;
}

describe('check-content-drift rule truth tables', () => {
  it('accepts an existing path reference and rejects a missing one with the file and ref named', () => {
    const dir = fixtureTree({
      'openspec/guidance/models/model.md': [
        'Read `DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs` and',
        '`openspec/specs/governance/requirement-traceability/spec.md` and',
        '`openspec/guidance/missing.md`.',
      ].join('\n'),
      'DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs': 'export const x = 1;\n',
      'openspec/specs/governance/requirement-traceability/spec.md': '# Spec\n',
    });
    try {
      const result = runChecker(dir);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /openspec\/guidance\/models\/model\.md/);
      assert.match(result.stderr, /openspec\/guidance\/missing\.md/);
      assert.doesNotMatch(result.stderr, /operate-queue\.mjs/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips bundle-runtime paths, template placeholders, globs, anchors, and capability paths', () => {
    const dir = fixtureTree({
      'openspec/specs/engine/sample/spec.md': [
        'Bundle runtime `rb_queue.json` and `_work_units/wu/status.json` are fine.',
        'Template `cli/<tool>.mjs` and glob `DEEP_RESEARCH_HARNESS/engine/*.mjs` are fine.',
        'Anchor `DEEP_RESEARCH_HARNESS/engine/queue-manager-core.mjs#StopAuthorizationState` is fine.',
        'Capability path `engine/schema-core` is fine.',
      ].join('\n'),
      'DEEP_RESEARCH_HARNESS/engine/queue-manager-core.mjs': 'export const x = 1;\n',
    });
    try {
      const result = runChecker(dir);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('gate coverage fails when a definition lacks a summary row and vice versa', () => {
    const dir = fixtureTree({
      'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-gate-rules.md': [
        '| Gate | 保护什么 | 检查方向 | Repair Posture |',
        '|------|---------|---------|----------------|',
        '| `wave0-complete` | x | y | z |',
        '| `ghost-gate` | x | y | z |',
      ].join('\n'),
      'DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave0-complete.definition.json': JSON.stringify({
        gate: 'wave0-complete', description: 'd', rules: [],
      }),
      'DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave1-complete.definition.json': JSON.stringify({
        gate: 'wave1-complete', description: 'd', rules: [],
      }),
    });
    try {
      const result = runChecker(dir);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /no summary row for gate definition wave1-complete/);
      assert.match(result.stderr, /lists gate ghost-gate with no gate definition file/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CLI verb references must appear in the tool source', () => {
    const dir = fixtureTree({
      'DEEP_RESEARCH_HARNESS/COMMANDS.md': '`operate-queue.mjs submit` and `operate-queue.mjs nope` are documented.',
      'DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs': "const verb = 'submit';\n",
    });
    try {
      const result = runChecker(dir);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /documents verb nope for operate-queue\.mjs/);
      assert.doesNotMatch(result.stderr, /submit/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('machine-covered prohibition phrasing is rejected when the phase loads no shared anti-cheating owner', () => {
    const dir = fixtureTree({
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-setup.md': [
        '---',
        'node_type: phase',
        'id: phase-setup',
        'phase: setup',
        'gate: setup-ready',
        'stop: "no"',
        'requires: []',
        'suggested_context: []',
        '---',
        '# Phase: Setup',
        '',
        '## 1. Stage Goal',
        '',
        '禁止手写 ledger rows 或 trace events 冒充 pass。',
        '',
        '## 9. Anti-Cheating Rules',
        '',
        '本 phase 特有条目。',
      ].join('\n'),
    });
    try {
      const result = runChecker(dir);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /machine-covered prohibition phrasing "禁止手写"/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('machine-covered prohibition phrasing is allowed when the phase loads the shared anti-cheating owner in requires', () => {
    const dir = fixtureTree({
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-setup.md': [
        '---',
        'node_type: phase',
        'id: phase-setup',
        'phase: setup',
        'gate: setup-ready',
        'stop: "no"',
        'requires:',
        '  - shared/shared-anti-cheating-rules',
        'suggested_context: []',
        '---',
        '# Phase: Setup',
        '',
        '## 1. Stage Goal',
        '',
        '禁止手写 ledger rows 或 trace events 冒充 pass。',
        '',
        '## 9. Anti-Cheating Rules',
        '',
        '本 phase 特有条目。',
      ].join('\n'),
    });
    try {
      const result = runChecker(dir);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
