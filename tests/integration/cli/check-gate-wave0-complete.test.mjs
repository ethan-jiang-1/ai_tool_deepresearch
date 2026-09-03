// gate-wave0-complete integration tests (RWG-001, RWG-004)
import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';
import {
  claimAndSubmitWorkUnit,
} from '../../engine/work-unit-test-helpers.mjs';
import {
  applyCanonicalTopicState,
  renderSeedProjectionAppendix,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { tryLoadGateDefinition } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import { evaluateSeedTopicProjectionReadiness } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/return-map.mjs';
import { buildCanonicalTopicRegistryFact } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-registry-fact.mjs';
import { evaluateWave0Contract } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs';
import { collectSubmittedWave0ContributionProjection } from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-projection.mjs';
import { restoreBundle, snapshotBundle, uniqueSnapshotRoot } from '../../e2e/helpers/deterministic-chain-harness.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs');
const INSPECT_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs');
const OPERATE_WORK_UNIT_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_w0_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath, { attempt } = {}) {
  const argv = [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-wave0.md'];
  if (attempt !== undefined) argv.push('--attempt', String(attempt));
  return spawnSync('node', argv, { encoding: 'utf-8', timeout: 10000 });
}

function runInspect(bundlePath) {
  return spawnSync('node', [INSPECT_CLI, '--bundle', bundlePath], { encoding: 'utf-8', timeout: 10000 });
}

function runDeclarationRecovery(bundlePath, workId) {
  return spawnSync('node', [OPERATE_WORK_UNIT_CLI, 'recover-declaration', bundlePath, '--work-id', workId], {
    encoding: 'utf-8',
    timeout: 10000,
  });
}

function submittedMaterializationHint(output) {
  const hint = output.hints.find((entry) => entry.rule_id === 'wave0_submitted_reference_materialization');
  assert.ok(hint, JSON.stringify(output.check));
  return hint;
}

async function evaluateDirect(input) {
  const { evaluateDirectOutputTarget } = await import('../../../DEEP_RESEARCH_HARNESS/engine/helpers/direct-output-contract.mjs');
  return evaluateDirectOutputTarget(input);
}

function directContext(finding) {
  return finding?.checkpoint_context?.direct_root || null;
}

/** Create a bundle with topic_registry and setup. */
function createBundleWithTopics(name, topics, derivedTopicCount = topics.length) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  setStatusWindow(dir, 'seed_topics_ready', 'wave0_complete');

  // Write topic_registry into rb_plan.md frontmatter
  const planPath = join(dir, 'rb_plan.md');
  const existing = readFileSync(planPath, 'utf-8');
  const fm = `---\n{\n  "plan_basename": "${name}",\n  "derived_topic_count": ${derivedTopicCount},\n  "topic_registry_version": "2",\n  "topic_registry": [\n${topics.map((topic) => `    ${JSON.stringify(topic)}`).join(',\n')}\n  ]\n}\n---`;
  writeFileSync(planPath, fm + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));

  const statusPath = join(dir, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  status.current_node = 'phases/phase-wave0.md';
  writeFileSync(statusPath, JSON.stringify(status));

  return dir;
}

function createBundle(name) {
  return createBundleWithTopics(name, [
    { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['A?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] },
    { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174001', id: '02', slug: 'topic-b', title: 'Topic B', must_answer: ['B?'], scope_role: 'supporting', depends_on_topic_uids: [], previous_layouts: [] },
  ]);
}

function renderCanonicalSeed(topic) {
  const binding = {
    topic_uid: topic.topic_uid,
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    must_answer: topic.must_answer,
    scope_role: topic.scope_role,
    depends_on_topic_uids: topic.depends_on_topic_uids,
  };
  return `---\n${JSON.stringify(binding, null, 2)}\n---\n# ${topic.title}\n\n${renderSeedProjectionAppendix()}\n`;
}

function materializeWave0Projection(dir, submission, {
  deferred = false,
  ordinal = 1,
  ordinals = null,
  preserveExistingSeed = false,
  topicSlug = 'topic-a',
} = {}) {
  const planFrontmatter = readFileSync(join(dir, 'rb_plan.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/);
  const plan = JSON.parse(planFrontmatter[1]);
  const topic = plan.topic_registry.find((entry) => entry.slug === topicSlug);
  assert.ok(topic, `Wave0 fixture requires canonical ${topicSlug}`);
  const seedPath = join(dir, 'seed_topics', `${topic.slug}.md`);
  if (!preserveExistingSeed || !existsSync(seedPath)) writeFileSync(seedPath, renderCanonicalSeed(topic));

  const entryOrdinals = ordinals || [ordinal];
  const entries = entryOrdinals.map((entryOrdinal) => (deferred
    ? {
      source_identity: { kind: 'submitted_work', work_id: submission.record.work_id },
      entry_id: `${submission.record.work_id}/${entryOrdinal}`,
      evidence_meaning: 'The submitted Wave0 authority has no materializable consumer reference.',
      relationship: 'defers',
      refs: ['none'],
      status: 'deferred',
      next_hop: 'limitation: no materializable consumer reference is available.',
    }
    : {
      source_identity: { kind: 'submitted_work', work_id: submission.record.work_id },
      entry_id: `${submission.record.work_id}/${entryOrdinal}`,
      evidence_meaning: 'The submitted Wave0 source establishes the topic evidence route.',
      relationship: 'supports',
      refs: ['reference/00-shared-ai-safety.md'],
      status: 'supported',
      next_hop: 'Read the shared reference before Wave1 deepening.',
    }));
  const result = applyCanonicalTopicState({
    bundlePath: dir,
    input: {
      context: 'wave_projection',
      action: 'apply_seed_projection',
      topic_uid: topic.topic_uid,
      wave: 'wave0',
      updates: [{ slot_id: 'wave0_evidence', entries }],
    },
  });
  assert.ok(['committed', 'unchanged'].includes(result.verdict), JSON.stringify(result));
}

/** Write a valid ReferenceMetadata array YAML for a topic. */
const VALID_REF = `- url: "https://fixture.news-research.com/article-1"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
  notes: "Good overview"
`;
const VALID_REF_B = `- url: "https://fixture.news-research.com/article-2"
  title: "AI Alignment Basics"
  retrieved_date: "2026-06-16"
  topic_tag: "topic-b"
`;
const VALID_REF_SECOND = `- url: "https://fixture.news-research.com/article-3"
  title: "AI Safety Follow-up"
  retrieved_date: "2026-06-17"
  topic_tag: "topic-a"
`;

const TOPIC_A_SOURCE_URL = 'https://fixture.news-research.com/article-1';
const TOPIC_B_SOURCE_URL = 'https://fixture.news-research.com/article-2';
const TOPIC_A_CACHE = '_cache/wave0/primary/topic-a/source-yaml';
const TOPIC_B_CACHE = '_cache/wave0/primary/topic-b/source-yaml';

function sourceMetadataArray(count) {
  return Array.from({ length: count }, (_, index) => [
    `- url: "https://fixture.news-research.com/article-${index + 1}"`,
    `  title: "Wave0 Source ${index + 1}"`,
    '  retrieved_date: "2026-06-15"',
    '  topic_tag: "topic-a"',
  ].join('\n')).join('\n') + '\n';
}
const SCHEMA_INVALID_REF = `- url: ""
  title: "Missing URL"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
`;

function writeWave0PhaseProjection(dir, submission, {
  sourceUrl = TOPIC_A_SOURCE_URL,
  cachePath = TOPIC_A_CACHE,
  fileName = '00-shared-ai-safety.md',
  ordinal = 1,
  topicSlug = 'topic-a',
} = {}) {
  writeFileSync(join(dir, 'reference', fileName),
    `---\nsource_url: "${sourceUrl}"\nacceptance_status: accepted\n` +
    'source_type: secondary\ntier: "Tier 2"\nevidence_role: foundation\ntrust_level: practitioner\n' +
    'why_it_matters: "Foundation context for the shared research question."\naccessed_at: "2026-06-15"\nrelated_topic_uid: all\n---\n' +
    '# AI Safety Foundation\n\n' +
    '## Key Facts\n- Submitted foundation source is available for this consumer projection.\n\n' +
    '## Core Content Capture\nThe submitted Wave0 source provides bounded foundation evidence for this reader-facing projection.\n\n' +
    '## Relevance To This Research\nThis reference gives the research a shared foundation.\n\n' +
    '## Quotable Terms / Concepts\n- AI safety\n\n' +
    '## Risks And Limitations\n- The source remains one bounded foundation input.\n\n' +
    '## Submitted Backing\n' +
    `- source_identity: ${submission.record.work_id}/${ordinal}\n` +
    `- source_yaml_ref: artifacts/wave0/${topicSlug}/source.yaml\n` +
    `- cache_trail_ref: ${cachePath}\n` +
    `- result_ref: ${submission.record.paths.result_ref}\n` +
    `- work_unit_ref: ${submission.record.paths.work_unit_dir}\n`);
}

function submitCurrentWave0Source(dir, {
  queueItemId,
  topicUid,
  topicSlug,
  sourceContent,
  cachePath,
  sourceUrl,
  preserveQueue = false,
} = {}) {
  const submission = claimAndSubmitWorkUnit(dir, {
    queueItemId,
    preserveQueue,
    queueItemOverrides: {
      payload: { wave: 0, topic_uid: topicUid, topic_slug: topicSlug },
      required_receipts: [`file:artifacts/wave0/${topicSlug}/source.yaml`],
      writes_to: [`artifacts/wave0/${topicSlug}/source.yaml`],
    },
    outputs: [{
      path: `artifacts/wave0/${topicSlug}/source.yaml`,
      role: 'source_yaml',
      content: sourceContent,
    }],
    cacheTrails: [{ path: cachePath, url: sourceUrl }],
  });
  assert.equal(submission.submitted.ok, true, JSON.stringify(submission.submitted));
  return submission;
}

/** Set up a current v2 Wave0 source-only submission with a Phase-owned reference. */
function setupHappyPath(dir, { sourceContent = VALID_REF } = {}) {
  writeFileSync(join(dir, 'reference/_INDEX.md'),
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n' +
    '| --- | --- | --- | --- | --- | --- | --- | --- |\n' +
    '| 00-shared-ai-safety.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |\n');
  writeFileSync(join(dir, 'reference/README.md'), '# Reference Evidence\nFlat reference directory.\n');
  writeTraceEvents(dir, [
    ...witnessedHandoffEvents({
      sourceGate: 'seed-topics-ready',
      phase: 'seed-topics',
      sourceNode: 'phases/phase-seed-topics.md',
      targetNode: 'phases/phase-wave0.md',
    }),
    { event: 'wave0_completion', ts: new Date().toISOString() },
  ]);
  const submission = submitCurrentWave0Source(dir, {
    queueItemId: 'topic-a',
    topicUid: 'tp_123e4567-e89b-12d3-a456-426614174000',
    topicSlug: 'topic-a',
    sourceContent,
    cachePath: TOPIC_A_CACHE,
    sourceUrl: TOPIC_A_SOURCE_URL,
  });
  const topicBSubmission = submitCurrentWave0Source(dir, {
    queueItemId: 'topic-b',
    topicUid: 'tp_123e4567-e89b-12d3-a456-426614174001',
    topicSlug: 'topic-b',
    sourceContent: VALID_REF_B,
    cachePath: TOPIC_B_CACHE,
    sourceUrl: TOPIC_B_SOURCE_URL,
    preserveQueue: true,
  });
  writeWave0PhaseProjection(dir, submission);
  materializeWave0Projection(dir, submission);
  materializeWave0Projection(dir, topicBSubmission, { deferred: true, topicSlug: 'topic-b' });
  return submission;
}

function submitWave0Supplement(dir, sourceContent) {
  return claimAndSubmitWorkUnit(dir, {
    phase: 'wave0',
    queueItemId: 'topic-a-supplement',
    preserveQueue: true,
    queueItemOverrides: {
      payload: {
        wave: 0,
        topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
        topic_slug: 'topic-a',
      },
      required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
      writes_to: ['artifacts/wave0/topic-a/source.yaml'],
    },
    outputs: [{
      path: 'artifacts/wave0/topic-a/source.yaml',
      role: 'source_yaml',
      content: sourceContent,
    }],
    cacheTrails: [{
      path: '_cache/wave0/primary/topic-a/supplement',
      url: 'https://fixture.news-research.com/research/ai-safety-supplement',
    }],
  });
}

function setupWave0WithoutSharedReference(dir, { submitWorkUnit = true } = {}) {
  writeFileSync(join(dir, 'reference/_INDEX.md'),
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n' +
    '| --- | --- | --- | --- | --- | --- | --- | --- |\n');
  writeFileSync(join(dir, 'reference/README.md'), '# Reference Evidence\nFlat reference directory.\n');

  writeTraceEvents(dir, [
    ...witnessedHandoffEvents({
      sourceGate: 'seed-topics-ready',
      phase: 'seed-topics',
      sourceNode: 'phases/phase-seed-topics.md',
      targetNode: 'phases/phase-wave0.md',
    }),
    { event: 'wave0_completion', ts: new Date().toISOString() },
  ]);

  if (submitWorkUnit) {
    const topicASubmission = submitCurrentWave0Source(dir, {
      queueItemId: 'topic-a',
      topicUid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      topicSlug: 'topic-a',
      sourceContent: VALID_REF,
      cachePath: TOPIC_A_CACHE,
      sourceUrl: TOPIC_A_SOURCE_URL,
    });
    const topicBSubmission = submitCurrentWave0Source(dir, {
      queueItemId: 'topic-b',
      topicUid: 'tp_123e4567-e89b-12d3-a456-426614174001',
      topicSlug: 'topic-b',
      sourceContent: VALID_REF_B,
      cachePath: TOPIC_B_CACHE,
      sourceUrl: TOPIC_B_SOURCE_URL,
      preserveQueue: true,
    });
    return { topicASubmission, topicBSubmission };
  }
  return { topicASubmission: null, topicBSubmission: null };
}

describe('check-gate-wave0-complete', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });
  let sharedBundle;
  let sharedSnapshot;
  before(() => {
    sharedBundle = createBundle('shared-wave0');
    sharedSnapshot = snapshotBundle(sharedBundle, uniqueSnapshotRoot(sharedBundle, 'wave0'));
    track(uniqueSnapshotRoot(sharedBundle, 'wave0'));
  });
  function restoredBundle() {
    restoreBundle(sharedSnapshot, sharedBundle);
    return sharedBundle;
  }

  it('1. happy path: all rules pass', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
    assert.deepEqual(output.check.failed_rule_ids, []);
    assert.deepEqual(output.check.masked_rule_ids, []);
    assert.deepEqual(output.continuation, {
      interaction: 'do_not_initiate',
      next_action: 'consume_check_next',
      node_ref: 'phases/phase-wave0.md',
      gate: 'wave0-complete',
    });
  });

  it('1. rejects a dual historical binding through one shared Gate and inspect root', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    const referencePath = join(dir, 'reference/00-shared-ai-safety.md');
    const historicalBytes = readFileSync(referencePath, 'utf8').replace(
      'related_topic_uid: all',
      'related_topic_uid: all\nrelated_topic: all',
    );
    writeFileSync(referencePath, historicalBytes);

    for (const output of [
      JSON.parse(runGate(dir).stdout),
      JSON.parse(runInspect(dir).stdout),
    ]) {
      assert.equal(output.check.passed, false);
      assert.deepEqual(output.check.failed_rule_ids, ['reference_format'], JSON.stringify(output));
      assert.equal(output.inspect.filter((line) => (
        line.includes('reference_topic_binding_legacy_unsupported')
      )).length, 1);
      assert.equal(output.check.masked_rule_ids.includes('shared_ref_count_floor'), true);
      const hint = output.hints.find((candidate) => candidate.rule_id === 'reference_format');
      assert.ok(hint, JSON.stringify(output.hints));
      assert.match(hint.missing_fact, /#metadata\.related_topic/);
      assert.equal(hint.write_to, 'Current UID-bound reference materialization path');
    }
    assert.equal(readFileSync(referencePath, 'utf8'), historicalBytes);
  });

  it('1a. aggregates historical Wave0 artifact and submitted coverage as one current UID floor', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    const planPath = join(dir, 'rb_plan.md');
    const plan = readFileSync(planPath, 'utf8').replace(
      '{ "id": "t1", "slug": "topic-a", "title": "Topic A" }',
      '{ "id": "t1", "slug": "topic-a-new", "title": "Topic A", "previous_layouts": [{ "id": "t1", "slug": "topic-a" }] }',
    );
    writeFileSync(planPath, plan);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, output.inspect.join('\n'));
    assert.equal(output.check.failed_rule_ids.some((id) => id.includes('topic-a-new')), false);
  });

  it('reports an unsubmitted Wave0 suffix through one shared contribution parent root', () => {
    const dir = restoredBundle();
    const submission = setupHappyPath(dir);
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), `${VALID_REF}${VALID_REF_SECOND}`);

    const gateSource = readFileSync(GATE_CLI, 'utf8');
    assert.match(gateSource, /evaluateSeedTopicProjectionReadiness/);
    assert.doesNotMatch(gateSource, /inspect-wave0-output|readYamlArraySafe|parseYaml/);

    const readiness = evaluateSeedTopicProjectionReadiness(dir, {
      wave: 'wave0',
      topicRegistryFact: buildCanonicalTopicRegistryFact(dir),
    });
    const contributionRoots = readiness.findings.filter((finding) => finding.rule_id === 'submitted_source_contribution_unsubmitted_suffix');
    assert.equal(contributionRoots.length, 1);
    const omissions = readiness.findings.filter((finding) => finding.rule_id === 'return_map_current_candidate_omission');
    assert.equal(omissions.length, 0);

    const incomplete = runGate(dir);
    assert.equal(incomplete.status, 1, incomplete.stderr || incomplete.stdout);
    const incompleteOutput = JSON.parse(incomplete.stdout);
    assert.ok(incompleteOutput.check.failed_rule_ids.includes('submitted_source_contribution_unsubmitted_suffix'));
    assert.equal(incompleteOutput.check.failed_rule_ids.includes('return_map_current_candidate_omission'), false);
    assert.ok(incompleteOutput.inspect.some((line) => /submitted_source_contribution_unsubmitted_suffix/.test(line)));
  });

  it('keeps legal nineteen-to-twenty supplement coordinates disjoint in readiness and Gate', () => {
    const dir = restoredBundle();
    const initial = setupHappyPath(dir, { sourceContent: sourceMetadataArray(19) });
    materializeWave0Projection(dir, initial, {
      deferred: true,
      ordinals: Array.from({ length: 19 }, (_, index) => index + 1),
      preserveExistingSeed: true,
    });
    const supplement = submitWave0Supplement(dir, sourceMetadataArray(20));
    materializeWave0Projection(dir, supplement, { deferred: true, ordinal: 20, preserveExistingSeed: true });

    const topicRegistryFact = buildCanonicalTopicRegistryFact(dir);
    const candidates = collectSubmittedWave0ContributionProjection(dir, { topicRegistryFact });
    assert.equal(candidates.passed, true, JSON.stringify(candidates.root_findings));
    assert.deepEqual(
      candidates.candidates.filter((candidate) => candidate.work_id === initial.record.work_id).map((candidate) => candidate.source_ordinal),
      Array.from({ length: 19 }, (_, index) => index + 1),
    );
    assert.deepEqual(
      candidates.candidates.filter((candidate) => candidate.work_id === supplement.record.work_id).map((candidate) => candidate.source_ordinal),
      [20],
    );

    const readiness = evaluateSeedTopicProjectionReadiness(dir, { wave: 'wave0', topicRegistryFact });
    assert.equal(readiness.passed, true, JSON.stringify(readiness.findings));

    const gate = runGate(dir);
    assert.equal(gate.status, 0, gate.stderr || gate.stdout);
    assert.equal(JSON.parse(gate.stdout).check.passed, true, gate.stdout);
  });

  it('1b. inspect reads bullet metadata after an optional H1 title', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    const referencePath = join(dir, 'reference/00-shared-ai-safety.md');
    writeFileSync(referencePath, `# AI Safety Landscape\n\n${readFileSync(referencePath, 'utf8')}`);
    const result = runInspect(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.inspect.some((line) => line.includes('metadata block missing required key')), false, output.inspect.join('\n'));
  });

  it('1b. exposes submitted materialization before a dependent shared-reference floor', () => {
    const dir = restoredBundle();
    setupWave0WithoutSharedReference(dir);
    const rawInspect = JSON.parse(runInspect(dir).stdout);
    assert.equal(rawInspect.check.passed, false);
    assert.equal(Object.hasOwn(rawInspect, 'routing'), false);
    assert.notEqual(rawInspect.check.degraded, true);
    assert.ok(rawInspect.check.failed_rule_ids.includes('wave0_submitted_reference_materialization'));
    assert.equal(rawInspect.check.failed_rule_ids.includes('shared_ref_count_floor'), false);
    const inspectHint = submittedMaterializationHint(rawInspect);
    const result = runGate(dir, { attempt: 3 });
    assert.equal(result.status, 1, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, JSON.stringify(output));
    assert.notEqual(output.check.degraded, true);
    assert.ok(output.check.failed_rule_ids.includes('wave0_submitted_reference_materialization'));
    assert.equal(output.check.failed_rule_ids.includes('shared_ref_count_floor'), false);
    assert.ok(output.inspect.some((line) => line.includes('[wave0_submitted_reference_materialization]')));
    const gateHint = submittedMaterializationHint(output);
    assert.deepEqual(
      {
        rule_id: gateHint.rule_id,
        repair_kind: gateHint.repair_kind,
        missing_fact: gateHint.missing_fact,
        write_to: gateHint.write_to,
      },
      {
        rule_id: inspectHint.rule_id,
        repair_kind: inspectHint.repair_kind,
        missing_fact: inspectHint.missing_fact,
        write_to: inspectHint.write_to,
      },
    );

    const traceEvents = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const lastAttempt = traceEvents.filter((event) => event.event === 'gate_attempt' && event.gate === 'wave0-complete').at(-1);
    assert.notEqual(lastAttempt.degraded, true);
    const diagnostic = JSON.parse(readFileSync(join(dir, lastAttempt.diagnostic_path), 'utf-8'));
    assert.ok(diagnostic.check.failed_rule_ids.includes('wave0_submitted_reference_materialization'));
    assert.equal(diagnostic.check.failed_rule_ids.includes('shared_ref_count_floor'), false);
    const diagnosticHint = submittedMaterializationHint(diagnostic);
    assert.deepEqual(
      {
        rule_id: diagnosticHint.rule_id,
        repair_kind: diagnosticHint.repair_kind,
        missing_fact: diagnosticHint.missing_fact,
        write_to: diagnosticHint.write_to,
      },
      {
        rule_id: gateHint.rule_id,
        repair_kind: gateHint.repair_kind,
        missing_fact: gateHint.missing_fact,
        write_to: gateHint.write_to,
      },
    );
  });

  it('1b. retains an independent invalid shared-reference backing beside a materialization candidate', () => {
    const dir = restoredBundle();
    const { topicASubmission } = setupWave0WithoutSharedReference(dir);
    writeWave0PhaseProjection(dir, topicASubmission);
    const validProjection = join(dir, 'reference/00-shared-ai-safety.md');
    const invalidProjection = join(dir, 'reference/00-shared-invalid-backing.md');
    writeFileSync(
      invalidProjection,
      readFileSync(validProjection, 'utf8').replace(
        `${topicASubmission.record.work_id}/1`,
        `${topicASubmission.record.work_id}/999`,
      ),
    );
    rmSync(validProjection);

    const inspected = JSON.parse(runInspect(dir).stdout);
    assert.ok(inspected.check.failed_rule_ids.includes('wave0_submitted_reference_materialization'));
    assert.ok(inspected.check.failed_rule_ids.includes('wave0_reference_backing'));
    assert.equal(inspected.check.failed_rule_ids.includes('shared_ref_count_floor'), false);

    const result = runGate(dir);
    assert.equal(result.status, 1, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.ok(output.check.failed_rule_ids.includes('wave0_submitted_reference_materialization'));
    assert.ok(output.check.failed_rule_ids.includes('wave0_reference_backing'));
    assert.equal(output.check.failed_rule_ids.includes('shared_ref_count_floor'), false);
  });

  it('1b. emits degraded floor feedback only after all submitted candidates are explicitly deferred', () => {
    const dir = restoredBundle();
    const { topicASubmission, topicBSubmission } = setupWave0WithoutSharedReference(dir);
    materializeWave0Projection(dir, topicASubmission, { deferred: true });
    materializeWave0Projection(dir, topicBSubmission, { deferred: true, topicSlug: 'topic-b' });
    const result = runGate(dir, { attempt: 3 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, JSON.stringify(output));
    assert.equal(output.check.degraded, true);
    assert.deepEqual(output.check.degraded_rules, ['shared_ref_count_floor']);
    assert.equal(output.check.failed_rule_ids.includes('wave0_submitted_reference_materialization'), false);
  });

  it('1b. submitted-backing feedback names a Phase-owned consumer projection target', () => {
    const dir = restoredBundle();
    setupWave0WithoutSharedReference(dir);
    const result = runGate(dir);
    assert.equal(result.status, 1, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    const hint = output.hints.find((entry) => entry.rule_id === 'wave0_submitted_reference_materialization');
    assert.ok(hint, JSON.stringify(output.hints));
    assert.equal(hint.repair_kind, 'agent_action');
    assert.match(hint.write_to, /Phase-owned Wave0 consumer projection target/);
    assert.match(hint.write_to, /source_identity=wu-w0-/);
    assert.match(hint.write_to, /source_url/);
    assert.match(hint.write_to, /source_yaml_ref/);
    assert.match(hint.write_to, /cache_trail_refs/);
    assert.doesNotMatch(hint.write_to, /wave0_source_intake|output_files\[\]/);
  });

  it('1c. refuses degraded pass when runtime-truth blockers remain', () => {
    const dir = restoredBundle();
    setupWave0WithoutSharedReference(dir, { submitWorkUnit: false });
    const result = runGate(dir, { attempt: 3 });
    assert.equal(result.status, 1, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.notEqual(output.check.degraded, true);
    assert.deepEqual(output.continuation, {
      interaction: 'do_not_initiate',
      next_action: 'repair_and_rerun_gate',
      node_ref: 'phases/phase-wave0.md',
      gate: 'wave0-complete',
    });
    assert.ok(output.check.failed_rule_ids.includes('wave0_work_unit_ledger_exists'));
    assert.ok(output.inspect.some((line) => line.includes('[degraded_not_eligible]')));
    const traceEvents = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
    assert.equal(traceEvents.filter((event) => event.event === 'delegated_bypass_suspected').length, 0);
    const runLog = readFileSync(join(dir, '_logs/run.log'), 'utf8');
    assert.equal(runLog.split('\n').filter((line) => /\] WARN delegated_bypass_suspected\b/.test(line)).length, 0);
  });

  it('1d. returns one submitted-declaration parent root and masks dependent provenance symptoms', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    const index = JSON.parse(readFileSync(join(dir, '_work_units/_index.json'), 'utf8'));
    const submittedWorkIds = Object.values(index.work_units)
      .filter((record) => record.status === 'submitted')
      .map((record) => record.work_id);
    const [workId] = submittedWorkIds;
    rmSync(join(dir, 'rb_output_declarations.jsonl'));

    for (const [checkpoint, result] of [['inspect', runInspect(dir)], ['gate', runGate(dir)]]) {
      assert.equal(result.status, 1, result.stderr || result.stdout);
      const output = JSON.parse(result.stdout);
      assert.equal(output.check.failed_rule_ids.includes('wave0_work_unit_submission_presence'), true);
      const hint = output.hints.find((entry) => entry.rule_id === 'wave0_work_unit_submission_presence');
      assert.ok(hint);
      assert.equal(hint.repair_kind, 'engine_operation');
      assert.match(hint.missing_fact, new RegExp(workId));
      assert.match(hint.missing_fact, /index\/status retain the recorded hash/i);
      assert.match(hint.write_to, /recover-declaration/);
      assert.match(hint.write_to, new RegExp(workId));
      assert.match(hint.write_to, /operate-work-unit\.mjs/);
      for (const dependent of [
        'cache_coverage',
        'wave0_work_unit_ledger_exists',
        'wave0_work_unit_output_coverage',
        'wave0_delegated_bypass_suspected',
      ]) {
        assert.equal(output.check.failed_rule_ids.includes(dependent), false);
        if (checkpoint === 'gate') {
          assert.equal(output.check.masked_rule_ids.includes(dependent), true, JSON.stringify(output.check));
        }
      }
    }

    const traceEvents = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
    assert.equal(traceEvents.filter((event) => event.event === 'delegated_bypass_suspected').length, 0);

    for (const submittedWorkId of submittedWorkIds) {
      const recovery = runDeclarationRecovery(dir, submittedWorkId);
      assert.equal(recovery.status, 0, recovery.stderr || recovery.stdout);
      const recovered = JSON.parse(recovery.stdout);
      assert.equal(recovered.ok, true);
      assert.equal(recovered.changed, true);
      assert.equal(recovered.work_id, submittedWorkId);
    }
    const recoveredGate = runGate(dir);
    assert.equal(recoveredGate.status, 0, recoveredGate.stderr || recoveredGate.stdout);
    assert.equal(JSON.parse(recoveredGate.stdout).check.passed, true);
  });

  it('2. fails when reference/_INDEX.md is missing', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    rmSync(join(dir, 'reference/_INDEX.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('reference/_INDEX.md')), `Expected missing index fail: ${JSON.stringify(output.inspect)}`);
    const inspectOutput = JSON.parse(runInspect(dir).stdout);
    assert.deepEqual(
      inspectOutput.check.failed_rule_ids.filter((id) => output.check.failed_rule_ids.includes(id)).sort(),
      output.check.failed_rule_ids.filter((id) => id !== 'trace_event_wave0_completion').sort(),
    );
    const gateHint = output.hints.find((hint) => hint.rule_id === 'reference_index_md_exists');
    const inspectHint = inspectOutput.hints.find((hint) => hint.rule_id === 'reference_index_md_exists');
    assert.deepEqual(
      { ...inspectHint, rerun: null },
      { ...gateHint, rerun: null },
    );
    assert.match(gateHint.rerun, /check-gate-wave0-complete\.mjs/);
    assert.match(inspectHint.rerun, /inspect-wave0-output\.mjs/);
  });

  it('3. fails when per-topic source.yaml is missing', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    rmSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('topic-a')), `Expected missing topic-a fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails on schema violation (empty url)', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), SCHEMA_INVALID_REF);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Schema') || m.includes('schema') || m.includes('url')), `Expected schema fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails when count_floor is below threshold (empty YAML array)', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), '[]');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Count floor') || m.includes('count')), `Expected count floor fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5b. marks downstream count diagnostics as masked when upstream YAML parse fails', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), ': definitely-not-yaml\n');
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.check.failed_rule_ids.includes('per_topic_reference_schema_valid'));
    assert.equal(output.check.failed_rule_ids.includes('per_topic_count_floor'), false);
    assert.ok(output.check.masked_rule_ids.includes('per_topic_count_floor:topic-a'));
    assert.equal(output.inspect.some((line) => line.includes('Count floor not met for artifacts/wave0/topic-a/source.yaml')), false);
  });

  it('6. fails when count_floor passes but schema_valid fails (AND interaction)', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    // Mix: one valid entry + one invalid entry (empty url) = count_floor passes (2 entries) but schema_valid fails
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), `- url: "https://fixture.news-research.com/ok"
  title: "OK"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
- url: ""
  title: "Bad"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
`);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, `Expected fail (count_floor pass but schema_valid fail): ${JSON.stringify(output.inspect)}`);
    const hasCountFloorPass = output.inspect.every(m => !m.includes('Count floor') && !m.includes('count_floor'));
    const hasSchemaFail = output.inspect.some(m => m.includes('Schema') || m.includes('schema') || m.includes('url'));
    assert.ok(hasSchemaFail, `Expected schema_valid fail in AND scenario: ${JSON.stringify(output.inspect)}`);
  });

  it('6b. diagnoses source.yaml object wrappers through the shared top-level root', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), `wave: 0
topic: topic-a
sources:
  - url: "https://fixture.news-research.com/wrapped"
    title: "Wrapped"
    retrieved_date: "2026-06-15"
    topic_tag: "topic-a"
`);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    const joined = output.inspect.join('\n');
    assert.match(joined, /source_metadata_top_level_array_missing/);
    assert.match(joined, /top-level YAML value is object/);
  });

  it('6c. names the earliest missing source.yaml field coordinate', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), `- url: "https://fixture.news-research.com/no-fields"
  title: "Missing fields"
`);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    const joined = output.inspect.join('\n');
    assert.match(joined, /source_metadata_schema_invalid/);
    assert.match(joined, /0\.retrieved_date/);
  });

  it('6d. fails delegated coverage when submitted result.json drifts after ledger append', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    const index = JSON.parse(readFileSync(join(dir, '_work_units/_index.json'), 'utf-8'));
    const record = Object.values(index.work_units).find((entry) => entry.status === 'submitted');
    assert.ok(record, 'expected setupHappyPath to submit one work unit');
    const resultPath = join(dir, record.paths.result_ref);
    const resultJson = JSON.parse(readFileSync(resultPath, 'utf-8'));
    resultJson.summary = 'mutated after submit';
    writeFileSync(resultPath, `${JSON.stringify(resultJson, null, 2)}\n`);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    const joinedInspect = output.inspect.join('\n');
    const joinedAdvice = output.advice.join('\n');
    assert.match(joinedInspect, /work-unit binding cross-check failed/);
    assert.match(joinedInspect, new RegExp(record.work_id));
    assert.match(joinedInspect, /submitted result hash mismatch/);
    assert.match(joinedAdvice, /valid work-unit retry|replacement submit|terminal\/retry operation/);
    assert.match(joinedAdvice, /do not hand-edit rb_output_declarations\.jsonl or rb_status\.json/);
    assert.doesNotMatch(joinedAdvice, /edit rb_output_declarations\.jsonl by hand/i);
    assert.doesNotMatch(joinedAdvice, /edit rb_status\.json by hand/i);
  });

  it('7. fails when topic_registry is empty', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    // Empty the registry
    const planPath = join(dir, 'rb_plan.md');
    const content = readFileSync(planPath, 'utf-8');
    const updated = content.replace(/"topic_registry": \[[\s\S]*?\]/, '"topic_registry": []');
    writeFileSync(planPath, updated);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, `Expected fail with empty registry: ${JSON.stringify(output.inspect)}`);
    assert.ok(output.inspect.some(m => m.includes('topic_registry') || m.includes('registry')), `Expected empty registry fail: ${JSON.stringify(output.inspect)}`);
  });

  it('8. fails on status drift (wrong next_gate)', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    const statusPath = join(dir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.next_gate = 'hitl2_complete'; // wrong
    writeFileSync(statusPath, JSON.stringify(status));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('next_gate')), `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });

  it('9. fails when trace event (wave0_completion) is missing from rb_trace.jsonl', () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    writeTraceEvents(dir, witnessedHandoffEvents({
      sourceGate: 'seed-topics-ready',
      phase: 'seed-topics',
      sourceNode: 'phases/phase-seed-topics.md',
      targetNode: 'phases/phase-wave0.md',
    }));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('trace') || m.includes('Trace event') || m.includes('wave0_completion')), `Expected trace event fail: ${JSON.stringify(output.inspect)}`);
  });

  it('8. rejects shared reference files with placeholder source_url (example.com)', () => {
    const dir = restoredBundle();
    mkdirSync(join(dir, 'artifacts/wave0/topic-a'), { recursive: true });
    mkdirSync(join(dir, 'artifacts/wave0/topic-b'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'),
      '- url: "https://arxiv.org/abs/2305.18654"\n  title: "Real reference"\n  retrieved_date: "2026-01-15"\n  topic_tag: "topic-a"\n');
    writeFileSync(join(dir, 'artifacts/wave0/topic-b/source.yaml'),
      '- url: "https://fixture.news-research.com/paper"\n  title: "Another real"\n  retrieved_date: "2026-01-15"\n  topic_tag: "topic-b"\n');
    writeFileSync(join(dir, 'reference/00-shared-placeholder-test.md'),
      '---\nsource_url: "https://example.com"\nacceptance_status: accepted\n' +
      'source_type: supplementary\ntier: tier_3\nevidence_role: supporting\n' +
      'trust_level: medium\nwhy_it_matters: "Count floor fulfillment"\n' +
      'accessed_at: "2026-06-27"\nrelated_topic_uid: all\n---\n' +
      '## Key Facts\n- Generic placeholder\n## Core Content Capture\nNo real content.\n' +
      '## Relevance To This Research\nMinimal.\n## Quotable Terms / Concepts\n- None.\n## Risks And Limitations\n- Placeholder.\n');
    writeTraceEvents(dir, [
      ...witnessedHandoffEvents({
        sourceGate: 'seed-topics-ready',
        phase: 'seed-topics',
        sourceNode: 'phases/phase-seed-topics.md',
        targetNode: 'phases/phase-wave0.md',
      }),
      { event: 'wave0_completion', ts: new Date().toISOString() },
    ]);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false, `Expected placeholder rejection, got pass. Inspect: ${JSON.stringify(output.inspect)}`);
    assert.ok(output.inspect.some(m => m.includes('placeholder') || m.includes('example.com')),
      `Expected inspect to mention placeholder/example.com, got: ${JSON.stringify(output.inspect)}`);
  });
});
describe('RWG-018 Wave0 direct adapter parity', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });
  let sharedBundle;
  let sharedSnapshot;
  before(() => {
    sharedBundle = createBundle('shared-wave0');
    sharedSnapshot = snapshotBundle(sharedBundle, uniqueSnapshotRoot(sharedBundle, 'wave0'));
    track(uniqueSnapshotRoot(sharedBundle, 'wave0'));
  });
  function restoredBundle() {
    restoreBundle(sharedSnapshot, sharedBundle);
    return sharedBundle;
  }

  it('0a. projects the shared Wave0 direct root without duplicating YAML interpretation', async () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    const target = 'artifacts/wave0/topic-a/source.yaml';
    writeFileSync(join(dir, target), 'url: https://fixture.news-research.com/not-an-array\n');

    const direct = await evaluateDirect({
      bundleDir: dir,
      target,
      contractId: 'wave0.source-metadata-array.v1',
    });
    assert.equal(direct.passed, false);
    assert.equal(direct.roots.length, 1);
    const { definition } = tryLoadGateDefinition('wave0-complete', null);
    const wave = evaluateWave0Contract(dir, definition);
    const finding = wave.findings.find((entry) => (
      entry.rule_id === 'per_topic_reference_schema_valid' && entry.surface === target
    ));
    assert.deepEqual(directContext(finding), direct.roots[0]);
    assert.equal(wave.findings.filter((entry) => entry.surface === target && directContext(entry)).length, 1);
  });

  it('0b. keeps Wave0 count and submitted provenance outside the direct contract', async () => {
    const dir = restoredBundle();
    setupHappyPath(dir);
    const target = 'artifacts/wave0/topic-a/source.yaml';
    writeFileSync(join(dir, target), '[]\n');
    const direct = await evaluateDirect({
      bundleDir: dir,
      target,
      contractId: 'wave0.source-metadata-array.v1',
    });
    assert.equal(direct.passed, true);
    assert.equal(JSON.stringify(direct).match(/count|provenance|coverage|ledger/gi), null);

    const { definition } = tryLoadGateDefinition('wave0-complete', null);
    const wave = evaluateWave0Contract(dir, definition);
    assert.ok(wave.failed_rule_ids.includes('per_topic_count_floor'));
    assert.equal(wave.failed_rule_ids.includes('per_topic_reference_schema_valid'), false);
  });

  it('1c. balances materialization guidance across Topics instead of lexicographic exhaustion', () => {
    // Three Topics; topic-a already owns one Phase-owned projection and still
    // has a second retained source. Global lexicographic order would keep
    // guiding topic-a; cross-topic balance must guide topic-b, then topic-z.
    const dir = createBundleWithTopics(unique('balance'), [
      { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A', must_answer: ['A?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] },
      { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174001', id: '02', slug: 'topic-b', title: 'Topic B', must_answer: ['B?'], scope_role: 'supporting', depends_on_topic_uids: [], previous_layouts: [] },
      { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174002', id: '03', slug: 'topic-z', title: 'Topic Z', must_answer: ['Z?'], scope_role: 'supporting', depends_on_topic_uids: [], previous_layouts: [] },
    ]);

    writeFileSync(join(dir, 'reference/_INDEX.md'),
      '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n' +
      '| --- | --- | --- | --- | --- | --- | --- | --- |\n');
    writeFileSync(join(dir, 'reference/README.md'), '# Reference Evidence\nFlat reference directory.\n');
    writeTraceEvents(dir, [
      ...witnessedHandoffEvents({
        sourceGate: 'seed-topics-ready',
        phase: 'seed-topics',
        sourceNode: 'phases/phase-seed-topics.md',
        targetNode: 'phases/phase-wave0.md',
      }),
      { event: 'wave0_completion', ts: new Date().toISOString() },
    ]);

    const topicASubmission = submitCurrentWave0Source(dir, {
      queueItemId: 'topic-a',
      topicUid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      topicSlug: 'topic-a',
      sourceContent: sourceMetadataArray(2).replaceAll('topic_tag: topic-a', 'topic_tag: "topic-a"'),
      cachePath: TOPIC_A_CACHE,
      sourceUrl: TOPIC_A_SOURCE_URL,
    });
    const topicBSubmission = submitCurrentWave0Source(dir, {
      queueItemId: 'topic-b',
      topicUid: 'tp_123e4567-e89b-12d3-a456-426614174001',
      topicSlug: 'topic-b',
      sourceContent: VALID_REF_B,
      cachePath: TOPIC_B_CACHE,
      sourceUrl: TOPIC_B_SOURCE_URL,
      preserveQueue: true,
    });
    const topicZSubmission = submitCurrentWave0Source(dir, {
      queueItemId: 'topic-z',
      topicUid: 'tp_123e4567-e89b-12d3-a456-426614174002',
      topicSlug: 'topic-z',
      sourceContent: VALID_REF_B.replaceAll('topic-b', 'topic-z').replaceAll('article-2', 'article-9'),
      cachePath: '_cache/wave0/primary/topic-z/source-yaml',
      sourceUrl: 'https://fixture.news-research.com/article-9',
      preserveQueue: true,
    });

    // topic-a #1 becomes the one existing Phase-owned projection.
    writeWave0PhaseProjection(dir, topicASubmission);
    materializeWave0Projection(dir, topicASubmission, { topicSlug: 'topic-a', ordinal: 1 });

    // Raise the shared-reference floor above the single existing projection so
    // the convergence must keep guiding materialization.
    writeFileSync(join(dir, 'rb_profile.yaml'), `${readFileSync(join(dir, 'rb_profile.yaml'), 'utf8')}research_style_params:\n  wave0_shared_ref_total: 4\n`);

    const firstHint = submittedMaterializationHint(JSON.parse(runInspect(dir).stdout));
    assert.ok(
      firstHint.missing_fact.includes(`${topicBSubmission.record.work_id}/1`),
      `Expected topic-b balance candidate, got: ${JSON.stringify(firstHint)}`,
    );
    assert.equal(firstHint.missing_fact.includes(topicASubmission.record.work_id), false);

    // After topic-b materializes its first projection, balance moves to topic-z.
    writeWave0PhaseProjection(dir, topicBSubmission, {
      sourceUrl: TOPIC_B_SOURCE_URL,
      cachePath: TOPIC_B_CACHE,
      fileName: '00-shared-topic-b.md',
      ordinal: 1,
      topicSlug: 'topic-b',
    });
    materializeWave0Projection(dir, topicBSubmission, {
      topicSlug: 'topic-b',
      ordinal: 1,
    });
    const secondHint = submittedMaterializationHint(JSON.parse(runInspect(dir).stdout));
    assert.ok(
      secondHint.missing_fact.includes(`${topicZSubmission.record.work_id}/1`),
      `Expected topic-z balance candidate, got: ${JSON.stringify(secondHint)}`,
    );
    assert.equal(secondHint.missing_fact.includes(topicASubmission.record.work_id), false);
  });
});
