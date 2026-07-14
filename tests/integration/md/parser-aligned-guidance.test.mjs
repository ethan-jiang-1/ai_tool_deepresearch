import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const NODES = join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'nodes');

function readNode(ref) {
  return readFileSync(join(NODES, ref), 'utf-8');
}

describe('REF-007 parser-aligned Agent guidance', () => {
  it('shared schema guidance locks source.yaml to top-level array with required fields', () => {
    const schemas = readNode('shared/shared-schemas.md');
    const intake = readNode('phases/subagent-dpt-source-intake.md');
    const combined = `${schemas}\n${intake}`;

    assert.match(combined, /top-level YAML array/);
    assert.match(combined, /- url:/);
    assert.match(combined, /title/);
    assert.match(combined, /retrieved_date/);
    assert.match(combined, /topic_tag/);
    assert.match(combined, /sources:/);
    assert.match(combined, /wave:/);
    assert.match(combined, /topic:/);
    assert.match(combined, /yaml\.stringify/);
  });

  it('reference metadata guidance forbids YAML frontmatter and names parseReferenceMetadata', () => {
    const template = readNode('shared/shared-reference-template.md');
    const schemas = readNode('shared/shared-schemas.md');
    const extractor = readNode('phases/subagent-dpt-evidence-extractor.md');
    const combined = `${template}\n${schemas}\n${extractor}`;

    assert.match(combined, /metadata block/);
    assert.match(combined, /- source_url:/);
    assert.match(combined, /not YAML frontmatter|no YAML frontmatter/i);
    assert.match(combined, /---` fences|`---` frontmatter is forbidden/);
    assert.match(combined, /parseReferenceMetadata\(\)/);
  });

  it('current guidance no longer describes reference Markdown as YAML frontmatter', () => {
    const refs = [
      'shared/shared-schemas.md',
      'shared/shared-reference-template.md',
      'phases/subagent-dpt-source-intake.md',
      'phases/subagent-dpt-evidence-extractor.md',
      'phases/subagent-dpt-topic-scout.md',
      'phases/phase-wave0.md',
      'phases/phase-wave1.md',
    ];
    const offenders = [];

    for (const ref of refs) {
      const md = readNode(ref);
      const pattern = /reference\/[^`\n]*YAML frontmatter|YAML frontmatter[^.\n]*reference\//i;
      if (pattern.test(md)) offenders.push(ref);
    }

    assert.deepEqual(offenders, []);
  });

  it('Wave1 loads the shared tolerant reference template through requires', () => {
    const phase = readNode('phases/phase-wave1.md');
    const template = readNode('shared/shared-reference-template.md');
    const extractor = readNode('phases/subagent-dpt-evidence-extractor.md');

    assert.match(phase, /requires:[\s\S]*- shared\/shared-reference-template/);
    assert.match(template, /required and non-empty|必须存在且非空/i);
    assert.match(template, /case|大小写/i);
    assert.match(template, /heading level|标题层级/i);
    assert.match(template, /order|顺序/i);
    assert.doesNotMatch(`${phase}\n${template}\n${extractor}`, /at least five key facts|at least 5 concrete bullet facts|顺序固定|大小写敏感/i);
  });

  it('reference guidance exposes one UID-or-legacy topic binding contract', () => {
    const template = readNode('shared/shared-reference-template.md');
    const extractor = readNode('phases/subagent-dpt-evidence-extractor.md');
    const combined = `${template}\n${extractor}`;

    assert.match(combined, /related_topic_uid/);
    assert.match(combined, /related_topic/);
    assert.match(combined, /both are present, they must resolve identically|两种形式同时出现时必须解析一致/i);
  });
});
