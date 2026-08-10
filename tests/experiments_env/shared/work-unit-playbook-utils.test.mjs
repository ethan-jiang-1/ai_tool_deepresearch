// @impl EXR-001, RWE-001, AGT-009

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  claimAndSubmitFixtureWorkUnit,
  inspectWorkUnitsViaCli,
  readWorkUnitLedgerRows,
  readTrace,
  recordPlaybookCheck,
  sourceYamlContent,
  writeMinimalPlan,
  writeMinimalStatus,
  writeWave0Scaffold,
} from '../../../experiments_env/shared/work-unit-playbook-utils.mjs';

describe('work-unit playbook utils', () => {
  it('drives fixture-backed delegated completion through real queue/work-unit CLIs', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'wu-playbook-utils-'));
    try {
      writeMinimalStatus(dir);
      writeMinimalPlan(dir);
      const result = claimAndSubmitFixtureWorkUnit(dir, {
        phase: 'wave0',
        queue_item_id: 'wave0-source-topic-a',
        topic_slug: 'topic-a',
        output_path: 'reference/00-shared-playbook-fixture.md',
        extra_output_files: [{
          path: 'artifacts/wave0/topic-a/source.yaml',
          role: 'source_yaml',
          content: sourceYamlContent({ topic_slug: 'topic-a' }),
        }],
      });

      assert.equal(result.claim.claimed_count, 1);
      assert.equal(result.submit.ok, true);
      assert.equal(result.submit.status, 'submitted');

      const rows = readWorkUnitLedgerRows(dir);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].work_id, result.record.work_id);
      assert.equal(rows[0].queue_item_id, 'wave0-source-topic-a');
      assert.deepEqual(rows[0].output_files.map((entry) => entry.path).sort(), [
        'artifacts/wave0/topic-a/source.yaml',
      ]);
      assert.equal(rows[0].result_hash, result.submit.result_hash);
      assert.equal(inspectWorkUnitsViaCli(dir).passed, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes strict playbook-owned checks for native finalization', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'wu-playbook-check-'));
    try {
      recordPlaybookCheck(dir, { gate: 'sample-check', passed: false, expected: false, detail: 'negative boundary' });
      const row = JSON.parse(readFileSync(path.join(dir, 'rb_trace.jsonl'), 'utf8'));
      assert.equal(row.event, 'check');
      assert.equal(row.source, 'playbook');
      assert.equal(row.passed, false);
      assert.equal(row.expected, false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('keeps Wave0 synthetic traces by default and allows the case-211 opt-out', () => {
    const defaultDir = mkdtempSync(path.join(os.tmpdir(), 'wu-wave0-default-'));
    const optOutDir = mkdtempSync(path.join(os.tmpdir(), 'wu-wave0-opt-out-'));
    try {
      writeWave0Scaffold(defaultDir, { planBasename: 'wave0-default' });
      writeWave0Scaffold(optOutDir, {
        planBasename: 'wave0-opt-out',
        syntheticWave0Trace: false,
      });

      assert.deepEqual(readTrace(defaultDir).map((entry) => entry.event), [
        'gate_attempt',
        'load_complete',
        'wave0_completion',
      ]);
      assert.deepEqual(readTrace(optOutDir), []);

      const defaultStatus = JSON.parse(readFileSync(path.join(defaultDir, 'rb_status.json'), 'utf8'));
      const optOutStatus = JSON.parse(readFileSync(path.join(optOutDir, 'rb_status.json'), 'utf8'));
      assert.equal(defaultStatus.current_gate, 'seed_topics_ready');
      assert.equal(optOutStatus.current_gate, 'seed_topics_ready');
      assert.equal(defaultStatus.current_node, 'phases/phase-wave0.md');
      assert.equal(optOutStatus.current_node, 'phases/phase-wave0.md');
    } finally {
      rmSync(defaultDir, { recursive: true, force: true });
      rmSync(optOutDir, { recursive: true, force: true });
    }
  });
});
