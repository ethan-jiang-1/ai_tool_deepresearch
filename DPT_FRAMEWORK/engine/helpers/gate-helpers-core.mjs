// gate-helpers-core.mjs — Gate CLI lifecycle: args, loading, routing, results, trace, checkpoints
// @impl GSK-001, GSK-002, GSK-004
// Canonical location: DPT_FRAMEWORK/engine/helpers/gate-helpers-core.mjs
//
// Re-exported by gate-helpers.mjs for backward compatibility.

import { parseArgs } from 'node:util';
import { existsSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { SLOT_NAMES } from '../../schema/contracts/queue-slots.mjs';
import { resolveNodeTransitionDetailed } from '../ask-next.mjs';
import { parseMdFrontmatter } from './gate-helpers-readers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// Gate CLI Shared Utilities
// ═══════════════════════════════════════════════════════════════════════════

// ─── CLI Argument Parsing ──────────────────────────────────────────────────

/**
 * Extract --attempt value from raw process.argv manually.
 * Used as fallback when parseArgs throws on ambiguous --attempt values
 * (bare flag, negative numbers, values starting with -).
 *
 * @param {string[]} argv — raw process.argv
 * @returns {string|undefined} the raw attempt value, or undefined
 */
function extractAttemptFromArgv(argv) {
  const idx = argv.indexOf('--attempt');
  if (idx === -1) return undefined;
  if (idx >= argv.length - 1) return '';
  const next = argv[idx + 1];
  // If next value looks like another option, treat as bare flag
  if (next.startsWith('-')) return '';
  return next;
}

/**
 * Parse standard gate CLI arguments.
 *
 * On success returns `{ bundle, currentNode, transitions, attempt, args, error: null }`.
 * On failure (missing required args) returns `{ error }` with a structured
 * error ready to emit as JSON. Never calls process.exit() — the caller
 * decides how to emit the error.
 *
 * @returns {{ bundle?: string, currentNode?: string, transitions?: string, attempt?: number, args?: object, error?: { check: object, routing: object, inspect: string[], advice: string[] } | null }}
 *
 * @impl GSK-006
 */
export function parseGateCliArgs() {
  // Parse known options first. We parse --attempt separately because
  // node:util parseArgs with type:'string' throws on bare flag and
  // on values starting with '-' (e.g. negative numbers). We handle
  // those as fallback-to-0 cases per GSK-006.
  let parseResult;
  try {
    parseResult = parseArgs({
      options: {
        bundle: { type: 'string' },
        'current-node': { type: 'string' },
        transitions: { type: 'string' },
        attempt: { type: 'string' },
      },
      allowPositionals: true,
      strict: false,
    });
  } catch (err) {
    // parseArgs may throw on ambiguous --attempt values (bare flag,
    // negative numbers, values starting with -). Retry without --attempt
    // by rebuilding argv with --attempt and its value removed.
    if (err.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE' ||
        err.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      const rawAttempt = extractAttemptFromArgv(process.argv);
      // Strip only --attempt from argv (not its value — the value is
      // ambiguous and should be re-interpreted by parseArgs naturally).
      const cleanedArgv = process.argv.filter(a => a !== '--attempt');
      // Re-parse with cleaned argv
      parseResult = parseArgs({
        args: cleanedArgv,
        options: {
          bundle: { type: 'string' },
          'current-node': { type: 'string' },
          transitions: { type: 'string' },
        },
        allowPositionals: true,
        strict: false,
      });
      parseResult.values.attempt = rawAttempt;
    } else {
      throw err;
    }
  }

  const { values } = parseResult;

  if (!values.bundle) {
    return {
      error: {
        check: { passed: false, gate: '(unknown)', currentNodeRef: null, next: null },
        routing: { kind: 'invalid_input', next: null, detail: 'Missing required argument: --bundle <path>' },
        inspect: ['Missing required argument: --bundle <path>'],
        advice: ['Provide --bundle <path> pointing to an active run or disposable bundle.'],
      },
    };
  }

  if (!values['current-node']) {
    return {
      bundle: values.bundle,
      error: {
        check: { passed: false, gate: '(unknown)', currentNodeRef: null, next: null },
        routing: { kind: 'invalid_input', next: null, detail: 'Missing required argument: --current-node <fileRef>' },
        inspect: ['Missing required argument: --current-node <fileRef>'],
        advice: ['Provide --current-node <fileRef> (e.g. phases/phase-wave0.md).'],
      },
    };
  }

  // Parse --attempt: Agent-reported retry hint (GSK-006)
  // Must be a base-10 non-negative integer. Fall back to 0 on:
  // missing, bare flag, empty value, unparseable, negative, non-integer.
  // IMPORTANT: when --attempt value is empty or followed by another option,
  // we must NOT consume the next option token.
  let attempt = 0;
  if (values.attempt !== undefined && values.attempt !== null) {
    if (values.attempt === '' || values.attempt === true) {
      // bare flag or --attempt followed by another option → fallback 0
      attempt = 0;
    } else {
      const parsed = Number(values.attempt);
      if (Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0) {
        attempt = parsed;
      }
      // else: unparseable/negative/non-integer → fallback 0
    }
  }

  const transitionsPath = values.transitions
    || join(__dirname, '..', '..', 'workflows', 'transitions.chain.json');

  return {
    bundle: values.bundle,
    currentNode: values['current-node'],
    transitions: transitionsPath,
    attempt,
    args: values,
    error: null,
  };
}

// ─── Gate Definition Loading ───────────────────────────────────────────────

/**
 * Load a gate definition JSON file.
 *
 * @param {string} gateKey — e.g. 'wave0-complete'
 * @returns {{ gate: string, rules: Array }}
 */
export function loadGateDefinition(gateKey) {
  const defPath = join(__dirname, '..', '..', 'schema', 'gate_definitions', `gate-${gateKey}.definition.json`);
  const raw = readFileSync(defPath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Safe wrapper around loadGateDefinition — never throws.
 * Returns `{ definition, error }` where one is always null.
 * On success, error is null and definition is the parsed gate definition.
 * On failure, definition is null and error is a valid gate result object ready to emit.
 *
 * @param {string} gateKey — e.g. 'wave0-complete'
 * @param {string|null} currentNodeRef — for the error result's check.currentNodeRef
 * @returns {{ definition?: object|null, error?: object|null }}
 */
export function tryLoadGateDefinition(gateKey, currentNodeRef = null) {
  try {
    const definition = loadGateDefinition(gateKey);
    return { definition, error: null };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    return {
      definition: null,
      error: {
        check: { passed: false, gate: gateKey, currentNodeRef, next: null },
        routing: { kind: 'config_error', next: null, detail: `Cannot load gate definition: ${safeMsg}` },
        inspect: [`Gate definition '${gateKey}' is missing or unparseable: ${safeMsg}`],
        advice: [`Verify gate-${gateKey}.definition.json exists and is valid JSON.`],
      },
    };
  }
}

/**
 * Load the workflow manifest.
 *
 * @returns {{ phases: Array, shared: Array }}
 */
export function loadManifest() {
  const manifestPath = join(__dirname, '..', '..', 'workflows', 'manifest.json');
  const raw = readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw);
}

// ─── Binding Validation ────────────────────────────────────────────────────

/**
 * Validate that the current-node fileRef is bound to the expected gate
 * according to the workflow manifest.
 *
 * Returns null on success, or an error message string on mismatch.
 *
 * @param {string} currentNodeRef — e.g. 'phases/phase-wave0.md'
 * @param {string} gateKey — e.g. 'wave0-complete'
 * @returns {string|null} error message or null if valid
 *
 * @impl GSK-004
 */
export function validateNodeGateBinding(currentNodeRef, gateKey) {
  const manifest = loadManifest();
  const phase = manifest.phases.find(p => p.node === currentNodeRef);

  if (!phase) {
    return `current-node "${currentNodeRef}" not found in manifest phases`;
  }

  if (phase.gate !== gateKey) {
    return `Gate binding mismatch: current-node "${currentNodeRef}" expects gate "${phase.gate}" but CLI is for gate "${gateKey}"`;
  }

  return null;
}

// ─── Routing Integration ───────────────────────────────────────────────────

/**
 * Call the detailed router and return the routing result.
 *
 * @param {string} transitionsPath
 * @param {string} currentNodeRef
 * @param {string} outcome — 'passed' or 'failed'
 * @param {object} [context] — caller-owned routing context
 * @returns {{ kind: string, next: string|null, detail?: string }}
 */
export function resolveRouting(transitionsPath, currentNodeRef, outcome, context = {}) {
  return resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context);
}

// ─── Result Construction ───────────────────────────────────────────────────

/**
 * Build the standard gate result object.
 *
 * @param {object} opts
 * @param {boolean} opts.passed — whether the gate check passed
 * @param {string} opts.gate — gate key
 * @param {string} opts.currentNodeRef — canonical node fileRef
 * @param {object} opts.routing — detailed router result
 * @param {string[]} [opts.inspect] — diagnostic messages
 * @param {string[]} [opts.advice] — guidance messages
 * @param {object} [opts.extraCheck] — extra fields to merge into check
 * @param {number} [opts.attemptNumber] — Agent-reported retry hint (GSK-006), default 0
 * @param {number} [opts.fatigueThreshold] — threshold for fatigue diagnostics (GSK-006), default 3
 * @returns {{ check: object, routing: object, inspect: string[], advice: string[] }}
 *
 * @impl GSK-002, GSK-006
 */
export function buildGateResult({ passed, gate, currentNodeRef, routing, inspect = [], advice = [], extraCheck = {}, attemptNumber = 0, fatigueThreshold = 3 }) {
  const checkNext = routing.kind === 'next' ? routing.next : null;

  let checkFields = {
    passed,
    gate,
    currentNodeRef,
    next: checkNext,
    ...extraCheck,
  };

  let finalAdvice = [...advice];

  // GSK-006: Fatigue diagnostics — injected when Agent-reported attemptNumber
  // reaches fatigueThreshold AND the gate did not pass. Pass + high attempt
  // count is normal (try, try, succeed). Only fail + threshold triggers.
  // IMPORTANT: advice must be stop-mode-safe — must NOT unconditionally
  // declare the current invocation is stop:no.
  if (!passed && attemptNumber >= fatigueThreshold) {
    checkFields.fatigue_warning = true;
    checkFields.step_back = true;

    finalAdvice.push(
      `[fatigue] Agent-reported retry hint (--attempt ${attemptNumber}) has reached the fatigue threshold (${fatigueThreshold}). Consider stepping back rather than retrying the same repair.`,
      '[fatigue] Re-read the phase instructions — particularly §0 (ABSOLUTE PROHIBITION) and §5 (Gate Command). Verify you are running the correct CLI and interpreting inspect/advice correctly.',
      '[fatigue] If this invocation is for a stop:no phase, remember: gate failure is not an emergency. User-facing surfacing is prohibited, including questions, progress updates, idle/no-work summaries, and A/B choices. Switch strategies, record a silent degradation, or hold in place.',
    );
  }

  return {
    check: checkFields,
    routing,
    inspect,
    advice: finalAdvice,
  };
}

// ─── Output and Exit ───────────────────────────────────────────────────────

/**
 * Emit the gate result as JSON to stdout and exit with the correct code.
 *
 * Exit code rules (GSK-002):
 *   passed=true  → exit(0)
 *   passed=false → exit(1)
 *   routing.kind is invalid_input | config_error → exit(2)
 *
 * @param {object} result — from buildGateResult()
 *
 * @impl GSK-002
 */
export function emitGateResult(result, { bundlePath } = {}) {
  // Log early gate errors when bundle path is available
  if (bundlePath && result.check && !result.check.passed) {
    try {
      writeGateAttempt(bundlePath, result);
    } catch {
      // Audit write failure must not affect gate output
    }
  }

  console.log(JSON.stringify(result, null, 2));

  // no_transition is a normal runtime outcome (chain table intentionally sparse),
  // NOT a configuration error. Only invalid_input and config_error signal real
  // misconfiguration warranting exit code 2.
  const routingErrorKinds = ['invalid_input', 'config_error'];
  if (routingErrorKinds.includes(result.routing.kind)) {
    process.exit(2);
  }

  process.exit(result.check.passed ? 0 : 1);
}

// ─── Audit Infrastructure (Logger + Trace) ──────────────────────────────────

import { readBundleName, logToRun } from '../logger.mjs';

function readDiagnostic(bundlePath, diagnosticPath) {
  if (!diagnosticPath) return null;
  try {
    return JSON.parse(readFileSync(join(bundlePath, diagnosticPath), 'utf-8'));
  } catch {
    return null;
  }
}

function classifyAttemptTrend({ passed, newlyPassing, stillFailing, regressed, previousFailures }) {
  if (!previousFailures) return 'first';
  if (passed) return 'converging';
  if (regressed.length > 0) return 'regressed';
  if (newlyPassing.length > 0 && stillFailing.length > 0) return 'converging';
  return 'stalled';
}

function comparableFailuresFromDiagnostic(diagnostic) {
  if (!diagnostic) return null;
  if (Array.isArray(diagnostic.check?.failed_rule_ids)) return diagnostic.check.failed_rule_ids;
  if (Array.isArray(diagnostic.failed_rule_ids)) return diagnostic.failed_rule_ids;
  if (Array.isArray(diagnostic.inspect)) return diagnostic.inspect;
  return null;
}

function comparableFailuresFromResult(result) {
  if (Array.isArray(result.check?.failed_rule_ids)) return result.check.failed_rule_ids;
  if (Array.isArray(result.inspect)) return result.inspect;
  return [];
}

function gateAttemptWindow(events, currentNodeRef) {
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

function applyEngineAttemptDiagnostics(bundlePath, result, fatigueThreshold = 3) {
  try {
    const { check, inspect, advice } = result;
    const events = gateAttemptWindow(readTraceEvents(bundlePath), check.currentNodeRef)
      .filter(e => e.gate === check.gate && e.currentNodeRef === check.currentNodeRef);
    const attemptCount = events.length + 1;
    const previous = events.length > 0 ? events[events.length - 1] : null;
    const previousDiag = readDiagnostic(bundlePath, previous?.diagnostic_path);
    const previousFailures = comparableFailuresFromDiagnostic(previousDiag);
    const currentFailures = comparableFailuresFromResult(result);

    const previousSet = new Set(previousFailures || []);
    const currentSet = new Set(currentFailures);
    const newlyPassing = previousFailures ? [...previousSet].filter(item => !currentSet.has(item)) : [];
    const stillFailing = previousFailures ? [...currentSet].filter(item => previousSet.has(item)) : currentFailures;
    const regressed = previousFailures ? [...currentSet].filter(item => !previousSet.has(item)) : [];
    const attemptTrend = classifyAttemptTrend({
      passed: check.passed,
      newlyPassing,
      stillFailing,
      regressed,
      previousFailures,
    });

    check.attempt_count = attemptCount;
    check.attempt_trend = attemptTrend;
    check.newly_passing = newlyPassing;
    check.still_failing = stillFailing;
    check.regressed = regressed;

    if (check.passed && attemptCount >= fatigueThreshold && check.next) {
      check.fatigue_warning = true;
      advice.push(
        `[autonomous_continuation] Gate passed after ${attemptCount} Engine-visible attempt(s). Consume check.next through enter-phase: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node ${check.next}`,
        '[autonomous_continuation] Final report delivery happens at phase-final after final artifacts are written; high gate friction does not authorize premature chat synthesis.',
      );
    }
  } catch {
    // Diagnostics are advisory and must not change gate truth.
  }
}

/**
 * Derive phase from gate name.
 * e.g. 'wave0-complete' → 'wave0', 'wave1-complete' → 'wave1'
 *
 * @param {string} gateKey — gate key from definition
 * @returns {string} phase identifier
 */
export function derivePhaseFromGate(gateKey) {
  const match = (gateKey || '').match(/^(wave\d+|instantiation|setup|seed-topics|hitl1|hitl2|readiness|rerun|final)/);
  return match ? match[1] : (gateKey || 'unknown');
}

/**
 * Write a gate attempt to both audit destinations: logger and trace.
 *
 * Logger (`_logs/run.log`): uses logToRun() with unified envelope format
 * (Design D6.1). msg fixed to 'gate_attempt'; gate-specific info (gate,
 * passed, currentNodeRef, next, inspect_count, advice_count) enters the
 * detail JSON. Writes file-only — no console output.
 *
 * Trace (`rb_trace.jsonl`): structured `gate_attempt` JSONL event with
 * `bundle`, `phase`, and `diagnostic_path` fields for cross-sink stitching
 * (Design D2, TRW-001, TRW-002).
 *
 * Write failures are silently caught by default for legacy failed/non-routing
 * attempts. Covered successful handoffs pass strictTrace=true so a non-durable
 * authoritative gate_attempt cannot be reported as a successful route.
 *
 * @param {string} bundlePath — path to the active runtime context
 * @param {object} result — gate result from buildGateResult()
 * @param {{ strictTrace?: boolean }} [options]
 * @returns {void}
 *
 * @impl GSK-005, LOC-001, LOC-002, TRW-001, TRW-002, TRW-003, TRW-004
 */
export function writeGateAttempt(bundlePath, result, options = {}) {
  const { strictTrace = false } = options;
  try {
    applyEngineAttemptDiagnostics(bundlePath, result);
    const { check, routing, inspect, advice } = result;
    const bundle = readBundleName(bundlePath);
    const phase = derivePhaseFromGate(check.gate);

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
      // TRW-001: Include diagnostic_path when available
      if (logDetail.diagnostic_path) {
        traceEntry.diagnostic_path = logDetail.diagnostic_path;
      }
      appendFileSync(tracePath, JSON.stringify(traceEntry) + '\n');
    } catch (err) {
      if (strictTrace) throw err;
      // Trace write failure silently ignored
    }

    // 4. Checkpoint manifest — durable reentry artifact (RRD-001)
    writeCheckpointManifest(bundlePath, result);
  } catch (err) {
    if (strictTrace) throw err;
    // Audit write failure must not affect gate output
  }
}

/**
 * Write a checkpoint manifest at _checkpoints/<iso>-<gate>.json after a gate attempt.
 * Called from writeGateAttempt(). Never throws — failures silently ignored.
 *
 * Manifest records schema_version, created_at, bundle, trigger, gate_result_ref,
 * normalized_target, status_snapshot, topic_registry_summary, queue_summary,
 * artifact_inventory, cursors (ledger/trace/log line counts), and hashes
 * (sha256/size/mtime for control files). No artifact content copying.
 *
 * @param {string} bundlePath
 * @param {object} result — gate result from buildGateResult()
 * @returns {void}
 *
 * @impl RRD-001
 */
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
        const activeCount = SLOT_NAMES.filter(s => q[s] !== null && q[s] !== undefined).length;
        queueSummary = {
          queue_health: q.queue_health || null,
          active_count: activeCount,
          pool_count: Array.isArray(q.refill_pool) ? q.refill_pool.length : 0,
          slot_1_status: q.slot_1_current?.status || null,
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

// ─── Gate Failure Diagnostics ─────────────────────────────────────────────

/**
 * Write full gate failure diagnostics to _diagnostics/gates/<iso>-<gate>.json.
 * Called from writeGateAttempt() when check.passed === false.
 *
 * Preserves the complete check/routing/inspect/advice for post-mortem debugging.
 * Also writes a compact trace event pointing to the diagnostic artifact so
 * rb_trace.jsonl stays lean while providing a durable pointer.
 *
 * @param {string} bundlePath
 * @param {object} result — gate result from buildGateResult()
 * @param {string} [precomputedPath] — optional precomputed diagnostic path to avoid recomputing ISO timestamp
 * @returns {{ ok: boolean, path?: string, reason?: string }}
 *
 * @impl RRD-004
 */
export function writeGateFailureDiagnostic(bundlePath, result, precomputedPath = null) {
  try {
    const { check, routing, inspect, advice } = result;
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

/**
 * Write a lightweight gate pass diagnostic to _diagnostics/gates/<iso>-<gate>.json.
 * Called from writeGateAttempt() when check.passed === true.
 *
 * Contains schema_version, created_at, bundle, gate, passed: true, and a
 * rules_summary for before/after comparison across attempts.
 *
 * @param {string} bundlePath
 * @param {object} result — gate result from buildGateResult()
 * @param {string} [precomputedPath] — optional precomputed diagnostic path
 * @returns {{ ok: boolean, path?: string, reason?: string }}
 *
 * @impl TRW-004
 */
export function writeGatePassDiagnostic(bundlePath, result, precomputedPath = null) {
  try {
    const { check, routing, inspect = [], advice = [] } = result;
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
      inspect,
      advice,
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

// ─── Plan Progress Writer ────────────────────────────────────────────────────

/**
 * Flip a gate's checkbox in rb_plan.md ## Progress section.
 *
 * Reads the plan file, finds the Progress section, and flips the line matching
 * the given gate from `- [ ]` to `- [x] <gate> (<ISO8601 ts>)`. Idempotent:
 * if already `- [x]`, updates the timestamp without duplicating. If the gate
 * is not found in the pre-populated checklist, appends a new checked line.
 *
 * Wrapped in try/catch — failure to update Progress MUST NOT affect gate
 * output or exit code.
 *
 * @param {string} bundlePath — path to the active runtime context
 * @param {string} gateName — e.g. 'setup-ready'
 * @returns {void}
 *
 * @impl PHS-006
 */
export function writePlanProgress(bundlePath, gateName) {
  try {
    const planPath = join(bundlePath, 'rb_plan.md');
    if (!existsSync(planPath)) return;
    const content = readFileSync(planPath, 'utf-8');
    const ts = new Date().toISOString();
    const checkedLine = `- [x] ${gateName} (${ts})`;
    const uncheckedPattern = `- [ ] ${gateName}`;
    const checkedPattern = `- [x] ${gateName}`;

    // Find the Progress section
    const progressMatch = content.match(/^## Progress\s*\n/m);
    if (!progressMatch) return; // No Progress section — nothing to update

    const lines = content.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(uncheckedPattern)) {
        lines[i] = checkedLine;
        found = true;
        break;
      }
      if (lines[i].includes(checkedPattern)) {
        // Already checked — update timestamp only
        lines[i] = checkedLine;
        found = true;
        break;
      }
    }

    if (!found) {
      // Gate not in pre-populated list — append
      const progressIdx = lines.findIndex(l => /^## Progress/.test(l));
      if (progressIdx >= 0) {
        // Insert after the Progress header
        lines.splice(progressIdx + 1, 0, checkedLine);
      }
    }

    writeFileSync(planPath, lines.join('\n'));
  } catch {
    // Progress write failure must not affect gate output
  }
}

// ─── Trace Reading ─────────────────────────────────────────────────────────

/**
 * Read trace events from rb_trace.jsonl, optionally filtered by event name.
 * Wave and seed-topics gate CLIs are the first to read rb_trace.jsonl
 * (pre-research gates only wrote to it). This shared reader avoids
 * duplicating JSONL parsing across 4 CLIs (3 wave + 1 seed-topics).
 *
 * @param {string} bundlePath — path to the active runtime context
 * @param {string|null} eventName — if provided, only return events matching this name
 * @returns {object[]}
 */
export function readTraceEvents(bundlePath, eventName = null) {
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  const raw = readFileSync(tracePath, 'utf-8').trim();
  if (!raw) return [];
  const events = raw.split('\n').map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  if (eventName) return events.filter(e => e.event === eventName);
  return events;
}
