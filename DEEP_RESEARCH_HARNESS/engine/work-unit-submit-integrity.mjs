// @impl DEW-023, CHI-004
// Shared read-only submit-owned integrity preflight. It intentionally contains no Phase Gate rules.

import path from 'node:path';

import { inspectWorkUnitTransaction } from './work-unit-transaction.mjs';
import { loadCurrentSubmittedLedgerFact } from './work-unit-submitted-ledger.mjs';
import { readWorkUnitLedgerRows } from './work-unit-utils.mjs';
import { readAndValidateBeacon, readAndValidateManifest } from './work-unit-validation.mjs';
import { classifyCompleteCurrentWorkUnitProfile } from './work-unit-current-profile.mjs';
import { loadQueueReadOnly } from './queue-manager-lifecycle.mjs';
import { queueItemSnapshotHash } from './queue-manager-core.mjs';
import { WORK_UNIT_REPAIR_KIND } from './work-unit-repair-vocabulary.mjs';
import { CLI_OPERATE_WORK_UNIT } from './work-unit-constants.mjs';

// submit-integrity rerun builder: the submit / late-submit command (the
// submit-owned preflight surface). Distinct from the dry-submit rerun builder
// in work-unit-attempt-disposition.mjs; both share CLI_OPERATE_WORK_UNIT.
function submitRerun(bundleDir, record, resultPath, operation) {
  const command = operation === 'late_submit_work_unit' ? 'late-submit' : 'submit';
  return `node ${CLI_OPERATE_WORK_UNIT} ${command} ${JSON.stringify(path.resolve(bundleDir))} --work-id ${JSON.stringify(record.work_id)} --result ${JSON.stringify(path.resolve(resultPath || path.join(bundleDir, record.paths.result_ref)))}`;
}

function root(code, missingFact, repairKind, writeTo, rerun) {
  return {
    code,
    repair_kind: repairKind,
    missing_fact: missingFact,
    write_to: writeTo,
    rerun,
  };
}

export function evaluateWorkUnitSubmitIntegrity(bundleDir, {
  index,
  record,
  resultPath = null,
  operation = 'submit_work_unit',
  currentTxId = null,
} = {}) {
  const rerun = submitRerun(bundleDir, record, resultPath, operation);
  const profile = classifyCompleteCurrentWorkUnitProfile(bundleDir, record);
  if (!profile.ok) {
    const selectedPrimary = root(
      profile.reason_code,
      `unsupported current work-unit contract for ${record.work_id}: ${profile.unsupported_discriminator}`,
      WORK_UNIT_REPAIR_KIND.missingContract,
      null,
      rerun,
    );
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      submit_owned_only: true,
      gate_evaluated: false,
      transaction: null,
      ledger: { disposition: 'not_evaluated', row_count: 0 },
      queue: { disposition: 'not_evaluated', location: null },
      roots: [selectedPrimary],
      selected_primary: selectedPrimary,
    };
  }
  const transaction = inspectWorkUnitTransaction(bundleDir, {
    operation,
    targetWorkIds: [record.work_id],
    targetQueueItemIds: [record.queue_item_id],
    rerun,
    ignoreHeldTxId: currentTxId,
  });
  const roots = [];
  if (transaction.disposition !== 'none') {
    roots.push(root(
      transaction.disposition,
      transaction.missing_fact || `global work-unit transaction ${transaction.holder?.tx_id || '<unknown>'} blocks submit`,
      transaction.repair_kind,
      transaction.write_to,
      transaction.rerun,
    ));
  }

  let manifest = null;
  try {
    manifest = readAndValidateManifest(bundleDir, index, record);
    readAndValidateBeacon(bundleDir, record, manifest);
  } catch (error) {
    roots.push(root(
      'attempt_binding_invalid',
      error.message || String(error),
      WORK_UNIT_REPAIR_KIND.missingContract,
      null,
      rerun,
    ));
  }

  let ledgerRows = [];
  try {
    ledgerRows = readWorkUnitLedgerRows(bundleDir);
  } catch (error) {
    roots.push(root('submitted_ledger_invalid', error.message || String(error), WORK_UNIT_REPAIR_KIND.missingContract, null, rerun));
  }
  const targetRows = ledgerRows.filter((row) => row.work_id === record.work_id);
  let ledger = { disposition: 'absent', row_count: targetRows.length };
  if (record.status === 'submitted') {
    try {
      const fact = loadCurrentSubmittedLedgerFact(bundleDir, record, { ledgerRows });
      ledger = {
        disposition: 'current',
        row_count: 1,
        result_hash: fact.result_hash,
        ledger_record_hash: fact.ledger_record_hash,
      };
    } catch (error) {
      ledger = { disposition: 'unresolved', row_count: targetRows.length };
      roots.push(root(
        error.reason_code || 'submitted_integrity_invalid',
        error.message || String(error),
        error.reason_code === 'submitted_declaration_missing' ? WORK_UNIT_REPAIR_KIND.recoverDeclaration : WORK_UNIT_REPAIR_KIND.missingContract,
        error.reason_code === 'submitted_declaration_missing' ? 'rb_output_declarations.jsonl' : null,
        rerun,
      ));
    }
  } else if (targetRows.length > 0) {
    roots.push(root(
      'unexpected_submitted_declaration',
      `non-submitted attempt ${record.work_id} already has ${targetRows.length} declaration row(s)`,
      WORK_UNIT_REPAIR_KIND.missingContract,
      null,
      rerun,
    ));
  }

  let queue = { disposition: 'unknown', location: null };
  try {
    const queueState = loadQueueReadOnly(bundleDir);
    const inFlight = queueState.delegated_in_flight?.[record.queue_item_id];
    const terminals = (queueState.terminal_history || []).filter((entry) => (
      entry.queue_item_id === record.queue_item_id && entry.work_id === record.work_id
    ));
    if (record.status === 'claimed') {
      if (!inFlight || inFlight.work_id !== record.work_id) {
        throw new Error(`queue in-flight binding missing for ${record.work_id}`);
      }
      if (manifest && queueItemSnapshotHash(manifest.queue_item) !== record.queue_item_snapshot_hash) {
        throw new Error(`queue snapshot binding mismatch for ${record.work_id}`);
      }
      queue = { disposition: 'in_flight', location: 'delegated_in_flight' };
    } else if (record.status === 'submitted') {
      const done = terminals.filter((entry) => entry.terminal_status === 'done');
      if (inFlight || terminals.length !== 1 || done.length !== 1) {
        throw new Error(`submitted queue authority must contain exactly one terminal done row for ${record.work_id}`);
      }
      queue = { disposition: 'terminal_done', location: 'terminal_history' };
    } else {
      queue = { disposition: 'terminal_or_retry', location: null };
    }
  } catch (error) {
    roots.push(root('queue_binding_invalid', error.message || String(error), WORK_UNIT_REPAIR_KIND.missingContract, null, rerun));
  }

  return {
    ok: roots.length === 0,
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    submit_owned_only: true,
    gate_evaluated: false,
    transaction,
    ledger,
    queue,
    roots,
    selected_primary: roots[0] || null,
  };
}
