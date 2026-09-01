// tests/engine/rrm-slim-structure-locks.test.mjs
// 2026-09-01-slim-rrm-requirements 的结构回归锁：
// RRM-007 巨无霸（589 行）拆为 8 个主题 requirement 的行集守恒与结构不变量。
// @impl RRM-007
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const MAIN = 'openspec/specs/research/research-return-map/spec.md';
const OLD_HEADING = '### Requirement: Return-map inspection SHALL verify current-round projection identities';
const NEW_HEADINGS = [
  '### Requirement: Projection-readiness evaluator SHALL own per-wave slot families on one shared result',
  '### Requirement: Wave0 candidates SHALL come from the submitted contribution reader and its declared ordinals',
  '### Requirement: Wave1 and Wave2 identity sources SHALL use the shared slot map and bounded heading grammar',
  '### Requirement: Wave2 entries SHALL select findings by exact W2F identity binding',
  '### Requirement: Evaluation SHALL root-short-circuit in one declared order and mask dependent symptoms',
  '### Requirement: Wave0 coverage SHALL bind exact candidate coordinates and batch omissions as one ordered root',
  '### Requirement: Wave1 and Wave2 coverage SHALL bind current work and W2F identities or explicit dispositions',
  '### Requirement: Formal gates SHALL consume the shared evaluator result through per-invocation facts',
];

const deltaPath = ['openspec/changes/archive/2026-09-01-slim-rrm-requirements/specs/research/research-return-map/spec.md',
  'openspec/changes/2026-09-01-slim-rrm-requirements/specs/research/research-return-map/spec.md']
  .find(existsSync);

function blockOf(lines, heading) {
  const start = lines.findIndex((l) => l === heading);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('### Requirement: ')) { end = i; break; }
  }
  while (end > start && lines[end - 1].trim() === '') end--;
  return lines.slice(start, end);
}

const content = (arr) => arr.filter((l) => l.trim() !== '' && !l.startsWith('### Requirement: '));
const count = (arr) => {
  const m = new Map();
  for (const l of arr) m.set(l, (m.get(l) || 0) + 1);
  return m;
};

test('old mega heading is gone; eight thematic headings each appear exactly once', () => {
  const lines = read(MAIN).split('\n');
  assert.ok(!lines.includes(OLD_HEADING), 'old RRM-007 heading must be gone');
  for (const h of NEW_HEADINGS) {
    const c = lines.filter((l) => l === h).length;
    assert.equal(c, 1, `heading must appear exactly once: ${h}`);
  }
});

test('line-set conservation holds between the removed mega block and the eight new blocks', () => {
  assert.ok(deltaPath, 'slim-rrm delta must exist (active or archived)');
  const delta = read(deltaPath).split('\n');
  const remIdx = delta.indexOf('## REMOVED Requirements');
  const addIdx = delta.indexOf('## ADDED Requirements');
  assert.ok(remIdx !== -1 && addIdx !== -1, 'delta must carry REMOVED and ADDED sections');
  const removed = content(delta.slice(remIdx + 1, addIdx));
  const added = content(delta.slice(addIdx + 1));
  const removedCount = count(removed);
  const addedCount = count(added);
  for (const [l, c] of removedCount) assert.equal(addedCount.get(l) || 0, c, `removed content line missing from ADDED: ${l.slice(0, 60)}`);
  for (const [l, c] of addedCount) assert.equal(removedCount.get(l) || 0, c, `ADDED content line absent from REMOVED: ${l.slice(0, 60)}`);
});

test('main spec blocks match the delta ADDED blocks verbatim', () => {
  assert.ok(deltaPath, 'slim-rrm delta must exist');
  const delta = read(deltaPath).split('\n');
  const addIdx = delta.indexOf('## ADDED Requirements');
  const main = read(MAIN).split('\n');
  for (const h of NEW_HEADINGS) {
    const deltaBlock = blockOf(delta.slice(addIdx), h);
    const mainBlock = blockOf(main, h);
    assert.ok(deltaBlock, `delta block missing: ${h}`);
    assert.deepEqual(mainBlock, deltaBlock, `main/delta drift at ${h}`);
  }
});

test('every new requirement stays within the normal size envelope', () => {
  const main = read(MAIN).split('\n');
  for (const h of NEW_HEADINGS) {
    const b = blockOf(main, h);
    assert.ok(b && b.length <= 160, `block too large (${b ? b.length : 'missing'} lines): ${h}`);
  }
});

test('all 59 scenarios survive exactly once', () => {
  const main = read(MAIN).split('\n');
  const inScope = [];
  let capturing = false;
  for (const l of main) {
    if (NEW_HEADINGS.includes(l)) { capturing = true; continue; }
    if (capturing && l.startsWith('### Requirement: ')) capturing = false;
    if (capturing && l.startsWith('#### Scenario: ')) inScope.push(l);
  }
  assert.equal(inScope.length, 59, `expected 59 scenarios across the eight blocks, found ${inScope.length}`);
  assert.equal(new Set(inScope).size, 59, 'scenario headings must be unique');
});
