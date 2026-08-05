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

import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
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

/**
 * Create a trace writer instance bound to a specific trace file.
 *
 * @param {string} filePath  - path to the JSONL trace file
 * @param {Object} [options]
 * @param {boolean} [options.consoleEcho=true]  whether traceEntry() echoes colored output to console
 * @param {Object} [options.icons]              custom icon set for traceSummary(); merged onto defaults
 * @returns {{ traceInit, traceEntry, traceSummary, traceCleanup, traceFilePath }}
 */
export function createTrace(filePath, options = {}) {
  const { consoleEcho = true, icons: customIcons } = options;
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
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...detail,
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
