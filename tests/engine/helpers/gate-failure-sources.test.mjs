// @impl GSK-002, GSK-004, GSK-011
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  buildGateResult,
  checkNodeGateBinding,
  parseGateCliArgs,
  resolveRouting,
  tryLoadGateDefinition,
  writeGateAttempt,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs';
import { checkPhaseHandoffPreflight } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs';
import { inspectCanonicalTopicState } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';

const originalArgv = [...process.argv];
const tempRoots = [];

function tempBundle(label) {
  const dir = mkdtempSync(join(tmpdir(), `dpt_disp_${label}-`));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  process.argv = [...originalArgv];
  while (tempRoots.length > 0) rmSync(tempRoots.pop(), { recursive: true, force: true });
});

function assertClosedFinding(finding) {
  assert.equal(finding.finding_source, 'checker');
  assert.ok(finding.rule_id);
  assert.ok(finding.blocking_basis);
  assert.ok(finding.repair_kind);
  assert.ok(finding.missing_fact);
  assert.ok(finding.write_to);
}

describe('Gate helper failure-source findings', () => {
  it('invocation parser owns missing-argument findings and compatibility projection', () => {
    process.argv = ['node', 'check-gate-test.mjs'];
    const missingBundle = parseGateCliArgs();
    assert.equal(missingBundle.error.routing.kind, 'invalid_input');
    assert.equal(missingBundle.error.hints[0].rule_id, 'gate_invocation_bundle_required');
    assert.ok(missingBundle.error.inspect[0].includes('Missing required argument'));

    process.argv = ['node', 'check-gate-test.mjs', '--bundle', '/tmp/example'];
    const missingNode = parseGateCliArgs();
    assert.equal(missingNode.error.hints[0].rule_id, 'gate_invocation_current_node_required');
    assert.equal(missingNode.error.hints[0].repair_kind, 'engine_operation');
  });

  it('safe definition loader owns configuration-integrity finding', () => {
    const loaded = tryLoadGateDefinition('definitely-missing-gate', 'phases/phase-wave0.md');
    assert.equal(loaded.definition, null);
    assert.equal(loaded.error.routing.kind, 'config_error');
    assert.equal(loaded.error.hints[0].rule_id, 'gate_definition_contract_invalid');
    assert.equal(loaded.error.hints[0].repair_kind, 'missing_contract');
  });

  it('node/gate binding helper owns mismatch finding while legacy validator can project reason', () => {
    const result = checkNodeGateBinding('phases/phase-wave0.md', 'wave1-complete');
    assert.equal(result.ok, false);
    assertClosedFinding(result.finding);
    assert.equal(result.finding.rule_id, 'gate_node_binding_mismatch');
    assert.ok(result.reason.includes('binding mismatch'));
    assert.ok(result.advice[0].includes('phase-wave1.md'));
    const projected = buildGateResult({
      passed: false,
      gate: 'wave1-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: { kind: 'invalid_input', next: null, detail: result.reason },
      findings: result.findings,
      bundlePath: '/tmp/dpt_rb_example',
    });
    assert.match(projected.hints[0].rerun, /--current-node phases\/phase-wave1\.md$/);
  });

  it('handoff/status helper owns preflight root metadata', () => {
    const bundle = tempBundle('handoff-finding');
    const result = checkPhaseHandoffPreflight(bundle, 'phases/phase-wave1.md');
    assert.equal(result.ok, false);
    assertClosedFinding(result.finding);
    assert.equal(result.finding.rule_id, 'handoff_preflight_inputs_invalid');
    assert.deepEqual(result.inspect, [result.finding.detail]);
  });

  it('canonical topic-state prerequisite exposes its detecting finding', () => {
    const bundle = tempBundle('topic-prerequisite');
    const result = inspectCanonicalTopicState({ bundlePath: bundle });
    assert.equal(result.passed, false);
    const finding = result.blockers[0].finding;
    assertClosedFinding(finding);
    assert.equal(finding.rule_id, 'canonical_topic_state_prerequisite');
    assert.match(finding.missing_fact, /plan_missing/);
  });

  it('routing helper attaches a non-output structured finding to routing failures', () => {
    const routing = resolveRouting('/definitely/missing/transitions.chain.json', 'phases/phase-wave0.md', 'passed');
    assert.equal(routing.kind, 'config_error');
    assertClosedFinding(routing.finding);
    assert.equal(routing.finding.rule_id, 'gate_routing_configuration_invalid');
    assert.equal(Object.keys(routing).includes('finding'), false);
  });

  it('strict trace durability errors carry the detecting finding', () => {
    const bundle = tempBundle('trace-durability');
    mkdirSync(join(bundle, 'rb_trace.jsonl'));
    const result = buildGateResult({
      passed: true,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: { kind: 'next', next: 'phases/phase-wave1.md' },
    });
    assert.throws(
      () => writeGateAttempt(bundle, result, { strictTrace: true }),
      (error) => {
        assertClosedFinding(error.finding);
        assert.equal(error.finding.rule_id, 'gate_attempt_trace_not_durable');
        assert.equal(error.finding.repair_kind, 'missing_contract');
        assert.deepEqual(error.inspect, [error.finding.detail]);
        return true;
      },
    );
  });
});
