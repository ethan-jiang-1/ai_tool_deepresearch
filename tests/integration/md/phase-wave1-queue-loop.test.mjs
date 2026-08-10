// @impl AGQ-022, SUD-003

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const TEMPLATE = 'DEEP_RESEARCH_HARNESS/rb_templates/rb_profile.yaml.tmpl';
const FORMULA = 'claim_count = min(eligible_independent_demand, effective_delegated_concurrency_cap, remaining_free_capacity)';
const guidanceFiles = [
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md',
  'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md',
];

describe('Wave1 delegated queue-loop guidance', () => {
  it('renders the one profile-owned default cap', () => {
    const template = readFileSync(TEMPLATE, 'utf8');
    assert.match(template, /^delegated_concurrency_cap: 12$/m);
  });

  it('keeps every Wave and the shared protocol on the same bounded top-up contract', () => {
    for (const file of guidanceFiles) {
      const body = readFileSync(file, 'utf8');
      assert.match(body, /rb_profile\.yaml#\/delegated_concurrency_cap/, file);
      assert.ok(body.includes(FORMULA), `${file} must use the shared formula`);
      assert.match(body, /already reaches the effective cap/i, file);
      assert.match(body, /fallback.*exactly one work unit.*regardless of the profile cap/i, file);
      assert.match(body, /not proof that a host started, kept live, or physically ran/i, file);
      assert.doesNotMatch(body, /no higher than 5|<= 5/, file);
    }
  });

  it('keeps Wave1 explicit about normal claim counts and its existing actor role', () => {
    const body = readFileSync('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md', 'utf8');
    assert.match(body, /independent eligible Wave1 topic-deepening demand/i);
    assert.match(body, /--count <claim_count>/);
    assert.match(body, /--actor-role-key dpt-evidence-extractor/);
    assert.match(body, /Engine admits `phase_agent_fallback`/);
  });
});
