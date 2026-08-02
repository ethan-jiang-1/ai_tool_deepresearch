#!/usr/bin/env node
// @impl EXA-006

import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { claimAndSubmitFixtureWorkUnit } from './work-unit-playbook-utils.mjs';

const REPO_ROOT = process.cwd();
const CASE_ID = process.argv[2];
const targetIndex = process.argv.indexOf('--target-dir');
const TARGET_DIR = targetIndex >= 0 && process.argv[targetIndex + 1] ? resolve(process.argv[targetIndex + 1]) : REPO_ROOT;
if (!['711', '712', '713', '714'].includes(CASE_ID)) {
  console.error('Usage: node experiments_env/shared/prepare-iterative-interaction-case.mjs <711|712|713|714> [--target-dir <dir>]');
  process.exit(2);
}
if (process.argv.length !== (targetIndex >= 0 ? 5 : 3)) {
  console.error('Usage: node experiments_env/shared/prepare-iterative-interaction-case.mjs <711|712|713|714> [--target-dir <dir>]');
  process.exit(2);
}

const TOPIC = {
  topic_uid: 'tp_71271371-2713-4713-8713-712713712713',
  id: '01',
  slug: 'capital-constraints',
  title: 'Capital Constraints',
  must_answer: ['How do capital constraints change the decision?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
};

function runNode(args, { expectedStatus = 0 } = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== expectedStatus) {
    throw new Error(`node ${args.join(' ')} exited ${result.status}, expected ${expectedStatus}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return result;
}

function parseJson(result) {
  const raw = String(result.stdout || '').trim();
  try { return JSON.parse(raw); } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error(`command did not emit JSON: ${raw}\nstderr=${result.stderr}`);
  }
}

function runGate(bundle, gate, currentNode) {
  return parseJson(runNode([
    join(REPO_ROOT, 'experiments_env/shared/run-gate-with-monitor.mjs'),
    '--bundle', bundle,
    '--gate', gate,
    '--',
    process.execPath,
    join(REPO_ROOT, `DPT_FRAMEWORK/cli/gates/check-gate-${gate}.mjs`),
    '--bundle', bundle,
    '--current-node', currentNode,
  ]));
}

function enterPhase(bundle, node) {
  return runNode([join(REPO_ROOT, 'DPT_FRAMEWORK/cli/enter-phase.mjs'), '--bundle', bundle, '--node', node]);
}

function advanceStatus(bundle, gate) {
  return parseJson(runNode([join(REPO_ROOT, 'DPT_FRAMEWORK/cli/advance-status.mjs'), '--bundle', bundle, '--to', gate]));
}

function passAndEnter(bundle, gate, node, statusGate, stageNext) {
  const output = runGate(bundle, gate, node);
  assert.equal(output.check.passed, true, JSON.stringify(output.inspect));
  const entry = enterPhase(bundle, output.check.next);
  const status = advanceStatus(bundle, statusGate);
  if (stageNext) stageNext();
  return { gate: output, entry: entry.stdout, status };
}

function logCompletion(bundle, event) {
  runNode([join(REPO_ROOT, 'DPT_FRAMEWORK/cli/log-event.mjs'), '--bundle', bundle, '--event', event]);
}

function instantiateDisposable(caseId) {
  const stem = `iterative-interaction-${caseId}-${randomUUID().slice(0, 8)}`;
  const created = runNode([
    join(REPO_ROOT, 'DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs'),
    stem,
    '--target-dir', TARGET_DIR,
  ]).stdout.trim();
  const bundle = join(TARGET_DIR, `dpt_disp_case-${caseId}_${stem}_${randomUUID().slice(0, 6)}`);
  renameSync(created, bundle);
  return { bundle, stem };
}

function writeResearchBaseline(bundle, stem) {
  writeFileSync(join(bundle, 'rb_plan.md'), `---\n${JSON.stringify({
    plan_basename: stem,
    topic_registry_version: '2',
    derived_topic_count: 1,
    topic_registry: [TOPIC],
  }, null, 2)}\n---\n# Setup-only research baseline\n\n## Goal\n\n### Purpose\nAssess a constrained investment decision from retained evidence.\n`);
  writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml({
    plan_basename: stem,
    research_profile: 'debug',
    root_must_answer_set: TOPIC.must_answer,
    research_style_params: {
      user_visible: false,
      wave0_per_topic_source_floor: 1,
      wave0_shared_ref_total: 1,
      wave1_per_topic_ref_floor: 1,
      topic_unique_ratio: 0,
      counterexample_search: false,
      cross_verification: false,
      p0p1_independent_backing: 1,
      quality_min_tier: 'tier_4',
      quality_min_substance: 'none',
      wave2_cross_topic_depth: 0,
      wave2_emergent_search_rounds: 0,
    },
    research_access: {
      status: 'available',
      probed_at: '2026-07-17T00:00:00.000Z',
      result_url: 'https://research.example.org/setup-only-probe',
      fetch_outcome: 'success',
    },
    human_decision_checkpoints: {
      hitl1: {
        status: 'recorded',
        recorded_at: '2026-07-17T00:00:00.000Z',
        research_profile: 'debug',
        root_must_answer_set: TOPIC.must_answer,
        answerability_class: 'ready_substantive',
      },
      hitl2: {
        status: 'not_started',
        answerability_class: 'not_assessed',
        user_decision: 'not_started',
        final_report_view: 'profile_default',
        rationale: '',
        rerun_count: 0,
      },
    },
  }));
  mkdirSync(join(bundle, 'seed_topics'), { recursive: true });
  writeFileSync(join(bundle, 'seed_topics/capital-constraints.md'), `---\n${stringifyYaml(TOPIC).trim()}\n---\n# Capital Constraints\n\n## Background\nSetup-only predecessor content.\n`);
}

function ensureIndexRow(bundle, row) {
  const indexPath = join(bundle, 'reference/_INDEX.md');
  let content = readFileSync(indexPath, 'utf8');
  if (!content.includes('| ref_file |')) {
    content = '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n';
  }
  if (!content.includes(`| ${row.split('|')[1].trim()} |`)) content += `${row}\n`;
  writeFileSync(indexPath, content);
}

function submitFixture(bundle, phase, queueId, outputPath, content, extras = []) {
  const result = claimAndSubmitFixtureWorkUnit(bundle, {
    phase,
    queue_item_id: queueId,
    topic_slug: TOPIC.slug,
    title: `${phase} setup-only predecessor`,
    output_path: outputPath,
    role: 'reference',
    source_url: `https://research.example.org/iterative/${queueId}`,
    source_slug: queueId,
    output_content: content,
    extra_output_files: extras,
  });
  assert.equal(result.submit.ok, true);
  return result;
}

function stageWave0(bundle) {
  mkdirSync(join(bundle, 'artifacts/wave0/capital-constraints'), { recursive: true });
  const source = '- url: "https://research.example.org/iterative/wave0"\n  title: "Setup-only baseline"\n  retrieved_date: "2026-07-17"\n  topic_tag: "capital-constraints"\n';
  const refPath = 'reference/00-shared-iterative-baseline.md';
  const ref = '- source_url: https://research.example.org/iterative/wave0\n- acceptance_status: accepted\n- source_type: secondary\n- tier: Tier 2\n- evidence_role: foundation\n- trust_level: practitioner\n- why_it_matters: Setup-only predecessor evidence.\n- accessed_at: 2026-07-17\n- related_topic: all\n\n## Key Facts\n- Capital affects feasible choices.\n- Constraints change timing.\n- Evidence is incomplete.\n- Scenario analysis is useful.\n- Further research can target the gap.\n\n## Core Content Capture\nSetup-only content sufficient for predecessor Gate checks.\n\n## Relevance To This Research\nRelevant.\n\n## Quotable Terms / Concepts\n- capital constraint\n\n## Risks And Limitations\n- Fixture-backed predecessor only.\n';
  writeFileSync(join(bundle, 'artifacts/wave0/capital-constraints/source.yaml'), source);
  writeFileSync(join(bundle, refPath), ref);
  writeFileSync(join(bundle, 'reference/README.md'), '# Reference Evidence\n');
  ensureIndexRow(bundle, `| ${refPath} | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-17 |`);
  const fixture = submitFixture(bundle, 'wave0', 'iterative-wave0', refPath, ref, [
    { path: 'artifacts/wave0/capital-constraints/source.yaml', role: 'source_yaml', content: source },
  ]);
  const workId = fixture.record?.work_id || 'iterative-wave0/1';
  appendFileSync(join(bundle, 'seed_topics/capital-constraints.md'), `\n## 本轮新增证据\n- **entry_id**: ${workId}/1\n  - **evidence_meaning**: Capital constraints affect feasible choices and timing; evidence establishes direction without magnitude.\n  - **relationship**: supports\n  - **refs**: ${refPath}\n  - **status**: supported\n  - **next_hop**: deepen magnitude in wave1\n`);
  logCompletion(bundle, 'wave0_completion');
}

function stageWave1(bundle) {
  mkdirSync(join(bundle, 'artifacts/wave1/capital-constraints'), { recursive: true });
  const w1SourceUrl = 'https://research.example.org/iterative/iterative-wave1';
  const summary = `# Evidence Summary: Capital Constraints\n\n## Source URLs\n- [Setup baseline](${w1SourceUrl})\n\n## Key Findings\n1. **Constraint sensitivity**: available capital changes the feasible decision set.\n\n## Open Questions\n1. [开放] How large is the constraint effect?\n`;
  const questions = `# Question List - Capital Constraints\n\n## Topic Investigation Targets\n| target_id | target_question | origin | status | backing_refs | next_action |\n| --- | --- | --- | --- | --- | --- |\n| T01 | How large is the constraint effect? | baseline | 开放 | ${w1SourceUrl} | 移交 wave2 |\n\n## Question Reconciliation\n- [部分进展] Direction is known, magnitude remains open.\n\n## Emergent Question Protocol\n- result: no_new_questions_after_protocol\n\n## Exploration / Exploitation Decision\n- decision: continue\n`;
  const refPath = 'reference/capital-constraints-deepening.md';
  const ref = `- source_url: ${w1SourceUrl}\n- acceptance_status: accepted\n- source_type: secondary\n- tier: Tier 2\n- evidence_role: deepening_reference\n- trust_level: practitioner\n- why_it_matters: Setup-only Wave1 predecessor evidence.\n- accessed_at: 2026-07-17\n- related_topic: capital-constraints\n\n## Key Facts\n- Capital affects feasibility.\n- Timing matters.\n- Magnitude remains uncertain.\n- Sensitivity analysis helps.\n- More evidence could narrow the gap.\n\n## Core Content Capture\nSetup-only deepening content sufficient for predecessor Gate checks.\n\n## Relevance To This Research\nRelevant.\n\n## Quotable Terms / Concepts\n- sensitivity\n\n## Risks And Limitations\n- Fixture-backed predecessor only.\n`;
  writeFileSync(join(bundle, 'artifacts/wave1/capital-constraints/evidence-summary.md'), summary);
  writeFileSync(join(bundle, 'artifacts/wave1/capital-constraints/question-list.md'), questions);
  writeFileSync(join(bundle, refPath), ref);
  ensureIndexRow(bundle, `| ${refPath} | secondary | practitioner | Tier 2 | capital-constraints | wave1_topic | accepted | 2026-07-17 |`);
  const w1 = submitFixture(bundle, 'wave1', 'iterative-wave1', refPath, ref, [
    { path: 'artifacts/wave1/capital-constraints/evidence-summary.md', role: 'evidence_summary', content: summary },
    { path: 'artifacts/wave1/capital-constraints/question-list.md', role: 'question_list', content: questions },
  ]);
  const w1Id = w1.record?.work_id || 'wu-w1-b000-deep-i0001';
  // Compute and create canonical reference path
  const w1CanonicalToken = (() => {
    const u = new URL(w1SourceUrl);
    return `${u.hostname}${u.pathname}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/, '').slice(0, 48) || 'source';
  })();
  const w1CanonicalDigest = createHash('sha256').update(w1SourceUrl).digest('hex').slice(0, 12);
  const w1CanonicalRef = `reference/capital-constraints-${w1CanonicalToken}-${w1CanonicalDigest}.md`;
  writeFileSync(join(bundle, w1CanonicalRef), `${ref}\n## Provenance\n\n- source_ref: reference/capital-constraints-deepening.md\n- cache_trail: _cache/wave1/primary/iterative-wave1/iterative-wave1\n- work_unit: _work_units/wave1/${w1Id}\n`);
  ensureIndexRow(bundle, `| ${w1CanonicalRef} | secondary | practitioner | Tier 2 | capital-constraints | wave1_topic | accepted | 2026-07-17 |`);
  appendFileSync(join(bundle, 'seed_topics/capital-constraints.md'), `\n## 本轮新增机制理解\n- **entry_id**: ${w1Id}/1\n  - **evidence_meaning**: Capital constraints demonstrably affect feasible choices; timing matters.\n  - **relationship**: supports\n  - **refs**: ${w1CanonicalRef}\n  - **status**: supported\n  - **next_hop**: quantify magnitude in wave2\n\n## 本轮新增趋势与难点\n- **entry_id**: ${w1Id}/2\n  - **evidence_meaning**: Sensitivity analysis is the primary trend; magnitude uncertainty is the core difficulty.\n  - **relationship**: partial\n  - **refs**: ${w1CanonicalRef}\n  - **status**: partial\n  - **next_hop**: cross-topic comparison in wave2\n\n## 待验证问题\n- **entry_id**: ${w1Id}/3\n  - **evidence_meaning**: How large is the capital-constraint effect?\n  - **relationship**: defers\n  - **refs**: ${w1CanonicalRef}\n  - **status**: deferred\n  - **next_hop**: 移交 wave2\n`);
  // Fix depth-review.yaml with carried_targets
  const depthReviewPath = join(bundle, 'artifacts/wave1/capital-constraints/depth-review.yaml');
  const review = JSON.parse(readFileSync(depthReviewPath, 'utf8'));
  review.carried_targets = [{ target_id: 'T01', target_text: 'How large is the constraint effect?' }];
  writeFileSync(depthReviewPath, `${JSON.stringify(review, null, 2)}\n`);
  logCompletion(bundle, 'wave1_completion');
}

function stageWave2(bundle) {
  mkdirSync(join(bundle, 'artifacts/wave2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/wave2/synthesis.md'), '# Cross-Topic Synthesis\n\nW2F-712 follows [Wave1 evidence](../wave1/capital-constraints/evidence-summary.md).\n');
  writeFileSync(join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), '# Cross-Topic Ledger\n\n## Cross-Topic Scan Matrix\nSingle topic scanned.\n\n## Wave1 Legacy Questions\nCapital-constraint magnitude.\n\n## Cross-Topic Resolutions\nW2F-712 partially resolves direction.\n\n## Emergent Cross-Topic Questions\nNone.\n\n## Exploration Decisions\nRetain the material gap for HITL2 review.\n\n## HITL2 Handoff\nReview whether the capital-constraint gap warrants a rerun.\n');
  // Compute Wave1 carried-target receipt hashes
  const sha = (value) => createHash('sha256').update(value).digest('hex');
  const normalize = (value) => String(value || '').normalize('NFC').replace(/\r\n?/g, '\n').trim();
  const topicUid = 'tp_71271371-2713-4713-8713-712713712713';
  const intentSha = sha(JSON.stringify({
    title: normalize('Capital Constraints'),
    must_answer: ['How do capital constraints change the decision?'].map((v) => normalize(v)),
    scope_role: normalize('primary'),
    depends_on_topic_uids: [],
  }));
  const targetId = 'T01';
  const targetText = 'How large is the constraint effect?';
  const targetRevision = sha(JSON.stringify({ target_id: targetId, target_text: normalize(targetText) }));
  const receiptTargets = [{ topic_uid: topicUid, intent_sha256: intentSha, target_id: targetId, target_revision: targetRevision }];
  const receiptSha = sha(JSON.stringify({ contract_version: 'wave1-carried-targets/v1', targets: receiptTargets }));
  writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), stringifyYaml({
    version: '0.1',
    source_layer: 'wave2_cross_topic',
    ledger: 'artifacts/wave2/cross-topic-ledger.md',
    synthesis: 'artifacts/wave2/synthesis.md',
    scan: { topic_count: 1, pair_count_expected: 0, pair_count_checked: 0 },
    findings: [{
      id: 'W2F-712', type: 'cross_topic_resolution', priority: 'p2', status: 'resolved',
      decision: 'defer_hitl2', affected_topics: ['capital-constraints'],
      origin_refs: ['artifacts/wave1/capital-constraints/evidence-summary.md'],
      trigger_refs: ['artifacts/wave1/capital-constraints/question-list.md'], search_required: false,
      subagent_receipt_refs: [], appears_in_synthesis: false, hitl2_handoff: true,
      confidence: 'medium', independent_backing_refs: [], gap_status: 'deferred_hitl2',
      wave1_target_bindings: [{
        receipt_sha256: receiptSha,
        topic_uid: topicUid,
        intent_sha256: intentSha,
        target_id: targetId,
        target_revision: targetRevision,
      }],
    }],
    synthesis_eligibility: {
      pure_synthesis_eligible: true, scan_matrix_present: true, scan_topic_pair_coverage: [],
      unresolved_search_required_count: 0, targeted_search_required_count: 0,
      targeted_search_submitted_count: 0, explicit_deferral_count: 1,
      profile_params_read: ['p0p1_independent_backing'], ineligibility_reasons: [],
    },
  }));
  appendFileSync(join(bundle, 'seed_topics/capital-constraints.md'), `\n## 当前判断\n- **entry_id**: W2F-712\n  - **evidence_meaning**: W2F-712 retains a material magnitude gap; direction is partially resolved.\n  - **relationship**: partial\n  - **refs**: reference/capital-constraints-deepening.md\n  - **status**: partial\n  - **next_hop**: HITL2 review\n\n## 待验证问题\n- **entry_id**: W2F-712\n  - **evidence_meaning**: How large is the capital-constraint effect?\n  - **relationship**: defers\n  - **refs**: reference/capital-constraints-deepening.md\n  - **status**: deferred\n  - **next_hop**: 移交 HITL2\n`);
  logCompletion(bundle, 'wave2_completion');
}

function buildHitl2Boundary(caseId) {
  const { bundle, stem } = instantiateDisposable(caseId);
  writeResearchBaseline(bundle, stem);
  passAndEnter(bundle, 'instantiation-complete', 'phases/phase-instantiation.md', 'hitl1_recorded');
  passAndEnter(bundle, 'hitl1-recorded', 'phases/phase-hitl1.md', 'setup_ready');
  passAndEnter(bundle, 'setup-ready', 'phases/phase-setup.md', 'setup_ready');
  passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', () => stageWave0(bundle));
  passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete', () => stageWave1(bundle));
  passAndEnter(bundle, 'wave1-complete', 'phases/phase-wave1.md', 'wave1_complete', () => stageWave2(bundle));
  passAndEnter(bundle, 'wave2-complete', 'phases/phase-wave2.md', 'wave2_complete');
  return { bundle, stem };
}

function readStatus(bundle) {
  return JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
}

function prepareHitl1(caseId) {
  const { bundle } = instantiateDisposable(caseId);
  const predecessor = passAndEnter(bundle, 'instantiation-complete', 'phases/phase-instantiation.md', 'hitl1_recorded');
  const status = readStatus(bundle);
  const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
  assert.equal(status.current_node, 'phases/phase-hitl1.md');
  assert.equal(profile.research_access.status, 'unprobed');
  assert.equal(profile.research_profile, 'not_selected');
  assert.equal(profile.human_decision_checkpoints.hitl1.status, 'not_started');
  writeFileSync(join(bundle, `case-${caseId}-research-request.txt`), 'Research whether a cash-constrained small company should buy one piece of equipment now or defer; keep the scope compact and decision-focused.\n');
  writeFileSync(join(bundle, `case-${caseId}-setup.json`), `${JSON.stringify({
    fixture: 'setup_only',
    legal_boundary: { current_node: status.current_node, current_gate: status.current_gate, next_gate: status.next_gate },
    research_access_status: profile.research_access.status,
    recommendation_absent: true,
    accepted_decision_absent: true,
    predecessor_gate: predecessor.gate.check.gate,
  }, null, 2)}\n`);
  return bundle;
}

function prepare712() {
  const { bundle } = buildHitl2Boundary('712');
  const status = readStatus(bundle);
  const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
  assert.equal(status.current_node, 'phases/phase-hitl2.md');
  assert.equal(profile.human_decision_checkpoints.hitl2.status, 'not_started');
  writeFileSync(join(bundle, 'case-712-setup.json'), `${JSON.stringify({
    fixture: 'setup_only',
    legal_boundary: { current_node: status.current_node, current_gate: status.current_gate, next_gate: status.next_gate },
    decision_brief_absent: true,
    recommendation_absent: true,
    accepted_decision_absent: true,
  }, null, 2)}\n`);
  return bundle;
}

function prepare713() {
  const { bundle } = buildHitl2Boundary('713');
  mkdirSync(join(bundle, 'artifacts/hitl2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/hitl2/decision-brief.md'), '# Decision Brief\n\n## Key Findings\nThe setup-only evidence identifies a capital-constraint effect.\n\n## Open Questions\nMagnitude remains uncertain.\n\n## Recommended Actions\nProceed with a qualified report.\n');
  const profilePath = join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  profile.human_decision_checkpoints.hitl2 = {
    ...profile.human_decision_checkpoints.hitl2,
    status: 'recorded',
    answerability_class: 'ready_insufficient_judgment',
    user_decision: 'proceed_to_readiness',
    final_report_view: 'profile_default',
    rationale: 'Produce a qualified report from the current evidence.',
    recorded_at: '2026-07-17T00:00:00.000Z',
  };
  writeFileSync(profilePath, stringifyYaml(profile));
  logCompletion(bundle, 'hitl2_recorded');
  const handoff = passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
  const status = readStatus(bundle);
  assert.equal(status.current_node, 'phases/phase-readiness.md');
  assert.equal(status.current_gate, 'hitl2_recorded');
  assert.equal(status.next_gate, 'readiness_passed');
  writeFileSync(join(bundle, 'case-713-setup.json'), `${JSON.stringify({
    fixture: 'setup_only',
    legal_boundary: { current_node: status.current_node, current_gate: status.current_gate, next_gate: status.next_gate },
    seeded_direct_fact: 'readiness-passed Gate has not run yet',
    continuation: handoff.status.continuation,
    final_directory_expected_empty: true,
  }, null, 2)}\n`);
  return bundle;
}

console.log(CASE_ID === '711' || CASE_ID === '714' ? prepareHitl1(CASE_ID) : CASE_ID === '712' ? prepare712() : prepare713());
