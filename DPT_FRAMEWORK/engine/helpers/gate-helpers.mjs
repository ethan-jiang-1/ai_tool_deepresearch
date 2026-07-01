// gate-helpers.mjs — Shared gate CLI utilities and validation helpers
// @impl GSK-001, GSK-002, GSK-004
// Canonical engine location: DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs
//
// ## Role
// Shared helpers for gate CLI wrappers and gate-loop/gate-fork engines.
// Provides:
//   - parseGateCliArgs()          — parse --bundle, --current-node, --transitions
//   - loadGateDefinition()        — load gate definition JSON
//   - loadManifest()              — load workflow manifest
//   - validateNodeGateBinding()   — check current-node ↔ gate binding
//   - resolveRouting()            — call detailed router
//   - buildGateResult()           — construct standard { check, routing, inspect, advice }
//   - emitGateResult()            — write JSON to stdout and exit with correct code
//   - validateState()             — throw if state is not a plain object
//   - validateRules()             — throw if any rule is invalid
//   - zodErrors()                 — map ZodError issues to plain diagnostics

import { parseArgs } from 'node:util';
import { existsSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { resolveNodeTransitionDetailed } from '../ask-next.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// Gate CLI Shared Utilities
// ═══════════════════════════════════════════════════════════════════════════

// ─── CLI Argument Parsing ──────────────────────────────────────────────────

/**
 * Parse standard gate CLI arguments.
 *
 * On success returns `{ bundle, currentNode, transitions, error: null }`.
 * On failure (missing required args) returns `{ error }` with a structured
 * error ready to emit as JSON. Never calls process.exit() — the caller
 * decides how to emit the error.
 *
 * @returns {{ bundle?: string, currentNode?: string, transitions?: string, error?: { check: object, routing: object, inspect: string[], advice: string[] } | null }}
 */
export function parseGateCliArgs() {
  const { values } = parseArgs({
    options: {
      bundle: { type: 'string' },
      'current-node': { type: 'string' },
      transitions: { type: 'string' },
    },
  });

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
      error: {
        check: { passed: false, gate: '(unknown)', currentNodeRef: null, next: null },
        routing: { kind: 'invalid_input', next: null, detail: 'Missing required argument: --current-node <fileRef>' },
        inspect: ['Missing required argument: --current-node <fileRef>'],
        advice: ['Provide --current-node <fileRef> (e.g. phases/phase-wave0.md).'],
      },
    };
  }

  const transitionsPath = values.transitions
    || join(__dirname, '..', '..', 'workflows', 'transitions.chain.json');

  return {
    bundle: values.bundle,
    currentNode: values['current-node'],
    transitions: transitionsPath,
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
 * @returns {{ check: object, routing: object, inspect: string[], advice: string[] }}
 *
 * @impl GSK-002
 */
export function buildGateResult({ passed, gate, currentNodeRef, routing, inspect = [], advice = [], extraCheck = {} }) {
  const checkNext = routing.kind === 'next' ? routing.next : null;

  return {
    check: {
      passed,
      gate,
      currentNodeRef,
      next: checkNext,
      ...extraCheck,
    },
    routing,
    inspect,
    advice,
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
export function emitGateResult(result) {
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

/**
 * Write a gate attempt to both audit destinations: logger and trace.
 *
 * Logger (`_logs/run.log`): uses logToRun() with unified envelope format
 * (Design D6.1). msg fixed to 'gate_attempt'; gate-specific info (gate,
 * passed, currentNodeRef, next, inspect_count, advice_count) enters the
 * detail JSON. Writes file-only — no console output.
 *
 * Trace (`rb_trace.jsonl`): structured `gate_attempt` JSONL event with
 * `bundle` field for cross-sink stitching (Design D2).
 *
 * Write failures are silently caught — they MUST NOT affect gate output or
 * exit code.
 *
 * @param {string} bundlePath — path to the active runtime context
 * @param {object} result — gate result from buildGateResult()
 * @returns {void}
 *
 * @impl GSK-005, LOC-001, LOC-002, TRW-003
 */
export function writeGateAttempt(bundlePath, result) {
  try {
    const { check, routing, inspect, advice } = result;
    const bundle = readBundleName(bundlePath);

    // 1. Logger — via logToRun with unified envelope (Design D6.1)
    //    msg = 'gate_attempt', gate details → detail JSON
    const level = check.passed ? 'info' : 'warn';
    const logDetail = check.passed
      ? { gate: check.gate, currentNodeRef: check.currentNodeRef, next: check.next, inspect_count: inspect.length, advice_count: advice.length }
      : { gate: check.gate, currentNodeRef: check.currentNodeRef, next: check.next, routing_kind: routing.kind, inspect: inspect.slice(0, 5), advice: advice.slice(0, 3) };
    logToRun(bundlePath, level, 'gate_attempt', logDetail);

    // 2. Trace — structured evidence with bundle field (Design D2)
    try {
      const tracePath = join(bundlePath, 'rb_trace.jsonl');
      const ts = new Date().toISOString();
      const traceEntry = JSON.stringify({
        ts,
        bundle,
        event: 'gate_attempt',
        kind: 'gate_attempt',
        gate: check.gate,
        passed: check.passed,
        currentNodeRef: check.currentNodeRef,
        next: check.next,
        inspect_count: inspect.length,
        advice_count: advice.length,
      });
      appendFileSync(tracePath, traceEntry + '\n');
    } catch {
      // Trace write failure silently ignored
    }

    // 3. Checkpoint manifest — durable reentry artifact (RRD-001)
    writeCheckpointManifest(bundlePath, result);

    // 4. Gate failure diagnostic — full post-mortem on failure (RRD-004)
    if (!check.passed) {
      writeGateFailureDiagnostic(bundlePath, result);
    }
  } catch {
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
        const slots = ['slot_1_current', 'slot_2_next', 'slot_3_pending', 'slot_4_pending', 'slot_5_tail'];
        const activeCount = slots.filter(s => q[s] !== null && q[s] !== undefined).length;
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
 * @returns {void}
 *
 * @impl RRD-004
 */
export function writeGateFailureDiagnostic(bundlePath, result) {
  try {
    const { check, routing, inspect, advice } = result;
    if (check.passed) return; // Only write on failure

    const iso = new Date().toISOString();
    const isoFile = iso.replace(/:/g, '-');
    const diagDir = join(bundlePath, '_diagnostics', 'gates');
    mkdirSync(diagDir, { recursive: true });

    const bundle = (() => {
      try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
    })();

    const diagnosticPath = `_diagnostics/gates/${isoFile}-${check.gate}.json`;

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
  } catch {
    // Diagnostic write failure silently ignored — must not affect gate output
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

// ─── Markdown Frontmatter Parsing ──────────────────────────────────────────

/**
 * Parse YAML frontmatter from a Markdown string.
 *
 * Extracts the frontmatter block between `---` delimiters and parses it with
 * `parseYaml()`. YAML 1.2 is a strict superset of JSON, so JSON frontmatter
 * is parsed identically — backward compatible with existing `JSON.parse()` usage.
 *
 * @param {string} rawString — raw Markdown content
 * @returns {object} parsed frontmatter object, or `{}` if no frontmatter block found
 * @throws {Error} if frontmatter YAML syntax is invalid
 *
 * @impl FRE-003
 */
export function parseMdFrontmatter(rawString) {
  const m = rawString.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  return parseYaml(m[1]);
}

/**
 * Strip YAML frontmatter from a Markdown string and return the trimmed body.
 *
 * Inverse of `parseMdFrontmatter()`: extracts everything after the first `---`
 * frontmatter block. Only the first `---` pair (anchored to start of string)
 * is stripped — subsequent `---` in the body are left intact.
 * If no frontmatter block exists, returns the trimmed input unchanged.
 *
 * @param {string} mdContent — raw Markdown content
 * @returns {string} trimmed body content after frontmatter
 *
 * @impl SCO-012
 */
export function stripMdFrontmatter(mdContent) {
  return mdContent.replace(/^---[\s\S]*?---\n?/, '').trim();
}

/**
 * Read and parse the frontmatter of rb_plan.md in a bundle directory.
 *
 * @param {string} bundlePath — path to the bundle directory
 * @returns {object|null} parsed plan frontmatter object, or null if file is missing
 * @impl FRE-003
 */
export function readBundlePlan(bundlePath) {
  const planPath = join(bundlePath, 'rb_plan.md');
  if (!existsSync(planPath)) return null;
  const raw = readFileSync(planPath, 'utf-8');
  return parseMdFrontmatter(raw);
}

// ─── Profile Reading ─────────────────────────────────────────────────────────

/**
 * Read and parse rb_profile.yaml in a bundle directory.
 *
 * Stateless reader — each call reads from disk. Callers that evaluate
 * multiple count_floor rules should wrap with a lazy cache (same
 * pattern as `_planCache` / `_statusCache` in the gate CLIs).
 *
 * Cache safety: rb_profile.yaml is immutable after HITL1 — profile is
 * never rewritten by downstream phases. Rerun paths create a new CLI
 * process, so in-memory cache lifetime per process is correct.
 *
 * @param {string} bundlePath — path to the bundle directory
 * @returns {object|null} parsed profile object, or null if file is missing
 */
export function readBundleProfile(bundlePath) {
  const profilePath = join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(profilePath)) return null;
  const raw = readFileSync(profilePath, 'utf-8');
  try {
    const parsed = parseYaml(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Resolve a count_floor threshold from a gate rule + bundle profile.
 *
 * If `rule.threshold_source` is set, walks the profile object at the
 * `#/` path to find the dynamic threshold. Falls back to the rule's
 * hardcoded `threshold` when:
 * - `threshold_source` is absent on the rule
 * - profile is null/undefined (missing rb_profile.yaml)
 * - path does not resolve to a value in the profile
 * - resolved value is not a finite positive number (zero, negative, NaN,
 *   or non-numeric — safety: floor=0 would make any count pass vacuously)
 *
 * YAML type coercion: `parseYaml` may parse integer-like values as
 * number or string depending on YAML quoting (e.g. `12` → number 12,
 * `"12"` → string "12"). This function coerces via `Number()` so both
 * forms compare correctly against `rule.threshold` (always a number in
 * gate definition JSON).
 *
 * @param {object} rule — gate definition rule with optional `threshold_source` and required `threshold`
 * @param {object|null} profile — parsed rb_profile.yaml, or null if missing
 * @returns {number} the resolved threshold value (always a positive integer)
 */
export function resolveThreshold(rule, profile) {
  // No threshold_source → use hardcoded threshold (backward compat)
  if (!rule.threshold_source) {
    return rule.threshold;
  }

  // No profile → fallback to hardcoded threshold
  if (!profile || typeof profile !== 'object') {
    return rule.threshold;
  }

  try {
    // Parse path: "rb_profile.yaml#/research_style_params/wave0_shared_ref_floor"
    const hashIdx = rule.threshold_source.indexOf('#/');
    if (hashIdx === -1) return rule.threshold;

    const jsonPath = rule.threshold_source.slice(hashIdx + 2); // after "#/"
    if (!jsonPath) return rule.threshold;

    const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], profile);

    // Coerce: YAML may parse numbers as string or number
    const num = Number(value);
    // Safety: never use floor ≤ 0 — a zero threshold would make any
    // count pass vacuously, masking real gaps
    if (!Number.isFinite(num) || num <= 0) {
      return rule.threshold;
    }

    return num;
  } catch {
    return rule.threshold;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Gate Engine Validation Helpers (gate-loop / gate-fork)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Throw if state is not a plain object.
 */
export function validateState(state, caller) {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error(`${caller}: state 必须是普通对象 (plain dict)，不能是 null 或数组`);
  }
}

/**
 * Throw if any rule is invalid.
 * Each rule must have: key (string), say (string), and at least one of
 * schema (with safeParse) or check (function).
 */
export function validateRules(rules, caller) {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error(`${caller}: rules 必须是非空数组`);
  }
  rules.forEach((r, i) => {
    if (typeof r.key !== 'string' || r.key.length === 0) {
      throw new Error(`${caller}: rules[${i}].key 必须是非空字符串`);
    }
    if (typeof r.say !== 'string') {
      throw new Error(`${caller}: rules[${i}].say 必须是字符串`);
    }
    if (!r.schema && !r.check) {
      throw new Error(`${caller}: rules[${i}] (key="${r.key}") 必须提供 schema 或 check`);
    }
    if (r.schema && typeof r.schema.safeParse !== 'function') {
      throw new Error(`${caller}: rules[${i}].schema 必须是 Zod schema（需有 safeParse 方法）`);
    }
    if (r.check && typeof r.check !== 'function') {
      throw new Error(`${caller}: rules[${i}].check 必须是函数`);
    }
  });
}

/**
 * Map ZodError issues to plain diagnostics array.
 */
export function zodErrors(error) {
  return error.issues.map(i => ({
    field:    i.path.join('.'),
    code:     i.code,
    message:  i.message,
    received: i.received,
    expected: i.expected,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// Content Dedup Gate Check (GAC-001..005)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tokenize text for similarity comparison.
 * Chinese → bigrams; English → lowercase word tokens.
 */
export function tokenizeForSimilarity(text) {
  if (!text) return [];
  const tokens = [];
  const cjk = /\p{Script=Han}/u;
  let i = 0;
  while (i < text.length) {
    if (cjk.test(text[i])) {
      if (i + 1 < text.length && cjk.test(text[i + 1])) {
        tokens.push(text[i] + text[i + 1]);
      }
      i++;
    } else if (/[a-zA-Z]/.test(text[i])) {
      let word = '';
      while (i < text.length && /[a-zA-Z0-9]/.test(text[i])) {
        word += text[i].toLowerCase();
        i++;
      }
      if (word.length > 0) tokens.push(word);
    } else {
      i++;
    }
  }
  return tokens;
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B|. */
export function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersect = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersect.size / union.size;
}

/** Extract a named Markdown section body. */
export function extractSection(mdContent, sectionName) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`##{1,3}\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##{1,3}\\s|$)`, 'i');
  const match = mdContent.match(re);
  return match ? match[1].trim() : '';
}

/** Normalize URL: lowercase scheme+host, remove fragment, trim trailing slash. */
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase().replace(/#.*$/, '').replace(/\/+$/, '');
  }
}

export function isHomepageUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    if (path === '' || path === '/' || /\/index\.(html?|php|asp|jsp)$/i.test(path)) return true;
    const depth = path.split('/').filter(Boolean).length;
    return depth < 2;
  } catch { return false; }
}

export const REQUIRED_REFERENCE_METADATA_FIELDS = [
  'source_url',
  'acceptance_status',
  'source_type',
  'tier',
  'evidence_role',
  'trust_level',
  'why_it_matters',
  'accessed_at',
  'related_topic',
];

export const REQUIRED_REFERENCE_SECTIONS = [
  'Key Facts',
  'Core Content Capture',
  'Relevance To This Research',
  'Quotable Terms / Concepts',
  'Risks And Limitations',
];

export function parseReferenceMetadata(mdContent) {
  const beforeFirstSection = mdContent.split(/\n##\s+/)[0] || '';
  const metadata = new Map();
  for (const line of beforeFirstSection.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*([A-Za-z0-9_]+):\s*(.*)$/);
    if (match) metadata.set(match[1], match[2].trim());
  }
  return metadata;
}

export function listMatchingBundleFiles(bundlePath, target) {
  const targetDir = join(bundlePath, dirname(target));
  const pattern = basename(target);
  if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) return [];
  const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');
  return readdirSync(targetDir)
    .filter((f) => regex.test(f))
    .map((f) => ({
      relPath: join(dirname(target), f),
      absPath: join(targetDir, f),
    }));
}

export function checkReferenceFormatFiles(files) {
  const inspect = [];
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    if (content.trimStart().startsWith('---')) {
      inspect.push(`YAML frontmatter is not allowed in ${file.relPath}`);
      continue;
    }
    const metadata = parseReferenceMetadata(content);
    for (const field of REQUIRED_REFERENCE_METADATA_FIELDS) {
      if (!metadata.has(field) || !metadata.get(field)) {
        inspect.push(`Missing required metadata "${field}" in ${file.relPath}`);
      }
    }
    for (const section of REQUIRED_REFERENCE_SECTIONS) {
      if (!extractSection(content, section)) {
        inspect.push(`Missing or empty section "## ${section}" in ${file.relPath}`);
      }
    }
  }
  return { passed: inspect.length === 0, inspect };
}

export function checkReferenceSourceUrls(files) {
  const inspect = [];
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    const metadata = parseReferenceMetadata(content);
    const sourceUrl = metadata.get('source_url') || '';
    if (!sourceUrl) {
      inspect.push(`Missing metadata source_url in ${file.relPath}`);
      continue;
    }
    const urls = sourceUrl.split(';').map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      inspect.push(`Empty metadata source_url in ${file.relPath}`);
      continue;
    }
    for (const url of urls) {
      if (isHomepageUrl(url)) inspect.push(`Homepage or shallow source_url in ${file.relPath}: ${url}`);
    }
  }
  return { passed: inspect.length === 0, inspect };
}

export function checkReferenceKeyFactsMinLines(files, minLines = 5) {
  const inspect = [];
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    const keyFacts = extractSection(content, 'Key Facts');
    const bulletCount = keyFacts.split(/\r?\n/).filter((line) => /^\s*-\s+\S/.test(line)).length;
    if (bulletCount < minLines) {
      inspect.push(`Key Facts in ${file.relPath} has ${bulletCount} bullet line(s), expected at least ${minLines}`);
    }
  }
  return { passed: inspect.length === 0, inspect };
}

export function getDeclaredReferencePaths(bundlePath) {
  const declarations = readOutputDeclarations(bundlePath);
  const paths = new Set();
  for (const decl of declarations) {
    for (const entry of decl.output_files || []) {
      if (entry.role === 'reference') paths.add(entry.path);
    }
  }
  return paths;
}

export function checkReferenceLedgerCoverage(bundlePath, files) {
  const declared = getDeclaredReferencePaths(bundlePath);
  const missing = files.map((f) => f.relPath).filter((p) => !declared.has(p));
  return {
    passed: missing.length === 0,
    inspect: missing.map((p) => `Reference file is not declared in rb_output_declarations.jsonl: ${p}`),
  };
}

const SELF_REF_PATTERNS = [
  /this\s+reference\s+supplements/i,
  /this\s+document\s+provides/i,
  /this\s+file\s+contains/i,
  /本文(件|档)?(用于|提供|补充)/,
  /本参考(用于|提供|补充)/,
];

/**
 * Read output declarations from rb_output_declarations.jsonl.
 * Returns empty array if ledger doesn't exist.
 */
export function readOutputDeclarations(bundlePath) {
  const file = join(bundlePath, 'rb_output_declarations.jsonl');
  if (!existsSync(file)) return [];
  const raw = readFileSync(file, 'utf-8').trim();
  if (!raw) return [];
  return raw.split('\n').map((line) => JSON.parse(line));
}

/**
 * content_dedup gate check.
 * Reads reference inputs ONLY from rb_output_declarations.jsonl.
 * Does NOT scan reference/ directory to discover inputs.
 *
 * @param {string} bundlePath
 * @param {object} threshold - { jaccard?, url_dedup?, homepage_detect?, self_ref_detect? }
 * @returns {{ passed: boolean, inspect: string[], advice: string[] }}
 */
export function checkContentDedup(bundlePath, threshold = {}) {
  const jaccardThreshold = threshold.jaccard ?? 0.8;
  const checkUrlDedup = threshold.url_dedup !== false;
  const checkHomepage = threshold.homepage_detect !== false;
  const checkSelfRef = threshold.self_ref_detect !== false;

  const inspect = [];
  const advice = [];

  const declarations = readOutputDeclarations(bundlePath);
  if (declarations.length === 0) {
    return {
      passed: false,
      inspect: ['rb_output_declarations.jsonl is missing or empty — no completed Agent output declarations available'],
      advice: ['Run delegated Sub-agent intake through Relay and complete() to populate the declaration ledger.'],
    };
  }

  // Collect reference entries with content
  const references = [];
  for (const decl of declarations) {
    for (const entry of decl.output_files) {
      if (entry.role === 'reference') {
        const filePath = join(bundlePath, entry.path);
        let content = '';
        if (existsSync(filePath)) content = readFileSync(filePath, 'utf-8');
        references.push({
          path: entry.path,
          source_url: entry.source_url || '',
          keyFacts: extractSection(content, 'Key Facts'),
        });
      }
    }
  }

  if (references.length === 0) {
    return {
      passed: false,
      inspect: ['rb_output_declarations.jsonl contains no role=reference output declarations'],
      advice: ['Complete delegated reference-producing tasks through Relay/Queue so reference files are declared in rb_output_declarations.jsonl.'],
    };
  }

  let passed = true;

  // URL Dedup
  if (checkUrlDedup) {
    const urlMap = new Map();
    for (const ref of references) {
      if (!ref.source_url) {
        passed = false;
        inspect.push(`Missing source_url in declared reference "${ref.path}"`);
        advice.push('Every declared reference output must include a non-empty source_url.');
        continue;
      }
      const norm = normalizeUrl(ref.source_url);
      if (urlMap.has(norm)) {
        passed = false;
        inspect.push(`URL duplicate: "${ref.path}" and "${urlMap.get(norm)}" share normalized URL ${norm}`);
        advice.push('Duplicate source URL detected.');
      } else {
        urlMap.set(norm, ref.path);
      }
    }
  }

  // Homepage Detection
  if (checkHomepage) {
    for (const ref of references) {
      if (!ref.source_url) continue;
      const urls = ref.source_url.split(';').map((u) => u.trim()).filter(Boolean);
      for (const url of urls) {
        if (isHomepageUrl(url)) {
          passed = false;
          inspect.push(`Homepage URL in "${ref.path}": ${url}`);
          advice.push('Replace homepage URL with a specific article URL.');
        }
      }
    }
  }

  // Self-Referential Language
  if (checkSelfRef) {
    for (const ref of references) {
      if (!ref.keyFacts) continue;
      for (const pattern of SELF_REF_PATTERNS) {
        if (pattern.test(ref.keyFacts)) {
          passed = false;
          inspect.push(`Self-referential Key Facts in "${ref.path}"`);
          advice.push('Key Facts describes the file itself. Rewrite with factual content.');
          break;
        }
      }
    }
  }

  // Jaccard Clone Detection
  for (let i = 0; i < references.length; i++) {
    for (let j = i + 1; j < references.length; j++) {
      const kfA = references[i].keyFacts;
      const kfB = references[j].keyFacts;
      if (!kfA || !kfB) continue;
      const sim = jaccardSimilarity(tokenizeForSimilarity(kfA), tokenizeForSimilarity(kfB));
      if (sim >= jaccardThreshold) {
        passed = false;
        inspect.push(`Jaccard clone (${sim.toFixed(3)} >= ${jaccardThreshold}): "${references[i].path}" vs "${references[j].path}"`);
        advice.push('Near-duplicate Key Facts detected.');
      }
    }
  }

  return { passed, inspect, advice };
}

// ═══════════════════════════════════════════════════════════════════════════
// cache_coverage gate check (CRC-006)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verify that each role=reference declaration in the ledger has its declared
 * cache trails present and mapped. Phase 1 strategy:
 *   - Non-empty cache_trails with missing/missing-files/unmapped → fail
 *   - Empty cache_trails → warning (legacy transition gap)
 *
 * @param {string} bundlePath — absolute path to bundle root
 * @returns {{ passed: boolean, inspect: string[], advice: string[] }}
 *
 * @impl CRC-006
 */
export function checkCacheCoverage(bundlePath) {
  const declarations = readOutputDeclarations(bundlePath);
  const inspect = [];
  const advice = [];
  let passed = true;

  if (declarations.length === 0) {
    return { passed: true, inspect, advice }; // Nothing to check
  }

  for (const decl of declarations) {
    const refOutputs = (decl.output_files || []).filter(f => f.role === 'reference');
    if (refOutputs.length === 0) continue;

    const cacheTrails = decl.cache_trails || [];

    // ── Phase 1: empty cache_trails → warning only ──
    if (cacheTrails.length === 0) {
      for (const ref of refOutputs) {
        inspect.push(`[cache_coverage] WARNING (Phase 1): declaration ${decl.work_id} has empty cache_trails for reference ${ref.path} — gap will become fail in Phase 2`);
      }
      advice.push('Empty cache_trails on a reference-producing task — ensure sub-agents write _cache/ leaves and declare cache_trails in slot results.');
      continue;
    }

    // ── Non-empty: verify each trail exists with 3 files ──
    const missingTrails = [];
    const validTrails = [];
    for (const trail of cacheTrails) {
      const trailDir = join(bundlePath, trail);
      if (!existsSync(trailDir)) {
        missingTrails.push({ trail, reason: 'directory missing' });
        continue;
      }
      const missingFiles = [];
      for (const f of ['websearch.json', 'page.md', 'meta.json']) {
        if (!existsSync(join(trailDir, f))) missingFiles.push(f);
      }
      if (missingFiles.length > 0) {
        missingTrails.push({ trail, reason: `missing files: ${missingFiles.join(', ')}` });
        continue;
      }
      validTrails.push(trail);
    }

    if (missingTrails.length > 0) {
      passed = false;
      for (const mt of missingTrails) {
        inspect.push(`[cache_coverage] FAIL: declaration ${decl.work_id}: cache trail ${mt.trail} — ${mt.reason}`);
      }
      advice.push(`Cache trail(s) missing for declaration ${decl.work_id}. Re-run the delegated intake to produce complete cache leaves.`);
    }

    // ── Per-reference mapping: each reference must map to at least one valid trail ──
    for (const ref of refOutputs) {
      let mapped = false;
      for (const trail of validTrails) {
        // Try meta.json.url match
        try {
          const metaPath = join(bundlePath, trail, 'meta.json');
          if (existsSync(metaPath)) {
            const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
            if (meta.url && ref.source_url && normalizeUrl(meta.url) === normalizeUrl(ref.source_url)) {
              mapped = true;
              break;
            }
          }
        } catch { /* meta.json unreadable — skip this trail */ }

        // Try source_slug match from output_files entry
        if (ref.source_slug) {
          const trailBasename = basename(trail);
          if (trailBasename.includes(ref.source_slug)) {
            mapped = true;
            break;
          }
        }

        // Try filename qualifier match (reference filename stem vs trail slug)
        if (ref.path) {
          const refStem = basename(ref.path).replace(/\.md$/, '');
          const trailBasename = basename(trail);
          // Check if trail contains ref stem or ref stem appears in trail components
          if (trailBasename.includes(refStem) || refStem.includes(trailBasename)) {
            mapped = true;
            break;
          }
        }
      }

      if (!mapped && validTrails.length > 0) {
        passed = false;
        inspect.push(`[cache_coverage] FAIL: declaration ${decl.work_id}: reference ${ref.path} (source_url: ${ref.source_url || 'none'}) not mapped to any valid cache trail`);
        advice.push(`Reference ${ref.path} has no cache trail mapping. Ensure sub-agent includes a matching _cache/ leaf (via meta.json.url or source_slug).`);
      } else if (!mapped && validTrails.length === 0) {
        // Already reported as missing trail above — don't double-report
      }
    }
  }

  return { passed, inspect, advice };
}
