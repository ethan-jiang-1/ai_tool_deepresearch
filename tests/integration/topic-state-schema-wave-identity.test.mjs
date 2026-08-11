import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  describeTopicApplyPlanSchema,
  TopicApplyPlanSchema,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';

// @impl CTS-010

test('wave_projection schema exposes both source_identity kinds', () => {
  const projection = describeTopicApplyPlanSchema('wave_projection');
  assert.equal(projection.ok, true);
  const form = projection.forms.find((f) => f.action === 'apply_seed_projection');
  assert.ok(form, 'apply_seed_projection form exists');
  const kinds = form.closed_values['updates[].entries[].source_identity.kind'];
  assert.deepEqual(kinds, ['submitted_work', 'finding']);
});

test('wave_projection schema exposes complete conditional source-identity forms', () => {
  const projection = describeTopicApplyPlanSchema('wave_projection');
  const form = projection.forms.find((f) => f.action === 'apply_seed_projection');
  assert.ok(form, 'apply_seed_projection form exists');
  assert.deepEqual(form.conditional_forms.map((candidate) => candidate.condition), [
    { wave: 'wave0', source_identity_kind: 'submitted_work' },
    { wave: 'wave1', source_identity_kind: 'submitted_work' },
    { wave: 'wave2', source_identity_kind: 'finding' },
  ]);
  for (const candidate of form.conditional_forms) {
    assert.equal(TopicApplyPlanSchema.safeParse(candidate.template).success, true, JSON.stringify(candidate));
    assert.ok(Array.isArray(candidate.required_fields));
    assert.equal(typeof candidate.closed_values, 'object');
    assert.equal(typeof candidate.value_shapes, 'object');
  }

  const wave2 = form.conditional_forms.find((candidate) => candidate.condition.wave === 'wave2');
  assert.ok(wave2, 'Wave2 conditional form exists');
  assert.deepEqual(wave2.condition, { wave: 'wave2', source_identity_kind: 'finding' });
  assert.deepEqual(wave2.template.updates[0].entries[0].source_identity, { kind: 'finding', finding_id: 'W2F-001' });
  assert.equal(wave2.template.updates[0].entries[0].entry_id, 'W2F-001');
  assert.ok(wave2.required_fields.includes('updates[].entries[].source_identity.finding_id'));
  assert.equal(wave2.value_shapes['updates[].entries[].source_identity.finding_id'], 'string');
  assert.deepEqual(wave2.closed_values['updates[].entries[].source_identity.kind'], ['finding']);

  assert.deepEqual(form.wave_rules.wave0.source_identity_kind, ['submitted_work']);
  assert.deepEqual(form.wave_rules.wave1.source_identity_kind, ['submitted_work']);
  assert.deepEqual(form.wave_rules.wave2.source_identity_kind, ['finding']);
  assert.match(form.wave_rules.wave2.entry_id_rule, /finding_id/);
});

test('global form fields do not falsely require both source-identity branches', () => {
  const projection = describeTopicApplyPlanSchema('wave_projection');
  const form = projection.forms.find((f) => f.action === 'apply_seed_projection');
  const kinds = form.closed_values['updates[].entries[].source_identity.kind'];
  assert.ok(kinds.includes('finding'));
  assert.ok(form.required_fields.includes('updates[].entries[].source_identity.work_id'));
  assert.equal(form.required_fields.includes('updates[].entries[].source_identity.finding_id'), false);
});
