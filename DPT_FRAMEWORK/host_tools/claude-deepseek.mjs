#!/usr/bin/env node
// @impl LDC-001 through LDC-008
// DeepSeek Claude Code Launcher — pre-trigger host tool.
// Usage: node claude-deepseek.mjs [--check] [claude args...]

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseEnvFile, validateEndpoint, buildChildEnv, redact } from './lib/env-deepseek.mjs';

const R = '\x1b[31m', G = '\x1b[32m', B = '\x1b[0m';

// ── path resolution ──────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const ENV_FILE = resolve(REPO_ROOT, '.env');

// ── launcher-specific helpers ─────────────────────────────────────
function launcherFail(code, msg) {
  process.stderr.write(`[deepseek-launcher] ${msg}\n`);
  process.exit(code);
}

function ok(label) { return `${G}[OK]${B} ${label}`; }
function failLabel(label) { return `${R}[FAIL]${B} ${label}`; }

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
if (parsed.error) launcherFail(2, parsed.error);
const v = parsed.vars;

if (!v.DEEPSEEK_API_KEY) launcherFail(2, 'DEEPSEEK_API_KEY is required (not set or empty)');
if (!v.DEEPSEEK_ANTHROPIC_BASE_URL) launcherFail(2, 'DEEPSEEK_ANTHROPIC_BASE_URL is required');
if (!validateEndpoint(v.DEEPSEEK_ANTHROPIC_BASE_URL)) launcherFail(2, `invalid endpoint URL: ${v.DEEPSEEK_ANTHROPIC_BASE_URL}`);
if (!v.DEEPSEEK_MODEL) launcherFail(2, 'DEEPSEEK_MODEL is required');

// build child environment via shared module
const childEnv = buildChildEnv(v);

// spawn claude without a shell, passthrough args + stdio
const result = spawnSync('claude', ['--setting-sources', 'project,local', ...args], {
  env: childEnv,
  stdio: 'inherit',
  shell: false,
});

if (result.error) launcherFail(1, `failed to launch claude: ${result.error.message}`);
if (result.signal) process.kill(process.pid, result.signal);
process.exit(result.status ?? 0);
