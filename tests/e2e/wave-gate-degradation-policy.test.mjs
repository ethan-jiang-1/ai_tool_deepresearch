// @impl GSK-013, RWG-021
// Deterministic disposable-bundle proof of active Wave2 fail-closed policy.
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { readGateDefinitionSnapshot } from '../../DPT_FRAMEWORK/schema/contracts/gate-definition.mjs';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from '../integration/cli/handoff-fixtures.mjs';

const REPO_ROOT = process.cwd();
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const WAVE2_GATE = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function createBundle() {
  const name = `e2e_wave_degradation_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const result = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], {
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const bundle = result.stdout.trim();
  createdDirs.push(bundle);
  setStatusWindow(bundle, 'wave1_complete', 'wave2_complete');
  writeTraceEvents(bundle, witnessedHandoffEvents({
    sourceGate: 'wave1-complete',
    phase: 'wave1',
    sourceNode: 'phases/phase-wave1.md',
    targetNode: 'phases/phase-wave2.md',
  }));
  return bundle;
}

function runWave2Gate(bundle) {
  return spawnSync('node', [
    WAVE2_GATE,
    '--bundle', bundle,
    '--current-node', 'phases/phase-wave2.md',
    '--attempt', '3',
  ], { encoding: 'utf8', timeout: 15000 });
}

describe('Wave degradation policy', () => {
  after(() => createdDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it('keeps active Wave2 authority and structural failures fail-closed after fatigue threshold', () => {
    const definition = readGateDefinitionSnapshot(new URL(
      '../../DPT_FRAMEWORK/schema/gate_definitions/gate-wave2-complete.definition.json',
      import.meta.url,
    )).definition;
    assert.equal(definition.rules.some((rule) => rule.degradation_eligible === true), false);

    const bundle = createBundle();
    const result = runWave2Gate(bundle);
    assert.equal(result.status, 1, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.notEqual(output.check.degraded, true);
    assert.equal(output.inspect.some((line) => line.includes('[degraded_not_eligible]')), true);
    assert.equal(output.check.failed_rule_ids.length > 0, true);

    const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8');
    assert.match(trace, /"gate":"wave2-complete"/);
    assert.doesNotMatch(trace, /"degraded":true/);
  });
});
