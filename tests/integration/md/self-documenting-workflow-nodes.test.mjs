// self-documenting-workflow-nodes.test.mjs
// @impl WNC-007
//
// Verifies first-load orientation contracts for lifecycle phase nodes and
// work-unit role spec nodes.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'workflows');
const NODES_DIR = path.join(WORKFLOWS_DIR, 'nodes');
const manifest = JSON.parse(readFileSync(path.join(WORKFLOWS_DIR, 'manifest.json'), 'utf-8'));

const roleBriefFields = ['Role key', 'Used by', 'Receives', 'Produces', 'Write capability', 'Boundary', 'Handoff'];
const defaultPhaseSections = [
  '## 1. Stage Goal',
  '## 2. Required Inputs',
  '## 3. Allowed Actions',
  '## 4. Expected Artifacts',
  '## 5. Gate Command',
  '## 6. On Gate Pass',
  '## 7. On Gate Fail',
  '## 8. Stop Behavior',
  '## 9. Anti-Cheating Rules',
];

function readNode(ref) {
  return readFileSync(path.join(NODES_DIR, ref), 'utf-8');
}

function parseFrontmatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'frontmatter exists');
  return parseYaml(match[1]);
}

function orderedFieldCheck(sectionText, fields) {
  let cursor = -1;
  for (const field of fields) {
    const idx = sectionText.indexOf(`**${field}**`);
    assert.ok(idx > cursor, `${field} appears in order`);
    cursor = idx;
  }
}

function orderedExecutionBriefCheck(sectionText) {
  let cursor = -1;
  const checks = [
    { name: 'Objective', pattern: /\*\*Objective\*\*/ },
    { name: 'Start here', pattern: /\*\*Start here\*\*/ },
    { name: 'path field', pattern: /\*\*[^*\n]*path[^*\n]*\*\*/i },
    { name: 'Completion check', pattern: /\*\*Completion check\*\*/ },
    { name: 'Failure posture', pattern: /\*\*Failure posture\*\*/ },
  ];
  for (const check of checks) {
    const match = sectionText.match(check.pattern);
    assert.ok(match && match.index > cursor, `${check.name} appears in order`);
    cursor = match.index;
  }
}

describe('Manifest lifecycle phase nodes — Execution Brief', () => {
  for (const phase of manifest.phases) {
    it(`${phase.node} has ordered Execution Brief before its required body`, () => {
      const md = readNode(phase.node);
      const h1 = md.search(/^# /m);
      const brief = md.indexOf('## 0. Execution Brief');
      const stage = md.indexOf('## 1. Stage Goal');

      assert.ok(h1 >= 0, 'has H1');
      assert.ok(brief > h1, 'Execution Brief follows H1');
      assert.ok(stage > brief, 'Stage Goal follows Execution Brief');
      orderedExecutionBriefCheck(md.slice(brief, stage));

      for (const section of defaultPhaseSections) {
        assert.ok(md.includes(section), `keeps ${section}`);
      }
    });
  }
});

describe('Final node delivery placement', () => {
  it('is terminal in lifecycle metadata while placing iterative delivery in the loaded Final node', () => {
    const md = readNode('phases/phase-final.md');
    const fm = parseFrontmatter(md);

    assert.equal(fm.gate, null);
    assert.equal(fm.stop, 'yes');
    assert.equal(Object.hasOwn(fm, 'next'), false);
    assert.match(md, /admitted empty inventory publishes\s+`final\/final\.md`/);
    assert.match(md, /admitted post-C5 return with zero canonical append/);
    assert.match(md, /satisfied turn writes nothing/);
    assert.match(md, /Presentation feedback alone remains here/);
    assert.match(md, /Only evidence-expanding work uses\s+audited C5/);
  });
});

describe('Work-unit role spec nodes — Role Brief and manifest boundary', () => {
  const roleSpecs = [
    {
      ref: 'phases/subagent-dpt-source-intake.md',
      roleKey: 'dpt-source-intake',
      h1: '# Work-Unit Role: dpt-source-intake - Foundation Reference Intake',
    },
    {
      ref: 'phases/subagent-dpt-evidence-extractor.md',
      roleKey: 'dpt-evidence-extractor',
      h1: '# Work-Unit Role: dpt-evidence-extractor - Topic-Specific Deepening',
    },
    {
      ref: 'phases/subagent-dpt-topic-scout.md',
      roleKey: 'dpt-topic-scout',
      h1: '# Work-Unit Role: dpt-topic-scout - Gap-Fill Search',
    },
    {
      ref: 'phases/subagent-dpt-claim-verifier.md',
      roleKey: 'dpt-claim-verifier',
      h1: '# Work-Unit Role: dpt-claim-verifier - Critical Claim Verification',
    },
    {
      ref: 'phases/subagent-dpt-source-diagnostic.md',
      roleKey: 'dpt-source-diagnostic',
      h1: '# Work-Unit Role: dpt-source-diagnostic - Source Quality Diagnostic',
    },
  ];

  for (const spec of roleSpecs) {
    it(`${spec.ref} has role-oriented identity and is not manifest-listed`, () => {
      const md = readNode(spec.ref);
      const fm = parseFrontmatter(md);

      assert.ok(!manifest.phases.some((phase) => phase.node === spec.ref), 'absent from manifest.phases[]');
      assert.ok(!manifest.shared.includes(spec.ref), 'absent from manifest.shared[]');
      assert.equal(md.match(/^# .+$/m)?.[0], spec.h1);
      assert.ok(!md.startsWith('# Phase:'), 'not a lifecycle phase H1');
      assert.equal(fm.id, path.basename(spec.ref, '.md'));
      assert.equal(fm.role, spec.roleKey);
      assert.equal(fm.execution_contract?.surface, 'work-unit-subagent-role');
      assert.equal(fm.execution_contract?.search_policy, 'subagent_performs_search');
      assert.equal(fm.execution_contract?.loaded_by, 'phase-agent');
      assert.equal(fm.execution_contract?.delivered_via, 'work_unit_task_md');
      assert.equal(fm.execution_contract?.filesystem_write, 'required');
      assert.deepEqual(fm.execution_contract?.required_write_tools, ['read_file', 'write_file', 'append_file', 'mkdir']);
      assert.equal('stop' in fm, false, 'real role specs do not add stop');
      assert.equal('phase' in fm, false, 'real role specs do not add phase');
      assert.equal('gate' in fm, false, 'real role specs do not add gate');

      const brief = md.indexOf('## 0. Role Brief');
      const purpose = md.indexOf('## 1. Purpose');
      assert.ok(brief > md.indexOf(spec.h1), 'Role Brief follows H1');
      assert.ok(purpose > brief, 'numbered Purpose follows Role Brief');
      orderedFieldCheck(md.slice(brief, purpose), roleBriefFields);
      assert.ok(md.slice(brief, purpose).includes(`**Role key**: \`${spec.roleKey}\``));
    });
  }
});
