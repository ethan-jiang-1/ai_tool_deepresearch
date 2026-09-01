// gate-helpers-attempt-audit.mjs
// Emission, attempt diagnostics, and audit writers (W3 carve). Imports the
// mid-file logger dependency directly.
// @impl GSK-005, GSK-012

import { parseArgs } from 'node:util';
import { existsSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, mkdirSync, openSync, closeSync, renameSync, rmSync } from 'node:fs';
import { join, dirname, basename, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { readGateDefinitionSnapshot } from '../../schema/contracts/gate-definition.mjs';
import { readBundleName, logToRun } from '../logger.mjs';
import { resolveNodeTransitionDetailed } from '../ask-next.mjs';
import { parseMdFrontmatter } from './gate-helpers-readers.mjs';
import { isValidCarriedTargetReceipt } from './wave-carried-target-receipts.mjs';
import { validateCompositionHandoffReceipt } from './composition-handoff.mjs';
import { continuationForGateResult } from './continuation-cue.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  projectFindingCompatibility,
} from './wave-contract-findings.mjs';
import { canonicalSectionContent } from './plan-hostfile-sections.mjs';
import {
  gateHelperFailure,
  loadManifest,
} from './gate-helpers-invocation.mjs';
import {
  writePlanProgress,
  readTraceEvents,
} from './gate-helpers-plan-progress.mjs';

export function emitGateResult(result, { bundlePath } = {}) {
  // Log early gate errors when bundle path is available
  if (bundlePath && result.check && !result.check.passed) {
    try {
      writeGateAttempt(bundlePath, result);
    } catch {
      // Audit write failure must not affect gate output
    }
  }

  // Gate output can exceed a pipe's small kernel buffer once structured hints
  // are present. Reopen stdout through /dev/stdout to obtain a blocking file
  // description, so process.exit() cannot truncate the machine-readable JSON.
  const payload = `${JSON.stringify(result, null, 2)}\n`;
  let outputFd = null;
  try {
    outputFd = openSync('/dev/stdout', 'w');
    writeFileSync(outputFd, payload);
  } catch {
    process.stdout.write(payload);
  } finally {
    if (outputFd !== null) closeSync(outputFd);
  }

  // no_transition is a normal runtime outcome (chain table intentionally sparse),
  // NOT a configuration error. Only invalid_input and config_error signal real
  // misconfiguration warranting exit code 2.
  const routingErrorKinds = ['invalid_input', 'config_error'];
  if (routingErrorKinds.includes(result.routing.kind)) {
    process.exit(2);
  }

  process.exit(result.check.passed ? 0 : 1);
}

export function readDiagnostic(bundlePath, diagnosticPath) {
  if (!diagnosticPath) return null;
  try {
    return JSON.parse(readFileSync(join(bundlePath, diagnosticPath), 'utf-8'));
  } catch {
    return null;
  }
}

export function classifyAttemptTrend({ passed, newlyPassing, stillFailing, regressed, previousFailures }) {
  if (!previousFailures) return 'first';
  if (passed) return 'converging';
  if (regressed.length > 0) return 'regressed';
  if (newlyPassing.length > 0 && stillFailing.length > 0) return 'converging';
  return 'stalled';
}

export function comparableFailuresFromDiagnostic(diagnostic) {
  if (!diagnostic) return null;
  if (Array.isArray(diagnostic.check?.failed_rule_ids)) {
    return [...new Set([
      ...diagnostic.check.failed_rule_ids,
      ...(Array.isArray(diagnostic.check?.degraded_rules) ? diagnostic.check.degraded_rules : []),
    ])].sort();
  }
  if (Array.isArray(diagnostic.failed_rule_ids)) {
    return [...new Set([
      ...diagnostic.failed_rule_ids,
      ...(Array.isArray(diagnostic.degraded_rules) ? diagnostic.degraded_rules : []),
    ])].sort();
  }
  return null;
}

export function comparableFailuresFromResult(result) {
  if (Array.isArray(result.check?.failed_rule_ids)) {
    return [...new Set([
      ...result.check.failed_rule_ids,
      ...(Array.isArray(result.check?.degraded_rules) ? result.check.degraded_rules : []),
    ])].sort();
  }
  return null;
}

export function gateAttemptWindow(events, currentNodeRef) {
  let startIndex = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.event === 'load_complete' && e.entry === currentNodeRef) {
      startIndex = i;
      break;
    }
  }
  return events.slice(startIndex + 1);
}

export function applyEngineAttemptDiagnostics(bundlePath, result, fatigueThreshold = 3) {
  try {
    const { check, inspect, advice } = result;
    const events = gateAttemptWindow(readTraceEvents(bundlePath), check.currentNodeRef)
      .filter(e => e.gate === check.gate && e.currentNodeRef === check.currentNodeRef);
    const attemptCount = events.length + 1;
    const previous = events.length > 0 ? events[events.length - 1] : null;
    const previousDiag = readDiagnostic(bundlePath, previous?.diagnostic_path);
    const previousFailures = comparableFailuresFromDiagnostic(previousDiag);
    const currentFailures = comparableFailuresFromResult(result);

    const comparable = previousFailures !== null && currentFailures !== null;
    const previousSet = new Set(comparable ? previousFailures : []);
    const currentSet = new Set(currentFailures || []);
    const newlyPassing = comparable ? [...previousSet].filter(item => !currentSet.has(item)) : [];
    const stillFailing = comparable
      ? [...currentSet].filter(item => previousSet.has(item))
      : [...currentSet];
    const regressed = comparable ? [...currentSet].filter(item => !previousSet.has(item)) : [];
    const attemptTrend = classifyAttemptTrend({
      passed: check.passed,
      newlyPassing,
      stillFailing,
      regressed,
      previousFailures: comparable ? previousFailures : null,
    });

    check.attempt_count = attemptCount;
    check.attempt_trend = attemptTrend;
    check.newly_passing = newlyPassing;
    check.still_failing = stillFailing;
    check.regressed = regressed;

    if (check.passed && attemptCount >= fatigueThreshold && check.next) {
      check.fatigue_warning = true;
      advice.push(
        `[autonomous_continuation] Gate passed after ${attemptCount} Engine-visible attempt(s). Consume check.next through enter-phase: node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle ${bundlePath} --node ${check.next}`,
        '[autonomous_continuation] Preserve this Gate verdict and follow the active rule and legal handoff. High Gate friction does not authorize framework-initiated questions, progress, or premature delivery.',
      );
    }
  } catch {
    // Diagnostics are advisory and must not change gate truth.
  }
}

export function derivePhaseFromGate(gateKey) {
  const match = (gateKey || '').match(/^(wave\d+|instantiation|setup|seed-topics|hitl1|hitl2|readiness|rerun|final)/);
  return match ? match[1] : (gateKey || 'unknown');
}

export function traceDurabilityError(error, bundlePath, result) {
  if (error?.finding) return error;
  const message = (error?.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
  const gate = result?.check?.gate || '(unknown)';
  const failure = gateHelperFailure({
    id: 'gate_attempt_trace_not_durable',
    ruleId: 'gate_attempt_trace_not_durable',
    blockingBasis: 'authority_integrity',
    surface: `${bundlePath}/rb_trace.jsonl`,
    expected: 'The formal Gate attempt is durably appended through the Engine trace writer.',
    observed: message,
    missingFact: `Gate '${gate}' could not durably record its gate_attempt trace event: ${message}`,
    repairKind: 'missing_contract',
    writeTo: `Gate attempt trace durability boundary for '${gate}'`,
    detail: `[trace_durable] FAIL: could not durably append gate_attempt trace event: ${message}`,
    repair: 'Restore the Engine-owned trace durability boundary, then rerun the same Gate; do not hand-edit trace or status authority.',
  });
  Object.assign(error, failure);
  return error;
}

export function writeGateAttempt(bundlePath, result, options = {}) {
  if (options.setupReadyStaged === true) return writeSetupReadyStagedAttempt(bundlePath, result);
  const { strictTrace = false, carriedTargetReceipt = null, compositionHandoffReceipt = null } = options;
  try {
    applyEngineAttemptDiagnostics(bundlePath, result);
    const { check, routing, inspect, advice } = result;
    const bundle = readBundleName(bundlePath);
    const phase = derivePhaseFromGate(check.gate);
    const routedWave1Pass = check.gate === 'wave1-complete' && check.passed === true && check.next != null;
    const routedHitl2Proceed = check.gate === 'hitl2-recorded'
      && check.passed === true
      && check.currentNodeRef === 'phases/phase-hitl2.md'
      && check.next === 'phases/phase-readiness.md';
    if (carriedTargetReceipt !== null && !routedWave1Pass) {
      throw new Error('carriedTargetReceipt is accepted only for a successful routed Wave1 Gate attempt');
    }
    if (routedWave1Pass && !isValidCarriedTargetReceipt(carriedTargetReceipt)) {
      throw new Error('successful routed Wave1 Gate attempt requires a valid carriedTargetReceipt');
    }
    if (compositionHandoffReceipt !== null && !routedHitl2Proceed) {
      throw new Error('compositionHandoffReceipt is accepted only for a successful routed HITL2 proceed Gate attempt');
    }
    if (routedHitl2Proceed && !validateCompositionHandoffReceipt(compositionHandoffReceipt).ok) {
      throw new Error('successful routed HITL2 proceed Gate attempt requires a valid compositionHandoffReceipt');
    }

    // 1. Precompute diagnostic path and write diagnostic BEFORE logging
    //    so run.log can include the verified diagnostic_path pointer.
    let logDetail;
    const level = check.passed ? 'info' : 'warn';

    const iso = new Date().toISOString();
    const isoFile = iso.replace(/:/g, '-');
    const diagnosticPath = `_diagnostics/gates/${isoFile}-${check.gate}.json`;

    if (!check.passed) {
      // Write failure diagnostic artifact first so we know whether it succeeded
      const diagResult = writeGateFailureDiagnostic(bundlePath, result, diagnosticPath);

      logDetail = {
        gate: check.gate, currentNodeRef: check.currentNodeRef, next: check.next,
        routing_kind: routing.kind,
        inspect: inspect.slice(0, 5), advice: advice.slice(0, 3),
        phase,
      };

      if (diagResult.ok) {
        logDetail.diagnostic_path = diagnosticPath;
      } else {
        logDetail.diagnostic_write_failed = true;
        logDetail.diagnostic_write_reason = diagResult.reason;
      }
    } else {
      // TRW-004: Write lightweight pass diagnostic
      const passDiagResult = writeGatePassDiagnostic(bundlePath, result, diagnosticPath);

      logDetail = {
        gate: check.gate, currentNodeRef: check.currentNodeRef, next: check.next,
        inspect_count: inspect.length, advice_count: advice.length,
        phase,
      };
      if (check.degraded === true) {
        logDetail.degraded = true;
        logDetail.degraded_reason = check.degraded_reason || null;
        logDetail.degraded_rules = check.degraded_rules || [];
      }
      if (passDiagResult.ok) {
        logDetail.diagnostic_path = diagnosticPath;
      }
    }

    // 2. Logger — via logToRun with unified envelope (Design D6.1)
    logToRun(bundlePath, level, 'gate_attempt', logDetail);

    // 3. Trace — structured evidence with bundle, phase, diagnostic_path (TRW-001, TRW-002)
    try {
      const tracePath = join(bundlePath, 'rb_trace.jsonl');
      const ts = new Date().toISOString();
      const traceEntry = {
        ts,
        bundle,
        event: 'gate_attempt',
        kind: 'gate_attempt',
        gate: check.gate,
        phase,
        passed: check.passed,
        currentNodeRef: check.currentNodeRef,
        next: check.next,
        inspect_count: inspect.length,
        advice_count: advice.length,
      };
      if (check.degraded === true) {
        traceEntry.degraded = true;
        traceEntry.degraded_reason = check.degraded_reason || null;
        traceEntry.degraded_rules = check.degraded_rules || [];
      }
      if (routedWave1Pass) traceEntry.carried_target_receipt = carriedTargetReceipt;
      if (routedHitl2Proceed) traceEntry.composition_handoff_receipt = compositionHandoffReceipt;
      // TRW-001: Include diagnostic_path when available
      if (logDetail.diagnostic_path) {
        traceEntry.diagnostic_path = logDetail.diagnostic_path;
      }
      appendFileSync(tracePath, JSON.stringify(traceEntry) + '\n');
    } catch (err) {
      if (strictTrace) throw traceDurabilityError(err, bundlePath, result);
      // Trace write failure silently ignored
    }

    // 4. Checkpoint manifest — durable reentry artifact (RRD-001)
    writeCheckpointManifest(bundlePath, result);
  } catch (err) {
    if (strictTrace) throw traceDurabilityError(err, bundlePath, result);
    // Audit write failure must not affect gate output
  }
}

export function setupRoutePersistenceFinding(bundlePath, result, stage, error) {
  const message = (error?.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
  return gateHelperFailure({
    id: 'setup_ready_route_persistence_failed',
    ruleId: 'setup_ready_route_persistence_failed',
    blockingBasis: 'authority_integrity',
    surface: `${bundlePath}/${stage}`,
    expected: 'One route-pending checkpoint and its bound setup-ready gate_attempt trace are durably recorded before handoff.',
    observed: message,
    missingFact: `setup-ready content rules passed, but the legal route handoff could not persist ${stage}: ${message}`,
    repairKind: 'missing_contract',
    writeTo: `Setup-ready route persistence boundary (${stage})`,
    repair: 'Restore the direct persistence boundary and rerun the same setup-ready Gate; do not hand-edit checkpoint, trace, status, or Progress authority.',
    detail: `[authority_integrity] setup-ready route persistence failed at ${stage}: ${message}`,
  });
}

export function planHashRecord(bundlePath) {
  const planPath = join(bundlePath, 'rb_plan.md');
  const bytes = readFileSync(planPath);
  const stat = statSync(planPath);
  return { sha256: createHash('sha256').update(bytes).digest('hex'), size: stat.size, mtime: stat.mtime.toISOString() };
}

export function writeSetupRoutePendingDiagnostic(bundlePath, result, gateAttemptId) {
  const iso = new Date().toISOString();
  const isoFile = iso.replace(/:/g, '-');
  const diagnosticPath = `_diagnostics/gates/${isoFile}-setup-ready-route-pending.json`;
  mkdirSync(join(bundlePath, '_diagnostics', 'gates'), { recursive: true });
  const bundle = readBundleName(bundlePath);
  writeFileSync(join(bundlePath, diagnosticPath), JSON.stringify({
    schema_version: '1.0.0',
    kind: 'setup_ready_route_pending',
    created_at: iso,
    bundle,
    gate_attempt_id: gateAttemptId,
    route_state: 'pending',
    content_evaluation_ref: {
      gate: result.check.gate,
      passed: result.check.passed,
      currentNodeRef: result.check.currentNodeRef,
      candidate_next: result.check.next,
    },
    inspect: result.inspect,
    advice: result.advice,
  }, null, 2));
  logToRun(bundlePath, 'info', 'route_pending', { gate: result.check.gate, gate_attempt_id: gateAttemptId, diagnostic_path: diagnosticPath });
  return diagnosticPath;
}

export function writeSetupRoutePendingCheckpoint(bundlePath, result, gateAttemptId) {
  const iso = new Date().toISOString();
  const isoFile = iso.replace(/:/g, '-');
  const ckptDir = join(bundlePath, '_checkpoints');
  mkdirSync(ckptDir, { recursive: true });
  const plan = planHashRecord(bundlePath);
  const manifest = {
    schema_version: '1.0.0',
    created_at: iso,
    bundle: readBundleName(bundlePath),
    trigger: 'setup_route_pending',
    gate_attempt_id: gateAttemptId,
    route_state: 'pending',
    content_evaluation_ref: {
      gate: result.check.gate,
      passed: result.check.passed,
      currentNodeRef: result.check.currentNodeRef,
      candidate_next: result.check.next,
    },
    hashes: { 'rb_plan.md': plan },
  };
  const filename = `${isoFile}-setup-ready.json`;
  writeFileSync(join(ckptDir, filename), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  return { checkpoint_ref: `_checkpoints/${filename}`, plan_sha256: plan.sha256 };
}

export function writeSetupReadyStagedAttempt(bundlePath, result) {
  const { check } = result;
  if (check?.gate !== 'setup-ready' || check.passed !== true || !check.next) {
    return { ok: false, finding: setupRoutePersistenceFinding(bundlePath, result, 'staged-input', new Error('setupReadyStaged requires a passed setup-ready result with check.next')) };
  }
  const gateAttemptId = randomUUID();
  try {
    const diagnosticPath = writeSetupRoutePendingDiagnostic(bundlePath, result, gateAttemptId);
    const progress = writePlanProgress(bundlePath, check.gate);
    const binding = writeSetupRoutePendingCheckpoint(bundlePath, result, gateAttemptId);
    const traceEntry = {
      ts: new Date().toISOString(),
      bundle: readBundleName(bundlePath),
      event: 'gate_attempt',
      kind: 'gate_attempt',
      gate: check.gate,
      phase: derivePhaseFromGate(check.gate),
      passed: true,
      currentNodeRef: check.currentNodeRef,
      next: check.next,
      inspect_count: result.inspect.length,
      advice_count: result.advice.length,
      diagnostic_path: diagnosticPath,
      gate_attempt_id: gateAttemptId,
      checkpoint_ref: binding.checkpoint_ref,
      plan_sha256: binding.plan_sha256,
    };
    appendFileSync(join(bundlePath, 'rb_trace.jsonl'), `${JSON.stringify(traceEntry)}\n`);
    return { ok: true, gate_attempt_id: gateAttemptId, checkpoint_ref: binding.checkpoint_ref, plan_sha256: binding.plan_sha256, progress };
  } catch (error) {
    return { ok: false, gate_attempt_id: gateAttemptId, finding: setupRoutePersistenceFinding(bundlePath, result, 'route_handoff', error) };
  }
}

export function writeCheckpointManifest(bundlePath, result) {
  try {
    const { check } = result;
    const iso = new Date().toISOString();
    const isoFile = iso.replace(/:/g, '-');
    const ckptDir = join(bundlePath, '_checkpoints');
    mkdirSync(ckptDir, { recursive: true });

    const bundle = (() => {
      try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
    })();

    // ── normalized_target from manifest ──
    let normalizedTarget = null;
    try {
      const manifest = loadManifest();
      const phase = manifest.phases.find(p => p.gate === check.gate);
      if (phase) {
        const phaseKey = basename(phase.node, '.md').replace(/^phase-/, '');
        normalizedTarget = {
          status_gate: (check.gate || '').replace(/-/g, '_'),
          gate_key: check.gate,
          node_ref: phase.node,
          phase_key: phaseKey,
        };
      }
    } catch { /* manifest load failure → normalized_target stays null */ }

    // ── status snapshot ──
    let statusSnapshot = null;
    try {
      const sp = join(bundlePath, 'rb_status.json');
      if (existsSync(sp)) {
        const raw = JSON.parse(readFileSync(sp, 'utf-8'));
        statusSnapshot = {
          current_gate: raw.current_gate || null,
          next_gate: raw.next_gate || null,
          state: raw.state || null,
        };
      }
    } catch { /* ignore */ }

    // ── topic registry summary ──
    let topicRegistrySummary = null;
    try {
      const pp = join(bundlePath, 'rb_plan.md');
      if (existsSync(pp)) {
        const fm = parseMdFrontmatter(readFileSync(pp, 'utf-8'));
        if (fm.topic_registry && Array.isArray(fm.topic_registry)) {
          topicRegistrySummary = {
            count: fm.topic_registry.length,
            slugs: fm.topic_registry.map(t => t.slug).filter(Boolean),
          };
        }
      }
    } catch { /* ignore */ }

    // ── queue summary ──
    let queueSummary = null;
    try {
      const qp = join(bundlePath, 'rb_queue.json');
      if (existsSync(qp)) {
        const q = JSON.parse(readFileSync(qp, 'utf-8'));
        const activeCount = Array.isArray(q.active_window) ? q.active_window.length : 0;
        const inFlightCount = q.delegated_in_flight && typeof q.delegated_in_flight === 'object'
          ? Object.keys(q.delegated_in_flight).length
          : 0;
        queueSummary = {
          queue_health: q.queue_health || null,
          active_count: activeCount,
          delegated_in_flight_count: inFlightCount,
          pool_count: Array.isArray(q.refill_pool) ? q.refill_pool.length : 0,
        };
      }
    } catch { /* ignore */ }

    // ── artifact inventory (one level deep for seed_topics/ and reference/) ──
    const artifactInventory = {};
    const shallowDirs = ['seed_topics', 'reference'];
    for (const dir of shallowDirs) {
      const dp = join(bundlePath, dir);
      if (existsSync(dp) && statSync(dp).isDirectory()) {
        try {
          artifactInventory[dir] = readdirSync(dp).filter(f => {
            try { return statSync(join(dp, f)).isFile(); } catch { return false; }
          });
        } catch { artifactInventory[dir] = []; }
      }
    }
    // Recursive for artifacts/
    const artifactsDir = join(bundlePath, 'artifacts');
    if (existsSync(artifactsDir) && statSync(artifactsDir).isDirectory()) {
      const walk = (dir, base) => {
        const result = [];
        try {
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const rel = join(base, entry.name);
            if (entry.isFile()) result.push(rel);
            else if (entry.isDirectory()) result.push(...walk(join(dir, entry.name), rel));
          }
        } catch { /* ignore */ }
        return result;
      };
      artifactInventory['artifacts'] = walk(artifactsDir, 'artifacts');
    }

    // ── cursors ──
    const cursors = {};
    const cursorFiles = {
      ledger_lines: join(bundlePath, 'rb_output_declarations.jsonl'),
      trace_lines: join(bundlePath, 'rb_trace.jsonl'),
      log_lines: join(bundlePath, '_logs', 'run.log'),
    };
    for (const [key, fp] of Object.entries(cursorFiles)) {
      try {
        if (existsSync(fp)) {
          cursors[key] = readFileSync(fp, 'utf-8').split('\n').filter(l => l.trim()).length;
        } else {
          cursors[key] = 0;
        }
      } catch { cursors[key] = -1; }
    }

    // ── hashes for control files ──
    const hashes = {};
    const controlFiles = ['rb_status.json', 'rb_queue.json', 'rb_plan.md', 'rb_profile.yaml', 'rb_output_declarations.jsonl'];
    for (const cf of controlFiles) {
      const fp = join(bundlePath, cf);
      try {
        if (existsSync(fp)) {
          const content = readFileSync(fp);
          const st = statSync(fp);
          hashes[cf] = {
            sha256: createHash('sha256').update(content).digest('hex'),
            size: st.size,
            mtime: st.mtime.toISOString(),
          };
        }
      } catch { /* skip unreadable control file */ }
    }

    // ── Write manifest ──
    const manifest = {
      schema_version: '1.0.0',
      created_at: iso,
      bundle,
      trigger: 'gate_attempt',
      gate_result_ref: {
        gate: check.gate,
        passed: check.passed,
        currentNodeRef: check.currentNodeRef,
        next: check.next,
        degraded: check.degraded === true,
      },
      normalized_target: normalizedTarget,
      status_snapshot: statusSnapshot,
      topic_registry_summary: topicRegistrySummary,
      queue_summary: queueSummary,
      artifact_inventory: artifactInventory,
      cursors,
      hashes,
    };

    const ckptPath = join(ckptDir, `${isoFile}-${check.gate}.json`);
    writeFileSync(ckptPath, JSON.stringify(manifest, null, 2));
  } catch {
    // Checkpoint write failure silently ignored — must not affect gate output
  }
}

export function writeGateFailureDiagnostic(bundlePath, result, precomputedPath = null) {
  try {
    const { check, routing, inspect, advice, hints = [] } = result;
    if (check.passed) return { ok: true }; // Only write on failure

    const iso = new Date().toISOString();
    const isoFile = iso.replace(/:/g, '-');
    const diagDir = join(bundlePath, '_diagnostics', 'gates');
    mkdirSync(diagDir, { recursive: true });

    const bundle = (() => {
      try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
    })();

    const diagnosticPath = precomputedPath || `_diagnostics/gates/${isoFile}-${check.gate}.json`;

    const diagnostic = {
      schema_version: '1.0.0',
      kind: 'gate_failure_detail',
      created_at: iso,
      bundle,
      source_event_ref: null, // filled by caller if trace entry was written first
      gate: check.gate,
      currentNodeRef: check.currentNodeRef,
      check,
      routing,
      inspect,
      advice,
      hints,
    };

    writeFileSync(join(bundlePath, diagnosticPath), JSON.stringify(diagnostic, null, 2));

    // Write compact trace pointer
    try {
      const tracePath = join(bundlePath, 'rb_trace.jsonl');
      const traceEntry = JSON.stringify({
        ts: iso,
        bundle,
        event: 'diagnostic',
        kind: 'gate_failure_detail',
        gate: check.gate,
        passed: false,
        diagnostic_path: diagnosticPath,
      });
      appendFileSync(tracePath, traceEntry + '\n');
    } catch { /* trace write failure silently ignored */ }

    return { ok: true, path: diagnosticPath };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    return { ok: false, reason: safeMsg };
  }
}

export function writeGatePassDiagnostic(bundlePath, result, precomputedPath = null) {
  try {
    const { check, routing, inspect = [], advice = [], hints = [], findings = [] } = result;
    if (!check.passed) return { ok: true }; // Only write on pass

    const iso = new Date().toISOString();
    const isoFile = iso.replace(/:/g, '-');
    const diagDir = join(bundlePath, '_diagnostics', 'gates');
    mkdirSync(diagDir, { recursive: true });

    const bundle = (() => {
      try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
    })();

    const diagnosticPath = precomputedPath || `_diagnostics/gates/${isoFile}-${check.gate}.json`;

    const diagnostic = {
      schema_version: '1.0.0',
      created_at: iso,
      bundle,
      gate: check.gate,
      passed: true,
      phase: derivePhaseFromGate(check.gate),
      degraded: check.degraded === true,
      check,
      findings,
      inspect,
      advice,
      hints,
      rules_summary: {
        currentNodeRef: check.currentNodeRef,
        next: check.next,
        routing_kind: routing.kind,
      },
    };

    writeFileSync(join(bundlePath, diagnosticPath), JSON.stringify(diagnostic, null, 2));
    return { ok: true, path: diagnosticPath };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    return { ok: false, reason: safeMsg };
  }
}
