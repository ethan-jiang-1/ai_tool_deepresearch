// Static active gate rule audit.
// @impl GSK-011, RWG-018
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE_DEFINITIONS_DIR = join(REPO_ROOT, 'DPT_FRAMEWORK', 'schema', 'gate_definitions');
const GATE_CLI_DIR = join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'gates');

const CHECK_IMPLEMENTATION_ROUTES = new Map([
  ['cache_coverage', 'shared helper: checkCacheCoverage()'],
  ['count_floor', 'gate CLI count_floor dispatch + ref-count helper'],
  ['cross_field', 'gate CLI cross_field dispatch'],
  ['cross_field:markdown_link_resolution', 'wave2 gate markdown link resolver'],
  ['cross_field:slug_consistency', 'seed-topics gate slug consistency dispatch'],
  ['delegated_bypass_suspected', 'shared helper: checkDelegatedBypassSuspected()'],
  ['depth_review_contract', 'shared helper: checkWave1DepthReviewContract()'],
  ['dir_exists', 'gate CLI dir_exists dispatch'],
  ['dir_non_empty', 'gate CLI dir_non_empty dispatch'],
  ['field_non_empty', 'gate CLI field_non_empty dispatch'],
  ['field_value', 'gate CLI field_value dispatch'],
  ['file_exists', 'gate CLI file_exists dispatch'],
  ['finding_index_contract', 'shared helper: checkWave2FindingIndexContract()'],
  ['jsonl_parse', 'readiness gate jsonl_parse dispatch'],
  ['pattern_match', 'gate CLI pattern_match dispatch'],
  ['reference_format', 'shared helper: checkReferenceFormatFiles()'],
  ['reference_index_coverage', 'shared helper: checkReferenceIndexCoverage()'],
  ['reference_key_facts_min_lines', 'shared helper: checkReferenceKeyFactsMinLines()'],
  ['reference_ledger_coverage', 'shared helper: checkReferenceLedgerCoverage()'],
  ['reference_source_url_parseable', 'shared helper: checkReferenceSourceUrls()'],
  ['rerun_add_full_synthesis', 'wave2 gate rerun_add_full_synthesis dispatch'],
  ['rerun_count_limit', 'rerun-ready gate rerun_count_limit dispatch'],
  ['schema_valid', 'gate CLI schema_valid dispatch'],
  ['status_value', 'gate CLI status_value dispatch'],
  ['structural', 'rerun-ready gate structural dispatch'],
  ['trace_event_present', 'gate CLI trace_event_present dispatch'],
  ['trace_has_all_gates', 'readiness gate trace_has_all_gates dispatch'],
  ['work_unit_ledger_exists', 'shared helper: checkWorkUnitLedgerExists()'],
  ['work_unit_output_coverage', 'shared helper: checkWorkUnitOutputCoverage()'],
  ['work_unit_submission_presence', 'shared helper: checkWorkUnitSubmissionPresence()'],
  ['yaml_parse', 'gate CLI yaml_parse dispatch'],
]);

const SUPPORTED_DELEGATED_PROVENANCE_CHECKS = new Set([
  'delegated_bypass_suspected',
  'work_unit_ledger_exists',
  'work_unit_output_coverage',
  'work_unit_submission_presence',
]);

const REQUIRED_INVENTORY_FIELDS = [
  'artifactCategory',
  'producerInstruction',
  'runtimeAuthority',
  'diagnosticSurface',
  'classification',
  'testGuards',
];

const ALLOWED_CLASSIFICATIONS = new Set([
  'blocking',
  'blocking_or_degradation_eligible',
]);

function ruleKeys(gate, ids) {
  return ids.map((id) => `${gate}:${id}`);
}

const GATE_RULE_INVENTORY_GROUPS = [
  {
    rules: ruleKeys('instantiation-complete', [
      'bundle_dir_exists',
      'bundle_map_exists',
      'rb_plan_exists',
      'rb_profile_exists',
      'rb_status_exists',
      'rb_queue_exists',
      'rb_trace_exists',
      'seed_topics_exists',
      'reference_exists',
      'artifacts_exists',
      'cache_exists',
      'final_exists',
      'work_units_exists',
      'bundle_name_valid',
      'status_current_mode',
      'status_current_gate',
      'status_next_gate',
    ]),
    artifactCategory: 'bundle scaffolding and lifecycle status',
    producerInstruction: 'non-Agent-produced: bundle instantiation templates and instantiate-run-bundle workflow',
    runtimeAuthority: 'active bundle filesystem plus rb_status.json',
    diagnosticSurface: 'gate definition failure_message plus check-gate-instantiation-complete inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/integration/cli/check-gate-instantiation-complete.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('hitl1-recorded', [
      'profile_exists',
      'profile_schema_valid',
      'research_profile_not_default',
      'must_answer_non_empty',
      'hitl1_status_recorded',
      'hitl1_recorded_at_non_empty',
      'status_current_gate',
      'status_next_gate',
    ]),
    artifactCategory: 'HITL1 profile checkpoint and lifecycle status',
    producerInstruction: 'HITL1/profile collection workflow',
    runtimeAuthority: 'rb_profile.yaml plus rb_status.json',
    diagnosticSurface: 'gate definition failure_message plus check-gate-hitl1-recorded inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/integration/cli/check-gate-hitl1-recorded.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('setup-ready', [
      'rb_plan_exists',
      'rb_profile_exists',
      'rb_status_exists',
      'rb_queue_exists',
      'rb_trace_exists',
      'seed_topics_exists',
      'reference_exists',
      'artifacts_exists',
      'cache_exists',
      'final_exists',
      'work_units_exists',
      'plan_schema_valid',
      'profile_schema_valid',
      'status_schema_valid',
      'queue_schema_valid',
      'hitl1_marker_recorded',
      'status_current_gate',
      'status_next_gate',
      'basename_consistency',
      'plan_body_non_empty',
      'plan_body_no_unfilled_marker',
    ]),
    artifactCategory: 'setup control files, schemas, basename consistency, and plan body',
    producerInstruction: 'setup phase, HITL1 profile handoff, and bundle templates',
    runtimeAuthority: 'rb_plan.md, rb_profile.yaml, rb_status.json, rb_queue.json, rb_trace.jsonl, and runtime directories',
    diagnosticSurface: 'gate definition failure_message plus check-gate-setup-ready inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/integration/cli/check-gate-setup-ready.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('seed-topics-ready', [
      'seed_topics_dir_non_empty',
      'slug_consistency',
      'per_file_title_non_empty',
      'per_file_slug_stem_consistency',
    ]),
    artifactCategory: 'seed topic files and frontmatter identity',
    producerInstruction: 'DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md',
    runtimeAuthority: 'seed_topics/*.md',
    diagnosticSurface: 'gate definition failure_message plus check-gate-seed-topics-ready inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/integration/md/phase-seedtopics-queue-loop.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('wave0-complete', [
      'reference_index_md_exists',
      'reference_readme_exists',
      'reference_dir_exists',
      'shared_ref_count_floor',
      'no_example_com_shared_ref_url',
      'per_topic_source_yaml_exists',
      'per_topic_reference_schema_valid',
      'per_topic_count_floor',
    ]),
    artifactCategory: 'Wave0 reference inventory and per-topic source metadata',
    producerInstruction: 'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md',
    runtimeAuthority: 'reference/ and artifacts/wave0/{topic}/source.yaml',
    diagnosticSurface: 'gate definition failure_message plus check-gate-wave0-complete inspect/advice',
    classification: 'blocking_or_degradation_eligible',
    testGuards: [
      'tests/integration/cli/check-gate-wave0-complete.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('wave0-complete', [
      'trace_event_wave0_completion',
      'cache_coverage',
      'wave0_work_unit_ledger_exists',
      'wave0_work_unit_output_coverage',
      'wave0_work_unit_submission_presence',
      'wave0_delegated_bypass_suspected',
    ]),
    artifactCategory: 'Wave0 delegated work-unit provenance and cache backing',
    producerInstruction: 'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md delegated drain loop and operate-work-unit submit contract',
    runtimeAuthority: 'rb_trace.jsonl, rb_output_declarations.jsonl, _work_units/, _cache/, and declared outputs',
    diagnosticSurface: 'gate definition failure_message plus provenance helper inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/engine/helpers/gate-helpers-provenance.test.mjs',
      'tests/integration/cli/check-gate-wave0-complete.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('wave1-complete', [
      'wave1_dir_exists',
      'per_topic_evidence_summary_exists',
      'per_topic_question_list_exists',
      'question_list_has_four_sections',
      'source_url_present',
      'key_findings_non_empty',
      'no_stale_mechanisms_token',
      'no_stale_trends_token',
      'no_stale_pending_questions_token',
    ]),
    artifactCategory: 'Wave1 topic artifacts and seed-topic backfill tokens',
    producerInstruction: 'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md',
    runtimeAuthority: 'artifacts/wave1/{topic}/ and seed_topics/{topic}.md',
    diagnosticSurface: 'gate definition failure_message plus check-gate-wave1-complete inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/integration/cli/check-gate-wave1-complete.test.mjs',
      'tests/integration/md/wave-depth-contract-guidance.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('wave1-complete', [
      'per_topic_depth_review_contract',
    ]),
    artifactCategory: 'Wave1 depth-review submitted work-unit refs',
    producerInstruction: 'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md',
    runtimeAuthority: 'artifacts/wave1/{topic}/depth-review.yaml plus submitted work-unit rows',
    diagnosticSurface: 'depth_review_contract inspect/advice and canonicalization diagnostics',
    classification: 'blocking',
    testGuards: [
      'tests/engine/wave-depth-contracts.test.mjs',
      'tests/integration/cli/check-gate-wave1-complete.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('wave1-complete', [
      'per_topic_ref_md_count_floor',
      'no_example_com_ref_url',
      'reference_format',
      'reference_source_url_parseable',
      'reference_index_coverage',
      'key_facts_min_lines',
      'ledger_coverage',
    ]),
    artifactCategory: 'Wave1 reference format, count, index, and backing',
    producerInstruction: 'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md',
    runtimeAuthority: 'reference/{topic}-*.md, reference/_INDEX.md, submitted ledgers, and cache backing',
    diagnosticSurface: 'reference helper inspect/advice plus gate failure_message',
    classification: 'blocking_or_degradation_eligible',
    testGuards: [
      'tests/engine/helpers/gate-helpers-provenance.test.mjs',
      'tests/integration/cli/check-gate-wave1-complete.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('wave1-complete', [
      'trace_event_wave1_completion',
      'cache_coverage',
      'wave1_work_unit_ledger_exists',
      'wave1_work_unit_output_coverage',
      'wave1_work_unit_submission_presence',
      'wave1_delegated_bypass_suspected',
    ]),
    artifactCategory: 'Wave1 delegated work-unit provenance and required output coverage',
    producerInstruction: 'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md delegated drain loop and operate-work-unit submit contract',
    runtimeAuthority: 'rb_trace.jsonl, rb_output_declarations.jsonl, _work_units/, _cache/, artifacts/wave1/, and reference/',
    diagnosticSurface: 'gate definition failure_message plus provenance helper inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/engine/work-unit-submit.test.mjs',
      'tests/engine/helpers/gate-helpers-provenance.test.mjs',
      'tests/integration/cli/check-gate-wave1-complete.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('wave2-complete', [
      'synthesis_exists',
      'synthesis_non_empty',
      'ledger_exists',
      'ledger_non_empty',
      'ledger_fixed_sections',
      'index_exists',
      'index_yaml_parse',
      'finding_index_contract',
      'synthesis_finding_id_ref',
      'cross_artifact_references',
      'wave1_evidence_ref',
      'rerun_add_full_synthesis',
      'backfill_judgment_token_absent',
      'backfill_questions_token_absent',
    ]),
    artifactCategory: 'Wave2 synthesis, ledger, finding index, links, rerun, and backfill',
    producerInstruction: 'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md',
    runtimeAuthority: 'artifacts/wave2/ and seed_topics/{topic}.md',
    diagnosticSurface: 'gate definition failure_message plus check-gate-wave2-complete inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/engine/wave-depth-contracts.test.mjs',
      'tests/integration/cli/check-gate-wave2-complete.test.mjs',
      'tests/integration/md/phase-wave2-md-structure.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('wave2-complete', [
      'trace_event_wave2_completion',
      'wave2_cross_reference_index_coverage',
      'wave2_work_unit_cross_ref_coverage',
      'wave2_work_unit_submission_presence',
      'wave2_delegated_bypass_suspected',
    ]),
    artifactCategory: 'Wave2 cross-reference navigation and provenance authority',
    producerInstruction: 'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md targeted evidence and existing-backed projection guidance',
    runtimeAuthority: 'reference/00-cross-*.md, reference/_INDEX.md, submitted Wave2 rows, prior accepted backing, and rb_trace.jsonl',
    diagnosticSurface: 'gate definition failure_message plus reference/provenance helper inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/engine/helpers/gate-helpers-provenance.test.mjs',
      'tests/integration/cli/check-gate-wave2-complete.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('hitl2-recorded', [
      'decision_brief_exists',
      'decision_brief_non_empty',
      'profile_yaml_parseable',
      'hitl2_status_recorded',
      'user_decision_non_empty',
      'user_decision_valid_enum',
    ]),
    artifactCategory: 'HITL2 decision brief and profile decision',
    producerInstruction: 'DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md',
    runtimeAuthority: 'artifacts/hitl2/decision-brief.md and rb_profile.yaml',
    diagnosticSurface: 'gate definition failure_message plus check-gate-hitl2-recorded inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/integration/cli/check-gate-hitl2-recorded.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('readiness-passed', [
      'seed_topics_non_empty',
      'reference_index_exists',
      'wave2_synthesis_exists',
      'hitl2_decision_brief_exists',
      'all_prior_gates_passed',
      'profile_yaml_parseable',
      'trace_jsonl_parseable',
    ]),
    artifactCategory: 'readiness preconditions and prior gate trace',
    producerInstruction: 'readiness phase and prior gate handoffs',
    runtimeAuthority: 'seed_topics/, reference/_INDEX.md, artifacts/wave2/synthesis.md, artifacts/hitl2/decision-brief.md, rb_profile.yaml, and rb_trace.jsonl',
    diagnosticSurface: 'gate definition failure_message plus check-gate-readiness-passed inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/integration/cli/check-gate-readiness-passed.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
  {
    rules: ruleKeys('rerun-ready', [
      'rerun_rationale_present',
      'rerun_count_valid',
      'bundle_structure_valid',
    ]),
    artifactCategory: 'HITL2 rerun request and surviving bundle structure',
    producerInstruction: 'rerun phase and HITL2 rerun decision contract',
    runtimeAuthority: 'rb_profile.yaml plus active bundle structure',
    diagnosticSurface: 'gate definition failure_message plus check-gate-rerun-ready inspect/advice',
    classification: 'blocking',
    testGuards: [
      'tests/integration/cli/check-gate-rerun-ready.test.mjs',
      'tests/schema/gate-rule-audit.test.mjs',
    ],
  },
];

function checkKey(rule) {
  return rule.mode ? `${rule.check}:${rule.mode}` : rule.check;
}

function loadDefinitions() {
  return readdirSync(GATE_DEFINITIONS_DIR)
    .filter((file) => file.endsWith('.definition.json'))
    .sort()
    .map((file) => {
      const absPath = join(GATE_DEFINITIONS_DIR, file);
      return { file, absPath, definition: JSON.parse(readFileSync(absPath, 'utf-8')) };
    });
}

function buildInventory() {
  const inventory = new Map();
  for (const group of GATE_RULE_INVENTORY_GROUPS) {
    for (const ruleKey of group.rules) {
      assert.equal(inventory.has(ruleKey), false, `duplicate static audit inventory row for ${ruleKey}`);
      inventory.set(ruleKey, {
        artifactCategory: group.artifactCategory,
        producerInstruction: group.producerInstruction,
        runtimeAuthority: group.runtimeAuthority,
        diagnosticSurface: group.diagnosticSurface,
        classification: group.classification,
        testGuards: group.testGuards,
      });
    }
  }
  return inventory;
}

function assertNoSeverityDrift(value, path = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSeverityDrift(entry, [...path, String(index)]));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    const keyPath = [...path, key].join('.');
    assert.equal(/diagnostic_?only/i.test(key), false, `active gate definition must not carry diagnostic-only severity flags at ${keyPath}`);
    if (typeof entry === 'string') {
      assert.equal(/diagnostic[-_ ]only/i.test(entry), false, `active gate definition must not label pass/fail rule diagnostic-only at ${keyPath}`);
    }
    assertNoSeverityDrift(entry, [...path, key]);
  }
}

describe('active gate rule audit', () => {
  it('routes every active gate rule to a known implementation and inventory row', () => {
    const definitions = loadDefinitions();
    const inventory = buildInventory();
    const activeRuleKeys = new Set();

    for (const { file, definition } of definitions) {
      assert.ok(definition.gate, `${file} must declare gate`);
      assert.ok(Array.isArray(definition.rules), `${file} must declare rules[]`);
      assert.ok(existsSync(join(GATE_CLI_DIR, `check-gate-${definition.gate}.mjs`)), `${definition.gate} must have an active gate CLI`);

      for (const rule of definition.rules) {
        const ruleKey = `${definition.gate}:${rule.id}`;
        activeRuleKeys.add(ruleKey);

        assert.ok(rule.id, `${file} has a rule without id`);
        assert.ok(rule.check, `${ruleKey} has no check name`);
        assert.ok(CHECK_IMPLEMENTATION_ROUTES.has(checkKey(rule)), `${ruleKey} has unknown check implementation: ${checkKey(rule)}`);
        assert.ok(typeof rule.failure_message === 'string' && rule.failure_message.trim(), `${ruleKey} must expose deterministic repair advice through failure_message`);

        if (/^work_unit_|^delegated_bypass/.test(rule.check) || /_work_unit_|_delegated_bypass/.test(rule.id)) {
          assert.ok(SUPPORTED_DELEGATED_PROVENANCE_CHECKS.has(rule.check), `${ruleKey} uses unsupported delegated-provenance check ${rule.check}`);
        }
        if (rule.check === 'work_unit_output_coverage') {
          assert.ok(rule.output_selectors, `${ruleKey} must declare output_selectors`);
          assert.ok(
            (typeof rule.output_selectors.glob === 'string' && rule.output_selectors.glob)
              || Array.isArray(rule.output_selectors.expected_from_topic_registry),
            `${ruleKey} must declare output_selectors.glob or output_selectors.expected_from_topic_registry`,
          );
          assert.ok(Array.isArray(rule.output_selectors.roles) && rule.output_selectors.roles.length > 0, `${ruleKey} must declare output_selectors.roles`);
        }
        if (rule.check === 'work_unit_submission_presence' && rule.output_selectors) {
          assert.ok(
            (typeof rule.output_selectors.glob === 'string' && rule.output_selectors.glob)
              || Array.isArray(rule.output_selectors.expected_from_topic_registry),
            `${ruleKey} must declare a known output selector shape when output_selectors is present`,
          );
        }

        const row = inventory.get(ruleKey);
        assert.ok(row, `${ruleKey} is missing from the static artifact contract inventory`);
        for (const field of REQUIRED_INVENTORY_FIELDS) {
          assert.ok(row[field], `${ruleKey} inventory missing ${field}`);
        }
        assert.ok(ALLOWED_CLASSIFICATIONS.has(row.classification), `${ruleKey} has unsupported classification ${row.classification}`);
        assert.notEqual(row.classification, 'diagnostic-only', `${ruleKey} cannot be diagnostic-only because active gate rules affect pass/fail`);
        assert.ok(row.testGuards.some((guard) => existsSync(join(REPO_ROOT, guard))), `${ruleKey} inventory must name at least one existing test guard`);
      }
    }

    for (const inventoryKey of inventory.keys()) {
      assert.ok(activeRuleKeys.has(inventoryKey), `${inventoryKey} appears in static audit inventory but no active gate definition declares it`);
    }
  });

  it('keeps archived gate wording out of active audit scope and rejects diagnostic-only severity drift', () => {
    for (const { file, absPath, definition } of loadDefinitions()) {
      assert.ok(absPath.startsWith(GATE_DEFINITIONS_DIR), `${file} must come from active framework gate definitions`);
      assert.equal(absPath.includes('/openspec/changes/archive/'), false, `${file} must not be loaded from archives`);
      assertNoSeverityDrift(definition, [file]);
    }
  });
});
