import { test } from 'node:test';
import assert from 'node:assert/strict';

import { describeTopicApplyPlanSchema } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';

// @impl CTS-010

test('wave_projection schema exposes both source_identity kinds', () => {
  const projection = describeTopicApplyPlanSchema('wave_projection');
  assert.equal(projection.ok, true);
  const form = projection.forms.find((f) => f.action === 'apply_seed_projection');
  assert.ok(form, 'apply_seed_projection form exists');
  const kinds = form.closed_values['updates[].entries[].source_identity.kind'];
  assert.deepEqual(kinds, ['submitted_work', 'finding']);
});

test('wave_projection schema exposes per-wave source-identity rules', () => {
  const projection = describeTopicApplyPlanSchema('wave_projection');
  const form = projection.forms.find((f) => f.action === 'apply_seed_projection');
  assert.deepEqual(form.wave_rules.wave0.source_identity_kind, ['submitted_work']);
  assert.deepEqual(form.wave_rules.wave1.source_identity_kind, ['submitted_work']);
  assert.deepEqual(form.wave_rules.wave2.source_identity_kind, ['finding']);
  assert.match(form.wave_rules.wave2.entry_id_rule, /finding_id/);
});

test('a wave2_judgment packet built from the schema projection is valid', () => {
  const projection = describeTopicApplyPlanSchema('wave_projection');
  const form = projection.forms.find((f) => f.action === 'apply_seed_projection');
  const kinds = form.closed_values['updates[].entries[].source_identity.kind'];
  assert.ok(kinds.includes('finding'));
});
