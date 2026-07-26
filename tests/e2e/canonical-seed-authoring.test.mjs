// @impl CTS-003, STM-001, AGQ-002
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeGateAttempt } from '../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

const root = process.cwd();
const created = [];
const topicState = join(root, 'DPT_FRAMEWORK/cli/operate-topic-state.mjs');
const queue = join(root, 'DPT_FRAMEWORK/cli/operate-queue.mjs');
const gate = join(root, 'DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs');
const enter = join(root, 'DPT_FRAMEWORK/cli/enter-phase.mjs');
const topics = [
  { topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174000', id: '01', slug: '01_alpha', title: 'Alpha', must_answer: ['Alpha?'], scope_role: 'primary', depends_on_topic_uids: [] },
  { topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174001', id: '02', slug: '02_beta', title: 'Beta', must_answer: ['Beta?'], scope_role: 'comparison', depends_on_topic_uids: [] },
];
function run(command, args) {
  const result = spawnSync('node', [command, ...args], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  return result.stdout.trim().startsWith('{') ? JSON.parse(result.stdout) : result.stdout;
}
function setup() {
  const bundle = join(root, 'tests/.test-bundles', `canonical_seed_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  created.push(bundle); mkdirSync(join(bundle, 'seed_topics'), { recursive: true });
  const registry = topics.map((topic) => `  - topic_uid: ${topic.topic_uid}\n    id: "${topic.id}"\n    slug: ${topic.slug}\n    title: ${topic.title}\n    must_answer: ["${topic.must_answer[0]}"]\n    scope_role: ${topic.scope_role}\n    depends_on_topic_uids: []`).join('\n');
  writeFileSync(join(bundle, 'rb_plan.md'), `---\nplan_basename: e2e\nderived_topic_count: 2\ntopic_registry_version: "2"\ntopic_registry:\n${registry}\n---\n# Plan\n`);
  for (const topic of topics) writeFileSync(join(bundle, 'seed_topics', `${topic.slug}.md`), `---\ntopic_uid: ${topic.topic_uid}\nid: "${topic.id}"\nslug: ${topic.slug}\ntitle: ${topic.title}\nmust_answer: ["drift"]\nscope_role: ${topic.scope_role}\ndepends_on_topic_uids: []\n---\n\n# ${topic.title}\n`);
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'in_progress', current_gate: 'setup_ready', next_gate: 'seed_topics_ready', current_node: 'phases/phase-setup.md' }));
  writeFileSync(join(bundle, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [], delegated_in_flight: {}, terminal_history: [], queue_health: 'thin', stop_authorization_state: 'unauthorized_continue_required' }));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), '');
  writeGateAttempt(bundle, { check: { passed: true, gate: 'setup-ready', currentNodeRef: 'phases/phase-setup.md', next: 'phases/phase-seed-topics.md', failed_rule_ids: [] }, routing: { kind: 'next', next: 'phases/phase-seed-topics.md' }, inspect: [], advice: [] }, { setupReadyStaged: true });
  run(enter, ['--bundle', bundle, '--node', 'phases/phase-seed-topics.md']);
  return bundle;
}
function task(topic) {
  const file = `seed_topics/${topic.slug}.md`;
  return { queue_item_id: `seed-${topic.id}`, title: `Enrich ${topic.title}`, targets: { controller: 'main-agent' }, action: 'Enrich through canonical topic-state.', producer_rule: 'seed_topic_materialize', lineage: { topic_slug: topic.slug }, priority_class: 'P3_current_gate_gap', required_receipts: [`file:${file}`], done_condition: 'Canonical enrichment committed.', verification: { engine: ['receipt_check'], agent: [] }, writes_to: [file], status_sync: [], completion_receipt: `file:${file}`, failure_route: 'repair', status: 'queued', restore_priority: 'normal', payload: { topic_slug: topic.slug } };
}
after(() => created.forEach((bundle) => rmSync(bundle, { recursive: true, force: true })));

describe('canonical seed authoring E2E', () => {
  it('repairs canonical bindings through the writer, drains queue work, and passes the real Seed Topics Gate', () => {
    const bundle = setup();
    const planBytes = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
    for (const topic of topics) {
      const bad = join(bundle, `bad-${topic.id}.json`); writeFileSync(bad, JSON.stringify({ context: 'seed_topics', action: 'enrich_seed', topic_uid: topic.topic_uid, enrichment: { hypothesis: '' } }));
      const rejected = spawnSync('node', [topicState, 'apply', '--bundle', bundle, '--input', bad], { encoding: 'utf8' });
      assert.equal(JSON.parse(rejected.stdout).reason_code, 'input_invalid');
      const input = join(bundle, `input-${topic.id}.json`); writeFileSync(input, JSON.stringify({ context: 'seed_topics', action: 'enrich_seed', topic_uid: topic.topic_uid, enrichment: { hypothesis: `${topic.title} hypothesis`, in_scope: 'bounded', out_of_scope: 'excluded', search_guardrails: { required_terms: [topic.slug], forbidden_broadening: ['generic'] }, evidence_route: { preferred_sources: ['primary'], noise_to_avoid: ['noise'] } } }));
      const applied = run(topicState, ['apply', '--bundle', bundle, '--input', input]);
      assert.equal(applied.binding_repair.field, 'must_answer');
      const taskFile = join(bundle, `task-${topic.id}.json`); writeFileSync(taskFile, JSON.stringify(task(topic)));
      run(queue, ['enqueue', bundle, '--task', taskFile]);
      const result = join(bundle, `result-${topic.id}.json`); writeFileSync(result, JSON.stringify({ queue_item_id: `seed-${topic.id}`, summary: 'enriched' }));
      run(queue, ['complete', bundle, '--result', result]);
    }
    assert.equal(readFileSync(join(bundle, 'rb_plan.md'), 'utf8'), planBytes);
    const output = run(gate, ['--bundle', bundle, '--current-node', 'phases/phase-seed-topics.md']);
    assert.equal(output.check.passed, true);
  });
});
