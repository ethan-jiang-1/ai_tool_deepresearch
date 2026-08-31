// gate-chain-prose-guard.test.mjs
// Unit contract for check-gate-chain-prose.mjs: deterministic pass on the
// real tree, deterministic fail on a mis-ordered arrow chain (naming file,
// line, and sequence), pass for a pointer that names the single-source
// files, and proof that the gate enum set is derived from the manifest
// rather than a checker-local inventory. Fail-closed on a missing manifest.
// @impl CHF-003 (gate-chain-prose finalizer check)

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const CHECKER = join(REPO_ROOT, 'openspec/governance/check-gate-chain-prose.mjs');
const createdRoots = [];

function run(root) {
  return spawnSync(process.execPath, [CHECKER, root], { encoding: 'utf8', timeout: 30000 });
}

function write(root, rel, content) {
  const target = join(root, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

function fixtureRoot(manifestJson) {
  const root = mkdtempSync(join(tmpdir(), 'gate-chain-prose-'));
  createdRoots.push(root);
  if (manifestJson !== null) {
    write(root, 'DEEP_RESEARCH_HARNESS/workflows/manifest.json', JSON.stringify(manifestJson));
  }
  return root;
}

const THREE_GATE_MANIFEST = {
  phases: [
    { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
    { key: 'wave1', node: 'phases/phase-wave1.md', gate: 'wave1-complete' },
    { key: 'hitl1', node: 'phases/phase-hitl1.md', gate: 'hitl1-recorded' },
  ],
};

after(() => {
  for (const root of createdRoots) rmSync(root, { recursive: true, force: true });
});

describe('check-gate-chain-prose', () => {
  it('passes on the real tree (guidance prose carries no handwritten gate chain)', () => {
    const result = run(REPO_ROOT);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });

  it('fails a mis-ordered arrow chain and names file, line, and sequence', () => {
    const root = fixtureRoot(THREE_GATE_MANIFEST);
    write(root, 'DEEP_RESEARCH_HARNESS/COMMANDS.md', [
      '# Commands',
      '',
      '推进链：`wave0-complete` → `wave1-complete` → `hitl1-recorded`。',
      '',
    ].join('\n'));
    const result = run(root);
    assert.equal(result.status, 1);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.match(output, /COMMANDS\.md:3/);
    assert.match(output, /wave0-complete/);
    assert.match(output, /hitl1-recorded/);
  });

  it('passes a pointer naming the single-source files without enumerating gates', () => {
    const root = fixtureRoot(THREE_GATE_MANIFEST);
    write(
      root,
      'DEEP_RESEARCH_HARNESS/COMMANDS.md',
      'gate 全集与推进序的单一真相源是 `workflows/manifest.json` + `workflows/transitions.chain.json`。\n',
    );
    const result = run(root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });

  it('passes a repeated single gate value (no distinct progression)', () => {
    const root = fixtureRoot(THREE_GATE_MANIFEST);
    write(
      root,
      'DEEP_RESEARCH_HARNESS/COMMANDS.md',
      '同值重复 `wave0-complete` → `wave0-complete` 不构成推进链。\n',
    );
    const result = run(root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });

  it('derives the gate enum set from the manifest, not a local inventory', () => {
    const root = fixtureRoot({
      phases: [{ key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' }],
    });
    // `wave1-complete` is not declared by this manifest, so the line carries
    // only one distinct declared gate enum and must pass.
    write(root, 'DEEP_RESEARCH_HARNESS/COMMANDS.md', '推进链：`wave0-complete` → `wave1-complete`。\n');
    const result = run(root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });

  it('is fail-closed when the manifest is missing', () => {
    const root = fixtureRoot(null);
    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(`${result.stdout}${result.stderr}`, /manifest/);
  });
});
