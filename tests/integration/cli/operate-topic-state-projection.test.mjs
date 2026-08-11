// Projection packets must cross the public CLI, lifecycle window, and submitted authority together.
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { createTempDir } from '../../helpers/temp-dirs.mjs';
import { applyCanonicalTopicState } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { claimAndSubmitWorkUnit, referenceContent } from '../../engine/work-unit-test-helpers.mjs';
import { instantiateBundle } from '../../e2e/helpers/deterministic-chain-harness.mjs';
import {
  PRIMARY_TOPIC,
  passAndEnter,
  stageWave0,
  stageWave1,
  stageWave2,
  writePlanAndProfile,
} from '../../e2e/helpers/research-chain-fixture.mjs';

const REPO_ROOT = process.cwd();
const CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs');
const INSPECT_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs');
const dirs = [];

after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function readPlan(bundle) {
  const frontmatter = readFileSync(join(bundle, 'rb_plan.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/);
  return parseYaml(frontmatter[1]);
}

function makeBundle(label) {
  const bundle = createTempDir(label);
  dirs.push(bundle);
  mkdirSync(join(bundle, 'seed_topics'));
  mkdirSync(join(bundle, '_work_units'));
  writeFileSync(join(bundle, 'rb_plan.md'), '---\nplan_basename: projection-cli-test\nderived_topic_count: 0\ntopic_registry_version: "2"\ntopic_registry: []\n---\n# Plan\n');
  writeFileSync(join(bundle, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: 0\n');
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    current_mode: 'execution', state: 'in_progress', current_gate: 'hitl1_recorded', next_gate: 'setup_ready', current_node: 'phases/phase-hitl1.md',
  }));
  writeFileSync(join(bundle, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [], delegated_in_flight: {} }));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), '');

  const initial = applyCanonicalTopicState({
    bundlePath: bundle,
    input: {
      context: 'hitl1',
      actions: [{
        action: 'add_topic', title: 'Topic A', slug_stem: 'topic-a', must_answer: ['What changed?'], scope_role: 'primary', depends_on_topic_uids: [],
      }],
    },
  });
  assert.equal(initial.verdict, 'committed');
  return { bundle, topic: readPlan(bundle).topic_registry[0] };
}

function sourceArrayOfCount(topicSlug, count) {
  return Array.from({ length: count }, (_, index) => [
    `- url: https://example.com/wave0/topic-a/source-${index + 1}`,
    `  title: Candidate ${index + 1}`,
    '  retrieved_date: 2026-07-27',
    `  topic_tag: ${topicSlug}`,
  ].join('\n')).join('\n') + '\n';
}

function sourceArray(topicSlug) {
  return sourceArrayOfCount(topicSlug, 2);
}

function sourceUrlFromContent(sourceContent) {
  const match = sourceContent.match(/^- url:\s*["']?([^"'\n]+)["']?\s*$/m);
  assert.ok(match, 'Wave0 fixture source YAML needs one URL');
  return match[1];
}

function inspectableReferenceContent(topic, refPath, submission, sourceUrl) {
  return [
    referenceContent({
      related_topic: topic.slug,
      source_url: sourceUrl,
      evidence_role: 'foundation',
    }),
    '',
    '## Projection Navigation',
    '',
    '- evidence_meaning: The submitted Wave0 source remains available for later reader navigation.',
    '  relationship: supports',
    '  refs:',
    `    - ${refPath}`,
    '  status: supported',
    '  next_hop: Read the concrete reference before Wave1 deepening.',
    '',
    '## Submitted Backing',
    `- source_identity: ${submission.record.work_id}/1`,
    `- source_yaml_ref: artifacts/wave0/${topic.slug}/source.yaml`,
    '- cache_trail_ref: _cache/wave0/primary/topic-a/source',
    `- result_ref: ${submission.record.paths.result_ref}`,
    `- work_unit_ref: ${submission.record.paths.work_unit_dir}`,
  ].join('\n');
}

function prepareInspectableWave0Reference(bundle, refPath) {
  mkdirSync(join(bundle, 'reference'), { recursive: true });
  writeFileSync(join(bundle, 'reference/_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    `| ${refPath.slice('reference/'.length)} | primary | expert | Tier 2 | topic-a | wave0_foundation | accepted | 2026-07-27 |`,
    '',
  ].join('\n'));
  writeFileSync(join(bundle, 'reference/README.md'), '# Reference Evidence\nFlat reference directory.\n');
}

function submitWave0Authority(bundle, topic, {
  sourceContent = sourceArray(topic.slug),
  queueItemId = 'wave0-topic-a',
  preserveQueue = false,
} = {}) {
  const refPath = 'reference/00-shared-topic-a.md';
  const submission = claimAndSubmitWorkUnit(bundle, {
    phase: 'wave0',
    queueItemId,
    preserveQueue,
    queueItemOverrides: {
      payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug, wave: 0 },
      lineage: { topic_uid: topic.topic_uid, topic_slug: topic.slug, phase: 'wave0' },
    },
    outputs: [{
      path: `artifacts/wave0/${topic.slug}/source.yaml`,
      role: 'source_yaml',
      content: sourceContent,
    }],
    cacheTrails: [{ path: '_cache/wave0/primary/topic-a/source', url: 'https://example.com/wave0/topic-a' }],
  });
  assert.equal(submission.submitted.ok, true, JSON.stringify(submission.submitted));
  if (!existsSync(join(bundle, refPath))) {
    prepareInspectableWave0Reference(bundle, refPath);
    writeFileSync(join(bundle, refPath), inspectableReferenceContent(
      topic,
      refPath,
      submission,
      sourceUrlFromContent(sourceContent),
    ));
  }
  return { workId: submission.record.work_id, refPath };
}

function appendSourceCandidate(topicSlug) {
  return [
    '- url: https://example.com/wave0/topic-a/third',
    '  title: Candidate three',
    '  retrieved_date: 2026-07-27',
    `  topic_tag: ${topicSlug}`,
    '',
  ].join('\n');
}

function authorizeWave0(bundle) {
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    current_mode: 'execution', state: 'in_progress', current_gate: 'seed_topics_ready', next_gate: 'wave0_complete', current_node: 'phases/phase-wave0.md',
  }));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({
    ts: '2026-07-27T00:00:00.000Z', event: 'gate_attempt', gate: 'seed-topics-ready', phase: 'seed-topics', passed: true,
    currentNodeRef: 'phases/phase-seed-topics.md', next: 'phases/phase-wave0.md',
  })}\n${JSON.stringify({
    ts: '2026-07-27T00:00:01.000Z', event: 'load_complete', entry: 'phases/phase-wave0.md', handoff_source_gate: 'seed-topics-ready',
    handoff_source_node: 'phases/phase-seed-topics.md', handoff_target_node: 'phases/phase-wave0.md', handoff_source_attempt_index: 0,
  })}\n`);
}

function packetEntry(authority, ordinal, { deferred = false } = {}) {
  return {
    source_identity: { kind: 'submitted_work', work_id: authority.workId },
    entry_id: `${authority.workId}/${ordinal}`,
    evidence_meaning: deferred
      ? 'The current source candidate has no materializable consumer reference.'
      : 'The submitted source establishes the Wave0 navigation route.',
    relationship: deferred ? 'defers' : 'supports',
    refs: deferred ? ['none'] : [authority.refPath],
    status: deferred ? 'deferred' : 'supported',
    next_hop: deferred
      ? 'limitation: no materializable consumer reference is available.'
      : 'Read the concrete reference before Wave1 deepening.',
  };
}

function packet(topic, authority, { entries = [packetEntry(authority, 1)], ...extra } = {}) {
  return {
    context: 'wave_projection',
    action: 'apply_seed_projection',
    topic_uid: topic.topic_uid,
    wave: 'wave0',
    updates: [{
      slot_id: 'wave0_evidence',
      entries,
    }],
    ...extra,
  };
}

function deferredContributionPacket(topic, authority, overrides = {}) {
  return {
    context: 'wave_projection',
    action: 'apply_seed_projection',
    topic_uid: topic.topic_uid,
    wave: 'wave0',
    updates: [{
      slot_id: 'wave0_evidence',
      deferred_contribution: {
        source_identity: { kind: 'submitted_work', work_id: authority.workId },
        evidence_meaning: 'The submitted contribution has no materializable consumer reference for this source interval.',
        next_hop: 'limitation: no materializable consumer reference is available.',
        ...overrides,
      },
    }],
  };
}

function runApply(bundle, input) {
  const inputPath = join(bundle, 'wave-projection-packet.json');
  writeFileSync(inputPath, `${JSON.stringify(input, null, 2)}\n`);
  const result = spawnSync('node', [CLI, 'apply', '--bundle', bundle, '--input', inputPath], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 10000,
  });
  return { ...result, output: JSON.parse(result.stdout) };
}

function runSchema() {
  const result = spawnSync('node', [CLI, 'schema', '--context', 'wave_projection'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
  return { ...result, output: JSON.parse(result.stdout) };
}

function runInspect(bundle) {
  const result = spawnSync('node', [INSPECT_CLI, '--bundle', bundle], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 10000,
  });
  return { ...result, output: JSON.parse(result.stdout) };
}

function preparedWorkspaceCount(bundle) {
  const root = join(bundle, '_diagnostics', 'topic-state');
  if (!existsSync(root)) return 0;
  return readdirSync(root).filter((name) => existsSync(join(root, name, 'prepared.json'))).length;
}

function treeSnapshot(root) {
  if (!existsSync(root)) return null;
  return readdirSync(root, { recursive: true }).sort().map((relativePath) => {
    const target = join(root, relativePath);
    return lstatSync(target).isFile()
      ? [relativePath, readFileSync(target, 'utf8')]
      : [relativePath, 'directory'];
  });
}

function topicStateMutationSnapshot(bundle, topic) {
  return {
    plan: readFileSync(join(bundle, 'rb_plan.md'), 'utf8'),
    seed: readFileSync(join(bundle, 'seed_topics', `${topic.slug}.md`), 'utf8'),
    status: readFileSync(join(bundle, 'rb_status.json'), 'utf8'),
    queue: readFileSync(join(bundle, 'rb_queue.json'), 'utf8'),
    trace: readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8'),
    work_units: treeSnapshot(join(bundle, '_work_units')),
  };
}

describe('operate-topic-state projection packets', () => {
  it('submits the public Wave2 conditional template without a hidden source-identity rejection', () => {
    const root = createTempDir('operate-projection-wave2-schema');
    dirs.push(root);
    const bundle = instantiateBundle(root, 'wave2-schema');
    writePlanAndProfile(bundle);
    passAndEnter(bundle, 'instantiation-complete', 'phases/phase-instantiation.md', 'hitl1_recorded');
    passAndEnter(bundle, 'hitl1-recorded', 'phases/phase-hitl1.md', 'setup_ready');
    passAndEnter(bundle, 'setup-ready', 'phases/phase-setup.md', 'setup_ready');
    passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready', () => stageWave0(bundle));
    passAndEnter(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'wave0_complete', () => stageWave1(bundle));
    passAndEnter(bundle, 'wave1-complete', 'phases/phase-wave1.md', 'wave1_complete', () => stageWave2(bundle, { project: false, completion: false }));

    const schema = runSchema();
    assert.equal(schema.status, 0, schema.stderr || schema.stdout);
    const form = schema.output.forms.find((candidate) => candidate.action === 'apply_seed_projection');
    const wave2 = form?.conditional_forms?.find((candidate) => candidate.condition.wave === 'wave2');
    assert.ok(wave2, JSON.stringify(schema.output));

    const input = structuredClone(wave2.template);
    input.topic_uid = PRIMARY_TOPIC.topic_uid;
    input.updates[0].entries[0].refs = ['reference/topic-a-r1-deepening.md'];
    const result = runApply(bundle, input);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.notEqual(result.output.reason_code, 'input_invalid');
    assert.equal(result.output.verdict, 'committed');
  });

  it('materializes a current submitted Wave0 entry through the public CLI only in its loaded window', () => {
    const { bundle, topic } = makeBundle('operate-projection-legal');
    const authority = submitWave0Authority(bundle, topic);
    authorizeWave0(bundle);

    const result = runApply(bundle, packet(topic, authority));
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.output.verdict, 'committed');
    assert.equal(result.output.action, 'apply_seed_projection');
    assert.deepEqual(result.output.slots, ['wave0_evidence']);
    assert.equal(result.output.style_projection, undefined);

    const seed = readFileSync(join(bundle, 'seed_topics', `${topic.slug}.md`), 'utf8');
    assert.match(seed, /回填卡（只读操作约束，不是 Projection Entry）/);
    assert.match(seed, new RegExp(`entry_id\\*\\*: ${authority.workId}/1`));
    assert.doesNotMatch(seed, /__BACKFILL_WAVE0_EVIDENCE__/);
  });

  it('rejects the same authority packet before workspace creation outside the Wave0 route window', () => {
    const { bundle, topic } = makeBundle('operate-projection-window');
    const authority = submitWave0Authority(bundle, topic);
    const result = runApply(bundle, packet(topic, authority));

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.equal(result.output.verdict, 'blocked');
    assert.equal(result.output.reason_code, 'wave_projection_not_authorized');
    assert.equal(preparedWorkspaceCount(bundle), 0);
  });

  it('rejects raw Markdown control input before it reaches the writer', () => {
    const { bundle, topic } = makeBundle('operate-projection-strict');
    const authority = submitWave0Authority(bundle, topic);
    authorizeWave0(bundle);
    const result = runApply(bundle, packet(topic, authority, { path: `seed_topics/${topic.slug}.md` }));

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.equal(result.output.verdict, 'blocked');
    assert.equal(result.output.reason_code, 'input_invalid');
    assert.equal(preparedWorkspaceCount(bundle), 0);
  });

  it('returns exact retained-input feedback for a rejected source identity before topic-state mutation', () => {
    const { bundle, topic } = makeBundle('operate-projection-source-identity-feedback');
    const authority = submitWave0Authority(bundle, topic);
    authorizeWave0(bundle);
    const before = topicStateMutationSnapshot(bundle, topic);
    const invalid = packet(topic, authority);
    invalid.updates[0].entries[0].source_identity = {
      kind: 'work_unit',
      retained_secret: 'do-not-echo-this-retained-source-value',
    };

    const rejected = runApply(bundle, invalid);
    assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
    assert.equal(rejected.output.verdict, 'blocked');
    assert.equal(rejected.output.reason_code, 'input_invalid');
    assert.equal(rejected.output.repair_kind, 'agent_action');
    assert.equal(rejected.output.repair_surface, 'retained_input');
    assert.equal(rejected.output.rerun, 'node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle <bundle-path> --input <input-path>');
    const feedback = rejected.output.validation_errors.find((item) => item.path === 'updates[0].entries[0].source_identity.kind');
    assert.deepEqual(feedback && {
      path: feedback.path,
      json_pointer: feedback.json_pointer,
      code: feedback.code,
      allowed_values: feedback.allowed_values,
      schema_allowed_values: feedback.schema_allowed_values,
    }, {
      path: 'updates[0].entries[0].source_identity.kind',
      json_pointer: '/updates/0/entries/0/source_identity/kind',
      code: 'invalid_union_discriminator',
      allowed_values: ['submitted_work'],
      schema_allowed_values: ['submitted_work', 'finding'],
    });
    assert.doesNotMatch(JSON.stringify(rejected.output), /work_unit|do-not-echo-this-retained-source-value/);
    assert.equal(preparedWorkspaceCount(bundle), 0);
    assert.deepEqual(topicStateMutationSnapshot(bundle, topic), before);

    const accepted = runApply(bundle, packet(topic, authority));
    assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
    assert.equal(accepted.output.verdict, 'committed');
  });

  it('repairs each current source-array candidate through packet apply and the same Wave0 inspect', () => {
    const { bundle, topic } = makeBundle('operate-projection-candidates');
    const authority = submitWave0Authority(bundle, topic, { sourceContent: sourceArray(topic.slug) });
    authorizeWave0(bundle);

    const first = runApply(bundle, packet(topic, authority));
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const incomplete = runInspect(bundle);
    assert.equal(incomplete.status, 1);
    assert.match(incomplete.output.inspect.join('\n'), new RegExp(`return_map_current_candidate_omission.*${authority.workId}/2`));
    assert.doesNotMatch(incomplete.output.inspect.join('\n'), new RegExp(`return_map_current_candidate_omission.*${authority.workId}/1`));

    const repaired = runApply(bundle, packet(topic, authority, {
      entries: [packetEntry(authority, 2, { deferred: true })],
    }));
    assert.equal(repaired.status, 0, repaired.stderr || repaired.stdout);
    const converged = runInspect(bundle);
    assert.doesNotMatch(converged.output.inspect.join('\n'), /return_map_current_candidate_omission/);
    assert.equal(converged.output.check.return_map_classification, 'diagnostic-only', JSON.stringify(converged.output, null, 2));
  });

  it('expands one deferred contribution into exact entries and replays it idempotently', () => {
    const { bundle, topic } = makeBundle('operate-projection-batch-deferred');
    const authority = submitWave0Authority(bundle, topic);
    authorizeWave0(bundle);

    const first = runApply(bundle, deferredContributionPacket(topic, authority));
    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.equal(first.output.verdict, 'committed');
    assert.deepEqual(first.output.deferred_contribution, {
      work_id: authority.workId,
      entry_ids: [`${authority.workId}/1`, `${authority.workId}/2`],
      newly_materialized_entry_ids: [`${authority.workId}/1`, `${authority.workId}/2`],
    });
    const seedPath = join(bundle, 'seed_topics', `${topic.slug}.md`);
    const firstSeed = readFileSync(seedPath, 'utf8');
    for (const ordinal of [1, 2]) {
      assert.equal((firstSeed.match(new RegExp(`entry_id\\*\\*: ${authority.workId}/${ordinal}`, 'g')) || []).length, 1);
    }
    assert.match(firstSeed, /relationship\*\*: defers/);
    assert.match(firstSeed, /status\*\*: deferred/);
    assert.match(firstSeed, /refs\*\*:\n\s+- none/);

    const replay = runApply(bundle, deferredContributionPacket(topic, authority));
    assert.equal(replay.status, 0, replay.stderr || replay.stdout);
    assert.equal(replay.output.verdict, 'unchanged');
    assert.deepEqual(replay.output.deferred_contribution.newly_materialized_entry_ids, []);
    assert.equal(readFileSync(seedPath, 'utf8'), firstSeed);

    const inspected = runInspect(bundle);
    assert.equal(inspected.status, 0, inspected.stderr || inspected.stdout);
  });

  it('rejects caller-selected deferred contribution ordinals and dispositions before workspace creation', () => {
    const { bundle, topic } = makeBundle('operate-projection-batch-deferred-strict');
    const authority = submitWave0Authority(bundle, topic);
    authorizeWave0(bundle);

    for (const [field, value] of [
      ['ordinal', 1],
      ['relationship', 'supports'],
      ['status', 'supported'],
      ['refs', [authority.refPath]],
    ]) {
      const result = runApply(bundle, deferredContributionPacket(topic, authority, { [field]: value }));
      assert.equal(result.status, 1, `${field}: ${result.stderr || result.stdout}`);
      assert.equal(result.output.verdict, 'blocked');
      assert.equal(result.output.reason_code, 'input_invalid');
      assert.equal(preparedWorkspaceCount(bundle), 0);
    }
  });

  it('rejects an unsubmitted deferred contribution selector before workspace creation', () => {
    const { bundle, topic } = makeBundle('operate-projection-batch-deferred-unsubmitted');
    const claimed = claimAndSubmitWorkUnit(bundle, {
      phase: 'wave0',
      queueItemId: 'wave0-topic-a-unsubmitted',
      queueItemOverrides: {
        payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug, wave: 0 },
        lineage: { topic_uid: topic.topic_uid, topic_slug: topic.slug, phase: 'wave0' },
      },
      outputs: [{
        path: `artifacts/wave0/${topic.slug}/source.yaml`,
        role: 'source_yaml',
        content: sourceArray(topic.slug),
      }],
      cacheTrails: [{ path: '_cache/wave0/primary/topic-a/unsubmitted', url: 'https://example.com/wave0/topic-a' }],
      submit: false,
    });
    authorizeWave0(bundle);

    const rejected = runApply(bundle, deferredContributionPacket(topic, { workId: claimed.record.work_id }));
    assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
    assert.equal(rejected.output.verdict, 'blocked');
    assert.equal(rejected.output.reason_code, 'projection_deferred_contribution_not_current');
    assert.equal(preparedWorkspaceCount(bundle), 0);
  });

  it('rejects a deferred contribution that would overwrite a materialized identity', () => {
    const { bundle, topic } = makeBundle('operate-projection-batch-deferred-collision');
    const authority = submitWave0Authority(bundle, topic);
    authorizeWave0(bundle);
    const explicit = runApply(bundle, packet(topic, authority));
    assert.equal(explicit.status, 0, explicit.stderr || explicit.stdout);
    const seedPath = join(bundle, 'seed_topics', `${topic.slug}.md`);
    const before = readFileSync(seedPath, 'utf8');

    const rejected = runApply(bundle, deferredContributionPacket(topic, authority));
    assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
    assert.equal(rejected.output.reason_code, 'projection_deferred_contribution_collision');
    assert.equal(preparedWorkspaceCount(bundle), 0);
    assert.equal(readFileSync(seedPath, 'utf8'), before);
  });

  it('limits one deferred contribution to its own 1..19 interval and leaves later /20 separate', () => {
    const { bundle, topic } = makeBundle('operate-projection-batch-deferred-interval');
    const initialContent = sourceArrayOfCount(topic.slug, 19);
    const initial = submitWave0Authority(bundle, topic, {
      queueItemId: 'wave0-topic-a-initial',
      sourceContent: initialContent,
    });
    const later = submitWave0Authority(bundle, topic, {
      queueItemId: 'wave0-topic-a-later',
      preserveQueue: true,
      sourceContent: sourceArrayOfCount(topic.slug, 20),
    });
    authorizeWave0(bundle);

    const first = runApply(bundle, deferredContributionPacket(topic, initial));
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const seedPath = join(bundle, 'seed_topics', `${topic.slug}.md`);
    const afterFirst = readFileSync(seedPath, 'utf8');
    for (const ordinal of [1, 19]) {
      assert.match(afterFirst, new RegExp(`entry_id\\*\\*: ${initial.workId}/${ordinal}`));
    }
    assert.doesNotMatch(afterFirst, new RegExp(`entry_id\\*\\*: ${later.workId}/20`));
    assert.doesNotMatch(afterFirst, new RegExp(`entry_id\\*\\*: ${initial.workId}/20`));

    const second = runApply(bundle, deferredContributionPacket(topic, later));
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const afterSecond = readFileSync(seedPath, 'utf8');
    assert.match(afterSecond, new RegExp(`entry_id\\*\\*: ${later.workId}/20`));
    assert.doesNotMatch(afterSecond, new RegExp(`entry_id\\*\\*: ${later.workId}/1`));
    const inspected = runInspect(bundle);
    assert.equal(inspected.status, 0, inspected.stderr || inspected.stdout);
  });

  it('admits only the exact contribution-owned Wave0 ordinal used by inspect', () => {
    const { bundle, topic } = makeBundle('operate-projection-contribution-coordinate');
    const initialContent = sourceArray(topic.slug);
    const initial = submitWave0Authority(bundle, topic, {
      queueItemId: 'wave0-topic-a-initial',
      sourceContent: initialContent,
    });
    const supplement = submitWave0Authority(bundle, topic, {
      queueItemId: 'wave0-topic-a-supplement',
      sourceContent: `${initialContent}\n${appendSourceCandidate(topic.slug)}`,
      preserveQueue: true,
    });
    authorizeWave0(bundle);

    const invalid = runApply(bundle, packet(topic, initial, {
      entries: [packetEntry(initial, 3, { deferred: true })],
    }));
    assert.equal(invalid.status, 1, invalid.stderr || invalid.stdout);
    assert.equal(invalid.output.reason_code, 'projection_source_identity_not_current');
    assert.equal(preparedWorkspaceCount(bundle), 0);

    const initialEntries = runApply(bundle, packet(topic, initial, {
      entries: [packetEntry(initial, 1), packetEntry(initial, 2, { deferred: true })],
    }));
    assert.equal(initialEntries.status, 0, initialEntries.stderr || initialEntries.stdout);
    const supplementEntry = runApply(bundle, packet(topic, supplement, {
      entries: [packetEntry(supplement, 3, { deferred: true })],
    }));
    assert.equal(supplementEntry.status, 0, supplementEntry.stderr || supplementEntry.stdout);

    const inspected = runInspect(bundle);
    assert.equal(inspected.status, 0, inspected.stderr || inspected.stdout);
    assert.equal(inspected.output.check.return_map_classification, 'diagnostic-only', JSON.stringify(inspected.output, null, 2));
  });

  it('keeps adjacent entries separately parseable when replaying an existing packet entry', () => {
    const { bundle, topic } = makeBundle('operate-projection-replay-boundary');
    const authority = submitWave0Authority(bundle, topic, { sourceContent: sourceArray(topic.slug) });
    authorizeWave0(bundle);

    const initial = runApply(bundle, packet(topic, authority, {
      entries: [packetEntry(authority, 1), packetEntry(authority, 2, { deferred: true })],
    }));
    assert.equal(initial.status, 0, initial.stderr || initial.stdout);

    const replay = runApply(bundle, packet(topic, authority, {
      entries: [packetEntry(authority, 1)],
    }));
    assert.equal(replay.status, 0, replay.stderr || replay.stdout);

    const seed = readFileSync(join(bundle, 'seed_topics', `${topic.slug}.md`), 'utf8');
    assert.match(seed, new RegExp(
      `\\*\\*next_hop\\*\\*: Read the concrete reference before Wave1 deepening\\.\\n\\n- \\*\\*entry_id\\*\\*: ${authority.workId}/2`,
    ));
    const inspected = runInspect(bundle);
    assert.doesNotMatch(inspected.output.inspect.join('\n'), /return_map_missing_fields/);
  });

  it('rejects a malformed preserved selected-slot neighbor before workspace publication', () => {
    const { bundle, topic } = makeBundle('operate-projection-malformed-neighbor');
    const authority = submitWave0Authority(bundle, topic, { sourceContent: sourceArray(topic.slug) });
    authorizeWave0(bundle);
    const first = runApply(bundle, packet(topic, authority));
    assert.equal(first.status, 0, first.stderr || first.stdout);

    const seedPath = join(bundle, 'seed_topics', `${topic.slug}.md`);
    const corrupted = readFileSync(seedPath, 'utf8').replace(
      '## Wave1：本主题的机制理解',
      [
        '- **entry_id**: malformed-neighbor/1',
        '  - **evidence_meaning**: Preserved neighbor is incomplete.',
        '  - **relationship**: supports',
        '  - **refs**:',
        `    - ${authority.refPath}`,
        '  - **status**: supported',
        '',
        '## Wave1：本主题的机制理解',
      ].join('\n'),
    );
    writeFileSync(seedPath, corrupted);

    const replay = runApply(bundle, packet(topic, authority));
    assert.equal(replay.status, 1, replay.stderr || replay.stdout);
    assert.equal(replay.output.reason_code, 'writer_postcondition_failed');
    assert.equal(preparedWorkspaceCount(bundle), 0);
    assert.equal(readFileSync(seedPath, 'utf8'), corrupted);
  });

  it('reports an exact near-match reference before publishing a packet', () => {
    const { bundle, topic } = makeBundle('operate-projection-near-match');
    const authority = submitWave0Authority(bundle, topic);
    authorizeWave0(bundle);

    const missingRef = 'reference/00-shared-topic-a-01.md';
    const nearMatch = 'reference/00-shared-topic-a-1.md';
    writeFileSync(join(bundle, nearMatch), referenceContent({ related_topic: topic.slug }));
    const result = runApply(bundle, packet(topic, authority, {
      entries: [{ ...packetEntry(authority, 1), refs: [missingRef] }],
    }));

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.equal(result.output.verdict, 'blocked');
    assert.equal(result.output.reason_code, 'projection_entry_ref_missing');
    assert.deepEqual(result.output.near_matches, [nearMatch]);
    assert.match(result.output.recommended_action, /reference/i);
    assert.equal(preparedWorkspaceCount(bundle), 0);
  });
});
