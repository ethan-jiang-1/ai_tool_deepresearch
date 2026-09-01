// @impl DEW-022, CHI-004
// Read-only projection of one attempt's identity, transaction, coverage, and nearest legal action.

import path from 'node:path';

import { inspectWorkUnitTransaction } from './work-unit-transaction.mjs';
import { loadCurrentSubmittedLedgerFact } from './work-unit-submitted-ledger.mjs';
import {
  evaluateWorkUnitSupersessionEligibility,
  resolveWorkUnitSupersessionLineage,
} from './work-unit-supersession.mjs';
import { classifyCompleteCurrentWorkUnitProfile } from './work-unit-current-profile.mjs';
import { WORK_UNIT_RECOVERY_ACTION, WORK_UNIT_REPAIR_KIND, WORK_UNIT_ATTEMPT_DISPOSITION } from './work-unit-repair-vocabulary.mjs';
import { CLI_OPERATE_WORK_UNIT } from './work-unit-constants.mjs';

// attempt-disposition rerun builder: the dry-submit command (predictive,
// read-only). Distinct from the submit/late-submit rerun builder in
// work-unit-submit-integrity.mjs; both share CLI_OPERATE_WORK_UNIT.
function submitRerun(bundleDir, record) {
  return `node ${CLI_OPERATE_WORK_UNIT} dry-submit ${JSON.stringify(path.resolve(bundleDir))} --work-id ${JSON.stringify(record.work_id)} --result ${JSON.stringify(path.join(path.resolve(bundleDir), record.paths.result_ref))}`;
}

export function projectWorkUnitAttemptDisposition(bundleDir, record, {
  operation = 'submit_work_unit',
  rerun = null,
} = {}) {
  const profile = classifyCompleteCurrentWorkUnitProfile(bundleDir, record);
  const identity = {
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    receipt_nonce: record.receipt_nonce,
    result_ref: record.paths.result_ref,
    result_path: path.join(path.resolve(bundleDir), record.paths.result_ref),
    runtime_receipt_ref: record.paths.runtime_receipt_ref,
    runtime_receipt_path: path.join(path.resolve(bundleDir), record.paths.runtime_receipt_ref),
    physical_actor_authenticated: false,
    liveness_proven: false,
  };
  if (!profile.ok) {
    const missingFact = `unsupported current work-unit contract for ${record.work_id}: ${profile.unsupported_discriminator}`;
    return {
      identity,
      transaction: null,
      coverage: {
        disposition: WORK_UNIT_ATTEMPT_DISPOSITION.unsupportedCurrentContract,
        ledger_record_hash: null,
        supersession_relation: null,
        root_code: profile.reason_code,
        missing_fact: missingFact,
      },
      next: {
        recovery_action: WORK_UNIT_RECOVERY_ACTION.missingContract,
        missing_fact: missingFact,
        write_to: null,
        rerun: rerun || submitRerun(bundleDir, record),
      },
    };
  }
  const logicalActorClass = record.actor_execution.execution_actor_class;
  identity.execution_actor_class = logicalActorClass;
  identity.delegated_role_key = record.actor_execution.delegated_role_key;
  const transaction = inspectWorkUnitTransaction(bundleDir, {
    operation,
    targetWorkIds: [record.work_id],
    targetQueueItemIds: [record.queue_item_id],
    rerun: rerun || submitRerun(bundleDir, record),
  });

  let coverage = { disposition: WORK_UNIT_ATTEMPT_DISPOSITION.notSubmitted, ledger_record_hash: null, supersession_relation: null };
  let submittedRecovery = null;
  if (record.status === 'submitted') {
    if (record.supersession_relation) {
      try {
        const lineage = resolveWorkUnitSupersessionLineage(bundleDir, { predecessorWorkId: record.work_id });
        coverage = {
          disposition: WORK_UNIT_ATTEMPT_DISPOSITION.historical,
          ledger_record_hash: record.supersession_relation.accepted_ledger_record_hash,
          supersession_relation: record.supersession_relation,
          current_lineage_leaf: lineage.leaf,
        };
      } catch (error) {
        coverage = {
          disposition: WORK_UNIT_ATTEMPT_DISPOSITION.unresolved,
          ledger_record_hash: null,
          supersession_relation: record.supersession_relation,
          root_code: 'supersession_integrity_invalid',
          missing_fact: error.message || String(error),
        };
      }
    } else {
      try {
        const submitted = loadCurrentSubmittedLedgerFact(bundleDir, record);
        submittedRecovery = evaluateWorkUnitSupersessionEligibility(bundleDir, { work_id: record.work_id });
        coverage = submittedRecovery.eligible || ![WORK_UNIT_REPAIR_KIND.semanticBoundary].includes(submittedRecovery.reason_code)
          ? {
              disposition: WORK_UNIT_ATTEMPT_DISPOSITION.unresolved,
              ledger_record_hash: submitted.ledger_record_hash,
              supersession_relation: null,
              root_code: submittedRecovery.root_code || submittedRecovery.reason_code,
              missing_fact: submittedRecovery.missing_fact || null,
            }
          : {
              disposition: WORK_UNIT_ATTEMPT_DISPOSITION.current,
              ledger_record_hash: submitted.ledger_record_hash,
              supersession_relation: null,
            };
      } catch (error) {
        submittedRecovery = evaluateWorkUnitSupersessionEligibility(bundleDir, { work_id: record.work_id });
        coverage = {
          disposition: WORK_UNIT_ATTEMPT_DISPOSITION.unresolved,
          ledger_record_hash: null,
          supersession_relation: null,
          root_code: error.reason_code || 'submitted_integrity_invalid',
          missing_fact: error.message || String(error),
        };
      }
    }
  }

  let next;
  if (transaction.disposition !== 'none') {
    next = {
      recovery_action: transaction.recovery_action || transaction.repair_kind,
      missing_fact: transaction.missing_fact,
      write_to: transaction.write_to,
      rerun: transaction.rerun,
    };
  } else if (record.status === 'claimed' && logicalActorClass === 'delegated_subagent') {
    next = {
      recovery_action: WORK_UNIT_RECOVERY_ACTION.waitForDelegatedCandidate,
      missing_fact: 'The selected delegated actor route owns candidate authoring for this exact attempt.',
      write_to: null,
      rerun: rerun || submitRerun(bundleDir, record),
    };
  } else if (record.status === 'claimed') {
    next = {
      recovery_action: WORK_UNIT_RECOVERY_ACTION.authorExactFallbackAttempt,
      missing_fact: 'The Phase Agent fallback route may author only this exact attempt binding.',
      write_to: identity.result_path,
      rerun: rerun || submitRerun(bundleDir, record),
    };
  } else if (coverage.disposition === 'current') {
    next = {
      recovery_action: WORK_UNIT_RECOVERY_ACTION.semanticBoundary,
      missing_fact: 'The submitted attempt remains current; richer late content alone does not authorize deterministic replacement.',
      write_to: null,
      rerun: rerun || submitRerun(bundleDir, record),
    };
  } else if (coverage.disposition === 'historical') {
    const leaf = coverage.current_lineage_leaf;
    const repairKind = ['active_window', 'refill_pool'].includes(leaf.queue_location)
      ? WORK_UNIT_REPAIR_KIND.claimSuccessor
      : leaf.queue_location === 'delegated_in_flight'
        ? WORK_UNIT_REPAIR_KIND.waitForDelegatedCandidate
        : WORK_UNIT_REPAIR_KIND.inspectCurrentLineageLeaf;
    next = {
      repair_kind: repairKind,
      missing_fact: `Submitted predecessor ${record.work_id} is historical; continue only from current lineage leaf ${leaf.queue_item_id}.`,
      write_to: null,
      rerun: rerun || submitRerun(bundleDir, record),
      current_lineage_leaf: leaf,
    };
  } else if (submittedRecovery?.reason_code === 'declaration_recovery_required') {
    next = {
      repair_kind: submittedRecovery.repair_kind,
      missing_fact: submittedRecovery.missing_fact,
      write_to: submittedRecovery.write_to,
      rerun: submittedRecovery.rerun,
    };
  } else if (submittedRecovery?.eligible) {
    next = {
      recovery_action: WORK_UNIT_RECOVERY_ACTION.supersede,
      missing_fact: `Submitted attempt ${record.work_id} has supersession-eligible ${submittedRecovery.root_code}.`,
      write_to: null,
      rerun: submittedRecovery.rerun,
    };
  } else {
    next = {
      recovery_action: submittedRecovery?.recovery_action || submittedRecovery?.repair_kind || WORK_UNIT_RECOVERY_ACTION.missingContract,
      missing_fact: submittedRecovery?.missing_fact || coverage.missing_fact || `No direct recovery action is established for ${record.status}.`,
      write_to: submittedRecovery?.write_to || null,
      rerun: submittedRecovery?.rerun || rerun || submitRerun(bundleDir, record),
    };
  }

  if (next) {
    const action = next.recovery_action || next.repair_kind;
    next.recovery_action = action;
    next.repair_kind = action;
  }

  return { identity, transaction, coverage, next };
}
