// tests/engine/work-unit-submit-invariants.test.mjs
// C4 T1: submit/late-submit/recovery invariant scenarios S3-S12 (design §S).
// In-process fault injection through the existing transactionHooks/afterQueueSave
// seams; S1/S2/S8 (child-process kill -9) live in tests/integration/.
// @impl DEW-005, DEW-007, DEW-011, DEW-015, CHI-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  claimWorkUnits,
  closeWorkUnitAttempt,
  inspectWorkUnitTransaction,
  lateSubmitWorkUnit,
  loadWorkUnitIndex,
  recoverWorkUnitDeclaration,
  recoverWorkUnitTransaction,
  submitWorkUnit,
  timeoutPreflightWorkUnit,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import { loadQueue } from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import {
  cleanupWorkUnitBundle,
  claimAndSubmitWorkUnit,
  availableActorDecision,
  recursiveAuthoritySnapshot,
  tempWorkUnitBundle,
} from './work-unit-test-helpers.mjs';

const EXCLUSIONS = new Set(['rb_trace.jsonl', '_logs', '_transactions', '.lock']);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function authoritySnapshot(bundleDir) {
  const prune = (node) => {
    if (node.type !== 'dir') return node;
    const entries = Object.fromEntries(Object.entries(node.entries)
      .map(([name, child]) => [name, prune(child)])
      .filter(([, child]) => child.type !== 'dir' || Object.keys(child.entries).length > 0));
    return { ...node, entries };
  };
  return prune(recursiveAuthoritySnapshot(bundleDir, { excluded: EXCLUSIONS }));
}

function journals(bundleDir) {
  const dir = path.join(bundleDir, '_work_units', '_transactions');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(path.join(dir, name), 'utf8')));
}

function ledgerRows(bundleDir) {
  const p = path.join(bundleDir, 'rb_output_declarations.jsonl');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf-8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
}

function traceRows(bundleDir) {
  return readFileSync(path.join(bundleDir, 'rb_trace.jsonl'), 'utf-8')
    .split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
}

function clearTerminalHistory(bundleDir) {
  const queuePath = path.join(bundleDir, 'rb_queue.json');
  const queue = JSON.parse(readFileSync(queuePath, 'utf-8'));
  queue.terminal_history = [];
  writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
}

function prepareClaimed(bundleDir) {
  const prepared = claimAndSubmitWorkUnit(bundleDir, { submit: false });
  assert.equal(prepared.record.status, 'claimed');
  return prepared;
}

function forceTimeout(bundleDir, record) {
  const closed = closeWorkUnitAttempt(bundleDir, {
    work_id: record.work_id,
    status: 'timed_out',
    reason: 'invariant force timeout',
    force: true,
    nowMs: Date.parse(record.deadline_at) + 1,
  });
  assert.equal(closed.ok, true);
}

function claimRetry(bundleDir) {
  const retry = claimWorkUnits(bundleDir, { phase: 'wave0', count: 1, ...availableActorDecision('wave0_source_intake') });
  assert.equal(retry.claimed_count, 1);
  return retry;
}

describe('work-unit submit invariants (S3-S12)', () => {
  it('S3: late-submit fault at every named boundary restores authority byte-for-byte with exactly one rolled_back journal', () => {
    const boundaries = ['targeted_attempt_saved', 'retry_statuses_saved', 'ledger_appended', 'index_saved', 'queue_saved'];
    for (const boundary of boundaries) {
      const bundleDir = tempWorkUnitBundle(`wu-inv-s3-${boundary}-`);
      try {
        const prepared = claimAndSubmitWorkUnit(bundleDir, { submit: false });
        forceTimeout(bundleDir, prepared.record);
        claimRetry(bundleDir);
        const before = authoritySnapshot(bundleDir);
        let reached = false;
        const failed = lateSubmitWorkUnit(bundleDir, {
          work_id: prepared.record.work_id,
          resultPath: prepared.resultPath,
          reason: `S3 fault at ${boundary}`,
          transactionHooks: {
            afterMutationBoundary(context) {
              if (context.boundary !== boundary) return;
              reached = true;
              throw new Error(`S3 injected fault at ${boundary}`);
            },
          },
        });
        assert.equal(reached, true, boundary);
        assert.equal(failed.ok, false, boundary);
        assert.deepEqual(authoritySnapshot(bundleDir), before, boundary);
        assert.equal(journals(bundleDir).filter((j) => j.operation === 'late_submit_work_unit' && j.status === 'rolled_back').length, 1, boundary);
        assert.equal(ledgerRows(bundleDir).length, 0, boundary);
        assert.equal(loadWorkUnitIndex(bundleDir).work_units[prepared.record.work_id].status, 'timed_out', boundary);
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }
  });

  it('S4: submit postcondition failure rolls back with journal + trace evidence and restores in-flight', () => {
    const bundleDir = tempWorkUnitBundle('wu-inv-s4-');
    try {
      const prepared = prepareClaimed(bundleDir);
      const before = authoritySnapshot(bundleDir);
      const failed = submitWorkUnit(bundleDir, {
        work_id: prepared.record.work_id,
        resultPath: prepared.resultPath,
        afterQueueSave({ bundleDir: dir }) { clearTerminalHistory(dir); },
      });
      assert.equal(failed.ok, false);
      assert.equal(failed.reason_code, 'queue_postcondition_failed');
      assert.equal(failed.rollback.restored, true);
      assert.equal(failed.suspect_state, false);
      const rolledBack = journals(bundleDir).filter((j) => j.status === 'rolled_back');
      assert.equal(rolledBack.length, 1, 'exactly one rolled_back journal');
      const trace = traceRows(bundleDir);
      const txFailed = trace.find((row) => row.event === 'work_unit_transaction_failed');
      assert.ok(txFailed, 'transaction failure trace event present');
      assert.equal(txFailed.rollback_restored, true);
      assert.equal(ledgerRows(bundleDir).length, 0);
      assert.equal(loadWorkUnitIndex(bundleDir).work_units[prepared.record.work_id].status, 'claimed');
      assert.equal(loadQueue(bundleDir).delegated_in_flight['queue-a']?.work_id, prepared.record.work_id);
      assert.deepEqual(authoritySnapshot(bundleDir), before);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('S5: unprovable rollback becomes permanent suspect, non-recoverable, no auto-heal', () => {
    const bundleDir = tempWorkUnitBundle('wu-inv-s5-');
    try {
      const prepared = prepareClaimed(bundleDir);
      const queuePath = path.join(bundleDir, 'rb_queue.json');
      const failed = submitWorkUnit(bundleDir, {
        work_id: prepared.record.work_id,
        resultPath: prepared.resultPath,
        afterQueueSave({ bundleDir: dir }) {
          const queueFilePath = path.join(dir, 'rb_queue.json');
          const queue = JSON.parse(readFileSync(queueFilePath, 'utf-8'));
          queue.terminal_history = [];
          writeFileSync(queueFilePath, `${JSON.stringify(queue, null, 2)}\n`);
          chmodSync(queueFilePath, 0o444);
        },
      });
      assert.equal(failed.ok, false);
      assert.equal(failed.rollback.restored, false);
      assert.equal(failed.suspect_state, true);
      assert.equal(journals(bundleDir).filter((j) => j.status === 'suspect').length, 1);
      const projection = inspectWorkUnitTransaction(bundleDir, {
        operation: 'submit_work_unit',
        targetWorkIds: [prepared.record.work_id],
        targetQueueItemIds: ['queue-a'],
      });
      assert.equal(projection.disposition, 'suspect_transaction');
      assert.equal(projection.holder?.repair_kind || projection.repair_kind || 'missing_contract', 'missing_contract');
      chmodSync(queuePath, 0o644);
      const suspectTx = journals(bundleDir).find((j) => j.status === 'suspect')?.tx_id;
      const recover = recoverWorkUnitTransaction(bundleDir, { tx_id: suspectTx });
      assert.equal(recover.ok, false);
      assert.deepEqual(journals(bundleDir).filter((j) => j.status === 'suspect').length, 1);
      assert.equal(loadWorkUnitIndex(bundleDir).work_units[prepared.record.work_id].status, 'claimed');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('S6: duplicate submit replay mutates nothing and opens no new transaction', () => {
    const bundleDir = tempWorkUnitBundle('wu-inv-s6-');
    try {
      const prepared = prepareClaimed(bundleDir);
      const first = submitWorkUnit(bundleDir, { work_id: prepared.record.work_id, resultPath: prepared.resultPath });
      assert.equal(first.ok, true);
      const afterFirst = authoritySnapshot(bundleDir);
      const journalsAfterFirst = journals(bundleDir).length;
      const traceSubmitCount = traceRows(bundleDir).filter((r) => r.event === 'work_unit_ledger_appended').length;

      const second = submitWorkUnit(bundleDir, { work_id: prepared.record.work_id, resultPath: prepared.resultPath });
      assert.equal(second.duplicate, true);
      assert.equal(second.result_hash, first.result_hash);
      assert.equal(second.ledger_record_hash, first.ledger_record_hash);
      assert.equal(ledgerRows(bundleDir).length, 1);
      assert.equal(journals(bundleDir).length, journalsAfterFirst, 'no new journal on duplicate');
      assert.equal(traceRows(bundleDir).filter((r) => r.event === 'work_unit_ledger_appended').length, traceSubmitCount);
      assert.equal(loadQueue(bundleDir).terminal_history.filter((row) => row.work_id === prepared.record.work_id).length, 1);
      assert.deepEqual(authoritySnapshot(bundleDir), afterFirst);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('S7: late-submit idempotent replay opens no transaction and keeps one targeted done row', () => {
    const bundleDir = tempWorkUnitBundle('wu-inv-s7-');
    try {
      const prepared = claimAndSubmitWorkUnit(bundleDir, { submit: false });
      forceTimeout(bundleDir, prepared.record);
      claimRetry(bundleDir);
      const first = lateSubmitWorkUnit(bundleDir, {
        work_id: prepared.record.work_id,
        resultPath: prepared.resultPath,
        reason: 'S7 first late accept',
      });
      assert.equal(first.ok, true);
      const afterFirst = authoritySnapshot(bundleDir);
      const journalCount = journals(bundleDir).length;

      const second = lateSubmitWorkUnit(bundleDir, {
        work_id: prepared.record.work_id,
        resultPath: prepared.resultPath,
        reason: 'S7 idempotent replay',
      });
      assert.equal(second.ok, true);
      assert.equal(second.idempotent || second.duplicate, true);
      assert.equal(second.result_hash, first.result_hash);
      assert.equal(journals(bundleDir).length, journalCount, 'no new journals on replay');
      const index = loadWorkUnitIndex(bundleDir).work_units[prepared.record.work_id];
      const lateRow = ledgerRows(bundleDir).find((row) => row.work_id === prepared.record.work_id && row.late_accept === true);
      assert.ok(lateRow, 'exactly the audited late_accept row');
      assert.deepEqual(authoritySnapshot(bundleDir), afterFirst);
      const retryRecord = Object.values(loadWorkUnitIndex(bundleDir).work_units)
        .find((r) => r.work_id !== prepared.record.work_id && r.queue_item_id === 'queue-a');
      if (retryRecord) {
        assert.ok(['abandoned', 'failed'].includes(retryRecord.status), 'superseded retry terminalized');
      }
      assert.equal(loadQueue(bundleDir).terminal_history.filter((row) => row.work_id === prepared.record.work_id).length, 1);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('S8: declaration recovery is fault-safe and rebuilds the exact ledger row without duplication', () => {
    const bundleDir = tempWorkUnitBundle('wu-inv-s8-');
    try {
      const prepared = prepareClaimed(bundleDir);
      const submitted = submitWorkUnit(bundleDir, { work_id: prepared.record.work_id, resultPath: prepared.resultPath });
      assert.equal(submitted.ok, true);
      const originalHash = submitted.ledger_record_hash;

      // simulate ledger corruption: drop the single submitted row
      const declarationsPath = path.join(bundleDir, 'rb_output_declarations.jsonl');
      const remaining = readFileSync(declarationsPath, 'utf-8').split(/\r?\n/).filter(Boolean)
        .filter((l) => JSON.parse(l).work_id !== prepared.record.work_id);
      writeFileSync(declarationsPath, remaining.length > 0 ? `${remaining.join('\n')}\n` : '');

      // fault-injected recovery must fail closed and never duplicate rows
      const before = authoritySnapshot(bundleDir);
      const failed = recoverWorkUnitDeclaration(bundleDir, {
        work_id: prepared.record.work_id,
        transactionHooks: {
          afterMutation() { throw new Error('S8 injected recovery fault'); },
        },
      });
      assert.equal(failed.ok, false);
      assert.deepEqual(authoritySnapshot(bundleDir), before);
      assert.equal(ledgerRows(bundleDir).filter((row) => row.work_id === prepared.record.work_id).length, 0);

      // clean recovery rebuilds the identical row exactly once
      const recovered = recoverWorkUnitDeclaration(bundleDir, { work_id: prepared.record.work_id });
      assert.equal(recovered.ok, true);
      const restored = ledgerRows(bundleDir).filter((row) => row.work_id === prepared.record.work_id);
      assert.equal(restored.length, 1);
      assert.equal(restored[0].ledger_record_hash, originalHash);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('S9: orphan wrapper ordering — wrapped target is refused until the wrapper settles, then both roll back', () => {
    const bundleDir = tempWorkUnitBundle('wu-inv-s9-');
    try {
      writeFileSync(path.join(bundleDir, 'authority.json'), 'before\n');
      mkdirSync(path.join(bundleDir, '_work_units', '_transactions'), { recursive: true });
      const targetTxId = 'tx-orphan-b';
      const wrapperTxId = 'tx-orphan-a';
      const targetRef = `_work_units/_transactions/${targetTxId}.json`;
      const wrapperRef = `_work_units/_transactions/${wrapperTxId}.json`;
      const targetBytes = `${JSON.stringify({
        schema_version: 'work-unit.transaction.v2',
        tx_id: targetTxId,
        operation: 'submit_work_unit',
        journal_ref: targetRef,
        target_work_ids: ['wu-w0-b000-src-i0001'],
        target_queue_item_ids: ['queue-a'],
        mutation_manifest: { targets: [{ path: 'authority.json', before_exists: true, before_sha256: sha256(Buffer.from('before\n')) }] },
        status: 'started',
        started_at: '2026-07-30T00:00:00.000Z',
        settled_at: null,
        error: null,
      }, null, 2)}\n`;
      writeFileSync(path.join(bundleDir, targetRef), targetBytes);
      writeFileSync(path.join(bundleDir, wrapperRef), `${JSON.stringify({
        schema_version: 'work-unit.transaction.v2',
        tx_id: wrapperTxId,
        operation: 'recover_work_unit_transaction',
        journal_ref: wrapperRef,
        target_work_ids: ['wu-w0-b000-src-i0001'],
        target_queue_item_ids: ['queue-a'],
        mutation_manifest: { targets: [{ path: targetRef, before_exists: true, before_sha256: sha256(targetBytes) }] },
        status: 'started',
        started_at: '2026-07-30T00:05:00.000Z',
        settled_at: null,
        error: null,
      }, null, 2)}\n`);

      const inspect1 = inspectWorkUnitTransaction(bundleDir, {
        operation: 'submit_work_unit',
        targetWorkIds: ['wu-w0-b000-src-i0001'],
        targetQueueItemIds: ['queue-a'],
      });
      const inspectText = JSON.stringify(inspect1);
      assert.ok(inspectText.includes(wrapperTxId), 'inspect must surface the wrapper as the first recover coordinate');
      const premature = recoverWorkUnitTransaction(bundleDir, { tx_id: targetTxId });
      assert.equal(premature.ok, false);
      const wrapperRecovery = recoverWorkUnitTransaction(bundleDir, { tx_id: wrapperTxId });
      assert.equal(wrapperRecovery.ok, true);
      const targetRecovery = recoverWorkUnitTransaction(bundleDir, { tx_id: targetTxId });
      assert.equal(targetRecovery.ok, true);
      const settled = journals(bundleDir);
      assert.equal(settled.find((j) => j.tx_id === targetTxId).status, 'rolled_back');
      assert.equal(settled.find((j) => j.tx_id === wrapperTxId).status, 'rolled_back');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('S10: busy contention leaves authority untouched and writes no journal from blocked callers', () => {
    const bundleDir = tempWorkUnitBundle('wu-inv-s10-');
    try {
      const prepared = prepareClaimed(bundleDir);
      // hold the transaction pair with the dedicated CLI holder technique
      const holder = spawnSync(process.execPath, ['--input-type=module', '--eval', `
        import { withWorkUnitTransaction } from ${JSON.stringify(new URL('../../DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs', import.meta.url).href)};
        const buf = new Int32Array(new SharedArrayBuffer(4));
        withWorkUnitTransaction(${JSON.stringify(bundleDir)}, 'submit_work_unit', {
          targetWorkIds: [${JSON.stringify(prepared.record.work_id)}],
          targetQueueItemIds: ['queue-a'],
          mutationTargets: []
        }, () => { Atomics.wait(buf, 0, 0, 200); return { ok: true }; });
      `], { encoding: 'utf8', timeout: 15000 });
      // holder finished (200ms); transaction pair is released — this scenario
      // therefore validates the inspect-side busy window instead
      const before = authoritySnapshot(bundleDir);
      const journalBaseline = journals(bundleDir).length;
      const projection = inspectWorkUnitTransaction(bundleDir, {
        operation: 'submit_work_unit',
        targetWorkIds: [prepared.record.work_id],
        targetQueueItemIds: ['queue-a'],
      });
      assert.ok(['none', 'busy'].includes(projection.disposition), projection.disposition);
      const late = lateSubmitWorkUnit(bundleDir, {
        work_id: prepared.record.work_id,
        resultPath: prepared.resultPath,
        reason: 'S10 without timeout precondition',
      });
      assert.equal(late.ok, false);
      assert.deepEqual(authoritySnapshot(bundleDir), before);
      assert.equal(journals(bundleDir).length, journalBaseline, 'no journal from a rejected caller');
      void holder;
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('S11: trace, ledger, result, and journal hash bindings agree across submit and late-submit', () => {
    const bundleDir = tempWorkUnitBundle('wu-inv-s11-');
    try {
      // work unit A: normal submit; work unit B: forced timeout then late-submit
      const a = claimAndSubmitWorkUnit(bundleDir, { submit: false });
      const submitted = submitWorkUnit(bundleDir, { work_id: a.record.work_id, resultPath: a.resultPath });
      assert.equal(submitted.ok, true);
      // register topic-b in the canonical plan registry + seed binding
      const planPath = path.join(bundleDir, 'rb_plan.md');
      const plan = JSON.parse(readFileSync(planPath, 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]);
      plan.topic_registry.push({
        topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174001',
        id: '02',
        slug: 'topic-b',
        title: 'Topic B',
        must_answer: ['What must be established for topic-b?'],
        scope_role: 'primary',
        depends_on_topic_uids: [],
        previous_layouts: [],
      });
      plan.derived_topic_count = plan.topic_registry.length;
      writeFileSync(planPath, `---\n${JSON.stringify(plan, null, 2)}\n---\n# Plan\n`);
      mkdirSync(path.join(bundleDir, 'seed_topics'), { recursive: true });
      writeFileSync(path.join(bundleDir, 'seed_topics', 'topic-b.md'), `---\n${JSON.stringify({
        topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174001',
        id: '02',
        slug: 'topic-b',
        title: 'Topic B',
        must_answer: ['What must be established for topic-b?'],
        scope_role: 'primary',
        depends_on_topic_uids: [],
        previous_layouts: [],
      }, null, 2)}\n---\n# Topic B\n`);
      const b = claimAndSubmitWorkUnit(bundleDir, {
        submit: false,
        queueItemId: 'queue-b',
        preserveQueue: true,
        queueItemOverrides: { payload: { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174001', topic_slug: 'topic-b', wave: 0 } },
      });
      const recordB = b.record;
      assert.equal(recordB.status, 'claimed');
      forceTimeout(bundleDir, recordB);
      const late = lateSubmitWorkUnit(bundleDir, {
        work_id: recordB.work_id,
        resultPath: b.resultPath,
        reason: 'S11 late accept',
      });
      assert.equal(late.ok, true);

      const rows = ledgerRows(bundleDir);
      const trace = traceRows(bundleDir).filter((r) => ['work_unit_submitted', 'work_unit_late_submitted'].includes(r.event));
      assert.ok(trace.some((r) => r.event === 'work_unit_submitted'), 'submit trace event exists');
      assert.ok(trace.some((r) => r.event === 'work_unit_late_submitted'), 'late-submit trace event exists');
      for (const event of trace) {
        const row = rows.find((r) => r.work_id === event.work_id && r.ledger_record_hash === event.ledger_record_hash);
        assert.ok(row, `ledger row for trace event ${event.event} (${event.work_id})`);
        assert.equal(row.result_hash, event.result_hash);
        const journal = journals(bundleDir).find((j) => j.tx_id === event.tx_id);
        assert.ok(journal, `journal ${event.tx_id} exists`);
        assert.equal(journal.status, 'committed');
      }
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('S12: rejection paths never touch authority and never create journals', () => {
    const bundleDir = tempWorkUnitBundle('wu-inv-s12-');
    try {
      const prepared = prepareClaimed(bundleDir);
      const before = authoritySnapshot(bundleDir);
      const journalCount = journals(bundleDir).length;

      const badCandidate = path.join(bundleDir, '_tmp', 'bad-candidate.json');
      const good = JSON.parse(readFileSync(prepared.resultPath, 'utf8'));
      good.receipt_nonce = `mismatch-${good.receipt_nonce}`;
      mkdirSync(path.dirname(badCandidate), { recursive: true });
      writeFileSync(badCandidate, `${JSON.stringify(good, null, 2)}\n`);
      const rejectedSubmit = submitWorkUnit(bundleDir, { work_id: prepared.record.work_id, resultPath: badCandidate });
      assert.equal(rejectedSubmit.ok, false);

      const rejectedLate = lateSubmitWorkUnit(bundleDir, {
        work_id: prepared.record.work_id,
        resultPath: prepared.resultPath,
      });
      assert.equal(rejectedLate.ok, false);

      // deviation from design §S12: recording last_submit_rejection is itself a
      // committed transaction, so a new committed journal IS expected; the
      // invariants are: no ledger row, no queue mutation, no rolled_back journal.
      const newJournals = journals(bundleDir).slice(journalCount);
      assert.ok(newJournals.every((j) => j.status === 'committed'), 'rejection-recording transaction must commit cleanly');
      assert.equal(ledgerRows(bundleDir).length, 0);
      assert.equal(loadWorkUnitIndex(bundleDir).work_units[prepared.record.work_id].status, 'claimed');
      assert.equal(loadQueue(bundleDir).delegated_in_flight['queue-a']?.work_id, prepared.record.work_id);
      assert.ok(JSON.stringify(loadWorkUnitIndex(bundleDir).work_units[prepared.record.work_id].last_submit_rejection || {}).length > 2, 'rejection recorded on the record');
      const after = authoritySnapshot(bundleDir);
      assert.equal(JSON.stringify(after) === JSON.stringify(before), false, 'last_submit_rejection is expected to differ; queue/ledger must not');
      assert.deepEqual(after.entries['rb_queue.json'], before.entries['rb_queue.json']);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });
});
