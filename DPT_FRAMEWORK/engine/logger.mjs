// logger.mjs — minimal structured logger
// @impl LOG-001, LOG-002, LOG-004, LOG-005, LOC-010
//
// Complementary to trace.mjs (trace = audit trail, logger = diagnostic detail).
// Logger does NOT write to rb_trace.jsonl.
//
// Usage:
//   import { createLogger } from './logger.mjs';
//
//   // Default: console only, level 'info'
//   const log = createLogger();
//   log.info('task started', { taskId: 1 });
//
//   // Advanced: console + file
//   const log = createLogger({ file: 'dpt_rb_x/_logs/run.log' });
//   log.warn('disk low', { remaining: 0 });
//
//   // With bundle: auto-includes bundle=<name> in every line
//   const log = createLogger({ file: '.../_logs/run.log', bundle: 'my-research' });
//   log.info('gate_attempt', { gate: 'wave0', passed: true });
//   // → [ts] INFO gate_attempt bundle=my-research {"gate":"wave0","passed":true}
//
//   // One-shot: write a single log line, never throws
//   logToRun(bundlePath, 'info', 'phase:wave0 START');
//
//   // Run-scoped: factory for engine hot paths
//   const log = createRunLogger(bundleDir);
//   log.info('enqueue', { work_id: 'wave0-source-foo' });
//
//   // Read bundle name from rb_status.json (single read point, never throws)
//   const bundleName = readBundleName(bundlePath);
//
//   // Silent no-op (injection pattern — caller passes null)
//   const log = null;
//   // if (log) log.info(...) — skipped silently
//
// Level hierarchy: debug < info < warn < error

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const LEVEL_LABELS = { debug: 'DEBUG', info: 'INFO', warn: 'WARN', error: 'ERROR' };

// ═══════════════════════════════════════════════════════════════════════════
// Stable diagnostic event kind registry (LOC-010)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonical registry of 12 stable diagnostic event kinds.
 *
 * These are the only allowed `kind` values for structured diagnostic events
 * emitted to `_logs/run.log` and `rb_trace.jsonl`. Engine code SHOULD use
 * these values when writing diagnostic events. The registry is documentation-
 * only — it does not enforce, but serves as the canonical reference.
 *
 * @impl LOC-010
 */
export const DIAGNOSTIC_KINDS = Object.freeze([
  'phase_start',
  'phase_end',
  'queue_enqueue',
  'queue_claim',
  'queue_complete',
  'queue_fail',
  'receipt_check',
  'ledger_append',
  'rerun_action_summary',
  'file_observability_finding',
  'file_explanation',
  'gate_failure_detail',
]);

// ═══════════════════════════════════════════════════════════════════════════
// Single read point for bundle name (Design D9)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read the bundle name from a bundle's rb_status.json.
 *
 * This is the SINGLE read point for bundle across all 5 callers:
 * logToRun, createRunLogger, writeGateAttempt, queue-manager trace wrapper,
 * and work-unit trace wrapper.
 *
 * Never throws — returns '<unknown>' on any failure (missing file,
 * unparseable JSON, missing field).
 *
 * @param {string} bundlePath — path to the bundle directory
 * @returns {string} bundle name, or '<unknown>' if unreadable
 *
 * @impl LOG-005, TRW-003
 */
export function readBundleName(bundlePath) {
  try {
    const statusPath = path.join(bundlePath, 'rb_status.json');
    if (!existsSync(statusPath)) return '<unknown>';
    const raw = readFileSync(statusPath, 'utf-8');
    const status = JSON.parse(raw);
    return status.bundle || '<unknown>';
  } catch {
    return '<unknown>';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Core logger factory
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a logger instance.
 *
 * @param {object} [options]
 * @param {'debug'|'info'|'warn'|'error'} [options.level='info'] — minimum log level
 * @param {string} [options.file] — optional file path for append output (dir auto-created)
 * @param {string} [options.bundle] — optional bundle name; when set, every log line
 *   includes `bundle=<name>` after the message (Design D6.1 unified envelope)
 * @returns {{ debug, info, warn, error }}
 *
 * @impl LOG-001, LOG-002, LOG-005
 */
export function createLogger(options = {}) {
  const level = options.level || 'info';
  const filePath = options.file || null;
  const bundle = options.bundle || null;
  const consoleEcho = options.consoleEcho !== undefined ? options.consoleEcho : true;
  const threshold = LEVELS[level] ?? LEVELS.info;

  if (filePath) {
    const dir = path.dirname(filePath);
    mkdirSync(dir, { recursive: true });
  }

  function formatMessage(lvl, msg, detail) {
    const ts = new Date().toISOString();
    const label = LEVEL_LABELS[lvl];
    // Unified envelope: [ISO8601] LEVEL msg bundle=<name> {optional JSON detail}
    let line = `[${ts}] ${label} ${msg}`;
    if (bundle) {
      line += ` bundle=${bundle}`;
    }
    if (detail !== undefined) {
      line += ` ${JSON.stringify(detail)}`;
    }
    return line;
  }

  function log(lvl, msg, detail) {
    if (LEVELS[lvl] < threshold) return;
    const line = formatMessage(lvl, msg, detail);

    // Console output — use appropriate stream (may be suppressed for CLI use)
    if (consoleEcho) {
      if (lvl === 'error') {
        console.error(line);
      } else if (lvl === 'warn') {
        console.warn(line);
      } else {
        console.log(line);
      }
    }

    // File output — append (silently recreate dir if missing)
    if (filePath) {
      try {
        appendFileSync(filePath, line + '\n');
      } catch {
        // Directory may have been removed — recreate and retry once
        try {
          const dir = path.dirname(filePath);
          mkdirSync(dir, { recursive: true });
          appendFileSync(filePath, line + '\n');
        } catch {
          // Silently ignored — diagnostics must not block caller
        }
      }
    }
  }

  return {
    debug(msg, detail) { log('debug', msg, detail); },
    info(msg, detail)  { log('info', msg, detail); },
    warn(msg, detail)  { log('warn', msg, detail); },
    error(msg, detail) { log('error', msg, detail); },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// One-shot log API (Design D6.1)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Write a single log line to _logs/run.log. File-only — no console output.
 *
 * Encapsulates: _logs/run.log path, mkdirSync, ISO8601 timestamp, bundle
 * reading from rb_status.json, unified envelope format, try/catch silence.
 * Caller only needs bundlePath — nothing else.
 *
 * Never throws — write failures are silently ignored (diagnostics must not
 * block the caller).
 *
 * @param {string} bundlePath — path to the bundle directory
 * @param {'debug'|'info'|'warn'|'error'} level — log level
 * @param {string} msg — log message (free text)
 * @param {object} [detail] — optional JSON-serializable detail
 * @returns {void}
 *
 * @impl LOG-005, LOC-007
 */
export function logToRun(bundlePath, level, msg, detail) {
  try {
    const bundle = readBundleName(bundlePath);
    const logDir = path.join(bundlePath, '_logs');
    mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'run.log');

    const ts = new Date().toISOString();
    const label = LEVEL_LABELS[level] || 'INFO';
    // Unified envelope: [ISO8601] LEVEL msg bundle=<name> {optional JSON}
    let line = `[${ts}] ${label} ${msg} bundle=${bundle}`;
    if (detail !== undefined) {
      line += ` ${JSON.stringify(detail)}`;
    }
    appendFileSync(logPath, line + '\n');
  } catch {
    // Log write failure silently ignored — diagnostics must not block caller
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Run-scoped logger factory (Design D6.1)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a logger instance bound to a bundle's _logs/run.log.
 *
 * Reads bundle name from rb_status.json automatically. The returned logger
 * instance's methods all include `bundle=<name>` in every line.
 *
 * Engine hot paths (queue-manager, work-unit lifecycle) use this at entry -
 * they only need bundleDir, nothing else.
 *
 * @param {string} bundlePath — path to the bundle directory
 * @returns {{ info, warn, error, debug }} logger instance bound to _logs/run.log
 *
 * @impl LOG-004, LOG-005, LOC-008
 */
export function createRunLogger(bundlePath) {
  const bundle = readBundleName(bundlePath);
  const logPath = path.join(bundlePath, '_logs', 'run.log');
  const log = createLogger({ file: logPath, bundle, consoleEcho: false });
  log.info('logger_ready', {
    node: process.version,
    platform: process.platform,
    framework_root: path.resolve(__dirname, '..'),
  });
  return log;
}
