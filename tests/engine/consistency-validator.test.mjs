// consistency-validator.test.mjs — Workflow package consistency validator tests
// @impl WNC-007
// Canonical test location: tests/engine/consistency-validator.test.mjs

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TMP = join(import.meta.dirname, '.test-consistency-tmp');

// @impl WNC-007
const { validateWorkflowPackage } = await import(
  '../../DPT_FRAMEWORK/engine/consistency-validator.mjs'
);

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Create a temporary directory structure for a test fixture. */
function scaffold(opts = {}) {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

  const wd = join(TMP, 'workflows');
  const nd = join(wd, 'nodes');
  const gd = join(TMP, 'gate_defs');

  mkdirSync(wd, { recursive: true });
  mkdirSync(join(nd, 'phases'), { recursive: true });
  mkdirSync(join(nd, 'shared'), { recursive: true });
  mkdirSync(gd, { recursive: true });

  // manifest
  const manifest = opts.manifest || {
    phases: [
      { key: 'instantiation', node: 'phases/phase-instantiation.md', gate: 'instantiation-complete' },
      { key: 'hitl1', node: 'phases/phase-hitl1.md', gate: 'hitl1-recorded' },
      { key: 'final', node: 'phases/phase-final.md', gate: null },
    ],
    shared: ['shared/shared-profile.md'],
  };
  writeFileSync(join(wd, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // node files (opts.nodes maps nodeRef → frontmatter object)
  const defaultFM = (gate) => ({ node_type: 'phase', id: 'test', phase: 'test', gate, stop: 'no', requires: [], suggested_context: [] });
  const nodes = opts.nodes || {};
  for (const [ref, fm] of Object.entries(nodes)) {
    writeFileSync(join(nd, ref), `---\n${JSON.stringify(fm || defaultFM(null))}\n---\n# Test Node\n`);
  }

  // Gate definitions (opts.gateDefs maps gateKey → definition object)
  const gateDefs = opts.gateDefs || {};
  for (const [gateKey, def] of Object.entries(gateDefs)) {
    writeFileSync(join(gd, `gate-${gateKey}.definition.json`), JSON.stringify(def, null, 2));
  }

  // Transition tables
  if (opts.chain !== undefined) {
    writeFileSync(join(wd, 'transitions.chain.json'), JSON.stringify(opts.chain));
  }

  return { wd, nd, gd };
}

function cleanup() {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
}

after(cleanup);

// ─── Happy path ────────────────────────────────────────────────────────────

describe('ValidateWorkflowPackage — happy path', () => {
  it('passes when all cross-references are consistent', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' },
          { key: 'final', node: 'phases/phase-final.md', gate: null },
        ],
        shared: ['shared/shared-profile.md'],
      },
      nodes: {
        'phases/phase-setup.md': { node_type: 'phase', id: 'phase-setup', phase: 'setup', gate: 'setup-ready', stop: 'no', requires: ['shared-profile'], suggested_context: [] },
        'phases/phase-final.md': { node_type: 'phase', id: 'phase-final', phase: 'final', gate: null, stop: 'no', requires: [], suggested_context: [] },
        'shared/shared-profile.md': { node_type: 'shared', id: 'shared-profile', requires: [] },
      },
      gateDefs: {
        'setup-ready': { gate: 'setup-ready', rules: [] },
      },
      chain: {
        'phases/phase-setup.md': { passed: 'phases/phase-final.md' },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, true, `Expected passed but got issues: ${JSON.stringify(report.issues)}`);
    assert.deepStrictEqual(report.issues, []);
    cleanup();
  });
});

// ─── 1. Manifest → missing node files ──────────────────────────────────────

describe('ValidateWorkflowPackage — manifest_missing_node', () => {
  it('reports when manifest phase references a missing node file', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: [],
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'manifest_missing_node');
    assert.ok(issue, 'Expected manifest_missing_node issue');
    assert.ok(issue.detail.includes('phases/phase-wave0.md'));
    cleanup();
  });

  it('reports when manifest shared entry references a missing file', () => {
    scaffold({
      manifest: {
        phases: [],
        shared: ['shared/shared-profile.md', 'shared/shared-gate-rules.md'],
      },
      nodes: {
        'shared/shared-profile.md': {},
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'manifest_missing_shared');
    assert.ok(issue, 'Expected manifest_missing_shared issue');
    assert.ok(issue.detail.includes('shared-gate-rules.md'));
    cleanup();
  });
});

// ─── 2. Gate binding mismatch ──────────────────────────────────────────────

describe('ValidateWorkflowPackage — gate_binding_mismatch', () => {
  it('reports when node frontmatter gate disagrees with manifest', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'WRONG_GATE_NAME', stop: 'no', requires: [], suggested_context: [] },
      },
      gateDefs: {
        'wave0-complete': { gate: 'wave0-complete', rules: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'gate_binding_mismatch');
    assert.ok(issue, 'Expected gate_binding_mismatch issue');
    assert.ok(issue.detail.includes('WRONG_GATE_NAME'));
    assert.ok(issue.detail.includes('wave0-complete'));
    cleanup();
  });

  it('reports when gate definition JSON is missing for a referenced gate', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', requires: [], suggested_context: [] },
      },
      // No gate definition file
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'gate_definition_missing');
    assert.ok(issue, 'Expected gate_definition_missing issue');
    assert.ok(issue.detail.includes('wave0-complete'));
    cleanup();
  });

  it('does NOT report gate_definition_missing for final phase (gate=null)', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'final', node: 'phases/phase-final.md', gate: null },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-final.md': { node_type: 'phase', id: 'phase-final', phase: 'final', gate: null, stop: 'no', requires: [], suggested_context: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, true);
    cleanup();
  });
});

// ─── 3. Gate definition internal consistency ───────────────────────────────

describe('ValidateWorkflowPackage — gate definition checks', () => {
  it('reports when gate definition internal gate field disagrees', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', requires: [], suggested_context: [] },
      },
      gateDefs: {
        'wave0-complete': { gate: 'instantiation-complete', rules: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'gate_definition_name_mismatch');
    assert.ok(issue, 'Expected gate_definition_name_mismatch issue');
    assert.ok(issue.detail.includes('instantiation-complete'));
    cleanup();
  });

  it('reports when gate definition JSON is unreadable', () => {
    const gd = join(TMP, 'gate_defs');
    mkdirSync(gd, { recursive: true });
    writeFileSync(join(gd, 'gate-wave0-complete.definition.json'), '{invalid json!!!}');

    scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', requires: [], suggested_context: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'gate_definition_unreadable');
    assert.ok(issue, 'Expected gate_definition_unreadable issue');
    cleanup();
  });
});

// ─── 4. Transition table references ────────────────────────────────────────

describe('ValidateWorkflowPackage — transition table checks', () => {
  it('reports when chain references a missing current node', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-setup.md': { node_type: 'phase', id: 'phase-setup', phase: 'setup', gate: 'setup-ready', stop: 'no', requires: [], suggested_context: [] },
      },
      chain: {
        'phases/phase-ghost.md': { passed: 'phases/phase-setup.md' },
        'phases/phase-setup.md': { passed: 'phases/phase-ghost.md' },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const curIssue = report.issues.find(i => i.class === 'transition_missing_current_node');
    assert.ok(curIssue, 'Expected transition_missing_current_node issue');
    assert.ok(curIssue.detail.includes('phase-ghost.md'));

    const nextIssue = report.issues.find(i => i.class === 'transition_missing_next_node');
    assert.ok(nextIssue, 'Expected transition_missing_next_node issue');
    assert.ok(nextIssue.detail.includes('phase-ghost.md'));
    cleanup();
  });

  it('reports when manifest phase has no entry in chain table', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' },
          { key: 'final', node: 'phases/phase-final.md', gate: null },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-setup.md': { node_type: 'phase', id: 'phase-setup', phase: 'setup', gate: 'setup-ready', stop: 'no', requires: [], suggested_context: [] },
        'phases/phase-final.md': { node_type: 'phase', id: 'phase-final', phase: 'final', gate: null, stop: 'no', requires: [], suggested_context: [] },
      },
      chain: {
        // intentionally missing phase-setup entry
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'transition_missing_entry');
    assert.ok(issue, 'Expected transition_missing_entry issue');
    assert.ok(issue.detail.includes('setup'));
    // final phase (gate=null) should NOT trigger missing_entry
    const finalIssue = report.issues.find(i => i.class === 'transition_missing_entry' && i.detail.includes('final'));
    assert.strictEqual(finalIssue, undefined, 'Final phase with gate=null should not trigger transition_missing_entry');
    cleanup();
  });

  it('reports when chain JSON is unreadable', () => {
    const wd = join(TMP, 'workflows');
    mkdirSync(wd, { recursive: true });
    writeFileSync(join(wd, 'manifest.json'), JSON.stringify({ phases: [], shared: [] }));
    writeFileSync(join(wd, 'transitions.chain.json'), 'not valid json {{{');

    const report = validateWorkflowPackage({
      workflowsDir: wd,
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'transition_chain_invalid');
    assert.ok(issue, 'Expected transition_chain_invalid issue');
    cleanup();
  });

  it('skips chain checks when table does not exist', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'final', node: 'phases/phase-final.md', gate: null },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-final.md': { node_type: 'phase', id: 'phase-final', phase: 'final', gate: null, stop: 'no', requires: [], suggested_context: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    // Should pass — missing transition tables are not an error, they're just skipped
    assert.strictEqual(report.passed, true);
    cleanup();
  });
});

// ─── 5. Dependency refs ────────────────────────────────────────────────────

describe('ValidateWorkflowPackage — dependency resolution', () => {
  it('reports when requires ref cannot be resolved', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', requires: ['shared-profile'], suggested_context: [] },
      },
      gateDefs: {
        'wave0-complete': { gate: 'wave0-complete', rules: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'unresolvable_dependency');
    assert.ok(issue, 'Expected unresolvable_dependency issue');
    assert.ok(issue.detail.includes('shared-profile'));
    cleanup();
  });

  it('reports unresolved dependency from YAML block list frontmatter', () => {
    const { nd } = scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: [],
      },
      gateDefs: {
        'wave0-complete': { gate: 'wave0-complete', rules: [] },
      },
    });

    writeFileSync(join(nd, 'phases/phase-wave0.md'), `---
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0-complete
stop: "no"
requires:
  - missing-dep
suggested_context: []
---
# Wave0
`);

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'unresolvable_dependency');
    assert.ok(issue, 'Expected unresolvable_dependency issue');
    assert.ok(issue.detail.includes('missing-dep'));
    cleanup();
  });

  it('resolves dependency in shared/ directory', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: ['shared/shared-profile.md'],
      },
      nodes: {
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', requires: ['shared-profile'], suggested_context: [] },
        'shared/shared-profile.md': { node_type: 'shared', id: 'shared-profile', requires: [] },
      },
      gateDefs: {
        'wave0-complete': { gate: 'wave0-complete', rules: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, true, `Expected passed but got: ${JSON.stringify(report.issues)}`);
    cleanup();
  });

  it('resolves dependency with .md extension in requires field', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: ['shared/shared-profile.md'],
      },
      nodes: {
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', requires: ['shared-profile.md'], suggested_context: [] },
        'shared/shared-profile.md': { node_type: 'shared', id: 'shared-profile', requires: [] },
      },
      gateDefs: {
        'wave0-complete': { gate: 'wave0-complete', rules: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, true, `Expected passed but got: ${JSON.stringify(report.issues)}`);
    cleanup();
  });

  it('reports when suggested_context ref cannot be resolved', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', requires: [], suggested_context: ['reference-doc'] },
      },
      gateDefs: {
        'wave0-complete': { gate: 'wave0-complete', rules: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'unresolvable_context');
    assert.ok(issue, 'Expected unresolvable_context issue');
    assert.ok(issue.detail.includes('reference-doc'));
    cleanup();
  });

  it('reports unresolved suggested_context from YAML block list frontmatter', () => {
    const { nd } = scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
        ],
        shared: [],
      },
      gateDefs: {
        'wave0-complete': { gate: 'wave0-complete', rules: [] },
      },
    });

    writeFileSync(join(nd, 'phases/phase-wave0.md'), `---
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0-complete
stop: "no"
requires: []
suggested_context:
  - missing-context
---
# Wave0
`);

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'unresolvable_context');
    assert.ok(issue, 'Expected unresolvable_context issue');
    assert.ok(issue.detail.includes('missing-context'));
    cleanup();
  });

  it('does not report dependency issues when node has no requires/suggested_context', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-setup.md': { node_type: 'phase', id: 'phase-setup', phase: 'setup', gate: 'setup-ready', stop: 'no' },
      },
      gateDefs: {
        'setup-ready': { gate: 'setup-ready', rules: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    // Should pass — no requires/suggested_context keys
    assert.strictEqual(report.passed, true, `Expected passed but got: ${JSON.stringify(report.issues)}`);
    cleanup();
  });
});

// ─── Manifest unreadable ───────────────────────────────────────────────────

describe('ValidateWorkflowPackage — manifest_unreadable', () => {
  it('reports when manifest.json does not exist', () => {
    const wd = join(TMP, 'workflows');
    mkdirSync(wd, { recursive: true });
    // No manifest.json

    const report = validateWorkflowPackage({
      workflowsDir: wd,
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'manifest_unreadable');
    assert.ok(issue, 'Expected manifest_unreadable issue');
    cleanup();
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────────

describe('ValidateWorkflowPackage — edge cases', () => {
  it('handles empty phases and shared arrays', () => {
    scaffold({
      manifest: { phases: [], shared: [] },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, true);
    cleanup();
  });

  it('reports multiple issue classes in a single run', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'wave0', node: 'phases/phase-wave0.md', gate: 'wave0-complete' },
          { key: 'wave1', node: 'phases/phase-wave1.md', gate: 'wave1-complete' },
        ],
        shared: ['shared/shared-ghost.md'],
      },
      nodes: {
        // phase-wave0 exists but with wrong gate
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wrong-gate', stop: 'no', requires: ['missing-dep'], suggested_context: [] },
        // phase-wave1.md is missing entirely
      },
      // No gate definitions at all
      chain: {
        'phases/phase-wave0.md': { passed: 'phases/phase-wave1.md' },
        'phases/phase-unknown.md': { passed: 'phases/phase-wave0.md' },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);

    const classes = report.issues.map(i => i.class);
    assert.ok(classes.includes('manifest_missing_node'), 'Expected manifest_missing_node');
    assert.ok(classes.includes('manifest_missing_shared'), 'Expected manifest_missing_shared');
    assert.ok(classes.includes('gate_binding_mismatch'), 'Expected gate_binding_mismatch');
    assert.ok(classes.includes('gate_definition_missing'), 'Expected gate_definition_missing');
    assert.ok(classes.includes('transition_missing_current_node'), 'Expected transition_missing_current_node');
    assert.ok(classes.includes('transition_missing_next_node'), 'Expected transition_missing_next_node');
    assert.ok(classes.includes('unresolvable_dependency'), 'Expected unresolvable_dependency');
    cleanup();
  });
});
