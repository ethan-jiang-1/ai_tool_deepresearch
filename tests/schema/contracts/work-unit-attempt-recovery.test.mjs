import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  WORK_UNIT_SUBMISSION_CONTRACT_VERSION,
  WORK_UNIT_SUPERSESSION_SCHEMA_VERSION,
  WorkUnitBeaconSchema,
  WorkUnitIndexRecordSchema,
  WorkUnitManifestSchema,
  WorkUnitStatusFileSchema,
  WorkUnitSubmissionV1StatusFileSchema,
  WorkUnitSupersessionRelationSchema,
  WorkUnitSupersessionRootSchema,
} from '../../../DPT_FRAMEWORK/schema/contracts/work-unit.mjs';
import {
  QueueDemandItemSchema,
  WorkUnitSupersessionQueueLineageSchema,
} from '../../../DPT_FRAMEWORK/schema/contracts/queue.mjs';
import {
  WORK_UNIT_TRANSACTION_LOCK_SCHEMA_VERSION,
  WORK_UNIT_TRANSACTION_V1_SCHEMA_VERSION,
  WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
  WorkUnitTransactionJournalSchema,
  WorkUnitTransactionLockOwnerSchema,
  WorkUnitTransactionMutationManifestSchema,
  WorkUnitTransactionPairSchema,
  WorkUnitTransactionProjectionSchema,
  WorkUnitTransactionV1JournalSchema,
  WorkUnitTransactionV2JournalSchema,
} from '../../../DPT_FRAMEWORK/schema/contracts/work-unit-transaction.mjs';

const WORK_ID = 'wu-w0-b000-src-i0001';
const QUEUE_ITEM_ID = 'queue-a';
const ACCEPTED_HASH = 'a'.repeat(64);
const OTHER_HASH = 'b'.repeat(64);
const NOW = '2026-07-30T00:00:00.000Z';
const TX_ID = 'tx-accepted';

function paths() {
  const root = `_work_units/wave0/${WORK_ID}`;
  return {
    work_unit_dir: root,
    manifest_ref: `${root}/manifest.json`,
    task_ref: `${root}/task.md`,
    result_schema_ref: `${root}/result.schema.json`,
    beacon_ref: `${root}/_beacon.json`,
    runtime_receipt_ref: `${root}/runtime-receipt.jsonl`,
    status_ref: `${root}/status.json`,
    result_ref: `${root}/result.json`,
    agent_ref: `${root}/agent.json`,
  };
}

function legacyIndex(overrides = {}) {
  return {
    work_id: WORK_ID,
    queue_item_id: QUEUE_ITEM_ID,
    wave: 0,
    batch_id: 'b000',
    batch_index: 0,
    claim_index: 1,
    attempt_index: 1,
    kind: 'wave0_source_intake',
    kind_code: 'src',
    status: 'submitted',
    producer_rule: 'source_intake_fan_in',
    creation_reason: 'initial_phase_drain',
    queue_item_snapshot_hash: 'queue-hash',
    receipt_nonce: '1234567890123456',
    claimed_at: NOW,
    timeout_ms: 600000,
    deadline_at: '2026-07-30T00:10:00.000Z',
    runtime_refs: {},
    paths: paths(),
    result_hash: 'legacy-result-hash',
    ledger_record_hash: ACCEPTED_HASH,
    terminal_at: NOW,
    ...overrides,
  };
}

function markedIndex(overrides = {}) {
  const base = legacyIndex();
  delete base.result_hash;
  delete base.ledger_record_hash;
  return {
    ...base,
    submission_contract_version: WORK_UNIT_SUBMISSION_CONTRACT_VERSION,
    accepted_ledger_record_hash: ACCEPTED_HASH,
    ...overrides,
  };
}

function relation(overrides = {}) {
  return {
    schema_version: WORK_UNIT_SUPERSESSION_SCHEMA_VERSION,
    predecessor_work_id: WORK_ID,
    predecessor_queue_item_id: QUEUE_ITEM_ID,
    accepted_ledger_record_hash: ACCEPTED_HASH,
    root_code: 'submitted_result_drift',
    reason: 'result bytes changed after acceptance',
    recorded_at: NOW,
    tx_id: TX_ID,
    successor_queue_item_id: 'queue-successor',
    ...overrides,
  };
}

function manifest(overrides = {}) {
  return {
    schema_version: 'work-unit.manifest.v1',
    work_id: WORK_ID,
    queue_item_id: QUEUE_ITEM_ID,
    wave: 0,
    batch_id: 'b000',
    batch_index: 0,
    claim_index: 1,
    attempt_index: 1,
    kind: 'wave0_source_intake',
    kind_code: 'src',
    task_brief: 'Research the assigned demand.',
    producer_rule: 'source_intake_fan_in',
    creation_reason: 'initial_phase_drain',
    queue_item_snapshot_hash: 'queue-hash',
    receipt_nonce: '1234567890123456',
    claimed_at: NOW,
    timeout_ms: 600000,
    deadline_at: '2026-07-30T00:10:00.000Z',
    output_contract: {},
    cache_policy: {},
    runtime_refs: {},
    paths: paths(),
    queue_item: { queue_item_id: QUEUE_ITEM_ID },
    ...overrides,
  };
}

function beacon(overrides = {}) {
  return {
    schema_version: 'work-unit.beacon.v1',
    work_id: WORK_ID,
    queue_item_id: QUEUE_ITEM_ID,
    kind: 'wave0_source_intake',
    bundle: 'bundle-a',
    bundle_dir: '/tmp/bundle-a',
    receipt_nonce: '1234567890123456',
    deadline_at: '2026-07-30T00:10:00.000Z',
    work_unit_dir: paths().work_unit_dir,
    manifest_ref: paths().manifest_ref,
    task_ref: paths().task_ref,
    result_schema_ref: paths().result_schema_ref,
    result_ref: paths().result_ref,
    runtime_receipt_ref: paths().runtime_receipt_ref,
    log_cli: 'node DPT_FRAMEWORK/cli/log-work-unit-event.mjs',
    output_contract: {},
    cache_policy: {},
    required_receipt_fields: ['work_id', 'queue_item_id', 'kind', 'receipt_nonce'],
    runtime_refs: {},
    ...overrides,
  };
}

function status(overrides = {}) {
  return {
    schema_version: 'work-unit.status.v1',
    work_id: WORK_ID,
    status: 'submitted',
    updated_at: NOW,
    ...overrides,
  };
}

function demand(overrides = {}) {
  return {
    queue_item_id: 'queue-successor',
    title: 'Successor demand',
    targets: { controller: 'main-agent' },
    action: 'perform successor work',
    producer_rule: 'source_intake_fan_in',
    lineage: {},
    priority_class: 'P4_progressive_artifact_or_seed_backfill',
    required_receipts: [],
    done_condition: 'done',
    verification: { engine: [], agent: [] },
    writes_to: [],
    status_sync: [],
    completion_receipt: null,
    failure_route: 'repair',
    payload: {},
    ...overrides,
  };
}

function supersessionLineage(overrides = {}) {
  return {
    supersession_of_work_id: WORK_ID,
    supersession_of_queue_item_id: QUEUE_ITEM_ID,
    supersession_accepted_ledger_record_hash: ACCEPTED_HASH,
    supersession_root: 'submitted_result_drift',
    supersession_tx_id: TX_ID,
    ...overrides,
  };
}

describe('attempt-bound submission and supersession schemas', () => {
  it('keeps markerless records legacy and binds the known marker at claim surfaces', () => {
    assert.ok(WorkUnitIndexRecordSchema.safeParse(legacyIndex()).success);
    assert.ok(WorkUnitManifestSchema.safeParse(manifest()).success);
    assert.ok(WorkUnitBeaconSchema.safeParse(beacon()).success);

    assert.ok(WorkUnitIndexRecordSchema.safeParse(markedIndex()).success);
    assert.ok(WorkUnitManifestSchema.safeParse(manifest({
      submission_contract_version: WORK_UNIT_SUBMISSION_CONTRACT_VERSION,
    })).success);
    assert.ok(WorkUnitBeaconSchema.safeParse(beacon({
      submission_contract_version: WORK_UNIT_SUBMISSION_CONTRACT_VERSION,
    })).success);

    for (const current of [
      markedIndex({ submission_contract_version: 'work-unit.submission.v2' }),
      manifest({ submission_contract_version: 'work-unit.submission.v2' }),
      beacon({ submission_contract_version: 'work-unit.submission.v2' }),
    ]) {
      const schema = Object.hasOwn(current, 'task_brief')
        ? WorkUnitManifestSchema
        : Object.hasOwn(current, 'bundle') ? WorkUnitBeaconSchema : WorkUnitIndexRecordSchema;
      assert.equal(schema.safeParse(current).success, false);
    }
  });

  it('enforces the ledger-first marked index/status branch without changing legacy bytes', () => {
    const legacy = legacyIndex();
    const marked = markedIndex();
    const legacyBytes = JSON.stringify(legacy);
    const markedBytes = JSON.stringify(marked);
    assert.ok(WorkUnitIndexRecordSchema.safeParse(legacy).success);
    assert.ok(WorkUnitIndexRecordSchema.safeParse(marked).success);
    assert.equal(JSON.stringify(legacy), legacyBytes);
    assert.equal(JSON.stringify(marked), markedBytes);
    assert.ok(WorkUnitStatusFileSchema.safeParse(status({
      result_hash: 'legacy-result-hash',
      ledger_record_hash: ACCEPTED_HASH,
    })).success);
    assert.ok(WorkUnitSubmissionV1StatusFileSchema.safeParse(status()).success);
    assert.equal(WorkUnitSubmissionV1StatusFileSchema.safeParse(status({ result_hash: 'mixed' })).success, false);

    for (const invalid of [
      markedIndex({ accepted_ledger_record_hash: undefined }),
      markedIndex({ result_hash: 'mixed' }),
      markedIndex({ ledger_record_hash: ACCEPTED_HASH }),
      markedIndex({ status: 'claimed', accepted_ledger_record_hash: ACCEPTED_HASH, terminal_at: undefined }),
      legacyIndex({ accepted_ledger_record_hash: ACCEPTED_HASH }),
    ]) {
      assert.equal(WorkUnitIndexRecordSchema.safeParse(invalid).success, false);
    }
    const markedClaim = markedIndex({ status: 'claimed', accepted_ledger_record_hash: undefined, terminal_at: undefined });
    assert.ok(WorkUnitIndexRecordSchema.safeParse(markedClaim).success);
  });

  it('owns exactly nine immutable relation fields and six closed root codes', () => {
    assert.equal(WorkUnitSupersessionRootSchema.options.length, 6);
    assert.deepEqual(Object.keys(WorkUnitSupersessionRelationSchema.parse(relation())).sort(), [
      'accepted_ledger_record_hash',
      'predecessor_queue_item_id',
      'predecessor_work_id',
      'reason',
      'recorded_at',
      'root_code',
      'schema_version',
      'successor_queue_item_id',
      'tx_id',
    ]);
    for (const invalid of [
      relation({ reason: '   ' }),
      relation({ root_code: 'submitted_unknown_drift' }),
      relation({ schema_version: 'work-unit.supersession.v2' }),
      relation({ accepted_ledger_record_hash: 'not-a-hash' }),
      { ...relation(), extra: true },
    ]) {
      assert.equal(WorkUnitSupersessionRelationSchema.safeParse(invalid).success, false);
    }
  });

  it('binds a complete relation to its containing marked or legacy predecessor', () => {
    assert.ok(WorkUnitIndexRecordSchema.safeParse(markedIndex({ supersession_relation: relation() })).success);
    assert.ok(WorkUnitIndexRecordSchema.safeParse(legacyIndex({ supersession_relation: relation() })).success);
    for (const invalid of [
      markedIndex({ supersession_relation: { ...relation(), predecessor_work_id: 'wu-w0-b000-src-i0002' } }),
      markedIndex({ supersession_relation: { ...relation(), predecessor_queue_item_id: 'queue-other' } }),
      markedIndex({ supersession_relation: { ...relation(), accepted_ledger_record_hash: OTHER_HASH } }),
      markedIndex({ status: 'failed', accepted_ledger_record_hash: undefined, supersession_relation: relation() }),
      legacyIndex({ supersession_relation: { ...relation(), accepted_ledger_record_hash: OTHER_HASH } }),
      markedIndex({ supersession_relation: { ...relation(), tx_id: undefined } }),
    ]) {
      assert.equal(WorkUnitIndexRecordSchema.safeParse(invalid).success, false);
    }
  });

  it('requires exactly five supersession queue lineage fields and excludes relation-only fields', () => {
    const lineage = supersessionLineage();
    assert.deepEqual(WorkUnitSupersessionQueueLineageSchema.parse(lineage), lineage);
    assert.ok(QueueDemandItemSchema.safeParse(demand({ lineage: { inherited: 'kept', ...lineage } })).success);
    for (const invalidLineage of [
      { supersession_of_work_id: WORK_ID },
      supersessionLineage({ supersession_root: 'unknown' }),
      supersessionLineage({ supersession_accepted_ledger_record_hash: 'short' }),
      { ...supersessionLineage(), reason: 'relation-only' },
      { ...supersessionLineage(), schema_version: WORK_UNIT_SUPERSESSION_SCHEMA_VERSION },
    ]) {
      assert.equal(QueueDemandItemSchema.safeParse(demand({ lineage: invalidLineage })).success, false);
    }
  });
});

function owner(overrides = {}) {
  return {
    schema_version: WORK_UNIT_TRANSACTION_LOCK_SCHEMA_VERSION,
    tx_id: TX_ID,
    operation: 'submit_work_unit',
    journal_ref: `_work_units/_transactions/${TX_ID}.json`,
    target_work_ids: [WORK_ID],
    target_queue_item_ids: [QUEUE_ITEM_ID],
    acquired_at: NOW,
    ...overrides,
  };
}

function manifestProof(overrides = {}) {
  return {
    targets: [
      { path: '_work_units/_index.json', before_exists: true, before_sha256: ACCEPTED_HASH },
      { path: `${paths().work_unit_dir}/status.json`, before_exists: false },
    ],
    ...overrides,
  };
}

function journalV2(overrides = {}) {
  return {
    schema_version: WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION,
    tx_id: TX_ID,
    operation: 'submit_work_unit',
    journal_ref: `_work_units/_transactions/${TX_ID}.json`,
    target_work_ids: [WORK_ID],
    target_queue_item_ids: [QUEUE_ITEM_ID],
    mutation_manifest: manifestProof(),
    status: 'started',
    started_at: NOW,
    settled_at: null,
    error: null,
    ...overrides,
  };
}

function journalV1(overrides = {}) {
  return {
    schema_version: WORK_UNIT_TRANSACTION_V1_SCHEMA_VERSION,
    tx_id: 'legacy-tx',
    operation: 'submit_work_unit',
    status: 'started',
    started_at: NOW,
    committed_at: null,
    ...overrides,
  };
}

function caller() {
  return { operation: 'submit_work_unit', work_id: WORK_ID, queue_item_id: QUEUE_ITEM_ID };
}

function holder(overrides = {}) {
  return {
    tx_id: TX_ID,
    operation: 'submit_work_unit',
    journal_ref: `_work_units/_transactions/${TX_ID}.json`,
    target_work_ids: [WORK_ID],
    target_queue_item_ids: [QUEUE_ITEM_ID],
    journal_disposition: 'started',
    ...overrides,
  };
}

describe('work-unit transaction recovery schemas', () => {
  it('accepts exact-path before-images and rejects partial, duplicate, audit, and unsafe targets', () => {
    assert.deepEqual(WorkUnitTransactionMutationManifestSchema.parse(manifestProof()), manifestProof());
    for (const invalid of [
      { targets: [{ path: '_work_units/_index.json', before_exists: true }] },
      { targets: [{ path: '_work_units/_index.json', before_exists: false, before_sha256: ACCEPTED_HASH }] },
      { targets: [{ path: '../_index.json', before_exists: false }] },
      { targets: [{ path: '_work_units/*/status.json', before_exists: false }] },
      { targets: [{ path: '_work_units\\status.json', before_exists: false }] },
      { targets: [{ path: '_work_units/.lock', before_exists: false }] },
      { targets: [{ path: 'rb_trace.jsonl', before_exists: false }] },
      { targets: [{ path: '_logs/run.log', before_exists: false }] },
      { targets: [
        { path: '_work_units/_index.json', before_exists: true, before_sha256: ACCEPTED_HASH },
        { path: '_work_units/_index.json', before_exists: true, before_sha256: ACCEPTED_HASH },
      ] },
    ]) {
      assert.equal(WorkUnitTransactionMutationManifestSchema.safeParse(invalid).success, false);
    }
  });

  it('keeps transaction-v1 as a strict read-only legacy branch', () => {
    const valid = [
      journalV1(),
      journalV1({ status: 'committed', committed_at: NOW }),
      journalV1({ status: 'failed', error: 'legacy failure' }),
    ];
    valid.forEach((journal) => {
      assert.ok(WorkUnitTransactionV1JournalSchema.safeParse(journal).success);
      assert.ok(WorkUnitTransactionJournalSchema.safeParse(journal).success);
    });
    for (const invalid of [
      journalV1({ status: 'committed' }),
      journalV1({ status: 'failed' }),
      journalV1({ mutation_manifest: manifestProof() }),
      journalV1({ schema_version: 'work-unit.transaction.v0' }),
    ]) {
      assert.equal(WorkUnitTransactionJournalSchema.safeParse(invalid).success, false);
    }
  });

  it('accepts every v2 disposition and rejects mixed or incomplete disposition shapes', () => {
    const valid = [
      journalV2(),
      journalV2({ status: 'committed', settled_at: NOW }),
      journalV2({ status: 'rolled_back', settled_at: NOW, error: 'callback failed and exact rollback was proven' }),
      journalV2({ status: 'suspect', settled_at: NOW, error: 'before-image proof did not match' }),
    ];
    valid.forEach((journal) => {
      assert.ok(WorkUnitTransactionV2JournalSchema.safeParse(journal).success);
      assert.ok(WorkUnitTransactionJournalSchema.safeParse(journal).success);
    });
    for (const invalid of [
      journalV2({ mutation_manifest: undefined }),
      journalV2({ status: 'started', settled_at: NOW }),
      journalV2({ status: 'committed', settled_at: NOW, error: 'mixed' }),
      journalV2({ status: 'rolled_back', settled_at: NOW }),
      journalV2({ status: 'failed' }),
      journalV2({ committed_at: NOW }),
      journalV2({ mutation_manifest: { targets: [{
        path: `_work_units/_transactions/${TX_ID}.json`,
        before_exists: false,
      }] } }),
    ]) {
      assert.equal(WorkUnitTransactionV2JournalSchema.safeParse(invalid).success, false);
    }
  });

  it('requires an exact lock-owner/journal pair including target coordinates', () => {
    assert.ok(WorkUnitTransactionLockOwnerSchema.safeParse(owner()).success);
    assert.ok(WorkUnitTransactionPairSchema.safeParse({ owner: owner(), journal: journalV2() }).success);
    for (const pair of [
      { owner: owner({ journal_ref: '_work_units/_transactions/other.json' }), journal: journalV2() },
      { owner: owner(), journal: journalV2({ tx_id: 'other', journal_ref: '_work_units/_transactions/other.json' }) },
      { owner: owner(), journal: journalV2({ operation: 'claim_work_units' }) },
      { owner: owner(), journal: journalV2({ target_work_ids: [] }) },
      { owner: owner(), journal: journalV2({ target_queue_item_ids: ['queue-other'] }) },
      { owner: owner({ target_work_ids: [WORK_ID, WORK_ID] }), journal: journalV2() },
    ]) {
      assert.equal(WorkUnitTransactionPairSchema.safeParse(pair).success, false);
    }
  });

  it('closes none, busy, and suspect transaction projections', () => {
    const none = {
      disposition: 'none',
      caller: caller(),
      holder: null,
      targets_same_attempt: false,
      repair_kind: null,
      missing_fact: null,
      write_to: null,
      rerun: null,
    };
    const busy = {
      disposition: 'busy',
      caller: caller(),
      holder: holder(),
      targets_same_attempt: true,
      repair_kind: 'wait',
      missing_fact: null,
      write_to: null,
      rerun: `operate-work-unit submit /tmp/bundle --work-id ${WORK_ID}`,
    };
    const suspect = {
      disposition: 'suspect_transaction',
      caller: caller(),
      holder: { ...holder(), journal_disposition: 'suspect' },
      targets_same_attempt: true,
      repair_kind: 'recover_transaction',
      missing_fact: 'the unlocked journal needs exact before-image reconciliation',
      write_to: `_work_units/_transactions/${TX_ID}.json`,
      rerun: `operate-work-unit recover-transaction /tmp/bundle --tx-id ${TX_ID}`,
    };
    for (const projection of [none, busy, suspect]) {
      assert.deepEqual(WorkUnitTransactionProjectionSchema.parse(projection), projection);
    }
    for (const invalid of [
      { ...busy, holder: { ...busy.holder, journal_disposition: 'suspect' } },
      { ...busy, repair_kind: 'timeout' },
      { ...suspect, write_to: null },
      { ...suspect, repair_kind: 'missing_contract' },
      { ...none, extra: true },
    ]) {
      assert.equal(WorkUnitTransactionProjectionSchema.safeParse(invalid).success, false);
    }
  });
});
