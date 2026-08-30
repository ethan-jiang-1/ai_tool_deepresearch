// post-final-intent-intake-docs.test.mjs
// Static doc-lock coverage for the post-final dual-intent intake guidance:
// the COMMANDS.md intent routing aid and the playbook dig-list intake section.
// @impl ACS-006, POF-005

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf-8');
}

describe('post-final iteration intent routing aid (ACS-006)', () => {
  const commands = read('DEEP_RESEARCH_HARNESS/COMMANDS.md');

  it('exposes a navigation-only routing aid in the Post-Final Rerun Recovery section', () => {
    assert.ok(
      commands.includes('### Post-Final 迭代意图路由（navigation only）'),
      'COMMANDS.md must carry the post-final iteration intent routing aid heading',
    );
    assert.ok(
      commands.includes('本映射是导航文本'),
      'the routing aid must declare itself navigation-only',
    );
  });

  it('maps the evidence-expanding wording family to the post-final-recovery playbook', () => {
    const idx = commands.indexOf('**evidence-expanding 族**');
    assert.ok(idx > -1, 'the evidence-expanding wording family bullet must exist');
    const bullet = commands.slice(idx, idx + 600);
    assert.ok(bullet.includes('再挖一轮'), 'the family lists a dig-round wording example');
    assert.ok(
      bullet.includes('command_playbook/post-final-recovery.md'),
      'the family routes to the post-final-recovery playbook',
    );
  });

  it('maps the presentation wording family to in-place Final refinement', () => {
    const idx = commands.indexOf('**presentation 族**');
    assert.ok(idx > -1, 'the presentation wording family bullet must exist');
    const bullet = commands.slice(idx, idx + 600);
    assert.ok(bullet.includes('整理'), 'the family lists an organize/rewrite wording example');
    assert.ok(
      bullet.includes('workflows/nodes/phases/phase-final.md'),
      'the family routes to in-place Final refinement',
    );
    assert.ok(
      bullet.includes('command_playbook/persist-artifact.md'),
      'the family routes to the persist-artifact publication path',
    );
    assert.ok(
      bullet.includes('不建 ReopenResearchPass request'),
      'presentation wording must not create a ReopenResearchPass request',
    );
  });

  it('keeps mixed or ambiguous wording on the existing classification boundary', () => {
    const idx = commands.indexOf('### Post-Final 迭代意图路由（navigation only）');
    const section = commands.slice(idx, commands.indexOf('## Artifact Persistence', idx));
    assert.ok(
      section.includes('先问最小澄清') && section.includes('不做自动选路'),
      'mixed or ambiguous wording must go to the smallest-clarification boundary without automatic routing',
    );
  });
});

describe('post-final recovery dig-list intake section (POF-005)', () => {
  const playbook = read('DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md');
  const spec = read('openspec/specs/research/post-final-recovery/spec.md');

  it('carries the Intake From A Dig List section before Retain Request', () => {
    const intakeIdx = playbook.indexOf('## 1.5 Intake From A Dig List');
    const retainIdx = playbook.indexOf('## 2. Retain Request');
    assert.ok(intakeIdx > -1, 'the intake section must exist');
    assert.ok(
      retainIdx > intakeIdx,
      'the intake section must precede the Retain Request section',
    );
  });

  it('points at the spec owner while keeping the operating sequence', () => {
    const idx = playbook.indexOf('## 1.5 Intake From A Dig List');
    const section = playbook.slice(idx, playbook.indexOf('## 2. Retain Request', idx));
    assert.ok(
      section.includes('openspec/specs/research/post-final-recovery/spec.md'),
      'the playbook must point at the normative owner spec',
    );
    assert.ok(section.includes('priority tiers'), 'the operating sequence keeps the tier-structured proposal');
    assert.ok(
      section.includes('`requested_scope`') && section.includes('`reason`'),
      'selected item identifiers land in the existing requested_scope/reason strings',
    );
    assert.ok(section.includes('let the user\ncorrect the proposal'), 'the user owns the scope/risk decision');
  });

  it('keeps the normative intake rules in the spec, not restated in the playbook', () => {
    assert.ok(
      spec.includes('Post-final rerun intake guidance structures scope formation from a diagnostics dig-list'),
      'the spec requirement must own the normative intake rules',
    );
    assert.ok(
      spec.includes('no new request field and no label parser') || spec.includes('add request schema fields, label parsing'),
      'the no-schema-field/no-label-parser rule must live in the spec',
    );
    assert.ok(
      spec.includes('evidence-nonexistent or no-reinvestment dead holes'),
      'declared dead holes stay excluded unless the user reopens them (spec)',
    );
    assert.ok(
      !playbook.includes('The list is not authority'),
      'the dig-list non-authority paragraph must live in the spec, not the playbook',
    );
  });

  it('keeps the ordinary request contract when no dig-list exists', () => {
    const idx = playbook.indexOf('## 1.5 Intake From A Dig List');
    const section = playbook.slice(idx, playbook.indexOf('## 2. Retain Request', idx));
    assert.ok(
      section.includes('skip this section when absent'),
      'the intake step is skipped when no next-dig-list exists',
    );
    assert.ok(
      spec.includes('ordinary non-empty reason and requested-scope contract SHALL govern unchanged'),
      'the ordinary request contract governs when no next-dig-list exists (spec)',
    );
  });
});
