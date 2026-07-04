// provenance-forensics.test.mjs — RPG-007/008/009/011/012/013 diagnostic behavior
// @impl RPG-007, RPG-008, RPG-009, RPG-011, RPG-012, RPG-013, SRL-004, SDC-002
//
// Verifies runProvenanceForensics (gate-helpers-provenance.mjs):
//   - Real relay run (sound) → all diagnostics silent
//   - Per-signal injection → the matching diagnostic fires (and only it, per tier)
//   - RPG-012 carve-out: staged-not-committed emits RPG-008, not RPG-012
//   - RPG-013: every finding carries slotKey + wave
//
// Diagnostics are advisory (read from the returned findings array; the function
// never throws and never determines pass/fail).

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { runProvenanceForensics, checkSubagentSlotPresence } from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs';

const UUID = '11111111-1111-4111-8111-111111111111';
const UUID2 = '22222222-2222-4222-8222-222222222222';
const WAVE = 'wave_00';
const created = [];

function makeBundle(name) {
  const dir = mkdtempSync(join(tmpdir(), `pf_${name}_`));
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: `pf_${name}` }));
  created.push(dir);
  return dir;
}
function slotPath(bundle, slot = 'slot_00') {
  const d = join(bundle, '_subagents', WAVE, slot);
  mkdirSync(d, { recursive: true });
  return d;
}
function writeJson(file, obj) { writeFileSync(file, JSON.stringify(obj, null, 2)); }
function appendTrace(bundle, events) {
  const p = join(bundle, 'rb_trace.jsonl');
  for (const e of events) appendFileSync(p, JSON.stringify(e) + '\n');
}
// Production run.log envelope: [ISO8601] LEVEL msg bundle=<name> {json detail}
// (matches logger.mjs formatMessage — the forensics parser reads this format).
function appendRunLog(bundle, lines) {
  const dir = join(bundle, '_logs');
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'run.log');
  for (const l of lines) {
    const label = (l.level || 'info').toUpperCase();
    appendFileSync(p, `[2026-07-03T00:00:00.000Z] ${label} ${l.msg} bundle=${basename(bundle)} ${JSON.stringify(l.detail || {})}\n`);
  }
}
const codes = (findings) => findings.map((f) => f.code);

// Build a fully-consistent slot (tier 1). Each test mutates one signal.
function soundSlot(bundle, { nonce = UUID, slotKey = 'src', spanMs = 5000, lifecycleNonce = UUID, status = 'done' } = {}) {
  const sd = slotPath(bundle);
  writeJson(join(bundle, '_subagents', WAVE, 'dispatch.json'), {
    wave: 'wave-0', waveIndex: 0, created: '2026-07-03T00:00:00.000Z', concurrencyCap: 8,
    slots: [{ key: slotKey, slotIndex: 0, roleAgentKey: 'dpt-source-intake', taskDescription: 'x', receipt_nonce: nonce }],
  });
  writeJson(join(sd, '_beacon.json'), { bundle_dir: bundle, log_cli: '/cli/log-event.mjs', slot_key: slotKey, receipt_nonce: nonce });
  writeJson(join(sd, '_status.json'), { status, updated: '2026-07-03T00:00:00.000Z' });
  writeJson(join(sd, 'result.json'), { slotKey, roleAgentKey: 'dpt-source-intake', status, summary: '', evidenceCount: 1, references: [], confidence: 0.5, notes: [] });
  writeJson(join(sd, '_agent.json'), {
    slotKey, roleAgentKey: 'dpt-source-intake', platform: 'claude-code', runtimeMode: 'project-agent',
    runtimeAgentId: 'agent-1', spawnedAt: '2026-07-03T00:00:00.000Z', completedAt: new Date(Date.UTC(2026, 6, 3, 0, 0, 0, spanMs)).toISOString(),
    status, validationOk: true,
  });
  appendTrace(bundle, [
    { event: 'slot_create', key: slotKey, receiptNonce: nonce },
    { event: 'dispatch_create', slots: [{ key: slotKey, receiptNonce: nonce }] },
    { event: 'agent_runtime_started', key: slotKey, receiptNonce: nonce },
    { event: 'agent_result_ready', key: slotKey, receiptNonce: nonce },
    { event: 'agent_result_received', key: slotKey, receiptNonce: nonce },
    { event: 'result_schema_validated', key: slotKey, receiptNonce: nonce },
  ]);
  appendRunLog(bundle, [
    { level: 'info', msg: 'relay_commit_done', detail: { slotKey } },
    { level: 'info', msg: 'work_done', detail: { kind: 'work_done', slotKey, receipt_nonce: lifecycleNonce } },
  ]);
}

after(() => { for (const d of created) rmSync(d, { recursive: true, force: true }); });

describe('RPG forensics — tier 1 (sound) is silent', () => {
  it('a fully driven, consistent, done slot emits no diagnostics', () => {
    const bundle = makeBundle('sound');
    soundSlot(bundle);
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.deepEqual(codes(findings), []);
  });
});

describe('RPG-007 provenance_nonce_mismatch (sloppy-forgery screen)', () => {
  it('flags a non-UUID nonce', () => {
    const bundle = makeBundle('nonce-nonuuid');
    soundSlot(bundle, { nonce: 'nonce-src-12345' }); // non-UUID everywhere
    // dispatch.json nonce also non-UUID — but RPG-007 fires on non-UUID shape first
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'provenance_nonce_mismatch'), 'non-UUID nonce flagged');
  });

  it('reason distinguishes nonce_malformed (present, non-UUID) from nonce_absent', () => {
    const malformed = makeBundle('nonce-malformed');
    soundSlot(malformed, { nonce: 'nonce-src-12345' });
    const mf = runProvenanceForensics(malformed, 'wave0', 'wave0-complete');
    assert.ok(mf.some((f) => f.code === 'provenance_nonce_mismatch' && /nonce_malformed/.test(f.reason)), 'malformed reason tagged');

    // No beacon, no receipt → no nonce material at all (e.g. pre-instrumentation bundle).
    const absent = makeBundle('nonce-absent');
    soundSlot(absent);
    fs.rmSync(join(absent, '_subagents', WAVE, 'slot_00', '_beacon.json'), { force: true });
    const af = runProvenanceForensics(absent, 'wave0', 'wave0-complete');
    assert.ok(af.some((f) => f.code === 'provenance_nonce_mismatch' && /nonce_absent/.test(f.reason)), 'absent reason tagged, not silenced');
  });

  it('flags a UUID nonce when dispatch.json is absent', () => {
    const bundle = makeBundle('nonce-nodispatch');
    soundSlot(bundle, { nonce: UUID });
    // Remove dispatch.json → absent-dispatch branch

    fs.rmSync(join(bundle, '_subagents', WAVE, 'dispatch.json'), { force: true });
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'provenance_nonce_mismatch' && /absent/.test(f.reason)));
  });
});

describe('RPG-008 relay_commit_missing (tier 4 carve-out: NOT RPG-012)', () => {
  it('diagnostic reason text mentioning relay_commit_done does not suppress RPG-008 on re-run', () => {
    const bundle = makeBundle('staged-not-committed-rerun');
    soundSlot(bundle, { status: 'pending' });
    fs.rmSync(join(bundle, 'rb_trace.jsonl'), { force: true });
    appendTrace(bundle, [
      { event: 'slot_create', key: 'src', receiptNonce: UUID },
      { event: 'dispatch_create', slots: [{ key: 'src', receiptNonce: UUID }] },
    ]);
    fs.rmSync(join(bundle, '_logs', 'run.log'), { force: true });
    runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'relay_commit_missing'), 'RPG-008 still fires after diagnostic run');
  });

  it('a staged, not-committed slot emits ONLY relay_commit_missing', () => {
    const bundle = makeBundle('staged-not-committed');
    // Build a sound slot, then strip commit trace + set status pending.
    soundSlot(bundle, { status: 'pending' });

    fs.rmSync(join(bundle, 'rb_trace.jsonl'), { force: true });
    // Re-add ONLY staging trace (slot_create + dispatch_create).
    appendTrace(bundle, [
      { event: 'slot_create', key: 'src', receiptNonce: UUID },
      { event: 'dispatch_create', slots: [{ key: 'src', receiptNonce: UUID }] },
    ]);
    // Remove the relay_commit_done run.log line (keep nothing).
    fs.rmSync(join(bundle, '_logs', 'run.log'), { force: true });
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'relay_commit_missing'), 'RPG-008 fires');
    assert.ok(!findings.some((f) => f.code === 'provenance_chain_inconsistency'), 'RPG-012 must NOT fire (carve-out)');
    assert.ok(!findings.some((f) => f.code === 'lifecycle_events_missing'), 'RPG-011 must NOT fire (status≠done)');
  });
});

describe('RPG-009 agent_timestamp_span_suspicious (alone insufficient)', () => {
  it('a self-consistent chain with sub-second span emits ONLY RPG-009', () => {
    const bundle = makeBundle('fast-span');
    soundSlot(bundle, { spanMs: 100 }); // < 1s threshold
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'agent_timestamp_span_suspicious'), 'RPG-009 fires');
    assert.ok(!findings.some((f) => f.code === 'provenance_chain_inconsistency'), 'RPG-012 silent (chain consistent)');
    assert.ok(!findings.some((f) => f.code === 'relay_commit_missing'), 'RPG-008 silent (commit proven)');
  });
});

describe('RPG-011 lifecycle_events_missing (tier 3: only RPG-011)', () => {
  it('a done, fully-driven slot without a nonce-carrying lifecycle event emits ONLY RPG-011', () => {
    const bundle = makeBundle('no-lifecycle');
    soundSlot(bundle);
    // Strip the lifecycle (work_done) line but keep relay_commit_done.

    fs.rmSync(join(bundle, '_logs', 'run.log'), { force: true });
    appendRunLog(bundle, [{ level: 'info', msg: 'relay_commit_done', detail: { slotKey: 'src' } }]);
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.deepEqual(codes(findings), ['lifecycle_events_missing']);
  });
});

describe('RPG-012 provenance_chain_inconsistency (cross-artifact contradictions)', () => {
  it('(a) agent_result_received without result_schema_validated', () => {
    const bundle = makeBundle('rpg012a');
    soundSlot(bundle);
    // Remove only result_schema_validated from the trace.

    const tracePath = join(bundle, 'rb_trace.jsonl');
    const lines = fs.readFileSync(tracePath, 'utf-8').split('\n').filter(Boolean)
      .filter((l) => !l.includes('"result_schema_validated"'));
    fs.writeFileSync(tracePath, lines.join('\n') + '\n');
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'provenance_chain_inconsistency' && /result_schema_validated/.test(f.reason)));
  });

  it('(b) agent_result_ready without agent_runtime_started', () => {
    const bundle = makeBundle('rpg012b');
    soundSlot(bundle);
    // Remove only agent_runtime_started from the trace.
    const tracePath = join(bundle, 'rb_trace.jsonl');
    const lines = fs.readFileSync(tracePath, 'utf-8').split('\n').filter(Boolean)
      .filter((l) => !l.includes('"agent_runtime_started"'));
    fs.writeFileSync(tracePath, lines.join('\n') + '\n');
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'provenance_chain_inconsistency' && /agent_runtime_started absent/.test(f.reason)));
  });

  it('(c) nonce mismatch between beacon and trace', () => {
    const bundle = makeBundle('rpg012c');
    soundSlot(bundle, { nonce: UUID }); // beacon + dispatch = UUID
    // Overwrite trace so all trace nonces are UUID2 (conflict with beacon UUID).

    fs.rmSync(join(bundle, 'rb_trace.jsonl'), { force: true });
    appendTrace(bundle, [
      { event: 'slot_create', key: 'src', receiptNonce: UUID2 },
      { event: 'dispatch_create', slots: [{ key: 'src', receiptNonce: UUID2 }] },
      { event: 'agent_runtime_started', key: 'src', receiptNonce: UUID2 },
      { event: 'agent_result_ready', key: 'src', receiptNonce: UUID2 },
      { event: 'agent_result_received', key: 'src', receiptNonce: UUID2 },
      { event: 'result_schema_validated', key: 'src', receiptNonce: UUID2 },
    ]);
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'provenance_chain_inconsistency' && /nonce mismatch/.test(f.reason)));
  });

  it('(c) nonce mismatch between beacon and a lifecycle event', () => {
    const bundle = makeBundle('rpg012c-lifecycle');
    // Trace and dispatch all carry UUID; only the lifecycle event carries UUID2.
    soundSlot(bundle, { nonce: UUID, lifecycleNonce: UUID2 });
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'provenance_chain_inconsistency' && /lifecycle event/.test(f.reason)),
      `lifecycle nonce conflict flagged; findings: ${JSON.stringify(codes(findings))}`);
  });

  it('(d) slot in dispatch.json without staging trace', () => {
    const bundle = makeBundle('rpg012d');
    soundSlot(bundle);
    // Remove staging trace (slot_create + dispatch_create) but keep commit trace.

    const tracePath = join(bundle, 'rb_trace.jsonl');
    const lines = fs.readFileSync(tracePath, 'utf-8').split('\n').filter(Boolean)
      .filter((l) => !l.includes('"slot_create"') && !l.includes('"dispatch_create"'));
    fs.writeFileSync(tracePath, lines.join('\n') + '\n');
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'provenance_chain_inconsistency' && /dispatch\.json but no slot_create/.test(f.reason)));
  });
});

describe('RPG-012 — dispatch record without slot artifacts on disk', () => {
  it('a dispatch.json entry whose slot directory is missing is flagged per slot key', () => {
    const bundle = makeBundle('rpg012-pruned');
    soundSlot(bundle);
    fs.rmSync(join(bundle, '_subagents', WAVE, 'slot_00'), { recursive: true, force: true });
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.some((f) => f.code === 'provenance_chain_inconsistency' && f.slotKey === 'src' && /slot directory is missing/.test(f.reason)));
  });
});

describe('RPG-013 — __wave__ fallback when no slot can be identified', () => {
  it('a corrupt dispatch.json emits a wave-level diagnostic with slotKey __wave__', () => {
    const bundle = makeBundle('rpg013-wave');
    soundSlot(bundle);
    writeFileSync(join(bundle, '_subagents', WAVE, 'dispatch.json'), '{not json');
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    const waveFinding = findings.find((f) => f.slotKey === '__wave__');
    assert.ok(waveFinding, 'wave-level finding present');
    assert.equal(waveFinding.wave, WAVE);
    assert.match(waveFinding.reason, /unparseable/);
  });
});

describe('RPG-013 — every diagnostic carries slotKey and wave', () => {
  it('all findings from a sloppy-faked slot carry slotKey + wave_00', () => {
    const bundle = makeBundle('rpg013');
    soundSlot(bundle, { nonce: 'nonce-src-1' }); // non-UUID → RPG-007; also no commit? commit is present here
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.ok(findings.length > 0);
    for (const f of findings) {
      assert.ok(f.slotKey, 'finding has slotKey');
      assert.equal(f.wave, WAVE);
    }
  });
});

describe('Advisory-only — forensics never throw on an empty/malformed wave', () => {
  it('returns [] when the wave directory does not exist', () => {
    const bundle = makeBundle('no-wave');
    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.deepEqual(findings, []);
  });
});

describe('SDC-002 — relay slot artifacts outside _subagents are invisible', () => {
  it('forensics ignores _fixtures/ artifacts; slot presence reports missing relay slots', () => {
    const bundle = makeBundle('sdc-external');
    const ext = join(bundle, '_fixtures', 't1', 'slot_00');
    mkdirSync(ext, { recursive: true });
    writeJson(join(ext, 'result.json'), {
      slotKey: 'src', roleAgentKey: 'dpt-source-intake', status: 'done',
      summary: '', evidenceCount: 1, references: [], confidence: 0.5, notes: [],
    });
    writeJson(join(ext, '_status.json'), { status: 'done', updated: '2026-07-03T00:00:00.000Z' });
    mkdirSync(join(bundle, '_subagents', WAVE), { recursive: true });

    const findings = runProvenanceForensics(bundle, 'wave0', 'wave0-complete');
    assert.deepEqual(codes(findings), []);
    assert.ok(existsSync(join(ext, 'result.json')));
    assert.ok(!existsSync(join(bundle, '_subagents', WAVE, 'slot_00', 'result.json')));

    const presence = checkSubagentSlotPresence(bundle, { wave: 'wave0' });
    assert.equal(presence.passed, false);
    assert.ok(presence.inspect.some((line) => /No slot directories found/.test(line)));
  });
});
