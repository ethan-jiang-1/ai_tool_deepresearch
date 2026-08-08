// @impl RWP-002

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const WAVE1 = path.join(ROOT, 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md');

describe('Wave1 Reference Evidence Map guidance', () => {
  it('refreshes the existing projection after a legal focus update without a new route or manual repair', () => {
    const phase = readFileSync(WAVE1, 'utf8');
    const start = phase.indexOf('After legally writing or updating a valid current');
    const end = phase.indexOf('\n\nFor a repairable focus commitment', start);

    assert.ok(start >= 0 && end > start, 'Wave1 contains the focus-coverage projection refresh instruction');
    const text = phase.slice(start, end);
    assert.match(text, /sync-reference-index\.mjs --bundle <path>/);
    assert.match(text, /before rerunning the same Wave1 inspect/);
    assert.match(text, /derived .*INDEX\.md.*reference\/README\.md.*navigation projection/);
    assert.match(text, /rerun that same command against current bytes/);
    assert.match(text, /do not hand-edit README.*focus coverage, a Gate result, or a reference file/i);
    assert.match(text, /does not make focus coverage a reference-file label, evidence authority, Gate route, or new closeout transition/i);
  });
});
