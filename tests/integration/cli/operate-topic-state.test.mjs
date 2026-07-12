import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir } from '../../helpers/temp-dirs.mjs';

const CLI = join(process.cwd(), 'DPT_FRAMEWORK/cli/operate-topic-state.mjs');
const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function makeBundle(label) {
  const dir = createTempDir(label); dirs.push(dir); mkdirSync(join(dir, 'seed_topics')); mkdirSync(join(dir, '_work_units'));
  writeFileSync(join(dir, 'rb_plan.md'), '---\nplan_basename: test\nderived_topic_count: 0\ntopic_registry_version: "2"\ntopic_registry: []\n---\n# Plan\n');
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'not_started', current_gate: 'hitl1_recorded', next_gate: 'setup_ready', current_node: 'phases/phase-hitl1.md' }));
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [] })); writeFileSync(join(dir, 'rb_trace.jsonl'), '');
  return dir;
}
function run(...args) { return spawnSync('node', [CLI, ...args], { encoding: 'utf8', timeout: 10000 }); }

describe('operate-topic-state CLI', () => {
  it('supports inspect and apply with stable exit codes', () => {
    const dir = makeBundle('topic-cli'); const inputPath = join(dir, 'approved.json');
    writeFileSync(inputPath, JSON.stringify({ context: 'hitl1', actions: [{ action: 'add_topic', title: 'Topic A', slug_stem: 'topic-a', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: [] }] }));
    const applied = run('apply', '--bundle', dir, '--input', inputPath); assert.equal(applied.status, 0, applied.stdout); assert.equal(JSON.parse(applied.stdout).verdict, 'committed');
    const inspected = run('inspect', '--bundle', dir); assert.equal(inspected.status, 0); assert.equal(JSON.parse(inspected.stdout).topics[0].state, 'not_started');
  });
  it('rejects unsupported layout mutation without writes', () => {
    const dir = makeBundle('topic-layout'); const inputPath = join(dir, 'unsupported.json'); const before = readFileSync(join(dir, 'rb_plan.md'), 'utf8');
    writeFileSync(inputPath, JSON.stringify({ context: 'hitl1', actions: [{ action: 'rename' }] }));
    const result = run('apply', '--bundle', dir, '--input', inputPath); assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).reason_code, 'layout_mutation_not_supported'); assert.equal(readFileSync(join(dir, 'rb_plan.md'), 'utf8'), before);
  });
  it('uses exit 2 for invalid invocation', () => {
    const result = run('apply', '--bundle', makeBundle('topic-invalid')); assert.equal(result.status, 2);
  });
});
