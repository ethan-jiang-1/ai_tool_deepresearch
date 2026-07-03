// self-documenting-workflow-nodes.test.mjs
// @impl WNC-007
//
// Verifies first-load orientation contracts for lifecycle phase nodes and
// relay role spec nodes.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows');
const NODES_DIR = path.join(WORKFLOWS_DIR, 'nodes');
const manifest = JSON.parse(readFileSync(path.join(WORKFLOWS_DIR, 'manifest.json'), 'utf-8'));

const executionBriefFields = ['Objective', 'Start here', 'Path to pass', 'Completion check', 'Failure posture'];
const roleBriefFields = ['Role key', 'Used by', 'Receives', 'Produces', 'Boundary', 'Handoff'];
const phaseSections = [
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

describe('Manifest lifecycle phase nodes — Execution Brief', () => {
  for (const phase of manifest.phases) {
    it(`${phase.node} has ordered Execution Brief before 9-section body`, () => {
      const md = readNode(phase.node);
      const h1 = md.search(/^# /m);
      const brief = md.indexOf('## 0. Execution Brief');
      const stage = md.indexOf('## 1. Stage Goal');

      assert.ok(h1 >= 0, 'has H1');
      assert.ok(brief > h1, 'Execution Brief follows H1');
      assert.ok(stage > brief, 'Stage Goal follows Execution Brief');
      orderedFieldCheck(md.slice(brief, stage), executionBriefFields);

      for (const section of phaseSections) {
        assert.ok(md.includes(section), `keeps ${section}`);
      }
    });
  }
});

describe('Relay role spec nodes — Role Brief and manifest boundary', () => {
  const roleSpecs = [
    {
      ref: 'phases/subagent-dpt-source-intake.md',
      roleKey: 'dpt-source-intake',
      h1: '# Relay Role: dpt-source-intake — Foundation Reference Intake',
    },
    {
      ref: 'phases/subagent-dpt-evidence-extractor.md',
      roleKey: 'dpt-evidence-extractor',
      h1: '# Relay Role: dpt-evidence-extractor — Topic-Specific Deepening',
    },
    {
      ref: 'phases/subagent-dpt-topic-scout.md',
      roleKey: 'dpt-topic-scout',
      h1: '# Relay Role: dpt-topic-scout — Gap-Fill Search',
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
      assert.equal(fm.execution_contract?.surface, 'relay-subagent-role');
      assert.equal(fm.execution_contract?.search_policy, 'subagent_performs_search');
      assert.equal(fm.execution_contract?.loaded_by, 'phase-agent');
      assert.equal(fm.execution_contract?.delivered_via, 'relay_task_md');
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
