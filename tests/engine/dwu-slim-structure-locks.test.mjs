// tests/engine/dwu-slim-structure-locks.test.mjs
// 2026-09-01-slim-dwu-requirements 的结构回归锁：
// DWU 七条巨无霸拆为 15 个主题 requirement 的行集守恒与结构不变量。
// @impl DEW-004
// @impl DEW-013
// @impl DEW-023
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const MAIN = 'openspec/specs/agent/delegated-work-units/spec.md';
const OLD_HEADINGS = [
  '### Requirement: Work-unit envelope SHALL carry binding surfaces',
  '### Requirement: Submit SHALL be the only successful delegated completion transition',
  '### Requirement: Work-unit tasks SHALL expose bundle-root absolute',
  '### Requirement: Work-unit submit SHALL canonicalize only bounded',
  '### Requirement: Work-unit dry-submit SHALL preflight',
  '### Requirement: Timeout terminalization SHALL be guarded',
  '### Requirement: Submit SHALL expose a bounded integrity preflight',
];
const NEW_HEADINGS = [
  '### Requirement: Work-unit envelopes SHALL carry Engine-owned index records and complete claim profiles',
  '### Requirement: Envelope readers and generated projections SHALL stay consistent with the claim profile',
  '### Requirement: Submit SHALL remain the only successful delegated completion authority',
  '### Requirement: Successful submit SHALL complete queue demand and record contribution boundaries',
  '### Requirement: Work-unit tasks SHALL carry absolute bundle-root paths and the read-only beacon',
  '### Requirement: Task verification and generated guidance SHALL bind required outputs and role contracts',
  '### Requirement: Submit canonicalization SHALL stay a narrow bounded stage',
  '### Requirement: Accepted submits SHALL persist canonical authority without widening the boundary',
  '### Requirement: Dry-submit SHALL be a read-only structured preflight mirroring submit semantics',
  '### Requirement: Dry-submit SHALL keep provenance strict through one neutral target module',
  '### Requirement: Timeout preflight SHALL be a progress-aware read-only recommendation',
  '### Requirement: Timeout terminalization SHALL run the same guard with explicit audit',
  '### Requirement: Submit integrity SHALL share one read-only transaction fact',
  '### Requirement: Journal disposition SHALL be a closed enum with declared recovery boundaries',
  '### Requirement: Transaction recovery SHALL settle journals without stealing locks',
];

const deltaPath = ['openspec/changes/archive/2026-09-01-slim-dwu-requirements/specs/agent/delegated-work-units/spec.md',
  'openspec/changes/2026-09-01-slim-dwu-requirements/specs/agent/delegated-work-units/spec.md']
  .find(existsSync);

function blockOf(lines, heading) {
  const start = lines.findIndex((l) => l.startsWith(heading));
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

test('old mega headings are gone; fifteen thematic headings each appear exactly once', () => {
  const lines = read(MAIN).split('\n');
  for (const h of OLD_HEADINGS) assert.ok(!lines.some((l) => l.startsWith(h)), `old heading must be gone: ${h}`);
  for (const h of NEW_HEADINGS) {
    assert.equal(lines.filter((l) => l === h).length, 1, `exactly once: ${h}`);
  }
});

test('REMOVED and ADDED content multisets are identical in the delta', () => {
  assert.ok(deltaPath, 'slim-dwu delta must exist (active or archived)');
  const d = read(deltaPath).split('\n');
  const rem = d.indexOf('## REMOVED Requirements');
  const add = d.indexOf('## ADDED Requirements');
  const a = count(content(d.slice(rem, add)));
  const b = count(content(d.slice(add)));
  for (const [l, c] of a) assert.equal(b.get(l) || 0, c, `removed line missing: ${l.slice(0, 60)}`);
  for (const [l, c] of b) assert.equal(a.get(l) || 0, c, `ADDED line absent: ${l.slice(0, 60)}`);
});

test('main spec blocks match the delta ADDED blocks verbatim', () => {
  assert.ok(deltaPath, 'slim-dwu delta must exist');
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
    assert.ok(b && b.length <= 170, `block too large (${b ? b.length : 'missing'} lines): ${h}`);
  }
});

test('all 142 scenarios survive exactly once', () => {
  const main = read(MAIN).split('\n');
  const inScope = [];
  let capturing = false;
  for (const l of main) {
    if (NEW_HEADINGS.includes(l)) { capturing = true; continue; }
    if (capturing && l.startsWith('### Requirement: ')) capturing = false;
    if (capturing && l.startsWith('#### Scenario: ')) inScope.push(l);
  }
  assert.equal(inScope.length, 142, `expected 142 scenarios, found ${inScope.length}`);
  assert.equal(new Set(inScope).size, 142, 'scenario headings must be unique');
});
