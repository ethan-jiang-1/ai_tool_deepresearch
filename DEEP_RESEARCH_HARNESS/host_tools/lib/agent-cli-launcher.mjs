// @impl LDC-001, LDC-002, LDC-005, LDC-008, LDC-009, EXA-003, EXA-008
// Pure Agent CLI invocation planning shared by the generic launcher and Supervisor.

import { resolve } from 'node:path';

import { buildChildEnv, parseEnvFile, validateEndpoint } from './env-deepseek.mjs';

export const INTERACTIVE_PROMPT_MAX_BYTES = 128 * 1024;

export function loadAgentCliBase({ repoRoot, executable = 'claude', extraEnv = {} }) {
  const envPath = resolve(repoRoot, '.env');
  const parsed = parseEnvFile(envPath);
  if (parsed.error) throw new Error(parsed.error);
  const vars = parsed.vars;
  if (!vars.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is required');
  if (!vars.DEEPSEEK_ANTHROPIC_BASE_URL) throw new Error('DEEPSEEK_ANTHROPIC_BASE_URL is required');
  if (!validateEndpoint(vars.DEEPSEEK_ANTHROPIC_BASE_URL)) throw new Error('DEEPSEEK_ANTHROPIC_BASE_URL is invalid');
  if (!vars.DEEPSEEK_MODEL) throw new Error('DEEPSEEK_MODEL is required');
  return {
    executable,
    env: buildChildEnv(vars, extraEnv),
    secretValues: [vars.DEEPSEEK_API_KEY].filter(Boolean),
    routing: { provider: 'deepseek_anthropic_compatible', model: vars.DEEPSEEK_MODEL },
  };
}

export function buildHeadlessAgentCliPlan({ repoRoot, maxBudgetUsd, executable = 'claude', extraEnv = {} }) {
  if (!Number.isFinite(maxBudgetUsd) || maxBudgetUsd <= 0) throw new Error('maxBudgetUsd must be positive');
  const base = loadAgentCliBase({ repoRoot, executable, extraEnv });
  return {
    ...base,
    mode: 'headless_agent',
    args: [
      '--setting-sources', 'project,local',
      '-p',
      '--output-format', 'stream-json',
      '--verbose',
      '--no-session-persistence',
      '--permission-mode', 'bypassPermissions',
      '--max-budget-usd', String(maxBudgetUsd),
    ],
    stdio: ['pipe', 'pipe', 'pipe'],
  };
}

export function buildInteractiveAgentCliPlan({ repoRoot, prompt, executable = 'claude', extraEnv = {} }) {
  if (typeof prompt !== 'string' || !prompt) throw new Error('interactive prompt is required');
  const promptBytes = Buffer.byteLength(prompt, 'utf8');
  if (promptBytes > INTERACTIVE_PROMPT_MAX_BYTES) throw new Error(`interactive prompt exceeds ${INTERACTIVE_PROMPT_MAX_BYTES} UTF-8 bytes`);
  const base = loadAgentCliBase({ repoRoot, executable, extraEnv });
  return {
    ...base,
    mode: 'interactive_agent',
    args: ['--setting-sources', 'project,local', prompt],
    stdio: 'inherit',
    promptBytes,
  };
}
