// gate-helpers-core.test.mjs
// Tests for gate-helpers-core.mjs: Gate CLI lifecycle — args, routing, results, trace, checkpoints.
// @impl GSK-005, TRW-003, GSK-006
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  writeGateAttempt,
  writeGateFailureDiagnostic,
  buildGateResult,
  parseGateCliArgs,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-gate-helpers-core-tmp');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

// ── Helpers ──────────────────────────────────────────────────────────────

function setupBundle(bundleName) {
  const bundleDir = join(TMP, `dpt_rb_${bundleName}`);
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify({ bundle: bundleName }));
  return bundleDir;
}

function makeGateResult(passed, gate = 'test-gate') {
  return {
    check: { passed, gate, currentNodeRef: 'phases/phase-test.md', next: passed ? 'phases/phase-next.md' : null },
    routing: { kind: passed ? 'next' : 'retry', next: passed ? 'phases/phase-next.md' : null },
    inspect: passed ? [] : ['rule 1 failed'],
    advice: passed ? [] : ['fix rule 1'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// writeGateAttempt — GSK-005, TRW-003
// ═══════════════════════════════════════════════════════════════════════════

describe('writeGateAttempt (GSK-005, TRW-003)', () => {
  it('writes gate_attempt to rb_trace.jsonl with bundle field', () => {
    const b = setupBundle('test-gate-trace');
    const result = makeGateResult(true);
    writeGateAttempt(b, result);

    const tracePath = join(b, 'rb_trace.jsonl');
    assert.ok(existsSync(tracePath));
    const content = readFileSync(tracePath, 'utf-8');
    const entry = JSON.parse(content.trim().split('\n')[0]);
    assert.strictEqual(entry.event, 'gate_attempt');
    assert.strictEqual(entry.gate, 'test-gate');
    assert.strictEqual(entry.passed, true);
    assert.strictEqual(entry.bundle, 'test-gate-trace');
  });

  it('writes gate_attempt to _logs/run.log with unified envelope and bundle', () => {
    const b = setupBundle('test-gate-log');
    const result = makeGateResult(false);
    writeGateAttempt(b, result);

    const logPath = join(b, '_logs', 'run.log');
    assert.ok(existsSync(logPath));
    const content = readFileSync(logPath, 'utf-8');
    assert.match(content, /^\[.+\] WARN gate_attempt bundle=test-gate-log/);
    assert.ok(content.includes('"gate":"test-gate"'));
  });

  it('PASS gate writes INFO level log', () => {
    const b = setupBundle('test-gate-pass');
    writeGateAttempt(b, makeGateResult(true));
    const content = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.match(content, /INFO gate_attempt/);
  });

  it('FAIL gate writes WARN level log', () => {
    const b = setupBundle('test-gate-fail');
    writeGateAttempt(b, makeGateResult(false));
    const content = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.match(content, /WARN gate_attempt/);
  });

  it('never throws when bundle dir does not exist', () => {
    assert.doesNotThrow(() => writeGateAttempt('/nonexistent/path', makeGateResult(true)));
  });

  it('bundle matches rb_status.json value', () => {
    const b = setupBundle('test-gate-match');
    writeGateAttempt(b, makeGateResult(true));

    const traceContent = readFileSync(join(b, 'rb_trace.jsonl'), 'utf-8');
    const traceEntry = JSON.parse(traceContent.trim().split('\n')[0]);
    assert.strictEqual(traceEntry.bundle, 'test-gate-match');

    const logContent = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.ok(logContent.includes('bundle=test-gate-match'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// writeGateFailureDiagnostic
// ═══════════════════════════════════════════════════════════════════════════

describe('writeGateFailureDiagnostic returns status', () => {
  it('returns { ok: true, path } on success', () => {
    const dir = setupBundle('test-diag-status');
    const result = makeGateResult(false, 'test-gate');
    const status = writeGateFailureDiagnostic(dir, result);
    assert.equal(status.ok, true);
    assert.ok(status.path.includes('_diagnostics/gates/'));
    assert.ok(status.path.includes('test-gate'));
    const artifactPath = join(dir, status.path);
    assert.ok(existsSync(artifactPath));
  });

  it('returns { ok: true } for passed gate (no-op)', () => {
    const dir = setupBundle('test-diag-pass');
    const result = makeGateResult(true, 'test-gate');
    const status = writeGateFailureDiagnostic(dir, result);
    assert.equal(status.ok, true);
    assert.equal(status.path, undefined);
  });
});

describe('writeGateAttempt diagnostic_path in log detail', () => {
  it('includes diagnostic_path in failed gate log', () => {
    const dir = setupBundle('test-diag-log');
    const result = makeGateResult(false, 'test-gate');
    writeGateAttempt(dir, result);

    const logContent = readFileSync(join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(logContent.includes('gate_attempt'));
    assert.ok(logContent.includes('diagnostic_path'));
    assert.ok(logContent.includes('_diagnostics/gates/'));
    assert.ok(logContent.includes('test-gate'));

    // Verify diagnostic artifact actually exists at the logged path
    const diagPathMatch = logContent.match(/"diagnostic_path":"([^"]+)"/);
    assert.ok(diagPathMatch);
    assert.ok(existsSync(join(dir, diagPathMatch[1])));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// parseGateCliArgs
// ═══════════════════════════════════════════════════════════════════════════

describe('parseGateCliArgs preserves bundle in error returns', () => {
  it('includes bundle when --current-node is missing but --bundle is provided', () => {
    const savedArgv = process.argv;
    try {
      process.argv = ['node', 'test.mjs', '--bundle', '/tmp/test-bundle'];
      const args = parseGateCliArgs();
      assert.equal(args.bundle, '/tmp/test-bundle');
      assert.ok(args.error);
      assert.equal(args.error.routing.kind, 'invalid_input');
    } finally {
      process.argv = savedArgv;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GSK-006: --attempt option and fatigue diagnostics
// ═══════════════════════════════════════════════════════════════════════════

describe('parseGateCliArgs --attempt (GSK-006)', () => {
  const savedArgv = process.argv;

  after(() => {
    process.argv = savedArgv;
  });

  it('parses valid --attempt integer', () => {
    process.argv = ['node', 'test.mjs', '--bundle', '/tmp/b', '--current-node', 'phases/phase-wave0.md', '--attempt', '5'];
    const args = parseGateCliArgs();
    assert.equal(args.attempt, 5);
    assert.equal(args.error, null);
  });

  it('defaults to 0 when --attempt is omitted', () => {
    process.argv = ['node', 'test.mjs', '--bundle', '/tmp/b', '--current-node', 'phases/phase-wave0.md'];
    const args = parseGateCliArgs();
    assert.equal(args.attempt, 0);
  });

  it('falls back to 0 for bare --attempt flag', () => {
    process.argv = ['node', 'test.mjs', '--bundle', '/tmp/b', '--current-node', 'phases/phase-wave0.md', '--attempt'];
    const args = parseGateCliArgs();
    assert.equal(args.attempt, 0);
  });

  it('falls back to 0 when --attempt value is missing and followed by another option', () => {
    process.argv = ['node', 'test.mjs', '--bundle', '/tmp/b', '--current-node', 'phases/phase-wave0.md', '--attempt', '--transitions', '/tmp/t.json'];
    const args = parseGateCliArgs();
    assert.equal(args.attempt, 0);
    assert.ok(args.transitions === '/tmp/t.json' || args.transitions.endsWith('transitions.chain.json'));
  });

  it('falls back to 0 for unparseable --attempt value', () => {
    process.argv = ['node', 'test.mjs', '--bundle', '/tmp/b', '--current-node', 'phases/phase-wave0.md', '--attempt', 'abc'];
    const args = parseGateCliArgs();
    assert.equal(args.attempt, 0);
  });

  it('falls back to 0 for negative --attempt value', () => {
    process.argv = ['node', 'test.mjs', '--bundle', '/tmp/b', '--current-node', 'phases/phase-wave0.md', '--attempt', '-1'];
    const args = parseGateCliArgs();
    assert.equal(args.attempt, 0);
  });

  it('falls back to 0 for non-integer --attempt value', () => {
    process.argv = ['node', 'test.mjs', '--bundle', '/tmp/b', '--current-node', 'phases/phase-wave0.md', '--attempt', '3.5'];
    const args = parseGateCliArgs();
    assert.equal(args.attempt, 0);
  });

  it('falls back to 0 for empty --attempt value', () => {
    process.argv = ['node', 'test.mjs', '--bundle', '/tmp/b', '--current-node', 'phases/phase-wave0.md', '--attempt', ''];
    const args = parseGateCliArgs();
    assert.equal(args.attempt, 0);
  });
});

describe('buildGateResult fatigue diagnostics (GSK-006)', () => {
  const baseRouting = { kind: 'next', next: 'phases/phase-wave1.md', detail: '' };

  it('injects fatigue_warning + step_back when gate fails and attemptNumber >= fatigueThreshold', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: baseRouting,
      inspect: ['Count floor not met'],
      advice: ['Add more sources'],
      attemptNumber: 3,
      fatigueThreshold: 3,
    });

    assert.equal(result.check.fatigue_warning, true);
    assert.equal(result.check.step_back, true);
    assert.ok(result.advice.some(a => a.includes('[fatigue]')));
    assert.ok(result.advice.some(a => a.includes('Agent-reported retry hint')));
  });

  it('injects fatigue when attemptNumber exceeds threshold', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'wave1-complete',
      currentNodeRef: 'phases/phase-wave1.md',
      routing: baseRouting,
      attemptNumber: 7,
      fatigueThreshold: 3,
    });

    assert.equal(result.check.fatigue_warning, true);
    assert.equal(result.check.step_back, true);
  });

  it('does NOT inject fatigue when gate fails but attemptNumber < threshold', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: baseRouting,
      inspect: ['Count floor not met'],
      advice: ['Add more sources'],
      attemptNumber: 1,
      fatigueThreshold: 3,
    });

    assert.equal(result.check.fatigue_warning, undefined);
    assert.equal(result.check.step_back, undefined);
  });

  it('does NOT inject fatigue when gate passes even with high attemptNumber', () => {
    const result = buildGateResult({
      passed: true,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: baseRouting,
      attemptNumber: 5,
      fatigueThreshold: 3,
    });

    assert.equal(result.check.fatigue_warning, undefined);
    assert.equal(result.check.step_back, undefined);
  });

  it('does NOT inject fatigue when attemptNumber is 0 (default)', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: baseRouting,
    });

    assert.equal(result.check.fatigue_warning, undefined);
    assert.equal(result.check.step_back, undefined);
  });

  it('fatigue advice does NOT claim Engine verified consecutive failures', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: baseRouting,
      attemptNumber: 5,
    });

    const fatigueAdvice = result.advice.filter(a => a.includes('[fatigue]'));
    assert.ok(fatigueAdvice.length >= 3);
    for (const msg of fatigueAdvice) {
      assert.ok(!msg.includes('verified consecutive'));
      assert.ok(!msg.includes('Engine verified'));
    }
    assert.ok(fatigueAdvice.some(a => a.includes('Agent-reported')));
  });

  it('fatigue advice is stop-mode-safe — does NOT unconditionally declare stop:no', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: baseRouting,
      attemptNumber: 5,
    });

    const fatigueAdvice = result.advice.filter(a => a.includes('[fatigue]'));
    const unconditional = fatigueAdvice.filter(a =>
      a.includes('stop:no') && !a.includes('If this invocation') && !a.includes('If this is')
    );
    assert.ok(
      fatigueAdvice.some(a => a.includes('If this invocation is for a stop:no phase')),
      'At least one fatigue advice must use conditional stop:no language'
    );
  });

  it('fatigue advice uses no-surfacing stop contract language', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: baseRouting,
      attemptNumber: 5,
    });

    const fatigueAdvice = result.advice.filter(a => a.includes('[fatigue]'));
    const joined = fatigueAdvice.join('\n');
    assert.ok(!joined.includes('only prohibited behavior'));
    assert.ok(joined.includes('User-facing surfacing is prohibited'));
    assert.ok(joined.includes('progress updates'));
    assert.ok(joined.includes('idle/no-work summaries'));
    assert.ok(joined.includes('A/B choices'));
  });
});
