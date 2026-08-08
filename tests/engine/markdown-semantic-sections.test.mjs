import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseMarkdownSemanticSections,
  markdownSemanticSectionEntries,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/markdown-semantic-sections.mjs';

// @impl WAI-011

test('Key Findings with content only under descendant ### subsections is non-empty', () => {
  const md = [
    '# Evidence Summary',
    '',
    '## Source URLs',
    '- [x](https://example.com/a)',
    '',
    '## Key Findings',
    '',
    '### 1. 核心机制理解',
    '- finding one',
    '',
    '### 2. 趋势观察',
    '- finding two',
    '',
    '## Open Questions',
    '- q',
    '',
  ].join('\n');
  const sections = parseMarkdownSemanticSections(md);
  const keyFindings = sections.get('key findings') || '';
  assert.ok(keyFindings.length > 0, `key findings body should be non-empty, got: ${JSON.stringify(keyFindings)}`);
  assert.match(keyFindings, /finding one/);
  assert.match(keyFindings, /finding two/);
});

test('a truly empty Key Findings section is still empty', () => {
  const md = [
    '# Evidence Summary',
    '',
    '## Key Findings',
    '',
    '## Open Questions',
    '- q',
    '',
  ].join('\n');
  const sections = parseMarkdownSemanticSections(md);
  assert.equal((sections.get('key findings') || '').length, 0);
});

test('same-level sibling headings still bound their sections', () => {
  const md = [
    '## Key Facts',
    '- fact a',
    '- fact b',
    '',
    '## Core Content Capture',
    'narrative',
    '',
  ].join('\n');
  const sections = parseMarkdownSemanticSections(md);
  assert.match(sections.get('key facts') || '', /fact a/);
  assert.doesNotMatch(sections.get('key facts') || '', /narrative/);
  assert.match(sections.get('core content capture') || '', /narrative/);
});

test('a document title section spans descendant headings', () => {
  const md = [
    '# Title',
    '',
    '## Key Facts',
    '- fact',
    '',
  ].join('\n');
  const entries = markdownSemanticSectionEntries(md);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, 'title');
  assert.match(entries[0].body, /fact/);
});
