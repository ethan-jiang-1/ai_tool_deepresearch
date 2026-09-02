// tests/engine/agq-slim-structure-locks.test.mjs
// 2026-09-01-slim-agq-requirements 的结构回归锁：
// AGQ "Producer rule topic_deepening"（294 行）拆为 3 个主题 requirement。
// @impl AGQ-009
// @impl AGQ-012
// @impl AGQ-013
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const MAIN = 'openspec/specs/agent/agentic-queue/spec.md';
const OLD_HEADING = '### Requirement: Producer rule topic_deepening';
const NEW_HEADINGS = [
  '### Requirement: Producer rule topic_deepening SHALL bind primary paired or supplementary deepening demand',
  '### Requirement: Assignment-mode repair SHALL stay a single audited queue repair operation',
  '### Requirement: Multi-item topic_deepening claims SHALL validate assignment modes without partial allocation',
];

const deltaPath = ['openspec/changes/archive/2026-09-01-slim-agq-requirements/specs/agent/agentic-queue/spec.md',
  'openspec/changes/2026-09-01-slim-agq-requirements/specs/agent/agentic-queue/spec.md']
  .find(existsSync);

function blockOf(lines, heading) {
  const start = lines.indexOf(heading);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('### Requirement: ')) { end = i; break; }
  }
  while (end > start && lines[end - 1].trim() === '') end--;
  return lines.slice(start, end);
}
const content = (arr) => arr.filter((l) => l.trim() !== '' && !l.startsWith('### Requirement: ') && !l.startsWith('## '));
const count = (arr) => {
  const m = new Map();
  for (const l of arr) m.set(l, (m.get(l) || 0) + 1);
  return m;
};

test('old mega heading is gone; three thematic headings each appear exactly once', () => {
  const lines = read(MAIN).split('\n');
  assert.ok(!lines.includes(OLD_HEADING), 'old heading must be gone');
  for (const h of NEW_HEADINGS) {
    assert.equal(lines.filter((l) => l === h).length, 1, `exactly once: ${h}`);
  }
});

test('REMOVED and ADDED content multisets are identical in the delta', () => {
  assert.ok(deltaPath, 'slim-agq delta must exist');
  const d = read(deltaPath).split('\n');
  const rem = d.indexOf('## REMOVED Requirements');
  const add = d.indexOf('## ADDED Requirements');
  const a = count(content(d.slice(rem, add)));
  const b = count(content(d.slice(add)));
  for (const [l, c] of a) assert.equal(b.get(l) || 0, c, `removed line missing: ${l.slice(0, 60)}`);
  for (const [l, c] of b) assert.equal(a.get(l) || 0, c, `ADDED line absent: ${l.slice(0, 60)}`);
});

test('main spec blocks match the delta ADDED blocks verbatim', () => {
  assert.ok(deltaPath, 'slim-agq delta must exist');
  const d = read(deltaPath).split('\n');
  const add = d.indexOf('## ADDED Requirements');
  const main = read(MAIN).split('\n');
  for (const h of NEW_HEADINGS) {
    const db = blockOf(d.slice(add), h);
    const mb = blockOf(main, h);
    assert.ok(db, `delta block missing: ${h}`);
    assert.deepEqual(mb, db, `main/delta drift at ${h}`);
  }
});

test('every new requirement stays within the normal size envelope', () => {
  const main = read(MAIN).split('\n');
  for (const h of NEW_HEADINGS) {
    const b = blockOf(main, h);
    assert.ok(b && b.length <= 160, `block too large (${b ? b.length : 'missing'} lines): ${h}`);
  }
});

test('all 16 scenarios survive exactly once', () => {
  const main = read(MAIN).split('\n');
  const inScope = [];
  let capturing = false;
  for (const l of main) {
    if (NEW_HEADINGS.includes(l)) { capturing = true; continue; }
    if (capturing && l.startsWith('### Requirement: ')) capturing = false;
    if (capturing && l.startsWith('#### Scenario: ')) inScope.push(l);
  }
  assert.equal(inScope.length, 16, `expected 16 scenarios, found ${inScope.length}`);
  assert.equal(new Set(inScope).size, 16, 'scenario headings must be unique');
});
