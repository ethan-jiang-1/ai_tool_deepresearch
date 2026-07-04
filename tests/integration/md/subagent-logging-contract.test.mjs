// subagent-logging-contract.test.mjs — SNC-001/002/003 + SRL-001/002/003 enforcer
// @impl SNC-001, SNC-002, SNC-003, SRL-001, SRL-002, SRL-003
//
// Verifies the sub-agent logging contract is present and durable:
//   1. Each sub-agent role spec carries the always-loaded lifecycle-logging mandate.
//   2. taskMarkdownForSlot's generated task.md carries the lifecycle-logging directive (SNC-002).
//   3. shared-subagent-protocol.md + delegated-search phase nodes direct the Phase
//      Agent to drive the relay via drive-relay-slot (SNC-003).
//   4. The validator CLI (validate-subagent-logging-contract.mjs) stays green.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK = join(__dirname, '..', '..', '..', 'DPT_FRAMEWORK');
const NODES = join(FRAMEWORK, 'workflows', 'nodes');
const REPO_ROOT = join(__dirname, '..', '..', '..');

const ROLE_SPECS = [
  join(NODES, 'phases', 'subagent-dpt-source-intake.md'),
  join(NODES, 'phases', 'subagent-dpt-source-diagnostic.md'),
  join(NODES, 'phases', 'subagent-dpt-claim-verifier.md'),
  join(NODES, 'phases', 'subagent-dpt-evidence-extractor.md'),
  join(NODES, 'phases', 'subagent-dpt-topic-scout.md'),
];

const DRIVER_NODES = [
  join(NODES, 'shared', 'shared-subagent-protocol.md'),
  join(NODES, 'phases', 'phase-wave0.md'),
  join(NODES, 'phases', 'phase-wave1.md'),
  join(NODES, 'phases', 'phase-wave2.md'),
];

const ROLE_MARKERS = ['_beacon.json', 'receipt_nonce', 'log-event.mjs', 'search_start', 'search_done', 'fetch_done', 'file_written', '`error`', 'work_done'];

// SNC-003 anti-pattern lock: the call-form is the instruction shape; bare mentions
// in prohibition/descriptive prose are allowed.
const DIRECT_CALL_ANTIPATTERNS = [
  'stageSubagentSlots(',
  'commitSlotResult(',
  'collectAndMergeSubagentResults(',
  'ingestAgentReceipt(',
];

describe('SNC-001/SRL-001..003 — sub-agent role specs mandate lifecycle logging', () => {
  for (const spec of ROLE_SPECS) {
    it(`${spec.split('/').pop()} carries the always-loaded logging mandate`, () => {
      const content = readFileSync(spec, 'utf-8');
      const missing = ROLE_MARKERS.filter((m) => !content.includes(m));
      assert.deepEqual(missing, [], `${spec} must carry logging markers; missing: ${missing.join(', ')}`);
      // The mandate is in the role body, not only delivered via spawn prompt.
      assert.ok(content.includes('always-loaded'), 'mandate must be marked always-loaded');
      assert.ok(content.includes('beacon'), 'mandate must reference the beacon');
    });
  }
});

describe('SNC-003 — phase nodes + shared protocol wire Phase Agent to drive-relay-slot', () => {
  for (const node of DRIVER_NODES) {
    it(`${node.split('/').pop()} directs Phase Agent to drive-relay-slot`, () => {
      const content = readFileSync(node, 'utf-8');
      assert.ok(content.includes('drive-relay-slot'), `${node} must reference drive-relay-slot`);
    });
  }
});

describe('SNC-003 — control-plane MD carries no direct engine-call instructions', () => {
  for (const node of [...DRIVER_NODES, ...ROLE_SPECS]) {
    it(`${node.split('/').pop()} has no direct-call wording`, () => {
      const content = readFileSync(node, 'utf-8');
      const hits = DIRECT_CALL_ANTIPATTERNS.filter((p) => content.includes(p));
      assert.deepEqual(hits, [], `${node} instructs direct engine calls: ${hits.join(', ')} — must route through drive-relay-slot`);
    });
  }
});

describe('SNC-002 — generated slot task.md carries the lifecycle-logging directive', () => {
  it('stageSubagentSlots task.md contains the beacon-read + lifecycle-logging directive', async () => {
    const { stageSubagentSlots } = await import(join(FRAMEWORK, 'engine', 'subagent-relay.mjs'));
    const bundle = mkdtempSync(join(tmpdir(), 'wnc011_'));
    try {
      writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({ bundle: 'wnc011' }));
      const [slot] = stageSubagentSlots({
        current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5, topicReadiness: 'ready',
      }, bundle);
      const taskMd = readFileSync(join(bundle, slot.taskPath), 'utf-8');
      assert.ok(taskMd.includes('Lifecycle Logging'), 'task.md must have a Lifecycle Logging section');
      assert.ok(taskMd.includes('_beacon.json'), 'task.md must direct reading the beacon');
      assert.ok(taskMd.includes('receipt_nonce'), 'task.md must reference the beacon nonce');
      // Indirect log_cli reference (via beacon), not a hardcoded bundle path.
      assert.ok(taskMd.includes('log_cli') || taskMd.includes('log-event.mjs'));
    } finally {
      rmSync(bundle, { recursive: true, force: true });
    }
  });
});

describe('Validator CLI stays green', () => {
  it('validate-subagent-logging-contract.mjs exits 0 against the shipped framework', () => {
    const cli = join(FRAMEWORK, 'cli', 'validate-subagent-logging-contract.mjs');
    assert.ok(existsSync(cli), 'validator CLI exists');
    const result = execSync(`node "${cli}"`, { encoding: 'utf-8', cwd: REPO_ROOT });
    assert.match(result, /0 failed/);
  });
});
