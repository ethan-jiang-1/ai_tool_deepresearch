// @impl QIV-001, QIV-004, DEW-003

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

import { createQueue, enqueue, makeItem, saveQueue } from '../../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const ROOT = process.cwd();
const QUEUE_CLI = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs');
const WORK_UNIT_CLI = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs');

function run(cli, command, bundle, ...args) {
  return spawnSync('node', [cli, command, bundle, ...args], { encoding: 'utf8', timeout: 10000 });
}

function writeBundle(dir) {
  writeFileSync(join(dir, 'rb_plan.md'), `---
plan_basename: admission-test
derived_topic_count: 1
topic_registry_version: "2"
topic_registry:
  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000
    id: "01"
    slug: topic-a
    title: Topic A
    must_answer: ["What matters?"]
    scope_role: primary
    depends_on_topic_uids: []
    previous_layouts: []
---
# Plan
`);
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  writeFileSync(join(dir, 'seed_topics', 'topic-a.md'), `---
topic_uid: tp_123e4567-e89b-12d3-a456-426614174000
id: "01"
slug: topic-a
title: Topic A
must_answer: ["What matters?"]
scope_role: primary
depends_on_topic_uids: []
---
# Topic A
`);
  saveQueue(dir, createQueue(basename(dir)));
}

function delegated(id, overrides = {}) {
  return makeItem({
    queue_item_id: id,
    title: id,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { wave: 0, topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', topic_slug: 'topic-a' },
    required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
    writes_to: ['artifacts/wave0/topic-a/source.yaml'],
    ...overrides,
  });
}

function legacyWave1(id) {
  return makeItem({
    queue_item_id: id,
    title: id,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 } },
    kind: 'wave1_topic_deepening',
    producer_rule: 'topic_deepening',
    payload: { wave: 1, topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', topic_slug: 'topic-a' },
    required_receipts: [],
  });
}

function direct(id) {
  return makeItem({ queue_item_id: id, title: id, targets: { controller: 'main-agent' }, payload: {} });
}

function saveDemand(dir, items, inFlight = {}) {
  let queue = createQueue(basename(dir));
  for (const item of items) queue = enqueue(queue, item);
  queue.delegated_in_flight = inFlight;
  saveQueue(dir, queue);
}

describe('operate-queue delegated demand admission', () => {
  after(cleanupAll);

  it('rejects an invalid delegated enqueue before queue mutation', () => {
    const dir = createTempDir('queue-admission-enqueue');
    writeBundle(dir);
    const task = delegated('wave0-source-topic-a-missing-kind', { kind: undefined });
    const taskPath = join(dir, 'task.json');
    writeFileSync(taskPath, JSON.stringify(task));
    const before = readFileSync(join(dir, 'rb_queue.json'), 'utf8');
    const result = run(QUEUE_CLI, 'enqueue', dir, '--task', taskPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /explicit supported work-unit kind/);
    assert.equal(readFileSync(join(dir, 'rb_queue.json'), 'utf8'), before);
  });

  it('rejects an old mutable plan through the current topic-state boundary without queue mutation', () => {
    const dir = createTempDir('queue-admission-old-plan');
    writeBundle(dir);
    writeFileSync(join(dir, 'rb_plan.md'), '---\nplan_basename: old\nderived_topic_count: 1\ntopic_registry:\n  - id: "01"\n    slug: topic-a\n    title: Topic A\n---\n# Plan\n');
    const taskPath = join(dir, 'task.json');
    writeFileSync(taskPath, JSON.stringify(delegated('wave0-source-old-plan')));
    const before = readFileSync(join(dir, 'rb_queue.json'), 'utf8');
    const result = run(QUEUE_CLI, 'enqueue', dir, '--task', taskPath);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /canonical topic state|required/);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /migrat|adopt|upgrade|convert/i);
    assert.equal(readFileSync(join(dir, 'rb_queue.json'), 'utf8'), before);
  });

  it('diagnoses rejected demand in check without queue mutation', () => {
    const dir = createTempDir('queue-admission-check');
    writeBundle(dir);
    saveDemand(dir, [legacyWave1('wave1-legacy-check')]);
    const before = readFileSync(join(dir, 'rb_queue.json'), 'utf8');
    const result = run(QUEUE_CLI, 'check', dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /wave1-legacy-check/);
    assert.match(result.stdout, /assignment_mode/);
    assert.equal(readFileSync(join(dir, 'rb_queue.json'), 'utf8'), before);
  });

  it('rejects a claim batch atomically when a later planned demand is inadmissible', () => {
    const dir = createTempDir('queue-admission-claim');
    writeBundle(dir);
    saveDemand(dir, [delegated('wave0-source-good'), delegated('wave0-source-missing-kind', { kind: undefined })]);
    const before = readFileSync(join(dir, 'rb_queue.json'), 'utf8');
    const result = run(
      WORK_UNIT_CLI, 'claim', dir, '--phase', 'wave0', '--count', '2',
      '--actor-outcome', 'available', '--actor-source', 'native_probe',
      '--actor-role-key', 'dpt-source-intake', '--actor-reason', 'probe_succeeded',
    );
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.equal(output.admission.queue_item_id, 'wave0-source-missing-kind');
    assert.equal(readFileSync(join(dir, 'rb_queue.json'), 'utf8'), before);
    assert.equal(existsSync(join(dir, '_work_units')), false);
  });

  it('repairs only rejected unclaimed delegated demand and preserves direct and in-flight ownership', () => {
    const dir = createTempDir('queue-admission-repair');
    writeBundle(dir);
    const inFlightId = 'wave0-in-flight';
    saveDemand(dir, [legacyWave1('wave1-legacy-repair'), direct('manual-direct')], {
      [inFlightId]: {
        queue_item_id: inFlightId,
        work_id: 'wu-w0-b000-src-i0001', wave: 0, kind: 'wave0_source_intake', batch_id: 'b000', attempt_index: 1,
        queue_item_snapshot_hash: 'snapshot-hash', claimed_at: '2026-07-20T00:00:00.000Z', timeout_ms: 600000, deadline_at: '2099-07-20T00:10:00.000Z',
      },
    });
    const result = run(QUEUE_CLI, 'repair', dir, '--remove-stale');
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.removed_count, 1);
    assert.match(output.removed[0].reason, /assignment_mode/);
    const queue = JSON.parse(readFileSync(join(dir, 'rb_queue.json'), 'utf8'));
    assert.deepEqual(queue.active_window.map((item) => item.queue_item_id), ['manual-direct']);
    assert.equal(queue.delegated_in_flight[inFlightId].work_id, 'wu-w0-b000-src-i0001');
  });
});
