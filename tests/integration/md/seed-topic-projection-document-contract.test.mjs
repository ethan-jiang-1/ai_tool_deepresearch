// @impl STM-001, RRM-003, RWP-016

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { SEED_TOPIC_PROJECTION_SLOTS } from '../../../DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';

const TEMPLATE = 'DPT_FRAMEWORK/workflows/nodes/templates/seed-topic-template.md';
const PLAYBOOK = 'DPT_FRAMEWORK/command_playbook/operate-topic-state.md';
const WAVE0 = 'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md';
const SHARED_AUTHORING = 'DPT_FRAMEWORK/workflows/nodes/shared/shared-return-map-authoring.md';
const WAVE0_CURRENT_ORDINAL = 'current result-declared, schema-valid `artifacts/wave0/<topic>/source.yaml` array';

function read(path) {
  return readFileSync(path, 'utf8');
}

function normalized(content) {
  return String(content).replace(/\s+/g, ' ').trim();
}

describe('Seed Topic template and projection protocol boundary', () => {
  const template = read(TEMPLATE);
  const playbook = read(PLAYBOOK);
  const wave0 = read(WAVE0);
  const sharedAuthoring = read(SHARED_AUTHORING);

  it('keeps the template instantiable and free of packet execution mechanics', () => {
    assert.match(template, /回填卡（只读操作约束，不是 Projection Entry）/);
    assert.match(template, /## Wave0：本主题的新增来源证据/);
    assert.match(template, /entry_id/);
    assert.match(template, /command_playbook\/operate-topic-state\.md/);
    assert.doesNotMatch(template, /"context"\s*:\s*"wave_projection"/);
    assert.doesNotMatch(template, /Projection Repair/);
    assert.doesNotMatch(template, /Rerun Direction Input/);
  });

  it('keeps packet, authorization, repair, and rerun input in the existing command playbook', () => {
    assert.match(playbook, /Wave Projection Packet/);
    assert.match(playbook, /apply_seed_projection/);
    assert.match(playbook, /Wave0 is authorized only/);
    assert.match(playbook, /Projection Repair/);
    assert.match(playbook, /Rerun Direction Input/);
  });

  it('loads the document template and points closeout to the one command protocol', () => {
    assert.match(wave0, /templates\/seed-topic-template/);
    assert.match(wave0, /command_playbook\/operate-topic-state\.md/);
    assert.match(wave0, /wave_projection\/apply_seed_projection/);
    assert.match(wave0, /operate-topic-state apply/);
    assert.match(wave0, /inspect-wave0-output\.mjs/);
    assert.doesNotMatch(wave0, /shared-seed-topic-template/);
  });

  it('keeps the current Wave0 candidate-ordinal convention aligned across descriptor and guidance', () => {
    const wave0Card = SEED_TOPIC_PROJECTION_SLOTS.find((slot) => slot.slotId === 'wave0_evidence')?.card;
    assert.ok(wave0Card, 'Wave0 card descriptor is required');
    assert.ok(template.includes(wave0Card.entryIdentity), 'template must mirror the executable Wave0 card identity');

    for (const [name, content] of [
      ['template', template],
      ['shared authoring cue', sharedAuthoring],
      ['playbook', playbook],
      ['Wave0 phase', wave0],
    ]) {
      assert.ok(normalized(content).includes(WAVE0_CURRENT_ORDINAL), `${name} must name the current declared source-array ordinal`);
      assert.match(normalized(content), /current projection coordinate/);
      assert.match(normalized(content), /result_hash/);
    }

    assert.match(playbook, /wu-w0-b001-<kind>-i0001\/1[\s\S]*wu-w0-b001-<kind>-i0001\/2/);
    assert.match(wave0, /packet -> writer -> same inspect/);
    for (const path of [
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md',
      WAVE0,
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md',
    ]) {
      assert.match(read(path), /requires:[\s\S]*- shared\/shared-return-map-authoring/);
    }
  });
});
