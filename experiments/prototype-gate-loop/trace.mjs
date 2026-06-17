// trace.mjs — 实验痕迹系统
// 全局声明活跃 trace 文件: setTraceFile('dpt_rb_test_gate_loop/_trace_gate_loop.jsonl')
// 所有 trace*() 函数自动写往该文件
// source 参数由调用方显式传递，不做全局推断

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
  // Echo to console — source must be in detail
  const G = '\x1b[32m', Y = '\x1b[33m', B = '\x1b[0m';
  const src = detail.source || '?';
  console.log(`${G}[trace]${B} ${Y}${src}${B} ${event}:`, JSON.stringify(detail));
}

export function traceSummary() {
  if (!existsSync(TRACE_FILE)) return 'No trace file found.';
  const lines = readFileSync(TRACE_FILE, 'utf-8').trim().split('\n');
  const events = lines.map(JSON.parse);

  const G = '\x1b[32m', R = '\x1b[31m', C = '\x1b[36m', B = '\x1b[0m';
  console.log(C + '\n══════ 运行痕迹 ══════' + B);

  let passed = 0, failed = 0;
  for (const e of events) {
    const icon = e.event === 'run_start' ? '▶' :
                 e.event === 'check' ? (e.passed ? '✅' : '❌') :
                 e.event === 'node_load' || e.event === 'segment_load' ? '📄' :
                 e.event === 'node_exec' || e.event === 'segment_exec' ? '🔧' :
                 e.event === 'verify' ? (e.passed ? '🟢' : '🔴') : '•';
    const s = e.event === 'check' || e.event === 'verify'
      ? `${icon} ${e.file || e.step}: ${e.passed ? 'PASS' : 'FAIL'}`
      : (e.event === 'node_exec' || e.event === 'segment_exec')
        ? `${icon} ${e.key}: ${e.before} → ${e.after}`
        : `${icon} ${e.event}: ${e.label || ''}`;

    if (e.event === 'check' || e.event === 'verify') {
      if (e.passed) passed++; else failed++;
      console.log(e.passed ? G + s + B : R + s + B);
    } else {
      console.log(s);
    }
  }
  console.log(C + '═══════════════════════' + B);
  console.log(`${G}PASS: ${passed}${B}  ${R}FAIL: ${failed}${B}`);

  return { events, passed, failed };
}

export function traceCleanup() {
  if (existsSync(TRACE_FILE)) unlinkSync(TRACE_FILE);
}
