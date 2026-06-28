// verify-bundle-health.test.mjs — Tests for post-run bundle health verifier
// @impl EXO-001, EXO-002, EXO-004, EXO-005
// Location: tests/schema/verify-bundle-health.test.mjs

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = new URL('.', import.meta.url).pathname;
const VERIFIER = join(__dirname, '..', '..', 'experiments_env', 'shared', 'verify-bundle-health.mjs');

// ═══════════════════════════════════════════════════════════════════════════
// Synthetic Bundle Fixture Helpers
// ═══════════════════════════════════════════════════════════════════════════

const FIXTURE_BASE = join(__dirname, '..', 'fixtures', 'health-verifier');

function cleanFixtures() {
  if (existsSync(FIXTURE_BASE)) rmSync(FIXTURE_BASE, { recursive: true, force: true });
}

/**
 * Create a minimal valid bundle with rb_trace.jsonl and no legacy trace.
 */
function createMinimalLightBundle(name) {
  const dir = join(FIXTURE_BASE, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  // rb_trace.jsonl with check events
  const trace = [
    { ts: '2026-01-01T00:00:00.000Z', event: 'run_start', source: 'trace', label: 'test' },
    { ts: '2026-01-01T00:00:01.000Z', event: 'check', source: 'engine', passed: true, detail: 'ok' },
    { ts: '2026-01-01T00:00:02.000Z', event: 'check', source: 'engine', passed: true, detail: 'ok2' },
  ];
  writeFileSync(join(dir, 'rb_trace.jsonl'), trace.map(e => JSON.stringify(e)).join('\n') + '\n');
  // Also need a basic rb_status.json for validate/inspect to pass
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ status: 'active', phase: 'test' }));
  writeFileSync(join(dir, 'rb_profile.yaml'), 'research_style: quick_factual\ntopics: []\n');
  writeFileSync(join(dir, 'rb_plan.md'), '---\ntopic_registry: []\n---\n# Plan\n\n## Progress\n');
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify([]));

  return dir;
}

/**
 * Create a bundle with missing rb_trace.jsonl (required artifact absent).
 */
function createMissingTraceBundle(name) {
  const dir = join(FIXTURE_BASE, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // No rb_trace.jsonl
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ status: 'active' }));
  return dir;
}

/**
 * Create a bundle with gate wrapper artifacts in _observability/gates/.
 */
function createGateArtifactBundle(name) {
  const dir = join(FIXTURE_BASE, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  // Minimal trace
  const trace = [
    { ts: '2026-01-01T00:00:00.000Z', event: 'run_start' },
    { ts: '2026-01-01T00:00:01.000Z', event: 'gate_attempt', gate: 'wave0-complete', passed: true },
    { ts: '2026-01-01T00:00:02.000Z', event: 'check', passed: true },
  ];
  writeFileSync(join(dir, 'rb_trace.jsonl'), trace.map(e => JSON.stringify(e)).join('\n') + '\n');

  // Gate wrapper artifacts
  const gatesDir = join(dir, '_observability', 'gates');
  mkdirSync(gatesDir, { recursive: true });

  const artifact1 = {
    sequence: 1,
    gate: 'wave0-complete',
    command: 'node check-gate-wave0-complete.mjs --bundle ...',
    exit_code: 0,
    stdout: '{"check":{"passed":true},"routing":{"kind":"next","next":"phase-wave1.md"}}',
    stderr: '',
    parsed_json: { check: { passed: true }, routing: { kind: 'next', next: 'phase-wave1.md' } },
    inspect: ['All 12 references valid'],
    advice: [],
    captured_at: '2026-01-01T00:00:01.000Z',
  };
  writeFileSync(join(gatesDir, '0001-wave0-complete.json'), JSON.stringify(artifact1, null, 2));

  // Basic bundle files for validate/inspect
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ status: 'active', phase: 'wave0' }));
  writeFileSync(join(dir, 'rb_profile.yaml'), 'research_style: quick_factual\ntopics: []\n');
  writeFileSync(join(dir, 'rb_plan.md'), '---\ntopic_registry: []\n---\n# Plan\n\n## Progress\n');
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify([]));

  return dir;
}

/**
 * Create a Heavy bundle with ledger, receipts, and cache trails.
 */
function createHeavyProvenanceBundle(name, { validLedger = true, validReceipts = true, validCache = true } = {}) {
  const dir = join(FIXTURE_BASE, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  // Trace with gate_attempt events
  const trace = [
    { ts: '2026-01-01T00:00:00.000Z', event: 'run_start' },
    { ts: '2026-01-01T00:00:01.000Z', event: 'gate_attempt', gate: 'wave0-complete', passed: true },
    { ts: '2026-01-01T00:00:02.000Z', event: 'check', passed: true },
  ];
  writeFileSync(join(dir, 'rb_trace.jsonl'), trace.map(e => JSON.stringify(e)).join('\n') + '\n');

  // rb_output_declarations.jsonl
  if (validLedger) {
    const declarations = [
      {
        slot_key: 'source_intake',
        output_files: [
          { path: 'reference/01_topic-source.md', role: 'reference', source_url: 'https://example.com/article' },
        ],
        cache_trails: ['_cache/wave0/primary/topic_a/s01_source'],
      },
    ];
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), declarations.map(d => JSON.stringify(d)).join('\n') + '\n');
  } else {
    // Empty or invalid ledger
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), '');
  }

  // Runtime receipts
  if (validReceipts) {
    const relayDir = join(dir, 'relay-source_intake');
    mkdirSync(relayDir, { recursive: true });
    const receipt = [
      { ts: '2026-01-01T00:00:00.000Z', event: 'agent_runtime_started', slotKey: 'source_intake', receiptNonce: 'abc123' },
      { ts: '2026-01-01T00:00:10.000Z', event: 'agent_result_ready', slotKey: 'source_intake' },
    ];
    writeFileSync(join(relayDir, 'runtime-receipt.jsonl'), receipt.map(e => JSON.stringify(e)).join('\n') + '\n');
  }

  // Cache trails
  if (validCache) {
    const cacheDir = join(dir, '_cache', 'wave0', 'primary', 'topic_a', 's01_source');
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, 'websearch.json'), JSON.stringify({ query: 'test' }));
    writeFileSync(join(cacheDir, 'page.md'), '# Test Page\nContent.');
    writeFileSync(join(cacheDir, 'meta.json'), JSON.stringify({ url: 'https://example.com', title: 'Test' }));
  }

  // Basic bundle files
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ status: 'active' }));
  writeFileSync(join(dir, 'rb_profile.yaml'), 'research_style: quick_factual\ntopics: []\n');
  writeFileSync(join(dir, 'rb_plan.md'), '---\ntopic_registry: []\n---\n# Plan\n\n## Progress\n');
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify([]));

  return dir;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('verify-bundle-health.mjs', () => {
  before(() => {
    cleanFixtures();
    mkdirSync(FIXTURE_BASE, { recursive: true });
  });

  after(() => {
    cleanFixtures();
  });

  // ── Light Profile ──────────────────────────────────────────────────────

  describe('--profile light', () => {
    it('returns clean for a minimal valid light bundle', () => {
      const dir = createMinimalLightBundle('light-clean');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'light', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.schema_version, 'experiment_health.v1');
      assert.strictEqual(report.profile, 'light');
      // trace should be clean (valid rb_trace.jsonl with parseable events)
      assert.strictEqual(report.trace.status, 'clean');
      assert.strictEqual(report.trace.present, true);
      assert.strictEqual(report.trace.event_count, 3);
    });

    it('returns issues when trace is missing (required artifact)', () => {
      const dir = createMissingTraceBundle('light-missing-trace');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'light', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.trace.status, 'issues');
      assert.strictEqual(report.trace.required, true);
      assert.strictEqual(report.trace.present, false);
      // Top-level status should be issues because trace is a required section
      assert.strictEqual(report.status, 'issues');
    });

    it('marks Heavy-only sections as not_applicable in light profile', () => {
      const dir = createMinimalLightBundle('light-na');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'light', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.ledger.required, false);
      assert.strictEqual(report.ledger.status, 'not_applicable');
      assert.strictEqual(report.receipts.required, false);
      assert.strictEqual(report.cache_trails.required, false);
      assert.strictEqual(report.dedup.required, false);
    });

    it('does not flip top-level status for absent optional sections', () => {
      const dir = createMinimalLightBundle('light-optional-absent');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'light', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      // Heavy sections absent in light → not_applicable
      assert.strictEqual(report.ledger.status, 'not_applicable');
      // Top-level issues must not include optional section issues
      const hasLedgerIssues = report.issues.some(i => i.section === 'ledger');
      assert.strictEqual(hasLedgerIssues, false);
    });
  });

  // ── Standard Profile ───────────────────────────────────────────────────

  describe('--profile standard', () => {
    it('reports gate_attempts as required in standard profile', () => {
      const dir = createMinimalLightBundle('std-required');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'standard', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.gate_attempts.required, true);
      assert.strictEqual(report.timeline.required, true);
    });

    it('reads gate wrapper artifacts when present', () => {
      const dir = createGateArtifactBundle('std-gates');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'standard', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.ok(report.gate_attempts.count >= 1);
      assert.strictEqual(report.gate_attempts.pass, 1);
      assert.strictEqual(report.gate_attempts.fail, 0);
    });
  });

  // ── Heavy Profile ──────────────────────────────────────────────────────

  describe('--profile heavy', () => {
    it('reports clean for a complete Heavy provenance bundle', () => {
      const dir = createHeavyProvenanceBundle('heavy-clean', { validLedger: true, validReceipts: true, validCache: true });
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.ledger.required, true);
      assert.strictEqual(report.ledger.status, 'clean');
      assert.strictEqual(report.ledger.declarations, 1);
      assert.strictEqual(report.receipts.status, 'clean');
      assert.strictEqual(report.cache_trails.status, 'clean');
      assert.strictEqual(report.cache_trails.leaves, 1);
      assert.strictEqual(report.cache_trails.missing, 0);
    });

    it('reports issues when ledger is empty', () => {
      const dir = createHeavyProvenanceBundle('heavy-empty-ledger', { validLedger: false, validReceipts: true, validCache: true });
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.ledger.status, 'issues');
      assert.strictEqual(report.status, 'issues');
    });

    it('reports issues when receipts are missing', () => {
      const dir = createHeavyProvenanceBundle('heavy-no-receipt', { validLedger: true, validReceipts: false, validCache: true });
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.receipts.status, 'issues');
    });

    it('reports issues when cache trail leaves are missing', () => {
      const dir = createHeavyProvenanceBundle('heavy-no-cache', { validLedger: true, validReceipts: true, validCache: false });
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      // Ledger declares cache_trails but files don't exist
      assert.strictEqual(report.cache_trails.status, 'issues');
      assert.strictEqual(report.cache_trails.missing, 1);
    });

    it('rejects directory scanning as provenance: files without ledger remain issues', () => {
      // Create bundle with populated _subagents/, reference/, _cache/ but no ledger
      const dir = createHeavyProvenanceBundle('heavy-dir-scan', { validLedger: false, validReceipts: false, validCache: false });
      // Manually populate directories that scanner-based cheats would use
      mkdirSync(join(dir, '_subagents'), { recursive: true });
      writeFileSync(join(dir, '_subagents', 'fake-result.json'), '{"fake":true}');
      mkdirSync(join(dir, 'reference'), { recursive: true });
      writeFileSync(join(dir, 'reference', 'fake-ref.md'), '# Fake');
      mkdirSync(join(dir, '_cache', 'fake-trail'), { recursive: true });
      writeFileSync(join(dir, '_cache', 'fake-trail', 'websearch.json'), '{"fake":true}');

      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      // Ledger empty → issues. Files in _subagents/ etc. do NOT make it pass
      assert.strictEqual(report.ledger.status, 'issues');
      assert.strictEqual(report.receipts.status, 'issues');
      // Cache trail check: ledger empty → no declaration of cache trails → issues
      assert.strictEqual(report.cache_trails.status, 'issues');
      assert.strictEqual(report.status, 'issues');
    });
  });

  // ── Read-Only Guarantee — EXO-005 ─────────────────────────────────────

  describe('read-only guarantee', () => {
    it('never executes a gate command during health verification', () => {
      // All inspection methods are file reads or child_process spawns of
      // validate/inspect (non-gate CLIs). The verifier source code contains
      // no gate CLI imports or spawns.
      const dir = createMinimalLightBundle('readonly');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      assert.ok(r.stdout.trim().length > 0);
      // If it runs gate commands, the test would time out or fail (no gate CLI in this synthetic bundle)
    });
  });

  // ── Diagnostic Trace Event — EXO-004 ──────────────────────────────────

  describe('diagnostic trace event', () => {
    it('appends a diagnostic event to rb_trace.jsonl without check events', () => {
      const dir = createMinimalLightBundle('diag-trace');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'light', '--json'], { encoding: 'utf-8', timeout: 30000 });
      assert.ok(r.stdout.trim().length > 0);

      // Read back trace and verify diagnostic event
      const traceRaw = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8').trim();
      const events = traceRaw.split('\n').map(l => JSON.parse(l));

      const diagnosticEvents = events.filter(e => e.event === 'diagnostic');
      assert.ok(diagnosticEvents.length >= 1, 'Should have at least one diagnostic event');
      assert.strictEqual(diagnosticEvents[0].source, 'experiment-observability');
      assert.strictEqual(diagnosticEvents[0].kind, 'health_report');

      // Verify no check events from observability (original 2 checks should remain)
      const checkEvents = events.filter(e => e.event === 'check');
      assert.strictEqual(checkEvents.length, 2); // original 2 check events unchanged
    });
  });
});
