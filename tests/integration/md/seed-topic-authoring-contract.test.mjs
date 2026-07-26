// @impl STM-001, RRM-003
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = (path) => readFileSync(path, 'utf8');
const seedAuthoring = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-seed-topic-authoring.md');
const returnMapAuthoring = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-return-map-authoring.md');
const workUnitEnvelope = read('DPT_FRAMEWORK/engine/work-unit-envelope.mjs');
const phase = (name) => read(`DPT_FRAMEWORK/workflows/nodes/phases/${name}.md`);
const returnFields = ['evidence_meaning', 'relationship', 'refs', 'status', 'next_hop'];

function requires(node, key) {
  assert.match(node, new RegExp(`requires:[\\s\\S]*- ${key}`));
}

describe('shared seed-topic authoring contracts', () => {
  it('loads each focused shared contract only at its actual phase decision points', () => {
    requires(phase('phase-seed-topics'), 'shared/shared-seed-topic-authoring');
    requires(phase('phase-rerun'), 'shared/shared-seed-topic-authoring');
    for (const name of ['phase-wave0', 'phase-wave1', 'phase-wave2']) {
      requires(phase(name), 'shared/shared-return-map-authoring');
      assert.doesNotMatch(phase(name), /shared\/shared-seed-topic-authoring/);
    }
    requires(phase('phase-seed-topics'), 'shared/shared-return-map-authoring');
  });

  it('keeps one complete return-map definition while allowing concise self-contained cues', () => {
    for (const field of returnFields) assert.match(returnMapAuthoring, new RegExp(`\\b${field}\\b`));
    assert.match(returnMapAuthoring, /One-time tokens are expected/);
    assert.match(returnMapAuthoring, /Evidence-bearing entries lead with a concrete existing/);
    const completeExample = /- evidence_meaning:[\s\S]*?relationship:[\s\S]*?refs:[\s\S]*?status:[\s\S]*?next_hop:/g;
    const surfaces = [
      ['shared', returnMapAuthoring],
      ['seed', phase('phase-seed-topics')],
      ['wave0', phase('phase-wave0')],
      ['wave1', phase('phase-wave1')],
      ['wave2', phase('phase-wave2')],
      ['schemas', read('DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md')],
    ];
    const counts = Object.fromEntries(surfaces.map(([name, content]) => [name, [...content.matchAll(completeExample)].length]));
    assert.equal(counts.shared, 1, JSON.stringify(counts));
    for (const [name, count] of Object.entries(counts)) if (name !== 'shared') assert.equal(count, 0, `${name}: ${JSON.stringify(counts)}`);
  });

  it('keeps role guidance static and validates the shipped workflow package', () => {
    for (const name of ['subagent-dpt-source-intake', 'subagent-dpt-evidence-extractor', 'subagent-dpt-topic-scout']) {
      const role = phase(name);
      assert.doesNotMatch(role, /requires:[\s\S]*shared\/shared-return-map-authoring/);
      assert.match(role, /return-map|return map|evidence_meaning/i);
    }
    const result = spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/validate-workflow-package.mjs'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });

  it('keeps generated task and spawn cues self-contained but below the shared contract', () => {
    assert.match(workUnitEnvelope, /Completion Contract/);
    assert.match(workUnitEnvelope, /Result schema requires/);
    assert.match(workUnitEnvelope, /manifest, beacon, result schema, receipt, validators, and submit remain authoritative/);
  });

  it('keeps one Seed Topics writer loop and removes duplicate canonical authoring instructions', () => {
    const seedPhase = phase('phase-seed-topics');
    const playbook = read('DPT_FRAMEWORK/command_playbook/operate-topic-state.md');
    for (const surface of [seedAuthoring, seedPhase, playbook]) {
      assert.match(surface, /enrich_seed/);
      assert.match(surface, /operate-topic-state(?:\.mjs)? apply/);
    }
    for (const surface of [seedAuthoring, seedPhase]) {
      assert.doesNotMatch(surface, /## must_answer\n1\. <investigatable question>/);
      assert.doesNotMatch(surface, /## 研究边界与不深挖范围/);
      assert.doesNotMatch(surface, /## 证据锚点与优先来源/);
    }
    assert.match(seedAuthoring, /frontmatter_invalid/);
    assert.match(seedAuthoring, /legacy body copies remain readable/i);
  });
});
