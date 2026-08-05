// @impl RWP-001, RWP-014, DEW-009, DEW-013, DEW-017

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const wave0 = readFileSync('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md', 'utf8');
const shared = readFileSync('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md', 'utf8');

describe('rerun-added Topic Wave0 uses the normal producer contract', () => {
  it('classifies direct facts into reuse, normal new-topic demand, or normal supplement', () => {
    assert.match(wave0, /existing Topic \+ valid submitted Wave0 coverage.*reuse/i);
    assert.match(wave0, /new Topic \+ no submitted Wave0 coverage.*normal/i);
    assert.match(wave0, /supplement intent.*normal supplementary/i);
    assert.match(wave0, /orphan `source\.yaml`.*not.*coverage/i);
    assert.doesNotMatch(wave0, /rerun[- ]only (?:gate|submit|provenance|work-unit)/i);
  });

  it('uses canonical absolute envelope paths, generated starter, dry-submit repair, and formal submit', () => {
    for (const content of [wave0, shared]) {
      assert.match(content, /canonical absolute `bundle_dir`/i);
      assert.match(content, /Result JSON Starter/);
      assert.match(content, /operate-work-unit\.mjs dry-submit/);
      assert.match(content, /repair.*same (?:candidate|claimed attempt)/i);
      assert.match(content, /formal (?:operate-work-unit )?submit/i);
      assert.match(content, /do not.*(?:overwrite|edit|repair).*_beacon\.json/i);
    }
  });

  it('keeps authorized mechanical execution with the Agent and rejects retrospective provenance', () => {
    assert.match(wave0, /Agent.*execute.*mechanical/i);
    assert.match(shared, /Agent.*rerun.*dry-submit/i);
    assert.match(wave0, /post-hoc.*provenance|retrospective.*provenance/i);
    assert.match(shared, /predates the claim.*cannot.*claimed attempt/i);
    assert.doesNotMatch(`${wave0}\n${shared}`, /ask the user to run.*operate-work-unit/i);
  });
});
