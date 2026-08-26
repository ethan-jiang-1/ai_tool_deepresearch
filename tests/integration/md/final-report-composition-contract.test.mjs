// @impl HIU-003, CDP-001, CDP-002, CDP-003, CDP-004, CDP-006, CDP-008, CDG-002, CDG-004

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

  it('keeps one five-step pass and the established evidence obligations', () => {
    const steps = ['**Reground**', '**Answer Inventory**', '**Coverage and materiality**', '**Spine and placement**', '**Draft and self-check**'];
    let cursor = -1;
    for (const step of steps) {
      const index = final.indexOf(step);
      assert.ok(index > cursor, `${step} is present in order`);
      cursor = index;
    }
    for (const marker of ['contradiction', 'limitation', 'confidence boundar', 'must-answer', 'Evidence Map', 'publish-final-report']) {
      assert.match(final, new RegExp(marker));
    }
    assert.match(final, /Submitted\s+Backing/);
    assert.match(final, /receipt.*fallback data owner/);
    assert.match(final, /gate: null/);
    assert.doesNotMatch(final, /^next:/m);
  });

  it('keeps Final delivery and refinement on the current lineage without rewriting HITL2', () => {
    assert.match(final, /admitted Final entry -> advance-status --to readiness_passed/);
    assert.match(final, /current lineage has no bound report: publish immediately/);
    assert.match(final, /First Final entry with an admitted empty inventory publishes\s+`final\/final\.md`/);
    assert.match(final, /admitted post-C5 return with zero canonical append/);
    assert.match(final, /current lineage's accepted HITL2 handoff\/receipt, all earlier lineage\s+history/);
    assert.match(final, /Preserve them; do not rewrite\s+them/);
    assert.match(final, /publish exactly one immutable revision/);
    assert.match(final, /satisfied, finish the current interaction with no report,\s+state, profile, status, Gate, trace, counter, pointer, or event write/);
    assert.match(final, /new source, Topic, evidence, research conclusion,\s+or research-profile change/);
    assert.match(final, /Presentation feedback alone remains here/);
    assert.match(final, /Only evidence-expanding work uses\s+audited C5/);
    assert.match(final, /MUST NOT treat a previous lineage's report as delivery for a newer C5/);
    assert.match(final, /MUST NOT claim that Engine feedback proves report quality, semantic\s+improvement, feedback classification, or genuine user satisfaction/);
  });

  it('keeps the auxiliary archive naming, self-containment, history, and README index discipline', () => {
    assert.match(final, /one primary report plus one same-named\s+auxiliary detail archive/);
    assert.match(final, /`final\/final_v<N>\.md`.*`final\/final_v<N>\/`/s);
    assert.match(final, /prose cross-references to auxiliary detail target only its own directory/);
    assert.match(final, /are not Evidence Map backing/);
    assert.match(final, /Never create a version-decoupled archive\s+directory such as `chips\/` or `supplement\/`/);
    assert.match(final, /`final\/README\.md` as the single series index and naming authority/);
    assert.match(final, /update it through the non-primary\s+`persist-final-report` path/);
    assert.match(final, /own bounded Evidence Map and never become primary delivery/);
    assert.match(final, /remain byte-identical \(history\s+read-only\)/);
    assert.match(final, /MUST NOT create a version-decoupled auxiliary directory/);
  });
});
