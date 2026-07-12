// @impl DEW-016, DEW-017
// Pure actor observation normalization and claim decision evaluation.

import {
  ActorObservationInputSchema,
  ExecutionActorClassSchema,
} from '../schema/contracts/work-unit.mjs';

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
  if (normalizedObservation.role_key !== plannedRoleKey) return { ...base, verdict: 'invalid', reason: 'actor_role_mismatch', recommended_action: `Probe the planned role ${plannedRoleKey} and rerun claim with that exact role.` };
  if (!actorPolicy || actorPolicy.delegated_role_key !== plannedRoleKey) return { ...base, verdict: 'invalid', reason: 'kind_actor_policy_mismatch', recommended_action: 'Repair the queue kind/role contract before claiming.' };
  if (normalizedObservation.outcome === 'unknown') return { ...base, verdict: 'no_claim', reason: normalizedObservation.reason_code, recommended_action: `Perform one bounded native probe for ${plannedRoleKey}, then rerun the same claim.` };
  if (normalizedObservation.outcome === 'available') {
    if (actorClass !== 'delegated_subagent') return { ...base, verdict: 'invalid', reason: 'fallback_unnecessary', recommended_action: 'Claim with execution actor delegated_subagent.' };
    return { ...base, verdict: 'allow_claim', reason: 'normal_actor_available', recommended_action: 'Spawn the claimed role-matching delegated work and submit each work unit.', policy_decision: 'normal_allowed', fallback_from: null };
  }
  if (actorClass === 'delegated_subagent') return { ...base, verdict: 'no_claim', reason: normalizedObservation.reason_code, recommended_action: actorPolicy.phase_agent_fallback === 'allowed' ? 'Rerun claim for one phase_agent_fallback work unit.' : 'Resolve the external actor blocker, then perform a fresh probe and rerun claim.' };
  if (actorPolicy.phase_agent_fallback !== 'allowed') return { ...base, verdict: 'no_claim', reason: 'phase_agent_fallback_prohibited', recommended_action: 'Resolve the external actor blocker, then perform a fresh probe and rerun claim.' };
  return { ...base, verdict: 'allow_claim', reason: 'phase_agent_fallback_allowed', recommended_action: 'Execute this single work unit as the Phase Agent, then submit or terminalize it before another claim.', policy_decision: 'fallback_allowed', fallback_from: 'delegated_subagent' };
}
