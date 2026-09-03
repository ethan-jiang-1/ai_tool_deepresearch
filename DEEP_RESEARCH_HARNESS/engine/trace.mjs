// trace.mjs — stateless append-only JSONL trace writer
// @impl TRW-001
// Paired with schema/contracts/trace.mjs for format validation.
//
// Each instance is bound to one trace file at creation time.
// No shared state, no setTraceFile — the caller owns the file path.
//
// Usage:
//   import { createTrace } from './trace.mjs';
//   const trace = createTrace('dpt_rb_xxx/rb_trace.jsonl', { consoleEcho: true });
//   trace.traceInit('my run');
//   trace.traceEntry('check', { source: 'engine', passed: true, detail: 'ok' });
//   const summary = trace.traceSummary();
//   trace.traceCleanup();

import { appendFileSync, closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const DEFAULT_ICONS = {
  run_start: '▶',
  check: '✅',
  node_load: '📄',
  segment_load: '📄',
  node_exec: '🔧',
  segment_exec: '🔧',
};

const ANSI = {
  G: '\x1b[32m',
  R: '\x1b[31m',
  Y: '\x1b[33m',
  C: '\x1b[36m',
  B: '\x1b[0m',
};

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function fsyncPath(filePath) {
  const descriptor = openSync(filePath, constants.O_RDONLY);
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

export function appendExactTraceLine({ tracePath, lineBytes, expectedPrefixByteLength, expectedPrefixSha256, eventId, validateSuffix = null }) {
  const staged = Buffer.isBuffer(lineBytes) ? lineBytes : Buffer.from(String(lineBytes), 'utf8');
  if (staged.includes(0x0a) || staged.includes(0x0d)) throw new Error('exact trace object line must not contain CR or LF bytes');
  const current = existsSync(tracePath) ? readFileSync(tracePath) : Buffer.alloc(0);
  if (!Number.isInteger(expectedPrefixByteLength) || expectedPrefixByteLength < 0 || current.length < expectedPrefixByteLength) {
    return { ok: false, reason_code: 'trace_prefix_truncated', reason: 'Trace is shorter than the accepted prefix.' };
  }
  const prefix = current.subarray(0, expectedPrefixByteLength);
  if (sha256(prefix) !== expectedPrefixSha256) {
    return { ok: false, reason_code: 'trace_prefix_drift', reason: 'Accepted trace prefix bytes changed.' };
  }
  const suffix = current.subarray(expectedPrefixByteLength);
  const parsedSuffix = [];
  if (suffix.length > 0) {
    const suffixText = suffix.toString('utf8');
    if (!suffixText.endsWith('\n')) return { ok: false, reason_code: 'trace_suffix_malformed', reason: 'Trace suffix is not LF-terminated.' };
    for (const rawLine of suffixText.slice(0, -1).split('\n')) {
      if (!rawLine) continue;
      try {
        parsedSuffix.push({ rawLine, event: JSON.parse(rawLine) });
      } catch (error) {
        return { ok: false, reason_code: 'trace_suffix_malformed', reason: `Trace suffix contains invalid JSON: ${error.message}` };
      }
    }
  }
  const stagedSha256 = sha256(staged);
  const currentLines = current.toString('utf8').split('\n').filter(Boolean);
  for (let index = 0; index < currentLines.length; index += 1) {
    let event;
    try { event = JSON.parse(currentLines[index]); } catch { continue; }
    if (event?.event_id !== eventId) continue;
    const existingSha256 = sha256(Buffer.from(currentLines[index], 'utf8'));
    return existingSha256 === stagedSha256
      ? { ok: true, appended: false, index, line_sha256: stagedSha256 }
      : { ok: false, reason_code: 'trace_event_conflict', reason: `Trace event_id ${eventId} exists with different exact bytes.` };
  }
  if (typeof validateSuffix === 'function') {
    const baseIndex = currentLines.length - parsedSuffix.length;
    const validation = validateSuffix(parsedSuffix.map((item, offset) => ({ index: baseIndex + offset, ...item })));
    if (!validation?.ok) return validation;
  }
  mkdirSync(path.dirname(tracePath), { recursive: true });
  appendFileSync(tracePath, Buffer.concat([staged, Buffer.from('\n')]));
  fsyncPath(tracePath);
  fsyncPath(path.dirname(tracePath));
  return { ok: true, appended: true, index: currentLines.length, line_sha256: stagedSha256 };
}

/**
 * Create a trace writer instance bound to a specific trace file.
 *
 * @param {string} filePath  - path to the JSONL trace file
 * @param {Object} [options]
 * @param {boolean} [options.consoleEcho=true]  whether traceEntry() echoes colored output to console
 * @param {Object} [options.icons]              custom icon set for traceSummary(); merged onto defaults
 * @param {string} [options.writer='engine']    stable writer identity stamped on every entry (TRW-007)
 * @returns {{ traceInit, traceEntry, traceSummary, traceCleanup, traceFilePath }}
 */
export function createTrace(filePath, options = {}) {
  const { consoleEcho = true, icons: customIcons, writer = 'engine' } = options;
  const icons = { ...DEFAULT_ICONS, ...customIcons };
  const TRACE_FILE = filePath;

  function traceFilePath() {
    return TRACE_FILE;
  }

  function traceInit(label, detail = {}) {
    mkdirSync(path.dirname(TRACE_FILE), { recursive: true });
    if (existsSync(TRACE_FILE)) unlinkSync(TRACE_FILE);
    traceEntry('run_start', { source: 'trace', label, ...detail });
  }

  function traceEntry(event, detail = {}) {
    mkdirSync(path.dirname(TRACE_FILE), { recursive: true });
    // TRW-007: every entry carries the writer identity and the canonical bundle name
    // (bundle directory basename). Detail-provided `writer`/`bundle` must NOT override
    // the central stamp — callers stopped hand-stamping short-name bundles.
    const { writer: detailWriter, bundle: detailBundle, ...rest } = detail;
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      event,
      writer,
      bundle: path.basename(path.dirname(TRACE_FILE)),
      ...rest,
    });
    appendFileSync(TRACE_FILE, entry + '\n');

    if (consoleEcho) {
      const src = detail.source || '?';
      console.log(`${ANSI.G}[trace]${ANSI.B} ${ANSI.Y}${src}${ANSI.B} ${event}:`, JSON.stringify(detail));
    }
  }

  function traceSummary() {
    if (!existsSync(TRACE_FILE)) {
      return { events: [], passed: 0, failed: 0 };
    }

    const raw = readFileSync(TRACE_FILE, 'utf-8').trim();
    if (!raw) return { events: [], passed: 0, failed: 0 };

    const events = raw.split('\n').map((line) => JSON.parse(line));

    if (consoleEcho) {
      const { G, R, C, B } = ANSI;
      console.log(C + '\n══════ Trace Summary ══════' + B);

      let passed = 0, failed = 0;
      for (const e of events) {
        const icon = icons[e.event] || '•';

        let s;
        if (e.event === 'check') {
          const statusIcon = e.passed ? icons.check || '✅' : (icons.check ? '❌' : '❌');
          s = `${statusIcon} ${e.file || e.step || e.event}: ${e.passed ? 'PASS' : 'FAIL'}`;
        } else if (e.event === 'node_exec' || e.event === 'segment_exec') {
          s = `${icon} ${e.key || ''}: ${e.before || ''} → ${e.after || ''}`;
        } else {
          s = `${icon} ${e.event}: ${e.label || e.step || e.fileRef || ''}`;
        }

        if (e.event === 'load_error') {
          failed++;
          console.log(R + s + B, e.error || '');
        } else if (e.event === 'check') {
          if (e.passed) passed++; else failed++;
          console.log(e.passed ? G + s + B : R + s + B);
        } else {
          console.log(s);
        }
      }

      console.log(C + '══════════════════════════' + B);
      console.log(`${G}PASS: ${passed}${B}  ${R}FAIL: ${failed}${B}`);
    }

    const checks = events.filter((e) => e.event === 'check');
    return {
      events,
      passed: checks.filter((e) => e.passed === true).length,
      failed: checks.filter((e) => e.passed !== true).length,
    };
  }

  function traceCleanup() {
    if (existsSync(TRACE_FILE)) unlinkSync(TRACE_FILE);
  }

  return {
    traceFilePath,
    traceInit,
    traceEntry,
    traceSummary,
    traceCleanup,
  };
}
