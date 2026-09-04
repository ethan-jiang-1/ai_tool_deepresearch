import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import {
  parseRequirementBlocks,
  parseBlockUnits,
  multisetConservation,
} from '../../openspec/governance/spec-unit-parse.mjs';

const ASSEMBLER = fileURLToPath(new URL('../../openspec/governance/assemble-spec-delta.mjs', import.meta.url));
const SCANNER = fileURLToPath(new URL('../../openspec/governance/scan-restatement-candidates.mjs', import.meta.url));
const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/spec-lean-restatement-tooling', import.meta.url));
const RERUN_FIXTURE = join(FIXTURE_DIR, 'rerun-block-fixture.md');
const K1K2_GROUPING = join(FIXTURE_DIR, 'k1k2-grouping.yaml');

// Deep-dive §11 survey values (spec-lean-f4-megablock-deepdive.md, REVIEW-passed):
// 8 prose paragraphs, 19 scenarios, K1 carries 9 scenarios / K2 carries 10.
const EXPECT_PROSE = 8;
const EXPECT_SCENARIOS = 19;
const K1_SCENARIOS = 9;
const K2_SCENARIOS = 10;

describe('spec-lean tooling rehearsal (frozen fixtures, read-only)', () => {
  it('freezes the rerun-incremental-node target block with deep-dive-consistent segmentation', () => {
    const text = readFileSync(RERUN_FIXTURE, 'utf8');
    const { blocks, lines } = parseRequirementBlocks(text);
    const block = blocks.find((b) =>
      b.title.includes('Rerun node analyzes rationale vs seed_topics')
    );
    assert.ok(block, 'frozen fixture must contain the target block');
    const { prose, scenarios } = parseBlockUnits(lines, block);
    assert.equal(prose.length, EXPECT_PROSE, 'prose segmentation matches deep-dive survey');
    assert.equal(scenarios.length, EXPECT_SCENARIOS, 'scenario segmentation matches deep-dive survey');
    assert.match(scenarios[0].title, /Rerun uses a current focus only for the new increment/, 'S1 identity');
    assert.match(scenarios[18].title, /Rerun does not prepare historical migration/, 'S19 identity');
    // shared parser contract: scanner and assembler see the same segmentation
    const unitSizes = prose.map((p) => p.endLine - p.startLine + 1);
    assert.ok(unitSizes.every((n) => n > 0));
  });

  it('assembles K1/K2 dry-run on the frozen block: declared==actual + conservation pass', () => {
    const grouping = parseYaml(readFileSync(K1K2_GROUPING, 'utf8'));
    const dir = mkdtempSync(join(tmpdir(), 'rehearsal-'));
    const specPath = join(dir, 'rerun-block-fixture.md');
    writeFileSync(specPath, readFileSync(RERUN_FIXTURE, 'utf8'));
    grouping.spec = specPath;
    const groupingPath = join(dir, 'grouping.yaml');
    // round-trip through yaml to keep the fixture a single source of truth
    writeFileSync(groupingPath, yamlDump(grouping));
    const res = execFileSync('node', [ASSEMBLER, '--spec', specPath, '--grouping', groupingPath], {
      encoding: 'utf8',
    });
    assert.match(res, /dry-run: assertions passed/);
    assert.match(res, /content multiset conserved/);
    assert.match(res, /K1.*— (\d+) lines/);
    const k1 = Number(res.match(/K1.*— (\d+) lines/)[1]);
    const k2 = Number(res.match(/K2.*— (\d+) lines/)[1]);
    assert.ok(k1 <= 160 && k2 <= 160, `both sub-blocks stay within the granularity axis (K1=${k1}, K2=${k2})`);
  });

  it('assembled output keeps every scenario exactly once across K1/K2 (9 + 10)', () => {
    const grouping = parseYaml(readFileSync(K1K2_GROUPING, 'utf8'));
    const dir = mkdtempSync(join(tmpdir(), 'rehearsal-'));
    const specPath = join(dir, 'rerun-block-fixture.md');
    const outPath = join(dir, 'out.md');
    writeFileSync(specPath, readFileSync(RERUN_FIXTURE, 'utf8'));
    grouping.spec = specPath;
    const groupingPath = join(dir, 'grouping.yaml');
    writeFileSync(groupingPath, yamlDump(grouping));
    execFileSync('node', [ASSEMBLER, '--spec', specPath, '--grouping', groupingPath, '--out', outPath], {
      encoding: 'utf8',
    });
    const outText = readFileSync(outPath, 'utf8');
    const { blocks, lines } = parseRequirementBlocks(outText);
    const k1 = blocks.find((b) => b.title.includes('(K1)'));
    const k2 = blocks.find((b) => b.title.includes('(K2)'));
    assert.ok(k1 && k2, 'both units become real requirement blocks');
    const s1 = parseBlockUnits(lines, k1).scenarios.length;
    const s2 = parseBlockUnits(lines, k2).scenarios.length;
    assert.equal(s1, K1_SCENARIOS);
    assert.equal(s2, K2_SCENARIOS);
    // byte conservation against the frozen fixture, mirroring the tool baseline
    const before = readFileSync(RERUN_FIXTURE, 'utf8').split('\n');
    const blockIdx = before.findIndex((l) => l.startsWith('### Requirement: Rerun node analyzes'));
    before.splice(blockIdx, 1);
    const cons = multisetConservation(before, outText.split('\n'), [
      '### Requirement: Rerun adjustment plan and apply forms (K1)',
      '### Requirement: Rerun authorization and execution loop (K2)',
    ]);
    assert.equal(cons.ok, true, JSON.stringify({ missing: cons.missing.slice(0, 3), extra: cons.extra.slice(0, 3) }));
  });

  it('scanner emits only non-authoritative candidate tables (no verdict wording)', () => {
    const res = execFileSync('node', [SCANNER, '--spec', RERUN_FIXTURE, '--format', 'json'], {
      encoding: 'utf8',
    });
    const parsed = JSON.parse(res);
    assert.equal(parsed.note, 'candidates ≠ verdicts');
    for (const c of parsed.candidates) {
      assert.ok(c.hit_category && c.start_line > 0);
    }
  });
});

// Minimal YAML emitter for the grouping object (strings need quoting).
function yamlDump(obj) {
  const lines = [];
  lines.push(`spec: ${obj.spec}`);
  lines.push(`block_title: "${obj.block_title}"`);
  lines.push('expect:');
  lines.push(`  prose: ${obj.expect.prose}`);
  lines.push(`  scenarios: ${obj.expect.scenarios}`);
  lines.push('units:');
  for (const u of obj.units) {
    lines.push(`  - title: "${u.title}"`);
    if (u.prose) lines.push(`    prose: [${u.prose.join(', ')}]`);
    if (u.prose_range) lines.push(`    prose_range: [${u.prose_range.join(', ')}]`);
    if (u.scenarios) lines.push(`    scenarios: [${u.scenarios.join(', ')}]`);
  }
  return lines.join('\n') + '\n';
}
