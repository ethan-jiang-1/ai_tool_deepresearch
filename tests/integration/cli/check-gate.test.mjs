// check-gate.test.mjs — Gate CLI integration tests (all 8 gates)
// @impl GSK-001, GSK-002, GSK-004

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/test-tmp.mjs';

const FIXTURE_FW = join(process.cwd(), 'DPT_FRAMEWORK');

// Gate → expected --current-node (from manifest.json)
const GATE_NODE_MAP = {
  'instantiation-complete': 'phases/phase-instantiation.md',
  'hitl1-recorded':        'phases/phase-hitl1.md',
  'setup-ready':           'phases/phase-setup.md',
  'wave0-complete':        'phases/phase-wave0.md',
  'wave1-complete':        'phases/phase-wave1.md',
  'wave2-complete':        'phases/phase-wave2.md',
  'hitl2-recorded':        'phases/phase-hitl2.md',
  'readiness-passed':      'phases/phase-readiness.md',
};

describe('Gate CLI integration', () => {
  let tmpDir;

  before(() => {
    tmpDir = createTempDir('check-gate');
    cpSync(FIXTURE_FW, join(tmpDir, 'DPT_FRAMEWORK'), { recursive: true });
  });

  after(cleanupAll);

  for (const [gateKey, expectedNode] of Object.entries(GATE_NODE_MAP)) {
    describe(`check-gate-${gateKey}`, () => {
      const gateScript = join(FIXTURE_FW, 'cli', 'gates', `check-gate-${gateKey}.mjs`);

      it('phase Markdown Gate Command documents the required current node', () => {
        const nodeMd = readFileSync(join(FIXTURE_FW, 'workflows', 'nodes', expectedNode), 'utf-8');
        const expectedCommand = `check-gate-${gateKey}.mjs --bundle <path> --current-node ${expectedNode}`;
        assert.ok(nodeMd.includes(expectedCommand), `Expected Gate Command to include: ${expectedCommand}`);
      });

      it('missing --bundle returns valid JSON with exit 2', () => {
        const r = spawnSync('node', [gateScript], { encoding: 'utf-8', timeout: 5000 });
        assert.strictEqual(r.status, 2, `expected exit 2, got ${r.status}`);
        // Must NOT crash — must return valid JSON with actionable inspect/advice
        let out;
        try { out = JSON.parse(r.stdout); } catch {
          assert.fail(`Missing --bundle must return valid JSON. Got stderr: ${r.stderr?.slice(0, 200)}`);
        }
        assert.ok(out.check && typeof out.check === 'object', 'missing check object');
        assert.strictEqual(out.routing.kind, 'invalid_input', 'must be invalid_input');
        assert.ok(out.inspect.length > 0, 'inspect must not be empty');
        assert.ok(out.advice.length > 0, 'advice must not be empty');
      });

      it('missing --current-node returns valid JSON with exit 2', () => {
        const r = spawnSync('node', [gateScript, '--bundle', tmpDir], { encoding: 'utf-8', timeout: 5000 });
        assert.strictEqual(r.status, 2, `expected exit 2, got ${r.status}`);
        // Must NOT crash — must return valid JSON with actionable inspect/advice
        let out;
        try { out = JSON.parse(r.stdout); } catch {
          assert.fail(`Missing --current-node must return valid JSON. Got stderr: ${r.stderr?.slice(0, 200)}`);
        }
        assert.ok(out.check && typeof out.check === 'object', 'missing check object');
        assert.strictEqual(out.routing.kind, 'invalid_input', 'must be invalid_input');
        assert.ok(out.inspect.length > 0, 'inspect must not be empty');
        assert.ok(out.advice.length > 0, 'advice must not be empty');
      });

      it('produces valid JSON with check/routing/inspect/advice shape', () => {
        const r = spawnSync('node', [
          gateScript, '--bundle', tmpDir, '--current-node', expectedNode,
        ], { encoding: 'utf-8', timeout: 10000 });

        let out;
        try {
          out = JSON.parse(r.stdout);
        } catch {
          assert.fail(`Not valid JSON. stderr: ${r.stderr?.slice(0, 200)} | stdout: ${r.stdout?.slice(0, 200)}`);
        }

        assert.ok(out.check && typeof out.check === 'object', 'missing check object');
        assert.ok(out.routing && typeof out.routing === 'object', 'missing routing object');
        assert.ok(Array.isArray(out.inspect), 'inspect must be array');
        assert.ok(Array.isArray(out.advice), 'advice must be array');
        assert.strictEqual(out.check.gate, gateKey, 'check.gate mismatch');
        assert.strictEqual(out.check.currentNodeRef, expectedNode, 'check.currentNodeRef mismatch');
        assert.strictEqual(typeof out.check.passed, 'boolean', 'check.passed must be boolean');
      });

      it('routing.kind is a recognized value', () => {
        const r = spawnSync('node', [
          gateScript, '--bundle', tmpDir, '--current-node', expectedNode,
        ], { encoding: 'utf-8', timeout: 10000 });

        const out = JSON.parse(r.stdout);
        const validKinds = ['next', 'terminal', 'no_transition', 'invalid_input', 'config_error'];
        assert.ok(validKinds.includes(out.routing.kind),
          `routing.kind must be one of ${validKinds.join('/')}, got "${out.routing.kind}"`);

        // check.next ↔ routing consistency
        if (out.routing.kind === 'next') {
          assert.strictEqual(out.check.next, out.routing.next);
          assert.ok(typeof out.check.next === 'string' && out.check.next.endsWith('.md'),
            'check.next must end with .md');
        } else {
          assert.strictEqual(out.check.next, null,
            `check.next must be null when routing.kind=${out.routing.kind}`);
        }
      });

      it('exit code: 0=passed, 1=failed, 2=routing error (no_transition is NOT a routing error — it falls through to passed/failed check)', () => {
        const r = spawnSync('node', [
          gateScript, '--bundle', tmpDir, '--current-node', expectedNode,
        ], { encoding: 'utf-8', timeout: 10000 });

        const out = JSON.parse(r.stdout);
        const routingErrors = ['invalid_input', 'config_error'];

        if (routingErrors.includes(out.routing.kind)) {
          assert.strictEqual(r.status, 2,
            `routing error (${out.routing.kind}) should exit 2, got ${r.status}`);
        } else if (out.check.passed) {
          assert.strictEqual(r.status, 0,
            `passed=true should exit 0, got ${r.status}`);
        } else {
          assert.strictEqual(r.status, 1,
            `passed=false should exit 1, got ${r.status}`);
        }
      });

      it('rejects gate key as --current-node (invalid_input)', () => {
        const r = spawnSync('node', [
          gateScript, '--bundle', tmpDir, '--current-node', gateKey,
        ], { encoding: 'utf-8', timeout: 10000 });

        const out = JSON.parse(r.stdout);
        assert.strictEqual(out.routing.kind, 'invalid_input',
          `gate key "${gateKey}" should be rejected, got kind=${out.routing.kind}`);
        assert.strictEqual(r.status, 2, 'should exit 2');
      });
    });
  }

  // ── Binding mismatch ────────────────────────────────────────────────

  describe('gate/node binding mismatch', () => {
    it('rejects when --current-node does not match gate', () => {
      const script = join(FIXTURE_FW, 'cli', 'gates', 'check-gate-wave0-complete.mjs');
      const r = spawnSync('node', [
        script, '--bundle', tmpDir, '--current-node', 'phases/phase-final.md',
      ], { encoding: 'utf-8', timeout: 10000 });

      const out = JSON.parse(r.stdout);
      const hasMismatch = out.routing.kind === 'invalid_input'
        || out.inspect.some(i => i.toLowerCase().includes('mismatch'));
      assert.ok(hasMismatch,
        `Expected binding mismatch, got routing.kind=${out.routing.kind}, inspect=${JSON.stringify(out.inspect)}`);
      assert.strictEqual(r.status, 2, 'binding mismatch should exit 2');
    });
  });

  // ── Output Contract: error scenarios ───────────────────────────────

  describe('Output Contract — CLI always returns actionable JSON', () => {
    function fwCopy() { return join(tmpDir, 'DPT_FRAMEWORK'); }

    it('unknown check type makes gate FAIL (not silently pass)', () => {
      // Write a bad definition with only an unknown check type
      const badDefPath = join(fwCopy(), 'schema', 'gate_definitions', 'gate-wave0-complete.definition.json');
      writeFileSync(badDefPath, JSON.stringify({
        gate: 'wave0-complete',
        description: 'Bad def with unknown check type',
        rules: [
          { id: 'bad_rule', check: 'nonexistent_check_type_xyz', target: 'dummy', failure_message: 'Should never see this if rule fails' },
        ],
      }));

      // Run from the temp copy so it reads the modified definition
      const script = join(fwCopy(), 'cli', 'gates', 'check-gate-wave0-complete.mjs');
      const r = spawnSync('node', [
        script, '--bundle', tmpDir, '--current-node', 'phases/phase-wave0.md',
      ], { encoding: 'utf-8', timeout: 10000 });

      const out = JSON.parse(r.stdout);
      assert.strictEqual(out.check.passed, false,
        `Unknown check type MUST cause gate fail, got passed=true. Inspect: ${JSON.stringify(out.inspect)}`);
      assert.ok(out.inspect.some(m => m.includes('nonexistent_check_type_xyz') || m.includes('Unknown check type')),
        `Inspect must mention the unknown check type. Got: ${JSON.stringify(out.inspect)}`);
      assert.ok(out.advice.length > 0, 'advice must not be empty on fail');
    });

    it('corrupt gate definition returns valid JSON error (not crash)', () => {
      // Replace the definition with invalid JSON
      const badDefPath = join(fwCopy(), 'schema', 'gate_definitions', 'gate-instantiation-complete.definition.json');
      writeFileSync(badDefPath, '{this is not valid json!!!');

      // Run from the temp copy so it reads the modified definition
      const script = join(fwCopy(), 'cli', 'gates', 'check-gate-instantiation-complete.mjs');
      const r = spawnSync('node', [
        script, '--bundle', tmpDir, '--current-node', 'phases/phase-instantiation.md',
      ], { encoding: 'utf-8', timeout: 10000 });

      // Must NOT crash — must return valid JSON
      let out;
      try { out = JSON.parse(r.stdout); } catch {
        assert.fail(`Corrupt definition must return valid JSON, not crash. stderr: ${r.stderr?.slice(0, 200)}`);
      }
      assert.ok(out.check && typeof out.check === 'object', 'must have check object');
      assert.ok(out.routing && typeof out.routing === 'object', 'must have routing object');
      assert.strictEqual(out.routing.kind, 'config_error',
        `Expected config_error for corrupt definition, got ${out.routing.kind}`);
      assert.ok(out.inspect.length > 0, 'inspect must not be empty');
      assert.ok(out.advice.length > 0, 'advice must not be empty');
    });
  });
});
