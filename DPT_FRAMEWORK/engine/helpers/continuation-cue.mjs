// continuation-cue.mjs — Agent-facing decision-point continuation projection
// @impl SWE-001, SWE-006, CPT-001, CPT-003, DEW-003

export const CONTINUATION_CUE_START = '<!-- DPT_CONTINUATION_CUE_START -->';
export const CONTINUATION_CUE_END = '<!-- DPT_CONTINUATION_CUE_END -->';

const INTERACTION = {
  PROHIBITED: 'prohibited',
  REQUIRED: 'required',
  TERMINAL_DELIVERY: 'terminal_delivery',
};

const NEXT_ACTION = {
  CONSUME_CHECK_NEXT: 'consume_check_next',
  REPAIR_AND_RERUN_GATE: 'repair_and_rerun_gate',
  EXECUTE_LOADED_NODE: 'execute_loaded_node',
  WAIT_FOR_USER_IN_LOADED_NODE: 'wait_for_user_in_loaded_node',
  DELIVER_FINAL_ARTIFACTS: 'deliver_final_artifacts',
  INSPECT_AND_POLL_CLAIMED_WORK: 'inspect_and_poll_claimed_work',
};

function cleanNodeRef(nodeRef) {
  return typeof nodeRef === 'string' && nodeRef.length > 0 ? nodeRef : null;
}

function frontmatterStop(frontmatter) {
  return typeof frontmatter?.stop === 'string' ? frontmatter.stop.toLowerCase() : null;
}

function frontmatterGate(frontmatter) {
  return Object.prototype.hasOwnProperty.call(frontmatter || {}, 'gate') ? frontmatter.gate : undefined;
}

function withOptionalLocators(cue, { nodeRef, gate, workIds } = {}) {
  const result = { ...cue };
  const ref = cleanNodeRef(nodeRef);
  if (ref) result.node_ref = ref;
  if (typeof gate === 'string' && gate.length > 0) result.gate = gate;
  if (Array.isArray(workIds)) result.work_ids = [...workIds];
  return result;
}

export function continuationForLoadedNode({ frontmatter, nodeRef, gate } = {}) {
  const ref = cleanNodeRef(nodeRef);
  if (!ref || !frontmatter || typeof frontmatter !== 'object') return null;

  if (frontmatterGate(frontmatter) === null) {
    return withOptionalLocators({
      interaction: INTERACTION.TERMINAL_DELIVERY,
      next_action: NEXT_ACTION.DELIVER_FINAL_ARTIFACTS,
    }, { nodeRef: ref, gate });
  }

  const stop = frontmatterStop(frontmatter);
  if (stop === 'no') {
    return withOptionalLocators({
      interaction: INTERACTION.PROHIBITED,
      next_action: NEXT_ACTION.EXECUTE_LOADED_NODE,
    }, { nodeRef: ref, gate });
  }

  if (stop === 'yes') {
    return withOptionalLocators({
      interaction: INTERACTION.REQUIRED,
      next_action: NEXT_ACTION.WAIT_FOR_USER_IN_LOADED_NODE,
    }, { nodeRef: ref, gate });
  }

  return null;
}

export function continuationForGateResult({ frontmatter, passed, next, nodeRef, gate } = {}) {
  const ref = cleanNodeRef(nodeRef);
  if (!ref || !frontmatter || typeof frontmatter !== 'object') return null;
  if (frontmatterStop(frontmatter) !== 'no') return null;

  if (passed === true && typeof next === 'string' && next.length > 0) {
    return withOptionalLocators({
      interaction: INTERACTION.PROHIBITED,
      next_action: NEXT_ACTION.CONSUME_CHECK_NEXT,
    }, { nodeRef: ref, gate });
  }

  if (passed === false) {
    return withOptionalLocators({
      interaction: INTERACTION.PROHIBITED,
      next_action: NEXT_ACTION.REPAIR_AND_RERUN_GATE,
    }, { nodeRef: ref, gate });
  }

  return null;
}

export function continuationForClaimedWork({ claimedWorkIds } = {}) {
  if (!Array.isArray(claimedWorkIds) || claimedWorkIds.length === 0) return null;
  return withOptionalLocators({
    interaction: INTERACTION.PROHIBITED,
    next_action: NEXT_ACTION.INSPECT_AND_POLL_CLAIMED_WORK,
  }, { workIds: claimedWorkIds });
}

export function renderContinuationBlock(cue) {
  if (!cue || typeof cue !== 'object') return '';
  const lines = [CONTINUATION_CUE_START];
  for (const key of ['interaction', 'next_action', 'node_ref', 'gate', 'work_ids']) {
    if (!Object.prototype.hasOwnProperty.call(cue, key)) continue;
    const value = Array.isArray(cue[key]) ? JSON.stringify(cue[key]) : cue[key];
    lines.push(`${key}: ${value}`);
  }
  lines.push(CONTINUATION_CUE_END);
  return lines.join('\n');
}
