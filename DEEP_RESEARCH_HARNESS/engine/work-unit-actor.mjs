// @impl DEW-016, WUC-008
// Pure actor observation normalization and claim decision evaluation.

import {
  ACTOR_OBSERVATION_CASES,
  ActorObservationContractProjectionSchema,
  ActorObservationFeedbackSchema,
  ActorObservationInputIssueSchema,
  ActorObservationInputSchema,
  ActorObservationProvidedObservationSchema,
  actorObservationLegalTuples,
  ExecutionActorClassSchema,
} from '../schema/contracts/work-unit.mjs';

export { ACTOR_OBSERVATION_CASES, ActorObservationContractProjectionSchema };

function jsonSafeValue(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (Array.isArray(value)) return value.map(jsonSafeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, jsonSafeValue(entry)]));
  }
  return value === undefined ? null : String(value);
}

function suppliedObservationValue(observation, field) {
  if (!observation || typeof observation !== 'object' || Array.isArray(observation)) return null;
  return Object.hasOwn(observation, field) ? jsonSafeValue(observation[field]) : null;
}

export function actorObservationContractProjection(plannedRoleKey) {
  return ActorObservationContractProjectionSchema.parse({
    planned_role_key: plannedRoleKey,
    legal_tuples: actorObservationLegalTuples(),
  });
}

export function describeActorObservationInputIssues(observation) {
  const provided_observation = ActorObservationProvidedObservationSchema.parse({
    outcome: suppliedObservationValue(observation, 'outcome'),
    source: suppliedObservationValue(observation, 'source'),
    role_key: suppliedObservationValue(observation, 'role_key'),
    reason_code: suppliedObservationValue(observation, 'reason_code'),
  });
  const parsed = ActorObservationInputSchema.safeParse(observation);
  if (parsed.success) return { valid: true, provided_observation, input_issues: [] };
  const input_issues = parsed.error.issues.map((issue) => {
    const field = issue.path.length > 0
      ? issue.path.join('.')
      : issue.code === 'custom'
        ? 'outcome/source/reason_code'
        : 'observation';
    const supplied_value = issue.path.length > 0
      ? suppliedObservationValue(observation, issue.path[0])
      : field === 'outcome/source/reason_code'
        ? jsonSafeValue(provided_observation)
        : null;
    return ActorObservationInputIssueSchema.parse({ field, supplied_value, message: issue.message });
  });
  return { valid: false, provided_observation, input_issues };
}

function safeActorObservationConflict(issue) {
  const field = typeof issue?.field === 'string' && issue.field.length > 0
    ? issue.field
    : 'actor_observation';
  return {
    field,
    message: `The supplied ${field} does not satisfy the declared actor-observation contract.`,
  };
}

/**
 * Expose the already-computed validator conflict at the claim decision point.
 * This projection deliberately omits caller-provided values; nested diagnostics
 * retain them when the existing lifecycle result needs durable detail.
 */
export function projectActorObservationFeedback({ plannedRoleKey, inputIssues, rerun, limit = 4 }) {
  const conflicts = (Array.isArray(inputIssues) ? inputIssues : [])
    .slice(0, Math.max(1, Math.min(limit, 4)))
    .map(safeActorObservationConflict);
  if (conflicts.length === 0) {
    conflicts.push({
      field: 'actor_observation',
      message: 'The supplied actor observation does not satisfy the declared actor-observation contract.',
    });
  }
  return ActorObservationFeedbackSchema.parse({
    planned_role_key: plannedRoleKey,
    primary_conflict: conflicts[0],
    conflicts,
    legal_tuples: actorObservationLegalTuples(),
    rerun,
  });
}

export function normalizeActorObservation(observation, plannedRoleKey) {
  return ActorObservationInputSchema.parse(observation || {
    outcome: 'unknown',
    source: 'not_observed',
    role_key: plannedRoleKey,
    reason_code: 'observation_required',
  });
}

export function evaluateActorDecision({ observation, executionActorClass, plannedRoleKey, actorPolicy }) {
  const normalizedObservation = normalizeActorObservation(observation, plannedRoleKey);
  const actorClass = ExecutionActorClassSchema.parse(executionActorClass || 'delegated_subagent');
  const base = { observation: normalizedObservation, execution_actor_class: actorClass };
  if (normalizedObservation.role_key !== plannedRoleKey) return { ...base, verdict: 'invalid', reason: 'actor_role_mismatch', actor_guidance: `Probe the planned role ${plannedRoleKey} and rerun claim with that exact role.` };
  if (!actorPolicy || actorPolicy.delegated_role_key !== plannedRoleKey) return { ...base, verdict: 'invalid', reason: 'kind_actor_policy_mismatch', actor_guidance: 'Repair the queue kind/role contract before claiming.' };
  if (normalizedObservation.outcome === 'unknown') return { ...base, verdict: 'no_claim', reason: normalizedObservation.reason_code, actor_guidance: `Perform one bounded native probe for ${plannedRoleKey}, then rerun the same claim.` };
  if (normalizedObservation.outcome === 'available') {
    if (actorClass !== 'delegated_subagent') return { ...base, verdict: 'invalid', reason: 'fallback_unnecessary', actor_guidance: 'Claim with execution actor delegated_subagent.' };
    return { ...base, verdict: 'allow_claim', reason: 'normal_actor_available', actor_guidance: 'Spawn the claimed role-matching delegated work and submit each work unit.', policy_decision: 'normal_allowed', fallback_from: null };
  }
  if (actorClass === 'delegated_subagent') return { ...base, verdict: 'no_claim', reason: normalizedObservation.reason_code, actor_guidance: actorPolicy.phase_agent_fallback === 'allowed' ? 'Rerun claim for one phase_agent_fallback work unit.' : 'Resolve the external actor blocker, then perform a fresh probe and rerun claim.' };
  if (actorPolicy.phase_agent_fallback !== 'allowed') return { ...base, verdict: 'no_claim', reason: 'phase_agent_fallback_prohibited', actor_guidance: 'Resolve the external actor blocker, then perform a fresh probe and rerun claim.' };
  return { ...base, verdict: 'allow_claim', reason: 'phase_agent_fallback_allowed', actor_guidance: 'Execute this single work unit as the Phase Agent, then submit or terminalize it before another claim.', policy_decision: 'fallback_allowed', fallback_from: 'delegated_subagent' };
}
