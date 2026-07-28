// @impl RRM-007, IOC-005
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractConcreteReferenceRefs,
  extractExactProjectionIdentities,
  extractReturnMapEntries,
  extractSeedFamilyEntries,
  extractSeedSectionFamily,
  evaluateSeedTopicProjectionReadiness,
  isEvidenceBearingReturnMapEntry,
  isLimitationReturnMapEntry,
  validateReturnMapContent,
} from '../../../DPT_FRAMEWORK/engine/helpers/return-map.mjs';
import { applyCanonicalTopicState } from '../../../DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';
import { buildCanonicalTopicRegistryFact } from '../../../DPT_FRAMEWORK/engine/helpers/topic-registry-fact.mjs';
import { claimAndSubmitWorkUnit } from '../work-unit-test-helpers.mjs';

const createdDirs = [];

function tempBundle() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'return-map-'));
  createdDirs.push(dir);
  mkdirSync(path.join(dir, 'reference'), { recursive: true });
  return dir;
}

function writeRef(dir, ref = 'reference/topic-a-source.md') {
  mkdirSync(path.dirname(path.join(dir, ref)), { recursive: true });
  writeFileSync(path.join(dir, ref), '# Reference\n\nEvidence.\n');
  return ref;
}

function entry({ entryId = null, refs = ['reference/topic-a-source.md'], relationship = 'supports', status = 'supported', nextHop = 'Read the reference file.' } = {}) {
  return [
    ...(entryId ? [`- entry_id: ${entryId}`, '  evidence_meaning: Source explains a concrete mechanism.'] : ['- evidence_meaning: Source explains a concrete mechanism.']),
    `  relationship: ${relationship}`,
    '  refs:',
    ...refs.map((ref) => `    - ${ref}`),
    `  status: ${status}`,
    `  next_hop: ${nextHop}`,
  ].join('\n');
}

function canonicalWave0Bundle() {
  const dir = tempBundle();
  mkdirSync(path.join(dir, 'seed_topics'), { recursive: true });
  mkdirSync(path.join(dir, '_work_units'), { recursive: true });
  writeFileSync(path.join(dir, 'rb_plan.md'), '---\nplan_basename: return-map-wave0\nderived_topic_count: 0\ntopic_registry_version: "2"\ntopic_registry: []\n---\n# Plan\n');
  writeFileSync(path.join(dir, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: 0\n');
  writeFileSync(path.join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'not_started', current_gate: 'hitl1_recorded', next_gate: 'setup_ready', current_node: 'phases/phase-hitl1.md' }));
  writeFileSync(path.join(dir, 'rb_trace.jsonl'), '');
  const applied = applyCanonicalTopicState({
    bundlePath: dir,
    input: {
      context: 'hitl1',
      actions: [{ action: 'add_topic', title: 'Topic A', slug_stem: 'topic-a', must_answer: ['What matters?'], scope_role: 'primary', depends_on_topic_uids: [] }],
    },
  });
  assert.equal(applied.verdict, 'committed');
  const fact = buildCanonicalTopicRegistryFact(dir);
  return { dir, topic: fact.topic_registry[0] };
}

function sourceArrayYaml(topicSlug) {
  return [
    '- url: https://example.com/duplicate',
    '  title: Duplicate one',
    '  retrieved_date: 2026-07-20',
    `  topic_tag: ${topicSlug}`,
    '- url: https://example.com/duplicate',
    '  title: Duplicate two',
    '  retrieved_date: 2026-07-20',
    `  topic_tag: ${topicSlug}`,
    '',
  ].join('\n');
}

function submitWave0(dir, topic) {
  const submitted = claimAndSubmitWorkUnit(dir, {
    phase: 'wave0',
    queueItemId: 'return-map-wave0',
    preserveQueue: true,
    queueItemOverrides: {
      payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug },
      lineage: { topic_uid: topic.topic_uid, topic_slug: topic.slug, phase: 'wave0' },
    },
    outputs: [{
      path: `artifacts/wave0/${topic.slug}/source.yaml`,
      role: 'source_yaml',
      content: sourceArrayYaml(topic.slug),
    }],
  });
  assert.equal(submitted.submitted.ok, true, JSON.stringify(submitted.submitted));
  return submitted.record;
}

function replaceWave0Token(dir, topic, content) {
  const seedPath = path.join(dir, 'seed_topics', `${topic.slug}.md`);
  const seed = readFileSync(seedPath, 'utf8');
  assert.match(seed, /__BACKFILL_WAVE0_EVIDENCE__/);
  writeFileSync(seedPath, seed.replace('__BACKFILL_WAVE0_EVIDENCE__', content));
}

function evaluateWave0Readiness(dir) {
  return evaluateSeedTopicProjectionReadiness(dir, {
    wave: 'wave0',
    topicRegistryFact: buildCanonicalTopicRegistryFact(dir),
  });
}

describe('return-map diagnostics', () => {
  after(() => {
    for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
  });

  it('reports missing minimum fields as blocking when the finding is counted into inspect failure', () => {
    const result = validateReturnMapContent(
      '- https://example.com/source\n- reference/00-shared-source.md\n',
      'seed_topics/topic-a.md',
    );

    assert.equal(result.passed, false);
    assert.equal(result.diagnosticOnly, false);
    assert.equal(result.classification, 'blocking');
    assert.deepEqual(result.missingFields, ['evidence_meaning', 'relationship', 'refs', 'status', 'next_hop']);
    assert.match(result.inspect.join('\n'), /return_map_missing_fields/);
    assert.match(result.inspect.join('\n'), /Classification: blocking/);
  });

  it('accepts the canonical return-map fields', () => {
    const dir = tempBundle();
    writeRef(dir, 'reference/00-shared-aidlc-origin.md');
    const result = validateReturnMapContent(
      [
        '- evidence_meaning: AWS/Raja SP evidence refutes bottom-up origin.',
        '  relationship: refutes',
        '  refs:',
        '    - reference/00-shared-aidlc-origin.md',
        '    - artifacts/wave0/topic-a/source.yaml',
        '    - _cache/wave0/primary/topic-a/aidlc-origin/',
        '    - _work_units/wave0/wu-w0-b000-src-i0001/result.json',
        '  status: refuted',
        '  next_hop: Read provenance confirmation sources next.',
      ].join('\n'),
      'seed_topics/topic-a.md',
      { bundlePath: dir, requireConcreteReferenceNavigation: true },
    );

    assert.equal(result.passed, true, result.inspect.join('\n'));
    assert.equal(result.diagnosticOnly, true);
    assert.equal(result.classification, 'diagnostic-only');
  });

  it('requires exact canonical enum values rather than substring matches', () => {
    for (const invalid of [
      entry({ relationship: 'supports with caveat' }),
      entry({ status: 'unsupported' }),
      entry({ status: 'openly' }),
      entry({ status: 'partially' }),
    ]) {
      const result = validateReturnMapContent(invalid, 'seed_topics/topic-a.md');
      assert.equal(result.passed, false);
      assert.ok(result.findings.some((finding) => ['return_map_relationship', 'return_map_status'].includes(finding.rule_id)));
    }
  });

  it('accepts balanced bold field labels without weakening canonical validation', () => {
    const dir = tempBundle();
    writeRef(dir);
    const bold = entry().replace(/(evidence_meaning|relationship|refs|status|next_hop):/g, '**$1**:');
    const result = validateReturnMapContent(bold, 'seed_topics/topic-a.md', {
      bundlePath: dir,
      requireConcreteReferenceNavigation: true,
    });
    assert.equal(result.passed, true, result.inspect.join('\n'));
    assert.deepEqual(Object.keys(result.entries[0].fields), ['evidence_meaning', 'relationship', 'refs', 'status', 'next_hop']);

    const misspelled = validateReturnMapContent(bold.replace('**evidence_meaning**:', '**evidence_meanng**:'), 'seed_topics/topic-a.md');
    assert.equal(misspelled.passed, false);
    assert.deepEqual(misspelled.missingFields, ['evidence_meaning']);

    const underscore = validateReturnMapContent(bold.replace('**evidence_meaning**:', '__evidence_meaning__:'), 'seed_topics/topic-a.md');
    assert.equal(underscore.passed, false);
    assert.deepEqual(underscore.missingFields, ['evidence_meaning']);
  });

  it('requires evidence-bearing entries to include concrete existing reference files', () => {
    const dir = tempBundle();

    const internalOnly = validateReturnMapContent(
      entry({ refs: ['artifacts/wave1/topic-a/evidence-summary.md', '_cache/wave1/primary/topic-a/source', '_work_units/wave1/wu-w1-b000-deep-i0001'] }),
      'seed_topics/topic-a.md',
      { bundlePath: dir, requireConcreteReferenceNavigation: true },
    );
    assert.equal(internalOnly.passed, false);
    assert.match(internalOnly.inspect.join('\n'), /return_map_missing_concrete_reference/);
    assert.match(internalOnly.inspect.join('\n'), /found only internal provenance refs/);

    const glob = validateReturnMapContent(
      entry({ refs: ['reference/topic-a-*.md（8 个）'] }),
      'seed_topics/topic-a.md',
      { bundlePath: dir, requireConcreteReferenceNavigation: true },
    );
    assert.equal(glob.passed, false);
    assert.match(glob.inspect.join('\n'), /return_map_concrete_reference/);
    assert.match(glob.inspect.join('\n'), /glob\/count summaries/);

    const missing = validateReturnMapContent(
      entry({ refs: ['reference/topic-a-missing.md'] }),
      'seed_topics/topic-a.md',
      { bundlePath: dir, requireConcreteReferenceNavigation: true },
    );
    assert.equal(missing.passed, false);
    assert.match(missing.inspect.join('\n'), /does not exist under the active bundle root/);

    writeRef(dir);
    const concrete = validateReturnMapContent(
      entry(),
      'seed_topics/topic-a.md',
      { bundlePath: dir, requireConcreteReferenceNavigation: true },
    );
    assert.equal(concrete.passed, true, concrete.inspect.join('\n'));
  });

  it('allows explicit limitation entries to omit concrete reference files', () => {
    const result = validateReturnMapContent(
      entry({
        refs: ['none'],
        relationship: 'defers',
        status: 'deferred',
        nextHop: 'limitation: no materializable evidence; defer to HITL2.',
      }),
      'seed_topics/topic-a.md',
      { bundlePath: tempBundle(), requireConcreteReferenceNavigation: true },
    );

    assert.equal(result.passed, true, result.inspect.join('\n'));
    assert.equal(isLimitationReturnMapEntry(result.entries[0]), true);
    assert.equal(isEvidenceBearingReturnMapEntry(result.entries[0]), false);
  });

  it('extracts only flat concrete reference refs and rejects glob or count refs', () => {
    const dir = tempBundle();
    writeRef(dir);
    const extracted = extractConcreteReferenceRefs(
      [
        'reference/topic-a-source.md',
        'reference/topic-a-*.md (8 files)',
        'reference/nested/source.md',
      ].join('\n'),
      { bundlePath: dir },
    );

    assert.deepEqual(extracted.refs, ['reference/topic-a-source.md']);
    assert.deepEqual(extracted.rejectedRefs.map((ref) => ref.reason), ['glob_or_count_summary', 'not_concrete_reference_md']);
  });

  it('isolates canonical target section families with suffixes and repeated bounded headings', () => {
    const content = [
      '## 本轮新增证据', entry(),
      '## 本轮新增机制理解（rerun_count=2）', entry({ refs: ['reference/mechanism.md'] }),
      '## 本轮新增趋势与难点 - 更新', entry({ refs: ['reference/trend.md'] }),
      '## 其他', entry({ refs: ['reference/outside.md'] }),
      '## 本轮新增趋势与难点', entry({ refs: ['reference/trend-2.md'] }),
    ].join('\n');
    const family = extractSeedSectionFamily(content, 'wave1');
    assert.equal(family.sections.length, 3);
    assert.doesNotMatch(family.sections.map((section) => section.content).join('\n'), /outside\.md/);
    assert.match(family.sections.map((section) => section.content).join('\n'), /trend-2\.md/);
    assert.equal(extractSeedSectionFamily(content, 'wave0').sections.length, 1);
  });

  it('blocks prose-only Wave1 content instead of borrowing complete Wave0 fields', () => {
    const content = [
      '## 本轮新增证据',
      entry(),
      '## 本轮新增机制理解',
      'This Wave1 section is only free-form prose and is intentionally long enough to be material, but it has no local return-map fields.',
    ].join('\n');
    const family = extractSeedFamilyEntries(content, 'wave1');
    assert.equal(family.entries.length, 0);
    const result = validateReturnMapContent(family.sections[0].content, 'seed_topics/topic-a.md');
    assert.equal(result.passed, false);
    assert.ok(result.findings.some((finding) => finding.rule_id === 'return_map_unsupported_prose'));
  });

  it('keeps optional entry_id and exact identities entry-local', () => {
    const workId = 'wu-w1-b000-deep-i0001';
    const content = `## 本轮新增机制理解
- entry_id: ${workId}/1
  evidence_meaning: Bound mechanism.
  relationship: defers
  refs: none
  status: deferred
  next_hop: limitation: defer to HITL2.

## 本轮新增趋势与难点

## 待验证问题`;
    const selected = extractSeedFamilyEntries(content, 'wave1');
    assert.equal(selected.entries.length, 1);
    assert.equal(selected.entries[0].metadata.entry_id, `${workId}/1`);
    assert.deepEqual([...extractExactProjectionIdentities(selected.entries[0]).workIds], [workId]);

    const peer = extractReturnMapEntries(`- entry_id: ${workId}/1
- evidence_meaning: Peer item must not inherit identity.
  relationship: defers
  refs: none
  status: deferred
  next_hop: limitation: defer to HITL2.`);
    assert.equal(peer.length, 2);
    assert.deepEqual(peer[0].metadataIssues, ['dangling_entry_id']);
    assert.deepEqual([...extractExactProjectionIdentities(peer[0]).rawMetadataWorkIds], [workId]);
    assert.equal(peer[1].metadata.entry_id, undefined);
    assert.deepEqual([...extractExactProjectionIdentities(peer[1]).workIds], []);

    const duplicate = extractReturnMapEntries(`${entry({ refs: ['none'] })}
  entry_id: ${workId}/1
  entry_id: ${workId}/2`);
    assert.deepEqual(duplicate[0].metadataIssues, ['duplicate_entry_id']);
    assert.deepEqual([...extractExactProjectionIdentities(duplicate[0]).rawMetadataWorkIds], [workId]);
    assert.deepEqual([...extractExactProjectionIdentities(duplicate[0]).workIds], []);
  });

  it('requires one exact Wave0 candidate entry per current declared source position', () => {
    const partial = canonicalWave0Bundle();
    const partialRecord = submitWave0(partial.dir, partial.topic);
    writeRef(partial.dir);
    replaceWave0Token(partial.dir, partial.topic, entry({ entryId: `${partialRecord.work_id}/1` }));
    const omission = evaluateWave0Readiness(partial.dir);
    assert.equal(omission.passed, false);
    const missing = omission.findings.filter((finding) => finding.rule_id === 'return_map_current_candidate_omission');
    assert.equal(missing.length, 1);
    assert.match(missing[0].detail, new RegExp(`${partialRecord.work_id}/2`));
    assert.doesNotMatch(missing[0].detail, new RegExp(`${partialRecord.work_id}/1`));

    const complete = canonicalWave0Bundle();
    const completeRecord = submitWave0(complete.dir, complete.topic);
    writeRef(complete.dir);
    replaceWave0Token(complete.dir, complete.topic, [
      entry({ entryId: `${completeRecord.work_id}/1` }),
      entry({
        entryId: `${completeRecord.work_id}/2`,
        refs: ['none'],
        relationship: 'defers',
        status: 'deferred',
        nextHop: 'limitation: no materializable evidence; defer to HITL2.',
      }),
    ].join('\n\n'));
    const resolved = evaluateWave0Readiness(complete.dir);
    assert.equal(resolved.passed, true, resolved.inspect.join('\n'));
  });

  it('does not let bare, malformed, or out-of-range Wave0 identities hide candidate omissions', () => {
    const bare = canonicalWave0Bundle();
    const bareRecord = submitWave0(bare.dir, bare.topic);
    writeRef(bare.dir);
    replaceWave0Token(bare.dir, bare.topic, entry({ refs: [bareRecord.work_id, 'reference/topic-a-source.md'] }));
    const bareResult = evaluateWave0Readiness(bare.dir);
    assert.equal(bareResult.passed, false);
    assert.equal(bareResult.findings.filter((finding) => finding.rule_id === 'return_map_current_candidate_omission').length, 2);
    assert.equal(bareResult.findings.some((finding) => finding.rule_id === 'seed_projection_entry_identity'), false);

    const invalid = canonicalWave0Bundle();
    const invalidRecord = submitWave0(invalid.dir, invalid.topic);
    writeRef(invalid.dir);
    replaceWave0Token(invalid.dir, invalid.topic, entry({ entryId: `${invalidRecord.work_id}/3` }));
    const invalidResult = evaluateWave0Readiness(invalid.dir);
    assert.equal(invalidResult.passed, false);
    assert.equal(invalidResult.findings.filter((finding) => finding.rule_id === 'seed_projection_entry_identity').length, 1);
    assert.equal(invalidResult.findings.some((finding) => finding.rule_id === 'return_map_current_candidate_omission'), false);
  });

  it('returns a Wave0 candidate parent root before inspecting dependent Seed Topic omissions', () => {
    const broken = canonicalWave0Bundle();
    submitWave0(broken.dir, broken.topic);
    writeFileSync(path.join(broken.dir, 'artifacts/wave0', broken.topic.slug, 'source.yaml'), 'not: an array\n');
    const result = evaluateWave0Readiness(broken.dir);
    assert.equal(result.passed, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].rule_id, 'wave0_candidate_direct_output');
    assert.equal(result.findings[0].checkpoint_context.direct_root.code, 'source_metadata_top_level_array_missing');
    assert.equal(result.findings.some((finding) => /candidate_omission|seed_projection_token/.test(finding.rule_id)), false);
  });

  it('selects shared pending ownership only from exact parsed W2F refs', () => {
    const content = `## 当前判断

## 待验证问题
${entry({ refs: ['reference/a.md'], nextHop: 'Consider W2F-015 later.' })}
${entry({ refs: ['W2F-015', 'reference/b.md'] })}`;
    const wave1 = extractSeedFamilyEntries(content, 'wave1').entries;
    const wave2 = extractSeedFamilyEntries(content, 'wave2').entries;
    assert.equal(wave1.length, 1);
    assert.equal(wave2.length, 1);
    assert.deepEqual([...extractExactProjectionIdentities(wave2[0]).findingIds], ['W2F-015']);

    const refsProse = `## 待验证问题\n${entry({ refs: ['Discuss W2F-015 later.'] })}`;
    assert.equal(extractSeedFamilyEntries(refsProse, 'wave1').entries.length, 1);
    assert.equal(extractSeedFamilyEntries(refsProse, 'wave2').entries.length, 0);
  });

  it('rejects prefix and prose work ids while accepting exact refs tokens', () => {
    const workId = 'wu-w1-b000-deep-i0001';
    const exact = extractReturnMapEntries(entry({ refs: [workId] }))[0];
    const path = extractReturnMapEntries(entry({ refs: [`_work_units/wave1/${workId}/result.json`] }))[0];
    const prefix = extractReturnMapEntries(entry({ refs: [`${workId}0`] }))[0];
    const refsProse = extractReturnMapEntries(entry({ refs: [`Discuss ${workId} later.`] }))[0];
    const prose = extractReturnMapEntries(entry({ refs: ['none'], nextHop: `Discuss ${workId} later.` }))[0];
    assert.deepEqual([...extractExactProjectionIdentities(exact).workIds], [workId]);
    assert.deepEqual([...extractExactProjectionIdentities(path).workIds], [workId]);
    assert.deepEqual([...extractExactProjectionIdentities(prefix).workIds], []);
    assert.deepEqual([...extractExactProjectionIdentities(refsProse).workIds], []);
    assert.deepEqual([...extractExactProjectionIdentities(prose).workIds], []);

    const findingProse = extractReturnMapEntries(entry({ refs: ['Discuss W2F-015 later.'] }))[0];
    assert.deepEqual([...extractExactProjectionIdentities(findingProse).findingIds], []);
  });

  it('requires Wave1 artifact lineage independently for every evidence entry', () => {
    const dir = tempBundle();
    writeRef(dir);
    const valid = entry({ refs: ['artifacts/wave1/topic-a/evidence-summary.md', 'reference/topic-a-source.md'] });
    const invalid = entry({ refs: ['reference/topic-a-source.md'] });
    const result = validateReturnMapContent(`${valid}\n${invalid}`, 'seed_topics/topic-a.md', {
      bundlePath: dir,
      requireWave1Refs: true,
      requireConcreteReferenceNavigation: true,
    });
    assert.equal(result.passed, false);
    assert.equal(result.findings.filter((finding) => finding.rule_id === 'return_map_missing_wave1_refs').length, 1);
  });
});
