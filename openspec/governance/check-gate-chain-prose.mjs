#!/usr/bin/env node
// check-gate-chain-prose.mjs — deterministic gate-chain prose guard.
// Fails any Harness guidance Markdown line that enumerates a gate progression
// as an ordered arrow sequence: one line containing two or more distinct gate
// enum values connected by `→` or `->`. The gate enum set is read at check
// time from DEEP_RESEARCH_HARNESS/workflows/manifest.json phase gate keys;
// this checker keeps no enum inventory of its own. A pointer that names the
// single-source files without enumerating a progression passes.
// Fail-closed: a missing or unparseable manifest, or one that declares no
// phase gate keys, exits 1.
// Usage: node openspec/governance/check-gate-chain-prose.mjs [projectRoot]

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-gate-chain-prose.mjs [projectRoot]');
  process.exit(2);
}

const rootArg = process.argv[2];
if (process.argv.length > 3) usage('At most one projectRoot positional argument is allowed.');
const ROOT = rootArg ? resolve(rootArg) : process.cwd();
const HARNESS = join(ROOT, 'DEEP_RESEARCH_HARNESS');
const MANIFEST = join(HARNESS, 'workflows', 'manifest.json');

function walkMarkdown(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const entry = join(dir, name);
    const s = statSync(entry);
    if (s.isDirectory()) walkMarkdown(entry, out);
    else if (name.endsWith('.md')) out.push(entry);
  }
  return out;
}

let gateEnums;
try {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  gateEnums = (Array.isArray(manifest.phases) ? manifest.phases : [])
    .map((phase) => phase && phase.gate)
    .filter((gate) => typeof gate === 'string' && gate.length > 0);
} catch (error) {
  console.error(`gate-chain-prose: FAIL cannot read gate enum source ${relative(ROOT, MANIFEST)} — ${error.message}`);
  process.exit(1);
}
if (gateEnums.length === 0) {
  console.error(`gate-chain-prose: FAIL gate enum source ${relative(ROOT, MANIFEST)} declares no phase gate keys`);
  process.exit(1);
}

const enumPattern = gateEnums
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((gate) => gate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const gateToken = new RegExp(`(?<![A-Za-z0-9_-])(?:${enumPattern})(?![A-Za-z0-9_-])`, 'g');

const violations = [];
let scanned = 0;
for (const file of walkMarkdown(HARNESS)) {
  scanned += 1;
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/→|->/.test(line)) continue;
    const distinct = [...new Set(line.match(gateToken) || [])];
    if (distinct.length >= 2) {
      violations.push({ file: relative(ROOT, file), line: index + 1, sequence: distinct.join(' → ') });
    }
  }
}

if (violations.length > 0) {
  for (const v of violations) {
    console.log(`gate-chain-prose: FAIL ${v.file}:${v.line} — gate chain in prose: ${v.sequence}`);
  }
  console.log(`gate-chain-prose: FAIL ${violations.length} handwritten gate chain line(s); replace each with a pointer to workflows/manifest.json + workflows/transitions.chain.json`);
  process.exit(1);
}

console.log(`gate-chain-prose: PASS scanned ${scanned} Markdown files against ${gateEnums.length} gate enums from workflows/manifest.json`);
