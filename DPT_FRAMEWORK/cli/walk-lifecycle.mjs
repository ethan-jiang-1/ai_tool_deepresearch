#!/usr/bin/env node
// @impl LFW-001, LFW-002, LFW-003, LFW-004
// walk-lifecycle.mjs — manifest-driven lifecycle walker
//
// Reads manifest.json, iterates phases in order, loads node frontmatter
// via workflow-chain, spawns gate CLIs, records trace + log, and advances.
// Demonstrates fail → repair → pass with bounded retry.
//
// Usage:
//   NODES_DIR=DPT_FRAMEWORK/workflows/nodes \
//   node walk-lifecycle.mjs --bundle dpt_rb_demo
//
//   node walk-lifecycle.mjs --bundle $B --manifest experiments/prototype-wff-validation/manifest.json

import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    manifest: { type: 'string' },
  },
});

if (!values.bundle) {
  console.error('Error: --bundle <path> is required');
  process.exit(2);
}

const bundlePath = values.bundle;
const manifestPath = values.manifest || join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'manifest.json');

// ── Resolve framework paths ──
const { readFileSync } = await import('node:fs');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

// ── Node files location (explicit, no env var) ──
const NODES_DIR = join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'nodes');

// ── Framework imports ──
const [{ createTrace }, { createLogger }, { createWorkflowRuntime, createState, assessNode }] =
  await Promise.all([
    import('../engine/trace.mjs'),
    import('../engine/logger.mjs'),
    import('../engine/workflow-chain.mjs'),
  ]);

// ── Ensure _logs/ directory ──
const logsDir = join(bundlePath, '_logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const trace = createTrace(join(bundlePath, 'rb_trace.jsonl'), { consoleEcho: true });
const log = createLogger({ file: join(bundlePath, '_logs', 'run.log') });

// ── Init trace ──
trace.traceInit(`lifecycle-walker bundle=${bundlePath} manifest=${manifestPath}`);

// ── Repair helper ──
function repairGate(gateName, inspect, advice) {
  log.info(`repairing gate: ${gateName}`, { inspect, advice });

  for (const item of inspect) {
    // Handle "Missing control file: rb_plan.md"
    const match = item.match(/^Missing control file: (.+)$/);
    if (match) {
      const missingFile = match[1];
      const targetPath = join(bundlePath, missingFile);
      if (!existsSync(targetPath)) {
        writeFileSync(targetPath, `# ${missingFile}\n\nCreated by walk-lifecycle repair.\n`);
        log.info(`repaired: created ${missingFile}`);
      }
    }
  }
}

// ── Main loop ──
const MAX_RETRIES = 3;
let totalChecks = 0;
let passedChecks = 0;

for (const phase of manifest.phases) {
  trace.traceEntry('phase_enter', { phase: phase.key });
  log.info(`Entering phase: ${phase.key}`);

  // Load node frontmatter via workflow-chain
  try {
    const runtime = createWorkflowRuntime('engine', NODES_DIR);
    const state = createState();
    const result = assessNode(phase.node, state, runtime, trace, log);
    if (result.status !== 'loaded') {
      log.warn(`node load failed for ${phase.key}: ${result.error || 'unknown'}`);
    }
  } catch (err) {
    log.warn(`node load exception for ${phase.key}: ${err.message}`);
  }

  // Gate check
  if (phase.gate) {
    const gateCli = join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'gates', `check-gate-${phase.gate}.mjs`);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const transitionsPath = join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'transitions.chain.json');
      const { stdout, stderr, status } = spawnSync('node', [gateCli, '--bundle', bundlePath, '--transitions', transitionsPath], {
        encoding: 'utf-8',
        timeout: 30_000,
      });

      if (status === 2) {
        log.error(`gate CLI error: ${stderr}`);
        trace.traceEntry('check', { gate: phase.gate, passed: false, detail: 'CLI exit(2)' });
        break;
      }

      let gateResult;
      try {
        gateResult = JSON.parse(stdout);
      } catch {
        log.error(`gate ${phase.gate}: invalid JSON output`);
        trace.traceEntry('check', { gate: phase.gate, passed: false, detail: 'invalid JSON' });
        break;
      }

      const { check, inspect, advice } = gateResult;
      trace.traceEntry('check', { ...check, inspect, advice });
      totalChecks++;

      if (check.passed) {
        passedChecks++;
        log.info(`Gate: ${phase.gate} → PASS`, { inspect, advice });
        break;
      }

      // Gate failed — repair and retry
      log.warn(`Gate: ${phase.gate} → FAIL (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, { inspect, advice });

      if (attempt < MAX_RETRIES) {
        repairGate(phase.gate, inspect, advice);
      } else {
        // Escalate
        log.error(`Gate: ${phase.gate} → ESCALATED after ${MAX_RETRIES + 1} attempts`);
        trace.traceEntry('escalate', { gate: phase.gate, reason: 'retry limit exceeded', attempts: MAX_RETRIES + 1 });
      }
    }
  }

  log.info(`advance to: ${phase.next || '(none — final)'}`);

  if (phase.gate === null && phase.next === null) {
    log.info('reached final phase — loop complete');
    break;
  }
}

// ── Summary ──
const summary = trace.traceSummary();
log.info(`walk complete: ${totalChecks} gates, ${passedChecks}/${totalChecks} PASS`);
console.log(summary);
