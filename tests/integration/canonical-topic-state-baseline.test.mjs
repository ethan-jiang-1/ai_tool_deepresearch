// tests/integration/canonical-topic-state-baseline.test.mjs
// W1 baseline for the canonical-topic-state carve (plan cleanup-wave2 §5 W2):
// pins the PUBLIC export surface and one apply/inspect/crash/recover smoke flow
// so the upcoming module split cannot drift behavior. Fixture patterns reused
// from tests/integration/cli/operate-topic-state-direction.test.mjs.
// @impl CTS-001, CTS-003, CTS-005, CTS-006, CTS-008
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import * as cts from '../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { createTempDir } from '../helpers/temp-dirs.mjs';

const CLI = join(process.cwd(), 'DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs');
const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function makeBundle(label) {
  const dir = createTempDir(label);
  dirs.push(dir);
  mkdirSync(join(dir, 'seed_topics'));
  mkdirSync(join(dir, '_work_units'));
  writeFileSync(join(dir, 'rb_plan.md'), '---\nplan_basename: cts-baseline\nderived_topic_count: 0\ntopic_registry_version: "2"\ntopic_registry: []\n---\n# Plan\n');
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
  const p = join(dir, name);
  writeFileSync(p, `${JSON.stringify(input, null, 2)}\n`);
  return p;
}

function initialInput() {
  return { context: 'hitl1', actions: [{ action: 'add_topic', title: 'Topic A', slug_stem: 'topic-a', must_answer: ['What matters?'], scope_role: 'primary', depends_on_topic_uids: [] }] };
}

describe('canonical-topic-state public export surface (W1 baseline)', () => {
  it('exports the documented public API names', () => {
    for (const name of [
      'TOPIC_STATE_SCHEMA_VERSION',
      'TOPIC_STATE_ROOT',
      'TOPIC_STATE_OPERATIONS',
      'TopicApplyPlanSchema',
      'describeTopicApplyPlanSchema',
      'projectTopicApplyValidationErrors',
      'inspectSeedTopicsAuthoringAuthorization',
      'evaluateCanonicalSeedBindings',
      'inspectCanonicalTopicState',
      'applyCanonicalTopicState',
      'recoverCanonicalTopicState',
    ]) {
      assert.ok(Object.hasOwn(cts, name), `missing public export: ${name}`);
    }
  });

  it('TOPIC_STATE_OPERATIONS matches the CLI operation set', () => {
    assert.deepEqual([...cts.TOPIC_STATE_OPERATIONS].sort(), ['apply', 'inspect', 'recover', 'schema']);
  });

  it('smoke: apply commits a topic, inspect reports clean, crash mid-apply recovers via the CLI', () => {
    const dir = makeBundle('cts-baseline-flow');
    const applied = run('apply', '--bundle', dir, '--input', writeInput(dir, 'initial.json', initialInput()));
    assert.equal(applied.status, 0, applied.stderr);
    const inspection = run('inspect', '--bundle', dir);
    assert.equal(inspection.status, 0, inspection.stderr);

    // crash mid-apply, then recover through the staged workspace
    const current = parseYaml(readFileSync(join(dir, 'rb_plan.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]).topic_registry[0];
    assert.throws(() => cts.applyCanonicalTopicState({
      bundlePath: dir,
      input: { context: 'hitl1', actions: [{ action: 'add_topic', title: 'Topic B', slug_stem: 'topic-b', must_answer: ['Also this?'], scope_role: 'primary', depends_on_topic_uids: [] }] },
      crashAt: 'after_prepared',
    }), /simulated crash/);
    const blocked = run('inspect', '--bundle', dir);
    assert.equal(blocked.status, 1);
    const blocker = blocked.output.blockers[0];
    const prepared = JSON.parse(readFileSync(join(dir, '_diagnostics', 'topic-state', blocker.operation_id, 'prepared.json'), 'utf8'));
    const recovered = run('recover', '--bundle', dir, '--operation-id', blocker.operation_id);
    assert.equal(recovered.status, 0, recovered.stderr);
    assert.equal(recovered.output.verdict, 'committed');
    for (const file of prepared.files) {
      assert.ok(existsSyncImpl(dir, file.relative), `staged file landed: ${file.relative}`);
    }
    void current;
  });

  it('source anchor: evaluateCanonicalSeedBindings still lives in this module pre-carve', () => {
    // W2 will move this function into topic-state-bundle-io.mjs; this anchor
    // exists so the carve updates the baseline alongside the move.
    const source = readFileSync(join(process.cwd(), 'DEEP_RESEARCH_HARNESS', 'engine', 'helpers', 'canonical-topic-state.mjs'), 'utf8');
    assert.ok(source.includes('export function evaluateCanonicalSeedBindings'));
  });
});

function existsSyncImpl(dir, relative) {
  try {
    readFileSync(join(dir, relative));
    return true;
  } catch {
    return false;
  }
}
