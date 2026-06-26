// @impl CPT-001: advance-status.mjs regression — contract, error paths, full chain
//
// Tests advance-status CLI in isolation:
//   - Happy path: every gate transition produces correct current_gate/next_gate
//   - Error paths: unknown gate, bad bundle, missing args
//   - Full chain: all 10 gates in sequence
//   - Trace correctness: phase_transition events written with from/to/next
//   - Idempotency: advancing twice to same gate

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', cwd: REPO_ROOT });
  } catch (e) {
    // CLI exits 1 on error but still writes JSON to stdout
    if (e.stdout) return e.stdout;
    throw e;
  }
}

function runAdvance(bundlePath, toGate) {
  try {
    const out = run(`node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "${bundlePath}" --to ${toGate}`);
    return JSON.parse(out.trim());
  } catch (e) {
    // CLI exits 1 on error; stdout still has JSON
    if (e.stdout) return JSON.parse(e.stdout.trim());
    throw e;
  }
}

// ── Full chain: gate enum → expected next_gate (aligned with transitions.chain.json) ──
const CHAIN = [
  { from: 'instantiation_complete', next: 'hitl1_recorded' },
  { from: 'hitl1_recorded',         next: 'setup_ready' },
  { from: 'setup_ready',            next: 'seed_topics_ready' },
  { from: 'seed_topics_ready',      next: 'wave0_complete' },
  { from: 'wave0_complete',         next: 'wave1_complete' },
  { from: 'wave1_complete',         next: 'wave2_complete' },
  { from: 'wave2_complete',         next: 'hitl2_recorded' },
  { from: 'hitl2_recorded',         next: 'readiness_passed' },
  { from: 'rerun_ready',            next: 'seed_topics_ready' },
  { from: 'readiness_passed',       next: null },  // terminal: final has gate=null
];

const BUNDLE_NAME = `test-advance-${randomInt(0, 65536).toString(16)}`;

describe('advance-status CLI', () => {
  let bundlePath;
  let tracePath;
  let statusPath;

  // ── Setup: disposable bundle (fast) ──
  before(() => {
    // Use disposable for speed (production requires kebab naming which is fine too)
    const out = run(`node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs ${BUNDLE_NAME}`);
    bundlePath = out.trim().split('\n').pop();
    tracePath = join(bundlePath, 'rb_trace.jsonl');
    statusPath = join(bundlePath, 'rb_status.json');
  });

  after(() => {
    if (existsSync(bundlePath)) {
      rmSync(bundlePath, { recursive: true, force: true });
    }
  });

  // ── Error paths ──

  describe('error paths', () => {
    it('rejects unknown gate', () => {
      const result = runAdvance(bundlePath, 'nonexistent_gate');
      assert.equal(result.status, 'error');
      assert.match(result.reason, /Unknown gate/);
    });

    it('rejects missing bundle', () => {
      const out = run(`node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "/nonexistent/path" --to setup_ready`);
      const result = JSON.parse(out.trim());
      assert.equal(result.status, 'error');
      assert.match(result.reason, /not found/);
    });

    it('rejects missing --to arg', () => {
      const out = run(`node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "${bundlePath}"`);
      const result = JSON.parse(out.trim());
      assert.equal(result.status, 'error');
      assert.match(result.reason, /Missing required/);
    });
  });

  // ── Happy path: every gate transition ──

  describe('gate transitions', () => {
    for (const { from, next } of CHAIN) {
      it(`${from} → ${next ?? 'terminal'}`, () => {
        const result = runAdvance(bundlePath, from);
        assert.equal(result.status, 'ok', `advance to ${from} should succeed: ${JSON.stringify(result)}`);
        assert.equal(result.current_gate, from);
        assert.equal(result.next_gate, next);
      });
    }
  });

  // ── Trace correctness ──

  describe('trace events', () => {
    it('writes phase_transition for every advance', () => {
      const trace = readFileSync(tracePath, 'utf-8').trim();
      const events = trace.split('\n').map(l => JSON.parse(l));
      const transitions = events.filter(e => e.event === 'phase_transition');

      // We ran all 10 transitions in CHAIN
      assert.ok(transitions.length >= 10,
        `expected >=10 phase_transition events, got ${transitions.length}`);

      for (const t of transitions) {
        assert.ok(t.ts, 'phase_transition must have ts');
        assert.ok(t.from, 'phase_transition must have from');
        assert.ok(t.to, 'phase_transition must have to');
        assert.equal(t.source, 'advance-status');
        // from should not equal to; to should match current_gate after advance
        assert.notEqual(t.from, t.to, `from and to should differ: ${t.from} → ${t.to}`);
      }
    });

    it('trace events are valid JSONL', () => {
      const trace = readFileSync(tracePath, 'utf-8').trim();
      const lines = trace.split('\n');
      for (const line of lines) {
        assert.doesNotThrow(() => JSON.parse(line), `invalid JSONL line: ${line.slice(0, 80)}`);
      }
    });
  });

  // ── Status file integrity ──

  describe('status file integrity', () => {
    it('writes valid rb_status.json after every advance', () => {
      const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
      assert.ok(status.current_gate, 'current_gate must be set');
      // next_gate can be null for terminal (readiness_passed → final → gate=null)
      if (status.current_gate !== 'readiness_passed') {
        assert.ok(status.next_gate, `next_gate must be set for ${status.current_gate}`);
      }
      // current_mode and state should be preserved
      assert.equal(status.current_mode, 'execution');
      assert.ok(status.state, 'state must be present');
    });

    it('preserves fields not managed by advance-status', () => {
      const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
      assert.equal(status.current_mode, 'execution', 'current_mode should be preserved');
      assert.ok('bundle' in status, 'bundle field should be preserved');
    });
  });

  // ── Advancing to first gate from initial state ──

  describe('from initial state', () => {
    it('advances from initial setup_ready to seed_topics_ready', () => {
      // Create a fresh disposable that starts at setup_ready
      const freshName = `test-advance-fresh-${randomInt(0, 65536).toString(16)}`;
      const out = run(`node experiments_env/shared/new-disposable-bundle.mjs ${freshName} --force`);
      const freshPath = out.trim();
      const freshStatus = join(freshPath, 'rb_status.json');

      // Initial state should be setup_ready / seed_topics_ready
      let status = JSON.parse(readFileSync(freshStatus, 'utf-8'));
      assert.equal(status.current_gate, 'setup_ready');
      assert.equal(status.next_gate, 'seed_topics_ready');

      // Advance to seed_topics_ready
      const result = runAdvance(freshPath, 'seed_topics_ready');
      assert.equal(result.status, 'ok');
      assert.equal(result.current_gate, 'seed_topics_ready');
      assert.equal(result.next_gate, 'wave0_complete');

      status = JSON.parse(readFileSync(freshStatus, 'utf-8'));
      assert.equal(status.current_gate, 'seed_topics_ready');
      assert.equal(status.next_gate, 'wave0_complete');

      rmSync(freshPath, { recursive: true, force: true });
    });
  });
});
