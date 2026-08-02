// @impl AGT-010
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const CASE_FILE = join(REPO_ROOT, 'experiments_playbook', 'exp_wff_validation', 'case-51-standard-happy-path.md');

describe('case-51 fixture Markdown contract', () => {
  const playbook = readFileSync(CASE_FILE, 'utf8');
  const proceedFixture = playbook.slice(playbook.indexOf('## Step 1:'), playbook.indexOf('## Step 2:'));
  const rerunFixture = playbook.slice(playbook.indexOf('## Step 2:'), playbook.indexOf('## Step 3:'));

  it('uses the Engine writer with a selected receipt for the Wave1 fixture', () => {
    assert.match(playbook, /schema: command-experiment\/v2/);
    assert.match(proceedFixture, /import \{ selectWave1CarriedTargetReceipt \} from '\.\/DPT_FRAMEWORK\/engine\/helpers\/wave-carried-target-receipts\.mjs';/);
    assert.match(proceedFixture, /const carriedTargetSelection = selectWave1CarriedTargetReceipt\(bundle\);/);
    assert.match(proceedFixture, /if \(!carriedTargetSelection\.ok\) throw new Error/);
    assert.match(proceedFixture, /if \(gate === 'wave1-complete'\) \{\s*writeGateAttempt\(bundle, result, \{ carriedTargetReceipt: carriedTargetSelection\.receipt, strictTrace: true \}\);/s);
    assert.doesNotMatch(proceedFixture, /appendFile(?:Sync)?\([^\n]*rb_trace\.jsonl/);
  });

  it('projects the selected style after HITL2 status sync and before rerun-ready', () => {
    const statusSync = rerunFixture.indexOf('advance-status.mjs --bundle "$R" --to hitl2_recorded');
    const styleProjection = rerunFixture.indexOf('apply-research-style.mjs --bundle "$R" --style quick_factual');
    const rerunGate = rerunFixture.indexOf('check-gate-rerun-ready.mjs');

    assert.ok(statusSync >= 0, 'rerun fixture must synchronize HITL2 status');
    assert.ok(styleProjection > statusSync, 'style projection must follow HITL2 status sync');
    assert.ok(rerunGate > styleProjection, 'style projection must precede the first rerun-ready gate');
  });
});
