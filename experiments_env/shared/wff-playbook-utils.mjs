// wff-playbook-utils.mjs — workflow-foundation shared experiment utilities: recordCheck, verdict, cleanup
// Pure functions only: no gate CLI calls, no bundle creation, no phase sequencing.
// Trace writing delegates to the canonical DPT_FRAMEWORK/engine/trace.mjs.
//
// Usage from playbook inline node -e:
//   node -e "import('.../_driver-lib.mjs').then(m => m.recordCheck('...', {...}))"
//   node -e "import('.../_driver-lib.mjs').then(m => m.verdict('...'))"
//   node -e "import('.../_driver-lib.mjs').then(m => m.cleanup('...'))"

import { appendFileSync, existsSync, readFileSync, rmSync } from 'node:fs';

const G = '\x1b[32m';
const R = '\x1b[31m';
const B = '\x1b[0m';

/**
 * Append a check event to rb_trace.jsonl using the canonical trace event format.
 * Does NOT use createTrace() because traceInit would clear the file — playbooks
 * append incrementally across multiple steps. Format is kept consistent with
 * DPT_FRAMEWORK/engine/trace.mjs traceEntry() output.
 *
 * @param {string} tracePath - path to rb_trace.jsonl
 * @param {{ gate: string, passed: boolean, expected?: boolean, detail?: string }} checkEvent
 *   expected defaults to true. Set expected: false for boundary tests where the gate
 *   is supposed to reject bad input (passed: false is the correct behavior).
 */
export function recordCheck(tracePath, checkEvent) {
  const expected = checkEvent.expected !== undefined ? checkEvent.expected : true;
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    event: 'check',
    source: 'playbook',
    gate: checkEvent.gate,
    passed: checkEvent.passed,
    expected,
    detail: checkEvent.detail || '',
  });
  appendFileSync(tracePath, entry + '\n');
}

/**
 * Parse rb_trace.jsonl, count check events, exit(1) if any unexpected failure found.
 * Console output uses ANSI color: green PASS, red FAIL.
 *
 * A check is a "failure" when passed !== expected (expected defaults to true).
 * Boundary tests set expected: false on checks where the gate is supposed to reject
 * bad input — those don't count as failures.
 *
 * @param {string} tracePath - path to rb_trace.jsonl
 * @param {'all'|'last'} [mode='all'] — 'all': any unexpected fail = FAIL; 'last': only last check per gate matters
 */
export function verdict(tracePath, mode = 'all') {
  if (!existsSync(tracePath)) {
    console.log(`${R}FAIL${B}: trace file not found: ${tracePath}`);
    process.exit(1);
  }

  const lines = readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean);
  const allChecks = lines
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(e => e && e.event === 'check');

  if (allChecks.length === 0) {
    console.log(`${R}FAIL${B}: no check events in trace`);
    process.exit(1);
  }

  // expected defaults to true for backward compat
  for (const c of allChecks) {
    if (c.expected === undefined) c.expected = true;
  }

  let failChecks;
  if (mode === 'last') {
    // Only the last check per gate matters (for repair-loop playbooks)
    const lastPerGate = new Map();
    for (const c of allChecks) lastPerGate.set(c.gate || '', c);
    failChecks = [...lastPerGate.values()].filter(c => c.passed !== c.expected);
  } else {
    failChecks = allChecks.filter(c => c.passed !== c.expected);
  }

  const passed = allChecks.filter(c => c.passed === c.expected).length;
  const failed = allChecks.filter(c => c.passed !== c.expected).length;

  console.log(`Checks: ${passed} passed, ${failed} failed (${allChecks.length} total, verdict mode: ${mode})`);

  if (failChecks.length > 0) {
    console.log(`${R}FAIL${B}`);
    for (const c of failChecks) {
      const expectTag = c.expected === false ? ' [expected:false]' : '';
      console.log(`  [FAIL] gate=${c.gate} detail=${c.detail || ''}${expectTag}`);
    }
    process.exit(1);
  }

  console.log(`${G}PASS${B}`);
}

/**
 * Remove a disposable bundle directory.
 * @param {string} bundlePath
 */
export function cleanup(bundlePath) {
  if (existsSync(bundlePath)) {
    rmSync(bundlePath, { recursive: true, force: true });
    console.log(`Cleaned up: ${bundlePath}`);
  }
}
