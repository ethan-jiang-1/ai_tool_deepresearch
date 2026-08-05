#!/usr/bin/env node
// @impl EXA-004, PLR-001, VER-006
// Validate command-experiment/v2 playbooks or the canonical manifest corpus.

import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMdFrontmatter } from '../engine/helpers/gate-helpers.mjs';
import { PlaybookFrontmatterSchema } from '../schema/index.mjs';
import { readAndValidateManifest } from '../host_tools/lib/agent-experiment-contract.mjs';

const G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[0m';
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const canonicalPlaybookRoot = join(repoRoot, 'experiments_playbook');
const targetArg = process.argv[2];

if (!targetArg) {
  console.error('Usage: node validate-playbook.mjs <playbookFileOrDir>');
  process.exit(2);
}

function collectPlaybooks(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_')) {
      files.push(...collectPlaybooks(full));
    } else if (entry.isFile() && /^case-\d+-(?:light|standard|heavy)-[a-z0-9-]+\.md$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function formatIssues(issues) {
  return issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
}

const target = resolve(targetArg);
if (!existsSync(target)) {
  console.error(`Target not found: ${targetArg}`);
  process.exit(2);
}

if (target === canonicalPlaybookRoot && lstatSync(target).isDirectory()) {
  try {
    const manifest = readAndValidateManifest({ repoRoot, requireExactCorpus: true });
    for (const entry of manifest.entries) console.log(`  ${G}✓${B} ${relative(repoRoot, entry.fullPath)}`);
    console.log(`\nValidate: ${manifest.entries.length} passed, 0 failed (canonical manifest)`);
    process.exit(0);
  } catch (error) {
    console.log(`  ${R}✗${B} canonical manifest: ${error.message}`);
    console.log('\nValidate: 0 passed, 1 failed');
    process.exit(1);
  }
}

const stat = lstatSync(target);
const playbookFiles = stat.isDirectory() ? collectPlaybooks(target) : [target];
if (playbookFiles.length === 0) {
  console.log('No runnable case-*.md playbook files found.');
  process.exit(0);
}

let passed = 0;
let failed = 0;
for (const filePath of playbookFiles) {
  try {
    const parsed = parseMdFrontmatter(readFileSync(filePath, 'utf8'));
    const result = PlaybookFrontmatterSchema.safeParse(parsed);
    if (!result.success) throw new Error(formatIssues(result.error.issues));
    console.log(`  ${G}✓${B} ${relative(repoRoot, filePath)}`);
    passed += 1;
  } catch (error) {
    console.log(`  ${R}✗${B} ${relative(repoRoot, filePath)}: ${error.message}`);
    failed += 1;
  }
}

console.log(`\nValidate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
