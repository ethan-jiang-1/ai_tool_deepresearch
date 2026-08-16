#!/usr/bin/env node
// check-surface-inventory.mjs — deterministic surface-inventory guard.
// Verifies that the "current executable surface" statements in the harness
// README and the framework-runtime-boundary model match the real cli/ tree.
// Missing surface files are skipped (isolated-fixture tolerance).
// Usage: node check-surface-inventory.mjs [projectRoot]

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-surface-inventory.mjs [projectRoot]');
  process.exit(2);
}

const rootArg = process.argv[2];
if (process.argv.length > 3) usage('At most one projectRoot positional argument is allowed.');
const ROOT = rootArg ? resolve(rootArg) : process.cwd();

const README = join(ROOT, 'DEEP_RESEARCH_HARNESS/README.md');
const MODEL = join(ROOT, 'openspec/guidance/models/framework-runtime-boundary.md');
const CLI_DIR = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli');
const GATES_DIR = join(CLI_DIR, 'gates');

const failures = [];
const CORE_TOOLS = [
  'instantiate-run-bundle.mjs',
  'validate-bundle.mjs',
  'inspect-bundle.mjs',
  'operate-queue.mjs',
  'operate-work-unit.mjs',
  'enter-phase.mjs',
  'advance-status.mjs',
  'check-reentry.mjs',
  'audit-phase-status.mjs',
  'log-event.mjs',
];

for (const [rel, file] of [['DEEP_RESEARCH_HARNESS/README.md', README], ['openspec/guidance/models/framework-runtime-boundary.md', MODEL]]) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  const hasPointer = text.includes('完整清单以 `cli/` 目录为准') || text.includes('完整 CLI 清单以 `cli/` 目录为准');
  if (!hasPointer) {
    failures.push(`${rel}: missing directory-as-truth pointer sentence`);
  }
  if (text.includes('CLI，包括 `instantiate-run-bundle.mjs`')) {
    failures.push(`${rel}: stale closed four-tool list still present`);
  }
  if (text.includes('当前 10 个') && !text.includes('cli/gates')) {
    failures.push(`${rel}: gate count claim without cli/gates reference`);
  }
}

if (existsSync(CLI_DIR)) {
  for (const tool of CORE_TOOLS) {
    if (!existsSync(join(CLI_DIR, tool))) {
      failures.push(`cli/${tool} named in surface docs but missing from cli/`);
    }
  }
  const gates = existsSync(GATES_DIR) ? readdirSync(GATES_DIR).filter((n) => n.startsWith('check-gate-') && n.endsWith('.mjs')) : [];
  if (README.includes && existsSync(README) && readFileSync(README, 'utf8').includes('当前 10 个') && gates.length !== 10) {
    failures.push(`cli/gates check-gate-*.mjs count is ${gates.length}, docs claim 10`);
  }
}

if (failures.length > 0) {
  console.error(`check-surface-inventory: ${failures.length} violation(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('check-surface-inventory: clean.');
