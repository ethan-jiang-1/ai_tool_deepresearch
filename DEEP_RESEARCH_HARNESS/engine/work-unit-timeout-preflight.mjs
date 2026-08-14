// @impl DEW-014, DEW-023, CHI-004
// Read-only progress-aware timeout preflight for delegated work-unit attempts.

import {
  existsSync,
  readFileSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

import {
  WorkUnitRuntimeReceiptEventSchema,
  WorkUnitStatusFileSchema,
  WorkUnitTimeoutPreflightSchema,
} from '../schema/contracts/work-unit.mjs';
import {
  loadWorkUnitIndex,
  requireWorkUnitRecord,
} from './work-unit-index.mjs';
import {
  readAndValidateManifest,
  assertCompleteCurrentWorkUnitProfile,
} from './work-unit-validation.mjs';
import {
  drySubmitWorkUnit,
} from './work-unit-submit.mjs';
import { mapCandidateProjectionToTimeout } from './work-unit-candidate-projection.mjs';
import {
  isPathInsideDir,
  isPlainObject,
  isSafeBundleRelative,
  readJson,
  rel,
} from './work-unit-utils.mjs';
import {
  queuePath,
  queueStateFromFile,
} from './queue-manager-core.mjs';
import { inspectWorkUnitTransaction } from './work-unit-transaction.mjs';

const NON_REPAIRABLE_DRY_CODES = new Set(['wrong_work_id', 'stale_snapshot', 'duplicate_content_mismatch']);
const NON_REPAIRABLE_DRY_PHASES = new Set(['work_unit_status', 'queue_binding', 'work_unit_record', 'work_unit_index']);
const PROGRESS_TRACE_EVENTS = new Set([
  'work_unit_progress',
  'work_unit_result_draft_written',
  'work_unit_cache_written',
]);

function iso(ms) {
  return new Date(ms).toISOString();
}

function parsedMs(value) {
  const ms = Date.parse(value || '');
  return Number.isFinite(ms) ? ms : null;
}

function emptyProgress() {
  return {
    latest_engine_observed_progress_at: null,
    candidate_result_present: false,
    receipt_nonempty: false,
    output_or_cache_progress: false,
    dry_submit_expected: 'not_run',
    sources: [],
  };
}

function resultPayload(value) {
  if (isPlainObject(value) && Object.hasOwn(value, 'result') && Object.keys(value).length === 1 && isPlainObject(value.result)) {
    return value.result;
  }
  return value;
}

function readQueueReadOnly(bundleDir) {
  const file = queuePath(bundleDir);
  if (!existsSync(file)) throw new Error('rb_queue.json is missing');
  return queueStateFromFile(JSON.parse(readFileSync(file, 'utf-8')), { queueId: path.basename(bundleDir) });
}

function basePreflight({ work_id, record = null, status = 'unknown', inspect = [], advice = [] }) {
  return {
    ok: true,
    work_id: record?.work_id || work_id,
    queue_item_id: record?.queue_item_id || null,
    status: record?.status || status,
    timeout_eligible: false,
    check: false,
    recommended_action: 'block',
    initial_deadline_at: record?.deadline_at || null,
    lease_anchor_at: record?.claimed_at || null,
    idle_timeout_ms: record?.timeout_ms || null,
    effective_timeout_at: record?.claimed_at && record?.timeout_ms ? iso(Date.parse(record.claimed_at) + record.timeout_ms) : null,
    progress: emptyProgress(),
    inspect,
    advice,
  };
}

function statProgressSource(bundleDir, {
  filePath,
  pathRef,
  sourceType,
  identityVerified,
  extendsIdleLease,
  nowMs,
  claimedMs,
}) {
  if (!existsSync(filePath)) return null;
  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    return null;
  }
  const rawMs = stats.mtimeMs;
  const suspicious = rawMs > nowMs;
  const observedMs = Math.min(rawMs, nowMs);
  const canExtend = Boolean(extendsIdleLease && identityVerified && observedMs >= claimedMs);
  return {
    public: {
      source_type: sourceType,
      observed_at: iso(observedMs),
      path_ref: pathRef || rel(bundleDir, filePath),
      identity_verified: Boolean(identityVerified),
      extends_idle_lease: canExtend,
      suspicious_timestamp: suspicious,
    },
    observedMs,
    extendsIdleLease: canExtend,
  };
}

function pushSource(progress, source) {
  if (!source) return;
  progress.sources.push(source.public);
  if (source.extendsIdleLease) {
    const current = parsedMs(progress.latest_engine_observed_progress_at);
    if (current === null || source.observedMs > current) {
      progress.latest_engine_observed_progress_at = iso(source.observedMs);
    }
  }
}

function receiptIdentityProgress(bundleDir, record, { nowMs, claimedMs }) {
  const receiptPath = path.join(bundleDir, record.paths.runtime_receipt_ref);
  if (!existsSync(receiptPath)) return { nonempty: false, matched: false, issues: [], source: null };
  const raw = readFileSync(receiptPath, 'utf-8');
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { nonempty: false, matched: false, issues: [], source: null };
  let matched = false;
  const issues = [];
  for (const line of lines) {
    try {
      const parsed = WorkUnitRuntimeReceiptEventSchema.parse(JSON.parse(line));
      if (
        parsed.work_id === record.work_id &&
        parsed.queue_item_id === record.queue_item_id &&
        parsed.kind === record.kind &&
        parsed.receipt_nonce === record.receipt_nonce
      ) {
        matched = true;
      }
    } catch (error) {
      issues.push(`runtime receipt has unparseable progress event: ${error.message || String(error)}`);
    }
  }
  if (!matched) {
    issues.push(`runtime receipt has no identity-matched progress event for ${record.work_id}`);
  }
  return {
    nonempty: true,
    matched,
    issues,
    source: statProgressSource(bundleDir, {
      filePath: receiptPath,
      pathRef: record.paths.runtime_receipt_ref,
      sourceType: 'receipt_file',
      identityVerified: matched,
      extendsIdleLease: matched,
      nowMs,
      claimedMs,
    }),
  };
}

function validateStatusSurface(bundleDir, record) {
  const statusPath = path.join(bundleDir, record.paths.status_ref);
  if (!existsSync(statusPath)) return [`Missing status file: ${record.paths.status_ref}`];
  try {
    const status = WorkUnitStatusFileSchema.parse(readJson(statusPath));
    const issues = [];
    if (status.work_id !== record.work_id) issues.push(`status/index mismatch for ${record.work_id}: work_id`);
    if (status.status !== record.status) issues.push(`status/index mismatch for ${record.work_id}: status`);
    return issues;
  } catch (error) {
    return [`Invalid status file ${record.paths.status_ref}: ${error.message || String(error)}`];
  }
}

function traceProgressSources(bundleDir, record, { nowMs, claimedMs }) {
  const tracePath = path.join(bundleDir, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  const out = [];
  const lines = readFileSync(tracePath, 'utf-8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  lines.forEach((line, index) => {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      return;
    }
    if (entry?.work_id !== record.work_id) return;
    if (!PROGRESS_TRACE_EVENTS.has(entry?.event)) return;
    const eventMs = parsedMs(entry.ts);
    if (eventMs === null) return;
    const suspicious = eventMs > nowMs;
    const observedMs = Math.min(eventMs, nowMs);
    const extendsIdleLease = observedMs >= claimedMs;
    out.push({
      public: {
        source_type: 'engine_event',
        observed_at: iso(observedMs),
        event_ref: `rb_trace.jsonl:${index + 1}:${entry.event || 'event'}`,
        identity_verified: true,
        extends_idle_lease: extendsIdleLease,
        suspicious_timestamp: suspicious,
      },
      observedMs,
      extendsIdleLease,
    });
  });
  return out;
}

function candidateIdentityMatches(candidate, record) {
  if (!isPlainObject(candidate)) return false;
  for (const field of ['work_id', 'queue_item_id', 'kind']) {
    if (candidate[field] !== undefined && candidate[field] !== record[field]) return false;
  }
  if (candidate.receipt_nonce !== undefined && candidate.receipt_nonce !== record.receipt_nonce) return false;
  return true;
}

function candidateRefs(candidate) {
  if (!isPlainObject(candidate)) return { outputRefs: [], cacheRefs: [] };
  return {
    outputRefs: Array.isArray(candidate.output_files)
      ? candidate.output_files.map((entry) => entry?.path).filter((value) => typeof value === 'string')
      : [],
    cacheRefs: Array.isArray(candidate.cache_trails)
      ? candidate.cache_trails.filter((value) => typeof value === 'string')
      : [],
  };
}

function observeCandidateDeclaredRefs(bundleDir, record, candidate, progress, { nowMs, claimedMs }) {
  if (!candidateIdentityMatches(candidate, record)) return;
  const { outputRefs, cacheRefs } = candidateRefs(candidate);
  for (const refPath of outputRefs) {
    if (!isSafeBundleRelative(refPath)) continue;
    const source = statProgressSource(bundleDir, {
      filePath: path.join(bundleDir, refPath),
      pathRef: refPath,
      sourceType: 'output_file',
      identityVerified: true,
      extendsIdleLease: true,
      nowMs,
      claimedMs,
    });
    if (source) {
      progress.output_or_cache_progress = true;
      pushSource(progress, source);
    }
  }
  for (const refPath of cacheRefs) {
    if (!isSafeBundleRelative(refPath)) continue;
    const source = statProgressSource(bundleDir, {
      filePath: path.join(bundleDir, refPath),
      pathRef: refPath,
      sourceType: 'cache_leaf',
      identityVerified: true,
      extendsIdleLease: true,
      nowMs,
      claimedMs,
    });
    if (source) {
      progress.output_or_cache_progress = true;
      pushSource(progress, source);
    }
  }
}

function drySubmitHasSameAttemptRepair(dry) {
  if (!dry || dry.expected_submit !== 'fail') return false;
  const violations = Array.isArray(dry.violations) ? dry.violations : [];
  if (violations.length === 0) return false;
  if ((dry.reason_codes || []).some((code) => NON_REPAIRABLE_DRY_CODES.has(code))) return false;
  if (violations.some((violation) => NON_REPAIRABLE_DRY_PHASES.has(violation.phase))) return false;
  return true;
}

function drySubmitIsNonRepairable(dry) {
  if (!dry || dry.expected_submit !== 'fail') return false;
  const violations = Array.isArray(dry.violations) ? dry.violations : [];
  if ((dry.reason_codes || []).some((code) => NON_REPAIRABLE_DRY_CODES.has(code))) return true;
  return violations.some((violation) => NON_REPAIRABLE_DRY_PHASES.has(violation.phase));
}

function parseCandidate(candidatePath) {
  try {
    return resultPayload(readJson(candidatePath));
  } catch {
    return null;
  }
}

function recommendationBasisFor(payload) {
  if (payload.candidate_projection) {
    return {
      branch: 'candidate',
      facts: { candidate_projection: payload.candidate_projection },
    };
  }
  const latestProgress = payload.progress?.latest_engine_observed_progress_at;
  if (payload.recommended_action === 'wait' && latestProgress && payload.effective_timeout_at) {
    return {
      branch: 'progress',
      facts: {
        latest_engine_observed_progress_at: latestProgress,
        effective_timeout_at: payload.effective_timeout_at,
      },
    };
  }
  if (
    (payload.recommended_action === 'wait' || payload.recommended_action === 'timeout')
    && payload.lease_anchor_at
    && payload.effective_timeout_at
  ) {
    return {
      branch: 'lease',
      facts: {
        lease_anchor_at: payload.lease_anchor_at,
        effective_timeout_at: payload.effective_timeout_at,
      },
    };
  }
  return {
    branch: 'integrity',
    facts: {
      direct_issue: payload.inspect?.[0] || 'timeout preflight could not establish a safe claimed-attempt boundary',
    },
  };
}

function finalizePreflight(payload) {
  const transaction = payload.transaction || null;
  const schemaPayload = { ...payload };
  delete schemaPayload.transaction;
  const parsed = WorkUnitTimeoutPreflightSchema.parse({
    ...schemaPayload,
    recommendation_basis: payload.recommendation_basis || recommendationBasisFor(payload),
  });
  return transaction ? { ...parsed, transaction } : parsed;
}

export function timeoutPreflightWorkUnit(bundleDir, { work_id, resultPath = null, nowMs = Date.now() } = {}) {
  let index;
  let record;
  let manifest;
  let queue;
  try {
    index = loadWorkUnitIndex(bundleDir, { createIfMissing: false });
    record = requireWorkUnitRecord(index, work_id);
  } catch (error) {
    return finalizePreflight(basePreflight({
      work_id,
      inspect: [error.message || String(error)],
      advice: ['Use a known claimed work_id from operate-work-unit claim before considering timeout.'],
    }));
  }

  const claimedMs = parsedMs(record.claimed_at);
  const idleTimeoutMs = record.timeout_ms || 600000;
  const base = basePreflight({ work_id, record });
  base.idle_timeout_ms = idleTimeoutMs;
  base.initial_deadline_at = record.deadline_at || null;

  try {
    assertCompleteCurrentWorkUnitProfile(bundleDir, record);
  } catch (error) {
    return finalizePreflight({
      ...base,
      recommended_action: 'block',
      inspect: [error.message || String(error)],
      advice: ['This attempt does not carry the complete current work-unit profile; do not inspect progress or timeout it.'],
    });
  }

  if (record.status !== 'claimed') {
    return finalizePreflight({
      ...base,
      recommended_action: 'block',
      inspect: [`work_id ${record.work_id} is ${record.status}; timeout preflight only applies to claimed attempts.`],
      advice: ['Inspect terminal/submitted state; do not timeout a non-claimed attempt.'],
    });
  }
  if (claimedMs === null) {
    return finalizePreflight({
      ...base,
      recommended_action: 'block',
      inspect: [`claimed_at is invalid for ${record.work_id}`],
      advice: ['Repair work-unit index through Engine tooling before timeout.'],
    });
  }

  const transaction = inspectWorkUnitTransaction(bundleDir, {
    operation: 'work_unit_timed_out',
    targetWorkIds: [record.work_id],
    targetQueueItemIds: [record.queue_item_id],
    rerun: `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs timeout-preflight ${JSON.stringify(path.resolve(bundleDir))} --work-id ${JSON.stringify(record.work_id)}`,
  });
  if (transaction.disposition !== 'none') {
    const busy = transaction.disposition === 'busy';
    const directIssue = busy
      ? `Global transaction ${transaction.holder.tx_id} blocks timeout; targets_same_attempt=${transaction.targets_same_attempt}.`
      : transaction.missing_fact;
    return finalizePreflight({
      ...base,
      transaction,
      recommended_action: busy ? 'wait' : 'block',
      inspect: [directIssue],
      advice: busy
        ? [`Wait without changing this attempt, then rerun: ${transaction.rerun}`]
        : [`Transaction integrity is suspect; use only the reported recovery boundary, then rerun the same timeout-preflight. ${transaction.rerun}`],
      recommendation_basis: {
        branch: 'integrity',
        facts: { direct_issue: directIssue },
      },
    });
  }

  const invalidBinding = [];
  try {
    manifest = readAndValidateManifest(bundleDir, index, record);
  } catch (error) {
    invalidBinding.push(error.message || String(error));
  }
  invalidBinding.push(...validateStatusSurface(bundleDir, record));
  try {
    queue = readQueueReadOnly(bundleDir);
    const inFlight = queue.delegated_in_flight?.[record.queue_item_id];
    if (!inFlight) invalidBinding.push(`queue_item_id ${record.queue_item_id} is not delegated in flight`);
    else if (inFlight.work_id !== record.work_id) invalidBinding.push(`queue in-flight binding mismatch for ${record.queue_item_id}: ${inFlight.work_id}`);
  } catch (error) {
    invalidBinding.push(error.message || String(error));
  }
  if (invalidBinding.length > 0) {
    return finalizePreflight({
      ...base,
      recommended_action: 'inspect',
      inspect: invalidBinding,
      advice: ['Repair work-unit manifest/index/queue binding before terminal timeout; do not force timeout to drain an invalid binding by default.'],
    });
  }

  const progress = emptyProgress();
  const candidatePath = resultPath ? path.resolve(resultPath) : path.join(bundleDir, record.paths.result_ref);
  const candidatePresent = existsSync(candidatePath);
  progress.candidate_result_present = candidatePresent;
  let dry = null;
  let candidate = null;
  if (candidatePresent) {
    const assignedDir = path.join(bundleDir, record.paths.work_unit_dir);
    dry = drySubmitWorkUnit(bundleDir, { work_id: record.work_id, resultPath: candidatePath });
    progress.dry_submit_expected = dry.expected_submit === 'pass' ? 'pass' : 'fail';
    candidate = parseCandidate(candidatePath);
    const externalCandidate = !isPathInsideDir(candidatePath, assignedDir);
    const identityVerified = dry.expected_submit === 'pass' || drySubmitHasSameAttemptRepair(dry);
    const source = statProgressSource(bundleDir, {
      filePath: candidatePath,
      pathRef: rel(bundleDir, candidatePath),
      sourceType: 'result_file',
      identityVerified,
      extendsIdleLease: !externalCandidate && (identityVerified || drySubmitHasSameAttemptRepair(dry)),
      nowMs,
      claimedMs,
    });
    pushSource(progress, source);
    observeCandidateDeclaredRefs(bundleDir, record, candidate, progress, { nowMs, claimedMs });
  }

  const receipt = receiptIdentityProgress(bundleDir, record, { nowMs, claimedMs });
  progress.receipt_nonempty = receipt.nonempty;
  base.inspect.push(...receipt.issues);
  pushSource(progress, receipt.source);
  for (const source of traceProgressSources(bundleDir, record, { nowMs, claimedMs })) pushSource(progress, source);

  const latestProgressMs = parsedMs(progress.latest_engine_observed_progress_at);
  const leaseAnchorMs = latestProgressMs ?? claimedMs;
  const effectiveTimeoutMs = leaseAnchorMs + idleTimeoutMs;
  const leaseFresh = nowMs < effectiveTimeoutMs;
  const timeoutMetadata = {
    progress,
    lease_anchor_at: iso(leaseAnchorMs),
    effective_timeout_at: iso(effectiveTimeoutMs),
    candidate_projection: dry ? {
      recommended_action: dry.recommended_action,
      primary_root_code: dry.primary_root_code,
    } : null,
  };

  const mappedCandidate = dry ? mapCandidateProjectionToTimeout(timeoutMetadata.candidate_projection) : null;
  if (mappedCandidate?.recommended_action === 'submit') {
    return finalizePreflight({
      ...base,
      ...timeoutMetadata,
      recommended_action: 'submit',
      inspect: base.inspect,
      advice: [`Run operate-work-unit submit for ${record.work_id} before considering timeout.`],
    });
  }

  if (mappedCandidate?.recommended_action === 'repair') {
    return finalizePreflight({
      ...base,
      ...timeoutMetadata,
      recommended_action: 'repair',
      inspect: [
        ...base.inspect,
        ...(dry.violations || []).map((violation) => violation.message),
      ],
      advice: mappedCandidate.advice.length > 0
        ? mappedCandidate.advice
        : [`Repair the candidate declaration for the same claimed work_id ${record.work_id}, then rerun dry-submit or submit.`],
    });
  }

  if (mappedCandidate?.recommended_action === 'block' || mappedCandidate?.recommended_action === 'inspect') {
    return finalizePreflight({
      ...base,
      ...timeoutMetadata,
      recommended_action: mappedCandidate.recommended_action,
      inspect: [
        ...base.inspect,
        ...(dry.violations || []).map((violation) => violation.message),
      ],
      advice: mappedCandidate.advice.length > 0
        ? mappedCandidate.advice
        : ['Inspect candidate identity, queue binding, and terminal status; do not treat this as same-attempt repair.'],
    });
  }

  if (receipt.issues.length > 0) {
    return finalizePreflight({
      ...base,
      ...timeoutMetadata,
      recommended_action: 'inspect',
      inspect: base.inspect,
      advice: ['Repair or remove ambiguous runtime receipt events through the assigned work-unit surface before terminal timeout.'],
    });
  }

  if (latestProgressMs !== null && leaseFresh) {
    return finalizePreflight({
      ...base,
      ...timeoutMetadata,
      recommended_action: 'wait',
      inspect: base.inspect,
      advice: [`Recent Engine-observed progress exists for ${record.work_id}; continue polling or inspect readiness before timeout.`],
    });
  }

  if (nowMs >= effectiveTimeoutMs) {
    return finalizePreflight({
      ...base,
      ...timeoutMetadata,
      timeout_eligible: true,
      check: true,
      recommended_action: 'timeout',
      inspect: base.inspect,
      advice: [`No submit-ready or repairable candidate is available and the effective idle lease expired at ${iso(effectiveTimeoutMs)}.`],
    });
  }

  return finalizePreflight({
    ...base,
    ...timeoutMetadata,
    recommended_action: 'wait',
    inspect: base.inspect,
    advice: [`Initial/effective idle lease has not expired for ${record.work_id}; continue polling before timeout.`],
  });
}
