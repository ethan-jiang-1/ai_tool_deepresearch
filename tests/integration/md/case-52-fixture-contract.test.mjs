// @impl AGT-010
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const CASE_FILE = join(REPO_ROOT, 'experiments_playbook', 'exp_wff_validation', 'case-52-standard-fail-repair.md');

describe('case-52 fixture Markdown contract', () => {
  const playbook = readFileSync(CASE_FILE, 'utf8');
  const predecessorFixture = playbook.slice(playbook.indexOf('## Step 1:'), playbook.indexOf('## Step 2:'));
  const witnessedHandoff = playbook.slice(playbook.indexOf('## Step 3:'), playbook.indexOf('## Step 4:'));

  it('uses the Engine writer with a selected receipt for the Wave1 fixture', () => {
    assert.match(playbook, /schema: command-experiment\/v2/);
    assert.match(predecessorFixture, /import \{ selectWave1CarriedTargetReceipt \} from '\.\/DPT_FRAMEWORK\/engine\/helpers\/wave-carried-target-receipts\.mjs';/);
    assert.match(predecessorFixture, /const carriedTargetSelection = selectWave1CarriedTargetReceipt\(bundle\);/);
    assert.match(predecessorFixture, /if \(!carriedTargetSelection\.ok\) throw new Error/);
    assert.match(predecessorFixture, /if \(gate === 'wave1-complete'\) \{\s*writeGateAttempt\(bundle, result, \{ carriedTargetReceipt: carriedTargetSelection\.receipt, strictTrace: true \}\);/s);
    assert.doesNotMatch(predecessorFixture, /appendFile(?:Sync)?\([^\n]*rb_trace\.jsonl/);
  });

  it('uses the explicit readiness target in the independent handoff block', () => {
    assert.match(witnessedHandoff, /enter-phase\.mjs --bundle "\$B" --node phases\/phase-readiness\.md/);
    assert.doesNotMatch(witnessedHandoff, /--node "\$N"/);
    assert.doesNotMatch(witnessedHandoff, /\bN=\$\(/);
  });
});
