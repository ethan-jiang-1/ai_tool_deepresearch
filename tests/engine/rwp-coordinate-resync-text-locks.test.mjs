// tests/engine/rwp-coordinate-resync-text-locks.test.mjs
// 2026-09-01-resync-wave-phase-content-coordinates 的文本回归锁：
// RWP 主 spec 的坐标/指称同步（死段名清除、§3.4/§3.2 修正坐标、
// wave2 documentation-token 语义）固化为本测试防止回潮。
// @impl RWP-010
// @impl RWP-011
// @impl RWP-014
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const RWP = 'openspec/specs/research/research-wave-phase-content/spec.md';
const WAVE0 = 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md';
const WAVE1 = 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md';
const WAVE2 = 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md';

test('RWP spec carries no dead section names or changelog-voice prose', () => {
  const t = read(RWP);
  assert.ok(!t.includes('Rerun-Aware Behavior'), 'dead section name must stay absent');
  assert.ok(!t.includes('SHALL add a §3.0'), 'changelog-voice SHALL add must stay absent');
  assert.ok(
    !t.includes('Phase-wave2 §3.2.3'),
    'stale wave2 section coordinate must stay absent',
  );
});

test('RWP spec cites the real seed-projection coordinates', () => {
  const t = read(RWP);
  assert.ok(
    t.includes('Phase-wave0 §3.4（Seed Projection Update）'),
    'wave0 seed projection coordinate must be §3.4',
  );
  assert.ok(
    t.includes('Phase-wave1 §3.3（Seed Projection Update）'),
    'wave1 seed projection coordinate must be §3.3',
  );
  assert.ok(
    t.includes('Phase-wave2 §3.2 Execution Loop'),
    'wave2 coordinate must be §3.2 Execution Loop',
  );
});

test('RWP spec states the wave2 documentation-token semantics', () => {
  const t = read(RWP);
  assert.ok(
    t.includes('`__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__` are documentation tokens'),
    'wave2 documentation-token sentence must stay',
  );
  assert.ok(
    t.includes('not Agent-edit targets'),
    'not-Agent-edit-targets wording must stay',
  );
});

test('spec coordinates resolve to real anchors in the phase nodes', () => {
  assert.ok(read(WAVE0).includes('### 3.4 Seed Projection Update'), 'wave0 §3.4 anchor must exist');
  assert.ok(read(WAVE1).includes('### 3.3 Seed Projection Update'), 'wave1 §3.3 anchor must exist');
  assert.ok(read(WAVE2).includes('### 3.2 Execution Loop'), 'wave2 §3.2 anchor must exist');
  assert.ok(
    read(WAVE2).includes('documentation tokens, not Agent-edit targets'),
    'wave2 token sentence anchor must exist',
  );
  assert.ok(
    read(WAVE0).includes('same for first-run and rerun-added Topics'),
    'wave0 rerun-added classification anchor must exist',
  );
  assert.ok(
    read(WAVE1).includes('same for first-run and rerun-added Topics'),
    'wave1 rerun-added classification anchor must exist',
  );
});
