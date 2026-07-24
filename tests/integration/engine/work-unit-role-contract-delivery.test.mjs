// @impl DEW-009, RWP-015

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  claimWorkUnits,
  createWorkUnit,
} from '../../../DPT_FRAMEWORK/engine/work-unit-core.mjs';
import {
  availableActorDecision,
  cleanupWorkUnitBundle,
  delegatedQueueItem,
  seedDelegatedQueue,
  tempWorkUnitBundle,
} from '../../engine/work-unit-test-helpers.mjs';

function claimWave1(bundleDir, { assignmentMode = 'primary', actorDecision = availableActorDecision('wave1_topic_deepening') } = {}) {
  seedDelegatedQueue(bundleDir, [delegatedQueueItem('wave1-queue', {
    phase: 'wave1',
    kind: 'wave1_topic_deepening',
    payload: { assignment_mode: assignmentMode },
  })]);
  const claim = claimWorkUnits(bundleDir, { phase: 'wave1', count: 1, ...actorDecision });
  assert.equal(claim.claimed_count, 1);
  const prompt = claim.prompt_refs[0];
  return {
    claim,
    prompt,
    task: readFileSync(path.join(bundleDir, prompt.task_ref), 'utf8'),
  };
}

describe('current actor-bound work-unit delivery', () => {
  it('gives delegated primary Wave1 actors one Engine-derived role/shared guidance surface and contract-owned authoring projection', () => {
    const bundleDir = tempWorkUnitBundle('wu-role-delivery-primary-');
    try {
      const { prompt, task } = claimWave1(bundleDir);
      assert.match(task, /## Actor Guidance/);
      assert.match(task, /workflows\/nodes\/phases\/subagent-dpt-evidence-extractor\.md/);
      assert.match(task, /shared-page-fetch-guidance/);
      assert.match(task, /## Completion Contract/);
      assert.match(task, /### Required Outputs/);
      assert.match(task, /Wave1 evidence summary/);
      assert.match(task, /Wave1 question list/);
      assert.match(prompt.spawn_prompt, /subagent-dpt-evidence-extractor\.md/);
      assert.match(prompt.spawn_prompt, /shared-page-fetch-guidance/);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('gives the accepted Phase Agent fallback the same kind-owned actor guidance', () => {
    const bundleDir = tempWorkUnitBundle('wu-role-delivery-fallback-');
    try {
      const { prompt, task } = claimWave1(bundleDir, {
        actorDecision: {
          actorObservation: {
            outcome: 'unavailable',
            source: 'native_probe',
            role_key: 'dpt-evidence-extractor',
            reason_code: 'probe_capacity_unavailable',
          },
          executionActorClass: 'phase_agent_fallback',
        },
      });
      assert.match(task, /execution_actor_class: `phase_agent_fallback`/);
      assert.match(task, /subagent-dpt-evidence-extractor\.md/);
      assert.match(task, /shared-page-fetch-guidance/);
      assert.match(prompt.spawn_prompt, /subagent-dpt-evidence-extractor\.md/);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('keeps a supplementary Wave1 assignment within its empty required-output scope', () => {
    const bundleDir = tempWorkUnitBundle('wu-role-delivery-supplementary-');
    try {
      const { task } = claimWave1(bundleDir, { assignmentMode: 'supplementary' });
      assert.match(task, /Required direct outputs: none for this assignment/);
      assert.doesNotMatch(task, /evidence-summary output, question-list output/);
      assert.doesNotMatch(task, /Required output:.*evidence-summary/);
      assert.doesNotMatch(task, /Required output:.*question-list/);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('preserves the existing no-claim repair before delivery and leaves legacy construction unbound', () => {
    const noClaimBundle = tempWorkUnitBundle('wu-role-delivery-no-claim-');
    const legacyBundle = tempWorkUnitBundle('wu-role-delivery-legacy-');
    try {
      seedDelegatedQueue(noClaimBundle, [delegatedQueueItem('mismatch-queue', {
        phase: 'wave1',
        kind: 'wave1_topic_deepening',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
      })]);
      const noClaim = claimWorkUnits(noClaimBundle, {
        phase: 'wave1',
        count: 1,
        actorObservation: {
          outcome: 'available',
          source: 'native_probe',
          role_key: 'dpt-source-intake',
          reason_code: 'probe_succeeded',
        },
        executionActorClass: 'delegated_subagent',
      });
      assert.equal(noClaim.claimed_count, 0);
      assert.equal(noClaim.reason_code, 'kind_actor_policy_mismatch');
      assert.equal(existsSync(path.join(noClaimBundle, '_work_units', '_index.json')), false);

      const { manifest } = createWorkUnit(legacyBundle, {
        queueItem: delegatedQueueItem('legacy-queue', { phase: 'wave1', kind: 'wave1_topic_deepening' }),
        wave: 1,
      });
      assert.equal(manifest.actor_execution, undefined);
      const legacyTask = readFileSync(path.join(legacyBundle, manifest.paths.task_ref), 'utf8');
      assert.doesNotMatch(legacyTask, /## Actor Guidance/);
    } finally {
      cleanupWorkUnitBundle(noClaimBundle);
      cleanupWorkUnitBundle(legacyBundle);
    }
  });
});
