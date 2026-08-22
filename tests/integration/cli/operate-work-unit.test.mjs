// @impl DEW-002, DEW-013, DEW-023, DEW-024, CHI-004, FRE-005

import {
  execFileSync as execFileSyncProduction,
  spawn as spawnProduction,
  spawnSync as spawnSyncProduction,
} from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, watch, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { makeItem } from '../../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import { createQueue, enqueue, saveQueue } from '../../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import { buildCanonicalTopicRegistryFact } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-registry-fact.mjs';
import {
  collectSubmittedWave0ContributionProjection,
} from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-projection.mjs';
import {
  WORK_UNIT_OUTPUT_LEDGER,
  createWorkUnit,
  loadWorkUnitIndex,
  transactionDir,
  transactionLockOwnerPath,
  workUnitIndexPath,
} from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import {
  WORK_UNIT_TRANSACTION_LOCK_SCHEMA_VERSION,
  WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
  WorkUnitTransactionLockOwnerSchema,
  WorkUnitTransactionV2JournalSchema,
} from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/work-unit-transaction.mjs';

const CLI = path.resolve('DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs');
const AVAILABLE_ACTOR_ARGS = ['--actor-outcome', 'available', '--actor-source', 'native_probe', '--actor-role-key', 'dpt-source-intake', '--actor-reason', 'probe_succeeded', '--execution-actor', 'delegated_subagent'];

function delegatedActorExecution(roleKey = 'dpt-source-intake') {
  return {
    execution_actor_class: 'delegated_subagent',
    delegated_role_key: roleKey,
    observation: {
      outcome: 'available',
      source: 'native_probe',
      role_key: roleKey,
      reason_code: 'probe_succeeded',
      recorded_at: '2026-08-14T00:00:00.000Z',
    },
    policy_decision: 'normal_allowed',
    fallback_from: null,
  };
}

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

function waitForPath(file, timeoutMs = 5000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (existsSync(file)) return resolve();
      if (Date.now() - started > timeoutMs) return reject(new Error(`timed out waiting for ${file}`));
      setTimeout(poll, 10);
    };
    poll();
  });
}

function childCompletion(child) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (status, signal) => {
      if (status === 0) resolve();
      else reject(new Error(`child exited ${status ?? signal}: ${stderr}`));
    });
  });
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

function retireAssignmentProfile(dir, record) {
  const indexPath = workUnitIndexPath(dir);
  const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
  const current = index.work_units[record.work_id];
  const manifestPath = path.join(dir, current.paths.manifest_ref);
  const beaconPath = path.join(dir, current.paths.beacon_ref);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const beacon = JSON.parse(readFileSync(beaconPath, 'utf-8'));
  for (const surface of [current, manifest, beacon]) {
    surface.assignment_contract_version = 'work-unit.assignment.v2';
  }
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(beaconPath, `${JSON.stringify(beacon, null, 2)}\n`);
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

function supplementaryWave1QueueItem(overrides = {}) {
  return makeItem({
    queue_item_id: 'queue-wave1-supplementary',
    title: 'Supplementary Wave1 topic deepening',
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 } },
    kind: 'wave1_topic_deepening',
    producer_rule: 'topic_deepening',
    payload: {
      wave: 1,
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      topic_slug: 'topic-a',
      assignment_mode: 'supplementary',
    },
    required_receipts: [],
    writes_to: [],
    ...overrides,
  });
}

function wave0Topic(index = 0) {
  const suffix = String(426614174000 + index).padStart(12, '0');
  const letter = String.fromCharCode('a'.charCodeAt(0) + index);
  return {
    topic_uid: `tp_123e4567-e89b-12d3-a456-${suffix}`,
    id: String(index + 1).padStart(2, '0'),
    slug: `topic-${letter}`,
    title: `Topic ${letter.toUpperCase()}`,
  };
}

function writeCanonicalPlan(dir, topics = [wave0Topic()]) {
  const registry = topics.map((topic) => [
    `  - topic_uid: ${topic.topic_uid}`,
    `    id: "${topic.id}"`,
    `    slug: ${topic.slug}`,
    `    title: ${topic.title}`,
    `    must_answer: ["${topic.title}?"]`,
    '    scope_role: primary',
    '    depends_on_topic_uids: []',
    '    previous_layouts: []',
  ].join('\n')).join('\n');
  writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: test
derived_topic_count: ${topics.length}
topic_registry_version: "2"
topic_registry:
${registry}
---
# Plan
`);
  mkdirSync(path.join(dir, 'seed_topics'), { recursive: true });
  for (const topic of topics) {
    writeFileSync(path.join(dir, 'seed_topics', `${topic.slug}.md`), `---
topic_uid: ${topic.topic_uid}
id: "${topic.id}"
slug: ${topic.slug}
title: ${topic.title}
must_answer: ["${topic.title}?"]
scope_role: primary
depends_on_topic_uids: []
---
# ${topic.title}
`);
  }
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

function wave0QueueItemForTopic(id, topic, payload = {}) {
  const sourcePath = `artifacts/wave0/${topic.slug}/source.yaml`;
  return currentWave0QueueItem(id, {
    title: `Source intake ${topic.title}`,
    payload: {
      wave: 0,
      topic_uid: topic.topic_uid,
      topic_slug: topic.slug,
      ...payload,
    },
    required_receipts: [`file:${sourcePath}`],
    writes_to: [sourcePath],
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

function writeValidSubmitFiles(dir, record, {
  sources = null,
  cacheSource = null,
} = {}) {
  const manifest = JSON.parse(readFileSync(path.join(dir, record.paths.manifest_ref), 'utf-8'));
  const sourcePath = manifest.output_contract.required_outputs.find((output) => output.role === 'source_yaml').path;
  const topicSlug = sourcePath.split('/').at(-2);
  const resolvedSources = sources || [{
    url: 'https://example.com/source',
    title: 'Example source',
    retrieved_date: '2026-07-20',
    topic_tag: topicSlug,
  }];
  const resolvedCacheSource = cacheSource || resolvedSources.at(-1);
  mkdirSync(path.dirname(path.join(dir, sourcePath)), { recursive: true });
  writeFileSync(path.join(dir, sourcePath), `${resolvedSources.map((source) => [
    `- url: ${source.url}`,
    `  title: ${source.title}`,
    `  retrieved_date: ${source.retrieved_date}`,
    `  topic_tag: ${source.topic_tag}`,
  ].join('\n')).join('\n')}\n`);

  const cacheTrail = `_cache/wave0/primary/${record.queue_item_id}/s01_source`;
  mkdirSync(path.join(dir, cacheTrail), { recursive: true });
  writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(dir, cacheTrail, 'page.md'), `# Captured Page\n\nFetched content capture for ${resolvedCacheSource.url}. This body preserves the source text used by the work unit.\n`);
  writeFileSync(path.join(dir, cacheTrail, 'meta.json'), `${JSON.stringify({ url: resolvedCacheSource.url })}\n`);

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
      assert.equal(record.assignment_contract_version, 'work-unit.assignment.v3');
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
      const topics = Array.from({ length: 10 }, (_, index) => wave0Topic(index));
      writeCanonicalPlan(dir, topics);
      const padding = 'x'.repeat(512 * 1024);
      const items = topics.map((topic, index) => wave0QueueItemForTopic(`queue-race-${index}`, topic, {
          non_selector_padding: padding,
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
      assert.equal(transactions[0].status, 'rolled_back');
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
        assert.equal(out.actor_observation_feedback.planned_role_key, 'dpt-source-intake');
        assert.equal(typeof out.actor_observation_feedback.primary_conflict.field, 'string');
        assert.ok(out.actor_observation_feedback.conflicts.length > 0);
        assert.ok(out.actor_observation_feedback.conflicts.length <= 4);
        assert.equal(out.actor_observation_feedback.legal_tuples.length, 7);
        assert.match(out.actor_observation_feedback.rerun, /operate-work-unit\.mjs claim/);
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
      createWorkUnit(dir, { queueItem: queueItem(), wave: 0, actor_execution: delegatedActorExecution() });
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

  it('serializes same-target Wave0 supplements and preserves append-only ordinal ownership', () => {
    const dir = tempBundle();
    try {
      writeFileSync(path.join(dir, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: 0\n');
      saveQueueWith(dir, [
        currentWave0QueueItem('queue-wave0-initial'),
        currentWave0QueueItem('queue-wave0-supplement'),
      ]);
      const firstClaim = JSON.parse(execFileSync(process.execPath, [
        CLI, 'claim', dir, '--phase', 'wave0', '--count', '1',
      ], { encoding: 'utf-8' }));
      assert.equal(firstClaim.claimed_count, 1);
      const firstWorkId = firstClaim.claimed_work_ids[0];
      const firstRecord = loadWorkUnitIndex(dir).work_units[firstWorkId];
      const firstSource = {
        url: 'https://example.com/source-1',
        title: 'Example source 1',
        retrieved_date: '2026-07-20',
        topic_tag: 'topic-a',
      };
      const firstResultPath = writeValidSubmitFiles(dir, firstRecord, { sources: [firstSource] });
      const firstSubmit = JSON.parse(execFileSync(process.execPath, [
        CLI, 'submit', dir, '--work-id', firstWorkId, '--result', firstResultPath,
      ], { encoding: 'utf-8' }));
      assert.equal(firstSubmit.status, 'submitted');

      const secondClaim = JSON.parse(execFileSync(process.execPath, [
        CLI, 'claim', dir, '--phase', 'wave0', '--count', '1',
      ], { encoding: 'utf-8' }));
      assert.equal(secondClaim.claimed_count, 1);
      const secondWorkId = secondClaim.claimed_work_ids[0];
      const secondRecord = loadWorkUnitIndex(dir).work_units[secondWorkId];
      const secondSource = {
        url: 'https://example.com/source-2',
        title: 'Example source 2',
        retrieved_date: '2026-07-20',
        topic_tag: 'topic-a',
      };
      const secondResultPath = writeValidSubmitFiles(dir, secondRecord, {
        sources: [firstSource, secondSource],
        cacheSource: secondSource,
      });
      const secondSubmit = JSON.parse(execFileSync(process.execPath, [
        CLI, 'submit', dir, '--work-id', secondWorkId, '--result', secondResultPath,
      ], { encoding: 'utf-8' }));
      assert.equal(secondSubmit.status, 'submitted');

      const projection = collectSubmittedWave0ContributionProjection(dir, {
        topicRegistryFact: buildCanonicalTopicRegistryFact(dir),
      });
      assert.equal(projection.passed, true, JSON.stringify(projection.root_findings));
      assert.deepEqual(projection.candidates.map(({ work_id, source_ordinal, entry_id }) => ({
        work_id,
        source_ordinal,
        entry_id,
      })), [
        { work_id: firstWorkId, source_ordinal: 1, entry_id: `${firstWorkId}/1` },
        { work_id: secondWorkId, source_ordinal: 2, entry_id: `${secondWorkId}/2` },
      ]);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects a retired assignment profile through the CLI before authority mutation', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claim = JSON.parse(execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' }));
      const record = loadWorkUnitIndex(dir).work_units[claim.claimed_work_ids[0]];
      const resultPath = writeValidSubmitFiles(dir, record);
      retireAssignmentProfile(dir, record);
      const before = recursiveSnapshot(dir);

      const rejected = spawnSync(process.execPath, [CLI, 'submit', dir, '--work-id', record.work_id, '--result', resultPath], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
      const output = JSON.parse(rejected.stdout);
      assert.equal(output.ok, false);
      assert.equal(output.reason_code, 'unsupported_current_contract');
      assert.deepEqual(recursiveSnapshot(dir), before);
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
      assert.equal(out.submit_integrity.submit_owned_only, true);
      assert.equal(out.submit_integrity.gate_evaluated, false);
      assert.deepEqual(out.submit_integrity.roots, []);
      assert.equal(existsSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), false);
      assert.equal(loadWorkUnitIndex(dir).work_units[workId].status, 'claimed');
    } finally {
      cleanup(dir);
    }
  });

  it('dry-submits and formally submits a v3 supplementary Wave1 result with empty output_files', () => {
    const dir = tempBundle();
    try {
      writeCanonicalPlan(dir);
      saveQueueWith(dir, [supplementaryWave1QueueItem()]);
      const claim = spawnSync(process.execPath, [
        CLI,
        'claim',
        dir,
        '--phase', 'wave1',
        '--actor-outcome', 'available',
        '--actor-source', 'native_probe',
        '--actor-role-key', 'dpt-evidence-extractor',
        '--actor-reason', 'probe_succeeded',
        '--execution-actor', 'delegated_subagent',
      ], { encoding: 'utf-8', timeout: 5000 });
      assert.equal(claim.status, 0, claim.stderr || claim.stdout);
      const workId = JSON.parse(claim.stdout).claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      assert.equal(record.assignment_contract_version, 'work-unit.assignment.v3');

      writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
        event: 'work_done',
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        kind: record.kind,
        receipt_nonce: record.receipt_nonce,
        actor_contract_version: record.actor_contract_version,
        execution_actor_class: record.actor_execution.execution_actor_class,
        ts: '2026-08-09T00:00:00.000Z',
      })}\n`);
      const cacheTrail = `_cache/wave1/primary/${record.queue_item_id}/supplementary-source`;
      mkdirSync(path.join(dir, cacheTrail), { recursive: true });
      writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
      writeFileSync(path.join(dir, cacheTrail, 'page.md'), '# Captured Page\n\nSupplementary source capture.\n');
      writeFileSync(path.join(dir, cacheTrail, 'meta.json'), '{"url":"https://example.com/supplementary"}\n');
      const resultPath = path.join(dir, '_tmp', `${workId}.result.json`);
      mkdirSync(path.dirname(resultPath), { recursive: true });
      writeFileSync(resultPath, `${JSON.stringify({
        schema_version: 'work-unit.result.v1',
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        kind: record.kind,
        receipt_nonce: record.receipt_nonce,
        actor_contract_version: record.actor_contract_version,
        execution_actor_class: record.actor_execution.execution_actor_class,
        summary: 'supplementary result with no direct output',
        output_files: [],
        cache_trails: [cacheTrail],
      }, null, 2)}\n`);

      const dry = spawnSync(process.execPath, [CLI, 'dry-submit', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf-8', timeout: 5000,
      });
      assert.equal(dry.status, 0, dry.stderr || dry.stdout);
      assert.equal(JSON.parse(dry.stdout).ok, true);
      assert.equal(existsSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), false);

      const submit = spawnSync(process.execPath, [CLI, 'submit', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf-8', timeout: 5000,
      });
      assert.equal(submit.status, 0, submit.stderr || submit.stdout);
      assert.equal(JSON.parse(submit.stdout).ok, true);
      assert.equal(readFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER), 'utf-8').split(/\r?\n/).filter(Boolean).length, 1);
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
      const topics = Array.from({ length: 4 }, (_, index) => wave0Topic(index));
      writeCanonicalPlan(dir, topics);
      saveQueueWith(dir, topics.map((topic, index) => (
        wave0QueueItemForTopic(`queue-source-${topic.slug}-${index + 1}`, topic)
      )));

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

  it('replaces a failed terminal attempt through one stdout JSON result and returns to normal claim', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const initialClaim = JSON.parse(execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' }));
      const parentWorkId = initialClaim.claimed_work_ids[0];

      const claimedBefore = recursiveSnapshot(dir);
      const claimedRefusal = spawnSync(process.execPath, [CLI, 'replace', dir, '--work-id', parentWorkId], {
        encoding: 'utf-8', timeout: 5000,
      });
      assert.equal(claimedRefusal.status, 1);
      assert.equal(claimedRefusal.stderr, '');
      assert.equal(JSON.parse(claimedRefusal.stdout).reason_code, 'parent_not_terminal');
      assert.deepEqual(recursiveSnapshot(dir), claimedBefore);

      const failed = spawnSync(process.execPath, [CLI, 'fail', dir, '--work-id', parentWorkId, '--reason', 'semantic_contract:source_gap'], {
        encoding: 'utf-8', timeout: 5000,
      });
      assert.equal(failed.status, 0, failed.stderr || failed.stdout);

      const replacement = spawnSync(process.execPath, [CLI, 'replace', dir, '--work-id', parentWorkId], {
        encoding: 'utf-8', timeout: 5000,
      });
      assert.equal(replacement.status, 0, replacement.stderr || replacement.stdout);
      assert.equal(replacement.stderr, '');
      const replacementOut = JSON.parse(replacement.stdout);
      assert.equal(replacementOut.created, true);
      assert.equal(replacementOut.next_action.operation, 'claim');
      assert.equal(Object.hasOwn(replacementOut, 'existing_work_id'), false);
      assert.equal(existsSync(path.join(dir, 'rb_output_declarations.jsonl')), false);
      assert.equal(loadWorkUnitIndex(dir).work_units[parentWorkId].status, 'failed');

      const repeated = spawnSync(process.execPath, [CLI, 'replace', dir, '--work-id', parentWorkId], {
        encoding: 'utf-8', timeout: 5000,
      });
      assert.equal(repeated.status, 0, repeated.stderr || repeated.stdout);
      const repeatedOut = JSON.parse(repeated.stdout);
      assert.equal(repeatedOut.idempotent, true);
      assert.equal(repeatedOut.queue_item_id, replacementOut.queue_item_id);

      const successorClaim = JSON.parse(execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' }));
      const successorWorkId = successorClaim.claimed_work_ids[0];
      assert.notEqual(successorWorkId, parentWorkId);
      const inFlight = spawnSync(process.execPath, [CLI, 'replace', dir, '--work-id', parentWorkId], {
        encoding: 'utf-8', timeout: 5000,
      });
      assert.equal(inFlight.status, 0, inFlight.stderr || inFlight.stdout);
      const inFlightOut = JSON.parse(inFlight.stdout);
      assert.equal(inFlightOut.existing_work_id, successorWorkId);
      assert.equal(inFlightOut.next_action.operation, 'reconstruct_and_poll');

      const trace = readFileSync(path.join(dir, 'rb_trace.jsonl'), 'utf-8');
      assert.equal((trace.match(/work_unit_replacement_created/g) || []).length, 1);
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

  it('keeps an existing contribution declaration idempotent and exactly recovers its missing row', () => {
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
      const originalRow = JSON.parse(originalLedger.toString('utf-8').trim());
      assert.ok(originalRow.source_contribution);

      const alreadyPresent = spawnSync(process.execPath, [CLI, 'recover-declaration', dir, '--work-id', workId], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(alreadyPresent.status, 0, alreadyPresent.stderr || alreadyPresent.stdout);
      assert.equal(JSON.parse(alreadyPresent.stdout).changed, false);

      const indexBeforeLoss = readFileSync(workUnitIndexPath(dir), 'utf-8');
      const queueBeforeLoss = readFileSync(path.join(dir, 'rb_queue.json'), 'utf-8');
      rmSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER));

      const recovered = spawnSync(process.execPath, [CLI, 'recover-declaration', dir, '--work-id', workId], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
      const out = JSON.parse(recovered.stdout);
      assert.equal(out.ok, true);
      assert.equal(out.recovered, true);
      assert.equal(out.changed, true);
      assert.equal(out.ledger_record_hash, originalRow.ledger_record_hash);
      assert.deepEqual(readFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), originalLedger);
      assert.equal(readFileSync(workUnitIndexPath(dir), 'utf-8'), indexBeforeLoss);
      assert.equal(readFileSync(path.join(dir, 'rb_queue.json'), 'utf-8'), queueBeforeLoss);
      assert.equal(submitted.ledger_record_hash, originalRow.ledger_record_hash);

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
      assert.equal(eligibleOut.recommendation_basis.branch, 'lease');
      assert.equal(eligibleOut.recommendation_basis.facts.effective_timeout_at, eligibleOut.effective_timeout_at);

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
      assert.equal(refusedOut.recommendation_basis.branch, 'progress');
      assert.equal(refusedOut.recommendation_basis.facts.latest_engine_observed_progress_at, refusedOut.progress.latest_engine_observed_progress_at);
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
      assert.equal(out.recommendation_basis.branch, 'candidate');
      assert.deepEqual(out.recommendation_basis.facts.candidate_projection, out.candidate_projection);
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
      createWorkUnit(dir, { queueItem: queueItem(), wave: 0, actor_execution: delegatedActorExecution() });
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
      createWorkUnit(dir, { queueItem: queueItem(), wave: 0, actor_execution: delegatedActorExecution() });
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
      assert.match(result.stdout, /suspect legacy transaction|unlocked unresolved transaction journal/);
      const trace = readFileSync(path.join(dir, 'rb_trace.jsonl'), 'utf-8');
      const log = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
      assert.match(trace, /work_unit_transaction_mismatch/);
      assert.match(log, /work_unit_transaction_mismatch/);
    } finally {
      cleanup(dir);
    }
  });

  it('allows a current claim beside a complete committed v1 diagnostic journal', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [currentWave0QueueItem('queue-v1-diagnostic')]);
      mkdirSync(transactionDir(dir), { recursive: true });
      const legacyPath = path.join(transactionDir(dir), 'tx-v1-committed.json');
      writeFileSync(legacyPath, `${JSON.stringify({
        schema_version: 'work-unit.transaction.v1',
        tx_id: 'tx-v1-committed',
        operation: 'submit_work_unit',
        status: 'committed',
        started_at: '2026-07-30T00:00:00.000Z',
        committed_at: '2026-07-30T00:01:00.000Z',
      })}\n`);

      const claim = spawnSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf-8' });
      assert.equal(claim.status, 0, claim.stderr || claim.stdout);
      assert.equal(JSON.parse(claim.stdout).claimed_count, 1);
      assert.equal(readFileSync(legacyPath, 'utf8').includes('work-unit.transaction.v1'), true);
    } finally {
      cleanup(dir);
    }
  });
});

describe('operate-work-unit attempt recovery operations', () => {
  it('returns structured busy for same- and different-work submit CLI contenders without loser mutation', async () => {
    const dir = tempBundle();
    let holder = null;
    let holderDone = null;
    try {
      const topics = [wave0Topic(0), wave0Topic(1)];
      writeCanonicalPlan(dir, topics);
      saveQueueWith(dir, [
        wave0QueueItemForTopic('queue-contention-a', topics[0]),
        wave0QueueItemForTopic('queue-contention-b', topics[1]),
      ]);
      const claim = spawnSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0', '--count', '2'], {
        encoding: 'utf8',
      });
      assert.equal(claim.status, 0, claim.stderr || claim.stdout);
      const [holderWorkId, otherWorkId] = JSON.parse(claim.stdout).claimed_work_ids;
      const indexBefore = loadWorkUnitIndex(dir);
      const holderRecord = indexBefore.work_units[holderWorkId];
      const otherRecord = indexBefore.work_units[otherWorkId];
      const holderResultPath = writeValidSubmitFiles(dir, holderRecord);
      const otherResultPath = writeValidSubmitFiles(dir, otherRecord);
      const queueBefore = readFileSync(path.join(dir, 'rb_queue.json'), 'base64');
      const indexBytesBefore = readFileSync(workUnitIndexPath(dir), 'base64');
      const holderResultBefore = readFileSync(holderResultPath, 'base64');
      const otherResultBefore = readFileSync(otherResultPath, 'base64');
      const baselineJournalNames = readdirSync(transactionDir(dir))
        .filter((name) => name.endsWith('.json'))
        .sort();

      const transactionModule = pathToFileURL(path.resolve('DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs')).href;
      const holderScript = `
        import { withWorkUnitTransaction } from ${JSON.stringify(transactionModule)};
        const result = withWorkUnitTransaction(${JSON.stringify(dir)}, 'submit_work_unit', {
          targetWorkIds: [${JSON.stringify(holderWorkId)}],
          targetQueueItemIds: [${JSON.stringify(holderRecord.queue_item_id)}],
          mutationTargets: ['rb_queue.json']
        }, () => {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2500);
          return { ok: true };
        });
        if (!result.ok) process.exit(2);
      `;
      holder = spawnProduction(process.execPath, ['--input-type=module', '--eval', holderScript], {
        cwd: path.resolve('.'),
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      holderDone = childCompletion(holder);
      await waitForPath(transactionLockOwnerPath(dir));
      const journalNamesBefore = readdirSync(transactionDir(dir))
        .filter((name) => name.endsWith('.json'))
        .sort();
      assert.equal(journalNamesBefore.length, baselineJournalNames.length + 1);

      const contenders = [
        { workId: holderWorkId, resultPath: holderResultPath, sameAttempt: true },
        { workId: otherWorkId, resultPath: otherResultPath, sameAttempt: false },
      ];
      for (const contender of contenders) {
        const result = spawnSync(process.execPath, [
          CLI,
          'submit',
          dir,
          '--work-id',
          contender.workId,
          '--result',
          contender.resultPath,
        ], { encoding: 'utf8' });
        assert.equal(result.status, 1, result.stderr || result.stdout);
        assert.equal(result.stderr, '');
        assert.doesNotMatch(result.stdout, /EEXIST/);
        const outcome = JSON.parse(result.stdout);
        assert.equal(outcome.ok, false);
        assert.equal(outcome.reason_code, 'busy');
        assert.equal(outcome.transaction.caller.operation, 'submit_work_unit');
        assert.equal(outcome.transaction.caller.work_id, contender.workId);
        assert.equal(outcome.transaction.holder.operation, 'submit_work_unit');
        assert.equal(outcome.transaction.holder.target_work_ids.includes(holderWorkId), true);
        assert.equal(outcome.transaction.targets_same_attempt, contender.sameAttempt);
        assert.match(outcome.rerun, new RegExp(contender.workId));
      }

      assert.equal(readFileSync(path.join(dir, 'rb_queue.json'), 'base64'), queueBefore);
      assert.equal(readFileSync(workUnitIndexPath(dir), 'base64'), indexBytesBefore);
      assert.equal(readFileSync(holderResultPath, 'base64'), holderResultBefore);
      assert.equal(readFileSync(otherResultPath, 'base64'), otherResultBefore);
      assert.equal(existsSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), false);
      assert.deepEqual(
        readdirSync(transactionDir(dir)).filter((name) => name.endsWith('.json')).sort(),
        journalNamesBefore,
      );
      const indexAfter = loadWorkUnitIndex(dir);
      assert.equal(indexAfter.work_units[holderWorkId].status, 'claimed');
      assert.equal(indexAfter.work_units[otherWorkId].status, 'claimed');
      assert.equal(indexAfter.work_units[holderWorkId].deadline_at, holderRecord.deadline_at);
      assert.equal(indexAfter.work_units[otherWorkId].deadline_at, otherRecord.deadline_at);
      await holderDone;
      holder = null;
      holderDone = null;
    } finally {
      if (holder && holder.exitCode === null) holder.kill('SIGKILL');
      await holderDone?.catch(() => {});
      cleanup(dir);
    }
  });

  it('reports a committed final-release holder as global busy without active-attempt semantics', async () => {
    const dir = tempBundle();
    const readyFile = path.join(path.dirname(dir), `${path.basename(dir)}.settled-ready`);
    let holder = null;
    let holderDone = null;
    try {
      saveQueueWith(dir, [currentWave0QueueItem('queue-settled-holder')]);
      const claim = spawnSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf8' });
      assert.equal(claim.status, 0, claim.stderr || claim.stdout);
      const workId = JSON.parse(claim.stdout).claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeValidSubmitFiles(dir, record);
      const queueBefore = readFileSync(path.join(dir, 'rb_queue.json'), 'base64');
      const indexBefore = readFileSync(workUnitIndexPath(dir), 'base64');

      const transactionModule = pathToFileURL(path.resolve('DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs')).href;
      const holderScript = `
        import { writeFileSync } from 'node:fs';
        import { withWorkUnitTransaction } from ${JSON.stringify(transactionModule)};
        const result = withWorkUnitTransaction(${JSON.stringify(dir)}, 'submit_work_unit', {
          targetWorkIds: [${JSON.stringify(workId)}],
          targetQueueItemIds: [${JSON.stringify(record.queue_item_id)}],
          mutationTargets: ['rb_queue.json'],
          hooks: {
            afterCommittedBeforeRelease() {
              writeFileSync(${JSON.stringify(readyFile)}, 'ready\\n');
              Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1800);
            }
          }
        }, () => ({ ok: true }));
        if (!result.ok) process.exit(2);
      `;
      holder = spawnProduction(process.execPath, ['--input-type=module', '--eval', holderScript], {
        cwd: path.resolve('.'),
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      holderDone = childCompletion(holder);
      await waitForPath(readyFile);

      const contender = spawnSync(process.execPath, [
        CLI, 'submit', dir, '--work-id', workId, '--result', resultPath,
      ], { encoding: 'utf8' });
      assert.equal(contender.status, 1, contender.stderr || contender.stdout);
      assert.equal(contender.stderr, '');
      const outcome = JSON.parse(contender.stdout);
      assert.equal(outcome.reason_code, 'busy');
      assert.equal(outcome.transaction.holder.journal_disposition, 'committed');
      assert.equal(outcome.transaction.targets_same_attempt, false);
      assert.equal(outcome.transaction.caller.work_id, workId);
      assert.equal(outcome.transaction.holder.target_work_ids.includes(workId), true);
      assert.match(outcome.rerun, new RegExp(workId));
      assert.equal(readFileSync(path.join(dir, 'rb_queue.json'), 'base64'), queueBefore);
      assert.equal(readFileSync(workUnitIndexPath(dir), 'base64'), indexBefore);
      assert.equal(existsSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), false);

      await holderDone;
      holder = null;
      holderDone = null;
    } finally {
      if (holder && holder.exitCode === null) holder.kill('SIGKILL');
      await holderDone?.catch(() => {});
      rmSync(readyFile, { force: true });
      cleanup(dir);
    }
  });

  it('blocks default and forced timeout for valid holders and exposes no unrelated progress', async () => {
    for (const sameAttempt of [true, false]) {
      const dir = tempBundle();
      let holder = null;
      let holderDone = null;
      const readyFile = path.join(path.dirname(dir), `${path.basename(dir)}.holder-ready`);
      const releaseFile = path.join(path.dirname(dir), `${path.basename(dir)}.holder-release`);
      try {
        saveQueueWith(dir, [currentWave0QueueItem(`queue-timeout-${sameAttempt ? 'same' : 'other'}`)]);
        const claim = spawnSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf8' });
        assert.equal(claim.status, 0, claim.stderr || claim.stdout);
        const workId = JSON.parse(claim.stdout).claimed_work_ids[0];
        const record = loadWorkUnitIndex(dir).work_units[workId];
        const holderWorkId = sameAttempt ? workId : 'wu-w0-b000-src-i9999';
        const holderQueueId = sameAttempt ? record.queue_item_id : 'queue-unrelated-holder';
        const queueBefore = readFileSync(path.join(dir, 'rb_queue.json'), 'base64');
        const indexBefore = readFileSync(workUnitIndexPath(dir), 'base64');
        const transactionModule = pathToFileURL(path.resolve('DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs')).href;
        const holderScript = `
          import { existsSync, writeFileSync } from 'node:fs';
          import { withWorkUnitTransaction } from ${JSON.stringify(transactionModule)};
          const result = withWorkUnitTransaction(${JSON.stringify(dir)}, 'submit_work_unit', {
            targetWorkIds: [${JSON.stringify(holderWorkId)}],
            targetQueueItemIds: [${JSON.stringify(holderQueueId)}],
            mutationTargets: ['rb_queue.json']
          }, () => {
            writeFileSync(${JSON.stringify(readyFile)}, 'ready\\n');
            const buf = new Int32Array(new SharedArrayBuffer(4));
            let elapsed = 0;
            while (!existsSync(${JSON.stringify(releaseFile)}) && elapsed < 30000) {
              Atomics.wait(buf, 0, 0, 50);
              elapsed += 50;
            }
            return { ok: true };
          });
          if (!result.ok) process.exit(2);
        `;
        holder = spawnProduction(process.execPath, ['--input-type=module', '--eval', holderScript], {
          cwd: path.resolve('.'),
          stdio: ['ignore', 'ignore', 'pipe'],
        });
        holderDone = childCompletion(holder);
        await waitForPath(readyFile);
        await waitForPath(transactionLockOwnerPath(dir));
        const journalNames = readdirSync(transactionDir(dir)).filter((name) => name.endsWith('.json')).sort();

        const preflight = spawnSync(process.execPath, [
          CLI, 'timeout-preflight', dir, '--work-id', workId,
        ], { encoding: 'utf8' });
        assert.equal(preflight.status, 1, preflight.stderr || preflight.stdout);
        assert.equal(preflight.stderr, '');
        const projected = JSON.parse(preflight.stdout);
        assert.equal(projected.timeout_eligible, false);
        assert.equal(projected.recommended_action, 'wait');
        assert.equal(projected.transaction.disposition, 'busy');
        assert.equal(projected.transaction.targets_same_attempt, sameAttempt);
        assert.equal(projected.transaction.caller.work_id, workId);
        assert.equal(projected.transaction.holder.target_work_ids.includes(holderWorkId), true);
        assert.match(projected.transaction.rerun, /timeout-preflight/);
        if (!sameAttempt) {
          assert.equal(projected.progress.sources.some((source) => source.source_type === 'engine_event'), false);
        }

        for (const force of [false, true]) {
          const args = [CLI, 'timeout', dir, '--work-id', workId, '--reason', force ? 'forced while held' : 'default while held'];
          if (force) args.push('--force');
          const closed = spawnSync(process.execPath, args, { encoding: 'utf8' });
          assert.equal(closed.status, 1, closed.stderr || closed.stdout);
          assert.equal(closed.stderr, '');
          const outcome = JSON.parse(closed.stdout);
          assert.equal(outcome.ok, false);
          assert.equal(outcome.transaction.disposition, 'busy');
          assert.equal(outcome.transaction.targets_same_attempt, sameAttempt);
          assert.equal(outcome.recommended_action, 'wait');
        }

        if (sameAttempt) {
          const owner = JSON.parse(readFileSync(transactionLockOwnerPath(dir), 'utf8'));
          const recovery = spawnSync(process.execPath, [
            CLI, 'recover-transaction', dir, '--tx-id', owner.tx_id,
          ], { encoding: 'utf8' });
          assert.equal(recovery.status, 1, recovery.stderr || recovery.stdout);
          const outcome = JSON.parse(recovery.stdout);
          assert.equal(outcome.reason_code, 'busy');
          assert.equal(outcome.transaction.holder.tx_id, owner.tx_id);
          assert.match(outcome.rerun, /recover-transaction/);
        }

        assert.equal(readFileSync(path.join(dir, 'rb_queue.json'), 'base64'), queueBefore);
        assert.equal(readFileSync(workUnitIndexPath(dir), 'base64'), indexBefore);
        assert.deepEqual(
          readdirSync(transactionDir(dir)).filter((name) => name.endsWith('.json')).sort(),
          journalNames,
        );
        assert.equal(loadWorkUnitIndex(dir).work_units[workId].status, 'claimed');
        writeFileSync(releaseFile, 'release\n');
        await holderDone;
        holder = null;
        holderDone = null;
      } finally {
        if (holder && holder.exitCode === null) holder.kill('SIGKILL');
        await holderDone?.catch(() => {});
        rmSync(readyFile, { force: true });
        rmSync(releaseFile, { force: true });
        cleanup(dir);
      }
    }
  });

  it('keeps held suspect transaction proof off wait, force-timeout, and recovery paths', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [currentWave0QueueItem('queue-suspect-timeout')]);
      const claim = spawnSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf8' });
      assert.equal(claim.status, 0, claim.stderr || claim.stdout);
      const workId = JSON.parse(claim.stdout).claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const queuePath = path.join(dir, 'rb_queue.json');
      const queueBefore = readFileSync(queuePath, 'base64');
      const indexBefore = readFileSync(workUnitIndexPath(dir), 'base64');
      const txId = 'tx-held-suspect-cli';
      const journalRef = `_work_units/_transactions/${txId}.json`;
      const now = '2026-07-31T00:00:00.000Z';
      const journal = WorkUnitTransactionV2JournalSchema.parse({
        schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
        tx_id: txId,
        operation: 'submit_work_unit',
        journal_ref: journalRef,
        target_work_ids: [workId],
        target_queue_item_ids: [record.queue_item_id],
        mutation_manifest: {
          targets: [{
            path: 'rb_queue.json',
            before_exists: true,
            before_sha256: createHash('sha256').update(readFileSync(queuePath)).digest('hex'),
          }],
        },
        status: 'suspect',
        started_at: now,
        settled_at: now,
        error: 'held transaction cannot establish rollback',
      });
      const owner = WorkUnitTransactionLockOwnerSchema.parse({
        schema_version: WORK_UNIT_TRANSACTION_LOCK_SCHEMA_VERSION,
        tx_id: txId,
        operation: journal.operation,
        journal_ref: journal.journal_ref,
        target_work_ids: journal.target_work_ids,
        target_queue_item_ids: journal.target_queue_item_ids,
        acquired_at: now,
      });
      mkdirSync(path.dirname(path.join(dir, journalRef)), { recursive: true });
      writeFileSync(path.join(dir, journalRef), `${JSON.stringify(journal, null, 2)}\n`);
      mkdirSync(path.dirname(transactionLockOwnerPath(dir)), { recursive: true });
      writeFileSync(transactionLockOwnerPath(dir), `${JSON.stringify(owner, null, 2)}\n`);

      const preflight = spawnSync(process.execPath, [
        CLI, 'timeout-preflight', dir, '--work-id', workId,
      ], { encoding: 'utf8' });
      assert.equal(preflight.status, 1, preflight.stderr || preflight.stdout);
      const projected = JSON.parse(preflight.stdout);
      assert.equal(projected.recommended_action, 'block');
      assert.equal(projected.transaction.disposition, 'suspect_transaction');
      assert.equal(projected.transaction.repair_kind, 'missing_contract');
      assert.doesNotMatch(JSON.stringify(projected.advice), /wait|--force|delete.*lock/i);

      const forced = spawnSync(process.execPath, [
        CLI, 'timeout', dir, '--work-id', workId, '--reason', 'must remain blocked', '--force',
      ], { encoding: 'utf8' });
      assert.equal(forced.status, 1, forced.stderr || forced.stdout);
      const forceOutcome = JSON.parse(forced.stdout);
      assert.equal(forceOutcome.transaction.disposition, 'suspect_transaction');
      assert.equal(forceOutcome.recommended_action, 'block');

      const recovery = spawnSync(process.execPath, [
        CLI, 'recover-transaction', dir, '--tx-id', txId,
      ], { encoding: 'utf8' });
      assert.equal(recovery.status, 1, recovery.stderr || recovery.stdout);
      const recoveryOutcome = JSON.parse(recovery.stdout);
      assert.equal(recoveryOutcome.reason_code, 'suspect_transaction');
      assert.equal(recoveryOutcome.repair_kind, 'missing_contract');

      assert.equal(readFileSync(queuePath, 'base64'), queueBefore);
      assert.equal(readFileSync(workUnitIndexPath(dir), 'base64'), indexBefore);
      assert.equal(loadWorkUnitIndex(dir).work_units[workId].status, 'claimed');
      assert.equal(JSON.parse(readFileSync(path.join(dir, journalRef), 'utf8')).status, 'suspect');
    } finally {
      cleanup(dir);
    }
  });

  it('supersedes eligible drift once and replays the immutable relation through stdout JSON', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claim = spawnSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0', '--count', '1'], {
        encoding: 'utf8',
      });
      assert.equal(claim.status, 0, claim.stderr || claim.stdout);
      const workId = JSON.parse(claim.stdout).claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeValidSubmitFiles(dir, record);
      const submit = spawnSync(process.execPath, [CLI, 'submit', dir, '--work-id', workId, '--result', resultPath], {
        encoding: 'utf8',
      });
      assert.equal(submit.status, 0, submit.stderr || submit.stdout);
      const assignedResultPath = path.join(dir, record.paths.result_ref);
      const drifted = JSON.parse(readFileSync(assignedResultPath, 'utf8'));
      drifted.summary = 'post-submit drift for CLI supersession';
      writeFileSync(assignedResultPath, `${JSON.stringify(drifted, null, 2)}\n`);

      const first = spawnSync(process.execPath, [
        CLI, 'supersede', dir, '--work-id', workId, '--reason', 'CLI observed result drift',
      ], { encoding: 'utf8' });
      assert.equal(first.status, 0, first.stderr || first.stdout);
      assert.equal(first.stderr, '');
      const created = JSON.parse(first.stdout);
      assert.equal(created.created, true);
      assert.equal(created.relation.predecessor_work_id, workId);
      assert.equal(created.relation.root_code, 'submitted_result_drift');

      const replay = spawnSync(process.execPath, [
        CLI, 'supersede', dir, '--work-id', workId, '--reason', 'different lost-response retry reason',
      ], { encoding: 'utf8' });
      assert.equal(replay.status, 0, replay.stderr || replay.stdout);
      const replayed = JSON.parse(replay.stdout);
      assert.equal(replayed.idempotent, true);
      assert.deepEqual(replayed.relation, created.relation);
    } finally {
      cleanup(dir);
    }
  });

  it('returns structured supersession no-path while keeping invocation faults on stderr', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claim = spawnSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], { encoding: 'utf8' });
      const workId = JSON.parse(claim.stdout).claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeValidSubmitFiles(dir, record);
      assert.equal(spawnSync(process.execPath, [
        CLI, 'submit', dir, '--work-id', workId, '--result', resultPath,
      ], { encoding: 'utf8' }).status, 0);

      const noPath = spawnSync(process.execPath, [
        CLI, 'supersede', dir, '--work-id', workId, '--reason', 'richer content only',
      ], { encoding: 'utf8' });
      assert.equal(noPath.status, 1);
      assert.equal(noPath.stderr, '');
      const outcome = JSON.parse(noPath.stdout);
      assert.equal(outcome.ok, false);
      assert.equal(outcome.repair_kind, 'semantic_boundary');

      for (const args of [
        ['supersede', dir, '--work-id', workId],
        ['supersede', dir, '--work-id', workId, '--reason', 'x', '--tx-id', 'forbidden'],
        ['recover-transaction', dir],
        ['recover-transaction', dir, '--tx-id', 'tx-x', '--work-id', workId],
      ]) {
        const invalid = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
        assert.equal(invalid.status, 1);
        assert.equal(invalid.stdout, '');
        assert.match(invalid.stderr, /required|does not accept/);
      }
    } finally {
      cleanup(dir);
    }
  });

  it('recovers only one exact unlocked v2 journal and leaves original targets unchanged', () => {
    for (const testCase of [
      { initialStatus: 'started', drifted: false },
      { initialStatus: 'suspect', drifted: false },
      { initialStatus: 'started', drifted: true },
    ]) {
      const { initialStatus, drifted } = testCase;
      const dir = tempBundle();
      try {
        const authorityRef = 'authority.json';
        const authorityPath = path.join(dir, authorityRef);
        writeFileSync(authorityPath, 'before\n');
        const txId = `tx-cli-${initialStatus}-${drifted ? 'drifted' : 'exact'}`;
        const journalRef = `_work_units/_transactions/${txId}.json`;
        mkdirSync(transactionDir(dir), { recursive: true });
        const journal = WorkUnitTransactionV2JournalSchema.parse({
          schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
          tx_id: txId,
          operation: 'submit_work_unit',
          journal_ref: journalRef,
          target_work_ids: ['wu-w0-b000-src-i0001'],
          target_queue_item_ids: ['queue-source-topic-a'],
          mutation_manifest: {
            targets: [{
              path: authorityRef,
              before_exists: true,
              before_sha256: createHash('sha256').update('before\n').digest('hex'),
            }],
          },
          status: initialStatus,
          started_at: '2026-07-30T00:00:00.000Z',
          settled_at: initialStatus === 'suspect' ? '2026-07-30T00:01:00.000Z' : null,
          error: initialStatus === 'suspect' ? 'original rollback proof was unresolved' : null,
        });
        writeFileSync(path.join(dir, journalRef), `${JSON.stringify(journal, null, 2)}\n`);
        if (drifted) writeFileSync(authorityPath, 'drifted\n');
        const authorityBefore = readFileSync(authorityPath, 'base64');

        const recovered = spawnSync(process.execPath, [
          CLI, 'recover-transaction', dir, '--tx-id', txId,
        ], { encoding: 'utf8' });
        assert.equal(recovered.status, drifted ? 1 : 0, recovered.stderr || recovered.stdout);
        assert.equal(recovered.stderr, '');
        const outcome = JSON.parse(recovered.stdout);
        assert.equal(outcome.ok, !drifted);
        assert.equal(readFileSync(authorityPath, 'base64'), authorityBefore);
        const prior = JSON.parse(readFileSync(path.join(dir, journalRef), 'utf8'));
        assert.equal(prior.status, drifted ? initialStatus : 'rolled_back');
        if (drifted) {
          assert.equal(outcome.reason_code, 'suspect_transaction');
          assert.equal(outcome.repair_kind, 'missing_contract');
        } else {
          assert.equal(outcome.changed, true);
          const recoveryJournal = readdirSync(transactionDir(dir))
            .map((name) => JSON.parse(readFileSync(path.join(transactionDir(dir), name), 'utf8')))
            .find((entry) => entry.operation === 'recover_work_unit_transaction');
          assert.equal(recoveryJournal.status, 'committed');
          assert.deepEqual(recoveryJournal.mutation_manifest.targets.map((target) => target.path), [journalRef]);
        }
      } finally {
        cleanup(dir);
      }
    }
  });

  it('routes multi-orphan submit blocking through one deterministic recover coordinate', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const claim = spawnSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0'], {
        encoding: 'utf8',
      });
      assert.equal(claim.status, 0, claim.stderr || claim.stdout);
      const workId = JSON.parse(claim.stdout).claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      const resultPath = writeValidSubmitFiles(dir, record);

      const authorityRef = 'authority.json';
      writeFileSync(path.join(dir, authorityRef), 'before\n');
      const targetTxId = 'tx-cli-multi-target';
      const wrapperTxId = 'tx-cli-multi-wrapper';
      const targetRef = `_work_units/_transactions/${targetTxId}.json`;
      const wrapperRef = `_work_units/_transactions/${wrapperTxId}.json`;
      mkdirSync(transactionDir(dir), { recursive: true });
      const targetJournal = WorkUnitTransactionV2JournalSchema.parse({
        schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
        tx_id: targetTxId,
        operation: 'submit_work_unit',
        journal_ref: targetRef,
        target_work_ids: [workId],
        target_queue_item_ids: ['queue-source-topic-a'],
        mutation_manifest: {
          targets: [{
            path: authorityRef,
            before_exists: true,
            before_sha256: createHash('sha256').update('before\n').digest('hex'),
          }],
        },
        status: 'started',
        started_at: '2026-07-30T00:00:00.000Z',
        settled_at: null,
        error: null,
      });
      writeFileSync(path.join(dir, targetRef), `${JSON.stringify(targetJournal, null, 2)}\n`);
      const wrapperJournal = WorkUnitTransactionV2JournalSchema.parse({
        schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
        tx_id: wrapperTxId,
        operation: 'recover_work_unit_transaction',
        journal_ref: wrapperRef,
        target_work_ids: [workId],
        target_queue_item_ids: ['queue-source-topic-a'],
        mutation_manifest: {
          targets: [{
            path: targetRef,
            before_exists: true,
            before_sha256: createHash('sha256').update(readFileSync(path.join(dir, targetRef))).digest('hex'),
          }],
        },
        status: 'started',
        started_at: '2026-07-30T00:05:00.000Z',
        settled_at: null,
        error: null,
      });
      writeFileSync(path.join(dir, wrapperRef), `${JSON.stringify(wrapperJournal, null, 2)}\n`);

      // Submit is blocked by the multi-orphan state with exactly one
      // deterministic recover coordinate: the wrapper, not the wrapped target.
      const blocked = spawnSync(process.execPath, [
        CLI, 'submit', dir, '--work-id', workId, '--result', resultPath,
      ], { encoding: 'utf8' });
      assert.equal(blocked.status, 1, blocked.stderr || blocked.stdout);
      const outcome = JSON.parse(blocked.stdout);
      assert.equal(outcome.reason_code, 'suspect_transaction');
      assert.equal(outcome.repair_kind, 'recover-transaction');
      assert.equal(outcome.transaction.holder.tx_id, wrapperTxId);
      assert.equal(outcome.rerun.includes(wrapperTxId), true);
      assert.doesNotMatch(outcome.missing_fact, /multiple unresolved transaction journals exist:/);

      // Recovering the wrapped target first is rerouted to the wrapper.
      const premature = spawnSync(process.execPath, [
        CLI, 'recover-transaction', dir, '--tx-id', targetTxId,
      ], { encoding: 'utf8' });
      assert.equal(premature.status, 1, premature.stderr || premature.stdout);
      const prematureOutcome = JSON.parse(premature.stdout);
      assert.equal(prematureOutcome.reason_code, 'suspect_transaction');
      assert.equal(prematureOutcome.repair_kind, 'recover-transaction');
      assert.equal(prematureOutcome.rerun.includes(wrapperTxId), true);

      // The legal CLI sequence settles both orphans and unblocks submit.
      const wrapperRecovery = spawnSync(process.execPath, [
        CLI, 'recover-transaction', dir, '--tx-id', wrapperTxId,
      ], { encoding: 'utf8' });
      assert.equal(wrapperRecovery.status, 0, wrapperRecovery.stderr || wrapperRecovery.stdout);
      const targetRecovery = spawnSync(process.execPath, [
        CLI, 'recover-transaction', dir, '--tx-id', targetTxId,
      ], { encoding: 'utf8' });
      assert.equal(targetRecovery.status, 0, targetRecovery.stderr || targetRecovery.stdout);
      assert.equal(JSON.parse(readFileSync(path.join(dir, targetRef), 'utf8')).status, 'rolled_back');
      assert.equal(JSON.parse(readFileSync(path.join(dir, wrapperRef), 'utf8')).status, 'rolled_back');

      const resumed = spawnSync(process.execPath, [
        CLI, 'submit', dir, '--work-id', workId, '--result', resultPath,
      ], { encoding: 'utf8' });
      assert.equal(resumed.status, 0, resumed.stderr || resumed.stdout);
      assert.equal(JSON.parse(resumed.stdout).ok, true);
    } finally {
      cleanup(dir);
    }
  });

  it('returns settled recovery idempotently and rejects legacy, incomplete, and unsafe proof', () => {
    for (const status of ['committed', 'rolled_back']) {
      const dir = tempBundle();
      try {
        const authorityRef = 'authority.json';
        const authorityPath = path.join(dir, authorityRef);
        writeFileSync(authorityPath, 'before\n');
        const txId = `tx-cli-settled-${status}`;
        const journalRef = `_work_units/_transactions/${txId}.json`;
        mkdirSync(transactionDir(dir), { recursive: true });
        const journal = WorkUnitTransactionV2JournalSchema.parse({
          schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
          tx_id: txId,
          operation: 'submit_work_unit',
          journal_ref: journalRef,
          target_work_ids: ['wu-w0-b000-src-i0001'],
          target_queue_item_ids: ['queue-source-topic-a'],
          mutation_manifest: {
            targets: [{
              path: authorityRef,
              before_exists: true,
              before_sha256: createHash('sha256').update('before\n').digest('hex'),
            }],
          },
          status,
          started_at: '2026-07-30T00:00:00.000Z',
          settled_at: '2026-07-30T00:01:00.000Z',
          error: status === 'rolled_back' ? 'exact before-images restored' : null,
        });
        writeFileSync(path.join(dir, journalRef), `${JSON.stringify(journal, null, 2)}\n`);
        const before = recursiveSnapshot(dir);
        const recovered = spawnSync(process.execPath, [
          CLI, 'recover-transaction', dir, '--tx-id', txId,
        ], { encoding: 'utf8' });
        assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
        assert.equal(recovered.stderr, '');
        const outcome = JSON.parse(recovered.stdout);
        assert.equal(outcome.ok, true);
        assert.equal(outcome.changed, false);
        assert.equal(outcome.idempotent, true);
        assert.equal(outcome.disposition, status);
        assert.deepEqual(recursiveSnapshot(dir), before);
      } finally {
        cleanup(dir);
      }
    }

    const invalidCases = [
      {
        name: 'legacy',
        journal: {
          schema_version: 'work-unit.transaction.v1',
          tx_id: 'tx-cli-invalid-legacy',
          operation: 'submit_work_unit',
          status: 'failed',
          started_at: '2026-07-30T00:00:00.000Z',
          committed_at: null,
          error: 'legacy failed transaction',
        },
      },
      {
        name: 'incomplete',
        journal: {
          schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
          tx_id: 'tx-cli-invalid-incomplete',
          operation: 'submit_work_unit',
          journal_ref: '_work_units/_transactions/tx-cli-invalid-incomplete.json',
          target_work_ids: ['wu-w0-b000-src-i0001'],
          target_queue_item_ids: ['queue-source-topic-a'],
          status: 'started',
          started_at: '2026-07-30T00:00:00.000Z',
          settled_at: null,
          error: null,
        },
      },
      {
        name: 'unsafe',
        journal: {
          schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
          tx_id: 'tx-cli-invalid-unsafe',
          operation: 'submit_work_unit',
          journal_ref: '_work_units/_transactions/tx-cli-invalid-unsafe.json',
          target_work_ids: ['wu-w0-b000-src-i0001'],
          target_queue_item_ids: ['queue-source-topic-a'],
          mutation_manifest: { targets: [{ path: '../authority.json', before_exists: false }] },
          status: 'started',
          started_at: '2026-07-30T00:00:00.000Z',
          settled_at: null,
          error: null,
        },
      },
    ];
    for (const testCase of invalidCases) {
      const dir = tempBundle();
      try {
        const txId = testCase.journal.tx_id;
        const journalRef = `_work_units/_transactions/${txId}.json`;
        mkdirSync(transactionDir(dir), { recursive: true });
        writeFileSync(path.join(dir, journalRef), `${JSON.stringify(testCase.journal, null, 2)}\n`);
        const before = recursiveSnapshot(dir);
        const recovered = spawnSync(process.execPath, [
          CLI, 'recover-transaction', dir, '--tx-id', txId,
        ], { encoding: 'utf8' });
        assert.equal(recovered.status, 1, `${testCase.name}: ${recovered.stderr || recovered.stdout}`);
        assert.equal(recovered.stderr, '');
        const outcome = JSON.parse(recovered.stdout);
        assert.equal(outcome.reason_code, 'suspect_transaction', testCase.name);
        assert.equal(outcome.repair_kind, 'missing_contract', testCase.name);
        assert.deepEqual(recursiveSnapshot(dir), before, testCase.name);
        assert.equal(existsSync(path.join(dir, '_work_units', '.lock')), false, testCase.name);
      } finally {
        cleanup(dir);
      }
    }
  });
});
