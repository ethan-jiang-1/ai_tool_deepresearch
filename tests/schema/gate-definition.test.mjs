// @impl GSK-001, GSK-011
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GATE_BLOCKING_BASES,
  GATE_COORDINATE_PLACEHOLDERS,
  GATE_REPAIR_KINDS,
  GateBlockingBasisSchema,
  GateDefinitionSchema,
  GateRepairKindSchema,
  parseGateDefinition,
  readGateDefinitionSnapshot,
} from '../../DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs';

function definitionWith(rule) {
  return {
    gate: 'synthetic-gate',
    description: 'Synthetic Gate definition fixture.',
    rules: [rule],
  };
}

function loadActiveDefinition(name) {
  return readGateDefinitionSnapshot(new URL(
    `../../DEEP_RESEARCH_HARNESS/schema/gate_definitions/${name}`,
    import.meta.url,
  )).definition;
}

function definitionOwnedRule(overrides = {}) {
  return {
    id: 'artifact_exists',
    check: 'file_exists',
    target: 'artifacts/wave1/{topic}/evidence-summary.md',
    failure_message: 'Compatibility prose only; do not infer repair authority from this message.',
    finding: {
      source: 'definition',
      blocking_basis: 'required_structure',
    },
    repair: {
      kind: 'agent_action',
      write_to: '$checked_target',
    },
    ...overrides,
  };
}

describe('Gate-definition common contract', () => {
  it('accepts existing rule fields, preserves check-specific fields, and parses a definition-owned root contract', () => {
    const input = definitionWith(definitionOwnedRule({
      threshold: 2,
      threshold_source: 'rb_profile.yaml#/research_style_params/wave1_per_topic_ref_floor',
    }));
    const parsed = parseGateDefinition(input);
    assert.equal(parsed.rules[0].id, 'artifact_exists');
    assert.equal(parsed.rules[0].check, 'file_exists');
    assert.equal(parsed.rules[0].failure_message, input.rules[0].failure_message);
    assert.equal(parsed.rules[0].threshold, 2);
    assert.equal(parsed.rules[0].threshold_source, input.rules[0].threshold_source);
  });

  it('accepts target, targets, fields, and sources as alternative checked-authority descriptors', () => {
    const descriptors = [
      { target: 'rb_plan.md' },
      { targets: ['seed_topics', 'reference'] },
      { fields: [{ source: 'topic_registry', path: 'rb_plan.md#/topic_registry' }] },
      { sources: [{ source: 'submitted_ledger', path: 'rb_output_declarations.jsonl' }] },
    ];
    for (const [index, descriptor] of descriptors.entries()) {
      const rule = definitionOwnedRule({
        id: `descriptor_${index}`,
        target: undefined,
        ...descriptor,
        repair: { kind: 'agent_action', write_to: 'artifacts/repair-target.md' },
      });
      assert.equal(GateDefinitionSchema.safeParse(definitionWith(rule)).success, true);
    }
  });

  it('accepts checker-owned rules without duplicating basis or repair metadata', () => {
    const rule = {
      id: 'work_unit_submission_presence',
      check: 'work_unit_submission_presence',
      target: 'rb_output_declarations.jsonl',
      wave: 'wave1',
      failure_message: 'Legacy diagnostic prose.',
      finding: { source: 'checker' },
    };
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(rule)).success, true);
  });

  it('admits only a non-empty unique semantic_sections descriptor without pattern fields', () => {
    const semanticRule = {
      id: 'semantic_section_fixture',
      check: 'semantic_sections',
      target: 'artifacts/wave1/{topic}/question-list.md',
      required_sections: ['First Required Section', 'Second Required Section'],
      failure_message: 'Compatibility diagnostic.',
      finding: { source: 'checker' },
    };
    const parsed = parseGateDefinition(definitionWith(semanticRule));
    assert.deepEqual(parsed.rules[0].required_sections, semanticRule.required_sections);

    for (const overrides of [
      { required_sections: undefined },
      { required_sections: [] },
      { required_sections: ['Repeated', 'Repeated'] },
      { pattern: '## First Required Section' },
      { negate: false },
      { check: 'pattern_match' },
    ]) {
      assert.equal(GateDefinitionSchema.safeParse(definitionWith({ ...semanticRule, ...overrides })).success, false);
    }
  });

  it('exports one closed blocking-basis and repair-kind contract', () => {
    assert.deepEqual(GateBlockingBasisSchema.options, [...GATE_BLOCKING_BASES]);
    assert.deepEqual(GateRepairKindSchema.options, [...GATE_REPAIR_KINDS]);
    assert.deepEqual(GATE_COORDINATE_PLACEHOLDERS, ['{bundle}', '{topic}', '<slug>']);
    assert.equal(GateBlockingBasisSchema.safeParse('accepted_invariant').success, false);
    assert.equal(GateRepairKindSchema.safeParse('manual_edit').success, false);
  });

  it('rejects missing, unknown, or incomplete definition-owned root contracts', () => {
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({ finding: undefined }))).success, false);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      finding: { source: 'definition', blocking_basis: 'accepted_invariant' },
    }))).success, false);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({ repair: undefined }))).success, false);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      repair: { kind: 'manual_edit', write_to: 'rb_status.json' },
    }))).success, false);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      repair: { kind: 'agent_action', write_to: '   ' },
    }))).success, false);
  });

  it('rejects checker-owned fallback repair metadata', () => {
    const rule = definitionOwnedRule({
      finding: { source: 'checker' },
      repair: { kind: 'agent_action', write_to: 'artifacts/guess.md' },
    });
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(rule)).success, false);
  });

  it('rejects missing, multiple, and empty checked-authority descriptors', () => {
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({ target: undefined }))).success, false);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({ targets: ['reference'] }))).success, false);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      target: undefined,
      fields: [],
      repair: { kind: 'agent_action', write_to: 'rb_plan.md' },
    }))).success, false);
  });

  it('accepts registered coordinate placeholders and rejects unknown placeholders', () => {
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule())).success, true);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      target: 'seed_topics/<slug>.md#/title',
    }))).success, true);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      target: 'artifacts/wave1/{unknown}/evidence-summary.md',
    }))).success, false);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      repair: { kind: 'agent_action', write_to: 'artifacts/wave1/{unknown}/evidence-summary.md' },
    }))).success, false);
  });

  it('limits $checked_target to an exact agent-owned singular non-glob target', () => {
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule())).success, true);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      target: 'reference/*{topic}*.md',
    }))).success, false);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      repair: { kind: 'engine_operation', write_to: '$checked_target' },
    }))).success, false);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      repair: { kind: 'agent_action', write_to: 'prefix:$checked_target' },
    }))).success, false);
    assert.equal(GateDefinitionSchema.safeParse(definitionWith(definitionOwnedRule({
      target: undefined,
      fields: [{ source: 'topic_registry', path: 'rb_plan.md#/topic_registry' }],
    }))).success, false);
  });

  it('does not interpret failure_message or infer repair kind from coordinate shape', () => {
    const parsed = parseGateDefinition(definitionWith(definitionOwnedRule({
      target: 'rb_plan.md',
      failure_message: 'Edit rb_status.json, append a ledger row, or do anything else this stale prose says.',
      repair: {
        kind: 'agent_action',
        write_to: 'node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply',
      },
    })));
    assert.equal(parsed.rules[0].repair.kind, 'agent_action');
    assert.equal(parsed.rules[0].repair.write_to, 'node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply');
  });

  it('rejects duplicate stable rule ids', () => {
    const rule = definitionOwnedRule();
    const duplicate = { ...definitionOwnedRule(), target: 'rb_plan.md' };
    assert.equal(GateDefinitionSchema.safeParse({
      gate: 'synthetic-gate',
      description: 'Duplicate fixture.',
      rules: [rule, duplicate],
    }).success, false);
  });
});

describe('instantiation/setup finding-source admission', () => {
  it('schema-parses all 39 existing rules without changing their check-specific shape', () => {
    const instantiation = parseGateDefinition(loadActiveDefinition('gate-instantiation-complete.definition.json'));
    const setup = parseGateDefinition(loadActiveDefinition('gate-setup-ready.definition.json'));
    assert.equal(instantiation.rules.length, 18);
    assert.equal(setup.rules.length, 21);
    assert.equal(instantiation.rules.length + setup.rules.length, 39);
    assert.equal(setup.rules.find((rule) => rule.id === 'basename_consistency').fields.length, 3);
    assert.equal(setup.rules.find((rule) => rule.id === 'plan_schema_valid').schema, 'PlanSchema');
  });

  it('keeps status, schema, and basename authority away from direct Agent edits', () => {
    const definitions = [
      parseGateDefinition(loadActiveDefinition('gate-instantiation-complete.definition.json')),
      parseGateDefinition(loadActiveDefinition('gate-setup-ready.definition.json')),
    ];
    const authorityRules = definitions.flatMap((definition) => definition.rules).filter((rule) => (
      rule.id.startsWith('status_')
      || rule.id.endsWith('_schema_valid')
      || rule.id === 'basename_consistency'
    ));
    assert.ok(authorityRules.length > 0);
    for (const rule of authorityRules) {
      assert.notEqual(rule.repair?.kind, 'agent_action', `${rule.id} must not authorize direct authority edits`);
    }
  });

  it('separates recorded HITL decision, Agent plan body, and Engine scaffold responsibility', () => {
    const setup = parseGateDefinition(loadActiveDefinition('gate-setup-ready.definition.json'));
    const hitl1 = setup.rules.find((rule) => rule.id === 'hitl1_marker_recorded');
    const planBody = setup.rules.find((rule) => rule.id === 'plan_body_non_empty');
    const scaffold = setup.rules.find((rule) => rule.id === 'rb_status_exists');
    assert.equal(hitl1.repair.kind, 'user_decision');
    assert.equal(planBody.repair.kind, 'agent_action');
    assert.equal(planBody.repair.write_to, '$checked_target');
    assert.equal(scaffold.repair.kind, 'engine_operation');
  });
});

describe('HITL1/seed-topics finding-source admission', () => {
  it('schema-parses all 14 rules', () => {
    const hitl1 = parseGateDefinition(loadActiveDefinition('gate-hitl1-recorded.definition.json'));
    const seed = parseGateDefinition(loadActiveDefinition('gate-seed-topics-ready.definition.json'));
    assert.equal(hitl1.rules.length, 9);
    assert.equal(seed.rules.length, 5);
    assert.equal(hitl1.rules.length + seed.rules.length, 14);
  });

  it('keeps HITL decisions distinct from Agent artifact repair', () => {
    const hitl1 = parseGateDefinition(loadActiveDefinition('gate-hitl1-recorded.definition.json'));
    for (const id of ['research_profile_not_default', 'must_answer_non_empty', 'hitl1_status_recorded']) {
      const rule = hitl1.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.blocking_basis, 'recorded_human_decision');
      assert.equal(rule.repair.kind, 'user_decision');
      assert.equal(rule.repair.write_to, 'phases/phase-hitl1.md');
    }
    assert.equal(hitl1.rules.find((rule) => rule.id === 'status_current_gate').repair.kind, 'engine_operation');
  });

  it('uses $checked_target only for exact singular Agent-owned seed targets', () => {
    const seed = parseGateDefinition(loadActiveDefinition('gate-seed-topics-ready.definition.json'));
    const aliasRules = seed.rules.filter((rule) => rule.repair?.write_to === '$checked_target');
    assert.deepEqual(aliasRules.map((rule) => rule.id).sort(), [
      'per_file_title_non_empty',
      'seed_topics_dir_non_empty',
    ]);
    for (const rule of aliasRules) {
      assert.equal(typeof rule.target, 'string');
      assert.doesNotMatch(rule.target, /[*?\[\]]/);
      assert.equal(rule.repair.kind, 'agent_action');
    }
    assert.equal(seed.rules.find((rule) => rule.id === 'slug_consistency').finding.source, 'checker');
    assert.equal(seed.rules.find((rule) => rule.id === 'per_file_slug_stem_consistency').finding.source, 'checker');
  });
});

describe('HITL2/readiness/rerun finding-source admission', () => {
  it('schema-parses all 17 branch-sensitive rules', () => {
    const hitl2 = parseGateDefinition(loadActiveDefinition('gate-hitl2-recorded.definition.json'));
    const readiness = parseGateDefinition(loadActiveDefinition('gate-readiness-passed.definition.json'));
    const rerun = parseGateDefinition(loadActiveDefinition('gate-rerun-ready.definition.json'));
    assert.equal(hitl2.rules.length, 6);
    assert.equal(readiness.rules.length, 7);
    assert.equal(rerun.rules.length, 4);
    assert.equal(hitl2.rules.length + readiness.rules.length + rerun.rules.length, 17);
  });

  it('keeps HITL2 and rerun rationale at the recorded user-decision boundary', () => {
    const hitl2 = parseGateDefinition(loadActiveDefinition('gate-hitl2-recorded.definition.json'));
    const rerun = parseGateDefinition(loadActiveDefinition('gate-rerun-ready.definition.json'));
    for (const id of ['hitl2_status_recorded', 'user_decision_non_empty', 'user_decision_valid_enum']) {
      const rule = hitl2.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.blocking_basis, 'recorded_human_decision');
      assert.equal(rule.repair.kind, 'user_decision');
      assert.equal(rule.repair.write_to, 'phases/phase-hitl2.md');
    }
    const rationale = rerun.rules.find((rule) => rule.id === 'rerun_rationale_present');
    assert.equal(rationale.finding.blocking_basis, 'recorded_human_decision');
    assert.equal(rationale.repair.kind, 'user_decision');
    assert.equal(rationale.repair.write_to, 'phases/phase-hitl2.md');
  });

  it('keeps trace, count-limit, and bundle-integrity roots checker-owned', () => {
    const readiness = parseGateDefinition(loadActiveDefinition('gate-readiness-passed.definition.json'));
    const rerun = parseGateDefinition(loadActiveDefinition('gate-rerun-ready.definition.json'));
    for (const id of ['all_prior_gates_passed', 'trace_jsonl_parseable']) {
      const rule = readiness.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.source, 'checker');
      assert.equal(rule.repair, undefined);
    }
    for (const id of ['rerun_count_valid', 'bundle_structure_valid']) {
      const rule = rerun.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.source, 'checker');
      assert.equal(rule.repair, undefined);
    }
  });

  it('uses checked-target authorization only for exact Agent-owned artifacts', () => {
    const hitl2 = parseGateDefinition(loadActiveDefinition('gate-hitl2-recorded.definition.json'));
    const readiness = parseGateDefinition(loadActiveDefinition('gate-readiness-passed.definition.json'));
    const aliasRules = [...hitl2.rules, ...readiness.rules]
      .filter((rule) => rule.repair?.write_to === '$checked_target');
    assert.deepEqual(aliasRules.map((rule) => rule.id).sort(), [
      'decision_brief_exists',
      'decision_brief_non_empty',
      'hitl2_decision_brief_exists',
      'reference_index_exists',
      'seed_topics_non_empty',
      'wave2_synthesis_exists',
    ]);
    for (const rule of aliasRules) {
      assert.equal(rule.repair.kind, 'agent_action');
      assert.equal(typeof rule.target, 'string');
      assert.doesNotMatch(rule.target, /[*?\[\]]/);
    }
  });
});

describe('Wave0 finding-source admission', () => {
  it('schema-parses all 16 Wave0 rules', () => {
    const wave0 = parseGateDefinition(loadActiveDefinition('gate-wave0-complete.definition.json'));
    assert.equal(wave0.rules.length, 16);
  });

  it('keeps single-root artifact and floor rules definition-owned', () => {
    const wave0 = parseGateDefinition(loadActiveDefinition('gate-wave0-complete.definition.json'));
    const expected = new Map([
      ['reference_index_md_exists', 'required_structure'],
      ['reference_readme_exists', 'required_structure'],
      ['reference_dir_exists', 'required_structure'],
      ['shared_ref_count_floor', 'required_floor'],
      ['no_example_com_shared_ref_url', 'authority_integrity'],
      ['per_topic_source_yaml_exists', 'required_structure'],
      ['per_topic_count_floor', 'required_floor'],
    ]);
    for (const [id, blockingBasis] of expected) {
      const rule = wave0.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.source, 'definition');
      assert.equal(rule.finding.blocking_basis, blockingBasis);
      assert.equal(rule.repair.kind, 'agent_action');
    }
  });

  it('keeps provenance, cache, trace, and schema roots checker-owned', () => {
    const wave0 = parseGateDefinition(loadActiveDefinition('gate-wave0-complete.definition.json'));
    const checkerOwned = [
      'per_topic_reference_schema_valid',
      'trace_event_wave0_completion',
      'cache_coverage',
      'wave0_work_unit_ledger_exists',
      'wave0_work_unit_output_coverage',
      'wave0_work_unit_submission_presence',
      'wave0_delegated_bypass_suspected',
    ];
    for (const id of checkerOwned) {
      const rule = wave0.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.source, 'checker');
      assert.equal(rule.repair, undefined);
    }
  });

  it('does not use checked-target authorization for Wave0 glob rules', () => {
    const wave0 = parseGateDefinition(loadActiveDefinition('gate-wave0-complete.definition.json'));
    const floor = wave0.rules.find((candidate) => candidate.id === 'shared_ref_count_floor');
    assert.match(floor.target, /[*?\[\]]/);
    assert.notEqual(floor.repair.write_to, '$checked_target');
    assert.match(floor.repair.write_to, /wave0_source_intake/);
    const placeholder = wave0.rules.find((candidate) => candidate.id === 'no_example_com_shared_ref_url');
    assert.match(placeholder.target, /[*?\[\]]/);
    assert.equal(placeholder.repair.write_to, 'reference/');
    assert.notEqual(placeholder.repair.write_to, '$checked_target');
  });
});

describe('Wave1 finding-source admission', () => {
  it('schema-parses the active Wave1 rules after retiring Key Facts quantity and duplicate token rules', () => {
    const wave1 = parseGateDefinition(loadActiveDefinition('gate-wave1-complete.definition.json'));
    const activeRuleIds = new Set(wave1.rules.map((rule) => rule.id));
    assert.ok(wave1.rules.length > 0);
    assert.equal(wave1.rules.length, activeRuleIds.size);
    assert.equal(wave1.rules.some((rule) => rule.id === 'key_facts_min_lines'), false);
    assert.equal(wave1.rules.some((rule) => rule.check === 'reference_key_facts_min_lines'), false);
    for (const id of ['no_stale_mechanisms_token', 'no_stale_trends_token', 'no_stale_pending_questions_token']) {
      assert.equal(wave1.rules.some((rule) => rule.id === id), false);
    }
  });

  it('keeps single-root artifacts and floors definition-owned', () => {
    const wave1 = parseGateDefinition(loadActiveDefinition('gate-wave1-complete.definition.json'));
    const expected = new Map([
      ['wave1_dir_exists', 'required_structure'],
      ['per_topic_evidence_summary_exists', 'required_structure'],
      ['per_topic_question_list_exists', 'required_structure'],
      ['per_topic_ref_md_count_floor', 'required_floor'],
      ['no_example_com_ref_url', 'authority_integrity'],
    ]);
    for (const [id, blockingBasis] of expected) {
      const rule = wave1.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.source, 'definition');
      assert.equal(rule.finding.blocking_basis, blockingBasis);
      assert.equal(rule.repair.kind, 'agent_action');
    }
  });

  it('keeps depth, reference, trace, cache, and provenance roots checker-owned', () => {
    const wave1 = parseGateDefinition(loadActiveDefinition('gate-wave1-complete.definition.json'));
    const checkerOwned = [
      'per_topic_depth_review_contract',
      'reference_format',
      'reference_source_url_parseable',
      'reference_index_coverage',
      'ledger_coverage',
      'question_list_has_four_sections',
      'source_url_present',
      'key_findings_non_empty',
      'trace_event_wave1_completion',
      'cache_coverage',
      'wave1_work_unit_ledger_exists',
      'wave1_work_unit_output_coverage',
      'wave1_work_unit_submission_presence',
      'wave1_delegated_bypass_suspected',
    ];
    for (const id of checkerOwned) {
      const rule = wave1.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.source, 'checker');
      assert.equal(rule.repair, undefined);
    }
  });

  it('parses the Wave1 question-list contract as one typed semantic descriptor', () => {
    const wave1 = parseGateDefinition(loadActiveDefinition('gate-wave1-complete.definition.json'));
    const rule = wave1.rules.find((candidate) => candidate.id === 'question_list_has_four_sections');
    assert.equal(rule.check, 'semantic_sections');
    assert.deepEqual(rule.required_sections, [
      'Topic Investigation Targets',
      'Question Reconciliation',
      'Emergent Question Protocol',
      'Exploration / Exploitation Decision',
    ]);
    assert.equal(Object.hasOwn(rule, 'pattern'), false);
    assert.equal(Object.hasOwn(rule, 'negate'), false);
  });

  it('does not assign a temporary required-structure basis to presentation-sensitive rules', () => {
    const wave1 = parseGateDefinition(loadActiveDefinition('gate-wave1-complete.definition.json'));
    for (const id of ['question_list_has_four_sections', 'source_url_present', 'key_findings_non_empty']) {
      const rule = wave1.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.source, 'checker');
      assert.equal(rule.finding.blocking_basis, undefined);
    }
  });

  it('does not use checked-target authorization for Wave1 glob rules', () => {
    const wave1 = parseGateDefinition(loadActiveDefinition('gate-wave1-complete.definition.json'));
    for (const id of ['per_topic_ref_md_count_floor', 'no_example_com_ref_url']) {
      const rule = wave1.rules.find((candidate) => candidate.id === id);
      assert.match(rule.target, /[*?\[\]]/);
      assert.equal(rule.repair.write_to, 'reference/');
      assert.notEqual(rule.repair.write_to, '$checked_target');
    }
  });
});

describe('Wave2 finding-source admission', () => {
  it('schema-parses all 19 Wave2 rules after retiring duplicate token rules', () => {
    const wave2 = parseGateDefinition(loadActiveDefinition('gate-wave2-complete.definition.json'));
    assert.equal(wave2.rules.length, 19);
    for (const id of ['backfill_judgment_token_absent', 'backfill_questions_token_absent']) {
      assert.equal(wave2.rules.some((rule) => rule.id === id), false);
    }
  });

  it('keeps single-root artifact and binding rules definition-owned', () => {
    const wave2 = parseGateDefinition(loadActiveDefinition('gate-wave2-complete.definition.json'));
    const expected = new Map([
      ['synthesis_exists', 'required_structure'],
      ['synthesis_non_empty', 'required_structure'],
      ['ledger_exists', 'required_structure'],
      ['ledger_non_empty', 'required_structure'],
      ['index_exists', 'required_structure'],
      ['synthesis_finding_id_ref', 'binding_integrity'],
    ]);
    for (const [id, blockingBasis] of expected) {
      const rule = wave2.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.source, 'definition');
      assert.equal(rule.finding.blocking_basis, blockingBasis);
      assert.equal(rule.repair.kind, 'agent_action');
      assert.equal(rule.repair.write_to, '$checked_target');
    }
  });

  it('keeps finding, index, rerun, trace, and provenance roots checker-owned', () => {
    const wave2 = parseGateDefinition(loadActiveDefinition('gate-wave2-complete.definition.json'));
    const checkerOwned = [
      'ledger_fixed_sections',
      'index_yaml_parse',
      'finding_index_contract',
      'cross_artifact_references',
      'wave1_evidence_ref',
      'rerun_add_full_synthesis',
      'trace_event_wave2_completion',
      'wave2_cross_reference_index_coverage',
      'wave2_work_unit_cross_ref_coverage',
      'wave2_work_unit_submission_presence',
      'wave2_delegated_bypass_suspected',
    ];
    for (const id of checkerOwned) {
      const rule = wave2.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.source, 'checker');
      assert.equal(rule.repair, undefined);
    }
  });

  it('does not assign static repair metadata to checker-owned semantic and binding checks', () => {
    const wave2 = parseGateDefinition(loadActiveDefinition('gate-wave2-complete.definition.json'));
    for (const id of ['ledger_fixed_sections', 'wave1_evidence_ref']) {
      const rule = wave2.rules.find((candidate) => candidate.id === id);
      assert.equal(rule.finding.source, 'checker');
      assert.equal(rule.finding.blocking_basis, undefined);
      assert.equal(rule.repair, undefined);
    }
  });
});
