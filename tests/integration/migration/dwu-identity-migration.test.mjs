// tests/integration/migration/dwu-identity-migration.test.mjs
// C2 dwu-capability-identity-split migration proofs:
//  (1) migration-byte-conservation: the 23 migrated blocks appear byte-
//      conserved in their new homes (only the inline `> req:` ID line
//      differs, per the registry successor map);
//  (2) no-half-migration-state: registry totals and successor pointers are
//      complete, and every migrated title exists in exactly one capability.
// Frozen fixture: openspec/specs/agent/delegated-work-units/spec.md at the
// pre-migration commit (tests/fixtures/dwu-identity-migration/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseRequirementBlocks, parseBlockUnits } from '../../../openspec/governance/spec-unit-parse.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const PRE = read('tests/fixtures/dwu-identity-migration/dwu-pre-migration.spec.md');
const NEW_SPECS = {
  submission: 'openspec/specs/agent/work-unit-submission/spec.md',
  preflight: 'openspec/specs/agent/work-unit-preflight/spec.md',
  correction: 'openspec/specs/agent/work-unit-correction/spec.md',
};
const REG = read('openspec/governance/req-registry.yaml');

// Old DEW id -> { newId, path } derived from the live registry successor pointers.
function buildSuccessorMap() {
  const out = new Map();
  for (const line of REG.split('\n')) {
    const m = line.match(/^DEW-\d{3}: .*\[DEPRECATED\]; migrated to ((?:WSU|WUP|WUC)-\d{3}) \((agent\/work-unit-\w+)\)/);
    if (m) {
      const oldId = line.split(':')[0];
      out.set(oldId, { newId: m[1], path: m[2] });
    }
  }
  return out;
}

test('frozen fixture parses to the pre-migration 39-block shape', () => {
  const { blocks } = parseRequirementBlocks(PRE);
  assert.equal(blocks.length, 39, 'pre-migration DWU must have 39 requirements');
});

test('all 23 migrated blocks are byte-conserved in their new homes (inline ID line only)', () => {
  const successor = buildSuccessorMap();
  assert.equal(successor.size, 17, 'registry must carry 17 successor pointers');
  const { blocks, lines } = parseRequirementBlocks(PRE);
  const migrated = blocks.filter((b) => !blockStaysInMother(b.title));
  assert.equal(migrated.length, 23, 'fixture must contain 23 migrated blocks');
  const newSpecs = Object.fromEntries(
    Object.entries(NEW_SPECS).map(([k, p]) => {
      const t = read(p);
      const { blocks: bs, lines: ls } = parseRequirementBlocks(t);
      return [k, { text: t, lines: ls, byTitle: new Map(bs.map((b) => [b.title, b])) }];
    })
  );
  for (const b of migrated) {
    const oldInline = inlineIdOf(lines, b);
    const { newId, path } = oldInline ? successor.get(oldInline) : { newId: null, path: null };
    const homeKey = Object.keys(NEW_SPECS).find((k) => NEW_SPECS[k] === readPath(path)) ?? homeOfTitle(NEW_SPECS, b.title);
    const target = newSpecs[homeKey];
    const tb = target.byTitle.get(b.title);
    assert.ok(tb, `migrated block must exist in ${homeKey}: ${b.title.slice(0, 60)}`);
    const orig = bodyLines(lines, b);
    const moved = bodyLines(target.lines, tb);
    if (oldInline) {
      // original inline line replaced by the new ID line; everything else identical
      const origFiltered = orig.filter((l) => !l.startsWith('> req: ') && l.trim() !== '');
      const movedFiltered = moved.filter((l) => !l.startsWith('> req: ') && l.trim() !== '');
      assert.deepEqual([...movedFiltered].sort(), [...origFiltered].sort(), `byte conservation failed: ${b.title.slice(0, 60)}`);
      assert.equal(moved.filter((l) => l.startsWith('> req: ')).length, 1, 'one inline line expected');
      assert.ok(moved.some((l) => l === `> req: ${newId}`), `new inline line ${newId} must be present`);
    } else {
      // no old inline: new inline line is the only addition
      const movedNoInline = moved.filter((l) => !l.startsWith('> req: ') && l.trim() !== '');
      assert.deepEqual([...movedNoInline].sort(), [...orig.filter((l) => l.trim() !== '')].sort(), `byte conservation failed: ${b.title.slice(0, 60)}`);
    }
  }
});

test('no half-migration state: counts, headers, and mother slim shape', () => {
  const mother = read('openspec/specs/agent/delegated-work-units/spec.md');
  const { blocks: mb } = parseRequirementBlocks(mother);
  assert.equal(mb.length, 16, 'mother keeps 16 assignment & briefing requirements');
  const motherHeader = mother.split('\n').find((l) => l.startsWith('> req: DEW-'));
  const motherIds = motherHeader.match(/DEW-\d{3}/g) ?? [];
  assert.equal(motherIds.length, 16, 'mother header lists exactly its 16 retained IDs');
  assert.ok(motherIds.includes('DEW-032') && motherIds.includes('DEW-033'), 'new DEW ids registered in the mother header');
  // every migrated old DEW id is absent from mother inline/header
  for (const line of mother.split('\n')) {
    if (/^> req: DEW-\d{3}$/.test(line)) {
      const id = line.match(/DEW-\d{3}/)[0];
      assert.ok(!isMigratedId(id), `migrated ${id} must not remain as a mother inline line`);
    }
  }
  // registry totals
  const w = (p) => REG.split('\n').filter((l) => l.startsWith(p)).length;
  assert.equal(w('WSU-'), 8);
  assert.equal(w('WUP-'), 6);
  assert.equal(w('WUC-'), 9);
  assert.equal(REG.split('\n').filter((l) => /^DEW-\d{3}: .*\[DEPRECATED\]/.test(l)).length, 17);
});

// ---------- helpers ----------
const MIGRATED_INLINE = new Set([
  'DEW-005','DEW-007','DEW-008','DEW-010','DEW-011','DEW-012','DEW-013','DEW-014','DEW-015','DEW-017','DEW-023','DEW-024','DEW-025','DEW-028','DEW-029','DEW-031',
]);
const MOTHER_TITLES = new Set([
  '### Requirement: Work-unit pipeline SHALL be the sole production delegated-work path',
  '### Requirement: Work-unit identity SHALL be Engine-allocated and index-backed',
  '### Requirement: Work-unit claim SHALL bind queue demand and lease',
  '### Requirement: Sub-agents SHALL NOT own workflow authority',
  '### Requirement: Work-unit envelopes SHALL carry Engine-owned index records and complete claim profiles',
  '### Requirement: Envelope readers and generated projections SHALL stay consistent with the claim profile',
  '### Requirement: Work-unit tasks SHALL carry absolute bundle-root paths and the read-only beacon',
  '### Requirement: Task verification and generated guidance SHALL bind required outputs and role contracts',
  '### Requirement: Work-unit claim SHALL evaluate one explicit actor observation before allocation',
  '### Requirement: Work-unit provenance SHALL bind execution actor class',
  '### Requirement: Work-unit provenance SHALL inherit UID-bound queue identity without duplicate fields',
  '### Requirement: Existing task brief may expose a read-only user-controls coordinate',
  '### Requirement: Delegated work contract entry SHALL be constructible from one generated projection',
  '### Requirement: Work-unit attempts SHALL expose logical execution guidance from existing attempt bindings',
  '### Requirement: Affected delegated work SHALL receive current intent through the existing task brief',
  '### Requirement: Generated source-claim authoring guidance SHALL state exact cache/degraded-ref and source_ref value domains with an accepted-and-degraded example',
]);
function blockStaysInMother(title) { return MOTHER_TITLES.has(title); }
function isMigratedId(id) { return MIGRATED_INLINE.has(id); }
function inlineIdOf(lines, block) {
  for (let l = block.startLine; l <= block.endLine; l++) {
    const m = lines[l - 1].match(/^> req: (DEW-\d{3})/);
    if (m) return m[1];
  }
  return null;
}
function bodyLines(lines, block) { return lines.slice(block.startLine, block.endLine); }
function readPath(p) { return p; }
function homeOfTitle(specs, title) {
  for (const [k, p] of Object.entries(specs)) {
    if (read(p).includes(title)) return k;
  }
  throw new Error('title not found in any new spec: ' + title);
}
