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
import { join, basename } from 'node:path';
import { setStatusWindow, witnessedHandoffEvents } from './handoff-fixtures.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs');
const GATE_CLI_W1 = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs');
const GATE_CLI_W2 = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const createdDirs = [];

function makeBundle(name, gate = 'wave0_complete', nextGate = 'wave1_complete') {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force'], { encoding: 'utf-8', timeout: 15000 });
  const dir = r.stdout.trim();
  createdDirs.push(dir);

  const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
  status.current_gate = gate;
  status.next_gate = nextGate;
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));
  return dir;
}

/** Hand-fake a relay slot the lazy way (no dispatch.json, non-UUID nonce, no engine trace). */
function handFakeSlot(bundle, slotKey, status = 'done', wave = 'wave_00') {
  const slotDir = join(bundle, '_subagents', wave, 'slot_00');
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

function runGate(bundlePath, cli = GATE_CLI, currentNode = 'phases/phase-wave0.md') {
  appendCurrentNodeHandoff(bundlePath, currentNode);
  const r = spawnSync('node', [cli, '--bundle', bundlePath, '--current-node', currentNode], { encoding: 'utf-8', timeout: 15000 });
  return JSON.parse(r.stdout.trim());
}

function appendTrace(bundle, events) {
  const p = join(bundle, 'rb_trace.jsonl');
  for (const e of events) appendFileSync(p, JSON.stringify(e) + '\n');
}

function traceEventCount(bundle) {
  const raw = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf-8').trim();
  return raw ? raw.split('\n').length : 0;
}

function appendCurrentNodeHandoff(bundle, currentNode) {
  const configs = {
    'phases/phase-wave0.md': {
      currentGate: 'seed_topics_ready',
      nextGate: 'wave0_complete',
      sourceGate: 'seed-topics-ready',
      phase: 'seed-topics',
      sourceNode: 'phases/phase-seed-topics.md',
    },
    'phases/phase-wave1.md': {
      currentGate: 'wave0_complete',
      nextGate: 'wave1_complete',
      sourceGate: 'wave0-complete',
      phase: 'wave0',
      sourceNode: 'phases/phase-wave0.md',
    },
    'phases/phase-wave2.md': {
      currentGate: 'wave1_complete',
      nextGate: 'wave2_complete',
      sourceGate: 'wave1-complete',
      phase: 'wave1',
      sourceNode: 'phases/phase-wave1.md',
    },
  };
  const cfg = configs[currentNode];
  if (!cfg) return;

  setStatusWindow(bundle, cfg.currentGate, cfg.nextGate);
  appendTrace(bundle, witnessedHandoffEvents({
    sourceGate: cfg.sourceGate,
    phase: cfg.phase,
    sourceNode: cfg.sourceNode,
    targetNode: currentNode,
    sourceAttemptIndex: traceEventCount(bundle),
  }));
}
// Production run.log envelope: [ISO8601] LEVEL msg bundle=<name> {json detail}
// (matches logger.mjs formatMessage — the forensics parser reads this format).
function appendRunLog(bundle, lines) {
  mkdirSync(join(bundle, '_logs'), { recursive: true });
  const p = join(bundle, '_logs', 'run.log');
  for (const l of lines) {
    const label = (l.level || 'info').toUpperCase();
    appendFileSync(p, `[2026-07-03T00:00:00.000Z] ${label} ${l.msg} bundle=${basename(bundle)} ${JSON.stringify(l.detail || {})}\n`);
  }
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
      { level: 'info', msg: 'work_done', detail: { kind: 'work_done', slotKey: 'src', receipt_nonce: UUID } },
    ]);

    const gate = runGate(bundle);
    const inspectText = (gate.inspect || []).join('\n');
    assert.ok(!inspectText.includes('provenance_diagnostic'),
      `sound slot should produce no provenance diagnostics; inspect was: ${inspectText}`);
  });

  it('forensic findings never change check.passed (advisory invariance)', () => {
    // Two bundles identical except one has a forensic-triggering hand-faked slot.
    const clean = makeBundle('gateinvclean');
    const faked = makeBundle('gateinvfaked');
    handFakeSlot(faked, 'src', 'done');

    const cleanGate = runGate(clean);
    const fakedGate = runGate(faked);
    const fakedInspect = (fakedGate.inspect || []).join('\n');
    assert.ok(fakedInspect.includes('provenance_diagnostic'), 'faked bundle has forensic findings');
    // Pass/fail must be rules-driven only: findings do not flip the outcome.
    assert.equal(fakedGate.check.passed, cleanGate.check.passed,
      'check.passed identical with and without forensic findings');
  });
});

describe('Wave1/Wave2 gate CLIs also surface provenance forensics (advisory)', () => {
  it('wave1 gate reports diagnostics for a hand-faked wave_01 slot without changing pass/fail semantics', () => {
    const bundle = makeBundle('gatew1', 'wave1_complete', 'wave2_complete');
    handFakeSlot(bundle, 'deepening', 'done', 'wave_01');

    const gate = runGate(bundle, GATE_CLI_W1, 'phases/phase-wave1.md');
    const inspectText = (gate.inspect || []).join('\n');
    assert.ok(inspectText.includes('[provenance_diagnostic:provenance_nonce_mismatch]'),
      `wave1 gate surfaces nonce mismatch; inspect was: ${inspectText}`);
    assert.ok(/wave=wave_01/.test(inspectText), 'diagnostic carries wave_01');
    assert.equal(typeof gate.check.passed, 'boolean', 'pass/fail stays rules-driven');
  });

  it('wave2 gate reports diagnostics for a hand-faked wave_02 slot', () => {
    const bundle = makeBundle('gatew2', 'wave2_complete', 'readiness_passed');
    handFakeSlot(bundle, 'scout', 'done', 'wave_02');

    const gate = runGate(bundle, GATE_CLI_W2, 'phases/phase-wave2.md');
    const inspectText = (gate.inspect || []).join('\n');
    assert.ok(inspectText.includes('[provenance_diagnostic:provenance_nonce_mismatch]'),
      `wave2 gate surfaces nonce mismatch; inspect was: ${inspectText}`);
    assert.ok(/wave=wave_02/.test(inspectText), 'diagnostic carries wave_02');
  });
});
