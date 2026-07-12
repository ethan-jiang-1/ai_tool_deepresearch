// @impl RWP-019, DEW-016, DEW-017

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const read = (file) => readFileSync(file, 'utf-8');

describe('work-unit actor guidance', () => {
  it('keeps one helper-oriented role-bound decision loop', () => {
    const shared = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md');
    assert.match(shared, /one small real native probe for that exact role/i);
    assert.match(shared, /Phase Agent executes exactly that one task\/beacon itself/i);
    assert.match(shared, /human-directed.*not availability evidence or fallback permission/i);
    assert.match(shared, /fail --reason actor_spawn_unavailable:<reason_code>/);
    assert.match(shared, /no probe service, availability registry, fallback queue, or automatic actor switch exists/i);
  });

  it('keeps every active wave claim explicit and role matching', () => {
    for (const [file, role] of [
      ['DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md', 'dpt-source-intake'],
      ['DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md', 'dpt-evidence-extractor'],
      ['DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md', 'dpt-topic-scout'],
    ]) {
      const content = read(file);
      assert.match(content, new RegExp(`--actor-role-key ${role}`));
      assert.match(content, /--actor-outcome/);
      assert.match(content, /--execution-actor/);
      assert.match(content, /Do not claim a batch to test availability/);
    }
  });

  it('guards simplicity scope against a parallel availability control plane', () => {
    const sources = [
      read('DPT_FRAMEWORK/engine/work-unit-actor.mjs'),
      read('DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs'),
      read('DPT_FRAMEWORK/cli/operate-work-unit.mjs'),
    ].join('\n');
    for (const prohibited of ['host_report', 'actor_ttl', 'availability_db', 'fallback_queue', 'probe_token', 'auto_fallback']) assert.doesNotMatch(sources, new RegExp(prohibited));
  });
});
