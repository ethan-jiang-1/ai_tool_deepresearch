#!/usr/bin/env node
// @impl AGQ-018: validate-phase-templates.mjs — verify delegated task templates
//   keep controller: "main-agent" + delegates.to: "sub-agent"
// Usage: node DPT_FRAMEWORK/cli/validate-phase-templates.mjs [phase-file.md ...]
// Exit: 0 = PASS, 1 = FAIL

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', B = '\x1b[0m';

function extractJsonBlocks(mdContent) {
  const blocks = [];
  const regex = /```json\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(mdContent)) !== null) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // skip unparseable JSON — not a task card
    }
  }
  return blocks;
}

function checkTaskCard(json, file) {
  const issues = [];
  if (!json.targets) return issues; // not a task card

  // Check controller is main-agent or engine (not sub-agent)
  if (json.targets.controller === 'sub-agent') {
    issues.push(`targets.controller is "sub-agent" — must be "main-agent" or "engine"`);
  }
  if (!json.targets.controller) {
    issues.push('targets.controller missing');
  }

  // If delegates present, check it's to sub-agent with required fields
  if (json.targets.delegates) {
    if (json.targets.delegates.to !== 'sub-agent') {
      issues.push(`targets.delegates.to is "${json.targets.delegates.to}" — must be "sub-agent"`);
    }
    if (!json.targets.delegates.role_key) {
      issues.push('targets.delegates.role_key missing');
    }
    // Must still have controller: "main-agent" when delegating
    if (json.targets.delegates.to === 'sub-agent' && json.targets.controller !== 'main-agent') {
      issues.push(`delegates.to "sub-agent" requires controller: "main-agent", got "${json.targets.controller}"`);
    }
  }

  return issues;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node DPT_FRAMEWORK/cli/validate-phase-templates.mjs <phase-file.md...>');
  process.exit(1);
}

let passed = 0, failed = 0;

for (const file of files) {
  const absPath = resolve(file);
  if (!existsSync(absPath)) {
    console.log(`  ${Y}?${B} ${file}: file not found, skipping`);
    continue;
  }

  const content = readFileSync(absPath, 'utf-8');
  const blocks = extractJsonBlocks(content);
  const taskCards = blocks.filter((b) => b.targets);
  const issues = [];

  for (const card of taskCards) {
    issues.push(...checkTaskCard(card, file).map((i) => `  - ${i}`));
  }

  if (issues.length > 0) {
    console.log(`  ${R}✗${B} ${file}`);
    for (const issue of issues) console.log(issue);
    failed++;
  } else if (taskCards.length > 0) {
    console.log(`  ${G}✓${B} ${file} (${taskCards.length} task card(s))`);
    passed++;
  } else {
    console.log(`  ${G}✓${B} ${file} (no task cards found)`);
    passed++;
  }
}

console.log(`\nPhase templates: ${G}${passed} ok${B}, ${failed > 0 ? R : ''}${failed} failed${B}`);
process.exit(failed > 0 ? 1 : 0);
