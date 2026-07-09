import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const REPO_ROOT = process.cwd();

after(cleanupAll);

function runInspect(cli, bundle) {
  const result = spawnSync('node', [join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', cli), '--bundle', bundle], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 10000,
  });
  return { status: result.status, output: JSON.parse(result.stdout) };
}

function writePlan(bundle, slugs = ['topic-a']) {
  writeFileSync(join(bundle, 'rb_plan.md'), [
    '---',
    JSON.stringify({
      plan_basename: 'return-map-test',
      derived_topic_count: slugs.length,
      topic_registry: slugs.map((slug, index) => ({ id: `t${index + 1}`, slug, title: slug })),
    }, null, 2),
    '---',
    '# Plan',
  ].join('\n'));
}

function writeCommon(bundle) {
  for (const dir of ['seed_topics', 'reference', 'artifacts/wave0/topic-a', 'artifacts/wave1/topic-a', 'artifacts/wave2']) {
    mkdirSync(join(bundle, dir), { recursive: true });
  }
  writePlan(bundle);
  writeFileSync(join(bundle, 'reference/README.md'), '# Reference');
  writeFileSync(join(bundle, 'reference/_INDEX.md'), '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| 00-shared-a.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |\n');
}

function referenceWithReturnMap(extra = '') {
  return [
    '- source_url: https://example.com/a',
    '- acceptance_status: accepted',
    '- source_type: secondary',
    '- tier: Tier 2',
    '- evidence_role: foundation',
    '- trust_level: practitioner',
    '- why_it_matters: Foundation evidence.',
    '- accessed_at: 2026-06-15',
    '- related_topic: all',
    '',
    '## Key Facts',
    '- Fact 1',
    '',
    '## Core Content Capture',
    'Content capture.',
    '',
    '## Relevance To This Research',
    '- evidence_meaning: Source changes the origin claim.',
    '  relationship: supports',
    '  refs:',
    '    - reference/00-shared-a.md',
    '    - _cache/wave0/primary/topic-a/a/',
    '  status: supported',
    '  next_hop: Read source.yaml.',
    '',
    '## Quotable Terms / Concepts',
    '- Concept',
    '',
    '## Risks And Limitations',
    '- Limitation',
    extra,
  ].join('\n');
}

function canonicalWave1ReturnMap(ref = 'reference/topic-a-a.md') {
  return [
    '- evidence_meaning: Mechanism evidence clarifies the trend.',
    '  relationship: partial',
    '  refs:',
    '    - artifacts/wave1/topic-a/evidence-summary.md',
    '    - artifacts/wave1/topic-a/question-list.md',
    `    - ${ref}`,
    '  status: partial',
    '  next_hop: Reconcile remaining open question.',
  ].join('\n');
}

function limitationReturnMap() {
  return [
    '- evidence_meaning: No materializable source evidence is available yet.',
    '  relationship: defers',
    '  refs:',
    '    - none',
    '  status: deferred',
    '  next_hop: limitation: no materializable evidence; defer to HITL2.',
  ].join('\n');
}

describe('wave inspect return-map diagnostics', () => {
  it('wave0 flags naked seed backfill evidence lists without changing gate authority', () => {
    const bundle = createTempDir('inspect-w0-rmap');
    writeCommon(bundle);
    writeFileSync(join(bundle, 'artifacts/wave0/topic-a/source.yaml'), '- url: https://example.com/a\n  title: A\n  retrieved_date: 2026-06-15\n  topic_tag: topic-a\n');
    writeFileSync(join(bundle, 'reference/00-shared-a.md'), referenceWithReturnMap());
    writeFileSync(join(bundle, 'seed_topics/topic-a.md'), '# Topic\n\n- reference/00-shared-a.md\n- _cache/wave0/primary/topic-a/a/\n');

    const { status, output } = runInspect('inspect-wave0-output.mjs', bundle);
    assert.equal(status, 1);
    assert.equal(output.check.return_map_classification, 'blocking');
    assert.equal(Object.hasOwn(output.check, 'return_map_diagnostic_only'), false);
    assert.match(output.inspect.join('\n'), /return_map_missing_fields/);
    assert.match(output.advice.join('\n'), /do not bypass phase status or user-surface/);
  });

  it('wave1 accepts canonical return-map refs in seed and artifacts', () => {
    const bundle = createTempDir('inspect-w1-rmap');
    writeCommon(bundle);
    const rmap = canonicalWave1ReturnMap();
    writeFileSync(join(bundle, 'reference/topic-a-a.md'), referenceWithReturnMap());
    writeFileSync(join(bundle, 'artifacts/wave1/topic-a/evidence-summary.md'), `# Evidence\n\n${rmap}\n`);
    writeFileSync(join(bundle, 'artifacts/wave1/topic-a/question-list.md'), `# Questions\n\n${rmap}\n`);
    writeFileSync(join(bundle, 'seed_topics/topic-a.md'), `# Topic\n\n${rmap}\n`);

    const { output } = runInspect('inspect-wave1-output.mjs', bundle);
    assert.equal(output.check.return_map_classification, 'diagnostic-only');
    assert.equal(Object.hasOwn(output.check, 'return_map_diagnostic_only'), false);
    assert.equal(output.inspect.some((line) => line.includes('return_map_missing_fields')), false, output.inspect.join('\n'));
  });

  it('wave1 blocks evidence-bearing seed maps that only point to internal provenance refs', () => {
    const bundle = createTempDir('inspect-w1-rmap-internal');
    writeCommon(bundle);
    const rmap = canonicalWave1ReturnMap();
    const internalOnly = [
      '- evidence_meaning: Mechanism evidence clarifies the trend.',
      '  relationship: supports',
      '  refs:',
      '    - artifacts/wave1/topic-a/evidence-summary.md',
      '    - _cache/wave1/primary/topic-a/a/',
      '    - _work_units/wave1/wu-w1-b000-deep-i0001/',
      '  status: supported',
      '  next_hop: Read the concrete reference file.',
    ].join('\n');
    writeFileSync(join(bundle, 'reference/topic-a-a.md'), referenceWithReturnMap());
    writeFileSync(join(bundle, 'artifacts/wave1/topic-a/evidence-summary.md'), `# Evidence\n\n${rmap}\n`);
    writeFileSync(join(bundle, 'artifacts/wave1/topic-a/question-list.md'), `# Questions\n\n${rmap}\n`);
    writeFileSync(join(bundle, 'seed_topics/topic-a.md'), `# Topic\n\n${internalOnly}\n`);

    const { status, output } = runInspect('inspect-wave1-output.mjs', bundle);
    assert.equal(status, 1);
    assert.equal(output.check.return_map_classification, 'blocking');
    assert.match(output.inspect.join('\n'), /return_map_missing_concrete_reference/);
    assert.match(output.inspect.join('\n'), /found only internal provenance refs/);
  });

  it('wave1 allows explicit limitation seed-map entries without concrete references', () => {
    const bundle = createTempDir('inspect-w1-rmap-limitation');
    writeCommon(bundle);
    const rmap = canonicalWave1ReturnMap();
    writeFileSync(join(bundle, 'reference/topic-a-a.md'), referenceWithReturnMap());
    writeFileSync(join(bundle, 'artifacts/wave1/topic-a/evidence-summary.md'), `# Evidence\n\n${rmap}\n`);
    writeFileSync(join(bundle, 'artifacts/wave1/topic-a/question-list.md'), `# Questions\n\n${rmap}\n`);
    writeFileSync(join(bundle, 'seed_topics/topic-a.md'), `# Topic\n\n${limitationReturnMap()}\n`);

    const { output } = runInspect('inspect-wave1-output.mjs', bundle);
    assert.equal(output.check.return_map_classification, 'diagnostic-only');
    assert.equal(output.inspect.some((line) => line.includes('return_map_missing_concrete_reference')), false, output.inspect.join('\n'));
  });

  it('wave2 flags backfill that omits finding ids and ledger/index refs', () => {
    const bundle = createTempDir('inspect-w2-rmap');
    writeCommon(bundle);
    writeFileSync(join(bundle, 'artifacts/wave2/synthesis.md'), '# Synthesis\n\nA prose conclusion without lineage.\n');
    writeFileSync(join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), '## Cross-Topic Scan Matrix\n## Wave1 Legacy Questions\n## Cross-Topic Resolutions\n## Emergent Cross-Topic Questions\n## Exploration Decisions\n## HITL2 Handoff\n');
    writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), 'version: "0.1"\nfindings: []\n');
    writeFileSync(join(bundle, 'seed_topics/topic-a.md'), '# Topic\n\n- evidence_meaning: Synthesis says something.\n  relationship: supports\n  refs:\n    - artifacts/wave2/synthesis.md\n  status: supported\n  next_hop: Read synthesis.\n');

    const { status, output } = runInspect('inspect-wave2-output.mjs', bundle);
    assert.equal(status, 1);
    assert.equal(output.check.return_map_classification, 'blocking');
    const joined = output.inspect.join('\n');
    assert.match(joined, /return_map_missing_finding_id/);
    assert.match(joined, /return_map_missing_wave2_refs/);
    assert.match(joined, /return_map_missing_concrete_reference/);
  });
});
