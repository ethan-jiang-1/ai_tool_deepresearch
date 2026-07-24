// @impl STM-001, STM-002, STM-003
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSeedTopicAuthoring } from '../../../DPT_FRAMEWORK/engine/helpers/seed-topic-authoring-evaluator.mjs';

const topic = Object.freeze({
  topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174000',
  id: '01',
  slug: '01_topic-a',
  title: 'Topic A',
  must_answer: ['What must be answered?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
});

function seed(overrides = {}) {
  const frontmatter = {
    topic_uid: topic.topic_uid,
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    must_answer: topic.must_answer,
    scope_role: topic.scope_role,
    depends_on_topic_uids: topic.depends_on_topic_uids,
    ...overrides,
  };
  return `---\n${Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n`;
}

describe('evaluateSeedTopicAuthoring', () => {
  it('accepts only the declared canonical path and exact frontmatter binding', () => {
    const result = evaluateSeedTopicAuthoring({
      raw: seed(),
      relativePath: 'seed_topics/01_topic-a.md',
      topic,
    });

    assert.deepEqual(result, { passed: true, relative_path: 'seed_topics/01_topic-a.md' });
  });

  it('returns a local declared-file coordinate for malformed frontmatter without reading or mutating anything else', () => {
    const result = evaluateSeedTopicAuthoring({
      raw: '---\ntitle: [\n---\nbody is irrelevant',
      relativePath: 'seed_topics/01_topic-a.md',
      topic,
    });

    assert.equal(result.passed, false);
    assert.equal(result.reason_code, 'frontmatter_invalid');
    assert.equal(result.write_to, 'seed_topics/01_topic-a.md#/frontmatter');
    assert.match(result.missing_fact, /parseable YAML frontmatter/);
  });

  it('returns the deterministic canonical-field coordinate for a binding mismatch without judging the body', () => {
    const result = evaluateSeedTopicAuthoring({
      raw: seed({ title: 'Different title' }) + 'Any body quality is outside this evaluator.\n',
      relativePath: 'seed_topics/01_topic-a.md',
      topic,
    });

    assert.equal(result.passed, false);
    assert.equal(result.reason_code, 'canonical_binding_mismatch');
    assert.equal(result.write_to, 'seed_topics/01_topic-a.md#/title');
    assert.match(result.missing_fact, /frontmatter title must equal canonical Topic title/);
  });

  it('reports a path mismatch at the declared path rather than inferring another file', () => {
    const result = evaluateSeedTopicAuthoring({
      raw: seed(),
      relativePath: 'seed_topics/other.md',
      topic,
    });

    assert.equal(result.passed, false);
    assert.equal(result.reason_code, 'path_mismatch');
    assert.equal(result.write_to, 'seed_topics/other.md');
    assert.match(result.missing_fact, /must be seed_topics\/01_topic-a\.md/);
  });
});
