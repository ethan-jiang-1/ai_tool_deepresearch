#!/usr/bin/env node
// check-phase-node-structure.mjs — deterministic phase-node structure guard.
// Enforces the WNC-010 handoff pattern per phase §6, with the declared
// instantiation/HITL1 bootstrap exception and the terminal Final shape.
// The bootstrap exception covers only the advance-status source-gate sync
// step: bootstrap nodes STILL load their check.next target through
// enter-phase (that is the only current_node writer), but they must not
// instruct advance-status in §6. Missing node files are skipped
// (isolated-fixture tolerance).
// Usage: node check-phase-node-structure.mjs [projectRoot]

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-phase-node-structure.mjs [projectRoot]');
  process.exit(2);
}

const rootArg = process.argv[2];
if (process.argv.length > 3) usage('At most one projectRoot positional argument is allowed.');
const ROOT = rootArg ? resolve(rootArg) : process.cwd();
const PHASES = join(ROOT, 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases');

const BOOTSTRAP = ['phase-instantiation.md', 'phase-hitl1.md'];
const MIDDLE = [
  'phase-setup.md',
  'phase-seed-topics.md',
  'phase-wave0.md',
  'phase-wave1.md',
  'phase-wave2.md',
  'phase-hitl2.md',
  'phase-readiness.md',
  'phase-rerun.md',
];
const FINAL = 'phase-final.md';

const failures = [];

function section6(text) {
  const match = text.match(/## 6\. On Gate Pass([\s\S]*?)(?=## 7\.|$)/);
  return match ? match[1] : '';
}

for (const name of BOOTSTRAP) {
  const file = join(PHASES, name);
  if (!existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (!text.includes('兼容例外（WNC-010）')) {
    failures.push(`${name}: missing WNC-010 bootstrap exception label in §6`);
  }
  const six = section6(text);
  if (!six.includes('enter-phase.mjs')) {
    failures.push(`${name}: §6 must instruct enter-phase loading of its check.next target (bootstrap exception does not exempt the node loader)`);
  }
  if (six.includes('advance-status.mjs')) {
    failures.push(`${name}: §6 must not instruct advance-status source-gate sync (bootstrap exception covers only that step)`);
  }
}

for (const name of MIDDLE) {
  const file = join(PHASES, name);
  if (!existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (!text.includes('enter-phase.mjs')) {
    failures.push(`${name}: §6 must instruct enter-phase handoff`);
  }
  if (!text.includes('advance-status.mjs')) {
    failures.push(`${name}: §6 must instruct advance-status synchronization`);
  }
}

const finalFile = join(PHASES, FINAL);
if (existsSync(finalFile)) {
  const text = readFileSync(finalFile, 'utf8');
  if (!text.includes('advance-status')) {
    failures.push(`${FINAL}: must instruct advance-status`);
  }
  if (!text.includes('readiness_passed')) {
    failures.push(`${FINAL}: must reference readiness_passed status sync`);
  }
}

if (failures.length > 0) {
  console.error(`check-phase-node-structure: ${failures.length} violation(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('check-phase-node-structure: clean.');
