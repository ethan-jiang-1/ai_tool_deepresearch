// @impl STM-001, RRM-003, RWP-016

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const TEMPLATE = 'DPT_FRAMEWORK/workflows/nodes/templates/seed-topic-template.md';
const PLAYBOOK = 'DPT_FRAMEWORK/command_playbook/operate-topic-state.md';
const WAVE0 = 'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md';

function read(path) {
  return readFileSync(path, 'utf8');
}

describe('Seed Topic template and projection protocol boundary', () => {
  const template = read(TEMPLATE);
  const playbook = read(PLAYBOOK);
  const wave0 = read(WAVE0);

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
});
