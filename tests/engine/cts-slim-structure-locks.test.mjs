// tests/engine/cts-slim-structure-locks.test.mjs
// 2026-09-01-slim-cts-requirements 的结构回归锁：
// CTS 两条巨无霸（278+386 行）拆为 7 个主题 requirement 的行集守恒与结构不变量。
// 2026-09-02 起组合已记录的后继 delta：主 spec 的 7 块期望值 = slim-cts ADDED 块
// 被 extend-mutate-layout-to-hitl1 的 MODIFIED 块（active 或 archived 路径）覆盖，
// 场景计数从组合块推导，不再硬编码。
// @impl CTS-003
// @impl CTS-004
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const MAIN = 'openspec/specs/research/canonical-topic-state/spec.md';
const OLD_HEADINGS = [
  '### Requirement: Canonical topic mutation SHALL atomically materialize plan and seed intent',
  '### Requirement: Topic-state operations SHALL preserve scope and authority boundaries',
];
const NEW_HEADINGS = [
  '### Requirement: Topic-state apply SHALL run one atomic prepared workspace with exact recovery',
  '### Requirement: Topic-state input SHALL bind canonical identity and materialize plan, seed, and enrichment intent',
  '### Requirement: Sanctioned lifecycle windows SHALL authorize every canonical topic mutation',
  '### Requirement: Topic-state operations SHALL NOT touch non-topic authority surfaces',
  '### Requirement: Wave projection packets SHALL be the one strict seed-projection write seam',
  '### Requirement: Projection apply SHALL be authorized inside the route-bound loaded Wave phase with exact slot postconditions',
  '### Requirement: Layout mutation and post-final reentry SHALL stay bounded sanctioned operations',
];

const deltaPath = ['openspec/changes/archive/2026-09-01-slim-cts-requirements/specs/research/canonical-topic-state/spec.md',
  'openspec/changes/2026-09-01-slim-cts-requirements/specs/research/canonical-topic-state/spec.md']
  .find(existsSync);

const successorDeltaPath = ['openspec/changes/archive/2026-09-02-extend-mutate-layout-to-hitl1/specs/research/canonical-topic-state/spec.md',
  'openspec/changes/extend-mutate-layout-to-hitl1/specs/research/canonical-topic-state/spec.md']
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

function addedBlocks(deltaFile) {
  const d = read(deltaFile).split('\n');
  const add = d.indexOf('## ADDED Requirements');
  const blocks = {};
  for (const h of NEW_HEADINGS) {
    const b = blockOf(d.slice(add), h);
    if (b) blocks[h] = b;
  }
  return blocks;
}

function modifiedBlocks(deltaFile) {
  const d = read(deltaFile).split('\n');
  const mod = d.indexOf('## MODIFIED Requirements');
  const blocks = {};
  for (const h of NEW_HEADINGS) {
    const b = blockOf(d.slice(mod), h);
    if (b) blocks[h] = b;
  }
  return blocks;
}

/** Composed accepted truth: slim-cts ADDED blocks overridden by later recorded MODIFIED deltas. */
function expectedBlocks() {
  const expected = addedBlocks(deltaPath);
  if (successorDeltaPath) Object.assign(expected, modifiedBlocks(successorDeltaPath));
  return expected;
}
const content = (arr) => arr.filter((l) => l.trim() !== '' && !l.startsWith('### Requirement: ') && !l.startsWith('## '));
const count = (arr) => {
  const m = new Map();
  for (const l of arr) m.set(l, (m.get(l) || 0) + 1);
  return m;
};

test('old mega headings are gone; seven thematic headings each appear exactly once', () => {
  const lines = read(MAIN).split('\n');
  for (const h of OLD_HEADINGS) assert.ok(!lines.includes(h), 'old heading must be gone');
  for (const h of NEW_HEADINGS) {
    assert.equal(lines.filter((l) => l === h).length, 1, `exactly once: ${h}`);
  }
});

test('REMOVED and ADDED content multisets are identical in the delta', () => {
  assert.ok(deltaPath, 'slim-cts delta must exist (active or archived)');
  const d = read(deltaPath).split('\n');
  const rem = d.indexOf('## REMOVED Requirements');
  const add = d.indexOf('## ADDED Requirements');
  const a = count(content(d.slice(rem, add)));
  const b = count(content(d.slice(add)));
  for (const [l, c] of a) assert.equal(b.get(l) || 0, c, `removed line missing from ADDED: ${l.slice(0, 60)}`);
  for (const [l, c] of b) assert.equal(a.get(l) || 0, c, `ADDED line absent from REMOVED: ${l.slice(0, 60)}`);
});

test('main spec blocks match the composed recorded delta blocks verbatim', () => {
  assert.ok(deltaPath, 'slim-cts delta must exist');
  const main = read(MAIN).split('\n');
  const expected = expectedBlocks();
  for (const h of NEW_HEADINGS) {
    const eb = expected[h];
    const mb = blockOf(main, h);
    assert.ok(eb, `composed delta block missing: ${h}`);
    assert.deepEqual(mb, eb, `main/composed-delta drift at ${h}`);
  }
});

test('every new requirement stays within the normal size envelope', () => {
  const main = read(MAIN).split('\n');
  for (const h of NEW_HEADINGS) {
    const b = blockOf(main, h);
    assert.ok(b && b.length <= 160, `block too large (${b ? b.length : 'missing'} lines): ${h}`);
  }
});

test('every composed scenario survives exactly once and stays unique', () => {
  const main = read(MAIN).split('\n');
  const expected = expectedBlocks();
  const inScope = [];
  let capturing = false;
  for (const l of main) {
    if (NEW_HEADINGS.includes(l)) { capturing = true; continue; }
    if (capturing && l.startsWith('### Requirement: ')) capturing = false;
    if (capturing && l.startsWith('#### Scenario: ')) inScope.push(l);
  }
  const expectedScenarios = Object.values(expected)
    .flat()
    .filter((l) => l.startsWith('#### Scenario: '));
  assert.equal(inScope.length, expectedScenarios.length, `expected ${expectedScenarios.length} scenarios, found ${inScope.length}`);
  assert.equal(new Set(inScope).size, inScope.length, 'scenario headings must be unique');
});
