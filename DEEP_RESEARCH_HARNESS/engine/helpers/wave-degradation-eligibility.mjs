// @impl GSK-013, RWG-021
// Pure policy projection for the existing Wave formal-Gate degraded handoff.

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function isEligibleFloorFinding(finding, rule) {
  return finding?.finding_source === 'definition'
    && finding?.blocking_basis === 'required_floor'
    && rule?.finding?.source === 'definition'
    && rule?.finding?.blocking_basis === 'required_floor'
    && rule?.degradation_eligible === true;
}

export function evaluateWaveDegradationEligibility({ definition, ruleEvaluation } = {}) {
  const rulesById = new Map((definition?.rules || []).map((rule) => [rule.id, rule]));
  const blockingFindings = (ruleEvaluation?.findings || []).filter((finding) => (
    finding?.classification === 'blocking' && !finding?.masked_by_rule_id
  ));
  const eligibleRuleIds = [];
  const ineligibleRuleIds = [];

  for (const finding of blockingFindings) {
    const ruleId = finding?.rule_id;
    const rule = rulesById.get(ruleId);
    if (isEligibleFloorFinding(finding, rule)) eligibleRuleIds.push(ruleId);
    else ineligibleRuleIds.push(ruleId);
  }

  const eligible_rule_ids = uniqueSorted(eligibleRuleIds);
  const ineligible_rule_ids = uniqueSorted(ineligibleRuleIds);
  return {
    eligible: eligible_rule_ids.length > 0 && ineligible_rule_ids.length === 0,
    eligible_rule_ids,
    ineligible_rule_ids,
  };
}
