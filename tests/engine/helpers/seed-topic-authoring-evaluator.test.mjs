// @impl STM-001, STM-002, STM-003, STM-010
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateSeedInitializationStructure,
  evaluateSeedTopicAuthoring,
  renderSeedInitializationRegion,
  SEED_TOPIC_INITIALIZATION,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/seed-topic-authoring-evaluator.mjs';

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

  it('rejects the rendered template skeleton until its pending placeholders are replaced', () => {
    const raw = `${seed()}# Topic A\n\n${renderSeedInitializationRegion()}\n\n## ${SEED_TOPIC_INITIALIZATION.appendixHeading}\n\n## 历史摘要\n`;
    const result = evaluateSeedInitializationStructure({ raw, relativePath: 'seed_topics/01_topic-a.md' });

    assert.equal(result.passed, false);
    assert.equal(result.reason_code, 'seed_initialization_structure');
    assert.equal(result.write_to, 'seed_topics/01_topic-a.md#/seed-initialization');
    assert.match(result.missing_fact, /template pending placeholder line/);
  });

  it('accepts an enriched initialization region that replaced every placeholder line', () => {
    let region = renderSeedInitializationRegion();
    for (const section of SEED_TOPIC_INITIALIZATION.sections) {
      region = region.replace(section.content, `Authored content for ${section.heading}.`);
    }
    const raw = `${seed()}# Topic A\n\n${region}\n\n## ${SEED_TOPIC_INITIALIZATION.appendixHeading}\n\n## 历史摘要\n`;
    const result = evaluateSeedInitializationStructure({ raw, relativePath: 'seed_topics/01_topic-a.md' });

    assert.deepEqual(result, { passed: true, mode: 'current', relative_path: 'seed_topics/01_topic-a.md' });
  });

  it('accepts an explicitly rephrased gap instead of the raw template placeholder', () => {
    let region = renderSeedInitializationRegion();
    const gapBySection = {
      '主题定位': 'pending — 上游未提供该 Topic 的定位，Wave0 需通过 evidence intake 建立。',
      '初始假设、缺口或张力': [
        '**已知**：profile 未记录该 Topic 的已知事实。',
        '**缺口**：pending — 上游未提供具体定义，Wave0 需建立该事实。',
        '**张力**：pending — 现有主张存在矛盾，需独立验证。',
      ].join('\n'),
      'why now': '- pending — 当前时间窗口待上游确认。',
      '为什么对最终交付物重要': 'pending — 该 Topic 对最终交付的贡献待 Wave0 后判定。',
      '下游位置（可选）': '- pending — 暂未分配，待后续轮次定位。',
    };
    for (const section of SEED_TOPIC_INITIALIZATION.sections) {
      region = region.replace(section.content, gapBySection[section.heading]);
    }
    const raw = `${seed()}# Topic A\n\n${region}\n\n## ${SEED_TOPIC_INITIALIZATION.appendixHeading}\n\n## 历史摘要\n`;
    const result = evaluateSeedInitializationStructure({ raw, relativePath: 'seed_topics/01_topic-a.md' });

    assert.deepEqual(result, { passed: true, mode: 'current', relative_path: 'seed_topics/01_topic-a.md' });
  });

  it('rejects an enriched region that still retains one template placeholder line', () => {
    let region = renderSeedInitializationRegion();
    const [topicPositioning] = SEED_TOPIC_INITIALIZATION.sections;
    for (const section of SEED_TOPIC_INITIALIZATION.sections) {
      if (section === topicPositioning) continue;
      region = region.replace(section.content, `Authored content for ${section.heading}.`);
    }
    const raw = `${seed()}# Topic A\n\n${region}\n\n## ${SEED_TOPIC_INITIALIZATION.appendixHeading}\n\n## 历史摘要\n`;
    const result = evaluateSeedInitializationStructure({ raw, relativePath: 'seed_topics/01_topic-a.md' });

    assert.equal(result.passed, false);
    assert.equal(result.reason_code, 'seed_initialization_structure');
    assert.equal(result.write_to, 'seed_topics/01_topic-a.md#/seed-initialization');
    assert.match(result.missing_fact, /主题定位/);
  });

  it('rejects a renderer-owned heading or pending marker below a current initialization boundary', () => {
    const raw = `${seed()}# Topic A\n\n${renderSeedInitializationRegion()}\n\n## ${SEED_TOPIC_INITIALIZATION.appendixHeading}\n\n## 初始假设、缺口或张力\n\npending — stale template ghost\n`;
    const result = evaluateSeedInitializationStructure({ raw, relativePath: 'seed_topics/01_topic-a.md' });

    assert.equal(result.passed, false);
    assert.equal(result.reason_code, 'seed_initialization_structure');
    assert.equal(result.write_to, 'seed_topics/01_topic-a.md#/seed-initialization');
    assert.match(result.missing_fact, /below the initialization boundary/);
  });

  it('leaves an unmarked legacy duplicate body readable without inferring a current structure', () => {
    const raw = `${seed()}# Topic A\n\n## 初始假设、缺口或张力\nlegacy duplicate body prose\n\n## Appendix\n`;
    const result = evaluateSeedInitializationStructure({ raw, relativePath: 'seed_topics/01_topic-a.md' });

    assert.deepEqual(result, { passed: true, mode: 'legacy', relative_path: 'seed_topics/01_topic-a.md' });
  });
});
