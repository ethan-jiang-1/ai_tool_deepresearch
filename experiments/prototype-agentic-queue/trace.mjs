// trace.mjs — agentic-queue prototype trace system
// @impl AGQ-005, AGQ-006

import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

let TRACE_FILE = null;

export function setTraceFile(path) {
  TRACE_FILE = path;
}

export function getTraceFile() {
  return TRACE_FILE;
}

export function traceInit(label, detail = {}) {
  if (!TRACE_FILE) throw new Error('traceInit: call setTraceFile() first');
  mkdirSync(path.dirname(TRACE_FILE), { recursive: true });
  if (existsSync(TRACE_FILE)) unlinkSync(TRACE_FILE);
  traceEntry('run_start', { source: 'agq-trace', label, ...detail });
}

export function traceEntry(event, detail = {}) {
  if (!TRACE_FILE) return;
  mkdirSync(path.dirname(TRACE_FILE), { recursive: true });
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    source: detail.source || 'agq',
    event,
    ...detail,
  });
  appendFileSync(TRACE_FILE, `${entry}\n`);
}

export function traceSummary() {
  if (!TRACE_FILE || !existsSync(TRACE_FILE)) {
    return { events: [], passed: 0, failed: 0 };
  }
  const raw = readFileSync(TRACE_FILE, 'utf-8').trim();
  const events = raw ? raw.split('\n').map((line) => JSON.parse(line)) : [];
  const checks = events.filter((event) => event.event === 'check');
  return {
    events,
    passed: checks.filter((event) => event.passed === true).length,
    failed: checks.filter((event) => event.passed !== true).length,
  };
}

export function traceCleanup() {
  if (TRACE_FILE && existsSync(TRACE_FILE)) unlinkSync(TRACE_FILE);
}
