// @impl DEW-023, CHI-004

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  claimWorkUnits,
  closeWorkUnitAttempt,
  createWorkUnit,
  inspectWorkUnitTransaction,
  lateSubmitWorkUnit,
  loadWorkUnitIndex,
  openWorkUnitBatch,
  recoverWorkUnitDeclaration,
  recoverWorkUnitTransaction,
  replaceWorkUnitAttempt,
  submitWorkUnit,
  supersedeWorkUnitAttempt,
  timeoutPreflightWorkUnit,
  transactionLockOwnerPath,
  withWorkUnitTransaction,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';
import {
  WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
  WorkUnitTransactionLockOwnerSchema,
  WorkUnitTransactionV2JournalSchema,
} from '../../DPT_FRAMEWORK/schema/contracts/work-unit-transaction.mjs';
import {
  cleanupWorkUnitBundle,
  availableActorDecision,
  claimAndSubmitWorkUnit,
  delegatedQueueItem,
  recursiveAuthoritySnapshot,
  seedDelegatedQueue,
  tempWorkUnitBundle,
} from './work-unit-test-helpers.mjs';

const WORK_ID = 'wu-w0-b000-src-i0001';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function journals(bundleDir) {
  const dir = path.join(bundleDir, '_work_units', '_transactions');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(path.join(dir, name), 'utf8')));
}

function waitForFile(file, timeoutMs = 3000) {
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

function waitForChild(child) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`holder exited ${code ?? signal}: ${stderr}`));
    });
  });
}

const AUTHORITY_SNAPSHOT_EXCLUSIONS = new Set([
  '.lock',
  '_logs',
  '_transactions',
  'rb_trace.jsonl',
]);

function authoritySnapshot(bundleDir) {
  const pruneEmptyDirs = (snapshot) => {
    if (snapshot.type !== 'dir') return snapshot;
    const entries = Object.fromEntries(Object.entries(snapshot.entries)
      .map(([name, child]) => [name, pruneEmptyDirs(child)])
      .filter(([, child]) => child.type !== 'dir' || Object.keys(child.entries).length > 0));
    return { ...snapshot, entries };
  };
  return pruneEmptyDirs(recursiveAuthoritySnapshot(bundleDir, { excluded: AUTHORITY_SNAPSHOT_EXCLUSIONS }));
}

function injectedRollback(bundleDir, operation, invoke) {
  const before = authoritySnapshot(bundleDir);
  let hookCalled = false;
  let thrown = null;
  let returned = null;
  try {
    returned = invoke({
      afterMutation(context) {
        hookCalled = true;
        assert.equal(context.operation, operation);
        throw new Error(`injected ${operation} failure`);
      },
    });
  } catch (error) {
    thrown = error;
  }
  assert.equal(hookCalled, true, `${operation} must reach the post-mutation fault boundary`);
  assert.deepEqual(authoritySnapshot(bundleDir), before, `${operation} must restore every authority before-image`);
  const operationJournals = journals(bundleDir).filter((journal) => journal.operation === operation);
  assert.equal(operationJournals.some((journal) => journal.status === 'rolled_back'), true,
    `${operation} must retain one proof-verified rolled_back journal`);
  assert.equal(existsSync(path.join(bundleDir, '_work_units', '.lock')), false);
  return { thrown, returned };
}

describe('work-unit transaction v2', () => {
  it('pairs owner, journal, and complete before-image before the callback can mutate', () => {
    const bundleDir = tempWorkUnitBundle('wu-tx-ordering-');
    try {
      const authorityRef = 'authority.json';
      const authorityPath = path.join(bundleDir, authorityRef);
      const before = '{"value":"before"}\n';
      writeFileSync(authorityPath, before);
      const result = withWorkUnitTransaction(bundleDir, 'submit_work_unit', {
        targetWorkIds: [WORK_ID],
        targetQueueItemIds: ['queue-a'],
        mutationTargets: [authorityRef],
      }, ({ tx_id, mutation_manifest }) => {
        const owner = WorkUnitTransactionLockOwnerSchema.parse(JSON.parse(readFileSync(transactionLockOwnerPath(bundleDir), 'utf8')));
        const journal = WorkUnitTransactionV2JournalSchema.parse(JSON.parse(readFileSync(path.join(bundleDir, owner.journal_ref), 'utf8')));
        assert.equal(owner.tx_id, tx_id);
        assert.equal(journal.tx_id, tx_id);
        assert.equal(journal.status, 'started');
        assert.deepEqual(journal.mutation_manifest, mutation_manifest);
        assert.deepEqual(mutation_manifest.targets, [{
          path: authorityRef,
          before_exists: true,
          before_sha256: sha256(Buffer.from(before)),
        }]);
        writeFileSync(authorityPath, '{"value":"after"}\n');
        return { ok: true, tx_id };
      });
      assert.equal(result.ok, true);
      assert.equal(existsSync(path.join(bundleDir, '_work_units', '.lock')), false);
      const [journal] = journals(bundleDir);
      assert.equal(journal.status, 'committed');
      assert.equal(readFileSync(authorityPath, 'utf8'), '{"value":"after"}\n');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('records rolled_back only after exact restoration and suspect for undeclared mutation', () => {
    for (const undeclared of [false, true]) {
      const bundleDir = tempWorkUnitBundle(`wu-tx-${undeclared ? 'suspect' : 'rollback'}-`);
      try {
        const authorityPath = path.join(bundleDir, 'authority.json');
        writeFileSync(authorityPath, 'before\n');
        assert.throws(() => withWorkUnitTransaction(bundleDir, 'submit_work_unit', {
          targetWorkIds: [WORK_ID],
          targetQueueItemIds: ['queue-a'],
          mutationTargets: ['authority.json'],
        }, () => {
          writeFileSync(authorityPath, 'after\n');
          if (undeclared) writeFileSync(path.join(bundleDir, 'undeclared.json'), 'not-owned\n');
          if (!undeclared) throw new Error('fault after durable target write');
          return { ok: true };
        }), undeclared ? /undeclared targets/ : /fault after durable target write/);
        assert.equal(readFileSync(authorityPath, 'utf8'), 'before\n');
        const [journal] = journals(bundleDir);
        assert.equal(journal.status, undeclared ? 'suspect' : 'rolled_back');
        assert.equal(existsSync(path.join(bundleDir, '_work_units', '.lock')), false);
        assert.equal(existsSync(path.join(bundleDir, 'undeclared.json')), undeclared);
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }
  });

  it('returns structured busy from a real contender CLI while another process owns the pair', async () => {
    const bundleDir = tempWorkUnitBundle('wu-tx-contention-');
    try {
      writeFileSync(path.join(bundleDir, 'authority.json'), 'before\n');
      const moduleUrl = pathToFileURL(path.resolve('DPT_FRAMEWORK/engine/work-unit-transaction.mjs')).href;
      const holderScript = `
        import { withWorkUnitTransaction } from ${JSON.stringify(moduleUrl)};
        const result = withWorkUnitTransaction(${JSON.stringify(bundleDir)}, 'submit_work_unit', {
          targetWorkIds: [${JSON.stringify(WORK_ID)}],
          targetQueueItemIds: ['queue-a'],
          mutationTargets: ['authority.json']
        }, () => {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1200);
          return { ok: true };
        });
        if (!result.ok) process.exit(2);
      `;
      const holder = spawn(process.execPath, ['--input-type=module', '--eval', holderScript], {
        cwd: path.resolve('.'),
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      const holderDone = waitForChild(holder);
      await waitForFile(transactionLockOwnerPath(bundleDir));
      const projection = inspectWorkUnitTransaction(bundleDir, {
        operation: 'submit_work_unit',
        targetWorkIds: [WORK_ID],
        targetQueueItemIds: ['queue-a'],
      });
      assert.equal(projection.disposition, 'busy');
      assert.equal(projection.targets_same_attempt, true);
      assert.equal(projection.holder.journal_disposition, 'started');
      const differentWorkProjection = inspectWorkUnitTransaction(bundleDir, {
        operation: 'submit_work_unit',
        targetWorkIds: ['wu-w0-b000-src-i9999'],
        targetQueueItemIds: ['queue-other'],
      });
      assert.equal(differentWorkProjection.disposition, 'busy');
      assert.equal(differentWorkProjection.targets_same_attempt, false);
      assert.equal(differentWorkProjection.caller.work_id, 'wu-w0-b000-src-i9999');
      assert.equal(differentWorkProjection.holder.target_work_ids.includes(WORK_ID), true);

      const cli = spawnSync(process.execPath, [
        'DPT_FRAMEWORK/cli/operate-work-unit.mjs',
        'recover-transaction',
        bundleDir,
        '--tx-id',
        'tx-contender',
      ], { cwd: path.resolve('.'), encoding: 'utf8' });
      assert.equal(cli.status, 1);
      assert.equal(cli.stderr, '');
      const outcome = JSON.parse(cli.stdout);
      assert.equal(outcome.reason_code, 'busy');
      assert.equal(outcome.transaction.holder.tx_id, projection.holder.tx_id);
      assert.doesNotMatch(cli.stdout, /EEXIST/);
      await holderDone;
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('keeps a settled journal honestly busy until final lock release', async () => {
    const bundleDir = tempWorkUnitBundle('wu-tx-settled-window-');
    const readyFile = path.join(path.dirname(bundleDir), `${path.basename(bundleDir)}.settled-ready`);
    try {
      writeFileSync(path.join(bundleDir, 'authority.json'), 'before\n');
      const moduleUrl = pathToFileURL(path.resolve('DPT_FRAMEWORK/engine/work-unit-transaction.mjs')).href;
      const holderScript = `
        import { writeFileSync } from 'node:fs';
        import { withWorkUnitTransaction } from ${JSON.stringify(moduleUrl)};
        const result = withWorkUnitTransaction(${JSON.stringify(bundleDir)}, 'submit_work_unit', {
          targetWorkIds: [${JSON.stringify(WORK_ID)}],
          targetQueueItemIds: ['queue-a'],
          mutationTargets: ['authority.json'],
          hooks: {
            afterCommittedBeforeRelease({ journal }) {
              writeFileSync(${JSON.stringify(readyFile)}, JSON.stringify({ status: journal.status }));
              Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
            }
          }
        }, () => ({ ok: true }));
        if (!result.ok) process.exit(2);
      `;
      const holder = spawn(process.execPath, ['--input-type=module', '--eval', holderScript], {
        cwd: path.resolve('.'),
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      const holderDone = waitForChild(holder);
      await waitForFile(readyFile);

      const projection = inspectWorkUnitTransaction(bundleDir, {
        operation: 'submit_work_unit',
        targetWorkIds: ['wu-w0-b000-src-i9999'],
        targetQueueItemIds: ['queue-other'],
      });
      assert.equal(projection.disposition, 'busy');
      assert.equal(projection.holder.journal_disposition, 'committed');
      assert.equal(projection.targets_same_attempt, false);
      assert.equal(projection.repair_kind, 'wait');
      assert.equal(journals(bundleDir).filter((journal) => journal.status === 'started').length, 0);

      await holderDone;
      assert.equal(existsSync(transactionLockOwnerPath(bundleDir)), false);
      assert.equal(inspectWorkUnitTransaction(bundleDir).disposition, 'none');
    } finally {
      rmSync(readyFile, { force: true });
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('recovers one unlocked orphan only when every original target still matches', () => {
    for (const drifted of [false, true]) {
      const bundleDir = tempWorkUnitBundle(`wu-tx-recover-${drifted ? 'drift' : 'exact'}-`);
      try {
        const authorityRef = 'authority.json';
        const authorityPath = path.join(bundleDir, authorityRef);
        writeFileSync(authorityPath, 'before\n');
        const txId = `tx-orphan-${drifted ? 'drift' : 'exact'}`;
        const journalRef = `_work_units/_transactions/${txId}.json`;
        mkdirSync(path.join(bundleDir, '_work_units', '_transactions'), { recursive: true });
        const orphan = WorkUnitTransactionV2JournalSchema.parse({
          schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
          tx_id: txId,
          operation: 'submit_work_unit',
          journal_ref: journalRef,
          target_work_ids: [WORK_ID],
          target_queue_item_ids: ['queue-a'],
          mutation_manifest: {
            targets: [{
              path: authorityRef,
              before_exists: true,
              before_sha256: sha256(Buffer.from('before\n')),
            }],
          },
          status: 'started',
          started_at: '2026-07-30T00:00:00.000Z',
          settled_at: null,
          error: null,
        });
        writeFileSync(path.join(bundleDir, journalRef), `${JSON.stringify(orphan, null, 2)}\n`);
        if (drifted) writeFileSync(authorityPath, 'drifted\n');
        const beforeAuthority = readFileSync(authorityPath, 'base64');
        const result = recoverWorkUnitTransaction(bundleDir, { tx_id: txId });
        assert.equal(result.ok, !drifted);
        assert.equal(readFileSync(authorityPath, 'base64'), beforeAuthority);
        const prior = JSON.parse(readFileSync(path.join(bundleDir, journalRef), 'utf8'));
        assert.equal(prior.status, drifted ? 'started' : 'rolled_back');
        if (drifted) {
          assert.equal(result.reason_code, 'suspect_transaction');
          assert.equal(result.repair_kind, 'missing_contract');
        } else {
          assert.equal(result.changed, true);
          const replay = recoverWorkUnitTransaction(bundleDir, { tx_id: txId });
          assert.equal(replay.ok, true);
          assert.equal(replay.idempotent, true);
          assert.equal(replay.disposition, 'rolled_back');
        }
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }
  });

  it('prevents default and forced timeout without treating unrelated contention as attempt progress', async () => {
    for (const sameAttempt of [true, false]) {
      const bundleDir = tempWorkUnitBundle(`wu-tx-timeout-${sameAttempt ? 'same' : 'other'}-`);
      try {
        seedDelegatedQueue(bundleDir, [delegatedQueueItem('queue-a')]);
        const claim = claimWorkUnits(bundleDir, {
          phase: 'wave0',
          count: 1,
          ...availableActorDecision('wave0_source_intake'),
        });
        const workId = claim.claimed_work_ids[0];
        const holderWorkId = sameAttempt ? workId : 'wu-w0-b000-src-i9999';
        const moduleUrl = pathToFileURL(path.resolve('DPT_FRAMEWORK/engine/work-unit-transaction.mjs')).href;
        const holderScript = `
          import { withWorkUnitTransaction } from ${JSON.stringify(moduleUrl)};
          const result = withWorkUnitTransaction(${JSON.stringify(bundleDir)}, 'submit_work_unit', {
            targetWorkIds: [${JSON.stringify(holderWorkId)}],
            targetQueueItemIds: [${JSON.stringify(sameAttempt ? 'queue-a' : 'queue-other')}],
            mutationTargets: ['rb_queue.json']
          }, () => {
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 900);
            return { ok: true };
          });
          if (!result.ok) process.exit(2);
        `;
        const holder = spawn(process.execPath, ['--input-type=module', '--eval', holderScript], {
          cwd: path.resolve('.'),
          stdio: ['ignore', 'ignore', 'pipe'],
        });
        const holderDone = waitForChild(holder);
        await waitForFile(transactionLockOwnerPath(bundleDir));
        const before = JSON.stringify(loadWorkUnitIndex(bundleDir));
        const preflight = timeoutPreflightWorkUnit(bundleDir, { work_id: workId });
        assert.equal(preflight.timeout_eligible, false);
        assert.equal(preflight.transaction.disposition, 'busy');
        assert.equal(preflight.transaction.targets_same_attempt, sameAttempt);
        if (!sameAttempt) {
          assert.equal(preflight.progress.sources.some((source) => source.source_type === 'engine_event'), false);
        }
        for (const force of [false, true]) {
          const closed = closeWorkUnitAttempt(bundleDir, {
            work_id: workId,
            status: 'timed_out',
            reason: force ? 'forced timeout must still refuse' : 'default timeout must refuse',
            force,
          });
          assert.equal(closed.ok, false);
          assert.equal(closed.transaction.disposition, 'busy');
          assert.equal(loadWorkUnitIndex(bundleDir).work_units[workId].status, 'claimed');
        }
        assert.equal(JSON.stringify(loadWorkUnitIndex(bundleDir)), before);
        await holderDone;
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }
  });

  it('restores exact before-images for direct creation, batch-open, claim, and submit rejection callers', () => {
    const createDir = tempWorkUnitBundle('wu-tx-create-fault-');
    try {
      const queueItem = delegatedQueueItem('queue-create');
      seedDelegatedQueue(createDir, [queueItem]);
      injectedRollback(createDir, 'create_work_unit', (transactionHooks) => createWorkUnit(createDir, {
        queueItem,
        wave: 0,
        transactionHooks,
      }));
    } finally {
      cleanupWorkUnitBundle(createDir);
    }

    const batchDir = tempWorkUnitBundle('wu-tx-batch-fault-');
    try {
      injectedRollback(batchDir, 'open_work_unit_batch', (transactionHooks) => openWorkUnitBatch(batchDir, {
        phase: 'wave0',
        reason: 'fault-injected batch allocation',
        transactionHooks,
      }));
    } finally {
      cleanupWorkUnitBundle(batchDir);
    }

    const claimDir = tempWorkUnitBundle('wu-tx-claim-fault-');
    try {
      seedDelegatedQueue(claimDir, [delegatedQueueItem('queue-claim')]);
      injectedRollback(claimDir, 'claim_work_units', (transactionHooks) => claimWorkUnits(claimDir, {
        phase: 'wave0',
        count: 1,
        ...availableActorDecision('wave0_source_intake'),
        transactionHooks,
      }));
    } finally {
      cleanupWorkUnitBundle(claimDir);
    }

    const rejectionDir = tempWorkUnitBundle('wu-tx-rejection-fault-');
    try {
      const prepared = claimAndSubmitWorkUnit(rejectionDir, { submit: false });
      const missingCandidate = path.join(rejectionDir, '_tmp', 'missing-result.json');
      injectedRollback(rejectionDir, 'reject_work_unit_submit', (transactionHooks) => submitWorkUnit(rejectionDir, {
        work_id: prepared.record.work_id,
        resultPath: missingCandidate,
        transactionHooks,
      }));
    } finally {
      cleanupWorkUnitBundle(rejectionDir);
    }
  });

  it('restores exact before-images for every terminalization and replacement caller', () => {
    for (const status of ['failed', 'timed_out', 'abandoned']) {
      const bundleDir = tempWorkUnitBundle(`wu-tx-${status}-fault-`);
      try {
        const prepared = claimAndSubmitWorkUnit(bundleDir, { submit: false });
        injectedRollback(bundleDir, `work_unit_${status}`, (transactionHooks) => closeWorkUnitAttempt(bundleDir, {
          work_id: prepared.record.work_id,
          status,
          reason: `fault-injected ${status}`,
          force: status === 'timed_out',
          nowMs: Date.parse(prepared.record.deadline_at) + 1,
          transactionHooks,
        }));
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }

    const replacementDir = tempWorkUnitBundle('wu-tx-replacement-fault-');
    try {
      const prepared = claimAndSubmitWorkUnit(replacementDir, { submit: false });
      assert.equal(closeWorkUnitAttempt(replacementDir, {
        work_id: prepared.record.work_id,
        status: 'failed',
        reason: 'terminal parent for replacement fault',
      }).ok, true);
      injectedRollback(replacementDir, 'work_unit_replace', (transactionHooks) => replaceWorkUnitAttempt(replacementDir, {
        work_id: prepared.record.work_id,
        transactionHooks,
      }));
    } finally {
      cleanupWorkUnitBundle(replacementDir);
    }
  });

  it('restores exact before-images for normal submit, late-submit, and declaration recovery callers', () => {
    const submitDir = tempWorkUnitBundle('wu-tx-submit-fault-');
    try {
      const prepared = claimAndSubmitWorkUnit(submitDir, { submit: false });
      injectedRollback(submitDir, 'submit_work_unit', (transactionHooks) => submitWorkUnit(submitDir, {
        work_id: prepared.record.work_id,
        resultPath: prepared.resultPath,
        transactionHooks,
      }));
    } finally {
      cleanupWorkUnitBundle(submitDir);
    }

    const lateDir = tempWorkUnitBundle('wu-tx-late-submit-fault-');
    try {
      const prepared = claimAndSubmitWorkUnit(lateDir, { submit: false });
      assert.equal(closeWorkUnitAttempt(lateDir, {
        work_id: prepared.record.work_id,
        status: 'timed_out',
        reason: 'prepare late-submit fault boundary',
        force: true,
        nowMs: Date.parse(prepared.record.deadline_at) + 1,
      }).ok, true);
      injectedRollback(lateDir, 'late_submit_work_unit', (transactionHooks) => lateSubmitWorkUnit(lateDir, {
        work_id: prepared.record.work_id,
        resultPath: prepared.resultPath,
        reason: 'fault-injected audited late submit',
        transactionHooks,
      }));
    } finally {
      cleanupWorkUnitBundle(lateDir);
    }

    const recoveryDir = tempWorkUnitBundle('wu-tx-declaration-recovery-fault-');
    try {
      const { record, submitted } = claimAndSubmitWorkUnit(recoveryDir);
      assert.equal(submitted.ok, true);
      rmSync(path.join(recoveryDir, 'rb_output_declarations.jsonl'));
      injectedRollback(recoveryDir, 'recover_work_unit_declaration', (transactionHooks) => recoverWorkUnitDeclaration(recoveryDir, {
        work_id: record.work_id,
        transactionHooks,
      }));
    } finally {
      cleanupWorkUnitBundle(recoveryDir);
    }
  });

  it('restores late-submit authority at every targeted and retry-cleanup boundary', () => {
    const boundaries = [
      'targeted_attempt_saved',
      'retry_statuses_saved',
      'ledger_appended',
      'index_saved',
      'queue_saved',
    ];
    for (const boundary of boundaries) {
      const bundleDir = tempWorkUnitBundle(`wu-tx-late-${boundary}-fault-`);
      try {
        const prepared = claimAndSubmitWorkUnit(bundleDir, { submit: false });
        assert.equal(closeWorkUnitAttempt(bundleDir, {
          work_id: prepared.record.work_id,
          status: 'timed_out',
          reason: `prepare ${boundary}`,
          force: true,
          nowMs: Date.parse(prepared.record.deadline_at) + 1,
        }).ok, true);
        const retry = claimWorkUnits(bundleDir, {
          phase: 'wave0',
          count: 1,
          ...availableActorDecision('wave0_source_intake'),
        });
        assert.equal(retry.claimed_count, 1);
        const before = authoritySnapshot(bundleDir);
        let reached = false;
        const failed = lateSubmitWorkUnit(bundleDir, {
          work_id: prepared.record.work_id,
          resultPath: prepared.resultPath,
          reason: `fault at ${boundary}`,
          transactionHooks: {
            afterMutationBoundary(context) {
              if (context.boundary !== boundary) return;
              reached = true;
              throw new Error(`injected late-submit fault at ${boundary}`);
            },
          },
        });
        assert.equal(reached, true, boundary);
        assert.equal(failed.ok, false, boundary);
        assert.deepEqual(authoritySnapshot(bundleDir), before, boundary);
        assert.equal(journals(bundleDir).some((journal) => (
          journal.operation === 'late_submit_work_unit' && journal.status === 'rolled_back'
        )), true, boundary);
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }
  });

  it('restores exact before-images for supersession and transaction recovery callers', () => {
    const supersedeDir = tempWorkUnitBundle('wu-tx-supersede-fault-');
    try {
      const { record, submitted } = claimAndSubmitWorkUnit(supersedeDir);
      assert.equal(submitted.ok, true);
      const resultPath = path.join(supersedeDir, record.paths.result_ref);
      const drifted = JSON.parse(readFileSync(resultPath, 'utf8'));
      drifted.summary = 'fault-injected supersession drift';
      writeFileSync(resultPath, `${JSON.stringify(drifted, null, 2)}\n`);
      injectedRollback(supersedeDir, 'supersede_work_unit', (transactionHooks) => supersedeWorkUnitAttempt(supersedeDir, {
        work_id: record.work_id,
        reason: 'fault-injected supersession',
        transactionHooks,
      }));
    } finally {
      cleanupWorkUnitBundle(supersedeDir);
    }

    const recoveryDir = tempWorkUnitBundle('wu-tx-recover-caller-fault-');
    try {
      const authorityRef = 'authority.json';
      writeFileSync(path.join(recoveryDir, authorityRef), 'before\n');
      const txId = 'tx-orphan-caller-fault';
      const journalRef = `_work_units/_transactions/${txId}.json`;
      mkdirSync(path.join(recoveryDir, '_work_units', '_transactions'), { recursive: true });
      const orphan = WorkUnitTransactionV2JournalSchema.parse({
        schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
        tx_id: txId,
        operation: 'submit_work_unit',
        journal_ref: journalRef,
        target_work_ids: [WORK_ID],
        target_queue_item_ids: ['queue-a'],
        mutation_manifest: {
          targets: [{
            path: authorityRef,
            before_exists: true,
            before_sha256: sha256(Buffer.from('before\n')),
          }],
        },
        status: 'started',
        started_at: '2026-07-30T00:00:00.000Z',
        settled_at: null,
        error: null,
      });
      const priorJournalPath = path.join(recoveryDir, journalRef);
      writeFileSync(priorJournalPath, `${JSON.stringify(orphan, null, 2)}\n`);
      const priorBefore = readFileSync(priorJournalPath, 'base64');
      injectedRollback(recoveryDir, 'recover_work_unit_transaction', (transactionHooks) => recoverWorkUnitTransaction(recoveryDir, {
        tx_id: txId,
        transactionHooks,
      }));
      assert.equal(readFileSync(priorJournalPath, 'base64'), priorBefore);
    } finally {
      cleanupWorkUnitBundle(recoveryDir);
    }
  });
});
