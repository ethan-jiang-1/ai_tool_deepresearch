// Deterministic Agent-owned content staging for production lifecycle E2E tests.
// Engine authority is always produced by the real CLIs in deterministic-chain-harness.mjs.

import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { claimAndSubmitFixtureWorkUnit } from '../../../experiments_env/shared/work-unit-playbook-utils.mjs';
import {
  applyCanonicalTopicState,
  renderSeedProjectionAppendix,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { canonicalWave1ReferencePath } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';
import {
  advanceStatus, enterPhase, instantiateBundle, readStatus, REPO_ROOT, runGate, runNode,
} from './deterministic-chain-harness.mjs';

export const PRIMARY_TOPIC = { topic_uid: 'tp_11111111-1111-4111-8111-111111111111', id: 't1', slug: 'topic-a', title: 'Topic A', must_answer: ['How does rerun continuity preserve authority?'], scope_role: 'primary', depends_on_topic_uids: [] };

export function currentAvailableResearchAccess() {
  const samples = [
    ['gov_cn', 'china'], ['gitee', 'china'], ['xinhuanet', 'china'], ['cnki_catalog', 'china'],
    ['wikipedia', 'overseas'], ['github', 'overseas'], ['iana', 'overseas'], ['arxiv', 'overseas'],
    ['rfc_editor', 'overseas'],
  ];
  return {
    status: 'available',
    probed_at: '2026-08-11T00:00:00.000Z',
    sample_observations: samples.map(([sample_id, source_group], index) => (
      index === 0
        ? { sample_id, source_group, outcome: 'content', retrieval_surface: 'native' }
        : { sample_id, source_group, outcome: 'failed' }
    )),
  };
}

export function stageSeed(bundle, rerunCount, { action = 'supplement', directionCount = rerunCount } = {}) {
  mkdirSync(join(bundle, 'seed_topics'), { recursive: true });
  const direction = `## 本轮重跑方向\n- rerun_count: ${directionCount}\n- action: ${action}\n- new_search_dimensions: controlled continuity\n- adjusted_depth: compare operational checkpoints\n- search_guardrails: retain primary runtime facts\n- rationale_excerpt: fixture-labeled recorded HITL2 rationale`;
  const seedPath = join(bundle, 'seed_topics/topic-a.md');
  if (!existsSync(seedPath)) {
    writeFileSync(seedPath, `---\n${stringifyYaml(PRIMARY_TOPIC).trim()}\n---\n# Topic A\n\n## Background\nFixture-labeled Agent input.\n\n${direction}\n\n${renderSeedProjectionAppendix()}\n`);
    return;
  }

  const existing = readFileSync(seedPath, 'utf8');
  const match = existing.match(/^##[ \t]+本轮重跑方向[^\n]*$/m);
  assert.ok(match?.index !== undefined, 'fixture seed must retain a rerun-direction heading');
  const afterHeading = match.index + match[0].length;
  const nextHeadingOffset = existing.slice(afterHeading).search(/^##(?!#)[ \t]+/m);
  const end = nextHeadingOffset === -1 ? existing.length : afterHeading + nextHeadingOffset;
  writeFileSync(seedPath, `${existing.slice(0, match.index)}${direction}\n\n${existing.slice(end).replace(/^\s*/, '')}`);
}

export function writePlanAndProfile(bundle, { decision = 'not_started', rerunCount = 0 } = {}) {
  const planBasename = basename(bundle).replace(/^dpt_rb_/, '');
  writeFileSync(join(bundle, 'rb_plan.md'), `---\n${JSON.stringify({ plan_basename: planBasename, topic_registry_version: '2', derived_topic_count: 1, topic_registry: [PRIMARY_TOPIC] }, null, 2)}\n---\n# Deterministic rerun plan\n`);
  writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml({
    plan_basename: planBasename, research_profile: 'debug', root_must_answer_set: PRIMARY_TOPIC.must_answer,
    research_style_params: { user_visible: false, wave0_per_topic_source_floor: 1, wave0_shared_ref_total: 1, wave1_per_topic_ref_floor: 1, topic_unique_ratio: 0, counterexample_search: false, cross_verification: false, p0p1_independent_backing: 1, quality_min_tier: 'tier_4', quality_min_substance: 'none', wave2_cross_topic_depth: 0, wave2_emergent_search_rounds: 0 },
    research_access: currentAvailableResearchAccess(),
    human_decision_checkpoints: {
      hitl1: { status: 'recorded', recorded_at: '2026-07-15T00:00:00.000Z', research_profile: 'debug', root_must_answer_set: PRIMARY_TOPIC.must_answer, answerability_class: 'ready_substantive' },
      hitl2: { status: decision === 'not_started' ? 'not_started' : 'recorded', answerability_class: 'not_assessed', user_decision: decision, final_report_view: 'profile_default', rationale: decision === 'rerun' ? 'Test another controlled rerun direction.' : '', rerun_count: rerunCount, recorded_at: '2026-07-15T00:00:00.000Z' },
    },
  }));
  stageSeed(bundle, rerunCount);
}

function logCompletion(bundle, event) {
  runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/log-event.mjs'), '--bundle', bundle, '--event', event]);
}

export function recordWaveCompletion(bundle, wave) {
  logCompletion(bundle, `${wave}_completion`);
}

function ensureIndexRow(bundle, row) {
  const indexPath = join(bundle, 'reference/_INDEX.md');
  let content = readFileSync(indexPath, 'utf8');
  if (!content.includes('| ref_file |')) content = '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n';
  if (!content.includes(`| ${row.split('|')[1].trim()} |`)) content += `${row}\n`;
  writeFileSync(indexPath, content);
}

function persistPhaseReference(bundle, refPath, content) {
  const stagingPath = join(bundle, '_tmp', `${basename(refPath)}.phase-staged.md`);
  mkdirSync(join(bundle, '_tmp'), { recursive: true });
  writeFileSync(stagingPath, content);
  const persisted = JSON.parse(runNode([
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs'),
    'persist', '--bundle', bundle, '--source', stagingPath, '--target', refPath,
    '--expect-absent',
  ]).stdout);
  assert.equal(persisted.verdict, 'committed', JSON.stringify(persisted));
  const indexed = JSON.parse(runNode([
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs'), '--bundle', bundle,
  ]).stdout);
  assert.ok(['committed', 'unchanged'].includes(indexed.verdict), JSON.stringify(indexed));
}

function submitFixture(bundle, phase, queueId, outputPath, content, extras = [], {
  role = 'reference',
  sourceUrl = `https://research.example.org/${queueId}`,
} = {}) {
  const result = claimAndSubmitFixtureWorkUnit(bundle, {
    phase, queue_item_id: queueId, topic_slug: 'topic-a', title: `${phase} deterministic fixture`, output_path: outputPath,
    role, source_url: sourceUrl, source_slug: queueId,
    output_content: content, extra_output_files: extras,
  });
  assert.equal(result.submit.ok, true);
  assert.equal(result.submit.status, 'submitted');
  return result;
}

export function stageWave0(bundle, suffix = 'r1', { project = true, completion = true } = {}) {
  mkdirSync(join(bundle, 'artifacts/wave0/topic-a'), { recursive: true });
  mkdirSync(join(bundle, 'reference'), { recursive: true });
  const sourcePath = join(bundle, 'artifacts/wave0/topic-a/source.yaml');
  const existingSource = existsSync(sourcePath) ? readFileSync(sourcePath, 'utf8') : '';
  const existingEntries = existingSource ? parseYaml(existingSource) : [];
  assert.ok(Array.isArray(existingEntries), 'Wave0 fixture source.yaml remains an array');
  const ordinal = existingEntries.length + 1;
  const sourceEntry = `- url: "https://research.example.org/${suffix}"\n  title: "Continuity ${suffix}"\n  retrieved_date: "2026-07-15"\n  topic_tag: "topic-a"\n`;
  const source = `${existingSource.trimEnd()}${existingSource ? '\n' : ''}${sourceEntry}`;
  const refPath = `reference/00-shared-${suffix}.md`;
  const ref = `---\nsource_url: "https://research.example.org/${suffix}"\nacceptance_status: accepted\nsource_type: secondary\ntier: "Tier 2"\nevidence_role: foundation\ntrust_level: practitioner\nwhy_it_matters: "Rerun continuity fixture."\naccessed_at: "2026-07-15"\nrelated_topic_uid: all\n---\n\n## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nThis fixture is sufficiently substantive to exercise deterministic source and cache contracts without claiming real research quality.\n\n## Relevance To This Research\nRelevant.\n\n## Quotable Terms / Concepts\n- continuity\n\n## Risks And Limitations\n- Fixture only.\n`;
  writeFileSync(join(bundle, 'reference/README.md'), '# Reference Evidence\n');
  const submitted = submitFixture(
    bundle,
    'wave0',
    `wave0-${suffix}`,
    'artifacts/wave0/topic-a/source.yaml',
    source,
    [],
    { role: 'source_yaml', sourceUrl: `https://research.example.org/${suffix}` },
  );
  const refWithNavigation = `${ref}\n## Submitted Backing\n- source_identity: ${submitted.record.work_id}/${ordinal}\n- source_yaml_ref: artifacts/wave0/topic-a/source.yaml\n- cache_trail_ref: ${submitted.cache_trails[0]}\n- result_ref: ${submitted.record.paths.result_ref}\n- work_unit_ref: ${submitted.record.paths.work_unit_dir}\n\n## Navigation Return Map\n- evidence_meaning: The reference supplies the shared Wave0 continuity foundation.\n  relationship: supports\n  refs: artifacts/wave0/topic-a/source.yaml\n  status: supported\n  next_hop: Read the source metadata before Wave1 deepening.\n`;
  persistPhaseReference(bundle, refPath, refWithNavigation);
  if (project) {
    assert.equal(applyCanonicalTopicState({
      bundlePath: bundle,
      input: {
        context: 'wave_projection', action: 'apply_seed_projection', topic_uid: PRIMARY_TOPIC.topic_uid, wave: 'wave0',
        updates: [{
          slot_id: 'wave0_evidence',
          entries: [{
            source_identity: { kind: 'submitted_work', work_id: submitted.record.work_id },
            entry_id: `${submitted.record.work_id}/${ordinal}`,
            evidence_meaning: 'Submitted Wave0 evidence provides the shared continuity foundation.',
            relationship: 'supports', refs: [refPath], status: 'supported', next_hop: 'Read the shared continuity reference first.',
          }],
        }],
      },
    }).verdict, 'committed');
  }
  if (completion) recordWaveCompletion(bundle, 'wave0');
  return submitted;
}

export function stageWave1(bundle, suffix = 'r1', { project = true, completion = true } = {}) {
  mkdirSync(join(bundle, 'artifacts/wave1/topic-a'), { recursive: true });
  const sourceUrl = `https://research.example.org/${suffix}-deep`;
  const summary = `# Evidence Summary: Topic A\n\n## Source URLs\n- [Continuity](https://research.example.org/${suffix}-deep)\n\n## Key Findings\n1. **Continuity**: Real checkpoints preserve rerun authority.\n\n## Open Questions\n1. [开放] Which direction is current?\n\n## Navigation Return Map\n- evidence_meaning: The summary records the current continuity mechanism.\n  relationship: supports\n  refs: artifacts/wave1/topic-a/evidence-summary.md\n  status: supported\n  next_hop: Use the question list to preserve the unresolved direction.\n`;
  const questions = `# Question List - Topic A\n\n## Topic Investigation Targets\n| target_id | target_question | origin | status | backing_refs | next_action |\n| --- | --- | --- | --- | --- | --- |\n| T01 | Which direction is current? | rerun | 开放 | https://research.example.org/${suffix}-deep | 移交 wave2 |\n\n## Question Reconciliation\n- [部分进展] Count binding is deterministic.\n\n## Emergent Question Protocol\n- result: no_new_questions_after_protocol\n\n## Exploration / Exploitation Decision\n- decision: continue\n\n## Navigation Return Map\n- evidence_meaning: The question list preserves the current unresolved direction.\n  relationship: opens\n  refs: artifacts/wave1/topic-a/question-list.md\n  status: open\n  next_hop: Carry the question into Wave2 synthesis.\n`;
  const refPath = `reference/topic-a-${suffix}-deepening.md`;
  const ref = `---\nsource_url: "${sourceUrl}"\nacceptance_status: accepted\nsource_type: secondary\ntier: "Tier 2"\nevidence_role: deepening_reference\ntrust_level: practitioner\nwhy_it_matters: "Deepening fixture."\naccessed_at: "2026-07-15"\nrelated_topic_uid: tp_11111111-1111-4111-8111-111111111111\n---\n\n## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nThis deterministic fixture provides sufficient backing for the real Wave1 gate and submitted work-unit contract.\n\n## Relevance To This Research\nRelevant.\n## Quotable Terms / Concepts\n- binding\n## Risks And Limitations\n- Fixture.\n`;
  const refWithNavigation = `${ref}\n## Navigation Return Map\n- evidence_meaning: The reference supplies the Wave1 continuity mechanism.\n  relationship: supports\n  refs: artifacts/wave1/topic-a/evidence-summary.md\n  status: supported\n  next_hop: Use the evidence summary during Wave2 synthesis.\n`;
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/evidence-summary.md'), summary);
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/question-list.md'), questions);
  const submitted = submitFixture(bundle, 'wave1', `wave1-${suffix}`, refPath, refWithNavigation, [
    { path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary', content: summary },
    { path: 'artifacts/wave1/topic-a/question-list.md', role: 'question_list', content: questions },
  ], { sourceUrl });
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
  const canonical = canonicalWave1ReferencePath({ topicSlug: 'topic-a', sourceUrl });
  assert.equal(canonical.ok, true, JSON.stringify(canonical));
  persistPhaseReference(
    bundle,
    canonical.path,
    `${refWithNavigation}\n## Submitted Backing\n- source_ref: ${refPath}\n- cache_trail_ref: ${submitted.cache_trails[0]}\n- result_ref: ${submitted.record.paths.result_ref}\n- work_unit_ref: ${submitted.record.paths.work_unit_dir}\n`,
  );
  const packetEntry = (ordinal, evidenceMeaning) => ({
    source_identity: { kind: 'submitted_work', work_id: submitted.record.work_id },
    entry_id: `${submitted.record.work_id}/${ordinal}`,
    evidence_meaning: evidenceMeaning,
    relationship: 'supports', refs: [canonical.path], status: 'supported', next_hop: 'Read the submitted Wave1 reference before Wave2 synthesis.',
  });
  if (project) {
    assert.equal(applyCanonicalTopicState({
      bundlePath: bundle,
      input: {
        context: 'wave_projection', action: 'apply_seed_projection', topic_uid: PRIMARY_TOPIC.topic_uid, wave: 'wave1',
        updates: [
          { slot_id: 'wave1_mechanisms', entries: [packetEntry(1, 'Submitted Wave1 evidence explains the continuity mechanism.')] },
          { slot_id: 'wave1_trends', entries: [packetEntry(2, 'Submitted Wave1 evidence records the continuity limitation.')] },
          { slot_id: 'pending_questions', entries: [packetEntry(3, 'Submitted Wave1 evidence preserves the unresolved direction question.')] },
        ],
      },
    }).verdict, 'committed');
  }
  if (completion) recordWaveCompletion(bundle, 'wave1');
  return submitted;
}

export function stageWave2(bundle, { project = true, completion = true } = {}) {
  mkdirSync(join(bundle, 'artifacts/wave2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/wave2/synthesis.md'), '# Cross-Topic Synthesis\n\nW2F-001 follows [Wave1 evidence](../wave1/topic-a/evidence-summary.md).\n');
  writeFileSync(join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), '# Cross-Topic Ledger\n\n## Cross-Topic Scan Matrix\nSingle topic scanned.\n\n## Wave1 Legacy Questions\nDirection freshness.\n\n## Cross-Topic Resolutions\nW2F-001 resolved.\n\n## Emergent Cross-Topic Questions\nNone.\n\n## Exploration Decisions\nUse existing evidence.\n\n## HITL2 Handoff\nReview rerun output.\n');
  appendFileSync(join(bundle, 'artifacts/wave2/synthesis.md'), '\n## Navigation Return Map\n- evidence_meaning: W2F-001 records the current cross-topic continuity judgment.\n  relationship: supports\n  refs: artifacts/wave2/cross-topic-ledger.md; artifacts/wave2/finding-index.yaml\n  status: supported\n  next_hop: Review the current Wave1 evidence before HITL2.\n');
  appendFileSync(join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), '\n## Navigation Return Map\n- evidence_meaning: The ledger records the W2F-001 resolution lineage.\n  relationship: supports\n  refs: artifacts/wave2/synthesis.md\n  status: supported\n  next_hop: Use the synthesis for the current cross-topic judgment.\n');
  const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
  const rerunCount = profile.human_decision_checkpoints?.hitl2?.rerun_count ?? 0;
  const wave1Suffix = rerunCount === 0 ? 'r1' : `r${rerunCount}`;
  const wave1Reference = canonicalWave1ReferencePath({
    topicSlug: 'topic-a',
    sourceUrl: `https://research.example.org/${wave1Suffix}-deep`,
  });
  assert.equal(wave1Reference.ok, true, JSON.stringify(wave1Reference));
  writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), stringifyYaml({ version: '0.1', source_layer: 'wave2_cross_topic', ledger: 'artifacts/wave2/cross-topic-ledger.md', synthesis: 'artifacts/wave2/synthesis.md', scan: { topic_count: 1, pair_count_expected: 0, pair_count_checked: 0 }, findings: [{ id: 'W2F-001', type: 'cross_topic_resolution', priority: 'p2', status: 'resolved', decision: 'use_existing_evidence', affected_topics: ['topic-a'], created_in_rerun_count: rerunCount, origin_refs: ['artifacts/wave1/topic-a/evidence-summary.md'], trigger_refs: ['artifacts/wave1/topic-a/question-list.md'], search_required: false, subagent_receipt_refs: [], appears_in_synthesis: true, hitl2_handoff: false, confidence: 'medium', independent_backing_refs: [], gap_status: 'no_gap' }], synthesis_eligibility: { pure_synthesis_eligible: true, scan_matrix_present: true, scan_topic_pair_coverage: [], unresolved_search_required_count: 0, targeted_search_required_count: 0, targeted_search_submitted_count: 0, explicit_deferral_count: 0, profile_params_read: ['p0p1_independent_backing'], ineligibility_reasons: [] } }));
  if (project) {
    assert.equal(applyCanonicalTopicState({
      bundlePath: bundle,
      input: {
        context: 'wave_projection', action: 'apply_seed_projection', topic_uid: PRIMARY_TOPIC.topic_uid, wave: 'wave2',
        updates: [{
          slot_id: 'wave2_judgment',
          entries: [{
            source_identity: { kind: 'finding', finding_id: 'W2F-001' }, entry_id: 'W2F-001',
            evidence_meaning: 'W2F-001 confirms deterministic continuity across the current research round.',
            relationship: 'supports', refs: [wave1Reference.path], status: 'supported',
            next_hop: 'Use the current Wave1 reference to review the synthesis lineage.',
          }],
        }],
      },
    }).verdict, 'committed');
  }
  if (completion) recordWaveCompletion(bundle, 'wave2');
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
  runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs'), '--bundle', bundle, '--style', 'quick_factual']);
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
