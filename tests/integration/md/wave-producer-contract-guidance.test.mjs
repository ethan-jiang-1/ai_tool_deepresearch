// @impl DEW-025, REF-007, RWP-001, RWP-002

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const NODES = path.join(ROOT, 'DEEP_RESEARCH_HARNESS/workflows/nodes');
const FRAMEWORK = path.join(ROOT, 'DEEP_RESEARCH_HARNESS');

function readNode(relativePath) {
  return readFileSync(path.join(NODES, relativePath), 'utf8');
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'node frontmatter is present');
  return parseYaml(match[1]);
}

function wave0QueueCard(phase) {
  const match = phase.match(/Task card template:\n\n```json\n([\s\S]*?)\n```/);
  assert.ok(match, 'Wave0 queue card template is present');
  return JSON.parse(match[1]);
}

describe('Wave producer contract guidance', () => {
  it('delivers a source/cache-only Wave0 actor contract and Phase-owned submitted-backing closeout', () => {
    const phase = readNode('phases/phase-wave0.md');
    const sourceIntake = readNode('phases/subagent-dpt-source-intake.md');
    const template = readNode('shared/shared-reference-template.md');
    const topicState = readFileSync(path.join(FRAMEWORK, 'command_playbook/operate-topic-state.md'), 'utf8');
    const phaseMetadata = frontmatter(phase);
    const roleMetadata = frontmatter(sourceIntake);
    const card = wave0QueueCard(phase);

    assert.ok(phaseMetadata.requires.includes('shared/shared-reference-template'));
    assert.equal(roleMetadata.requires.includes('shared/shared-reference-template'), false);
    assert.deepEqual(card.writes_to, ['artifacts/wave0/{topic.slug}/source.yaml']);
    assert.match(card.action, /Return only the current task-contract output_files\[\] and cache_trails\[\]/);
    assert.match(card.action, /Do not write a reference\/00-shared-\*\.md file or declare a reference output/);
    assert.match(sourceIntake, /Do not load the shared reference template/);
    assert.match(sourceIntake, /only the Phase Agent may later\s+materialize a reader-facing consumer projection/);
    assert.doesNotMatch(sourceIntake, /The Sub-agent writes this direct `reference` output/);

    assert.match(phase, /### 3\.3 Submitted Reference Closeout/);
    assert.match(phase, /exact `<work_id>\/<ordinal>` source identity/);
    assert.match(phase, /operate-artifact-persistence\.mjs persist/);
    assert.match(phase, /sync-reference-index\.mjs/);
    assert.match(phase, /deferred_contribution/);
    assert.match(phase, /rerun the same Wave0 inspect/i);
    assert.match(template, /only the Phase Agent may materialize `00-shared-<slug>\.md`/);
    assert.match(topicState, /deferred_contribution/);
    assert.match(topicState, /selects one submitted contribution; it is not a\s+persisted source identity or aggregate coverage/);
    assert.match(topicState, /one update may contain multiple explicit entries/i);
    assert.match(topicState, /deferred form selects one\s+contribution per packet/i);
    assert.match(topicState, /multiple deferred contributions require sequential\s+applies/i);
    assert.match(topicState, /does not add an inspect between sequential\s+applies/i);
  });

  it('documents the all-or-nothing deferred-selector precondition and explicit-entry recovery', () => {
    const phase = readNode('phases/phase-wave0.md');
    const topicState = readFileSync(path.join(FRAMEWORK, 'command_playbook/operate-topic-state.md'), 'utf8');

    assert.match(topicState, /all-or-nothing with respect to disposition\s+compatibility/);
    assert.match(topicState, /projection_deferred_contribution_collision/);
    assert.match(topicState, /apply\s+explicit\s+`wave0_evidence` entries for each remaining\s+authoritative ordinal/);
    assert.match(topicState, /then rerun\s+the same inspect/);
    assert.match(phase, /all-or-nothing with respect to disposition\s+compatibility/);
    assert.match(phase, /apply\s+explicit\s+`wave0_evidence` entries for each remaining\s+authoritative ordinal/);
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
    // Hand-writing prohibition is single-sourced in the shared anti-cheating
    // file; the Wave1 node points to it instead of restating it.
    assert.match(text, /shared\/shared-anti-cheating-rules\.md|shared-anti-cheating-rules/i);
  });

  it('puts one submitted-backed Phase closeout checklist before full-drain inspect', () => {
    const phase = readNode('phases/phase-wave1.md');
    const decision = phase.match(/### 3\.2\.1 Returned Work Decision\n([\s\S]*?)(?=\n### 3\.2\.2 |\n## 4\.)/);

    assert.ok(decision, 'Wave1 has a returned-work decision point');
    const text = decision[1];
    for (const required of [
      'successful formal submit',
      'valid current depth review',
      'reference-convergence inspect',
      'exact target returned by that inspect',
      'index/Seed sync',
      'same inspect',
    ]) assert.match(text, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    assert.ok(text.indexOf('valid current depth review') < text.indexOf('reference-convergence inspect'));
    assert.match(text, /Sub-agent.*(?:not|shall not).*?(?:reference|depth|seed)/i);
  });
});
