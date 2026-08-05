// validate-workflow-package.test.mjs — Workflow package consistency validator CLI test
// @impl WNC-007

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const CLI = join(process.cwd(), 'DEEP_RESEARCH_HARNESS', 'cli', 'validate-workflow-package.mjs');

describe('validate-workflow-package.mjs integration', () => {
  let tmpRoot;
  const dirs = []; // track per-test subdirs for cleanup

  /** Create a fresh fixture directory under tmpRoot. Returns { wd, gd }. */
  function scaffold(label) {
    const base = join(tmpRoot, label);
    mkdirSync(base, { recursive: true });
    dirs.push(base);

    const wd = join(base, 'workflows');
    const nd = join(wd, 'nodes');
    const gd = join(base, 'gate_defs');
    mkdirSync(wd, { recursive: true });
    mkdirSync(join(nd, 'phases'), { recursive: true });
    mkdirSync(join(nd, 'shared'), { recursive: true });
    mkdirSync(gd, { recursive: true });
    return { base, wd, nd, gd };
  }

  function phaseMd({ id, phase, gate, title }) {
    return `---
{"node_type":"phase","id":"${id}","phase":"${phase}","gate":${gate === null ? 'null' : `"${gate}"`},"stop":"no","execution_contract":{"surface":"phase-agent","search_policy":"no_search"},"requires":[],"suggested_context":[]}
---
# ${title}

## 0. Execution Brief

- **Objective**: Test lifecycle objective.
- **Start here**: Test lifecycle input.
- **Path to pass**: Test lifecycle path.
- **Completion check**: Test lifecycle check.
- **Failure posture**: Test lifecycle failure posture.

## 1. Stage Goal

Test stage goal.

## 2. Required Inputs

Test required inputs.

## 3. Allowed Actions

Test allowed actions.

## 4. Expected Artifacts

Test expected artifacts.

## 5. Gate Command

Test gate command.

## 6. On Gate Pass

Test pass behavior.

## 7. On Gate Fail

Test fail behavior.

## 8. Stop Behavior

Test stop behavior.

## 9. Anti-Cheating Rules

Test anti-cheating rules.
`;
  }

  function roleMd({ id, role, h1 }) {
    return `---
node_type: shared
id: ${id}
shared_scope: subagent-protocol
role: ${role}
authority: guidance-only
execution_contract:
  surface: work-unit-subagent-role
  search_policy: subagent_performs_search
  loaded_by: phase-agent
  delivered_via: work_unit_task_md
  filesystem_write: required
  required_write_tools:
    - read_file
    - write_file
    - append_file
    - mkdir
requires:
  - shared/shared-subagent-protocol
  - shared/shared-schemas
  - shared/shared-page-fetch-guidance
suggested_context: []
---
# ${h1}

## 0. Role Brief

- **Role key**: \`${role}\`
- **Used by**: Test phase agent.
- **Receives**: Work-unit task, beacon, result schema, and runtime receipt.
- **Produces**: Test outputs.
- **Write capability**: Requires filesystem read/write/append and directory creation under bundle_dir.
- **Boundary**: Test role boundary.
- **Handoff**: Test handoff.

## Lifecycle Logging Mandate (always-loaded)

Bind work_id, queue_item_id, kind, and receipt_nonce in lifecycle logs.

## 1. Purpose

Test purpose.

## 2. Search Focus

Test search focus.

## 3. Artifacts

Test artifacts.

## 4. Execution Within Work Unit

Test work-unit execution.

## 5. Page Content Fetching

Test fetching.

## 6. Anti-Cheating Rules

Test rules.

## 7. Relationship to Phase Agent

Test relationship.
`;
  }

  function writeRequiredRoleSpecs(nd) {
    const specs = [
      {
        file: 'subagent-dpt-source-intake.md',
        id: 'subagent-dpt-source-intake',
        role: 'dpt-source-intake',
        h1: 'Work-Unit Role: dpt-source-intake - Foundation Reference Intake',
      },
      {
        file: 'subagent-dpt-evidence-extractor.md',
        id: 'subagent-dpt-evidence-extractor',
        role: 'dpt-evidence-extractor',
        h1: 'Work-Unit Role: dpt-evidence-extractor - Topic-Specific Deepening',
      },
      {
        file: 'subagent-dpt-topic-scout.md',
        id: 'subagent-dpt-topic-scout',
        role: 'dpt-topic-scout',
        h1: 'Work-Unit Role: dpt-topic-scout - Gap-Fill Search',
      },
      {
        file: 'subagent-dpt-claim-verifier.md',
        id: 'subagent-dpt-claim-verifier',
        role: 'dpt-claim-verifier',
        h1: 'Work-Unit Role: dpt-claim-verifier - Critical Claim Verification',
      },
      {
        file: 'subagent-dpt-source-diagnostic.md',
        id: 'subagent-dpt-source-diagnostic',
        role: 'dpt-source-diagnostic',
        h1: 'Work-Unit Role: dpt-source-diagnostic - Source Quality Diagnostic',
      },
    ];

    for (const spec of specs) {
      writeFileSync(join(nd, 'phases', spec.file), roleMd(spec));
    }
    writeFileSync(join(nd, 'shared/shared-page-fetch-guidance.md'), `---
node_type: shared
id: shared-page-fetch-guidance
shared_scope: subagent-fetch
authority: guidance-only
actor_delivery: required
---
# Shared Page Fetch Guidance
`);
  }

  before(() => {
    tmpRoot = createTempDir('validate-pkg');
  });

  after(cleanupAll);

  it('exits 0 when package is consistent', () => {
    const { wd, nd, gd } = scaffold('consistent');

    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({
      phases: [
        { key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' },
        { key: 'final', node: 'phases/phase-final.md', gate: null },
      ],
      shared: ['shared/shared-profile.md'],
    }));

    writeFileSync(join(nd, 'phases/phase-setup.md'),
      phaseMd({ id: 'phase-setup', phase: 'setup', gate: 'setup-ready', title: 'Setup' }));
    writeFileSync(join(nd, 'phases/phase-final.md'),
      phaseMd({ id: 'phase-final', phase: 'final', gate: null, title: 'Final' }));
    writeRequiredRoleSpecs(nd);
    writeFileSync(join(nd, 'shared/shared-profile.md'),
      '---\n{"node_type":"shared","id":"shared-profile","requires":[]}\n---\n# Profile\n');
    writeFileSync(join(gd, 'gate-setup-ready.definition.json'),
      JSON.stringify({
        gate: 'setup-ready',
        description: 'Test-only valid Gate definition.',
        rules: [{
          id: 'fixture_placeholder',
          check: 'placeholder',
          target: 'fixture-contract-boundary',
          failure_message: 'Test-only consistency fixture placeholder.',
          finding: { source: 'definition', blocking_basis: 'configuration_integrity' },
          repair: { kind: 'missing_contract', write_to: 'fixture-contract-boundary' },
        }],
      }));
    writeFileSync(join(wd, 'transitions.chain.json'), JSON.stringify({
      'phases/phase-setup.md': { passed: 'phases/phase-final.md' },
    }));

    const r = spawnSync('node', [CLI, '--workflows-dir', wd, '--gate-defs-dir', gd],
      { encoding: 'utf-8', timeout: 10000 });

    const out = JSON.parse(r.stdout);
    assert.strictEqual(r.status, 0, `Expected exit 0, got ${r.status}`);
    assert.strictEqual(out.passed, true);
    assert.deepStrictEqual(out.issues, []);
  });

  it('exits 1 when consistency issues found (missing node)', () => {
    const { wd, gd } = scaffold('missing-node');

    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({
      phases: [{ key: 'ghost', node: 'phases/phase-ghost.md', gate: 'ghost-gate' }],
      shared: [],
    }));

    const r = spawnSync('node', [CLI, '--workflows-dir', wd, '--gate-defs-dir', gd],
      { encoding: 'utf-8', timeout: 10000 });

    const out = JSON.parse(r.stdout);
    assert.strictEqual(r.status, 1);
    assert.strictEqual(out.passed, false);
    assert.ok(out.issues.length > 0);
  });

  it('reports gate_binding_mismatch', () => {
    const { wd, nd, gd } = scaffold('gate-mismatch');

    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({
      phases: [{ key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' }],
      shared: [],
    }));
    writeFileSync(join(nd, 'phases/phase-setup.md'),
      '---\n{"node_type":"phase","id":"phase-setup","phase":"setup","gate":"WRONG_GATE","stop":"no","requires":[],"suggested_context":[]}\n---\n# Setup\n');

    const r = spawnSync('node', [CLI, '--workflows-dir', wd, '--gate-defs-dir', gd],
      { encoding: 'utf-8', timeout: 10000 });

    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.passed, false);
    assert.ok(out.issues.some(i => i.class === 'gate_binding_mismatch'),
      `Expected gate_binding_mismatch, got: ${out.issues.map(i => i.class).join(', ')}`);
  });

  it('reports transition table consistency issues', () => {
    const { wd, nd, gd } = scaffold('transition-issues');

    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({
      phases: [{ key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' }],
      shared: [],
    }));
    writeFileSync(join(nd, 'phases/phase-setup.md'),
      '---\n{"node_type":"phase","id":"phase-setup","phase":"setup","gate":"setup-ready","stop":"no","requires":[],"suggested_context":[]}\n---\n# Setup\n');
    writeFileSync(join(gd, 'gate-setup-ready.definition.json'),
      JSON.stringify({ gate: 'setup-ready', rules: [] }));
    writeFileSync(join(wd, 'transitions.chain.json'), JSON.stringify({
      'phases/phase-setup.md': { passed: 'phases/phase-ghost.md' },
      'phases/phase-unknown.md': { passed: 'phases/phase-setup.md' },
    }));

    const r = spawnSync('node', [CLI, '--workflows-dir', wd, '--gate-defs-dir', gd],
      { encoding: 'utf-8', timeout: 10000 });

    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.passed, false);
    const classes = out.issues.map(i => i.class);
    assert.ok(classes.some(c => c.startsWith('transition_')),
      `Expected transition_* issue, got: ${classes.join(', ')}`);
  });

  it('reports unresolvable dependency refs', () => {
    const { wd, nd, gd } = scaffold('unresolvable-dep');

    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({
      phases: [{ key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' }],
      shared: [],
    }));
    writeFileSync(join(nd, 'phases/phase-setup.md'),
      '---\n{"node_type":"phase","id":"phase-setup","phase":"setup","gate":"setup-ready","stop":"no","requires":["nonexistent-dep"],"suggested_context":[]}\n---\n# Setup\n');
    writeFileSync(join(gd, 'gate-setup-ready.definition.json'),
      JSON.stringify({ gate: 'setup-ready', rules: [] }));

    const r = spawnSync('node', [CLI, '--workflows-dir', wd, '--gate-defs-dir', gd],
      { encoding: 'utf-8', timeout: 10000 });

    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.passed, false);
    assert.ok(out.issues.some(i => i.class === 'unresolvable_dependency'),
      `Expected unresolvable_dependency, got: ${out.issues.map(i => i.class).join(', ')}`);
  });
});
