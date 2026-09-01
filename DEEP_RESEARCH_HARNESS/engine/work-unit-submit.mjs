// @impl DEW-005, DEW-013, DEW-023, DEW-024, CHI-004, FRE-005, EXO-001
// Work-unit submit and dry-submit preflight: validation planning, durability, ledger row building, rejection, prepare and submit.

// Navigation: public API — reasonCodeForSubmit, drySubmitWorkUnit, lateSubmitWorkUnit, recoverWorkUnitDeclaration, inspectWorkUnitDeclarationRecovery, submitWorkUnit

import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {
  WORK_UNIT_OUTPUT_LEDGER,
  WORK_UNIT_INDEX_TARGET,
  QUEUE_TARGET,
} from './work-unit-constants.mjs';
import {
  queuePath,
  queueItemSnapshotHash,
  queueStateFromFile,
} from './queue-manager-core.mjs';
import {
  now,
  clone,
  writeJson,
  hashValue,
  ledgerPath,
  appendLedgerRow,
  traceWorkUnitEvent,
  recordSubmitNormalization,
  isPathInsideDir,
  findSubmittedLedgerRow,
  computeWorkUnitLedgerRecordHash,
  readWorkUnitLedgerRows,
} from './work-unit-utils.mjs';
import {
  loadWorkUnitIndex,
  saveWorkUnitIndex,
  requireWorkUnitRecord,
  withWorkUnitTransaction,
  transactionDir,
  workUnitIndexPath,
} from './work-unit-index.mjs';
import {
  readAndValidateManifest,
  readAndValidateBeacon,
  readAndValidateResult,
  validateSubmitRuntimeReceipt,
  validateOutputFiles,
  validateCacheTrails,
  validateSourceClaims,
  validateQueueBindingForSubmit,
  validateManifestTopicBinding,
  assertCompleteCurrentWorkUnitProfile,
} from './work-unit-validation.mjs';
import { evaluateDirectOutputTarget, semanticOrderedArrayDigest } from './helpers/direct-output-contract.mjs';
import { deriveWorkUnitCandidateProjection } from './work-unit-candidate-projection.mjs';
import {
  acceptedLedgerRecordHashFor,
  loadCurrentSubmittedLedgerFact,
  readSubmittedLedgerDocument,
  readSubmittedStatusFile,
  validateCurrentSubmittedLedgerFact,
} from './work-unit-submitted-ledger.mjs';
import {
  SourceContributionSchema,
  WorkUnitLedgerRecordSchema,
  WorkUnitStatusFileSchema,
  WorkUnitSubmissionV1StatusFileSchema,
} from '../schema/contracts/work-unit.mjs';
import { WorkUnitTransactionV2JournalSchema } from '../schema/contracts/work-unit-transaction.mjs';
import { loadQueue, saveQueue } from './queue-manager-lifecycle.mjs';
import { refill } from './queue-manager-window.mjs';
import { logToRun } from './logger.mjs';
import { projectWorkUnitAttemptDisposition } from './work-unit-attempt-disposition.mjs';
import { evaluateWorkUnitSubmitIntegrity } from './work-unit-submit-integrity.mjs';
import {
  captureSubmitSnapshot,
  restoreSubmitSnapshot,
  writeSubmittedStatusAndHashes,
  verifySubmitDurablePostcondition,
  buildSubmitDurabilityFailure,
  readQueueSideEffectFree,
  buildLedgerRow,
} from './work-unit-submit-snapshot.mjs';

export function formalSubmitRerun(bundleDir, workId, resultPath, { late = false, reason = null } = {}) {
  return [
    'node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs',
    late ? 'late-submit' : 'submit',
    JSON.stringify(path.resolve(bundleDir)),
    '--work-id', JSON.stringify(workId),
    '--result', JSON.stringify(path.resolve(resultPath)),
    ...(late ? ['--reason', JSON.stringify(reason)] : []),
  ].join(' ');
}

export function requireDirectOutputs(bundleDir, manifest) {
  const evaluations = new Map();
  for (const required of manifest.output_contract.required_outputs || []) {
    const evaluated = evaluateDirectOutputTarget({
      bundleDir,
      target: required.path,
      contractId: required.direct_contract,
    });
    if (!evaluated.passed) {
      const directRoot = evaluated.roots[0];
      const error = new Error(`${directRoot.coordinate}: ${directRoot.expected} ${directRoot.observed}`);
      error.repair_contract = {
        code: directRoot.code,
        repair_kind: directRoot.root_class === 'semantic_content' ? 'agent_action' : 'missing_contract',
        write_to: path.join(path.resolve(bundleDir), directRoot.coordinate),
        details: directRoot,
      };
      throw error;
    }
    evaluations.set(required.path, { required, evaluated });
  }
  return evaluations;
}

export function deriveSourceContribution(record, manifest, result, directOutputEvaluations) {
  if (record.wave !== 0 || record.kind !== 'wave0_source_intake' || !record.assignment_contract_version) return null;
  const sourceRequirements = (manifest.output_contract.required_outputs || []).filter((required) => (
    required.role === 'source_yaml' && required.direct_contract === 'wave0.source-metadata-array.v1'
  ));
  if (sourceRequirements.length === 0) return null;
  if (sourceRequirements.length !== 1) {
    throw new Error(`current Wave0 source intake requires exactly one source_yaml direct-output tuple for ${record.work_id}`);
  }
  const [required] = sourceRequirements;
  const evaluated = directOutputEvaluations.get(required.path)?.evaluated;
  if (!evaluated?.passed || !Array.isArray(evaluated.validated_value)) {
    throw new Error(`current Wave0 source intake lacks one validated source-array snapshot for ${record.work_id}`);
  }
  const matchingOutputs = (result.output_files || []).filter((output) => (
    output.path === required.path && output.role === 'source_yaml'
  ));
  if (matchingOutputs.length !== 1) {
    throw new Error(`current Wave0 source intake result lacks exactly one declared source_yaml output for ${record.work_id}`);
  }
  return SourceContributionSchema.parse({
    target: required.path,
    direct_contract: required.direct_contract,
    validated_length: evaluated.validated_value.length,
    semantic_digest: semanticOrderedArrayDigest(evaluated.validated_value),
  });
}

export function reasonCodeForSubmit(message) {
  if (/unsupported current work-unit contract/i.test(message)) return 'unsupported_current_contract';
  if (/work-unit topic binding|canonical topic plan/i.test(message)) return 'topic_binding_invalid';
  if (/runtime receipt|lifecycle events/i.test(message)) return 'missing_receipt';
  if (/receipt_nonce|nonce|receipt mismatch/i.test(message)) return 'nonce_mismatch';
  if (/result\/index mismatch.*work_id|Unknown work_id|work_id/i.test(message)) return 'wrong_work_id';
  if (/output_files|declared output file/i.test(message)) return 'missing_output';
  if (/cache_trails|cache trail|degraded_capture_ref|cache\/degraded ref/i.test(message)) return 'missing_cache';
  if (/snapshot hash|stale/i.test(message)) return 'stale_snapshot';
  if (/duplicate submit/i.test(message)) return 'duplicate_content_mismatch';
  return 'invalid_result';
}

function submitRejectionPayload(record, reason, resultPath) {
  return {
    rejected_at: now(),
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    status: record.status,
    reason,
    reason_code: reasonCodeForSubmit(reason),
    result_path: resultPath ? path.resolve(resultPath) : null,
  };
}

function rejectionGuidance(violations = [], selectedPrimary = null) {
  const primary = selectedPrimary || null;
  return {
    violations,
    selected_primary: primary,
    ...(primary ? {
      repair_kind: primary.repair_kind,
      missing_fact: primary.missing_fact,
      write_to: primary.write_to,
      rerun: primary.rerun,
    } : {}),
  };
}

function recordSubmitRejection(bundleDir, {
  work_id,
  resultPath,
  reason,
  violations = [],
  candidateProjection = null,
  selectedPrimary = null,
  transactionHooks = null,
}) {
  const guidance = rejectionGuidance(violations, selectedPrimary);
  const projection = candidateProjection ? {
    recommended_action: candidateProjection.recommended_action,
    primary_root_code: candidateProjection.primary_root_code,
  } : {};
  let index;
  let record;
  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
    record = requireWorkUnitRecord(index, work_id);
  } catch {
    return {
      ok: false,
      work_id,
      status: 'unknown',
      reason,
      reason_code: reasonCodeForSubmit(reason),
      inspect: [reason],
      advice: 'Use the reported work-unit owner boundary, then rerun dry-submit for the same candidate.',
      ...guidance,
      ...projection,
    };
  }

  if (['failed', 'timed_out', 'abandoned'].includes(record.status)) {
    const rejected = submitRejectionPayload(record, `late submit rejected for terminal status ${record.status}: ${reason}`, resultPath);
    traceWorkUnitEvent(bundleDir, 'work_unit_late_submit_rejected', {
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      terminal_status: record.status,
      terminal_reason: record.terminal_reason || null,
      reason_code: rejected.reason_code,
    });
    logToRun(bundleDir, 'warn', 'work_unit_late_submit_rejected', {
      kind: 'work_unit_submit',
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      terminal_status: record.status,
      terminal_reason: record.terminal_reason || null,
      runtime_refs: record.runtime_refs || {},
    });
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      last_submit_rejection: rejected,
      attempt_disposition: projectWorkUnitAttemptDisposition(bundleDir, record, {
        operation: 'submit_work_unit',
        rerun: drySubmitRerun(bundleDir, record.work_id, resultPath),
      }),
      inspect: [rejected.reason],
      advice: 'Terminal work-unit attempts cannot be submitted; follow the reported owner boundary rather than editing authority files.',
      ...guidance,
      ...projection,
    };
  }

  if (record.status !== 'claimed') {
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: record.status,
      reason,
      reason_code: reasonCodeForSubmit(reason),
      attempt_disposition: projectWorkUnitAttemptDisposition(bundleDir, record, {
        operation: 'submit_work_unit',
        rerun: drySubmitRerun(bundleDir, record.work_id, resultPath),
      }),
      inspect: [reason],
      advice: 'Submit is only accepted for claimed attempts; use the reported owner boundary and re-run dry-submit when the attempt is claim-eligible.',
      ...guidance,
      ...projection,
    };
  }

  return withWorkUnitTransaction(bundleDir, 'reject_work_unit_submit', {
    targetWorkIds: [record.work_id],
    targetQueueItemIds: [record.queue_item_id],
    mutationTargets: [WORK_UNIT_INDEX_TARGET, record.paths.status_ref],
    rerun: drySubmitRerun(bundleDir, record.work_id, resultPath),
    hooks: transactionHooks,
  }, ({ tx_id }) => {
    const rejection = submitRejectionPayload(record, reason, resultPath);
    record.last_submit_rejection = rejection;
    index.work_units[record.work_id] = record;
    writeJson(path.join(bundleDir, record.paths.status_ref), WorkUnitStatusFileSchema.parse({
      work_id: record.work_id,
      status: 'claimed',
      last_submit_rejection: rejection,
      updated_at: rejection.rejected_at,
    }));
    const savedIndex = saveWorkUnitIndex(bundleDir, index);
    traceWorkUnitEvent(bundleDir, 'work_unit_submit_rejected', {
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      kind: record.kind,
      receipt_nonce: record.receipt_nonce,
      reason_code: rejection.reason_code,
    });
    logToRun(bundleDir, 'warn', 'work_unit_submit_rejected', {
      kind: 'work_unit_submit',
      tx_id,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      reason_code: rejection.reason_code,
      reason,
    });
    return {
      ok: false,
      work_id: record.work_id,
      queue_item_id: record.queue_item_id,
      status: 'claimed',
      last_submit_rejection: rejection,
      attempt_disposition: projectWorkUnitAttemptDisposition(bundleDir, record, {
        operation: 'submit_work_unit',
        rerun: drySubmitRerun(bundleDir, record.work_id, resultPath),
      }),
      inspect: [reason],
      advice: 'Repair the same candidate through the reported coordinates and rerun the exact dry-submit checkpoint before formal submit.',
      index: savedIndex,
      ...guidance,
      ...projection,
    };
  });
}

function jsonPointer(pathParts = []) {
  if (!Array.isArray(pathParts) || pathParts.length === 0) return '/';
  return `/${pathParts.map((part) => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
}

export function drySubmitRerun(bundleDir, workId, resultPath) {
  return [
    'node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs dry-submit',
    JSON.stringify(path.resolve(bundleDir)),
    '--work-id', JSON.stringify(String(workId || '<work-id>')),
    '--result', JSON.stringify(resultPath ? path.resolve(resultPath) : '<result.json>'),
  ].join(' ');
}

function repairContractForPhase({ phase, bundleDir, record, resultPath, issuePath = [], receiptLine = null }) {
  const candidatePath = resultPath ? path.resolve(resultPath) : '<result.json>';
  if (phase === 'result') {
    const pointer = jsonPointer(issuePath);
    return { repair_kind: 'agent_action', write_to: `${candidatePath}#${pointer}`, json_pointer: pointer };
  }
  if (phase === 'runtime_receipt') {
    const receiptPath = record ? path.join(path.resolve(bundleDir), record.paths.runtime_receipt_ref) : 'assigned runtime-receipt.jsonl';
    return {
      repair_kind: 'agent_action',
      write_to: receiptLine ? `${receiptPath}#line=${receiptLine}` : receiptPath,
    };
  }
  if (phase === 'output_files') {
    return { repair_kind: 'agent_action', write_to: `${candidatePath}#/output_files` };
  }
  if (phase === 'cache_trails') {
    return { repair_kind: 'agent_action', write_to: `${candidatePath}#/cache_trails and the exact declared cache leaf under ${path.resolve(bundleDir)}` };
  }
  if (phase === 'source_claims') {
    return { repair_kind: 'agent_action', write_to: `${candidatePath}#/source_claims` };
  }
  return {
    repair_kind: 'missing_contract',
    write_to: `work-unit ${phase} authority boundary for ${record?.work_id || '<work-id>'}; use an existing Engine operation when available`,
  };
}

function violationForError(error, {
  phase = 'submit_validation',
  bundleDir,
  record = null,
  workId = record?.work_id,
  resultPath = null,
  validationIssue = null,
} = {}) {
  const message = error?.message || String(error);
  const issueMessage = validationIssue?.message || message;
  const ownerRepair = error?.repair_contract || {};
  const ownerPointer = ownerRepair.json_pointer || null;
  const repair = {
    ...repairContractForPhase({
      phase,
      bundleDir,
      record,
      resultPath,
      issuePath: validationIssue?.path || [],
      receiptLine: error?.receipt_line || null,
    }),
    ...ownerRepair,
  };
  if (ownerPointer && !ownerRepair.write_to) {
    repair.write_to = `${resultPath ? path.resolve(resultPath) : '<result.json>'}#${ownerPointer}`;
  }
  return {
    code: validationIssue?.code || ownerRepair.code || error?.reason_code || reasonCodeForSubmit(issueMessage),
    message: issueMessage,
    phase,
    repair_target: phase === 'source_claims' ? 'source_claims' : repairTargetForReason(issueMessage),
    repair_kind: repair.repair_kind,
    missing_fact: issueMessage,
    write_to: repair.write_to,
    rerun: drySubmitRerun(bundleDir, workId, resultPath),
    ...((repair.json_pointer || ownerPointer) ? { json_pointer: repair.json_pointer || ownerPointer } : {}),
    ...(repair.details ? { details: repair.details } : {}),
    ...(error?.candidate_scope_hint ? { scope_hint: error.candidate_scope_hint } : {}),
  };
}

function violationsForError(error, context) {
  if (Array.isArray(error?.validation_issues) && error.validation_issues.length > 0) {
    return error.validation_issues.map((validationIssue) => violationForError(error, { ...context, validationIssue }));
  }
  return [violationForError(error, context)];
}

function repairTargetForReason(message) {
  if (/runtime receipt|lifecycle events|receipt/i.test(message)) return 'runtime_receipt';
  if (/output_files|declared output file|role/i.test(message)) return 'output_files';
  if (/cache_trails|cache trail|degraded_capture_ref|cache\/degraded ref/i.test(message)) return 'cache_trails';
  if (/source_claims|accepted_source_urls|source claim/i.test(message)) return 'source_claims';
  if (/queue|snapshot hash|stale/i.test(message)) return 'queue_binding';
  if (/manifest|beacon/i.test(message)) return 'work_unit_envelope';
  if (/work_id|queue_item_id|kind|receipt_nonce|result/i.test(message)) return 'result';
  return 'candidate';
}

export function validateSubmitPlan(bundleDir, {
  work_id,
  resultPath,
  acceptedStatus = 'claimed',
  requireQueueInFlight = true,
} = {}) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  assertCompleteCurrentWorkUnitProfile(bundleDir, record);
  const normalizations = [];

  if (record.status === 'submitted' && acceptedStatus === 'claimed') {
    const replayManifest = readAndValidateManifest(bundleDir, index, record);
    const parsedResult = readAndValidateResult(bundleDir, resultPath, record, {
      normalizations,
      outputContract: replayManifest.output_contract,
    });
    const result = parsedResult;
    const resultHash = hashValue(result);
    const submitted = loadCurrentSubmittedLedgerFact(bundleDir, record);
    if (submitted.result_hash === resultHash) {
      return {
        duplicate: true,
        index,
        record,
        result,
        result_hash: resultHash,
        ledger_record_hash: submitted.ledger_record_hash,
        ledger_row: submitted.row,
        normalizations,
      };
    }
    throw new Error(`different-content duplicate submit rejected for ${record.work_id}`);
  }
  if (record.status !== acceptedStatus) {
    const verb = acceptedStatus === 'timed_out' ? 'late-submit requires timed_out' : 'submit requires claimed';
    throw new Error(`work_id ${record.work_id} is ${record.status}; ${verb}`);
  }

  const manifest = readAndValidateManifest(bundleDir, index, record);
  validateManifestTopicBinding(bundleDir, manifest);
  const result = readAndValidateResult(bundleDir, resultPath, record, {
    normalizations,
    outputContract: manifest.output_contract,
  });
  const normalizedResult = result;
  const resultHash = hashValue(normalizedResult);
  readAndValidateBeacon(bundleDir, record, manifest);
  const directOutputEvaluations = requireDirectOutputs(bundleDir, manifest);
  const runtimeReceipt = validateSubmitRuntimeReceipt(bundleDir, record, {
    normalizations,
  });
  const queue = requireQueueInFlight
    ? validateQueueBindingForSubmit(bundleDir, record, manifest, { sideEffects: false })
    : readQueueSideEffectFree(bundleDir);
  if (!requireQueueInFlight && queueItemSnapshotHash(manifest.queue_item) !== record.queue_item_snapshot_hash) {
    throw new Error(`manifest queue item snapshot hash is stale for ${record.work_id}`);
  }
  validateOutputFiles(bundleDir, normalizedResult, manifest.output_contract);
  const cacheValidation = validateCacheTrails(bundleDir, normalizedResult, manifest.cache_policy, {
    record,
    normalizations,
    writeCanonicalCache: false,
  });
  validateSourceClaims(bundleDir, normalizedResult, manifest.output_contract, {
    virtualCachePages: cacheValidation.virtualCachePages,
    manifest,
  });
  const sourceContribution = deriveSourceContribution(record, manifest, normalizedResult, directOutputEvaluations);
  return {
    duplicate: false,
    index,
    record,
    manifest,
    queue,
    result: normalizedResult,
    result_hash: resultHash,
    runtime_receipt_content: runtimeReceipt.canonical_content,
    normalizations,
    virtual_cache_pages: cacheValidation.virtualCachePages,
    source_contribution: sourceContribution,
  };
}

export function applyCandidateCanonicalizations(bundleDir, prepared) {
  for (const [trail, pageText] of prepared.virtual_cache_pages || new Map()) {
    writeFileSync(path.join(bundleDir, trail, 'page.md'), pageText);
  }
}

function prepareWorkUnitSubmit(bundleDir, { work_id, resultPath }) {
  const index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  const record = requireWorkUnitRecord(index, work_id);
  if (record.status === 'submitted') {
    return validateSubmitPlan(bundleDir, { work_id, resultPath });
  }
  const plan = collectDrySubmitPlan(bundleDir, { work_id, resultPath });
  if ((plan.violations || []).length > 0) {
    const error = new Error(plan.violations.map((violation) => violation.message).join('; '));
    error.candidate_plan = plan;
    throw error;
  }
  return plan;
}

function directOutputViolation(bundleDir, record, resultPath, directRoot) {
  return {
    code: directRoot.code,
    message: `${directRoot.expected} ${directRoot.observed}`,
    phase: 'direct_outputs',
    repair_target: 'output_files',
    repair_kind: directRoot.root_class === 'semantic_content' ? 'agent_action' : 'missing_contract',
    missing_fact: `${directRoot.coordinate}: ${directRoot.observed}`,
    write_to: path.join(path.resolve(bundleDir), directRoot.coordinate),
    rerun: drySubmitRerun(bundleDir, record.work_id, resultPath),
    root_class: directRoot.root_class,
    contract_id: directRoot.contract_id,
    coordinate: directRoot.coordinate,
    expected: directRoot.expected,
    observed: directRoot.observed,
  };
}

function finalizeCandidatePlan(plan) {
  const requiredOutputs = plan.manifest?.output_contract?.required_outputs || [];
  const workDone = Boolean(plan.runtime_receipt?.events?.some((event) => event.event === 'work_done'));
  const derived = deriveWorkUnitCandidateProjection({
    violations: plan.violations || [],
    workDone,
    requiredOutputs,
  });
  return {
    ...plan,
    violations: derived.violations,
    selected_primary: derived.selected_primary,
    candidate_projection: derived.projection,
  };
}

function collectDrySubmitPlan(bundleDir, { work_id, resultPath }) {
  const violations = [];
  let index = null;
  let record = null;
  let manifest = null;
  let result = null;
  let normalizedResult = null;
  let queue = null;
  let runtimeReceipt = null;
  const normalizations = [];
  let resultHash = null;
  let cacheValidation = { virtualCachePages: new Map() };
  let cacheValid = false;
  let beaconValid = false;
  const directOutputPasses = new Set();
  const directOutputEvaluations = new Map();

  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
  } catch (error) {
    violations.push(...violationsForError(error, { phase: 'work_unit_index', bundleDir, workId: work_id, resultPath }));
    return finalizeCandidatePlan({ index, record, violations, normalizations });
  }

  try {
    record = requireWorkUnitRecord(index, work_id);
  } catch (error) {
    violations.push(...violationsForError(error, { phase: 'work_unit_record', bundleDir, workId: work_id, resultPath }));
    return finalizeCandidatePlan({ index, record, violations, normalizations });
  }

  try {
    assertCompleteCurrentWorkUnitProfile(bundleDir, record);
  } catch (error) {
    violations.push(violationForError(error, {
      phase: 'work_unit_record', bundleDir, record, resultPath,
    }));
    return finalizeCandidatePlan({ index, record, violations, normalizations });
  }

  if (record.status === 'submitted') {
    violations.push(violationForError(
      new Error(`work_id ${record.work_id} is already submitted; dry-submit only preflights claimed attempts`),
      { phase: 'work_unit_status', bundleDir, record, resultPath },
    ));
    return finalizeCandidatePlan({ index, record, violations, normalizations });
  }

  if (record.status !== 'claimed') {
    violations.push(violationForError(
      new Error(`work_id ${record.work_id} is ${record.status}; submit requires claimed`),
      { phase: 'work_unit_status', bundleDir, record, resultPath },
    ));
    return finalizeCandidatePlan({ index, record, violations, normalizations });
  }


  try {
    manifest = readAndValidateManifest(bundleDir, index, record);
    validateManifestTopicBinding(bundleDir, manifest);
  } catch (error) {
    violations.push(...violationsForError(error, { phase: 'manifest', bundleDir, record, resultPath }));
  }

  try {
    result = readAndValidateResult(bundleDir, resultPath, record, {
      normalizations,
      outputContract: manifest?.output_contract || null,
    });
    normalizedResult = result;
    resultHash = hashValue(normalizedResult);
  } catch (error) {
    violations.push(...violationsForError(error, { phase: 'result', bundleDir, record, resultPath }));
  }

  if (manifest) {
    try {
      readAndValidateBeacon(bundleDir, record, manifest);
      beaconValid = true;
    } catch (error) {
      violations.push(...violationsForError(error, { phase: 'beacon', bundleDir, record, resultPath }));
    }

    try {
      queue = validateQueueBindingForSubmit(bundleDir, record, manifest, { sideEffects: false });
    } catch (error) {
      violations.push(...violationsForError(error, { phase: 'queue_binding', bundleDir, record, resultPath }));
    }
  }

  if (manifest && beaconValid) {
    for (const required of manifest.output_contract.required_outputs || []) {
      const evaluated = evaluateDirectOutputTarget({
        bundleDir,
        target: required.path,
        contractId: required.direct_contract,
      });
      if (evaluated.passed) {
        directOutputPasses.add(required.path);
        directOutputEvaluations.set(required.path, { required, evaluated });
      } else {
        violations.push(...evaluated.roots.map((directRoot) => directOutputViolation(bundleDir, record, resultPath, directRoot)));
      }
    }
  }

  try {
    runtimeReceipt = validateSubmitRuntimeReceipt(bundleDir, record, {
      normalizations,
    });
  } catch (error) {
    violations.push(...violationsForError(error, { phase: 'runtime_receipt', bundleDir, record, resultPath }));
  }

  if (manifest && normalizedResult) {
    try {
      validateOutputFiles(bundleDir, normalizedResult, manifest.output_contract);
    } catch (error) {
      const requiredPath = (manifest.output_contract.required_outputs || [])
        .find((required) => error.message.includes(required.path))?.path;
      if (requiredPath && directOutputPasses.has(requiredPath)
        && /missing required output path|must use canonical role|duplicate normalized path/i.test(error.message)) {
        error.candidate_scope_hint = 'mechanical';
      }
      if (/output_files\[\] is required/i.test(error.message)
        && (manifest.output_contract.required_outputs || []).length > 0
        && directOutputPasses.size === manifest.output_contract.required_outputs.length) {
        error.candidate_scope_hint = 'mechanical';
      }
      violations.push(...violationsForError(error, { phase: 'output_files', bundleDir, record, resultPath }));
    }

    try {
      cacheValidation = validateCacheTrails(bundleDir, normalizedResult, manifest.cache_policy, {
        record,
        normalizations,
        writeCanonicalCache: false,
      });
      cacheValid = true;
    } catch (error) {
      violations.push(...violationsForError(error, { phase: 'cache_trails', bundleDir, record, resultPath }));
    }

    if (cacheValid) {
      try {
        validateSourceClaims(bundleDir, normalizedResult, manifest.output_contract, {
          virtualCachePages: cacheValidation.virtualCachePages,
          manifest,
        });
      } catch (error) {
        violations.push(...violationsForError(error, { phase: 'source_claims', bundleDir, record, resultPath }));
      }
    }
  }

  let sourceContribution = null;
  if (manifest && normalizedResult && violations.length === 0) {
    try {
      sourceContribution = deriveSourceContribution(record, manifest, normalizedResult, directOutputEvaluations);
    } catch (error) {
      violations.push(...violationsForError(error, {
        phase: 'direct_outputs', bundleDir, record, resultPath,
      }));
    }
  }

  return finalizeCandidatePlan({
    index,
    record,
    manifest,
    queue,
    result: normalizedResult,
    result_hash: resultHash,
    runtime_receipt_content: runtimeReceipt?.canonical_content || null,
    runtime_receipt: runtimeReceipt,
    normalizations,
    virtual_cache_pages: cacheValidation.virtualCachePages,
    source_contribution: sourceContribution,
    violations,
  });
}

function publicNormalizations(normalizations) {
  return normalizations.map((item) => ({ ...item }));
}

export function drySubmitWorkUnit(bundleDir, { work_id, resultPath } = {}) {
  const plan = collectDrySubmitPlan(bundleDir, { work_id, resultPath });
  const submitIntegrity = plan.record
    ? evaluateWorkUnitSubmitIntegrity(bundleDir, {
        index: plan.index,
        record: plan.record,
        resultPath,
      })
    : null;
  const reasonCodes = [...new Set((plan.violations || []).map((item) => item.code))];
  const base = {
    ok: (plan.violations || []).length === 0 && (submitIntegrity?.ok ?? true),
    dry_run: true,
    side_effects: false,
    work_id: plan.record?.work_id || work_id,
    queue_item_id: plan.record?.queue_item_id || null,
    status: plan.record?.status || 'unknown',
    expected_submit: (plan.violations || []).length === 0 && (submitIntegrity?.ok ?? true) ? 'pass' : 'fail',
    reason_codes: [...new Set([...reasonCodes, ...(submitIntegrity?.roots || []).map((item) => item.code)])],
    violations: plan.violations || [],
    selected_primary: plan.selected_primary || null,
    recommended_action: plan.candidate_projection.recommended_action,
    primary_root_code: plan.candidate_projection.primary_root_code,
    normalizations: publicNormalizations(plan.normalizations || []),
    candidate_result_path: resultPath ? path.resolve(resultPath) : null,
    advice: (plan.violations || []).length === 0
      ? 'Dry-submit passed. Run formal operate-work-unit submit to persist ledger, queue, result, receipt, trace, and cache authority.'
      : 'Repair the reported candidate result, receipt, output, cache, source-claim, or queue-binding issues, then rerun dry-submit or formal submit.',
  };
  if (submitIntegrity) base.submit_integrity = submitIntegrity;
  if (plan.record) {
    base.attempt_disposition = projectWorkUnitAttemptDisposition(bundleDir, plan.record, {
      operation: 'submit_work_unit',
      rerun: drySubmitRerun(bundleDir, plan.record.work_id, resultPath),
    });
  }
  if (base.ok) {
    base.result_hash = plan.result_hash;
    base.virtual_cache_pages = [...(plan.virtual_cache_pages || new Map()).keys()];
  }
  return base;
}

export function submitWorkUnit(bundleDir, {
  work_id,
  resultPath,
  afterQueueSave = null,
  transactionHooks = null,
} = {}) {
  let prepared;
  try {
    prepared = prepareWorkUnitSubmit(bundleDir, { work_id, resultPath });
  } catch (error) {
    const preflight = error.candidate_plan || collectDrySubmitPlan(bundleDir, { work_id, resultPath });
    const unsupported = error.reason_code === 'unsupported_current_contract'
      || preflight.violations?.some((violation) => violation.code === 'unsupported_current_contract');
    if (unsupported) {
      return {
        ok: false,
        work_id: preflight.record?.work_id || work_id,
        queue_item_id: preflight.record?.queue_item_id || null,
        status: preflight.record?.status || 'unknown',
        reason_code: 'unsupported_current_contract',
        reason: error.message || String(error),
        inspect: [error.message || String(error)],
        advice: 'This attempt does not carry the complete current work-unit profile; create a new current attempt through the existing Engine workflow.',
        violations: preflight.violations || [],
        selected_primary: preflight.selected_primary || null,
      };
    }
    return recordSubmitRejection(bundleDir, {
      work_id,
      resultPath,
      reason: error.message || String(error),
      violations: preflight.violations || [],
      candidateProjection: preflight.candidate_projection || null,
      selectedPrimary: preflight.selected_primary || null,
      transactionHooks,
    });
  }
  if (prepared.duplicate) {
    return {
      ok: true,
      duplicate: true,
      work_id: prepared.record.work_id,
      queue_item_id: prepared.record.queue_item_id,
      status: 'submitted',
      result_hash: prepared.result_hash,
      ledger_record_hash: prepared.ledger_record_hash,
      normalizations: prepared.normalizations,
    };
  }

  const outerIntegrity = evaluateWorkUnitSubmitIntegrity(bundleDir, {
    index: prepared.index,
    record: prepared.record,
    resultPath,
  });
  if (!outerIntegrity.ok) {
    return {
      ok: false,
      work_id: prepared.record.work_id,
      queue_item_id: prepared.record.queue_item_id,
      reason_code: outerIntegrity.selected_primary.code,
      repair_kind: outerIntegrity.selected_primary.repair_kind,
      missing_fact: outerIntegrity.selected_primary.missing_fact,
      write_to: outerIntegrity.selected_primary.write_to,
      rerun: outerIntegrity.selected_primary.rerun,
      transaction: outerIntegrity.transaction,
      submit_integrity: outerIntegrity,
    };
  }

  try {
    const cachePageTargets = [...(prepared.virtual_cache_pages || new Map()).keys()]
      .map((trail) => path.join(trail, 'page.md'));
    return withWorkUnitTransaction(bundleDir, 'submit_work_unit', {
      targetWorkIds: [prepared.record.work_id],
      targetQueueItemIds: [prepared.record.queue_item_id],
      mutationTargets: [
        prepared.record.paths.result_ref,
        prepared.record.paths.runtime_receipt_ref,
        prepared.record.paths.status_ref,
        ...cachePageTargets,
        WORK_UNIT_OUTPUT_LEDGER,
        WORK_UNIT_INDEX_TARGET,
        QUEUE_TARGET,
      ],
      rerun: formalSubmitRerun(bundleDir, prepared.record.work_id, resultPath),
      hooks: transactionHooks,
    }, ({ tx_id }) => {
      const activePrepared = prepareWorkUnitSubmit(bundleDir, { work_id, resultPath });
      if (activePrepared.duplicate) {
        return {
          ok: true,
          duplicate: true,
          work_id: activePrepared.record.work_id,
          queue_item_id: activePrepared.record.queue_item_id,
          status: 'submitted',
          result_hash: activePrepared.result_hash,
          ledger_record_hash: activePrepared.ledger_record_hash,
          normalizations: activePrepared.normalizations,
        };
      }
      const lockedIntegrity = evaluateWorkUnitSubmitIntegrity(bundleDir, {
        index: activePrepared.index,
        record: activePrepared.record,
        resultPath,
        currentTxId: tx_id,
      });
      if (!lockedIntegrity.ok) {
        return {
          ok: false,
          work_id: activePrepared.record.work_id,
          queue_item_id: activePrepared.record.queue_item_id,
          reason_code: lockedIntegrity.selected_primary.code,
          repair_kind: lockedIntegrity.selected_primary.repair_kind,
          missing_fact: lockedIntegrity.selected_primary.missing_fact,
          write_to: lockedIntegrity.selected_primary.write_to,
          rerun: lockedIntegrity.selected_primary.rerun,
          submit_integrity: lockedIntegrity,
        };
      }
      const index = activePrepared.index;
      let queue = activePrepared.queue;
      const record = index.work_units[activePrepared.record.work_id];
      const cachePageRefs = [...(activePrepared.virtual_cache_pages || new Map()).keys()]
        .map((trail) => path.join(trail, 'page.md'));
      const snapshot = captureSubmitSnapshot(bundleDir, record, cachePageRefs);
      const submittedAt = now();
      const ledgerRow = buildLedgerRow({
        record,
        result: activePrepared.result,
        resultHash: activePrepared.result_hash,
        declaredAt: submittedAt,
        sourceContribution: activePrepared.source_contribution,
      });
      const ledgerRecordHash = ledgerRow.ledger_record_hash;

      try {
        applyCandidateCanonicalizations(bundleDir, activePrepared);
        writeJson(path.join(bundleDir, record.paths.result_ref), activePrepared.result);
        writeFileSync(path.join(bundleDir, record.paths.runtime_receipt_ref), activePrepared.runtime_receipt_content);
        writeSubmittedStatusAndHashes(bundleDir, record, {
          ledgerRecordHash,
          submittedAt,
        });
        record.status = 'submitted';
        record.terminal_at = submittedAt;
        index.work_units[record.work_id] = record;

        delete queue.delegated_in_flight[record.queue_item_id];
        queue.terminal_history.push({
          queue_item_id: record.queue_item_id,
          terminal_status: 'done',
          completed_at: submittedAt,
          work_id: record.work_id,
          reason: activePrepared.result.summary || undefined,
          item: activePrepared.manifest.queue_item,
        });
        queue = refill(queue);

        appendLedgerRow(bundleDir, ledgerRow);
        const savedIndex = saveWorkUnitIndex(bundleDir, index);
        const savedQueue = saveQueue(bundleDir, queue);
        if (typeof afterQueueSave === 'function') {
          afterQueueSave({ bundleDir, record: clone(record), savedQueue: clone(savedQueue), savedIndex: clone(savedIndex) });
        }

        const postcondition = verifySubmitDurablePostcondition(bundleDir, record);
        if (!postcondition.ok) {
          const err = new Error(`submit durable queue postcondition failed: ${postcondition.missing.join('; ')}`);
          err.missing_postconditions = postcondition.missing;
          throw err;
        }

        traceWorkUnitEvent(bundleDir, 'work_unit_ledger_appended', {
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: ledgerRecordHash,
          output_count: (ledgerRow.output_files || []).length,
          cache_trail_count: (ledgerRow.cache_trails || []).length,
        });
        logToRun(bundleDir, 'info', 'work_unit_ledger_appended', {
          kind: 'ledger_append',
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          ledger_record_hash: ledgerRecordHash,
        });
        if (activePrepared.normalizations.length > 0) {
          traceWorkUnitEvent(bundleDir, 'work_unit_submit_normalized', {
            tx_id,
            work_id: record.work_id,
            queue_item_id: record.queue_item_id,
            kind: record.kind,
            normalization_count: activePrepared.normalizations.length,
            normalizations: activePrepared.normalizations,
          });
          logToRun(bundleDir, 'info', 'work_unit_submit_normalized', {
            kind: 'work_unit_submit',
            tx_id,
            work_id: record.work_id,
            queue_item_id: record.queue_item_id,
            normalization_count: activePrepared.normalizations.length,
            normalizations: activePrepared.normalizations,
          });
        }
        traceWorkUnitEvent(bundleDir, 'work_unit_submitted', {
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          wave: record.wave,
          kind: record.kind,
          receipt_nonce: record.receipt_nonce,
          result_hash: activePrepared.result_hash,
          ledger_record_hash: ledgerRecordHash,
        });
        logToRun(bundleDir, 'info', 'work_unit_submitted', {
          kind: 'work_unit_submit',
          tx_id,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          result_hash: activePrepared.result_hash,
          ledger_record_hash: ledgerRecordHash,
        });

        return {
          ok: true,
          duplicate: false,
          work_id: record.work_id,
          queue_item_id: record.queue_item_id,
          status: 'submitted',
          result_hash: activePrepared.result_hash,
          ledger_record_hash: ledgerRecordHash,
          ledger_ref: WORK_UNIT_OUTPUT_LEDGER,
          queue: postcondition.queue,
          index: postcondition.index,
          normalizations: activePrepared.normalizations,
        };
      } catch (error) {
        const rollback = restoreSubmitSnapshot(snapshot);
        error.submit_failure_payload = buildSubmitDurabilityFailure(activePrepared, error, rollback);
        throw error;
      }
    });
  } catch (error) {
    if (error.submit_failure_payload) return error.submit_failure_payload;
    throw error;
  }
}
