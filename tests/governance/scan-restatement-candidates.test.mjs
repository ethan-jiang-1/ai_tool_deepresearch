import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = fileURLToPath(new URL('../../openspec/governance/scan-restatement-candidates.mjs', import.meta.url));

const FIXTURE_SPEC = `# Fixture spec

## Purpose

Calibration fixture for the restatement-candidate scanner.

### Requirement: Generated task projection SHALL bind outputs

> req: FX-001

The generated task SHALL bind every required output before spawn. The
task.md surface SHALL remain a projection rather than state authority.

- list item attached to the paragraph above as loose content

Generated actor guidance SHALL expose the exact direct contract and require
the actor to verify assigned outputs before submit.

#### Scenario: Generated task binds outputs

- **WHEN** the Engine renders the generated task
- **THEN** spawn guidance SHALL name each required output

### Requirement: Unrelated requirement stays silent

The Engine SHALL do something procedural that mentions none of the anchor
vocabulary at all.

#### Scenario: Nothing matches

- **WHEN** nothing procedural is restated
- **THEN** no candidate is emitted
`;

function writeFixture(dir) {
  const p = join(dir, 'fixture-spec.md');
  writeFileSync(p, FIXTURE_SPEC);
  return p;
}

describe('scan-restatement-candidates.mjs', () => {
  it('segments paragraphs deterministically: meta/list lines never split or become prose', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scan-'));
    const specPath = writeFixture(dir);
    const out = execFileSync('node', [TOOL, '--spec', specPath, '--format', 'json'], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    assert.equal(parsed.note, 'candidates ≠ verdicts');
    const paras = [...new Set(parsed.candidates.map((c) => `${c.start_line}-${c.end_line}`))];
    // The `> req:` meta line must not become or split a paragraph; the loose
    // list line merges into the preceding paragraph (deep-dive method).
    const hitParas = parsed.candidates.filter((c) => c.hit_category === 'generated_task');
    assert.ok(hitParas.length >= 1);
    for (const c of parsed.candidates) {
      assert.doesNotMatch(c.excerpt, /^> req:/, 'meta line must never be a paragraph excerpt');
    }
    // both anchored paragraphs found, silent block produces none
    const blocks = new Set(parsed.candidates.map((c) => c.block_title));
    assert.equal(blocks.size, 1, 'only the anchored requirement block yields candidates');
    const paraIdx = [...new Set(parsed.candidates.map((c) => c.paragraph_index))].sort();
    assert.deepEqual(paraIdx, [1, 2], 'two distinct anchored paragraphs carry candidates');
    const cats = new Set(parsed.candidates.map((c) => c.hit_category));
    assert.ok(cats.has('generated_guidance'), 'second paragraph hits the guidance category');
  });

  it('groups candidates by category and emits the non-authoritative header in table format', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scan-'));
    const specPath = writeFixture(dir);
    const out = execFileSync('node', [TOOL, '--spec', specPath], { encoding: 'utf8' });
    assert.match(out, /candidates ≠ verdicts/);
    assert.match(out, /## generated_task/);
    assert.match(out, /## task_md_surface/);
    assert.match(out, /total: \d+/);
  });

  it('accepts an --anchors override file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scan-'));
    const specPath = writeFixture(dir);
    const anchorsPath = join(dir, 'anchors.yaml');
    writeFileSync(anchorsPath, 'custom_only:\n  - "SHALL do something procedural"\n');
    const out = execFileSync(
      'node',
      [TOOL, '--spec', specPath, '--anchors', anchorsPath, '--format', 'json'],
      { encoding: 'utf8' }
    );
    const parsed = JSON.parse(out);
    assert.equal(parsed.candidates.length, 1);
    assert.equal(parsed.candidates[0].hit_category, 'custom_only');
  });

  it('fails closed with exit 2 on missing --spec', () => {
    const res = spawnSync('node', [TOOL], { encoding: 'utf8' });
    assert.equal(res.status, 2);
  });

  it('fails closed with exit 2 on an unreadable spec file', () => {
    const res = spawnSync('node', [TOOL, '--spec', '/nonexistent/spec.md'], { encoding: 'utf8' });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /cannot read spec/);
  });

  it('fails closed with exit 2 on a malformed anchors config', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scan-'));
    const specPath = writeFixture(dir);
    const anchorsPath = join(dir, 'bad-anchors.yaml');
    writeFileSync(anchorsPath, 'not_a_list: "oops"\n');
    const res = spawnSync('node', [TOOL, '--spec', specPath, '--anchors', anchorsPath], { encoding: 'utf8' });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /invalid anchors config/);
  });
});
