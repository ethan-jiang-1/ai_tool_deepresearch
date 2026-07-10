// @impl IOC-005, CHI-001, RWG-018
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildContractEvaluation,
  findingsFromCheckResult,
  makeContractFinding,
  projectInspectContract,
} from '../../../DPT_FRAMEWORK/engine/helpers/wave-contract-findings.mjs';

describe('wave contract finding projection', () => {
  it('classifies blockers without letting advisory or diagnostic findings fail', () => {
    const evaluation = buildContractEvaluation({
      checksRun: 3,
      maskedRuleIds: ['child_rule'],
      findings: [
        makeContractFinding({ id: 'root_rule', detail: 'root failed', repair: 'repair root' }),
        makeContractFinding({ id: 'style_rule', classification: 'advisory', detail: 'style differs' }),
        makeContractFinding({ id: 'audit_rule', classification: 'diagnostic-only', detail: 'audit detail' }),
      ],
    });

    assert.equal(evaluation.passed, false);
    assert.equal(evaluation.checks_failed, 1);
    assert.deepEqual(evaluation.failed_rule_ids, ['root_rule']);
    assert.deepEqual(evaluation.masked_rule_ids, ['child_rule']);
    assert.deepEqual(evaluation.advice, ['repair root']);
  });

  it('keeps one nearest repair for the same root surface', () => {
    const evaluation = buildContractEvaluation({
      findings: [
        makeContractFinding({ id: 'finding_index_contract:W2F-001:hitl2_handoff', surface: 'artifacts/wave2/finding-index.yaml', detail: 'missing field', repair: 'add hitl2_handoff' }),
        makeContractFinding({ id: 'finding_index_contract:W2F-001:hitl2_handoff', surface: 'artifacts/wave2/finding-index.yaml', detail: 'derived handoff mismatch', repair: 'rewrite eligibility' }),
      ],
    });

    assert.equal(evaluation.findings.length, 1);
    assert.deepEqual(evaluation.advice, ['add hitl2_handoff']);
  });

  it('projects compatible inspect summary fields and additive classifications', () => {
    const output = projectInspectContract({
      wave: 'wave1',
      evaluation: buildContractEvaluation({
        checksRun: 2,
        findings: [makeContractFinding({ id: 'depth_review_contract:topic-a', detail: 'missing review' })],
      }),
      additionalChecksRun: 1,
      additionalFindings: [makeContractFinding({ id: 'reference_flat_style', classification: 'advisory', detail: 'style advice' })],
      returnMapClassification: 'diagnostic-only',
    });

    assert.equal(output.check.passed, false);
    assert.equal(output.check.wave, 'wave1');
    assert.equal(output.check.checks_run, 3);
    assert.equal(output.check.checks_failed, 1);
    assert.equal(output.check.return_map_classification, 'diagnostic-only');
    assert.deepEqual(output.check.failed_rule_ids, ['depth_review_contract:topic-a']);
    assert.deepEqual(output.check.finding_classification.blocking, ['depth_review_contract:topic-a']);
    assert.deepEqual(output.check.finding_classification.advisory, ['reference_flat_style']);
  });

  it('converts existing inspect helper messages without changing their current classification', () => {
    const findings = findingsFromCheckResult({
      passed: false,
      classification: 'blocking',
      inspect: ['[return_map_missing_fields] seed_topics/topic-a.md: missing refs'],
      advice: ['Add concrete refs.'],
    }, { defaultId: 'return_map' });

    assert.equal(findings[0].id, 'return_map_missing_fields');
    assert.equal(findings[0].classification, 'blocking');
    assert.equal(findings[0].repair, 'Add concrete refs.');
  });
});
