#!/usr/bin/env node
// @impl RWE-013
// Setup-only predecessor facts for case 154. Gates and phase handoffs remain production CLI operations.

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import {
  applyCanonicalTopicState,
  renderSeedProjectionAppendix,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { canonicalWave1ReferencePath } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';
import {
  claimAndSubmitFixtureWorkUnit,
  referenceContent,
  wave1EvidenceSummaryContent,
  wave1QuestionListContent,
} from './work-unit-playbook-utils.mjs';

const REPO_ROOT = resolve(new URL('../..', import.meta.url).pathname);
const targetIndex = process.argv.indexOf('--target-dir');
if (targetIndex < 0 || !process.argv[targetIndex + 1] || process.argv.length !== 4) {
  throw new Error('Usage: node experiments_env/shared/prepare-degraded-handoff-requalification-case.mjs --target-dir <dir>');
}
const TARGET_DIR = resolve(process.argv[targetIndex + 1]);

const TOPICS = [
  {
    topic_uid: 'tp_15400000-0000-4000-8000-000000000001',
    id: '01', slug: 'model-governance', title: 'Model Governance',
    must_answer: ['Which governance signals should trigger an independent model review?'],
    scope_role: 'primary', depends_on_topic_uids: [],
  },
  {
    topic_uid: 'tp_15400000-0000-4000-8000-000000000002',
    id: '02', slug: 'evidence-operations', title: 'Evidence Operations',
    must_answer: ['How should teams retain evidence across research handoffs?'],
    scope_role: 'supporting', depends_on_topic_uids: [],
  },
];

function runNode(args, { expectedStatus = 0 } = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT, encoding: 'utf8', timeout: 60000, maxBuffer: 20 * 1024 * 1024,
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

function gate(bundle, name, node, { attempt } = {}) {
  const args = [
    join(REPO_ROOT, `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-${name}.mjs`),
    '--bundle', bundle, '--current-node', node,
  ];
  if (attempt !== undefined) args.push('--attempt', String(attempt));
  return parseJson(runNode(args));
}

function enter(bundle, node, retainedName) {
  const output = runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs'), '--bundle', bundle, '--node', node]);
  writeFileSync(join(bundle, retainedName), output.stdout);
}

function advance(bundle, sourceGate) {
  return parseJson(runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/advance-status.mjs'), '--bundle', bundle, '--to', sourceGate]));
}

function logCompletion(bundle, event) {
  runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/log-event.mjs'), '--bundle', bundle, '--event', event]);
}

function passAndEnter(bundle, gateName, currentNode, sourceGate, retainedPrefix, options) {
  const result = gate(bundle, gateName, currentNode, options);
  assert.equal(result.check?.passed, true, `${gateName}: ${JSON.stringify(result.inspect)}`);
  writeFileSync(join(bundle, `${retainedPrefix}-gate.json`), `${JSON.stringify(result, null, 2)}\n`);
  enter(bundle, result.check.next, `${retainedPrefix}-enter.md`);
  const status = advance(bundle, sourceGate);
  writeFileSync(join(bundle, `${retainedPrefix}-advance.json`), `${JSON.stringify(status, null, 2)}\n`);
  return result;
}

function instantiate() {
  const stem = `case-154-${randomUUID().slice(0, 8)}`;
  const created = runNode([
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs'), stem, '--target-dir', TARGET_DIR,
  ]).stdout.trim();
  const bundle = join(TARGET_DIR, `dpt_disp_case-154_${stem}_${randomUUID().slice(0, 6)}`);
  renameSync(created, bundle);
  return { bundle, stem };
}

function writeBaseline(bundle, stem) {
  writeFileSync(join(bundle, 'rb_plan.md'), `---\n${JSON.stringify({
    plan_basename: stem,
    topic_registry_version: '2',
    derived_topic_count: TOPICS.length,
    topic_registry: TOPICS,
  }, null, 2)}\n---\n# Case 154 Setup-Only Baseline\n`);
  writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml({
    plan_basename: stem,
    research_profile: 'debug',
    root_must_answer_set: TOPICS.flatMap((topic) => topic.must_answer),
    research_style_params: {
      user_visible: false, wave0_per_topic_source_floor: 1, wave0_shared_ref_total: 1,
      wave1_per_topic_ref_floor: 1, topic_unique_ratio: 0, counterexample_search: false,
      cross_verification: false, p0p1_independent_backing: 1, quality_min_tier: 'tier_4',
      quality_min_substance: 'none', wave2_cross_topic_depth: 0, wave2_emergent_search_rounds: 0,
    },
    research_access: {
      status: 'available', probed_at: '2026-08-05T00:00:00.000Z',
      result_url: 'https://research.fixture.news-research.com/case-154/setup-only-probe', fetch_outcome: 'success',
    },
    human_decision_checkpoints: {
      hitl1: { status: 'recorded', recorded_at: '2026-08-05T00:00:00.000Z', research_profile: 'debug', root_must_answer_set: TOPICS.flatMap((topic) => topic.must_answer), answerability_class: 'ready_substantive' },
      hitl2: { status: 'not_started', answerability_class: 'not_assessed', user_decision: 'not_started', final_report_view: 'profile_default', rationale: '', rerun_count: 0 },
    },
  }));
  for (const topic of TOPICS) {
    writeFileSync(join(bundle, 'seed_topics', `${topic.slug}.md`), [
      '---', JSON.stringify(topic, null, 2), '---', `# ${topic.title}`, '', renderSeedProjectionAppendix(), '',
    ].join('\n'));
  }
}

function applyProjection(bundle, topic, wave, entries) {
  const updates = wave === 0
    ? [{ slot_id: 'wave0_evidence', entries }]
    : [{
      slot_id: 'wave1_mechanisms', entries,
    }, {
      slot_id: 'wave1_trends', entries: entries.map((entry) => ({
        ...entry,
        entry_id: `${entry.source_identity.work_id}/2`,
        evidence_meaning: `Setup-only Wave1 trend and limitation for ${topic.title}.`,
        relationship: 'partial', status: 'partial', next_hop: 'compare the retained limitation in Wave2.',
      })),
    }, {
      slot_id: 'pending_questions', entries: entries.map((entry) => ({
        ...entry,
        entry_id: `${entry.source_identity.work_id}/3`,
        evidence_meaning: `Which additional evidence should resolve the remaining ${topic.slug} gap?`,
        relationship: 'defers', status: 'deferred', next_hop: 'carry the question to Wave2.',
      })),
    }];
  const result = applyCanonicalTopicState({
    bundlePath: bundle,
    input: { context: 'wave_projection', action: 'apply_seed_projection', topic_uid: topic.topic_uid, wave: `wave${wave}`, updates },
  });
  assert.ok(['committed', 'unchanged'].includes(result.verdict), JSON.stringify(result));
}

function stageDegradedWave0(bundle) {
  const submissions = TOPICS.map((topic) => claimAndSubmitFixtureWorkUnit(bundle, {
    phase: 'wave0', queue_item_id: `case-154-wave0-${topic.slug}`, topic_slug: topic.slug,
    output_path: `artifacts/wave0/${topic.slug}/source.yaml`, role: 'source_yaml',
    source_url: `https://research.fixture.news-research.com/case-154/wave0/${topic.slug}`,
    source_slug: topic.slug,
    output_content: [
      `- url: "https://research.fixture.news-research.com/case-154/wave0/${topic.slug}"`,
      `  title: "Case 154 ${topic.title} setup source"`, '  retrieved_date: "2026-08-05"', `  topic_tag: "${topic.slug}"`, '',
    ].join('\n'),
    extra_output_files: [],
  }));
  submissions.forEach((submission, index) => applyProjection(bundle, TOPICS[index], 0, [{
    source_identity: { kind: 'submitted_work', work_id: submission.record.work_id },
    entry_id: `${submission.record.work_id}/1`,
    evidence_meaning: 'The setup-only Wave0 source is retained without a materializable shared consumer reference.',
    relationship: 'defers', refs: ['none'], status: 'deferred',
    next_hop: 'limitation: no materializable consumer reference is available.',
  }]));
  logCompletion(bundle, 'wave0_completion');
  return submissions;
}

function stageWave1Predecessor(bundle) {
  for (const topic of TOPICS) {
    const sourceUrl = `https://research.fixture.news-research.com/case-154/wave1/${topic.slug}`;
    const ref = `reference/01-case-154-${topic.slug}.md`;
    const summary = wave1EvidenceSummaryContent({ topic_slug: topic.slug, title: topic.title, source_url: sourceUrl });
    const questions = wave1QuestionListContent({ topic_slug: topic.slug, source_url: sourceUrl });
    const submission = claimAndSubmitFixtureWorkUnit(bundle, {
      phase: 'wave1', queue_item_id: `case-154-wave1-${topic.slug}`, topic_slug: topic.slug,
      output_path: ref, source_url: sourceUrl, source_slug: topic.slug,
      output_content: referenceContent({ source_url: sourceUrl, topic_slug: topic.slug, title: `Case 154 ${topic.title} Wave1 Setup` }),
      extra_output_files: [
        { path: `artifacts/wave1/${topic.slug}/evidence-summary.md`, role: 'evidence_summary', content: summary },
        { path: `artifacts/wave1/${topic.slug}/question-list.md`, role: 'question_list', content: questions },
      ],
    });
    const canonical = canonicalWave1ReferencePath({ topicSlug: topic.slug, sourceUrl });
    assert.equal(canonical.ok, true, JSON.stringify(canonical));
    const projectionRefs = [
      ref,
      submission.record.work_id,
      submission.record.paths.work_unit_dir,
      submission.record.paths.result_ref,
      ...submission.cache_trails,
    ];
    writeFileSync(join(bundle, canonical.path), [
      '---',
      `source_url: "${canonical.normalized_url}"`,
      'acceptance_status: accepted',
      'source_type: secondary',
      'tier: "Tier 2"',
      'evidence_role: deepening_reference',
      'trust_level: practitioner',
      `why_it_matters: "Setup-only Wave1 consumer projection for ${topic.title}."`,
      'accessed_at: "2026-08-05"',
      `related_topic_uid: "${topic.topic_uid}"`,
      `related_topic: "${topic.slug}"`,
      '---', '', `# Case 154 ${topic.title} Wave1 Projection`, '',
      '## Key Facts', `- Submitted Wave1 backing exists for ${topic.title}.`, '',
      '## Core Content Capture', `This setup-only consumer projection binds the submitted ${topic.slug} evidence to its current canonical Topic.`, '',
      '## Relevance To This Research', 'The Wave1 finding gives Wave2 a concrete, bounded predecessor question.', '',
      '## Quotable Terms / Concepts', '- submitted Wave1 evidence', '',
      '## Risks And Limitations', 'This predecessor is fixture-backed and does not assert Subject behavior.', '',
      '## Submitted Backing', ...projectionRefs.map((value) => `- ${value}`), '',
    ].join('\n'));
    const reviewPath = join(bundle, 'artifacts', 'wave1', topic.slug, 'depth-review.yaml');
    const review = parseYaml(readFileSync(reviewPath, 'utf8'));
    review.carried_targets = [{
      target_id: `${topic.id}-W2`,
      target_text: `Which additional evidence should resolve the remaining ${topic.slug} gap?`,
    }];
    writeFileSync(reviewPath, `${stringifyYaml(review)}\n`);
    applyProjection(bundle, topic, 1, [{
      source_identity: { kind: 'submitted_work', work_id: submission.record.work_id },
      entry_id: `${submission.record.work_id}/1`, evidence_meaning: `Setup-only Wave1 mechanism evidence for ${topic.title}.`,
      relationship: 'supports', refs: [ref], status: 'supported', next_hop: 'cross-topic comparison in Wave2.',
    }]);
  }
  runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs'), '--bundle', bundle]);
  logCompletion(bundle, 'wave1_completion');
}

const { bundle, stem } = instantiate();
writeBaseline(bundle, stem);
passAndEnter(bundle, 'instantiation-complete', 'phases/phase-instantiation.md', 'hitl1_recorded', 'case-154-instantiation');
passAndEnter(bundle, 'hitl1-recorded', 'phases/phase-hitl1.md', 'setup_ready', 'case-154-hitl1');
passAndEnter(bundle, 'setup-ready', 'phases/phase-setup.md', 'setup_ready', 'case-154-setup');
passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', 'case-154-seed-topics');

stageDegradedWave0(bundle);
writeFileSync(join(bundle, 'case-154-before-wave0-handoff-status.json'), readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete', 'case-154-wave0', { attempt: 3 });
writeFileSync(join(bundle, 'case-154-wave1-entry-status.json'), readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
stageWave1Predecessor(bundle);

const wave0Gate = JSON.parse(readFileSync(join(bundle, 'case-154-wave0-gate.json'), 'utf8'));
const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
assert.equal(wave0Gate.check?.degraded, true, JSON.stringify(wave0Gate));
assert.deepEqual(wave0Gate.check?.degraded_rules, ['shared_ref_count_floor']);
assert.equal(status.current_node, 'phases/phase-wave1.md');
writeFileSync(join(bundle, 'case-154-setup.json'), `${JSON.stringify({
  schema_version: 'case-154-setup/v1', fixture: 'setup_only',
  legal_boundary: { current_node: status.current_node, current_gate: status.current_gate, next_gate: status.next_gate },
  wave0_gate_ref: 'case-154-wave0-gate.json',
  wave0_degraded_rules: wave0Gate.check.degraded_rules,
  wave2_decision_absent: true,
  targeted_evidence_result_absent: true,
}, null, 2)}\n`);
process.stdout.write(`${bundle}\n`);
