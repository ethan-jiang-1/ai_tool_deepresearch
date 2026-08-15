// @impl HIU-003, CDP-001, CDP-002, CDP-003, CDP-004, CDP-006, CDG-002, CDG-004

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function read(relativePath) {
  return readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8');
}

const profile = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-profile.md');
const hitl2Brief = read('DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl2.md');
const hitl2 = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl2.md');
const readiness = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-readiness.md');
const final = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md');
const operation = read('DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs');

const VIEWS = [
  'profile_default',
  'executive_brief',
  'evidence_map',
  'claim_judgment',
  'technical_deep_dive',
  'custom',
];

describe('Final report composition Markdown contract', () => {
  it('keeps one profile owner and a complete HITL2 recommendation before delivery', () => {
    for (const source of [profile, hitl2]) {
      assert.match(source, /final_report_view/);
      assert.match(source, /composition_handoff/);
    }
    assert.match(hitl2Brief, /交付建议（尚未接受）/);
    assert.match(hitl2Brief, /读者与熟悉程度/);
    assert.match(hitl2Brief, /用途与首要焦点/);
    assert.match(hitl2, /最多包含三个当前独立的问题/);
    assert.match(hitl2, /不得追加 blanket second confirmation/);
    assert.match(hitl2, /pending_user/);
    assert.match(hitl2, /MUST NOT 让 pending 或 custom-incomplete candidate 跨到 Readiness/);
    assert.match(hitl2, /request_view_revision.*repair.*rerun.*stop_blocked/s);
  });

  it('keeps composition comparison, restore, and legacy migration at the existing Readiness checkpoint', () => {
    for (const view of VIEWS) assert.match(readiness, new RegExp(`\`${view}\``));
    assert.match(readiness, /rb_profile\.yaml#\/human_decision_checkpoints\/hitl2\/final_report_view/);
    assert.match(readiness, /rb_profile\.yaml#\/human_decision_checkpoints\/hitl2\/composition_handoff/);
    assert.match(readiness, /operate-composition-handoff\.mjs restore --bundle <bundle> --current-node phases\/phase-readiness\.md/);
    assert.match(readiness, /operate-composition-handoff\.mjs migrate-legacy --bundle <bundle> --current-node phases\/phase-readiness\.md --input <accepted-projection\.yaml>/);
    assert.match(readiness, /重跑\*\*同一个\*\* Readiness Gate/);
    assert.match(readiness, /Readiness 不提出 composition 问题、不自动 mutation/);
    assert.doesNotMatch(readiness, /composition quality score|report-quality Gate/i);
    assert.match(operation, /migrate-legacy/);
  });

  it('makes Final execute one five-step, view-aware pass without weakening evidence obligations', () => {
    const steps = ['**Reground**', '**Answer Inventory**', '**Coverage and materiality**', '**Spine and placement**', '**Draft and self-check**'];
    let cursor = -1;
    for (const step of steps) {
      const index = final.indexOf(step);
      assert.ok(index > cursor, `${step} is present in order`);
      cursor = index;
    }
    for (const view of VIEWS) assert.match(final, new RegExp(`\| \`${view}\` \|`));
    for (const marker of ['contradiction', 'limitation', 'confidence boundary', 'must-answer', 'Submitted Backing', 'Evidence Map', 'persist-final-report']) {
      assert.match(final, new RegExp(marker));
    }
    assert.match(final, /receipt.*fallback data owner/);
    assert.match(final, /MUST NOT 为不同 view 创建 Sub-agent、第二份 primary report、Final question、Final Gate 或 outgoing transition/);
    assert.match(final, /gate: null/);
    assert.doesNotMatch(final, /^next:/m);
  });
});
