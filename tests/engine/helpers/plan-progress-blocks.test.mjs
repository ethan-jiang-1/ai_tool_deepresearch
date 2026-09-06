// @impl PHS-010
// Unit contract for the shared Engine-owned Progress block parse. Both the
// Progress writer (gate-helpers-plan-progress.mjs) and the phase status
// auditor (phase-status-audit.mjs) consume this module; these tests pin the
// block-membership semantics they must agree on.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseProgressBlocks,
  zuluTimestampMs,
  SPAWN_TS_PATTERN,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/plan-progress-blocks.mjs';

const CANONICAL_TS = '2026-09-06T12:00:00.000Z';

function baseline(lines) {
  return { header: null, ordinal: null, spawnTs: null, unparseable: false, lines };
}

test('parses a baseline-only section into one non-unparseable block', () => {
  const blocks = parseProgressBlocks('- [ ] seed-topics-ready\n- [x] wave0-complete\n');
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0], baseline(['- [ ] seed-topics-ready', '- [x] wave0-complete', '']));
});

test('parses baseline plus canonical cycle blocks with ordinals and spawn timestamps', () => {
  const content = [
    '- [x] rerun-ready (2026-09-05T00:00:00.000Z)',
    '',
    `### Rerun cycle 1 (spawned ${CANONICAL_TS})`,
    '- [ ] seed-topics-ready',
    '',
    '### Rerun cycle 2 (spawned 2026-09-06T13:30:00Z)',
    '- [ ] wave0-complete',
  ].join('\n');
  const blocks = parseProgressBlocks(content);
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].ordinal, null);
  assert.equal(blocks[1].ordinal, 1);
  assert.equal(blocks[1].spawnTs, CANONICAL_TS);
  assert.equal(blocks[1].unparseable, false);
  assert.equal(blocks[2].ordinal, 2);
  assert.equal(blocks[2].spawnTs, '2026-09-06T13:30:00Z');
  // trailing blank line of the previous block is absorbed before a header
  assert.deepEqual(blocks[0].lines, ['- [x] rerun-ready (2026-09-05T00:00:00.000Z)']);
  assert.deepEqual(blocks[1].lines, ['- [ ] seed-topics-ready']);
});

test('an indented cycle header still opens the same block for every consumer', () => {
  // Hand-edited plan: two-space indent. Writer and auditor both see this
  // boundary through the one shared parse (auditor's historical semantics).
  const content = `- [x] rerun-ready\n\n  ### Rerun cycle 1 (spawned ${CANONICAL_TS})\n- [ ] seed-topics-ready`;
  const blocks = parseProgressBlocks(content);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[1].ordinal, 1);
  assert.equal(blocks[1].header, '  ### Rerun cycle 1 (spawned 2026-09-06T12:00:00.000Z)');
  assert.deepEqual(blocks[1].lines, ['- [ ] seed-topics-ready']);
});

test('cycle-looking headers with malformed timestamps are unparseable (fail closed)', () => {
  const malformed = [
    `### Rerun cycle 1 (spawned 2020-01-01)`,
    `### Rerun cycle 2 (spawned not-a-date)`,
    `### Rerun cycle 4`,
  ];
  for (const header of malformed) {
    const blocks = parseProgressBlocks(`${header}\n- [x] wave0-complete`);
    assert.equal(blocks.length, 2, header);
    assert.equal(blocks[1].unparseable, true, header);
    assert.equal(blocks[1].ordinal, null, header);
    assert.equal(blocks[1].spawnTs, null, header);
  }
});

test('a shape-valid but impossible date is a canonical block with no usable witness window', () => {
  // Shape passes, so the parse keeps the block canonical; the fail-closed
  // behavior lives at the witness-window level (zuluTimestampMs -> null, so no
  // witness is ever admitted against this block's spawn).
  const blocks = parseProgressBlocks('### Rerun cycle 3 (spawned 9999-99-99T99:99:99Z)\n- [x] wave0-complete');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[1].unparseable, false);
  assert.equal(blocks[1].spawnTs, '9999-99-99T99:99:99Z');
  assert.equal(zuluTimestampMs(blocks[1].spawnTs), null);
});

test('block ordinals stay null and headers stay verbatim on unparseable blocks', () => {
  const blocks = parseProgressBlocks('  ### Rerun cycle abc (spawned junk)\n- [x] wave1-complete');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[1].unparseable, true);
  assert.equal(blocks[1].header, '  ### Rerun cycle abc (spawned junk)');
  assert.deepEqual(blocks[1].lines, ['- [x] wave1-complete']);
});

test('non-header lines never split blocks, including near-miss prose', () => {
  const content = 'Rerun cycle notes below\n### Another section stays a normal line when untrimmed differently\n';
  const blocks = parseProgressBlocks(content);
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].lines, content.split('\n'));
});

test('SPAWN_TS_PATTERN accepts canonical Zulu forms only', () => {
  assert.ok(SPAWN_TS_PATTERN.test(CANONICAL_TS));
  assert.ok(SPAWN_TS_PATTERN.test('2026-09-06T12:00:00Z'));
  assert.equal(SPAWN_TS_PATTERN.test('2026-09-06T12:00:00+08:00'), false);
  assert.equal(SPAWN_TS_PATTERN.test('2020-01-01'), false);
  assert.equal(SPAWN_TS_PATTERN.test('9999-99-99T99:99:99Z'), true); // shape-only; Date.parse rejects the value
});

test('zuluTimestampMs parses canonical Zulu and rejects everything else', () => {
  assert.equal(zuluTimestampMs(CANONICAL_TS), Date.parse(CANONICAL_TS));
  assert.equal(zuluTimestampMs('2026-09-06T12:00:00Z'), Date.parse('2026-09-06T12:00:00Z'));
  assert.equal(zuluTimestampMs('9999-99-99T99:99:99Z'), null);
  assert.equal(zuluTimestampMs('2020-01-01'), null);
  assert.equal(zuluTimestampMs('2026-09-06T12:00:00+08:00'), null);
  assert.equal(zuluTimestampMs(''), null);
  assert.equal(zuluTimestampMs(null), null);
  assert.equal(zuluTimestampMs(undefined), null);
  assert.equal(zuluTimestampMs(42), null);
});
