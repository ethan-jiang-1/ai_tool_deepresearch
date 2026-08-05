// @impl GSK-004, RWG-021
// Pure public-summary projection for an already evaluated Wave Gate.

function uniqueSortedRuleIds(ruleIds) {
  return [...new Set((ruleIds || []).filter((ruleId) => typeof ruleId === 'string' && ruleId.length > 0))].sort();
}

/**
 * Partitions direct failed rules into public routing blockers or an
 * already-approved degraded handoff. Callers retain all findings separately.
 */
export function projectWaveGatePublicVerdict({
  failedRuleIds = [],
  degradedRuleIds = [],
  routeAvailable = false,
} = {}) {
  const directFailedRuleIds = uniqueSortedRuleIds(failedRuleIds);
  const directFailedSet = new Set(directFailedRuleIds);
  const candidateDegradedRuleIds = uniqueSortedRuleIds(degradedRuleIds)
    .filter((ruleId) => directFailedSet.has(ruleId));
  const blockingRuleIds = directFailedRuleIds
    .filter((ruleId) => !candidateDegradedRuleIds.includes(ruleId));
  const degraded = routeAvailable === true
    && candidateDegradedRuleIds.length > 0
    && blockingRuleIds.length === 0;

  return {
    passed: routeAvailable === true && (directFailedRuleIds.length === 0 || degraded),
    failed_rule_ids: degraded ? [] : directFailedRuleIds,
    degraded,
    degraded_rules: degraded ? candidateDegradedRuleIds : [],
  };
}
