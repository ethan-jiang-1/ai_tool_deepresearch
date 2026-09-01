// tests/engine/rrm-spec-truth-sync-text-locks.test.mjs
// 2026-09-01-sync-return-map-spec-truth 的文本回归锁：
// RRM 主 spec 的三处真相同步（pointer 所有权 / 伪函数名清除 / 退役散文过去化）
// 与 return-map.mjs 导航注释的幽灵符号清零，固化为本测试防止回潮。
// @impl RRM-003
// @impl RRM-006
// @impl RRM-007
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const RRM = 'openspec/specs/research/research-return-map/spec.md';
const RETURN_MAP = 'DEEP_RESEARCH_HARNESS/engine/helpers/return-map.mjs';

test('RRM-003: spec describes pointer reality, not a shared-contract owner', () => {
  const t = read(RRM);
  assert.ok(
    t.includes('SHALL remain a compatibility pointer that loads through phase `requires` chains'),
    'RRM-003 must state the shared node is a compatibility pointer',
  );
  assert.ok(
    t.includes('workflows/nodes/templates/seed-topic-template.md'),
    'RRM-003 must name the canonical template owner',
  );
  assert.ok(
    t.includes('command_playbook/operate-topic-state.md'),
    'RRM-003 must name the canonical playbook owner',
  );
  assert.ok(
    !t.includes('contract SHALL own the canonical Agent-facing return-map entry example'),
    'stale shared-contract ownership sentence must be gone',
  );
  assert.ok(
    !t.includes('the loaded shared return-map contract SHALL expose'),
    'stale shared-contract exposure scenario must be gone',
  );
  assert.ok(
    !t.includes('one complete generic return-map template in the shared authoring contract'),
    'stale template-location scenario must be gone',
  );
  assert.ok(
    !t.includes('statically parity-checked against the shared contract'),
    'parity anchor must be the canonical template field set',
  );
});

test('RRM-006: pseudo callable identifiers stay absent, wave-token semantics stay present', () => {
  const t = read(RRM);
  for (const pseudo of [
    'retired per-wave backfill token check',
    'retired return-map inspection',
  ]) {
    assert.ok(!t.includes(pseudo), `fictional identifier prose must stay absent: ${pseudo}`);
  }
  assert.ok(
    t.includes('The per-wave backfill token filter SHALL accept the current target wave'),
    'wave-filter acceptance sentence must stay',
  );
  assert.ok(
    t.includes('Tokens belonging to other waves SHALL NOT cause a skip'),
    'cross-wave skip prohibition must stay',
  );
  assert.ok(
    t.includes('Each Wave return-map inspection SHALL pass its current target wave to that filter'),
    'target-wave passing requirement must stay',
  );
  // token→wave 归属表关键行
  assert.ok(t.includes('| Wave0 | `__BACKFILL_WAVE0_EVIDENCE__` |'), 'wave0 token row must stay');
  assert.ok(
    t.includes('| Wave1 | `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, `__BACKFILL_PENDING_QUESTIONS__` |'),
    'wave1 token row must stay',
  );
  assert.ok(t.includes('| Wave2 | `__BACKFILL_WAVE2_JUDGMENT__` |'), 'wave2 token row must stay');
});

test('RRM-007: retired token rules keep past-tense framing only', () => {
  const t = read(RRM);
  assert.ok(
    !t.includes('SHALL be retired'),
    'present-tense retirement SHALL must stay gone',
  );
  assert.ok(
    t.includes('are retired historical names'),
    'past-tense retirement framing must stay',
  );
  // 退役不改变 blocking 语义的不变量必须保留
  assert.ok(
    t.includes('does not make token\nfailure degradation-eligible'),
    'non-degradation invariant must stay',
  );
});

test('return-map.mjs navigation comment lists only real exports', () => {
  const source = read(RETURN_MAP);
  const nav = source.split('\n')[0];
  assert.ok(nav.startsWith('// Navigation: public API'), 'navigation comment must stay on line 1');
  assert.ok(
    !nav.includes('inspectSeedTopicReturnMaps'),
    'de-exported ghost symbol must stay absent from the navigation comment',
  );
  const exportNames = new Set(
    [...source.matchAll(/^export (?:const|function) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]),
  );
  assert.ok(exportNames.size >= 10, 'return-map public API exports must exist');
  const listed = nav
    .replace('// Navigation: public API — ', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  assert.ok(listed.length >= 10, 'navigation comment must list the public API');
  for (const name of listed) {
    assert.ok(exportNames.has(name), `navigation symbol has no real export: ${name}`);
  }
});
