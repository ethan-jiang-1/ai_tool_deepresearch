import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createWorkUnit } from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import { makeItem } from '../../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import { currentDelegatedActorExecution } from '../../engine/work-unit-test-helpers.mjs';

const created = [];
function tempBundle() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'receipt-guidance-'));
  created.push(dir);
  return dir;
}
function queueItem() {
  return makeItem({
    queue_item_id: 'topic-a', title: 'Source intake',
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: {
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      topic_slug: 'topic-a',
      wave: 0,
    },
    required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
    writes_to: ['artifacts/wave0/topic-a/source.yaml'],
  });
}
function assertReceiptBoundary(content, label) {
  assert.match(content, /assigned[^\n]*runtime[-_]receipt|assigned receipt/i, `${label} must name the assigned receipt`);
  assert.match(content, /JSONL/i, `${label} must require JSONL lifecycle evidence`);
  assert.match(content, /log-event\.mjs[^\n]*(optional diagnostic|diagnostic mirroring)/i, `${label} must make log-event optional diagnostics`);
  assert.match(content, /(never|not)[^\n]*(satisf|replace)[^\n]*(receipt|lifecycle)/i, `${label} must deny log-as-receipt authority`);
}

describe('work-unit receipt guidance boundary', () => {
  after(() => created.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it('keeps generated task and spawn prompt on assigned receipt authority', () => {
    const dir = tempBundle();
    const { manifest, spawn_prompt } = createWorkUnit(dir, {
      queueItem: queueItem(),
      wave: 0,
      actor_execution: currentDelegatedActorExecution('dpt-source-intake'),
    });
    const task = readFileSync(path.join(dir, manifest.paths.task_ref), 'utf8');
    assertReceiptBoundary(task, 'generated task');
    assertReceiptBoundary(spawn_prompt, 'spawn prompt');
    assert.match(task, /dry-submit/);
    assert.match(task, /same candidate|same claimed attempt/i);
  });

  it('keeps shared protocol and every active work-unit role consistent', () => {
    const phases = path.join(process.cwd(), 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases');
    const files = readdirSync(phases).filter((name) => /^subagent-dpt-.*\.md$/.test(name)).sort();
    assert.ok(files.length > 0);
    for (const file of files) assertReceiptBoundary(readFileSync(path.join(phases, file), 'utf8'), file);

    const shared = readFileSync(path.join(process.cwd(), 'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md'), 'utf8');
    assertReceiptBoundary(shared, 'shared protocol');
    assert.match(shared, /Agent runs dry-submit itself|Agent rerun that same dry-submit/i);
    assert.match(shared, /Do not ask the user to operate the pipeline/i);
  });
});
