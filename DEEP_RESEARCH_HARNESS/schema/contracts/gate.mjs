// @deprecated — This abstract FSM is not used by any runtime path.
// All transition routing goes through transitions.chain.json + resolveNodeTransitionDetailed().
// The GATE_MACHINE_STATES and GATE_TRANSITIONS tables are stale (missing hitl1_recorded,
// seed_topics_ready, rerun_ready; using hitl2_pending_user instead of hitl2_recorded;
// no rerun path). Do not use for new features. The canonical truth source is
// DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json.
// See: _backlog/_trainsistion/cc_transition_systemic_analysis.md §3e, §7
// See: openspec/changes/fix-transition-next-gate-stale-after-seed-topics (TRT-011)
// @impl SCO-003: GateTransitionTable (obsolete — SCO-003 describes the old abstract FSM)
export const GATE_MACHINE_STATES = [
  'instantiation_complete',
  'setup_ready',
  'wave0_complete',
  'wave1_complete',
  'wave2_complete',
  'hitl2_pending_user',
  'readiness_passed',
  'blocked_terminal',
];

export const GATE_EVENT_TYPES = [
  'PASS_SETUP',
  'PASS_WAVE0',
  'PASS_WAVE1',
  'PASS_WAVE2',
  'HITL2_PENDING',
  'USER_PROCEED',
  'USER_REPAIR',
  'USER_VIEW_REVISION',
  'USER_STOP_BLOCKED',
  'REOPEN',
];

export const GATE_TRANSITIONS = {
  instantiation_complete: [
    { event: 'PASS_SETUP', next: 'setup_ready' },
  ],
  setup_ready: [
    { event: 'PASS_WAVE0', next: 'wave0_complete' },
  ],
  wave0_complete: [
    { event: 'PASS_WAVE1', next: 'wave1_complete' },
    { event: 'REOPEN', next: 'setup_ready' },
  ],
  wave1_complete: [
    { event: 'PASS_WAVE2', next: 'wave2_complete' },
    { event: 'REOPEN', next: 'wave0_complete' },
  ],
  wave2_complete: [
    { event: 'HITL2_PENDING', next: 'hitl2_pending_user' },
    { event: 'REOPEN', next: 'wave1_complete' },
  ],
  hitl2_pending_user: [
    { event: 'USER_PROCEED', next: 'readiness_passed' },
    { event: 'USER_REPAIR', next: 'wave1_complete' },
    { event: 'USER_VIEW_REVISION', next: 'hitl2_pending_user' },
    { event: 'USER_STOP_BLOCKED', next: 'blocked_terminal' },
  ],
  readiness_passed: [],
  blocked_terminal: [],
};

/**
 * Validate the transition table has no dead states.
 * Returns an array of state names that have zero transitions (excluding terminal states).
 */
export function validateTransitions() {
  const terminal = new Set(['readiness_passed', 'blocked_terminal']);
  const dead = [];
  for (const [state, transitions] of Object.entries(GATE_TRANSITIONS)) {
    if (!terminal.has(state) && transitions.length === 0) {
      dead.push(state);
    }
  }
  return dead;
}

/**
 * Check if a transition is valid.
 */
export function isValidTransition(from, event) {
  const transitions = GATE_TRANSITIONS[from];
  if (!transitions) return false;
  return transitions.some((t) => t.event === event);
}
