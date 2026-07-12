// @impl DEW-002, DEW-013, FRE-005

import { execFileSync as execFileSyncProduction, spawnSync as spawnSyncProduction } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function queueItem(overrides = {}) {
  return makeItem({
    queue_item_id: 'queue-source-topic-a',
    title: 'Source intake topic A',
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { topic_slug: 'topic-a' },
    ...overrides,
  });
}

function saveQueueWith(dir, items) {
  let queue = createQueue(path.basename(dir));
  for (const item of items) queue = enqueue(queue, item);
  saveQueue(dir, queue);
}

function writeValidSubmitFiles(dir, record) {
  const outputPath = `reference/${record.work_id}.md`;
  mkdirSync(path.join(dir, 'reference'), { recursive: true });
  writeFileSync(path.join(dir, outputPath), '# Source\n\nKey Facts\n');

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
    output_files: [{ path: outputPath, role: 'reference', source_url: 'https://example.com/source', source_slug: 'source' }],
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
        interaction: 'prohibited',
        next_action: 'inspect_and_poll_claimed_work',
        work_ids: out.claimed_work_ids,
      });
      assert.match(JSON.stringify(out.prompt_refs), /_work_units\/wave0\/wu-w0-b000-src-i0001\/task\.md/);
      assert.match(out.prompt_refs[0].spawn_prompt, /runtime-receipt\.jsonl/);
      assert.match(out.prompt_refs[0].spawn_prompt, /result\.schema\.json/);
      assert.match(out.prompt_refs[0].spawn_prompt, /runtime_refs diagnostic metadata/);
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

  it('emits complete claim JSON when existing in-flight records make the response large', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [
        queueItem(),
        queueItem({ queue_item_id: 'queue-source-topic-b', payload: { topic_slug: 'topic-b' } }),
        queueItem({ queue_item_id: 'queue-source-topic-c', payload: { topic_slug: 'topic-c' } }),
        queueItem({ queue_item_id: 'queue-source-topic-d', payload: { topic_slug: 'topic-d' } }),
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
