// @impl DEW-022, DEW-024, AGQ-026, WPG-016, CHI-004

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  claimWorkUnits,
  closeWorkUnitAttempt,
  evaluateNormalizedSubmittedWorkUnitLedger,
  evaluateWorkUnitSupersessionEligibility,
  inspectWorkUnitTransaction,
  inspectWorkUnits,
  lateSubmitWorkUnit,
  loadWorkUnitIndex,
  readWorkUnitLedgerRows,
  recoverWorkUnitTransaction,
  replaceWorkUnitAttempt,
  saveWorkUnitIndex,
  resolveWorkUnitSupersessionLineage,
  submitWorkUnit,
  supersedeWorkUnitAttempt,
  transactionLockOwnerPath,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import { loadQueue, queueItemSnapshotHash } from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import { enqueue, saveQueue } from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import {
  checkSubmittedDeclarationRecovery,
  checkWorkUnitLedgerExists,
  checkWorkUnitOutputCoverage,
  checkWorkUnitSubmissionPresence,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-provenance.mjs';
import {
  availableActorDecision,
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  tempWorkUnitBundle,
} from '../engine/work-unit-test-helpers.mjs';
import {
  WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
  WorkUnitTransactionV2JournalSchema,
} from '../../DEEP_RESEARCH_HARNESS/schema/contracts/work-unit-transaction.mjs';

function writeAttemptCandidate(bundleDir, record, templateResult, summary) {
  const runtimeReceipt = {
    schema_version: 'work-unit.receipt-event.v1',
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-30T00:00:00.000Z',
  };
  writeFileSync(
    path.join(bundleDir, record.paths.runtime_receipt_ref),
    `${JSON.stringify(runtimeReceipt)}\n`,
  );
  const result = {
    ...templateResult,
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary,
  };
  const resultPath = path.join(bundleDir, '_tmp', `${record.work_id}.json`);
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  return resultPath;
}

function downgradeSubmissionContractToLegacy(bundleDir, record) {
  const index = loadWorkUnitIndex(bundleDir);
  const current = index.work_units[record.work_id];
  delete current.submission_contract_version;
  saveWorkUnitIndex(bundleDir, index);
  for (const ref of [current.paths.manifest_ref, current.paths.beacon_ref]) {
    const filePath = path.join(bundleDir, ref);
    const value = JSON.parse(readFileSync(filePath, 'utf8'));
    delete value.submission_contract_version;
    writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  }
  return loadWorkUnitIndex(bundleDir).work_units[record.work_id];
}

function coreAuthoritySnapshot(bundleDir) {
  return {
    index: readFileSync(path.join(bundleDir, '_work_units/_index.json'), 'base64'),
    queue: readFileSync(path.join(bundleDir, 'rb_queue.json'), 'base64'),
    ledger: existsSync(path.join(bundleDir, 'rb_output_declarations.jsonl'))
      ? readFileSync(path.join(bundleDir, 'rb_output_declarations.jsonl'), 'base64')
      : null,
  };
}

function immutablePredecessorSnapshot(bundleDir, record) {
  const queue = loadQueue(bundleDir);
  const terminal = queue.terminal_history.find((entry) => entry.work_id === record.work_id);
  return {
    result: readFileSync(path.join(bundleDir, record.paths.result_ref), 'base64'),
    receipt: readFileSync(path.join(bundleDir, record.paths.runtime_receipt_ref), 'base64'),
    status: readFileSync(path.join(bundleDir, record.paths.status_ref), 'base64'),
    ledger: existsSync(path.join(bundleDir, 'rb_output_declarations.jsonl'))
      ? readFileSync(path.join(bundleDir, 'rb_output_declarations.jsonl'), 'base64')
      : null,
    terminal: JSON.stringify(terminal),
  };
}

describe('submitted work-unit supersession', () => {
  it('rolls back the relation when successor creation faults and permits one later retry', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-rollback-');
    try {
      const { record } = claimAndSubmitWorkUnit(bundleDir);
      const resultPath = path.join(bundleDir, record.paths.result_ref);
      const drifted = JSON.parse(readFileSync(resultPath, 'utf8'));
      drifted.summary = 'drift before injected failure';
      writeFileSync(resultPath, `${JSON.stringify(drifted, null, 2)}\n`);
      const indexPath = path.join(bundleDir, '_work_units/_index.json');
      const queuePath = path.join(bundleDir, 'rb_queue.json');
      const indexBefore = readFileSync(indexPath, 'base64');
      const queueBefore = readFileSync(queuePath, 'base64');

      assert.throws(() => supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'inject relation-only failure',
        afterIndexSave() {
          throw new Error('fault between relation and successor');
        },
      }), /fault between relation and successor/);
      assert.equal(readFileSync(indexPath, 'base64'), indexBefore);
      assert.equal(readFileSync(queuePath, 'base64'), queueBefore);
      const txRoot = path.join(bundleDir, '_work_units/_transactions');
      const transactions = readdirSync(txRoot)
        .map((name) => JSON.parse(readFileSync(path.join(txRoot, name), 'utf8')))
        .filter((tx) => tx.operation === 'supersede_work_unit');
      assert.equal(transactions.length, 1);
      assert.equal(transactions[0].status, 'rolled_back');

      const retried = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'retry after exact rollback',
      });
      assert.equal(retried.ok, true);
      assert.equal(retried.created, true);
      assert.equal(loadQueue(bundleDir).active_window.filter((item) => (
        item.queue_item_id === retried.relation.successor_queue_item_id
      )).length, 1);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('atomically creates one terminal-snapshot successor and replays the immutable relation', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-result-');
    try {
      const { record, submitted } = claimAndSubmitWorkUnit(bundleDir);
      assert.equal(submitted.ok, true);
      const beforeDrift = immutablePredecessorSnapshot(bundleDir, record);
      const resultPath = path.join(bundleDir, record.paths.result_ref);
      const drifted = JSON.parse(readFileSync(resultPath, 'utf8'));
      drifted.summary = 'changed after acceptance';
      writeFileSync(resultPath, `${JSON.stringify(drifted, null, 2)}\n`);
      const beforeSupersede = immutablePredecessorSnapshot(bundleDir, record);
      const predecessorRecordBefore = loadWorkUnitIndex(bundleDir).work_units[record.work_id];

      const eligible = evaluateWorkUnitSupersessionEligibility(bundleDir, { work_id: record.work_id });
      assert.equal(eligible.eligible, true);
      assert.equal(eligible.root_code, 'submitted_result_drift');

      const first = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'accepted result bytes drifted',
      });
      assert.equal(first.ok, true);
      assert.equal(first.created, true);
      assert.equal(first.relation.root_code, 'submitted_result_drift');
      assert.equal(first.relation.predecessor_work_id, record.work_id);
      assert.equal(first.successor.queue_location, 'active_window');
      assert.deepEqual(immutablePredecessorSnapshot(bundleDir, record), beforeSupersede);
      assert.notEqual(beforeDrift.result, beforeSupersede.result);

      const indexed = loadWorkUnitIndex(bundleDir).work_units[record.work_id];
      assert.equal(indexed.status, 'submitted');
      assert.deepEqual(indexed.supersession_relation, first.relation);
      const { supersession_relation: _relation, ...indexedWithoutRelation } = indexed;
      assert.deepEqual(indexedWithoutRelation, predecessorRecordBefore);
      const queue = loadQueue(bundleDir);
      assert.equal(queue.terminal_history.filter((entry) => entry.work_id === record.work_id).length, 1);
      const successor = queue.active_window.find((item) => item.queue_item_id === first.relation.successor_queue_item_id);
      assert.ok(successor);
      assert.equal(successor.restore_priority, 'normal');
      assert.equal(successor.lineage.supersession_tx_id, first.relation.tx_id);
      assert.equal(successor.lineage.supersession_root, first.relation.root_code);
      assert.equal(Object.hasOwn(successor.lineage, 'reason'), false);

      const replay = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'a different replay reason must not rewrite history',
      });
      assert.equal(replay.ok, true);
      assert.equal(replay.idempotent, true);
      assert.deepEqual(replay.relation, first.relation);
      assert.equal(loadQueue(bundleDir).active_window.filter((item) => item.queue_item_id === successor.queue_item_id).length, 1);
      assert.equal(resolveWorkUnitSupersessionLineage(bundleDir, { predecessorWorkId: record.work_id }).leaf.queue_item_id, successor.queue_item_id);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('keeps exact declaration recovery ahead of supersession, then permits marked durable evidence when recovery is unavailable', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-declaration-');
    try {
      const { record, submitted } = claimAndSubmitWorkUnit(bundleDir);
      assert.equal(submitted.ok, true);
      rmSync(path.join(bundleDir, 'rb_output_declarations.jsonl'));

      const recoverFirst = evaluateWorkUnitSupersessionEligibility(bundleDir, { work_id: record.work_id });
      assert.equal(recoverFirst.eligible, false);
      assert.equal(recoverFirst.reason_code, 'declaration_recovery_required');
      assert.equal(recoverFirst.repair_kind, 'recover-declaration');

      const resultPath = path.join(bundleDir, record.paths.result_ref);
      const drifted = JSON.parse(readFileSync(resultPath, 'utf8'));
      drifted.summary = 'prevents exact row reconstruction';
      writeFileSync(resultPath, `${JSON.stringify(drifted, null, 2)}\n`);
      const before = immutablePredecessorSnapshot(bundleDir, record);
      const eligible = evaluateWorkUnitSupersessionEligibility(bundleDir, { work_id: record.work_id });
      assert.equal(eligible.eligible, true);
      assert.equal(eligible.root_code, 'submitted_declaration_missing');
      assert.ok(eligible.observed_roots.some((root) => root.code === 'submitted_declaration_missing'));
      assert.ok(eligible.observed_roots.some((root) => root.code === 'submitted_result_drift'));

      const superseded = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'accepted declaration is missing and exact recovery is unavailable',
      });
      assert.equal(superseded.ok, true);
      assert.equal(superseded.relation.root_code, 'submitted_declaration_missing');
      assert.equal(existsSync(path.join(bundleDir, 'rb_output_declarations.jsonl')), false);
      assert.deepEqual(immutablePredecessorSnapshot(bundleDir, record), before);
      const normalized = evaluateNormalizedSubmittedWorkUnitLedger(bundleDir);
      assert.equal(normalized.facts.length, 0);
      assert.equal(normalized.historical.length, 1);
      assert.equal(normalized.historical[0].ledger_disposition, 'missing');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('does not let committed v1 original evidence create supersession or historical lineage', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-v1-evidence-');
    try {
      const { record, submitted } = claimAndSubmitWorkUnit(bundleDir);
      assert.equal(submitted.ok, true);
      const txRoot = path.join(bundleDir, '_work_units', '_transactions');
      const originalName = readdirSync(txRoot).find((name) => {
        const transaction = JSON.parse(readFileSync(path.join(txRoot, name), 'utf8'));
        return transaction.operation === 'submit_work_unit' && transaction.status === 'committed';
      });
      assert.ok(originalName);
      const originalPath = path.join(txRoot, originalName);
      const original = JSON.parse(readFileSync(originalPath, 'utf8'));
      writeFileSync(originalPath, `${JSON.stringify({
        schema_version: 'work-unit.transaction.v1',
        tx_id: original.tx_id,
        operation: original.operation,
        status: 'committed',
        started_at: original.started_at,
        committed_at: original.settled_at,
      })}\n`);
      rmSync(path.join(bundleDir, 'rb_output_declarations.jsonl'));
      const resultPath = path.join(bundleDir, record.paths.result_ref);
      const drifted = JSON.parse(readFileSync(resultPath, 'utf8'));
      drifted.summary = 'prevents exact declaration reconstruction';
      writeFileSync(resultPath, `${JSON.stringify(drifted, null, 2)}\n`);
      const before = coreAuthoritySnapshot(bundleDir);

      const eligibility = evaluateWorkUnitSupersessionEligibility(bundleDir, { work_id: record.work_id });
      assert.equal(eligibility.eligible, false);
      assert.equal(eligibility.reason_code, 'missing_contract');
      const superseded = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'v1 evidence cannot authorize a successor',
      });
      assert.equal(superseded.ok, false);
      assert.equal(superseded.reason_code, 'missing_contract');
      assert.deepEqual(coreAuthoritySnapshot(bundleDir), before);
      assert.throws(
        () => evaluateNormalizedSubmittedWorkUnitLedger(bundleDir),
        /submitted ledger row is missing/,
      );
      assert.equal(inspectWorkUnits(bundleDir).passed, false);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('rejects predecessor candidate coordinates for a freshly claimed successor', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-stale-binding-');
    try {
      const original = claimAndSubmitWorkUnit(bundleDir);
      const predecessor = original.record;
      const driftedPath = path.join(bundleDir, predecessor.paths.result_ref);
      const drifted = JSON.parse(readFileSync(driftedPath, 'utf8'));
      drifted.summary = 'drifted';
      writeFileSync(driftedPath, `${JSON.stringify(drifted, null, 2)}\n`);
      const superseded = supersedeWorkUnitAttempt(bundleDir, {
        work_id: predecessor.work_id,
        reason: 'result drift',
      });
      assert.equal(superseded.ok, true);
      const historicalOnly = checkWorkUnitLedgerExists(bundleDir, {
        id: 'wave0_work_unit_ledger_exists',
        wave: 'wave0',
        kind: 'wave0_source_intake',
      });
      assert.equal(historicalOnly.passed, false);
      assert.equal(historicalOnly.records.length, 0);
      assert.equal(inspectWorkUnits(bundleDir).passed, true);
      assert.equal(checkSubmittedDeclarationRecovery(bundleDir, {
        id: 'wave0_work_unit_submission_presence',
        wave: 'wave0',
      }).passed, true);

      const claimed = claimWorkUnits(bundleDir, {
        phase: 'wave0',
        count: 1,
        ...availableActorDecision('wave0_source_intake'),
      });
      assert.equal(claimed.claimed_count, 1);
      const successor = loadWorkUnitIndex(bundleDir).work_units[claimed.claimed_work_ids[0]];
      assert.notEqual(successor.work_id, predecessor.work_id);
      assert.notEqual(successor.receipt_nonce, predecessor.receipt_nonce);
      const inFlightLineage = resolveWorkUnitSupersessionLineage(bundleDir, {
        predecessorWorkId: predecessor.work_id,
      });
      assert.equal(inFlightLineage.leaf.queue_location, 'delegated_in_flight');
      assert.equal(inFlightLineage.leaf.work_id, successor.work_id);

      const stale = submitWorkUnit(bundleDir, {
        work_id: successor.work_id,
        resultPath: original.resultPath,
      });
      assert.equal(stale.ok, false);
      assert.equal(readWorkUnitLedgerRows(bundleDir).length, 1);
      assert.equal(loadWorkUnitIndex(bundleDir).work_units[successor.work_id].status, 'claimed');

      const successorReceipt = {
        schema_version: 'work-unit.receipt-event.v1',
        event: 'work_done',
        work_id: successor.work_id,
        queue_item_id: successor.queue_item_id,
        kind: successor.kind,
        receipt_nonce: successor.receipt_nonce,
        actor_contract_version: successor.actor_contract_version,
        execution_actor_class: successor.actor_execution.execution_actor_class,
        ts: '2026-07-30T00:00:00.000Z',
      };
      writeFileSync(path.join(bundleDir, successor.paths.runtime_receipt_ref), `${JSON.stringify(successorReceipt)}\n`);
      const priorResult = JSON.parse(readFileSync(driftedPath, 'utf8'));
      const successorResult = {
        ...priorResult,
        work_id: successor.work_id,
        queue_item_id: successor.queue_item_id,
        kind: successor.kind,
        receipt_nonce: successor.receipt_nonce,
        actor_contract_version: successor.actor_contract_version,
        execution_actor_class: successor.actor_execution.execution_actor_class,
        summary: 'fresh successor submission',
      };
      const successorResultPath = path.join(bundleDir, '_tmp', `${successor.work_id}.json`);
      writeFileSync(successorResultPath, `${JSON.stringify(successorResult, null, 2)}\n`);
      const accepted = submitWorkUnit(bundleDir, {
        work_id: successor.work_id,
        resultPath: successorResultPath,
      });
      assert.equal(accepted.ok, true, JSON.stringify(accepted, null, 2));
      const normalized = evaluateNormalizedSubmittedWorkUnitLedger(bundleDir);
      assert.deepEqual(normalized.facts.map((fact) => fact.ledger_row.work_id), [successor.work_id]);
      assert.deepEqual(normalized.historical.map((fact) => fact.work_id), [predecessor.work_id]);
      assert.equal(normalized.historical[0].lineage.leaf.work_id, successor.work_id);
      const currentCoverage = checkWorkUnitLedgerExists(bundleDir, {
        id: 'wave0_work_unit_ledger_exists',
        wave: 'wave0',
        kind: 'wave0_source_intake',
      });
      assert.equal(currentCoverage.passed, true, currentCoverage.inspect.join('; '));
      assert.deepEqual(currentCoverage.records.map((row) => row.work_id), [successor.work_id]);
      assert.equal(checkWorkUnitSubmissionPresence(bundleDir, {
        id: 'wave0_work_unit_submission_presence',
        wave: 'wave0',
        kind: 'wave0_source_intake',
      }).passed, true);

      const acceptedSuccessorPath = path.join(bundleDir, successor.paths.result_ref);
      const secondDrift = JSON.parse(readFileSync(acceptedSuccessorPath, 'utf8'));
      secondDrift.summary = 'second accepted attempt drifted';
      writeFileSync(acceptedSuccessorPath, `${JSON.stringify(secondDrift, null, 2)}\n`);
      const nested = supersedeWorkUnitAttempt(bundleDir, {
        work_id: successor.work_id,
        reason: 'second result drift',
      });
      assert.equal(nested.ok, true);
      const nestedLineage = resolveWorkUnitSupersessionLineage(bundleDir, { predecessorWorkId: predecessor.work_id });
      assert.equal(nestedLineage.edges.filter((edge) => edge.kind === 'supersession').length, 2);
      assert.equal(nestedLineage.leaf.queue_item_id, nested.relation.successor_queue_item_id);
      const afterNested = evaluateNormalizedSubmittedWorkUnitLedger(bundleDir);
      assert.equal(afterNested.facts.length, 0);
      assert.deepEqual(afterNested.historical.map((fact) => fact.work_id).sort(), [predecessor.work_id, successor.work_id].sort());
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('follows an existing failed-attempt replacement without reopening the submitted predecessor', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-replacement-');
    try {
      const original = claimAndSubmitWorkUnit(bundleDir);
      const predecessor = original.record;
      const resultPath = path.join(bundleDir, predecessor.paths.result_ref);
      const drifted = JSON.parse(readFileSync(resultPath, 'utf8'));
      drifted.summary = 'drifted';
      writeFileSync(resultPath, `${JSON.stringify(drifted, null, 2)}\n`);
      const superseded = supersedeWorkUnitAttempt(bundleDir, {
        work_id: predecessor.work_id,
        reason: 'result drift',
      });
      assert.equal(superseded.ok, true);
      const claim = claimWorkUnits(bundleDir, {
        phase: 'wave0',
        count: 1,
        ...availableActorDecision('wave0_source_intake'),
      });
      const successorWorkId = claim.claimed_work_ids[0];
      assert.equal(closeWorkUnitAttempt(bundleDir, {
        work_id: successorWorkId,
        status: 'failed',
        reason: 'actor returned an unrecoverable attempt failure',
      }).ok, true);
      const replacement = replaceWorkUnitAttempt(bundleDir, { work_id: successorWorkId });
      assert.equal(replacement.ok, true);
      assert.equal(replacement.created, true);

      const lineage = resolveWorkUnitSupersessionLineage(bundleDir, { predecessorWorkId: predecessor.work_id });
      assert.deepEqual(lineage.edges.map((edge) => edge.kind), ['supersession', 'replacement']);
      assert.equal(lineage.leaf.queue_item_id, replacement.queue_item_id);
      assert.equal(lineage.leaf.queue_location, 'active_window');
      assert.equal(loadWorkUnitIndex(bundleDir).work_units[predecessor.work_id].status, 'submitted');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('follows a replacement that is normally submitted and later superseded', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-replacement-nested-');
    try {
      const original = claimAndSubmitWorkUnit(bundleDir);
      const predecessor = original.record;
      const acceptedPath = path.join(bundleDir, predecessor.paths.result_ref);
      const templateResult = JSON.parse(readFileSync(acceptedPath, 'utf8'));
      writeFileSync(acceptedPath, `${JSON.stringify({
        ...templateResult,
        summary: 'first predecessor drift',
      }, null, 2)}\n`);
      const firstSupersession = supersedeWorkUnitAttempt(bundleDir, {
        work_id: predecessor.work_id,
        reason: 'first result drift',
      });
      assert.equal(firstSupersession.ok, true);

      const successorClaim = claimWorkUnits(bundleDir, {
        phase: 'wave0',
        count: 1,
        ...availableActorDecision('wave0_source_intake'),
      });
      const successor = loadWorkUnitIndex(bundleDir).work_units[successorClaim.claimed_work_ids[0]];
      assert.equal(closeWorkUnitAttempt(bundleDir, {
        work_id: successor.work_id,
        status: 'failed',
        reason: 'successor failed before producing a candidate',
      }).ok, true);
      const replacement = replaceWorkUnitAttempt(bundleDir, { work_id: successor.work_id });
      assert.equal(replacement.ok, true);

      const replacementClaim = claimWorkUnits(bundleDir, {
        phase: 'wave0',
        count: 1,
        ...availableActorDecision('wave0_source_intake'),
      });
      const replacementRecord = loadWorkUnitIndex(bundleDir).work_units[replacementClaim.claimed_work_ids[0]];
      const replacementResultPath = writeAttemptCandidate(
        bundleDir,
        replacementRecord,
        templateResult,
        'replacement submitted result',
      );
      assert.equal(submitWorkUnit(bundleDir, {
        work_id: replacementRecord.work_id,
        resultPath: replacementResultPath,
      }).ok, true);

      const replacementAcceptedPath = path.join(bundleDir, replacementRecord.paths.result_ref);
      const replacementResult = JSON.parse(readFileSync(replacementAcceptedPath, 'utf8'));
      replacementResult.summary = 'replacement result drifted after acceptance';
      writeFileSync(replacementAcceptedPath, `${JSON.stringify(replacementResult, null, 2)}\n`);
      const nested = supersedeWorkUnitAttempt(bundleDir, {
        work_id: replacementRecord.work_id,
        reason: 'replacement result drift',
      });
      assert.equal(nested.ok, true, JSON.stringify(nested, null, 2));

      const lineage = resolveWorkUnitSupersessionLineage(bundleDir, {
        predecessorWorkId: predecessor.work_id,
      });
      assert.deepEqual(lineage.edges.map((edge) => edge.kind), [
        'supersession',
        'replacement',
        'supersession',
      ]);
      assert.equal(lineage.leaf.queue_item_id, nested.relation.successor_queue_item_id);
      assert.equal(lineage.leaf.item.lineage.replacement_of_work_id, successor.work_id);
      assert.equal(lineage.leaf.item.lineage.supersession_of_work_id, replacementRecord.work_id);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('selects a normally submitted timeout retry as the unique current lineage leaf', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-timeout-retry-');
    try {
      const original = claimAndSubmitWorkUnit(bundleDir);
      const predecessor = original.record;
      const acceptedResultPath = path.join(bundleDir, predecessor.paths.result_ref);
      const templateResult = JSON.parse(readFileSync(acceptedResultPath, 'utf8'));
      const drifted = { ...templateResult, summary: 'drifted predecessor result' };
      writeFileSync(acceptedResultPath, `${JSON.stringify(drifted, null, 2)}\n`);
      const superseded = supersedeWorkUnitAttempt(bundleDir, {
        work_id: predecessor.work_id,
        reason: 'result drift before timeout retry',
      });
      assert.equal(superseded.ok, true);

      const firstClaim = claimWorkUnits(bundleDir, {
        phase: 'wave0',
        count: 1,
        ...availableActorDecision('wave0_source_intake'),
      });
      const firstAttempt = loadWorkUnitIndex(bundleDir).work_units[firstClaim.claimed_work_ids[0]];
      const timedOut = closeWorkUnitAttempt(bundleDir, {
        work_id: firstAttempt.work_id,
        status: 'timed_out',
        reason: 'successor attempt timed out',
        force: true,
      });
      assert.equal(timedOut.ok, true);

      const retryClaim = claimWorkUnits(bundleDir, {
        phase: 'wave0',
        count: 1,
        ...availableActorDecision('wave0_source_intake'),
      });
      const retry = loadWorkUnitIndex(bundleDir).work_units[retryClaim.claimed_work_ids[0]];
      assert.equal(retry.attempt_index, 2);
      const retryResultPath = writeAttemptCandidate(bundleDir, retry, templateResult, 'retry completed');
      const submittedRetry = submitWorkUnit(bundleDir, {
        work_id: retry.work_id,
        resultPath: retryResultPath,
      });
      assert.equal(submittedRetry.ok, true, JSON.stringify(submittedRetry, null, 2));

      const lineage = resolveWorkUnitSupersessionLineage(bundleDir, {
        predecessorWorkId: predecessor.work_id,
      });
      assert.deepEqual(lineage.edges.map((edge) => edge.kind), ['supersession', 'retry']);
      assert.equal(lineage.leaf.work_id, retry.work_id);
      assert.equal(lineage.leaf.work_status, 'submitted');
      const normalized = evaluateNormalizedSubmittedWorkUnitLedger(bundleDir);
      assert.deepEqual(normalized.facts.map((fact) => fact.ledger_row.work_id), [retry.work_id]);
      assert.deepEqual(normalized.historical.map((fact) => fact.work_id), [predecessor.work_id]);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('supersedes a normally submitted attempt-2 retry without inherited retry lineage', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-attempt2-retry-');
    try {
      // Build a timeout-retry chain on the original queue item and submit the attempt-2 leaf.
      const first = claimAndSubmitWorkUnit(bundleDir, { submit: false });
      const attempt1 = first.record;
      assert.equal(attempt1.attempt_index, 1);
      const timedOut = closeWorkUnitAttempt(bundleDir, {
        work_id: attempt1.work_id,
        status: 'timed_out',
        reason: 'attempt-1 timed out before result',
        force: true,
      });
      assert.equal(timedOut.ok, true);

      const retryClaim = claimWorkUnits(bundleDir, {
        phase: 'wave0',
        count: 1,
        ...availableActorDecision('wave0_source_intake'),
      });
      const retry = loadWorkUnitIndex(bundleDir).work_units[retryClaim.claimed_work_ids[0]];
      assert.equal(retry.attempt_index, 2);
      const templateResult = JSON.parse(readFileSync(first.resultPath, 'utf8'));
      const retryResultPath = writeAttemptCandidate(bundleDir, retry, templateResult, 'retry completed');
      const submittedRetry = submitWorkUnit(bundleDir, {
        work_id: retry.work_id,
        resultPath: retryResultPath,
      });
      assert.equal(submittedRetry.ok, true, JSON.stringify(submittedRetry, null, 2));

      // Drift the submitted attempt-2 retry result, then supersede the retry leaf itself.
      const acceptedResultPath = path.join(bundleDir, retry.paths.result_ref);
      const acceptedResult = JSON.parse(readFileSync(acceptedResultPath, 'utf8'));
      writeFileSync(acceptedResultPath, `${JSON.stringify({
        ...acceptedResult,
        summary: 'drifted attempt-2 retry result',
      }, null, 2)}\n`);

      const eligible = evaluateWorkUnitSupersessionEligibility(bundleDir, { work_id: retry.work_id });
      assert.equal(eligible.eligible, true, JSON.stringify(eligible, null, 2));
      assert.equal(eligible.root_code, 'submitted_result_drift');

      const superseded = supersedeWorkUnitAttempt(bundleDir, {
        work_id: retry.work_id,
        reason: 'result drift after attempt-2 retry submit',
      });
      assert.equal(superseded.ok, true, JSON.stringify(superseded, null, 2));
      assert.equal(superseded.successor_queue_item_id, superseded.relation.successor_queue_item_id);

      // The fresh supersession successor must not inherit the retry chain of the old queue item.
      const queue = loadQueue(bundleDir);
      const successor = [...queue.active_window, ...queue.refill_pool]
        .find((entry) => entry.queue_item_id === superseded.successor_queue_item_id);
      assert.ok(successor, 'supersession successor must be queued in an ordinary location');
      assert.equal(successor.lineage?.supersession_of_work_id, retry.work_id);
      assert.equal(successor.lineage?.retry_of_work_id, undefined, 'successor must not inherit retry_of_work_id');
      assert.equal(successor.lineage?.retry_reason, undefined, 'successor must not inherit retry_reason');
      assert.equal(successor.lineage?.attempt_index, undefined, 'successor must not inherit retry attempt_index');

      const lineage = resolveWorkUnitSupersessionLineage(bundleDir, {
        predecessorWorkId: retry.work_id,
      });
      assert.deepEqual(lineage.edges.map((edge) => edge.kind), ['supersession']);
      assert.equal(lineage.leaf.queue_item_id, superseded.successor_queue_item_id);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('selects an audited late-accepted successor after retry cleanup', () => {
    for (const claimRetry of [false, true]) {
      const bundleDir = tempWorkUnitBundle(`wu-supersede-late-${claimRetry ? 'claimed' : 'queued'}-`);
      try {
        const original = claimAndSubmitWorkUnit(bundleDir);
        const predecessor = original.record;
        const acceptedResultPath = path.join(bundleDir, predecessor.paths.result_ref);
        const templateResult = JSON.parse(readFileSync(acceptedResultPath, 'utf8'));
        writeFileSync(acceptedResultPath, `${JSON.stringify({
          ...templateResult,
          summary: 'drifted predecessor result',
        }, null, 2)}\n`);
        const superseded = supersedeWorkUnitAttempt(bundleDir, {
          work_id: predecessor.work_id,
          reason: 'result drift before late successor acceptance',
        });
        assert.equal(superseded.ok, true);

        const firstClaim = claimWorkUnits(bundleDir, {
          phase: 'wave0',
          count: 1,
          ...availableActorDecision('wave0_source_intake'),
        });
        const firstAttempt = loadWorkUnitIndex(bundleDir).work_units[firstClaim.claimed_work_ids[0]];
        const firstResultPath = writeAttemptCandidate(
          bundleDir,
          firstAttempt,
          templateResult,
          'late successor result',
        );
        const timedOut = closeWorkUnitAttempt(bundleDir, {
          work_id: firstAttempt.work_id,
          status: 'timed_out',
          reason: 'successor attempt timed out before result arrival',
          force: true,
        });
        assert.equal(timedOut.ok, true);

        let claimedRetryWorkId = null;
        if (claimRetry) {
          const retryClaim = claimWorkUnits(bundleDir, {
            phase: 'wave0',
            count: 1,
            ...availableActorDecision('wave0_source_intake'),
          });
          claimedRetryWorkId = retryClaim.claimed_work_ids[0];
        }
        const lateAccepted = lateSubmitWorkUnit(bundleDir, {
          work_id: firstAttempt.work_id,
          resultPath: firstResultPath,
          reason: 'successor result arrived after timeout',
        });
        assert.equal(lateAccepted.ok, true, JSON.stringify(lateAccepted, null, 2));
        assert.deepEqual(
          lateAccepted.superseded_retry_work_ids,
          claimedRetryWorkId ? [claimedRetryWorkId] : [],
        );

        const lineage = resolveWorkUnitSupersessionLineage(bundleDir, {
          predecessorWorkId: predecessor.work_id,
        });
        assert.deepEqual(lineage.edges.map((edge) => edge.kind), ['supersession']);
        assert.equal(lineage.leaf.work_id, firstAttempt.work_id);
        assert.equal(lineage.leaf.work_status, 'submitted');
        if (claimedRetryWorkId) {
          assert.equal(loadWorkUnitIndex(bundleDir).work_units[claimedRetryWorkId].status, 'abandoned');
        }
        const normalized = evaluateNormalizedSubmittedWorkUnitLedger(bundleDir);
        assert.deepEqual(normalized.facts.map((fact) => fact.ledger_row.work_id), [firstAttempt.work_id]);
        assert.deepEqual(normalized.historical.map((fact) => fact.work_id), [predecessor.work_id]);
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }
  });

  it('selects declaration drift before direct drift while retaining every observed surface', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-declaration-drift-');
    try {
      const { record } = claimAndSubmitWorkUnit(bundleDir);
      const ledgerPath = path.join(bundleDir, 'rb_output_declarations.jsonl');
      const row = JSON.parse(readFileSync(ledgerPath, 'utf8').trim());
      row.result_hash = '0'.repeat(64);
      writeFileSync(ledgerPath, `${JSON.stringify(row)}\n`);
      const resultPath = path.join(bundleDir, record.paths.result_ref);
      const result = JSON.parse(readFileSync(resultPath, 'utf8'));
      result.summary = 'result also drifted after declaration corruption';
      writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);

      const eligible = evaluateWorkUnitSupersessionEligibility(bundleDir, { work_id: record.work_id });
      assert.equal(eligible.eligible, true, JSON.stringify(eligible, null, 2));
      assert.equal(eligible.root_code, 'submitted_declaration_drift');
      assert.deepEqual(
        eligible.observed_roots.map((root) => root.code),
        ['submitted_declaration_drift', 'submitted_result_drift'],
      );
      const ledgerBefore = readFileSync(ledgerPath, 'base64');
      const superseded = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'attributable declaration and result drift',
      });
      assert.equal(superseded.ok, true, JSON.stringify(superseded, null, 2));
      assert.equal(superseded.relation.root_code, 'submitted_declaration_drift');
      assert.equal(readFileSync(ledgerPath, 'base64'), ledgerBefore);
      const normalized = evaluateNormalizedSubmittedWorkUnitLedger(bundleDir);
      assert.equal(normalized.facts.length, 0);
      assert.equal(normalized.historical.length, 1);
      assert.equal(normalized.historical[0].ledger_disposition, 'attributable_drift');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('normalizes receipt, output, and cache drift to their closed supersession roots', () => {
    const cases = [
      {
        name: 'receipt',
        expectedRoot: 'submitted_runtime_receipt_drift',
        mutate(bundleDir, record) {
          const receiptPath = path.join(bundleDir, record.paths.runtime_receipt_ref);
          const receipt = JSON.parse(readFileSync(receiptPath, 'utf8').trim());
          receipt.receipt_nonce = 'stale-receipt-nonce';
          writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`);
        },
      },
      {
        name: 'output',
        expectedRoot: 'submitted_output_drift',
        mutate(bundleDir, record) {
          const result = JSON.parse(readFileSync(path.join(bundleDir, record.paths.result_ref), 'utf8'));
          rmSync(path.join(bundleDir, result.output_files[0].path));
        },
      },
      {
        name: 'cache',
        expectedRoot: 'submitted_cache_drift',
        mutate(bundleDir, record) {
          const result = JSON.parse(readFileSync(path.join(bundleDir, record.paths.result_ref), 'utf8'));
          rmSync(path.join(bundleDir, result.cache_trails[0], 'page.md'));
        },
      },
    ];
    for (const testCase of cases) {
      const bundleDir = tempWorkUnitBundle(`wu-supersede-${testCase.name}-root-`);
      try {
        const { record } = claimAndSubmitWorkUnit(bundleDir);
        testCase.mutate(bundleDir, record);
        const eligible = evaluateWorkUnitSupersessionEligibility(bundleDir, { work_id: record.work_id });
        assert.equal(eligible.eligible, true, `${testCase.name}: ${JSON.stringify(eligible, null, 2)}`);
        assert.equal(eligible.root_code, testCase.expectedRoot, testCase.name);
        assert.deepEqual(eligible.observed_roots.map((root) => root.code), [testCase.expectedRoot], testCase.name);
        const superseded = supersedeWorkUnitAttempt(bundleDir, {
          work_id: record.work_id,
          reason: `${testCase.name} drift`,
        });
        assert.equal(superseded.ok, true, testCase.name);
        assert.equal(superseded.relation.root_code, testCase.expectedRoot, testCase.name);
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }
  });

  it('rejects a markerless acceptance tuple before submit or supersession mutation', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-legacy-');
    try {
      const prepared = claimAndSubmitWorkUnit(bundleDir, { submit: false });
      const record = downgradeSubmissionContractToLegacy(bundleDir, prepared.record);
      const before = coreAuthoritySnapshot(bundleDir);
      const submitted = submitWorkUnit(bundleDir, {
        work_id: record.work_id,
        resultPath: prepared.resultPath,
      });
      assert.equal(submitted.ok, false);
      assert.equal(submitted.reason_code, 'unsupported_current_contract');
      const superseded = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'retired markerless submission profile',
      });
      assert.equal(superseded.ok, false);
      assert.equal(superseded.reason_code, 'unsupported_current_contract');
      assert.deepEqual(coreAuthoritySnapshot(bundleDir), before);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('rejects richer content without direct drift at the semantic boundary without mutation', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-semantic-boundary-');
    try {
      const { record } = claimAndSubmitWorkUnit(bundleDir);
      const before = coreAuthoritySnapshot(bundleDir);
      const rejected = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'a later actor returned richer content',
      });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.reason_code, 'semantic_boundary');
      assert.equal(rejected.repair_kind, 'semantic_boundary');
      assert.deepEqual(coreAuthoritySnapshot(bundleDir), before);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('fails closed on duplicate, unparseable, and foreign attributable ledger corruption', () => {
    const cases = [
      {
        name: 'duplicate',
        corrupt(raw) {
          return `${raw.trim()}\n${raw.trim()}\n`;
        },
        pattern: /duplicate/i,
      },
      {
        name: 'unparseable',
        corrupt(raw) {
          return `${raw.trim()}\n{not-json}\n`;
        },
        pattern: /unattributable|invalid JSON/i,
      },
      {
        name: 'foreign-attributable',
        corrupt(raw) {
          return `${raw.trim()}\n${JSON.stringify({ work_id: 'wu-w0-b000-src-i9999' })}\n`;
        },
        pattern: /foreign attributable|no validated historical owner/i,
      },
    ];
    for (const testCase of cases) {
      const bundleDir = tempWorkUnitBundle(`wu-supersede-${testCase.name}-`);
      try {
        const { record } = claimAndSubmitWorkUnit(bundleDir);
        const ledgerPath = path.join(bundleDir, 'rb_output_declarations.jsonl');
        writeFileSync(ledgerPath, testCase.corrupt(readFileSync(ledgerPath, 'utf8')));
        const before = coreAuthoritySnapshot(bundleDir);
        const rejected = supersedeWorkUnitAttempt(bundleDir, {
          work_id: record.work_id,
          reason: `${testCase.name} corruption must not be isolated`,
        });
        assert.equal(rejected.ok, false, testCase.name);
        assert.equal(rejected.repair_kind, 'missing_contract', testCase.name);
        assert.match(rejected.missing_fact, testCase.pattern, testCase.name);
        assert.deepEqual(coreAuthoritySnapshot(bundleDir), before, testCase.name);
        assert.throws(
          () => evaluateNormalizedSubmittedWorkUnitLedger(bundleDir),
          testCase.pattern,
          testCase.name,
        );
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }
  });

  it('requires the immutable relation to reference its committed supersession transaction', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-transaction-ref-');
    try {
      const { record } = claimAndSubmitWorkUnit(bundleDir);
      const resultPath = path.join(bundleDir, record.paths.result_ref);
      const result = JSON.parse(readFileSync(resultPath, 'utf8'));
      result.summary = 'drift before relation transaction removal';
      writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
      const superseded = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'transaction reference must remain auditable',
      });
      assert.equal(superseded.ok, true);
      rmSync(path.join(bundleDir, '_work_units/_transactions', `${superseded.relation.tx_id}.json`));

      assert.throws(
        () => resolveWorkUnitSupersessionLineage(bundleDir, { predecessorWorkId: record.work_id }),
        /transaction journal is missing/,
      );
      const gate = checkWorkUnitLedgerExists(bundleDir, {
        id: 'wave0_work_unit_ledger_exists',
        wave: 'wave0',
      });
      assert.equal(gate.passed, false);
      assert.equal(gate.findings.length, 1);
      assert.match(gate.findings[0].missing_fact, /transaction journal is missing/);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('masks dependent output and presence symptoms under one malformed-relation root', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-malformed-relation-');
    try {
      const { record } = claimAndSubmitWorkUnit(bundleDir);
      const manifest = JSON.parse(readFileSync(path.join(bundleDir, record.paths.manifest_ref), 'utf8'));
      assert.equal(manifest.assignment_contract_version, 'work-unit.assignment.v3');
      const requiredOutputs = manifest.output_contract.required_outputs;
      assert.ok(Array.isArray(requiredOutputs));
      assert.ok(requiredOutputs.length > 0);
      assert.ok(requiredOutputs.every(({ path: outputPath, role }) => (
        typeof outputPath === 'string' && outputPath.length > 0
        && typeof role === 'string' && role.length > 0
      )));
      const outputSelectors = {
        glob: requiredOutputs.map(({ path: outputPath }) => outputPath),
        roles: requiredOutputs.map(({ role }) => role),
      };
      const resultPath = path.join(bundleDir, record.paths.result_ref);
      const result = JSON.parse(readFileSync(resultPath, 'utf8'));
      result.summary = 'drift before malformed relation';
      writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
      assert.equal(supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'create relation before malformed-field injection',
      }).ok, true);
      const indexPath = path.join(bundleDir, '_work_units/_index.json');
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));
      delete index.work_units[record.work_id].supersession_relation.tx_id;
      writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

      const output = checkWorkUnitOutputCoverage(bundleDir, {
        id: 'wave0_work_unit_output_coverage',
        wave: 'wave0',
        output_selectors: outputSelectors,
      });
      const presence = checkWorkUnitSubmissionPresence(bundleDir, {
        id: 'wave0_work_unit_submission_presence',
        wave: 'wave0',
      });
      for (const gate of [output, presence]) {
        assert.equal(gate.passed, false);
        assert.equal(gate.findings.length, 1);
        assert.match(gate.findings[0].id, /ledger_invalid/);
        assert.match(gate.findings[0].missing_fact, /supersession_relation|tx_id/);
      }
      const inspected = inspectWorkUnits(bundleDir);
      assert.equal(inspected.passed, false);
      assert.match(inspected.inspect.join('\n'), /supersession_relation|tx_id/);
      assert.equal(output.orphans.length, requiredOutputs.length);
      assert.deepEqual(
        output.orphans.sort(),
        requiredOutputs.map(({ path: outputPath }) => outputPath).sort(),
      );
      assert.equal(typeof output.orphans[0], 'string');
      assert.doesNotMatch(output.findings[0].id, /output:/);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('rejects every schema-valid direct-parent lineage mismatch', () => {
    const cases = [
      ['supersession_of_work_id', 'wu-w0-b000-src-i9999'],
      ['supersession_of_queue_item_id', 'queue-other'],
      ['supersession_accepted_ledger_record_hash', '0'.repeat(64)],
      ['supersession_root', 'submitted_cache_drift'],
      ['supersession_tx_id', 'tx-other'],
    ];
    for (const [field, value] of cases) {
      const bundleDir = tempWorkUnitBundle(`wu-supersede-lineage-${field}-`);
      try {
        const { record } = claimAndSubmitWorkUnit(bundleDir);
        const resultPath = path.join(bundleDir, record.paths.result_ref);
        const result = JSON.parse(readFileSync(resultPath, 'utf8'));
        result.summary = `drift before ${field} mismatch`;
        writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
        const superseded = supersedeWorkUnitAttempt(bundleDir, {
          work_id: record.work_id,
          reason: `${field} mismatch fixture`,
        });
        assert.equal(superseded.ok, true, field);
        const queue = loadQueue(bundleDir);
        const successor = queue.active_window.find((item) => (
          item.queue_item_id === superseded.relation.successor_queue_item_id
        ));
        successor.lineage[field] = value;
        saveQueue(bundleDir, queue);

        assert.throws(
          () => resolveWorkUnitSupersessionLineage(bundleDir, { predecessorWorkId: record.work_id }),
          /supersession|successor lineage/i,
          field,
        );
        const replay = supersedeWorkUnitAttempt(bundleDir, {
          work_id: record.work_id,
          reason: 'mismatched lineage must not be repaired by replay',
        });
        assert.equal(replay.ok, false, field);
        assert.equal(replay.reason_code, 'supersession_integrity_invalid', field);
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    }
  });

  it('rejects direct reactivation of the historical predecessor', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-parent-reactivation-');
    try {
      const { record } = claimAndSubmitWorkUnit(bundleDir);
      const resultPath = path.join(bundleDir, record.paths.result_ref);
      const result = JSON.parse(readFileSync(resultPath, 'utf8'));
      result.summary = 'drift before parent reactivation';
      writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
      assert.equal(supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'parent must remain terminal',
      }).ok, true);
      const queue = loadQueue(bundleDir);
      const terminalIndex = queue.terminal_history.findIndex((entry) => entry.work_id === record.work_id);
      const [terminal] = queue.terminal_history.splice(terminalIndex, 1);
      queue.active_window.push({ ...terminal.item, status: 'queued' });
      saveQueue(bundleDir, queue);

      assert.throws(
        () => resolveWorkUnitSupersessionLineage(bundleDir, { predecessorWorkId: record.work_id }),
        /requires exactly one matching terminal done snapshot/,
      );
      assert.throws(
        () => evaluateNormalizedSubmittedWorkUnitLedger(bundleDir),
        /requires exactly one matching terminal done snapshot/,
      );
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('rejects a retry lineage cycle even when snapshot hashes agree', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-retry-cycle-');
    try {
      const { record } = claimAndSubmitWorkUnit(bundleDir);
      const resultPath = path.join(bundleDir, record.paths.result_ref);
      const result = JSON.parse(readFileSync(resultPath, 'utf8'));
      result.summary = 'drift before retry cycle';
      writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
      assert.equal(supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'create successor before retry cycle',
      }).ok, true);
      const claim = claimWorkUnits(bundleDir, {
        phase: 'wave0',
        count: 1,
        ...availableActorDecision('wave0_source_intake'),
      });
      const successor = loadWorkUnitIndex(bundleDir).work_units[claim.claimed_work_ids[0]];
      const manifestPath = path.join(bundleDir, successor.paths.manifest_ref);
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      manifest.queue_item.lineage = {
        ...manifest.queue_item.lineage,
        retry_of_work_id: successor.work_id,
        retry_reason: 'self-cycle',
        attempt_index: successor.attempt_index + 1,
      };
      const snapshotHash = queueItemSnapshotHash(manifest.queue_item);
      manifest.queue_item_snapshot_hash = snapshotHash;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      const index = loadWorkUnitIndex(bundleDir);
      index.work_units[successor.work_id].queue_item_snapshot_hash = snapshotHash;
      saveWorkUnitIndex(bundleDir, index);
      const queue = loadQueue(bundleDir);
      queue.delegated_in_flight[successor.queue_item_id].queue_item_snapshot_hash = snapshotHash;
      saveQueue(bundleDir, queue);

      assert.throws(
        () => resolveWorkUnitSupersessionLineage(bundleDir, { predecessorWorkId: record.work_id }),
        /retry lineage cycle/,
      );
      assert.throws(
        () => evaluateNormalizedSubmittedWorkUnitLedger(bundleDir),
        /retry lineage cycle/,
      );
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('fails closed on a sibling lineage claim not named by the immutable relation', () => {
    const bundleDir = tempWorkUnitBundle('wu-supersede-branch-');
    try {
      const { record } = claimAndSubmitWorkUnit(bundleDir);
      const resultPath = path.join(bundleDir, record.paths.result_ref);
      const drifted = JSON.parse(readFileSync(resultPath, 'utf8'));
      drifted.summary = 'drifted';
      writeFileSync(resultPath, `${JSON.stringify(drifted, null, 2)}\n`);
      const superseded = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'result drift',
      });
      assert.equal(superseded.ok, true);
      const queue = loadQueue(bundleDir);
      const child = queue.active_window.find((item) => item.queue_item_id === superseded.relation.successor_queue_item_id);
      const sibling = {
        ...child,
        queue_item_id: `${child.queue_item_id}-sibling`,
        created_at: undefined,
        updated_at: undefined,
      };
      saveQueue(bundleDir, enqueue(queue, sibling));

      assert.throws(
        () => resolveWorkUnitSupersessionLineage(bundleDir, { predecessorWorkId: record.work_id }),
        /exactly one direct successor/,
      );
      assert.throws(
        () => evaluateNormalizedSubmittedWorkUnitLedger(bundleDir),
        /exactly one direct successor/,
      );
      const replay = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'must not choose a sibling',
      });
      assert.equal(replay.ok, false);
      assert.equal(replay.reason_code, 'supersession_integrity_invalid');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });
});


describe('work-unit recovery chain feedback (CHI-004)', () => {
  it('busy contention feedback carries wait + rerun and releases to a normal submit', () => {
    const bundleDir = tempWorkUnitBundle('wu-chain-busy-');
    try {
      const { record } = claimAndSubmitWorkUnit(bundleDir);
      // Hold the global transaction pair like a live contender: valid lock owner + started v2 journal.
      const txId = `tx-${Date.now()}`;
      const journalRef = `_work_units/_transactions/${txId}.json`;
      const target = 'authority.json';
      writeFileSync(path.join(bundleDir, target), 'before\n');
      const beforeSha256 = createHash('sha256').update('before\n').digest('hex');
      const started = WorkUnitTransactionV2JournalSchema.parse({
        schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
        tx_id: txId,
        operation: 'submit_work_unit',
        journal_ref: journalRef,
        target_work_ids: [record.work_id],
        target_queue_item_ids: [record.queue_item_id],
        mutation_manifest: { targets: [{ path: target, before_exists: true, before_sha256: beforeSha256 }] },
        status: 'started',
        started_at: new Date().toISOString(),
        settled_at: null,
        error: null,
      });
      mkdirSync(path.dirname(path.join(bundleDir, journalRef)), { recursive: true });
      writeFileSync(path.join(bundleDir, journalRef), `${JSON.stringify(started, null, 2)}\n`);
      mkdirSync(path.dirname(transactionLockOwnerPath(bundleDir)), { recursive: true });
      writeFileSync(transactionLockOwnerPath(bundleDir), JSON.stringify({
        schema_version: 'work-unit.transaction-lock.v1',
        tx_id: txId,
        operation: 'submit_work_unit',
        journal_ref: journalRef,
        target_work_ids: [record.work_id],
        target_queue_item_ids: [record.queue_item_id],
        acquired_at: new Date().toISOString(),
      }));

      const busy = inspectWorkUnitTransaction(bundleDir, {
        operation: 'submit_work_unit',
        targetWorkIds: [record.work_id],
        targetQueueItemIds: [record.queue_item_id],
      });
      assert.equal(busy.disposition, 'busy');
      assert.equal(busy.repair_kind, 'wait');
      assert.equal(busy.targets_same_attempt, true);
      assert.ok(busy.next, 'busy projection must carry next');
      assert.equal(busy.next.repair_kind, 'wait');
      assert.ok(busy.next.rerun && busy.next.rerun.length > 0, 'busy next must carry the rerun coordinate');

      // Release the pair: rerunning the same checkpoint now observes no transaction.
      rmSync(path.join(bundleDir, journalRef));
      rmSync(path.dirname(transactionLockOwnerPath(bundleDir)), { recursive: true, force: true });
      const released = inspectWorkUnitTransaction(bundleDir, {
        operation: 'submit_work_unit',
        targetWorkIds: [record.work_id],
        targetQueueItemIds: [record.queue_item_id],
      });
      assert.equal(released.disposition, 'none');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('suspect transaction recovery returns next and replays idempotently', () => {
    const bundleDir = tempWorkUnitBundle('wu-chain-suspect-');
    try {
      const { record } = claimAndSubmitWorkUnit(bundleDir);
      const txId = `tx-${Date.now()}`;
      const journalRef = `_work_units/_transactions/${txId}.json`;
      const target = 'authority.json';
      writeFileSync(path.join(bundleDir, target), 'before\n');
      const beforeSha256 = createHash('sha256').update('before\n').digest('hex');
      const started = WorkUnitTransactionV2JournalSchema.parse({
        schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
        tx_id: txId,
        operation: 'submit_work_unit',
        journal_ref: journalRef,
        target_work_ids: [record.work_id],
        target_queue_item_ids: [record.queue_item_id],
        mutation_manifest: { targets: [{ path: target, before_exists: true, before_sha256: beforeSha256 }] },
        status: 'started',
        started_at: new Date().toISOString(),
        settled_at: null,
        error: null,
      });
      mkdirSync(path.dirname(path.join(bundleDir, journalRef)), { recursive: true });
      writeFileSync(path.join(bundleDir, journalRef), `${JSON.stringify(started, null, 2)}\n`);

      const recovered = recoverWorkUnitTransaction(bundleDir, { tx_id: txId });
      assert.equal(recovered.ok, true);
      assert.equal(recovered.disposition, 'rolled_back');
      assert.ok(recovered.next, 'recover result must carry next (not a dead end)');
      assert.equal(recovered.next.repair_kind, 'recover-transaction');
      assert.ok(recovered.next.rerun && recovered.next.rerun.includes('recover-transaction'), 'recover next must name the same recovery checkpoint');

      const replay = recoverWorkUnitTransaction(bundleDir, { tx_id: txId });
      assert.equal(replay.ok, true);
      assert.equal(replay.idempotent, true);
      assert.ok(replay.next, 'idempotent replay must also carry next');
      assert.equal(replay.next.repair_kind, 'recover-transaction');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });
});
