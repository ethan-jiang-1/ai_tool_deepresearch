// gate-helpers-provenance.mjs — Relay provenance gate checks + bypass detection + forensics
// @impl RPG-001, RPG-002, RPG-004, RPG-005, RPG-007, RPG-008, RPG-009, RPG-011, RPG-012, RPG-013
// Canonical location: DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs
//
// Re-exported by gate-helpers.mjs for backward compatibility.

import { existsSync, readFileSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readOutputDeclarations, readBundlePlan, listMatchingBundleFiles } from './gate-helpers-readers.mjs';
import { readBundleName, logToRun } from '../logger.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// Provenance Forensics (RPG-007..013) — diagnostic-only (advisory this change)
// ═══════════════════════════════════════════════════════════════════════════
//
// Forge-resistance is a SPECTRUM, not a binary (see provenance-forensics-guide.md):
//   - Single files (dispatch.json / _beacon.json / _agent.json / runtime-receipt.jsonl)
//     are trivially forged via writeFileSync.
//   - The engine trace chain in rb_trace.jsonl (nonce-anchored end-to-end by
//     SUD-007) is the primary hard-to-forge signal — a forger must append
//     self-consistent nonce-anchored lines.
//   - S1/S2 (dispatch.json + UUID nonce) are a sloppy-forgery screen only.
// No single signal is crypto-unforgeable (signing is out-of-scope).
//
// These diagnostics emit through the EXISTING logging surface (trace event +
// run.log WARN) and SHALL NOT change gate pass/fail. They carry slotKey + wave
// (RPG-013) so a future coding agent can aggregate per slot/wave.

const FORENSIC_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP_SPAN_THRESHOLD_MS = 1000; // RPG-009 default threshold (Q3: conservative)
const LIFECYCLE_KINDS = new Set(['search_start', 'search_done', 'fetch_done', 'file_written', 'error', 'work_done']);

function readJsonSafe(filePath, fallback = null) {
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch { return fallback; }
}

function readTraceLines(bundlePath) {
  const p = join(bundlePath, 'rb_trace.jsonl');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf-8').split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function readRunLogText(bundlePath) {
  const p = join(bundlePath, '_logs', 'run.log');
  if (!existsSync(p)) return '';
  return readFileSync(p, 'utf-8');
}

/**
 * Parse run.log lines into structured lifecycle events (RPG-011 tightened:
 * an event counts only if its JSON detail parses and detail.kind is a known
 * lifecycle kind — a bare substring hit on the nonce no longer counts).
 * Returns [{ kind, slotKey, nonce }].
 */
function parseRunLogLifecycleEvents(runLog) {
  const events = [];
  if (!runLog) return events;
  for (const line of runLog.split('\n')) {
    const jsonStart = line.indexOf('{');
    if (jsonStart < 0) continue;
    let detail;
    try { detail = JSON.parse(line.slice(jsonStart)); } catch { continue; }
    if (!detail || !LIFECYCLE_KINDS.has(detail.kind)) continue;
    events.push({
      kind: detail.kind,
      slotKey: detail.slotKey || detail.slot_key || null,
      nonce: detail.receipt_nonce || detail.receiptNonce || null,
    });
  }
  return events;
}

/** Lifecycle events from rb_trace.jsonl (same tightened parse as run.log side). */
function traceLifecycleEvents(trace) {
  const events = [];
  for (const e of trace) {
    const kind = e.detail?.kind || e.kind || e.event;
    if (!LIFECYCLE_KINDS.has(kind)) continue;
    events.push({
      kind,
      slotKey: e.detail?.slotKey || e.slotKey || e.key || null,
      nonce: e.detail?.receipt_nonce || e.detail?.receiptNonce || e.receiptNonce || null,
    });
  }
  return events;
}

/** Match production relay_commit_done log lines only — not diagnostic reason text. */
function runLogHasRelayCommitDone(runLog, slotKey) {
  if (!runLog || !slotKey) return false;
  for (const line of runLog.split('\n')) {
    if (!/\] INFO relay_commit_done bundle=/.test(line)) continue;
    const jsonStart = line.indexOf('{');
    if (jsonStart >= 0) {
      try {
        const detail = JSON.parse(line.slice(jsonStart));
        if (detail.slotKey === slotKey) return true;
      } catch { /* ignore malformed line */ }
    }
    if (line.includes(slotKey)) return true;
  }
  return false;
}

function emitForensicFinding(code, slotKey, wave, reason, bundlePath, phase, gate, findings) {
  const finding = { code, slotKey, wave, reason, phase, gate };
  findings.push(finding);
  try {
    const bundle = (() => { try { return readBundleName(bundlePath); } catch { return basename(bundlePath); } })();
    const ts = new Date().toISOString();
    appendFileSync(join(bundlePath, 'rb_trace.jsonl'), JSON.stringify({
      ts, bundle, event: 'provenance_diagnostic', kind: code, slotKey, wave, reason, phase, gate,
    }) + '\n');
  } catch { /* trace write failure must not block the gate */ }
  try { logToRun(bundlePath, 'warn', code, { slotKey, wave, reason, phase, gate }); } catch { /* ignore */ }
}

/**
 * Run diagnostic-only provenance forensics for a wave (RPG-007..013).
 *
 * For each staged slot under `_subagents/wave_NN/`, inspect the engine-emitted
 * artifact set and emit advisory diagnostics when forge-resistance signals
 * contradict. Diagnostics write through the existing logging surface (trace +
 * run.log WARN) and the returned findings let the gate surface them as advisory
 * inspect lines. Pass/fail is NEVER changed by these diagnostics.
 *
 * Checks:
 *   - RPG-007 provenance_nonce_mismatch: nonce non-UUID / absent from dispatch.json
 *   - RPG-008 relay_commit_missing: staged slot without engine commit trace
 *   - RPG-009 agent_timestamp_span_suspicious: spawnedAt→completedAt span < threshold
 *   - RPG-011 lifecycle_events_missing: done slot without a nonce-carrying lifecycle event
 *   - RPG-012 provenance_chain_inconsistency: cross-artifact reference contradictions
 *     (explicitly avoids duplicating RPG-008's "_status=done without commit trace")
 *
 * @param {string} bundlePath
 * @param {string} phase - 'wave0' | 'wave1' | 'wave2'
 * @param {string} gate - gate key
 * @returns {Array<{code, slotKey, wave, reason, phase, gate}>} findings (also emitted to trace/log)
 */
export function runProvenanceForensics(bundlePath, phase, gate) {
  const findings = [];
  const waveNum = String(phase || '').replace('wave', '');
  const wave = `wave_${String(waveNum).padStart(2, '0')}`;
  const waveDir = join(bundlePath, '_subagents', wave);
  if (!existsSync(waveDir) || !statSync(waveDir).isDirectory()) return findings;

  const dispatchPath = join(waveDir, 'dispatch.json');
  const dispatch = readJsonSafe(dispatchPath, null);
  const dispatchEntries = (dispatch && Array.isArray(dispatch.slots)) ? dispatch.slots : [];
  const dispatchNonceByKey = new Map(dispatchEntries.map((s) => [s.key, s.receipt_nonce]));
  const dispatchKeys = new Set(dispatchEntries.map((s) => s.key));

  const trace = readTraceLines(bundlePath);
  const runLog = readRunLogText(bundlePath);
  const dispatchCreateEv = trace.find((e) => e.event === 'dispatch_create');
  const lifecycleEvents = [...parseRunLogLifecycleEvents(runLog), ...traceLifecycleEvents(trace)];

  // RPG-013 __wave__ fallback: a wave-level condition where no slot can be
  // identified (dispatch.json exists but is corrupt/unparseable).
  if (existsSync(dispatchPath) && dispatch === null) {
    emitForensicFinding('provenance_chain_inconsistency', '__wave__', wave, 'dispatch.json exists but is unparseable — staged nonces unreadable', bundlePath, phase, gate, findings);
  }

  let slotNames = [];
  try {
    slotNames = readdirSync(waveDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('slot_'))
      .map((d) => d.name);
  } catch { return findings; }

  for (const slotName of slotNames) {
    const slotDir = join(waveDir, slotName);
    const beacon = readJsonSafe(join(slotDir, '_beacon.json'), null);
    const result = readJsonSafe(join(slotDir, 'result.json'), null);
    const statusFile = readJsonSafe(join(slotDir, '_status.json'), null);
    const agent = readJsonSafe(join(slotDir, '_agent.json'), null);

    // nonce: prefer the staged beacon nonce; fall back to the receipt's first event.
    let receiptNonce = null;
    const receiptPath = join(slotDir, 'runtime-receipt.jsonl');
    if (existsSync(receiptPath)) {
      try {
        const firstLine = readFileSync(receiptPath, 'utf-8').split('\n').filter(Boolean)[0];
        if (firstLine) receiptNonce = JSON.parse(firstLine).receiptNonce || null;
      } catch { /* keep null */ }
    }
    const nonce = beacon?.receipt_nonce || receiptNonce || null;
    const nonceIsUuid = !!(nonce && FORENSIC_UUID_RE.test(nonce));

    const slotKey = result?.slotKey || beacon?.slot_key || slotName;
    const stagedSlot = !!statusFile || !!result;
    const statusDone = (statusFile?.status === 'done') || (result?.status === 'done');

    // Per-slot trace events (top-level key OR detail.key).
    const slotEvents = trace.filter((e) => e.key === slotKey || (e.detail && e.detail.key === slotKey));
    const tHas = (kind) => {
      if (slotEvents.some((e) => e.event === kind)) return true;
      if (kind === 'dispatch_create' && dispatchCreateEv && Array.isArray(dispatchCreateEv.slots)
        && dispatchCreateEv.slots.some((s) => s.key === slotKey)) return true;
      return false;
    };
    const traceNonces = new Set();
    for (const e of slotEvents) {
      if (e.receiptNonce) traceNonces.add(e.receiptNonce);
      if (e.detail?.receiptNonce) traceNonces.add(e.detail.receiptNonce);
    }
    if (dispatchCreateEv?.slots) {
      for (const s of dispatchCreateEv.slots) {
        if (s.key === slotKey && s.receiptNonce) traceNonces.add(s.receiptNonce);
      }
    }

    const commitTracePresent = tHas('result_schema_validated') || tHas('agent_result_received');
    const runLogCommit = runLogHasRelayCommitDone(runLog, slotKey);
    const commitProven = commitTracePresent || runLogCommit;

    // Lifecycle events for this slot (parsed, not substring-matched): the slot's
    // events are those whose detail names this slotKey (or carry no slotKey at
    // all but the matching nonce — tolerate older emitters).
    const slotLifecycle = lifecycleEvents.filter((ev) =>
      (ev.slotKey && ev.slotKey === slotKey) || (!ev.slotKey && nonce && ev.nonce === nonce));
    // S5 signal (RPG-011 tightened): a parsed lifecycle event for this slot
    // whose detail carries the exact beacon nonce.
    const lifecycleWithNonce = !!(nonce && slotLifecycle.some((ev) => ev.nonce === nonce));

    let agentSpanMs = null;
    if (agent?.spawnedAt && agent?.completedAt) {
      const s = Date.parse(agent.spawnedAt);
      const c = Date.parse(agent.completedAt);
      if (!Number.isNaN(s) && !Number.isNaN(c)) agentSpanMs = c - s;
    }

    // RPG-007 provenance_nonce_mismatch (sloppy-forgery screen). Reasons are
    // distinguished but neither case is silenced:
    //   - nonce_absent: no nonce material at all (possibly a pre-instrumentation
    //     bundle — the judge checks the guide's instrumentation prerequisite first)
    //   - nonce_malformed: nonce present but not UUID-shaped (sloppy-forgery signal)
    if (stagedSlot) {
      if (nonce === null) {
        emitForensicFinding('provenance_nonce_mismatch', slotKey, wave, 'nonce_absent: no _beacon.json nonce and no runtime-receipt nonce (check instrumentation prerequisite per forensics guide §0 before judging)', bundlePath, phase, gate, findings);
      } else if (!nonceIsUuid) {
        emitForensicFinding('provenance_nonce_mismatch', slotKey, wave, `nonce_malformed: not UUID-shaped: ${String(nonce).slice(0, 60)}`, bundlePath, phase, gate, findings);
      } else if (!dispatch) {
        emitForensicFinding('provenance_nonce_mismatch', slotKey, wave, 'dispatch.json absent — no staged nonce can match', bundlePath, phase, gate, findings);
      } else if (dispatchNonceByKey.get(slotKey) !== nonce) {
        emitForensicFinding('provenance_nonce_mismatch', slotKey, wave, 'UUID nonce not present in (or not matching) dispatch.json', bundlePath, phase, gate, findings);
      }
    }

    // RPG-008 relay_commit_missing — staged slot (any status) without engine commit trace.
    if (stagedSlot && !commitProven) {
      emitForensicFinding('relay_commit_missing', slotKey, wave, 'slot has _status.json/result.json but no engine commit trace (result_schema_validated / relay_commit_done)', bundlePath, phase, gate, findings);
    }

    // RPG-009 agent_timestamp_span_suspicious (alone insufficient to conclude forgery).
    if (agentSpanMs !== null && agentSpanMs < TIMESTAMP_SPAN_THRESHOLD_MS) {
      emitForensicFinding('agent_timestamp_span_suspicious', slotKey, wave, `spawnedAt→completedAt span ${agentSpanMs}ms < ${TIMESTAMP_SPAN_THRESHOLD_MS}ms threshold (alone insufficient to conclude forgery)`, bundlePath, phase, gate, findings);
    }

    // RPG-011 lifecycle_events_missing — done slot without a nonce-carrying lifecycle event (S5 read-side).
    if (statusDone && !lifecycleWithNonce) {
      emitForensicFinding('lifecycle_events_missing', slotKey, wave, 'done slot has no lifecycle event carrying its nonce in run.log/rb_trace.jsonl', bundlePath, phase, gate, findings);
    }

    // RPG-012 provenance_chain_inconsistency — cross-artifact contradictions.
    // (a) agent_result_received present but result_schema_validated absent.
    if (tHas('agent_result_received') && !tHas('result_schema_validated')) {
      emitForensicFinding('provenance_chain_inconsistency', slotKey, wave, 'agent_result_received present but result_schema_validated absent', bundlePath, phase, gate, findings);
    }
    // (b) agent_result_ready present but agent_runtime_started absent.
    if (tHas('agent_result_ready') && !tHas('agent_runtime_started')) {
      emitForensicFinding('provenance_chain_inconsistency', slotKey, wave, 'agent_result_ready present but agent_runtime_started absent', bundlePath, phase, gate, findings);
    }
    // (c) nonce mismatch across chain artifacts (trace / dispatch.json /
    //     lifecycle events vs the beacon/receipt nonce).
    if (nonce) {
      const conflictingTraceNonce = [...traceNonces].find((tn) => tn && tn !== nonce);
      const conflictingLifecycleNonce = slotLifecycle.map((ev) => ev.nonce).find((ln) => ln && ln !== nonce);
      if (conflictingTraceNonce) {
        emitForensicFinding('provenance_chain_inconsistency', slotKey, wave, `nonce mismatch: beacon/receipt=${nonce.slice(0, 8)}… vs trace=${String(conflictingTraceNonce).slice(0, 8)}…`, bundlePath, phase, gate, findings);
      } else if (dispatch && dispatchNonceByKey.has(slotKey) && dispatchNonceByKey.get(slotKey) !== nonce) {
        emitForensicFinding('provenance_chain_inconsistency', slotKey, wave, 'nonce mismatch: beacon/receipt vs dispatch.json', bundlePath, phase, gate, findings);
      } else if (conflictingLifecycleNonce) {
        emitForensicFinding('provenance_chain_inconsistency', slotKey, wave, `nonce mismatch: beacon/receipt=${nonce.slice(0, 8)}… vs lifecycle event=${String(conflictingLifecycleNonce).slice(0, 8)}…`, bundlePath, phase, gate, findings);
      }
    }
    // (d) slot listed in dispatch.json but no staging trace.
    //     (Distinct from RPG-008: RPG-008 = staged-without-commit; this = dispatched-without-staging-trace.)
    if (dispatchKeys.has(slotKey) && !tHas('slot_create') && !tHas('dispatch_create')) {
      emitForensicFinding('provenance_chain_inconsistency', slotKey, wave, 'slot listed in dispatch.json but no slot_create/dispatch_create trace', bundlePath, phase, gate, findings);
    }
  }

  // Dispatch entries whose slot directory is missing on disk are invisible to
  // the per-directory loop above — surface them so a hand-pruned wave (dispatch
  // record without slot artifacts) is still flagged, per slot key (RPG-013).
  const seenSlotKeys = new Set(slotNames.map((slotName) => {
    const beacon = readJsonSafe(join(waveDir, slotName, '_beacon.json'), null);
    const result = readJsonSafe(join(waveDir, slotName, 'result.json'), null);
    return result?.slotKey || beacon?.slot_key || slotName;
  }));
  for (const entry of dispatchEntries) {
    if (entry.key && !seenSlotKeys.has(entry.key)) {
      emitForensicFinding('provenance_chain_inconsistency', entry.key, wave, 'slot listed in dispatch.json but its slot directory is missing on disk', bundlePath, phase, gate, findings);
    }
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════════════════════
// Relay Provenance Gate Checks (RPG-001, RPG-002, RPG-004, RPG-005)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check that scoped output declaration ledger entries exist in
 * rb_output_declarations.jsonl.
 *
 * Proves delegated relay completion happened in the scoped phase.
 * Does NOT by itself prove every expected artifact/reference is covered.
 *
 * Rule config:
 *   - wave: 'wave0' | 'wave1' | 'wave2'
 *   - producer_rule (optional): filter by producer_rule field
 *   - role (optional): filter by output_files[].role
 *   - work_id_pattern (optional): regex pattern to match work_id
 *
 * @param {string} bundlePath
 * @param {object} rule — gate definition rule with scope fields
 * @returns {{ passed: boolean, inspect: string[], advice: string[], records?: object[] }}
 *
 * @impl RPG-001
 */
export function checkOutputDeclarationLedgerExists(bundlePath, rule) {
  const inspect = [];
  const advice = [];
  const declarations = readOutputDeclarations(bundlePath);

  if (declarations.length === 0) {
    return {
      passed: false,
      inspect: ['rb_output_declarations.jsonl is missing or empty — no delegated relay completions recorded'],
      advice: ['Run delegated Sub-agent tasks through the relay pipeline and complete() to populate the output declaration ledger.'],
      records: [],
    };
  }

  // Scope filter: wave
  const scoped = declarations.filter((d) => {
    if (rule.wave) {
      const waveNum = rule.wave.replace('wave', '');
      const workIdMatch = d.work_id && d.work_id.startsWith(`${rule.wave}-`);
      const pathMatch = (d.output_files || []).some((f) => f.path && f.path.includes(`/wave${waveNum}/`));
      const slotMatch = d.slot_result_ref && d.slot_result_ref.includes(`_subagents/wave_${String(waveNum).padStart(2, '0')}/`);
      if (!workIdMatch && !pathMatch && !slotMatch) return false;
    }
    if (rule.producer_rule && d.producer_rule !== rule.producer_rule) return false;
    if (rule.role) {
      const hasRole = (d.output_files || []).some((f) => f.role === rule.role);
      if (!hasRole) return false;
    }
    if (rule.work_id_pattern) {
      const re = new RegExp(rule.work_id_pattern);
      if (!re.test(d.work_id || '')) return false;
    }
    return true;
  });

  if (scoped.length === 0) {
    const scopeDesc = [];
    if (rule.wave) scopeDesc.push(`wave=${rule.wave}`);
    if (rule.producer_rule) scopeDesc.push(`producer_rule=${rule.producer_rule}`);
    const scopeStr = scopeDesc.length > 0 ? scopeDesc.join(', ') : 'any';
    return {
      passed: false,
      inspect: [`No scoped output declaration ledger entries found (${scopeStr}). Total ledger records: ${declarations.length}.`],
      advice: ['Complete delegated relay tasks for the current wave to populate scoped ledger records.'],
      records: [],
    };
  }

  return {
    passed: true,
    inspect: [`Found ${scoped.length} scoped output declaration ledger record(s).`],
    advice: [],
    records: scoped,
  };
}

/**
 * Check output declaration coverage: verify current-phase artifacts/references
 * being evaluated are declared in Engine-written rb_output_declarations.jsonl.
 *
 * Rule config:
 *   - wave: 'wave0' | 'wave1' | 'wave2'
 *   - output_selectors: { expected_from_topic_registry?, glob?, roles?, producer_rule? }
 *
 * Files found on disk but absent from matching ledger records are reported as
 * orphan/direct-written outputs and do NOT satisfy this check.
 *
 * @param {string} bundlePath
 * @param {object} rule — gate definition rule with scope + output selectors
 * @returns {{ passed: boolean, inspect: string[], advice: string[], orphans?: string[] }}
 *
 * @impl RPG-001, RPG-004
 */
export function checkOutputDeclarationCoverage(bundlePath, rule) {
  const inspect = [];
  const advice = [];
  const declarations = readOutputDeclarations(bundlePath);

  // First, determine expected outputs based on selectors
  const expectedPaths = new Set();
  const selectors = rule.output_selectors || {};

  if (selectors.expected_from_topic_registry) {
    const plan = readBundlePlan(bundlePath);
    if (plan && Array.isArray(plan.topic_registry)) {
      for (const topic of plan.topic_registry) {
        for (const template of selectors.expected_from_topic_registry) {
          expectedPaths.add(template.replace(/\{topic\}/g, topic.slug));
        }
      }
    }
  }

  if (selectors.glob) {
    for (const pattern of (Array.isArray(selectors.glob) ? selectors.glob : [selectors.glob])) {
      const matches = listMatchingBundleFiles(bundlePath, pattern);
      for (const m of matches) {
        if (m.relPath) expectedPaths.add(m.relPath);
      }
    }
  }

  // If no expected outputs (e.g., Wave2 pure synthesis with no cross-ref files),
  // coverage check vacuously passes — nothing to verify.
  if (expectedPaths.size === 0) {
    return {
      passed: true,
      inspect: ['No expected outputs to check — coverage vacuously passed (no matching files or topic outputs found).'],
      advice: [],
      orphans: [],
    };
  }

  // There ARE expected outputs — ledger must exist
  if (declarations.length === 0) {
    const orphanList = [...expectedPaths];
    return {
      passed: false,
      inspect: orphanList.map((p) => `Orphan/direct-written output not in ledger: ${p}`).concat([
        'rb_output_declarations.jsonl is missing or empty — cannot verify output coverage',
      ]),
      advice: ['Run delegated Sub-agent tasks through the relay pipeline. Files exist on disk but are not declared in the ledger.'],
      orphans: orphanList,
    };
  }

  const waveNum = (rule.wave || '').replace('wave', '');
  const scopedLedger = declarations.filter((d) => {
    if (!waveNum) return true;
    const workIdMatch = d.work_id && d.work_id.startsWith(`${rule.wave}-`);
    const pathMatch = (d.output_files || []).some((f) => f.path && f.path.includes(`/wave${waveNum}/`));
    const slotMatch = d.slot_result_ref && d.slot_result_ref.includes(`_subagents/wave_${String(waveNum).padStart(2, '0')}/`);
    if (rule.producer_rule && d.producer_rule !== rule.producer_rule) return false;
    return workIdMatch || pathMatch || slotMatch;
  });

  // Collect all declared output paths from scoped ledger
  const declaredPaths = new Set();
  for (const d of scopedLedger) {
    for (const entry of (d.output_files || [])) {
      declaredPaths.add(entry.path);
    }
  }

  // Check coverage: each expected path must be in declaredPaths
  const orphans = [];
  let allCovered = true;

  for (const expected of expectedPaths) {
    if (!declaredPaths.has(expected)) {
      allCovered = false;
      orphans.push(expected);
      inspect.push(`Orphan/direct-written output not in ledger: ${expected}`);
    }
  }

  if (orphans.length > 0) {
    advice.push('Files exist on disk but are not declared in rb_output_declarations.jsonl. These may have been written directly (bypassing relay). Re-run through delegated relay tasks to produce proper ledger coverage.');
    return { passed: false, inspect, advice, orphans };
  }

  return {
    passed: true,
    inspect: [`All ${expectedPaths.size} expected output(s) covered by ledger declarations.`],
    advice: [],
    orphans: [],
  };
}

/**
 * Check successful current-wave subagent slot binding.
 *
 * Scans only the configured wave directory (_subagents/wave_NN/slot_MM/).
 * A slot counts only with successful terminal marker:
 *   - _status.json.status === 'done'
 *   - result.json exists, parses, status === 'done'
 *
 * @param {string} bundlePath
 * @param {object} rule — gate definition rule with wave field
 * @returns {{ passed: boolean, inspect: string[], advice: string[], successfulSlots?: object[] }}
 *
 * @impl RPG-002
 */
export function checkSubagentSlotPresence(bundlePath, rule) {
  const inspect = [];
  const advice = [];

  const waveNum = (rule.wave || '').replace('wave', '');
  if (!waveNum) {
    return {
      passed: false,
      inspect: ['subagent_slot_presence rule missing wave field'],
      advice: ['Add "wave": "wave0" (or wave1/wave2) to the rule configuration.'],
    };
  }

  const waveDirName = `wave_${String(waveNum).padStart(2, '0')}`;
  const waveDir = join(bundlePath, '_subagents', waveDirName);

  if (!existsSync(waveDir) || !statSync(waveDir).isDirectory()) {
    return {
      passed: false,
      inspect: [`Subagent wave directory missing: _subagents/${waveDirName}/`],
      advice: ['Dispatch relay slots for the current wave before expecting gate pass.'],
      successfulSlots: [],
    };
  }

  let slotDirs = [];
  try {
    slotDirs = readdirSync(waveDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('slot_'))
      .map((d) => d.name);
  } catch {
    return {
      passed: false,
      inspect: [`Cannot read subagent wave directory: _subagents/${waveDirName}/`],
      advice: ['Verify the wave directory exists and is readable.'],
      successfulSlots: [],
    };
  }

  if (slotDirs.length === 0) {
    return {
      passed: false,
      inspect: [`No slot directories found in _subagents/${waveDirName}/`],
      advice: ['Dispatch relay slots for the current wave.'],
      successfulSlots: [],
    };
  }

  const successfulSlots = [];
  const failedSlots = [];

  for (const slotName of slotDirs) {
    const slotDir = join(waveDir, slotName);
    const statusPath = join(slotDir, '_status.json');
    const resultPath = join(slotDir, 'result.json');

    if (!existsSync(statusPath)) {
      failedSlots.push({ slot: slotName, reason: '_status.json missing' });
      continue;
    }

    let status;
    try {
      status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    } catch {
      failedSlots.push({ slot: slotName, reason: '_status.json unparseable' });
      continue;
    }

    if (status.status !== 'done') {
      failedSlots.push({ slot: slotName, reason: `status is '${status.status || 'unknown'}' (expected 'done')` });
      continue;
    }

    if (!existsSync(resultPath)) {
      failedSlots.push({ slot: slotName, reason: 'result.json missing' });
      continue;
    }

    let result;
    try {
      result = JSON.parse(readFileSync(resultPath, 'utf-8'));
    } catch {
      failedSlots.push({ slot: slotName, reason: 'result.json unparseable' });
      continue;
    }

    if (result.status !== 'done') {
      failedSlots.push({ slot: slotName, reason: `result.status is '${result.status || 'unknown'}' (expected 'done')` });
      continue;
    }

    successfulSlots.push({
      slot: slotName,
      slotKey: result.slotKey,
      roleAgentKey: result.roleAgentKey,
      resultPath: `_subagents/${waveDirName}/${slotName}/result.json`,
    });
  }

  if (successfulSlots.length === 0) {
    inspect.push(`No successful relay slots in _subagents/${waveDirName}/. ${failedSlots.length} slot(s) checked, all failed/pending.`);
    for (const fs of failedSlots) {
      inspect.push(`  ${fs.slot}: ${fs.reason}`);
    }
    advice.push('All relay slots for this wave failed or are incomplete. Re-dispatch and ensure successful completion.');
    return { passed: false, inspect, advice, successfulSlots: [] };
  }

  return {
    passed: true,
    inspect: [`${successfulSlots.length} successful relay slot(s) found in _subagents/${waveDirName}/.`],
    advice: [],
    successfulSlots,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Relay Bypass Suspicion Detection (RPG-005, TRW-003)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect and record relay bypass suspicion in trace and log.
 * Always-on diagnostic instrumentation — runs before emitting gate result.
 *
 * Phase-aware:
 *   Wave0/Wave1: current-wave artifacts without current-wave output
 *     declaration coverage or successful slot binding trigger suspicion.
 *   Wave2: pure synthesis/backfill artifacts do NOT trigger.
 *     Only reference/00-cross-*.md, search/gap-fill evidence, or
 *     finding-index search claims without Wave2 provenance trigger.
 *
 * @param {string} bundlePath
 * @param {string} phase — derived from gate (e.g. 'wave0', 'wave1', 'wave2')
 * @param {string} gate — gate key
 * @returns {{ suspected: boolean, artifactsFound?: string[], provenanceMissing?: string[] }}
 *
 * @impl RPG-005, TRW-003
 */
export function detectRelayBypassSuspicion(bundlePath, phase, gate) {
  try {
    const artifactsFound = [];
    const provenanceMissing = [];
    let suspected = false;

    if (phase === 'wave0' || phase === 'wave1') {
      const waveDir = `artifacts/${phase}`;
      const waveFull = join(bundlePath, waveDir);

      if (existsSync(waveFull) && statSync(waveFull).isDirectory()) {
        const waveFiles = [];
        const walkDir = (dir, base) => {
          try {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
              const rel = join(base, entry.name);
              if (entry.isFile()) waveFiles.push(rel);
              else if (entry.isDirectory()) walkDir(join(dir, entry.name), rel);
            }
          } catch { /* ignore */ }
        };
        walkDir(waveFull, waveDir);

        if (waveFiles.length > 0) {
          artifactsFound.push(...waveFiles);

          const declarations = readOutputDeclarations(bundlePath);
          const waveNum = phase.replace('wave', '');
          const wavePad = String(waveNum).padStart(2, '0');

          const hasCurrentWaveLedger = declarations.some((d) => {
            const slotMatch = d.slot_result_ref && d.slot_result_ref.includes(`_subagents/wave_${wavePad}/`);
            const pathMatch = (d.output_files || []).some((f) => f.path && f.path.includes(`/${phase}/`));
            const workIdMatch = d.work_id && d.work_id.startsWith(`${phase}-`);
            return slotMatch || pathMatch || workIdMatch;
          });

          if (!hasCurrentWaveLedger) {
            provenanceMissing.push(`No ${phase}-scoped output declaration ledger records`);
          }

          const slotDir = join(bundlePath, '_subagents', `wave_${wavePad}`);
          let hasSuccessfulSlot = false;
          if (existsSync(slotDir) && statSync(slotDir).isDirectory()) {
            try {
              const slotDirs = readdirSync(slotDir, { withFileTypes: true })
                .filter((d) => d.isDirectory() && d.name.startsWith('slot_'));
              for (const sd of slotDirs) {
                const sp = join(slotDir, sd.name, '_status.json');
                const rp = join(slotDir, sd.name, 'result.json');
                if (existsSync(sp) && existsSync(rp)) {
                  try {
                    const st = JSON.parse(readFileSync(sp, 'utf-8'));
                    const rs = JSON.parse(readFileSync(rp, 'utf-8'));
                    if (st.status === 'done' && rs.status === 'done') {
                      hasSuccessfulSlot = true;
                      break;
                    }
                  } catch { /* skip */ }
                }
              }
            } catch { /* ignore */ }
          }

          if (!hasSuccessfulSlot) {
            provenanceMissing.push(`No successful ${phase} relay slot binding`);
          }

          suspected = !hasCurrentWaveLedger || !hasSuccessfulSlot;
        }
      }
    } else if (phase === 'wave2') {
      const searchIndicators = [];

      const crossDir = join(bundlePath, 'reference');
      if (existsSync(crossDir) && statSync(crossDir).isDirectory()) {
        try {
          const crossFiles = readdirSync(crossDir).filter((f) => f.startsWith('00-cross-'));
          if (crossFiles.length > 0) {
            searchIndicators.push(...crossFiles.map((f) => `reference/${f}`));
          }
        } catch { /* ignore */ }
      }

      const findingIndexPath = join(bundlePath, 'artifacts', 'wave2', 'finding-index.yaml');
      if (existsSync(findingIndexPath)) {
        try {
          const raw = readFileSync(findingIndexPath, 'utf-8');
          const findingIndex = parseYaml(raw);
          if (findingIndex && Array.isArray(findingIndex.findings)) {
            for (const f of findingIndex.findings) {
              if (f.decision === 'exploit_search' || f.decision === 'explore_search' || f.search_required === true) {
                searchIndicators.push(`finding:${f.id || 'unknown'}`);
              }
              if (f.subagent_receipt_refs && Array.isArray(f.subagent_receipt_refs) && f.subagent_receipt_refs.length > 0) {
                searchIndicators.push(`finding:${f.id || 'unknown'}(receipts)`);
              }
            }
          }
        } catch { /* ignore */ }
      }

      if (searchIndicators.length > 0) {
        artifactsFound.push(...searchIndicators);

        const declarations = readOutputDeclarations(bundlePath);
        const hasWave2Ledger = declarations.some((d) => {
          const slotMatch = d.slot_result_ref && d.slot_result_ref.includes('_subagents/wave_02/');
          const pathMatch = (d.output_files || []).some((f) => f.path && f.path.includes('/wave2/'));
          return slotMatch || pathMatch;
        });

        if (!hasWave2Ledger) {
          provenanceMissing.push('No wave2-scoped output declaration ledger records');
        }

        const w2SlotDir = join(bundlePath, '_subagents', 'wave_02');
        let hasWave2Slot = false;
        if (existsSync(w2SlotDir) && statSync(w2SlotDir).isDirectory()) {
          try {
            for (const sd of readdirSync(w2SlotDir, { withFileTypes: true })) {
              if (!sd.isDirectory() || !sd.name.startsWith('slot_')) continue;
              const sp = join(w2SlotDir, sd.name, '_status.json');
              const rp = join(w2SlotDir, sd.name, 'result.json');
              if (existsSync(sp) && existsSync(rp)) {
                try {
                  const st = JSON.parse(readFileSync(sp, 'utf-8'));
                  const rs = JSON.parse(readFileSync(rp, 'utf-8'));
                  if (st.status === 'done' && rs.status === 'done') { hasWave2Slot = true; break; }
                } catch { /* skip */ }
              }
            }
          } catch { /* ignore */ }
        }

        if (!hasWave2Slot) provenanceMissing.push('No successful wave2 relay slot binding');
        suspected = !hasWave2Ledger || !hasWave2Slot;
      }
    }

    if (suspected) {
      try {
        const tracePath = join(bundlePath, 'rb_trace.jsonl');
        const bundle = (() => {
          try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
        })();
        const ts = new Date().toISOString();
        const traceEntry = JSON.stringify({
          ts,
          bundle,
          event: 'relay_bypass_suspected',
          kind: 'relay_bypass_suspected',
          gate,
          phase,
          artifacts_found: artifactsFound,
          provenance_missing: provenanceMissing,
        });
        appendFileSync(tracePath, traceEntry + '\n');
      } catch { /* trace write failure silently ignored */ }

      logToRun(bundlePath, 'warn', 'relay_bypass_suspected', {
        gate,
        phase,
        artifacts_found: artifactsFound.slice(0, 10),
        provenance_missing: provenanceMissing,
      });
    }

    return { suspected, artifactsFound, provenanceMissing };
  } catch {
    return { suspected: false };
  }
}
