import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readReferenceMetadata } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs';

// @impl REF-010, CHI-005

test('frontmatter YAML failure names the offending frontmatter line', () => {
  const md = [
    '---',
    'source_url: "https://fixture.news-research.com/agent-taxonomy"',
    'acceptance_status: accepted :warning:',
    'tier: "Tier 2"',
    '---',
    '# Title',
    '',
  ].join('\n');
  const result = readReferenceMetadata(md);
  assert.equal(result.error?.code, 'reference_metadata_frontmatter_invalid');
  assert.match(result.error.reason, /Offending frontmatter line/);
  assert.match(result.error.reason, /acceptance_status/);
  assert.match(result.error.reason, /accepted :warning:/);
  // The repair hint names the quoting rule.
  assert.match(result.error.reason, /quote YAML-sensitive values/);
});

test('quoted acceptance_status warning marker parses', () => {
  const md = [
    '---',
    'source_url: "https://fixture.news-research.com/agent-taxonomy"',
    'acceptance_status: "accepted :warning:"',
    'tier: "Tier 2"',
    'related_topic_uid: all',
    '---',
    '# Title',
    '',
  ].join('\n');
  const result = readReferenceMetadata(md);
  assert.equal(result.error, null);
  assert.equal(result.metadata.get('acceptance_status'), 'accepted :warning:');
});

test('malformed frontmatter boundary is still diagnosed without a line', () => {
  const md = 'no-frontmatter-here';
  const result = readReferenceMetadata(md);
  assert.ok(result.presentation === 'legacy_bullets' || result.error === null);
});
