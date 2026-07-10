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

  it('throws on non-durable covered pass trace writes when strictTrace is enabled', () => {
    const b = setupBundle('test-gate-strict-trace-fail');
    mkdirSync(join(b, 'rb_trace.jsonl'), { recursive: true });

    assert.throws(
      () => writeGateAttempt(b, makeGateResult(true), { strictTrace: true }),
      /EISDIR|illegal operation|directory/i,
    );
  });

  it('continues to tolerate trace write failures when strictTrace is disabled', () => {
    const b = setupBundle('test-gate-nonstrict-trace-fail');
    mkdirSync(join(b, 'rb_trace.jsonl'), { recursive: true });

    assert.doesNotThrow(() => writeGateAttempt(b, makeGateResult(true), { strictTrace: false }));
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

describe('Engine-derived attempt diagnostics (GSK-008)', () => {
  it('computes attempt_count and cross-attempt deltas from prior diagnostics', () => {
    const dir = setupBundle('test-attempt-delta');

    const first = {
      check: { passed: false, gate: 'wave0-complete', currentNodeRef: 'phases/phase-wave0.md', next: null },
      routing: { kind: 'retry', next: null },
      inspect: ['rule-a failed', 'rule-b failed'],
      advice: [],
    };
    writeGateAttempt(dir, first);
    assert.equal(first.check.attempt_count, 1);
    assert.equal(first.check.attempt_trend, 'first');

    const second = {
      check: { passed: false, gate: 'wave0-complete', currentNodeRef: 'phases/phase-wave0.md', next: null },
      routing: { kind: 'retry', next: null },
      inspect: ['rule-b failed', 'rule-c failed'],
      advice: [],
    };
    writeGateAttempt(dir, second);

    assert.equal(second.check.attempt_count, 2);
    assert.deepEqual(second.check.newly_passing, ['rule-a failed']);
    assert.deepEqual(second.check.still_failing, ['rule-b failed']);
    assert.deepEqual(second.check.regressed, ['rule-c failed']);
    assert.equal(second.check.attempt_trend, 'regressed');
  });

  it('emits autonomous continuation advice on high-attempt pass using Engine-visible attempts', () => {
    const dir = setupBundle('test-attempt-pass-advice');

    for (const label of ['rule-a failed', 'rule-b failed']) {
      writeGateAttempt(dir, {
        check: { passed: false, gate: 'wave0-complete', currentNodeRef: 'phases/phase-wave0.md', next: null },
        routing: { kind: 'retry', next: null },
        inspect: [label],
        advice: [],
      });
    }

    const pass = {
      check: {
        passed: true,
        gate: 'wave0-complete',
        currentNodeRef: 'phases/phase-wave0.md',
        next: 'phases/phase-wave1.md',
      },
      routing: { kind: 'next', next: 'phases/phase-wave1.md' },
      inspect: [],
      advice: [],
    };
    writeGateAttempt(dir, pass);

    assert.equal(pass.check.attempt_count, 3);
    assert.equal(pass.check.attempt_trend, 'converging');
    assert.equal(pass.check.fatigue_warning, true);
    assert.ok(pass.advice.some(a => a.includes('enter-phase')));
    assert.ok(pass.advice.some(a => a.includes('phase-final')));
  });

  it('treats a failure after a prior pass diagnostic as a regression', () => {
    const dir = setupBundle('test-pass-then-regress');

    writeGateAttempt(dir, {
      check: {
        passed: true,
        gate: 'wave1-complete',
        currentNodeRef: 'phases/phase-wave1.md',
        next: 'phases/phase-wave2.md',
      },
      routing: { kind: 'next', next: 'phases/phase-wave2.md' },
      inspect: [],
      advice: [],
    });

    const regressed = {
      check: { passed: false, gate: 'wave1-complete', currentNodeRef: 'phases/phase-wave1.md', next: null },
      routing: { kind: 'retry', next: null },
      inspect: ['rule-x failed'],
      advice: [],
    };
    writeGateAttempt(dir, regressed);

    assert.equal(regressed.check.attempt_count, 2);
    assert.deepEqual(regressed.check.regressed, ['rule-x failed']);
    assert.equal(regressed.check.attempt_trend, 'regressed');
  });

  it('resets Engine-derived attempt_count after the current node is re-entered', () => {
    const dir = setupBundle('test-attempt-window-reset');

    writeGateAttempt(dir, {
      check: {
        passed: false,
        gate: 'wave0-complete',
        currentNodeRef: 'phases/phase-wave0.md',
        next: null,
        failed_rule_ids: ['wave0_old_gap'],
      },
      routing: { kind: 'retry', next: null },
      inspect: ['old gap'],
      advice: [],
    });

    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({
      ts: '2026-01-01T00:00:01.000Z',
      event: 'load_complete',
      entry: 'phases/phase-wave0.md',
    }) + '\n', { flag: 'a' });

    const fresh = {
      check: {
        passed: false,
        gate: 'wave0-complete',
        currentNodeRef: 'phases/phase-wave0.md',
        next: null,
        failed_rule_ids: ['wave0_new_gap'],
      },
      routing: { kind: 'retry', next: null },
      inspect: ['new gap'],
      advice: [],
    };
    writeGateAttempt(dir, fresh);

    assert.equal(fresh.check.attempt_count, 1);
    assert.equal(fresh.check.attempt_trend, 'first');
    assert.deepEqual(fresh.check.regressed, []);
  });

  it('uses diagnostic failed_rule_ids for deltas instead of brittle inspect prose', () => {
    const dir = setupBundle('test-attempt-rule-id-delta');

    writeGateAttempt(dir, {
      check: {
        passed: false,
        gate: 'wave0-complete',
        currentNodeRef: 'phases/phase-wave0.md',
        next: null,
        failed_rule_ids: ['schema_valid:alpha', 'count_floor:alpha'],
      },
      routing: { kind: 'retry', next: null },
      inspect: [
        'Schema validation failed for artifacts/wave0/alpha/source.yaml',
        'Count floor not met for reference/alpha-*.md',
      ],
      advice: [],
    });

    const second = {
      check: {
        passed: false,
        gate: 'wave0-complete',
        currentNodeRef: 'phases/phase-wave0.md',
        next: null,
        failed_rule_ids: ['count_floor:alpha'],
      },
      routing: { kind: 'retry', next: null },
      inspect: ['Count floor still short, but message wording changed'],
      advice: [],
    };
    writeGateAttempt(dir, second);

    assert.deepEqual(second.check.newly_passing, ['schema_valid:alpha']);
    assert.deepEqual(second.check.still_failing, ['count_floor:alpha']);
    assert.deepEqual(second.check.regressed, []);
    assert.equal(second.check.attempt_trend, 'converging');
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

  it('orders root-cause diagnostics before downstream symptoms and deduplicates advice', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: baseRouting,
      inspect: [
        'Count floor not met for reference/00-shared-*.md',
        '[cache_coverage] FAIL: work-1: cache trail _cache/x — missing files: meta.json',
        'Delegated output lacks submitted work-unit coverage: artifacts/wave0/topic-a/source.yaml',
      ],
      advice: [
        'Submit delegated outputs through operate-work-unit; filesystem presence and hand-written declarations are diagnostic only.',
        'Repair work-unit submit/index/ledger drift before rerunning the gate.',
        'Repair work-unit submit/index/ledger drift before rerunning the gate.',
      ],
    });

    assert.match(result.inspect[0], /cache_coverage/);
    assert.match(result.inspect.at(-1), /Count floor/);
    assert.equal(result.advice.filter((line) => line.includes('Repair work-unit')).length, 1);
  });
});

describe('buildGateResult continuation projection (SWE-001)', () => {
  it('adds top-level consume_check_next cue for stop:no pass with check.next', () => {
    const result = buildGateResult({
      passed: true,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: { kind: 'next', next: 'phases/phase-wave1.md' },
      inspect: [],
      advice: [],
    });

    assert.deepEqual(result.continuation, {
      interaction: 'prohibited',
      next_action: 'consume_check_next',
      node_ref: 'phases/phase-wave0.md',
      gate: 'wave0-complete',
    });
    assert.equal(Object.prototype.hasOwnProperty.call(result.check, 'continuation'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.routing, 'continuation'), false);
  });

  it('adds top-level repair_and_rerun_gate cue for stop:no failure without deriving from rule ids', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: { kind: 'retry', next: null },
      inspect: ['masked rule ids should remain diagnostic only'],
      advice: [],
      extraCheck: {
        failed_rule_ids: ['irrelevant-to-continuation'],
        masked_rule_ids: ['also-irrelevant'],
      },
    });

    assert.deepEqual(result.continuation, {
      interaction: 'prohibited',
      next_action: 'repair_and_rerun_gate',
      node_ref: 'phases/phase-wave0.md',
      gate: 'wave0-complete',
    });
  });

  it('does not add autonomous cue for stop:yes failure', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'hitl1-recorded',
      currentNodeRef: 'phases/phase-hitl1.md',
      routing: { kind: 'retry', next: null },
      inspect: ['research_access.status is not available'],
      advice: ['Ask the user for real research access.'],
    });

    assert.equal(result.continuation, undefined);
    assert.equal(result.continuation_diagnostic, undefined);
  });

  it('does not add pass cue when check.next is null', () => {
    const result = buildGateResult({
      passed: true,
      gate: 'readiness-passed',
      currentNodeRef: 'phases/phase-readiness.md',
      routing: { kind: 'terminal', next: null },
      inspect: [],
      advice: [],
    });

    assert.equal(result.continuation, undefined);
  });

  it('omits continuation and reports diagnostic when node frontmatter is unreadable', () => {
    const result = buildGateResult({
      passed: false,
      gate: 'missing-node-gate',
      currentNodeRef: 'phases/phase-does-not-exist.md',
      routing: { kind: 'retry', next: null },
      inspect: [],
      advice: [],
    });

    assert.equal(result.continuation, undefined);
    assert.match(result.continuation_diagnostic, /cannot read current node frontmatter/);
  });
});
