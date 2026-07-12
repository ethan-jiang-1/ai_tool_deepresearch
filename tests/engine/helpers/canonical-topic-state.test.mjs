import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir } from '../../helpers/temp-dirs.mjs';
import { applyCanonicalTopicState, inspectCanonicalTopicState, recoverCanonicalTopicState } from '../../../DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';
import { diffSnapshots, snapshotTree } from '../../helpers/authority-snapshot.mjs';

const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));
function bundle(label = 'topic-state') {
  const dir = createTempDir(label); dirs.push(dir); mkdirSync(join(dir, 'seed_topics')); mkdirSync(join(dir, '_work_units'));
  writeFileSync(join(dir, 'rb_plan.md'), '---\nplan_basename: test\nderived_topic_count: 0\ntopic_registry_version: "2"\ntopic_registry: []\n---\n# Plan\n');
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'not_started', current_gate: 'hitl1_recorded', next_gate: 'setup_ready', current_node: 'phases/phase-hitl1.md' }));
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [] })); writeFileSync(join(dir, 'rb_trace.jsonl'), '');
  return dir;
}
function rerunBundle(label = 'topic-rerun', legacy = false) {
  const dir = bundle(label);
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'in_progress', current_gate: 'hitl2_recorded', next_gate: 'rerun_ready', current_node: 'phases/phase-rerun.md' }));
  writeFileSync(join(dir, 'rb_trace.jsonl'), [
    { event: 'gate_attempt', gate: 'hitl2-recorded', currentNodeRef: 'phases/phase-hitl2.md', passed: true, next: 'phases/phase-rerun.md' },
    { event: 'load_complete', entry: 'phases/phase-rerun.md', handoff_source_gate: 'hitl2-recorded', handoff_source_node: 'phases/phase-hitl2.md', handoff_target_node: 'phases/phase-rerun.md', handoff_source_attempt_index: 0 },
  ].map(JSON.stringify).join('\n') + '\n');
  if (legacy) writeFileSync(join(dir, 'rb_plan.md'), '---\nplan_basename: test\nderived_topic_count: 1\ntopic_registry:\n  - id: "01"\n    slug: 01_old\n    title: Old\n---\n# Plan\n');
  return dir;
}
const input = { context: 'hitl1', actions: [{ action: 'add_topic', title: 'Topic A', slug_stem: 'topic-a', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: [] }] };

describe('canonical topic state', () => {
  it('atomically adds registry and UID-bound seed', () => {
    const dir = bundle(); const result = applyCanonicalTopicState({ bundlePath: dir, input });
    assert.equal(result.verdict, 'committed'); const inspected = inspectCanonicalTopicState({ bundlePath: dir });
    assert.equal(inspected.mode, 'canonical'); assert.equal(inspected.topics[0].state, 'not_started'); assert.equal(inspected.passed, true);
  });
  it('rejects forged lifecycle context without writes', () => {
    const dir = bundle(); const before = readFileSync(join(dir, 'rb_plan.md'), 'utf8');
    const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'))); status.current_node = 'phases/phase-final.md'; writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));
    const result = applyCanonicalTopicState({ bundlePath: dir, input }); assert.equal(result.verdict, 'blocked'); assert.equal(readFileSync(join(dir, 'rb_plan.md'), 'utf8'), before);
  });
  it('recovers exact staged bytes after plan commit crash', () => {
    const dir = bundle(); let operationId;
    try { applyCanonicalTopicState({ bundlePath: dir, input, crashAt: 'after_plan' }); } catch {}
    const inspected = inspectCanonicalTopicState({ bundlePath: dir }); operationId = inspected.blockers[0].operation_id;
    assert.equal(recoverCanonicalTopicState({ bundlePath: dir, operationId }).verdict, 'committed'); assert.equal(inspectCanonicalTopicState({ bundlePath: dir }).passed, true);
  });
  it('does not overclaim a pre-prepared crash', () => {
    const dir = bundle(); try { applyCanonicalTopicState({ bundlePath: dir, input, crashAt: 'before_prepared' }); } catch {}
    assert.equal(inspectCanonicalTopicState({ bundlePath: dir }).mode, 'canonical');
  });
  it('authorizes explicit rerun migration and external adoption', () => {
    const dir = rerunBundle('topic-migrate', true);
    writeFileSync(join(dir, 'seed_topics/01_old.md'), '---\nid: "01"\nslug: 01_old\ntitle: Old\n---\n# Old\n');
    writeFileSync(join(dir, 'seed_topics/02_external.md'), '---\nid: "02"\nslug: 02_external\ntitle: External\n---\n# External\n');
    const migration = { context: 'rerun', action: 'migrate_legacy', entries: [
      { source: 'registry', id: '01', slug: '01_old', title: 'Old', must_answer: ['Old?'], scope_role: 'primary', depends_on_slugs: [], seed_binding: 'existing' },
      { source: 'adopt', id: '02', slug: '02_external', title: 'External', must_answer: ['External?'], scope_role: 'supporting', depends_on_slugs: ['01_old'], seed_binding: 'existing' },
    ] };
    assert.equal(applyCanonicalTopicState({ bundlePath: dir, input: migration }).verdict, 'committed');
    const inspected = inspectCanonicalTopicState({ bundlePath: dir }); assert.equal(inspected.mode, 'canonical'); assert.equal(inspected.topics.length, 2);
  });
  it('blocks missing rerun witness and post-final fresh apply', () => {
    const rerun = rerunBundle('topic-no-witness'); writeFileSync(join(rerun, 'rb_trace.jsonl'), '');
    assert.equal(applyCanonicalTopicState({ bundlePath: rerun, input: { ...input, context: 'rerun' } }).reason_code, 'rerun_not_authorized');
    const final = bundle('topic-final'); const status = JSON.parse(readFileSync(join(final, 'rb_status.json'))); status.current_node = 'phases/phase-final.md'; writeFileSync(join(final, 'rb_status.json'), JSON.stringify(status));
    assert.equal(applyCanonicalTopicState({ bundlePath: final, input }).reason_code, 'hitl1_not_authorized');
  });
  it('blocks active owner before intent mutation', () => {
    const dir = bundle('topic-active'); applyCanonicalTopicState({ bundlePath: dir, input });
    const inspected = inspectCanonicalTopicState({ bundlePath: dir }); const topic = inspected.topics[0];
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [{ queue_item_id: 'q1', status: 'queued', payload: { topic_slug: topic.slug } }], refill_pool: [] }));
    const update = { context: 'hitl1', actions: [{ action: 'update_intent', topic_uid: topic.topic_uid, title: 'Updated', must_answer: ['Why?'], scope_role: 'primary', depends_on_topic_uids: [] }] };
    assert.equal(applyCanonicalTopicState({ bundlePath: dir, input: update }).reason_code, 'active_topic_work');
  });
  it('blocks late drift and missing staged bytes without overwrite', () => {
    const drift = bundle('topic-drift'); try { applyCanonicalTopicState({ bundlePath: drift, input, crashAt: 'after_prepared' }); } catch {}
    const op = inspectCanonicalTopicState({ bundlePath: drift }).blockers[0].operation_id; writeFileSync(join(drift, 'rb_plan.md'), 'late drift');
    assert.equal(recoverCanonicalTopicState({ bundlePath: drift, operationId: op }).reason_code, 'late_drift'); assert.equal(readFileSync(join(drift, 'rb_plan.md'), 'utf8'), 'late drift');
    const missing = bundle('topic-missing-stage'); try { applyCanonicalTopicState({ bundlePath: missing, input, crashAt: 'after_prepared' }); } catch {}
    const missingOp = inspectCanonicalTopicState({ bundlePath: missing }).blockers[0].operation_id; const staged = join(missing, '_diagnostics/topic-state', missingOp, 'staged'); rmSync(join(staged, readdirSync(staged)[0]));
    assert.equal(recoverCanonicalTopicState({ bundlePath: missing, operationId: missingOp }).reason_code, 'staged_file_missing');
  });
  it('projects progress only from direct queue, ledger and artifact facts', () => {
    const dir = bundle('topic-progress'); applyCanonicalTopicState({ bundlePath: dir, input });
    let topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0]; assert.equal(topic.state, 'not_started');
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [{ queue_item_id: 'q1', status: 'queued', payload: { topic_slug: topic.slug } }], refill_pool: [] }));
    topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0]; assert.equal(topic.state, 'in_progress');
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [] })); mkdirSync(join(dir, 'artifacts/wave0', topic.slug), { recursive: true });
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), `${JSON.stringify({ status: 'submitted', work_id: 'w1', binding_context: { topic_slug: topic.slug } })}\n`);
    topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0]; assert.equal(topic.state, 'complete');
    assert.equal(readdirSync(dir).some((name) => /progress/i.test(name)), false);
  });
  it('requires explicit adoption for registry-external legacy seed', () => {
    const dir = rerunBundle('topic-unaccounted', true); writeFileSync(join(dir, 'seed_topics/01_old.md'), '---\nid: "01"\nslug: 01_old\ntitle: Old\n---\n'); writeFileSync(join(dir, 'seed_topics/02_external.md'), '---\nid: "02"\nslug: 02_external\ntitle: External\n---\n');
    const migration = { context: 'rerun', action: 'migrate_legacy', entries: [{ source: 'registry', id: '01', slug: '01_old', title: 'Old', must_answer: ['Old?'], scope_role: 'primary', depends_on_slugs: [], seed_binding: 'existing' }] };
    assert.throws(() => applyCanonicalTopicState({ bundlePath: dir, input: migration }), /explicit adopt/);
  });
  it('recovers partial multi-seed and cleanup interruption', () => {
    const multi = bundle('topic-multi'); const multiInput = { context: 'hitl1', actions: [input.actions[0], { ...input.actions[0], title: 'Topic B', slug_stem: 'topic-b', must_answer: ['B?'] }] };
    try { applyCanonicalTopicState({ bundlePath: multi, input: multiInput, crashAt: 'after_first_seed' }); } catch {}
    let op = inspectCanonicalTopicState({ bundlePath: multi }).blockers[0].operation_id; assert.equal(recoverCanonicalTopicState({ bundlePath: multi, operationId: op }).verdict, 'committed'); assert.equal(inspectCanonicalTopicState({ bundlePath: multi }).topics.length, 2);
    const cleanup = bundle('topic-cleanup'); try { applyCanonicalTopicState({ bundlePath: cleanup, input, crashAt: 'before_cleanup' }); } catch {}
    op = inspectCanonicalTopicState({ bundlePath: cleanup }).blockers[0].operation_id; assert.equal(recoverCanonicalTopicState({ bundlePath: cleanup, operationId: op }).verdict, 'committed');
  });
  it('enforces same-device preparation and preserves authority boundaries', () => {
    const mismatch = bundle('topic-device'); assert.throws(() => applyCanonicalTopicState({ bundlePath: mismatch, input, forceDeviceMismatch: true }), /same device/);
    const dir = bundle('topic-snapshot'); const before = snapshotTree(dir); applyCanonicalTopicState({ bundlePath: dir, input }); const changed = diffSnapshots(before, snapshotTree(dir));
    assert.ok(changed.every((name) => name === 'rb_plan.md' || name.startsWith('seed_topics/') || name.startsWith('_diagnostics/')), changed.join('\n'));
    for (const forbidden of ['rb_profile.yaml', 'rb_status.json', 'rb_trace.jsonl', 'rb_queue.json']) assert.ok(!changed.includes(forbidden));
  });
});
