// @impl PRE-002, EXA-005, EXA-006, PLR-003
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const CASE = 'experiments_playbook/exp_wff_pre-research-repair/case-111-standard-repair-loop.md';

describe('case-111 repair-loop Markdown contract', () => {
  it('repairs every direct HITL1 blocker through its owning surface before the rerun', () => {
    const body = readFileSync(CASE, 'utf8');
    for (const command of [
      'check-gate-instantiation-complete.mjs',
      'enter-phase.mjs --bundle "$B" --node "$NEXT"',
      'advance-status.mjs --bundle "$B" --to hitl1_recorded',
      'operate-topic-state.mjs apply --bundle "$B" --input "$STATE/case111-topic-input.json"',
      'operate-topic-state.mjs inspect --bundle "$B"',
    ]) assert.ok(body.includes(command), `case-111 must include ${command}`);

    const repairStart = body.indexOf('## Step 3: Apply the smallest declared fixture repair');
    const rerunStart = body.indexOf('## Step 4: Rerun the same gate');
    assert.ok(repairStart >= 0 && rerunStart > repairStart);
    for (const command of ['check-gate-instantiation-complete.mjs', 'operate-topic-state.mjs apply', 'advance-status.mjs --bundle "$B" --to hitl1_recorded']) {
      const index = body.indexOf(command, repairStart);
      assert.ok(index > repairStart && index < rerunStart, `${command} must precede the repair rerun`);
    }
    assert.ok(body.includes('verdict_mode: last'));
    assert.ok(body.includes('finalize-agent-experiment.mjs'));
  });
});
