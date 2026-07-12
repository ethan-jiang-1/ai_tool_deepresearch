// gate-helpers-readers.test.mjs
// Tests for gate-helpers-readers.mjs: Bundle file readers — plan, profile, frontmatter,
// declarations, validation helpers.
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateState,
  validateRules,
  zodErrors,
  readOutputDeclarations,
  readSubmittedWorkUnitDeclarations,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import {
  availableActorDecision,
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  tempWorkUnitBundle,
} from '../work-unit-test-helpers.mjs';
import {
  createQueue,
  enqueue,
  makeItem,
  saveQueue,
} from '../../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import {
  claimWorkUnits,
  closeWorkUnitAttempt,
  computeWorkUnitLedgerRecordHash,
  lateSubmitWorkUnit,
  loadWorkUnitIndex,
  readWorkUnitLedgerRows,
  saveWorkUnitIndex,
  submitWorkUnit,
} from '../../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-gate-helpers-readers-tmp');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

const CALLER = 'testFn';

function readerQueueItem(id = 'queue-a') {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { topic_slug: id },
  });
}

function seedReaderQueue(dir, id = 'queue-a') {
  let queue = createQueue('gate-reader');
  queue = enqueue(queue, readerQueueItem(id));
  saveQueue(dir, queue);
}

function afterDeadline(record) {
  return Date.parse(record.deadline_at) + 1;
}

function writeReaderSubmitFiles(dir, record) {
  const outputPath = `reference/${record.work_id}.md`;
  mkdirSync(join(dir, 'reference'), { recursive: true });
  writeFileSync(join(dir, outputPath), '# Source\n\nGate reader fixture source.\n');

  const cacheTrail = `_cache/wave0/primary/${record.queue_item_id}/s01_source`;
  mkdirSync(join(dir, cacheTrail), { recursive: true });
  writeFileSync(join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(join(dir, cacheTrail, 'page.md'), '# Captured Page\n\nFetched content capture for https://example.com/source.\n');
  writeFileSync(join(dir, cacheTrail, 'meta.json'), '{"url":"https://example.com/source"}\n');
  writeFileSync(join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-10T00:00:00.000Z',
  })}\n`);

  const resultPath = join(dir, '_tmp', `${record.work_id}.result.json`);
  mkdirSync(dirname(resultPath), { recursive: true });
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

// ═══════════════════════════════════════════════════════════════════════════
// validateState
// ═══════════════════════════════════════════════════════════════════════════

describe('validateState', () => {
  it('passes for plain object', () => {
    assert.doesNotThrow(() => validateState({ a: 1 }, CALLER));
  });

  it('throws for null', () => {
    assert.throws(() => validateState(null, CALLER), /state 必须是普通对象/);
  });

  it('throws for array', () => {
    assert.throws(() => validateState([1, 2], CALLER), /state 必须是普通对象/);
  });

  it('throws for string', () => {
    assert.throws(() => validateState('hello', CALLER), /state 必须是普通对象/);
  });

  it('throws for number', () => {
    assert.throws(() => validateState(42, CALLER), /state 必须是普通对象/);
  });

  it('includes caller name in error', () => {
    assert.throws(() => validateState(null, 'myFunc'), /myFunc: state 必须是普通对象/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateRules
// ═══════════════════════════════════════════════════════════════════════════

describe('validateRules', () => {
  it('passes for valid check rules', () => {
    assert.doesNotThrow(() => validateRules([{ key: 'k', check: s => true, say: 'bad' }], CALLER));
  });

  it('passes for valid schema rules', () => {
    assert.doesNotThrow(() => validateRules([{ key: 'k', schema: z.object({ x: z.number() }), say: 'bad' }], CALLER));
  });

  it('passes for combined schema + check', () => {
    assert.doesNotThrow(() => validateRules([{ key: 'k', schema: z.object({}), check: s => true, say: 'ok' }], CALLER));
  });

  it('throws on empty array', () => {
    assert.throws(() => validateRules([], CALLER), /rules 必须是非空数组/);
  });

  it('throws when key is empty string', () => {
    assert.throws(() => validateRules([{ key: '', check: s => true, say: 'bad' }], CALLER), /key.*非空字符串/);
  });

  it('throws when key is missing', () => {
    assert.throws(() => validateRules([{ check: s => true, say: 'bad' }], CALLER), /key.*非空字符串/);
  });

  it('throws when say is missing', () => {
    assert.throws(() => validateRules([{ key: 'k', check: s => true }], CALLER), /say.*必须是字符串/);
  });

  it('throws when neither schema nor check provided', () => {
    assert.throws(() => validateRules([{ key: 'k', say: 'bad' }], CALLER), /必须提供 schema 或 check/);
  });

  it('throws when schema has no safeParse', () => {
    assert.throws(() => validateRules([{ key: 'k', schema: {}, say: 'bad' }], CALLER), /schema 必须是 Zod schema/);
  });

  it('throws when check is not a function', () => {
    assert.throws(() => validateRules([{ key: 'k', check: 'x', say: 'bad' }], CALLER), /check.*必须是函数/);
  });

  it('includes rule index in error for bad key', () => {
    assert.throws(() => validateRules([{ key: 'ok', check: s => true, say: 'ok' }, { key: '', check: s => true, say: 'bad' }], CALLER), /rules\[1\]/);
  });

  it('includes caller name in error', () => {
    assert.throws(() => validateRules([], 'myFn'), /myFn: rules 必须是非空数组/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// zodErrors
// ═══════════════════════════════════════════════════════════════════════════

describe('zodErrors', () => {
  it('maps ZodError to flat diagnostics', () => {
    const parsed = z.object({ ref_count: z.number() }).safeParse({ ref_count: 'bad' });
    const errors = zodErrors(parsed.error);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].field, 'ref_count');
    assert.equal(errors[0].code, 'invalid_type');
    assert.ok(typeof errors[0].message === 'string');
  });

  it('handles nested paths', () => {
    const s = z.object({ nested: z.object({ val: z.number() }) });
    const parsed = s.safeParse({ nested: { val: 'bad' } });
    const errors = zodErrors(parsed.error);
    assert.equal(errors[0].field, 'nested.val');
  });

  it('includes received and expected fields', () => {
    const parsed = z.object({ x: z.number() }).safeParse({ x: 'bad' });
    const errors = zodErrors(parsed.error);
    assert.ok(errors.length >= 1);
    assert.equal(errors[0].code, 'invalid_type');
    assert.equal(typeof errors[0].field, 'string');
    assert.equal(typeof errors[0].message, 'string');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// readOutputDeclarations
// ═══════════════════════════════════════════════════════════════════════════

describe('readOutputDeclarations', () => {
  it('returns empty array when ledger file missing', () => {
    const dir = join(__dirname, '.test-gh-nonexistent');
    assert.deepEqual(readOutputDeclarations(dir), []);
  });

  it('reads declaration records from JSONL', () => {
    const dir = join(__dirname, '.test-gh-read-decl');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
      JSON.stringify({ work_id: 'w1', output_files: [{ path: 'ref/a.md', role: 'reference', source_url: 'https://a.com' }], cache_trails: [] }),
      JSON.stringify({ work_id: 'w2', output_files: [{ path: 'ref/b.md', role: 'evidence_summary' }], cache_trails: ['_cache/leaf/'] }),
    ].join('\n') + '\n');
    try {
      const decls = readOutputDeclarations(dir);
      assert.strictEqual(decls.length, 2);
      assert.strictEqual(decls[0].work_id, 'w1');
      assert.strictEqual(decls[1].work_id, 'w2');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads submitted work-unit declarations only after Engine submit/index cross-checks pass', () => {
    const dir = tempWorkUnitBundle('gh-reader-submitted-');
    try {
      const { record } = claimAndSubmitWorkUnit(dir);
      const rows = readSubmittedWorkUnitDeclarations(dir);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].work_id, record.work_id);
      assert.equal(rows[0].queue_item_id, record.queue_item_id);
      assert.equal(rows[0].result_ref, record.paths.result_ref);
      assert.equal(rows[0].runtime_receipt_ref, record.paths.runtime_receipt_ref);
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('does not treat legacy raw declaration rows as submitted work-unit authority', () => {
    const dir = join(__dirname, '.test-gh-legacy-raw');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), `${JSON.stringify({
      work_id: 'w1',
      output_files: [{ path: 'reference/a.md', role: 'reference', source_url: 'https://a.com/news/1' }],
      cache_trails: ['_cache/leaf/'],
    })}\n`);
    try {
      assert.deepEqual(readSubmittedWorkUnitDeclarations(dir), []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails closed when a submitted work-unit ledger hash drifts', () => {
    const dir = tempWorkUnitBundle('gh-reader-drift-');
    try {
      claimAndSubmitWorkUnit(dir);
      const ledgerPath = join(dir, 'rb_output_declarations.jsonl');
      const row = JSON.parse(readFileSync(ledgerPath, 'utf-8').trim());
      row.cache_trails = [];
      writeFileSync(ledgerPath, `${JSON.stringify(row)}\n`);
      assert.throws(
        () => readSubmittedWorkUnitDeclarations(dir),
        /ledger_record_hash mismatch/,
      );
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('reads audited late-submit rows and hashes audit fields', () => {
    const dir = tempWorkUnitBundle('gh-reader-late-');
    try {
      seedReaderQueue(dir);
      claimWorkUnits(dir, { phase: 'wave0', count: 1, ...availableActorDecision('wave0_source_intake') });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      closeWorkUnitAttempt(dir, {
        work_id: record.work_id,
        status: 'timed_out',
        reason: 'deadline-expired',
        nowMs: afterDeadline(record),
      });
      const resultPath = writeReaderSubmitFiles(dir, record);
      const accepted = lateSubmitWorkUnit(dir, {
        work_id: record.work_id,
        resultPath,
        reason: 'late result arrived',
      });
      assert.equal(accepted.ok, true);

      const rows = readSubmittedWorkUnitDeclarations(dir);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].late_accept, true);
      assert.equal(rows[0].terminal_status_before_accept, 'timed_out');

      const ledgerPath = join(dir, 'rb_output_declarations.jsonl');
      const row = JSON.parse(readFileSync(ledgerPath, 'utf-8').trim());
      row.late_accept_reason = 'changed audit reason';
      writeFileSync(ledgerPath, `${JSON.stringify(row)}\n`);
      assert.throws(
        () => readSubmittedWorkUnitDeclarations(dir),
        /ledger_record_hash mismatch/,
      );
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('fails closed for half-audit normal rows', () => {
    const dir = tempWorkUnitBundle('gh-reader-half-audit-');
    try {
      claimAndSubmitWorkUnit(dir);
      const ledgerPath = join(dir, 'rb_output_declarations.jsonl');
      const row = JSON.parse(readFileSync(ledgerPath, 'utf-8').trim());
      row.late_accept_reason = 'not allowed without late_accept true';
      row.ledger_record_hash = computeWorkUnitLedgerRecordHash(row);
      writeFileSync(ledgerPath, `${JSON.stringify(row)}\n`);

      assert.throws(
        () => readSubmittedWorkUnitDeclarations(dir),
        /work-unit declaration schema invalid/,
      );
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('fails closed when a late-accepted row conflicts with a submitted replacement', () => {
    const dir = tempWorkUnitBundle('gh-reader-late-conflict-');
    try {
      seedReaderQueue(dir);
      claimWorkUnits(dir, { phase: 'wave0', count: 1, ...availableActorDecision('wave0_source_intake') });
      const first = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      closeWorkUnitAttempt(dir, {
        work_id: first.work_id,
        status: 'timed_out',
        reason: 'deadline-expired',
        nowMs: afterDeadline(first),
      });
      claimWorkUnits(dir, { phase: 'wave0', count: 1, ...availableActorDecision('wave0_source_intake') });
      const retry = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0002'];
      const retryResult = writeReaderSubmitFiles(dir, retry);
      const replacement = submitWorkUnit(dir, { work_id: retry.work_id, resultPath: retryResult });
      assert.equal(replacement.ok, true);

      let index = loadWorkUnitIndex(dir);
      const target = index.work_units[first.work_id];
      const forgedLateRowBase = {
        declared_at: '2026-07-10T00:00:00.000Z',
        work_id: target.work_id,
        queue_item_id: target.queue_item_id,
        wave: target.wave,
        kind: target.kind,
        producer_rule: target.producer_rule,
        creation_reason: target.creation_reason,
        work_unit_ref: target.paths.work_unit_dir,
        result_ref: target.paths.result_ref,
        runtime_receipt_ref: target.paths.runtime_receipt_ref,
        receipt_nonce: target.receipt_nonce,
        output_files: [],
        source_claims: [],
        accepted_source_urls: [],
        cache_trails: [],
        result_hash: 'forged-target-result-hash',
        late_accept: true,
        late_accept_reason: 'forged conflict row',
        terminal_status_before_accept: 'timed_out',
        superseded_retry_work_ids: [],
      };
      const forgedLateRow = {
        ...forgedLateRowBase,
        ledger_record_hash: computeWorkUnitLedgerRecordHash(forgedLateRowBase),
      };
      target.status = 'submitted';
      target.result_hash = forgedLateRow.result_hash;
      target.ledger_record_hash = forgedLateRow.ledger_record_hash;
      index.work_units[target.work_id] = target;
      saveWorkUnitIndex(dir, index);
      writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
        ...readWorkUnitLedgerRows(dir).map((row) => JSON.stringify(row)),
        JSON.stringify(forgedLateRow),
      ].join('\n') + '\n');

      assert.throws(
        () => readSubmittedWorkUnitDeclarations(dir),
        /late-accept conflict/,
      );
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });
});
