// SUD-008: `operate-work-unit claim` stdout must be one machine-parseable JSON document.
// Regression lock for BUG-225: wave0 delegated and wave1 phase_agent_fallback claims both
// emit stdout that a strict JSON parser can consume without preprocessing.
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createQueue,
  enqueue,
  makeItem,
  saveQueue,
} from '../../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import { renderSeedProjectionAppendix } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { setStatusWindow } from './handoff-fixtures.mjs';

const REPO_ROOT = process.cwd();
const WORK_UNIT_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

const TOPIC = {
  topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
  id: '01',
  slug: 'topic-a',
  title: 'Topic A',
  must_answer: ['How should Topic A be investigated?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
  previous_layouts: [],
};

function unique(prefix) {
  return `rt_claim_stdout_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function run(command, args) {
  return spawnSync(process.execPath, [command, ...args], { encoding: 'utf-8', timeout: 15000 });
}

function createBundle(prefix) {
  const name = unique(prefix);
  const created = run(NEW_BUNDLE, [name, '--force', '--target-dir', BUNDLES_DIR]);
  assert.equal(created.status, 0, created.stderr || created.stdout);
  const dir = created.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
  createdDirs.push(dir);

  setStatusWindow(dir, 'wave0_complete', 'wave1_complete');
  const planPath = join(dir, 'rb_plan.md');
  const existing = readFileSync(planPath, 'utf-8');
  const frontmatter = `---\n${JSON.stringify({
    plan_basename: name,
    derived_topic_count: 1,
    topic_registry_version: '2',
    topic_registry: [TOPIC],
  }, null, 2)}\n---`;
  writeFileSync(planPath, frontmatter + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  writeFileSync(join(dir, 'seed_topics', `${TOPIC.slug}.md`), `---
topic_uid: ${TOPIC.topic_uid}
id: "${TOPIC.id}"
slug: ${TOPIC.slug}
title: ${TOPIC.title}
must_answer:
  - ${TOPIC.must_answer[0]}
scope_role: primary
depends_on_topic_uids: []
---

# ${TOPIC.title}

${renderSeedProjectionAppendix()}
`);
  return dir;
}

function enqueueItem(dir, overrides) {
  let queue = createQueue(join(dir));
  queue = enqueue(queue, makeItem({
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    producer_rule: 'source_intake_fan_in',
    payload: { topic_uid: TOPIC.topic_uid, topic_slug: TOPIC.slug, wave: 0 },
    required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
    writes_to: ['artifacts/wave0/topic-a/source.yaml'],
    ...overrides,
  }));
  saveQueue(dir, queue);
}

function claim(dir, args) {
  const result = run(WORK_UNIT_CLI, ['claim', dir, ...args]);
  return { result, stdout: result.stdout };
}

function assertClaimJson(stdout) {
  const parsed = JSON.parse(stdout); // throws if stdout is not one JSON document
  assert.ok(Array.isArray(parsed.claimed_work_ids), 'claimed_work_ids must be an array');
  assert.ok(parsed.claimed_work_ids.length > 0, 'claim must succeed and return a work id');
  assert.ok(Array.isArray(parsed.prompt_refs), 'prompt_refs must be an array');
  const ref = parsed.prompt_refs[0];
  assert.equal(typeof ref?.task_ref, 'string', 'prompt_refs[0].task_ref must be a string coordinate');
  return parsed;
}

describe('SUD-008: claim stdout is one machine-parseable JSON document', () => {
  after(() => {
    for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
  });

  it('wave0 delegated claim stdout parses as JSON and carries claimed coordinates', () => {
    const dir = createBundle('w0');
    enqueueItem(dir, {
      queue_item_id: 'topic-a-w0',
      title: 'Wave0 source intake for Topic A',
      kind: 'wave0_source_intake',
    });
    const { result, stdout } = claim(dir, [
      '--phase', 'wave0', '--count', '1',
      '--actor-outcome', 'available', '--actor-source', 'native_probe',
      '--actor-role-key', 'dpt-source-intake', '--actor-reason', 'probe_succeeded',
      '--execution-actor', 'delegated_subagent',
    ]);
    assert.equal(result.status, 0, result.stderr || 'claim failed');
    assertClaimJson(stdout);
  });

  it('wave1 phase_agent_fallback claim stdout parses as JSON and carries claimed coordinates', () => {
    const dir = createBundle('w1');
    enqueueItem(dir, {
      queue_item_id: 'topic-a-w1-supp',
      title: 'Supplementary deepening Topic A',
      kind: 'wave1_topic_deepening',
      producer_rule: 'topic_deepening',
      payload: {
        topic_uid: TOPIC.topic_uid,
        topic_slug: TOPIC.slug,
        wave: 1,
        assignment_mode: 'supplementary',
        reference_floor_deficit: 2,
      },
      required_receipts: [],
      writes_to: ['artifacts/wave1/topic-a/evidence_summary.md'],
      targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 } },
    });
    const { result, stdout } = claim(dir, [
      '--phase', 'wave1', '--count', '1',
      '--actor-outcome', 'unavailable', '--actor-source', 'native_probe',
      '--actor-role-key', 'dpt-evidence-extractor', '--actor-reason', 'probe_host_policy_blocked',
      '--execution-actor', 'phase_agent_fallback',
    ]);
    assert.equal(result.status, 0, result.stderr || 'claim failed');
    assertClaimJson(stdout);
  });
});
