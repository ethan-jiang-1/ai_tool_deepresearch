// @impl DEW-002, DEW-004, FRE-005

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { makeItem } from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import {
  createWorkUnit,
  loadWorkUnitIndex,
  saveWorkUnitIndex,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'wu-'));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function queueItem(overrides = {}) {
  return makeItem({
    queue_item_id: 'queue-source-topic-a',
    title: 'Source intake topic A',
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: { topic_slug: 'topic-a' },
    ...overrides,
  });
}

const retiredAuthorityPattern = new RegExp([
  '_sub' + 'agents',
  'drive-' + 're' + 'lay' + '-sl' + 'ot',
  'Sl' + 'ot' + 'Result',
].join('|'));

describe('work-unit index and envelope', () => {
  it('allocates index record and writes envelope surfaces', () => {
    const dir = tempBundle();
    try {
      const { record, manifest } = createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      assert.match(record.work_id, /^wu-w0-b000-src-i0001$/);
      assert.equal(record.queue_item_id, 'queue-source-topic-a');
      assert.equal(record.status, 'claimed');
      assert.equal(record.queue_item_snapshot_hash, manifest.queue_item_snapshot_hash);
      for (const ref of [
        manifest.paths.manifest_ref,
        manifest.paths.task_ref,
        manifest.paths.result_schema_ref,
        manifest.paths.beacon_ref,
        manifest.paths.runtime_receipt_ref,
        manifest.paths.status_ref,
        manifest.paths.agent_ref,
      ]) {
        assert.ok(readFileSync(path.join(dir, ref), 'utf-8') !== undefined);
      }
      const index = loadWorkUnitIndex(dir);
      assert.equal(index.status_counts.claimed, 1);
      assert.equal(index.inspect_projection.total, 1);

      const task = readFileSync(path.join(dir, manifest.paths.task_ref), 'utf-8');
      assert.match(task, /## Output Contract/);
      assert.match(task, /## Cache Policy/);
      assert.match(task, /## Absolute Runtime Paths/);
      assert.match(task, /## Write-Before-Return Checklist/);
      assert.match(task, new RegExp(path.join(dir, manifest.paths.result_ref).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(task, /Read `_beacon\.json` before writing runtime files/);
      assert.match(task, /Returning research findings in chat without writing the required files is a work-unit failure/);
      assert.match(task, /cache `page\.md` must contain fetched page content or an explicit degraded\/fetch-failure record/);
      assert.match(task, /declare `cache_trails` as bundle-relative cache leaf directory paths only/);
      assert.match(task, /do not list `websearch\.json`, `page\.md`, or `meta\.json` file paths/);
      assert.match(task, /work_unit_search_started/);
      assert.match(task, new RegExp(record.work_id));
      assert.match(task, new RegExp(record.queue_item_id));
      assert.doesNotMatch(task, retiredAuthorityPattern);

      const beacon = JSON.parse(readFileSync(path.join(dir, manifest.paths.beacon_ref), 'utf-8'));
      assert.equal(beacon.work_id, record.work_id);
      assert.equal(beacon.queue_item_id, record.queue_item_id);
      assert.equal(beacon.kind, record.kind);
      assert.equal(beacon.receipt_nonce, record.receipt_nonce);
      assert.equal(beacon.runtime_refs_authority, 'diagnostic_only');
      assert.deepEqual(beacon.required_receipt_fields, ['work_id', 'queue_item_id', 'kind', 'receipt_nonce']);
      assert.ok(beacon.output_contract.output_files.required);
      assert.equal(beacon.cache_policy.authority, 'verified_during_submit');
    } finally {
      cleanup(dir);
    }
  });

  it('generates a spawn prompt from manifest bindings and kind contract', () => {
    const dir = tempBundle();
    try {
      const { record, manifest, spawn_prompt } = createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      assert.match(spawn_prompt, new RegExp(record.work_id));
      assert.match(spawn_prompt, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(spawn_prompt, new RegExp(manifest.paths.task_ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(spawn_prompt, /Do not generate a new nonce/);
      assert.match(spawn_prompt, /verify every declared output file/);
      assert.match(spawn_prompt, /cache_trails must list cache leaf directory paths only/);
      assert.match(spawn_prompt, /do not list websearch\.json, page\.md, or meta\.json file paths/);
      assert.match(spawn_prompt, /runtime-receipt\.jsonl/);
      assert.match(spawn_prompt, /result\.schema\.json/);
      assert.match(spawn_prompt, /runtime_refs diagnostic metadata/);
      assert.doesNotMatch(spawn_prompt, retiredAuthorityPattern);
    } finally {
      cleanup(dir);
    }
  });

  it('increments attempt_index for retry of the same queue demand', () => {
    const dir = tempBundle();
    try {
      const first = createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      const index = loadWorkUnitIndex(dir);
      index.work_units[first.record.work_id].status = 'timed_out';
      saveWorkUnitIndex(dir, index);
      const second = createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      assert.equal(second.record.attempt_index, 2);
      assert.equal(second.record.claim_index, 2);
      assert.notEqual(second.record.work_id, first.record.work_id);
    } finally {
      cleanup(dir);
    }
  });
});
