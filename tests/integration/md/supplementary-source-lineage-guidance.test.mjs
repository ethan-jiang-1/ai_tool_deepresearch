// @impl SNC-006, WAI-005

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_KIND_CONTRACTS } from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';

const phase = readFileSync('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md', 'utf8');
const actor = readFileSync('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/subagent-dpt-evidence-extractor.md', 'utf8');
const shared = readFileSync('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md', 'utf8');

describe('supplementary Wave1 source-ref lineage guidance', () => {
  it('agrees with the kind contract on the only authorized prior role', () => {
    assert.deepEqual(
      DEFAULT_KIND_CONTRACTS.wave1_topic_deepening.output_contract.source_claims.prior_submitted_output_roles,
      ['evidence_summary'],
    );
    for (const content of [phase, actor]) {
      assert.match(content, /Completion Contract.*Cache And Source Facts|Cache And Source Facts.*Completion Contract/s);
      assert.match(content, /exact.*prior submitted `?evidence_summary`?/i);
      assert.match(content, /same canonical Topic.*wave.*kind/i);
    }
  });

  it('does not require historical evidence redeclaration or overwrite', () => {
    for (const content of [phase, actor, shared]) {
      assert.match(content, /do not.*(?:redeclare|overwrite)|without redeclaring or overwriting/i);
    }
    assert.doesNotMatch(`${phase}\n${actor}`, /copy (?:the )?prior evidence.*output_files/i);
  });

  it('keeps new cache and degraded refs owned by the current result', () => {
    for (const content of [phase, actor]) {
      assert.match(content, /new.*cache.*degraded|new.*degraded.*cache/i);
      assert.match(content, /current.*result\.json#?\/?cache_trails|current-attempt.*cache_trails/i);
      assert.match(content, /filesystem/i);
    }
    assert.match(phase, /same claim\/task\/dry-submit\/formal-submit loop/i);
  });
});
