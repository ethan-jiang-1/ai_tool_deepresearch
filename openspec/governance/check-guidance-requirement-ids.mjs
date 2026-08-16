#!/usr/bin/env node
// check-guidance-requirement-ids.mjs — deterministic guidance-prose requirement-ID guard.
// Scans openspec/guidance/, openspec/operations/, openspec/constitution/ Markdown
// for requirement-ID tokens ([A-Z]{3}-NNN) and fails any token that does not
// resolve to a registered ID in openspec/governance/req-registry.yaml
// (alive or [DEPRECATED]). Tokens whose prefix is absent from the registry's
// declared prefix set are out of registry scope and skipped (isolated-fixture
// tolerance, mirroring check-spec-req-ids); an empty registry stays strict.
// Registry self-lines and openspec/changes/ artifacts are outside the scan
// surface by construction.
// Usage: node openspec/governance/check-guidance-requirement-ids.mjs [projectRoot]

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-guidance-requirement-ids.mjs [projectRoot]');
  process.exit(2);
}

const rootArg = process.argv[2];
if (process.argv.length > 3) usage('At most one projectRoot positional argument is allowed.');
const ROOT = rootArg ? resolve(rootArg) : process.cwd();

const REGISTRY = join(ROOT, 'openspec', 'governance', 'req-registry.yaml');
const SURFACES = ['guidance', 'operations', 'constitution'].map((d) => join(ROOT, 'openspec', d));
const ID_TOKEN_RE = /[A-Z]{3}-\d{3}/g;

if (!existsSync(REGISTRY)) {
  console.error('Registry not found:', REGISTRY);
  process.exit(2);
}

function walkMarkdown(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkMarkdown(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

const registryText = readFileSync(REGISTRY, 'utf8');
const registered = new Set();
const registryPrefixes = new Set();
for (const line of registryText.split('\n')) {
  const m = line.match(/^([A-Z]{3}-\d{3}):/);
  if (m) {
    registered.add(m[1]);
    registryPrefixes.add(m[1].split('-')[0]);
  }
}

const files = SURFACES.flatMap((d) => walkMarkdown(d));
const violations = []; // { file, token }
let scanned = 0;
let skippedOutOfScope = 0;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(ID_TOKEN_RE)) {
    // Isolated-fixture tolerance (mirrors check-spec-req-ids): when the
    // registry declares prefixes and this token's prefix is not among them,
    // the token is out of this registry's scope. An empty registry stays
    // strict: every token is then unresolved.
    if (registryPrefixes.size > 0 && !registryPrefixes.has(m[0].split('-')[0])) {
      skippedOutOfScope += 1;
      continue;
    }
    scanned += 1;
    if (!registered.has(m[0])) {
      violations.push({ file: file.replace(ROOT + '/', ''), token: m[0] });
    }
  }
}

if (violations.length > 0) {
  console.error(`guidance requirement-ID violations (${violations.length}):`);
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.token}`);
  }
  console.error(
    'Repair: register the ID through the legal lifecycle path (Apply registry sync) or correct the reference.',
  );
  process.exit(1);
}

console.log(
  `guidance requirement IDs: clean (${scanned} token(s) checked, ${skippedOutOfScope} out of registry scope, ${files.length} file(s) scanned).`,
);
