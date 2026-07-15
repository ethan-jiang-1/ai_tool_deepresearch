// @impl VER-002, VER-003
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { VerificationRoutingPlanSchema } from '../../openspec/governance/verification-routing-contract.mjs';

const PROFILES = {
  unit: { fixture: 'none', subject_execution: 'none', runtime: 'none', external_calls: 'none', verdict_judge: 'deterministic' },
  integration: { fixture: 'fixture_backed', subject_execution: 'none', runtime: 'temporary_bundle', external_calls: 'none', verdict_judge: 'deterministic' },
  deterministic_e2e: { fixture: 'fixture_backed', subject_execution: 'simulated_agent_actions', runtime: 'temporary_bundle', external_calls: 'none', verdict_judge: 'deterministic' },
  agent_flow_e2e: { fixture: 'setup_only', subject_execution: 'real_agent', runtime: 'real_disposable_bundle', external_calls: 'none', verdict_judge: 'deterministic' },
};

function claim(testClass, overrides = {}) {
  const paths = {
    unit: 'tests/governance/example.test.mjs',
    integration: 'tests/integration/governance/example.test.mjs',
    deterministic_e2e: 'tests/e2e/example.test.mjs',
    agent_flow_e2e: 'experiments_playbook/exp_example/case-11-heavy-example.md',
  };
  return {
    id: `${testClass.replaceAll('_', '-')}-claim`,
    statement: `Prove ${testClass}.`,
    test_class: testClass,
    proof_subject: testClass === 'agent_flow_e2e' ? 'agent_behavior' : 'deterministic_contract',
    asset: { kind: testClass === 'agent_flow_e2e' ? 'markdown_playbook' : 'node_test', path: paths[testClass] },
    execution_profile: { ...PROFILES[testClass] },
    verdict_authority: testClass === 'agent_flow_e2e' ? 'trace_jsonl' : 'node_test_exit',
    ...overrides,
  };
}

function plan(claims = ['unit', 'integration', 'deterministic_e2e', 'agent_flow_e2e'].map((item) => claim(item))) {
  return {
    schema_version: 'verification-routing/v1',
    change: 'example-change',
    test_classes: Object.fromEntries(['unit', 'integration', 'deterministic_e2e', 'agent_flow_e2e'].map((testClass) => [testClass, {
      status: claims.some((item) => item.test_class === testClass) ? 'selected' : 'not_applicable',
      rationale: `${testClass} decision`,
    }])),
    claims,
  };
}

function issues(value) {
  const result = VerificationRoutingPlanSchema.safeParse(value);
  assert.equal(result.success, false, 'expected route plan to fail');
  return result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
}

describe('verification-routing/v1 contract', () => {
  it('accepts all four canonical route tuples', () => {
    assert.equal(VerificationRoutingPlanSchema.safeParse(plan()).success, true);
  });

  it('rejects missing and extra test classes', () => {
    const missing = plan();
    delete missing.test_classes.unit;
    assert.match(issues(missing), /test_classes\.unit/);
    const extra = plan();
    extra.test_classes.regression = { status: 'selected', rationale: 'legacy' };
    assert.match(issues(extra), /test_classes: Unrecognized key/);
  });

  it('requires selected classes to have claims and not_applicable classes to have none', () => {
    const selectedEmpty = plan([]);
    selectedEmpty.test_classes.unit.status = 'selected';
    assert.match(issues(selectedEmpty), /test_classes\.unit\.status: selected test class requires/);
    const notApplicableClaim = plan([claim('unit')]);
    notApplicableClaim.test_classes.unit.status = 'not_applicable';
    assert.match(issues(notApplicableClaim), /test_classes\.unit\.status: not_applicable test class must have no claims/);
  });

  it('rejects duplicate ids and empty claim statements', () => {
    const duplicate = claim('integration', { id: 'unit-claim' });
    assert.match(issues(plan([claim('unit'), duplicate])), /claim id must be unique/);
    assert.match(issues(plan([claim('unit', { statement: '  ' })])), /claims\.0\.statement/);
  });

  it('rejects redundant and result-bearing route fields', () => {
    const value = plan();
    value.method = 'regression';
    value.claims[0].passed = true;
    const output = issues(value);
    assert.match(output, /Unrecognized key/);
  });

  it('rejects wrong class profile, asset, and verdict combinations', () => {
    assert.match(issues(plan([claim('unit', { execution_profile: PROFILES.integration })])), /route tuple is incompatible/);
    assert.match(issues(plan([claim('integration', { asset: { kind: 'markdown_playbook', path: 'tests\/integration\/bad.test.mjs' } })])), /route tuple is incompatible/);
    assert.match(issues(plan([claim('deterministic_e2e', { verdict_authority: 'trace_jsonl' })])), /route tuple is incompatible/);
  });

  it('allows deterministic, real-human, and AI-judge Agent-flow provenance only on compatible claims', () => {
    const deterministic = claim('agent_flow_e2e');
    const human = claim('agent_flow_e2e', { id: 'human-claim', asset: { kind: 'markdown_playbook', path: 'experiments_playbook/exp_example/case-901-heavy-human.md' }, execution_profile: { ...PROFILES.agent_flow_e2e, verdict_judge: 'real_human' } });
    const ai = claim('agent_flow_e2e', { id: 'ai-claim', asset: { kind: 'markdown_playbook', path: 'experiments_playbook/exp_example/case-951-heavy-ai.md' }, execution_profile: { ...PROFILES.agent_flow_e2e, verdict_judge: 'ai_judge' } });
    assert.equal(VerificationRoutingPlanSchema.safeParse(plan([deterministic, human, ai])).success, true);
    const invalid = claim('agent_flow_e2e', { proof_subject: 'deterministic_contract', execution_profile: { ...PROFILES.agent_flow_e2e, subject_execution: 'none', fixture: 'fixture_backed', verdict_judge: 'ai_judge' } });
    assert.match(issues(plan([invalid])), /route tuple is incompatible/);
  });

  it('allows identical shared asset identities and rejects conflicting ones', () => {
    const first = claim('unit');
    const same = claim('unit', { id: 'second-unit-claim' });
    assert.equal(VerificationRoutingPlanSchema.safeParse(plan([first, same])).success, true);
    const conflict = claim('integration', { id: 'conflict-claim', asset: { kind: 'node_test', path: first.asset.path } });
    const output = issues(plan([first, conflict]));
    assert.match(output, /path does not match integration ownership boundary/);
    assert.match(output, /shared asset path has a conflicting route identity/);
  });

  it('rejects unsafe and wrong-boundary paths at the nearest field', () => {
    assert.match(issues(plan([claim('unit', { asset: { kind: 'node_test', path: '../escape.test.mjs' } })])), /claims\.0\.asset\.path/);
    assert.match(issues(plan([claim('unit', { asset: { kind: 'node_test', path: 'tests/integration/wrong.test.mjs' } })])), /unit ownership boundary/);
    assert.match(issues(plan([claim('integration', { asset: { kind: 'node_test', path: 'tests\\integration\\wrong.test.mjs' } })])), /POSIX repository-relative path/);
  });
});
