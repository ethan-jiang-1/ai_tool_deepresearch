// @impl GSK-013, RWG-021
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseGateDefinition } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs';
import { evaluateWaveDegradationEligibility } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-degradation-eligibility.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  projectInspectContract,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-findings.mjs';

function definitionWith(rules) {
  return parseGateDefinition({
    gate: 'synthetic-wave-gate',
    description: 'Synthetic Wave degradation helper fixture.',
    rules,
  });
}

function floorRule(overrides = {}) {
  return {
    id: 'per_topic_ref_md_count_floor',
    check: 'count_floor',
    target: 'reference/*{topic}*.md',
    failure_message: 'Quality floor is not met.',
    finding: {
      source: 'definition',
      blocking_basis: 'required_floor',
    },
    repair: {
      kind: 'agent_action',
      write_to: 'reference/',
    },
    degradation_eligible: true,
    ...overrides,
  };
}

function finding(overrides = {}) {
  return {
    id: 'per_topic_ref_md_count_floor:topic-a',
    rule_id: 'per_topic_ref_md_count_floor',
    finding_source: 'definition',
    classification: 'blocking',
    blocking_basis: 'required_floor',
    masked_by_rule_id: null,
    ...overrides,
  };
}

function focusCoverageLimitRule() {
  return {
    id: 'focus_coverage_limit',
    check: 'focus_coverage_limit',
    target: 'artifacts/wave1/{topic}/depth-review.yaml',
    failure_message: 'A declared focus limitation remains.',
    finding: {
      source: 'definition',
      blocking_basis: 'required_floor',
    },
    repair: {
      kind: 'missing_contract',
      write_to: 'artifacts/wave1/{topic}/depth-review.yaml',
    },
    degradation_eligible: true,
  };
}

describe('Wave degradation eligibility', () => {
  it('accepts an unmasked topic-scoped quality floor through its exact stable rule_id', () => {
    const result = evaluateWaveDegradationEligibility({
      definition: definitionWith([floorRule()]),
      ruleEvaluation: { findings: [finding()] },
    });

    assert.deepEqual(result, {
      eligible: true,
      eligible_rule_ids: ['per_topic_ref_md_count_floor'],
      ineligible_rule_ids: [],
    });
  });

  it('accepts a valid definition-owned focus coverage limit without widening eligibility', () => {
    const result = evaluateWaveDegradationEligibility({
      definition: definitionWith([focusCoverageLimitRule()]),
      ruleEvaluation: {
        findings: [finding({
          id: 'focus_coverage_limit:topic-a',
          rule_id: 'focus_coverage_limit',
        })],
      },
    });

    assert.deepEqual(result, {
      eligible: true,
      eligible_rule_ids: ['focus_coverage_limit'],
      ineligible_rule_ids: [],
    });
  });

  it('parses the inactive Wave2 fixture through the production schema and shared helper only', () => {
    const definition = parseGateDefinition(JSON.parse(readFileSync(new URL(
      '../../fixtures/gate_definitions/gate-wave2-degradation-eligible.fixture.json',
      import.meta.url,
    ), 'utf8')));
    const result = evaluateWaveDegradationEligibility({
      definition,
      ruleEvaluation: {
        findings: [finding({
          id: 'fixture_wave2_quality_floor',
          rule_id: 'fixture_wave2_quality_floor',
        })],
      },
    });

    assert.equal(definition.gate, 'wave2-complete');
    assert.deepEqual(result, {
      eligible: true,
      eligible_rule_ids: ['fixture_wave2_quality_floor'],
      ineligible_rule_ids: [],
    });
  });

  it('rejects masked, checker-owned, non-floor, unmatched, and suffix-derived roots', () => {
    const definition = definitionWith([
      floorRule(),
      floorRule({
        id: 'required_structure',
        check: 'file_exists',
        target: 'artifacts/wave1/{topic}/evidence-summary.md',
        finding: { source: 'definition', blocking_basis: 'required_structure' },
        repair: { kind: 'agent_action', write_to: '$checked_target' },
        degradation_eligible: true,
      }),
    ]);
    const result = evaluateWaveDegradationEligibility({
      definition,
      ruleEvaluation: {
        findings: [
          finding({ masked_by_rule_id: 'parent_rule' }),
          finding({ id: 'checker:topic-a', rule_id: 'per_topic_ref_md_count_floor', finding_source: 'checker' }),
          finding({ id: 'required_structure:topic-a', rule_id: 'required_structure', blocking_basis: 'required_structure' }),
          finding({ id: 'per_topic_ref_md_count_floor:topic-a', rule_id: 'per_topic_ref_md_count_floor:topic-a' }),
        ],
      },
    });

    assert.deepEqual(result, {
      eligible: false,
      eligible_rule_ids: [],
      ineligible_rule_ids: [
        'per_topic_ref_md_count_floor',
        'per_topic_ref_md_count_floor:topic-a',
        'required_structure',
      ],
    });
  });

  it('retains source-level masked rule ids without reconstructing child hints or hiding an independent root', () => {
    const parent = makeContractFinding({
      id: 'depth_review_contract:topic-a',
      ruleId: 'depth_review_contract',
      findingSource: 'checker',
      classification: 'blocking',
      blockingBasis: 'required_structure',
      surface: 'artifacts/wave1/topic-a/depth-review.yaml',
      expected: 'A depth-review document exists.',
      observed: 'missing',
      missingFact: 'depth-review.yaml is missing for topic-a.',
      repairKind: 'agent_action',
      writeTo: 'artifacts/wave1/topic-a/depth-review.yaml',
      repair: 'Create the depth-review document.',
    });
    const independent = makeContractFinding({
      id: 'phase_queue_drained',
      ruleId: 'phase_queue_drained',
      findingSource: 'checker',
      classification: 'blocking',
      blockingBasis: 'authority_integrity',
      surface: 'rb_queue.json',
      expected: 'The Wave queue is drained.',
      observed: 'one queued card',
      missingFact: 'The Wave queue still has one queued card.',
      repairKind: 'engine_operation',
      writeTo: 'node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect',
      repair: 'Inspect the queued work unit.',
    });
    const evaluation = buildContractEvaluation({
      findings: [parent, independent],
      maskedRuleIds: ['source_novelty_floor:topic-a', 'source_claim_cache_mapping:topic-a'],
    });
    const projected = projectInspectContract({
      wave: 'wave1',
      evaluation,
      checkpointCommand: 'node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle /tmp/test-bundle',
    });

    assert.deepEqual(evaluation.failed_rule_ids, ['depth_review_contract', 'phase_queue_drained']);
    assert.deepEqual(evaluation.masked_rule_ids, ['source_novelty_floor:topic-a', 'source_claim_cache_mapping:topic-a']);
    assert.deepEqual(projected.hints.map((hint) => hint.rule_id), ['depth_review_contract', 'phase_queue_drained']);
    assert.equal(projected.inspect.some((line) => line.includes('source_novelty_floor')), false);
  });
});
