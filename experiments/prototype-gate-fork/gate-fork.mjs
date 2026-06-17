// @impl GAF-001, COS-001, FOR-001, CHI-002
// prototype-gate-fork: Gate fork routing (1→N) + Conditional branches + Converge repair

import { z } from 'zod';

// ============================================================
// Types
// ============================================================

export const Branch = z.enum(['pass', 'fail_a', 'fail_b', 'blocked']);

export const WorkflowState = z.object({
  current_gate: z.string(),
  ref_count: z.number().default(0),
  ref_floor: z.number().default(5),
  topicReadiness: z.enum(['ready', 'not_ready', 'blocked']).default('ready'),
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
// Section 1: Gate Fork Router (GAF-001)
// ============================================================

/**
 * Multi-dimensional branch evaluation with priority:
 *   blocked > fail_b (topic) > fail_a (reference) > pass
 *
 * Real deep research Gate audit scenarios:
 *   - pass:      all criteria met → advance to next wave
 *   - fail_a:    reference count below floor → supplement references
 *   - fail_b:    topic readiness not ready → repair topic decomposition
 *   - blocked:   human intervention required → stop and wait
 */
export function evaluateBranch(state) {
  const s = WorkflowState.parse(state);
  if (s.topicReadiness === 'blocked') return 'blocked';
  if (s.topicReadiness !== 'ready') return 'fail_b';
  if (s.ref_count < s.ref_floor) return 'fail_a';
  return 'pass';
}

// Branch Steps defined in Section 2, but declared here for forkMap
const passStep = new Step('pass_branch', (s) => {
  return { ...s, current_gate: 'wave_next' };
});

const failAStep = new Step('fail_a_branch', (s) => {
  return { ...s, topicRepairAttempted: true };
});

const failBStep = new Step('fail_b_branch', (s) => {
  return { ...s, ref_count: s.ref_count + 1 };
});

const blockedStep = new Step('blocked_branch', (s) => {
  return { ...s, current_gate: 'blocked_hitl' };
});

/**
 * Explicit Map<Branch, Step> transition table.
 * Adding a new branch (e.g., fail_c) requires only one line here + one Step definition.
 */
const forkMap = new Map([
  ['pass',    passStep],
  ['fail_a',  failAStep],
  ['fail_b',  failBStep],
  ['blocked', blockedStep],
]);

/**
 * Route state to the correct branch Step.
 * Returns { branch, step } so callers can inspect the routing decision.
 */
export function forkRouter(state) {
  const branch = evaluateBranch(state);
  const step = forkMap.get(branch);
  if (!step) throw new Error(`No fork for: ${branch}`);
  return { branch, step };
}

// ============================================================
// Section 2: Conditional Branch Segments (COS-001)
// ============================================================

export { passStep, failAStep, failBStep, blockedStep };

// ============================================================
// Section 3: Fork + Repair Converge (FOR-001)
// ============================================================

export function hashState(state) {
  return JSON.stringify(state);
}

/**
 * Shared repair step: handles BOTH reference shortage AND topic readiness issues.
 * Multiple fail branches (fail_a, fail_b) converge here.
 *
 * - If ref_count < ref_floor → add 2 references
 * - If topicReadiness is not 'ready' (and not 'blocked') → set to 'ready'
 */
export const sharedRepairStep = new Step('shared_repair', (s) => {
  const repaired = { ...s };
  if (repaired.ref_count < repaired.ref_floor) {
    repaired.ref_count = Math.min(repaired.ref_count + 2, repaired.ref_floor);
  }
  if (repaired.topicReadiness !== 'ready' && repaired.topicReadiness !== 'blocked') {
    repaired.topicReadiness = 'ready';
  }
  traceEntry('node_exec', { source: 'gf-node/shared-repair', key: 'shared_repair', branch: 'converge', before: s.ref_count, after: repaired.ref_count });
  return repaired;
});

/**
 * Converge repair: multiple fail branches → shared repair → re-enter Gate for re-evaluation.
 *
 * Includes stall detection (state hash unchanged across iterations) and maxIterations guard.
 * After repair completes, state re-enters evaluateBranch(). The gate MAY route to a different
 * branch than the original failure (e.g., fail_a → repair → pass).
 *
 * @param {object} state - WorkflowState
 * @param {number} maxIterations - default 3
 * @returns {{ state, outcome, iterations }}
 */
export function convergeRepair(state, maxIterations = 3) {
  let current = { ...state };
  const seen = new Set();

  for (let i = 0; i < maxIterations; i++) {
    const branch = evaluateBranch(current);
    // Terminal branches: exit converge
    if (branch === 'pass' || branch === 'blocked') {
      return { state: current, outcome: branch, iterations: i };
    }
    // Stall detection: same state hash twice → no progress
    const h = hashState(current);
    if (seen.has(h)) {
      return { state: current, outcome: 'stalled', iterations: i };
    }
    seen.add(h);
    // Shared repair: addresses both reference and topic issues
    current = sharedRepairStep.execute(current);
  }
  // Final evaluation after max iterations
  const finalBranch = evaluateBranch(current);
  return { state: current, outcome: finalBranch, iterations: maxIterations };
}

// ============================================================
// Section 4: Dynamic Node Loading (DYS-001 pattern, fork variant)
// ============================================================

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { traceEntry } from './trace.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const nodeRegistry = new Map([
  ['pass_next_wave', new Step('pass_next_wave', (s) => {
    console.log('  🚀 Pass branch: 前进到下一 wave...');
    console.log(`  gate: ${s.current_gate} → wave_next`);
    traceEntry('node_exec', { source: 'gf-node/pass-next-wave', key: 'pass_next_wave', branch: 'pass', before: s.current_gate, after: 'wave_next' });
    return { ...s, current_gate: 'wave_next' };
  })],
  ['fail_a_topic_repair', new Step('fail_a_topic_repair', (s) => {
    console.log('  🔧 Fail-A: 话题分解修复...');
    console.log(`  topicReadiness: ${s.topicReadiness} → ready`);
    traceEntry('node_exec', { source: 'gf-node/fail-a-topic-repair', key: 'fail_a_topic_repair', branch: 'fail_a', before: s.topicReadiness, after: 'ready' });
    return { ...s, topicReadiness: 'ready', topicRepairAttempted: true };
  })],
  ['fail_b_reference_repair', new Step('fail_b_reference_repair', (s) => {
    const before = s.ref_count;
    const after = before + 1;
    console.log('  📚 Fail-B: 补充参考...');
    console.log(`  ref_count: ${before} → ${after}`);
    traceEntry('node_exec', { source: 'gf-node/fail-b-reference-repair', key: 'fail_b_reference_repair', branch: 'fail_b', before, after });
    return { ...s, ref_count: after };
  })],
  ['shared_repair', sharedRepairStep],
  ['blocked_escalate', new Step('blocked_escalate', (s) => {
    console.log('  🛑 Blocked: 人工阻塞，停止执行...');
    console.log(`  gate: ${s.current_gate} → blocked_hitl`);
    traceEntry('node_exec', { source: 'gf-node/blocked-escalate', key: 'blocked_escalate', branch: 'blocked', before: s.current_gate, after: 'blocked_hitl' });
    return { ...s, current_gate: 'blocked_hitl' };
  })],
]);

export function loadNextNode(key) {
  const step = nodeRegistry.get(key);
  if (!step) throw new Error(`Unknown node: ${key}`);
  return step;
}

const CODE_BLOCK_RE = /```(?:js|javascript)\s*\n([\s\S]*?)```/;

/**
 * Read and display MD content for a node, then run embedded JS trace code.
 * traceEntry already imported at module level — synchronous, no sleep needed.
 */
export function runMDCode(mdContent, state) {
  const match = mdContent.match(CODE_BLOCK_RE);
  if (!match) return;
  const code = match[1];
  const fn = new Function('state', 'traceEntry', code);
  fn(state, traceEntry);
}

export function executeMDAndRun(key, state) {
  const step = loadNextNode(key);
  const NODES_DIR = process.env.NODES_DIR || join(__dirname, 'nodes-gate-fork');
  const mdPath = join(NODES_DIR, `${key.replace(/_/g, '-')}.md`);
  const md = readFileSync(mdPath, 'utf-8');
  runMDCode(md, state);
  return { step, md };
}

// ============================================================
// Section 5: C&I Feedback Loop (CHI-002, fork variant)
// ============================================================

/**
 * Check state with Zod safeParse. On failure, generate structured diagnostics.
 * Returns { passed, errors?, diagnostics? }
 *
 * Fork variant: validates topicReadiness in addition to gate-loop fields.
 */
export function checkAndReflect(state, schema = WorkflowState) {
  const result = schema.safeParse(state);
  if (result.success) {
    return { passed: true };
  }
  const diagnostics = inspectFailure(result.error);
  return { passed: false, errors: result.error, diagnostics };
}

/**
 * Convert ZodError into structured diagnostics.
 * Each diagnostic: { field, issue, fix } — actionable by repair agents.
 */
export function inspectFailure(zodError) {
  return zodError.issues.map((issue) => {
    const field = issue.path.join('.');
    const received = JSON.stringify(issue.received);
    const expected = issue.expected ? JSON.stringify(issue.expected) : 'valid value';

    let fix;
    switch (issue.code) {
      case 'invalid_type':
        fix = `Set ${field} to type ${expected} (received ${received})`;
        break;
      case 'invalid_enum_value':
        fix = `Set ${field} to one of: ${expected} (received ${received})`;
        break;
      case 'too_small':
        fix = `Increase ${field} to minimum ${issue.minimum}`;
        break;
      default:
        fix = `Fix ${field}: ${issue.message}`;
    }

    return {
      field,
      issue: issue.message,
      code: issue.code,
      fix,
    };
  });
}

// ============================================================
// Section 6: Loop + Fork Composition
// ============================================================

/**
 * Full composition: Fork → convergeRepair (loopback) → re-fork → pass → dynamic load.
 *
 * Pipeline:
 *   1. forkRouter(state) determines the branch
 *   2. If fail_a or fail_b → convergeRepair (internal repair loopback)
 *   3. After repair, re-enter forkRouter
 *   4. On pass, load next node dynamically
 *
 * @returns {{ finalState, trace: Array<{phase, branch?, outcome?}> }}
 */
export function runForkPipeline(state) {
  const trace = [];
  let current = { ...state };

  // Phase 1: Initial fork
  const { branch, step } = forkRouter(current);
  trace.push({ phase: 'fork', branch });

  if (branch === 'pass') {
    // Direct pass: execute pass step and advance
    current = step.execute(current);
    trace.push({ phase: 'advance', outcome: 'pass' });
  } else if (branch === 'blocked') {
    // Blocked: execute blocked step and stop
    current = step.execute(current);
    trace.push({ phase: 'halt', outcome: 'blocked' });
  } else {
    // fail_a or fail_b: enter converge repair
    trace.push({ phase: 'converge_repair_start', branch });
    const repairResult = convergeRepair(current);
    current = repairResult.state;
    trace.push({ phase: 'converge_repair_end', outcome: repairResult.outcome, iterations: repairResult.iterations });

    // After repair, re-fork
    const reFork = forkRouter(current);
    trace.push({ phase: 're_fork', branch: reFork.branch });

    if (reFork.branch === 'pass') {
      current = reFork.step.execute(current);
      trace.push({ phase: 'advance', outcome: 'pass' });
    } else {
      trace.push({ phase: 'halt', outcome: reFork.branch });
    }
  }

  return { finalState: current, trace };
}
