#!/usr/bin/env node
// @impl EXA-006

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { renderSeedProjectionCard, projectionSlotsForWave } from '../../DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';

import { claimAndSubmitFixtureWorkUnit } from './work-unit-playbook-utils.mjs';

const REPO_ROOT = process.cwd();
const targetIndex = process.argv.indexOf('--target-dir');
if (process.argv.length !== (targetIndex >= 0 ? 4 : 2) || (targetIndex >= 0 && !process.argv[targetIndex + 1])) {
  console.error('Usage: node experiments_env/shared/prepare-rerun-direction-canary.mjs [--target-dir <dir>]');
  process.exit(2);
}
const TARGET_DIR = targetIndex >= 0 ? resolve(process.argv[targetIndex + 1]) : REPO_ROOT;
const TOPIC = {
  topic_uid: 'tp_31831831-8318-4318-8318-318318318318',
  id: 't1',
  slug: 'topic-a',
  title: 'Rerun Continuity',
  must_answer: ['How should rerun direction recover after an interrupted profile update?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
};

function runNode(args, { expectedStatus = 0 } = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
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
    join(REPO_ROOT, 'experiments_env', 'shared', 'run-gate-with-monitor.mjs'),
    '--bundle', bundle,
    '--gate', gate,
    '--',
    process.execPath,
    join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'gates', `check-gate-${gate}.mjs`),
    '--bundle', bundle,
    '--current-node', currentNode,
  ]));
}

function enterPhase(bundle, node) {
  runNode([join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'enter-phase.mjs'), '--bundle', bundle, '--node', node]);
}

function advanceStatus(bundle, gate) {
  runNode([join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'advance-status.mjs'), '--bundle', bundle, '--to', gate]);
}

function passAndEnter(bundle, gate, node, statusGate, stageNext) {
  const output = runGate(bundle, gate, node);
  assert.equal(output.check.passed, true, JSON.stringify(output.inspect));
  enterPhase(bundle, output.check.next);
  advanceStatus(bundle, statusGate);
  if (stageNext) stageNext();
  return output;
}

function logCompletion(bundle, event) {
  runNode([join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'log-event.mjs'), '--bundle', bundle, '--event', event]);
}

function ensureIndexRow(bundle, row) {
  const path = join(bundle, 'reference/_INDEX.md');
  let content = readFileSync(path, 'utf8');
  if (!content.includes('| ref_file |')) {
    content = '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n';
  }
  if (!content.includes(`| ${row.split('|')[1].trim()} |`)) content += `${row}\n`;
  writeFileSync(path, content);
}

function submitFixture(bundle, phase, queueId, outputPath, content, extras = []) {
  const result = claimAndSubmitFixtureWorkUnit(bundle, {
    phase,
    queue_item_id: queueId,
    topic_slug: TOPIC.slug,
    title: `${phase} case-318 setup fixture`,
    output_path: outputPath,
    role: 'reference',
    source_url: `https://research.example.org/case-318/${queueId}`,
    source_slug: queueId,
    output_content: content,
    extra_output_files: extras,
  });
  assert.equal(result.submit.ok, true);
  return result;
}

function writePlanProfileAndSeed(bundle, planBasename) {
  writeFileSync(join(bundle, 'rb_plan.md'), `---\n${JSON.stringify({
    plan_basename: planBasename,
    topic_registry_version: '2',
    derived_topic_count: 1,
    topic_registry: [TOPIC],
  }, null, 2)}\n---\n# Case 318 legal setup plan\n`);
  writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml({
    plan_basename: planBasename,
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
      probed_at: '2026-07-15T00:00:00.000Z',
      result_url: 'https://research.example.org/case-318/probe',
      fetch_outcome: 'success',
    },
    human_decision_checkpoints: {
      hitl1: {
        status: 'recorded',
        recorded_at: '2026-07-15T00:00:00.000Z',
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
  writeFileSync(join(bundle, 'seed_topics/topic-a.md'), `---\n${stringifyYaml(TOPIC).trim()}\n---\n# Rerun Continuity\n\n## Background\nSetup-only fixture establishing prior research state.\n`);
}

function stageWave0(bundle) {
  mkdirSync(join(bundle, 'artifacts/wave0/topic-a'), { recursive: true });
  mkdirSync(join(bundle, 'reference'), { recursive: true });
  const source = '- url: "https://research.example.org/case-318/wave0"\n  title: "Case 318 baseline"\n  retrieved_date: "2026-07-15"\n  topic_tag: "topic-a"\n';
  const refPath = 'reference/00-shared-case-318.md';
  const ref = '- source_url: https://research.example.org/case-318/wave0\n- acceptance_status: accepted\n- source_type: secondary\n- tier: Tier 2\n- evidence_role: foundation\n- trust_level: practitioner\n- why_it_matters: Setup-only predecessor evidence.\n- accessed_at: 2026-07-15\n- related_topic: all\n\n## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nA setup-only fixture with enough substance for production predecessor gates.\n\n## Relevance To This Research\nRelevant.\n\n## Quotable Terms / Concepts\n- continuity\n\n## Risks And Limitations\n- Fixture only.\n';
  writeFileSync(join(bundle, 'artifacts/wave0/topic-a/source.yaml'), source);
  writeFileSync(join(bundle, refPath), ref);
  writeFileSync(join(bundle, 'reference/README.md'), '# Reference Evidence\n');
  ensureIndexRow(bundle, `| ${refPath} | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-15 |`);
  const submitted = submitFixture(bundle, 'wave0', 'case318-wave0', refPath, ref, [
    { path: 'artifacts/wave0/topic-a/source.yaml', role: 'source_yaml', content: source },
  ]);
  const workId = submitted.record.work_id;
  const wave0Card = renderSeedProjectionCard(projectionSlotsForWave('wave0')[0]);
  writeFileSync(join(bundle, 'seed_topics/topic-a.md'), `${readFileSync(join(bundle, 'seed_topics/topic-a.md'), 'utf8')}\n## Wave0：本主题的新增来源证据\n\n${wave0Card}\n- **entry_id**: ${workId}/1\n  - **evidence_meaning**: Setup-only fixture establishes prior research state via shared foundation reference.\n  - **relationship**: supports\n  - **refs**:\n    - ${refPath}\n  - **status**: supported\n  - **next_hop**: continue\n`);
  logCompletion(bundle, 'wave0_completion');
}

function stageWave1(bundle) {
  mkdirSync(join(bundle, 'artifacts/wave1/topic-a'), { recursive: true });
  const summary = '# Evidence Summary: Rerun Continuity\n\n## Source URLs\n- [Case 318](https://research.example.org/case-318/case318-wave1)\n\n## Key Findings\n1. **Recovery**: Direction/profile binding is observable.\n\n## Open Questions\n1. [开放] Can an Agent recover the crash window?\n';
  const questions = '# Question List - Rerun Continuity\n\n## Topic Investigation Targets\n| target_id | target_question | origin | status | backing_refs | next_action |\n| --- | --- | --- | --- | --- | --- |\n| T01 | Can an Agent recover the crash window? | rerun | 开放 | https://research.example.org/case-318/case318-wave1 | 移交 wave2 |\n\n## Question Reconciliation\n- [部分进展] The deterministic boundary exists.\n\n## Emergent Question Protocol\n- result: no_new_questions_after_protocol\n\n## Exploration / Exploitation Decision\n- decision: continue\n';
  const sourceUrl = 'https://research.example.org/case-318/case318-wave1';
  const canonicalPath = 'reference/topic-a-research-example-org-case-318-case318-wave1-2c140f24eb8f.md';
  const ref = `- source_url: ${sourceUrl}\n- acceptance_status: accepted\n- source_type: secondary\n- tier: Tier 2\n- evidence_role: deepening_reference\n- trust_level: practitioner\n- why_it_matters: Setup-only Wave1 predecessor evidence.\n- accessed_at: 2026-07-15\n- related_topic: topic-a\n\n## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nA setup-only deepening fixture sufficient for the real Wave1 gate.\n\n## Relevance To This Research\nRelevant.\n\n## Quotable Terms / Concepts\n- recovery\n\n## Risks And Limitations\n- Fixture only.\n`;
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/evidence-summary.md'), summary);
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/question-list.md'), questions);
  ensureIndexRow(bundle, `| ${canonicalPath} | secondary | practitioner | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-15 |`);
  const submitted = submitFixture(bundle, 'wave1', 'case318-wave1', canonicalPath, ref, [
    { path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary', content: summary },
    { path: 'artifacts/wave1/topic-a/question-list.md', role: 'question_list', content: questions },
  ]);
  const workId = submitted.record.work_id;
  // Append work-unit and cache-trail citations to the reference body for canonical projection binding
  const trailRef = '_cache/wave1/primary/case318-wave1/case318-wave1';
  const wuRef = `_work_units/wave1/${workId}`;
  writeFileSync(join(bundle, canonicalPath), `${readFileSync(join(bundle, canonicalPath), 'utf8')}\n## Work Unit Citation\n- ${canonicalPath}\n- ${wuRef}\n- ${trailRef}\n`);
  // Patch depth-review.yaml to add carried_targets
  const drPath = join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml');
  const dr = parseYaml(readFileSync(drPath, 'utf8'));
  dr.carried_targets = [];
  writeFileSync(drPath, stringifyYaml(dr));
  const w1mechCard = renderSeedProjectionCard(projectionSlotsForWave('wave1')[0]);
  const w1trendCard = renderSeedProjectionCard(projectionSlotsForWave('wave1')[1]);
  const w1pqCard = renderSeedProjectionCard(projectionSlotsForWave('wave1')[2]);
  writeFileSync(join(bundle, 'seed_topics/topic-a.md'), `${readFileSync(join(bundle, 'seed_topics/topic-a.md'), 'utf8')}
## Wave1：本主题的机制理解

${w1mechCard}
- **entry_id**: ${workId}/1
  - **evidence_meaning**: Direction/profile binding is deterministic and observable through the gate lifecycle.
  - **relationship**: supports
  - **refs**:
    - ${canonicalPath}
  - **status**: supported
  - **next_hop**: continue

## Wave1：本主题的趋势、难点与限制

${w1trendCard}
- **entry_id**: ${workId}/2
  - **evidence_meaning**: Crash-window recovery needs Agent reasoning to preserve directional continuity across gate cycles.
  - **relationship**: partial
  - **refs**:
    - ${canonicalPath}
  - **status**: partial
  - **next_hop**: wave2

## 本主题的待验证问题与后续验证路径

${w1pqCard}
- **entry_id**: ${workId}/3
  - **evidence_meaning**: Can an Agent recover the crash window and preserve the direction bytes across a profile mismatch?
  - **relationship**: opens
  - **refs**:
    - ${canonicalPath}
  - **status**: open
  - **next_hop**: wave2
`);
  logCompletion(bundle, 'wave1_completion');
}

function stageWave2(bundle) {
  mkdirSync(join(bundle, 'artifacts/wave2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/wave2/synthesis.md'), '# Cross-Topic Synthesis\n\nW2F-318 follows [Wave1 evidence](../wave1/topic-a/evidence-summary.md).\n');
  writeFileSync(join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), '# Cross-Topic Ledger\n\n## Cross-Topic Scan Matrix\nSingle topic scanned.\n\n## Wave1 Legacy Questions\nCrash-window recovery.\n\n## Cross-Topic Resolutions\nW2F-318 resolved.\n\n## Emergent Cross-Topic Questions\nNone.\n\n## Exploration Decisions\nUse existing evidence.\n\n## HITL2 Handoff\nRequest a controlled rerun.\n');
  writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), stringifyYaml({
    version: '0.1',
    source_layer: 'wave2_cross_topic',
    ledger: 'artifacts/wave2/cross-topic-ledger.md',
    synthesis: 'artifacts/wave2/synthesis.md',
    scan: { topic_count: 1, pair_count_expected: 0, pair_count_checked: 0 },
    findings: [{
      id: 'W2F-318', type: 'cross_topic_resolution', priority: 'p2', status: 'resolved',
      decision: 'use_existing_evidence', affected_topics: ['topic-a'],
      origin_refs: ['artifacts/wave1/topic-a/evidence-summary.md'],
      trigger_refs: ['artifacts/wave1/topic-a/question-list.md'], search_required: false,
      subagent_receipt_refs: [], appears_in_synthesis: true, hitl2_handoff: false,
      confidence: 'medium', independent_backing_refs: [], gap_status: 'no_gap',
    }],
    synthesis_eligibility: {
      pure_synthesis_eligible: true, scan_matrix_present: true, scan_topic_pair_coverage: [],
      unresolved_search_required_count: 0, targeted_search_required_count: 0,
      targeted_search_submitted_count: 0, explicit_deferral_count: 0,
      profile_params_read: ['p0p1_independent_backing'], ineligibility_reasons: [],
    },
  }));
  logCompletion(bundle, 'wave2_completion');
}

function stageHitl2Decision(bundle) {
  mkdirSync(join(bundle, 'artifacts/hitl2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/hitl2/decision-brief.md'), '# Decision Brief\n\n## Key Findings\nThe baseline reached HITL2.\n\n## Open Questions\nCrash-window recovery remains untested.\n\n## Recommended Actions\nRerun Topic A with cost and failure-mode analysis.\n');
  const profilePath = join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  profile.human_decision_checkpoints.hitl2 = {
    ...profile.human_decision_checkpoints.hitl2,
    status: 'recorded',
    answerability_class: 'ready_substantive',
    user_decision: 'rerun',
    final_report_view: 'profile_default',
    rationale: 'Supplement the existing Rerun Continuity topic with cost and failure-mode analysis. Do not add, remove, rename, or reorder topics.',
    rerun_count: 0,
    recorded_at: '2026-07-15T00:00:00.000Z',
  };
  writeFileSync(profilePath, stringifyYaml(profile));
  logCompletion(bundle, 'hitl2_recorded');
}

const stem = `rerun-direction-recovery-${randomUUID().slice(0, 8)}`;
const created = runNode([
  join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'instantiate-run-bundle.mjs'),
  stem,
  '--target-dir', TARGET_DIR,
]).stdout.trim();
const bundle = join(TARGET_DIR, `dpt_disp_case-318_${stem}_${randomUUID().slice(0, 1)}`);
renameSync(created, bundle);

writePlanProfileAndSeed(bundle, stem);
passAndEnter(bundle, 'instantiation-complete', 'phases/phase-instantiation.md', 'hitl1_recorded');
passAndEnter(bundle, 'hitl1-recorded', 'phases/phase-hitl1.md', 'setup_ready');
passAndEnter(bundle, 'setup-ready', 'phases/phase-setup.md', 'setup_ready');
passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', () => stageWave0(bundle));
passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete', () => stageWave1(bundle));
passAndEnter(bundle, 'wave1-complete', 'phases/phase-wave1.md', 'wave1_complete', () => stageWave2(bundle));
passAndEnter(bundle, 'wave2-complete', 'phases/phase-wave2.md', 'wave2_complete');
stageHitl2Decision(bundle);
passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');

const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
const seed = readFileSync(join(bundle, 'seed_topics/topic-a.md'), 'utf8');
assert.equal(status.current_node, 'phases/phase-rerun.md');
assert.equal(status.current_gate, 'hitl2_recorded');
assert.equal(status.next_gate, 'rerun_ready');
assert.equal(profile.human_decision_checkpoints.hitl2.rerun_count, 0);
assert.doesNotMatch(seed, /^## 本轮重跑方向$/m);

writeFileSync(join(bundle, 'case-318-setup.json'), `${JSON.stringify({
  fixture: 'setup_only',
  subject_execution: 'real_agent',
  runtime: 'real_disposable_bundle',
  external_calls: 'none',
  legal_boundary: {
    current_node: status.current_node,
    current_gate: status.current_gate,
    next_gate: status.next_gate,
    rerun_count: 0,
    direction_absent: true,
  },
}, null, 2)}\n`);

console.log(bundle);
