// @impl FRE-004, SUS-001, SUC-001
// subagent-relay-slot-runtime.mjs — slot status transitions, receipt validation, result commit
// Source domain: L871–1326

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  SlotStatus,
  SlotResult,
  SubagentSlot,
  SlotStatusFile,
  RuntimeReceiptEvent,
  AgentMetadata,
  ensureTrace,
  traceEntry,
  logEvent,
} from './subagent-relay-schemas-trace.mjs';
import { buildSpawnPrompt } from './subagent-relay-stage.mjs';

const slotTransitions = new Map([
  ['pending', new Set(['running', 'failed'])],
  ['running', new Set(['done', 'failed'])],
  ['done', new Set()],
  ['failed', new Set()],
]);

function extractParentRuntimeId(metadata = {}) {
  return metadata.parentRuntimeAgentId || undefined;
}

/**
 * Read the current status of a slot from its _status.json file.
 * Returns 'pending' if the file does not exist yet.
 *
 * @param {object} slot    - slot object
 * @param {string} baseDir - bundle root directory
 * @returns {'pending'|'running'|'done'|'failed'}
 */
export function readSlotStatus(slot, baseDir) {
  const file = path.join(baseDir, slot.statusPath);
  if (!existsSync(file)) return 'pending';
  return SlotStatusFile.parse(JSON.parse(readFileSync(file, 'utf-8'))).status;
}

/**
 * Write a new status for a slot, enforcing valid transitions.
 *
 * Allowed transitions:
 *   pending → running | failed
 *   running → done | failed
 *   done    → (terminal)
 *   failed  → (terminal)
 *
 * @param {object} slot    - slot object
 * @param {'pending'|'running'|'done'|'failed'} status - new status
 * @param {string} baseDir - bundle root directory
 * @throws {Error} if the transition is not allowed
 */
export function writeSlotStatus(slot, status, baseDir) {
  const parsedStatus = SlotStatus.parse(status);
  const current = readSlotStatus(slot, baseDir);
  if (current !== parsedStatus && !slotTransitions.get(current).has(parsedStatus)) {
    throw new Error(`Invalid slot status transition: ${current} -> ${parsedStatus}`);
  }
  const file = path.join(baseDir, slot.statusPath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({
    status: parsedStatus,
    updated: new Date().toISOString(),
  }, null, 2));
}

/**
 * Trace an agent_spawn_requested event and build the spawn prompt that the
 * Agent tool needs to launch a native subagent.
 *
 * Reads DPT_PARENT_RUNTIME_AGENT_ID env var as fallback for metadata.parentRuntimeAgentId.
 *
 * @param {object} slot      - slot object
 * @param {string} baseDir   - bundle root directory
 * @param {object} [metadata] - { platform?, runtimeMode?, parentRuntimeAgentId? }
 * @returns {string} spawn prompt text — pass this to the Agent tool
 */
export function recordAgentSpawnRequested(slot, baseDir, metadata = {}) {
  ensureTrace(baseDir);
  const s = SubagentSlot.parse(slot);
  logEvent('info', 'relay_spawn_attempt', { kind: 'queue_enqueue', slotKey: s.key, roleAgentKey: s.roleAgentKey, platform: metadata.platform || 'unknown', runtimeMode: metadata.runtimeMode || 'unknown' });

  try {
    const prompt = buildSpawnPrompt(s, baseDir, metadata.platform || 'unknown');
    const parentId = extractParentRuntimeId(metadata);
    traceEntry('agent_spawn_requested', {
      source: 'gs-agent',
      actor: 'parent',
      actorRuntimeAgentId: parentId,
      parentRuntimeAgentId: parentId,
      key: s.key,
      roleAgentKey: s.roleAgentKey,
      platform: metadata.platform || 'unknown',
      runtimeMode: metadata.runtimeMode || 'unknown',
    });
    logEvent('info', 'relay_spawn_requested', { kind: 'queue_enqueue', slotKey: s.key, roleAgentKey: s.roleAgentKey });
    return prompt;
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'relay_spawn_exception', { kind: 'queue_enqueue', slotKey: s.key, roleAgentKey: s.roleAgentKey, reason: safeMsg });
    throw err;
  }
}

function readReceiptEvents(slot, baseDir) {
  const s = SubagentSlot.parse(slot);
  const file = path.join(baseDir, s.receiptPath);
  if (!existsSync(file)) throw new Error(`runtime receipt missing: ${s.receiptPath}`);
  const text = readFileSync(file, 'utf-8').trim();
  if (!text) throw new Error(`runtime receipt empty: ${s.receiptPath}`);
  return text.split('\n').map((line, index) => {
    try {
      return RuntimeReceiptEvent.parse(JSON.parse(line));
    } catch (error) {
      throw new Error(`runtime receipt line ${index + 1} invalid: ${error.message}`);
    }
  });
}

/**
 * Pure validation of a subagent slot's runtime receipt. No side effects:
 * does NOT require runtimeAgentId, does NOT write trace, does NOT write
 * _agent.json, does NOT update slot status.
 *
 * Used by queue-manager delegated complete() to prove the subagent really
 * ran without depending on ingestAgentReceipt() side-effect chain.
 *
 * @param {object} slot      - slot object (must have key, roleAgentKey, receiptNonce, receiptPath)
 * @param {string} baseDir   - bundle root directory
 * @returns {{ passed: boolean, events?: object[], error?: string }}
 */
export function validateRuntimeReceipt(slot, baseDir) {
  const s = SubagentSlot.parse(slot);
  let events;
  try {
    events = readReceiptEvents(s, baseDir);
  } catch (err) {
    return { passed: false, error: err.message };
  }
  const started = events.find((event) => event.event === 'agent_runtime_started');
  const ready = events.find((event) => event.event === 'agent_result_ready');
  if (!started) return { passed: false, error: 'runtime receipt missing agent_runtime_started' };
  if (!ready) return { passed: false, error: 'runtime receipt missing agent_result_ready' };

  for (const event of [started, ready]) {
    if (event.slotKey !== s.key) {
      return { passed: false, error: `runtime receipt slotKey mismatch: ${event.slotKey} !== ${s.key}` };
    }
    if (event.roleAgentKey !== s.roleAgentKey) {
      return { passed: false, error: `runtime receipt roleAgentKey mismatch: ${event.roleAgentKey} !== ${s.roleAgentKey}` };
    }
    if (event.receiptNonce !== s.receiptNonce) {
      return { passed: false, error: `runtime receipt nonce mismatch: ${event.receiptNonce} !== ${s.receiptNonce}` };
    }
  }
  return { passed: true, events };
}

/**
 * Validate the subagent-written runtime-receipt.jsonl and import it into the
 * engine trace. Writes _agent.json and transitions slot status to 'running'.
 *
 * metadata.runtimeAgentId is REQUIRED — this is the subagent's runtime ID
 * from the Agent tool response.
 *
 * @param {object} slot      - slot object
 * @param {string} baseDir   - bundle root directory
 * @param {object} metadata  - { runtimeAgentId (required), platform?, runtimeMode?, agentType?, spawnedAt? }
 * @returns {{ agent: object, events: object[] }}
 * @throws {Error} if runtimeAgentId is missing or receipt is invalid/missing
 */
export function ingestAgentReceipt(slot, baseDir, metadata = {}) {
  ensureTrace(baseDir);
  const s = SubagentSlot.parse(slot);
  logEvent('info', 'relay_receipt_ingest_attempt', { kind: 'receipt_check', slotKey: s.key, roleAgentKey: s.roleAgentKey, receiptPath: s.receiptPath });

  try {
    if (!metadata.runtimeAgentId) throw new Error('runtimeAgentId required when ingesting runtime receipt');
    const events = readReceiptEvents(s, baseDir);
    const started = events.find((event) => event.event === 'agent_runtime_started');
    const ready = events.find((event) => event.event === 'agent_result_ready');
    if (!started) throw new Error('runtime receipt missing agent_runtime_started');
    if (!ready) throw new Error('runtime receipt missing agent_result_ready');

    for (const event of [started, ready]) {
      if (event.slotKey !== s.key) throw new Error(`runtime receipt slotKey mismatch: ${event.slotKey} !== ${s.key}`);
      if (event.roleAgentKey !== s.roleAgentKey) throw new Error(`runtime receipt roleAgentKey mismatch: ${event.roleAgentKey} !== ${s.roleAgentKey}`);
      if (event.receiptNonce !== s.receiptNonce) throw new Error(`runtime receipt nonce mismatch: ${event.receiptNonce} !== ${s.receiptNonce}`);
    }

    writeSlotStatus(s, 'running', baseDir);
    const now = new Date().toISOString();
    const agent = AgentMetadata.parse({
      slotKey: s.key,
      roleAgentKey: s.roleAgentKey,
      platform: started.platform || metadata.platform || 'unknown',
      runtimeMode: started.runtimeMode || metadata.runtimeMode || 'unknown',
      runtimeAgentId: metadata.runtimeAgentId,
      agentType: started.agentType || metadata.agentType,
      spawnedAt: started.ts || metadata.spawnedAt || now,
      status: 'running',
    });
    writeFileSync(path.join(baseDir, s.agentPath), JSON.stringify(agent, null, 2));

    traceEntry('agent_runtime_started', {
      source: 'gs-agent-runtime',
      actor: 'subagent',
      actorRuntimeAgentId: agent.runtimeAgentId,
      key: s.key,
      roleAgentKey: s.roleAgentKey,
      platform: agent.platform,
      runtimeMode: agent.runtimeMode,
      runtimeAgentId: agent.runtimeAgentId,
      receiptPath: s.receiptPath,
      receiptNonce: s.receiptNonce,
    });
    traceEntry('agent_result_ready', {
      source: 'gs-agent-runtime',
      actor: 'subagent',
      actorRuntimeAgentId: agent.runtimeAgentId,
      key: s.key,
      roleAgentKey: s.roleAgentKey,
      platform: agent.platform,
      runtimeMode: agent.runtimeMode,
      runtimeAgentId: agent.runtimeAgentId,
      receiptPath: s.receiptPath,
      receiptNonce: s.receiptNonce,
    });
    logEvent('info', 'relay_receipt_ingest_done', { kind: 'receipt_check', slotKey: s.key, roleAgentKey: s.roleAgentKey });
    return { agent, events, receiptRef: s.receiptPath };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('warn', 'relay_receipt_ingest_failed', { kind: 'receipt_check', slotKey: s.key, roleAgentKey: s.roleAgentKey, reason: safeMsg });
    throw err;
  }
}

function failedResultForSlot(slot, notes = []) {
  return SlotResult.parse({
    slotKey: slot.key,
    roleAgentKey: slot.roleAgentKey,
    status: 'failed',
    summary: '',
    evidenceCount: 0,
    references: [],
    confidence: 0,
    notes,
  });
}

function validateSlotResult(slot, candidate) {
  const parsed = SlotResult.safeParse(candidate);
  if (!parsed.success) return { ok: false, error: parsed.error };
  if (parsed.data.slotKey !== slot.key) {
    return { ok: false, error: new Error(`slotKey mismatch: ${parsed.data.slotKey} !== ${slot.key}`) };
  }
  if (parsed.data.roleAgentKey !== slot.roleAgentKey) {
    return { ok: false, error: new Error(`roleAgentKey mismatch: ${parsed.data.roleAgentKey} !== ${slot.roleAgentKey}`) };
  }
  if (parsed.data.status === 'failed' && parsed.data.evidenceCount !== 0) {
    return { ok: false, error: new Error('failed slot result must have evidenceCount 0') };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Validate a subagent's returned JSON against the slot schema, write
 * result.json (and optional result.md summary), update slot status, and
 * finalize _agent.json.
 *
 * If validation fails, the slot is automatically marked 'failed' — the
 * caller does NOT need to call markSlotFailed separately. Check `relay.ok`
 * to know whether validation passed.
 *
 * @param {object} slot            - slot object
 * @param {string} baseDir         - bundle root directory
 * @param {object} candidateResult - raw JSON returned by the subagent
 * @param {object} [metadata]      - { platform?, runtimeMode?, runtimeAgentId?,
 *                                    parentRuntimeAgentId?, agentType?, spawnedAt? }
 * @returns {{ ok: boolean, result: object, agent: object }}
 */
export function commitSlotResult(slot, baseDir, candidateResult, metadata = {}) {
  ensureTrace(baseDir);
  const s = SubagentSlot.parse(slot);
  const parentId = extractParentRuntimeId(metadata);
  logEvent('info', 'relay_commit_attempt', { kind: 'queue_complete', slotKey: s.key, roleAgentKey: s.roleAgentKey });

  try {
    traceEntry('agent_result_received', {
      source: 'gs-agent',
      actor: 'parent',
      actorRuntimeAgentId: parentId,
      parentRuntimeAgentId: parentId,
      key: s.key,
      roleAgentKey: s.roleAgentKey,
      platform: metadata.platform || 'unknown',
      receiptNonce: s.receiptNonce,
    });

    const validation = validateSlotResult(s, candidateResult);
    const completedAt = new Date().toISOString();

    // Path escape validation for output_files[] and cache_trails[]
    if (validation.ok) {
      // Validate output_files paths are bundle-relative and don't escape
      for (const entry of validation.data.output_files) {
        if (path.isAbsolute(entry.path) || entry.path.includes('..')) {
          validation.ok = false;
          validation.error = new Error(`output_files path escapes bundle: ${entry.path}`);
          logEvent('warn', 'relay_commit_path_escape', { kind: 'queue_complete', slotKey: s.key, roleAgentKey: s.roleAgentKey, path: entry.path, field: 'output_files' });
          break;
        }
      }
      // Validate cache_trails paths are bundle-relative and don't escape
      if (validation.ok) {
        for (const trail of validation.data.cache_trails) {
          if (path.isAbsolute(trail) || trail.includes('..')) {
            validation.ok = false;
            validation.error = new Error(`cache_trails path escapes bundle: ${trail}`);
            logEvent('warn', 'relay_commit_path_escape', { kind: 'queue_complete', slotKey: s.key, roleAgentKey: s.roleAgentKey, path: trail, field: 'cache_trails' });
            break;
          }
        }
      }
    }

    if (!validation.ok) {
      const safeMsg = (validation.error?.message || String(validation.error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
      logEvent('warn', 'relay_commit_schema_fail', { kind: 'queue_complete', slotKey: s.key, roleAgentKey: s.roleAgentKey, reason: safeMsg });
    }

    const result = validation.ok
      ? validation.data
      : failedResultForSlot(s, [`schema validation failed: ${validation.error.message}`]);

    // ── Slot-local deterministic diagnostics (AGO-002) ──
    // Detect duplicate source_url within this slot's reference outputs.
    // Diagnostic only — does NOT replace delegate complete() provenance,
    // ledger coverage, cache trail policy, or gate ledger authority.
    if (validation.ok) {
      const refOutputs = (result.output_files || []).filter((f) => f.role === 'reference' && f.source_url);
      const seenUrls = new Map();
      for (const ref of refOutputs) {
        // Normalize for comparison: lowercase, strip fragment/trailing slash
        let norm;
        try {
          const u = new URL(ref.source_url);
          u.hash = '';
          u.pathname = u.pathname.replace(/\/+$/, '');
          norm = u.toString().toLowerCase();
        } catch {
          norm = ref.source_url.toLowerCase().replace(/#.*$/, '').replace(/\/+$/, '');
        }
        if (seenUrls.has(norm)) {
          traceEntry('slot_diagnostic', {
            source: 'gs-commit',
            kind: 'duplicate_source_url',
            slotKey: result.slotKey,
            roleAgentKey: result.roleAgentKey,
            url: norm,
            file_a: seenUrls.get(norm),
            file_b: ref.path,
          });
          logEvent('warn', 'slot_duplicate_source_url', {
            kind: 'file_explanation',
            slotKey: result.slotKey,
            roleAgentKey: result.roleAgentKey,
            url: norm,
            files: [seenUrls.get(norm), ref.path],
          });
        } else {
          seenUrls.set(norm, ref.path);
        }
      }
    }

    traceEntry('result_schema_validated', {
      source: 'gs-agent',
      actor: 'parent',
      actorRuntimeAgentId: parentId,
      parentRuntimeAgentId: parentId,
      key: s.key,
      roleAgentKey: s.roleAgentKey,
      valid: validation.ok,
      receiptNonce: s.receiptNonce,
    });

    writeFileSync(path.join(baseDir, s.resultPath), JSON.stringify(result, null, 2));
    if (result.status === 'done') {
      writeFileSync(path.join(baseDir, s.summaryPath), `# ${s.key}\n\n${result.summary}\n`);
    }
    writeSlotStatus(s, result.status, baseDir);

    const existingAgentPath = path.join(baseDir, s.agentPath);
    const existing = existsSync(existingAgentPath)
      ? JSON.parse(readFileSync(existingAgentPath, 'utf-8'))
      : {};
    const agent = AgentMetadata.parse({
      slotKey: s.key,
      roleAgentKey: s.roleAgentKey,
      platform: metadata.platform || existing.platform || 'unknown',
      runtimeMode: metadata.runtimeMode || existing.runtimeMode || 'unknown',
      runtimeAgentId: metadata.runtimeAgentId || existing.runtimeAgentId,
      agentType: metadata.agentType || existing.agentType,
      spawnedAt: metadata.spawnedAt || existing.spawnedAt || completedAt,
      completedAt,
      status: result.status,
      validationOk: validation.ok,
      error: validation.ok ? undefined : validation.error.message,
    });
    writeFileSync(existingAgentPath, JSON.stringify(agent, null, 2));

    logEvent('info', 'relay_commit_done', { kind: 'queue_complete', slotKey: s.key, roleAgentKey: s.roleAgentKey, status: result.status });
    return { ok: validation.ok, result, agent };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    logEvent('error', 'relay_commit_exception', { kind: 'queue_complete', slotKey: s.key, roleAgentKey: s.roleAgentKey, reason: safeMsg });
    throw err;
  }
}

/**
 * Convenience: mark a slot as failed with a reason string.
 *
 * Calls commitSlotResult internally with a pre-built failed result.
 *
 * @param {object} slot      - slot object
 * @param {string} baseDir   - bundle root directory
 * @param {object} [metadata] - passed through to commitSlotResult
 * @param {string} [reason]  - failure reason (default: 'subagent slot marked failed')
 * @returns {{ ok: boolean, result: object, agent: object }}
 */
export function markSlotFailed(slot, baseDir, metadata = {}, reason = 'subagent slot marked failed') {
  return commitSlotResult(slot, baseDir, failedResultForSlot(slot, [reason]), metadata);
}

/**
 * Read and validate a slot's result.json from disk.
 *
 * Returns a failed result object (not an error) if the file is missing,
 * invalid, or the slot status is 'failed'.
 *
 * @param {object} slot    - slot object
 * @param {string} baseDir - bundle root directory
 * @returns {object} SlotResult (status may be 'done' or 'failed')
 */
export function readSlotResult(slot, baseDir) {
  const s = SubagentSlot.parse(slot);
  const status = readSlotStatus(s, baseDir);
  if (status === 'failed') {
    const resultPath = path.join(baseDir, s.resultPath);
    if (existsSync(resultPath)) {
      const parsed = validateSlotResult(s, JSON.parse(readFileSync(resultPath, 'utf-8')));
      if (parsed.ok) return parsed.data;
    }
    return failedResultForSlot(s, ['slot status failed']);
  }

  const resultPath = path.join(baseDir, s.resultPath);
  if (!existsSync(resultPath)) {
    return failedResultForSlot(s, ['result.json missing']);
  }

  const parsed = validateSlotResult(s, JSON.parse(readFileSync(resultPath, 'utf-8')));
  if (!parsed.ok) {
    return failedResultForSlot(s, [`result.json invalid: ${parsed.error.message}`]);
  }
  return parsed.data;
}
