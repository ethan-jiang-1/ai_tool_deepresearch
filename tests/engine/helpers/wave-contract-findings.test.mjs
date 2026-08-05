// @impl IOC-005, CHI-001, RWG-018
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildContractEvaluation,
  findingsFromCheckResult,
  makeContractFinding,
  makeDefinitionRuleFinding,
  projectInspectContract,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-findings.mjs';

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

  it('preserves definition-owned and checker-owned root contracts', () => {
    const definitionOwned = makeContractFinding({
      id: 'artifact_exists:topic-a',
      ruleId: 'artifact_exists',
      findingSource: 'definition',
      blockingBasis: 'required_structure',
      surface: 'artifacts/wave1/topic-a/evidence-summary.md',
      expected: 'file exists',
      observed: { exists: false },
      missingFact: 'Expected evidence summary is absent.',
      repairKind: 'agent_action',
      writeTo: 'artifacts/wave1/topic-a/evidence-summary.md',
      checkpointContext: { checkpoint: 'wave1-complete' },
    });
    const checkerOwned = makeContractFinding({
      id: 'submitted_declaration_missing:wu-1',
      ruleId: 'work_unit_submission_presence',
      findingSource: 'checker',
      blockingBasis: 'authority_integrity',
      observed: { work_id: 'wu-1', declaration_present: false },
      repairKind: 'engine_operation',
      writeTo: 'operate-work-unit recover-declaration /bundle --work-id wu-1',
    });

    assert.equal(definitionOwned.finding_source, 'definition');
    assert.equal(definitionOwned.blocking_basis, 'required_structure');
    assert.deepEqual(definitionOwned.observed, { exists: false });
    assert.equal(definitionOwned.repair_kind, 'agent_action');
    assert.equal(definitionOwned.write_to, 'artifacts/wave1/topic-a/evidence-summary.md');
    assert.deepEqual(definitionOwned.checkpoint_context, { checkpoint: 'wave1-complete' });
    assert.equal(checkerOwned.finding_source, 'checker');
    assert.equal(checkerOwned.repair_kind, 'engine_operation');
  });

  it('projects definition-owned metadata and resolves checked-target/bundle coordinates', () => {
    const checkedTarget = makeDefinitionRuleFinding({
      rule: {
        id: 'plan_body_non_empty',
        target: 'rb_plan.md',
        finding: { source: 'definition', blocking_basis: 'required_structure' },
        repair: { kind: 'agent_action', write_to: '$checked_target' },
      },
      bundlePath: '/tmp/dpt_rb_example',
      expected: 'non-empty Markdown body',
      observed: 'empty body',
    });
    const bundleOperation = makeDefinitionRuleFinding({
      rule: {
        id: 'status_current_gate',
        target: 'rb_status.json#/current_gate',
        finding: { source: 'definition', blocking_basis: 'binding_integrity' },
        repair: { kind: 'engine_operation', write_to: 'advance-status --bundle {bundle}' },
      },
      bundlePath: '/tmp/dpt_rb_example',
      expected: 'setup_ready',
      observed: 'wave0_complete',
    });

    assert.equal(checkedTarget.write_to, 'rb_plan.md');
    assert.equal(checkedTarget.missing_fact.includes('empty body'), true);
    assert.equal(bundleOperation.write_to, 'advance-status --bundle /tmp/dpt_rb_example');
  });

  it('fails unresolved definition coordinates as configuration integrity', () => {
    const finding = makeDefinitionRuleFinding({
      rule: {
        id: 'topic_artifact_exists',
        target: 'artifacts/wave1/{topic}/evidence-summary.md',
        finding: { source: 'definition', blocking_basis: 'required_structure' },
        repair: { kind: 'agent_action', write_to: '$checked_target' },
      },
      observed: { exists: false },
    });

    assert.equal(finding.rule_id, 'configuration_integrity:topic_artifact_exists');
    assert.equal(finding.repair_kind, 'missing_contract');
    assert.match(finding.missing_fact, /write_to_resolved/);
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

  it('uses stable rule_id for failed-rule projection while keeping multiple instances', () => {
    const evaluation = buildContractEvaluation({
      findings: [
        makeContractFinding({
          id: 'artifact_exists:topic-a',
          ruleId: 'artifact_exists',
          surface: 'artifacts/wave1/topic-a/evidence-summary.md',
          detail: 'topic A missing',
        }),
        makeContractFinding({
          id: 'artifact_exists:topic-b',
          ruleId: 'artifact_exists',
          surface: 'artifacts/wave1/topic-b/evidence-summary.md',
          detail: 'topic B missing',
        }),
      ],
    });

    assert.equal(evaluation.findings.length, 2);
    assert.deepEqual(evaluation.failed_rule_ids, ['artifact_exists']);
  });

  it('fails a declared but incomplete root contract as configuration integrity and masks the domain symptom', () => {
    const evaluation = buildContractEvaluation({
      findings: [makeContractFinding({
        id: 'depth_review_contract:topic-a',
        ruleId: 'depth_review_contract',
        findingSource: 'checker',
        surface: 'artifacts/wave1/topic-a/depth-review.yaml',
        detail: 'domain symptom that must not become guessed repair authority',
      })],
    });

    assert.deepEqual(evaluation.failed_rule_ids, ['configuration_integrity:depth_review_contract']);
    assert.equal(evaluation.findings[0].blocking_basis, 'configuration_integrity');
    assert.equal(evaluation.findings[0].repair_kind, 'missing_contract');
    assert.match(evaluation.findings[0].missing_fact, /blocking_basis, repair_kind, write_to/);
    assert.equal(evaluation.masked_rule_ids.includes('depth_review_contract'), true);
    assert.equal(evaluation.findings[0].write_to, "Gate finding contract boundary for rule 'depth_review_contract'");
  });

  it('rejects invalid shared basis or repair kind through the schema-owned contracts', () => {
    const finding = makeContractFinding({
      id: 'bad_root',
      ruleId: 'bad_root',
      findingSource: 'checker',
      blockingBasis: 'accepted_invariant',
      repairKind: 'manual_edit',
      writeTo: 'rb_status.json',
    });
    assert.equal(finding.rule_id, 'configuration_integrity:bad_root');
    assert.deepEqual(finding.observed.missing_or_invalid_fields, [
      'blocking_basis',
      'repair_kind',
      'observed_or_missing_fact',
    ]);
  });

  it('aggregates root masking and excludes masked findings from primary failure ids', () => {
    const evaluation = buildContractEvaluation({
      findings: [
        makeContractFinding({
          id: 'parent',
          ruleId: 'parent',
          maskedRuleIds: ['child_from_parent'],
          detail: 'parent missing',
        }),
        makeContractFinding({
          id: 'child_instance',
          ruleId: 'child_rule',
          maskedByRuleId: 'parent',
          detail: 'dependent child symptom',
        }),
      ],
    });
    assert.deepEqual(evaluation.failed_rule_ids, ['parent']);
    assert.deepEqual(evaluation.masked_rule_ids.sort(), ['child_from_parent', 'child_rule']);
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

  it('adapts prose only for advisory or diagnostic-only compatibility', () => {
    const findings = findingsFromCheckResult({
      passed: false,
      inspect: ['[return_map_missing_fields] seed_topics/topic-a.md: missing refs'],
      advice: ['Add concrete refs.'],
    }, { defaultId: 'return_map' });

    assert.equal(findings[0].id, 'return_map_missing_fields');
    assert.equal(findings[0].classification, 'diagnostic-only');
    assert.equal(findings[0].repair, 'Add concrete refs.');

    const advisory = findingsFromCheckResult({
      inspect: ['Presentation differs'],
    }, { defaultId: 'style', classification: 'advisory' });
    assert.equal(advisory[0].classification, 'advisory');

    assert.throws(() => findingsFromCheckResult({
      passed: false,
      classification: 'blocking',
      inspect: ['[blocking_from_prose] must not become authority'],
    }, { defaultId: 'legacy' }), /only adapts advisory or diagnostic-only prose/);
  });

  it('keeps definition root identity independent from failure_message and compatibility prose', () => {
    const rule = {
      id: 'root',
      check: 'file_exists',
      target: 'artifact.md',
      failure_message: 'First legacy message mentions trace and cache.',
      finding: { source: 'definition', blocking_basis: 'required_structure' },
      repair: { kind: 'agent_action', write_to: '$checked_target' },
    };
    const first = makeDefinitionRuleFinding({
      rule,
      observed: { exists: false },
      detail: 'first wording',
    });
    const second = makeDefinitionRuleFinding({
      rule: {
        ...rule,
        failure_message: 'Completely different legacy message says count floor and status.',
      },
      observed: { exists: false },
      detail: 'completely different wording',
    });
    assert.equal(second.rule_id, first.rule_id);
    assert.equal(second.blocking_basis, first.blocking_basis);
    assert.equal(second.repair_kind, first.repair_kind);
    assert.equal(second.write_to, first.write_to);
  });

  it('imports basis and repair-kind validation instead of declaring duplicate enum sources', () => {
    const source = readFileSync(new URL('../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-findings.mjs', import.meta.url), 'utf8');
    assert.match(source, /GateBlockingBasisSchema/);
    assert.match(source, /GateRepairKindSchema/);
    assert.doesNotMatch(source, /const\s+BLOCKING_BASES\s*=/);
    assert.doesNotMatch(source, /const\s+REPAIR_KINDS\s*=/);
  });
});
