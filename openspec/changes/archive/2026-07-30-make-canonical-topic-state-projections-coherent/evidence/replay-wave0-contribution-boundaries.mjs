#!/usr/bin/env node
// Fixture-backed deterministic replay for C2 task 7.2.
// Candidate files and actor receipt/result inputs are controlled fixtures; this
// script makes no claim about Agent execution. All trace rows it reports are
// emitted by the production bundle/claim/submit paths.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { claimAndSubmitWorkUnit } from '../../../../tests/engine/work-unit-test-helpers.mjs';
import { buildCanonicalTopicRegistryFact } from '../../../../DPT_FRAMEWORK/engine/helpers/topic-registry-fact.mjs';
import { collectEligibleWave0CandidateProjection } from '../../../../DPT_FRAMEWORK/engine/work-unit-projection.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const newBundleCli = path.join(repoRoot, 'experiments_env/shared/new-disposable-bundle.mjs');
const runRoot = mkdtempSync(path.join(os.tmpdir(), 'c2-wave0-contribution-replay-'));

function sourceArray(entries) {
  return entries.map(({ url, title }) => [
    `- url: ${url}`,
    `  title: ${title}`,
    '  retrieved_date: 2026-07-30',
    '  topic_tag: topic-a',
  ].join('\n')).join('\n') + '\n';
}

function installCanonicalTopicFixture(bundlePath) {
  const topic = {
    topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
    id: '01',
    slug: 'topic-a',
    title: 'C2 replay topic',
    must_answer: ['Which submission owns each current source ordinal?'],
    scope_role: 'primary',
    depends_on_topic_uids: [],
    previous_layouts: [],
  };
  writeFileSync(path.join(bundlePath, 'rb_plan.md'), `---\n${JSON.stringify({
    plan_basename: 'c2-wave0-contribution-replay',
    derived_topic_count: 1,
    topic_registry_version: '2',
    topic_registry: [topic],
  }, null, 2)}\n---\n# C2 replay plan\n`);
  writeFileSync(path.join(bundlePath, 'seed_topics', 'topic-a.md'), `---\n${JSON.stringify({
    topic_uid: topic.topic_uid,
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    must_answer: topic.must_answer,
    scope_role: topic.scope_role,
    depends_on_topic_uids: topic.depends_on_topic_uids,
  }, null, 2)}\n---\n# ${topic.title}\n`);
}

function submittedContributions(bundlePath) {
  return readFileSync(path.join(bundlePath, 'rb_output_declarations.jsonl'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line))
    .map((row) => ({
      work_id: row.work_id,
      target: row.source_contribution?.target ?? null,
      direct_contract: row.source_contribution?.direct_contract ?? null,
      validated_length: row.source_contribution?.validated_length ?? null,
      semantic_digest: row.source_contribution?.semantic_digest ?? null,
    }));
}

function engineTraceEvents(bundlePath) {
  return readFileSync(path.join(bundlePath, 'rb_trace.jsonl'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((event) => [
      'run_start',
      'work_unit_claimed',
      'work_unit_batch_claimed',
      'work_unit_ledger_appended',
      'work_unit_submitted',
    ].includes(event.event))
    .map((event) => ({ event: event.event, work_id: event.work_id ?? null }));
}

const initialEntries = [
  { url: 'https://example.test/c2-source-1', title: 'C2 source one' },
  { url: 'https://example.test/c2-source-2', title: 'C2 source two' },
];
const appendedEntries = [
  ...initialEntries,
  { url: 'https://example.test/c2-source-3', title: 'C2 source three' },
];

let bundlePath = null;
try {
  const created = spawnSync(process.execPath, [
    newBundleCli,
    'c2-wave0-contribution-replay',
    '--target-dir',
    runRoot,
  ], { encoding: 'utf8', timeout: 10000 });
  assert.equal(created.status, 0, created.stderr || created.stdout);
  bundlePath = created.stdout.trim();
  installCanonicalTopicFixture(bundlePath);

  const initial = claimAndSubmitWorkUnit(bundlePath, {
    queueItemId: 'c2-initial',
    outputs: [{
      path: 'artifacts/wave0/topic-a/source.yaml',
      role: 'source_yaml',
      content: sourceArray(initialEntries),
    }],
  });
  const supplement = claimAndSubmitWorkUnit(bundlePath, {
    queueItemId: 'c2-supplement',
    preserveQueue: true,
    outputs: [{
      path: 'artifacts/wave0/topic-a/source.yaml',
      role: 'source_yaml',
      content: sourceArray(appendedEntries),
    }],
  });

  const registryFact = buildCanonicalTopicRegistryFact(bundlePath);
  const legal = collectEligibleWave0CandidateProjection(bundlePath, { topicRegistryFact: registryFact });
  const legalEntryIds = legal.candidates.map((candidate) => candidate.entry_id);
  assert.equal(legal.passed, true, JSON.stringify(legal));
  assert.deepEqual(legalEntryIds, [
    `${initial.record.work_id}/1`,
    `${initial.record.work_id}/2`,
    `${supplement.record.work_id}/3`,
  ]);

  writeFileSync(
    path.join(bundlePath, 'artifacts/wave0/topic-a/source.yaml'),
    sourceArray([{ ...initialEntries[0], title: 'C2 source one drifted' }, ...appendedEntries.slice(1)]),
  );
  const prefixDrift = collectEligibleWave0CandidateProjection(bundlePath, { topicRegistryFact: registryFact });
  assert.equal(prefixDrift.passed, false, JSON.stringify(prefixDrift));
  assert.equal(prefixDrift.root_findings.length, 1, JSON.stringify(prefixDrift));
  assert.equal(prefixDrift.root_findings[0].rule_id, 'submitted_source_contribution_prefix_drift');
  assert.deepEqual(prefixDrift.candidates, []);

  process.stdout.write(`${JSON.stringify({
    replay_kind: 'fixture_backed_deterministic_production_replay',
    fixture_boundary: 'Controlled candidate/source/receipt/result inputs converge at production claimWorkUnits, submitWorkUnit, and collectEligibleWave0CandidateProjection.',
    excluded_claims: [
      'No Agent search, reading, writing, repair, or host-lifecycle behavior was exercised or claimed.',
      'No trace row was hand-written; listed trace events were emitted by the disposable-bundle, claim, and submit Engine paths.',
    ],
    legal_supplement: {
      submitted_contributions: submittedContributions(bundlePath),
      candidate_entry_ids: legalEntryIds,
    },
    controlled_prefix_drift: {
      passed: prefixDrift.passed,
      candidate_count: prefixDrift.candidates.length,
      root_findings: prefixDrift.root_findings.map((finding) => ({
        rule_id: finding.rule_id,
        repair_kind: finding.repair_kind,
        work_ids: finding.checkpoint_context?.work_ids ?? [],
      })),
    },
    engine_trace_events: engineTraceEvents(bundlePath),
  }, null, 2)}\n`);
} finally {
  rmSync(runRoot, { recursive: true, force: true });
}
