// @impl FRE-001: Canonical engine location DPT_FRAMEWORK/engine/gate-fork.mjs
// Thin deterministic fork checkpoint for MD Controller.
//
// ## Role
// Engine evaluates state against rules, then returns which branch MD
// should take. Each branch carries a natural-language `say` so MD
// knows exactly what action to execute. Branches can optionally include
// a `when` predicate describing the condition for that branch.
//
// Engine knows NOTHING about your domain. State is a plain dict.
//
// ## How MD uses this
// 1. Define your rules (same format as checkGate: schema or check).
// 2. Define your branches: { '<key>': { say, when? } }
// 3. Call `forkGate(state, rules, branches)`.
// 4. Read the return value:
//    - `branch` present  → read `say`, execute that action
//    - `rule` only        → rule fired but no branch; read `say`, fix state
//    - neither            → all rules passed, no branch to take
//
// ## Export
//   forkGate(state, rules, branches)

import { validateState, validateRules, zodErrors } from './helpers/gate-helpers.mjs';

const NAME = 'forkGate';

// ============================================================
// Fork Checkpoint
// ============================================================

/**
 * Evaluate state and return which branch MD should take.
 *
 * Evaluates rules in order. First rule that fires determines the result.
 * If that rule's key has a matching branch, engine returns the branch
 * action. If no branch exists, engine returns the rule failure — MD
 * needs to repair the state.
 *
 * ## Rule types (same as checkGate)
 * - **schema rule**: `{ key, schema: ZodType, say }` — fires on validation failure
 * - **check rule**: `{ key, check: state=>boolean, say }` — fires when predicate true
 * - **combined**: both schema and check. Schema runs first.
 *
 * ## Branch format
 *   { '<key>': { say: '<action>', when?: state=>boolean } }
 *   - `say`:  natural-language action for MD to execute
 *   - `when`: optional predicate confirming the branch condition.
 *             If provided and returns false, engine skips this branch
 *             (treats as no-branch → repair).
 *
 * ## Parameters
 * @param {object} state   plain dict, not null, not array
 * @param {Array} rules    non-empty array of {key, say, schema?, check?}
 * @param {object} branches  { '<key>': { say, when? } }
 *
 * ## Returns — a JSON message for MD to read and act on
 *
 * ### Branch matched
 *   { branch: '<key>', say: '<branch.say>' }
 *
 * ### Rule fired but no branch (or branch.when failed)
 *   { rule: '<key>', say: '<rule.say>' }
 *
 * ### Schema rule fired
 *   { rule: '<key>', say: '<rule.say>',
 *     errors: [{ field, code, message, received, expected }] }
 *
 * ### All rules passed, no branch
 *   { say: '门禁通过，但没有分叉。' }
 *
 * @throws {Error} if arguments are invalid
 * @returns {{ branch?: string, rule?: string, say: string, errors?: Array }}
 */
export function forkGate(state, rules, branches) {
  validateState(state, NAME);
  validateRules(rules, NAME);

  if (typeof branches !== 'object' || branches === null || Array.isArray(branches)) {
    throw new Error(`${NAME}: branches 必须是普通对象，不能是 null 或数组`);
  }
  for (const [key, b] of Object.entries(branches)) {
    if (typeof b.say !== 'string') {
      throw new Error(`${NAME}: branches["${key}"].say 必须是字符串`);
    }
    if (b.when !== undefined && typeof b.when !== 'function') {
      throw new Error(`${NAME}: branches["${key}"].when 必须是函数`);
    }
  }

  for (const rule of rules) {
    if (rule.schema) {
      const parsed = rule.schema.safeParse(state);
      if (!parsed.success) {
        return { rule: rule.key, say: rule.say, errors: zodErrors(parsed.error) };
      }
    }
    if (rule.check && rule.check(state)) {
      const branch = branches[rule.key];
      if (branch) {
        if (branch.when && !branch.when(state)) {
          return { rule: rule.key, say: rule.say };
        }
        return { branch: rule.key, say: branch.say };
      }
      return { rule: rule.key, say: rule.say };
    }
  }
  return { say: '门禁通过，但没有分叉。' };
}
