#!/usr/bin/env node
// rollout-observability.mjs — Mechanical rollout of gate wrapper + health checks
// @impl EXO-003, EXO-006
//
// Usage:
//   node rollout-observability.mjs --mode wrapper   # wrap gate CLI calls
//   node rollout-observability.mjs --mode health    # add post-verdict health checks
//   node rollout-observability.mjs --mode both      # do both
//
// Reads playbook files under experiments_playbook/ and applies mechanical edits.
// Idempotent: files already edited are skipped.

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const PLAYBOOK_DIR = join(ROOT, 'experiments_playbook');

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════

const { values } = parseArgs({
  options: {
    mode: { type: 'string', default: 'both' },
    dryRun: { type: 'boolean', default: false },
  },
});

const MODE = values.mode; // 'wrapper' | 'health' | 'both'
const DRY_RUN = values.dryRun;

// ═══════════════════════════════════════════════════════════════════════════
// Gate Wrapper Rollout
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract gate name from a gate CLI path.
 *  "check-gate-wave0-complete.mjs" → "wave0-complete"
 *  "check-gate-seed-topics-ready.mjs" → "seed-topics-ready"
 */
function gateNameFromCli(cliPath) {
  const m = cliPath.match(/check-gate-(.+)\.mjs/);
  return m ? m[1] : null;
}

/**
 * Wrap a gate CLI call with run-gate-with-monitor.mjs.
 * Preserves existing || true guard and variable capture.
 *
 * Patterns handled:
 *   GATE_OUTPUT=$(node <cli> --bundle $B ...)
 *   GATE_OUTPUT=$(node <cli> --bundle $B ... || true)
 *   node <cli> --bundle $B ...
 */
function wrapGateCall(line) {
  // Skip if already wrapped
  if (line.includes('run-gate-with-monitor.mjs')) return line;

  // Pattern: <prefix>node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-<name>.mjs <args><suffix>
  const re = /^(.*?)node\s+(DEEP_RESEARCH_HARNESS\/cli\/gates\/check-gate-.+?\.mjs)(\s+--bundle\s+\S+.*?)(\s*\|\|\s*true)?(\s*\)?\s*)$/;
  const m = line.match(re);
  if (!m) return line;

  const prefix = m[1];
  const cliPath = m[2];
  const args = m[3];
  const guard = m[4] || '';
  const suffix = m[5];

  const gate = gateNameFromCli(cliPath);
  if (!gate) return line;

  // Reconstruct: wrap gate CLI, preserve guard outside wrapper
  return `${prefix}node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate ${gate} -- node ${cliPath}${args}${guard}${suffix}`;
}

function processWrapper(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  const lines = content.split('\n');
  const newLines = [];

  for (const line of lines) {
    // Only wrap lines containing gate CLI paths
    if (line.includes('DEEP_RESEARCH_HARNESS/cli/gates/check-gate-') && !line.includes('run-gate-with-monitor')) {
      const wrapped = wrapGateCall(line);
      if (wrapped !== line) {
        newLines.push(wrapped);
        modified = true;
        continue;
      }
    }
    newLines.push(line);
  }

  if (modified) {
    const newContent = newLines.join('\n');
    if (!DRY_RUN) writeFileSync(filePath, newContent);
    return { file: filePath, status: 'wrapped' };
  }
  return { file: filePath, status: 'skipped' };
}

// ═══════════════════════════════════════════════════════════════════════════
// Health Check Rollout
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine the health profile for a playbook based on frontmatter weight
 * and filename cost label.
 *   weight: heavy → heavy
 *   filename includes 'heavy' → heavy
 *   filename includes 'standard' → standard
 *   default → standard (for gate-CLI playbooks)
 */
function healthProfileFor(content, filePath) {
  if (filePath.includes('-heavy-')) return 'heavy';
  if (filePath.includes('-standard-')) return 'standard';
  return 'light';
}

/**
 * Check if a playbook already has a health check step.
 */
function hasHealthCheck(content) {
  return content.includes('verify-bundle-health.mjs');
}

/**
 * Add a Post-Execution Health step before the Cleanup step.
 * Inserts after the last verdict/result step and before Cleanup.
 */
function addHealthCheck(filePath) {
  let content = readFileSync(filePath, 'utf-8');

  if (hasHealthCheck(content)) {
    return { file: filePath, status: 'already-done' };
  }

  const profile = healthProfileFor(content, filePath);

  // Find the Cleanup step heading
  const cleanupMatch = content.match(/^(##\s+Step\s+\d+:\s*Cleanup)/m);
  if (!cleanupMatch) {
    return { file: filePath, status: 'no-cleanup-found' };
  }

  const healthStep = `
## Step HH: Post-Execution Health

${profile === 'heavy' ? 'Heavy' : 'Standard'} profile — gate diagnostics, timeline consistency${profile === 'heavy' ? ', ledger, receipts, cache trails, source recoverability' : ''}.

\`\`\`bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile ${profile}
\`\`\`

> 健康检查不改变 verdict。health status 由 runner report 记录。

`;

  // Insert before Cleanup
  const idx = content.indexOf(cleanupMatch[0]);
  content = content.slice(0, idx) + healthStep + content.slice(idx);

  if (!DRY_RUN) writeFileSync(filePath, content);
  return { file: filePath, status: 'health-added' };
}

// ═══════════════════════════════════════════════════════════════════════════
// File Discovery
// ═══════════════════════════════════════════════════════════════════════════

function findPlaybooks(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.')) {
      results.push(...findPlaybooks(full));
    } else if (e.isFile() && e.name.endsWith('.md') && e.name.startsWith('case-')) {
      results.push(full);
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

console.log('Mode:', MODE, DRY_RUN ? '(dry run)' : '');
console.log('');

const allFiles = findPlaybooks(PLAYBOOK_DIR);
const results = [];

for (const file of allFiles) {
  if (MODE === 'wrapper' || MODE === 'both') {
    const r = processWrapper(file);
    if (r.status !== 'skipped') results.push(r);
  }
  if (MODE === 'health' || MODE === 'both') {
    const r = addHealthCheck(file);
    if (r.status !== 'skipped') results.push(r);
  }
}

// Summary
const wrapped = results.filter(r => r.status === 'wrapped');
const healthAdded = results.filter(r => r.status === 'health-added');
const alreadyDone = results.filter(r => r.status === 'already-done');
const skipped = results.filter(r => r.status === 'skipped' || r.status === 'no-cleanup-found');

if (wrapped.length > 0) {
  console.log(`\n=== Wrapped gate calls (${wrapped.length}) ===`);
  for (const r of wrapped) console.log('  ' + r.file.replace(ROOT + '/', ''));
}
if (healthAdded.length > 0) {
  console.log(`\n=== Health checks added (${healthAdded.length}) ===`);
  for (const r of healthAdded) console.log('  ' + r.file.replace(ROOT + '/', ''));
}
if (alreadyDone.length > 0) {
  console.log(`\n=== Already done (${alreadyDone.length}) ===`);
  for (const r of alreadyDone) console.log('  ' + r.file.replace(ROOT + '/', ''));
}

console.log(`\nTotal: ${wrapped.length} wrapped, ${healthAdded.length} health, ${alreadyDone.length} already, ${skipped.length} skipped`);
