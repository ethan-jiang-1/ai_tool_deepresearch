// @impl DEW-002, FRE-005

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { makeItem } from '../../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { createQueue, enqueue, saveQueue } from '../../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { WORK_UNIT_OUTPUT_LEDGER, createWorkUnit, loadWorkUnitIndex, transactionDir, workUnitIndexPath } from '../../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

const CLI = path.resolve('DPT_FRAMEWORK/cli/operate-work-unit.mjs');

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'wu-cli-'));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
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
    summary: 'done',
    output_files: [{ path: outputPath, role: 'reference', source_url: 'https://example.com/source', source_slug: 'source' }],
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  return resultPath;
}

describe('operate-work-unit inspect', () => {
  it('claim allocates a delegated queue-front work unit', () => {
    const dir = tempBundle();
    try {
      saveQueueWith(dir, [queueItem()]);
      const stdout = execFileSync(process.execPath, [CLI, 'claim', dir, '--phase', 'wave0', '--count', '1'], { encoding: 'utf-8' });
      const out = JSON.parse(stdout);
      assert.equal(out.claimed_count, 1);
      assert.deepEqual(out.claimed_work_ids, ['wu-w0-b000-src-i0001']);
      assert.match(JSON.stringify(out.prompt_refs), /_work_units\/wave0\/wu-w0-b000-src-i0001\/task\.md/);
      assert.match(out.prompt_refs[0].spawn_prompt, /runtime-receipt\.jsonl/);
      assert.match(out.prompt_refs[0].spawn_prompt, /result\.schema\.json/);
      assert.match(out.prompt_refs[0].spawn_prompt, /runtime_refs diagnostic metadata/);
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
