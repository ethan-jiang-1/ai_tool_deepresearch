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
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const CHANGE = 'demo-change';
const createdRoots = [];
const FINALIZER_CHECKS = [
  'openspec_status',
  'artifacts',
  'tasks',
  'strict_validation',
  'requirement_governance',
  'main_spec_governance',
  'capability_taxonomy',
  'capability_discovery',
  'verification_routing',
  'semantic_closure',
  'content_drift',
  'guidance_pointer_targets',
  'surface_inventory',
  'phase_node_structure',
  'spec_req_ids',
  'guidance_requirement_ids',
  'native_archive',
];

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

function copyGovernanceClosure(root) {
  const files = [
    'finalize-change-archive.mjs',
    'check-project-reqs.mjs',
    'requirement-reservation-contract.mjs',
    'check-project-specs.mjs',
    'check-capability-taxonomy.mjs',
    'check-capability-discovery.mjs',
    'check-verification-routing.mjs',
    'verification-routing-contract.mjs',
    'check-semantic-closure.mjs',
    'semantic-fact-closure-contract.mjs',
    'check-content-drift.mjs',
    'check-guidance-pointer-targets.mjs',
    'check-surface-inventory.mjs',
    'check-phase-node-structure.mjs',
    'check-spec-req-ids.mjs',
    'check-guidance-requirement-ids.mjs',
  ];
  for (const file of files) {
    const destination = join(root, 'openspec/governance', file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(PROJECT_ROOT, 'openspec/governance', file), destination);
  }
  copyFileSync(
    join(PROJECT_ROOT, 'openspec/governance/semantic-fact-families.yaml'),
    join(root, 'openspec/governance/semantic-fact-families.yaml'),
  );
}

function createCompleteChange() {
  const root = mkdtempSync(join(tmpdir(), 'change-feedback-integration-'));
  createdRoots.push(root);
  run('openspec', ['init', root, '--tools', 'none', '--no-animation']);
  symlinkSync(join(PROJECT_ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');
  symlinkSync(join(PROJECT_ROOT, 'DEEP_RESEARCH_HARNESS'), join(root, 'DEEP_RESEARCH_HARNESS'), 'dir');
  symlinkSync(join(PROJECT_ROOT, 'experiments_env'), join(root, 'experiments_env'), 'dir');
  symlinkSync(join(PROJECT_ROOT, 'docs'), join(root, 'docs'), 'dir');
  copyFileSync(join(PROJECT_ROOT, 'CONTEXT.md'), join(root, 'CONTEXT.md'));
  copyFileSync(join(PROJECT_ROOT, 'openspec/README.md'), join(root, 'openspec/README.md'));
  for (const sub of ['constitution', 'guidance', 'operations']) {
    symlinkSync(join(PROJECT_ROOT, 'openspec', sub), join(root, 'openspec', sub), 'dir');
  }
  // Real main specs (read-only) so guidance/content-drift references resolve;
  // governance/ stays a real directory for the demo-change spec.
  mkdirSync(join(root, 'openspec/specs'), { recursive: true });
  for (const dom of ['agent', 'bundle', 'engine', 'research', 'verification', 'workflow']) {
    symlinkSync(join(PROJECT_ROOT, 'openspec/specs', dom), join(root, 'openspec/specs', dom), 'dir');
  }
  copyFileSync(join(PROJECT_ROOT, 'openspec/specs/README.md'), join(root, 'openspec/specs/README.md'));
  // Fixture-owned subtrees stay REAL directories (writes must never traverse
  // symlinks into the production tree); read-only siblings are symlinked.
  mkdirSync(join(root, 'tests/integration/governance'), { recursive: true });
  for (const entry of readdirSync(join(PROJECT_ROOT, 'tests'))) {
    if (entry === 'integration') continue;
    symlinkSync(
      join(PROJECT_ROOT, 'tests', entry),
      join(root, 'tests', entry),
      statSync(join(PROJECT_ROOT, 'tests', entry)).isDirectory() ? 'dir' : 'file',
    );
  }
  for (const entry of readdirSync(join(PROJECT_ROOT, 'tests/integration'))) {
    if (entry === 'governance') continue;
    symlinkSync(
      join(PROJECT_ROOT, 'tests/integration', entry),
      join(root, 'tests/integration', entry),
      statSync(join(PROJECT_ROOT, 'tests/integration', entry)).isDirectory() ? 'dir' : 'file',
    );
  }
  mkdirSync(join(root, 'experiments_playbook/exp_fixture'), { recursive: true });
  for (const entry of readdirSync(join(PROJECT_ROOT, 'experiments_playbook'))) {
    if (entry === 'exp_fixture' || entry === 'PLAYBOOK_MANIFEST.md') continue;
    symlinkSync(
      join(PROJECT_ROOT, 'experiments_playbook', entry),
      join(root, 'experiments_playbook', entry),
      statSync(join(PROJECT_ROOT, 'experiments_playbook', entry)).isDirectory() ? 'dir' : 'file',
    );
  }
  copyGovernanceClosure(root);
  run('openspec', ['new', 'change', CHANGE, '--json'], { cwd: root });

  write(root, 'openspec/governance/req-registry.yaml', [
    '# Fixture registry for the native archive finalization chain.',
    'prefixes:',
    '  ABC: governance/demo-archive-boundary',
    '',
    '# governance/demo-archive-boundary',
    'ABC-001: demo-archive-boundary - finalizer archive boundary',
    '',
  ].join('\n'));
  const mainSpec = write(root, 'openspec/specs/governance/demo-archive-boundary/spec.md', [
    '# demo-archive-boundary',
    '',
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
  write(root, 'openspec/specs/README.md', [
    '# Fixture Capability Catalog',
    '',
    '| Capability path | Purpose | Keywords | Boundaries / neighbors | Related entries | Agent/Markdown owns | Engine/Node owns |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| governance/demo-archive-boundary | Fixture archive boundary. | archive, fixture | Isolated finalizer fixture only. | none | Reviews fixture intent. | Enforces archive prerequisites. |',
    '',
  ].join('\n'));

  write(root, `openspec/changes/${CHANGE}/.openspec.yaml`, [
    'schema: spec-driven',
    'created: 2026-08-09',
    'skip_specs: true',
    '',
  ].join('\n'));
  write(root, `openspec/changes/${CHANGE}/proposal.md`, [
    '## Why',
    '',
    'Exercise the governed native archive transition in isolation.',
    '',
    '## What Changes',
    '',
    '- Adds no production behavior; the fixture starts with synchronized specs.',
    '',
    '## Capability Discovery',
    '',
    '| Candidate path | Evidence read | Decision | Reason |',
    '| --- | --- | --- | --- |',
    '| `governance/demo-archive-boundary` | Fixture main spec | Verify-only | The fixture starts synchronized. |',
    '',
    'skip_specs: true - the fixture changes no accepted behavior and needs no delta spec.',
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
    '    rationale: Fixture archive proof crosses a production CLI boundary.',
    '  integration:',
    '    status: selected',
    '    rationale: The finalizer runs one isolated project governance boundary.',
    '  deterministic_e2e:',
    '    status: not_applicable',
    '    rationale: The fixture does not traverse a current run bundle lifecycle.',
    '  agent_flow_e2e:',
    '    status: not_applicable',
    '    rationale: The fixture claims only deterministic behavior.',
    'claims:',
    '  - id: native-archive-fixture',
    '    statement: The production finalizer archives the selected complete fixture change.',
    '    test_class: integration',
    '    proof_subject: deterministic_contract',
    '    asset:',
    '      kind: node_test',
    '      path: tests/integration/governance/native-archive-fixture.test.mjs',
    '    execution_profile:',
    '      fixture: fixture_backed',
    '      subject_execution: none',
    '      runtime: none',
    '      external_calls: none',
    '      verdict_judge: deterministic',
    '    verdict_authority: node_test_exit',
    '',
  ].join('\n'));
  write(root, `openspec/changes/${CHANGE}/semantic-closure.yaml`, [
    'schema_version: semantic-closure/v1',
    `change: ${CHANGE}`,
    'status: not_applicable',
    'reason: The fixture change alters no Engine-owned deterministic fact.',
    '',
  ].join('\n'));
  write(root, 'tests/integration/governance/native-archive-fixture.test.mjs', '// fixture asset\n');
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
    assert.deepEqual(output.checks.map((check) => check.id), FINALIZER_CHECKS);
    assert.equal(output.archive.specs_updated, false);
    assert.equal(existsSync(fixture.changeRoot), false);
    assert.equal(existsSync(output.archive.path), true);
    assert.match(output.archive.path, /openspec\/changes\/archive\//);
    assert.equal(readFileSync(fixture.mainSpec, 'utf8'), fixture.mainSpecBefore);
  });
});
