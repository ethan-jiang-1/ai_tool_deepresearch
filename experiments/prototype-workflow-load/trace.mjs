// trace.mjs — workflow-load 实验痕迹系统
// 复用 gate-loop/gate-fork API，trace source 前缀使用 wl-
// @impl WLO-001, AGT-004
//
// 用法:
//   setTraceFile('dpt_rb_test_wl_simple/_trace_wl_simple.jsonl')
//   traceInit('workflow-load simple test')
//   traceEntry('advance_start', { source: 'wl-advance', step: 'entry.md' })
//   traceSummary()
//   traceCleanup()

import { appendFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';

let TRACE_FILE = null;

export function setTraceFile(path) {
  TRACE_FILE = path;
}

export function getTraceFile() {
  return TRACE_FILE;
}

export function traceInit(label, detail = {}) {
  if (!TRACE_FILE) throw new Error('traceInit: call setTraceFile() first');
  if (existsSync(TRACE_FILE)) unlinkSync(TRACE_FILE);
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    event: 'run_start',
    label,
    ...detail,
  });
  appendFileSync(TRACE_FILE, entry + '\n');
}

export function traceEntry(event, detail = {}) {
  if (!TRACE_FILE) return; // silent if not initialized
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...detail,
  });
  appendFileSync(TRACE_FILE, entry + '\n');
  // Echo to console
  const G = '\x1b[32m', Y = '\x1b[33m', B = '\x1b[0m';
  const src = detail.source || '?';
  console.log(`${G}[trace]${B} ${Y}${src}${B} ${event}:`, JSON.stringify(detail));
}

export function traceSummary() {
  if (!TRACE_FILE || !existsSync(TRACE_FILE)) return 'No trace file found.';
  const lines = readFileSync(TRACE_FILE, 'utf-8').trim().split('\n');
  const events = lines.map(JSON.parse);

  const C = '\x1b[36m', G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[0m';
  console.log(C + '\n══════ Workflow Load Trace ══════' + B);

  let passed = 0, failed = 0;
  for (const e of events) {
    const icon =
      e.event === 'run_start' ? '▶' :
      e.event === 'advance_start' ? '▶' :
      e.event === 'advance_complete' ? '✅' :
      e.event === 'file_read' ? '📄' :
      e.event === 'cache_hit' ? '💾' :
      e.event === 'dependency_resolved' ? '🔗' :
      e.event === 'file_executed' ? '🔧' :
      e.event === 'no_code_block' ? '📝' :
      e.event === 'load_error' ? '❌' :
      e.event === 'check' ? (e.passed ? '✅' : '❌') : '•';
    const s = `${icon} ${e.event}: ${e.step || e.fileRef || e.label || ''}`;

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
  console.log(C + '═══════════════════════════════' + B);
  console.log(`${G}PASS: ${passed}${B}  ${R}FAIL: ${failed}${B}`);

  return { events, passed, failed };
}

export function traceCleanup() {
  if (TRACE_FILE && existsSync(TRACE_FILE)) unlinkSync(TRACE_FILE);
}
