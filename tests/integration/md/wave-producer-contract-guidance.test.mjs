// @impl REF-007, RWP-001, RWP-002

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const NODES = path.join(ROOT, 'DPT_FRAMEWORK/workflows/nodes');

function readNode(relativePath) {
  return readFileSync(path.join(NODES, relativePath), 'utf8');
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'node frontmatter is present');
  return parseYaml(match[1]);
}

describe('Wave producer contract guidance', () => {
  it('delivers the existing rich-reference template to the Wave0 source actor without moving output ownership to the Phase', () => {
    const phase = readNode('phases/phase-wave0.md');
    const sourceIntake = readNode('phases/subagent-dpt-source-intake.md');
    const phaseMetadata = frontmatter(phase);
    const roleMetadata = frontmatter(sourceIntake);

    assert.ok(phaseMetadata.requires.includes('shared/shared-reference-template'));
    assert.ok(roleMetadata.requires.includes('shared/shared-reference-template'));
    assert.match(sourceIntake, /reference\/00-shared-<slug>\.md/);
    assert.match(sourceIntake, /role\s+`?reference`?/);
    assert.match(sourceIntake, /source_url/);
    assert.doesNotMatch(phase, /Phase-owned shared-reference\/index closeout/i);
  });

  it('places Wave1 dry-submit and existing dispositions before formal submit', () => {
    const phase = readNode('phases/phase-wave1.md');
    const decision = phase.match(/### 3\.2\.1 Returned Work Decision\n([\s\S]*?)(?=\n### 3\.2\.2 |\n## 4\.)/);

    assert.ok(decision, 'Wave1 has a returned-work decision point');
    const text = decision[1];
    assert.match(text, /operate-work-unit\.mjs dry-submit/);
    assert.match(text, /repair_same_candidate/);
    assert.match(text, /return_to_actor/);
    assert.match(text, /fail_and_replace/);
    assert.match(text, /inspect_contract/);
    assert.match(text, /operate-work-unit\.mjs submit/);
    assert.ok(text.indexOf('dry-submit') < text.indexOf('operate-work-unit.mjs submit'));
    assert.match(text, /Do not hand-write result semantics, cache declarations, receipts, ledger rows, trace, or provenance/i);
  });

  it('puts one submitted-backed Phase closeout checklist before full-drain inspect', () => {
    const phase = readNode('phases/phase-wave1.md');
    const decision = phase.match(/### 3\.2\.1 Returned Work Decision\n([\s\S]*?)(?=\n### 3\.2\.2 |\n## 4\.)/);

    assert.ok(decision, 'Wave1 has a returned-work decision point');
    const text = decision[1];
    for (const required of [
      'successful formal submit',
      'reference/index materialization',
      'depth review',
      'seed return-map backfill',
      'full-drain Wave inspect',
    ]) assert.match(text, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    assert.match(text, /Sub-agent.*(?:not|shall not).*?(?:reference|depth|seed)/i);
  });
});
