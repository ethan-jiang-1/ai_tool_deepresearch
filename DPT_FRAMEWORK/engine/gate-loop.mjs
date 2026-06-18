// @impl FRE-001: Canonical engine location DPT_FRAMEWORK/engine/gate-loop.mjs
// Thin deterministic gate checkpoint for MD Controller.
//
// ## Role
// Engine checks whether state passes a gate. It evaluates rules in order,
// stops at the first match, and returns a JSON message with natural
// language (`say`) so MD knows exactly what happened and what to do next.
//
// Engine knows NOTHING about your domain. State is a plain dict. Rules
// are [ {key, check?, schema?, say}, ... ] — you define the keys, the
// predicates (or Zod schemas), and the natural-language messages.
// Engine just runs them in order.
//
// ## How MD uses this
// 1. Define your rules. Each rule has a `key`, a `say`, and either:
//    - `schema`: a Zod schema — engine calls safeParse. Rule fires on
//      validation failure. Use for field-level checks (type, required).
//    - `check`:  a predicate (state) => boolean. Rule fires when true.
//      Use for business-level checks (range, domain logic).
//    - Both: schema runs first, then check.
// 2. Call `checkGate(state, rules, next?)`.
// 3. Read the return value:
//    - `passed: true`  → read `say`, proceed to `next`
//    - `passed: false` → read `say`, `errors` (if schema), fix state, retry
//
// ## Export
//   checkGate(state, rules, next?)

import { validateState, validateRules, zodErrors } from './helpers/gate-helpers.mjs';

const NAME = 'checkGate';

// ============================================================
// Gate Checkpoint
// ============================================================

/**
 * Check whether state passes the gate.
 *
 * Evaluates rules in order. First rule that fires wins — engine returns
 * that rule's `say` message. If no rule fires, the gate passes.
 *
 * ## Rule types
 * - **schema rule**: `{ key, schema: ZodType, say }`
 *   Engine runs `schema.safeParse(state)`. Rule fires on failure.
 *   Returns Zod errors as `errors` array alongside `say`.
 * - **check rule**: `{ key, check: state=>boolean, say }`
 *   Engine calls `check(state)`. Rule fires when true.
 * - **combined**: both `schema` and `check`. Schema runs first.
 *
 * ## Parameters
 * @param {object} state   plain dict, not null, not array
 * @param {Array} rules    non-empty array of {key, say, schema?, check?}
 * @param {string} [next]  optional next-step label
 *
 * ## Returns — a JSON message for MD to read and act on
 *
 * ### Gate passed
 *   { passed: true, say: '门禁通过。', next?: '<your-next>' }
 *
 * ### Schema rule fired
 *   { passed: false, say: '<rule.say>',
 *     errors: [{ field, code, message, received, expected }] }
 *
 * ### Check rule fired
 *   { passed: false, say: '<rule.say>' }
 *
 * @throws {Error} if arguments are invalid
 * @returns {{ passed: boolean, say: string, next?: string, errors?: Array }}
 */
export function checkGate(state, rules, next) {
  validateState(state, NAME);
  validateRules(rules, NAME);
  if (next !== undefined && typeof next !== 'string') {
    throw new Error(`${NAME}: next 必须是字符串`);
  }

  for (const rule of rules) {
    if (rule.schema) {
      const parsed = rule.schema.safeParse(state);
      if (!parsed.success) {
        return { passed: false, say: rule.say, errors: zodErrors(parsed.error) };
      }
    }
    if (rule.check && rule.check(state)) {
      return { passed: false, say: rule.say };
    }
  }
  return { passed: true, say: '门禁通过。', ...(next ? { next } : {}) };
}
