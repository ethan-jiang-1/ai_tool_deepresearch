// @impl DEW-005, AGQ-002, AGO-002, AGO-003, WPG-002, FRE-005

import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function delegated(id, overrides = {}) {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { topic_slug: id },
    ...overrides,
  });
}

function delegatedWave1(id, topicSlug = 'topic-a') {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 } },
    kind: 'wave1_topic_deepening',
    producer_rule: 'wave1_topic_deepening_dispatch',
    payload: { topic_slug: topicSlug },
  });
}

function delegatedWave2(id, findingId = 'W2F-001') {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-topic-scout', timeout_ms: 600000 } },
    kind: 'wave2_targeted_evidence',
    producer_rule: 'targeted_evidence_search',
    payload: { finding_id: findingId, wave: 2 },
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

function writeValidWave1SubmitFiles(dir, record, {
  topicSlug = 'topic-a',
  sourceUrl = 'https://example.com/wave1-new-source',
  includeClaimCacheRefs = true,
  acceptedSourceUrls = [sourceUrl],
  claimStatus = 'accepted',
} = {}) {
  const referencePath = `artifacts/wave1/${topicSlug}/reference/00-new-source.md`;
  const evidencePath = `artifacts/wave1/${topicSlug}/evidence-summary.md`;
  const questionPath = `artifacts/wave1/${topicSlug}/question-list.md`;
  for (const outputPath of [referencePath, evidencePath, questionPath]) {
    mkdirSync(path.dirname(path.join(dir, outputPath)), { recursive: true });
    writeFileSync(path.join(dir, outputPath), `# ${path.basename(outputPath)}\n\nEvidence for ${topicSlug}.\n`);
  }

  const cacheTrail = `_cache/wave1/primary/${record.queue_item_id}/new-source`;
  mkdirSync(path.join(dir, cacheTrail), { recursive: true });
  writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(dir, cacheTrail, 'page.md'), `# Captured Page\n\nFetched content capture for ${sourceUrl}. This body preserves the source text used by the Wave1 work unit.\n`);
  writeFileSync(path.join(dir, cacheTrail, 'meta.json'), `${JSON.stringify({ url: sourceUrl }, null, 2)}\n`);

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
    summary: 'wave1 done',
    output_files: [
      { path: referencePath, role: 'reference', source_url: sourceUrl, source_slug: 'new-source' },
      { path: evidencePath, role: 'evidence_summary' },
      { path: questionPath, role: 'question_list' },
    ],
    source_claims: [{
      url: sourceUrl,
      source_ref: referencePath,
      acceptance_status: claimStatus,
      is_new_vs_wave0: true,
      cache_trail_refs: includeClaimCacheRefs ? [cacheTrail] : [],
    }],
    accepted_source_urls: acceptedSourceUrls,
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  return resultPath;
}

function writeValidWave2SubmitFiles(dir, record, {
  findingId = 'W2F-001',
  sourceUrl = 'https://example.com/wave2-targeted-source',
  role = 'evidence_summary',
} = {}) {
  const outputPath = `artifacts/wave2/targeted/${findingId}.md`;
  mkdirSync(path.dirname(path.join(dir, outputPath)), { recursive: true });
  writeFileSync(path.join(dir, outputPath), `# Targeted evidence ${findingId}\n\nEvidence for ${findingId}.\n`);

  const cacheTrail = `_cache/wave2/primary/${record.queue_item_id}/targeted-source`;
  mkdirSync(path.join(dir, cacheTrail), { recursive: true });
  writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(dir, cacheTrail, 'page.md'), `# Captured Page\n\nFetched content capture for ${sourceUrl}. This body preserves the source text used by the Wave2 work unit.\n`);
  writeFileSync(path.join(dir, cacheTrail, 'meta.json'), `${JSON.stringify({ url: sourceUrl }, null, 2)}\n`);

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
    summary: 'wave2 done',
    output_files: [
      { path: outputPath, role },
    ],
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

function receiptEvents(dir, record) {
  return readFileSync(path.join(dir, record.paths.runtime_receipt_ref), 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function assignedResult(dir, record) {
  return readResult(path.join(dir, record.paths.result_ref));
}

function assertNoLedger(dir) {
  assert.equal(existsSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), false);
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
      assert.equal(submitted.queue.delegated_in_flight['queue-b'], undefined);
      assert.equal(submitted.queue.terminal_history.some((entry) => entry.queue_item_id === 'queue-b' && entry.work_id === second.work_id), true);

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

  it('fails closed and rolls back when durable queue postcondition is missing', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);

      const failed = submitWorkUnit(dir, {
        work_id: record.work_id,
        resultPath,
        afterQueueSave({ bundleDir }) {
          const queuePath = path.join(bundleDir, 'rb_queue.json');
          const queue = JSON.parse(readFileSync(queuePath, 'utf-8'));
          queue.terminal_history = [];
          writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
        },
      });

      assert.equal(failed.ok, false);
      assert.equal(failed.reason_code, 'queue_postcondition_failed');
      assert.equal(failed.rollback.restored, true);
      assert.equal(failed.suspect_state, false);
      assert.ok(failed.missing_postconditions.some((item) => item.includes('terminal_history')));
      assert.equal(loadQueue(dir).delegated_in_flight['queue-a'].work_id, record.work_id);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed');
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('marks work-unit and queue completion suspect when rollback cannot be proven', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const queuePath = path.join(dir, 'rb_queue.json');

      const failed = submitWorkUnit(dir, {
        work_id: record.work_id,
        resultPath,
        afterQueueSave({ bundleDir }) {
          const queue = JSON.parse(readFileSync(queuePath, 'utf-8'));
          queue.terminal_history = [];
          writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
          chmodSync(queuePath, 0o444);
        },
      });

      assert.equal(failed.ok, false);
      assert.equal(failed.reason_code, 'queue_postcondition_failed');
      assert.equal(failed.rollback.restored, false);
      assert.equal(failed.suspect_state, true);
      assert.match(failed.inspect.join('\n'), /suspect/);
      chmodSync(queuePath, 0o644);
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

  it('canonicalizes a single result wrapper and rejects wrapper siblings before ledger append', () => {
    const acceptedDir = tempBundle();
    try {
      saveSeedQueue(acceptedDir, [delegated('queue-a')]);
      claimWorkUnits(acceptedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(acceptedDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(acceptedDir, record);
      const flatResult = readResult(resultPath);
      writeResult(resultPath, { result: flatResult });

      const submitted = submitWorkUnit(acceptedDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(submitted.normalizations.some((item) => item.kind === 'result_wrapper_unwrapped'), true);
      const persisted = assignedResult(acceptedDir, record);
      assert.equal(Object.hasOwn(persisted, 'result'), false);
      assert.equal(persisted.work_id, record.work_id);
      const [row] = ledgerRows(acceptedDir);
      assert.equal(Object.hasOwn(row, 'result'), false);
      assert.equal(row.work_id, record.work_id);
      assert.equal(row.receipt_nonce, record.receipt_nonce);
    } finally {
      cleanup(acceptedDir);
    }

    const rejectedDir = tempBundle();
    try {
      saveSeedQueue(rejectedDir, [delegated('queue-a')]);
      claimWorkUnits(rejectedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(rejectedDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(rejectedDir, record);
      writeResult(resultPath, { result: readResult(resultPath), note: 'unsafe sibling' });

      const rejected = submitWorkUnit(rejectedDir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.match(rejected.inspect.join('\n'), /unsafe result wrapper/);
      assertNoLedger(rejectedDir);
    } finally {
      cleanup(rejectedDir);
    }
  });

  it('canonicalizes missing receipt schema and binding identity while rejecting receipt conflicts', () => {
    const acceptedDir = tempBundle();
    try {
      saveSeedQueue(acceptedDir, [delegated('queue-a')]);
      claimWorkUnits(acceptedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(acceptedDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(acceptedDir, record);
      writeFileSync(path.join(acceptedDir, record.paths.runtime_receipt_ref), `${JSON.stringify({
        event: 'work_done',
        ts: '2026-07-06T00:00:00.000Z',
        detail: { preserved: true },
      })}\n`);

      const submitted = submitWorkUnit(acceptedDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(submitted.normalizations.some((item) => item.kind === 'receipt_schema_defaulted'), true);
      assert.equal(submitted.normalizations.some((item) => (
        item.kind === 'receipt_binding_identity_autofilled'
          && item.fields.includes('work_id')
          && item.fields.includes('receipt_nonce')
      )), true);
      const [event] = receiptEvents(acceptedDir, record);
      assert.equal(event.schema_version, 'work-unit.receipt-event.v1');
      assert.equal(event.work_id, record.work_id);
      assert.equal(event.queue_item_id, record.queue_item_id);
      assert.equal(event.kind, record.kind);
      assert.equal(event.receipt_nonce, record.receipt_nonce);
      assert.deepEqual(event.detail, { preserved: true });
    } finally {
      cleanup(acceptedDir);
    }

    const cases = [
      {
        name: 'schema conflict',
        event(record) {
          return {
            schema_version: 'work-unit.receipt-event.v999',
            event: 'work_done',
            work_id: record.work_id,
            queue_item_id: record.queue_item_id,
            kind: record.kind,
            receipt_nonce: record.receipt_nonce,
          };
        },
        pattern: /schema_version mismatch/,
      },
      {
        name: 'binding conflict',
        event(record) {
          return {
            event: 'work_done',
            work_id: record.work_id,
            queue_item_id: 'wrong-queue',
            kind: record.kind,
            receipt_nonce: record.receipt_nonce,
          };
        },
        pattern: /runtime receipt mismatch/,
      },
      {
        name: 'invalid jsonl',
        raw: '{"event":"work_done"\n',
        pattern: /invalid JSONL/,
      },
    ];

    for (const testCase of cases) {
      const dir = tempBundle();
      try {
        saveSeedQueue(dir, [delegated('queue-a')]);
        claimWorkUnits(dir, { phase: 'wave0', count: 1 });
        const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
        const resultPath = writeValidSubmitFiles(dir, record);
        const raw = testCase.raw ?? `${JSON.stringify(testCase.event(record))}\n`;
        writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), raw);

        const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
        assert.equal(rejected.ok, false, testCase.name);
        assert.match(rejected.inspect.join('\n'), testCase.pattern, testCase.name);
        assertNoLedger(dir);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('canonicalizes page-content.md cache leaves and rejects divergent or missing authority files', () => {
    const acceptedDir = tempBundle();
    try {
      saveSeedQueue(acceptedDir, [delegated('queue-a')]);
      claimWorkUnits(acceptedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(acceptedDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(acceptedDir, record);
      const cacheDir = path.join(acceptedDir, cacheTrailPath(record));
      const pageText = readFileSync(path.join(cacheDir, 'page.md'), 'utf-8');
      rmSync(path.join(cacheDir, 'page.md'), { force: true });
      writeFileSync(path.join(cacheDir, 'page-content.md'), pageText);

      const submitted = submitWorkUnit(acceptedDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(submitted.normalizations.some((item) => item.kind === 'cache_page_content_canonicalized'), true);
      assert.equal(readFileSync(path.join(cacheDir, 'page.md'), 'utf-8'), pageText);
    } finally {
      cleanup(acceptedDir);
    }

    const sidecarDir = tempBundle();
    try {
      saveSeedQueue(sidecarDir, [delegated('queue-a')]);
      claimWorkUnits(sidecarDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(sidecarDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(sidecarDir, record);
      const cacheDir = path.join(sidecarDir, cacheTrailPath(record));
      writeFileSync(path.join(cacheDir, 'page-content.md'), readFileSync(path.join(cacheDir, 'page.md'), 'utf-8'));

      const submitted = submitWorkUnit(sidecarDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(ledgerRows(sidecarDir).length, 1);
    } finally {
      cleanup(sidecarDir);
    }

    const cases = [
      {
        name: 'divergent page sidecar',
        mutate(dir, record) {
          writeFileSync(path.join(dir, cacheTrailPath(record), 'page-content.md'), '# Different captured page\n');
        },
        pattern: /divergent page\.md and page-content\.md/,
      },
      {
        name: 'missing websearch',
        mutate(dir, record) {
          rmSync(path.join(dir, cacheTrailPath(record), 'websearch.json'), { force: true });
        },
        pattern: /missing websearch\.json/,
      },
      {
        name: 'missing meta',
        mutate(dir, record) {
          rmSync(path.join(dir, cacheTrailPath(record), 'meta.json'), { force: true });
        },
        pattern: /missing meta\.json/,
      },
      {
        name: 'missing page authority',
        mutate(dir, record) {
          rmSync(path.join(dir, cacheTrailPath(record), 'page.md'), { force: true });
          rmSync(path.join(dir, cacheTrailPath(record), 'page-content.md'), { force: true });
        },
        pattern: /missing page\.md/,
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
        assert.match(rejected.inspect.join('\n'), testCase.pattern, testCase.name);
        assertNoLedger(dir);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('normalizes stale nonce only for complete binding inside the assigned work-unit directory', () => {
    const acceptedDir = tempBundle();
    try {
      saveSeedQueue(acceptedDir, [delegated('queue-a')]);
      claimWorkUnits(acceptedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(acceptedDir).work_units['wu-w0-b000-src-i0001'];
      const tmpResultPath = writeValidSubmitFiles(acceptedDir, record);
      const assignedResultPath = path.join(acceptedDir, record.paths.result_ref);
      const staleNonce = 'wu-11111111-1111-1111-1111-111111111111';
      const result = readResult(tmpResultPath);
      result.receipt_nonce = staleNonce;
      writeResult(assignedResultPath, result);
      writeFileSync(path.join(acceptedDir, record.paths.runtime_receipt_ref), `${JSON.stringify({
        event: 'work_done',
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        kind: record.kind,
        receipt_nonce: staleNonce,
        ts: '2026-07-06T00:00:00.000Z',
      })}\n`);

      const submitted = submitWorkUnit(acceptedDir, { work_id: record.work_id, resultPath: assignedResultPath });
      assert.equal(submitted.ok, true);
      assert.equal(submitted.normalizations.filter((item) => item.kind === 'nonce_normalized_from_record').length, 2);
      assert.equal(assignedResult(acceptedDir, record).receipt_nonce, record.receipt_nonce);
      assert.equal(receiptEvents(acceptedDir, record)[0].receipt_nonce, record.receipt_nonce);
    } finally {
      cleanup(acceptedDir);
    }

    const escapedDir = tempBundle();
    try {
      saveSeedQueue(escapedDir, [delegated('queue-a')]);
      claimWorkUnits(escapedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(escapedDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(escapedDir, record);
      const result = readResult(resultPath);
      result.receipt_nonce = 'wu-22222222-2222-2222-2222-222222222222';
      writeResult(resultPath, result);

      const rejected = submitWorkUnit(escapedDir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.last_submit_rejection.reason_code, 'nonce_mismatch');
      assertNoLedger(escapedDir);
    } finally {
      cleanup(escapedDir);
    }

    const wrongIdentityDir = tempBundle();
    try {
      saveSeedQueue(wrongIdentityDir, [delegated('queue-a')]);
      claimWorkUnits(wrongIdentityDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(wrongIdentityDir).work_units['wu-w0-b000-src-i0001'];
      const tmpResultPath = writeValidSubmitFiles(wrongIdentityDir, record);
      const assignedResultPath = path.join(wrongIdentityDir, record.paths.result_ref);
      const result = readResult(tmpResultPath);
      result.queue_item_id = 'wrong-queue';
      result.receipt_nonce = 'wu-33333333-3333-3333-3333-333333333333';
      writeResult(assignedResultPath, result);

      const rejected = submitWorkUnit(wrongIdentityDir, { work_id: record.work_id, resultPath: assignedResultPath });
      assert.equal(rejected.ok, false);
      assert.match(rejected.inspect.join('\n'), /queue_item_id/);
      assertNoLedger(wrongIdentityDir);
    } finally {
      cleanup(wrongIdentityDir);
    }

    const exactIdentityDir = tempBundle();
    try {
      saveSeedQueue(exactIdentityDir, [delegated('queue-a')]);
      claimWorkUnits(exactIdentityDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(exactIdentityDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(exactIdentityDir, record);

      const submitted = submitWorkUnit(exactIdentityDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(assignedResult(exactIdentityDir, record).receipt_nonce, record.receipt_nonce);
      assert.equal(ledgerRows(exactIdentityDir).length, 1);
    } finally {
      cleanup(exactIdentityDir);
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

  it('accepts Wave1 structured source claims backed by submitted cache trails', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record);

      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      const [row] = readWorkUnitLedgerRows(dir);
      assert.equal(row.source_claims.length, 1);
      assert.deepEqual(row.accepted_source_urls, ['https://example.com/wave1-new-source']);
    } finally {
      cleanup(dir);
    }
  });

  it('normalizes Wave1 required output roles before ledger append while preserving extra other outputs', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record);
      const extraPath = 'artifacts/wave1/topic-a/notes.md';
      mkdirSync(path.dirname(path.join(dir, extraPath)), { recursive: true });
      writeFileSync(path.join(dir, extraPath), '# Extra notes\n\nNon-blocking notes.\n');

      const result = readResult(resultPath);
      result.output_files = result.output_files.map((entry) => {
        if (entry.path.endsWith('/evidence-summary.md') || entry.path.endsWith('/question-list.md')) {
          return { ...entry, role: 'other' };
        }
        return entry;
      });
      result.output_files.push({ path: extraPath, role: 'other' });
      writeResult(resultPath, result);

      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      const roleNormalizations = submitted.normalizations.filter((item) => item.kind === 'wave1_required_output_role_normalized');
      assert.equal(roleNormalizations.length, 2);
      assert.deepEqual(roleNormalizations.map((item) => item.to).sort(), ['evidence_summary', 'question_list']);
      assert.ok(roleNormalizations.every((item) => item.from === 'other' && item.surface_ref.startsWith('artifacts/wave1/topic-a/')));

      const [row] = ledgerRows(dir);
      assert.deepEqual(row.output_files.map((entry) => entry.role), ['reference', 'evidence_summary', 'question_list', 'other']);
      assert.deepEqual(assignedResult(dir, record).output_files.map((entry) => entry.role), ['reference', 'evidence_summary', 'question_list', 'other']);

      const duplicate = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(duplicate.ok, true);
      assert.equal(duplicate.duplicate, true);
      assert.equal(duplicate.result_hash, submitted.result_hash);
      assert.equal(ledgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects accepted_source_urls without matching accepted Wave1 source claims', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record, {
        acceptedSourceUrls: ['https://example.com/wave1-new-source', 'https://example.com/unclaimed'],
      });

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.equal(rejected.last_submit_rejection.reason_code, 'invalid_result');
      assert.match(rejected.inspect.join('\n'), /no matching accepted source_claims/);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects accepted Wave1 source claims without cache refs or degraded capture', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record, { includeClaimCacheRefs: false });

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.equal(rejected.last_submit_rejection.reason_code, 'missing_cache');
      assert.match(rejected.inspect.join('\n'), /requires cache_trail_refs/);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects source claims for work-unit kinds whose output contract disallows them', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const result = readResult(resultPath);
      result.source_claims = [{
        url: 'https://example.com/source',
        source_ref: result.output_files[0].path,
        acceptance_status: 'accepted',
        is_new_vs_wave0: true,
        cache_trail_refs: result.cache_trails,
      }];
      result.accepted_source_urls = ['https://example.com/source'];
      writeResult(resultPath, result);

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.equal(rejected.last_submit_rejection.reason_code, 'invalid_result');
      assert.match(rejected.inspect.join('\n'), /not allowed by this work-unit output contract/);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects source claim extra keys before ledger append', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record);
      const result = readResult(resultPath);
      result.source_claims[0].capture_note = 'not part of WorkUnitSourceClaimSchema';
      writeResult(resultPath, result);

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.equal(rejected.last_submit_rejection.reason_code, 'invalid_result');
      assert.match(rejected.inspect.join('\n'), /capture_note|unrecognized/i);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('enforces kind output role enums before ledger append', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const result = readResult(resultPath);
      result.output_files[0].role = 'question_list';
      writeResult(resultPath, result);

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.match(rejected.inspect.join('\n'), /role 'question_list'.*allowed roles/i);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('honors output_contract.required_result_fields before parser defaults', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a', {
        output_contract: {
          required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'summary', 'output_files', 'cache_trails'],
          output_files: {
            required: true,
            allowed_roles: ['reference', 'source_yaml', 'other'],
            reference_requires_source_url: true,
          },
        },
      })]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const result = readResult(resultPath);
      delete result.summary;
      writeResult(resultPath, result);

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.match(rejected.inspect.join('\n'), /missing required field.*summary/i);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('accepts registered kind output roles still allowed by each output contract', () => {
    const wave0Dir = tempBundle();
    try {
      saveSeedQueue(wave0Dir, [delegated('queue-a')]);
      claimWorkUnits(wave0Dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(wave0Dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(wave0Dir, record);
      const result = readResult(resultPath);
      result.output_files[0].role = 'source_yaml';
      delete result.output_files[0].source_url;
      delete result.output_files[0].source_slug;
      writeResult(resultPath, result);

      const submitted = submitWorkUnit(wave0Dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(ledgerRows(wave0Dir)[0].output_files[0].role, 'source_yaml');
    } finally {
      cleanup(wave0Dir);
    }

    const wave1Dir = tempBundle();
    try {
      saveSeedQueue(wave1Dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(wave1Dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(wave1Dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(wave1Dir, record);

      const submitted = submitWorkUnit(wave1Dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.deepEqual(ledgerRows(wave1Dir)[0].output_files.map((entry) => entry.role), ['reference', 'evidence_summary', 'question_list']);
    } finally {
      cleanup(wave1Dir);
    }

    const wave2Dir = tempBundle();
    try {
      saveSeedQueue(wave2Dir, [delegatedWave2('wave2-targeted-a')]);
      claimWorkUnits(wave2Dir, { phase: 'wave2', count: 1 });
      const record = loadWorkUnitIndex(wave2Dir).work_units['wu-w2-b000-targ-i0001'];
      const resultPath = writeValidWave2SubmitFiles(wave2Dir, record);

      const submitted = submitWorkUnit(wave2Dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(ledgerRows(wave2Dir)[0].output_files[0].role, 'evidence_summary');
    } finally {
      cleanup(wave2Dir);
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
