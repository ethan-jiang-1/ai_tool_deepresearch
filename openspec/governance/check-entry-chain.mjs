#!/usr/bin/env node
// @impl ACR-002, ACR-004
// check-entry-chain.mjs — deterministic entry-file single-source guard.
// Verifies that each entry directory holds AGENTS.md as the sole regular file
// and CLAUDE.md as a symlink resolving to it, so no second copy of the standing
// orders can drift. Failures name the violating surface and the repair (restore
// the symlink to the owning AGENTS.md).
// Usage: node openspec/governance/check-entry-chain.mjs [projectRoot]

import { existsSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-entry-chain.mjs [projectRoot]');
  process.exit(2);
}

const rootArg = process.argv[2];
if (process.argv.length > 3) usage('At most one projectRoot positional argument is allowed.');
const ROOT = rootArg ? resolve(rootArg) : process.cwd();

const ENTRY_DIRS = ['', 'DEEP_RESEARCH_HARNESS'];
const failures = [];

for (const dir of ENTRY_DIRS) {
  const label = dir === '' ? 'root' : dir;
  const agentsPath = join(ROOT, dir, 'AGENTS.md');
  const claudePath = join(ROOT, dir, 'CLAUDE.md');

  if (!existsSync(agentsPath)) {
    failures.push(`${label}: AGENTS.md missing`);
    continue;
  }
  const agentsStat = statSync(agentsPath);
  if (!agentsStat.isFile()) {
    failures.push(`${label}: AGENTS.md is not a regular file`);
    continue;
  }

  if (!existsSync(claudePath)) {
    failures.push(`${label}: CLAUDE.md missing (expected a symlink to AGENTS.md)`);
    continue;
  }
  const claudeLstat = lstatSync(claudePath);
  if (!claudeLstat.isSymbolicLink()) {
    failures.push(`${label}: CLAUDE.md is not a symlink (expected -> AGENTS.md)`);
    continue;
  }
  if (realpathSync(claudePath) !== realpathSync(agentsPath)) {
    failures.push(`${label}: CLAUDE.md symlink does not resolve to the co-located AGENTS.md`);
  }
}

if (failures.length > 0) {
  console.error(`check-entry-chain: ${failures.length} violation(s):`);
  for (const f of failures) console.error(`  ${f}`);
  console.error('  repair: restore CLAUDE.md as a symlink to the co-located AGENTS.md (ln -s AGENTS.md CLAUDE.md).');
  process.exit(1);
}
console.log(`check-entry-chain: clean (${ENTRY_DIRS.length} entry directories checked).`);
