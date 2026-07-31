// @impl REA-001, REA-002, REA-003
// Deterministic declaration and binding helpers for the selected Agent-owned probe.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const HOST_TOOLS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SELECTED_RESEARCH_ACCESS_ADAPTER_REFERENCE = 'DPT_FRAMEWORK/host_tools/research-access-adapter.md';
export const SELECTED_RESEARCH_ACCESS_ADAPTER_PATH = join(HOST_TOOLS_DIR, 'research-access-adapter.md');

export const SELECTED_RESEARCH_ACCESS_ADAPTER = Object.freeze({
  id: 'claude-deepseek-websearch-webfetch/v1',
  host_owner: 'selected Claude CLI host runtime',
  launcher_entry: 'DPT_FRAMEWORK/host_tools/claude-deepseek.mjs',
  launcher_routing: 'deepseek_anthropic_compatible',
  permission_mode: 'generic_non_bypass',
  search_surface: 'WebSearch',
  fetch_surface: 'WebFetch',
});

const UNAVAILABLE_FACTS = Object.freeze({
  surface_absent: Object.freeze({
    root: 'surface_absent',
    owner: 'selected Claude CLI host runtime',
    repair: 'Restore a callable selected WebSearch/WebFetch surface, then let the Agent rerun the same bounded probe and Gate.',
  }),
  permission_required: Object.freeze({
    root: 'permission_required',
    owner: 'selected Claude CLI host policy',
    repair: 'Resolve the selected host permission boundary, then let the Agent rerun the same bounded probe and Gate.',
  }),
});

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`missing YAML frontmatter in ${SELECTED_RESEARCH_ACCESS_ADAPTER_REFERENCE}`);
  return parseYaml(match[1]);
}

export function readSelectedResearchAccessAdapterContract() {
  const contract = frontmatter(readFileSync(SELECTED_RESEARCH_ACCESS_ADAPTER_PATH, 'utf8'));
  if (contract?.schema !== 'research-access-adapter/v1') throw new Error('selected research-access adapter has an unsupported schema');
  if (contract?.adapter_id !== SELECTED_RESEARCH_ACCESS_ADAPTER.id) throw new Error('selected research-access adapter identity drifted');
  if (contract?.launcher?.entry !== SELECTED_RESEARCH_ACCESS_ADAPTER.launcher_entry
    || contract?.launcher?.routing !== SELECTED_RESEARCH_ACCESS_ADAPTER.launcher_routing
    || contract?.launcher?.permission_mode !== SELECTED_RESEARCH_ACCESS_ADAPTER.permission_mode) {
    throw new Error('selected research-access adapter launcher declaration drifted');
  }
  if (contract?.operations?.search?.surface !== SELECTED_RESEARCH_ACCESS_ADAPTER.search_surface
    || contract?.operations?.fetch?.surface !== SELECTED_RESEARCH_ACCESS_ADAPTER.fetch_surface) {
    throw new Error('selected research-access adapter operation declaration drifted');
  }
  return contract;
}

function permissionBypassAt(argv, index) {
  const argument = argv[index];
  if (argument === '--dangerously-skip-permissions' || argument.startsWith('--dangerously-skip-permissions=')) return argument;
  if (argument === '--allow-dangerously-skip-permissions' || argument.startsWith('--allow-dangerously-skip-permissions=')) return argument;
  if (argument.startsWith('--permission-mode=')) {
    return argument.slice('--permission-mode='.length).trim().toLowerCase() === 'bypasspermissions' ? argument : null;
  }
  if (argument === '--permission-mode' && String(argv[index + 1] ?? '').trim().toLowerCase() === 'bypasspermissions') {
    return `${argument} ${argv[index + 1]}`;
  }
  return null;
}

export function callerSuppliedPermissionBypass(argv) {
  if (!Array.isArray(argv) || argv.some((argument) => typeof argument !== 'string')) {
    throw new TypeError('Claude argv must be an array of strings');
  }
  for (let index = 0; index < argv.length; index += 1) {
    const option = permissionBypassAt(argv, index);
    if (option) return { option, index };
  }
  return null;
}

export function buildSelectedResearchAccessAdapterInvocation({ launcherPath, claudeArgs }) {
  if (typeof launcherPath !== 'string' || !launcherPath) throw new TypeError('selected adapter launcher path is required');
  const bypass = callerSuppliedPermissionBypass(claudeArgs);
  if (bypass) throw new Error(`selected research-access adapter rejects caller-supplied permission bypass: ${bypass.option}`);
  return {
    claude_args: [...claudeArgs],
    adapter_invocation: {
      adapter_id: SELECTED_RESEARCH_ACCESS_ADAPTER.id,
      adapter_contract: SELECTED_RESEARCH_ACCESS_ADAPTER_REFERENCE,
      host_owner: SELECTED_RESEARCH_ACCESS_ADAPTER.host_owner,
      launcher_entry: SELECTED_RESEARCH_ACCESS_ADAPTER.launcher_entry,
      launcher_routing: SELECTED_RESEARCH_ACCESS_ADAPTER.launcher_routing,
      permission_mode: SELECTED_RESEARCH_ACCESS_ADAPTER.permission_mode,
      caller_supplied_permission_bypass: false,
    },
  };
}

function isHttpUrl(value) {
  if (typeof value !== 'string' || !value || /[\x00-\x20\x7f]/.test(value)) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

// This checks declared URL identity only. It does not evaluate page content or prove a provider call.
export function validateSelectedAdapterSameUrlBinding({ candidateUrl, fetchTargetUrl, resultUrl }) {
  if (!isHttpUrl(candidateUrl)) {
    return { same_url_bound: false, code: 'no_eligible_candidate', provider_availability_proven: false };
  }
  if (fetchTargetUrl !== candidateUrl || resultUrl !== candidateUrl) {
    return { same_url_bound: false, code: 'same_url_mismatch', provider_availability_proven: false };
  }
  return { same_url_bound: true, code: null, provider_availability_proven: false };
}

export function selectedAdapterUnavailableFact(root) {
  return UNAVAILABLE_FACTS[root] ?? null;
}

export function selectedAdapterUnavailableRoot(reason) {
  if (typeof reason !== 'string') return null;
  const prefix = reason.split(':', 1)[0].trim();
  return selectedAdapterUnavailableFact(prefix) ? prefix : null;
}
