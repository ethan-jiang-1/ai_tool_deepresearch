import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

describe('Wave1 reference closeout guidance', () => {
  it('teaches one canonical materialize, sync, packet, and rerun loop', () => {
    const template = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-reference-template.md');
    const phase = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md');
    const index = read('DEEP_RESEARCH_HARNESS/rb_templates/reference/_INDEX.md.tmpl');
    assert.match(template, /current-topic\.slug}-{deterministic-source-qualifier}/);
    assert.match(template, /sync-reference-index/);
    assert.match(phase, /persist.*sync-reference-index.*packet writer.*rerun/s);
    assert.match(phase, /work_ids.*work_unit_refs.*source_refs.*cache_trail_refs/s);
    assert.match(phase, /legacy\/index\/ledger\/queue\/receipt\/provenance\/format hint remains its own root/);
    assert.match(phase, /reference_floor_deficit/);
    assert.match(index, /sync-reference-index/);
    assert.doesNotMatch(index, /appends one row/);
  });

  it('places valid depth review before inspect and consumes the inspect target without locator derivation', () => {
    const phase = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md');
    const decision = phase.match(/### 3\.2\.1 Returned Work Decision\n([\s\S]*?)(?=\n### 3\.2\.2 )/);

    assert.ok(decision, 'Wave1 returned-work decision is present');
    const text = decision[1];
    const review = text.indexOf('valid current depth review');
    const inspect = text.indexOf('reference-convergence inspect');
    assert.ok(review >= 0 && inspect > review, text);
    assert.match(text, /exact target returned by that inspect/i);
    assert.doesNotMatch(phase, /\{12-hex\}/);
    assert.doesNotMatch(phase, /first 12 hex chars/i);
  });
});
