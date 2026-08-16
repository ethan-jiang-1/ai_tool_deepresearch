// exit-code-convention.test.mjs
// Inventory and representative runtime checks for the documented CLI exit-code convention.
// @impl CLE-001, CLE-003, CLE-004

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const CLI_DIR = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'cli');

const CLI_CONVENTION_INVENTORY = {
  'advance-status.mjs': {
    class: 'selected non-gate structured operation with standalone help and code 2 invocation errors',
    coverage: ['tests/integration/cli/advance-status.test.mjs', 'this file: missing args exits 2'],
  },
  'audit-phase-status.mjs': {
    class: 'non-gate diagnostic structured utility with code 2 caller/config errors',
    coverage: ['tests/integration/cli/audit-phase-status.test.mjs', 'this file: missing bundle exits 2'],
  },
  'apply-research-style.mjs': {
    class: 'non-gate binary utility',
    coverage: ['tests/integration/cli/apply-research-style.test.mjs', 'this file: missing args exits 1'],
  },
  'check-reentry.mjs': {
    class: 'non-gate structured utility with code 2 caller/config errors',
    coverage: ['tests/integration/cli/check-reentry.test.mjs', 'this file: missing args exits 2'],
  },
  'operate-artifact-persistence.mjs': {
    class: 'non-gate mechanical persistence utility with code 2 caller/config errors',
    coverage: ['tests/integration/cli/artifact-persistence.test.mjs', 'this file: missing operation exits 2'],
  },
  'operate-composition-handoff.mjs': {
    class: 'non-gate composition-handoff operation with code 2 invocation errors',
    coverage: ['tests/integration/cli/composition-handoff.test.mjs', 'this file: missing operation exits 2'],
  },
  'operate-post-final-recovery.mjs': {
    class: 'non-gate post-final recovery utility with code 2 caller/config/internal errors',
    coverage: ['tests/integration/cli/post-final-recovery.test.mjs', 'this file: missing operation exits 2'],
  },
  'operate-topic-state.mjs': {
    class: 'selected non-gate canonical topic-state operation with standalone help and code 2 caller/config errors',
    coverage: ['tests/integration/cli/operate-topic-state.test.mjs', 'this file: missing operation exits 2'],
  },
  'enter-phase.mjs': {
    class: 'selected non-gate structured handoff operation with standalone help and code 2 invocation errors',
    coverage: ['tests/integration/cli/enter-phase.test.mjs', 'this file: missing args exits 2'],
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
  'plan-hostfile-sections.mjs': {
    class: 'selected pure controls renderer with standalone help and code 2 invocation errors',
    coverage: ['tests/integration/cli/user-research-controls-contract.test.mjs', 'this file: missing subcommand exits 2'],
  },
  'sync-reference-index.mjs': {
    class: 'non-gate reference-index synchronization utility with code 2 missing-bundle error',
    coverage: ['this file: missing bundle exits 2'],
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
    class: 'non-gate tri-state validator with code 2 invocation errors',
    coverage: ['tests/integration/cli/validate-workflow-package.test.mjs', 'this file: shipped workflow package exits 0, unknown flag exits 2'],
  },
};

const SAFE_INVOCATION_SAMPLES = [
  { cli: 'advance-status.mjs', args: [], expectedStatus: 2 },
  { cli: 'audit-phase-status.mjs', args: [], expectedStatus: 2 },
  { cli: 'apply-research-style.mjs', args: [], expectedStatus: 1 },
  { cli: 'check-reentry.mjs', args: [], expectedStatus: 2 },
  { cli: 'operate-artifact-persistence.mjs', args: [], expectedStatus: 2 },
  { cli: 'operate-composition-handoff.mjs', args: [], expectedStatus: 2 },
  { cli: 'operate-post-final-recovery.mjs', args: [], expectedStatus: 2 },
  { cli: 'operate-topic-state.mjs', args: [], expectedStatus: 2 },
  { cli: 'enter-phase.mjs', args: [], expectedStatus: 2 },
  { cli: 'inspect-bundle.mjs', args: [], expectedStatus: 1 },
  { cli: 'inspect-wave0-output.mjs', args: [], expectedStatus: 2 },
  { cli: 'inspect-wave1-output.mjs', args: [], expectedStatus: 2 },
  { cli: 'inspect-wave2-output.mjs', args: [], expectedStatus: 2 },
  { cli: 'instantiate-run-bundle.mjs', args: [], expectedStatus: 1 },
  { cli: 'log-event.mjs', args: ['--level', 'info', '--msg', 'missing bundle'], expectedStatus: 0 },
  { cli: 'operate-queue.mjs', args: [], expectedStatus: 1 },
  { cli: 'operate-work-unit.mjs', args: [], expectedStatus: 1 },
  { cli: 'plan-hostfile-sections.mjs', args: [], expectedStatus: 2 },
  { cli: 'sync-reference-index.mjs', args: [], expectedStatus: 2 },
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
    import { emitGateResult } from './DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
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

  it('static sweep: documented convention class matches the exit codes the source actually emits', () => {
    for (const [cli, entry] of Object.entries(CLI_CONVENTION_INVENTORY)) {
      const source = readFileSync(join(CLI_DIR, cli), 'utf8');
      const literalExits = [...source.matchAll(/process\.exit\(\s*(\d+)\s*\)/g)].map((m) => Number(m[1]));
      const dynamicExit = source.includes('exit_code');
      const klass = entry.class;
      const claimsCode2 = /code 2|tri-state|invocation/.test(klass) || klass.includes('2');
      if (claimsCode2) {
        assert.ok(
          literalExits.includes(2) || dynamicExit,
          `${cli} class '${klass}' documents code 2 but the source never exits 2 (literals ${JSON.stringify(literalExits)}, dynamic ${dynamicExit})`,
        );
      } else {
        assert.ok(
          !literalExits.includes(2),
          `${cli} class '${klass}' documents binary/0-1 behavior but the source exits 2 literally`,
        );
      }
      if (/always-0/.test(klass)) {
        assert.ok(literalExits.every((code) => code === 0), `${cli} must be an always-0 exception`);
      }
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
    const cli = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'cli', 'validate-bundle.mjs');
    const result = runNode([cli, join(REPO_ROOT, '__missing_bundle_for_exit_code_test__')]);
    assert.equal(result.status, 1);
  });

  it('log-event.mjs remains an always-0 diagnostic exception for missing args', () => {
    const cli = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'cli', 'log-event.mjs');
    const result = runNode([cli, '--level', 'info', '--msg', 'missing bundle']);
    assert.equal(result.status, 0);
  });

  it('validate-workflow-package.mjs emits 2 for invocation errors and is no longer listed as drift', () => {
    const cli = join(CLI_DIR, 'validate-workflow-package.mjs');
    const unknownFlag = runNode([cli, '--bogus-flag']);
    assert.equal(unknownFlag.status, 2, unknownFlag.stderr || unknownFlag.stdout);
    assert.match(unknownFlag.stderr, /invocation error/);
    assert.match(unknownFlag.stderr, /Usage:/);

    const missingDir = runNode([cli, '--workflows-dir', join(REPO_ROOT, '__missing_workflows_dir__')]);
    assert.equal(missingDir.status, 2, missingDir.stderr || missingDir.stdout);
    assert.match(missingDir.stderr, /not found or unreadable/);

    const shipped = runNode([cli]);
    assert.equal(shipped.status, 0, shipped.stderr || shipped.stdout);

    const commands = readFileSync(join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'COMMANDS.md'), 'utf8');
    assert.doesNotMatch(commands, /Known doc\/code drift[\s\S]*validate-workflow-package/);
    assert.match(commands, /validate-workflow-package\.mjs` is a reconciled tri-state surface/);
  });

  it('selected public operations keep standalone help and malformed static forms outside domain evaluation', () => {
    const selectedHelp = [
      'advance-status.mjs',
      'enter-phase.mjs',
      'inspect-wave0-output.mjs',
      'inspect-wave1-output.mjs',
      'inspect-wave2-output.mjs',
      'operate-topic-state.mjs',
      'plan-hostfile-sections.mjs',
    ];
    for (const cli of selectedHelp) {
      const result = runNode([join(CLI_DIR, cli), '--help']);
      assert.equal(result.status, 0, `${cli}: ${result.stderr || result.stdout}`);
      assert.match(result.stdout, /Usage:/, cli);
    }

    const invalidForms = [
      { cli: 'inspect-wave0-output.mjs', args: ['bare-bundle'], waveEnvelope: true },
      { cli: 'operate-topic-state.mjs', args: ['schema', '--context', 'hitl1', '--context', 'rerun'] },
      { cli: 'enter-phase.mjs', args: ['--node', 'phases/phase-wave1.md', '--node', 'phases/phase-wave2.md'] },
      { cli: 'advance-status.mjs', args: ['--to', 'wave0_complete', '--to', 'wave0_complete'] },
      { cli: 'plan-hostfile-sections.mjs', args: ['render-no-controls', '--input', 'snapshot.txt'] },
    ];
    for (const sample of invalidForms) {
      const result = runNode([join(CLI_DIR, sample.cli), ...sample.args]);
      assert.equal(result.status, 2, `${sample.cli}: ${result.stderr || result.stdout}`);
      const output = JSON.parse(result.stdout);
      if (sample.waveEnvelope) assert.equal(output.check.passed, false);
      else assert.equal(output.error, 'invalid_invocation');
    }
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
