// @impl GSK-002, REI-003, REI-005, POF-001, POF-003

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { inspectPostFinalRecovery } from '../../../DPT_FRAMEWORK/engine/helpers/post-final-recovery.mjs';
import { createTerminalFinalBundle } from './post-final-recovery-fixture.mjs';

const REPO_ROOT = resolve('.');
const DEFINITION_PATH = join(REPO_ROOT, 'DPT_FRAMEWORK/schema/gate_definitions/gate-rerun-ready.definition.json');
const GATE_PATH = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs');
const C5_PATH = join(REPO_ROOT, 'DPT_FRAMEWORK/engine/helpers/post-final-recovery.mjs');
const roots = [];

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop(), { recursive: true, force: true });
});

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function runGate(bundle) {
  try {
    return JSON.parse(execFileSync(process.execPath, [
      GATE_PATH,
      '--bundle', bundle,
      '--current-node', 'phases/phase-rerun.md',
    ], { cwd: REPO_ROOT, encoding: 'utf8' }));
  } catch (error) {
    return JSON.parse(error.stdout);
  }
}

function gateBundle(name, profileYaml) {
  const root = mkdtempSync(join(tmpdir(), 'rerun-availability-gate-'));
  roots.push(root);
  const bundle = createTerminalFinalBundle(root, name);
  writeFileSync(join(bundle, 'rb_profile.yaml'), profileYaml);
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    bundle: name,
    current_mode: 'execution',
    state: 'in_progress',
    current_gate: 'hitl2_recorded',
    next_gate: 'rerun_ready',
    current_node: 'phases/phase-rerun.md',
  }));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), [
    { ts: '2026-01-01T00:00:00.000Z', event: 'gate_attempt', gate: 'hitl2-recorded', passed: true, currentNodeRef: 'phases/phase-hitl2.md', next: 'phases/phase-rerun.md' },
    { ts: '2026-01-01T00:00:01.000Z', event: 'load_complete', entry: 'phases/phase-rerun.md', handoff_source_gate: 'hitl2-recorded', handoff_source_node: 'phases/phase-hitl2.md', handoff_target_node: 'phases/phase-rerun.md', handoff_source_attempt_index: 0 },
  ].map(JSON.stringify).join('\n') + '\n');
  return bundle;
}

describe('rerun availability consumers', () => {
  it('formal Gate and C5 import the shared evaluator with their explicit modes', () => {
    const gateSource = readFileSync(GATE_PATH, 'utf8');
    const c5Source = readFileSync(C5_PATH, 'utf8');
    assert.match(gateSource, /evaluateRerunAvailability/);
    assert.match(gateSource, /includeNextIncrement:\s*false/);
    assert.match(c5Source, /evaluateRerunAvailability/);
    assert.match(c5Source, /includeNextIncrement:\s*true/);
    assert.doesNotMatch(gateSource, /count\s*>=\s*rule\.value/);
    assert.doesNotMatch(c5Source, /next_count\s*>=\s*facts\.guard\.limit/);
  });

  it('missing and unparseable profile mask dependent rationale/count hints', () => {
    for (const [name, yaml] of [['missing-parent', 'plan_basename: missing-parent\n'], ['unparseable', 'human_decision_checkpoints: [\n']]) {
      const result = runGate(gateBundle(name, yaml));
      assert.equal(result.check.passed, false);
      assert.deepEqual(result.hints.map((hint) => hint.rule_id), ['rerun_profile_prerequisite']);
      assert.ok(result.check.masked_rule_ids.includes('rerun_rationale_present'));
      assert.ok(result.check.masked_rule_ids.includes('rerun_count_valid'));
    }
  });

  it('C5 preserves its validated envelope and exact definition snapshot while using next-count eligibility', () => {
    const root = mkdtempSync(join(tmpdir(), 'rerun-availability-c5-'));
    roots.push(root);
    const definitionBefore = readFileSync(DEFINITION_PATH);
    const bundle = createTerminalFinalBundle(root, 'fresh', { rerunCount: 0 });
    const inspection = inspectPostFinalRecovery({ bundlePath: bundle });

    assert.equal(inspection.schema_version, '1.0.0');
    assert.equal(inspection.operation, 'inspect');
    assert.equal(inspection.verdict, 'eligible');
    assert.equal(inspection.reason_code, 'eligible');
    assert.equal(inspection.next_action.kind, 'prepare_request');
    assert.equal(inspection.facts.request_bindings.expected_final_lineage.rerun_guard.definition_sha256, digest(definitionBefore));
    assert.deepEqual(readFileSync(DEFINITION_PATH), definitionBefore);
  });
});
