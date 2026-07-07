// exit-code-convention.test.mjs
// Inventory and representative runtime checks for the documented CLI exit-code convention.
// @impl CLE-004

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const CLI_DIR = join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli');

const CLI_CONVENTION_INVENTORY = {
  'advance-status.mjs': {
    class: 'non-gate structured utility',
    coverage: ['tests/integration/cli/advance-status.test.mjs', 'this file: missing args exits 1'],
  },
  'apply-research-style.mjs': {
    class: 'non-gate binary utility',
    coverage: ['tests/schema/research-styles-computation.test.mjs', 'this file: missing args exits 1'],
  },
  'check-reentry.mjs': {
    class: 'non-gate structured utility with code 2 caller/config errors',
    coverage: ['tests/integration/cli/check-reentry.test.mjs', 'this file: missing args exits 2'],
  },
  'enter-phase.mjs': {
    class: 'non-gate structured handoff utility',
    coverage: ['tests/integration/cli/enter-phase.test.mjs', 'this file: missing args exits 1'],
  },
  'inspect-bundle.mjs': {
    class: 'non-gate inspection utility',
    coverage: ['tests/integration/cli/inspect-bundle.test.mjs', 'this file: missing bundle exits 1'],
  },
  'inspect-wave0-output.mjs': {
    class: 'non-gate inspect structured-output command',
    coverage: ['this file: missing bundle exits 2'],
  },
  'inspect-wave1-output.mjs': {
    class: 'non-gate inspect structured-output command',
    coverage: ['this file: missing bundle exits 2'],
  },
  'inspect-wave2-output.mjs': {
    class: 'non-gate inspect structured-output command',
    coverage: ['this file: missing bundle exits 2'],
  },
  'instantiate-run-bundle.mjs': {
    class: 'non-gate binary utility',
    coverage: ['tests/integration/cli/instantiate-run-bundle.test.mjs', 'this file: missing name exits 1'],
  },
  'log-event.mjs': {
    class: 'always-0 diagnostic/logging exception',
    coverage: ['tests/integration/cli/log-event.test.mjs', 'this file: missing bundle exits 0'],
  },
  'operate-queue.mjs': {
    class: 'non-gate queue utility',
    coverage: ['tests/integration/cli/operate-queue.test.mjs', 'tests/integration/cli/operate-queue-validation.test.mjs', 'this file: missing command exits 1'],
  },
  'operate-work-unit.mjs': {
    class: 'non-gate delegated work-unit utility',
    coverage: ['tests/integration/cli/operate-work-unit.test.mjs', 'this file: missing command exits 1'],
  },
  'validate-bundle.mjs': {
    class: 'non-gate binary validator',
    coverage: ['tests/integration/cli/validate-bundle.test.mjs', 'this file: missing bundle exits 1'],
  },
  'validate-phase-templates.mjs': {
    class: 'non-gate binary validator',
    coverage: ['this file: missing phase file exits 1'],
  },
  'validate-playbook.mjs': {
    class: 'non-gate binary validator with code 2 invocation errors',
    coverage: ['tests/integration/cli/validate-playbook.test.mjs', 'this file: missing target exits 2'],
  },
  'validate-work-unit-hygiene.mjs': {
    class: 'non-gate binary validator',
    coverage: ['tests/integration/cli/validate-work-unit-hygiene.test.mjs', 'this file: shipped framework exits 0'],
  },
  'validate-workflow-package.mjs': {
    class: 'non-gate binary validator with documented header/code drift',
    coverage: ['tests/integration/cli/validate-workflow-package.test.mjs', 'this file: shipped workflow package exits 0'],
  },
};

const SAFE_INVOCATION_SAMPLES = [
  { cli: 'advance-status.mjs', args: [], expectedStatus: 1 },
  { cli: 'apply-research-style.mjs', args: [], expectedStatus: 1 },
  { cli: 'check-reentry.mjs', args: [], expectedStatus: 2 },
  { cli: 'enter-phase.mjs', args: [], expectedStatus: 1 },
  { cli: 'inspect-bundle.mjs', args: [], expectedStatus: 1 },
  { cli: 'inspect-wave0-output.mjs', args: [], expectedStatus: 2 },
  { cli: 'inspect-wave1-output.mjs', args: [], expectedStatus: 2 },
  { cli: 'inspect-wave2-output.mjs', args: [], expectedStatus: 2 },
  { cli: 'instantiate-run-bundle.mjs', args: [], expectedStatus: 1 },
  { cli: 'log-event.mjs', args: ['--level', 'info', '--msg', 'missing bundle'], expectedStatus: 0 },
  { cli: 'operate-queue.mjs', args: [], expectedStatus: 1 },
  { cli: 'operate-work-unit.mjs', args: [], expectedStatus: 1 },
  { cli: 'validate-bundle.mjs', args: [], expectedStatus: 1 },
  { cli: 'validate-phase-templates.mjs', args: [], expectedStatus: 1 },
  { cli: 'validate-playbook.mjs', args: [], expectedStatus: 2 },
  { cli: 'validate-work-unit-hygiene.mjs', args: [], expectedStatus: 0 },
  { cli: 'validate-workflow-package.mjs', args: [], expectedStatus: 0 },
];

function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    ...options,
  });
}

function runEmitGateResult(result) {
  const script = `
    import { emitGateResult } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
    emitGateResult(${JSON.stringify(result)});
  `;
  return runNode(['--input-type=module', '--eval', script]);
}

function gateResult({ passed, routingKind }) {
  return {
    check: {
      passed,
      gate: 'test-gate',
      currentNodeRef: 'phases/phase-test.md',
      next: passed ? 'phases/phase-next.md' : null,
    },
    routing: {
      kind: routingKind,
      next: routingKind === 'next' ? 'phases/phase-next.md' : null,
    },
    inspect: passed ? [] : ['repairable issue'],
    advice: passed ? [] : ['repair and rerun'],
  };
}

describe('CLI exit-code convention runtime representatives', () => {
  it('covers every shipped CLI in the convention inventory', () => {
    const shipped = readdirSync(CLI_DIR)
      .filter((entry) => entry.endsWith('.mjs'))
      .sort();
    const inventoried = Object.keys(CLI_CONVENTION_INVENTORY).sort();
    assert.deepEqual(inventoried, shipped);

    for (const [cli, entry] of Object.entries(CLI_CONVENTION_INVENTORY)) {
      assert.ok(entry.class, `${cli} must name its convention class`);
      assert.ok(Array.isArray(entry.coverage) && entry.coverage.length > 0, `${cli} must name coverage`);
    }
  });

  it('shared gate helper emits code 0 for gate pass', () => {
    const result = runEmitGateResult(gateResult({ passed: true, routingKind: 'next' }));
    assert.equal(result.status, 0);
    const stdout = JSON.parse(result.stdout);
    assert.equal(stdout.check.passed, true);
    assert.equal(stdout.routing.kind, 'next');
  });

  it('shared gate helper emits code 1 for normal repairable gate failure', () => {
    const result = runEmitGateResult(gateResult({ passed: false, routingKind: 'retry' }));
    assert.equal(result.status, 1);
    const stdout = JSON.parse(result.stdout);
    assert.equal(stdout.check.passed, false);
    assert.equal(stdout.routing.kind, 'retry');
    assert.deepEqual(stdout.advice, ['repair and rerun']);
  });

  it('shared gate helper emits code 2 for routing/config/caller errors', () => {
    const result = runEmitGateResult(gateResult({ passed: false, routingKind: 'invalid_input' }));
    assert.equal(result.status, 2);
    const stdout = JSON.parse(result.stdout);
    assert.equal(stdout.routing.kind, 'invalid_input');
  });

  it('non-gate binary utility remains documented binary behavior', () => {
    const cli = join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'validate-bundle.mjs');
    const result = runNode([cli, join(REPO_ROOT, '__missing_bundle_for_exit_code_test__')]);
    assert.equal(result.status, 1);
  });

  it('log-event.mjs remains an always-0 diagnostic exception for missing args', () => {
    const cli = join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'log-event.mjs');
    const result = runNode([cli, '--level', 'info', '--msg', 'missing bundle']);
    assert.equal(result.status, 0);
  });

  for (const sample of SAFE_INVOCATION_SAMPLES) {
    it(`${sample.cli} safe invocation sample exits ${sample.expectedStatus}`, () => {
      const result = runNode([join(CLI_DIR, sample.cli), ...sample.args]);
      assert.equal(
        result.status,
        sample.expectedStatus,
        `${basename(sample.cli)} expected ${sample.expectedStatus}; stdout=${result.stdout.slice(0, 500)} stderr=${result.stderr.slice(0, 500)}`,
      );
    });
  }
});
