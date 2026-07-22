// Deterministic Agent-owned content staging for production lifecycle E2E tests.
// Engine authority is always produced by the real CLIs in deterministic-chain-harness.mjs.

import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { claimAndSubmitFixtureWorkUnit } from '../../../experiments_env/shared/work-unit-playbook-utils.mjs';
import {
  advanceStatus, enterPhase, instantiateBundle, readStatus, REPO_ROOT, runGate, runNode,
} from './deterministic-chain-harness.mjs';

export const PRIMARY_TOPIC = { topic_uid: 'tp_11111111-1111-4111-8111-111111111111', id: 't1', slug: 'topic-a', title: 'Topic A', must_answer: ['How does rerun continuity preserve authority?'], scope_role: 'primary', depends_on_topic_uids: [] };

export function stageSeed(bundle, rerunCount, { action = 'supplement', directionCount = rerunCount } = {}) {
  mkdirSync(join(bundle, 'seed_topics'), { recursive: true });
  writeFileSync(join(bundle, 'seed_topics/topic-a.md'), `---\n${stringifyYaml(PRIMARY_TOPIC).trim()}\n---\n# Topic A\n\n## Background\nFixture-labeled Agent input.\n\n## 本轮重跑方向\n- rerun_count: ${directionCount}\n- action: ${action}\n- new_search_dimensions: controlled continuity\n`);
}

export function writePlanAndProfile(bundle, { decision = 'not_started', rerunCount = 1 } = {}) {
  const planBasename = basename(bundle).replace(/^dpt_rb_/, '');
  writeFileSync(join(bundle, 'rb_plan.md'), `---\n${JSON.stringify({ plan_basename: planBasename, topic_registry_version: '2', derived_topic_count: 1, topic_registry: [PRIMARY_TOPIC] }, null, 2)}\n---\n# Deterministic rerun plan\n`);
  writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml({
    plan_basename: planBasename, research_profile: 'debug', root_must_answer_set: PRIMARY_TOPIC.must_answer,
    research_style_params: { user_visible: false, wave0_per_topic_source_floor: 1, wave0_shared_ref_total: 1, wave1_per_topic_ref_floor: 1, topic_unique_ratio: 0, counterexample_search: false, cross_verification: false, p0p1_independent_backing: 1, quality_min_tier: 'tier_4', quality_min_substance: 'none', wave2_cross_topic_depth: 0, wave2_emergent_search_rounds: 0 },
    research_access: { status: 'available', probed_at: '2026-07-15T00:00:00.000Z', result_url: 'https://research.example.org/probe', fetch_outcome: 'success' },
    human_decision_checkpoints: {
      hitl1: { status: 'recorded', recorded_at: '2026-07-15T00:00:00.000Z', research_profile: 'debug', root_must_answer_set: PRIMARY_TOPIC.must_answer, answerability_class: 'ready_substantive' },
      hitl2: { status: decision === 'not_started' ? 'not_started' : 'recorded', answerability_class: 'not_assessed', user_decision: decision, final_report_view: 'profile_default', rationale: decision === 'rerun' ? 'Test another controlled rerun direction.' : '', rerun_count: rerunCount, recorded_at: '2026-07-15T00:00:00.000Z' },
    },
  }));
  stageSeed(bundle, rerunCount);
}

function logCompletion(bundle, event) {
  runNode([join(REPO_ROOT, 'DPT_FRAMEWORK/cli/log-event.mjs'), '--bundle', bundle, '--event', event]);
}

function ensureIndexRow(bundle, row) {
  const indexPath = join(bundle, 'reference/_INDEX.md');
  let content = readFileSync(indexPath, 'utf8');
  if (!content.includes('| ref_file |')) content = '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n';
  if (!content.includes(`| ${row.split('|')[1].trim()} |`)) content += `${row}\n`;
  writeFileSync(indexPath, content);
}

function submitFixture(bundle, phase, queueId, outputPath, content, extras = []) {
  const result = claimAndSubmitFixtureWorkUnit(bundle, {
    phase, queue_item_id: queueId, topic_slug: 'topic-a', title: `${phase} deterministic fixture`, output_path: outputPath,
    role: 'reference', source_url: `https://research.example.org/${queueId}`, source_slug: queueId,
    output_content: content, extra_output_files: extras,
  });
  assert.equal(result.submit.ok, true);
  assert.equal(result.submit.status, 'submitted');
  return result;
}

export function stageWave0(bundle, suffix = 'r1') {
  mkdirSync(join(bundle, 'artifacts/wave0/topic-a'), { recursive: true });
  mkdirSync(join(bundle, 'reference'), { recursive: true });
  const source = `- url: "https://research.example.org/${suffix}"\n  title: "Continuity ${suffix}"\n  retrieved_date: "2026-07-15"\n  topic_tag: "topic-a"\n`;
  const refPath = `reference/00-shared-${suffix}.md`;
  const ref = `- source_url: https://research.example.org/${suffix}\n- acceptance_status: accepted\n- source_type: secondary\n- tier: Tier 2\n- evidence_role: foundation\n- trust_level: practitioner\n- why_it_matters: Rerun continuity fixture.\n- accessed_at: 2026-07-15\n- related_topic: all\n\n## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nThis fixture is sufficiently substantive to exercise deterministic source and cache contracts without claiming real research quality.\n\n## Relevance To This Research\nRelevant.\n\n## Quotable Terms / Concepts\n- continuity\n\n## Risks And Limitations\n- Fixture only.\n`;
  writeFileSync(join(bundle, 'artifacts/wave0/topic-a/source.yaml'), source);
  writeFileSync(join(bundle, refPath), ref);
  writeFileSync(join(bundle, 'reference/README.md'), '# Reference Evidence\n');
  ensureIndexRow(bundle, `| ${refPath} | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-15 |`);
  const submitted = submitFixture(bundle, 'wave0', `wave0-${suffix}`, refPath, ref, [{ path: 'artifacts/wave0/topic-a/source.yaml', role: 'source_yaml', content: source }]);
  logCompletion(bundle, 'wave0_completion');
  return submitted;
}

export function stageWave1(bundle, suffix = 'r1') {
  mkdirSync(join(bundle, 'artifacts/wave1/topic-a'), { recursive: true });
  const summary = `# Evidence Summary: Topic A\n\n## Source URLs\n- [Continuity](https://research.example.org/${suffix}-deep)\n\n## Key Findings\n1. **Continuity**: Real checkpoints preserve rerun authority.\n\n## Open Questions\n1. [开放] Which direction is current?\n`;
  const questions = `# Question List - Topic A\n\n## Topic Investigation Targets\n| target_id | target_question | origin | status | backing_refs | next_action |\n| --- | --- | --- | --- | --- | --- |\n| T01 | Which direction is current? | rerun | 开放 | https://research.example.org/${suffix}-deep | 移交 wave2 |\n\n## Question Reconciliation\n- [部分进展] Count binding is deterministic.\n\n## Emergent Question Protocol\n- result: no_new_questions_after_protocol\n\n## Exploration / Exploitation Decision\n- decision: continue\n`;
  const refPath = `reference/topic-a-${suffix}-deepening.md`;
  const ref = `- source_url: https://research.example.org/${suffix}-deep\n- acceptance_status: accepted\n- source_type: secondary\n- tier: Tier 2\n- evidence_role: deepening_reference\n- trust_level: practitioner\n- why_it_matters: Deepening fixture.\n- accessed_at: 2026-07-15\n- related_topic: topic-a\n\n## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nThis deterministic fixture provides sufficient backing for the real Wave1 gate and submitted work-unit contract.\n\n## Relevance To This Research\nRelevant.\n## Quotable Terms / Concepts\n- binding\n## Risks And Limitations\n- Fixture.\n`;
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/evidence-summary.md'), summary);
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/question-list.md'), questions);
  writeFileSync(join(bundle, refPath), ref);
  ensureIndexRow(bundle, `| ${refPath} | secondary | practitioner | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-15 |`);
  const submitted = submitFixture(bundle, 'wave1', `wave1-${suffix}`, refPath, ref, [
    { path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary', content: summary },
    { path: 'artifacts/wave1/topic-a/question-list.md', role: 'question_list', content: questions },
  ]);
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml'), stringifyYaml({
    version: 'depth-review.v1',
    topic_slug: 'topic-a',
    reviewed_work_unit_refs: [submitted.record.paths.work_unit_dir],
    depth_dimensions: {
      mechanism: { status: 'covered', refs: [submitted.record.paths.result_ref] },
      trend_or_difficulty: { status: 'covered', refs: [submitted.record.paths.result_ref] },
      limitation_or_dispute: { status: 'covered', refs: [submitted.record.paths.result_ref] },
    },
    profile_checks: {
      counterexample_search: { status: 'not_required', refs: [] },
      cross_verification: { status: 'not_required', refs: [] },
    },
    decision: 'accept',
    supplementary_queue_item_ids: [],
    carried_targets: [],
  }));
  appendFileSync(join(bundle, 'seed_topics/topic-a.md'), '\n## 本轮新增机制理解\n- Real checkpoints bind rerun state.\n\n## 本轮新增趋势与难点\n- Direction freshness matters.\n\n## 待验证问题\n- [部分解答] Which direction is current?\n');
  logCompletion(bundle, 'wave1_completion');
  return submitted;
}

export function stageWave2(bundle) {
  mkdirSync(join(bundle, 'artifacts/wave2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/wave2/synthesis.md'), '# Cross-Topic Synthesis\n\nW2F-001 follows [Wave1 evidence](../wave1/topic-a/evidence-summary.md).\n');
  writeFileSync(join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), '# Cross-Topic Ledger\n\n## Cross-Topic Scan Matrix\nSingle topic scanned.\n\n## Wave1 Legacy Questions\nDirection freshness.\n\n## Cross-Topic Resolutions\nW2F-001 resolved.\n\n## Emergent Cross-Topic Questions\nNone.\n\n## Exploration Decisions\nUse existing evidence.\n\n## HITL2 Handoff\nReview rerun output.\n');
  writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), stringifyYaml({ version: '0.1', source_layer: 'wave2_cross_topic', ledger: 'artifacts/wave2/cross-topic-ledger.md', synthesis: 'artifacts/wave2/synthesis.md', scan: { topic_count: 1, pair_count_expected: 0, pair_count_checked: 0 }, findings: [{ id: 'W2F-001', type: 'cross_topic_resolution', priority: 'p2', status: 'resolved', decision: 'use_existing_evidence', affected_topics: ['topic-a'], origin_refs: ['artifacts/wave1/topic-a/evidence-summary.md'], trigger_refs: ['artifacts/wave1/topic-a/question-list.md'], search_required: false, subagent_receipt_refs: [], appears_in_synthesis: true, hitl2_handoff: false, confidence: 'medium', independent_backing_refs: [], gap_status: 'no_gap' }], synthesis_eligibility: { pure_synthesis_eligible: true, scan_matrix_present: true, scan_topic_pair_coverage: [], unresolved_search_required_count: 0, targeted_search_required_count: 0, targeted_search_submitted_count: 0, explicit_deferral_count: 0, profile_params_read: ['p0p1_independent_backing'], ineligibility_reasons: [] } }));
  appendFileSync(join(bundle, 'seed_topics/topic-a.md'), '\n## Wave2 Judgment\nW2F-001 confirms deterministic continuity.\n\n## Pending Questions\n- [部分解答] Direction freshness.\n');
  logCompletion(bundle, 'wave2_completion');
}

export function stageHitl2(bundle, decision, rerunCount = 1) {
  mkdirSync(join(bundle, 'artifacts/hitl2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/hitl2/decision-brief.md'), '# Decision Brief\n\n## Key Findings\nContinuity reached HITL2.\n\n## Open Questions\nNone.\n\n## Recommended Actions\nProceed.\n');
  const profilePath = join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  profile.human_decision_checkpoints.hitl2 = { ...profile.human_decision_checkpoints.hitl2, status: 'recorded', user_decision: decision, final_report_view: 'profile_default', rationale: 'Exercise deterministic continuity.', rerun_count: rerunCount, recorded_at: '2026-07-15T00:00:00.000Z' };
  writeFileSync(profilePath, stringifyYaml(profile));
  logCompletion(bundle, 'hitl2_recorded');
}

export function passAndEnter(bundle, gate, node, statusGate, stageNext) {
  const gateResult = runGate(bundle, gate, node);
  assert.equal(gateResult.output.check.passed, true, JSON.stringify(gateResult.output.inspect));
  enterPhase(bundle, gateResult.output.check.next);
  advanceStatus(bundle, statusGate);
  if (stageNext) stageNext();
  return gateResult.output;
}

export function buildHitl2Baseline(root, label = 'baseline') {
  const bundle = instantiateBundle(root, label);
  writePlanAndProfile(bundle);
  passAndEnter(bundle, 'instantiation-complete', 'phases/phase-instantiation.md', 'hitl1_recorded');
  passAndEnter(bundle, 'hitl1-recorded', 'phases/phase-hitl1.md', 'setup_ready');
  passAndEnter(bundle, 'setup-ready', 'phases/phase-setup.md', 'setup_ready');
  passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', () => stageWave0(bundle));
  passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete', () => stageWave1(bundle));
  passAndEnter(bundle, 'wave1-complete', 'phases/phase-wave1.md', 'wave1_complete', () => stageWave2(bundle));
  passAndEnter(bundle, 'wave2-complete', 'phases/phase-wave2.md', 'wave2_complete');
  assert.equal(readStatus(bundle).current_node, 'phases/phase-hitl2.md');
  return bundle;
}

export function buildTerminalFinalBaseline(root, label = 'terminal') {
  const bundle = buildHitl2Baseline(root, label);
  runNode([join(REPO_ROOT, 'DPT_FRAMEWORK/cli/apply-research-style.mjs'), '--bundle', bundle, '--style', 'quick_factual']);
  stageHitl2(bundle, 'proceed_to_readiness', 0);
  passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
  const readiness = runGate(bundle, 'readiness-passed', 'phases/phase-readiness.md');
  assert.equal(readiness.output.check.passed, true, JSON.stringify(readiness.output.inspect));
  enterPhase(bundle, readiness.output.check.next);
  advanceStatus(bundle, 'readiness_passed');
  mkdirSync(join(bundle, 'final'), { recursive: true });
  writeFileSync(join(bundle, 'final/report.md'), '# Deterministic Final\n\nFixture-labeled Agent-owned final content.\n');
  assert.equal(readStatus(bundle).current_node, 'phases/phase-final.md');
  return bundle;
}
