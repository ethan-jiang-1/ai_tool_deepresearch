// @impl FDB-001, FDB-002

import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { evaluateFinalDeliveryBacking } from '../../../DPT_FRAMEWORK/engine/helpers/final-delivery-backing.mjs';
import {
  claimAndSubmitFixtureWorkUnit,
  claimWorkUnitsViaCli,
  closeWorkUnitViaCli,
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  referenceContent,
  sourceYamlContent,
  wave1EvidenceSummaryContent,
  writeFixtureResultForWorkUnit,
  writeWave0Scaffold,
  writeWave1Scaffold,
} from '../../../experiments_env/shared/work-unit-playbook-utils.mjs';

const roots = [];

function bundleRoot(label) {
  const bundle = mkdtempSync(path.join(tmpdir(), `dpt-final-backing-${label}-`));
  roots.push(bundle);
  mkdirSync(path.join(bundle, 'final', 'nested'), { recursive: true });
  mkdirSync(path.join(bundle, '_logs'), { recursive: true });
  return bundle;
}

function submittedWave0Bundle() {
  const bundle = bundleRoot('wave0');
  writeWave0Scaffold(bundle, { syntheticWave0Trace: false });
  const sourcePath = 'artifacts/wave0/topic-a/source.yaml';
  const submitted = claimAndSubmitFixtureWorkUnit(bundle, {
    phase: 'wave0',
    queue_item_id: 'final-backing-wave0-source',
    topic_slug: 'topic-a',
    output_path: sourcePath,
    role: 'source_yaml',
    source_url: 'https://evidence.example.test/wave0/source',
    source_slug: 'final-backing-source',
    output_content: sourceYamlContent({
      source_url: 'https://evidence.example.test/wave0/source',
      topic_slug: 'topic-a',
    }),
  });
  assert.equal(submitted.submit.ok, true, JSON.stringify(submitted.submit));
  return { bundle, sourcePath };
}

function submittedWave1Bundle() {
  const bundle = bundleRoot('wave1');
  writeWave1Scaffold(bundle);
  const sourceUrl = 'https://evidence.example.test/wave1/deepening';
  const referencePath = 'reference/topic-a-deepening.md';
  const evidencePath = 'artifacts/wave1/topic-a/evidence-summary.md';
  const submitted = claimAndSubmitFixtureWorkUnit(bundle, {
    phase: 'wave1',
    queue_item_id: 'final-backing-wave1-deepening',
    topic_slug: 'topic-a',
    output_path: referencePath,
    role: 'reference',
    source_url: sourceUrl,
    source_slug: 'final-backing-deepening',
    output_content: referenceContent({ source_url: sourceUrl, topic_slug: 'topic-a' }),
    extra_output_files: [{
      path: evidencePath,
      role: 'evidence_summary',
      content: wave1EvidenceSummaryContent({ source_url: sourceUrl, topic_slug: 'topic-a' }),
    }],
  });
  assert.equal(submitted.submit.ok, true, JSON.stringify(submitted.submit));
  return { bundle, referencePath, evidencePath };
}

function failedWave1Bundle() {
  const bundle = bundleRoot('failed-wave1');
  writeWave1Scaffold(bundle);
  const evidencePath = 'artifacts/wave1/topic-a/evidence-summary.md';
  const sourceUrl = 'https://evidence.example.test/wave1/failed-attempt';
  const task = queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: 'final-backing-failed-wave1',
    topic_slug: 'topic-a',
    title: 'Failed fixture attempt',
  });
  enqueueWorkUnitTask(bundle, task);
  const claim = claimWorkUnitsViaCli(bundle, { phase: 'wave1' });
  const workId = claim.claimed_work_ids.at(-1);
  assert.ok(workId, JSON.stringify(claim));
  writeFixtureResultForWorkUnit(bundle, {
    work_id: workId,
    output_path: 'reference/topic-a-failed.md',
    role: 'reference',
    source_url: sourceUrl,
    source_slug: 'failed-attempt',
    output_content: referenceContent({ source_url: sourceUrl, topic_slug: 'topic-a' }),
    extra_output_files: [{
      path: evidencePath,
      role: 'evidence_summary',
      content: wave1EvidenceSummaryContent({ source_url: sourceUrl, topic_slug: 'topic-a' }),
    }],
  });
  const failed = closeWorkUnitViaCli(bundle, {
    command: 'fail',
    work_id: workId,
    reason: 'fixture failed after writing candidate output',
  });
  assert.equal(failed.status, 'failed', JSON.stringify(failed));
  return { bundle, evidencePath };
}

function report(rows, { heading = '## Evidence Map', columns = ['Finding ID', 'Declared Key Finding', 'Submitted Backing'] } = {}) {
  return [
    '# Final Report',
    '',
    heading,
    '',
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows,
    '',
    '## Narrative',
    'This prose is intentionally outside the bounded declaration parser.',
    '',
  ].join('\n');
}

function mapRow(findingId, declaration, backing) {
  return `| ${findingId} | ${declaration} | ${backing} |`;
}

function evaluate(bundle, markdown, target = 'final/report.md') {
  return evaluateFinalDeliveryBacking({ bundlePath: bundle, target, markdown });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('Final delivery backing evaluator', () => {
  it('accepts a target-relative submitted source declaration without judging the claim prose', () => {
    const { bundle, sourcePath } = submittedWave0Bundle();
    const declaration = 'This deliberately overstates the source; semantic adequacy is not evaluated here.';
    const markdown = [
      '# Final Report',
      '',
      '###   evidence   map   ',
      '',
      '| Submitted Backing | Declared Key Finding | Finding ID |',
      '| --- | --- | --- |',
      `| [source](../../${sourcePath}) | ${declaration} | F-001 |`,
      `| [same source](../../${sourcePath}) | ${declaration} | F-001 |`,
      '',
    ].join('\n');
    const result = evaluate(bundle, markdown, 'final/nested/report.MD');

    assert.equal(result.check.passed, true, JSON.stringify(result));
    assert.equal(result.check.declared_finding_count, 1);
    assert.equal(result.check.backing_link_count, 2);
    assert.deepEqual(result.inspect, []);
  });

  it('accepts direct submitted evidence summaries and submitted-backed reference projections', () => {
    const { bundle, evidencePath, referencePath } = submittedWave1Bundle();
    const result = evaluate(bundle, report([
      mapRow('F-001', 'One bounded finding.', `[summary](../${evidencePath})`),
      mapRow('F-001', 'One bounded finding.', `[reference](../${referencePath})`),
    ]));

    assert.equal(result.check.passed, true, JSON.stringify(result));
    assert.equal(result.check.declared_finding_count, 1);
    assert.equal(result.check.backing_link_count, 2);
  });

  it('reports one smallest structural declaration fact for absent, empty, and malformed maps', () => {
    const { bundle, sourcePath } = submittedWave0Bundle();
    const cases = [
      ['# Final\n', 'evidence_map_missing'],
      ['## Evidence Map\n\nA declaration table is required here.\n', 'evidence_map_table_missing'],
      ['## Evidence Map\n\n| Finding ID | Declared Key Finding | Submitted Backing |\n| --- | --- | --- |\n', 'evidence_map_empty'],
      [report([mapRow('F-001', 'Claim', `[source](../${sourcePath})`)], {
        columns: ['Finding ID', 'Declared Key Finding', 'Other'],
      }), 'evidence_map_columns_invalid'],
      [report([mapRow('F-001', '', `[source](../${sourcePath})`)]), 'evidence_map_row_incomplete'],
      [report([mapRow('F-001', 'First claim', `[source](../${sourcePath})`), mapRow('F-001', 'Different claim', `[source](../${sourcePath})`)]), 'evidence_map_declaration_conflict'],
      [report([mapRow('F-001', 'Claim', 'plain text only')]), 'evidence_map_backing_link_missing'],
      [`## Evidence Map\n\n| Finding ID | Declared Key Finding | Submitted Backing |\n| --- | --- | --- |\n| F-001 | Claim | [source](../${sourcePath}) |\n\n| Finding ID | Declared Key Finding | Submitted Backing |\n| --- | --- | --- |\n| F-002 | Another claim | [source](../${sourcePath}) |\n`, 'evidence_map_table_ambiguous'],
      [`## Evidence Map\n\n| Finding ID | Declared Key Finding | Submitted Backing |\n| --- | --- | --- |\n| F-001 | Claim | [source](../${sourcePath}) |\n\n## Evidence Map\n\n| Finding ID | Declared Key Finding | Submitted Backing |\n| --- | --- | --- |\n| F-002 | Claim | [source](../${sourcePath}) |\n`, 'evidence_map_ambiguous'],
    ];

    for (const [markdown, code] of cases) {
      const result = evaluate(bundle, markdown);
      assert.equal(result.check.passed, false, `${code}: ${JSON.stringify(result)}`);
      assert.equal(result.inspect[0].code, code);
      assert.equal(result.advice[0].operation, 'persist-final-report');
    }
  });

  it('fails closed for unsafe, filesystem-only, cache, Final, index, and symlink links', () => {
    const { bundle, sourcePath } = submittedWave0Bundle();
    const sourceAbsolute = path.join(bundle, sourcePath);
    const symlinkPath = 'artifacts/wave0/topic-a/source-link.yaml';
    symlinkSync(sourceAbsolute, path.join(bundle, symlinkPath));
    mkdirSync(path.join(bundle, '_cache', 'only'), { recursive: true });
    mkdirSync(path.join(bundle, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
    mkdirSync(path.join(bundle, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(path.join(bundle, '_cache', 'only', 'page.md'), 'cache only\n');
    writeFileSync(path.join(bundle, 'final', 'prior.md'), 'old Final\n');
    writeFileSync(path.join(bundle, 'artifacts', 'wave1', 'topic-a', 'unsubmitted.md'), 'unsubmitted\n');
    writeFileSync(path.join(bundle, 'artifacts', 'wave2', 'finding-index.yaml'), 'findings: []\n');

    const cases = [
      ['[absolute](/tmp/not-backing.md)', 'unsafe_backing_href'],
      ['[escape](../../outside.md)', 'backing_path_escapes_bundle'],
      [`[symlink](../${symlinkPath})`, 'backing_path_symlink'],
      ['[cache](../_cache/only/page.md)', 'cache_only_not_backing'],
      ['[final](prior.md)', 'final_output_not_backing'],
      ['[index](../reference/_INDEX.md)', 'reference_index_not_backing'],
      ['[finding index](../artifacts/wave2/finding-index.yaml)', 'synthesis_index_not_backing'],
      ['[unsubmitted](../artifacts/wave1/topic-a/unsubmitted.md)', 'submitted_direct_backing_missing'],
    ];
    for (const [backing, code] of cases) {
      const result = evaluate(bundle, report([mapRow('F-001', 'Claim', backing)]));
      assert.equal(result.check.passed, false, `${code}: ${JSON.stringify(result)}`);
      assert.equal(result.inspect[0].code, code);
    }
  });

  it('rejects a disk artifact left by a real failed work-unit attempt', () => {
    const { bundle, evidencePath } = failedWave1Bundle();
    const result = evaluate(bundle, report([
      mapRow('F-001', 'A finding cannot rely on a failed attempt.', `[failed evidence](../${evidencePath})`),
    ]));

    assert.equal(result.check.passed, false, JSON.stringify(result));
    assert.equal(result.inspect[0].code, 'submitted_direct_backing_missing');
  });
});
