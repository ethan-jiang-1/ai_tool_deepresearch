// @impl DEW-005, AGQ-002, AGO-002, AGO-003, WPG-002, FRE-005

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createQueue,
  enqueue,
  loadQueue,
  makeItem,
  saveQueue,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import {
  WORK_UNIT_OUTPUT_LEDGER,
  claimWorkUnits,
  inspectWorkUnits,
  loadWorkUnitIndex,
  readWorkUnitLedgerRows,
  submitWorkUnit,
  workUnitsRoot,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'wu-submit-'));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function delegated(id) {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { topic_slug: id },
  });
}

function saveSeedQueue(dir, items) {
  let queue = createQueue(path.basename(dir));
  for (const item of items) queue = enqueue(queue, item);
  saveQueue(dir, queue);
}

function ledgerRows(dir) {
  const file = path.join(dir, WORK_UNIT_OUTPUT_LEDGER);
  return readFileSync(file, 'utf-8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeValidSubmitFiles(dir, record, { summary = 'done' } = {}) {
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
    summary,
    output_files: [{ path: outputPath, role: 'reference', source_url: 'https://example.com/source', source_slug: 'source' }],
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  return resultPath;
}

function cacheTrailPath(record) {
  return `_cache/wave0/primary/${record.queue_item_id}/s01_source`;
}

function readResult(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf-8'));
}

function writeResult(pathname, value) {
  writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`);
}

describe('submitWorkUnit', () => {
  it('submits an out-of-order work unit and completes only the bound queue demand', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a'), delegated('queue-b')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 2 });
      const index = loadWorkUnitIndex(dir);
      const second = index.work_units['wu-w0-b000-src-i0002'];
      const resultPath = writeValidSubmitFiles(dir, second);

      const submitted = submitWorkUnit(dir, { work_id: second.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(submitted.duplicate, false);

      const queue = loadQueue(dir);
      assert.ok(queue.delegated_in_flight['queue-a']);
      assert.equal(queue.delegated_in_flight['queue-b'], undefined);
      assert.equal(queue.terminal_history.at(-1).queue_item_id, 'queue-b');
      assert.equal(queue.terminal_history.at(-1).work_id, second.work_id);

      const savedIndex = loadWorkUnitIndex(dir);
      assert.equal(savedIndex.work_units[second.work_id].status, 'submitted');
      assert.equal(savedIndex.work_units[second.work_id].result_hash, submitted.result_hash);
      assert.equal(savedIndex.work_units[second.work_id].ledger_record_hash, submitted.ledger_record_hash);

      const rows = ledgerRows(dir);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].work_id, second.work_id);
      assert.equal(rows[0].queue_item_id, 'queue-b');
      assert.equal(rows[0].wave, second.wave);
      assert.equal(rows[0].kind, second.kind);
      assert.equal(rows[0].producer_rule, second.producer_rule);
      assert.equal(rows[0].creation_reason, second.creation_reason);
      assert.equal(rows[0].result_ref, second.paths.result_ref);
      assert.equal(rows[0].runtime_receipt_ref, second.paths.runtime_receipt_ref);
      assert.equal(rows[0].receipt_nonce, second.receipt_nonce);
      assert.equal(rows[0].result_hash, submitted.result_hash);
      assert.equal(rows[0].ledger_record_hash, submitted.ledger_record_hash);
      assert.equal(rows[0].work_unit_ref, second.paths.work_unit_dir);
      assert.equal(existsSync(path.join(workUnitsRoot(dir), '_ledger.jsonl')), false);
      assert.equal(readWorkUnitLedgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('inspect treats ledger as authority and submitted filesystem/index surfaces as cross-checks only', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(inspectWorkUnits(dir).passed, true);

      writeFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER), '');
      const missingLedger = inspectWorkUnits(dir);
      assert.equal(missingLedger.passed, false);
      assert.match(missingLedger.inspect.join('\n'), /submitted work unit missing ledger row/);
    } finally {
      cleanup(dir);
    }
  });

  it('inspect rejects ledger hash drift and unsupported secondary work-unit ledger', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      submitWorkUnit(dir, { work_id: record.work_id, resultPath });

      const [row] = ledgerRows(dir);
      row.cache_trails = [];
      writeFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER), `${JSON.stringify(row)}\n`);
      mkdirSync(workUnitsRoot(dir), { recursive: true });
      writeFileSync(path.join(workUnitsRoot(dir), '_ledger.jsonl'), '{}\n');

      const result = inspectWorkUnits(dir);
      assert.equal(result.passed, false);
      assert.match(result.inspect.join('\n'), /unsupported delegated ledger/);
      assert.match(result.inspect.join('\n'), /ledger_record_hash mismatch/);
    } finally {
      cleanup(dir);
    }
  });

  it('is idempotent for same-content duplicate submit and rejects different content', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);

      const first = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      const second = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(second.duplicate, true);
      assert.equal(second.result_hash, first.result_hash);
      assert.equal(ledgerRows(dir).length, 1);

      const changedPath = writeValidSubmitFiles(dir, record, { summary: 'changed' });
      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath: changedPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.reason_code, 'duplicate_content_mismatch');
      assert.equal(ledgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('records non-terminal submit rejection without queue completion or ledger append', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), '');

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.equal(rejected.last_submit_rejection.reason_code, 'missing_receipt');
      assert.equal(loadQueue(dir).delegated_in_flight['queue-a'].work_id, record.work_id);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed');
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].last_submit_rejection.reason_code, 'missing_receipt');
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('keeps invalid submit cases non-terminal for corrected submit', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const missingOutputPath = writeValidSubmitFiles(dir, record);
      rmSync(path.join(dir, `reference/${record.work_id}.md`), { force: true });

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath: missingOutputPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.last_submit_rejection.reason_code, 'missing_output');
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed');

      const correctedPath = writeValidSubmitFiles(dir, record);
      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath: correctedPath });
      assert.equal(submitted.ok, true);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'submitted');
      assert.equal(ledgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('keeps nonce mismatch, invalid result, missing cache, stale snapshot, and wrong work_id non-terminal', () => {
    const cases = [
      {
        name: 'nonce mismatch',
        reasonCode: 'nonce_mismatch',
        mutate(dir, record, resultPath) {
          const result = readResult(resultPath);
          result.receipt_nonce = 'wu-00000000-0000-0000-0000-000000000000';
          writeResult(resultPath, result);
        },
      },
      {
        name: 'invalid result',
        reasonCode: 'invalid_result',
        mutate(dir, record, resultPath) {
          const result = readResult(resultPath);
          delete result.kind;
          writeResult(resultPath, result);
        },
      },
      {
        name: 'missing cache',
        reasonCode: 'missing_cache',
        mutate(dir, record, resultPath) {
          const result = readResult(resultPath);
          result.cache_trails = [];
          writeResult(resultPath, result);
        },
      },
      {
        name: 'stale snapshot',
        reasonCode: 'stale_snapshot',
        mutate(dir, record) {
          const index = loadWorkUnitIndex(dir);
          const manifestPath = path.join(dir, record.paths.manifest_ref);
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
          manifest.queue_item.title = 'Changed after claim';
          writeResult(manifestPath, manifest);
          index.work_units[record.work_id] = record;
        },
      },
      {
        name: 'wrong work_id',
        reasonCode: 'wrong_work_id',
        mutate(dir, record, resultPath) {
          const result = readResult(resultPath);
          result.work_id = 'wu-w0-b000-src-i9999';
          writeResult(resultPath, result);
        },
      },
    ];

    for (const testCase of cases) {
      const dir = tempBundle();
      try {
        saveSeedQueue(dir, [delegated('queue-a')]);
        claimWorkUnits(dir, { phase: 'wave0', count: 1 });
        const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
        const resultPath = writeValidSubmitFiles(dir, record);
        testCase.mutate(dir, record, resultPath);

        const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
        assert.equal(rejected.ok, false, testCase.name);
        assert.equal(rejected.status, 'claimed', testCase.name);
        assert.equal(rejected.last_submit_rejection.reason_code, testCase.reasonCode, testCase.name);
        assert.equal(loadQueue(dir).delegated_in_flight['queue-a'].work_id, record.work_id, testCase.name);
        assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed', testCase.name);
        assert.throws(() => ledgerRows(dir), /ENOENT/, testCase.name);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('rejects placeholder, empty, and unmapped cache pages before ledger append', () => {
    const cases = [
      {
        name: 'placeholder page',
        mutate(dir, record) {
          writeFileSync(path.join(dir, cacheTrailPath(record), 'page.md'), '# Page\n');
        },
      },
      {
        name: 'empty page',
        mutate(dir, record) {
          writeFileSync(path.join(dir, cacheTrailPath(record), 'page.md'), '');
        },
      },
      {
        name: 'missing url mapping',
        mutate(dir, record) {
          writeFileSync(path.join(dir, cacheTrailPath(record), 'meta.json'), '{"title":"No URL"}\n');
        },
      },
    ];

    for (const testCase of cases) {
      const dir = tempBundle();
      try {
        saveSeedQueue(dir, [delegated('queue-a')]);
        claimWorkUnits(dir, { phase: 'wave0', count: 1 });
        const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
        const resultPath = writeValidSubmitFiles(dir, record);
        testCase.mutate(dir, record);

        const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
        assert.equal(rejected.ok, false, testCase.name);
        assert.equal(rejected.status, 'claimed', testCase.name);
        assert.equal(rejected.last_submit_rejection.reason_code, 'missing_cache', testCase.name);
        assert.match(rejected.inspect.join('\n'), /incomplete cache content/, testCase.name);
        assert.throws(() => ledgerRows(dir), /ENOENT/, testCase.name);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('accepts explicit degraded cache capture while preserving submit authority', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      writeFileSync(path.join(dir, cacheTrailPath(record), 'page.md'), '# Cache page for blocked source\n\nDegraded capture: fetch-failure after HTTP 403 from source URL.\n');
      writeFileSync(path.join(dir, cacheTrailPath(record), 'meta.json'), JSON.stringify({
        url: 'https://example.com/source',
        capture_status: 'degraded',
        failure_reason: 'HTTP 403',
      }, null, 2));

      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(ledgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('inspect catches submitted cache content drift', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      writeFileSync(path.join(dir, cacheTrailPath(record), 'page.md'), '# Page\n');

      const inspected = inspectWorkUnits(dir);
      assert.equal(inspected.passed, false);
      assert.match(inspected.inspect.join('\n'), /ledger cache trail incomplete/);
      assert.match(inspected.inspect.join('\n'), /placeholder-only/);
    } finally {
      cleanup(dir);
    }
  });
});
