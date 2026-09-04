import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleSpec, } from '../../openspec/governance/assemble-spec-delta.mjs';
import { parseRequirementBlocks, multisetConservation } from '../../openspec/governance/spec-unit-parse.mjs';

const TOOL = fileURLToPath(new URL('../../openspec/governance/assemble-spec-delta.mjs', import.meta.url));
const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/spec-lean-restatement-tooling', import.meta.url));
const RERUN_FIXTURE = join(FIXTURE_DIR, 'rerun-block-fixture.md');
const K1K2_GROUPING = join(FIXTURE_DIR, 'k1k2-grouping.yaml');

const SMALL_SPEC = `# Fixture

### Requirement: Source block

Lead prose paragraph one with enough words.

Prose paragraph two continues the block.

1. numbered loose item one
2. numbered loose item two

#### Scenario: First

- **WHEN** something
- **THEN** this

#### Scenario: Second

- **WHEN** other
- **THEN** that
`;

function writeGrouping(dir, obj) {
  const p = join(dir, 'grouping.yaml');
  const yaml = [
    `spec: ${obj.spec}`,
    `block_title: "${obj.block_title}"`,
    'expect:',
    `  prose: ${obj.expect.prose}`,
    `  scenarios: ${obj.expect.scenarios}`,
    'units:',
    ...obj.units.flatMap((u) => {
      const lines = [`  - title: "${u.title}"`];
      if (u.prose) lines.push(`    prose: [${u.prose.join(', ')}]`);
      if (u.prose_range) lines.push(`    prose_range: [${u.prose_range.join(', ')}]`);
      if (u.scenarios) lines.push(`    scenarios: [${u.scenarios.join(', ')}]`);
      return lines;
    }),
  ].join('\n');
  writeFileSync(p, yaml + '\n');
  return p;
}

describe('assemble-spec-delta grouping schema', () => {
  it('rejects a unit declaring both prose and prose_range (exit 2)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asm-'));
    const specPath = join(dir, 'spec.md');
    writeFileSync(specPath, SMALL_SPEC);
    const g = writeGrouping(dir, {
      spec: specPath,
      block_title: '### Requirement: Source block',
      expect: { prose: 2, scenarios: 2 },
      units: [
        { title: '### Requirement: A', prose: [1], prose_range: [1, 2], scenarios: [1] },
        { title: '### Requirement: B', prose: [2], scenarios: [2] },
      ],
    });
    const res = spawnSync('node', [TOOL, '--spec', specPath, '--grouping', g], { encoding: 'utf8' });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /not both/);
  });

  it('rejects overlapping assignments and incomplete coverage (exit 2)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asm-'));
    const specPath = join(dir, 'spec.md');
    writeFileSync(specPath, SMALL_SPEC);
    const g = writeGrouping(dir, {
      spec: specPath,
      block_title: '### Requirement: Source block',
      expect: { prose: 2, scenarios: 2 },
      units: [
        { title: '### Requirement: A', prose: [1, 2], scenarios: [1] },
        { title: '### Requirement: B', prose: [2], scenarios: [] },
      ],
    });
    const res = spawnSync('node', [TOOL, '--spec', specPath, '--grouping', g], { encoding: 'utf8' });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /more than once|coverage incomplete/);
  });

  it('rejects unit titles without the requirement prefix and duplicate titles (exit 2)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asm-'));
    const specPath = join(dir, 'spec.md');
    writeFileSync(specPath, SMALL_SPEC);
    const g = writeGrouping(dir, {
      spec: specPath,
      block_title: '### Requirement: Source block',
      expect: { prose: 2, scenarios: 2 },
      units: [
        { title: '### Requirement: A', prose: [1], scenarios: [1] },
        { title: '### Requirement: A', prose: [2], scenarios: [2] },
      ],
    });
    const res = spawnSync('node', [TOOL, '--spec', specPath, '--grouping', g], { encoding: 'utf8' });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /unique/);
  });

  it('rejects when grouping.spec mismatches --spec (exit 2)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asm-'));
    const specPath = join(dir, 'spec.md');
    writeFileSync(specPath, SMALL_SPEC);
    const g = writeGrouping(dir, {
      spec: 'some/other/spec.md',
      block_title: '### Requirement: Source block',
      expect: { prose: 2, scenarios: 2 },
      units: [
        { title: '### Requirement: A', prose: [1], scenarios: [1] },
        { title: '### Requirement: B', prose: [2], scenarios: [2] },
      ],
    });
    const res = spawnSync('node', [TOOL, '--spec', specPath, '--grouping', g], { encoding: 'utf8' });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /does not match --spec/);
  });
});

describe('assemble-spec-delta assertions', () => {
  it('dry-run passes and reports per-unit sizes; conservation holds with net additions = unit titles', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asm-'));
    const specPath = join(dir, 'spec.md');
    writeFileSync(specPath, SMALL_SPEC);
    const g = writeGrouping(dir, {
      spec: specPath,
      block_title: '### Requirement: Source block',
      expect: { prose: 2, scenarios: 2 },
      units: [
        { title: '### Requirement: A', prose: [1], scenarios: [2] },
        { title: '### Requirement: B', prose: [2], scenarios: [1] },
      ],
    });
    const res = spawnSync('node', [TOOL, '--spec', specPath, '--grouping', g], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /dry-run: assertions passed/);
    assert.match(res.stdout, /content multiset conserved/);
  });

  it('declared==actual mismatch fails closed with exit 1 and the counts as root cause', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asm-'));
    const specPath = join(dir, 'spec.md');
    writeFileSync(specPath, SMALL_SPEC);
    const g = writeGrouping(dir, {
      spec: specPath,
      block_title: '### Requirement: Source block',
      expect: { prose: 3, scenarios: 2 },
      units: [
        { title: '### Requirement: A', prose: [1, 2], scenarios: [1] },
        { title: '### Requirement: B', prose: [3], scenarios: [2] },
      ],
    });
    const res = spawnSync('node', [TOOL, '--spec', specPath, '--grouping', g], { encoding: 'utf8' });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /\[declared\] declared==actual mismatch: expect prose 3\/scenarios 2, actual 2\/2/);
  });

  it('block_title matching zero blocks fails closed with exit 1 (stage coverage)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asm-'));
    const specPath = join(dir, 'spec.md');
    writeFileSync(specPath, SMALL_SPEC);
    const g = writeGrouping(dir, {
      spec: specPath,
      block_title: '### Requirement: Not present here',
      expect: { prose: 2, scenarios: 2 },
      units: [
        { title: '### Requirement: A', prose: [1], scenarios: [1] },
        { title: '### Requirement: B', prose: [2], scenarios: [2] },
      ],
    });
    const res = spawnSync('node', [TOOL, '--spec', specPath, '--grouping', g], { encoding: 'utf8' });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /\[coverage\] block_title matches 0 blocks/);
  });

  it('multisetConservation detects missing and unexpected lines (pure function)', () => {
    const before = ['a', 'b', 'c', 'a'];
    assert.deepEqual(multisetConservation(before, ['b', 'a', 'c', 'a', ''], []), {
      ok: true,
      missing: [],
      extra: [],
    });
    const miss = multisetConservation(before, ['b', 'a', 'c'], []);
    assert.equal(miss.ok, false);
    assert.deepEqual(miss.missing, ['a']);
    const extra = multisetConservation(before, [...before, 'zzz'], []);
    assert.equal(extra.ok, false);
    assert.deepEqual(extra.extra, ['zzz']);
    const allowed = multisetConservation(before, [...before, '### Requirement: New'], ['### Requirement: New']);
    assert.equal(allowed.ok, true);
  });
});

describe('assemble-spec-delta write roundtrip', () => {
  it('--out writes a parseable spec whose only net additions are the unit titles', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asm-'));
    const specPath = join(dir, 'spec.md');
    const outPath = join(dir, 'out.md');
    writeFileSync(specPath, SMALL_SPEC);
    const g = writeGrouping(dir, {
      spec: specPath,
      block_title: '### Requirement: Source block',
      expect: { prose: 2, scenarios: 2 },
      units: [
        { title: '### Requirement: A first half', prose: [1], scenarios: [1] },
        { title: '### Requirement: B second half', prose: [2], scenarios: [2] },
      ],
    });
    const res = spawnSync('node', [TOOL, '--spec', specPath, '--grouping', g, '--out', outPath], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
    const before = readFileSync(specPath, 'utf8').split('\n');
    const after = readFileSync(outPath, 'utf8').split('\n');
    // mirror the tool's conservation baseline: the original block heading is
    // replaced by the unit titles, so it is removed from the before-multiset
    const blockIdx = before.indexOf('### Requirement: Source block');
    const beforeReplaced = before.slice();
    beforeReplaced.splice(blockIdx, 1);
    const cons = multisetConservation(beforeReplaced, after, [
      '### Requirement: A first half',
      '### Requirement: B second half',
    ]);
    assert.equal(cons.ok, true, JSON.stringify({ missing: cons.missing, extra: cons.extra }));
    const { blocks } = parseRequirementBlocks(readFileSync(outPath, 'utf8'));
    const titles = blocks.map((b) => b.title);
    assert.ok(titles.includes('### Requirement: A first half'));
    assert.ok(titles.includes('### Requirement: B second half'));
    assert.ok(!titles.includes('### Requirement: Source block'), 'original block is replaced');
  });
});
