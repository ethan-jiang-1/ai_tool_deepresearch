import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = join(import.meta.dirname, '../../..');

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf-8');
}

const FORBIDDEN_POSITIVE_REPAIR = [
  /bypass (?:the )?(?:gate|work-unit|submit)/i,
  /skip (?:the )?(?:gate|work-unit|submit|depth review|scan)/i,
  /force[- ]?advance/i,
  /hand[- ]?edit (?:rb_output_declarations\.jsonl|_work_units|depth-review\.yaml|finding-index\.yaml)/i,
];

const ALLOWED_NEGATIONS = [
  /do not/i,
  /don't/i,
  /must not/i,
  /shall not/i,
  /not /i,
  /禁止/,
  /不得/,
  /不要/,
  /不能/,
];

function contextFor(text, index, length) {
  return text.slice(Math.max(0, index - 90), Math.min(text.length, index + length + 90));
}

function positiveViolations(text) {
  const violations = [];
  for (const pattern of FORBIDDEN_POSITIVE_REPAIR) {
    const regex = new RegExp(pattern.source, pattern.flags.includes('i') ? 'gi' : 'g');
    for (const match of text.matchAll(regex)) {
      const context = contextFor(text, match.index ?? 0, match[0].length);
      if (!ALLOWED_NEGATIONS.some((allowed) => allowed.test(context))) {
        violations.push(`${match[0]} :: ${context}`);
      }
    }
  }
  return violations;
}

describe('Wave depth contract Markdown guidance', () => {
  it('Wave1 phase teaches depth review, source claims, and supplementary repair loop', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md');
    assert.match(text, /depth-review\.yaml/);
    assert.match(text, /source_claims\[\]/);
    assert.match(text, /accepted_source_urls\[\]/);
    assert.match(text, /new_source_floor/);
    assert.match(text, /reviewed_work_unit_refs\[\]/);
    assert.match(text, /derive|派生/i);
    assert.match(text, /not copy|不.*复制|不.*重抄/i);
    assert.match(text, /accept[\s\S]*supplement_required[\s\S]*blocked_contract/);
    assert.match(text, /supplementary[\s\S]*wave1_topic_deepening/);
    assert.match(text, /payload\.topic_slug/);
    assert.deepEqual(positiveViolations(text), []);
  });

  it('Wave2 phase teaches scan, triage, gap analysis, and pure synthesis eligibility', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md');
    assert.match(text, /scan matrix/i);
    assert.match(text, /triage/i);
    assert.match(text, /confidence/);
    assert.match(text, /gap analysis/i);
    assert.match(text, /finding-index\.yaml/);
    assert.match(text, /synthesis_eligibility/);
    assert.match(text, /gap_status/);
    assert.match(text, /wave2_targeted_evidence/);
    assert.match(text, /pure synthesis/i);
    assert.deepEqual(positiveViolations(text), []);
  });

  it('sub-agent guidance keeps bounded work-unit outputs as submitted authority', () => {
    const wave1 = read('DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-evidence-extractor.md');
    const wave2 = read('DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-topic-scout.md');
    assert.match(wave1, /source_claims\[\]/);
    assert.match(wave1, /accepted_source_urls\[\]/);
    assert.match(wave1, /cache_trail_refs/);
    assert.match(wave2, /gap_status/);
    assert.match(wave2, /wave2_targeted_evidence|targeted evidence/i);
    assert.deepEqual(positiveViolations(`${wave1}\n${wave2}`), []);
  });
});
