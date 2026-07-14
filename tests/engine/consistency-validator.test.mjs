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

  const phaseBody = (title = 'Test Node') => [
    `# ${title}`,
    '',
    '## 0. Execution Brief',
    '',
    '- **Objective**: Test objective.',
    '- **Start here**: Test start.',
    '- **Path to pass**: Test path.',
    '- **Completion check**: Test completion.',
    '- **Failure posture**: Test failure posture.',
    '',
    '## 1. Stage Goal',
    '',
    'Test stage goal.',
    '',
    '## 2. Required Inputs',
    '',
    'Test inputs.',
    '',
    '## 3. Allowed Actions',
    '',
    'Test actions.',
    '',
    '## 4. Expected Artifacts',
    '',
    'Test artifacts.',
    '',
    '## 5. Gate Command',
    '',
    'Test gate command.',
    '',
    '## 6. On Gate Pass',
    '',
    'Test pass behavior.',
    '',
    '## 7. On Gate Fail',
    '',
    'Test fail behavior.',
    '',
    '## 8. Stop Behavior',
    '',
    'Test stop behavior.',
    '',
    '## 9. Anti-Cheating Rules',
    '',
    'Test rules.',
  ].join('\n');

  const roleSpecFixtures = {
    'phases/subagent-dpt-source-intake.md': {
      fm: {
        node_type: 'shared',
        id: 'subagent-dpt-source-intake',
        shared_scope: 'subagent-protocol',
        role: 'dpt-source-intake',
        authority: 'guidance-only',
        execution_contract: { surface: 'work-unit-subagent-role', search_policy: 'subagent_performs_search', loaded_by: 'phase-agent', delivered_via: 'work_unit_task_md', filesystem_write: 'required', required_write_tools: ['read_file', 'write_file', 'append_file', 'mkdir'] },
        requires: ['shared/shared-subagent-protocol', 'shared/shared-schemas'],
        suggested_context: [],
      },
      h1: '# Work-Unit Role: dpt-source-intake - Foundation Reference Intake',
      roleKey: 'dpt-source-intake',
    },
    'phases/subagent-dpt-evidence-extractor.md': {
      fm: {
        node_type: 'shared',
        id: 'subagent-dpt-evidence-extractor',
        shared_scope: 'subagent-protocol',
        role: 'dpt-evidence-extractor',
        authority: 'guidance-only',
        execution_contract: { surface: 'work-unit-subagent-role', search_policy: 'subagent_performs_search', loaded_by: 'phase-agent', delivered_via: 'work_unit_task_md', filesystem_write: 'required', required_write_tools: ['read_file', 'write_file', 'append_file', 'mkdir'] },
        requires: ['shared/shared-subagent-protocol', 'shared/shared-schemas'],
        suggested_context: [],
      },
      h1: '# Work-Unit Role: dpt-evidence-extractor - Topic-Specific Deepening',
      roleKey: 'dpt-evidence-extractor',
    },
    'phases/subagent-dpt-topic-scout.md': {
      fm: {
        node_type: 'shared',
        id: 'subagent-dpt-topic-scout',
        shared_scope: 'subagent-protocol',
        role: 'dpt-topic-scout',
        authority: 'guidance-only',
        execution_contract: { surface: 'work-unit-subagent-role', search_policy: 'subagent_performs_search', loaded_by: 'phase-agent', delivered_via: 'work_unit_task_md', filesystem_write: 'required', required_write_tools: ['read_file', 'write_file', 'append_file', 'mkdir'] },
        requires: ['shared/shared-subagent-protocol', 'shared/shared-schemas'],
        suggested_context: [],
      },
      h1: '# Work-Unit Role: dpt-topic-scout - Gap-Fill Search',
      roleKey: 'dpt-topic-scout',
    },
    'phases/subagent-dpt-claim-verifier.md': {
      fm: {
        node_type: 'shared',
        id: 'subagent-dpt-claim-verifier',
        shared_scope: 'subagent-protocol',
        role: 'dpt-claim-verifier',
        authority: 'guidance-only',
        execution_contract: { surface: 'work-unit-subagent-role', search_policy: 'subagent_performs_search', loaded_by: 'phase-agent', delivered_via: 'work_unit_task_md', filesystem_write: 'required', required_write_tools: ['read_file', 'write_file', 'append_file', 'mkdir'] },
        requires: ['shared/shared-subagent-protocol', 'shared/shared-schemas'],
        suggested_context: [],
      },
      h1: '# Work-Unit Role: dpt-claim-verifier - Critical Claim Verification',
      roleKey: 'dpt-claim-verifier',
    },
    'phases/subagent-dpt-source-diagnostic.md': {
      fm: {
        node_type: 'shared',
        id: 'subagent-dpt-source-diagnostic',
        shared_scope: 'subagent-protocol',
        role: 'dpt-source-diagnostic',
        authority: 'guidance-only',
        execution_contract: { surface: 'work-unit-subagent-role', search_policy: 'subagent_performs_search', loaded_by: 'phase-agent', delivered_via: 'work_unit_task_md', filesystem_write: 'required', required_write_tools: ['read_file', 'write_file', 'append_file', 'mkdir'] },
        requires: ['shared/shared-subagent-protocol', 'shared/shared-schemas'],
        suggested_context: [],
      },
      h1: '# Work-Unit Role: dpt-source-diagnostic - Source Quality Diagnostic',
      roleKey: 'dpt-source-diagnostic',
    },
  };

  const roleBody = ({ h1, roleKey }) => [
    h1,
    '',
    '## 0. Role Brief',
    '',
    `- **Role key**: \`${roleKey}\``,
    '- **Used by**: Test phase agent.',
    '- **Receives**: Work-unit task, beacon, result schema, and runtime receipt.',
    '- **Produces**: Test outputs.',
    '- **Write capability**: Requires filesystem read/write/append and directory creation under bundle_dir.',
    '- **Boundary**: Test role boundary.',
    '- **Handoff**: Test handoff.',
    '',
    '## Lifecycle Logging Mandate (always-loaded)',
    '',
    'Bind work_id, queue_item_id, kind, and receipt_nonce in lifecycle logs.',
    '',
    '## 1. Purpose',
    '',
    'Test purpose.',
    '',
    '## 2. Search Focus',
    '',
    'Test search focus.',
    '',
    '## 3. Artifacts',
    '',
    'Test artifacts.',
    '',
    '## 4. Execution Within Work Unit',
    '',
    'Test work-unit execution.',
    '',
    '## 5. Page Content Fetching',
    '',
    'Test fetching.',
    '',
    '## 6. Anti-Cheating Rules',
    '',
    'Test rules.',
    '',
    '## 7. Relationship to Phase Agent',
    '',
    'Test relationship.',
  ].join('\n');

  // node files (opts.nodes maps nodeRef → frontmatter object)
  const defaultFM = (gate) => ({ node_type: 'phase', id: 'test', phase: 'test', gate, stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: [], suggested_context: [] });
  const nodes = opts.nodes || {};
  for (const [ref, spec] of Object.entries(roleSpecFixtures)) {
    if (opts.includeDefaultRoleSpecs === false || nodes[ref]) continue;
    writeFileSync(join(nd, ref), `---\n${JSON.stringify(spec.fm)}\n---\n${roleBody(spec)}\n`);
  }

  for (const [ref, fm] of Object.entries(nodes)) {
    let fmObj = fm || defaultFM(null);
    // Auto-inject execution_contract if this is a lifecycle phase node
    // that doesn't already have one (gate is defined, or phase field present)
    if (!fmObj.execution_contract && fmObj.gate !== undefined) {
      fmObj = { ...fmObj, execution_contract: { surface: 'phase-agent', search_policy: 'no_search' } };
    }
    const body = ref.startsWith('phases/phase-')
      ? phaseBody(fmObj.id || 'Test Node')
      : '# Test Node\n';
    writeFileSync(join(nd, ref), `---\n${JSON.stringify(fmObj)}\n---\n${body}\n`);
  }

  // Gate definitions (opts.gateDefs maps gateKey → definition object)
  const gateDefs = opts.gateDefs || {};
  for (const [gateKey, def] of Object.entries(gateDefs)) {
    const rules = Array.isArray(def.rules) && def.rules.length > 0 ? def.rules : [{
      id: 'fixture_placeholder',
      check: 'placeholder',
      target: 'fixture-contract-boundary',
      failure_message: 'Test-only consistency fixture placeholder.',
      finding: { source: 'definition', blocking_basis: 'configuration_integrity' },
      repair: { kind: 'missing_contract', write_to: 'fixture-contract-boundary' },
    }];
    writeFileSync(join(gd, `gate-${gateKey}.definition.json`), JSON.stringify({
      description: 'Test-only consistency Gate definition.',
      ...def,
      rules,
    }, null, 2));
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
        'phases/phase-setup.md': { node_type: 'phase', id: 'phase-setup', phase: 'setup', gate: 'setup-ready', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: ['shared-profile'], suggested_context: [] },
        'phases/phase-final.md': { node_type: 'phase', id: 'phase-final', phase: 'final', gate: null, stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: [], suggested_context: [] },
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

  it('accepts capability_probe_only as the expected HITL1 search policy', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'hitl1', node: 'phases/phase-hitl1.md', gate: 'hitl1-recorded' },
          { key: 'final', node: 'phases/phase-final.md', gate: null },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-hitl1.md': { node_type: 'phase', id: 'phase-hitl1', phase: 'hitl1', gate: 'hitl1-recorded', stop: 'yes', execution_contract: { surface: 'phase-agent', search_policy: 'capability_probe_only' }, requires: [], suggested_context: [] },
        'phases/phase-final.md': { node_type: 'phase', id: 'phase-final', phase: 'final', gate: null, stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: [], suggested_context: [] },
      },
      gateDefs: {
        'hitl1-recorded': { gate: 'hitl1-recorded', rules: [] },
      },
      chain: {
        'phases/phase-hitl1.md': { passed: 'phases/phase-final.md' },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, true, JSON.stringify(report.issues));
    cleanup();
  });

  it('reports no_search as a HITL1 execution-contract mismatch', () => {
    scaffold({
      manifest: {
        phases: [
          { key: 'hitl1', node: 'phases/phase-hitl1.md', gate: 'hitl1-recorded' },
        ],
        shared: [],
      },
      nodes: {
        'phases/phase-hitl1.md': { node_type: 'phase', id: 'phase-hitl1', phase: 'hitl1', gate: 'hitl1-recorded', stop: 'yes', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: [], suggested_context: [] },
      },
      gateDefs: {
        'hitl1-recorded': { gate: 'hitl1-recorded', rules: [] },
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.ok(report.issues.some((issue) => issue.class === 'execution_contract_search_policy_mismatch' && issue.detail.includes('capability_probe_only')));
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
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'WRONG_GATE_NAME', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'work_unit_required', delegated_role_keys: ['dpt-source-intake'] }, requires: ['shared-subagent-protocol', 'shared-anti-cheating-rules'], suggested_context: [] },
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
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'work_unit_required', delegated_role_keys: ['dpt-source-intake'] }, requires: ['shared-subagent-protocol', 'shared-anti-cheating-rules'], suggested_context: [] },
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
        'phases/phase-final.md': { node_type: 'phase', id: 'phase-final', phase: 'final', gate: null, stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: [], suggested_context: [] },
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
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'work_unit_required', delegated_role_keys: ['dpt-source-intake'] }, requires: ['shared-subagent-protocol', 'shared-anti-cheating-rules'], suggested_context: [] },
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
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'work_unit_required', delegated_role_keys: ['dpt-source-intake'] }, requires: ['shared-subagent-protocol', 'shared-anti-cheating-rules'], suggested_context: [] },
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
        'phases/phase-setup.md': { node_type: 'phase', id: 'phase-setup', phase: 'setup', gate: 'setup-ready', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: [], suggested_context: [] },
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
        'phases/phase-setup.md': { node_type: 'phase', id: 'phase-setup', phase: 'setup', gate: 'setup-ready', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: [], suggested_context: [] },
        'phases/phase-final.md': { node_type: 'phase', id: 'phase-final', phase: 'final', gate: null, stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: [], suggested_context: [] },
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
        'phases/phase-final.md': { node_type: 'phase', id: 'phase-final', phase: 'final', gate: null, stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: [], suggested_context: [] },
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
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'work_unit_required', delegated_role_keys: ['dpt-source-intake'] }, requires: ['shared-profile', 'shared-subagent-protocol', 'shared-anti-cheating-rules'], suggested_context: [] },
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
          { key: 'test', node: 'phases/phase-test.md', gate: 'test-gate' },
        ],
        shared: ['shared/shared-profile.md'],
      },
      nodes: {
        'phases/phase-test.md': { node_type: 'phase', id: 'phase-test', phase: 'test', gate: 'test-gate', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: ['shared-profile'], suggested_context: [] },
        'shared/shared-profile.md': { node_type: 'shared', id: 'shared-profile', requires: [] },
      },
      gateDefs: {
        'test-gate': { gate: 'test-gate', rules: [] },
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
          { key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' },
        ],
        shared: ['shared/shared-profile.md'],
      },
      nodes: {
        'phases/phase-setup.md': { node_type: 'phase', id: 'phase-setup', phase: 'setup', gate: 'setup-ready', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: ['shared-profile.md'], suggested_context: [] },
        'shared/shared-profile.md': { node_type: 'shared', id: 'shared-profile', requires: [] },
      },
      gateDefs: {
        'setup-ready': { gate: 'setup-ready', rules: [] },
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
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wave0-complete', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: [], suggested_context: ['reference-doc'] },
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

// ─── 6. Self-documenting node contract ────────────────────────────────────

describe('ValidateWorkflowPackage — self-documenting lifecycle and role nodes', () => {
  it('reports when a manifest lifecycle phase lacks Execution Brief', () => {
    const { nd } = scaffold({
      manifest: {
        phases: [
          { key: 'setup', node: 'phases/phase-setup.md', gate: 'setup-ready' },
        ],
        shared: [],
      },
      gateDefs: {
        'setup-ready': { gate: 'setup-ready', rules: [] },
      },
    });

    writeFileSync(join(nd, 'phases/phase-setup.md'), `---
node_type: phase
id: phase-setup
phase: setup
gate: setup-ready
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: no_search
requires: []
suggested_context: []
---
# Phase: Setup

## 1. Stage Goal
`);

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'lifecycle_execution_brief_invalid');
    assert.ok(issue, 'Expected lifecycle_execution_brief_invalid issue');
    cleanup();
  });

  it('reports missing relay role spec instead of silently skipping it', () => {
    scaffold({
      manifest: { phases: [], shared: [] },
      includeDefaultRoleSpecs: false,
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'missing_role_spec');
    assert.ok(issue, 'Expected missing_role_spec issue');
    assert.ok(issue.detail.includes('subagent-dpt-source-intake.md'));
    cleanup();
  });

  it('reports when a role spec uses a lifecycle Phase H1', () => {
    const { nd } = scaffold({
      manifest: { phases: [], shared: [] },
    });

    writeFileSync(join(nd, 'phases/subagent-dpt-topic-scout.md'), `---
node_type: shared
id: subagent-dpt-topic-scout
shared_scope: subagent-protocol
role: dpt-topic-scout
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
suggested_context: []
---
# Phase: Wave2 Sub-Agent

## 0. Role Brief

- **Role key**: \`dpt-topic-scout\`
- **Used by**: Test.
- **Receives**: Test.
- **Produces**: Test.
- **Write capability**: Requires filesystem writes.
- **Boundary**: Test.
- **Handoff**: Test.

## 1. Purpose

Test.

## 2. Search Focus
## 3. Artifacts
## 4. Execution Within Retired Delegated Channel
## 5. Page Content Fetching
## 6. Anti-Cheating Rules
## 7. Relationship to Phase Agent
`);

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    assert.ok(report.issues.some(i => i.class === 'role_spec_h1_mismatch'), 'Expected role_spec_h1_mismatch issue');
    assert.ok(report.issues.some(i => i.class === 'role_spec_phase_h1'), 'Expected role_spec_phase_h1 issue');
    cleanup();
  });

  it('reports write-producing role specs without filesystem write capability', () => {
    const { nd } = scaffold({
      manifest: { phases: [], shared: [] },
    });

    writeFileSync(join(nd, 'phases/subagent-dpt-source-intake.md'), `---
node_type: shared
id: subagent-dpt-source-intake
shared_scope: subagent-protocol
role: dpt-source-intake
authority: guidance-only
execution_contract:
  surface: work-unit-subagent-role
  search_policy: subagent_performs_search
  loaded_by: phase-agent
  delivered_via: work_unit_task_md
requires:
  - shared/shared-subagent-protocol
  - shared/shared-schemas
suggested_context: []
---
# Work-Unit Role: dpt-source-intake - Foundation Reference Intake

## 0. Role Brief

- **Role key**: \`dpt-source-intake\`
- **Used by**: Test.
- **Receives**: Test.
- **Produces**: Test outputs.
- **Write capability**: This role claims a write-producing work unit but omits the machine-readable capability declaration.
- **Boundary**: Test.
- **Handoff**: Test.

## Lifecycle Logging Mandate (always-loaded)

Bind work_id, queue_item_id, kind, and receipt_nonce in lifecycle logs.

## 1. Purpose

Test.
`);

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'role_write_capability_missing');
    assert.ok(issue, 'Expected role_write_capability_missing issue');
    assert.ok(issue.detail.includes('result, receipt, outputs, and cache leaves'));
    cleanup();
  });

  it('reports when a relay role spec is listed in manifest.shared[]', () => {
    scaffold({
      manifest: {
        phases: [],
        shared: ['phases/subagent-dpt-topic-scout.md'],
      },
    });

    const report = validateWorkflowPackage({
      workflowsDir: join(TMP, 'workflows'),
      gateDefsDir: join(TMP, 'gate_defs'),
    });

    assert.strictEqual(report.passed, false);
    const issue = report.issues.find(i => i.class === 'role_spec_in_manifest_shared');
    assert.ok(issue, 'Expected role_spec_in_manifest_shared issue');
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
        'phases/phase-wave0.md': { node_type: 'phase', id: 'phase-wave0', phase: 'wave0', gate: 'wrong-gate', stop: 'no', execution_contract: { surface: 'phase-agent', search_policy: 'no_search' }, requires: ['missing-dep'], suggested_context: [] },
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
