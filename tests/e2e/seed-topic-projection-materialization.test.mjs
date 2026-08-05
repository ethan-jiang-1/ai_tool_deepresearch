// @impl CTS-004, RRM-002, RRM-007, RWP-016
// Fixture-labeled Agent content is staged through real work-unit and gate CLIs.
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  cleanupRoot,
  createTempRoot,
  instantiateBundle,
  parseJsonOutput,
  readStatus,
  runGate,
  runNode,
  REPO_ROOT,
} from './helpers/deterministic-chain-harness.mjs';
import {
  passAndEnter,
  recordWaveCompletion,
  stageWave0,
  stageWave1,
  stageWave2,
  writePlanAndProfile,
} from './helpers/research-chain-fixture.mjs';

let root;

after(() => cleanupRoot(root));

function advanceToWave0(bundle, stageNext = null) {
  passAndEnter(bundle, 'instantiation-complete', 'phases/phase-instantiation.md', 'hitl1_recorded');
  passAndEnter(bundle, 'hitl1-recorded', 'phases/phase-hitl1.md', 'setup_ready');
  passAndEnter(bundle, 'setup-ready', 'phases/phase-setup.md', 'setup_ready');
  passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', stageNext || undefined);
}

function inspectWave(bundle, wave, expectedStatus = 0) {
  const result = runNode([
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli', `inspect-${wave}-output.mjs`),
    '--bundle', bundle,
  ], { expectedStatus });
  return parseJsonOutput(result);
}

describe('seed-topic projection materialization E2E', () => {
  it('runs Wave0 -> Wave1 -> Wave2 with packet -> inspect -> completion -> gate ordering', () => {
    root = createTempRoot();
    const bundle = instantiateBundle(root, 'projection-chain');
    writePlanAndProfile(bundle);

    advanceToWave0(bundle, () => stageWave0(bundle, 'r1', { completion: false }));
    assert.equal(inspectWave(bundle, 'wave0').check.passed, true);
    recordWaveCompletion(bundle, 'wave0');
    passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete', () => stageWave1(bundle, 'r1', { completion: false }));

    assert.equal(inspectWave(bundle, 'wave1').check.passed, true);
    recordWaveCompletion(bundle, 'wave1');
    passAndEnter(bundle, 'wave1-complete', 'phases/phase-wave1.md', 'wave1_complete', () => stageWave2(bundle, { completion: false }));

    assert.equal(inspectWave(bundle, 'wave2').check.passed, true);
    recordWaveCompletion(bundle, 'wave2');
    passAndEnter(bundle, 'wave2-complete', 'phases/phase-wave2.md', 'wave2_complete');

    const seed = readFileSync(join(bundle, 'seed_topics/topic-a.md'), 'utf8');
    for (const token of [
      '__BACKFILL_WAVE0_EVIDENCE__',
      '__BACKFILL_WAVE1_MECHANISMS__',
      '__BACKFILL_WAVE1_TRENDS__',
      '__BACKFILL_WAVE2_JUDGMENT__',
      '__BACKFILL_PENDING_QUESTIONS__',
    ]) assert.doesNotMatch(seed, new RegExp(token));
    assert.match(seed, /回填卡（只读操作约束，不是 Projection Entry）/);
    assert.equal(readStatus(bundle).current_node, 'phases/phase-hitl2.md');
  });

  it('does not invent a no-demand entry, and blocks generic submitted prose from fatigue degradation', () => {
    root = createTempRoot();
    const bundle = instantiateBundle(root, 'projection-negative');
    writePlanAndProfile(bundle);
    advanceToWave0(bundle);

    const noDemand = inspectWave(bundle, 'wave0', 1);
    assert.equal(noDemand.check.failed_rule_ids.some((id) => id.startsWith('return_map_')), false, JSON.stringify(noDemand.inspect));

    stageWave0(bundle, 'negative', { project: false, completion: false });
    const seedPath = join(bundle, 'seed_topics/topic-a.md');
    writeFileSync(seedPath, readFileSync(seedPath, 'utf8').replace(
      '__BACKFILL_WAVE0_EVIDENCE__',
      'Wave0 submitted',
    ));
    recordWaveCompletion(bundle, 'wave0');

    const result = runNode([
      join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs'),
      '--bundle', bundle,
      '--current-node', 'phases/phase-wave0.md',
      '--attempt', '3',
    ], { expectedStatus: 1 });
    const output = parseJsonOutput(result);
    assert.equal(output.check.passed, false);
    assert.notEqual(output.check.degraded, true);
    assert.ok(output.check.failed_rule_ids.includes('seed_projection_generic_prose'), JSON.stringify(output.inspect));
    assert.ok(output.inspect.some((line) => line.includes('[degraded_not_eligible]')), JSON.stringify(output.inspect));
  });
});
