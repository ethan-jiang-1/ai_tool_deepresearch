#!/usr/bin/env node
// run-gate-with-monitor.mjs — Gate monitor wrapper preserving outcome and diagnostics
// @impl EXO-003, EXO-004
// Canonical experiment helper: experiments_env/shared/run-gate-with-monitor.mjs
//
// Usage:
//   node run-gate-with-monitor.mjs --bundle <path> --gate <name> -- <gate command...>
//
// Role:
//   Wraps a gate CLI invocation, preserving:
//   - Exit code (process.exit with same code as wrapped gate)
//   - Raw stdout/stderr capture (stream-accumulated to avoid truncation)
//   - Structured artifact persisted under _observability/gates/<seq>-<gate>.json
//   - Non-verdict diagnostic trace event appended to rb_trace.jsonl

import { parseArgs } from 'node:util';
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

// ═══════════════════════════════════════════════════════════════════════════
// CLI Argument Parsing
// ═══════════════════════════════════════════════════════════════════════════

function parseCliArgs() {
  const doubleDashIdx = process.argv.indexOf('--');
  if (doubleDashIdx === -1) {
    console.error('Missing -- separator before gate command');
    process.exit(2);
  }

  const wrapperArgs = process.argv.slice(2, doubleDashIdx);
  const gateCommand = process.argv.slice(doubleDashIdx + 1);

  if (gateCommand.length === 0) {
    console.error('No gate command provided after --');
    process.exit(2);
  }

  const { values } = parseArgs({
    args: wrapperArgs,
    options: {
      bundle: { type: 'string' },
      gate: { type: 'string' },
    },
  });

  if (!values.bundle) {
    console.error('Missing required argument: --bundle <path>');
    process.exit(2);
  }
  if (!values.gate) {
    console.error('Missing required argument: --gate <name>');
    process.exit(2);
  }

  return { bundle: values.bundle, gate: values.gate, command: gateCommand };
}

// ═══════════════════════════════════════════════════════════════════════════
// Artifact Sequence
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Discover the next available monotonic sequence number for a gate artifact.
 * Reads _observability/gates/*.json, finds max sequence, returns max + 1.
 * Returns 1 if no artifacts exist yet.
 *
 * @param {string} bundlePath
 * @returns {number}
 */
function nextSequence(bundlePath) {
  const gatesDir = join(bundlePath, '_observability', 'gates');
  if (!existsSync(gatesDir)) return 1;

  let maxSeq = 0;
  try {
    const files = readdirSync(gatesDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      // Extract leading digits: "0001-wave0-complete.json" → 1
      const match = f.match(/^(\d+)-/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  } catch {
    // If we can't read the directory, start at 1
  }
  return maxSeq + 1;
}

/**
 * Format a sequence number as zero-padded 4-digit string.
 * @param {number} seq
 * @returns {string}
 */
function formatSeq(seq) {
  return String(seq).padStart(4, '0');
}

// ═══════════════════════════════════════════════════════════════════════════
// Diagnostic Trace — EXO-004
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Append a non-verdict diagnostic trace event to rb_trace.jsonl.
 * Never writes `check` events.
 *
 * @param {string} bundlePath
 * @param {object} artifact — the wrapper artifact
 */
function appendDiagnosticTrace(bundlePath, artifact) {
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  try {
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      event: 'diagnostic',
      source: 'experiment-observability',
      kind: 'gate_output',
      gate: artifact.gate,
      passed: artifact.exit_code === 0,
      sequence: artifact.sequence,
      detail: artifact.exit_code === 0
        ? `Gate ${artifact.gate} passed`
        : `Gate ${artifact.gate} failed (exit ${artifact.exit_code})`,
      inspect: artifact.inspect ? artifact.inspect.slice(0, 10) : [],
      advice: artifact.advice ? artifact.advice.slice(0, 5) : [],
    });
    appendFileSync(tracePath, entry + '\n');
  } catch {
    // Diagnostic write failure must not affect gate outcome
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Artifact Persistence
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Write the wrapper artifact to _observability/gates/<seq>-<gate>.json.
 *
 * @param {string} bundlePath
 * @param {object} artifact
 */
function writeArtifact(bundlePath, artifact) {
  const gatesDir = join(bundlePath, '_observability', 'gates');
  try {
    mkdirSync(gatesDir, { recursive: true });
    const filename = `${formatSeq(artifact.sequence)}-${artifact.gate}.json`;
    writeFileSync(join(gatesDir, filename), JSON.stringify(artifact, null, 2));
  } catch {
    // Artifact write failure must not affect gate outcome
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const { bundle, gate, command } = parseCliArgs();

  const seq = nextSequence(bundle);
  const capturedAt = new Date().toISOString();

  // Accumulate stdout and stderr fully (stream, not single-chunk) — Principle 1
  let stdout = '';
  let stderr = '';

  const [cmd, ...cmdArgs] = command;

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('error', (err) => {
      // spawn error — cannot execute the command
      const artifact = {
        sequence: seq,
        gate,
        command: command.join(' '),
        exit_code: null,
        stdout: '',
        stderr: err.message,
        parsed_json: null,
        inspect: [`Cannot execute gate command: ${err.message}`],
        advice: ['Verify the gate CLI path and permissions.'],
        captured_at: capturedAt,
      };

      writeArtifact(bundle, artifact);
      appendDiagnosticTrace(bundle, artifact);

      // Spawn failure → exit 2 (config error, distinct from gate pass/fail)
      process.exit(2);
    });

    child.on('close', (code) => {
      const exitCode = code === null ? -1 : code;

      // Try parsing gate JSON from stdout
      let parsedJson = null;
      let inspect = [];
      let advice = [];

      try {
        parsedJson = JSON.parse(stdout.trim());
        if (Array.isArray(parsedJson.inspect)) inspect = parsedJson.inspect;
        if (Array.isArray(parsedJson.advice)) advice = parsedJson.advice;
      } catch {
        // Gate output may not be parseable JSON — that's fine
        inspect = ['Gate stdout is not valid JSON'];
      }

      const artifact = {
        sequence: seq,
        gate,
        command: command.join(' '),
        exit_code: exitCode,
        stdout,
        stderr,
        parsed_json: parsedJson,
        inspect,
        advice,
        captured_at: capturedAt,
      };

      writeArtifact(bundle, artifact);
      appendDiagnosticTrace(bundle, artifact);

      // Preserve the gate's own stdout so the caller can still read it
      process.stdout.write(stdout);

      // Exit with the wrapped gate's exit code
      process.exit(exitCode);
    });
  });
}

main();
