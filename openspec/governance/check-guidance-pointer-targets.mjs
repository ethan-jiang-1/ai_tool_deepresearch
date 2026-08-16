#!/usr/bin/env node
// check-guidance-pointer-targets.mjs — deterministic pointer-target guard.
// Verifies that repository-relative path references in curated guidance/entry
// surfaces resolve to existing files in the current tree.
// Resolution base: paths without a ../ or ./ prefix resolve against the repo
// root for root surfaces and against DEEP_RESEARCH_HARNESS/ for harness
// surfaces (those docs are written harness-relative). Negated references
// ("deliberately no X"), shell variables, and bundle-relative bare paths
// (final/, _work_units/, rb_*) are skipped. Missing surface files are skipped
// (isolated-fixture tolerance).
// Usage: node check-guidance-pointer-targets.mjs [projectRoot]

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-guidance-pointer-targets.mjs [projectRoot]');
  process.exit(2);
}

const rootArg = process.argv[2];
if (process.argv.length > 3) usage('At most one projectRoot positional argument is allowed.');
const ROOT = rootArg ? resolve(rootArg) : process.cwd();
const HARNESS = join(ROOT, 'DEEP_RESEARCH_HARNESS');

const FIXED_SURFACES = [
  'CONTEXT.md',
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'DEEP_RESEARCH_HARNESS/README.md',
  'DEEP_RESEARCH_HARNESS/RUN.md',
  'DEEP_RESEARCH_HARNESS/AGENTS.md',
  'DEEP_RESEARCH_HARNESS/CLAUDE.md',
  'DEEP_RESEARCH_HARNESS/COMMANDS.md',
  'openspec/guidance/models/invariants-brief.md',
];

function walkModels(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkModels(p, out);
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
}

const surfaces = [...FIXED_SURFACES, ...walkModels(join(ROOT, 'openspec/guidance/models'))];
const EXT = /\.(md|mjs|json|yaml|yml)$/;
const BUNDLE_RELATIVE = /^(final|_work_units|_logs|_cache|artifacts|reference|seed_topics)\//;
const failures = [];

function targetExists(docRel, line, token) {
  if (/deliberately no|刻意没有|SHALL NOT contain|does not contain/i.test(line)) return true;
  const p = token.split('#')[0].trim();
  if (!p.includes('/')) return true;
  if (/\$/.test(p)) return true;
  if (/^https?:\/\//.test(p)) return true;
  if (/[<>*]/.test(p)) return true;
  if (/dpt_(rb|disp)_/i.test(p)) return true;
  if (BUNDLE_RELATIVE.test(p)) return true;
  if (!EXT.test(p)) return true;
  let base;
  if (p.startsWith('../') || p.startsWith('./')) {
    base = dirname(join(ROOT, docRel));
  } else {
    base = docRel.startsWith('DEEP_RESEARCH_HARNESS/') ? HARNESS : ROOT;
  }
  return existsSync(resolve(base, p));
}

for (const rel of surfaces) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const [lineNo, line] of lines.entries()) {
    for (const m of line.matchAll(/`([^`\n]+)`/g)) {
      if (!targetExists(rel, line, m[1])) {
        failures.push(`${rel}:${lineNo + 1}: ${m[1]}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`check-guidance-pointer-targets: ${failures.length} broken pointer(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`check-guidance-pointer-targets: clean (${surfaces.length} surfaces scanned).`);
