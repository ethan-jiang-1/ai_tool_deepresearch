#!/usr/bin/env node
// check-spec-req-ids.mjs — deterministic spec requirement-ID consistency guard.
// For every main spec with a `> req:` header: every listed ID must be
// registered in req-registry.yaml and must not be DEPRECATED. The header is a
// registry-tracked subset of the spec's requirements, not an exhaustive
// ordered list (body requirement counts routinely exceed header lists in this
// repository), so ordinal counting is deliberately out of scope.
// Missing registry/spec surfaces are skipped (isolated-fixture tolerance).
// Usage: node check-spec-req-ids.mjs [projectRoot]

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-spec-req-ids.mjs [projectRoot]');
  process.exit(2);
}

const rootArg = process.argv[2];
if (process.argv.length > 3) usage('At most one projectRoot positional argument is allowed.');
const ROOT = rootArg ? resolve(rootArg) : process.cwd();

const REGISTRY = join(ROOT, 'openspec/governance/req-registry.yaml');
const SPECS = join(ROOT, 'openspec/specs');

const failures = [];

let registry = new Map();
let registryPrefixes = new Set();
if (existsSync(REGISTRY)) {
  for (const line of readFileSync(REGISTRY, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z]+-\d+):\s*(.+)$/);
    if (m) {
      registry.set(m[1], m[2].trim());
      registryPrefixes.add(m[1].split('-')[0]);
    }
  }
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name === 'spec.md') out.push(p);
  }
  return out;
}

for (const specFile of walk(SPECS)) {
  const text = readFileSync(specFile, 'utf8');
  const header = text.match(/^> req: (.+)$/m);
  if (!header) continue;
  const ids = header[1].split(',').map((s) => s.trim()).filter(Boolean);
  const rel = specFile.slice(ROOT.length + 1).replace(/\\/g, '/');
  // Registry scope: when the registry declares at least one prefix and none of
  // this spec's ID prefixes is declared, the spec is out of this registry's
  // scope (isolated-fixture tolerance). An empty registry stays strict: every
  // listed ID is then unregistered.
  if (
    registryPrefixes.size > 0
    && ids.every((id) => !registryPrefixes.has(id.split('-')[0]))
  ) continue;
  for (const id of ids) {
    const entry = registry.get(id);
    if (!entry) {
      failures.push(`${rel}: ${id} not registered in req-registry.yaml`);
      continue;
    }
    if (entry.includes('[DEPRECATED]')) {
      failures.push(`${rel}: ${id} is DEPRECATED but still listed in the req header`);
    }
  }
}

if (failures.length > 0) {
  console.error(`check-spec-req-ids: ${failures.length} violation(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('check-spec-req-ids: clean.');
