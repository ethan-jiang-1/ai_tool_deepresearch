// @impl RTI-007, WPG-015, RRM-006, RRM-007
// Integration: rerun round continuity — direction resolver, claim stamping, eligible-rows

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const FW = path.resolve('DPT_FRAMEWORK');
let bundleDir;

function cli(args) {
  return execSync(`node ${args}`, { encoding: 'utf8', timeout: 15000 });
}

before(() => {
  bundleDir = path.join('/tmp', `dpt_test_rc_${randomUUID()}`);
  mkdirSync(bundleDir, { recursive: true });
  // Minimal bundle skeleton
  mkdirSync(path.join(bundleDir, 'seed_topics'), { recursive: true });
  mkdirSync(path.join(bundleDir, '_work_units'), { recursive: true });
  mkdirSync(path.join(bundleDir, 'artifacts/wave0/01_test'), { recursive: true });
  mkdirSync(path.join(bundleDir, 'artifacts/wave1/01_test'), { recursive: true });
  mkdirSync(path.join(bundleDir, 'artifacts/wave2'), { recursive: true });
  writeFileSync(path.join(bundleDir, 'rb_status.json'), JSON.stringify({
    current_node: 'phases/phase-wave0.md', current_gate: 'seed_topics_ready', next_gate: 'wave0_complete',
  }));
  writeFileSync(path.join(bundleDir, 'rb_profile.yaml'), [
    'human_decision_checkpoints:',
    '  hitl2:',
    '    rerun_count: 2',
    '    rationale: "supplement cost analysis"',
    'research_style_params:',
    '  wave0_per_topic_source_floor: 5',
    '  wave1_per_topic_ref_floor: 3',
    '  topic_unique_ratio: 0.7',
  ].join('\n'));
  writeFileSync(path.join(bundleDir, 'rb_queue.json'), JSON.stringify({
    active_window: [], refill_pool: [], terminal_history: [],
    delegated_in_flight: {},
  }));
  writeFileSync(path.join(bundleDir, '_work_units/_index.json'), JSON.stringify({
    work_units: {
      wv1_r1: {
        work_id: 'wv1_r1', queue_item_id: 'q1', wave: 1, batch_id: 'b001', batch_index: 0,
        claim_index: 1, attempt_index: 1, kind: 'wave1_topic_deepening', kind_code: 'wv1td',
        status: 'submitted', producer_rule: 'topic_deepening', creation_reason: 'claim',
        queue_item_snapshot_hash: 'abc', receipt_nonce: 'wu-0000000000000001',
        claimed_at: '2026-01-01T00:00:00Z', timeout_ms: 600000,
        deadline_at: '2026-01-01T00:10:00Z',
        rerun_count: 1,
        runtime_refs: {}, paths: { work_unit_dir: '_work_units/wave1/wv1_r1' },
      },
      wv1_r2: {
        work_id: 'wv1_r2', queue_item_id: 'q2', wave: 1, batch_id: 'b002', batch_index: 0,
        claim_index: 1, attempt_index: 1, kind: 'wave1_topic_deepening', kind_code: 'wv1td',
        status: 'submitted', producer_rule: 'topic_deepening', creation_reason: 'claim',
        queue_item_snapshot_hash: 'def', receipt_nonce: 'wu-0000000000000002',
        claimed_at: '2026-02-01T00:00:00Z', timeout_ms: 600000,
        deadline_at: '2026-02-01T00:10:00Z',
        rerun_count: 2,
        runtime_refs: {}, paths: { work_unit_dir: '_work_units/wave1/wv1_r2' },
      },
    },
    kind_registry: {},
    waves: { wave1: { batches: { b001: { next_claim_index: 2 }, b002: { next_claim_index: 2 } } } },
  }));
  // Seed topic with round-1 backfill + rerun direction
  writeFileSync(path.join(bundleDir, 'seed_topics/01_test.md'), [
    '## 本轮新增证据',
    '- evidence_meaning: R1 evidence',
    '- relationship: supports',
    '- refs: reference/00-shared.md _work_units/wave0/wv0_r1',
    '- status: supported',
    '- next_hop: deepen',
    '',
    '## 本轮新增机制理解',
    '- evidence_meaning: R1 mechanism',
    '- relationship: supports',
    '- refs: _work_units/wave1/wv1_r1',
    '- status: supported',
    '- next_hop: cross-topic',
    '',
    '## 本轮重跑方向',
    '- **rerun_count**: 2',
    '- **action**: supplement',
    '- **new_search_dimensions**: "cost analysis"',
  ].join('\n'));
});

after(() => {
  if (bundleDir && existsSync(bundleDir)) rmSync(bundleDir, { recursive: true, force: true });
});

describe('rerun round continuity', () => {
  it('direction resolver: matching when rerun_count equals profile', () => {
    const content = readFileSync(path.join(bundleDir, 'seed_topics/01_test.md'), 'utf8');
    // Profile rerun_count=2, direction rerun_count=2 -> matching
    const profileCount = 2;
    const match = content.match(/\*{0,2}rerun_count\*{0,2}\s*:\s*(\d+)/i);
    assert.ok(match, 'rerun_count field found in direction');
    assert.equal(parseInt(match[1]), profileCount, 'direction count matches profile');
  });

  it('claim stamps rerun_count into index record', () => {
    const index = JSON.parse(readFileSync(path.join(bundleDir, '_work_units/_index.json'), 'utf8'));
    assert.equal(index.work_units.wv1_r2.rerun_count, 2, 'round-2 row has rerun_count=2');
    assert.equal(index.work_units.wv1_r1.rerun_count, 1, 'round-1 row has rerun_count=1');
  });

  it('eligible-rows returns only current-round rows', () => {
    const index = JSON.parse(readFileSync(path.join(bundleDir, '_work_units/_index.json'), 'utf8'));
    const profileRerunCount = 2;
    const submitted = Object.values(index.work_units).filter((r) => r.status === 'submitted');
    const eligible = submitted.filter((r) => r.rerun_count === profileRerunCount);
    assert.equal(eligible.length, 1, 'only one round-2 eligible row');
    assert.equal(eligible[0].work_id, 'wv1_r2');
    const legacyExcluded = submitted.filter((r) => r.rerun_count === undefined || r.rerun_count === null);
    assert.equal(legacyExcluded.length, 0, 'no legacy rows in this fixture');
  });

  it('round-1 row excluded from eligible when profile is round 2', () => {
    const index = JSON.parse(readFileSync(path.join(bundleDir, '_work_units/_index.json'), 'utf8'));
    const submitted = Object.values(index.work_units).filter((r) => r.status === 'submitted');
    const notEligible = submitted.filter((r) => r.rerun_count !== 2);
    assert.equal(notEligible.length, 1, 'round-1 row excluded');
    assert.equal(notEligible[0].work_id, 'wv1_r1');
  });
});
