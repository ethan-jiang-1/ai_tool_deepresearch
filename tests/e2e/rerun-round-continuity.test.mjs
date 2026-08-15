// @impl VER-001, VER-004, RTI-007, RRM-006, RRM-007
// JS simulates labeled Agent-owned inputs; production CLIs own deterministic authority.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { claimAndSubmitFixtureWorkUnit } from '../../experiments_env/shared/work-unit-playbook-utils.mjs';
import {
  applyCanonicalTopicState,
  renderSeedProjectionAppendix,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { canonicalWave1ReferencePath } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';
import {
  advanceStatus, authoritySnapshot, cleanupRoot, createTempRoot,
  enterPhase, instantiateBundle, parseJsonOutput, readStatus, readTrace, REPO_ROOT, restoreBundle, runGate, runNode, snapshotBundle,
} from './helpers/deterministic-chain-harness.mjs';

let root;
let baseline;
let snapshot;
const TOPIC = { topic_uid: 'tp_11111111-1111-4111-8111-111111111111', id: 't1', slug: 'topic-a', title: 'Topic A', must_answer: ['How does rerun continuity preserve authority?'], scope_role: 'primary', depends_on_topic_uids: [] };

function currentAvailableResearchAccess() {
  const samples = [
    ['gov_cn', 'china'], ['gitee', 'china'], ['xinhuanet', 'china'], ['cnki_catalog', 'china'],
    ['wikipedia', 'overseas'], ['github', 'overseas'], ['iana', 'overseas'], ['arxiv', 'overseas'],
    ['rfc_editor', 'overseas'],
  ];
  return {
    status: 'available', probed_at: '2026-08-11T00:00:00.000Z',
    sample_observations: samples.map(([sample_id, source_group], index) => (
      index === 0
        ? { sample_id, source_group, outcome: 'content', retrieval_surface: 'native' }
        : { sample_id, source_group, outcome: 'failed' }
    )),
  };
}

function writePlanAndProfile(bundle, { decision = 'not_started', rerunCount = 0 } = {}) {
  const planBasename = basename(bundle).replace(/^dpt_rb_/, '');
  writeFileSync(join(bundle, 'rb_plan.md'), `---\n${JSON.stringify({ plan_basename: planBasename, topic_registry_version: '2', derived_topic_count: 1, topic_registry: [TOPIC] }, null, 2)}\n---\n# Deterministic rerun plan\n`);
  writeFileSync(join(bundle, 'rb_profile.yaml'), stringifyYaml({
    plan_basename: planBasename, research_profile: 'debug', root_must_answer_set: TOPIC.must_answer,
    research_style_params: { user_visible: false, wave0_per_topic_source_floor: 1, wave0_shared_ref_total: 1, wave1_per_topic_ref_floor: 1, topic_unique_ratio: 0, counterexample_search: false, cross_verification: false, p0p1_independent_backing: 1, quality_min_tier: 'tier_4', quality_min_substance: 'none', wave2_cross_topic_depth: 0, wave2_emergent_search_rounds: 0 },
    research_access: currentAvailableResearchAccess(),
    human_decision_checkpoints: {
      hitl1: { status: 'recorded', recorded_at: '2026-07-15T00:00:00.000Z', research_profile: 'debug', root_must_answer_set: TOPIC.must_answer, answerability_class: 'ready_substantive' },
      hitl2: { status: decision === 'not_started' ? 'not_started' : 'recorded', answerability_class: 'not_assessed', user_decision: decision, final_report_view: 'profile_default', rationale: decision === 'rerun' ? 'Test another controlled rerun direction.' : '', rerun_count: rerunCount, recorded_at: '2026-07-15T00:00:00.000Z' },
    },
  }));
  stageSeed(bundle, rerunCount);
}

function stageSeed(bundle, rerunCount, { action = 'supplement', directionCount = rerunCount } = {}) {
  mkdirSync(join(bundle, 'seed_topics'), { recursive: true });
  const direction = `## 本轮重跑方向\n- rerun_count: ${directionCount}\n- action: ${action}\n- new_search_dimensions: controlled continuity\n- adjusted_depth: compare operational checkpoints\n- search_guardrails: retain primary runtime facts\n- rationale_excerpt: fixture-labeled recorded HITL2 rationale`;
  const seedPath = join(bundle, 'seed_topics/topic-a.md');
  if (!existsSync(seedPath)) {
    writeFileSync(seedPath, `---\n${stringifyYaml(TOPIC).trim()}\n---\n# Topic A\n\n## Background\nFixture-labeled Agent input.\n\n${direction}\n\n${renderSeedProjectionAppendix()}\n`);
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

function logCompletion(bundle, event) {
  runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/log-event.mjs'), '--bundle', bundle, '--event', event]);
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

function persistPhaseReference(bundle, refPath, content) {
  const stagingPath = join(bundle, '_tmp', `${basename(refPath)}.phase-staged.md`);
  mkdirSync(join(bundle, '_tmp'), { recursive: true });
  writeFileSync(stagingPath, content);
  const persisted = parseJsonOutput(runNode([
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs'),
    'persist', '--bundle', bundle, '--source', stagingPath, '--target', refPath,
    '--expect-absent',
  ]));
  assert.equal(persisted.verdict, 'committed', JSON.stringify(persisted));
  const indexed = parseJsonOutput(runNode([
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs'), '--bundle', bundle,
  ]));
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
  const index = JSON.parse(readFileSync(join(bundle, '_work_units/_index.json'), 'utf8'));
  const accepted = index.work_units[result.record.work_id];
  assert.equal(accepted.status, 'submitted');
  assert.equal(accepted.receipt_nonce, result.record.receipt_nonce);
  const manifest = JSON.parse(readFileSync(join(bundle, accepted.paths.manifest_ref), 'utf8'));
  const candidate = JSON.parse(readFileSync(result.resultPath, 'utf8'));
  assert.equal(manifest.receipt_nonce, accepted.receipt_nonce);
  assert.equal(candidate.receipt_nonce, accepted.receipt_nonce);
  const ledgerRows = readFileSync(join(bundle, 'rb_output_declarations.jsonl'), 'utf8')
    .split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const acceptedRows = ledgerRows.filter((row) => row.work_id === accepted.work_id);
  assert.equal(acceptedRows.length, 1);
  assert.equal(acceptedRows[0].queue_item_id, accepted.queue_item_id);
  assert.equal(acceptedRows[0].receipt_nonce, accepted.receipt_nonce);
  assert.match(acceptedRows[0].ledger_record_hash, /^[a-f0-9]{64}$/);
  return result;
}

function stageWave0(bundle, suffix = 'r1') {
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
  const refWithBacking = `${ref}\n## Submitted Backing\n- source_identity: ${submitted.record.work_id}/${ordinal}\n- source_yaml_ref: artifacts/wave0/topic-a/source.yaml\n- cache_trail_ref: ${submitted.cache_trails[0]}\n- result_ref: ${submitted.record.paths.result_ref}\n- work_unit_ref: ${submitted.record.paths.work_unit_dir}\n`;
  persistPhaseReference(bundle, refPath, refWithBacking);
  assert.equal(applyCanonicalTopicState({
    bundlePath: bundle,
    input: {
      context: 'wave_projection', action: 'apply_seed_projection', topic_uid: TOPIC.topic_uid, wave: 'wave0',
      updates: [{
        slot_id: 'wave0_evidence',
        entries: [{
          source_identity: { kind: 'submitted_work', work_id: submitted.record.work_id }, entry_id: `${submitted.record.work_id}/${ordinal}`,
          evidence_meaning: 'Submitted Wave0 evidence provides the shared continuity foundation.', relationship: 'supports',
          refs: [refPath], status: 'supported', next_hop: 'Read the shared continuity reference first.',
        }],
      }],
    },
  }).verdict, 'committed');
  logCompletion(bundle, 'wave0_completion');
  return submitted;
}

function stageWave1(bundle, suffix = 'r1', { project = true } = {}) {
  mkdirSync(join(bundle, 'artifacts/wave1/topic-a'), { recursive: true });
  const sourceUrl = `https://research.example.org/${suffix}-deep`;
  const refPath = `reference/topic-a-${suffix}-deepening.md`;
  const returnMap = `- evidence_meaning: Real checkpoints preserve rerun authority.\n  relationship: supports\n  refs:\n    - artifacts/wave1/topic-a/evidence-summary.md\n    - ${refPath}\n  status: supported\n  next_hop: Read the submitted Wave1 projection.\n`;
  const summary = `# Evidence Summary: Topic A\n\n## Source URLs\n- [Continuity](https://research.example.org/${suffix}-deep)\n\n## Key Findings\n1. **Continuity**: Real checkpoints preserve rerun authority.\n\n${returnMap}\n## Open Questions\n1. [开放] Which direction is current?\n`;
  const questions = `# Question List - Topic A\n\n## Topic Investigation Targets\n| target_id | target_question | origin | status | backing_refs | next_action |\n| --- | --- | --- | --- | --- | --- |\n| T01 | Which direction is current? | rerun | 开放 | https://research.example.org/${suffix}-deep | 移交 wave2 |\n\n## Question Reconciliation\n- [部分进展] Count binding is deterministic.\n\n${returnMap}\n## Emergent Question Protocol\n- result: no_new_questions_after_protocol\n\n## Exploration / Exploitation Decision\n- decision: continue\n`;
  const ref = `---\nsource_url: "${sourceUrl}"\nacceptance_status: accepted\nsource_type: secondary\ntier: "Tier 2"\nevidence_role: deepening_reference\ntrust_level: practitioner\nwhy_it_matters: "Deepening fixture."\naccessed_at: "2026-07-15"\nrelated_topic_uid: ${TOPIC.topic_uid}\n---\n\n## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n## Core Content Capture\nThis deterministic fixture provides sufficient backing for the real Wave1 gate and submitted work-unit contract.\n\n## Relevance To This Research\n${returnMap}\n## Quotable Terms / Concepts\n- binding\n## Risks And Limitations\n- Fixture.\n`;
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/evidence-summary.md'), summary);
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/question-list.md'), questions);
  const submitted = submitFixture(bundle, 'wave1', `wave1-${suffix}`, refPath, ref, [
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
    `${ref}\n## Submitted Backing\n- source_ref: ${refPath}\n- cache_trail_ref: ${submitted.cache_trails[0]}\n- result_ref: ${submitted.record.paths.result_ref}\n- work_unit_ref: ${submitted.record.paths.work_unit_dir}\n`,
  );
  const packetEntry = (ordinal, evidenceMeaning) => ({
    source_identity: { kind: 'submitted_work', work_id: submitted.record.work_id }, entry_id: `${submitted.record.work_id}/${ordinal}`,
    evidence_meaning: evidenceMeaning, relationship: 'supports', refs: [canonical.path], status: 'supported',
    next_hop: 'Read the submitted Wave1 reference before Wave2 synthesis.',
  });
  if (project) {
    assert.equal(applyCanonicalTopicState({
      bundlePath: bundle,
      input: {
        context: 'wave_projection', action: 'apply_seed_projection', topic_uid: TOPIC.topic_uid, wave: 'wave1',
        updates: [
          { slot_id: 'wave1_mechanisms', entries: [packetEntry(1, 'Submitted Wave1 evidence explains the continuity mechanism.')] },
          { slot_id: 'wave1_trends', entries: [packetEntry(2, 'Submitted Wave1 evidence records the continuity limitation.')] },
          { slot_id: 'pending_questions', entries: [packetEntry(3, 'Submitted Wave1 evidence preserves the unresolved direction question.')] },
        ],
      },
    }).verdict, 'committed');
  }
  logCompletion(bundle, 'wave1_completion');
  return submitted;
}

function stageWave2(bundle) {
  mkdirSync(join(bundle, 'artifacts/wave2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/wave2/synthesis.md'), '# Cross-Topic Synthesis\n\nW2F-001 follows [Wave1 evidence](../wave1/topic-a/evidence-summary.md).\n');
  writeFileSync(join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), '# Cross-Topic Ledger\n\n## Cross-Topic Scan Matrix\nSingle topic scanned.\n\n## Wave1 Legacy Questions\nDirection freshness.\n\n## Cross-Topic Resolutions\nW2F-001 resolved.\n\n## Emergent Cross-Topic Questions\nNone.\n\n## Exploration Decisions\nUse existing evidence.\n\n## HITL2 Handoff\nReview rerun output.\n');
  const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
  const rerunCount = profile.human_decision_checkpoints?.hitl2?.rerun_count ?? 0;
  writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), stringifyYaml({ version: '0.1', source_layer: 'wave2_cross_topic', ledger: 'artifacts/wave2/cross-topic-ledger.md', synthesis: 'artifacts/wave2/synthesis.md', scan: { topic_count: 1, pair_count_expected: 0, pair_count_checked: 0 }, findings: [{ id: 'W2F-001', type: 'cross_topic_resolution', priority: 'p2', status: 'resolved', decision: 'use_existing_evidence', affected_topics: ['topic-a'], created_in_rerun_count: rerunCount, origin_refs: ['artifacts/wave1/topic-a/evidence-summary.md'], trigger_refs: ['artifacts/wave1/topic-a/question-list.md'], search_required: false, subagent_receipt_refs: [], appears_in_synthesis: true, hitl2_handoff: false, confidence: 'medium', independent_backing_refs: [], gap_status: 'no_gap' }], synthesis_eligibility: { pure_synthesis_eligible: true, scan_matrix_present: true, scan_topic_pair_coverage: [], unresolved_search_required_count: 0, targeted_search_required_count: 0, targeted_search_submitted_count: 0, explicit_deferral_count: 0, profile_params_read: ['p0p1_independent_backing'], ineligibility_reasons: [] } }));
  assert.ok(['committed', 'unchanged'].includes(applyCanonicalTopicState({
    bundlePath: bundle,
    input: {
      context: 'wave_projection', action: 'apply_seed_projection', topic_uid: TOPIC.topic_uid, wave: 'wave2',
      updates: [{
        slot_id: 'wave2_judgment',
        entries: [{
          source_identity: { kind: 'finding', finding_id: 'W2F-001' }, entry_id: 'W2F-001',
          evidence_meaning: 'W2F-001 confirms deterministic continuity across the current research round.', relationship: 'supports',
          refs: [`reference/topic-a-${rerunCount === 0 ? 'r1' : `r${rerunCount}`}-deepening.md`], status: 'supported',
          next_hop: 'Use the current Wave1 reference to review the synthesis lineage.',
        }],
      }],
    },
  }).verdict));
  logCompletion(bundle, 'wave2_completion');
}

function acceptedCompositionHandoff(rerunCount) {
  return {
    contract_version: 1,
    for_rerun_count: rerunCount,
    reader: {
      description: 'Operators reviewing deterministic continuity.',
      familiarity: 'working',
    },
    intended_use: 'Decide whether the current rerun has preserved authority.',
    primary_focus: 'Current-round checkpoint continuity and its limits.',
    content_priorities: {
      foreground: ['Current-round evidence', 'Authority limits'],
      compress: ['Historical setup detail'],
    },
    delivery: {
      language: 'en-US',
      length: 'standard',
      evidence_exposure: 'balanced',
      appendix: 'as_needed',
    },
  };
}

function stageHitl2(bundle, decision, rerunCount) {
  mkdirSync(join(bundle, 'artifacts/hitl2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/hitl2/decision-brief.md'), '# Decision Brief\n\n## Key Findings\nContinuity reached HITL2.\n\n## Open Questions\nNone.\n\n## Recommended Actions\nRerun.\n');
  const profilePath = join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  const hitl2 = {
    ...profile.human_decision_checkpoints.hitl2,
    status: 'recorded',
    user_decision: decision,
    final_report_view: 'profile_default',
    rationale: 'Exercise rerun continuity.',
    rerun_count: rerunCount,
    recorded_at: '2026-07-15T00:00:00.000Z',
  };
  if (decision === 'proceed_to_readiness') {
    hitl2.composition_handoff = acceptedCompositionHandoff(rerunCount);
  } else {
    delete hitl2.composition_handoff;
  }
  profile.human_decision_checkpoints.hitl2 = hitl2;
  writeFileSync(profilePath, stringifyYaml(profile));
  logCompletion(bundle, 'hitl2_recorded');
}

function setProfileRerunCount(bundle, rerunCount) {
  const profilePath = join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  profile.human_decision_checkpoints.hitl2.rerun_count = rerunCount;
  writeFileSync(profilePath, stringifyYaml(profile));
}

function directionCandidate({ action = 'supplement', count = 2 } = {}) {
  return {
    rerun_count: count,
    action,
    new_search_dimensions: 'fixture-labeled cost and resilience comparison',
    adjusted_depth: 'compare the operational mechanisms',
    search_guardrails: 'retain primary runtime facts',
    rationale_excerpt: 'fixture-labeled recorded HITL2 rationale',
  };
}

function directionSection(bytes) {
  return bytes.slice(bytes.indexOf('## 本轮重跑方向'));
}

function inspectEligible(bundle, phase) {
  const result = runNode([
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs'),
    'inspect', bundle, '--eligible-rows', '--phase', phase,
  ], { expectedStatus: 0 });
  return { process: result, output: parseJsonOutput(result) };
}

function inspectEligibleFailure(bundle, phase) {
  const result = runNode([
    join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs'),
    'inspect', bundle, '--eligible-rows', '--phase', phase,
  ], { expectedStatus: 1 });
  return { process: result, output: parseJsonOutput(result) };
}

function assertOnlyTraceDiagnosticsChanged(beforeSnapshot, afterSnapshot, { gate = null } = {}) {
  const keys = new Set([...Object.keys(beforeSnapshot), ...Object.keys(afterSnapshot)]);
  for (const key of keys) {
    if (key === 'rb_trace.jsonl') continue;
    assert.equal(afterSnapshot[key], beforeSnapshot[key], `unexpected Engine-authority mutation at ${key}`);
  }
  const beforeTrace = Buffer.from(beforeSnapshot['rb_trace.jsonl'] || '', 'base64').toString('utf8');
  const afterTrace = Buffer.from(afterSnapshot['rb_trace.jsonl'] || '', 'base64').toString('utf8');
  assert.ok(afterTrace.startsWith(beforeTrace), 'real CLI diagnostics must append rather than rewrite trace authority');
  const appended = afterTrace.slice(beforeTrace.length).split('\n').filter(Boolean).map((line) => JSON.parse(line));
  assert.ok(appended.length > 0, 'expected a real CLI diagnostic trace append');
  if (gate) assert.ok(appended.some((event) => event.event === 'gate_attempt' && event.gate === gate && event.passed === false), `missing failed ${gate} gate attempt`);
  return appended;
}

function passAndEnter(bundle, gate, node, statusGate, stageNext) {
  const gateResult = runGate(bundle, gate, node);
  assert.equal(gateResult.output.check.passed, true, JSON.stringify(gateResult.output.inspect));
  enterPhase(bundle, gateResult.output.check.next);
  advanceStatus(bundle, statusGate);
  if (stageNext) stageNext();
  return gateResult.output;
}

function buildBaseline() {
  const bundle = instantiateBundle(root, 'baseline');
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

function runRerunCycle(bundle) {
  stageHitl2(bundle, 'rerun', 1);
  passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
  const rerun = passAndEnter(bundle, 'rerun-ready', 'phases/phase-rerun.md', 'rerun_ready');
  assert.equal(rerun.check.next, 'phases/phase-seed-topics.md');
  stageSeed(bundle, 1);
  passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', () => stageWave0(bundle, 'r2'));
  passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete', () => stageWave1(bundle, 'r2'));
  passAndEnter(bundle, 'wave1-complete', 'phases/phase-wave1.md', 'wave1_complete', () => stageWave2(bundle));
  passAndEnter(bundle, 'wave2-complete', 'phases/phase-wave2.md', 'wave2_complete');
}

function reachWave1(bundle, { rerunCount = 1, suffix = 'scenario', projectWave1 = true } = {}) {
  stageHitl2(bundle, 'rerun', rerunCount);
  passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
  passAndEnter(bundle, 'rerun-ready', 'phases/phase-rerun.md', 'rerun_ready');
  stageSeed(bundle, rerunCount);
  passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', () => stageWave0(bundle, suffix));
  let submitted;
  passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete', () => { submitted = stageWave1(bundle, suffix, { project: projectWave1 }); });
  return submitted;
}

function reachWave2(bundle, options = {}) {
  const submitted = reachWave1(bundle, options);
  passAndEnter(bundle, 'wave1-complete', 'phases/phase-wave1.md', 'wave1_complete', () => stageWave2(bundle));
  return submitted;
}

function useDeltaSynthesis(bundle) {
  const path = join(bundle, 'artifacts/wave2/synthesis.md');
  writeFileSync(path, `${readFileSync(path, 'utf8')}\n## Delta Synthesis\nFixture-labeled incremental synthesis.\n`);
}

before(() => { root = createTempRoot(); baseline = buildBaseline(); snapshot = snapshotBundle(baseline, root); });
after(() => cleanupRoot(root));

describe('deterministic rerun round continuity', { timeout: 60000 }, () => {
  it('traverses the full rerun chain through production checkpoints', () => {
    const bundle = restoreBundle(snapshot, baseline);
    runRerunCycle(bundle);
    const status = readStatus(bundle);
    assert.equal(status.current_node, 'phases/phase-hitl2.md');
    assert.equal(status.current_gate, 'wave2_complete');
    const attempts = readTrace(bundle).filter((event) => event.event === 'gate_attempt' && event.passed);
    for (const gate of ['hitl2-recorded', 'rerun-ready', 'seed-topics-ready', 'wave0-complete', 'wave1-complete', 'wave2-complete']) {
      assert.ok(attempts.some((event) => event.gate === gate), `missing real passing gate attempt ${gate}`);
    }
  });

  it('binds a production receipt to its round and rejects replay before recovering the delivery tail', () => {
    const firstRound = restoreBundle(snapshot, baseline);

    // Fixture-labeled Agent/human input. The Gate, route entry, status transition,
    // and receipt are all authored by the production CLI path.
    stageHitl2(firstRound, 'proceed_to_readiness', 0);
    passAndEnter(firstRound, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
    const firstReceipt = readTrace(firstRound)
      .filter((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded' && event.passed)
      .at(-1)?.composition_handoff_receipt;
    assert.ok(firstReceipt, 'the routed production HITL2 attempt must retain one receipt');
    assert.equal(firstReceipt.composition_handoff.for_rerun_count, 0);
    assert.match(firstReceipt.projection_sha256, /^[a-f0-9]{64}$/);

    passAndEnter(firstRound, 'readiness-passed', 'phases/phase-readiness.md', 'readiness_passed');
    assert.equal(readStatus(firstRound).current_node, 'phases/phase-final.md');
    const firstReadiness = readTrace(firstRound)
      .filter((event) => event.event === 'gate_attempt' && event.gate === 'readiness-passed' && event.passed)
      .at(-1);
    assert.equal(firstReadiness?.next, 'phases/phase-final.md');

    const rerunRound = restoreBundle(snapshot, baseline);
    runRerunCycle(rerunRound);
    assert.equal(readStatus(rerunRound).current_node, 'phases/phase-hitl2.md');

    // Fixture-labeled replay of the prior accepted projection. The old receipt is
    // never injected into trace authority; the current production Gate must reject
    // the stale profile handoff before it can route this round to Readiness.
    const profilePath = join(rerunRound, 'rb_profile.yaml');
    const replayedProfile = parseYaml(readFileSync(profilePath, 'utf8'));
    replayedProfile.human_decision_checkpoints.hitl2 = {
      ...replayedProfile.human_decision_checkpoints.hitl2,
      status: 'recorded',
      user_decision: 'proceed_to_readiness',
      final_report_view: firstReceipt.final_report_view,
      rationale: 'Fixture-labeled replay of a prior-round delivery decision.',
      rerun_count: 1,
      composition_handoff: firstReceipt.composition_handoff,
    };
    writeFileSync(profilePath, stringifyYaml(replayedProfile));
    const rejected = runGate(rerunRound, 'hitl2-recorded', 'phases/phase-hitl2.md', { expectedStatus: 1 });
    assert.equal(rejected.output.check.passed, false);
    assert.match(rejected.output.inspect.join('\n'), /rerun|round|composition/i);
    assert.equal(readStatus(rerunRound).current_node, 'phases/phase-hitl2.md');
    const rejectedAttempt = readTrace(rerunRound).at(-1);
    assert.equal(rejectedAttempt?.gate, 'hitl2-recorded');
    assert.equal(rejectedAttempt?.passed, false);
    assert.equal(rejectedAttempt?.composition_handoff_receipt, undefined);
    assert.equal(readTrace(rerunRound).some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-final.md'), false);

    stageHitl2(rerunRound, 'proceed_to_readiness', 1);
    passAndEnter(rerunRound, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
    const currentReceipt = readTrace(rerunRound)
      .filter((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded' && event.passed)
      .at(-1)?.composition_handoff_receipt;
    assert.ok(currentReceipt, 'the recovered current round must receive one new production receipt');
    assert.equal(currentReceipt.composition_handoff.for_rerun_count, 1);
    assert.notEqual(currentReceipt.projection_sha256, firstReceipt.projection_sha256);

    passAndEnter(rerunRound, 'readiness-passed', 'phases/phase-readiness.md', 'readiness_passed');
    assert.equal(readStatus(rerunRound).current_node, 'phases/phase-final.md');
  });

  it('drives labeled add, update, and direction-only candidates through production apply/recovery before count synchronization', () => {
    const bundle = restoreBundle(snapshot, baseline);
    stageHitl2(bundle, 'rerun', 1);
    passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
    const initialTopic = parseYaml(readFileSync(join(bundle, 'rb_plan.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]).topic_registry[0];
    const candidatePath = join(bundle, 'fixture-agent-candidate.json');
    writeFileSync(candidatePath, JSON.stringify({
      context: 'rerun',
      actions: [
        { action: 'update_intent', topic_uid: initialTopic.topic_uid, title: 'Topic A refined', must_answer: ['How does atomic rerun direction publication preserve authority?'], scope_role: 'primary', depends_on_topic_uids: [], direction: directionCandidate() },
        { action: 'add_topic', title: 'Topic B', slug_stem: 'topic-b', must_answer: ['What new comparison is required?'], scope_role: 'comparison', depends_on_topic_uids: [initialTopic.topic_uid], direction: directionCandidate({ action: 'add' }) },
      ],
    }, null, 2));
    const applied = parseJsonOutput(runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs'), 'apply', '--bundle', bundle, '--input', candidatePath]));
    assert.equal(applied.verdict, 'committed');
    const registry = parseYaml(readFileSync(join(bundle, 'rb_plan.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]).topic_registry;
    const added = registry.find((topic) => topic.slug.endsWith('_topic-b'));
    assert.ok(added, 'fixture candidate must add a canonical topic');

    const directionOnly = { context: 'rerun', actions: [{ action: 'set_rerun_direction', topic_uid: initialTopic.topic_uid, direction: { ...directionCandidate(), adjusted_depth: 'compare the revised operational mechanisms' } }] };
    const beforeDirection = directionSection(readFileSync(join(bundle, 'seed_topics', initialTopic.slug + '.md'), 'utf8'));
    assert.throws(() => applyCanonicalTopicState({ bundlePath: bundle, input: directionOnly, crashAt: 'after_prepared' }), /simulated crash/);
    const blocked = parseJsonOutput(runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs'), 'inspect', '--bundle', bundle], { expectedStatus: 1 }));
    const recovered = parseJsonOutput(runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs'), 'recover', '--bundle', bundle, '--operation-id', blocked.blockers[0].operation_id]));
    assert.equal(recovered.verdict, 'committed');
    const recoveredDirection = directionSection(readFileSync(join(bundle, 'seed_topics', initialTopic.slug + '.md'), 'utf8'));
    assert.notEqual(recoveredDirection, beforeDirection);

    const layout = parseJsonOutput(runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs'), 'inspect', '--bundle', bundle])).layout_baseline;
    layout.topics[0].title = 'Topic A layout-only label';
    writeFileSync(candidatePath, JSON.stringify(layout, null, 2));
    const laidOut = parseJsonOutput(runNode([join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs'), 'apply', '--bundle', bundle, '--input', candidatePath]));
    assert.equal(laidOut.verdict, 'committed');
    const laidOutTopic = parseYaml(readFileSync(join(bundle, 'rb_plan.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]).topic_registry.find((topic) => topic.topic_uid === initialTopic.topic_uid);
    assert.equal(directionSection(readFileSync(join(bundle, 'seed_topics', laidOutTopic.slug + '.md'), 'utf8')), recoveredDirection);

    const future = runGate(bundle, 'rerun-ready', 'phases/phase-rerun.md', { expectedStatus: 1 });
    assert.equal(future.output.check.passed, false);
    assert.match(future.output.hints.find((hint) => hint.rule_id === 'rerun_direction_structure').write_to, /phase-rerun/);
    setProfileRerunCount(bundle, 2);
    const synchronized = runGate(bundle, 'rerun-ready', 'phases/phase-rerun.md');
    assert.equal(synchronized.output.check.passed, true, JSON.stringify(synchronized.output.inspect));
  });

  it('fails at rerun-ready on malformed profile without downstream transition', () => {
    const bundle = restoreBundle(snapshot, baseline);
    stageHitl2(bundle, 'rerun', 1);
    passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
    writeFileSync(join(bundle, 'rb_profile.yaml'), ': malformed\n');
    const before = authoritySnapshot(bundle);
    const result = runGate(bundle, 'rerun-ready', 'phases/phase-rerun.md', { expectedStatus: 1 });
    assert.equal(result.output.check.passed, false);
    assert.equal(readStatus(bundle).current_node, 'phases/phase-rerun.md');
    const after = authoritySnapshot(bundle);
    assertOnlyTraceDiagnosticsChanged(before, after, { gate: 'rerun-ready' });
    assert.match(result.output.inspect.join('\n'), /profile|YAML|parse/i);
  });

  it('fails at rerun-ready when the profile is missing and preserves prior authority', () => {
    const bundle = restoreBundle(snapshot, baseline);
    stageHitl2(bundle, 'rerun', 1);
    passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
    unlinkSync(join(bundle, 'rb_profile.yaml'));
    const before = authoritySnapshot(bundle);
    const result = runGate(bundle, 'rerun-ready', 'phases/phase-rerun.md', { expectedStatus: 1 });
    assert.equal(result.output.check.passed, false);
    assert.equal(readStatus(bundle).current_node, 'phases/phase-rerun.md');
    assert.match(result.output.inspect.join('\n'), /profile|missing|not found/i);
    assertOnlyTraceDiagnosticsChanged(before, authoritySnapshot(bundle), { gate: 'rerun-ready' });
  });

  it('fails Wave2 on a missing required artifact without invoking its transition', () => {
    const bundle = restoreBundle(snapshot, baseline);
    reachWave2(bundle, { suffix: 'missing-wave2' });
    unlinkSync(join(bundle, 'artifacts/wave2/synthesis.md'));
    const before = authoritySnapshot(bundle);
    const result = runGate(bundle, 'wave2-complete', 'phases/phase-wave2.md', { expectedStatus: 1 });
    assert.equal(result.output.check.passed, false);
    assert.equal(readStatus(bundle).current_node, 'phases/phase-wave2.md');
    assert.match(result.output.inspect.join('\n'), /synthesis\.md|missing|not found/i);
    assertOnlyTraceDiagnosticsChanged(before, authoritySnapshot(bundle), { gate: 'wave2-complete' });
  });

  it('fails Wave1 on inconsistent submitted work-unit authority without advancing', () => {
    const bundle = restoreBundle(snapshot, baseline);
    const submitted = reachWave1(bundle, { suffix: 'authority-fault' });
    const manifestPath = join(bundle, submitted.record.paths.manifest_ref);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.receipt_nonce = 'wu-ffffffffffffffff';
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const before = authoritySnapshot(bundle);
    const result = runGate(bundle, 'wave1-complete', 'phases/phase-wave1.md', { expectedStatus: 1 });
    assert.equal(result.output.check.passed, false);
    assert.equal(readStatus(bundle).current_node, 'phases/phase-wave1.md');
    assert.match(result.output.inspect.join('\n'), /manifest\/index mismatch|receipt_nonce|authority/i);
    assertOnlyTraceDiagnosticsChanged(before, authoritySnapshot(bundle), { gate: 'wave1-complete' });
  });

  for (const direction of [
    { label: 'stale', count: 0 },
    { label: 'invalid', count: 'not-a-number' },
  ]) {
    it(`${direction.label} action:add direction does not activate the Wave2 full-synthesis restriction`, () => {
      const bundle = restoreBundle(snapshot, baseline);
      reachWave2(bundle, { suffix: `direction-${direction.label}` });
      stageSeed(bundle, 1, { action: 'add', directionCount: direction.count });
      useDeltaSynthesis(bundle);
      const result = runGate(bundle, 'wave2-complete', 'phases/phase-wave2.md');
      assert.equal(result.output.check.passed, true, JSON.stringify(result.output.inspect));
      assert.doesNotMatch(result.output.inspect.join('\n'), /action:add/);
    });
  }

  it('keeps a future add direction inactive until profile-count synchronization makes it current', () => {
    const bundle = restoreBundle(snapshot, baseline);
    reachWave2(bundle, { suffix: 'direction-future' });
    stageSeed(bundle, 1, { action: 'add', directionCount: 2 });
    const directionPath = join(bundle, 'seed_topics/topic-a.md');
    const directionBytes = readFileSync(directionPath);
    useDeltaSynthesis(bundle);

    // Fixture-labeled Markdown recovery: profile increment/reuse is simulated Agent behavior,
    // not an Engine recovery verdict. The existing future direction is not rewritten.
    setProfileRerunCount(bundle, 2);
    assert.deepEqual(readFileSync(directionPath), directionBytes);
    const current = runGate(bundle, 'wave2-complete', 'phases/phase-wave2.md', { expectedStatus: 1 });
    assert.equal(current.output.check.passed, false);
    assert.match(current.output.inspect.join('\n'), /action:add.*Delta Synthesis/i);
    writeFileSync(join(bundle, 'artifacts/wave2/synthesis.md'), '# Cross-Topic Synthesis\n\nW2F-001 follows [Wave1 evidence](../wave1/topic-a/evidence-summary.md).\n');
    const matching = runGate(bundle, 'wave2-complete', 'phases/phase-wave2.md');
    assert.equal(matching.output.check.passed, true, JSON.stringify(matching.output.inspect));
  });

  it('uses real submit and inspect authority for current and prior round rows in the long chain', () => {
    const bundle = restoreBundle(snapshot, baseline);
    const prior = inspectEligible(bundle, 'wave1').output.eligible_rows;
    assert.ok(prior.length > 0, 'runtime-generated baseline should contain a submitted Wave1 row');
    const submitted = reachWave1(bundle, { rerunCount: 2, suffix: 'round-current' });
    const inspected = inspectEligible(bundle, 'wave1').output;
    assert.equal(inspected.passed, true);
    assert.deepEqual(inspected.eligible_rows.map((row) => row.work_id), [submitted.record.work_id]);
    assert.equal(inspected.eligible_rows.some((row) => prior.some((old) => old.work_id === row.work_id)), false);
    assert.equal(inspected.eligible_rows[0].status, 'submitted');
    assert.equal(inspected.eligible_rows[0].rerun_count, 2);
  });

  it('reports a real submitted row as legacy only after its round binding is removed', () => {
    const bundle = restoreBundle(snapshot, baseline);
    const submitted = reachWave1(bundle, { rerunCount: 2, suffix: 'round-legacy' });
    const indexPath = join(bundle, '_work_units/_index.json');
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    delete index.work_units[submitted.record.work_id].rerun_count;
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
    const inspected = inspectEligible(bundle, 'wave1').output;
    assert.equal(inspected.eligible_rows.some((row) => row.work_id === submitted.record.work_id), false);
    assert.match(inspected.warnings.join('\n'), /legacy submitted row.*without rerun_count excluded/);
  });

  it('fails closed when long-chain work-unit authority becomes inconsistent', () => {
    const bundle = restoreBundle(snapshot, baseline);
    const submitted = reachWave1(bundle, { rerunCount: 2, suffix: 'round-inconsistent' });
    const manifestPath = join(bundle, submitted.record.paths.manifest_ref);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.receipt_nonce = 'wu-eeeeeeeeeeeeeeee';
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const before = authoritySnapshot(bundle);
    const inspected = inspectEligibleFailure(bundle, 'wave1').output;
    assert.equal(inspected.passed, false);
    assert.deepEqual(inspected.eligible_rows, []);
    assert.match(inspected.inspect.join('\n'), /manifest\/index mismatch.*receipt_nonce/);
    assert.match(inspected.warnings.join('\n'), /authority is inconsistent/);
    assertOnlyTraceDiagnosticsChanged(before, authoritySnapshot(bundle));
  });

  it('blocks omitted current-row seed projection and passes after an identity-bound Agent repair', () => {
    const bundle = restoreBundle(snapshot, baseline);
    const submitted = reachWave1(bundle, { rerunCount: 2, suffix: 'rrm-current-row', projectWave1: false });
    const manifestPath = join(bundle, submitted.record.paths.manifest_ref);
    const authorityBefore = {
      index: readFileSync(join(bundle, '_work_units/_index.json')),
      ledger: readFileSync(join(bundle, 'rb_output_declarations.jsonl')),
      manifest: readFileSync(manifestPath),
    };
    const inspectCli = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs');
    const failedProcess = runNode([inspectCli, '--bundle', bundle], { expectedStatus: 1 });
    const failed = parseJsonOutput(failedProcess);
    assert.match(failed.inspect.join('\n'), new RegExp(`return_map_current_row_omission.*${submitted.record.work_id}`));

    const packetEntry = (ordinal, evidenceMeaning) => ({
      source_identity: { kind: 'submitted_work', work_id: submitted.record.work_id },
      entry_id: `${submitted.record.work_id}/${ordinal}`,
      evidence_meaning: evidenceMeaning,
      relationship: 'supports',
      refs: ['reference/topic-a-rrm-current-row-deepening.md'],
      status: 'supported',
      next_hop: 'Read the submitted Wave1 reference before Wave2 synthesis.',
    });
    assert.equal(applyCanonicalTopicState({
      bundlePath: bundle,
      input: {
        context: 'wave_projection', action: 'apply_seed_projection', topic_uid: TOPIC.topic_uid, wave: 'wave1',
        updates: [
          { slot_id: 'wave1_mechanisms', entries: [packetEntry(1, 'Submitted Wave1 evidence explains the continuity mechanism.')] },
          { slot_id: 'wave1_trends', entries: [packetEntry(2, 'Submitted Wave1 evidence records the continuity limitation.')] },
          { slot_id: 'pending_questions', entries: [packetEntry(3, 'Submitted Wave1 evidence preserves the unresolved direction question.')] },
        ],
      },
    }).verdict, 'committed');
    const repairedProcess = runNode([inspectCli, '--bundle', bundle], { expectedStatus: 0 });
    const repaired = parseJsonOutput(repairedProcess);
    assert.doesNotMatch(repaired.inspect.join('\n'), /return_map_current_row_omission/);
    assert.equal(repaired.check.return_map_classification, 'diagnostic-only', repaired.inspect.join('\n'));
    assert.deepEqual(readFileSync(join(bundle, '_work_units/_index.json')), authorityBefore.index);
    assert.deepEqual(readFileSync(join(bundle, 'rb_output_declarations.jsonl')), authorityBefore.ledger);
    assert.deepEqual(readFileSync(manifestPath), authorityBefore.manifest);
  });

  it('fails a partial Wave2 artifact, repairs it, and reruns the same gate once', () => {
    const bundle = restoreBundle(snapshot, baseline);
    stageHitl2(bundle, 'rerun', 1);
    passAndEnter(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md', 'hitl2_recorded');
    passAndEnter(bundle, 'rerun-ready', 'phases/phase-rerun.md', 'rerun_ready');
    stageSeed(bundle, 1);
    passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', () => stageWave0(bundle, 'repair'));
    passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete', () => stageWave1(bundle, 'repair'));
    passAndEnter(bundle, 'wave1-complete', 'phases/phase-wave1.md', 'wave1_complete', () => { stageWave2(bundle); writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), ': malformed\n'); });
    const before = authoritySnapshot(bundle);
    const failed = runGate(bundle, 'wave2-complete', 'phases/phase-wave2.md', { expectedStatus: 1 });
    assert.equal(failed.output.check.passed, false);
    assert.equal(readStatus(bundle).current_node, 'phases/phase-wave2.md');
    assertOnlyTraceDiagnosticsChanged(before, authoritySnapshot(bundle), { gate: 'wave2-complete' });
    stageWave2(bundle);
    const passed = runGate(bundle, 'wave2-complete', 'phases/phase-wave2.md');
    assert.equal(passed.output.check.passed, true);
    const wave2Attempts = readTrace(bundle).filter((event) => event.event === 'gate_attempt' && event.gate === 'wave2-complete');
    assert.equal(wave2Attempts.at(-2).passed, false);
    assert.equal(wave2Attempts.at(-1).passed, true);
  });
});
