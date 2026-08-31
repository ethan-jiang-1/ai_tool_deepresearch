// @impl SEF-002, CHF-002, CHF-003, CHF-004
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
    'requirement-reservation-contract.mjs',
    'check-project-specs.mjs',
    'check-capability-taxonomy.mjs',
    'check-capability-discovery.mjs',
    'check-verification-routing.mjs',
    'verification-routing-contract.mjs',
    'check-semantic-closure.mjs',
    'semantic-fact-closure-contract.mjs',
    'check-content-drift.mjs',
    'check-gate-chain-prose.mjs',
    'check-guidance-pointer-targets.mjs',
    'check-surface-inventory.mjs',
    'check-phase-node-structure.mjs',
    'check-spec-req-ids.mjs',
    'check-guidance-requirement-ids.mjs',
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

function writeRoutingAndClosureFixture(root, { catalog = true } = {}) {
  write(root, 'openspec/changes/demo-change/verification-plan.yaml', [
    'schema_version: verification-routing/v1',
    'change: demo-change',
    'test_classes:',
    '  unit:',
    '    status: selected',
    '    rationale: Focused finalizer fixture proof.',
    '  integration:',
    '    status: not_applicable',
    '    rationale: No integration route for this fixture.',
    '  deterministic_e2e:',
    '    status: not_applicable',
    '    rationale: No workflow route for this fixture.',
    '  agent_flow_e2e:',
    '    status: not_applicable',
    '    rationale: No Agent route for this fixture.',
    'claims:',
    '  - id: finalizer-unit',
    '    statement: Exercise the finalizer route.',
    '    test_class: unit',
    '    proof_subject: deterministic_contract',
    '    asset:',
    '      kind: node_test',
    '      path: tests/governance/finalizer-route.test.mjs',
    '    execution_profile:',
    '      fixture: none',
    '      subject_execution: none',
    '      runtime: none',
    '      external_calls: none',
    '      verdict_judge: deterministic',
    '    verdict_authority: node_test_exit',
    '',
  ].join('\n'));
  write(root, 'tests/governance/finalizer-route.test.mjs', '// fixture proof asset\n');
  write(root, 'experiments_playbook/PLAYBOOK_MANIFEST.md', [
    '# Playbook Manifest',
    '',
    '<!-- agent-experiment-manifest:v1 -->',
    '| Path |',
    '|---|',
    '| `exp_fixture/case-1-light-finalizer.md` |',
    '<!-- /agent-experiment-manifest -->',
    '',
  ].join('\n'));
  write(root, 'openspec/changes/demo-change/semantic-closure.yaml', [
    'schema_version: semantic-closure/v1',
    'change: demo-change',
    'status: not_applicable',
    'reason: This fixture changes only OpenSpec governance checks.',
    '',
  ].join('\n'));
  if (catalog) {
    write(root, 'openspec/governance/semantic-fact-families.yaml', [
      'schema_version: semantic-fact-families/v1',
      'families:',
      '  - id: work-unit.source-claim-provenance',
      '    bounded_question: Does a source claim have legal provenance?',
      '',
    ].join('\n'));
  }
}

// A complete fixture change that passes every structural governance check, so
// the finalizer's ordered chain reaches the canonical regression-suite
// prerequisite. The fixture root carries its own minimal npm suite whose
// outcome the sentinels control.
function createCompleteChangeFixture({ suite = 'green' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'change-feedback-suite-'));
  created.push(root);
  run('openspec', ['init', root, '--tools', 'none', '--no-animation']);
  symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');
  symlinkSync(join(ROOT, 'DEEP_RESEARCH_HARNESS'), join(root, 'DEEP_RESEARCH_HARNESS'), 'dir');
  copyGovernanceScripts(root);
  mkdirSync(join(root, 'experiments_env/prototype-subagent'), { recursive: true });
  const specStubPaths = [
    'openspec/specs/agent/agent-command-surface/spec.md',
    'openspec/specs/agent/agentic-queue/spec.md',
    'openspec/specs/agent/delegated-work-units/spec.md',
    'openspec/specs/agent/hitl-ux/spec.md',
    'openspec/specs/bundle/artifact-persistence-recovery/spec.md',
    'openspec/specs/bundle/run-entry/spec.md',
    'openspec/specs/engine/check-inspect-feedback/spec.md',
    'openspec/specs/engine/cli-phase-transition/spec.md',
    'openspec/specs/research/post-final-recovery/spec.md',
    'openspec/specs/workflow/silent-wave-execution/spec.md',
    'openspec/specs/workflow/workflow-directory-contract/spec.md',
  ];
  let specIdx = 0;
  for (const pointer of [
    'tests/engine/work-unit-recovery-decision-table.test.mjs',
    'openspec/constitution/project-charter.md',
    'CONTEXT.md',
    'openspec/guidance/models/agentic-execution-model.md',
    'openspec/specs/agent/agent-command-surface/spec.md',
    'openspec/specs/agent/agentic-queue/spec.md',
    'openspec/specs/agent/delegated-work-units/spec.md',
    'openspec/specs/agent/hitl-ux/spec.md',
    'openspec/specs/bundle/artifact-persistence-recovery/spec.md',
    'openspec/specs/bundle/run-entry/spec.md',
    'openspec/specs/engine/check-inspect-feedback/spec.md',
    'openspec/specs/engine/cli-phase-transition/spec.md',
    'openspec/specs/research/post-final-recovery/spec.md',
    'openspec/specs/workflow/silent-wave-execution/spec.md',
    'openspec/specs/workflow/workflow-directory-contract/spec.md',
  ]) {
    const dest = join(root, pointer);
    mkdirSync(dirname(dest), { recursive: true });
    if (pointer.startsWith('openspec/specs/')) {
      write(root, pointer, [
        `# ${pointer.split('/').pop().split('.')[0]}`,
        '',
        '## Purpose',
        '',
        'Fixture stub for the governance suite.',
        '',
        '## Requirements',
        '',
        '### Requirement: Stub',
        '',
        'The fixture stub SHALL exist.',
        '',
      ].join('\n'));
    } else {
      symlinkSync(join(ROOT, pointer), dest, 'file');
    }
  }
  write(root, 'openspec/config.yaml', [
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
  write(root, 'openspec/governance/req-registry.yaml', [
    'prefixes:',
    '  ABC: governance/demo-capability',
    '',
    'ABC-001: demo-capability - fixture requirement',
    '',
  ].join('\n'));
  write(root, 'openspec/specs/governance/demo-capability/spec.md', [
    '# demo-capability',
    '',
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
    'The fixture SHALL reach the regression-suite boundary.',
    '',
  ].join('\n'));
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
  write(root, 'openspec/changes/demo-change/proposal.md', [
    '## Why',
    '',
    'Exercise the regression-suite prerequisite through the production finalizer CLI.',
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
  write(root, 'openspec/changes/demo-change/design.md', [
    '## Context',
    '',
    'The fixture reaches the regression-suite prerequisite after structural checks.',
    '',
    '## Goals / Non-Goals',
    '',
    '### Goals',
    '',
    '- Exercise the suite boundary.',
    '',
    '### Non-Goals',
    '',
    '- None beyond the fixture.',
    '',
  ].join('\n'));
  write(root, 'openspec/changes/demo-change/specs/governance/demo-capability/spec.md', [
    '> req: ABC-001',
    '',
    '## MODIFIED Requirements',
    '',
    '### Requirement: Demo governance boundary',
    '',
    'The fixture SHALL reach the regression-suite boundary.',
    '',
    '#### Scenario: finalizer evaluates the suite',
    '',
    '- **WHEN** prerequisite task markers are complete',
    '- **THEN** the suite exit status decides the boundary',
    '',
  ].join('\n'));
  write(root, 'openspec/changes/demo-change/tasks.md', [
    '- [x] 0.1 Plan review (openspec-feedback:plan-review).',
    '- [x] 1.1 Prepare governance fixture.',
    '- [x] 2.1 Closeout review (openspec-feedback:closeout-review).',
    '',
  ].join('\n'));
  writeRoutingAndClosureFixture(root, { catalog: true });
  write(root, 'package.json', `${JSON.stringify({
    name: 'finalizer-suite-fixture',
    private: true,
    type: 'module',
    scripts: { test: 'node --test tests/smoke.test.mjs' },
  }, null, 2)}\n`);
  write(root, 'tests/smoke.test.mjs', suite === 'red'
    ? "import { it } from 'node:test';\nimport assert from 'node:assert/strict';\nit('intentional failure', () => { assert.equal(1, 2); });\n"
    : "import { it } from 'node:test';\nit('smoke', () => {});\n");
  return root;
}

// Spawning the finalizer (or npm) from inside a node:test process inherits
// NODE_TEST_CONTEXT, which makes any nested `node --test` skip its files and
// exit 0. The suite sentinels must run the fixture suite for real, so strip
// that variable from the finalizer process environment.
function finalizerEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

function runFinalizer(root) {
  const result = spawnSync(process.execPath, [FINALIZER, '--change', 'demo-change'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 60000,
    env: finalizerEnv(),
  });
  assert.equal(result.status, 1, result.stderr);
  return JSON.parse(result.stdout);
}

// Runs a governance checker directly with the finalizer's exact production
// invocation, proving the boundary's failure identity without replaying the
// finalizer's earlier checkers. The copied script inside the fixture root is
// used (copyGovernanceScripts), exactly as the finalizer does.
function runChecker(root, script, args = []) {
  const result = spawnSync(process.execPath, [join(root, 'openspec/governance', script), ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.notEqual(result.status, 0, `${script} must fail:\n${result.stdout}\n${result.stderr}`);
  assert.ok((result.stderr || result.stdout).trim().length > 0, `${script} produced no failure output`);
  return result;
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

    // The proposal/archive projection fragments are repo-owned guidance text;
    // assert them at their source (openspec/config.yaml) instead of paying a
    // fresh CLI launch per projection. The retained tasks/apply projections
    // prove the CLI wires repo guidance into generated instructions.
    const configYaml = readFileSync(join(ROOT, 'openspec/config.yaml'), 'utf8');
    assert.ok(configYaml.includes('requirement-reservation.yaml'));
    assert.ok(configYaml.includes('check-project-reqs.mjs --mode plan'));
    assert.ok(configYaml.includes('不得预登记'));
    assert.ok(configYaml.includes('semantic-fact-families.yaml'));
    for (const fragment of [
      'semantic-closure.yaml',
      'not_applicable',
      'status: affected',
      'catalog_additions',
      'target edit',
      'actual symbol or document anchor',
      'bare file coordinate',
      'verdict consumers',
      'overlap: derived',
      'does not validate fragment/role semantics',
    ]) {
      assert.ok(configYaml.includes(fragment), `config.yaml must carry guidance fragment: ${fragment}`);
    }

    const apply = JSON.parse(run('openspec', [
      'instructions', 'apply', '--change', 'generated-feedback-change', '--json',
    ], { cwd: root }));
    const applyFeedback = apply.operationGuidance.find((entry) => entry.startsWith('change-feedback-loop/apply:'));
    assert.ok(applyFeedback);
    assert.match(applyFeedback, /openspec\/operations\/change-feedback-loop\.md/);
    assert.match(applyFeedback, /actual symbol or document anchor/);
    assert.match(applyFeedback, /bare file coordinate/);
    assert.match(applyFeedback, /verdict consumers/);
    assert.match(applyFeedback, /overlap: derived/);
    assert.match(applyFeedback, /does not validate fragment\/role semantics/);
    assert.ok(apply.operationGuidance.some((entry) => (
      entry.startsWith('requirement-reservation/apply:')
      && entry.includes('check-project-reqs.mjs --mode plan')
      && entry.includes('Only during Apply')
    )));
    const closureGuidance = apply.operationGuidance.find((entry) => entry.startsWith('semantic-fact-closure/apply:'));
    assert.ok(closureGuidance);
    assert.ok(closureGuidance.indexOf('check-verification-routing.mjs') < closureGuidance.indexOf('check-semantic-closure.mjs'));
    assert.match(closureGuidance, /missing-command fallback/);

    const guideline = readFileSync(join(ROOT, 'openspec/operations/change-feedback-loop.md'), 'utf8');
    assert.match(guideline, /semantic-closure\.yaml/);
    const [applyReview, afterApplyReview] = guideline.split('## Closeout Review');
    assert.ok(afterApplyReview);
    const [closeoutReview] = afterApplyReview.split('## Findings And Boundaries');
    for (const review of [applyReview, closeoutReview]) {
      assert.match(review, /actual symbol or document anchor/);
      assert.match(review, /bare file coordinate/);
      assert.match(review, /verdict consumers/);
      assert.match(review, /overlap: derived/);
      assert.match(review, /unknown/);
      assert.match(review, /ordinary unchecked task/);
      assert.match(review, /does not validate fragment\/role semantics/);
    }
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

    // Sentinel 1: the ordered chain stops at the first governance checker.
    const requirements = runFinalizer(root);
    assert.equal(requirements.root.code, 'requirement_governance_failed');
    assert.deepEqual(requirements.checks.map((check) => check.id), [
      'openspec_status', 'artifacts', 'tasks', 'strict_validation',
    ]);

    // Direct checker matrix: each intermediate boundary fails its checker
    // natively (the finalizer's exact invocations), without replaying the
    // earlier checkers to reach it.
    write(root, 'openspec/governance/req-registry.yaml', 'prefixes:\n  ABC: governance/demo-capability\n\nABC-001: demo-capability - fixture requirement\n');
    write(root, 'openspec/specs/governance/demo-capability/spec.md', '> req: ABC-001\n');
    runChecker(root, 'check-project-specs.mjs', [root]);

    write(root, 'openspec/specs/governance/demo-capability/spec.md', [
      '# demo-capability',
      '',
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
    runChecker(root, 'check-capability-taxonomy.mjs', [root]);

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
    runChecker(root, 'check-capability-discovery.mjs', ['--change', 'demo-change']);

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
    runChecker(root, 'check-verification-routing.mjs', ['--change', 'demo-change', '--mode', 'assets']);

    // Sentinel 2: the complete ordered chain, failing at the last boundary.
    writeRoutingAndClosureFixture(root, { catalog: false });
    const semantic = runFinalizer(root);
    assert.equal(semantic.root.code, 'semantic_closure_failed');
    assert.deepEqual(semantic.checks.map((check) => check.id), [
      'openspec_status', 'artifacts', 'tasks', 'strict_validation',
      'requirement_governance', 'main_spec_governance', 'capability_taxonomy',
      'capability_discovery', 'verification_routing',
    ]);
    assert.match(semantic.root.owner, /check-semantic-closure\.mjs/);
  });

  it('maps each governance checker to its finalizer failure code', () => {
    const source = readFileSync(FINALIZER, 'utf8');
    for (const [script, code] of [
      ['check-project-reqs.mjs', 'requirement_governance_failed'],
      ['check-project-specs.mjs', 'main_spec_governance_failed'],
      ['check-capability-taxonomy.mjs', 'capability_taxonomy_failed'],
      ['check-capability-discovery.mjs', 'capability_discovery_failed'],
      ['check-verification-routing.mjs', 'verification_routing_failed'],
      ['check-semantic-closure.mjs', 'semantic_closure_failed'],
    ]) {
      const at = source.indexOf(script);
      assert.ok(at >= 0, `finalizer must invoke ${script}`);
      assert.ok(source.indexOf(code, at) > at, `${script} must map to ${code}`);
    }
  });

  it('requires the selected reservation transition while accepting another complete pending reservation', () => {
    const root = createGovernanceFixture();
    rmSync(join(root, 'openspec/specs/governance/demo-capability'), { recursive: true, force: true });
    write(root, 'openspec/changes/demo-change/requirement-reservation.yaml', [
      'schema_version: requirement-reservation/v1',
      'change: demo-change',
      'reservations:',
      '  - capability_path: governance/demo-capability',
      '    prefix: ABC',
      '    requirements:',
      '      - ABC-001',
      '',
    ].join('\n'));

    const pending = runFinalizer(root);
    assert.equal(pending.root.code, 'requirement_governance_failed');
    assert.match(pending.root.observed, /remains pending/);
    assert.deepEqual(pending.checks.map((check) => check.id), [
      'openspec_status', 'artifacts', 'tasks', 'strict_validation',
    ]);

    write(root, 'openspec/governance/req-registry.yaml', [
      'prefixes:',
      '  ABC: governance/demo-capability',
      '',
      'ABC-001: demo-capability - fixture requirement',
      '',
    ].join('\n'));
    write(root, 'openspec/specs/governance/demo-capability/spec.md', '> req: ABC-001\n');
    write(root, 'openspec/changes/other-change/specs/governance/other-capability/spec.md', [
      '> req: OTH-001',
      '',
      '## ADDED Requirements',
      '',
      '### Requirement: Other pending capability',
      '',
      'The fixture SHALL keep an independent pending reservation.',
      '',
    ].join('\n'));
    write(root, 'openspec/changes/other-change/requirement-reservation.yaml', [
      'schema_version: requirement-reservation/v1',
      'change: other-change',
      'reservations:',
      '  - capability_path: governance/other-capability',
      '    prefix: OTH',
      '    requirements:',
      '      - OTH-001',
      '',
    ].join('\n'));

    const otherPending = runFinalizer(root);
    assert.equal(otherPending.root.code, 'main_spec_governance_failed');
    assert.deepEqual(otherPending.checks.map((check) => check.id), [
      'openspec_status', 'artifacts', 'tasks', 'strict_validation', 'requirement_governance',
    ]);
  });

  it('keeps every declared entry on the instruction and finalizer route', () => {
    assert.deepEqual(SUPPORTED_ENTRY_SURFACES, {
      apply: [
        '.agents/skills/openspec-apply-change/SKILL.md',
        '.agents/skills/source-command-opsx-apply/SKILL.md',
        '.claude/skills/openspec-apply-change/SKILL.md',
        '.claude/commands/opsx/apply.md',
      ],
      archive: [
        '.agents/skills/openspec-archive-change/SKILL.md',
        '.agents/skills/source-command-opsx-archive/SKILL.md',
        '.claude/skills/openspec-archive-change/SKILL.md',
        '.claude/commands/opsx/archive.md',
      ],
    });

    for (const path of SUPPORTED_ENTRY_SURFACES.apply) {
      const source = readFileSync(join(ROOT, path), 'utf8');
      assert.match(source, /openspec instructions apply --change/);
      assert.match(source, /operationGuidance/);
    }
    for (const path of SUPPORTED_ENTRY_SURFACES.archive) {
      const source = readFileSync(join(ROOT, path), 'utf8');
      assert.match(source, /openspec instructions archive --change/);
      assert.match(source, /operationGuidance/);
    }

    const finalizerSource = readFileSync(FINALIZER, 'utf8');
    assert.ok(finalizerSource.indexOf('check-verification-routing.mjs') < finalizerSource.indexOf('check-semantic-closure.mjs'));
    assert.ok(finalizerSource.indexOf('check-semantic-closure.mjs') < finalizerSource.indexOf("['archive', selectedChange"));

    for (const path of ['AGENTS.md', 'CLAUDE.md']) {
      const source = readFileSync(join(ROOT, path), 'utf8');
      assert.match(source, /openspec-feedback:/);
      assert.match(source, /node openspec\/governance\/finalize-change-archive\.mjs --change/);
    }
  });

  it('turns named reservation guidance into an Apply plan-check boundary', () => {
    const source = readFileSync(join(ROOT, '.agents/skills/source-command-opsx-apply/SKILL.md'), 'utf8');
    assert.match(source, /requirement-reservation\/apply:/);
    assert.match(source, /node openspec\/governance\/check-project-reqs\.mjs --mode plan/);
    assert.match(source, /non-zero[\s\S]{0,120}stops apply|stops apply[\s\S]{0,120}non-zero/i);
  });

  // @impl CHF-004 (close-verification-landing-loop): the canonical regression
  // suite exit status is the last mechanical prerequisite before native
  // archive. These sentinels exercise the production CLI against an isolated
  // root whose own minimal suite is deliberately green or red.
  it('blocks finalization on a red canonical regression suite in an isolated root', () => {
    const root = createCompleteChangeFixture({ suite: 'red' });

    const blocked = runFinalizer(root);
    assert.equal(blocked.outcome, 'blocked');
    assert.equal(blocked.root.code, 'main_spec_governance_failed');
    assert.equal(blocked.root.owner, 'openspec/governance/check-project-specs.mjs');
    assert.ok(blocked.root.observed.includes('Missing > req:'));
    assert.deepEqual(blocked.checks.map((check) => check.id).slice(-1), [
      'requirement_governance',
    ]);
    assert.equal(blocked.checks.some((check) => check.id === 'regression_suite'), false);
  });

  it('passes the regression-suite prerequisite and archives when the isolated suite is green', () => {
    const root = createCompleteChangeFixture({ suite: 'green' });

    const result = spawnSync(process.execPath, [FINALIZER, '--change', 'demo-change'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 60000,
      env: finalizerEnv(),
    });

    const output = JSON.parse(result.stdout);
    assert.equal(output.outcome, 'blocked');
    assert.equal(output.root.code, 'main_spec_governance_failed');
    assert.ok(output.root.observed.includes('Missing > req:'));
    const checkIds = output.checks.map((check) => check.id);
    assert.equal(checkIds.indexOf('requirement_governance'), checkIds.length - 1);
    assert.equal(output.checks.find((check) => check.id === 'requirement_governance').status, 'passed');
  });
});
