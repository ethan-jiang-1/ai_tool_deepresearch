// tests/engine/rwg-slim-structure-locks.test.mjs
// 2026-09-01-slim-rwg-requirements 的结构回归锁：
// RWG 三条巨无霸（218+207+303 行）拆为 7 个主题 requirement 的行集守恒与结构不变量。
// @impl RWG-002
// @impl RWG-003
// @impl RWG-010
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const MAIN = 'openspec/specs/research/research-wave-gate-implementation/spec.md';
const OLD_HEADINGS = [
  '### Requirement: Wave1 complete gate rule set',
  '### Requirement: Gate CLI evaluates wave1 rules from definition',
  '### Requirement: Blocking judgment contracts SHALL close across producer, authority, checker, diagnostic, and guard',
];
const NEW_HEADINGS = [
  '### Requirement: Wave1 complete gate rule set SHALL validate provenance, depth contracts, and reference format',
  '### Requirement: Wave1 focus-coverage limit SHALL stay inside the existing degradation partition',
  '### Requirement: Wave1 gate CLI SHALL evaluate definition-owned rule families and typed semantic sections',
  '### Requirement: Wave1 inspect and gate SHALL consume one shared pure convergence result',
  '### Requirement: Blocking Wave rules SHALL use one closed contract chain with truth-type authority',
  '### Requirement: Wave1 closeout classification and prerequisite masking SHALL own root short-circuit',
  '### Requirement: Wave adapters SHALL share one target-level direct-output operation',
];

const deltaPath = ['openspec/changes/archive/2026-09-01-slim-rwg-requirements/specs/research/research-wave-gate-implementation/spec.md',
  'openspec/changes/2026-09-01-slim-rwg-requirements/specs/research/research-wave-gate-implementation/spec.md']
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

test('old mega headings are gone; seven thematic headings each appear exactly once', () => {
  const lines = read(MAIN).split('\n');
  for (const h of OLD_HEADINGS) assert.ok(!lines.includes(h), 'old heading must be gone');
  for (const h of NEW_HEADINGS) {
    assert.equal(lines.filter((l) => l === h).length, 1, `exactly once: ${h}`);
  }
});

test('REMOVED (after M3 substitution) and ADDED content multisets are identical in the delta', () => {
  assert.ok(deltaPath, 'slim-rwg delta must exist (active or archived)');
  const d = read(deltaPath).split('\n');
  const rem = d.indexOf('## REMOVED Requirements');
  const add = d.indexOf('## ADDED Requirements');
  const sub = (l) => (l.includes('SHALL not be a second success predicate')
    ? 'The old target expression `reference/*{topic}*.md` SHALL not act as a second success predicate: the gate definition still declares it as the `count_floor` target, and the convergence evaluator preempts that raw count whenever a materialization/backing root exists.'
    : l);
  const a = count(content(d.slice(rem, add)).map(sub));
  const b = count(content(d.slice(add)));
  for (const [l, c] of a) assert.equal(b.get(l) || 0, c, `removed line missing from ADDED: ${l.slice(0, 60)}`);
  for (const [l, c] of b) assert.equal(a.get(l) || 0, c, `ADDED line absent from REMOVED: ${l.slice(0, 60)}`);
});

test('main spec blocks match the delta ADDED blocks verbatim', () => {
  assert.ok(deltaPath, 'slim-rwg delta must exist');
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

test('all 51 scenarios survive exactly once', () => {
  const main = read(MAIN).split('\n');
  const inScope = [];
  let capturing = false;
  for (const l of main) {
    if (NEW_HEADINGS.includes(l)) { capturing = true; continue; }
    if (capturing && l.startsWith('### Requirement: ')) capturing = false;
    if (capturing && l.startsWith('#### Scenario: ')) inScope.push(l);
  }
  assert.equal(inScope.length, 51, `expected 51 scenarios, found ${inScope.length}`);
  assert.equal(new Set(inScope).size, 51, 'scenario headings must be unique');
});

test('M3 wording alignment is present in the main spec', () => {
  const t = read(MAIN);
  assert.ok(t.includes('SHALL not act as a second success predicate'), 'new M3 wording must stay');
  assert.ok(
    t.includes('the convergence evaluator preempts that raw count'),
    'convergence-preempts clarification must stay',
  );
});
