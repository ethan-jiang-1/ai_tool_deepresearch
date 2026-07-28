// Projection packets must cross the public CLI, lifecycle window, and submitted authority together.
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { createTempDir } from '../../helpers/temp-dirs.mjs';
import { applyCanonicalTopicState } from '../../../DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';
import { claimAndSubmitWorkUnit, referenceContent } from '../../engine/work-unit-test-helpers.mjs';

const REPO_ROOT = process.cwd();
const CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/operate-topic-state.mjs');
const INSPECT_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/inspect-wave0-output.mjs');
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

function sourceArray(topicSlug) {
  return [
    '- url: https://example.com/wave0/topic-a/duplicate',
    '  title: Candidate one',
    '  retrieved_date: 2026-07-27',
    `  topic_tag: ${topicSlug}`,
    '- url: https://example.com/wave0/topic-a/duplicate',
    '  title: Candidate two',
    '  retrieved_date: 2026-07-27',
    `  topic_tag: ${topicSlug}`,
    '',
  ].join('\n');
}

function inspectableReferenceContent(topic, refPath) {
  return [
    referenceContent({ related_topic: topic.slug }),
    '',
    '## Projection Navigation',
    '',
    '- evidence_meaning: The submitted Wave0 source remains available for later reader navigation.',
    '  relationship: supports',
    '  refs:',
    `    - ${refPath}`,
    '  status: supported',
    '  next_hop: Read the concrete reference before Wave1 deepening.',
  ].join('\n');
}

function prepareInspectableWave0Reference(bundle, refPath) {
  writeFileSync(join(bundle, 'reference/_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    `| ${refPath.slice('reference/'.length)} | primary | expert | Tier 2 | topic-a | wave0_foundation | accepted | 2026-07-27 |`,
    '',
  ].join('\n'));
  writeFileSync(join(bundle, 'reference/README.md'), '# Reference Evidence\nFlat reference directory.\n');
}

function submitWave0Authority(bundle, topic, { sourceContent = null } = {}) {
  const refPath = 'reference/00-shared-topic-a.md';
  const submission = claimAndSubmitWorkUnit(bundle, {
    phase: 'wave0',
    queueItemId: 'wave0-topic-a',
    queueItemOverrides: {
      payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug, wave: 0 },
      lineage: { topic_uid: topic.topic_uid, topic_slug: topic.slug, phase: 'wave0' },
    },
    outputs: [
      {
        path: refPath,
        role: 'reference',
        source_url: 'https://example.com/wave0/topic-a',
        source_slug: 'wave0-topic-a',
        content: sourceContent
          ? inspectableReferenceContent(topic, refPath)
          : referenceContent({ related_topic: topic.slug }),
      },
      ...(sourceContent ? [{
        path: `artifacts/wave0/${topic.slug}/source.yaml`,
        role: 'source_yaml',
        content: sourceContent,
      }] : []),
    ],
    cacheTrails: [{ path: '_cache/wave0/primary/topic-a/source', url: 'https://example.com/wave0/topic-a' }],
  });
  assert.equal(submission.submitted.ok, true, JSON.stringify(submission.submitted));
  if (sourceContent) prepareInspectableWave0Reference(bundle, refPath);
  return { workId: submission.record.work_id, refPath };
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

describe('operate-topic-state projection packets', () => {
  it('materializes a current submitted Wave0 entry through the public CLI only in its loaded window', () => {
    const { bundle, topic } = makeBundle('operate-projection-legal');
    const authority = submitWave0Authority(bundle, topic);
    authorizeWave0(bundle);

    const result = runApply(bundle, packet(topic, authority));
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.output.verdict, 'committed');
    assert.equal(result.output.action, 'apply_seed_projection');
    assert.deepEqual(result.output.slots, ['wave0_evidence']);

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
});
