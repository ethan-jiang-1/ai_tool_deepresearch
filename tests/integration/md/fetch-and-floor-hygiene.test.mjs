// @impl SNC-007, RWP-017

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = join(import.meta.dirname, '../../..');

const DOCS = {
  sourceIntake: 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/subagent-dpt-source-intake.md',
  evidenceExtractor: 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/subagent-dpt-evidence-extractor.md',
  sharedFetch: 'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-page-fetch-guidance.md',
  wave0: 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md',
  wave1: 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md',
};

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf-8');
}

function contextFor(text, index, length) {
  return text.slice(Math.max(0, index - 120), Math.min(text.length, index + length + 160));
}

function hardCodedFetchAimViolations(text) {
  const pattern = /\b(?:always\s+)?(?:fetch|aim(?:\s+for)?|target)\s+\d+\b/gi;
  const violations = [];
  for (const match of text.matchAll(pattern)) {
    const context = contextFor(text, match.index ?? 0, match[0].length);
    if (!/profile\/runtime floor \+ named margin|Do not use|unless/i.test(context)) {
      violations.push(context);
    }
  }
  return violations;
}

describe('Sub-agent fetch hygiene guidance', () => {
  it('shared guidance owns the per-URL JS/Node-first fallback and multi-URL batching', () => {
    const text = read(DOCS.sharedFetch);
    assert.match(text, /For one exact candidate URL/i);
    assert.match(text, /native or built-in/i);
    assert.match(text, /available browser/i);
    assert.match(text, /Node\.js `fetch`/i);
    assert.match(text, /at most one bounded `curl`/i);
    assert.match(text, /same URL/i);
    assert.match(text, /small batches/i);
    assert.match(text, /bounded parallel access/i);
    assert.match(text, /site politeness/i);
    assert.match(text, /search snippets are not fetched page content/i);
    assert.doesNotMatch(text, /Python|urllib|\.py\b|one-liner/i);
  });

  for (const [name, relPath] of Object.entries({ sourceIntake: DOCS.sourceIntake, evidenceExtractor: DOCS.evidenceExtractor })) {
    it(`${name} directly requires the shared fetch owner without a local chain`, () => {
      const text = read(relPath);
      assert.match(text, /shared\/shared-page-fetch-guidance/);
      assert.match(text, /shared-page-fetch-guidance\.md/);
      assert.doesNotMatch(text, /Built-in page-fetching tool|Browser fetch|curl -L <url>|Node\.js `fetch`/i);
      assert.doesNotMatch(text, /Python|urllib|\.py\b|one-liner/i);
    });
  }
});

describe('Wave fetch target floor and margin guidance', () => {
  it('Wave0 derives candidate targets from profile floors plus conservative margin', () => {
    const text = read(DOCS.wave0);
    assert.match(text, /derive the initial candidate URL\/source target from explicit profile\/runtime floors plus a conservative small margin/i);
    assert.match(text, /wave0_per_topic_source_floor/);
    assert.match(text, /wave0_shared_ref_total/);
    assert.match(text, /planning buffer for inaccessible pages, duplicates, and non-countable sources/i);
    assert.match(text, /not a gate threshold, profile field, quality override/i);
    assert.match(text, /Gate repair\/refill handles remaining floor gaps/i);
    assert.deepEqual(hardCodedFetchAimViolations(text), []);
  });

  it('Wave1 derives candidate targets from profile floors, topic uniqueness, and new-source semantics', () => {
    const text = read(DOCS.wave1);
    assert.match(text, /derive the initial candidate URL\/source target from explicit profile\/runtime floors plus a conservative small margin/i);
    assert.match(text, /wave1_per_topic_ref_floor/);
    assert.match(text, /topic_unique_ratio/);
    assert.match(text, /new_source_floor/);
    assert.match(text, /planning buffer for inaccessible pages, duplicate URLs, Wave0 duplicates, and non-countable sources/i);
    assert.match(text, /not a gate threshold, profile field, quality override/i);
    assert.match(text, /Gate repair\/refill handles remaining floor gaps/i);
    assert.deepEqual(hardCodedFetchAimViolations(text), []);
  });
});
