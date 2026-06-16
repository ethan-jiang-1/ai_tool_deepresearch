// @impl GAS-001, REL-001, DYS-001, CHI-001
// prototype-gate-loop: Gate routing + Repair loopback + Dynamic loading + C&I feedback

import { z } from 'zod';

// ============================================================
// Types
// ============================================================

export const GateResult = z.enum(['pass', 'fail', 'needs_repair']);

export const WorkflowState = z.object({
  current_gate: z.string(),
  ref_count: z.number().default(0),
  ref_floor: z.number().default(5),
});

// ============================================================
// Step interface
// ============================================================

export class Step {
  constructor(name, executeFn) {
    this.name = name;
    this.execute = executeFn;
  }
}

// ============================================================
// Section 1: Gate State Machine (GAS-001)
// ============================================================

const mockGateStep = new Step('mock_gate', (state) => {
  return { ...state, ref_count: state.ref_floor };
});

const mockRepairStep = new Step('mock_repair', (state) => {
  // Repair: add 1 reference per iteration
  return { ...state, ref_count: state.ref_count + 1 };
});

const transitions = new Map([
  ['pass', mockGateStep],
  ['fail', mockRepairStep],
  ['needs_repair', mockRepairStep],
]);

export function evaluate(state) {
  const s = WorkflowState.parse(state);
  if (s.ref_count >= s.ref_floor) return 'pass';
  if (s.ref_count === 0) return 'needs_repair';
  return 'fail';
}

export function gateRouter(state) {
  const result = evaluate(state);
  const step = transitions.get(result);
  if (!step) throw new Error(`No transition for: ${result}`);
  return { result, step };
}

// ============================================================
// Section 2: Repair Loop (REL-001)
// ============================================================

export function hashState(state) {
  return JSON.stringify(state);
}

export function repairLoop(state, maxIterations = 3) {
  let current = { ...state };
  let iterations = 0;
  const seen = new Set();

  for (let i = 0; i < maxIterations; i++) {
    const result = evaluate(current);
    if (result === 'pass') return { state: current, outcome: 'pass', iterations };
    if (seen.has(hashState(current))) {
      return { state: current, outcome: 'stalled', iterations };
    }
    seen.add(hashState(current));
    const { step } = gateRouter(current);
    current = step.execute(current);
    iterations++;
  }
  // Final check: state might pass after last iteration
  if (evaluate(current) === 'pass') return { state: current, outcome: 'pass', iterations };
  return { state: current, outcome: 'escalated', iterations };
}

// ============================================================
// Section 3: Dynamic Segment Loading (DYS-001)
// ============================================================

import { traceEntry } from './trace.mjs';
// 痕迹文件由测试脚本声明: setTraceFile('dpt_rb_test_gate_loop/_trace_xxx.jsonl')

export const segmentRegistry = new Map([
  ['wave0_search', new Step('wave0_search', (s) => {
    console.log('  🔍 开始搜索 official + academic 来源...');
    console.log('  结果: 3 official + 2 academic = 5 条共享参考');
    console.log('  gate: setup_ready → wave0_complete');
    traceEntry('segment_exec', { source: 'gl-segment/wave0-search', key: 'wave0_search', before: 'setup_ready', after: 'wave0_complete' });
    return { ...s, current_gate: 'wave0_complete' };
  })],
  ['wave0_audit', new Step('wave0_audit', (s) => {
    console.log('  📋 审计共享参考...');
    console.log('  floor=5, 实际=5 → PASS');
    traceEntry('segment_exec', { source: 'gl-segment/wave0-audit', key: 'wave0_audit', before: 'wave0_complete', after: 'wave0_complete' });
    return { ...s, current_gate: 'wave0_complete' };
  })],
  ['wave1_evidence', new Step('wave1_evidence', (s) => {
    console.log('  🔬 深挖独立证据...');
    console.log('  Topic 01: 4 条, Topic 02: 3 条, 独立率 70%');
    console.log('  gate: wave0_complete → wave1_complete');
    traceEntry('segment_exec', { source: 'gl-segment/wave1-evidence', key: 'wave1_evidence', before: 'wave0_complete', after: 'wave1_complete' });
    return { ...s, current_gate: 'wave1_complete' };
  })],
  ['repair_references', new Step('repair_references', (s) => {
    const before = s.ref_count;
    const after = before + 2;
    console.log('  🔧 补充参考...');
    console.log('  ref_count: ' + before + ' → ' + after);
    traceEntry('segment_exec', { source: 'gl-segment/repair-references', key: 'repair_references', before, after });
    return { ...s, ref_count: after };
  })],
]);

export function loadNextSegment(key) {
  const step = segmentRegistry.get(key);
  if (!step) throw new Error(`Unknown segment: ${key}`);
  return step;
}

/**
 * 执行 MD 中嵌入的 JS 代码块。MD 可以 import trace.mjs 并调用 traceEntry()。
 */
export function runMDCode(mdContent, state) {
  const match = mdContent.match(/```js\n([\s\S]*?)```/);
  if (!match) return;
  const code = match[1];
  // 注入 trace 函数到全局作用域，MD 代码块可以直接调用
  const fn = new Function('state', 'traceEntry', code);
  // 动态 import traceEntry 供 MD 使用
  import('./trace.mjs').then(m => fn(state, m.traceEntry));
}

/**
 * 动态加载 MD 并执行。MD 说话 → segment 做事。
 */
import { readFileSync } from 'node:fs';
export function executeMDAndRun(key, state) {
  const step = loadNextSegment(key);
  const mdPath = `experiments/prototype-gate-loop/segments-gate-loop/${key.replace(/_/g, '-')}.md`;
  const md = readFileSync(mdPath, 'utf-8');
  // MD 自己跑它的 JS 代码
  runMDCode(md, state);
  return { step, md };
}

// ============================================================
// Section 4: C&I Feedback Loop (CHI-001)
// ============================================================

export function inspectFailure(error) {
  return error.issues.map(i => ({
    field: i.path.join('.'),
    issue: i.message,
    fix: `Set ${i.path.join('.')} to a valid value`,
  }));
}

export function checkAndReflect(state, schema) {
  const result = schema.safeParse(state);
  if (result.success) return { state, passed: true };

  const diagnostic = inspectFailure(result.error);
  // Attempt auto-repair for known fields
  const repaired = { ...state };
  for (const d of diagnostic) {
    if (d.field === 'ref_count' && typeof state.ref_count !== 'number') {
      repaired.ref_count = 0;
    }
  }
  return { state: repaired, passed: false, diagnostic };
}

// ============================================================
// Convenience: full gate loop (used by Agent test playbook)
// ============================================================

export function runGateLoop(state) {
  return repairLoop(state);
}
