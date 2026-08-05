// @impl SNC-007, RWP-015

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

const frameworkRoot = path.resolve('DEEP_RESEARCH_HARNESS');
const sharedRef = 'workflows/nodes/shared/shared-page-fetch-guidance.md';
const roleRefs = [
  'workflows/nodes/phases/subagent-dpt-source-intake.md',
  'workflows/nodes/phases/subagent-dpt-evidence-extractor.md',
  'workflows/nodes/phases/subagent-dpt-topic-scout.md',
  'workflows/nodes/phases/subagent-dpt-claim-verifier.md',
  'workflows/nodes/phases/subagent-dpt-source-diagnostic.md',
];

function read(ref) {
  return readFileSync(path.join(frameworkRoot, ref), 'utf8');
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'Markdown must have frontmatter.');
  return parseYaml(match[1]);
}

describe('sub-agent fetch contract delivery', () => {
  it('ships one actor-delivered shared per-URL JS/Node-first guidance surface with bounded curl and diagnostic facts', () => {
    assert.equal(existsSync(path.join(frameworkRoot, sharedRef)), true);
    const markdown = read(sharedRef);
    assert.deepEqual(Object.fromEntries(Object.entries(frontmatter(markdown)).filter(([key]) => (
      ['id', 'shared_scope', 'authority', 'actor_delivery'].includes(key)
    ))), {
      id: 'shared-page-fetch-guidance',
      shared_scope: 'subagent-fetch',
      authority: 'guidance-only',
      actor_delivery: 'required',
    });
    assert.match(markdown, /built-in|native/i);
    assert.match(markdown, /browser/i);
    assert.match(markdown, /Node(?:\.js)?\s+`?fetch`?/i);
    assert.match(markdown, /at most one[^\n]*`?curl`?/i);
    assert.match(markdown, /same URL/i);
    assert.match(markdown, /independent(?:ly)?[^\n]*permission/i);
    assert.match(markdown, /--max-time/);
    assert.match(markdown, /--max-redirs/);
    assert.match(markdown, /--proto/);
    assert.match(markdown, /--globoff/);
    assert.match(markdown, /small batch|bounded parallel/i);
    assert.match(markdown, /cache/i);
    assert.match(markdown, /source/i);
    assert.match(markdown, /exhausted|every legal tier fails/i);
    assert.match(markdown, /fetch_attempt_done/);
    for (const field of ['url', 'tier', 'surface', 'outcome', 'reason_code']) {
      assert.match(markdown, new RegExp(`\\b${field}\\b`));
    }
    assert.doesNotMatch(markdown, /Python|wget|automatic retry|ask the user to run|user command handoff/i);
  });

  it('makes every active role a direct dependent without retaining a role-local fetch chain or unrelated actor delivery', () => {
    for (const roleRef of roleRefs) {
      const markdown = read(roleRef);
      const metadata = frontmatter(markdown);
      assert.ok(metadata.requires.includes('shared/shared-page-fetch-guidance'), `${roleRef} requires shared page-fetch guidance`);
      const body = markdown.replace(/^---\n[\s\S]*?\n---\n?/, '');
      assert.doesNotMatch(body, /Python|wget|curl -L|urllib\.request/i);
      assert.doesNotMatch(body, /built-in[^\n]*curl|curl[^\n]*Node(?:\.js)?\s+fetch/i);
      assert.match(body, /shared-page-fetch-guidance/);
    }
  });

  it('keeps actor delivery to the marked direct shared node and leaves fetch diagnostics outside submit authority', () => {
    const markdown = read(sharedRef);
    assert.doesNotMatch(markdown, /workflow manifest|submit acceptance|required receipt identity|persisted fetch state/i);
    assert.match(markdown, /diagnostic/i);
    assert.match(markdown, /does not[^\n]*submit/i);
  });
});
