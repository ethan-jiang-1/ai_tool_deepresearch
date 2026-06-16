// check-req-ids.mjs — Scan spec/ for duplicate or unregistered requirement IDs
// Usage: node check-req-ids.mjs [projectRoot]

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

const root = process.argv[2] || process.cwd();
const registryPath = join(root, 'DPT_FRAMEWORK', 'req-registry.yaml');
const specsDir = join(root, 'openspec', 'specs');

if (!existsSync(registryPath)) {
  console.error('Registry not found:', registryPath);
  process.exit(1);
}

const registry = parseYaml(readFileSync(registryPath, 'utf-8'));
const registered = new Set(Object.keys(registry).filter((k) => /^[A-Z]{3}-\d{3}$/.test(k)));

// Walk openspec/specs/ directories for requirement declarations
const ids = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.md')) {
      const content = readFileSync(full, 'utf-8');
      const matches = content.matchAll(/[A-Z]{3}-\d{3}/g);
      for (const m of matches) ids.push(m[0]);
    }
  }
}
walk(specsDir);

const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
const unregistered = [...new Set(ids)].filter((id) => !registered.has(id));

if (duplicates.length > 0) {
  console.error('Duplicate IDs:', [...new Set(duplicates)].join(', '));
  process.exit(1);
}
if (unregistered.length > 0) {
  console.error('Unregistered IDs:', unregistered.join(', '));
  process.exit(1);
}
console.log('All requirement IDs valid:', ids.length, 'found,', registered.size, 'registered');
