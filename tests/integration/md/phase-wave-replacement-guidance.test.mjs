// @impl RWP-015, DEW-006

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const wave0 = readFileSync('DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md', 'utf8');
const wave1 = readFileSync('DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md', 'utf8');

describe('Wave terminal replacement guidance', () => {
  it('keeps Wave0 and Wave1 at the Engine replacement and normal claim boundaries', () => {
    for (const phase of [wave0, wave1]) {
      assert.match(phase, /fail_and_replace/);
      assert.match(phase, /operate-work-unit\.mjs replace <bundle> --work-id <terminal_work_id>/);
      assert.match(phase, /exact-role native probe/i);
      assert.match(phase, /ordinary `claim`|normal `claim`/i);
      assert.match(phase, /already in-flight idempotent successor/i);
      assert.match(phase, /reconstruct and actively poll/i);
      assert.match(phase, /do not claim (again|a second attempt)/i);
      assert.match(phase, /do not hand-author|Do not .*enqueue an allegedly equivalent card/);
      assert.match(phase, /neither branch discovers a successor|Do not .*inspect `_work_units`/i);
    }
  });
});
