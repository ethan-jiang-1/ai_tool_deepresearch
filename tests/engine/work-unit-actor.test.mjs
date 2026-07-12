// @impl DEW-016, DEW-017, AGQ-024

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { claimWorkUnits, closeWorkUnitAttempt, loadWorkUnitIndex, workUnitIndexPath } from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';
import { evaluateActorDecision } from '../../DPT_FRAMEWORK/engine/work-unit-actor.mjs';
import { loadQueue } from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { delegatedQueueItem, recursiveAuthoritySnapshot, seedDelegatedQueue } from './work-unit-test-helpers.mjs';

const policy = { delegated_role_key: 'dpt-source-intake', phase_agent_fallback: 'allowed' };
const unavailable = {
  outcome: 'unavailable',
  source: 'native_probe',
  role_key: 'dpt-source-intake',
  reason_code: 'probe_capacity_unavailable',
};

describe('work-unit actor decision', () => {
  it('implements the closed observation matrix and default deny policy', () => {
    assert.equal(evaluateActorDecision({ observation: { outcome: 'available', source: 'native_probe', role_key: 'dpt-source-intake', reason_code: 'probe_succeeded' }, executionActorClass: 'delegated_subagent', plannedRoleKey: 'dpt-source-intake', actorPolicy: policy }).verdict, 'allow_claim');
    assert.equal(evaluateActorDecision({ observation: unavailable, executionActorClass: 'delegated_subagent', plannedRoleKey: 'dpt-source-intake', actorPolicy: policy }).verdict, 'no_claim');
    assert.equal(evaluateActorDecision({ observation: unavailable, executionActorClass: 'phase_agent_fallback', plannedRoleKey: 'dpt-source-intake', actorPolicy: policy }).verdict, 'allow_claim');
    assert.equal(evaluateActorDecision({ observation: null, executionActorClass: 'delegated_subagent', plannedRoleKey: 'dpt-source-intake', actorPolicy: policy }).reason, 'observation_required');
    assert.equal(evaluateActorDecision({ observation: unavailable, executionActorClass: 'phase_agent_fallback', plannedRoleKey: 'dpt-source-intake', actorPolicy: { ...policy, phase_agent_fallback: 'prohibited' } }).verdict, 'no_claim');
    assert.throws(() => evaluateActorDecision({ observation: { ...unavailable, raw_error: 'secret' }, executionActorClass: 'delegated_subagent', plannedRoleKey: 'dpt-source-intake', actorPolicy: policy }), /unrecognized_keys/);
  });

  it('does not mutate queue or allocate authority for unavailable normal actor', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'wu-actor-no-claim-'));
    try {
      seedDelegatedQueue(dir, Array.from({ length: 5 }, (_, index) => delegatedQueueItem(`queue-${index}`)));
      for (const ref of ['rb_status.json', 'rb_profile.yaml', 'rb_plan.md', 'artifact.txt', 'reference/ref.md', 'final/report.md']) {
        const target = path.join(dir, ref);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, `${ref}\n`);
      }
      const queuePath = path.join(dir, 'rb_queue.json');
      const before = readFileSync(queuePath);
      const authorityBefore = recursiveAuthoritySnapshot(dir);
      const result = claimWorkUnits(dir, { phase: 'wave0', count: 5, actorObservation: unavailable, executionActorClass: 'delegated_subagent' });
      assert.equal(result.claimed_count, 0);
      assert.equal(result.actor_preflight.verdict, 'no_claim');
      assert.equal(existsSync(workUnitIndexPath(dir)), false);
      assert.deepEqual(readFileSync(queuePath), before);
      assert.deepEqual(recursiveAuthoritySnapshot(dir), authorityBefore);
      assert.equal(Object.keys(loadQueue(dir).delegated_in_flight).length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('claims exactly one explicit fallback and records actor authority', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'wu-actor-fallback-'));
    try {
      seedDelegatedQueue(dir, [delegatedQueueItem('queue-a'), delegatedQueueItem('queue-b')]);
      const result = claimWorkUnits(dir, { phase: 'wave0', count: 5, actorObservation: unavailable, executionActorClass: 'phase_agent_fallback' });
      assert.equal(result.claimed_count, 1);
      const record = loadWorkUnitIndex(dir).work_units[result.claimed_work_ids[0]];
      assert.equal(record.actor_contract_version, 'work-unit.actor.v1');
      assert.equal(record.actor_execution.execution_actor_class, 'phase_agent_fallback');
      assert.equal(record.actor_execution.fallback_from, 'delegated_subagent');
      assert.equal(loadQueue(dir).active_window[0].queue_item_id, 'queue-b');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('retries a zero-progress actor spawn failure with a new fallback work ID', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'wu-actor-recovery-'));
    try {
      seedDelegatedQueue(dir, [delegatedQueueItem('queue-a')]);
      const normal = claimWorkUnits(dir, {
        phase: 'wave0',
        actorObservation: { outcome: 'available', source: 'native_probe', role_key: 'dpt-source-intake', reason_code: 'probe_succeeded' },
        executionActorClass: 'delegated_subagent',
      });
      const failed = closeWorkUnitAttempt(dir, { work_id: normal.claimed_work_ids[0], status: 'failed', reason: 'actor_spawn_unavailable:probe_capacity_unavailable' });
      assert.equal(failed.retry_requeued, true);
      const fallback = claimWorkUnits(dir, { phase: 'wave0', count: 5, actorObservation: unavailable, executionActorClass: 'phase_agent_fallback' });
      assert.equal(fallback.claimed_count, 1);
      assert.notEqual(fallback.claimed_work_ids[0], normal.claimed_work_ids[0]);
      assert.equal(loadWorkUnitIndex(dir).work_units[fallback.claimed_work_ids[0]].attempt_index, 2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('isolates mixed roles and never reuses historical observation', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'wu-actor-mixed-'));
    try {
      seedDelegatedQueue(dir, [
        delegatedQueueItem('queue-a'),
        delegatedQueueItem('queue-b', { targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 } } }),
      ]);
      const first = claimWorkUnits(dir, {
        phase: 'wave0',
        count: 5,
        actorObservation: { outcome: 'available', source: 'native_probe', role_key: 'dpt-source-intake', reason_code: 'probe_succeeded' },
        executionActorClass: 'delegated_subagent',
      });
      assert.equal(first.claimed_count, 1);
      assert.equal(loadQueue(dir).active_window[0].queue_item_id, 'queue-b');
      const withoutCurrentObservation = claimWorkUnits(dir, { phase: 'wave0', count: 1 });
      assert.equal(withoutCurrentObservation.claimed_count, 0);
      assert.notEqual(withoutCurrentObservation.actor_preflight.verdict, 'allow_claim');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
