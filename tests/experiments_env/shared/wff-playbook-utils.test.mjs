// Regression tests for experiments_env/shared/wff-playbook-utils.mjs
// Focus: recordVerdict() audit persistence + cleanup() wiring (E2E verdict 留档机制).

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { recordCheck, recordVerdict, cleanup } from '../../../experiments_env/shared/wff-playbook-utils.mjs';

let workDir;

beforeEach(() => {
  workDir = mkdtempSync(path.join(tmpdir(), 'wff-utils-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function readEntries(outPath) {
  return readFileSync(outPath, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

describe('recordVerdict — append-only verdict audit', () => {
  it('appends a PASS entry with case id, bundle name, and all checks', () => {
    const tracePath = path.join(workDir, 'rb_trace.jsonl');
    const outPath = path.join(workDir, 'exp_verdicts.jsonl');
    recordCheck(tracePath, { gate: 'g1', passed: true, detail: 'ok' });
    recordCheck(tracePath, { gate: 'g2', passed: false, expected: false, detail: 'boundary' });

    const entry = recordVerdict(tracePath, { caseId: 'case-65', bundleName: 'dpt_disp_x', outPath });

    assert.ok(entry);
    assert.equal(entry.case, 'case-65');
    assert.equal(entry.bundle, 'dpt_disp_x');
    assert.equal(entry.verdict, 'PASS');
    assert.equal(entry.checks.length, 2);
    assert.deepEqual(entry.checks[0], { gate: 'g1', passed: true, expected: true });
    assert.deepEqual(entry.checks[1], { gate: 'g2', passed: false, expected: false });

    const persisted = readEntries(outPath);
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].verdict, 'PASS');
    assert.ok(persisted[0].ts);
  });

  it('records FAIL when any check has passed !== expected', () => {
    const tracePath = path.join(workDir, 'rb_trace.jsonl');
    const outPath = path.join(workDir, 'exp_verdicts.jsonl');
    recordCheck(tracePath, { gate: 'g1', passed: true });
    recordCheck(tracePath, { gate: 'g2', passed: false });

    const entry = recordVerdict(tracePath, { caseId: 'case-66', outPath });
    assert.equal(entry.verdict, 'FAIL');
  });

  it('is append-only across multiple runs', () => {
    const tracePath = path.join(workDir, 'rb_trace.jsonl');
    const outPath = path.join(workDir, 'exp_verdicts.jsonl');
    recordCheck(tracePath, { gate: 'g1', passed: true });

    recordVerdict(tracePath, { caseId: 'run-1', outPath });
    recordVerdict(tracePath, { caseId: 'run-2', outPath });

    const persisted = readEntries(outPath);
    assert.equal(persisted.length, 2);
    assert.equal(persisted[0].case, 'run-1');
    assert.equal(persisted[1].case, 'run-2');
  });

  it('creates a missing verdict parent directory before append', () => {
    const tracePath = path.join(workDir, 'rb_trace.jsonl');
    const outPath = path.join(workDir, 'missing', 'nested', 'exp_verdicts.jsonl');
    recordCheck(tracePath, { gate: 'g1', passed: true });

    const entry = recordVerdict(tracePath, { caseId: 'case-parent', outPath });

    assert.equal(entry.verdict, 'PASS');
    assert.equal(readEntries(outPath)[0].case, 'case-parent');
  });

  it('returns null and writes nothing when trace is missing or has no checks', () => {
    const outPath = path.join(workDir, 'exp_verdicts.jsonl');

    assert.equal(recordVerdict(path.join(workDir, 'nope.jsonl'), { outPath }), null);

    const tracePath = path.join(workDir, 'rb_trace.jsonl');
    writeFileSync(tracePath, JSON.stringify({ event: 'gate_attempt', gate: 'g1' }) + '\n');
    assert.equal(recordVerdict(tracePath, { outPath }), null);

    assert.ok(!existsSync(outPath));
  });
});

describe('cleanup — verdict recorded before bundle destruction', () => {
  it('persists verdict summary then removes the bundle', () => {
    const bundle = path.join(workDir, 'dpt_disp_case-65_x');
    mkdirSync(bundle, { recursive: true });
    const outPath = path.join(workDir, 'exp_verdicts.jsonl');
    recordCheck(path.join(bundle, 'rb_trace.jsonl'), { gate: 'g1', passed: true });

    cleanup(bundle, { caseId: 'case-65', verdictsPath: outPath });

    assert.ok(!existsSync(bundle), 'bundle should be removed');
    const persisted = readEntries(outPath);
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].case, 'case-65');
    assert.equal(persisted[0].bundle, 'dpt_disp_case-65_x');
    assert.equal(persisted[0].verdict, 'PASS');
  });

  it('still removes a bundle without rb_trace.jsonl and records nothing', () => {
    const bundle = path.join(workDir, 'dpt_disp_no_trace');
    mkdirSync(bundle, { recursive: true });
    const outPath = path.join(workDir, 'exp_verdicts.jsonl');

    cleanup(bundle, { verdictsPath: outPath });

    assert.ok(!existsSync(bundle));
    assert.ok(!existsSync(outPath));
  });
});
