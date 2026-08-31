#!/usr/bin/env node
// @impl RET-011
// check-code-impl-ids.mjs — deterministic code implementation-tag
// requirement-ID consistency guard (RET-011). For every first-party .mjs under
// the three covered code surfaces (DEEP_RESEARCH_HARNESS/, openspec/governance/,
// tests/): every requirement-ID token on an @impl line must resolve to a
// registered ID in req-registry.yaml. Bug-namespace tokens (BUG-<digits>) are
// out of scope, mirroring the BUG_ID_RE exclusion in check-project-reqs.mjs.
// Registered [DEPRECATED] entries remain resolvable as historical annotation
// (deprecated IDs are never deleted from the registry). Registry is the single
// Source of Record; this checker derives violations from the live registry and
// code surface and keeps no ID inventory (GSK-011 posture: derived evidence,
// no permanent catalog). Read-only: it never creates, repairs, or mutates files.
// Usage: node check-code-impl-ids.mjs [projectRoot]

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

const COVERED_SURFACES = ['DEEP_RESEARCH_HARNESS', 'openspec/governance', 'tests'];
const ID_TOKEN_RE = /[A-Z]{3}-\d{3}/g;
const BUG_ID_RE = /^BUG-\d+$/;
const REGISTRY_ID_RE = /^[A-Z]{3}-\d{3}$/;
const SKIPPED_DIRS = new Set(['node_modules', '.git']);

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-code-impl-ids.mjs [projectRoot]');
  process.exit(2);
}

const rootArg = process.argv[2];
if (process.argv.length > 3) usage('At most one projectRoot positional argument is allowed.');
const ROOT = rootArg ? resolve(rootArg) : process.cwd();

const REGISTRY = join(ROOT, 'openspec', 'governance', 'req-registry.yaml');
if (!existsSync(REGISTRY)) {
  console.error(`check-code-impl-ids: registry not found: ${REGISTRY}`);
  process.exit(1);
}

let registry;
try {
  registry = parseYaml(readFileSync(REGISTRY, 'utf8'));
} catch (error) {
  console.error(`check-code-impl-ids: registry cannot be parsed: ${error.message}`);
  process.exit(1);
}
const registered = new Set(
  registry && typeof registry === 'object' && !Array.isArray(registry)
    ? Object.keys(registry).filter((key) => REGISTRY_ID_RE.test(key))
    : [],
);

function walkMjs(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(name)) continue;
    const entry = join(dir, name);
    const s = statSync(entry);
    if (s.isDirectory()) walkMjs(entry, out);
    else if (name.endsWith('.mjs')) out.push(entry);
  }
  return out;
}

const failures = [];
let filesScanned = 0;
let implLines = 0;
let tokensValidated = 0;

for (const surface of COVERED_SURFACES) {
  const surfaceDir = join(ROOT, surface);
  if (!existsSync(surfaceDir)) continue; // isolated-fixture tolerance: a surface may be absent in a minimal fixture root
  for (const file of walkMjs(surfaceDir)) {
    filesScanned += 1;
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.includes('@impl')) continue;
      implLines += 1;
      for (const match of line.matchAll(ID_TOKEN_RE)) {
        const id = match[0];
        if (BUG_ID_RE.test(id)) continue;
        tokensValidated += 1;
        if (!registered.has(id)) {
          failures.push(
            `${rel}:${index + 1}: ${id} not registered in req-registry.yaml (register via lifecycle or correct the @impl tag)`,
          );
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`check-code-impl-ids: ${failures.length} violation(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(
  `check-code-impl-ids: clean (${filesScanned} files, ${implLines} @impl lines, ${tokensValidated} tokens validated).`,
);
