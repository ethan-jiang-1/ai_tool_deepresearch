// Shared validation helpers for gate-loop and gate-fork engines.
// Internal — not part of the public engine API.

/**
 * Throw if state is not a plain object.
 */
export function validateState(state, caller) {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error(`${caller}: state 必须是普通对象 (plain dict)，不能是 null 或数组`);
  }
}

/**
 * Throw if any rule is invalid.
 * Each rule must have: key (string), say (string), and at least one of
 * schema (with safeParse) or check (function).
 */
export function validateRules(rules, caller) {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error(`${caller}: rules 必须是非空数组`);
  }
  rules.forEach((r, i) => {
    if (typeof r.key !== 'string' || r.key.length === 0) {
      throw new Error(`${caller}: rules[${i}].key 必须是非空字符串`);
    }
    if (typeof r.say !== 'string') {
      throw new Error(`${caller}: rules[${i}].say 必须是字符串`);
    }
    if (!r.schema && !r.check) {
      throw new Error(`${caller}: rules[${i}] (key="${r.key}") 必须提供 schema 或 check`);
    }
    if (r.schema && typeof r.schema.safeParse !== 'function') {
      throw new Error(`${caller}: rules[${i}].schema 必须是 Zod schema（需有 safeParse 方法）`);
    }
    if (r.check && typeof r.check !== 'function') {
      throw new Error(`${caller}: rules[${i}].check 必须是函数`);
    }
  });
}

/**
 * Map ZodError issues to plain diagnostics array.
 */
export function zodErrors(error) {
  return error.issues.map(i => ({
    field:    i.path.join('.'),
    code:     i.code,
    message:  i.message,
    received: i.received,
    expected: i.expected,
  }));
}
