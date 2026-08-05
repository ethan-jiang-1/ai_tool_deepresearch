// @impl CHF-003, CHF-004
import assert from 'node:assert/strict';
import {
  after,
  describe,
  it,
} from 'node:test';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const CHANGE = 'demo-change';
const createdRoots = [];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? PROJECT_ROOT,
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

function write(root, relativePath, content) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

function copyGovernanceScripts(root) {
  const scripts = [
    'finalize-change-archive.mjs',
    'check-project-reqs.mjs',
    'check-project-specs.mjs',
    'check-verification-routing.mjs',
    'verification-routing-contract.mjs',
  ];
  for (const script of scripts) {
    const destination = join(root, 'openspec/governance', script);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(PROJECT_ROOT, 'openspec/governance', script), destination);
  }
}

function createCompleteChange() {
  const root = mkdtempSync(join(tmpdir(), 'change-feedback-e2e-'));
  createdRoots.push(root);
  run('openspec', ['init', root, '--tools', 'none', '--no-animation']);
  symlinkSync(join(PROJECT_ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');
  symlinkSync(join(PROJECT_ROOT, 'DEEP_RESEARCH_HARNESS'), join(root, 'DEEP_RESEARCH_HARNESS'), 'dir');
  copyGovernanceScripts(root);
  run('openspec', ['new', 'change', CHANGE, '--json'], { cwd: root });

  write(root, 'openspec/governance/req-registry.yaml', [
    '# Fixture registry for the native archive finalization chain.',
    'ABC-001: demo-capability - finalizer archive boundary',
    '',
  ].join('\n'));
  const mainSpec = write(root, 'openspec/specs/demo-capability/spec.md', [
    '> req: ABC-001',
    '',
    '## Purpose',
    '',
    'Define the already-synchronized fixture capability.',
    '',
    '## Requirements',
    '',
    '### Requirement: Demo archive boundary',
    '',
    'The fixture system SHALL preserve the native archive boundary.',
    '',
  ].join('\n'));
  const mainSpecBefore = readFileSync(mainSpec, 'utf8');

  write(root, `openspec/changes/${CHANGE}/proposal.md`, [
    '## Why',
    '',
    'Exercise the governed native archive transition in isolation.',
    '',
    '## What Changes',
    '',
    '- Adds no production behavior; the fixture starts with synchronized specs.',
    '',
    '## Capabilities',
    '',
    '### New Capabilities',
    '',
    '- None.',
    '',
    '## Impact',
    '',
    '- Temporary fixture only.',
    '',
  ].join('\n'));
  write(root, `openspec/changes/${CHANGE}/design.md`, [
    '## Context',
    '',
    'The fixture supplies the finalizer prerequisites before native archive.',
    '',
    '## Goals / Non-Goals',
    '',
    '### Goals',
    '',
    '- Verify the native archive move through the production finalizer.',
    '',
    '### Non-Goals',
    '',
    '- Do not write main specs during finalization.',
    '',
  ].join('\n'));
  write(root, `openspec/changes/${CHANGE}/specs/demo-capability/spec.md`, [
    '> req: ABC-001',
    '',
    '## ADDED Requirements',
    '',
    '### Requirement: Demo archive boundary',
    '',
    'The fixture system SHALL preserve the native archive boundary.',
    '',
    '#### Scenario: native archive is eligible',
    '',
    '- **WHEN** all finalizer prerequisites are complete',
    '- **THEN** the native archive transition may move the active change',
    '',
  ].join('\n'));
  write(root, `openspec/changes/${CHANGE}/tasks.md`, [
    '- [x] 0.1 Plan review (openspec-feedback:plan-review).',
    '- [x] 1.1 Supply synchronized fixture artifacts.',
    '- [x] 2.1 Closeout review (openspec-feedback:closeout-review).',
    '',
  ].join('\n'));
  write(root, `openspec/changes/${CHANGE}/verification-plan.yaml`, [
    'schema_version: verification-routing/v1',
    `change: ${CHANGE}`,
    'test_classes:',
    '  unit:',
    '    status: not_applicable',
    '    rationale: Fixture archive proof is workflow-scale.',
    '  integration:',
    '    status: not_applicable',
    '    rationale: Fixture archive proof spans the native lifecycle.',
    '  deterministic_e2e:',
    '    status: selected',
    '    rationale: The finalizer invokes the native archive transition.',
    '  agent_flow_e2e:',
    '    status: not_applicable',
    '    rationale: The fixture claims only deterministic behavior.',
    'claims:',
    '  - id: native-archive-fixture',
    '    statement: Native archive moves the selected complete fixture change.',
    '    test_class: deterministic_e2e',
    '    proof_subject: deterministic_contract',
    '    asset:',
    '      kind: node_test',
    '      path: tests/e2e/native-archive-fixture.test.mjs',
    '    execution_profile:',
    '      fixture: fixture_backed',
    '      subject_execution: simulated_agent_actions',
    '      runtime: temporary_bundle',
    '      external_calls: none',
    '      verdict_judge: deterministic',
    '    verdict_authority: node_test_exit',
    '',
  ].join('\n'));
  write(root, 'tests/e2e/native-archive-fixture.test.mjs', '// fixture asset\n');
  write(root, 'experiments_playbook/PLAYBOOK_MANIFEST.md', [
    '# Fixture Playbook Manifest',
    '',
    '<!-- agent-experiment-manifest:v1 -->',
    '| Path |',
    '|---|',
    '| `exp_fixture/case-001-light-archive.md` |',
    '<!-- /agent-experiment-manifest -->',
    '',
  ].join('\n'));
  write(root, 'experiments_playbook/exp_fixture/case-001-light-archive.md', '# Fixture only\n');

  return {
    root,
    mainSpec,
    mainSpecBefore,
    changeRoot: join(root, 'openspec/changes', CHANGE),
    finalizer: join(root, 'openspec/governance/finalize-change-archive.mjs'),
  };
}

after(() => {
  for (const root of createdRoots) rmSync(root, { recursive: true, force: true });
});

describe('change feedback loop native archive', () => {
  it('uses the production finalizer to archive a synchronized isolated change', () => {
    const fixture = createCompleteChange();
    const result = spawnSync(process.execPath, [fixture.finalizer, '--change', CHANGE], {
      cwd: fixture.root,
      encoding: 'utf8',
      timeout: 30000,
    });

    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.notEqual(result.stdout.trim(), '', `finalizer emitted no JSON\nstderr: ${result.stderr}`);
    const output = JSON.parse(result.stdout);
    assert.equal(output.outcome, 'archived');
    assert.equal(output.change, CHANGE);
    assert.equal(output.archive.specs_updated, false);
    assert.equal(existsSync(fixture.changeRoot), false);
    assert.equal(existsSync(output.archive.path), true);
    assert.match(output.archive.path, /openspec\/changes\/archive\//);
    assert.equal(readFileSync(fixture.mainSpec, 'utf8'), fixture.mainSpecBefore);
  });
});
