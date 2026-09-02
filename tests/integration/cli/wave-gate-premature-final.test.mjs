// @impl RWG-023
// Wave gate premature canonical Final presence root, integration coverage for
// all three wave gates: blocking failure with the single relocation remediation,
// clearing after relocation, and the covered-file exemptions (legacy base,
// prior-lineage Final entry). The gate never mutates the premature file.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';
import { evaluatePrematureFinalPresence } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs';

const REPO_ROOT = process.cwd();
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

let templateOk = false;
before(() => {
  const r = spawnSync('node', [NEW_BUNDLE, 'premature-template', '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  templateOk = r.status === 0 && r.stdout.trim().length > 0;
  if (templateOk) createdDirs.push(r.stdout.trim());
});

after(() => {
  for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
});

const GATES = [
  { phase: 'wave0', node: 'phases/phase-wave0.md', sourceGate: 'seed-topics-ready', sourceNode: 'phases/phase-seed-topics.md', phaseKey: 'seed-topics', current: 'seed_topics_ready', next: 'wave0_complete' },
  { phase: 'wave1', node: 'phases/phase-wave1.md', sourceGate: 'wave0-complete', sourceNode: 'phases/phase-wave0.md', phaseKey: 'wave0', current: 'wave0_complete', next: 'wave1_complete' },
  { phase: 'wave2', node: 'phases/phase-wave2.md', sourceGate: 'wave1-complete', sourceNode: 'phases/phase-wave1.md', phaseKey: 'wave1', current: 'wave1_complete', next: 'wave2_complete' },
];

function unique(prefix) {
  return `rt_premature_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function freshBundle(label) {
  const r = spawnSync('node', [NEW_BUNDLE, unique(label), '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  if (r.status !== 0) throw new Error(`bundle clone failed: ${r.stderr}`);
  const dir = r.stdout.trim();
  createdDirs.push(dir);
  return dir;
}

function runGate(gate, bundle) {
  return spawnSync('node', [join(REPO_ROOT, `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-${gate.phase}-complete.mjs`), '--bundle', bundle, '--current-node', gate.node], { encoding: 'utf-8', timeout: 10000 });
}

function preparedBundle(gate, label) {
  const bundle = freshBundle(label);
  setStatusWindow(bundle, gate.current, gate.next);
  writeTraceEvents(bundle, witnessedHandoffEvents({
    sourceGate: gate.sourceGate,
    sourceNode: gate.sourceNode,
    targetNode: gate.node,
    phase: gate.phaseKey,
  }));
  return bundle;
}

describe('wave gate premature final presence root', { concurrency: false }, () => {
  it('template clone is available', () => {
    assert.equal(templateOk, true, 'expected disposable bundle template to instantiate');
  });

  for (const gate of GATES) {
    it(`blocks the ${gate.phase} gate on an uncovered canonical primary-series file without mutating it`, () => {
      const bundle = preparedBundle(gate, `premature_${gate.phase}`);
      const prematurePath = join(bundle, 'final/final.md');
      writeFileSync(prematurePath, '# hand-written final\n');
      const before = readFileSync(prematurePath, 'utf-8');

      const run = runGate(gate, bundle);
      assert.equal(run.status, 1, run.stdout + run.stderr);
      const output = JSON.parse(run.stdout);
      assert.equal(output.check.passed, false);
      assert.match(output.inspect.join('\n'), /premature_final_present/);
      assert.match(output.advice.join('\n'), /final\/attic-<original-name>/);
      assert.match(output.advice.join('\n'), /Do not bypass the phase/);
      assert.doesNotMatch(output.advice.join('\n'), /ask the user|progress report|partial delivery|skip (to|the) (final|report)/);
      assert.equal(readFileSync(prematurePath, 'utf-8'), before);
    });

    it(`clears the premature root for ${gate.phase} after relocation out of canonical naming`, () => {
      const bundle = preparedBundle(gate, `premature_${gate.phase}_relocate`);
      const canonical = join(bundle, 'final/final.md');
      writeFileSync(canonical, '# hand-written final\n');
      assert.equal(evaluatePrematureFinalPresence(bundle).hit, true);

      writeFileSync(join(bundle, 'final/attic-final.md'), readFileSync(canonical, 'utf-8'));
      rmSync(canonical);
      assert.equal(evaluatePrematureFinalPresence(bundle).hit, false);
    });
  }

  it('does not fail for a single legacy base under explicit legacy compatibility', () => {
    const bundle = freshBundle('premature_legacy');
    mkdirSync(join(bundle, 'final'), { recursive: true });
    writeFileSync(join(bundle, 'final/report.md'), '# legacy v0\n');
    assert.equal(evaluatePrematureFinalPresence(bundle).hit, false);
  });

  it('does not fail for prior-lineage Final files once a route-bound legal Final entry exists', () => {
    const bundle = freshBundle('premature_prior_lineage');
    setStatusWindow(bundle, 'wave0_complete', 'wave1_complete');
    writeFileSync(join(bundle, 'final/final.md'), '# prior lineage final\n');
    writeTraceEvents(bundle, [
      ...witnessedHandoffEvents({ sourceGate: 'readiness-passed', sourceNode: 'phases/phase-readiness.md', targetNode: 'phases/phase-final.md', phase: 'readiness' }),
      ...witnessedHandoffEvents({
        sourceGate: 'wave0-complete',
        sourceNode: 'phases/phase-wave0.md',
        targetNode: 'phases/phase-wave1.md',
        phase: 'wave0',
        sourceTs: '2026-01-01T00:10:00.000Z',
        loadTs: '2026-01-01T00:10:01.000Z',
        sourceAttemptIndex: 1,
      }),
    ]);
    assert.equal(evaluatePrematureFinalPresence(bundle).hit, false);
  });
});
