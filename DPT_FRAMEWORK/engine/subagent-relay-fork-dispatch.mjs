// @impl FRE-004
// subagent-relay-fork-dispatch.mjs — fork/dispatch map, converge repair, validation diagnostics
// Source domains: fork/dispatch (L269–372), repair diagnostics (L1412–1501)

import { z } from 'zod';
import { SubagentWorkflowState } from './subagent-relay-schemas-trace.mjs';

class ForkStep {
  constructor(name, executeFn) {
    this.name = name;
    this.execute = executeFn;
  }
}

// Historical implementation name: a ForkStep is a deterministic checkpoint
// transform record here, not an Agent-facing workflow node.

/**
 * Classify workflow state into a branch: 'pass', 'fail_a', 'fail_b', or 'blocked'.
 *
 * Rules are evaluated in priority order:
 *   1. blocked  — topicReadiness === 'blocked'
 *   2. fail_b   — topicReadiness !== 'ready'
 *   3. fail_a   — ref_count < ref_floor
 *   4. pass     — none of the above
 *
 * @param {object} state - workflow state (parsed against SubagentWorkflowState)
 * @returns {'pass'|'fail_a'|'fail_b'|'blocked'}
 */
export function classifyBranch(state) {
  const s = SubagentWorkflowState.parse(state);
  if (s.topicReadiness === 'blocked') return 'blocked';
  if (s.topicReadiness !== 'ready') return 'fail_b';
  if (s.ref_count < s.ref_floor) return 'fail_a';
  return 'pass';
}

const passStep = new ForkStep('pass_branch', (s) => ({ ...s, current_gate: 'wave_next' }));
const refCountLowStep = new ForkStep('fail_a_branch', (s) => ({ ...s, topicRepairAttempted: true }));
const topicNotReadyStep = new ForkStep('fail_b_branch', (s) => ({ ...s, ref_count: s.ref_count + 1 }));
const blockedStep = new ForkStep('blocked_branch', (s) => ({ ...s, current_gate: 'blocked_hitl' }));

const forkMap = new Map([
  ['pass', passStep],
  ['fail_a', refCountLowStep],
  ['fail_b', topicNotReadyStep],
  ['blocked', blockedStep],
]);

/**
 * Classify state and resolve the corresponding deterministic checkpoint transform.
 *
 * @param {object} state - workflow state
 * @returns {{ branch: string, step: ForkStep }}
 * @throws {Error} if no branch transform is registered for the classified branch
 */
export function forkRouter(state) {
  const branch = classifyBranch(state);
  const step = forkMap.get(branch);
  if (!step) throw new Error(`No fork for: ${branch}`);
  return { branch, step };
}


// Branch transforms are instantiated per fork map entry.
// Internal — consumers use forkRouter() to resolve branches.

const dispatchMap = new Map([
  ['pass', [
    {
      key: 'source_intake',
      slotIndex: 0,
      roleAgentKey: 'dpt-source-intake',
      taskDescription: 'Discover candidate sources for the research task and return bounded structured candidates.',
      timeoutMs: 10 * 60 * 1000,
    },
    {
      key: 'source_diagnostic',
      slotIndex: 1,
      roleAgentKey: 'dpt-source-diagnostic',
      taskDescription: 'Assess source quality, materiality, trust tier, and cross-verification needs.',
      timeoutMs: 10 * 60 * 1000,
    },
    {
      key: 'claim_verifier',
      slotIndex: 2,
      roleAgentKey: 'dpt-claim-verifier',
      taskDescription: 'Check whether critical claims are supported, weakened, contradicted, or uncertain.',
      timeoutMs: 10 * 60 * 1000,
    },
    {
      key: 'evidence_extractor',
      slotIndex: 3,
      roleAgentKey: 'dpt-evidence-extractor',
      taskDescription: 'Extract reusable evidence particles from qualified sources.',
      timeoutMs: 10 * 60 * 1000,
    },
  ]],
]);

/**
 * Return the built-in dispatch map (pass branch → 4 DPT role agent configs).
 *
 * The returned Map is live — callers may mutate it to customize slot configs
 * before passing to stageSubagentSlots.
 *
 * @returns {Map<string, Array<{key, slotIndex, roleAgentKey, taskDescription, ...}>>}
 */
export function getDispatchMap() {
  return dispatchMap;
}
function serializeState(state) {
  return JSON.stringify(state);
}

const defaultRepairStep = new ForkStep('shared_repair', (s) => {
  const repaired = { ...s };
  if (repaired.ref_count < repaired.ref_floor) {
    repaired.ref_count = Math.min(repaired.ref_count + 2, repaired.ref_floor);
  }
  if (repaired.topicReadiness !== 'ready' && repaired.topicReadiness !== 'blocked') {
    repaired.topicReadiness = 'ready';
  }
  repaired.subagent_all_failed = false;
  return repaired;
});

/**
 * Run the default repair step iteratively until the state converges to
 * 'pass' or 'blocked', or maxIterations is reached.
 *
 * Detects stalls (state unchanged between iterations) and exits early.
 * Repair increments ref_count toward ref_floor and resets topicReadiness
 * to 'ready' when it's not 'blocked'.
 *
 * @param {object} state          - workflow state to repair
 * @param {number} [maxIterations=3] - maximum repair cycles
 * @returns {{ state: object, outcome: string, iterations: number }}
 */
export function convergeRepair(state, maxIterations = 3) {
  let current = { ...state };
  const seen = new Set();

  for (let i = 0; i < maxIterations; i++) {
    const branch = classifyBranch(current);
    if (branch === 'pass' || branch === 'blocked') {
      return { state: current, outcome: branch, iterations: i };
    }
    const h = serializeState(current);
    if (seen.has(h)) {
      return { state: current, outcome: 'stalled', iterations: i };
    }
    seen.add(h);
    current = defaultRepairStep.execute(current);
  }
  return { state: current, outcome: classifyBranch(current), iterations: maxIterations };
}

/**
 * Validate state against a Zod schema and return diagnostics on failure.
 *
 * @param {object} state  - state to validate
 * @param {z.ZodType} [schema=SubagentWorkflowState] - schema to validate against
 * @returns {{ passed: true } | { passed: false, errors: z.ZodError, diagnostics: object[] }}
 */
export function validateAndDiagnose(state, schema = SubagentWorkflowState) {
  const result = schema.safeParse(state);
  if (result.success) return { passed: true };
  return { passed: false, errors: result.error, diagnostics: inspectFailure(result.error) };
}

/**
 * Convert a ZodError into human-readable diagnostics with suggested fixes.
 *
 * Handles error codes: invalid_type, invalid_value, too_small, and a generic fallback.
 *
 * @param {z.ZodError} zodError - the error from Zod's safeParse
 * @returns {Array<{ field: string, issue: string, code: string, fix: string }>}
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
      case 'invalid_value':
        fix = `Set ${field} to one of: ${expected} (received ${received})`;
        break;
      case 'too_small':
        fix = `Increase ${field} to minimum ${issue.minimum}`;
        break;
      default:
        fix = `Fix ${field}: ${issue.message}`;
    }
    return { field, issue: issue.message, code: issue.code, fix };
  });
}
