import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createQueue,
  enqueue,
  makeItem,
  saveQueue,
} from '../../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import {
  loadWorkUnitIndex,
  readWorkUnitLedgerRows,
} from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import { referenceContent } from '../../engine/work-unit-test-helpers.mjs';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';

const REPO_ROOT = process.cwd();
const WORK_UNIT_CLI = path.join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs');
const GATE_CLI = path.join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs');
const NEW_BUNDLE = path.join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = path.join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function run(command, args, options = {}) {
  return spawnSync(process.execPath, [command, ...args], {
    encoding: 'utf-8',
    timeout: 10000,
    ...options,
  });
}

function createBundle(label) {
  const name = `rt_declaration_recovery_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const created = run(NEW_BUNDLE, [name, '--force', '--target-dir', BUNDLES_DIR]);
  assert.equal(created.status, 0, created.stderr || created.stdout);
  const dir = created.stdout.trim();
  createdDirs.push(dir);
  setStatusWindow(dir, 'seed_topics_ready', 'wave0_complete');
  writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: ${name}
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
  mkdirSync(path.join(dir, 'seed_topics'), { recursive: true });
  writeFileSync(path.join(dir, 'seed_topics/topic-a.md'), `---
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

  const sourceUrl = 'https://docs.example.org/research/wave0-source';
  mkdirSync(path.join(dir, 'artifacts/wave0/topic-a'), { recursive: true });
  writeFileSync(path.join(dir, 'artifacts/wave0/topic-a/source.yaml'), `- url: ${sourceUrl}
  title: Wave0 source
  retrieved_date: 2026-07-14
  topic_tag: topic-a
`);
  writeFileSync(path.join(dir, 'reference/00-shared-topic-a.md'), `${referenceContent({
    source_url: sourceUrl,
    related_topic: 'all',
    evidence_role: 'foundation',
    accessed_at: '2026-07-14',
  })}\n`);
  writeFileSync(path.join(dir, 'reference/_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| 00-shared-topic-a.md | primary | expert | Tier 2 | all | wave0_foundation | accepted | 2026-07-14 |',
    '',
  ].join('\n'));
  writeFileSync(path.join(dir, 'reference/README.md'), '# References\n\nSubmitted Wave0 evidence.\n');
  writeTraceEvents(dir, [
    ...witnessedHandoffEvents({
      sourceGate: 'seed-topics-ready',
      phase: 'seed-topics',
      sourceNode: 'phases/phase-seed-topics.md',
      targetNode: 'phases/phase-wave0.md',
    }),
    { event: 'wave0_completion', ts: new Date().toISOString() },
  ]);

  let queue = createQueue(path.basename(dir));
  queue = enqueue(queue, makeItem({
    queue_item_id: 'topic-a',
    title: 'Wave0 source intake for Topic A',
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', topic_slug: 'topic-a', wave: 0 },
    required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
    writes_to: ['artifacts/wave0/topic-a/source.yaml'],
  }));
  saveQueue(dir, queue);
  return { dir, sourceUrl };
}

function claimThroughCli(dir) {
  const claimed = run(WORK_UNIT_CLI, [
    'claim', dir, '--phase', 'wave0', '--count', '1',
    '--actor-outcome', 'available', '--actor-source', 'native_probe',
    '--actor-role-key', 'dpt-source-intake', '--actor-reason', 'probe_succeeded',
    '--execution-actor', 'delegated_subagent',
  ]);
  assert.equal(claimed.status, 0, claimed.stderr || claimed.stdout);
  const workId = JSON.parse(claimed.stdout).claimed_work_ids[0];
  return loadWorkUnitIndex(dir).work_units[workId];
}

function prepareCandidate(dir, sourceUrl, record) {
  const cacheTrail = '_cache/wave0/primary/topic-a/wave0-source';
  mkdirSync(path.join(dir, cacheTrail), { recursive: true });
  writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(dir, cacheTrail, 'page.md'), `# Captured Page\n\nFetched source content from ${sourceUrl}.\n`);
  writeFileSync(path.join(dir, cacheTrail, 'meta.json'), `${JSON.stringify({ url: sourceUrl })}\n`);
  writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: new Date().toISOString(),
  })}\n`);
  const resultPath = path.join(dir, '_tmp', `${record.work_id}.result.json`);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary: 'Wave0 source intake complete',
    output_files: [
      { path: 'artifacts/wave0/topic-a/source.yaml', role: 'source_yaml' },
    ],
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  return resultPath;
}

function submitThroughCli(dir, sourceUrl, { late }) {
  const record = claimThroughCli(dir);
  const resultPath = prepareCandidate(dir, sourceUrl, record);
  if (late) {
    const timeout = run(WORK_UNIT_CLI, [
      'timeout', dir, '--work-id', record.work_id,
      '--reason', 'controlled-declaration-recovery-fixture', '--force',
    ]);
    assert.equal(timeout.status, 0, timeout.stderr || timeout.stdout);
  }
  const operation = late ? 'late-submit' : 'submit';
  const args = [operation, dir, '--work-id', record.work_id, '--result', resultPath];
  if (late) args.push('--reason', 'controlled late result acceptance');
  const submitted = run(WORK_UNIT_CLI, args);
  assert.equal(submitted.status, 0, submitted.stderr || submitted.stdout);
  return { record, output: JSON.parse(submitted.stdout) };
}

function runGate(dir) {
  return run(GATE_CLI, ['--bundle', dir, '--current-node', 'phases/phase-wave0.md']);
}

describe('BUG-088 declaration fault recovery through real CLI', () => {
  after(() => {
    for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
  });

  for (const late of [false, true]) {
    it(`restores the original ${late ? 'late' : 'normal'} submit row and returns Gate to normal authority`, () => {
      const { dir, sourceUrl } = createBundle(late ? 'late' : 'normal');
      const submitted = submitThroughCli(dir, sourceUrl, { late });
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      const originalBytes = readFileSync(ledgerPath);
      const [originalRow] = readWorkUnitLedgerRows(dir);
      assert.equal(originalRow.ledger_record_hash, submitted.output.ledger_record_hash);
      rmSync(ledgerPath);

      const failedGate = runGate(dir);
      assert.equal(failedGate.status, 1, failedGate.stderr || failedGate.stdout);
      const failedOutput = JSON.parse(failedGate.stdout);
      const hint = failedOutput.hints.find((entry) => entry.rule_id === 'wave0_work_unit_submission_presence');
      assert.ok(hint);
      assert.equal(hint.repair_kind, 'engine_operation');
      assert.match(hint.write_to, /operate-work-unit\.mjs recover-declaration/);
      assert.match(hint.write_to, new RegExp(submitted.record.work_id));

      const recovered = run(WORK_UNIT_CLI, ['recover-declaration', dir, '--work-id', submitted.record.work_id]);
      assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
      const recoveredOutput = JSON.parse(recovered.stdout);
      assert.equal(recoveredOutput.ledger_record_hash, originalRow.ledger_record_hash);
      assert.deepEqual(readFileSync(ledgerPath), originalBytes);
      assert.deepEqual(readWorkUnitLedgerRows(dir), [originalRow]);

      const recoveredGate = runGate(dir);
      const recoveredGateOutput = JSON.parse(recoveredGate.stdout);
      assert.equal(recoveredGateOutput.check.failed_rule_ids.includes('wave0_work_unit_submission_presence'), false);
      assert.equal(recoveredGateOutput.check.failed_rule_ids.includes('submitted_projection_authority'), false);
    });
  }
});
