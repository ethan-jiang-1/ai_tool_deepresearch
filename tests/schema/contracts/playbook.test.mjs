import { describe, it } from 'node:test';
// @impl AGT-005, AGT-006, AGT-007, EXA-004, PLR-001, VER-006
import assert from 'node:assert/strict';
import { PlaybookFrontmatterSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/playbook.mjs';

const VALID = {
  schema: 'command-experiment/v2',
  experiment: 'gate-fork',
  case: 'case-11-light-four-returns',
  case_goal: 'Verify forkGate four returns.',
  verdict_mode: 'all',
  required_checks: ['branch', 'schema_fail'],
  bundle_roles: ['verdict'],
  verdict_role: 'verdict',
  health_roles: ['verdict'],
  health_profile: 'light',
  durable_evidence_roles: [],
  proof_subject: 'deterministic_contract',
  subject_execution: 'none',
  fixture: 'fixture_backed',
  runtime: 'real_disposable_bundle',
  external_calls: 'none',
  verdict_judge: 'deterministic',
};

describe('PlaybookFrontmatterSchema command-experiment/v2', () => {
  it('accepts the closed deterministic contract', () => {
    assert.ok(PlaybookFrontmatterSchema.safeParse(VALID).success);
  });

  it('accepts optional requirement refs and not-run explanation', () => {
    const parsed = PlaybookFrontmatterSchema.parse({ ...VALID, req: 'AGQ-006, EXA-005', not_run_if: 'required actor unavailable' });
    assert.equal(parsed.not_run_if, 'required actor unavailable');
  });

  it('accepts neutral regression authoring advice only in its legal shape', () => {
    const reviewed = PlaybookFrontmatterSchema.parse({
      ...VALID,
      regression_recommendation: 'recommended',
      regression_retry_safety: 'reviewed',
    });
    assert.equal(reviewed.regression_recommendation, 'recommended');
    assert.equal(reviewed.regression_retry_safety, 'reviewed');
    assert.equal(PlaybookFrontmatterSchema.parse(VALID).regression_recommendation, undefined);
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, verdict_mode: 'last', regression_retry_safety: 'reviewed' }).success);
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, regression_recommendation: 'preferred' }).success);
  });

  it('accepts an Agent-behavior profile with durable evidence', () => {
    assert.ok(PlaybookFrontmatterSchema.safeParse({
      ...VALID,
      case: 'case-406-heavy-real-subagent-boundary',
      health_profile: 'heavy',
      durable_evidence_roles: ['subject_task', 'subject_result'],
      proof_subject: 'agent_behavior',
      subject_execution: 'real_subagent',
      fixture: 'setup_only',
    }).success);
  });

  it('rejects V1 and every retired field', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, schema: 'command-experiment/v1' }).success);
    for (const [field, value] of Object.entries({
      weight: 'light', runner: 'coding-agent', execution: 'real-bundle', evidence: 'filesystem-and-trace',
      bundle: 'dpt_disp_*', trace: 'dpt_disp_*/rb_trace.jsonl', verdict: 'trace-jsonl',
      agent_mode: 'auto', agent_dependency: 'real Agent', custom_field: true,
    })) {
      assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, [field]: value }).success, field);
    }
  });

  it('rejects duplicate or malformed policy identifiers', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, required_checks: ['branch', 'branch'] }).success);
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, required_checks: ['UPPER'] }).success);
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, bundle_roles: ['bad_role'] }).success);
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, durable_evidence_roles: ['bad-role'] }).success);
  });

  it('rejects verdict and health roles outside bundle policy', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, verdict_role: 'other' }).success);
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, health_roles: ['other'] }).success);
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, health_roles: [] }).success);
  });

  it('enforces deterministic versus Agent-behavior cross fields', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, subject_execution: 'real_agent' }).success);
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, external_calls: 'real' }).success);
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, verdict_judge: 'ai_judge' }).success);
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, proof_subject: 'agent_behavior' }).success);
  });
});
