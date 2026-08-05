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
});
