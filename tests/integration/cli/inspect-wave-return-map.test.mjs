// @impl RRM-007, IOC-005, WTS-004, WTS-007
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';
import { claimAndSubmitWorkUnit } from '../../engine/work-unit-test-helpers.mjs';
import {
  instantiateBundle,
  runGate,
} from '../../e2e/helpers/deterministic-chain-harness.mjs';
import {
  PRIMARY_TOPIC,
  passAndEnter,
  recordWaveCompletion,
  stageWave0,
  writePlanAndProfile,
} from '../../e2e/helpers/research-chain-fixture.mjs';

const REPO_ROOT = process.cwd();
const TOPIC_UID = 'tp_123e4567-e89b-42d3-a456-426614174010';

after(cleanupAll);

function runInspect(cli, bundle) {
  const result = spawnSync('node', [join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'cli', cli), '--bundle', bundle], {
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
      topic_registry_version: '2',
      topic_registry: slugs.map((slug, index) => ({
        topic_uid: index === 0 ? TOPIC_UID : `tp_123e4567-e89b-42d3-a456-4266141740${String(index + 10).padStart(2, '0')}`,
        id: String(index + 1).padStart(2, '0'),
        slug,
        title: slug,
        must_answer: ['What matters?'],
        scope_role: 'primary',
        depends_on_topic_uids: [],
        previous_layouts: [],
      })),
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
  writeFileSync(join(bundle, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: 0\n');
  writeFileSync(join(bundle, 'reference/README.md'), '# Reference');
  writeFileSync(join(bundle, 'reference/_INDEX.md'), '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| 00-shared-a.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |\n');
}

function writeSeed(bundle, body, { slug = 'topic-a', title = 'topic-a' } = {}) {
  writeFileSync(join(bundle, `seed_topics/${slug}.md`), `---
topic_uid: ${TOPIC_UID}
id: "01"
slug: ${slug}
title: ${title}
must_answer: ["What matters?"]
scope_role: primary
depends_on_topic_uids: []
---
# ${title}

${body}
`);
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
    '- related_topic_uid: all',
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

function richReference() {
  return [
    '---',
    'source_url: "https://example.com/a"',
    'acceptance_status: accepted',
    'source_type: secondary',
    'tier: "Tier 2"',
    'evidence_role: foundation',
    'trust_level: practitioner',
    'why_it_matters: "Foundation evidence."',
    'accessed_at: "2026-06-15"',
    'related_topic_uid: all',
    '---',
    '',
    '## Key Facts',
    '- Fact 1',
    '',
    '## Core Content Capture',
    'Content capture.',
    '',
    '## Relevance To This Research',
    'This rich reference supplies consumer-facing context without becoming a Seed Topic projection.',
    '',
    '## Quotable Terms / Concepts',
    '- Concept',
    '',
    '## Risks And Limitations',
    '- Limitation',
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

function identityBoundLimitation(workId, ordinal) {
  return [
    `- entry_id: ${workId}/${ordinal}`,
    '  evidence_meaning: Current row has no materializable projection.',
    '  relationship: defers',
    '  refs:',
    '    - none',
    '  status: deferred',
    '  next_hop: limitation: no materializable evidence; defer to HITL2.',
  ].join('\n');
}

function submitWave1(bundle, queueItemId = 'queue-current') {
  return claimAndSubmitWorkUnit(bundle, {
    phase: 'wave1', queueItemId, preserveQueue: true,
    queueItemOverrides: {
      payload: { topic_uid: TOPIC_UID, topic_slug: 'topic-a' },
      lineage: { topic_uid: TOPIC_UID, topic_slug: 'topic-a', phase: 'wave1' },
    },
  });
}

describe('wave inspect return-map diagnostics', () => {
  it('shares one ordered Wave0 omission batch between production inspect and Gate output', () => {
    const root = createTempDir('inspect-w0-batch-gate');
    const bundle = instantiateBundle(root, 'return-map-batch');
    writePlanAndProfile(bundle);
    passAndEnter(bundle, 'instantiation-complete', 'phases/phase-instantiation.md', 'hitl1_recorded');
    passAndEnter(bundle, 'hitl1-recorded', 'phases/phase-hitl1.md', 'setup_ready');
    passAndEnter(bundle, 'setup-ready', 'phases/phase-setup.md', 'setup_ready');
    passAndEnter(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md', 'seed_topics_ready');

    const first = stageWave0(bundle, 'batch-a', { project: false, completion: false });
    const expandedSource = [
      '- url: "https://research.example.org/batch-a"',
      '  title: "Continuity batch-a"',
      '  retrieved_date: "2026-07-15"',
      '  topic_tag: "topic-a"',
      '- url: "https://research.example.org/batch-b"',
      '  title: "Continuity batch-b"',
      '  retrieved_date: "2026-07-15"',
      '  topic_tag: "topic-a"',
      '',
    ].join('\n');
    const second = claimAndSubmitWorkUnit(bundle, {
      phase: 'wave0',
      queueItemId: 'wave0-batch-b',
      preserveQueue: true,
      queueItemOverrides: {
        payload: { topic_uid: PRIMARY_TOPIC.topic_uid, topic_slug: PRIMARY_TOPIC.slug },
        lineage: { topic_uid: PRIMARY_TOPIC.topic_uid, topic_slug: PRIMARY_TOPIC.slug, phase: 'wave0' },
      },
      outputs: [{
        path: 'artifacts/wave0/topic-a/source.yaml',
        role: 'source_yaml',
        content: expandedSource,
      }],
      cacheTrails: [{
        path: '_cache/wave0/primary/wave0-batch-b/batch-b',
        url: 'https://research.example.org/batch-b',
      }],
    });
    assert.equal(second.submitted.ok, true, JSON.stringify(second.submitted));

    const seedPath = join(bundle, 'seed_topics/topic-a.md');
    writeFileSync(seedPath, readFileSync(seedPath, 'utf8').replace('__BACKFILL_WAVE0_EVIDENCE__', ''));
    const expectedIds = [`${first.record.work_id}/1`, `${second.record.work_id}/2`];

    const inspected = runInspect('inspect-wave0-output.mjs', bundle);
    assert.equal(inspected.status, 1, JSON.stringify(inspected.output));
    const inspectHints = inspected.output.hints.filter((hint) => hint.rule_id === 'return_map_current_candidate_omission');
    assert.equal(inspectHints.length, 1, JSON.stringify(inspected.output));
    for (const id of expectedIds) assert.match(inspectHints[0].missing_fact, new RegExp(id.replace('/', '\\/')));

    recordWaveCompletion(bundle, 'wave0');
    const gated = runGate(bundle, 'wave0-complete', 'phases/phase-wave0.md', { expectedStatus: 1 }).output;
    assert.equal(Object.hasOwn(gated, 'findings'), false);
    const gateHints = gated.hints.filter((hint) => hint.rule_id === 'return_map_current_candidate_omission');
    assert.equal(gateHints.length, 1, JSON.stringify(gated));
    for (const id of expectedIds) assert.match(gateHints[0].missing_fact, new RegExp(id.replace('/', '\\/')));
  });

  it('wave0 flags naked seed backfill evidence lists without changing gate authority', () => {
    const bundle = createTempDir('inspect-w0-rmap');
    writeCommon(bundle);
    writeFileSync(join(bundle, 'artifacts/wave0/topic-a/source.yaml'), '- url: https://example.com/a\n  title: A\n  retrieved_date: 2026-06-15\n  topic_tag: topic-a\n');
    writeFileSync(join(bundle, 'reference/00-shared-a.md'), referenceWithReturnMap());
    writeSeed(bundle, '## 本轮新增证据\n\n- reference/00-shared-a.md\n- _cache/wave0/primary/topic-a/a/');

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
    writeSeed(bundle, `## 本轮新增机制理解\n\n${rmap}\n\n## 本轮新增趋势与难点\n\n## 待验证问题`);

    const { output } = runInspect('inspect-wave1-output.mjs', bundle);
    assert.equal(output.check.return_map_classification, 'diagnostic-only', output.inspect.join('\n'));
    assert.equal(Object.hasOwn(output.check, 'return_map_diagnostic_only'), false);
    assert.equal(output.inspect.some((line) => line.includes('return_map_missing_fields')), false, output.inspect.join('\n'));
  });

  it('keeps rich references and normal Wave1 artifacts outside the return-map grammar', () => {
    const wave0Bundle = createTempDir('inspect-w0-rich-reference');
    writeCommon(wave0Bundle);
    writeFileSync(join(wave0Bundle, 'reference/00-shared-a.md'), richReference());
    writeSeed(wave0Bundle, [
      '## 本轮新增证据',
      '',
      '- evidence_meaning: A Seed Topic entry provides the actual navigation map.',
      '  relationship: context',
      '  refs:',
      '    - reference/00-shared-a.md',
      '  status: supported',
      '  next_hop: Read the rich reference.',
    ].join('\n'));

    const wave0 = runInspect('inspect-wave0-output.mjs', wave0Bundle).output;
    assert.doesNotMatch(
      wave0.inspect.join('\n'),
      /reference\/00-shared-a\.md:.*return_map_(?:missing_fields|naked_evidence_list|unsupported_prose)/,
      wave0.inspect.join('\n'),
    );

    const wave1Bundle = createTempDir('inspect-w1-ordinary-artifacts');
    writeCommon(wave1Bundle);
    writeFileSync(join(wave1Bundle, 'reference/topic-a-a.md'), richReference());
    writeFileSync(join(wave1Bundle, 'artifacts/wave1/topic-a/evidence-summary.md'), [
      '# Evidence Summary',
      '',
      '## Source URLs',
      'https://example.com/a',
      '',
      '## Key Findings',
      '- The evidence is relevant.',
    ].join('\n'));
    writeFileSync(join(wave1Bundle, 'artifacts/wave1/topic-a/question-list.md'), [
      '# Questions',
      '',
      '## Topic Investigation Targets',
      '- Verify the mechanism.',
      '',
      '## Question Reconciliation',
      'Current evidence is partial.',
      '',
      '## Emergent Question Protocol',
      'No emergent question.',
      '',
      '## Exploration / Exploitation Decision',
      'Continue investigation.',
    ].join('\n'));
    writeSeed(wave1Bundle, [
      '## 本轮新增机制理解',
      '',
      '- evidence_meaning: Seed projection is separate from the artifacts.',
      '  relationship: partial',
      '  refs:',
      '    - reference/topic-a-a.md',
      '  status: partial',
      '  next_hop: Reconcile the open question.',
      '',
      '## 本轮新增趋势与难点',
      '',
      '## 待验证问题',
    ].join('\n'));

    const wave1 = runInspect('inspect-wave1-output.mjs', wave1Bundle).output;
    assert.equal(wave1.check.return_map_classification, 'diagnostic-only', wave1.inspect.join('\n'));
    assert.doesNotMatch(
      wave1.inspect.join('\n'),
      /(?:reference\/topic-a-a\.md|artifacts\/wave1\/topic-a\/(?:evidence-summary|question-list)\.md):.*return_map_/,
      wave1.inspect.join('\n'),
    );
  });

  it('does not let a complete Wave1 sibling mask a prose-only target section', () => {
    const bundle = createTempDir('inspect-w1-rmap-sibling');
    writeCommon(bundle);
    const rmap = canonicalWave1ReturnMap();
    writeFileSync(join(bundle, 'reference/topic-a-a.md'), referenceWithReturnMap());
    writeFileSync(join(bundle, 'artifacts/wave1/topic-a/evidence-summary.md'), `# Evidence\n\n${rmap}\n`);
    writeFileSync(join(bundle, 'artifacts/wave1/topic-a/question-list.md'), `# Questions\n\n${rmap}\n`);
    writeSeed(bundle, `## 本轮新增机制理解\n\n${rmap}\n\n## 本轮新增趋势与难点\n\nThis sibling is prose only.\n\n## 待验证问题`);

    const { status, output } = runInspect('inspect-wave1-output.mjs', bundle);
    assert.equal(status, 1);
    assert.match(output.inspect.join('\n'), /return_map_missing_fields/);
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
    writeSeed(bundle, `## 本轮新增机制理解\n\n${internalOnly}\n\n## 本轮新增趋势与难点\n\n## 待验证问题`);

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
    writeSeed(bundle, `## 本轮新增机制理解\n\n${limitationReturnMap()}\n\n## 本轮新增趋势与难点\n\n## 待验证问题`);

    const { output } = runInspect('inspect-wave1-output.mjs', bundle);
    assert.equal(output.check.return_map_classification, 'diagnostic-only', output.inspect.join('\n'));
    assert.equal(output.inspect.some((line) => line.includes('return_map_missing_concrete_reference')), false, output.inspect.join('\n'));
  });

  it('Wave2 reports an exact structural identity root before a dependent finding omission', () => {
    const bundle = createTempDir('inspect-w2-rmap');
    writeCommon(bundle);
    writeFileSync(join(bundle, 'artifacts/wave2/synthesis.md'), '# Synthesis\n\nA prose conclusion without lineage.\n');
    writeFileSync(join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), '## Cross-Topic Scan Matrix\n## Wave1 Legacy Questions\n## Cross-Topic Resolutions\n## Emergent Cross-Topic Questions\n## Exploration Decisions\n## HITL2 Handoff\n');
    writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), `version: "0.1"
findings:
  - id: W2F-015
    affected_topics: [topic-a]
    created_in_rerun_count: 0
`);
    writeSeed(bundle, '## 当前判断\n\n- evidence_meaning: Synthesis says something.\n  relationship: supports\n  refs:\n    - artifacts/wave2/synthesis.md\n  status: supported\n  next_hop: Read synthesis.\n\n## 待验证问题');

    const { status, output } = runInspect('inspect-wave2-output.mjs', bundle);
    assert.equal(status, 1);
    assert.equal(output.check.return_map_classification, 'blocking');
    const joined = output.inspect.join('\n');
    assert.match(joined, /seed_projection_entry_identity/);
    assert.match(joined, /return_map_missing_concrete_reference/);
    assert.doesNotMatch(joined, /artifacts\/wave2\/(?:synthesis|cross-topic-ledger)\.md:.*return_map_(?:missing_fields|unsupported_prose)/);
    assert.doesNotMatch(joined, /return_map_current_finding_omission/);
  });

  it('reports a missing demanded Wave1 family before omission and accepts a complete identity-bound disposition', () => {
    const bundle = createTempDir('inspect-w1-row-projection');
    writeCommon(bundle);
    const submitted = submitWave1(bundle);
    writeSeed(bundle, '## 本轮新增机制理解\n\n## 本轮新增趋势与难点');
    const omitted = runInspect('inspect-wave1-output.mjs', bundle).output;
    assert.match(omitted.inspect.join('\n'), /return_map_target_family_unavailable/);
    assert.doesNotMatch(omitted.inspect.join('\n'), /return_map_current_row_omission/);

    writeSeed(bundle, `## 本轮新增机制理解

${identityBoundLimitation(submitted.record.work_id, 1)}

## 本轮新增趋势与难点

${identityBoundLimitation(submitted.record.work_id, 2)}

## 待验证问题

${identityBoundLimitation(submitted.record.work_id, 3)}`);
    const repaired = runInspect('inspect-wave1-output.mjs', bundle).output;
    assert.doesNotMatch(repaired.inspect.join('\n'), /return_map_target_family_unavailable|return_map_current_row_omission|seed_projection_entry_identity/);

    writeSeed(bundle, `## 本轮新增机制理解
- entry_id: ${submitted.record.work_id}/1
  evidence_meaning: An open question is not an accepted row disposition.
  relationship: opens
  refs: none
  status: open
  next_hop: limitation: revisit later.

## 本轮新增趋势与难点

${identityBoundLimitation(submitted.record.work_id, 2)}

## 待验证问题

${identityBoundLimitation(submitted.record.work_id, 3)}`);
    const invalidDisposition = runInspect('inspect-wave1-output.mjs', bundle).output;
    assert.match(invalidDisposition.inspect.join('\n'), /seed_projection_deferred_disposition_invalid/);
    assert.doesNotMatch(invalidDisposition.inspect.join('\n'), /return_map_current_row_omission/);

    writeSeed(bundle, `## 本轮新增机制理解
- entry_id: ${submitted.record.work_id}/1
  evidence_meaning: Invalid identity-bearing entry.
  relationship: supports
  refs: reference/topic-a-a.md
  status: supported

## 本轮新增趋势与难点

${identityBoundLimitation(submitted.record.work_id, 2)}

## 待验证问题

${identityBoundLimitation(submitted.record.work_id, 3)}`);
    const invalidEntry = runInspect('inspect-wave1-output.mjs', bundle).output;
    assert.match(invalidEntry.inspect.join('\n'), /return_map_missing_fields/);
    assert.doesNotMatch(invalidEntry.inspect.join('\n'), /return_map_current_row_omission/);
  });

  it('preserves submitted-authority ownership and exact rerun coordinates', () => {
    const bundle = createTempDir('inspect-w1-authority-root');
    writeCommon(bundle);
    const submitted = submitWave1(bundle);
    writeSeed(bundle, '## 本轮新增机制理解\n\n## 本轮新增趋势与难点\n\n## 待验证问题');
    const manifestPath = join(bundle, submitted.record.paths.manifest_ref);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.queue_item_snapshot_hash = 'drifted-together';
    const indexPath = join(bundle, '_work_units/_index.json');
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    index.work_units[submitted.record.work_id].queue_item_snapshot_hash = 'drifted-together';
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

    const output = runInspect('inspect-wave1-output.mjs', bundle).output;
    assert.ok(output.check.failed_rule_ids.includes('submitted_projection_authority'));
    assert.equal(output.check.failed_rule_ids.some((id) => id.startsWith('configuration_integrity:submitted_projection_authority')), false);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'submitted_projection_authority');
    assert.equal(hint.repair_kind, 'missing_contract');
    assert.match(hint.write_to, /Engine-owned submitted work-unit authority/);
    assert.match(hint.rerun, /inspect-wave1-output\.mjs/);
    assert.doesNotMatch(hint.write_to, /seed_topics/);
    assert.doesNotMatch(output.inspect.join('\n'), /return_map_current_row_omission/);
  });

  it('uses a narrow canonical seed prerequisite and masks family symptoms', () => {
    const bundle = createTempDir('inspect-w1-seed-binding');
    writeCommon(bundle);
    writeSeed(bundle, '## 本轮新增机制理解');
    unlinkSync(join(bundle, 'seed_topics/topic-a.md'));
    const output = runInspect('inspect-wave1-output.mjs', bundle).output;
    assert.match(output.inspect.join('\n'), /return_map_seed_binding.*seed_missing/);
    assert.doesNotMatch(output.inspect.join('\n'), /return_map_target_family_unavailable|return_map_current_row_omission/);
    assert.match(output.advice.join('\n'), /operate-topic-state\.mjs inspect/);
  });

  it('blocks a missing family only for current demand and does not fabricate a no-demand token obligation', () => {
    const demanded = createTempDir('inspect-w1-family-demand');
    writeCommon(demanded);
    submitWave1(demanded);
    writeSeed(demanded, '## 当前判断\n\nHistorical only.');
    const blocked = runInspect('inspect-wave1-output.mjs', demanded).output;
    assert.equal(blocked.inspect.filter((line) => line.includes('return_map_target_family_unavailable')).length, 1);
    assert.doesNotMatch(blocked.inspect.join('\n'), /return_map_current_row_omission/);

    writeSeed(demanded, '__BACKFILL_WAVE1_MECHANISMS__\n\n## 当前判断\n\nHistorical only.');
    const skipped = runInspect('inspect-wave1-output.mjs', demanded).output;
    assert.match(skipped.inspect.join('\n'), /return_map_target_family_unavailable/);
    assert.doesNotMatch(skipped.inspect.join('\n'), /return_map_current_row_omission/);

    const inactive = createTempDir('inspect-w1-family-inactive');
    writeCommon(inactive);
    writeSeed(inactive, '## 本轮新增机制理解\n\n__BACKFILL_WAVE1_MECHANISMS__\n\n## 当前判断\n\nHistorical only.');
    const noDemand = runInspect('inspect-wave1-output.mjs', inactive).output;
    assert.doesNotMatch(noDemand.inspect.join('\n'), /return_map_target_family_unavailable|seed_projection_token|return_map_current_row_omission/);
  });

  it('isolates Wave2 current and legacy finding demand and rejects invalid round fields', () => {
    const bundle = createTempDir('inspect-w2-finding-demand');
    writeCommon(bundle);
    writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), `version: "0.1"
findings:
  - id: W2F-015
    affected_topics: [topic-a]
    created_in_rerun_count: 0
  - id: W2F-003
    affected_topics: [${TOPIC_UID}]
`);
    writeSeed(bundle, '## 当前判断\n\n## 待验证问题');
    const output = runInspect('inspect-wave2-output.mjs', bundle).output;
    assert.match(output.inspect.join('\n'), /return_map_current_finding_omission.*W2F-015/);
    assert.ok(output.check.finding_classification.advisory.some((id) => id.includes('return_map_legacy_finding_omission') && id.includes('W2F-003')));
    assert.match(output.advice.join('\n'), /W2F-003/);
    assert.equal(output.check.failed_rule_ids.includes('return_map_legacy_finding_omission'), false);

    writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), `version: "0.1"
findings:
  - id: W2F-015
    affected_topics: [unknown-topic]
    created_in_rerun_count: 1
`);
    const invalid = runInspect('inspect-wave2-output.mjs', bundle).output;
    assert.ok(invalid.check.failed_rule_ids.includes('return_map_finding_projection_field'));
    assert.match(invalid.inspect.join('\n'), /return_map_finding_projection_field.*W2F-015\.affected_topics/);
    assert.doesNotMatch(invalid.inspect.join('\n'), /return_map_current_finding_omission/);

    writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), `version: "0.1"
findings:
  - id: W2F-015
    affected_topics: [topic-a]
    created_in_rerun_count: 1
`);
    const future = runInspect('inspect-wave2-output.mjs', bundle).output;
    assert.match(future.inspect.join('\n'), /return_map_finding_projection_field.*W2F-015\.created_in_rerun_count/);
    assert.doesNotMatch(future.inspect.join('\n'), /return_map_current_finding_omission/);

    writeFileSync(join(bundle, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: "0"\n');
    const malformedProfile = runInspect('inspect-wave2-output.mjs', bundle).output;
    assert.ok(malformedProfile.check.failed_rule_ids.includes('return_map_profile_round_authority'));
    assert.equal(malformedProfile.check.failed_rule_ids.includes('return_map_finding_projection_field'), false);
    assert.doesNotMatch(malformedProfile.inspect.join('\n'), /return_map_current_finding_omission/);
    const profileHint = malformedProfile.hints.find((hint) => hint.rule_id === 'return_map_profile_round_authority');
    assert.equal(profileHint.repair_kind, 'missing_contract');
    assert.match(profileHint.write_to, /profile authority/);
  });

  it('does not make Wave2 validate a Wave1-owned shared-pending entry', () => {
    const bundle = createTempDir('inspect-w2-pending-owner');
    writeCommon(bundle);
    writeFileSync(join(bundle, 'reference/topic-a-a.md'), referenceWithReturnMap());
    writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), 'version: "0.1"\nfindings: []\n');
    writeSeed(bundle, `## 当前判断\n\n## 待验证问题\n${canonicalWave1ReturnMap()}`);

    const output = runInspect('inspect-wave2-output.mjs', bundle).output;
    assert.doesNotMatch(output.inspect.join('\n'), /return_map_missing_wave2_refs|return_map_missing_finding_id|return_map_missing_fields/);
  });
});
