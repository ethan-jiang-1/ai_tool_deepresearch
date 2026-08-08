import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir } from '../helpers/temp-dirs.mjs';
import { applyCanonicalTopicState } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';

// @impl WTS-012

const dirs = [];

function writePlan(bundle, topicSlug) {
  writeFileSync(join(bundle, 'rb_plan.md'), `---\nplan_basename: wts-012-test\nderived_topic_count: 1\ntopic_registry_version: "2"\ntopic_registry:\n  - topic_uid: tp_wts012\ntest\n    id: "01"\n    slug: ${topicSlug}\n    title: Topic\n    must_answer:\n      - What?\n    scope_role: primary\n    depends_on_topic_uids: []\n---\n# Plan\n`);
}

function makeWave2Bundle(label) {
  const bundle = createTempDir(label);
  dirs.push(bundle);
  mkdirSync(join(bundle, 'seed_topics'));
  mkdirSync(join(bundle, 'artifacts', 'wave2'), { recursive: true });
  writeFileSync(join(bundle, 'rb_plan.md'), '---\nplan_basename: wts-012-test\nderived_topic_count: 0\ntopic_registry_version: "2"\ntopic_registry: []\n---\n# Plan\n');
  writeFileSync(join(bundle, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: 0\n');
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    current_mode: 'execution', state: 'in_progress', current_node: 'phases/phase-hitl1.md', current_gate: 'hitl1_recorded', next_gate: 'setup_ready',
  }));
  writeFileSync(join(bundle, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [], delegated_in_flight: [] }));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), '');
  const initial = applyCanonicalTopicState({
    bundlePath: bundle,
    input: {
      context: 'hitl1',
      actions: [{
        action: 'add_topic', title: 'Topic', slug_stem: 'topic-a', must_answer: ['What changes?'], scope_role: 'primary', depends_on_topic_uids: [],
      }],
    },
  });
  assert.equal(initial.verdict, 'committed');
  // authorize the Wave2 projection window for the packet apply (status + trace)
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    current_mode: 'execution', state: 'in_progress', current_node: 'phases/phase-wave2.md', current_gate: 'wave1_complete', next_gate: 'wave2_complete',
  }));
  const routes = [
    ['seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md'],
    ['wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md'],
    ['wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md'],
  ];
  const trace = routes.flatMap(([gate, source, target], index) => [
    { ts: `2026-07-27T00:00:0${index}Z`, event: 'gate_attempt', gate, passed: true, currentNodeRef: source, next: target },
    {
      ts: `2026-07-27T00:00:1${index}Z`, event: 'load_complete', entry: target,
      handoff_source_gate: gate, handoff_source_node: source, handoff_target_node: target, handoff_source_attempt_index: index * 2,
    },
  ]);
  writeFileSync(join(bundle, 'rb_trace.jsonl'), `${trace.map(JSON.stringify).join('\n')}\n`);
  const plan = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
  const uid = plan.match(/topic_uid: ([A-Za-z0-9_-]+)/)?.[1];
  return { bundle, topicUid: uid };
}

function wave2Packet(topicUid, findingId) {
  return {
    context: 'wave_projection', action: 'apply_seed_projection', topic_uid: topicUid, wave: 'wave2',
    updates: [{
      slot_id: 'wave2_judgment',
      entries: [{
        source_identity: { kind: 'finding', finding_id: findingId }, entry_id: findingId,
        evidence_meaning: 'exposed limitation', relationship: 'defers', refs: ['none'], status: 'deferred',
        next_hop: 'limitation: no materializable evidence before HITL2.',
      }],
    }],
  };
}

function writeFindingIndex(bundle, lines) {
  writeFileSync(join(bundle, 'artifacts', 'wave2', 'finding-index.yaml'), lines.join('\n') + '\n');
}

after(() => dirs.splice(0).forEach((dir) => {
  try { createTempDir.cleanup(dir); } catch { /* already cleaned */ }
}));


describe('Wave2 finding currentness feedback (WTS-012)', () => {
  it('names the id format rule for a malformed finding id', () => {
    const { bundle, topicUid } = makeWave2Bundle('wts-012-format');
    writeFindingIndex(bundle, ['version: "0.1"', 'findings:', '  - id: W2F-001', '    affected_topics: [topic-a]', '    created_in_rerun_count: 0']);
    const result = applyCanonicalTopicState({ bundlePath: bundle, input: wave2Packet(topicUid, 'W2F-01') });
    assert.equal(result.verdict, 'blocked');
    assert.match(JSON.stringify(result), /three or more digits after W2F-/i);
  });

  it('names the missing created_in_rerun_count field', () => {
    const { bundle, topicUid } = makeWave2Bundle('wts-012-missing');
    writeFindingIndex(bundle, ['version: "0.1"', 'findings:', '  - id: W2F-101', '    affected_topics: [topic-a]']);
    const result = applyCanonicalTopicState({ bundlePath: bundle, input: wave2Packet(topicUid, 'W2F-101') });
    assert.equal(result.verdict, 'blocked');
    assert.equal(result.reason_code, 'wave2_finding_not_current');
    assert.match(result.reason, /missing created_in_rerun_count/);
  });

  it('names the wrong current round value', () => {
    const { bundle, topicUid } = makeWave2Bundle('wts-012-round');
    writeFindingIndex(bundle, ['version: "0.1"', 'findings:', '  - id: W2F-102', '    affected_topics: [topic-a]', '    created_in_rerun_count: 3']);
    const result = applyCanonicalTopicState({ bundlePath: bundle, input: wave2Packet(topicUid, 'W2F-102') });
    assert.equal(result.verdict, 'blocked');
    assert.equal(result.reason_code, 'wave2_finding_not_current');
    assert.match(result.reason, /created_in_rerun_count is 3/);
  });
});
