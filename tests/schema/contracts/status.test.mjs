// tests/schema/contracts/status.test.mjs — 1:1 for DPT_FRAMEWORK/schema/contracts/status.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StatusSchema } from '../../../DPT_FRAMEWORK/schema/contracts/status.mjs';

const valid = { current_mode: 'execution', state: 'not_started', current_gate: 'setup_ready', next_gate: 'wave0_complete' };

describe('StatusSchema', () => {
  it('accepts valid status', () => {
    assert.ok(StatusSchema.safeParse(valid).success);
  });

  it('rejects current_mode other than execution', () => {
    assert.ok(!StatusSchema.safeParse({ ...valid, current_mode: 'idle' }).success);
  });

  it('rejects missing state', () => {
    const bad = { ...valid }; delete bad.state;
    assert.ok(!StatusSchema.safeParse(bad).success);
  });

  it('rejects invalid state enum', () => {
    assert.ok(!StatusSchema.safeParse({ ...valid, state: 'invalid' }).success);
  });

  it('rejects missing current_gate', () => {
    const bad = { ...valid }; delete bad.current_gate;
    assert.ok(!StatusSchema.safeParse(bad).success);
  });

  it('rejects invalid current_gate enum', () => {
    assert.ok(!StatusSchema.safeParse({ ...valid, current_gate: 'nonexistent_gate' }).success);
  });

  it('rejects missing next_gate', () => {
    const bad = { ...valid }; delete bad.next_gate;
    assert.ok(!StatusSchema.safeParse(bad).success);
  });

  it('accepts blocked state', () => {
    assert.ok(StatusSchema.safeParse({ ...valid, state: 'blocked' }).success);
  });
});
