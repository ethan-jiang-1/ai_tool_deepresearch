// gate-provenance-forensics.test.mjs — RPG-007..013 surface in wave gate inspect (advisory)
// @impl RPG-007, RPG-008, RPG-013
//
// Verifies the wave gate CLI wires runProvenanceForensics into its `inspect`
// output as advisory lines (prefixed `[provenance_diagnostic:...]`), so a
// future coding agent can read them post-run. Pass/fail stays rules-driven.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const createdDirs = [];

function makeBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 15000 });
  const dir = r.stdout.trim();
  createdDirs.push(dir);

  const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
  status.current_gate = 'wave0_complete';
  status.next_gate = 'wave1_complete';
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));
  return dir;
}

/** Hand-fake a relay slot the lazy way (no dispatch.json, non-UUID nonce, no engine trace). */
function handFakeSlot(bundle, slotKey, status = 'done') {
  const slotDir = join(bundle, '_subagents', 'wave_00', 'slot_00');
  mkdirSync(slotDir, { recursive: true });
  writeFileSync(join(slotDir, '_status.json'), JSON.stringify({ status, updated: '2026-07-03T00:00:00.000Z' }));
  writeFileSync(join(slotDir, 'result.json'), JSON.stringify({
    slotKey, roleAgentKey: 'dpt-source-intake', status, summary: '', evidenceCount: 1,
    references: [], confidence: 0.5, notes: [],
  }));
  writeFileSync(join(slotDir, 'runtime-receipt.jsonl'), [
    JSON.stringify({ event: 'agent_runtime_started', slotKey, roleAgentKey: 'dpt-source-intake', receiptNonce: `nonce-${slotKey}-1783064202829` }),
    JSON.stringify({ event: 'agent_result_ready', slotKey, roleAgentKey: 'dpt-source-intake', receiptNonce: `nonce-${slotKey}-1783064202829` }),
  ].join('\n') + '\n');
}

function runGate(bundlePath) {
  const r = spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-wave0.md'], { encoding: 'utf-8', timeout: 15000 });
  return JSON.parse(r.stdout.trim());
}

function appendTrace(bundle, events) {
  const p = join(bundle, 'rb_trace.jsonl');
  for (const e of events) appendFileSync(p, JSON.stringify(e) + '\n');
}
function appendRunLog(bundle, lines) {
  mkdirSync(join(bundle, '_logs'), { recursive: true });
  const p = join(bundle, '_logs', 'run.log');
  for (const l of lines) appendFileSync(p, JSON.stringify(l) + '\n');
}

after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

describe('Wave gate surfaces provenance forensics as advisory inspect lines', () => {
  it('a lazy hand-faked slot produces provenance_nonce_mismatch + relay_commit_missing in inspect', () => {
    const bundle = makeBundle('gateforensics');
    handFakeSlot(bundle, 'source_intake', 'done');

    const result = runGate(bundle);
    const inspectText = (result.inspect || []).join('\n');
    assert.ok(inspectText.includes('[provenance_diagnostic:provenance_nonce_mismatch]'),
      `expected provenance_nonce_mismatch diagnostic; inspect was: ${inspectText}`);
    assert.ok(inspectText.includes('[provenance_diagnostic:relay_commit_missing]'),
      `expected relay_commit_missing diagnostic`);
    // RPG-013: diagnostics carry slot + wave
    assert.ok(inspectText.includes('slot=source_intake'), 'diagnostic carries slotKey');
    assert.ok(/wave=wave_00/.test(inspectText), 'diagnostic carries wave');
  });

  it('a sound (consistent, nonce-anchored) slot in wave_00 emits no provenance diagnostics', () => {
    const bundle = makeBundle('gatesound');
    const UUID = '11111111-1111-4111-8111-111111111111';
    const slotDir = join(bundle, '_subagents', 'wave_00', 'slot_00');
    mkdirSync(slotDir, { recursive: true });
    writeFileSync(join(bundle, '_subagents', 'wave_00', 'dispatch.json'), JSON.stringify({
      wave: 'wave-0', waveIndex: 0, created: '2026-07-03T00:00:00.000Z', concurrencyCap: 8,
      slots: [{ key: 'src', slotIndex: 0, roleAgentKey: 'dpt-source-intake', taskDescription: 'x', receipt_nonce: UUID }],
    }, null, 2));
    writeFileSync(join(slotDir, '_beacon.json'), JSON.stringify({ bundle_dir: bundle, log_cli: '/cli/log-event.mjs', slot_key: 'src', receipt_nonce: UUID }));
    writeFileSync(join(slotDir, '_status.json'), JSON.stringify({ status: 'done', updated: '2026-07-03T00:00:00.000Z' }));
    writeFileSync(join(slotDir, 'result.json'), JSON.stringify({ slotKey: 'src', roleAgentKey: 'dpt-source-intake', status: 'done', summary: '', evidenceCount: 1, references: [], confidence: 0.5, notes: [] }));
    writeFileSync(join(slotDir, '_agent.json'), JSON.stringify({ slotKey: 'src', roleAgentKey: 'dpt-source-intake', platform: 'claude-code', runtimeMode: 'project-agent', runtimeAgentId: 'a1', spawnedAt: '2026-07-03T00:00:00.000Z', completedAt: '2026-07-03T00:00:05.000Z', status: 'done', validationOk: true }));
    writeFileSync(join(slotDir, 'runtime-receipt.jsonl'), [
      JSON.stringify({ event: 'agent_runtime_started', slotKey: 'src', roleAgentKey: 'dpt-source-intake', receiptNonce: UUID }),
      JSON.stringify({ event: 'agent_result_ready', slotKey: 'src', roleAgentKey: 'dpt-source-intake', receiptNonce: UUID }),
    ].join('\n') + '\n');
    appendTrace(bundle, [
      { event: 'slot_create', key: 'src', receiptNonce: UUID },
      { event: 'dispatch_create', slots: [{ key: 'src', receiptNonce: UUID }] },
      { event: 'agent_runtime_started', key: 'src', receiptNonce: UUID },
      { event: 'agent_result_ready', key: 'src', receiptNonce: UUID },
      { event: 'agent_result_received', key: 'src', receiptNonce: UUID },
      { event: 'result_schema_validated', key: 'src', receiptNonce: UUID },
    ]);
    appendRunLog(bundle, [
      { level: 'info', msg: 'relay_commit_done', detail: { slotKey: 'src' } },
      { level: 'info', msg: 'work_done', detail: { receipt_nonce: UUID } },
    ]);

    const gate = runGate(bundle);
    const inspectText = (gate.inspect || []).join('\n');
    assert.ok(!inspectText.includes('provenance_diagnostic'),
      `sound slot should produce no provenance diagnostics; inspect was: ${inspectText}`);
  });
});
