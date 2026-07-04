// @impl FRE-004, SUR-001
// subagent-relay-collect-pipeline.mjs — collect/merge/pipeline orchestrators
// Source domains: collect/merge (L1336–1410), pipeline (L1519–1683)

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isCountable } from './helpers/ref-count.mjs';
import {
  SubagentWorkflowState,
  ensureTrace,
  traceEntry,
  logEvent,
} from './subagent-relay-schemas-trace.mjs';
import {
  forkRouter,
  convergeRepair,
  validateAndDiagnose,
  getDispatchMap,
} from './subagent-relay-fork-dispatch.mjs';
import { stageSubagentSlots } from './subagent-relay-stage.mjs';
import { readSlotResult } from './subagent-relay-slot-runtime.mjs';

export function collectResults(slots, baseDir) {
  ensureTrace(baseDir);
  return slots.map((slot) => {
    const result = readSlotResult(slot, baseDir);
    traceEntry('collect_result', {
      source: 'gs-collect',
      slotKey: result.slotKey,
      roleAgentKey: result.roleAgentKey,
      status: result.status,
      evidenceCount: result.evidenceCount,
    });
    logEvent('info', 'collect', { slotKey: result.slotKey, status: result.status, evidenceCount: result.evidenceCount });
    return result;
  });
}

/**
 * Merge collected slot results into workflow state.
 *
 * Pure function — does NOT write to disk. Computes ref_count from committed
 * SlotResult output_files declarations using isCountable() quality filtering
 * instead of Agent evidenceCount accumulation.
 *
 * When baseDir is provided, each role=reference output_file declared in the
 * committed slot results is checked against isCountable(). When baseDir is
 * null (legacy callers), falls back to evidenceCount summation.
 *
 * @param {object[]} results - array of SlotResult objects
 * @param {object}   state   - current workflow state
 * @param {string|null} [baseDir=null] - bundle root for isCountable() file access
 * @returns {object} updated workflow state (parsed against SubagentWorkflowState)
 *
 * @impl EEX-003
 */
export function mergeResults(results, state, baseDir = null) {
  const doneResults = results.filter((r) => r.status === 'done');
  const allFailed = results.length > 0 && results.every((r) => r.status === 'failed');

  let computedRefCount = 0;

  if (baseDir) {
    // Engine-computed: count isCountable() reference output_files from committed slot results
    for (const r of doneResults) {
      for (const entry of (r.output_files || [])) {
        if (entry.role !== 'reference') continue;
        const check = isCountable(entry.path, baseDir);
        if (check.countable) computedRefCount++;
      }
    }
  } else {
    // Legacy fallback: use Agent evidenceCount (backward compat for test callers without baseDir)
    computedRefCount = doneResults.reduce((sum, r) => sum + r.evidenceCount, 0);
  }

  const totalEvidence = computedRefCount;
  const merged = SubagentWorkflowState.parse({
    ...state,
    ref_count: state.ref_count + totalEvidence,
    subagent_results: results,
    subagent_wave: (state.subagent_wave || 0) + 1,
    subagent_all_failed: allFailed,
  });

  logEvent('info', 'merge', { totalEvidence, doneCount: doneResults.length, failedCount: results.length - doneResults.length });
  traceEntry('merge_complete', {
    source: 'gs-merge',
    totalEvidence,
    doneCount: doneResults.length,
    failedCount: results.length - doneResults.length,
    allFailed,
    waveIndex: merged.subagent_wave,
  });

  return merged;
}
export function forkAndStageSubagents(state, baseDir, customDispatchMap) {
  ensureTrace(baseDir);
  const phaseLog = [];
  const map = customDispatchMap || getDispatchMap();
  const { branch } = forkRouter(state);
  phaseLog.push({ phase: 'fork', branch });

  logEvent('info', 'relay_fork_attempt', { kind: 'queue_enqueue', branch: branch });

  try {
    if (branch !== 'pass') {
      logEvent('info', 'repair_attempt', { kind: 'queue_enqueue', outcome: 'pending' });
      const repaired = convergeRepair(state);
      phaseLog.push({ phase: 'converge_repair', outcome: repaired.outcome });
      if (repaired.outcome === 'stalled') {
        logEvent('warn', 'repair_stalled', { kind: 'queue_enqueue', outcome: repaired.outcome, iterations: repaired.iterations });
      } else {
        logEvent('info', 'repair_done', { kind: 'queue_enqueue', outcome: repaired.outcome, iterations: repaired.iterations });
      }
      traceEntry('repair', { trigger: 'fork_reject', outcome: repaired.outcome, iterations: repaired.iterations });
      return { finalState: repaired.state, phaseLog, slots: [] };
    }

    const slots = stageSubagentSlots(state, baseDir, map);
    phaseLog.push({ phase: 'dispatch', slotCount: slots.length });
    phaseLog.push({ phase: 'await_agent', slotCount: slots.length });
    logEvent('info', 'relay_fork_done', { kind: 'queue_enqueue', branch: branch, slotCount: slots.length });
    return { finalState: SubagentWorkflowState.parse(state), slots, phaseLog, awaitingAgent: true };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'relay_fork_exception', { kind: 'queue_enqueue', branch: branch, reason: safeMsg });
    throw err;
  }
}

/**
 * Collect results from all slots, merge into workflow state, and run
 * convergeRepair automatically if ALL subagents failed.
 *
 * The return shape is always the same regardless of which path was taken:
 * - checkResult / forkDecision are non-null when repair did NOT run
 * - repaired is non-null when all subagents failed and repair DID run
 *
 * @param {object}   state   - workflow state before this subagent wave
 * @param {object[]} slots   - array of slot objects
 * @param {string}   baseDir - bundle root directory
 * @returns {{
 *   finalState: object,
 *   results: object[],
 *   checkResult: object|null,
 *   forkDecision: object|null,
 *   repaired: object|null,
 *   phaseLog: object[],
 *   output_files: object[],
 *   cache_trails: string[],
 *   slotResultRefs: string[],
 *   receiptRefs: string[]
 * }}
 */
export function collectAndMergeSubagentResults(state, slots, baseDir) {
  ensureTrace(baseDir);

  logEvent('info', 'relay_collect_attempt', { kind: 'queue_complete', slotCount: slots.length });

  try {
    if (slots.length === 0) {
      logEvent('warn', 'relay_collect_empty', { kind: 'queue_complete' });
      return { finalState: state, results: [], checkResult: null, forkDecision: null, repaired: null, phaseLog: [], output_files: [], cache_trails: [], slotResultRefs: [], receiptRefs: [] };
    }

    const results = collectResults(slots, baseDir);
    const merged = mergeResults(results, state, baseDir);

    let checkResult = null;
    let forkDecision = null;
    let repaired = null;
    const phaseLog = [];

    // Aggregate declaration data from collected results
    const output_files = results.flatMap((r) => r.output_files || []);
    const cache_trails = results.flatMap((r) => r.cache_trails || []);
    const slotResultRefs = slots.map((s) => s.resultPath);
    const receiptRefs = slots.map((s) => s.receiptPath);

    if (merged.subagent_all_failed) {
      logEvent('warn', 'relay_all_failed', { kind: 'queue_complete', slotCount: slots.length });
      logEvent('info', 'repair_attempt', { kind: 'queue_enqueue', outcome: 'pending' });
      repaired = convergeRepair(merged);
      phaseLog.push({ phase: 'subagent_repair', outcome: repaired.outcome });
      if (repaired.outcome === 'stalled') {
        logEvent('warn', 'repair_stalled', { kind: 'queue_enqueue', outcome: repaired.outcome, iterations: repaired.iterations });
      } else {
        logEvent('info', 'repair_done', { kind: 'queue_enqueue', outcome: repaired.outcome, iterations: repaired.iterations });
      }
      traceEntry('repair', { trigger: 'all_subagents_failed', outcome: repaired.outcome, iterations: repaired.iterations });
      return { finalState: repaired.state, results, checkResult, forkDecision, repaired, phaseLog, output_files, cache_trails, slotResultRefs, receiptRefs };
    }

    checkResult = validateAndDiagnose(merged, SubagentWorkflowState);
    forkDecision = forkRouter(merged);
    phaseLog.push({ phase: 'ci_check', passed: checkResult.passed }, { phase: 're_fork', branch: forkDecision.branch });
    logEvent('info', 'relay_merge_done', { kind: 'queue_complete', slotCount: slots.length, ref_count: merged.ref_count });
    logEvent('info', 'relay_refork_done', { kind: 'queue_complete', branch: forkDecision.branch });
    return { finalState: merged, results, checkResult, forkDecision, repaired, phaseLog, output_files, cache_trails, slotResultRefs, receiptRefs };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'relay_collect_exception', { kind: 'queue_complete', slotCount: slots.length, reason: safeMsg });
    throw err;
  }
}

/**
 * Reconstruct a minimal slot-like object from a committed result.json reference.
 * Needed by queue-manager delegated complete() to call validateRuntimeReceipt
 * without having access to the original in-memory slot object.
 *
 * @param {string} resultRef  - bundle-relative path to committed result.json
 * @param {string} bundleDir  - bundle root directory
 * @returns {object} minimal slot object suitable for SubagentSlot.parse + validateRuntimeReceipt
 */
export function resolveSlotFromResultRef(resultRef, bundleDir) {
  const resultPath = path.join(bundleDir, resultRef);
  if (!existsSync(resultPath)) {
    throw new Error(`committed slot result not found: ${resultRef}`);
  }
  const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
  const slotDir = path.dirname(resultRef);
  const receiptPath = `${slotDir}/runtime-receipt.jsonl`;
  const receiptFull = path.join(bundleDir, receiptPath);

  // Extract receiptNonce from receipt file if it exists
  // Use a placeholder so SubagentSlot.parse doesn't reject min(1) requirement;
  // validateRuntimeReceipt will catch the actual nonce mismatch later.
  let receiptNonce = 'unresolved';
  if (existsSync(receiptFull)) {
    const text = readFileSync(receiptFull, 'utf-8').trim();
    if (text) {
      try { receiptNonce = JSON.parse(text.split('\n')[0]).receiptNonce || 'unresolved'; }
      catch { /* keep placeholder — validateRuntimeReceipt will catch */ }
    }
  }

  // Parse wave_NN / slot_MM from path segments
  const segments = slotDir.split(path.sep);
  const waveStr = segments.find((s) => s.startsWith('wave_'));
  const slotStr = segments.find((s) => s.startsWith('slot_'));
  const waveIndex = waveStr ? parseInt(waveStr.split('_')[1], 10) || 1 : 1;
  const slotIndex = slotStr ? parseInt(slotStr.split('_')[1], 10) || 0 : 0;

  return {
    key: result.slotKey,
    roleAgentKey: result.roleAgentKey,
    waveIndex,
    slotIndex,
    taskPath: `${slotDir}/task.md`,
    schemaPath: `${slotDir}/result.schema.json`,
    resultPath: resultRef,
    summaryPath: `${slotDir}/result.md`,
    statusPath: `${slotDir}/_status.json`,
    agentPath: `${slotDir}/_agent.json`,
    receiptPath,
    receiptNonce,
    status: result.status,
  };
}
