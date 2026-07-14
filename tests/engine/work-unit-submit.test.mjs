// @impl DEW-005, DEW-013, AGQ-002, AGO-002, AGO-003, WPG-002, FRE-005

import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createQueue,
  enqueue,
  loadQueue,
  makeItem,
  saveQueue,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import {
  WORK_UNIT_OUTPUT_LEDGER,
  claimWorkUnits as claimWorkUnitsProduction,
  closeWorkUnitAttempt,
  computeWorkUnitLedgerRecordHash,
  drySubmitWorkUnit,
  inspectWorkUnits,
  lateSubmitWorkUnit,
  loadWorkUnitIndex,
  readWorkUnitLedgerRows,
  recoverWorkUnitDeclaration,
  submitWorkUnit,
  transactionDir,
  workUnitIndexPath,
  workUnitsRoot,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';
import {
  readSubmittedWorkUnitDeclarations,
} from '../../DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs';

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'wu-submit-'));
}

function writeCanonicalPlan(dir, { previous = [] } = {}) {
  const previousLayouts = previous.length > 0
    ? `\n${previous.map((slug, index) => `      - id: "0${index}"\n        slug: ${slug}`).join('\n')}`
    : ' []';
  writeFileSync(path.join(dir, 'rb_plan.md'), `---\nplan_basename: test\nderived_topic_count: 1\ntopic_registry_version: "2"\ntopic_registry:\n  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000\n    id: "01"\n    slug: topic-a\n    title: Topic A\n    must_answer: ["A?"]\n    scope_role: primary\n    depends_on_topic_uids: []\n    previous_layouts:${previousLayouts}\n---\n# Plan\n`);
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function claimWorkUnits(dir, options) {
  const roles = { wave0: 'dpt-source-intake', wave1: 'dpt-evidence-extractor', wave2: 'dpt-topic-scout' };
  return claimWorkUnitsProduction(dir, {
    ...options,
    actorObservation: {
      outcome: 'available',
      source: 'native_probe',
      role_key: roles[options.phase],
      reason_code: 'probe_succeeded',
    },
    executionActorClass: 'delegated_subagent',
  });
}

function delegated(id, overrides = {}) {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { topic_slug: id },
    ...overrides,
  });
}

function delegatedWave1(id, topicSlug = 'topic-a', overrides = {}) {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 } },
    kind: 'wave1_topic_deepening',
    producer_rule: 'wave1_topic_deepening_dispatch',
    payload: { topic_slug: topicSlug },
    ...overrides,
  });
}

function delegatedWave2(id, findingId = 'W2F-001', overrides = {}) {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-topic-scout', timeout_ms: 600000 } },
    kind: 'wave2_targeted_evidence',
    producer_rule: 'targeted_evidence_search',
    payload: { finding_id: findingId, wave: 2 },
    ...overrides,
  });
}

function saveSeedQueue(dir, items) {
  let queue = createQueue(path.basename(dir));
  for (const item of items) queue = enqueue(queue, item);
  saveQueue(dir, queue);
}

function enqueueExisting(dir, item) {
  saveQueue(dir, enqueue(loadQueue(dir), item));
}

function writeCanonicalTwoTopicPlan(dir) {
  writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: test
derived_topic_count: 2
topic_registry_version: "2"
topic_registry:
  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000
    id: "01"
    slug: topic-a
    title: Topic A
    must_answer: ["A?"]
    scope_role: primary
    depends_on_topic_uids: []
    previous_layouts: []
  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174001
    id: "02"
    slug: topic-b
    title: Topic B
    must_answer: ["B?"]
    scope_role: supporting
    depends_on_topic_uids: []
    previous_layouts: []
---
# Plan
`);
}

function ledgerRows(dir) {
  const file = path.join(dir, WORK_UNIT_OUTPUT_LEDGER);
  return readFileSync(file, 'utf-8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeLedgerRows(dir, rows) {
  writeFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER), `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

function claimOneWave0(dir, queueItemId = 'queue-a') {
  saveSeedQueue(dir, [delegated(queueItemId)]);
  claimWorkUnits(dir, { phase: 'wave0', count: 1 });
  return loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
}

function forceTimeout(dir, record, reason = 'deadline-expired') {
  const closed = closeWorkUnitAttempt(dir, {
    work_id: record.work_id,
    status: 'timed_out',
    reason,
    force: true,
  });
  assert.equal(closed.ok, true);
  assert.equal(closed.status, 'timed_out');
  return loadWorkUnitIndex(dir).work_units[record.work_id];
}

function writeValidSubmitFiles(dir, record, { summary = 'done' } = {}) {
  const outputPath = `reference/${record.work_id}.md`;
  mkdirSync(path.join(dir, 'reference'), { recursive: true });
  writeFileSync(path.join(dir, outputPath), '# Source\n\nKey Facts\n');

  const cacheTrail = `_cache/wave0/primary/${record.queue_item_id}/s01_source`;
  mkdirSync(path.join(dir, cacheTrail), { recursive: true });
  writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(dir, cacheTrail, 'page.md'), '# Captured Page\n\nFetched content capture for https://example.com/source. This body preserves the source text used by the work unit.\n');
  writeFileSync(path.join(dir, cacheTrail, 'meta.json'), '{"url":"https://example.com/source"}\n');

  writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-06T00:00:00.000Z',
  })}\n`);

  const resultPath = path.join(dir, '_tmp', `${record.work_id}.result.json`);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary,
    output_files: [{ path: outputPath, role: 'reference', source_url: 'https://example.com/source', source_slug: 'source' }],
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  return resultPath;
}

function writeValidWave1SubmitFiles(dir, record, {
  topicSlug = 'topic-a',
  sourceUrl = 'https://example.com/wave1-new-source',
  includeClaimCacheRefs = true,
  acceptedSourceUrls = [sourceUrl],
  claimStatus = 'accepted',
} = {}) {
  const referencePath = `artifacts/wave1/${topicSlug}/reference/00-new-source.md`;
  const evidencePath = `artifacts/wave1/${topicSlug}/evidence-summary.md`;
  const questionPath = `artifacts/wave1/${topicSlug}/question-list.md`;
  for (const outputPath of [referencePath, evidencePath, questionPath]) {
    mkdirSync(path.dirname(path.join(dir, outputPath)), { recursive: true });
    writeFileSync(path.join(dir, outputPath), `# ${path.basename(outputPath)}\n\nEvidence for ${topicSlug}.\n`);
  }

  const cacheTrail = `_cache/wave1/primary/${record.queue_item_id}/new-source`;
  mkdirSync(path.join(dir, cacheTrail), { recursive: true });
  writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(dir, cacheTrail, 'page.md'), `# Captured Page\n\nFetched content capture for ${sourceUrl}. This body preserves the source text used by the Wave1 work unit.\n`);
  writeFileSync(path.join(dir, cacheTrail, 'meta.json'), `${JSON.stringify({ url: sourceUrl }, null, 2)}\n`);

  writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-06T00:00:00.000Z',
  })}\n`);

  const resultPath = path.join(dir, '_tmp', `${record.work_id}.result.json`);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary: 'wave1 done',
    output_files: [
      { path: referencePath, role: 'reference', source_url: sourceUrl, source_slug: 'new-source' },
      { path: evidencePath, role: 'evidence_summary' },
      { path: questionPath, role: 'question_list' },
    ],
    source_claims: [{
      url: sourceUrl,
      source_ref: referencePath,
      acceptance_status: claimStatus,
      is_new_vs_wave0: true,
      cache_trail_refs: includeClaimCacheRefs ? [cacheTrail] : [],
    }],
    accepted_source_urls: acceptedSourceUrls,
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  return resultPath;
}

function writeValidWave2SubmitFiles(dir, record, {
  findingId = 'W2F-001',
  sourceUrl = 'https://example.com/wave2-targeted-source',
  role = 'evidence_summary',
  outputPath = `artifacts/wave2/targeted/${findingId}.md`,
} = {}) {
  mkdirSync(path.dirname(path.join(dir, outputPath)), { recursive: true });
  writeFileSync(path.join(dir, outputPath), `# Targeted evidence ${findingId}\n\nEvidence for ${findingId}.\n`);

  const cacheTrail = `_cache/wave2/primary/${record.queue_item_id}/targeted-source`;
  mkdirSync(path.join(dir, cacheTrail), { recursive: true });
  writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(dir, cacheTrail, 'page.md'), `# Captured Page\n\nFetched content capture for ${sourceUrl}. This body preserves the source text used by the Wave2 work unit.\n`);
  writeFileSync(path.join(dir, cacheTrail, 'meta.json'), `${JSON.stringify({ url: sourceUrl }, null, 2)}\n`);

  writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-06T00:00:00.000Z',
  })}\n`);

  const resultPath = path.join(dir, '_tmp', `${record.work_id}.result.json`);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary: 'wave2 done',
    output_files: [
      { path: outputPath, role },
    ],
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  return resultPath;
}

function writeSupplementaryWave1SubmitFiles(dir, record, {
  sourceRef,
  sourceUrl = 'https://example.com/wave1-supplementary-source',
} = {}) {
  const outputPath = `artifacts/wave1/${record.queue_item_id}/supplementary-notes.md`;
  mkdirSync(path.dirname(path.join(dir, outputPath)), { recursive: true });
  writeFileSync(path.join(dir, outputPath), '# Supplementary notes\n\nNew source analysis for the claimed attempt.\n');

  const cacheTrail = `_cache/wave1/primary/${record.queue_item_id}/supplementary-source`;
  mkdirSync(path.join(dir, cacheTrail), { recursive: true });
  writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(dir, cacheTrail, 'page.md'), `# Captured Page\n\nFetched supplementary content for ${sourceUrl}.\n`);
  writeFileSync(path.join(dir, cacheTrail, 'meta.json'), `${JSON.stringify({ url: sourceUrl })}\n`);

  writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-06T00:00:00.000Z',
  })}\n`);

  const resultPath = path.join(dir, '_tmp', `${record.work_id}.result.json`);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary: 'supplementary Wave1 source complete',
    output_files: [{ path: outputPath, role: 'other' }],
    source_claims: [{
      url: sourceUrl,
      source_ref: sourceRef,
      acceptance_status: 'accepted',
      is_new_vs_wave0: true,
      cache_trail_refs: [cacheTrail],
    }],
    accepted_source_urls: [sourceUrl],
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  return resultPath;
}

function cacheTrailPath(record) {
  return `_cache/wave0/primary/${record.queue_item_id}/s01_source`;
}

function readResult(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf-8'));
}

function writeResult(pathname, value) {
  writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`);
}

function receiptEvents(dir, record) {
  return readFileSync(path.join(dir, record.paths.runtime_receipt_ref), 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function assignedResult(dir, record) {
  return readResult(path.join(dir, record.paths.result_ref));
}

function assertNoLedger(dir) {
  assert.equal(existsSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), false);
}

function snapshotPath(targetPath) {
  if (!existsSync(targetPath)) return { type: 'missing' };
  const stats = statSync(targetPath);
  if (stats.isDirectory()) {
    return {
      type: 'dir',
      entries: Object.fromEntries(readdirSync(targetPath).sort().map((entry) => [
        entry,
        snapshotPath(path.join(targetPath, entry)),
      ])),
    };
  }
  if (stats.isFile()) {
    return { type: 'file', content: readFileSync(targetPath, 'utf-8') };
  }
  return { type: 'other' };
}

function authoritySnapshot(dir, record, extraRefs = []) {
  const refs = [
    workUnitIndexPath(dir),
    path.join(dir, 'rb_queue.json'),
    path.join(dir, WORK_UNIT_OUTPUT_LEDGER),
    path.join(dir, record.paths.status_ref),
    path.join(dir, record.paths.result_ref),
    path.join(dir, record.paths.runtime_receipt_ref),
    transactionDir(dir),
    path.join(dir, 'rb_trace.jsonl'),
    path.join(dir, '_logs'),
    ...extraRefs.map((ref) => path.join(dir, ref)),
  ];
  return Object.fromEntries(refs.map((ref) => [path.relative(dir, ref), snapshotPath(ref)]));
}

function assertSnapshotEqual(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
}

describe('submitWorkUnit', () => {
  it('preserves current UID binding in the immutable queue snapshot without duplicate ledger fields', () => {
    const dir = tempBundle();
    try {
      writeCanonicalPlan(dir);
      saveSeedQueue(dir, [delegated('queue-a', { payload: { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', topic_slug: 'topic-a' } })]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const manifest = JSON.parse(readFileSync(path.join(dir, record.paths.manifest_ref), 'utf8'));
      assert.equal(manifest.queue_item.payload.topic_uid, 'tp_123e4567-e89b-12d3-a456-426614174000');
      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath: writeValidSubmitFiles(dir, record) });
      assert.equal(submitted.ok, true);
      const row = ledgerRows(dir)[0];
      assert.equal(Object.hasOwn(row, 'topic_uid'), false);
      assert.equal(Object.hasOwn(row, 'topic_slug'), false);
    } finally {
      cleanup(dir);
    }
  });

  it('accepts a previous slug snapshot and rejects a mismatched UID snapshot before ledger write', () => {
    const legacyDir = tempBundle();
    const mismatchDir = tempBundle();
    try {
      writeCanonicalPlan(legacyDir, { previous: ['old-topic-a'] });
      saveSeedQueue(legacyDir, [delegated('queue-legacy', { payload: { topic_slug: 'old-topic-a' } })]);
      claimWorkUnits(legacyDir, { phase: 'wave0', count: 1 });
      let record = loadWorkUnitIndex(legacyDir).work_units['wu-w0-b000-src-i0001'];
      assert.equal(submitWorkUnit(legacyDir, { work_id: record.work_id, resultPath: writeValidSubmitFiles(legacyDir, record) }).ok, true);

      writeCanonicalPlan(mismatchDir);
      saveSeedQueue(mismatchDir, [delegated('queue-mismatch', { payload: { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174001', topic_slug: 'topic-a' } })]);
      claimWorkUnits(mismatchDir, { phase: 'wave0', count: 1 });
      record = loadWorkUnitIndex(mismatchDir).work_units['wu-w0-b000-src-i0001'];
      const rejected = submitWorkUnit(mismatchDir, { work_id: record.work_id, resultPath: writeValidSubmitFiles(mismatchDir, record) });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.last_submit_rejection.reason_code, 'topic_binding_invalid');
      assertNoLedger(mismatchDir);
    } finally {
      cleanup(legacyDir);
      cleanup(mismatchDir);
    }
  });

  it('dry-submits a valid claimed result without ledger, queue, status, result, receipt, trace, log, or transaction side effects', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const before = authoritySnapshot(dir, record, [
        path.join(cacheTrailPath(record), 'page.md'),
        path.join(cacheTrailPath(record), 'page-content.md'),
      ]);

      const dry = drySubmitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(dry.ok, true);
      assert.equal(dry.dry_run, true);
      assert.equal(dry.side_effects, false);
      assert.equal(dry.expected_submit, 'pass');
      assert.deepEqual(dry.reason_codes, []);
      assert.deepEqual(dry.violations, []);
      assert.equal(dry.work_id, record.work_id);
      assert.equal(dry.queue_item_id, record.queue_item_id);

      assertSnapshotEqual(authoritySnapshot(dir, record, [
        path.join(cacheTrailPath(record), 'page.md'),
        path.join(cacheTrailPath(record), 'page-content.md'),
      ]), before, 'dry-submit must not mutate authority surfaces');
      assertNoLedger(dir);
      assert.equal(loadQueue(dir).delegated_in_flight['queue-a'].work_id, record.work_id);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed');

      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'submitted');
      assert.equal(ledgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('dry-submit reports multiple independently evaluable violations without recording submit rejection', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const result = readResult(resultPath);
      result.output_files[0].role = 'question_list';
      writeResult(resultPath, result);
      rmSync(path.join(dir, cacheTrailPath(record), 'websearch.json'), { force: true });
      const before = authoritySnapshot(dir, record, [path.join(cacheTrailPath(record), 'websearch.json')]);

      const dry = drySubmitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(dry.ok, false);
      assert.equal(dry.expected_submit, 'fail');
      assert.equal(dry.dry_run, true);
      assert.equal(dry.side_effects, false);
      assert.ok(dry.violations.some((item) => item.phase === 'output_files' && /role 'question_list'.*allowed roles/i.test(item.message)));
      assert.ok(dry.violations.some((item) => item.phase === 'cache_trails' && /missing websearch\.json/i.test(item.message)));
      assert.equal(dry.violations.find((item) => item.phase === 'output_files').write_to, `${path.resolve(resultPath)}#/output_files/0/role`);
      assert.equal(dry.violations.find((item) => item.phase === 'cache_trails').write_to, path.join(dir, cacheTrailPath(record), 'websearch.json'));
      assert.ok(dry.reason_codes.includes('missing_output'));
      assert.ok(dry.reason_codes.includes('missing_cache'));
      for (const violation of dry.violations) {
        assert.ok(['agent_action', 'engine_operation', 'missing_contract'].includes(violation.repair_kind));
        assert.ok(violation.missing_fact);
        assert.ok(violation.write_to);
        assert.match(violation.rerun, /operate-work-unit\.mjs dry-submit/);
        assert.match(violation.rerun, new RegExp(record.work_id));
      }
      assertSnapshotEqual(authoritySnapshot(dir, record, [path.join(cacheTrailPath(record), 'websearch.json')]), before, 'failed dry-submit must be read-only');
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].last_submit_rejection, undefined);
      assertNoLedger(dir);
    } finally {
      cleanup(dir);
    }
  });

  it('points source/cache URL lineage failures to the exact candidate fact instead of a generic submit wall', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record);
      const result = readResult(resultPath);
      result.source_claims[0].url = 'https://example.com/different-source';
      result.accepted_source_urls = ['https://example.com/different-source'];
      writeResult(resultPath, result);

      const dry = drySubmitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(dry.ok, false);
      const violation = dry.violations.find((item) => item.phase === 'source_claims');
      assert.equal(violation.repair_kind, 'agent_action');
      assert.equal(violation.json_pointer, '/source_claims/0/url');
      assert.equal(violation.write_to, `${path.resolve(resultPath)}#/source_claims/0/url`);
      assert.match(violation.missing_fact, /different URL/i);
      assert.match(violation.rerun, /operate-work-unit\.mjs dry-submit/);
    } finally {
      cleanup(dir);
    }
  });

  it('expands independent candidate schema and binding issues to exact JSON pointers in one dry-submit', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const candidate = readResult(resultPath);
      candidate.schema_version = 'work-unit.result.v999';
      delete candidate.actor_contract_version;
      candidate.execution_actor_class = 'phase_agent_fallback';
      candidate.actor_execution = { execution_actor_class: 'delegated_subagent' };
      candidate.unexpected_result_key = true;
      writeResult(resultPath, candidate);
      const before = authoritySnapshot(dir, record);

      const dry = drySubmitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(dry.ok, false);
      const pointers = new Set(dry.violations.filter((item) => item.phase === 'result').map((item) => item.json_pointer));
      for (const pointer of [
        '/schema_version',
        '/actor_contract_version',
        '/execution_actor_class',
        '/actor_execution',
        '/unexpected_result_key',
      ]) {
        assert.ok(pointers.has(pointer), `missing candidate repair pointer ${pointer}: ${JSON.stringify(dry.violations)}`);
        const violation = dry.violations.find((item) => item.json_pointer === pointer);
        assert.equal(violation.repair_kind, 'agent_action');
        assert.equal(violation.write_to, `${path.resolve(resultPath)}#${pointer}`);
        assert.match(violation.rerun, /operate-work-unit\.mjs dry-submit/);
      }
      assert.equal(dry.violations.filter((item) => item.phase === 'result').length, pointers.size, 'candidate roots must not duplicate the same pointer');
      assertSnapshotEqual(authoritySnapshot(dir, record), before, 'candidate schema dry-submit must remain read-only');
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].last_submit_rejection, undefined);

      const formal = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(formal.ok, false);
      assert.equal(formal.repair_kind, 'agent_action');
      assert.match(formal.rerun, /operate-work-unit\.mjs dry-submit/);
      assert.equal(formal.rerun, formal.violations[0].rerun);
      assert.ok(formal.violations.some((item) => item.json_pointer === '/schema_version'));
      assert.ok(formal.violations.some((item) => item.json_pointer === '/actor_execution'));
      assert.match(formal.advice, /same candidate|dry-submit/i);
      assert.equal(loadQueue(dir).delegated_in_flight[record.queue_item_id].work_id, record.work_id);
      assertNoLedger(dir);
    } finally {
      cleanup(dir);
    }
  });

  it('dry-submit reports canonicalizations through a virtual cache page without persisting result, receipt, or cache aliases', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      writeResult(resultPath, { result: readResult(resultPath) });
      writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
        event: 'work_done',
        actor_contract_version: record.actor_contract_version,
        execution_actor_class: record.actor_execution.execution_actor_class,
        ts: '2026-07-06T00:00:00.000Z',
      })}\n`);
      const cacheDir = path.join(dir, cacheTrailPath(record));
      const pageText = readFileSync(path.join(cacheDir, 'page.md'), 'utf-8');
      rmSync(path.join(cacheDir, 'page.md'), { force: true });
      writeFileSync(path.join(cacheDir, 'page-content.md'), pageText);
      const before = authoritySnapshot(dir, record, [
        path.join(cacheTrailPath(record), 'page.md'),
        path.join(cacheTrailPath(record), 'page-content.md'),
      ]);

      const dry = drySubmitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(dry.ok, true);
      assert.ok(dry.normalizations.some((item) => item.kind === 'result_wrapper_unwrapped'));
      assert.ok(dry.normalizations.some((item) => item.kind === 'receipt_schema_defaulted'));
      assert.ok(dry.normalizations.some((item) => item.kind === 'receipt_binding_identity_autofilled'));
      assert.ok(dry.normalizations.some((item) => item.kind === 'cache_page_content_canonicalized'));
      assert.deepEqual(dry.virtual_cache_pages, [cacheTrailPath(record)]);
      assertSnapshotEqual(authoritySnapshot(dir, record, [
        path.join(cacheTrailPath(record), 'page.md'),
        path.join(cacheTrailPath(record), 'page-content.md'),
      ]), before, 'dry-submit must not persist planned canonicalizations');
      assert.equal(existsSync(path.join(cacheDir, 'page.md')), false);
      assert.equal(existsSync(path.join(dir, record.paths.result_ref)), false);
      assert.equal(readFileSync(path.join(dir, record.paths.runtime_receipt_ref), 'utf-8'), before[record.paths.runtime_receipt_ref].content);

      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(readFileSync(path.join(cacheDir, 'page.md'), 'utf-8'), pageText);
      assert.equal(assignedResult(dir, record).work_id, record.work_id);
      assert.equal(receiptEvents(dir, record)[0].receipt_nonce, record.receipt_nonce);
    } finally {
      cleanup(dir);
    }
  });

  it('dry-submit mirrors caller-provided result path semantics when identity already matches', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const outsidePath = path.join(os.tmpdir(), `${record.work_id}-external-result.json`);
      writeFileSync(outsidePath, readFileSync(resultPath));
      try {
        const dry = drySubmitWorkUnit(dir, { work_id: record.work_id, resultPath: outsidePath });
        assert.equal(dry.ok, true);
        assert.equal(dry.candidate_result_path, path.resolve(outsidePath));
        assert.equal(existsSync(path.join(dir, record.paths.result_ref)), false);

        const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath: outsidePath });
        assert.equal(submitted.ok, true);
        assert.equal(ledgerRows(dir).length, 1);
      } finally {
        rmSync(outsidePath, { force: true });
      }
    } finally {
      cleanup(dir);
    }
  });

  it('submits an out-of-order work unit and completes only the bound queue demand', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a'), delegated('queue-b')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 2 });
      const index = loadWorkUnitIndex(dir);
      const second = index.work_units['wu-w0-b000-src-i0002'];
      const resultPath = writeValidSubmitFiles(dir, second);

      const submitted = submitWorkUnit(dir, { work_id: second.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(submitted.duplicate, false);
      assert.equal(submitted.queue.delegated_in_flight['queue-b'], undefined);
      assert.equal(submitted.queue.terminal_history.some((entry) => entry.queue_item_id === 'queue-b' && entry.work_id === second.work_id), true);

      const queue = loadQueue(dir);
      assert.ok(queue.delegated_in_flight['queue-a']);
      assert.equal(queue.delegated_in_flight['queue-b'], undefined);
      assert.equal(queue.terminal_history.at(-1).queue_item_id, 'queue-b');
      assert.equal(queue.terminal_history.at(-1).work_id, second.work_id);

      const savedIndex = loadWorkUnitIndex(dir);
      assert.equal(savedIndex.work_units[second.work_id].status, 'submitted');
      assert.equal(savedIndex.work_units[second.work_id].result_hash, submitted.result_hash);
      assert.equal(savedIndex.work_units[second.work_id].ledger_record_hash, submitted.ledger_record_hash);
      assert.equal(savedIndex.work_units[second.work_id].late_accept_context, undefined);

      const rows = ledgerRows(dir);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].work_id, second.work_id);
      assert.equal(rows[0].queue_item_id, 'queue-b');
      assert.equal(rows[0].wave, second.wave);
      assert.equal(rows[0].kind, second.kind);
      assert.equal(rows[0].producer_rule, second.producer_rule);
      assert.equal(rows[0].creation_reason, second.creation_reason);
      assert.equal(rows[0].result_ref, second.paths.result_ref);
      assert.equal(rows[0].runtime_receipt_ref, second.paths.runtime_receipt_ref);
      assert.equal(rows[0].receipt_nonce, second.receipt_nonce);
      assert.equal(rows[0].result_hash, submitted.result_hash);
      assert.equal(rows[0].ledger_record_hash, submitted.ledger_record_hash);
      assert.equal(rows[0].work_unit_ref, second.paths.work_unit_dir);
      const submittedRecord = savedIndex.work_units[second.work_id];
      const submittedStatus = JSON.parse(readFileSync(path.join(dir, second.paths.status_ref), 'utf-8'));
      const terminalEntry = queue.terminal_history.find((entry) => entry.work_id === second.work_id);
      assert.equal(rows[0].declared_at, submittedRecord.terminal_at);
      assert.equal(rows[0].declared_at, submittedStatus.updated_at);
      assert.equal(rows[0].declared_at, terminalEntry.completed_at);
      assert.equal(rows[0].ledger_record_hash, computeWorkUnitLedgerRecordHash(rows[0]));
      assert.equal(existsSync(path.join(workUnitsRoot(dir), '_ledger.jsonl')), false);
      assert.equal(readWorkUnitLedgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('fails closed and rolls back when durable queue postcondition is missing', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);

      const failed = submitWorkUnit(dir, {
        work_id: record.work_id,
        resultPath,
        afterQueueSave({ bundleDir }) {
          const queuePath = path.join(bundleDir, 'rb_queue.json');
          const queue = JSON.parse(readFileSync(queuePath, 'utf-8'));
          queue.terminal_history = [];
          writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
        },
      });

      assert.equal(failed.ok, false);
      assert.equal(failed.reason_code, 'queue_postcondition_failed');
      assert.equal(failed.rollback.restored, true);
      assert.equal(failed.suspect_state, false);
      assert.ok(failed.missing_postconditions.some((item) => item.includes('terminal_history')));
      assert.equal(loadQueue(dir).delegated_in_flight['queue-a'].work_id, record.work_id);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed');
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('keeps cache canonicalization inside the submit transaction and removes it on rollback', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const trail = cacheTrailPath(record);
      const pagePath = path.join(dir, trail, 'page.md');
      const sidecarPath = path.join(dir, trail, 'page-content.md');
      writeFileSync(sidecarPath, readFileSync(pagePath));
      rmSync(pagePath);

      const failed = submitWorkUnit(dir, {
        work_id: record.work_id,
        resultPath,
        afterQueueSave({ bundleDir }) {
          const queuePath = path.join(bundleDir, 'rb_queue.json');
          const queue = JSON.parse(readFileSync(queuePath, 'utf-8'));
          queue.terminal_history = [];
          writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
        },
      });

      assert.equal(failed.ok, false);
      assert.equal(failed.rollback.restored, true);
      assert.equal(existsSync(pagePath), false, 'transaction rollback must remove canonical page.md created during commit');
      assert.equal(existsSync(sidecarPath), true);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed');
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('marks work-unit and queue completion suspect when rollback cannot be proven', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const queuePath = path.join(dir, 'rb_queue.json');

      const failed = submitWorkUnit(dir, {
        work_id: record.work_id,
        resultPath,
        afterQueueSave({ bundleDir }) {
          const queue = JSON.parse(readFileSync(queuePath, 'utf-8'));
          queue.terminal_history = [];
          writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
          chmodSync(queuePath, 0o444);
        },
      });

      assert.equal(failed.ok, false);
      assert.equal(failed.reason_code, 'queue_postcondition_failed');
      assert.equal(failed.rollback.restored, false);
      assert.equal(failed.suspect_state, true);
      assert.match(failed.inspect.join('\n'), /suspect/);
      chmodSync(queuePath, 0o644);
    } finally {
      cleanup(dir);
    }
  });

  it('inspect treats ledger as authority and submitted filesystem/index surfaces as cross-checks only', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(inspectWorkUnits(dir).passed, true);

      writeFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER), '');
      const missingLedger = inspectWorkUnits(dir);
      assert.equal(missingLedger.passed, false);
      assert.match(missingLedger.inspect.join('\n'), /submitted work unit missing ledger row/);
    } finally {
      cleanup(dir);
    }
  });

  it('inspect rejects ledger hash drift and unsupported secondary work-unit ledger', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      submitWorkUnit(dir, { work_id: record.work_id, resultPath });

      const [row] = ledgerRows(dir);
      row.cache_trails = [];
      writeFileSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER), `${JSON.stringify(row)}\n`);
      mkdirSync(workUnitsRoot(dir), { recursive: true });
      writeFileSync(path.join(workUnitsRoot(dir), '_ledger.jsonl'), '{}\n');

      const result = inspectWorkUnits(dir);
      assert.equal(result.passed, false);
      assert.match(result.inspect.join('\n'), /unsupported delegated ledger/);
      assert.match(result.inspect.join('\n'), /ledger_record_hash mismatch/);
    } finally {
      cleanup(dir);
    }
  });

  it('is idempotent for same-content duplicate submit and rejects different content', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);

      const first = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      const second = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(second.duplicate, true);
      assert.equal(second.result_hash, first.result_hash);
      assert.equal(ledgerRows(dir).length, 1);

      const changedPath = writeValidSubmitFiles(dir, record, { summary: 'changed' });
      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath: changedPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.reason_code, 'duplicate_content_mismatch');
      assert.equal(ledgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('canonicalizes a single result wrapper and rejects wrapper siblings before ledger append', () => {
    const acceptedDir = tempBundle();
    try {
      saveSeedQueue(acceptedDir, [delegated('queue-a')]);
      claimWorkUnits(acceptedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(acceptedDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(acceptedDir, record);
      const flatResult = readResult(resultPath);
      writeResult(resultPath, { result: flatResult });

      const submitted = submitWorkUnit(acceptedDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(submitted.normalizations.some((item) => item.kind === 'result_wrapper_unwrapped'), true);
      const persisted = assignedResult(acceptedDir, record);
      assert.equal(Object.hasOwn(persisted, 'result'), false);
      assert.equal(persisted.work_id, record.work_id);
      const [row] = ledgerRows(acceptedDir);
      assert.equal(Object.hasOwn(row, 'result'), false);
      assert.equal(row.work_id, record.work_id);
      assert.equal(row.receipt_nonce, record.receipt_nonce);
    } finally {
      cleanup(acceptedDir);
    }

    const rejectedDir = tempBundle();
    try {
      saveSeedQueue(rejectedDir, [delegated('queue-a')]);
      claimWorkUnits(rejectedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(rejectedDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(rejectedDir, record);
      writeResult(resultPath, { result: readResult(resultPath), note: 'unsafe sibling' });

      const rejected = submitWorkUnit(rejectedDir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.match(rejected.inspect.join('\n'), /unsafe result wrapper/);
      assertNoLedger(rejectedDir);
    } finally {
      cleanup(rejectedDir);
    }
  });

  it('canonicalizes missing receipt schema and binding identity while rejecting receipt conflicts', () => {
    const acceptedDir = tempBundle();
    try {
      saveSeedQueue(acceptedDir, [delegated('queue-a')]);
      claimWorkUnits(acceptedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(acceptedDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(acceptedDir, record);
      writeFileSync(path.join(acceptedDir, record.paths.runtime_receipt_ref), `${JSON.stringify({
        event: 'work_done',
        actor_contract_version: record.actor_contract_version,
        execution_actor_class: record.actor_execution.execution_actor_class,
        ts: '2026-07-06T00:00:00.000Z',
        detail: { preserved: true },
      })}\n`);

      const submitted = submitWorkUnit(acceptedDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(submitted.normalizations.some((item) => item.kind === 'receipt_schema_defaulted'), true);
      assert.equal(submitted.normalizations.some((item) => (
        item.kind === 'receipt_binding_identity_autofilled'
          && item.fields.includes('work_id')
          && item.fields.includes('receipt_nonce')
      )), true);
      const [event] = receiptEvents(acceptedDir, record);
      assert.equal(event.schema_version, 'work-unit.receipt-event.v1');
      assert.equal(event.work_id, record.work_id);
      assert.equal(event.queue_item_id, record.queue_item_id);
      assert.equal(event.kind, record.kind);
      assert.equal(event.receipt_nonce, record.receipt_nonce);
      assert.deepEqual(event.detail, { preserved: true });
    } finally {
      cleanup(acceptedDir);
    }

    const cases = [
      {
        name: 'schema conflict',
        event(record) {
          return {
            schema_version: 'work-unit.receipt-event.v999',
            event: 'work_done',
            work_id: record.work_id,
            queue_item_id: record.queue_item_id,
            kind: record.kind,
            receipt_nonce: record.receipt_nonce,
          };
        },
        pattern: /schema_version mismatch/,
      },
      {
        name: 'binding conflict',
        event(record) {
          return {
            event: 'work_done',
            work_id: record.work_id,
            queue_item_id: 'wrong-queue',
            kind: record.kind,
            receipt_nonce: record.receipt_nonce,
          };
        },
        pattern: /runtime receipt mismatch/,
      },
      {
        name: 'invalid jsonl',
        raw: '{"event":"work_done"\n',
        pattern: /invalid JSONL/,
      },
    ];

    for (const testCase of cases) {
      const dir = tempBundle();
      try {
        saveSeedQueue(dir, [delegated('queue-a')]);
        claimWorkUnits(dir, { phase: 'wave0', count: 1 });
        const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
        const resultPath = writeValidSubmitFiles(dir, record);
        const raw = testCase.raw ?? `${JSON.stringify(testCase.event(record))}\n`;
        writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), raw);

        const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
        assert.equal(rejected.ok, false, testCase.name);
        assert.match(rejected.inspect.join('\n'), testCase.pattern, testCase.name);
        assertNoLedger(dir);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('canonicalizes page-content.md cache leaves and rejects divergent or missing authority files', () => {
    const acceptedDir = tempBundle();
    try {
      saveSeedQueue(acceptedDir, [delegated('queue-a')]);
      claimWorkUnits(acceptedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(acceptedDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(acceptedDir, record);
      const cacheDir = path.join(acceptedDir, cacheTrailPath(record));
      const pageText = readFileSync(path.join(cacheDir, 'page.md'), 'utf-8');
      rmSync(path.join(cacheDir, 'page.md'), { force: true });
      writeFileSync(path.join(cacheDir, 'page-content.md'), pageText);

      const submitted = submitWorkUnit(acceptedDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(submitted.normalizations.some((item) => item.kind === 'cache_page_content_canonicalized'), true);
      assert.equal(readFileSync(path.join(cacheDir, 'page.md'), 'utf-8'), pageText);
    } finally {
      cleanup(acceptedDir);
    }

    const sidecarDir = tempBundle();
    try {
      saveSeedQueue(sidecarDir, [delegated('queue-a')]);
      claimWorkUnits(sidecarDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(sidecarDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(sidecarDir, record);
      const cacheDir = path.join(sidecarDir, cacheTrailPath(record));
      writeFileSync(path.join(cacheDir, 'page-content.md'), readFileSync(path.join(cacheDir, 'page.md'), 'utf-8'));

      const submitted = submitWorkUnit(sidecarDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(ledgerRows(sidecarDir).length, 1);
    } finally {
      cleanup(sidecarDir);
    }

    const cases = [
      {
        name: 'divergent page sidecar',
        mutate(dir, record) {
          writeFileSync(path.join(dir, cacheTrailPath(record), 'page-content.md'), '# Different captured page\n');
        },
        pattern: /divergent page\.md and page-content\.md/,
      },
      {
        name: 'missing websearch',
        mutate(dir, record) {
          rmSync(path.join(dir, cacheTrailPath(record), 'websearch.json'), { force: true });
        },
        pattern: /missing websearch\.json/,
      },
      {
        name: 'missing meta',
        mutate(dir, record) {
          rmSync(path.join(dir, cacheTrailPath(record), 'meta.json'), { force: true });
        },
        pattern: /missing meta\.json/,
      },
      {
        name: 'missing page authority',
        mutate(dir, record) {
          rmSync(path.join(dir, cacheTrailPath(record), 'page.md'), { force: true });
          rmSync(path.join(dir, cacheTrailPath(record), 'page-content.md'), { force: true });
        },
        pattern: /missing page\.md/,
      },
    ];

    for (const testCase of cases) {
      const dir = tempBundle();
      try {
        saveSeedQueue(dir, [delegated('queue-a')]);
        claimWorkUnits(dir, { phase: 'wave0', count: 1 });
        const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
        const resultPath = writeValidSubmitFiles(dir, record);
        testCase.mutate(dir, record);

        const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
        assert.equal(rejected.ok, false, testCase.name);
        assert.match(rejected.inspect.join('\n'), testCase.pattern, testCase.name);
        assertNoLedger(dir);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('normalizes stale nonce only for complete binding inside the assigned work-unit directory', () => {
    const acceptedDir = tempBundle();
    try {
      saveSeedQueue(acceptedDir, [delegated('queue-a')]);
      claimWorkUnits(acceptedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(acceptedDir).work_units['wu-w0-b000-src-i0001'];
      const tmpResultPath = writeValidSubmitFiles(acceptedDir, record);
      const assignedResultPath = path.join(acceptedDir, record.paths.result_ref);
      const staleNonce = 'wu-11111111-1111-1111-1111-111111111111';
      const result = readResult(tmpResultPath);
      result.receipt_nonce = staleNonce;
      writeResult(assignedResultPath, result);
      writeFileSync(path.join(acceptedDir, record.paths.runtime_receipt_ref), `${JSON.stringify({
        event: 'work_done',
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        kind: record.kind,
        receipt_nonce: staleNonce,
        actor_contract_version: record.actor_contract_version,
        execution_actor_class: record.actor_execution.execution_actor_class,
        ts: '2026-07-06T00:00:00.000Z',
      })}\n`);

      const submitted = submitWorkUnit(acceptedDir, { work_id: record.work_id, resultPath: assignedResultPath });
      assert.equal(submitted.ok, true);
      assert.equal(submitted.normalizations.filter((item) => item.kind === 'nonce_normalized_from_record').length, 2);
      assert.equal(assignedResult(acceptedDir, record).receipt_nonce, record.receipt_nonce);
      assert.equal(receiptEvents(acceptedDir, record)[0].receipt_nonce, record.receipt_nonce);
    } finally {
      cleanup(acceptedDir);
    }

    const escapedDir = tempBundle();
    try {
      saveSeedQueue(escapedDir, [delegated('queue-a')]);
      claimWorkUnits(escapedDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(escapedDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(escapedDir, record);
      const result = readResult(resultPath);
      result.receipt_nonce = 'wu-22222222-2222-2222-2222-222222222222';
      writeResult(resultPath, result);

      const rejected = submitWorkUnit(escapedDir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.last_submit_rejection.reason_code, 'nonce_mismatch');
      assertNoLedger(escapedDir);
    } finally {
      cleanup(escapedDir);
    }

    const wrongIdentityDir = tempBundle();
    try {
      saveSeedQueue(wrongIdentityDir, [delegated('queue-a')]);
      claimWorkUnits(wrongIdentityDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(wrongIdentityDir).work_units['wu-w0-b000-src-i0001'];
      const tmpResultPath = writeValidSubmitFiles(wrongIdentityDir, record);
      const assignedResultPath = path.join(wrongIdentityDir, record.paths.result_ref);
      const result = readResult(tmpResultPath);
      result.queue_item_id = 'wrong-queue';
      result.receipt_nonce = 'wu-33333333-3333-3333-3333-333333333333';
      writeResult(assignedResultPath, result);

      const rejected = submitWorkUnit(wrongIdentityDir, { work_id: record.work_id, resultPath: assignedResultPath });
      assert.equal(rejected.ok, false);
      assert.match(rejected.inspect.join('\n'), /queue_item_id/);
      assertNoLedger(wrongIdentityDir);
    } finally {
      cleanup(wrongIdentityDir);
    }

    const exactIdentityDir = tempBundle();
    try {
      saveSeedQueue(exactIdentityDir, [delegated('queue-a')]);
      claimWorkUnits(exactIdentityDir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(exactIdentityDir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(exactIdentityDir, record);

      const submitted = submitWorkUnit(exactIdentityDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(assignedResult(exactIdentityDir, record).receipt_nonce, record.receipt_nonce);
      assert.equal(ledgerRows(exactIdentityDir).length, 1);
    } finally {
      cleanup(exactIdentityDir);
    }
  });

  it('records non-terminal submit rejection without queue completion or ledger append', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), '');

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.equal(rejected.last_submit_rejection.reason_code, 'missing_receipt');
      assert.equal(loadQueue(dir).delegated_in_flight['queue-a'].work_id, record.work_id);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed');
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].last_submit_rejection.reason_code, 'missing_receipt');
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('keeps invalid submit cases non-terminal for corrected submit', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const missingOutputPath = writeValidSubmitFiles(dir, record);
      rmSync(path.join(dir, `reference/${record.work_id}.md`), { force: true });

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath: missingOutputPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.last_submit_rejection.reason_code, 'missing_output');
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed');

      const correctedPath = writeValidSubmitFiles(dir, record);
      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath: correctedPath });
      assert.equal(submitted.ok, true);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'submitted');
      assert.equal(ledgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('keeps nonce mismatch, invalid result, missing cache, stale snapshot, and wrong work_id non-terminal', () => {
    const cases = [
      {
        name: 'nonce mismatch',
        reasonCode: 'nonce_mismatch',
        mutate(dir, record, resultPath) {
          const result = readResult(resultPath);
          result.receipt_nonce = 'wu-00000000-0000-0000-0000-000000000000';
          writeResult(resultPath, result);
        },
      },
      {
        name: 'invalid result',
        reasonCode: 'invalid_result',
        mutate(dir, record, resultPath) {
          const result = readResult(resultPath);
          delete result.kind;
          writeResult(resultPath, result);
        },
      },
      {
        name: 'missing cache',
        reasonCode: 'missing_cache',
        mutate(dir, record, resultPath) {
          const result = readResult(resultPath);
          result.cache_trails = [];
          writeResult(resultPath, result);
        },
      },
      {
        name: 'stale snapshot',
        reasonCode: 'stale_snapshot',
        mutate(dir, record) {
          const index = loadWorkUnitIndex(dir);
          const manifestPath = path.join(dir, record.paths.manifest_ref);
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
          manifest.queue_item.title = 'Changed after claim';
          writeResult(manifestPath, manifest);
          index.work_units[record.work_id] = record;
        },
      },
      {
        name: 'wrong work_id',
        reasonCode: 'wrong_work_id',
        mutate(dir, record, resultPath) {
          const result = readResult(resultPath);
          result.work_id = 'wu-w0-b000-src-i9999';
          writeResult(resultPath, result);
        },
      },
    ];

    for (const testCase of cases) {
      const dir = tempBundle();
      try {
        saveSeedQueue(dir, [delegated('queue-a')]);
        claimWorkUnits(dir, { phase: 'wave0', count: 1 });
        const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
        const resultPath = writeValidSubmitFiles(dir, record);
        testCase.mutate(dir, record, resultPath);

        const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
        assert.equal(rejected.ok, false, testCase.name);
        assert.equal(rejected.status, 'claimed', testCase.name);
        assert.equal(rejected.last_submit_rejection.reason_code, testCase.reasonCode, testCase.name);
        assert.equal(loadQueue(dir).delegated_in_flight['queue-a'].work_id, record.work_id, testCase.name);
        assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed', testCase.name);
        assert.throws(() => ledgerRows(dir), /ENOENT/, testCase.name);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('rejects placeholder, empty, and unmapped cache pages before ledger append', () => {
    const cases = [
      {
        name: 'placeholder page',
        mutate(dir, record) {
          writeFileSync(path.join(dir, cacheTrailPath(record), 'page.md'), '# Page\n');
        },
      },
      {
        name: 'empty page',
        mutate(dir, record) {
          writeFileSync(path.join(dir, cacheTrailPath(record), 'page.md'), '');
        },
      },
      {
        name: 'missing url mapping',
        mutate(dir, record) {
          writeFileSync(path.join(dir, cacheTrailPath(record), 'meta.json'), '{"title":"No URL"}\n');
        },
      },
    ];

    for (const testCase of cases) {
      const dir = tempBundle();
      try {
        saveSeedQueue(dir, [delegated('queue-a')]);
        claimWorkUnits(dir, { phase: 'wave0', count: 1 });
        const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
        const resultPath = writeValidSubmitFiles(dir, record);
        testCase.mutate(dir, record);

        const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
        assert.equal(rejected.ok, false, testCase.name);
        assert.equal(rejected.status, 'claimed', testCase.name);
        assert.equal(rejected.last_submit_rejection.reason_code, 'missing_cache', testCase.name);
        assert.match(rejected.inspect.join('\n'), /incomplete cache content/, testCase.name);
        assert.throws(() => ledgerRows(dir), /ENOENT/, testCase.name);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('accepts explicit degraded cache capture while preserving submit authority', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      writeFileSync(path.join(dir, cacheTrailPath(record), 'page.md'), '# Cache page for blocked source\n\nDegraded capture: fetch-failure after HTTP 403 from source URL.\n');
      writeFileSync(path.join(dir, cacheTrailPath(record), 'meta.json'), JSON.stringify({
        url: 'https://example.com/source',
        capture_status: 'degraded',
        failure_reason: 'HTTP 403',
      }, null, 2));

      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(ledgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('treats assigned cache leaf files as additions and accepts source_slug mapping', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a', {
        cache_policy: {
          required: true,
          root: '_cache/',
          leaf_files: ['snapshot.json'],
          authority: 'verified_during_submit',
        },
      })]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      writeFileSync(path.join(dir, cacheTrailPath(record), 'meta.json'), '{"source_slug":"source"}\n');

      const missingAddition = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(missingAddition.ok, false);
      assert.match(missingAddition.inspect.join('\n'), /snapshot\.json/);

      writeFileSync(path.join(dir, cacheTrailPath(record), 'snapshot.json'), '{}\n');
      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true, submitted.inspect?.join('\n'));
    } finally {
      cleanup(dir);
    }
  });

  it('accepts Wave1 structured source claims backed by submitted cache trails', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record);

      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      const [row] = readWorkUnitLedgerRows(dir);
      assert.equal(row.source_claims.length, 1);
      assert.deepEqual(row.accepted_source_urls, ['https://example.com/wave1-new-source']);
    } finally {
      cleanup(dir);
    }
  });

  it('accepts an exact same-topic prior submitted evidence_summary source ref for supplementary Wave1 work', () => {
    const dir = tempBundle();
    try {
      writeCanonicalPlan(dir);
      saveSeedQueue(dir, [delegatedWave1('wave1-prior', 'topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const prior = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const priorResultPath = writeValidWave1SubmitFiles(dir, prior);
      assert.equal(submitWorkUnit(dir, { work_id: prior.work_id, resultPath: priorResultPath }).ok, true);
      const priorEvidencePath = assignedResult(dir, prior).output_files.find((entry) => entry.role === 'evidence_summary').path;

      enqueueExisting(dir, delegatedWave1('wave1-supplement', 'topic-a'));
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const supplementary = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0002'];
      const supplementaryTask = readFileSync(path.join(dir, supplementary.paths.task_ref), 'utf8');
      assert.match(supplementaryTask, /Authorized Source-Ref Lineage/);
      assert.match(supplementaryTask, new RegExp(prior.work_id));
      assert.match(supplementaryTask, new RegExp(priorEvidencePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(supplementaryTask, /evidence_summary/);
      const supplementaryResultPath = writeSupplementaryWave1SubmitFiles(dir, supplementary, { sourceRef: priorEvidencePath });

      const dry = drySubmitWorkUnit(dir, { work_id: supplementary.work_id, resultPath: supplementaryResultPath });
      assert.equal(dry.ok, true, JSON.stringify(dry.violations));
      const submitted = submitWorkUnit(dir, { work_id: supplementary.work_id, resultPath: supplementaryResultPath });
      assert.equal(submitted.ok, true, submitted.inspect?.join('\n'));
      assert.equal(ledgerRows(dir).length, 2);
      assert.equal(assignedResult(dir, supplementary).output_files.some((entry) => entry.path === priorEvidencePath), false);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects an ambiguous exact prior submitted path instead of choosing one row', () => {
    const dir = tempBundle();
    try {
      writeCanonicalPlan(dir);
      saveSeedQueue(dir, [delegatedWave1('wave1-prior-a', 'topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const priorA = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const priorAResultPath = writeValidWave1SubmitFiles(dir, priorA);
      assert.equal(submitWorkUnit(dir, { work_id: priorA.work_id, resultPath: priorAResultPath }).ok, true);
      const sharedEvidencePath = assignedResult(dir, priorA).output_files.find((entry) => entry.role === 'evidence_summary').path;

      enqueueExisting(dir, delegatedWave1('wave1-prior-b', 'topic-a'));
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const priorB = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0002'];
      const priorBResultPath = writeValidWave1SubmitFiles(dir, priorB);
      const priorBResult = readResult(priorBResultPath);
      priorBResult.output_files.find((entry) => entry.role === 'evidence_summary').path = sharedEvidencePath;
      writeResult(priorBResultPath, priorBResult);
      assert.equal(submitWorkUnit(dir, { work_id: priorB.work_id, resultPath: priorBResultPath }).ok, true);

      enqueueExisting(dir, delegatedWave1('wave1-current', 'topic-a'));
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const current = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0003'];
      const resultPath = writeSupplementaryWave1SubmitFiles(dir, current, { sourceRef: sharedEvidencePath });
      const dry = drySubmitWorkUnit(dir, { work_id: current.work_id, resultPath });
      const violation = dry.violations.find((item) => item.code === 'source_ref_prior_ambiguous');
      assert.equal(dry.ok, false);
      assert.ok(violation);
      assert.equal(violation.json_pointer, '/source_claims/0/source_ref');
      assert.equal(violation.details.prior_candidates.length, 2);
      assert.deepEqual(violation.details.prior_candidates.map((entry) => entry.work_id).sort(), [priorA.work_id, priorB.work_id].sort());
    } finally {
      cleanup(dir);
    }
  });

  it('short-circuits an invalid prior ledger as Engine authority instead of candidate repair', () => {
    const dir = tempBundle();
    try {
      writeCanonicalPlan(dir);
      saveSeedQueue(dir, [delegatedWave1('wave1-prior', 'topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const prior = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const priorResultPath = writeValidWave1SubmitFiles(dir, prior);
      assert.equal(submitWorkUnit(dir, { work_id: prior.work_id, resultPath: priorResultPath }).ok, true);
      const priorEvidencePath = assignedResult(dir, prior).output_files.find((entry) => entry.role === 'evidence_summary').path;
      const rows = ledgerRows(dir);
      rows[0].ledger_record_hash = 'drifted-ledger-hash';
      writeLedgerRows(dir, rows);

      enqueueExisting(dir, delegatedWave1('wave1-current', 'topic-a'));
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const current = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0002'];
      const resultPath = writeSupplementaryWave1SubmitFiles(dir, current, { sourceRef: priorEvidencePath });
      const dry = drySubmitWorkUnit(dir, { work_id: current.work_id, resultPath });
      const violation = dry.violations.find((item) => item.code === 'source_ref_prior_authority_invalid');
      assert.equal(dry.ok, false);
      assert.ok(violation);
      assert.equal(violation.repair_kind, 'missing_contract');
      assert.equal(violation.json_pointer, undefined);
      assert.match(violation.write_to, /ledger\/index\/manifest\/queue authority/);
      assert.match(violation.missing_fact, /ledger_record_hash mismatch/);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects filesystem-only and ineligible prior submitted source refs at the exact candidate pointer', () => {
    const cases = [
      { label: 'filesystem-only', prior: null, currentTopic: 'topic-a', expected: /current outputs.*prior submitted outputs/i },
      { label: 'cross-topic', prior: { wave: 1, topic: 'topic-b', role: 'evidence_summary' }, currentTopic: 'topic-a', expected: /topic/i },
      { label: 'wrong-role', prior: { wave: 1, topic: 'topic-a', role: 'question_list' }, currentTopic: 'topic-a', expected: /role|evidence_summary/i },
      { label: 'wrong-wave-kind', prior: { wave: 2, topic: 'topic-a', role: 'evidence_summary' }, currentTopic: 'topic-a', expected: /wave|kind/i },
      { label: 'path-derived-topic', prior: { wave: 1, topic: null, role: 'evidence_summary' }, currentTopic: 'topic-a', expected: /binding|topic/i },
    ];

    for (const testCase of cases) {
      const dir = tempBundle();
      try {
        writeCanonicalTwoTopicPlan(dir);
        const sourceRef = `artifacts/wave1/${testCase.prior?.topic || 'topic-a'}/evidence-summary.md`;
        mkdirSync(path.dirname(path.join(dir, sourceRef)), { recursive: true });
        writeFileSync(path.join(dir, sourceRef), '# Existing evidence\n');

        if (testCase.prior?.wave === 1) {
          saveSeedQueue(dir, [delegatedWave1('wave1-prior', testCase.prior.topic || 'unbound', {
            ...(testCase.prior.topic ? {} : { payload: { note: 'filename only' } }),
          })]);
          claimWorkUnits(dir, { phase: 'wave1', count: 1 });
          const prior = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
          const priorResultPath = writeValidWave1SubmitFiles(dir, prior, { topicSlug: testCase.prior.topic || 'topic-a' });
          const priorResult = readResult(priorResultPath);
          const evidence = priorResult.output_files.find((entry) => entry.role === 'evidence_summary');
          evidence.path = sourceRef;
          evidence.role = testCase.prior.role;
          writeResult(priorResultPath, priorResult);
          assert.equal(submitWorkUnit(dir, { work_id: prior.work_id, resultPath: priorResultPath }).ok, true, testCase.label);
        } else if (testCase.prior?.wave === 2) {
          saveSeedQueue(dir, [delegatedWave2('wave2-prior', 'W2F-001', {
            payload: { finding_id: 'W2F-001', wave: 2, topic_slug: testCase.prior.topic },
          })]);
          claimWorkUnits(dir, { phase: 'wave2', count: 1 });
          const prior = loadWorkUnitIndex(dir).work_units['wu-w2-b000-targ-i0001'];
          const priorResultPath = writeValidWave2SubmitFiles(dir, prior, { outputPath: sourceRef, role: testCase.prior.role });
          assert.equal(submitWorkUnit(dir, { work_id: prior.work_id, resultPath: priorResultPath }).ok, true, testCase.label);
        } else {
          saveSeedQueue(dir, []);
        }

        enqueueExisting(dir, delegatedWave1('wave1-current', testCase.currentTopic));
        claimWorkUnits(dir, { phase: 'wave1', count: 1 });
        const current = Object.values(loadWorkUnitIndex(dir).work_units).find((record) => record.queue_item_id === 'wave1-current');
        const resultPath = writeSupplementaryWave1SubmitFiles(dir, current, { sourceRef });
        const dry = drySubmitWorkUnit(dir, { work_id: current.work_id, resultPath });
        assert.equal(dry.ok, false, testCase.label);
        const violation = dry.violations.find((item) => item.phase === 'source_claims');
        assert.ok(violation, testCase.label);
        assert.equal(violation.repair_kind, 'agent_action', testCase.label);
        assert.equal(violation.json_pointer, '/source_claims/0/source_ref', testCase.label);
        assert.equal(violation.write_to, `${path.resolve(resultPath)}#/source_claims/0/source_ref`, testCase.label);
        assert.match(violation.missing_fact, testCase.expected, testCase.label);
        assert.match(violation.rerun, /operate-work-unit\.mjs dry-submit/, testCase.label);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('normalizes Wave1 required output roles before ledger append while preserving extra other outputs', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record);
      const extraPath = 'artifacts/wave1/topic-a/notes.md';
      mkdirSync(path.dirname(path.join(dir, extraPath)), { recursive: true });
      writeFileSync(path.join(dir, extraPath), '# Extra notes\n\nNon-blocking notes.\n');

      const result = readResult(resultPath);
      result.output_files = result.output_files.map((entry) => {
        if (entry.path.endsWith('/evidence-summary.md') || entry.path.endsWith('/question-list.md')) {
          return { ...entry, role: 'other' };
        }
        return entry;
      });
      result.output_files.push({ path: extraPath, role: 'other' });
      writeResult(resultPath, result);

      const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      const roleNormalizations = submitted.normalizations.filter((item) => item.kind === 'wave1_required_output_role_normalized');
      assert.equal(roleNormalizations.length, 2);
      assert.deepEqual(roleNormalizations.map((item) => item.to).sort(), ['evidence_summary', 'question_list']);
      assert.ok(roleNormalizations.every((item) => item.from === 'other' && item.surface_ref.startsWith('artifacts/wave1/topic-a/')));

      const [row] = ledgerRows(dir);
      assert.deepEqual(row.output_files.map((entry) => entry.role), ['reference', 'evidence_summary', 'question_list', 'other']);
      assert.deepEqual(assignedResult(dir, record).output_files.map((entry) => entry.role), ['reference', 'evidence_summary', 'question_list', 'other']);

      const duplicate = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(duplicate.ok, true);
      assert.equal(duplicate.duplicate, true);
      assert.equal(duplicate.result_hash, submitted.result_hash);
      assert.equal(ledgerRows(dir).length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects accepted_source_urls without matching accepted Wave1 source claims', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record, {
        acceptedSourceUrls: ['https://example.com/wave1-new-source', 'https://example.com/unclaimed'],
      });

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.equal(rejected.last_submit_rejection.reason_code, 'invalid_result');
      assert.match(rejected.inspect.join('\n'), /no matching accepted source_claims/);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects accepted Wave1 source claims without cache refs or degraded capture', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record, { includeClaimCacheRefs: false });

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.equal(rejected.last_submit_rejection.reason_code, 'missing_cache');
      assert.match(rejected.inspect.join('\n'), /requires cache_trail_refs/);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects source claims for work-unit kinds whose output contract disallows them', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const result = readResult(resultPath);
      result.source_claims = [{
        url: 'https://example.com/source',
        source_ref: result.output_files[0].path,
        acceptance_status: 'accepted',
        is_new_vs_wave0: true,
        cache_trail_refs: result.cache_trails,
      }];
      result.accepted_source_urls = ['https://example.com/source'];
      writeResult(resultPath, result);

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.equal(rejected.last_submit_rejection.reason_code, 'invalid_result');
      assert.match(rejected.inspect.join('\n'), /not allowed by this work-unit output contract/);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('rejects source claim extra keys before ledger append', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(dir, record);
      const result = readResult(resultPath);
      result.source_claims[0].capture_note = 'not part of WorkUnitSourceClaimSchema';
      writeResult(resultPath, result);

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.equal(rejected.last_submit_rejection.reason_code, 'invalid_result');
      assert.match(rejected.inspect.join('\n'), /capture_note|unrecognized/i);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('enforces kind output role enums before ledger append', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const result = readResult(resultPath);
      result.output_files[0].role = 'question_list';
      writeResult(resultPath, result);

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.match(rejected.inspect.join('\n'), /role 'question_list'.*allowed roles/i);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('honors output_contract.required_result_fields before parser defaults', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a', {
        output_contract: {
          required_result_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce', 'summary', 'output_files', 'cache_trails'],
          output_files: {
            required: true,
            allowed_roles: ['reference', 'source_yaml', 'other'],
            reference_requires_source_url: true,
          },
        },
      })]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      const result = readResult(resultPath);
      delete result.summary;
      writeResult(resultPath, result);

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'claimed');
      assert.match(rejected.inspect.join('\n'), /missing required field.*summary/i);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('accepts registered kind output roles still allowed by each output contract', () => {
    const wave0Dir = tempBundle();
    try {
      saveSeedQueue(wave0Dir, [delegated('queue-a')]);
      claimWorkUnits(wave0Dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(wave0Dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(wave0Dir, record);
      const result = readResult(resultPath);
      result.output_files[0].role = 'source_yaml';
      delete result.output_files[0].source_url;
      delete result.output_files[0].source_slug;
      writeResult(resultPath, result);

      const submitted = submitWorkUnit(wave0Dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(ledgerRows(wave0Dir)[0].output_files[0].role, 'source_yaml');
    } finally {
      cleanup(wave0Dir);
    }

    const wave1Dir = tempBundle();
    try {
      saveSeedQueue(wave1Dir, [delegatedWave1('wave1-topic-a')]);
      claimWorkUnits(wave1Dir, { phase: 'wave1', count: 1 });
      const record = loadWorkUnitIndex(wave1Dir).work_units['wu-w1-b000-deep-i0001'];
      const resultPath = writeValidWave1SubmitFiles(wave1Dir, record);

      const submitted = submitWorkUnit(wave1Dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.deepEqual(ledgerRows(wave1Dir)[0].output_files.map((entry) => entry.role), ['reference', 'evidence_summary', 'question_list']);
    } finally {
      cleanup(wave1Dir);
    }

    const wave2Dir = tempBundle();
    try {
      saveSeedQueue(wave2Dir, [delegatedWave2('wave2-targeted-a')]);
      claimWorkUnits(wave2Dir, { phase: 'wave2', count: 1 });
      const record = loadWorkUnitIndex(wave2Dir).work_units['wu-w2-b000-targ-i0001'];
      const resultPath = writeValidWave2SubmitFiles(wave2Dir, record);

      const submitted = submitWorkUnit(wave2Dir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      assert.equal(ledgerRows(wave2Dir)[0].output_files[0].role, 'evidence_summary');
    } finally {
      cleanup(wave2Dir);
    }
  });

  it('inspect catches submitted cache content drift', () => {
    const dir = tempBundle();
    try {
      saveSeedQueue(dir, [delegated('queue-a')]);
      claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
      const resultPath = writeValidSubmitFiles(dir, record);
      submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      writeFileSync(path.join(dir, cacheTrailPath(record), 'page.md'), '# Page\n');

      const inspected = inspectWorkUnits(dir);
      assert.equal(inspected.passed, false);
      assert.match(inspected.inspect.join('\n'), /ledger cache trail incomplete/);
      assert.match(inspected.inspect.join('\n'), /placeholder-only/);
    } finally {
      cleanup(dir);
    }
  });

  it('normal submit rejects timed-out work units without ledger append or queue completion', () => {
    const dir = tempBundle();
    try {
      const record = claimOneWave0(dir);
      const resultPath = writeValidSubmitFiles(dir, record);
      forceTimeout(dir, record);

      const rejected = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.status, 'timed_out');
      assert.match(rejected.inspect.join('\n'), /terminal status timed_out/);
      assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'timed_out');
      assert.equal(loadQueue(dir).terminal_history.some((entry) => entry.queue_item_id === record.queue_item_id), false);
      assert.throws(() => ledgerRows(dir), /ENOENT/);
    } finally {
      cleanup(dir);
    }
  });

  it('late-submit accepts an eligible timed-out work unit and removes queued retry demand', () => {
    const dir = tempBundle();
    try {
      const record = claimOneWave0(dir);
      const resultPath = writeValidSubmitFiles(dir, record);
      forceTimeout(dir, record);

      const accepted = lateSubmitWorkUnit(dir, {
        work_id: record.work_id,
        resultPath,
        reason: 'late result arrived after timeout',
      });
      assert.equal(accepted.ok, true);
      assert.equal(accepted.late_accept, true);
      assert.equal(accepted.status, 'submitted');
      assert.deepEqual(accepted.superseded_retry_work_ids, []);

      const index = loadWorkUnitIndex(dir);
      assert.equal(index.work_units[record.work_id].status, 'submitted');
      assert.deepEqual(index.work_units[record.work_id].late_accept_context, {
        late_accept_reason: 'late result arrived after timeout',
        terminal_status_before_accept: 'timed_out',
        superseded_retry_work_ids: [],
      });
      assert.deepEqual(
        Object.keys(index.work_units[record.work_id].late_accept_context).sort(),
        ['late_accept_reason', 'superseded_retry_work_ids', 'terminal_status_before_accept'],
      );
      const queue = loadQueue(dir);
      assert.equal(queue.delegated_in_flight[record.queue_item_id], undefined);
      assert.equal([...queue.active_window, ...queue.refill_pool].some((item) => item.queue_item_id === record.queue_item_id), false);
      assert.equal(queue.terminal_history.filter((entry) => entry.queue_item_id === record.queue_item_id).length, 1);
      assert.equal(queue.terminal_history[0].work_id, record.work_id);

      const [row] = ledgerRows(dir);
      assert.equal(row.work_id, record.work_id);
      assert.equal(row.late_accept, true);
      assert.equal(row.late_accept_reason, 'late result arrived after timeout');
      assert.equal(row.terminal_status_before_accept, 'timed_out');
      assert.deepEqual(row.superseded_retry_work_ids, []);
      assert.equal(row.ledger_record_hash, computeWorkUnitLedgerRecordHash(row));
      const submittedRecord = index.work_units[record.work_id];
      const submittedStatus = JSON.parse(readFileSync(path.join(dir, record.paths.status_ref), 'utf-8'));
      assert.equal(row.declared_at, submittedRecord.terminal_at);
      assert.equal(row.declared_at, submittedStatus.updated_at);
      assert.equal(row.declared_at, queue.terminal_history[0].completed_at);
      assert.equal(readSubmittedWorkUnitDeclarations(dir).length, 1);

      rmSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER));
      assert.deepEqual(readSubmittedWorkUnitDeclarations(dir), []);
      assert.ok(loadWorkUnitIndex(dir).work_units[record.work_id].late_accept_context);
    } finally {
      cleanup(dir);
    }
  });

  it('recovers hash-identical normal and late declarations without rebinding submitted authority', () => {
    for (const late of [false, true]) {
      const dir = tempBundle();
      try {
        const record = claimOneWave0(dir);
        const resultPath = writeValidSubmitFiles(dir, record);
        const submitted = late
          ? (forceTimeout(dir, record), lateSubmitWorkUnit(dir, {
            work_id: record.work_id,
            resultPath,
            reason: 'late declaration recovery context',
          }))
          : submitWorkUnit(dir, { work_id: record.work_id, resultPath });
        assert.equal(submitted.ok, true);

        const [originalRow] = readWorkUnitLedgerRows(dir);
        const indexBefore = readFileSync(workUnitIndexPath(dir));
        const statusBefore = readFileSync(path.join(dir, record.paths.status_ref));
        const queueBefore = readFileSync(path.join(dir, 'rb_queue.json'));
        rmSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER));

        const recovered = recoverWorkUnitDeclaration(dir, { work_id: record.work_id });
        assert.equal(recovered.ok, true);
        assert.equal(recovered.recovered, true);
        assert.equal(recovered.changed, true);
        assert.equal(recovered.ledger_record_hash, submitted.ledger_record_hash);
        assert.deepEqual(readWorkUnitLedgerRows(dir), [originalRow]);
        assert.deepEqual(readFileSync(workUnitIndexPath(dir)), indexBefore);
        assert.deepEqual(readFileSync(path.join(dir, record.paths.status_ref)), statusBefore);
        assert.deepEqual(readFileSync(path.join(dir, 'rb_queue.json')), queueBefore);
        const trace = readFileSync(path.join(dir, 'rb_trace.jsonl'), 'utf-8');
        assert.match(trace, /work_unit_declaration_recovered/);
        const runLog = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
        assert.match(runLog, /work_unit_declaration_recovered/);
        const recoveryTransactions = readdirSync(transactionDir(dir))
          .map((name) => JSON.parse(readFileSync(path.join(transactionDir(dir), name), 'utf-8')))
          .filter((tx) => tx.operation === 'recover_work_unit_declaration');
        assert.equal(recoveryTransactions.length, 1);
        assert.equal(recoveryTransactions[0].status, 'committed');
        assert.equal(Object.hasOwn(originalRow, 'recovery'), false);
        assert.equal(Object.hasOwn(originalRow, 'recovered_at'), false);

        const unchanged = recoverWorkUnitDeclaration(dir, { work_id: record.work_id });
        assert.equal(unchanged.ok, true);
        assert.equal(unchanged.recovered, true);
        assert.equal(unchanged.changed, false);
        assert.equal(unchanged.idempotent, true);
        assert.deepEqual(readWorkUnitLedgerRows(dir), [originalRow]);
      } finally {
        cleanup(dir);
      }
    }
  });

  it('recovers legacy timestamp/context rows only from unique original submit evidence', () => {
    const normalDir = tempBundle();
    const lateDir = tempBundle();
    try {
      const normalRecord = claimOneWave0(normalDir);
      const normalResultPath = writeValidSubmitFiles(normalDir, normalRecord);
      const normalSubmitted = submitWorkUnit(normalDir, { work_id: normalRecord.work_id, resultPath: normalResultPath });
      assert.equal(normalSubmitted.ok, true);
      const [normalRow] = readWorkUnitLedgerRows(normalDir);
      const statusPath = path.join(normalDir, normalRecord.paths.status_ref);
      const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
      status.updated_at = new Date(Date.parse(status.updated_at) + 1000).toISOString();
      writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);
      const queuePath = path.join(normalDir, 'rb_queue.json');
      const queue = JSON.parse(readFileSync(queuePath, 'utf-8'));
      queue.terminal_history[0].completed_at = new Date(Date.parse(queue.terminal_history[0].completed_at) + 2000).toISOString();
      writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
      rmSync(path.join(normalDir, WORK_UNIT_OUTPUT_LEDGER));

      const normalRecovered = recoverWorkUnitDeclaration(normalDir, { work_id: normalRecord.work_id });
      assert.equal(normalRecovered.ok, true);
      assert.equal(normalRecovered.legacy_reconstruction, true);
      assert.deepEqual(readWorkUnitLedgerRows(normalDir), [normalRow]);

      const lateRecord = claimOneWave0(lateDir);
      const lateResultPath = writeValidSubmitFiles(lateDir, lateRecord);
      forceTimeout(lateDir, lateRecord);
      const lateSubmitted = lateSubmitWorkUnit(lateDir, {
        work_id: lateRecord.work_id,
        resultPath: lateResultPath,
        reason: 'legacy late context from original trace',
      });
      assert.equal(lateSubmitted.ok, true);
      const [lateRow] = readWorkUnitLedgerRows(lateDir);
      const lateIndex = loadWorkUnitIndex(lateDir);
      delete lateIndex.work_units[lateRecord.work_id].late_accept_context;
      writeFileSync(workUnitIndexPath(lateDir), `${JSON.stringify(lateIndex, null, 2)}\n`);
      rmSync(path.join(lateDir, WORK_UNIT_OUTPUT_LEDGER));

      const lateRecovered = recoverWorkUnitDeclaration(lateDir, { work_id: lateRecord.work_id });
      assert.equal(lateRecovered.ok, true);
      assert.equal(lateRecovered.reconstruction_source, 'legacy_late_submit_evidence');
      assert.deepEqual(readWorkUnitLedgerRows(lateDir), [lateRow]);
    } finally {
      cleanup(normalDir);
      cleanup(lateDir);
    }
  });

  it('blocks irreproducible, hash-drifted, and unsubmitted recovery without authority mutation', () => {
    const missingEvidenceDir = tempBundle();
    const hashDriftDir = tempBundle();
    const conflictDir = tempBundle();
    const unsubmittedDir = tempBundle();
    try {
      const missingRecord = claimOneWave0(missingEvidenceDir);
      const missingResult = writeValidSubmitFiles(missingEvidenceDir, missingRecord);
      assert.equal(submitWorkUnit(missingEvidenceDir, { work_id: missingRecord.work_id, resultPath: missingResult }).ok, true);
      rmSync(path.join(missingEvidenceDir, WORK_UNIT_OUTPUT_LEDGER));
      rmSync(path.join(missingEvidenceDir, 'rb_trace.jsonl'));
      rmSync(transactionDir(missingEvidenceDir), { recursive: true, force: true });
      const missingStatusPath = path.join(missingEvidenceDir, missingRecord.paths.status_ref);
      const missingStatus = JSON.parse(readFileSync(missingStatusPath, 'utf-8'));
      missingStatus.updated_at = new Date(Date.parse(missingStatus.updated_at) + 1000).toISOString();
      writeFileSync(missingStatusPath, `${JSON.stringify(missingStatus, null, 2)}\n`);
      const missingBefore = {
        index: readFileSync(workUnitIndexPath(missingEvidenceDir)),
        queue: readFileSync(path.join(missingEvidenceDir, 'rb_queue.json')),
        status: readFileSync(missingStatusPath),
        result: readFileSync(path.join(missingEvidenceDir, missingRecord.paths.result_ref)),
      };
      const missing = recoverWorkUnitDeclaration(missingEvidenceDir, { work_id: missingRecord.work_id });
      assert.equal(missing.ok, false);
      assert.equal(missing.repair_kind, 'missing_contract');
      assert.match(missing.missing_fact, /original submit\/transaction evidence/);
      assert.doesNotMatch(`${missing.write_to}\n${missing.advice}`, /backup|hand-write|new attempt/i);
      assert.equal(existsSync(path.join(missingEvidenceDir, WORK_UNIT_OUTPUT_LEDGER)), false);
      assert.deepEqual(readFileSync(workUnitIndexPath(missingEvidenceDir)), missingBefore.index);
      assert.deepEqual(readFileSync(path.join(missingEvidenceDir, 'rb_queue.json')), missingBefore.queue);
      assert.deepEqual(readFileSync(missingStatusPath), missingBefore.status);

      const driftRecord = claimOneWave0(hashDriftDir);
      const driftResult = writeValidSubmitFiles(hashDriftDir, driftRecord);
      assert.equal(submitWorkUnit(hashDriftDir, { work_id: driftRecord.work_id, resultPath: driftResult }).ok, true);
      rmSync(path.join(hashDriftDir, WORK_UNIT_OUTPUT_LEDGER));
      const driftIndex = loadWorkUnitIndex(hashDriftDir);
      driftIndex.work_units[driftRecord.work_id].ledger_record_hash = 'forged-recorded-hash';
      writeFileSync(workUnitIndexPath(hashDriftDir), `${JSON.stringify(driftIndex, null, 2)}\n`);
      const driftStatusPath = path.join(hashDriftDir, driftRecord.paths.status_ref);
      const driftStatus = JSON.parse(readFileSync(driftStatusPath, 'utf-8'));
      driftStatus.ledger_record_hash = 'forged-recorded-hash';
      writeFileSync(driftStatusPath, `${JSON.stringify(driftStatus, null, 2)}\n`);
      const driftBefore = readFileSync(workUnitIndexPath(hashDriftDir));
      const drifted = recoverWorkUnitDeclaration(hashDriftDir, { work_id: driftRecord.work_id });
      assert.equal(drifted.ok, false);
      assert.equal(drifted.repair_kind, 'missing_contract');
      assert.match(drifted.missing_fact, /cannot reproduce recorded declaration hash/);
      assert.equal(existsSync(path.join(hashDriftDir, WORK_UNIT_OUTPUT_LEDGER)), false);
      assert.deepEqual(readFileSync(workUnitIndexPath(hashDriftDir)), driftBefore);

      const conflictRecord = claimOneWave0(conflictDir);
      const conflictResult = writeValidSubmitFiles(conflictDir, conflictRecord);
      assert.equal(submitWorkUnit(conflictDir, { work_id: conflictRecord.work_id, resultPath: conflictResult }).ok, true);
      rmSync(path.join(conflictDir, WORK_UNIT_OUTPUT_LEDGER));
      const conflictIndex = loadWorkUnitIndex(conflictDir);
      conflictIndex.work_units['wu-w0-b000-src-i0002'] = {
        ...conflictIndex.work_units[conflictRecord.work_id],
        work_id: 'wu-w0-b000-src-i0002',
        claim_index: 2,
        attempt_index: 2,
      };
      writeFileSync(workUnitIndexPath(conflictDir), `${JSON.stringify(conflictIndex, null, 2)}\n`);
      const conflictBefore = readFileSync(workUnitIndexPath(conflictDir));
      const conflict = recoverWorkUnitDeclaration(conflictDir, { work_id: conflictRecord.work_id });
      assert.equal(conflict.ok, false);
      assert.match(conflict.missing_fact, /submitted replacement conflict/);
      assert.equal(existsSync(path.join(conflictDir, WORK_UNIT_OUTPUT_LEDGER)), false);
      assert.deepEqual(readFileSync(workUnitIndexPath(conflictDir)), conflictBefore);

      const claimed = claimOneWave0(unsubmittedDir);
      const unsubmittedBefore = authoritySnapshot(unsubmittedDir, claimed);
      const unsubmitted = recoverWorkUnitDeclaration(unsubmittedDir, { work_id: claimed.work_id });
      assert.equal(unsubmitted.ok, false);
      assert.match(unsubmitted.missing_fact, /requires an already-submitted attempt/);
      assertSnapshotEqual(authoritySnapshot(unsubmittedDir, claimed), unsubmittedBefore);
    } finally {
      cleanup(missingEvidenceDir);
      cleanup(hashDriftDir);
      cleanup(conflictDir);
      cleanup(unsubmittedDir);
    }
  });

  it('late-submit requires a reason and rejects invalid identity without authority mutation', () => {
    const reasonDir = tempBundle();
    try {
      const record = claimOneWave0(reasonDir);
      const resultPath = writeValidSubmitFiles(reasonDir, record);
      forceTimeout(reasonDir, record);
      const beforeIndex = readFileSync(workUnitIndexPath(reasonDir), 'utf-8');
      const beforeQueue = readFileSync(path.join(reasonDir, 'rb_queue.json'), 'utf-8');

      const rejected = lateSubmitWorkUnit(reasonDir, { work_id: record.work_id, resultPath, reason: '   ' });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.reason_code, 'late_accept_reason_required');
      assert.equal(readFileSync(workUnitIndexPath(reasonDir), 'utf-8'), beforeIndex);
      assert.equal(readFileSync(path.join(reasonDir, 'rb_queue.json'), 'utf-8'), beforeQueue);
      assert.equal(existsSync(path.join(reasonDir, WORK_UNIT_OUTPUT_LEDGER)), false);
      assert.equal(existsSync(path.join(reasonDir, record.paths.result_ref)), false);
    } finally {
      cleanup(reasonDir);
    }

    const identityDir = tempBundle();
    try {
      const record = claimOneWave0(identityDir);
      const resultPath = writeValidSubmitFiles(identityDir, record);
      const result = readResult(resultPath);
      result.work_id = 'wu-w0-b000-src-i9999';
      writeResult(resultPath, result);
      forceTimeout(identityDir, record);
      const beforeIndex = readFileSync(workUnitIndexPath(identityDir), 'utf-8');
      const beforeQueue = readFileSync(path.join(identityDir, 'rb_queue.json'), 'utf-8');

      const rejected = lateSubmitWorkUnit(identityDir, {
        work_id: record.work_id,
        resultPath,
        reason: 'bad candidate should not mutate',
      });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.reason_code, 'wrong_work_id');
      assert.equal(readFileSync(workUnitIndexPath(identityDir), 'utf-8'), beforeIndex);
      assert.equal(readFileSync(path.join(identityDir, 'rb_queue.json'), 'utf-8'), beforeQueue);
      assert.equal(existsSync(path.join(identityDir, WORK_UNIT_OUTPUT_LEDGER)), false);
      assert.equal(existsSync(path.join(identityDir, record.paths.result_ref)), false);
    } finally {
      cleanup(identityDir);
    }
  });

  it('late-submit rejects failed, abandoned, and normal submitted work units', () => {
    for (const terminalStatus of ['failed', 'abandoned']) {
      const dir = tempBundle();
      try {
        const record = claimOneWave0(dir);
        const resultPath = writeValidSubmitFiles(dir, record);
        const closed = closeWorkUnitAttempt(dir, {
          work_id: record.work_id,
          status: terminalStatus,
          reason: `${terminalStatus}-terminal`,
        });
        assert.equal(closed.ok, true);

        const rejected = lateSubmitWorkUnit(dir, {
          work_id: record.work_id,
          resultPath,
          reason: 'should not recover this terminal status',
        });
        assert.equal(rejected.ok, false, terminalStatus);
        assert.equal(rejected.reason_code, 'terminal_status_not_recoverable', terminalStatus);
        assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, terminalStatus);
        assert.equal(existsSync(path.join(dir, WORK_UNIT_OUTPUT_LEDGER)), false);
      } finally {
        cleanup(dir);
      }
    }

    const submittedDir = tempBundle();
    try {
      const record = claimOneWave0(submittedDir);
      const resultPath = writeValidSubmitFiles(submittedDir, record);
      const submitted = submitWorkUnit(submittedDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);

      const rejected = lateSubmitWorkUnit(submittedDir, {
        work_id: record.work_id,
        resultPath,
        reason: 'normal submitted must use normal idempotency',
      });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.reason_code, 'normal_submitted_rejects_late_submit');
      assert.equal(ledgerRows(submittedDir).length, 1);
    } finally {
      cleanup(submittedDir);
    }
  });

  it('late-submit is idempotent for same audited result and refuses broken postconditions without repair', () => {
    const idempotentDir = tempBundle();
    try {
      const record = claimOneWave0(idempotentDir);
      const resultPath = writeValidSubmitFiles(idempotentDir, record);
      forceTimeout(idempotentDir, record);
      const first = lateSubmitWorkUnit(idempotentDir, {
        work_id: record.work_id,
        resultPath,
        reason: 'late result accepted',
      });
      assert.equal(first.ok, true);

      const second = lateSubmitWorkUnit(idempotentDir, {
        work_id: record.work_id,
        resultPath,
        reason: 'repeat same late result',
      });
      assert.equal(second.ok, true);
      assert.equal(second.duplicate, true);
      assert.equal(second.idempotent, true);
      assert.equal(second.result_hash, first.result_hash);
      assert.equal(ledgerRows(idempotentDir).length, 1);
    } finally {
      cleanup(idempotentDir);
    }

    const brokenDir = tempBundle();
    try {
      const record = claimOneWave0(brokenDir);
      const resultPath = writeValidSubmitFiles(brokenDir, record);
      forceTimeout(brokenDir, record);
      const first = lateSubmitWorkUnit(brokenDir, {
        work_id: record.work_id,
        resultPath,
        reason: 'late result accepted',
      });
      assert.equal(first.ok, true);
      const queuePath = path.join(brokenDir, 'rb_queue.json');
      const queue = JSON.parse(readFileSync(queuePath, 'utf-8'));
      queue.terminal_history = [];
      writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);

      const rejected = lateSubmitWorkUnit(brokenDir, {
        work_id: record.work_id,
        resultPath,
        reason: 'repeat should inspect broken state',
      });
      assert.equal(rejected.ok, false);
      assert.match(rejected.inspect.join('\n'), /postconditions are broken|terminal_history/);
      assert.equal(ledgerRows(brokenDir).length, 1);
      assert.equal(loadQueue(brokenDir).terminal_history.length, 0);
    } finally {
      cleanup(brokenDir);
    }
  });

  it('late-submit abandons claimed retry and rejects submitted replacement coverage', () => {
    const claimedRetryDir = tempBundle();
    try {
      const record = claimOneWave0(claimedRetryDir);
      const resultPath = writeValidSubmitFiles(claimedRetryDir, record);
      forceTimeout(claimedRetryDir, record);
      const retry = claimWorkUnits(claimedRetryDir, { phase: 'wave0', count: 1 });
      const retryWorkId = retry.claimed_work_ids[0];

      const accepted = lateSubmitWorkUnit(claimedRetryDir, {
        work_id: record.work_id,
        resultPath,
        reason: 'original result arrived after retry claim',
      });
      assert.equal(accepted.ok, true);
      assert.deepEqual(accepted.superseded_retry_work_ids, [retryWorkId]);
      const index = loadWorkUnitIndex(claimedRetryDir);
      assert.equal(index.work_units[record.work_id].status, 'submitted');
      assert.deepEqual(index.work_units[record.work_id].late_accept_context, {
        late_accept_reason: 'original result arrived after retry claim',
        terminal_status_before_accept: 'timed_out',
        superseded_retry_work_ids: [retryWorkId],
      });
      assert.equal(index.work_units[retryWorkId].status, 'abandoned');
      assert.equal(index.work_units[retryWorkId].terminal_reason, 'superseded_by_late_accept');
      assert.equal(loadQueue(claimedRetryDir).delegated_in_flight[record.queue_item_id], undefined);
      assert.equal(ledgerRows(claimedRetryDir).length, 1);
    } finally {
      cleanup(claimedRetryDir);
    }

    const replacementDir = tempBundle();
    try {
      const record = claimOneWave0(replacementDir);
      const originalResultPath = writeValidSubmitFiles(replacementDir, record);
      forceTimeout(replacementDir, record);
      const retry = claimWorkUnits(replacementDir, { phase: 'wave0', count: 1 });
      const retryRecord = loadWorkUnitIndex(replacementDir).work_units[retry.claimed_work_ids[0]];
      const retryResultPath = writeValidSubmitFiles(replacementDir, retryRecord);
      const replacement = submitWorkUnit(replacementDir, { work_id: retryRecord.work_id, resultPath: retryResultPath });
      assert.equal(replacement.ok, true);

      const rejected = lateSubmitWorkUnit(replacementDir, {
        work_id: record.work_id,
        resultPath: originalResultPath,
        reason: 'replacement already submitted',
      });
      assert.equal(rejected.ok, false);
      assert.equal(rejected.reason_code, 'submitted_replacement_conflict');
      assert.equal(ledgerRows(replacementDir).length, 1);
      assert.equal(loadWorkUnitIndex(replacementDir).work_units[record.work_id].status, 'timed_out');
    } finally {
      cleanup(replacementDir);
    }
  });

  it('rejects malformed audit rows and hash-covered audit drift', () => {
    const lateDir = tempBundle();
    try {
      const record = claimOneWave0(lateDir);
      const resultPath = writeValidSubmitFiles(lateDir, record);
      forceTimeout(lateDir, record);
      const accepted = lateSubmitWorkUnit(lateDir, {
        work_id: record.work_id,
        resultPath,
        reason: 'audit hash coverage',
      });
      assert.equal(accepted.ok, true);

      const [drifted] = ledgerRows(lateDir);
      drifted.late_accept_reason = 'changed after append';
      writeLedgerRows(lateDir, [drifted]);
      assert.throws(() => readWorkUnitLedgerRows(lateDir), /ledger_record_hash mismatch/);

      drifted.ledger_record_hash = computeWorkUnitLedgerRecordHash(drifted);
      delete drifted.late_accept_reason;
      drifted.ledger_record_hash = computeWorkUnitLedgerRecordHash(drifted);
      writeLedgerRows(lateDir, [drifted]);
      assert.throws(() => readWorkUnitLedgerRows(lateDir), /late_accept_reason/);
    } finally {
      cleanup(lateDir);
    }

    const normalDir = tempBundle();
    try {
      const record = claimOneWave0(normalDir);
      const resultPath = writeValidSubmitFiles(normalDir, record);
      const submitted = submitWorkUnit(normalDir, { work_id: record.work_id, resultPath });
      assert.equal(submitted.ok, true);
      const [row] = ledgerRows(normalDir);
      row.late_accept_reason = 'half audit is invalid';
      row.ledger_record_hash = computeWorkUnitLedgerRecordHash(row);
      writeLedgerRows(normalDir, [row]);
      assert.throws(() => readWorkUnitLedgerRows(normalDir), /late_accept_reason/);
    } finally {
      cleanup(normalDir);
    }
  });

  it('gate reader rejects late-accepted rows when a submitted replacement ledger row exists', () => {
    const dir = tempBundle();
    try {
      const record = claimOneWave0(dir);
      const resultPath = writeValidSubmitFiles(dir, record);
      forceTimeout(dir, record);
      const accepted = lateSubmitWorkUnit(dir, {
        work_id: record.work_id,
        resultPath,
        reason: 'gate conflict coverage',
      });
      assert.equal(accepted.ok, true);

      const [lateRow] = ledgerRows(dir);
      const replacementWorkId = 'wu-w0-b000-src-i0002';
      const replacementRow = { ...lateRow, work_id: replacementWorkId };
      delete replacementRow.late_accept;
      delete replacementRow.late_accept_reason;
      delete replacementRow.terminal_status_before_accept;
      delete replacementRow.superseded_retry_work_ids;
      replacementRow.ledger_record_hash = computeWorkUnitLedgerRecordHash(replacementRow);

      const indexPath = workUnitIndexPath(dir);
      const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
      index.work_units[replacementWorkId] = {
        ...index.work_units[record.work_id],
        work_id: replacementWorkId,
        status: 'submitted',
        ledger_record_hash: replacementRow.ledger_record_hash,
      };
      writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
      writeLedgerRows(dir, [lateRow, replacementRow]);

      assert.throws(
        () => readSubmittedWorkUnitDeclarations(dir),
        /late-accept conflict/,
      );
    } finally {
      cleanup(dir);
    }
  });
});
