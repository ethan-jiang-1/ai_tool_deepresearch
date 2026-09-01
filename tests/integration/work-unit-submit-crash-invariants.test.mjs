// tests/integration/work-unit-submit-crash-invariants.test.mjs
// C4 T1 (S1/S2/S8): true crash injection — the child process runs the work-unit
// operation with a hook that blocks forever after a marker write; the parent
// SIGKILLs it and asserts the durable-state invariants of design §S.
// @impl DEW-005, DEW-011, DEW-015, CHI-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  inspectWorkUnitTransaction,
  closeWorkUnitAttempt,
  lateSubmitWorkUnit,
  loadWorkUnitIndex,
  submitWorkUnit,
  claimWorkUnits,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import { loadQueue } from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import {
  cleanupWorkUnitBundle,
  claimAndSubmitWorkUnit,
  availableActorDecision,
  tempWorkUnitBundle,
} from '../engine/work-unit-test-helpers.mjs';

const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'DEEP_RESEARCH_HARNESS', 'engine');

function journals(bundleDir) {
  const dir = path.join(bundleDir, '_work_units', '_transactions');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(path.join(dir, name), 'utf8')));
}

function traceEvents(bundleDir) {
  return readFileSync(path.join(bundleDir, 'rb_trace.jsonl'), 'utf-8')
    .split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)).map((r) => r.event);
}

function ledgerRows(bundleDir) {
  const p = path.join(bundleDir, 'rb_output_declarations.jsonl');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf-8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
}

async function runChildAndKill(childScript, markerFile) {
  const child = spawn(process.execPath, ['--input-type=module', '--eval', childScript], {
    cwd: path.resolve('.'),
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const started = Date.now();
  await new Promise((resolve, reject) => {
    const poll = () => {
      if (existsSync(markerFile)) return resolve();
      if (Date.now() - started > 15000) return reject(new Error(`marker never appeared: ${markerFile}\n${stderr}`));
      setTimeout(poll, 25);
    };
    poll();
  });
  child.kill('SIGKILL');
  await new Promise((resolve) => { child.on('exit', resolve); setTimeout(resolve, 2000); });
  if (stderr && !stderr.includes('SIGNAL')) console.error(`[child stderr] ${stderr.slice(0, 400)}`);
}

function childScript(operationCall) {
  return `
    import { writeFileSync } from 'node:fs';
    import * as core from ${JSON.stringify(new URL('../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs', import.meta.url).href)};
    const run = async () => {
      ${operationCall}
    };
    run().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(3); });
  `;
}

describe('work-unit submit crash invariants (S1/S2/S8, SIGKILL)', () => {
  it('S1: submit killed inside the transaction keeps one started journal, busy lock, and uncommitted ledger', async () => {
    const bundleDir = tempWorkUnitBundle('wu-crash-s1-');
    const marker = path.join(path.dirname(bundleDir), `${path.basename(bundleDir)}.s1-marker`);
    try {
      const prepared = claimAndSubmitWorkUnit(bundleDir, { submit: false });
      const call = `
        await core.submitWorkUnit(${JSON.stringify(bundleDir)}, {
          work_id: ${JSON.stringify(prepared.record.work_id)},
          resultPath: ${JSON.stringify(prepared.resultPath)},
          transactionHooks: {
            afterMutation(context) {
              writeFileSync(${JSON.stringify(marker)}, 'after-mutation\\n');
              const gate = new Int32Array(new SharedArrayBuffer(4));
              Atomics.wait(gate, 0, 0, 30000);
            },
          },
        });
      `;
      await runChildAndKill(childScript(call), marker);

      const started = journals(bundleDir).filter((j) => j.status === 'started' && j.operation === 'submit_work_unit');
      assert.equal(started.length, 1, 'exactly one started submit journal');
      assert.equal(existsSync(path.join(bundleDir, '_work_units', '.lock', 'owner.json')), true, 'lock owner present');
      const queue = loadQueue(bundleDir);
      assert.ok(queue.terminal_history.some((row) => row.work_id === prepared.record.work_id), 'queue save landed (done row)');
      assert.equal(ledgerRows(bundleDir).length, 1, 'ledger row applied inside the transaction but not committed');
      const projection = inspectWorkUnitTransaction(bundleDir, {
        operation: 'submit_work_unit',
        targetWorkIds: [prepared.record.work_id],
        targetQueueItemIds: ['queue-a'],
      });
      assert.ok(['busy', 'suspect_transaction'].includes(projection.disposition), projection.disposition);

      // after SIGKILL the OS releases the flock; the idempotent duplicate check
      // makes the retry complete the interrupted submit without a second ledger row
      const retry = submitWorkUnit(bundleDir, { work_id: prepared.record.work_id, resultPath: prepared.resultPath });
      assert.equal(retry.ok, true, 'idempotent retry completes after crash');
      assert.equal(retry.duplicate, true);
      assert.equal(ledgerRows(bundleDir).filter((row) => row.work_id === prepared.record.work_id).length, 1, 'still exactly one ledger row');
    } finally {
      rmSync(marker, { force: true });
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('S2: late-submit killed at targeted_attempt_saved leaves targeted writes but zero declarations and no commit', async () => {
    const bundleDir = tempWorkUnitBundle('wu-crash-s2-');
    const marker = path.join(path.dirname(bundleDir), `${path.basename(bundleDir)}.s2-marker`);
    try {
      const prepared = claimAndSubmitWorkUnit(bundleDir, { submit: false });
      const closed = closeWorkUnitAttempt(bundleDir, {
        work_id: prepared.record.work_id,
        status: 'timed_out',
        reason: 'S2 prepare',
        force: true,
        nowMs: Date.parse(prepared.record.deadline_at) + 1,
      });
      assert.equal(closed.ok, true);
      const retry = claimWorkUnits(bundleDir, { phase: 'wave0', count: 1, ...availableActorDecision('wave0_source_intake') });
      assert.equal(retry.claimed_count, 1);

      const call = `
        await core.lateSubmitWorkUnit(${JSON.stringify(bundleDir)}, {
          work_id: ${JSON.stringify(prepared.record.work_id)},
          resultPath: ${JSON.stringify(prepared.resultPath)},
          reason: 'S2 crash injection',
          transactionHooks: {
            afterMutationBoundary(context) {
              if (context.boundary !== 'targeted_attempt_saved') return;
              writeFileSync(${JSON.stringify(marker)}, 'targeted-saved\\n');
              const gate = new Int32Array(new SharedArrayBuffer(4));
              Atomics.wait(gate, 0, 0, 30000);
            },
          },
        });
      `;
      await runChildAndKill(childScript(call), marker);

      const started = journals(bundleDir).filter((j) => j.status === 'started' && j.operation === 'late_submit_work_unit');
      assert.equal(started.length, 1, 'exactly one started late-submit journal');
      assert.equal(ledgerRows(bundleDir).filter((row) => row.work_id === prepared.record.work_id).length, 0, 'zero declarations rows');
      assert.equal(loadWorkUnitIndex(bundleDir).work_units[prepared.record.work_id].status, 'timed_out', 'index still timed_out');
      assert.equal(loadQueue(bundleDir).delegated_in_flight['queue-a']?.work_id !== undefined, true, 'retry still in flight');
      assert.equal(journals(bundleDir).some((j) => ['rolled_back', 'committed'].includes(j.status) && j.operation === 'late_submit_work_unit'), false, 'no settled late-submit journal');
      const retrySubmit = submitWorkUnit(bundleDir, { work_id: prepared.record.work_id, resultPath: prepared.resultPath });
      assert.equal(retrySubmit.ok, false, 'subsequent submit blocked by the crashed holder');
    } finally {
      rmSync(marker, { force: true });
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('S8: declaration recovery killed after ledger write keeps an atomic single-row ledger', async () => {
    const bundleDir = tempWorkUnitBundle('wu-crash-s8-');
    const marker = path.join(path.dirname(bundleDir), `${path.basename(bundleDir)}.s8-marker`);
    try {
      const prepared = claimAndSubmitWorkUnit(bundleDir, { submit: false });
      const submitted = submitWorkUnit(bundleDir, { work_id: prepared.record.work_id, resultPath: prepared.resultPath });
      assert.equal(submitted.ok, true);
      const declarationsPath = path.join(bundleDir, 'rb_output_declarations.jsonl');
      const remaining = readFileSync(declarationsPath, 'utf-8').split(/\r?\n/).filter(Boolean)
        .filter((l) => JSON.parse(l).work_id !== prepared.record.work_id);
      writeFileSync(declarationsPath, remaining.length > 0 ? `${remaining.join('\n')}\n` : '');

      const call = `
        await core.recoverWorkUnitDeclaration(${JSON.stringify(bundleDir)}, {
          work_id: ${JSON.stringify(prepared.record.work_id)},
          transactionHooks: {
            afterMutation(context) {
              if (context.operation !== 'recover_work_unit_declaration') return;
              writeFileSync(${JSON.stringify(marker)}, 'after-mutation\\n');
              const gate = new Int32Array(new SharedArrayBuffer(4));
              Atomics.wait(gate, 0, 0, 30000);
            },
          },
        });
      `;
      await runChildAndKill(childScript(call), marker);

      const rows = ledgerRows(bundleDir).filter((row) => row.work_id === prepared.record.work_id);
      assert.ok(rows.length <= 1, `ledger rows atomic after crash (found ${rows.length})`);
      const started = journals(bundleDir).filter((j) => j.status === 'started' && j.operation === 'recover_work_unit_declaration');
      assert.equal(started.length, 1, 'exactly one started recovery journal');
      assert.equal(existsSync(path.join(bundleDir, '_work_units', '.lock', 'owner.json')), true, 'lock present');
      const projection = inspectWorkUnitTransaction(bundleDir, {
        operation: 'recover_work_unit_declaration',
        targetWorkIds: [prepared.record.work_id],
        targetQueueItemIds: ['queue-a'],
      });
      assert.ok(['busy', 'suspect_transaction'].includes(projection.disposition), projection.disposition);
      assert.equal(ledgerRows(bundleDir).filter((row) => row.work_id === prepared.record.work_id).length === 0 ? true : rows[0].ledger_record_hash === submitted.ledger_record_hash, true, 'if a row landed it is the exact accepted hash');
    } finally {
      rmSync(marker, { force: true });
      cleanupWorkUnitBundle(bundleDir);
    }
  });
});
