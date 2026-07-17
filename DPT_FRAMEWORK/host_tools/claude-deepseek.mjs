#!/usr/bin/env node
// @impl LDC-001 through LDC-008
// DeepSeek Claude Code Launcher — pre-trigger host tool.
// Usage: node claude-deepseek.mjs [--check] [claude args...]

import { readFileSync, accessSync, constants as fsConstants } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const R = '\x1b[31m', G = '\x1b[32m', B = '\x1b[0m';

// ── path resolution ──────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const ENV_FILE = resolve(REPO_ROOT, '.env');

// ── helpers ───────────────────────────────────────────────────────
function fail(code, msg) {
  process.stderr.write(`[deepseek-launcher] ${msg}\n`);
  process.exit(code);
}

function ok(label) { return `${G}[OK]${B} ${label}`; }
function failLabel(label) { return `${R}[FAIL]${B} ${label}`; }

function redact(val) {
  if (!val) return 'not set';
  if (val.length <= 8) return '***';
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
}

// ── .env parser (data only, never shell-evaluated) ───────────────
function parseEnvFile(path) {
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
    if (!key.startsWith('DEEPSEEK_')) continue;   // ignore unrelated keys
    if (key in vars) { dupes.add(key); continue; }
    // reject obviously unsafe assignment (bare command substitution etc.)
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

// ── endpoint validation ───────────────────────────────────────────
function validateEndpoint(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (!u.hostname) return false;
    if (u.username || u.password) return false;   // no embedded credentials
    return true;
  } catch {
    return false;
  }
}

// ── preflight check mode ──────────────────────────────────────────
function runCheck() {
  const results = [];
  let hasConfig = false, hasClaudeOnly = false;

  // claude on PATH
  const claudePath = findClaude();
  results.push(claudePath
    ? ok(`claude: ${claudePath}`)
    : failLabel('claude: not found on PATH'));
  if (!claudePath) hasClaudeOnly = true;

  // .env
  const parsed = parseEnvFile(ENV_FILE);
  if (parsed.error) {
    results.push(failLabel(`.env: ${parsed.error}`));
    hasConfig = true;
  } else {
    results.push(ok(`.env: ${ENV_FILE}`));
    const v = parsed.vars;

    // API key
    results.push(v.DEEPSEEK_API_KEY
      ? ok(`DEEPSEEK_API_KEY: set (value redacted)`)
      : failLabel('DEEPSEEK_API_KEY: not set'));
    if (!v.DEEPSEEK_API_KEY) hasConfig = true;

    // endpoint
    if (!v.DEEPSEEK_ANTHROPIC_BASE_URL) {
      results.push(failLabel('DEEPSEEK_ANTHROPIC_BASE_URL: not set'));
      hasConfig = true;
    } else if (!validateEndpoint(v.DEEPSEEK_ANTHROPIC_BASE_URL)) {
      results.push(failLabel(`DEEPSEEK_ANTHROPIC_BASE_URL: invalid (${v.DEEPSEEK_ANTHROPIC_BASE_URL})`));
      hasConfig = true;
    } else {
      results.push(ok(`DEEPSEEK_ANTHROPIC_BASE_URL: ${v.DEEPSEEK_ANTHROPIC_BASE_URL} (valid)`));
    }

    // model
    results.push(v.DEEPSEEK_MODEL
      ? ok(`DEEPSEEK_MODEL: ${v.DEEPSEEK_MODEL} (set)`)
      : failLabel('DEEPSEEK_MODEL: not set'));
    if (!v.DEEPSEEK_MODEL) hasConfig = true;
  }

  for (const r of results) process.stdout.write(`${r}\n`);

  if (hasConfig) process.exit(2);
  if (hasClaudeOnly) process.exit(1);
  process.exit(0);
}

function findClaude() {
  const result = spawnSync('which', ['claude'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  return result.status === 0 ? result.stdout.trim() : null;
}

// ── main ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);

// --check mode
if (args[0] === '--check') {
  runCheck();
}

// normal mode: validate, build env, spawn claude
const parsed = parseEnvFile(ENV_FILE);
if (parsed.error) fail(2, parsed.error);
const v = parsed.vars;

if (!v.DEEPSEEK_API_KEY) fail(2, 'DEEPSEEK_API_KEY is required (not set or empty)');
if (!v.DEEPSEEK_ANTHROPIC_BASE_URL) fail(2, 'DEEPSEEK_ANTHROPIC_BASE_URL is required');
if (!validateEndpoint(v.DEEPSEEK_ANTHROPIC_BASE_URL)) fail(2, `invalid endpoint URL: ${v.DEEPSEEK_ANTHROPIC_BASE_URL}`);
if (!v.DEEPSEEK_MODEL) fail(2, 'DEEPSEEK_MODEL is required');

// build child environment: copy inherited, then clean + map
const childEnv = { ...process.env };

// remove inherited routing contamination
for (const k of Object.keys(childEnv)) {
  if (k.startsWith('ANTHROPIC_') || k.startsWith('DEEPSEEK_')) delete childEnv[k];
}
for (const k of ['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', 'CLAUDE_CODE_SUBAGENT_MODEL', 'ENABLE_TOOL_SEARCH', 'API_TIMEOUT_MS']) {
  delete childEnv[k];
}

// map parsed config → Claude-facing env vars
const model = v.DEEPSEEK_MODEL;
childEnv.ANTHROPIC_AUTH_TOKEN = v.DEEPSEEK_API_KEY;
childEnv.ANTHROPIC_BASE_URL = v.DEEPSEEK_ANTHROPIC_BASE_URL;
childEnv.ANTHROPIC_MODEL = model;
childEnv.ANTHROPIC_DEFAULT_OPUS_MODEL = model;
childEnv.ANTHROPIC_DEFAULT_SONNET_MODEL = model;
childEnv.ANTHROPIC_DEFAULT_HAIKU_MODEL = model;
childEnv.CLAUDE_CODE_SUBAGENT_MODEL = model;

// launcher-owned fixed values
childEnv.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
childEnv.ENABLE_TOOL_SEARCH = 'false';
childEnv.API_TIMEOUT_MS = '3000000';

// spawn claude without a shell, passthrough args + stdio
const result = spawnSync('claude', args, {
  env: childEnv,
  stdio: 'inherit',
  shell: false,
});

if (result.error) fail(1, `failed to launch claude: ${result.error.message}`);
if (result.signal) process.kill(process.pid, result.signal);
process.exit(result.status ?? 0);
