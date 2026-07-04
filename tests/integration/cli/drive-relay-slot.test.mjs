// drive-relay-slot integration tests (SRD-001/002/003/004)
// @impl SRD-001, SRD-002, SRD-003, SRD-004
//
// Verifies the runtime driver:
//   - stage (full wave): writes dispatch.json (UUID nonces) + _beacon.json + spawn prompts
//   - commit: passes result through commitSlotResult, emits relay_commit_done trace
//   - replacement re-stage (SUD-003): updates dispatch.json without clobbering in-flight slots
//   - boundary: an invalid (hand-faked) result is surfaced, not silenced (no done result.json)
//
// The driver is invoked as a real subprocess (like all tests/integration/cli tests).

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
const DRIVER = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/drive-relay-slot.mjs');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const createdDirs = [];

function newBundle(prefix) {
  const dir = mkdtempSync(join(tmpdir(), `drv_${prefix}_`));
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: `drv_${prefix}` }));
  createdDirs.push(dir);
  return dir;
}

function run(args) {
  try {
    const out = execSync(`node "${DRIVER}" ${args}`, { encoding: 'utf-8', stdio: 'pipe', cwd: REPO_ROOT });
    return JSON.parse(out.trim());
  } catch (e) {
    // CLI exits 1 on engine error but still emits JSON to stdout.
    if (e.stdout) return JSON.parse(e.stdout.trim());
    throw e;
  }
}

// Like run(), but also reports the process exit code.
function runWithExit(args) {
  try {
    const out = execSync(`node "${DRIVER}" ${args}`, { encoding: 'utf-8', stdio: 'pipe', cwd: REPO_ROOT });
    return { exitCode: 0, out: JSON.parse(out.trim()) };
  } catch (e) {
    if (e.stdout) return { exitCode: e.status, out: JSON.parse(e.stdout.trim()) };
    throw e;
  }
}

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function readTraceEvents(bundleDir) {
  const tracePath = join(bundleDir, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  return readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function writeReceipt(bundleDir, slot) {
  const slotDir = slot.slotDir || dirname(slot.taskPath);
  const receiptFile = join(bundleDir, slotDir, 'runtime-receipt.jsonl');
  mkdirSync(dirname(receiptFile), { recursive: true });
  const common = { slotKey: slot.key, roleAgentKey: slot.roleAgentKey, receiptNonce: slot.receiptNonce };
  writeFileSync(receiptFile, [
    JSON.stringify({ event: 'agent_runtime_started', ...common, ts: '2026-07-03T00:00:00.000Z' }),
    JSON.stringify({ event: 'agent_result_ready', ...common, ts: '2026-07-03T00:00:01.000Z' }),
  ].join('\n') + '\n');
}

after(() => {
  for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
});

describe('drive-relay-slot stage (full wave) — SRD-001/SRD-004', () => {
  it('stages slots, persists UUID nonces in dispatch.json + matching beacons, prints spawn prompts', () => {
    const bundle = newBundle('stage');
    const out = run(`stage "${bundle}" --wave 1 --platform claude-code`);

    assert.equal(out.ok, true);
    assert.equal(out.command, 'stage');
    assert.equal(out.mode, 'full');
    assert.equal(out.waveIndex, 1);
    assert.equal(out.slots.length, 4);

    const dispatch = readJson(join(bundle, '_subagents', 'wave_01', 'dispatch.json'));
    assert.equal(dispatch.slots.length, 4);
    for (const [i, slot] of out.slots.entries()) {
      assert.ok(UUID_RE.test(slot.receiptNonce), `${slot.key} nonce must be UUID`);
      assert.equal(dispatch.slots[i].receipt_nonce, slot.receiptNonce, 'dispatch nonce must equal emitted nonce');
      const beacon = readJson(join(bundle, slot.slotDir, '_beacon.json'));
      assert.equal(beacon.receipt_nonce, slot.receiptNonce, 'beacon nonce must equal emitted nonce');
      assert.ok(beacon.bundle_dir && beacon.log_cli, 'beacon carries coordinates');
      const prompt = out.spawnPrompts[i].spawnPrompt;
      assert.ok(prompt.includes(slot.slotDir), 'spawn prompt contains slot directory');
      assert.ok(prompt.includes('_beacon.json'), 'spawn prompt points to beacon');
    }
    // The driver does NOT spawn the sub-agent itself — it only emits prompts.
    assert.ok(out.spawnPrompts.every((s) => typeof s.spawnPrompt === 'string' && s.spawnPrompt.length > 0));
  });

  it('infers the next wave when --wave is omitted', () => {
    const bundle = newBundle('stage-infer');
    const out = run(`stage "${bundle}"`);
    assert.equal(out.ok, true);
    assert.equal(out.waveIndex, 1); // no prior waves → wave 1
  });
});

describe('drive-relay-slot commit — SRD-001/SRD-003/SRD-004', () => {
  it('commits a returned result through commitSlotResult and emits relay_commit_done', () => {
    const bundle = newBundle('commit');
    const staged = run(`stage "${bundle}" --wave 1`);
    const slot = staged.slots[0];
    writeReceipt(bundle, slot);

    const result = {
      slotKey: slot.key,
      roleAgentKey: slot.roleAgentKey,
      status: 'done',
      summary: 'ok',
      evidenceCount: 1,
      references: [{ title: 'T', url: 'https://example.com/a', quote: 'q', relevance: 'r' }],
      confidence: 0.8,
      notes: [],
      output_files: [],
      cache_trails: [],
    };
    const out = run(`commit "${bundle}" --wave 1 --slot "${slot.key}" --runtime-agent-id agent-1 --result '${JSON.stringify(result)}'`);
    assert.equal(out.ok, true);
    assert.equal(out.status, 'done');

    // SRD-004: driver-driven slot leaves engine trace that hand-faking cannot.
    // relay_commit_done lives in run.log; the nonce-anchored commit chain
    // (result_schema_validated + agent_result_received) lives in rb_trace.jsonl.
    const events = readTraceEvents(bundle);
    assert.ok(events.some((e) => e.event === 'result_schema_validated' && e.key === slot.key), 'result_schema_validated trace for slot');
    assert.ok(events.some((e) => e.event === 'agent_result_received' && e.key === slot.key), 'agent_result_received trace for slot');
    const runLog = readFileSync(join(bundle, '_logs', 'run.log'), 'utf-8');
    assert.ok(runLog.includes('relay_commit_done'), 'relay_commit_done marker in run.log');
    const status = readJson(join(bundle, slot.slotDir, '_status.json'));
    assert.equal(status.status, 'done');
    const committed = readJson(join(bundle, slot.slotDir, 'result.json'));
    assert.equal(committed.status, 'done');
  });

  it('surfaces an invalid (hand-faked) result — never writes a done result.json (SRD-003)', () => {
    const bundle = newBundle('commit-invalid');
    const staged = run(`stage "${bundle}" --wave 1`);
    const slot = staged.slots[0];
    writeReceipt(bundle, slot);

    // Wrong slotKey → commitSlotResult validation fails.
    const bad = { slotKey: 'wrong', roleAgentKey: slot.roleAgentKey, status: 'done', summary: '', evidenceCount: 0, references: [], confidence: 0, notes: [] };
    const { exitCode, out } = runWithExit(`commit "${bundle}" --wave 1 --slot "${slot.key}" --runtime-agent-id agent-x --result '${JSON.stringify(bad)}'`);
    assert.equal(out.ok, false);
    assert.equal(out.validationOk, false);
    assert.notEqual(out.status, 'done');
    // A failed commit must exit non-zero (with the JSON report still on stdout)
    // so callers/scripts cannot mistake it for success.
    assert.equal(exitCode, 1, 'schema-validation failure exits 1');

    const status = readJson(join(bundle, slot.slotDir, '_status.json'));
    assert.notEqual(status.status, 'done');
    const committed = readJson(join(bundle, slot.slotDir, 'result.json'));
    assert.notEqual(committed.status, 'done');
  });

  it('a valid commit exits 0', () => {
    const bundle = newBundle('commit-exit0');
    const staged = run(`stage "${bundle}" --wave 1`);
    const slot = staged.slots[0];
    writeReceipt(bundle, slot);
    const result = { slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done', summary: 'ok', evidenceCount: 0, references: [], confidence: 0.5, notes: [], output_files: [], cache_trails: [] };
    const { exitCode, out } = runWithExit(`commit "${bundle}" --wave 1 --slot "${slot.key}" --runtime-agent-id agent-1 --result '${JSON.stringify(result)}'`);
    assert.equal(out.ok, true);
    assert.equal(exitCode, 0);
  });
});

describe('drive-relay-slot stage replacement — SUD-003', () => {
  it('re-stages a freed slotIndex without clobbering in-flight slots', () => {
    const bundle = newBundle('replace');
    const staged = run(`stage "${bundle}" --wave 1`);
    // Snapshot in-flight nonces for slots 1-3 (should be untouched by replacement).
    const before = readJson(join(bundle, '_subagents', 'wave_01', 'dispatch.json'));
    const survivorNonces = new Map(before.slots.filter((s) => s.slotIndex !== 0).map((s) => [s.slotIndex, s.receipt_nonce]));

    const out = run(`stage "${bundle}" --wave 1 --slot-index 0 --role dpt-source-intake --key repl_source_01 --task "replacement intake"`);
    assert.equal(out.ok, true);
    assert.equal(out.mode, 'replacement');
    assert.equal(out.slot.slotIndex, 0);
    assert.equal(out.slot.key, 'repl_source_01');
    assert.ok(UUID_RE.test(out.slot.receiptNonce));

    const after = readJson(join(bundle, '_subagents', 'wave_01', 'dispatch.json'));
    // Exactly one slot_00 entry, with the new key + new nonce.
    const slotZeroEntries = after.slots.filter((s) => s.slotIndex === 0);
    assert.equal(slotZeroEntries.length, 1);
    assert.equal(slotZeroEntries[0].key, 'repl_source_01');
    assert.equal(slotZeroEntries[0].receipt_nonce, out.slot.receiptNonce);
    // New nonce differs from the original slot_00 nonce.
    assert.notEqual(slotZeroEntries[0].receipt_nonce, before.slots.find((s) => s.slotIndex === 0).receipt_nonce);
    // In-flight slots (1,2,3) untouched.
    for (const [idx, nonce] of survivorNonces) {
      const stillThere = after.slots.find((s) => s.slotIndex === idx);
      assert.ok(stillThere, `slot ${idx} preserved`);
      assert.equal(stillThere.receipt_nonce, nonce, `slot ${idx} nonce unchanged`);
    }
    // Replacement slot got its own beacon.
    const beacon = readJson(join(bundle, out.slot.slotDir, '_beacon.json'));
    assert.equal(beacon.receipt_nonce, out.slot.receiptNonce);
    assert.equal(beacon.slot_key, 'repl_source_01');
  });

  it('re-staging a used slotIndex clears the prior occupant\'s execution artifacts', () => {
    const bundle = newBundle('replace-clean');
    const staged = run(`stage "${bundle}" --wave 1`);
    const slot = staged.slots[0];
    writeReceipt(bundle, slot);
    const result = { slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done', summary: 'ok', evidenceCount: 0, references: [], confidence: 0.5, notes: [], output_files: [], cache_trails: [] };
    run(`commit "${bundle}" --wave 1 --slot "${slot.key}" --runtime-agent-id agent-1 --result '${JSON.stringify(result)}'`);
    const slotDir = join(bundle, slot.slotDir);
    // Prior occupant left receipt/result/agent artifacts carrying the OLD nonce.
    for (const f of ['runtime-receipt.jsonl', 'result.json', '_agent.json']) {
      assert.ok(existsSync(join(slotDir, f)), `${f} present before re-stage`);
    }

    const out = run(`stage "${bundle}" --wave 1 --slot-index ${slot.slotIndex} --role dpt-source-intake --key repl_clean_01 --task "replacement intake"`);
    assert.equal(out.ok, true);
    // Stale artifacts removed — the old nonce cannot pollute the new slot's provenance chain.
    for (const f of ['runtime-receipt.jsonl', 'result.json', 'result.md', '_agent.json']) {
      assert.ok(!existsSync(join(slotDir, f)), `${f} cleared by re-stage`);
    }
    // Fresh slot contract files present with the NEW nonce.
    const beacon = readJson(join(slotDir, '_beacon.json'));
    assert.equal(beacon.slot_key, 'repl_clean_01');
    assert.notEqual(beacon.receipt_nonce, slot.receiptNonce);
    const status = readJson(join(slotDir, '_status.json'));
    assert.equal(status.status, 'pending');
  });
});

describe('drive-relay-slot merge — SRD-001', () => {
  it('collects and merges committed slots into workflow state', () => {
    const bundle = newBundle('merge');
    const staged = run(`stage "${bundle}" --wave 1`);
    // Commit one slot as done.
    const slot = staged.slots[0];
    writeReceipt(bundle, slot);
    const result = {
      slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
      summary: 'ok', evidenceCount: 1,
      references: [{ title: 'T', url: 'https://example.com/m', quote: '', relevance: '' }],
      confidence: 0.5, notes: [], output_files: [], cache_trails: [],
    };
    run(`commit "${bundle}" --wave 1 --slot "${slot.key}" --runtime-agent-id agent-m --result '${JSON.stringify(result)}'`);

    const out = run(`merge "${bundle}" --wave 1`);
    assert.equal(out.ok, true);
    assert.equal(out.command, 'merge');
    assert.ok(out.finalState, 'merge returns final state');
    assert.ok(out.forkDecision || out.repaired, 'merge returns a fork/repair decision');
  });
});

describe('drive-relay-slot boundary — SRD-002', () => {
  it('refuses unknown commands with deterministic error output (no semantic verdicts)', () => {
    const bundle = newBundle('boundary');
    const out = run(`search "${bundle}"`);
    assert.equal(out.ok, false);
    assert.ok(out.error);
  });
});
