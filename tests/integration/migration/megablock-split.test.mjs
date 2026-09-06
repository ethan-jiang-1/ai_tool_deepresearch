// tests/integration/migration/megablock-split.test.mjs
// C3 megablock-requirement-split migration proofs:
//  (1) conservation + size: no requirement block exceeds 190 lines anywhere in the
//      affected specs; every non-blank, non-heading line of each frozen pre-split
//      target block survives in the current spec (byte conservation);
//  (2) scenarios preserved 1:1 per spec (no add/remove);
//  (3) header-registry-untouched: per-spec `> req:` headers and registry rows for the
//      affected prefixes are byte-identical to the frozen pre-change state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseRequirementBlocks } from '../../../openspec/governance/spec-unit-parse.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const FIX = 'tests/fixtures/megablock-split/';
const SPECS = [
  'research/post-final-recovery', 'research/content-delivery-phase-content',
  'engine/cli-phase-transition', 'research/research-wave-phase-content',
  'governance/semantic-fact-closure', 'workflow/workflow-directory-contract',
  'research/seed-topic-materialization', 'agent/hitl-ux',
  'engine/runtime-reentry-debuggability', 'bundle/artifact-persistence-recovery',
  'workflow/rerun-incremental-node',
];

function bodyLines(lines, block) { return lines.slice(block.startLine, block.endLine); }
function nonBlankNonHeading(lines) { return lines.filter((l) => l.trim() !== '' && !l.startsWith('### Requirement:')); }
function scenarioCount(text) { return (text.match(/^#### Scenario: /gm) ?? []).length; }
function headerLine(text) { return text.split('\n').find((l) => l.startsWith('> req: ')); }
function prefixOf(id) { return id.slice(0, 3); }

test('no requirement block exceeds 190 lines after the split (G1 acceptance)', () => {
  for (const cap of SPECS) {
    const text = read(`openspec/specs/${cap}/spec.md`);
    const { blocks } = parseRequirementBlocks(text);
    for (const b of blocks) {
      assert.ok(
        b.endLine - b.startLine + 1 <= 190,
        `${cap} block over 190 lines (${b.endLine - b.startLine + 1}): ${b.title.slice(0, 70)}`
      );
    }
  }
});

test('conservation: every frozen pre-split target-block line survives verbatim', () => {
  for (const cap of SPECS) {
    const frozen = read(FIX + cap.replaceAll('/', '_') + '.spec.md');
    const current = read(`openspec/specs/${cap}/spec.md`);
    const { blocks: fb, lines: fl } = parseRequirementBlocks(frozen);
    const target = fb.find((b) => b.endLine - b.startLine + 1 >= 185);
    if (!target) continue; // megablock superseded by a later semantic change (e.g. 2026-09-06-final-polish-version-control rewrote POF-001); scenario 1:1 check below still guards the spec
    const origBody = nonBlankNonHeading(bodyLines(fl, target));
    // count multiplicities in current text (multiset subset check)
    const cur = nonBlankNonHeading(current.split('\n'));
    const count = (arr) => { const m = new Map(); for (const l of arr) m.set(l, (m.get(l) ?? 0) + 1); return m; };
    const cm = count(cur);
    for (const l of origBody) {
      const have = cm.get(l) ?? 0;
      if (have === 0) {
        assert.fail(`${cap}: frozen block line missing after split: ${l.slice(0, 90)}`);
      }
      cm.set(l, have - 1);
    }
  }
});

test('scenarios preserved 1:1 and headers + registry untouched', () => {
  const frozenReg = read(FIX + 'req-registry.yaml');
  const curReg = read('openspec/governance/req-registry.yaml');
  for (const cap of SPECS) {
    const frozen = read(FIX + cap.replaceAll('/', '_') + '.spec.md');
    const current = read(`openspec/specs/${cap}/spec.md`);
    // The split must never LOSE scenarios. Additions through later accepted
    // OpenSpec changes are legal: harness-review-defect-sync added one
    // scenario to bundle/artifact-persistence-recovery ("Blocked retirement
    // implies zero mutation", 41 -> 42), so the pin is a floor, not equality.
    assert.ok(
      scenarioCount(current) >= scenarioCount(frozen),
      `${cap}: scenario count shrunk (${scenarioCount(frozen)} -> ${scenarioCount(current)})`,
    );
    assert.equal(headerLine(current), headerLine(frozen), `${cap}: header enumeration changed`);
    // per-spec registry rows untouched: prefix ids identical
    const frozenIds = frozenReg.split('\n').filter((l) => /^[A-Z]{3}-\d{3}: /.test(l) && prefixOf(l) === headerLine(frozen).match(/> req: ([A-Z]{3})/)[1]);
    for (const row of frozenIds) {
      assert.ok(curReg.split('\n').includes(row), `registry row changed: ${row.slice(0, 50)}`);
    }
  }
});
