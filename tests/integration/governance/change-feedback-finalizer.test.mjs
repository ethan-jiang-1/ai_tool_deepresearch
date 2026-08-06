// @impl CHF-002, CHF-003, CHF-004
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  FINALIZER_COMMAND,
  SUPPORTED_ENTRY_SURFACES,
} from '../../../openspec/governance/finalize-change-archive.mjs';

const ROOT = process.cwd();
const FINALIZER = join(ROOT, 'openspec/governance/finalize-change-archive.mjs');
const created = [];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd ?? ROOT, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

function createFeedbackChange() {
  const root = mkdtempSync(join(tmpdir(), 'change-feedback-integration-'));
  created.push(root);
  run('openspec', ['init', root, '--tools', 'none', '--no-animation']);
  writeFileSync(join(root, 'openspec/config.yaml'), [
    'schema: spec-driven',
    'operations:',
    '  apply:',
    '    guidance:',
    '      - "change-feedback-loop/apply: review first"',
    '  archive:',
    '    guidance:',
    '      - "change-feedback-loop/archive: close out first"',
  ].join('\n'));
  run('openspec', ['new', 'change', 'demo-change', '--json'], { cwd: root });
  const change = join(root, 'openspec/changes/demo-change');
  mkdirSync(join(change, 'specs/demo-capability'), { recursive: true });
  writeFileSync(join(change, 'proposal.md'), '# Proposal\n');
  writeFileSync(join(change, 'design.md'), '# Design\n');
  writeFileSync(join(change, 'specs/demo-capability/spec.md'), [
    '> req: ABC-001',
    '',
    '## ADDED Requirements',
    '',
    '### Requirement: Demo',
    'The system SHALL demonstrate finalizer integration.',
  ].join('\n'));
  writeFileSync(join(change, 'tasks.md'), [
    '- [x] 0.1 Plan review (openspec-feedback:plan-review).',
    '- [ ] 1.1 Closeout review (openspec-feedback:closeout-review).',
  ].join('\n'));
  return { root, change };
}

function createGeneratedFeedbackChange() {
  const root = mkdtempSync(join(tmpdir(), 'change-feedback-generation-'));
  created.push(root);
  run('openspec', ['init', root, '--tools', 'none', '--no-animation']);
  copyFileSync(join(ROOT, 'openspec/config.yaml'), join(root, 'openspec/config.yaml'));
  run('openspec', ['new', 'change', 'generated-feedback-change', '--json'], { cwd: root });
  return root;
}

function write(root, relativePath, content) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function copyGovernanceScripts(root) {
  for (const script of [
    'check-project-reqs.mjs',
    'check-project-specs.mjs',
    'check-capability-taxonomy.mjs',
    'check-capability-discovery.mjs',
    'check-verification-routing.mjs',
    'verification-routing-contract.mjs',
  ]) {
    const target = join(root, 'openspec/governance', script);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(ROOT, 'openspec/governance', script), target);
  }
}

function createGovernanceFixture() {
  const root = mkdtempSync(join(tmpdir(), 'change-feedback-governance-'));
  created.push(root);
  run('openspec', ['init', root, '--tools', 'none', '--no-animation']);
  symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');
  symlinkSync(join(ROOT, 'DEEP_RESEARCH_HARNESS'), join(root, 'DEEP_RESEARCH_HARNESS'), 'dir');
  copyGovernanceScripts(root);
  run('openspec', ['new', 'change', 'demo-change', '--json'], { cwd: root });
  write(root, 'openspec/governance/req-registry.yaml', 'ZZZ-001: unrelated-capability - intentional first checker failure\n');
  write(root, 'openspec/changes/demo-change/proposal.md', [
    '## Why',
    '',
    'Exercise each governance checker through the production finalizer CLI.',
    '',
    '## What Changes',
    '',
    '- Temporary fixture only.',
    '',
    '## Capabilities',
    '',
    '### New Capabilities',
    '',
    '- demo-capability.',
    '',
    '## Impact',
    '',
    '- Temporary fixture only.',
    '',
  ].join('\n'));
  write(root, 'openspec/changes/demo-change/design.md', [
    '## Context',
    '',
    'The fixture reaches governance checks only after native OpenSpec validation.',
    '',
    '## Goals / Non-Goals',
    '',
    '### Goals',
    '',
    '- Exercise ordered checker failures.',
    '',
    '### Non-Goals',
    '',
    '- Archive the fixture change.',
    '',
  ].join('\n'));
  write(root, 'openspec/changes/demo-change/specs/governance/demo-capability/spec.md', [
    '> req: ABC-001',
    '',
    '## Purpose',
    '',
    'Define a temporary integration fixture capability for finalizer checks.',
    '',
    '## ADDED Requirements',
    '',
    '### Requirement: Demo governance boundary',
    '',
    'The fixture SHALL reach the selected governance boundary.',
    '',
    '#### Scenario: finalizer evaluates the fixture',
    '',
    '- **WHEN** prerequisite task markers are complete',
    '- **THEN** the selected checker reports its direct root',
    '',
  ].join('\n'));
  write(root, 'openspec/specs/governance/demo-capability/spec.md', '> req: ABC-001\n');
  write(root, 'openspec/changes/demo-change/tasks.md', [
    '- [x] 0.1 Plan review (openspec-feedback:plan-review).',
    '- [x] 1.1 Prepare governance fixture.',
    '- [x] 2.1 Closeout review (openspec-feedback:closeout-review).',
    '',
  ].join('\n'));
  return root;
}

function runFinalizer(root) {
  const result = spawnSync(process.execPath, [FINALIZER, '--change', 'demo-change'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(result.status, 1, result.stderr);
  return JSON.parse(result.stdout);
}

after(() => {
  for (const path of created) rmSync(path, { recursive: true, force: true });
});

describe('change feedback finalizer integration', () => {
  it('delivers feedback marker task instructions and operation guidance for a fresh change', () => {
    const root = createGeneratedFeedbackChange();
    const taskInstructions = JSON.parse(run('openspec', [
      'instructions', 'tasks', '--change', 'generated-feedback-change', '--json',
    ], { cwd: root }));
    const markerRules = taskInstructions.rules.filter((rule) => rule.includes('openspec-feedback:'));
    assert.equal(markerRules.length, 1);
    assert.match(markerRules[0], /openspec-feedback:plan-review/);
    assert.match(markerRules[0], /openspec-feedback:closeout-review/);
    assert.match(markerRules[0], /初始为 `- \[ \]`/);

    const apply = JSON.parse(run('openspec', [
      'instructions', 'apply', '--change', 'generated-feedback-change', '--json',
    ], { cwd: root }));
    const archive = JSON.parse(run('openspec', [
      'instructions', 'archive', '--change', 'generated-feedback-change', '--json',
    ], { cwd: root }));
    assert.ok(apply.operationGuidance.some((entry) => entry.startsWith('change-feedback-loop/apply:')));
    assert.ok(archive.operationGuidance.some((entry) => entry.startsWith('change-feedback-loop/archive:')));
  });

  it('receives current operation guidance from a temporary OpenSpec root', () => {
    const { root } = createFeedbackChange();
    const apply = JSON.parse(run('openspec', ['instructions', 'apply', '--change', 'demo-change', '--json'], { cwd: root }));
    const archive = JSON.parse(run('openspec', ['instructions', 'archive', '--change', 'demo-change', '--json'], { cwd: root }));

    assert.deepEqual(apply.operationGuidance, ['change-feedback-loop/apply: review first']);
    assert.deepEqual(archive.operationGuidance, ['change-feedback-loop/archive: close out first']);
  });

  it('uses native status and blocks the production CLI before validation when closeout is pending', () => {
    const { root } = createFeedbackChange();
    const result = spawnSync(process.execPath, [FINALIZER, '--change', 'demo-change'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
    });

    assert.equal(result.status, 1, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.outcome, 'blocked');
    assert.equal(output.root.code, 'review_marker_unmet');
    assert.equal(output.root.rerun, `${FINALIZER_COMMAND} --change demo-change`);
    assert.deepEqual(output.checks.map((check) => check.id), ['openspec_status', 'artifacts']);
  });

  it('short-circuits every governance checker through the production CLI', () => {
    const root = createGovernanceFixture();
    const requirements = runFinalizer(root);
    assert.equal(requirements.root.code, 'requirement_governance_failed');
    assert.deepEqual(requirements.checks.map((check) => check.id), [
      'openspec_status', 'artifacts', 'tasks', 'strict_validation',
    ]);

    write(root, 'openspec/governance/req-registry.yaml', 'prefixes:\n  ABC: governance/demo-capability\n\nABC-001: demo-capability - fixture requirement\n');
    write(root, 'openspec/specs/governance/demo-capability/spec.md', '> req: ABC-001\n');
    const mainSpecs = runFinalizer(root);
    assert.equal(mainSpecs.root.code, 'main_spec_governance_failed');
    assert.deepEqual(mainSpecs.checks.map((check) => check.id), [
      'openspec_status', 'artifacts', 'tasks', 'strict_validation', 'requirement_governance',
    ]);

    write(root, 'openspec/specs/governance/demo-capability/spec.md', [
      '> req: ABC-001',
      '',
      '## Purpose',
      '',
      'Define the synchronized fixture capability.',
      '',
      '## Requirements',
      '',
      '### Requirement: Demo governance boundary',
      '',
      'The fixture SHALL reach the routing boundary.',
      '',
    ].join('\n'));
    const taxonomy = runFinalizer(root);
    assert.equal(taxonomy.root.code, 'capability_taxonomy_failed');
    assert.deepEqual(taxonomy.checks.map((check) => check.id), [
      'openspec_status', 'artifacts', 'tasks', 'strict_validation',
      'requirement_governance', 'main_spec_governance',
    ]);

    write(root, 'openspec/specs/README.md', [
      '# Capability Catalog',
      '',
      'Main specs remain the behavior authority.',
      '',
      '| Capability path | Purpose | Keywords | Boundaries / neighbors | Related entries | Agent/Markdown owns | Engine/Node owns |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      '| governance/demo-capability | Fixture governance capability. | fixture | Finalizer fixture only. | none | Select semantic work. | Validate deterministic structure. |',
      '',
    ].join('\n'));
    const discovery = runFinalizer(root);
    assert.equal(discovery.root.code, 'capability_discovery_failed');
    assert.deepEqual(discovery.checks.map((check) => check.id), [
      'openspec_status', 'artifacts', 'tasks', 'strict_validation',
      'requirement_governance', 'main_spec_governance', 'capability_taxonomy',
    ]);

    write(root, 'openspec/changes/demo-change/proposal.md', [
      '## Why',
      '',
      'Exercise each governance checker through the production finalizer CLI.',
      '',
      '## What Changes',
      '',
      '- Temporary fixture only.',
      '',
      '## Capability Discovery',
      '',
      '| Candidate path | Evidence read | Decision | Reason |',
      '| --- | --- | --- | --- |',
      '| `governance/demo-capability` | Fixture main spec | Modify | The fixture changes this capability. |',
      '',
      '## Capabilities',
      '',
      '### Modified Capabilities',
      '',
      '- governance/demo-capability.',
      '',
      '## Impact',
      '',
      '- Temporary fixture only.',
      '',
    ].join('\n'));
    const routing = runFinalizer(root);
    assert.equal(routing.root.code, 'verification_routing_failed');
    assert.deepEqual(routing.checks.map((check) => check.id), [
      'openspec_status', 'artifacts', 'tasks', 'strict_validation',
      'requirement_governance', 'main_spec_governance', 'capability_taxonomy',
      'capability_discovery',
    ]);
  });

  it('keeps every declared entry on the guidance and finalizer route', () => {
    for (const path of SUPPORTED_ENTRY_SURFACES.apply) {
      const source = readFileSync(join(ROOT, path), 'utf8');
      assert.match(source, /openspec instructions apply --change/);
      assert.match(source, /openspec-feedback:/);
      assert.match(source, /change-feedback-loop\/apply:/);
      assert.match(source, /stop[\s\S]{0,120}target edit|target edit[\s\S]{0,120}stop/i);
    }
    for (const path of SUPPORTED_ENTRY_SURFACES.archive) {
      const source = readFileSync(join(ROOT, path), 'utf8');
      assert.match(source, /openspec instructions archive --change/);
      assert.match(source, /openspec-feedback:/);
      assert.match(source, /change-feedback-loop\/archive:/);
      assert.match(source, /node openspec\/governance\/finalize-change-archive\.mjs --change/);
      assert.doesNotMatch(source, /\bmv\s+/);
      assert.doesNotMatch(source, /\bopenspec archive\b/);
    }
    for (const path of ['AGENTS.md', 'CLAUDE.md']) {
      const source = readFileSync(join(ROOT, path), 'utf8');
      assert.match(source, /openspec-feedback:/);
      assert.match(source, /node openspec\/governance\/finalize-change-archive\.mjs --change/);
    }
  });
});
