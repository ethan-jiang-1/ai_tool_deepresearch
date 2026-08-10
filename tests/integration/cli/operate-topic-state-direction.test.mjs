// @impl CTS-003
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { createTempDir } from '../../helpers/temp-dirs.mjs';
import { applyCanonicalTopicState } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';

const CLI = join(process.cwd(), 'DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs');
const dirs = [];

after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function makeBundle(label) {
  const dir = createTempDir(label);
  dirs.push(dir);
  mkdirSync(join(dir, 'seed_topics'));
  mkdirSync(join(dir, '_work_units'));
  writeFileSync(join(dir, 'rb_plan.md'), '---\nplan_basename: direction-test\nderived_topic_count: 0\ntopic_registry_version: "2"\ntopic_registry: []\n---\n# Plan\n');
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'not_started', current_gate: 'hitl1_recorded', next_gate: 'setup_ready', current_node: 'phases/phase-hitl1.md' }));
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [] }));
  writeFileSync(join(dir, 'rb_trace.jsonl'), '');
  return dir;
}

function run(...args) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', timeout: 15000 });
  assert.ok(result.stdout.trim(), result.stderr);
  return { ...result, output: JSON.parse(result.stdout) };
}

function writeInput(dir, name, input) {
  const path = join(dir, name);
  writeFileSync(path, `${JSON.stringify(input, null, 2)}\n`);
  return path;
}

function initialInput() {
  return { context: 'hitl1', actions: [{ action: 'add_topic', title: 'Topic A', slug_stem: 'topic-a', must_answer: ['What matters?'], scope_role: 'primary', depends_on_topic_uids: [] }] };
}

function authorizeRerun(dir, count = 0) {
  writeFileSync(join(dir, 'rb_profile.yaml'), `human_decision_checkpoints:\n  hitl2:\n    rerun_count: ${count}\n`);
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'in_progress', current_gate: 'hitl2_recorded', next_gate: 'rerun_ready', current_node: 'phases/phase-rerun.md' }));
  writeFileSync(join(dir, 'rb_trace.jsonl'), [
    { event: 'gate_attempt', gate: 'hitl2-recorded', currentNodeRef: 'phases/phase-hitl2.md', passed: true, next: 'phases/phase-rerun.md' },
    { event: 'load_complete', entry: 'phases/phase-rerun.md', handoff_source_gate: 'hitl2-recorded', handoff_source_node: 'phases/phase-hitl2.md', handoff_target_node: 'phases/phase-rerun.md', handoff_source_attempt_index: 0 },
  ].map(JSON.stringify).join('\n') + '\n');
}

function topic(dir) {
  return parseYaml(readFileSync(join(dir, 'rb_plan.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]).topic_registry[0];
}

function direction({ count = 1, action = 'supplement' } = {}) {
  return {
    rerun_count: count,
    action,
    new_search_dimensions: 'cost and operational failure modes',
    adjusted_depth: 'compare operating models',
    search_guardrails: 'retain primary sources',
    rationale_excerpt: 'recorded HITL2 requests the comparison',
  };
}

function updateInput(topicUid, candidate = direction()) {
  return { context: 'rerun', actions: [{ action: 'update_intent', topic_uid: topicUid, title: 'Topic A refined', must_answer: ['What matters now?'], scope_role: 'primary', depends_on_topic_uids: [], direction: candidate }] };
}

function directionSection(bytes) {
  return bytes.slice(bytes.indexOf('## 本轮重跑方向'));
}

describe('operate-topic-state direction candidates', () => {
  it('publishes sanctioned update and direction-only candidates atomically, preserves layout direction bytes, and reports a byte-identical no-op', () => {
    const dir = makeBundle('topic-state-direction-cli');
    assert.equal(run('apply', '--bundle', dir, '--input', writeInput(dir, 'initial.json', initialInput())).status, 0);
    authorizeRerun(dir);
    const current = topic(dir);
    const update = updateInput(current.topic_uid);
    const committed = run('apply', '--bundle', dir, '--input', writeInput(dir, 'update.json', update));
    assert.equal(committed.status, 0, committed.stderr);
    assert.equal(committed.output.verdict, 'committed');
    const seedPath = join(dir, 'seed_topics', current.slug + '.md');
    const directionBytes = directionSection(readFileSync(seedPath, 'utf8'));
    assert.match(directionBytes, /rerun_count: 1/);

    const unchangedPlan = readFileSync(join(dir, 'rb_plan.md'), 'utf8');
    const unchangedSeed = readFileSync(seedPath, 'utf8');
    const noOp = run('apply', '--bundle', dir, '--input', writeInput(dir, 'direction-only.json', { context: 'rerun', actions: [{ action: 'set_rerun_direction', topic_uid: current.topic_uid, direction: direction() }] }));
    assert.equal(noOp.status, 0, noOp.stderr);
    assert.equal(noOp.output.verdict, 'unchanged');
    assert.equal(readFileSync(join(dir, 'rb_plan.md'), 'utf8'), unchangedPlan);
    assert.equal(readFileSync(seedPath, 'utf8'), unchangedSeed);

    const inspected = run('inspect', '--bundle', dir).output;
    const layout = { ...inspected.layout_baseline, topics: [{ ...inspected.layout_baseline.topics[0], title: 'Topic A layout label' }] };
    const layoutResult = run('apply', '--bundle', dir, '--input', writeInput(dir, 'layout.json', layout));
    assert.equal(layoutResult.status, 0, layoutResult.stderr);
    assert.equal(directionSection(readFileSync(seedPath, 'utf8')), directionBytes);
  });

  it('rejects HITL1 direction input, blocks active target work, and exact-recovers prepared candidate bytes through the CLI', () => {
    const dir = makeBundle('topic-state-direction-recovery');
    assert.equal(run('apply', '--bundle', dir, '--input', writeInput(dir, 'initial.json', initialInput())).status, 0);
    authorizeRerun(dir);
    const current = topic(dir);
    const hitl1 = run('apply', '--bundle', dir, '--input', writeInput(dir, 'invalid-hitl1.json', { context: 'hitl1', actions: [{ action: 'set_rerun_direction', topic_uid: current.topic_uid, direction: direction() }] }));
    assert.equal(hitl1.status, 1);

    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [{ queue_item_id: 'queued-topic', status: 'queued', payload: { topic_uid: current.topic_uid, topic_slug: current.slug } }], refill_pool: [] }));
    const blocked = run('apply', '--bundle', dir, '--input', writeInput(dir, 'blocked.json', updateInput(current.topic_uid)));
    assert.equal(blocked.status, 1);
    assert.equal(blocked.output.reason_code, 'active_topic_work');
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [] }));

    const candidate = updateInput(current.topic_uid);
    assert.throws(() => applyCanonicalTopicState({ bundlePath: dir, input: candidate, crashAt: 'after_prepared' }), /simulated crash/);
    const inspection = run('inspect', '--bundle', dir);
    assert.equal(inspection.status, 1);
    const blocker = inspection.output.blockers[0];
    const prepared = JSON.parse(readFileSync(join(dir, '_diagnostics', 'topic-state', blocker.operation_id, 'prepared.json'), 'utf8'));
    const expected = Object.fromEntries(prepared.files.map((file) => [file.relative, readFileSync(join(dir, '_diagnostics', 'topic-state', blocker.operation_id, 'staged', file.staged_name), 'utf8')]));
    const recovered = run('recover', '--bundle', dir, '--operation-id', blocker.operation_id);
    assert.equal(recovered.status, 0, recovered.stderr);
    assert.equal(recovered.output.verdict, 'committed');
    for (const [relative, bytes] of Object.entries(expected)) assert.equal(readFileSync(join(dir, relative), 'utf8'), bytes, relative);
  });
});
