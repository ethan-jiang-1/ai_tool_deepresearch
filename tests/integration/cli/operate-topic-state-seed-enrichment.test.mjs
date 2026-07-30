// @impl CTS-003
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeGateAttempt } from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import { applyCanonicalTopicState, recoverCanonicalTopicState } from '../../../DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';
import {
  renderSeedInitializationRegion,
  SEED_TOPIC_INITIALIZATION,
} from '../../../DPT_FRAMEWORK/engine/helpers/seed-topic-authoring-evaluator.mjs';

const root = process.cwd();
const cli = join(root, 'DPT_FRAMEWORK/cli/operate-topic-state.mjs');
const enter = join(root, 'DPT_FRAMEWORK/cli/enter-phase.mjs');
const dirs = [];
const topic = { topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174000', id: '01', slug: '01_topic-a', title: 'Topic A', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: [] };

function bundle(label) {
  const dir = join(root, 'tests/.test-bundles', `seed_enrichment_${label}_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  dirs.push(dir); mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  writeFileSync(join(dir, 'rb_plan.md'), `---\nplan_basename: test\nderived_topic_count: 1\ntopic_registry_version: "2"\ntopic_registry:\n  - topic_uid: ${topic.topic_uid}\n    id: "01"\n    slug: ${topic.slug}\n    title: ${topic.title}\n    must_answer: ["What?"]\n    scope_role: primary\n    depends_on_topic_uids: []\n---\n# Plan\n`);
  writeFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), `---\ntopic_uid: ${topic.topic_uid}\nid: "01"\nslug: ${topic.slug}\ntitle: ${topic.title}\nmust_answer: ["wrong"]\nscope_role: primary\ndepends_on_topic_uids: []\nlegacy: retain\n---\n\n# Body\n\n## must_answer\nlegacy prose\n`);
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'in_progress', current_gate: 'setup_ready', next_gate: 'seed_topics_ready', current_node: 'phases/phase-setup.md' }));
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [] }));
  writeFileSync(join(dir, 'rb_trace.jsonl'), '');
  return dir;
}
function authorize(dir) {
  writeGateAttempt(dir, { check: { passed: true, gate: 'setup-ready', currentNodeRef: 'phases/phase-setup.md', next: 'phases/phase-seed-topics.md', failed_rule_ids: [] }, routing: { kind: 'next', next: 'phases/phase-seed-topics.md' }, inspect: [], advice: [] }, { setupReadyStaged: true });
  const result = spawnSync('node', [enter, '--bundle', dir, '--node', 'phases/phase-seed-topics.md'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
function input(overrides = {}) {
  return { context: 'seed_topics', action: 'enrich_seed', topic_uid: topic.topic_uid, enrichment: { hypothesis: 'hypothesis', in_scope: 'in', out_of_scope: 'out', search_guardrails: { required_terms: ['term'], forbidden_broadening: ['broad'] }, evidence_route: { preferred_sources: ['primary'], noise_to_avoid: ['noise'] } }, ...overrides };
}
function apply(dir, value) {
  const file = join(dir, 'input.json'); writeFileSync(file, `${JSON.stringify(value)}\n`);
  const result = spawnSync('node', [cli, 'apply', '--bundle', dir, '--input', file], { encoding: 'utf8' });
  return { result, output: JSON.parse(result.stdout) };
}

after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('operate-topic-state seed enrichment', () => {
  it('rejects incomplete or canonical enrichment input before any write', () => {
    const dir = bundle('input'); authorize(dir);
    const plan = readFileSync(join(dir, 'rb_plan.md'), 'utf8'); const seed = readFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), 'utf8');
    const { result, output } = apply(dir, input({ enrichment: { ...input().enrichment, must_answer: ['forbidden'] } }));
    assert.equal(result.status, 1); assert.equal(output.reason_code, 'input_invalid');
    assert.equal(readFileSync(join(dir, 'rb_plan.md'), 'utf8'), plan);
    assert.equal(readFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), 'utf8'), seed);
  });

  it('uses the exact UID, repairs the first binding drift, preserves plan/body bytes, and returns action metadata', () => {
    const dir = bundle('commit'); authorize(dir);
    const plan = readFileSync(join(dir, 'rb_plan.md'), 'utf8'); const old = readFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), 'utf8');
    const { result, output } = apply(dir, input());
    assert.equal(result.status, 0, result.stderr); assert.equal(output.verdict, 'committed');
    assert.equal(output.action, 'enrich_seed'); assert.equal(output.topic_uid, topic.topic_uid); assert.equal(output.path, `seed_topics/${topic.slug}.md`);
    assert.equal(output.binding_repair.field, 'must_answer');
    assert.equal(readFileSync(join(dir, 'rb_plan.md'), 'utf8'), plan);
    const updated = readFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), 'utf8');
    assert.ok(updated.endsWith(old.slice(old.match(/^---\n[\s\S]*?\n---\n/)[0].length)));
  });

  it('rejects an out-of-window request without publishing a workspace', () => {
    const dir = bundle('window');
    const before = readFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), 'utf8');
    const { result, output } = apply(dir, input());
    assert.equal(result.status, 1); assert.equal(output.reason_code, 'seed_topics_not_authorized');
    assert.equal(readFileSync(join(dir, 'seed_topics', `${topic.slug}.md`), 'utf8'), before);
    assert.equal(existsSync(join(dir, '_diagnostics/topic-state')), false);
  });

  it('recovers a prepared enrichment with its action-specific result metadata', () => {
    const dir = bundle('recover'); authorize(dir);
    assert.throws(() => applyCanonicalTopicState({ bundlePath: dir, input: input(), crashAt: 'after_prepared' }), /simulated crash/);
    const operationId = readdirSync(join(dir, '_diagnostics/topic-state'))[0];
    const recovered = recoverCanonicalTopicState({ bundlePath: dir, operationId });
    assert.equal(recovered.verdict, 'committed'); assert.equal(recovered.action, 'enrich_seed');
    assert.equal(recovered.topic_uid, topic.topic_uid); assert.equal(recovered.path, `seed_topics/${topic.slug}.md`);
  });

  it('keeps pre-v0.50 seed unknown keys, duplicate body prose, and an active seed card compatible', () => {
    const dir = bundle('legacy-compatible'); authorize(dir);
    const seedPath = join(dir, 'seed_topics', `${topic.slug}.md`);
    const old = readFileSync(seedPath, 'utf8');
    const suffix = '\n# Body\n\n## must_answer\nlegacy duplicate prose\n\n## Appendix\nlegacy appendix\n';
    writeFileSync(seedPath, old.replace(/---\n\n[\s\S]*$/, 'legacy_unknown: preserved\n---\n') + suffix);
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [{ queue_item_id: 'legacy-seed-card', status: 'queued', payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug } }], refill_pool: [] }));
    const result = applyCanonicalTopicState({ bundlePath: dir, input: input() });
    assert.equal(result.verdict, 'committed');
    const updated = readFileSync(seedPath, 'utf8');
    assert.match(updated, /legacy_unknown: preserved/);
    assert.ok(updated.endsWith(suffix));
    assert.equal(JSON.parse(readFileSync(join(dir, 'rb_queue.json'), 'utf8')).active_window[0].queue_item_id, 'legacy-seed-card');
  });

  it('preserves a current marker-bounded initialization body while enrich_seed updates only structured fields', () => {
    const dir = bundle('current-marker-body'); authorize(dir);
    const seedPath = join(dir, 'seed_topics', `${topic.slug}.md`);
    const header = readFileSync(seedPath, 'utf8').match(/^---\n[\s\S]*?\n---\n/)[0];
    const body = `# Topic A\n\n${renderSeedInitializationRegion()}\n\n## ${SEED_TOPIC_INITIALIZATION.appendixHeading}\n\n## 历史摘要\n\n*(new seed)*\n`;
    writeFileSync(seedPath, `${header}${body}`);

    const { result } = apply(dir, input());
    const updated = readFileSync(seedPath, 'utf8');
    const updatedHeader = updated.match(/^---\n[\s\S]*?\n---\n/)[0];

    assert.equal(result.status, 0, result.stderr);
    assert.equal(updated.slice(updatedHeader.length), body);
    assert.equal(updated.split(SEED_TOPIC_INITIALIZATION.startMarker).length - 1, 1);
    assert.equal(updated.split(SEED_TOPIC_INITIALIZATION.endMarker).length - 1, 1);
  });
});
