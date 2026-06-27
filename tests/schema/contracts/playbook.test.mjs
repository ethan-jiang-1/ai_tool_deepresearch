// tests/schema/contracts/playbook.test.mjs — 1:1 for DPT_FRAMEWORK/schema/contracts/playbook.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PlaybookFrontmatterSchema } from '../../../DPT_FRAMEWORK/schema/contracts/playbook.mjs';

const VALID = {
  schema: 'command-experiment/v1',
  experiment: 'gate-fork',
  case: 'case-11-light-four-returns',
  weight: 'light',
  case_goal: 'Verify forkGate four returns.',
  runner: 'coding-agent',
  execution: 'real-bundle',
  evidence: 'filesystem-and-trace',
  bundle: 'dpt_disp_case-11_gf_simple',
  trace: 'dpt_disp_case-11_gf_simple/_logs/_trace.jsonl',
  verdict: 'trace-jsonl',
};

describe('PlaybookFrontmatterSchema', () => {
  it('accepts minimal valid frontmatter', () => {
    assert.ok(PlaybookFrontmatterSchema.safeParse(VALID).success);
  });

  it('accepts frontmatter with optional req field', () => {
    const r = PlaybookFrontmatterSchema.safeParse({ ...VALID, req: 'AGQ-006' });
    assert.ok(r.success);
    assert.equal(r.data.req, 'AGQ-006');
  });

  it('accepts frontmatter with optional agent_mode', () => {
    const r = PlaybookFrontmatterSchema.safeParse({ ...VALID, agent_mode: 'auto' });
    assert.ok(r.success);
  });

  it('accepts frontmatter with optional agent_dependency', () => {
    const r = PlaybookFrontmatterSchema.safeParse({ ...VALID, agent_dependency: 'needs real Agent' });
    assert.ok(r.success);
  });

  it('accepts passthrough extra fields', () => {
    const r = PlaybookFrontmatterSchema.safeParse({ ...VALID, custom_field: 'anything' });
    assert.ok(r.success);
    assert.equal(r.data.custom_field, 'anything');
  });

  it('accepts all three weight values', () => {
    for (const w of ['light', 'standard', 'heavy']) {
      assert.ok(PlaybookFrontmatterSchema.safeParse({ ...VALID, weight: w }).success, `weight=${w} should pass`);
    }
  });

  it('accepts both verdict values', () => {
    for (const v of ['trace-jsonl', 'filesystem']) {
      assert.ok(PlaybookFrontmatterSchema.safeParse({ ...VALID, verdict: v }).success, `verdict=${v} should pass`);
    }
  });

  // ---- rejections ----

  it('rejects missing schema', () => {
    const { schema, ...rest } = VALID;
    assert.ok(!PlaybookFrontmatterSchema.safeParse(rest).success);
  });

  it('rejects wrong schema value', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, schema: 'other/v1' }).success);
  });

  it('rejects missing experiment', () => {
    const { experiment, ...rest } = VALID;
    assert.ok(!PlaybookFrontmatterSchema.safeParse(rest).success);
  });

  it('rejects empty experiment', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, experiment: '' }).success);
  });

  it('rejects missing case', () => {
    const { case: c, ...rest } = VALID;
    assert.ok(!PlaybookFrontmatterSchema.safeParse(rest).success);
  });

  it('rejects invalid weight', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, weight: 'extreme' }).success);
  });

  it('rejects invalid execution', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, execution: 'mock' }).success);
  });

  it('rejects invalid evidence', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, evidence: 'console-output' }).success);
  });

  it('rejects invalid verdict', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, verdict: 'guess' }).success);
  });

  it('rejects empty bundle', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, bundle: '' }).success);
  });

  it('rejects empty trace', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, trace: '' }).success);
  });

  it('rejects empty case_goal', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, case_goal: '' }).success);
  });

  it('rejects empty runner', () => {
    assert.ok(!PlaybookFrontmatterSchema.safeParse({ ...VALID, runner: '' }).success);
  });
});
