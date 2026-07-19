// @impl VER-005
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const CANONICAL = ['unit', 'integration', 'deterministic_e2e', 'agent_flow_e2e'];
const POINTER_SURFACES = [
  'openspec/config.yaml',
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
  'tests/README.md',
  'tests/integration/README.md',
  'experiments_playbook/README.md',
  'guidelines/project-charter.md',
  'guidelines/command-experiments.md',
];

function read(path) { return readFileSync(path, 'utf8'); }

describe('verification routing knowledge surfaces', () => {
  it('high-frequency entry surfaces name canonical classes and point to verification-routing', () => {
    for (const path of POINTER_SURFACES) {
      const content = read(path);
      assert.match(content, /verification-routing/, `${path} must point to the accepted routing spec`);
      if (['openspec/config.yaml', 'AGENTS.md', 'CLAUDE.md', 'README.md'].includes(path)) {
        for (const testClass of CANONICAL) assert.match(content, new RegExp(`\\b${testClass}\\b`), `${path} missing ${testClass}`);
      }
    }
  });

  it('governance summaries use canonical identifiers rather than the retired method model', () => {
    const registry = read('openspec/governance/req-registry.yaml');
    const section = registry.match(/# verification-routing[\s\S]*?(?=\n# |$)/)?.[0] || '';
    assert.match(section, /four canonical test classes/);
    assert.match(section, /claim-to-test_class/);
    assert.doesNotMatch(section, /exactly three methods|all three methods|tests_e2e fourth layer|Verification method taxonomy/);
  });

  it('entry surfaces do not restore ordinal or regression-only peer taxonomies', () => {
    const content = ['openspec/config.yaml', 'AGENTS.md', 'CLAUDE.md', 'README.md', 'experiments_playbook/README.md']
      .map((path) => read(path)).join('\n');
    assert.doesNotMatch(content, /第一层|第二层|第三层|Real-environment E2E: deferred|tests\/.*regression \(unit \+ integration\)/i);
  });

  it('experiment entry surfaces use the same broad heavy-cost definition', () => {
    for (const path of ['experiments_playbook/README.md', 'experiments_playbook/PLAYBOOK_MANIFEST.md']) {
      const content = read(path);
      assert.match(content, /Heavy[^\n]*(real Agent|real Agent\/sub-agent)/i, `${path} must include real Agent cost`);
      assert.match(content, /Heavy[^\n]*(long chain|长链)/i, `${path} must include long-chain cost`);
    }
  });

  it('the guard remains a pointer check rather than a second route matrix', () => {
    const self = read('tests/integration/md/verification-routing-knowledge-surfaces.test.mjs');
    for (const forbidden of [
      ['subject', 'execution'].join('_'),
      ['verdict', 'authority'].join('_'),
      ['fixture', 'backed'].join('_'),
      ['selected', 'not', 'applicable'].join('_'),
    ]) {
      assert.equal(self.includes(forbidden), false, `guard must not copy route field ${forbidden}`);
    }
  });
});
