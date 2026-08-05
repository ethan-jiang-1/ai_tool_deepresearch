// Pure interpretation of the active rerun-count rule.
// @impl GSK-002, REI-003, REI-005

const RERUN_GATE = 'rerun-ready';
const RULE_ID = 'rerun_count_valid';
const CHECK = 'rerun_count_limit';
const TARGET = 'rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unsupported(reason) {
  return { supported: false, reason };
}

export function evaluateRerunAvailability({ definition, profile, includeNextIncrement } = {}) {
  if (typeof includeNextIncrement !== 'boolean') {
    return unsupported('includeNextIncrement must be an explicitly supplied boolean');
  }
  if (!isObject(definition) || definition.gate !== RERUN_GATE || !Array.isArray(definition.rules)) {
    return unsupported('rerun-ready definition is missing or malformed');
  }

  const rules = definition.rules.filter((rule) => rule?.id === RULE_ID || rule?.check === CHECK);
  if (rules.length !== 1) return unsupported('rerun-ready definition must contain exactly one canonical rerun-count rule');
  const [rule] = rules;
  if (!isObject(rule)
    || rule.id !== RULE_ID
    || rule.check !== CHECK
    || rule.target !== TARGET
    || rule.operator !== 'less_than'
    || !Number.isInteger(rule.value)
    || rule.value <= 0) {
    return unsupported('active rerun-count rule shape is unsupported');
  }

  if (!isObject(profile)) return unsupported('parsed profile must be an object');
  const checkpoints = profile.human_decision_checkpoints;
  if (!isObject(checkpoints)) return unsupported('profile human_decision_checkpoints parent must be an object');
  const hitl2 = checkpoints.hitl2;
  if (!isObject(hitl2)) return unsupported('profile HITL2 parent must be an object');

  const hasCount = Object.prototype.hasOwnProperty.call(hitl2, 'rerun_count');
  const currentCount = hasCount ? hitl2.rerun_count : 0;
  if (!Number.isInteger(currentCount) || currentCount < 0) {
    return unsupported('profile rerun_count must be an absent field or a nonnegative integer');
  }

  const evaluatedCount = currentCount + (includeNextIncrement ? 1 : 0);
  return {
    supported: true,
    available: evaluatedCount < rule.value,
    currentCount,
    evaluatedCount,
    exclusiveLimit: rule.value,
  };
}
