// @impl DEW-002, DEW-013, FRE-005

import {
  execFileSync as execFileSyncProduction,
  spawn as spawnProduction,
  spawnSync as spawnSyncProduction,
} from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, watch, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { makeItem } from '../../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { createQueue, enqueue, saveQueue } from '../../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { WORK_UNIT_OUTPUT_LEDGER, createWorkUnit, loadWorkUnitIndex, transactionDir, workUnitIndexPath } from '../../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

const CLI = path.resolve('DPT_FRAMEWORK/cli/operate-work-unit.mjs');
const AVAILABLE_ACTOR_ARGS = ['--actor-outcome', 'available', '--actor-source', 'native_probe', '--actor-role-key', 'dpt-source-intake', '--actor-reason', 'probe_succeeded', '--execution-actor', 'delegated_subagent'];

function withExplicitActor(args) {
  if (args[0] === CLI && args[1] === 'claim' && args[2] && !String(args[2]).startsWith('-') && !args.includes('--actor-outcome')) return [...args, ...AVAILABLE_ACTOR_ARGS];
  return args;
}

function execFileSync(file, args, options) {
  return execFileSyncProduction(file, withExplicitActor(args), options);
}

function spawnSync(file, args, options) {
  return spawnSyncProduction(file, withExplicitActor(args), options);
}

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'wu-cli-'));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function assertNoFlagRuntimeDirs(parentDir) {
  for (const name of ['--help', '--bundle']) {
    assert.equal(existsSync(path.join(parentDir, name)), false, `${name}/ should not be created`);
  }
}

function recursiveSnapshot(rootDir) {
  const entries = {};
  function visit(currentDir, relativeDir = '') {
    for (const name of readdirSync(currentDir).sort()) {
      const relativePath = relativeDir ? path.join(relativeDir, name) : name;
      const fullPath = path.join(currentDir, name);
      const stat = lstatSync(fullPath);
      if (stat.isDirectory()) {
        entries[`${relativePath}/`] = 'directory';
        visit(fullPath, relativePath);
      } else if (stat.isSymbolicLink()) {
        entries[relativePath] = `symlink:${readFileSync(fullPath, 'utf-8')}`;
      } else {
        entries[relativePath] = readFileSync(fullPath).toString('base64');
      }
    }
  }
  visit(rootDir);
  return entries;
}

function queueItem(overrides = {}) {
  return makeItem({
    queue_item_id: 'queue-source-topic-a',
    title: 'Source intake topic A',
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: {
      wave: 0,
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      topic_slug: 'topic-a',
    },
    required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
    writes_to: ['artifacts/wave0/topic-a/source.yaml'],
    ...overrides,
  });
}

function writeCanonicalPlan(dir) {
  writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: test
derived_topic_count: 1
topic_registry_version: "2"
topic_registry:
  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000
    id: "01"
    slug: topic-a
    title: Topic A
    must_answer: ["A?"]
    scope_role: primary
    depends_on_topic_uids: []
    previous_layouts: []
---
# Plan
`);
}

function currentWave0QueueItem(id, overrides = {}) {
  return queueItem({
    queue_item_id: id,
    payload: {
      wave: 0,
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      topic_slug: 'topic-a',
    },
    required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
    writes_to: ['artifacts/wave0/topic-a/source.yaml'],
    ...overrides,
  });
}

function saveQueueWith(dir, items) {
  if (!existsSync(path.join(dir, 'rb_plan.md')) && items.some((item) => item.kind === 'wave0_source_intake')) {
    writeCanonicalPlan(dir);
  }
  let queue = createQueue(path.basename(dir));
  for (const item of items) queue = enqueue(queue, item);
  saveQueue(dir, queue);
}

function writeValidSubmitFiles(dir, record) {
  const outputPath = `reference/${record.work_id}.md`;
  mkdirSync(path.join(dir, 'reference'), { recursive: true });
  writeFileSync(path.join(dir, outputPath), '# Source\n\nKey Facts\n');
  const sourcePath = 'artifacts/wave0/topic-a/source.yaml';
  mkdirSync(path.dirname(path.join(dir, sourcePath)), { recursive: true });
  writeFileSync(path.join(dir, sourcePath), [
    '- url: https://example.com/source',
    '  title: Example source',
    '  retrieved_date: 2026-07-20',
    '  topic_tag: topic-a',
    '',
  ].join('\n'));

  const cacheTrail = `_cache/wave0/primary/${record.queue_item_id}/s01_source`;
  mkdirSync(path.join(dir, cacheTrail), { recursive: true });
  writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(dir, cacheTrail, 'page.md'), '# Captured Page\n\nFetched content capture for https://example.com/source. This body preserves the source text used by the work unit.\n');
  writeFileSync(path.join(dir, cacheTrail, 'meta.json'), '{"url":"https://example.com/source"}\n');

  writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-06T00:00:00.000Z',
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
    summary: 'done',
    output_files: [
      { path: outputPath, role: 'reference', source_url: 'https://example.com/source', source_slug: 'source' },
      { path: sourcePath, role: 'source_yaml' },
    ],
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  return resultPath;
}

function expireClaimedWorkUnit(dir, workId) {
  const index = loadWorkUnitIndex(dir);
  const record = index.work_units[workId];
  const claimedMs = Date.now() - record.timeout_ms - 60000;
  record.claimed_at = new Date(claimedMs).toISOString();
  record.deadline_at = new Date(claimedMs + record.timeout_ms).toISOString();
  index.work_units[workId] = record;
  writeFileSync(workUnitIndexPath(dir), `${JSON.stringify(index, null, 2)}\n`);

  const queuePath = path.join(dir, 'rb_queue.json');
  const queue = JSON.parse(readFileSync(queuePath, 'utf-8'));
  if (queue.delegated_in_flight?.[record.queue_item_id]) {
    queue.delegated_in_flight[record.queue_item_id] = {
      ...queue.delegated_in_flight[record.queue_item_id],
      claimed_at: record.claimed_at,
      timeout_ms: record.timeout_ms,
      deadline_at: record.deadline_at,
    };
    writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  }
  return record;
}

function writeReceiptProgress(dir, record) {
  writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    schema_version: 'work-unit.receipt-event.v1',
    event: 'fetch_batch_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: new Date().toISOString(),
  })}\n`);
}

function writeAssignedSubmitReadyResult(dir, record) {
  const tmpResultPath = writeValidSubmitFiles(dir, record);
  const assignedPath = path.join(dir, record.paths.result_ref);
  mkdirSync(path.dirname(assignedPath), { recursive: true });
  writeFileSync(assignedPath, readFileSync(tmpResultPath, 'utf-8'));
  return assignedPath;
}

function writeAssignedRepairableResult(dir, record) {
  const assignedPath = path.join(dir, record.paths.result_ref);
  mkdirSync(path.dirname(assignedPath), { recursive: true });
  writeFileSync(assignedPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary: 'repairable draft',
    output_files: [],
    cache_trails: [],
  }, null, 2)}\n`);
  writeReceiptProgress(dir, record);
  return assignedPath;
}

describe('operate-work-unit inspect', () => {
  it('preflights a mixed claim batch before every allocation or authority mutation', () => {
    const dir = tempBundle();
    try {
      writeCanonicalPlan(dir);
      saveQueueWith(dir, [
        currentWave0QueueItem('queue-valid-first'),
        currentWave0QueueItem('queue-invalid-second', {
          payload: {
            wave: 0,
            topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
            topic_slug: 'topic-a',
            nested: { direct_contract_id: 'forbidden-selector' },
          },
        }),
      ]);
      const before = recursiveSnapshot(dir);
      const result = spawnSync('node', [CLI, 'claim', dir, '--phase', 'wave0', '--count', '2'], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(`${result.stdout}\n${result.stderr}`, /queue-invalid-second|direct_contract_id/);
      assert.deepEqual(recursiveSnapshot(dir), before);
      assert.equal(existsSync(workUnitIndexPath(dir)), false);
      assert.equal(existsSync(transactionDir(dir)), false);
    } finally {
      cleanup(dir);
    }
  });

  it('preserves sanctioned non-selector output customization through claim projection', () => {
    const dir = tempBundle();
    try {
      writeCanonicalPlan(dir);
      saveQueueWith(dir, [currentWave0QueueItem('queue-customized', {
        output_contract: {
          required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'summary', 'output_files', 'cache_trails'],
          output_files: {
            required: true,
            allowed_roles: ['reference', 'source_yaml', 'other'],
            reference_requires_source_url: true,
          },
        },
      })]);
      const result = spawnSync('node', [CLI, 'claim', dir, '--phase', 'wave0', '--count', '1'], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout);
      const record = loadWorkUnitIndex(dir).work_units[output.claimed_work_ids[0]];
      const manifest = JSON.parse(readFileSync(path.join(dir, record.paths.manifest_ref), 'utf8'));
      assert.equal(record.assignment_contract_version, 'work-unit.assignment.v1');
      assert.ok(manifest.output_contract.required_result_fields.includes('summary'));
      assert.deepEqual(manifest.output_contract.required_outputs, [{
        path: 'artifacts/wave0/topic-a/source.yaml',
        role: 'source_yaml',
        direct_contract: 'wave0.source-metadata-array.v1',
      }]);
    } finally {
      cleanup(dir);
    }
  });

  it('rechecks planned prefix hashes inside the transaction before its first mutation', async () => {
    const dir = tempBundle();
    let child;
    let watcher;
    try {
      writeCanonicalPlan(dir);
      const padding = 'x'.repeat(512 * 1024);
      const items = Array.from({ length: 10 }, (_, index) => currentWave0QueueItem(`queue-race-${index}`, {
        payload: {
          wave: 0,
          topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
          topic_slug: 'topic-a',
          non_selector_padding: padding,
        },
      }));
      saveQueueWith(dir, items);
      mkdirSync(path.join(dir, '_work_units', '_transactions'), { recursive: true });

      let stdout = '';
      let stderr = '';
      let intercepted = false;
      const interceptedPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('claim transaction lock was not observed')), 10000);
        watcher = watch(path.join(dir, '_work_units'), { recursive: true }, (_event, filename) => {
          if (intercepted || !String(filename || '').endsWith('.lock')) return;
          intercepted = true;
          process.kill(child.pid, 'SIGSTOP');
          const queuePath = path.join(dir, 'rb_queue.json');
          const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
          queue.active_window[0].updated_at = '2026-07-20T00:00:01.000Z';
          writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
          process.kill(child.pid, 'SIGCONT');
          clearTimeout(timeout);
          resolve();
        });
      });

      child = spawnProduction('node', withExplicitActor([
        CLI,
        'claim',
        dir,
        '--phase',
        'wave0',
        '--count',
        '10',
      ]), { stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      const exited = new Promise((resolve) => child.once('close', (status) => resolve(status)));

      await interceptedPromise;
      const status = await exited;
      watcher.close();
      watcher = null;

      assert.equal(status, 1, `${stdout}\n${stderr}`);
      assert.match(`${stdout}\n${stderr}`, /prefix|snapshot|drift|queue-race-0/i);
      const queue = JSON.parse(readFileSync(path.join(dir, 'rb_queue.json'), 'utf8'));
      assert.equal(queue.active_window.length, 10);
      assert.deepEqual(queue.delegated_in_flight, {});
      assert.equal(existsSync(workUnitIndexPath(dir)), false);
      const transactions = readdirSync(transactionDir(dir)).map((name) => (
        JSON.parse(readFileSync(path.join(transactionDir(dir), name), 'utf8'))
      ));
      assert.equal(transactions.length, 1);
      assert.equal(transactions[0].status, 'failed');
      assert.equal(readdirSync(path.join(dir, '_work_units')).some((name) => /^wave0$/.test(name)), false);
      const tracePath = path.join(dir, 'rb_trace.jsonl');
      const trace = existsSync(tracePath) ? readFileSync(tracePath, 'utf8') : '';
      assert.doesNotMatch(trace, /work_unit_claimed|work_unit_batch_claimed/);
    } finally {
      watcher?.close();
      if (child && child.exitCode === null) child.kill('SIGKILL');
      cleanup(dir);
    }
  });

  it('rejects a same-name nested bundle root without directory, transaction, trace, log, rejection, or beacon side effects', () => {
    for (const command of ['inspect', 'dry-submit', 'submit']) {
      const dir = tempBundle();
      try {
        saveQueueWith(dir, [queueItem()]);
        const claimStdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
        const workId = JSON.parse(claimStdout).claimed_work_ids[0];
        const record = loadWorkUnitIndex(dir).work_units[workId];
        const resultPath = writeValidSubmitFiles(dir, record);
        const beaconPath = path.join(dir, record.paths.beacon_ref);
        const beaconBefore = readFileSync(beaconPath);
        const before = recursiveSnapshot(dir);
        const nestedName = path.basename(dir);
        const args = command === 'inspect'
          ? [CLI, command, nestedName]
          : [CLI, command, nestedName, '--work-id', workId, '--result', resultPath];

        const result = spawnSync(process.execPath, args, {
          cwd: dir,
          encoding: 'utf-8',
          timeout: 5000,
        });

        assert.notEqual(result.status, 0, `${command} unexpectedly accepted ${path.join(dir, nestedName)}`);
        assert.match(`${result.stdout}\n${result.stderr}`, /work-unit index.*does not exist|missing existing work-unit authority/i);
        assert.equal(existsSync(path.join(dir, nestedName)), false, `${command} created a nested bundle root`);
        assert.deepEqual(recursiveSnapshot(dir), before, `${command} mutated the valid parent bundle`);
        assert.deepEqual(readFileSync(beaconPath), beaconBefore, `${command} changed the immutable beacon`);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('uses one beacon root binding for inspect, dry-submit, and submit without rewriting the immutable beacon', () => {
    for (const command of ['inspect', 'dry-submit', 'submit']) {
      const dir = tempBundle();
      try {
        saveQueueWith(dir, [queueItem()]);
        const claimStdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
        const workId = JSON.parse(claimStdout).claimed_work_ids[0];
        const record = loadWorkUnitIndex(dir).work_units[workId];
        const resultPath = writeValidSubmitFiles(dir, record);
        const beaconPath = path.join(dir, record.paths.beacon_ref);
        const beacon = JSON.parse(readFileSync(beaconPath, 'utf-8'));
        beacon.bundle_dir = path.join(dir, path.basename(dir));
        writeFileSync(beaconPath, `${JSON.stringify(beacon, null, 2)}\n`);
        const driftedBeacon = readFileSync(beaconPath);
        const args = command === 'inspect'
          ? [CLI, command, dir]
          : [CLI, command, dir, '--work-id', workId, '--result', resultPath];

        const result = spawnSync(process.execPath, args, {
          encoding: 'utf-8',
          timeout: 5000,
        });

        assert.notEqual(result.status, 0, `${command} accepted a drifted beacon root`);
        assert.match(`${result.stdout}\n${result.stderr}`, /beacon\/bundle root mismatch/i);
        assert.deepEqual(readFileSync(beaconPath), driftedBeacon, `${command} rewrote the immutable beacon`);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('handles help and suspicious bundle arguments before runtime side effects', () => {
    const parentDir = tempBundle();
    try {
      const topHelp = spawnSync(process.execPath, [CLI, '--help'], {
        cwd: parentDir,
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(topHelp.status, 0);
      assert.match(topHelp.stderr, /Usage:/);
      assertNoFlagRuntimeDirs(parentDir);

      const subHelp = spawnSync(process.execPath, [CLI, 'claim', '--help'], {
        cwd: parentDir,
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.notEqual(subHelp.status, 0);
      assert.match(subHelp.stderr, /Usage:|help/i);
      assertNoFlagRuntimeDirs(parentDir);

      const suspiciousBundle = spawnSync(process.execPath, [CLI, 'claim', '--bundle', '--phase', 'wave0'], {
        cwd: parentDir,
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.notEqual(suspiciousBundle.status, 0);
      assert.match(suspiciousBundle.stderr, /suspicious bundle argument/i);
      assertNoFlagRuntimeDirs(parentDir);

      const unsupportedBundleFlag = spawnSync(process.execPath, [CLI, '--bundle', '--help'], {
        cwd: parentDir,
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.notEqual(unsupportedBundleFlag.status, 0);
      assert.match(unsupportedBundleFlag.stderr, /Usage:|help|bundle/i);
      assertNoFlagRuntimeDirs(parentDir);
    } finally {
      cleanup(parentDir);
    }
  });

  it('claim allocates a delegated queue-front work unit', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const stdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0', '--count', '1'], { encoding: 'utf-8' });
      const out = JSON.parse(stdout);
      assert.equal(out.claimed_count, 1);
      assert.deepEqual(out.claimed_work_ids, ['wu-w0-b000-src-i0001']);
      assert.deepEqual(out.continuation, {
        next_action: 'inspect_and_poll_claimed_work',
        work_ids: out.claimed_work_ids,
      });
      assert.match(JSON.stringify(out.prompt_refs), /_work_units\/wave0\/wu-w0-b000-src-i0001\/task\.md/);
      assert.equal(out.prompt_refs[0].bundle_dir, path.resolve(dir));
      assert.equal(out.prompt_refs[0].task_path, path.join(path.resolve(dir), out.prompt_refs[0].task_ref));
      assert.match(out.prompt_refs[0].spawn_prompt, /Completion Contract/);
      assert.doesNotMatch(out.prompt_refs[0].spawn_prompt, /runtime-receipt\.jsonl/);
      assert.doesNotMatch(out.prompt_refs[0].spawn_prompt, /result\.schema\.json/);
      assert.doesNotMatch(out.prompt_refs[0].spawn_prompt, /runtime_refs diagnostic metadata/);
    } finally {
      cleanup(dir);
    }
  });

  it('claim reports missing actor observation with one same-command repair and no allocation', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const queuePath = path.join(dir, 'rb_queue.json');
      const before = readFileSync(queuePath);
      const result = spawnSyncProduction(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0', '--count', '1'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(result.status, 1);
      const out = JSON.parse(result.stdout);
      assert.equal(out.reason_code, 'observation_required');
      assert.equal(out.repair_kind, 'agent_action');
      assert.match(out.missing_fact, /observation/i);
      assert.match(out.rerun, /operate-work-unit\.mjs claim/);
      assert.equal(existsSync(workUnitIndexPath(dir)), false);
      assert.deepEqual(readFileSync(queuePath), before);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects supplied empty or contradictory actor observations before trace or allocation mutation', () => {
    for (const actorArgs of [
      ['--actor-outcome='],
      ['--actor-outcome', 'available', '--actor-source', 'not_observed', '--actor-role-key', 'dpt-source-intake', '--actor-reason', 'probe_succeeded'],
    ]) {
      const dir = tempBundle();
      try {
        saveQueueWith(dir, [queueItem()]);
        const before = recursiveSnapshot(dir);
        const result = spawnSyncProduction(process.execPath, [
          CLI, 'claim', dir, '--phase', 'wave0', '--count', '1', ...actorArgs,
        ], { encoding: 'utf-8', timeout: 5000 });
        assert.equal(result.status, 1, result.stderr || result.stdout);
        const out = JSON.parse(result.stdout);
        assert.equal(out.reason_code, 'actor_observation_input_invalid');
        assert.equal(out.actor_preflight.verdict, 'invalid_input');
        assert.equal(out.actor_observation_contract.planned_role_key, 'dpt-source-intake');
        assert.equal(out.actor_observation_contract.legal_tuples.length, 7);
        assert.ok(out.actor_preflight.input_issues.length > 0);
        assert.equal(out.claimed_count, 0);
        assert.deepEqual(recursiveSnapshot(dir), before);
        assert.equal(existsSync(workUnitIndexPath(dir)), false);
        assert.equal(existsSync(path.join(dir, 'rb_trace.jsonl')), false);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('claim reports unnecessary fallback with the exact delegated-subagent rerun', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const queuePath = path.join(dir, 'rb_queue.json');
      const before = readFileSync(queuePath);
      const result = spawnSyncProduction(process.execPath, [
        CLI, 'claim', dir, '--phase', 'wave0', '--count', '1',
        '--actor-outcome', 'available', '--actor-source', 'native_probe',
        '--actor-role-key', 'dpt-source-intake', '--actor-reason', 'probe_succeeded',
        '--execution-actor', 'phase_agent_fallback',
      ], { encoding: 'utf-8', timeout: 5000 });
      assert.equal(result.status, 1);
      const out = JSON.parse(result.stdout);
      assert.equal(out.reason_code, 'fallback_unnecessary');
      assert.equal(out.repair_kind, 'engine_operation');
      assert.match(out.rerun, /--execution-actor delegated_subagent/);
      assert.equal(existsSync(workUnitIndexPath(dir)), false);
      assert.deepEqual(readFileSync(queuePath), before);
    } finally {
      cleanup(dir);
    }
  });

  it('claim omits continuation when no work unit is claimed', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem({
        queue_item_id: 'queue-direct',
        title: 'Direct work',
        targets: { controller: 'main-agent' },
        kind: 'main_agent_followup',
        producer_rule: 'manual',
      })]);
      const result = spawnSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0', '--count', '1'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(result.status, 1);
      const out = JSON.parse(result.stdout);
      assert.equal(out.claimed_count, 0);
      assert.equal(out.continuation, undefined);
    } finally {
      cleanup(dir);
    }
  });

  it('passes for a consistent work-unit index and envelope', () => {
    const dir = tempBundle();
    try {
      createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      const stdout = execFileSync(process.execPath, [CLI, 'inspect', dir], { encoding: 'utf-8' });
      const out = JSON.parse(stdout);
      assert.equal(out.passed, true);
    } finally {
      cleanup(dir);
    }
  });

  it('submits a claimed work unit through the CLI', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claimStdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const claimOut = JSON.parse(claimStdout);
      const workId = claimOut.claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeValidSubmitFiles(dir, record);

      const submitStdout = execFileSync(process.execPath, [CLI, 'submit', dir, '--work-id', workId, '--result', resultPath], { encoding: 'utf-8' });
      const out = JSON.parse(submitStdout);
      assert.equal(out.ok, true);
      assert.equal(out.status, 'submitted');
      assert.equal(out.queue.delegated_in_flight[record.queue_item_id], undefined);
      assert.equal(out.queue.terminal_history.some((entry) => entry.queue_item_id === record.queue_item_id && entry.work_id === workId), true);
      const rows = readFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER), 'utf-8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
      assert.equal(rows.length, 1);
      assert.equal(rows[0].work_id, workId);
      assert.equal(rows[0].queue_item_id, record.queue_item_id);
    } finally {
      cleanup(dir);
    }
  });

  it('dry-submits a valid claimed work unit through the CLI without completing it', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claimStdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const workId = JSON.parse(claimStdout).claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeValidSubmitFiles(dir, record);

      const result = spawnSync(process.execPath, [CLI, 'dry-submit', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const out = JSON.parse(result.stdout);
      assert.equal(out.ok, true);
      assert.equal(out.dry_run, true);
      assert.equal(out.side_effects, false);
      assert.equal(out.expected_submit, 'pass');
      assert.deepEqual(out.violations, []);
      assert.equal(existsSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), false);
      assert.equal(loadWorkUnitIndex(dir).work_units[workId].status, 'claimed');
    } finally {
      cleanup(dir);
    }
  });

  it('dry-submit failure exits 1 with structured JSON on stdout and no submit rejection', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claimStdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const workId = JSON.parse(claimStdout).claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeValidSubmitFiles(dir, record);
      const resultJson = JSON.parse(readFileSync(resultPath, 'utf-8'));
      resultJson.output_files[0].role = 'question_list';
      writeFileSync(resultPath, `${JSON.stringify(resultJson, null, 2)}\n`);

      const result = spawnSync(process.execPath, [CLI, 'dry-submit', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(result.status, 1);
      const out = JSON.parse(result.stdout);
      assert.equal(out.ok, false);
      assert.equal(out.dry_run, true);
      assert.equal(out.side_effects, false);
      assert.equal(out.expected_submit, 'fail');
      assert.ok(out.reason_codes.includes('missing_output'));
      assert.ok(out.violations.some((item) => item.phase === 'output_files' && /role 'question_list'.*allowed roles/i.test(item.message)));
      assert.equal(existsSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), false);
      assert.equal(loadWorkUnitIndex(dir).work_units[workId].last_submit_rejection, undefined);
    } finally {
      cleanup(dir);
    }
  });

  it('uses the selected dry-submit root for every normal formal-rejection repair field', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claim = JSON.parse(execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' }));
      const workId = claim.claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeAssignedRepairableResult(dir, record);

      const dry = spawnSync(process.execPath, [CLI, 'dry-submit', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf-8', timeout: 5000,
      });
      assert.equal(dry.status, 1, dry.stderr || dry.stdout);
      const dryOut = JSON.parse(dry.stdout);
      assert.ok(dryOut.selected_primary);

      const formal = spawnSync(process.execPath, [CLI, 'submit', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf-8', timeout: 5000,
      });
      assert.equal(formal.status, 1, formal.stderr || formal.stdout);
      const formalOut = JSON.parse(formal.stdout);
      assert.equal(formalOut.recommended_action, dryOut.recommended_action);
      assert.equal(formalOut.primary_root_code, dryOut.primary_root_code);
      for (const field of ['repair_kind', 'missing_fact', 'write_to', 'rerun']) {
        assert.equal(formalOut[field], dryOut.selected_primary[field], field);
      }
    } finally {
      cleanup(dir);
    }
  });

  it('masks dependent output, cache, source, and direct-output repairs when the candidate result is absent', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claim = JSON.parse(execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' }));
      const workId = claim.claimed_work_ids[0];
      const missingResult = path.join(dir, '_tmp', 'missing-result.json');
      const result = spawnSync(process.execPath, [CLI, 'dry-submit', dir, '--work-id', workId, '--result', missingResult], {
        encoding: 'utf-8', timeout: 5000,
      });
      assert.equal(result.status, 1, result.stderr || result.stdout);
      const out = JSON.parse(result.stdout);
      assert.ok(out.violations.some((violation) => violation.phase === 'result'));
      assert.ok(out.violations.every((violation) => !['output_files', 'cache_trails', 'source_claims', 'direct_output'].includes(violation.phase)));
    } finally {
      cleanup(dir);
    }
  });

  it('emits complete claim JSON when existing in-flight records make the response large', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [
        queueItem(),
        queueItem({ queue_item_id: 'queue-source-topic-a-2' }),
        queueItem({ queue_item_id: 'queue-source-topic-a-3' }),
        queueItem({ queue_item_id: 'queue-source-topic-a-4' }),
      ]);

      for (let i = 0; i < 4; i += 1) {
        const result = spawnSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], {
          encoding: 'utf-8',
          timeout: 5000,
          maxBuffer: 10 * 1024 * 1024,
        });
        assert.equal(result.status, 0, `claim ${i + 1} failed: ${result.stderr || result.stdout}`);
        const parsed = JSON.parse(result.stdout);
        assert.equal(parsed.claimed_count, 1);
        assert.ok(parsed.claimed_work_ids[0]);
      }
    } finally {
      cleanup(dir);
    }
  });

  it('times out a claimed work unit and lets CLI claim a replacement', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claimStdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const workId = JSON.parse(claimStdout).claimed_work_ids[0];
      expireClaimedWorkUnit(dir, workId);

      const timeoutStdout = execFileSync(process.execPath, [CLI, 'timeout', dir, '--work-id', workId, '--reason', 'deadline-expired'], { encoding: 'utf-8' });
      const timeoutOut = JSON.parse(timeoutStdout);
      assert.equal(timeoutOut.ok, true);
      assert.equal(timeoutOut.status, 'timed_out');

      const retryStdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const retryOut = JSON.parse(retryStdout);
      assert.deepEqual(retryOut.claimed_work_ids, ['wu-w0-b000-src-i0002']);
    } finally {
      cleanup(dir);
    }
  });

  it('late-submits a timed-out work unit through the CLI', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claimStdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const workId = JSON.parse(claimStdout).claimed_work_ids[0];
      const agedRecord = expireClaimedWorkUnit(dir, workId);
      const timeoutStdout = execFileSync(process.execPath, [CLI, 'timeout', dir, '--work-id', workId, '--reason', 'deadline-expired'], { encoding: 'utf-8' });
      assert.equal(JSON.parse(timeoutStdout).status, 'timed_out');

      const resultPath = writeValidSubmitFiles(dir, agedRecord);
      const missingReason = spawnSync(process.execPath, [CLI, 'late-submit', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(missingReason.status, 1);
      assert.equal(JSON.parse(missingReason.stdout).reason_code, 'late_accept_reason_required');

      const late = spawnSync(process.execPath, [CLI, 'late-submit', dir, '--work-id', workId, '--result', resultPath, '--reason', 'late result arrived'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(late.status, 0, late.stderr || late.stdout);
      const out = JSON.parse(late.stdout);
      assert.equal(out.ok, true);
      assert.equal(out.late_accept, true);
      assert.equal(out.status, 'submitted');
      assert.equal(out.queue.delegated_in_flight[agedRecord.queue_item_id], undefined);
      assert.equal(out.queue.terminal_history.length, 1);
      const rows = readFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER), 'utf-8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
      assert.equal(rows.length, 1);
      assert.equal(rows[0].late_accept, true);
      assert.equal(rows[0].terminal_status_before_accept, 'timed_out');
    } finally {
      cleanup(dir);
    }
  });

  it('recovers a missing submitted declaration through the existing CLI without --result', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claimStdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const workId = JSON.parse(claimStdout).claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeValidSubmitFiles(dir, record);
      const submitStdout = execFileSync(process.execPath, [CLI, 'submit', dir, '--work-id', workId, '--result', resultPath], { encoding: 'utf-8' });
      const submitted = JSON.parse(submitStdout);
      const originalLedger = readFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER));
      rmSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER));

      const recovered = spawnSync(process.execPath, [CLI, 'recover-declaration', dir, '--work-id', workId], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
      const out = JSON.parse(recovered.stdout);
      assert.equal(out.ok, true);
      assert.equal(out.recovered, true);
      assert.equal(out.ledger_record_hash, submitted.ledger_record_hash);
      assert.deepEqual(readFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), originalLedger);

      const repeated = spawnSync(process.execPath, [CLI, 'recover-declaration', dir, '--work-id', workId], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(repeated.status, 0, repeated.stderr || repeated.stdout);
      assert.equal(JSON.parse(repeated.stdout).changed, false);

      const rejectedResultArg = spawnSync(process.execPath, [CLI, 'recover-declaration', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(rejectedResultArg.status, 1);
      assert.match(rejectedResultArg.stderr, /does not accept --result/);
    } finally {
      cleanup(dir);
    }
  });

  it('timeout-preflight CLI emits structured eligible and guard-refusal JSON', () => {
    const eligibleDir = tempBundle();
    const refusedDir = tempBundle();
    try {
      saveQueueWith(eligibleDir, [queueItem()]);
      const eligibleClaim = execFileSync(process.execPath, [CLI, 'claim', eligibleDir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const eligibleWorkId = JSON.parse(eligibleClaim).claimed_work_ids[0];
      expireClaimedWorkUnit(eligibleDir, eligibleWorkId);
      const eligible = spawnSync(process.execPath, [CLI, 'timeout-preflight', eligibleDir, '--work-id', eligibleWorkId], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(eligible.status, 0, eligible.stderr || eligible.stdout);
      const eligibleOut = JSON.parse(eligible.stdout);
      assert.equal(eligibleOut.timeout_eligible, true);
      assert.equal(eligibleOut.check, true);
      assert.equal(eligibleOut.recommended_action, 'timeout');

      saveQueueWith(refusedDir, [queueItem()]);
      const refusedClaim = execFileSync(process.execPath, [CLI, 'claim', refusedDir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const refusedWorkId = JSON.parse(refusedClaim).claimed_work_ids[0];
      const refusedRecord = loadWorkUnitIndex(refusedDir).work_units[refusedWorkId];
      writeReceiptProgress(refusedDir, refusedRecord);
      const beforeIndex = readFileSync(workUnitIndexPath(refusedDir), 'utf-8');
      const beforeQueue = readFileSync(path.join(refusedDir, 'rb_queue.json'), 'utf-8');
      const refused = spawnSync(process.execPath, [CLI, 'timeout-preflight', refusedDir, '--work-id', refusedWorkId], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(refused.status, 1);
      const refusedOut = JSON.parse(refused.stdout);
      assert.equal(refusedOut.timeout_eligible, false);
      assert.equal(['wait', 'repair', 'submit', 'inspect', 'block'].includes(refusedOut.recommended_action), true);
      assert.equal(readFileSync(workUnitIndexPath(refusedDir), 'utf-8'), beforeIndex);
      assert.equal(readFileSync(path.join(refusedDir, 'rb_queue.json'), 'utf-8'), beforeQueue);
    } finally {
      cleanup(eligibleDir);
      cleanup(refusedDir);
    }
  });

  it('forwards only the dry-submit action and primary code into timeout-preflight candidate advice', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claim = JSON.parse(execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' }));
      const workId = claim.claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeAssignedRepairableResult(dir, record);
      const dry = JSON.parse(spawnSync(process.execPath, [CLI, 'dry-submit', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf-8', timeout: 5000,
      }).stdout);
      const preflight = spawnSync(process.execPath, [CLI, 'timeout-preflight', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf-8', timeout: 5000,
      });
      const out = JSON.parse(preflight.stdout);
      assert.deepEqual(out.candidate_projection, {
        recommended_action: dry.recommended_action,
        primary_root_code: dry.primary_root_code,
      });
      assert.deepEqual(Object.keys(out.candidate_projection).sort(), ['primary_root_code', 'recommended_action']);
    } finally {
      cleanup(dir);
    }
  });

  it('default timeout refuses progress-positive attempts and force records audit diagnostics', () => {
    const refusedDir = tempBundle();
    const forcedDir = tempBundle();
    try {
      saveQueueWith(refusedDir, [queueItem()]);
      const refusedClaim = execFileSync(process.execPath, [CLI, 'claim', refusedDir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const refusedWorkId = JSON.parse(refusedClaim).claimed_work_ids[0];
      const refusedRecord = loadWorkUnitIndex(refusedDir).work_units[refusedWorkId];
      writeReceiptProgress(refusedDir, refusedRecord);
      const beforeQueue = readFileSync(path.join(refusedDir, 'rb_queue.json'), 'utf-8');
      const refused = spawnSync(process.execPath, [CLI, 'timeout', refusedDir, '--work-id', refusedWorkId, '--reason', 'too-soon'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(refused.status, 1);
      const refusedOut = JSON.parse(refused.stdout);
      assert.equal(refusedOut.ok, false);
      assert.equal(refusedOut.timeout_preflight.timeout_eligible, false);
      assert.equal(loadWorkUnitIndex(refusedDir).work_units[refusedWorkId].status, 'claimed');
      assert.equal(readFileSync(path.join(refusedDir, 'rb_queue.json'), 'utf-8'), beforeQueue);

      saveQueueWith(forcedDir, [queueItem()]);
      const forcedClaim = execFileSync(process.execPath, [CLI, 'claim', forcedDir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const forcedWorkId = JSON.parse(forcedClaim).claimed_work_ids[0];
      const forcedRecord = loadWorkUnitIndex(forcedDir).work_units[forcedWorkId];
      writeReceiptProgress(forcedDir, forcedRecord);
      const forced = spawnSync(process.execPath, [CLI, 'timeout', forcedDir, '--work-id', forcedWorkId, '--reason', 'operator-forced', '--force'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(forced.status, 0, forced.stderr || forced.stdout);
      const forcedOut = JSON.parse(forced.stdout);
      assert.equal(forcedOut.forced_timeout, true);
      assert.equal(forcedOut.preflight_timeout_eligible, false);
      assert.equal(forcedOut.default_timeout_would_refuse, true);
      assert.equal(Array.isArray(forcedOut.progress_sources), true);
      const trace = readFileSync(path.join(forcedDir, 'rb_trace.jsonl'), 'utf-8');
      assert.match(trace, /work_unit_forced_timeout/);
      assert.match(trace, /progress_sources/);
    } finally {
      cleanup(refusedDir);
      cleanup(forcedDir);
    }
  });

  it('default timeout CLI refuses submit-ready, repairable, and invalid-binding attempts', () => {
    const submitDir = tempBundle();
    const repairDir = tempBundle();
    const bindingDir = tempBundle();
    try {
      saveQueueWith(submitDir, [queueItem()]);
      const submitClaim = execFileSync(process.execPath, [CLI, 'claim', submitDir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const submitWorkId = JSON.parse(submitClaim).claimed_work_ids[0];
      const submitRecord = loadWorkUnitIndex(submitDir).work_units[submitWorkId];
      writeAssignedSubmitReadyResult(submitDir, submitRecord);
      const submitBeforeQueue = readFileSync(path.join(submitDir, 'rb_queue.json'), 'utf-8');
      const submitRefused = spawnSync(process.execPath, [CLI, 'timeout', submitDir, '--work-id', submitWorkId, '--reason', 'submit-ready-must-not-timeout'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(submitRefused.status, 1);
      const submitOut = JSON.parse(submitRefused.stdout);
      assert.equal(submitOut.recommended_action, 'submit');
      assert.equal(loadWorkUnitIndex(submitDir).work_units[submitWorkId].status, 'claimed');
      assert.equal(readFileSync(path.join(submitDir, 'rb_queue.json'), 'utf-8'), submitBeforeQueue);

      saveQueueWith(repairDir, [queueItem()]);
      const repairClaim = execFileSync(process.execPath, [CLI, 'claim', repairDir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const repairWorkId = JSON.parse(repairClaim).claimed_work_ids[0];
      const repairRecord = loadWorkUnitIndex(repairDir).work_units[repairWorkId];
      writeAssignedRepairableResult(repairDir, repairRecord);
      const repairBeforeQueue = readFileSync(path.join(repairDir, 'rb_queue.json'), 'utf-8');
      const repairRefused = spawnSync(process.execPath, [CLI, 'timeout', repairDir, '--work-id', repairWorkId, '--reason', 'repairable-must-not-timeout'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(repairRefused.status, 1);
      const repairOut = JSON.parse(repairRefused.stdout);
      assert.equal(repairOut.recommended_action, 'repair');
      assert.equal(loadWorkUnitIndex(repairDir).work_units[repairWorkId].status, 'claimed');
      assert.equal(readFileSync(path.join(repairDir, 'rb_queue.json'), 'utf-8'), repairBeforeQueue);

      saveQueueWith(bindingDir, [queueItem()]);
      const bindingClaim = execFileSync(process.execPath, [CLI, 'claim', bindingDir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const bindingWorkId = JSON.parse(bindingClaim).claimed_work_ids[0];
      const bindingRecord = loadWorkUnitIndex(bindingDir).work_units[bindingWorkId];
      const queuePath = path.join(bindingDir, 'rb_queue.json');
      const queue = JSON.parse(readFileSync(queuePath, 'utf-8'));
      delete queue.delegated_in_flight[bindingRecord.queue_item_id];
      writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
      const bindingBeforeQueue = readFileSync(queuePath, 'utf-8');
      const bindingRefused = spawnSync(process.execPath, [CLI, 'timeout', bindingDir, '--work-id', bindingWorkId, '--reason', 'binding-must-not-timeout'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(bindingRefused.status, 1);
      const bindingOut = JSON.parse(bindingRefused.stdout);
      assert.equal(bindingOut.recommended_action, 'inspect');
      assert.equal(loadWorkUnitIndex(bindingDir).work_units[bindingWorkId].status, 'claimed');
      assert.equal(readFileSync(queuePath, 'utf-8'), bindingBeforeQueue);
    } finally {
      cleanup(submitDir);
      cleanup(repairDir);
      cleanup(bindingDir);
    }
  });

  it('fails closed for index drift', () => {
    const dir = tempBundle();
    try {
      createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      const index = loadWorkUnitIndex(dir);
      index.status_counts.claimed = 99;
      writeFileSync(workUnitIndexPath(dir), `${JSON.stringify(index, null, 2)}\n`);
      const result = spawnSync(process.execPath, [CLI, 'inspect', dir], { encoding: 'utf-8' });
      assert.equal(result.status, 1);
      assert.match(result.stdout, /status-count drift/);
      const trace = readFileSync(path.join(dir, 'rb_trace.jsonl'), 'utf-8');
      const log = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
      assert.match(trace, /work_unit_inspect_failed/);
      assert.match(log, /work_unit_inspect_failed/);
    } finally {
      cleanup(dir);
    }
  });

  it('logs provenance mismatch diagnostics for ledger drift', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claimStdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
      const workId = JSON.parse(claimStdout).claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeValidSubmitFiles(dir, record);
      execFileSync(process.execPath, [CLI, 'submit', dir, '--work-id', workId, '--result', resultPath], { encoding: 'utf-8' });

      const ledgerPath = path.join(dir, WORK_UNIT_OUTPUT_LEDGER);
      const row = JSON.parse(readFileSync(ledgerPath, 'utf-8').trim());
      row.result_hash = 'sha256:bad-drift';
      writeFileSync(ledgerPath, `${JSON.stringify(row)}\n`);

      const result = spawnSync(process.execPath, [CLI, 'inspect', dir], { encoding: 'utf-8' });
      assert.equal(result.status, 1);
      assert.match(result.stdout, /ledger_record_hash mismatch|work-unit ledger invalid|ledger\/index mismatch/);
      const trace = readFileSync(path.join(dir, 'rb_trace.jsonl'), 'utf-8');
      const log = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
      assert.match(trace, /work_unit_provenance_mismatch/);
      assert.match(log, /work_unit_provenance_mismatch/);
    } finally {
      cleanup(dir);
    }
  });

  it('logs transaction mismatch diagnostics for uncommitted transaction journals', () => {
    const dir = tempBundle();
    try {
      createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      mkdirSync(transactionDir(dir), { recursive: true });
      writeFileSync(path.join(transactionDir(dir), 'tx-stale.json'), JSON.stringify({
        schema_version: 'work-unit.transaction.v1',
        tx_id: 'tx-stale',
        operation: 'claim_work_units',
        status: 'started',
        started_at: '2026-07-06T00:00:00.000Z',
        committed_at: null,
      }, null, 2));

      const result = spawnSync(process.execPath, [CLI, 'inspect', dir], { encoding: 'utf-8' });
      assert.equal(result.status, 1);
      assert.match(result.stdout, /uncommitted transaction/);
      const trace = readFileSync(path.join(dir, 'rb_trace.jsonl'), 'utf-8');
      const log = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
      assert.match(trace, /work_unit_transaction_mismatch/);
      assert.match(log, /work_unit_transaction_mismatch/);
    } finally {
      cleanup(dir);
    }
  });
});
