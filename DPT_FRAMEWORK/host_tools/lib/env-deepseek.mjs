// Shared DeepSeek env helpers.
// Used by both claude-deepseek.mjs and run-experiment.mjs.
//
// parseEnvFile(path): reads repo-root .env, returns { vars } or { error }
// validateEndpoint(url): checks URL format
// buildChildEnv(vars): builds clean ANTHROPIC_* env from DEEPSEEK_* vars
// redact(val): safe API key display

import { readFileSync, accessSync, constants as fsConstants } from 'node:fs';

export function fail(code, msg) {
  process.stderr.write(`[deepseek-env] ${msg}\n`);
  process.exit(code);
}

export function redact(val) {
  if (!val) return 'not set';
  if (val.length <= 8) return '***';
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
}

export function parseEnvFile(path) {
  try {
    accessSync(path, fsConstants.R_OK);
  } catch {
    return { error: `.env not found or not readable at ${path}` };
  }
  const raw = readFileSync(path, 'utf-8');
  const vars = Object.create(null);
  const dupes = new Set();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!key.startsWith('DEEPSEEK_')) continue;
    if (key in vars) { dupes.add(key); continue; }
    if (val.includes('$(') || val.includes('`')) {
      return { error: `unsafe value in ${key}: shell syntax rejected` };
    }
    vars[key] = val;
  }
  if (dupes.size > 0) {
    return { error: `duplicate key(s): ${[...dupes].join(', ')}` };
  }
  return { vars };
}

export function validateEndpoint(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (!u.hostname) return false;
    if (u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
}

export function buildChildEnv(vars, extraEnv = {}) {
  const childEnv = { ...process.env };

  // remove inherited routing contamination
  for (const k of Object.keys(childEnv)) {
    if (k.startsWith('ANTHROPIC_') || k.startsWith('DEEPSEEK_')) delete childEnv[k];
  }
  for (const k of ['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', 'CLAUDE_CODE_SUBAGENT_MODEL', 'ENABLE_TOOL_SEARCH', 'API_TIMEOUT_MS']) {
    delete childEnv[k];
  }

  const model = vars.DEEPSEEK_MODEL;
  childEnv.ANTHROPIC_AUTH_TOKEN = vars.DEEPSEEK_API_KEY;
  childEnv.ANTHROPIC_BASE_URL = vars.DEEPSEEK_ANTHROPIC_BASE_URL;
  childEnv.ANTHROPIC_MODEL = model;
  childEnv.ANTHROPIC_DEFAULT_OPUS_MODEL = model;
  childEnv.ANTHROPIC_DEFAULT_SONNET_MODEL = model;
  childEnv.ANTHROPIC_DEFAULT_HAIKU_MODEL = model;
  childEnv.CLAUDE_CODE_SUBAGENT_MODEL = model;

  childEnv.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
  childEnv.ENABLE_TOOL_SEARCH = 'false';
  childEnv.API_TIMEOUT_MS = '3000000';

  // caller overrides
  Object.assign(childEnv, extraEnv);

  return childEnv;
}
