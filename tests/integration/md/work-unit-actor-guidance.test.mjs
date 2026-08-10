// @impl RWP-019, DEW-016, DEW-017

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const read = (file) => readFileSync(file, 'utf-8');

describe('work-unit actor guidance', () => {
  it('keeps one helper-oriented role-bound decision loop', () => {
    const shared = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md');
    assert.match(shared, /one small real native probe for that exact role/i);
    assert.match(shared, /Phase Agent executes exactly that one task\/beacon itself/i);
    assert.match(shared, /human-directed.*not availability evidence or fallback permission/i);
    assert.match(shared, /fail --reason actor_spawn_unavailable:<reason_code>/);
    assert.match(shared, /no probe service, availability registry, fallback queue, or automatic actor switch exists/i);
    assert.match(shared, /repair_kind.*assigns the responsible owner but does not place interaction/i);
    assert.match(shared, /stop: no[\s\S]*external_action.*missing_contract.*do not initiate/i);
    assert.match(shared, /generated `task\.md`[\s\S]*None creates a user-facing checkpoint, interaction authority/i);
  });

  it('keeps every active wave claim explicit and role matching', () => {
    for (const [file, role] of [
      ['DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md', 'dpt-source-intake'],
      ['DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md', 'dpt-evidence-extractor'],
      ['DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md', 'dpt-topic-scout'],
    ]) {
      const content = read(file);
      assert.match(content, new RegExp(`--actor-role-key ${role}`));
      assert.match(content, /--actor-outcome/);
      assert.match(content, /--execution-actor/);
      assert.match(content, /Do not claim a batch to test availability/);
    }
  });

  it('keeps the profile cap as Agent guidance instead of a host or Engine scheduler', () => {
    const shared = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md');
    assert.match(shared, /rb_profile\.yaml#\/delegated_concurrency_cap/);
    assert.match(shared, /claim_count = min\(eligible_independent_demand, effective_delegated_concurrency_cap, remaining_free_capacity\)/);
    assert.match(shared, /remaining_free_capacity.*effective cap minus reconstructed normal delegated in-flight work/i);
    assert.match(shared, /fallback always claims exactly one work unit regardless of the profile cap/i);
    assert.match(shared, /not proof that a host started, kept live, or physically ran/i);
    assert.doesNotMatch(shared, /no higher than 5|<= 5/);
  });

  it('guards simplicity scope against a parallel availability control plane', () => {
    const sources = [
      read('DEEP_RESEARCH_HARNESS/engine/work-unit-actor.mjs'),
      read('DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs'),
      read('DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs'),
    ].join('\n');
    for (const prohibited of ['host_report', 'actor_ttl', 'availability_db', 'fallback_queue', 'probe_token', 'auto_fallback']) assert.doesNotMatch(sources, new RegExp(prohibited));
  });
});
