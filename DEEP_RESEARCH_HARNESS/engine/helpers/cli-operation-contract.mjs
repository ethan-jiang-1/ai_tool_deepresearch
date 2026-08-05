// @impl CLE-001, CLE-003
// Narrow static invocation handling for the selected public operations.

import { lstatSync } from 'node:fs';
import { resolve } from 'node:path';

const HELP_TOKENS = new Set(['--help', '-h']);

function invalid(reason, usage) {
  return { kind: 'invalid', reason, usage };
}

function parseForm(args, form, usage) {
  const positionals = form.positionals || [];
  if (args.length < positionals.length) return invalid(`expected ${positionals.join(' ') || 'no positional arguments'}`, usage);
  for (const [index, value] of positionals.entries()) {
    if (args[index] !== value) return null;
  }

  const values = {};
  const seen = new Set();
  const options = form.options || {};
  for (let index = positionals.length; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('--') || token.includes('=')) {
      return invalid(`unexpected argument ${JSON.stringify(token)}`, usage);
    }
    const name = token.slice(2);
    const option = options[name];
    if (!option) return invalid(`unknown option --${name}`, usage);
    if (seen.has(name)) return invalid(`duplicate option --${name}`, usage);
    seen.add(name);
    if (option.type === 'boolean') {
      values[name] = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith('-')) return invalid(`option --${name} requires one non-option value`, usage);
    values[name] = value;
    index += 1;
  }
  for (const [name, option] of Object.entries(options)) {
    if (option.required && !Object.hasOwn(values, name)) return invalid(`missing required option --${name}`, usage);
  }
  return { kind: 'ok', usage, form, values };
}

/**
 * Parse only the declared static invocation grammar. This helper does not read
 * runtime state, decide a route, or turn an invocation failure into a domain
 * verdict.
 */
export function parseOperationInvocation(args, { usage, forms }) {
  if (!Array.isArray(args) || args.some((value) => typeof value !== 'string')) {
    return invalid('arguments must be a string array', usage);
  }
  if (args.length === 1 && HELP_TOKENS.has(args[0])) return { kind: 'help', usage };
  if (args.some((value) => HELP_TOKENS.has(value))) return invalid('help must be supplied as one standalone argument', usage);

  let formError = null;
  for (const form of forms || []) {
    const result = parseForm(args, form, usage);
    if (result?.kind === 'ok') return result;
    if (result?.kind === 'invalid') formError ||= result;
  }
  return formError || invalid('invocation does not match an accepted operation form', usage);
}

/**
 * Bundle path validation is intentionally only input configuration handling.
 * A valid directory is not proof of bundle truth or lifecycle authorization.
 */
export function validateBundleDirectory(value) {
  if (typeof value !== 'string' || !value || value.startsWith('-')) {
    return { ok: false, reason: 'bundle must be a non-option directory path', coordinate: '<bundle-path>' };
  }
  const path = resolve(value);
  try {
    const stat = lstatSync(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      return { ok: false, reason: 'bundle must be an existing real directory', coordinate: '<bundle-path>' };
    }
  } catch {
    return { ok: false, reason: 'bundle must be an existing real directory', coordinate: '<bundle-path>' };
  }
  return { ok: true, path };
}

export function validateReadableRegularFile(value, coordinate = '<input-path>') {
  if (typeof value !== 'string' || !value || value.startsWith('-')) {
    return { ok: false, reason: 'input must be a non-option file path', coordinate };
  }
  const path = resolve(value);
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      return { ok: false, reason: 'input must be an existing regular file', coordinate };
    }
  } catch {
    return { ok: false, reason: 'input must be an existing regular file', coordinate };
  }
  return { ok: true, path };
}

export function validateWorkflowPhaseReference(value) {
  if (typeof value !== 'string' || !/^phases\/[a-z0-9][a-z0-9-]*\.md$/.test(value)) {
    return {
      ok: false,
      reason: 'node must be one non-traversing phases/<name>.md reference',
      coordinate: '<file-ref>',
    };
  }
  return { ok: true, value };
}

export function invocationError({ command, operation = null, reason, usage }) {
  return {
    status: 'error',
    error: 'invalid_invocation',
    command,
    operation,
    reason,
    usage,
  };
}
