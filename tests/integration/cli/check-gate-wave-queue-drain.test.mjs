import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';

const ROOT = process.cwd();
const NEW_BUNDLE = join(ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(ROOT, 'tests', '.test-bundles');
const created = [];

const routes = {
  wave0: { sourceGate: 'seed-topics-ready', sourcePhase: 'seed-topics', sourceNode: 'phases/phase-seed-topics.md', state: 'seed_topics_ready' },
  wave1: { sourceGate: 'wave0-complete', sourcePhase: 'wave0', sourceNode: 'phases/phase-wave0.md', state: 'wave0_complete' },
  wave2: { sourceGate: 'wave1-complete', sourcePhase: 'wave1', sourceNode: 'phases/phase-wave1.md', state: 'wave1_complete' },
};

function item(id, delegated = false) {
  return {
    queue_item_id: id, title: id,
    targets: delegated
      ? { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-topic-scout', timeout_ms: 600000 } }
      : { controller: 'main-agent' },
    action: 'complete', producer_rule: 'test', lineage: {}, priority_class: 'P3_current_gate_gap',
    required_receipts: [], done_condition: 'done', verification: { engine: [], agent: [] }, writes_to: [],
    status_sync: [], completion_receipt: null, failure_route: 'repair', status: 'queued',
    restore_priority: 'normal', payload: {},
  };
}

function createBundle(wave, queuePatch) {
  const name = `queue_gate_${wave}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const made = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr);
  const dir = made.stdout.trim();
  created.push(dir);
  const route = routes[wave];
  setStatusWindow(dir, route.state, `${wave}_complete`);
  writeTraceEvents(dir, witnessedHandoffEvents({
    sourceGate: route.sourceGate, phase: route.sourcePhase, sourceNode: route.sourceNode, targetNode: `phases/phase-${wave}.md`,
  }));
  writeFileSync(join(dir, 'rb_plan.md'), `---
plan_basename: queue-gate
derived_topic_count: 1
topic_registry:
  - slug: topic-a
    title: Topic A
---
# Plan
`);
  const queuePath = join(dir, 'rb_queue.json');
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
  writeFileSync(queuePath, `${JSON.stringify({ ...queue, ...queuePatch }, null, 2)}\n`);
  return dir;
}

function run(wave, kind, dir) {
  const cli = kind === 'inspect'
    ? join(ROOT, `DEEP_RESEARCH_HARNESS/cli/inspect-${wave}-output.mjs`)
    : join(ROOT, `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-${wave}-complete.mjs`);
  const args = kind === 'inspect'
    ? [cli, '--bundle', dir]
    : [cli, '--bundle', dir, '--current-node', `phases/phase-${wave}.md`];
  const result = spawnSync('node', args, { encoding: 'utf8', timeout: 10000 });
  assert.ok(result.stdout, result.stderr);
  return JSON.parse(result.stdout);
}

describe('Wave queue quiescence Gate integration', () => {
  after(() => created.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  const scenarios = [
    { wave: 'wave0', patch: { active_window: [item('main-demand')] }, owner: /operate-queue\.mjs claim/ },
    { wave: 'wave1', patch: { refill_pool: [item('refill-demand')] }, owner: /queue lifecycle contract/ },
    { wave: 'wave2', patch: { delegated_in_flight: { delegated: {
      queue_item_id: 'delegated', work_id: 'wu-w2-b000-tgt-i0001', wave: 2, kind: 'wave2_targeted_evidence',
      batch_id: 'b000', attempt_index: 1, queue_item_snapshot_hash: 'hash', claimed_at: '2026-07-16T00:00:00.000Z',
      timeout_ms: 600000, deadline_at: '2026-07-16T00:10:00.000Z',
    } } }, owner: /operate-work-unit\.mjs inspect/ },
  ];

  for (const scenario of scenarios) {
    it(`${scenario.wave} inspect and formal Gate share the queue root without mutation`, () => {
      const dir = createBundle(scenario.wave, scenario.patch);
      const queuePath = join(dir, 'rb_queue.json');
      const before = readFileSync(queuePath);
      const inspect = run(scenario.wave, 'inspect', dir);
      const gate = run(scenario.wave, 'gate', dir);
      const inspectHint = inspect.hints.find((hint) => hint.rule_id === 'phase_queue_drained');
      const gateHint = gate.hints.find((hint) => hint.rule_id === 'phase_queue_drained');
      assert.ok(inspectHint, JSON.stringify(inspect));
      assert.ok(gateHint, JSON.stringify(gate));
      assert.deepEqual(
        { rule_id: inspectHint.rule_id, repair_kind: inspectHint.repair_kind, missing_fact: inspectHint.missing_fact, write_to: inspectHint.write_to },
        { rule_id: gateHint.rule_id, repair_kind: gateHint.repair_kind, missing_fact: gateHint.missing_fact, write_to: gateHint.write_to },
      );
      assert.match(inspectHint.write_to, scenario.owner);
      assert.match(inspectHint.rerun, new RegExp(`inspect-${scenario.wave}-output\\.mjs`));
      assert.match(gateHint.rerun, new RegExp(`check-gate-${scenario.wave}-complete\\.mjs`));
      assert.deepEqual(readFileSync(queuePath), before);
    });
  }

  for (const wave of Object.keys(routes)) {
    it(`${wave} inspect and formal Gate expose the terminal no-successor root without mutation`, () => {
      const failed = item('generic-terminal');
      failed.status = 'failed';
      const dir = createBundle(wave, {
        terminal_history: [{
          queue_item_id: failed.queue_item_id,
          terminal_status: 'failed',
          completed_at: '2026-08-07T00:00:00.000Z',
          reason: 'no legal generic successor',
          failure_disposition: 'terminal_no_successor',
          item: failed,
        }],
      });
      const queuePath = join(dir, 'rb_queue.json');
      const before = readFileSync(queuePath);
      const inspect = run(wave, 'inspect', dir);
      const gate = run(wave, 'gate', dir);
      const inspectHint = inspect.hints.find((hint) => hint.rule_id === 'phase_queue_drained');
      const gateHint = gate.hints.find((hint) => hint.rule_id === 'phase_queue_drained');
      assert.ok(inspectHint, JSON.stringify(inspect));
      assert.ok(gateHint, JSON.stringify(gate));
      assert.deepEqual(
        { rule_id: inspectHint.rule_id, repair_kind: inspectHint.repair_kind, missing_fact: inspectHint.missing_fact, write_to: inspectHint.write_to },
        { rule_id: gateHint.rule_id, repair_kind: gateHint.repair_kind, missing_fact: gateHint.missing_fact, write_to: gateHint.write_to },
      );
      assert.equal(inspectHint.repair_kind, 'missing_contract');
      assert.match(inspectHint.missing_fact, /generic-terminal/);
      assert.match(inspectHint.write_to, /queue failure successor contract/);
      assert.doesNotMatch(inspectHint.write_to, /operate-queue|rb_queue\.json/i);
      assert.doesNotMatch(gateHint.write_to, /operate-queue|rb_queue\.json/i);
      assert.deepEqual(readFileSync(queuePath), before);
    });
  }
});
