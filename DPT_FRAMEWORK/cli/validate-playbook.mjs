#!/usr/bin/env node
// validate-playbook.mjs — validates playbook frontmatter against command-experiment/v1 schema
// Usage: node validate-playbook.mjs <playbookFileOrDir>
// Exit: 0 = all PASS, 1 = at least one FAIL

const G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[0m';

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { parseMdFrontmatter } from '../engine/helpers/gate-helpers.mjs';
import { PlaybookFrontmatterSchema } from '../schema/index.mjs';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node validate-playbook.mjs <playbookFileOrDir>');
  process.exit(2);
}

// ---- helpers ----
function collectPlaybooks(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_')) {
      files.push(...collectPlaybooks(full));
    } else if (e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md' && e.name !== 'RUN_TUI_EXPS.md' && e.name !== 'RUN_CLI_EXPS.md') {
      files.push(full);
    }
  }
  return files;
}

function formatIssues(issues) {
  return issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
}

// ---- main ----
const root = process.cwd();
let playbookFiles;
if (statSync(target).isDirectory()) {
  playbookFiles = collectPlaybooks(target);
} else {
  playbookFiles = [target];
}

if (playbookFiles.length === 0) {
  console.log('No playbook files found.');
  process.exit(0);
}

let passed = 0, failed = 0;
for (const filePath of playbookFiles) {
  const relPath = relative(root, filePath);
  const raw = readFileSync(filePath, 'utf-8');
  const frontmatter = parseMdFrontmatter(raw);
  const result = PlaybookFrontmatterSchema.safeParse(frontmatter);

  if (result.success) {
    console.log(`  ${G}✓${B} ${relPath}`);
    passed++;
  } else {
    console.log(`  ${R}✗${B} ${relPath}: ${formatIssues(result.error.issues)}`);
    failed++;
  }
}

console.log(`\nValidate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
