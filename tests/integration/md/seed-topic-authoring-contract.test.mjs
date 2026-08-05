// @impl STM-001, RRM-003
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = (path) => readFileSync(path, 'utf8');
const seedTemplate = read('DEEP_RESEARCH_HARNESS/workflows/nodes/templates/seed-topic-template.md');
const workUnitEnvelope = read('DEEP_RESEARCH_HARNESS/engine/work-unit-envelope.mjs');
const phase = (name) => read(`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/${name}.md`);
const returnFields = ['evidence_meaning', 'relationship', 'refs', 'status', 'next_hop'];

function requires(node, key) {
  assert.match(node, new RegExp(`requires:[\\s\\S]*- ${key}`));
}

describe('Seed Topic template and command contracts', () => {
  it('loads the pure template at seed and Wave document decision points', () => {
    requires(phase('phase-seed-topics'), 'templates/seed-topic-template');
    for (const name of ['phase-wave0', 'phase-wave1', 'phase-wave2']) {
      requires(phase(name), 'templates/seed-topic-template');
    }
    assert.doesNotMatch(phase('phase-rerun'), /templates\/seed-topic-template/);
  });

  it('keeps one complete slot/card definition while allowing concise self-contained cues', () => {
    for (const field of returnFields) assert.match(seedTemplate, new RegExp(`\\b${field}\\b`));
    assert.match(seedTemplate, /回填卡（只读操作约束，不是 Projection Entry）/);
    assert.match(seedTemplate, /instantiable structure of one Seed Topic Document/i);
    assert.doesNotMatch(seedTemplate, /context:\s*wave_projection/);
    assert.doesNotMatch(seedTemplate, /## Projection Repair/);
    assert.doesNotMatch(seedTemplate, /## Rerun Direction Input/);
    const completeExample = /- \*\*evidence_meaning\*\*:[\s\S]*?\*\*relationship\*\*:[\s\S]*?\*\*refs\*\*:[\s\S]*?\*\*status\*\*:[\s\S]*?\*\*next_hop\*\*:/g;
    const surfaces = [
      ['template', seedTemplate],
      ['seed', phase('phase-seed-topics')],
      ['wave0', phase('phase-wave0')],
      ['wave1', phase('phase-wave1')],
      ['wave2', phase('phase-wave2')],
      ['schemas', read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-schemas.md')],
    ];
    const counts = Object.fromEntries(surfaces.map(([name, content]) => [name, [...content.matchAll(completeExample)].length]));
    assert.equal(counts.template, 1, JSON.stringify(counts));
    for (const [name, count] of Object.entries(counts)) if (name !== 'template') assert.equal(count, 0, `${name}: ${JSON.stringify(counts)}`);
  });

  it('keeps role guidance static and validates the shipped workflow package', () => {
    for (const name of ['subagent-dpt-source-intake', 'subagent-dpt-evidence-extractor', 'subagent-dpt-topic-scout']) {
      const role = phase(name);
      const frontmatter = role.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      assert.doesNotMatch(frontmatter, /templates\/seed-topic-template/);
      assert.match(role, /return-map|return map|evidence_meaning/i);
    }
    const result = spawnSync(process.execPath, ['DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });

  it('keeps generated task and spawn cues self-contained but below the shared contract', () => {
    assert.match(workUnitEnvelope, /Completion Contract/);
    assert.match(workUnitEnvelope, /Result schema requires/);
    assert.match(workUnitEnvelope, /manifest, beacon, result schema, receipt, validators, and submit remain authoritative/);
  });

  it('keeps document shape and packet mechanics in their separate homes', () => {
    const seedPhase = phase('phase-seed-topics');
    const playbook = read('DEEP_RESEARCH_HARNESS/command_playbook/operate-topic-state.md');
    for (const surface of [seedPhase, playbook]) {
      assert.match(surface, /enrich_seed/);
      assert.match(surface, /operate-topic-state(?:\.mjs)? apply/);
    }
    assert.match(seedTemplate, /existing complete enrichment object/);
    assert.match(seedTemplate, /command_playbook\/operate-topic-state\.md#Wave Projection Packet/);
    assert.match(playbook, /"context":\s*"wave_projection"/);
    assert.match(playbook, /## Projection Repair/);
    assert.match(playbook, /## Rerun Direction Input/);
    for (const surface of [seedTemplate, seedPhase]) {
      assert.doesNotMatch(surface, /## must_answer\n1\. <investigatable question>/);
      assert.doesNotMatch(surface, /## 研究边界与不深挖范围/);
      assert.doesNotMatch(surface, /## 证据锚点与优先来源/);
    }
    assert.match(seedPhase, /frontmatter_invalid/);
    assert.match(playbook, /legacy body copies are preserved/i);
  });
});
