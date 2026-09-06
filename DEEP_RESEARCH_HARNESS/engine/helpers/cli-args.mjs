// cli-args.mjs — shared argument guard for the guarded parseArgs utility batch.
// @impl CLE-001, CLE-003, CLE-004
//
// Batch (accepted: engine/cli-exit-code-conventions): reconcile-plan-progress,
// audit-phase-status, check-reentry, log-event, validate-work-unit-hygiene,
// apply-research-style.
//
// This helper is a result classifier, not a second parser and not an output
// layer: it returns the parse outcome and each CLI keeps its own output
// channel and process.exit semantics. A `--help`/`-h` token before any `--`
// separator is a help request regardless of other supplied options; any other
// parse failure (unknown option, bad value, positional when disallowed) is an
// invocation rejection. Domain evaluation must not run for either outcome.

import { parseArgs } from 'node:util';

const HELP_TOKENS = new Set(['--help', '-h']);

/**
 * Parse CLI arguments with the batch help/unknown-option guard.
 * @param {object} input
 * @param {string[]} input.args - raw arguments (typically process.argv.slice(2))
 * @param {object} input.options - node:util parseArgs options declaration, forwarded verbatim
 * @param {string} input.usage - the CLI's usage line, carried for callers that print it
 * @returns {{kind:'help', usage: string} | {kind:'ok', values: object, positionals: string[], usage: string} | {kind:'invalid', reason: string, usage: string}}
 */
export function parseGuardedArgs({ args, options, usage }) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
    return { kind: 'invalid', reason: 'arguments must be a string array', usage };
  }
  if (typeof usage !== 'string' || !usage.trim()) {
    return { kind: 'invalid', reason: 'usage must be a non-empty string', usage };
  }
  const separatorIndex = args.indexOf('--');
  const optionTokens = separatorIndex === -1 ? args : args.slice(0, separatorIndex);
  if (optionTokens.some((token) => HELP_TOKENS.has(token))) {
    return { kind: 'help', usage };
  }
  try {
    const { values, positionals } = parseArgs({ args, options });
    return { kind: 'ok', values, positionals, usage };
  } catch (error) {
    return { kind: 'invalid', reason: error?.message || String(error), usage };
  }
}
