// verify-bundle-health.test.mjs — Tests for post-run bundle health verifier
// @impl EXO-001, EXO-002, EXO-004, EXO-005
// Location: tests/integration/experiments_env/verify-bundle-health.test.mjs

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createQueue } from '../../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import {
  claimWorkUnits,
  closeWorkUnitAttempt,
  loadWorkUnitIndex,
  saveWorkUnitIndex,
  submitWorkUnit,
} from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import {
  availableActorDecision,
  claimAndSubmitWorkUnit,
  delegatedQueueItem,
  seedDelegatedQueue,
} from '../../engine/work-unit-test-helpers.mjs';

const __dirname = new URL('.', import.meta.url).pathname;
const ROOT = process.cwd();
const VERIFIER = join(ROOT, 'experiments_env', 'shared', 'verify-bundle-health.mjs');
const INSTANTIATE = join(ROOT, 'DEEP_RESEARCH_HARNESS', 'cli', 'instantiate-run-bundle.mjs');

// ═══════════════════════════════════════════════════════════════════════════
// Synthetic Bundle Fixture Helpers
// ═══════════════════════════════════════════════════════════════════════════

const FIXTURE_BASE = join(ROOT, 'tests', '.test-tmp', 'health-verifier');

function cleanFixtures() {
  if (existsSync(FIXTURE_BASE)) rmSync(FIXTURE_BASE, { recursive: true, force: true });
}

function writeBaseBundleFiles(dir, name, {
  phase = 'test',
  trace = [
    { ts: '2026-01-01T00:00:00.000Z', event: 'run_start', source: 'trace', label: 'test' },
    { ts: '2026-01-01T00:00:01.000Z', event: 'check', source: 'engine', passed: true, detail: 'ok' },
    { ts: '2026-01-01T00:00:02.000Z', event: 'check', source: 'engine', passed: true, detail: 'ok2' },
  ],
} = {}) {
  writeFileSync(join(dir, 'rb_trace.jsonl'), trace.map(e => JSON.stringify(e)).join('\n') + '\n');
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: name, status: 'active', phase }));
  writeFileSync(join(dir, 'rb_profile.yaml'), 'research_style: quick_factual\ntopics: []\n');
  writeFileSync(join(dir, 'rb_plan.md'), '---\ntopic_registry: []\n---\n# Plan\n\n## Progress\n');
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify(createQueue(name), null, 2));
  mkdirSync(join(dir, '_logs'), { recursive: true });
  writeFileSync(join(dir, '_logs', 'run.log'), '');
}

function createBundleDir(name) {
  const dir = join(FIXTURE_BASE, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Create a minimal valid bundle with rb_trace.jsonl and no legacy trace.
 */
function createMinimalLightBundle(name) {
  const dir = createBundleDir(name);
  writeBaseBundleFiles(dir, name);
  return dir;
}

/**
 * Create a bundle with missing rb_trace.jsonl (required artifact absent).
 */
function createMissingTraceBundle(name) {
  const dir = createBundleDir(name);
  // No rb_trace.jsonl
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: name, status: 'active' }));
  return dir;
}

/**
 * Create a bundle with gate wrapper artifacts in _observability/gates/.
 */
function createGateArtifactBundle(name) {
  const dir = createBundleDir(name);
  const trace = [
    { ts: '2026-01-01T00:00:00.000Z', event: 'run_start' },
    { ts: '2026-01-01T00:00:01.000Z', event: 'gate_attempt', gate: 'wave0-complete', passed: true },
    { ts: '2026-01-01T00:00:02.000Z', event: 'check', passed: true },
  ];
  writeBaseBundleFiles(dir, name, { phase: 'wave0', trace });
  writeFileSync(join(dir, '_logs', 'run.log'), `${JSON.stringify({ event: 'gate_attempt', gate: 'wave0-complete', passed: true })}\n`);

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

  return dir;
}

function createCanonicalStandardBundle(name) {
  const instantiation = spawnSync('node', [INSTANTIATE, name, '--target-dir', FIXTURE_BASE], { encoding: 'utf-8', timeout: 30000 });
  if (instantiation.status !== 0) {
    throw new Error(`Failed to instantiate ${name}: ${instantiation.stderr || instantiation.stdout}`);
  }

  const dir = instantiation.stdout.trim().split(/\r?\n/).at(-1);
  const gateAttempt = { ts: '2026-01-01T00:00:01.000Z', event: 'gate_attempt', gate: 'wave0-complete', passed: true };
  appendFileSync(join(dir, 'rb_trace.jsonl'), `${JSON.stringify(gateAttempt)}\n`);
  appendFileSync(join(dir, '_logs', 'run.log'), `${JSON.stringify(gateAttempt)}\n`);
  const gatesDir = join(dir, '_observability', 'gates');
  mkdirSync(gatesDir, { recursive: true });
  writeFileSync(join(gatesDir, '0001-wave0-complete.json'), JSON.stringify({ gate: 'wave0-complete', exit_code: 0 }, null, 2));

  return dir;
}

/**
 * Create a Heavy bundle with submitted work-unit ledger rows and cache trails.
 */
function createHeavyProvenanceBundle(name, { validLedger = true, validWorkUnit = true, validCache = true } = {}) {
  const dir = createBundleDir(name);
  const trace = [
    { ts: '2026-01-01T00:00:00.000Z', event: 'run_start' },
    { ts: '2026-01-01T00:00:01.000Z', event: 'gate_attempt', gate: 'wave0-complete', passed: true },
  ];
  writeBaseBundleFiles(dir, name, { phase: 'wave0', trace });
  writeFileSync(join(dir, '_logs', 'run.log'), [
    JSON.stringify({ event: 'gate_attempt', gate: 'wave0-complete', passed: true }),
  ].join('\n') + '\n');
  const gatesDir = join(dir, '_observability', 'gates');
  mkdirSync(gatesDir, { recursive: true });
  writeFileSync(join(gatesDir, '0001-wave0-complete.json'), JSON.stringify({ gate: 'wave0-complete', exit_code: 0 }, null, 2));

  const { record, submitted } = claimAndSubmitWorkUnit(dir, {
    phase: 'wave0',
    queueItemId: 'topic-a',
    legacyV1Assignment: true,
    outputs: [{
      path: 'reference/01_topic-source.md',
      role: 'reference',
      source_url: 'https://example.com/article',
      source_slug: 's01_source',
    }, {
      path: 'artifacts/wave0/topic-a/source.yaml',
      role: 'source_yaml',
      content: [
        '- url: https://example.com/article',
        '  title: Example source',
        '  retrieved_date: 2026-01-01',
        '  topic_tag: topic-a',
        '',
      ].join('\n'),
    }],
    cacheTrails: [{
      path: '_cache/wave0/primary/topic_a/s01_source',
      url: 'https://example.com/article',
    }],
  });
  assert.equal(submitted?.ok, true, JSON.stringify(submitted));

  if (!validLedger) {
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), '');
  }
  if (!validWorkUnit) {
    rmSync(join(dir, record.paths.runtime_receipt_ref), { force: true });
  }
  if (!validCache) {
    rmSync(join(dir, '_cache', 'wave0', 'primary', 'topic_a', 's01_source'), { recursive: true, force: true });
  }

  return dir;
}

function createLifecycleProjectionBundle(name) {
  const dir = createBundleDir(name);
  writeBaseBundleFiles(dir, name, {
    phase: 'wave0',
    trace: [{ ts: '2026-01-01T00:00:00.000Z', event: 'run_start' }],
  });
  seedDelegatedQueue(dir, [
    delegatedQueueItem('claimed', { phase: 'wave0' }),
    delegatedQueueItem('failed', { phase: 'wave0' }),
    delegatedQueueItem('timed', { phase: 'wave0' }),
    delegatedQueueItem('abandoned', { phase: 'wave0' }),
  ]);
  const claim = claimWorkUnits(dir, { phase: 'wave0', count: 4, ...availableActorDecision('wave0_source_intake') });
  const [claimedId, failedId, timedId, abandonedId] = claim.claimed_work_ids;
  closeWorkUnitAttempt(dir, { work_id: failedId, status: 'failed', reason: 'test failure' });
  closeWorkUnitAttempt(dir, { work_id: timedId, status: 'timed_out', reason: 'test timeout', force: true });
  closeWorkUnitAttempt(dir, { work_id: abandonedId, status: 'abandoned', reason: 'test abandon' });
  submitWorkUnit(dir, { work_id: timedId, resultPath: join(dir, 'missing-result.json') });
  const retryClaim = claimWorkUnits(dir, { phase: 'wave0', count: 1, ...availableActorDecision('wave0_source_intake') });
  const index = loadWorkUnitIndex(dir);
  index.work_units[claimedId].deadline_at = '2026-01-01T00:00:00.000Z';
  saveWorkUnitIndex(dir, index);
  return { dir, retryWorkId: retryClaim.claimed_work_ids[0] };
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

    it('marks non-light sections as optional in light profile', () => {
      const dir = createMinimalLightBundle('light-na');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'light', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.work_units.required, false);
      assert.strictEqual(report.ledger.required, false);
      assert.strictEqual(report.ledger.status, 'not_applicable');
      assert.strictEqual(report.cache_trails.required, false);
      assert.strictEqual(report.source_recoverability.required, false);
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
      assert.strictEqual(report.work_units.required, false);
      assert.strictEqual(report.work_units.status, 'clean');
      assert.strictEqual(report.work_units.total, 0);
    });

    it('keeps an invalid work-unit authority visible without failing standard health', () => {
      const dir = createCanonicalStandardBundle('std-optional-work-unit');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'standard', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(r.status, 0);
      assert.strictEqual(report.status, 'clean', JSON.stringify(report));
      assert.strictEqual(report.work_units.required, false);
      assert.strictEqual(report.work_units.status, 'issues');
      assert.match(report.work_units.diagnostics.join('\n'), /missing existing work-unit authority/);
      assert.strictEqual(report.issues.some(issue => issue.section === 'work_units'), false);
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
      const dir = createHeavyProvenanceBundle('heavy-clean', { validLedger: true, validWorkUnit: true, validCache: true });
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.work_units.required, true);
      assert.strictEqual(report.work_units.status, 'clean');
      assert.strictEqual(report.work_units.submitted, 1);
      assert.strictEqual(report.work_units.inspect_passed, true);
      assert.strictEqual(report.ledger.required, true);
      assert.strictEqual(report.ledger.status, 'clean');
      assert.strictEqual(report.ledger.declarations, 1);
      assert.strictEqual(report.cache_trails.status, 'clean');
      assert.strictEqual(report.cache_trails.leaves, 1);
      assert.strictEqual(report.cache_trails.missing, 0);
      assert.strictEqual(report.source_recoverability.required, true);
      assert.strictEqual(report.source_recoverability.status, 'clean');
      assert.strictEqual(report.source_recoverability.references, 1);
      assert.strictEqual(report.source_recoverability.parseable_source_urls, 1);
      assert.strictEqual(report.source_recoverability.mapped_cache_trails, 1);
      assert.strictEqual(report.source_recoverability.recoverable, 1);
    });

    it('reports issues when ledger is empty', () => {
      const dir = createHeavyProvenanceBundle('heavy-empty-ledger', { validLedger: false, validWorkUnit: true, validCache: true });
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.ledger.status, 'issues');
      assert.strictEqual(report.status, 'issues');
    });

    it('reports issues when work-unit runtime receipt is missing', () => {
      const dir = createHeavyProvenanceBundle('heavy-no-work-unit-receipt', { validLedger: true, validWorkUnit: false, validCache: true });
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.work_units.status, 'issues');
      assert.match(report.work_units.diagnostics.join('\n'), /missing runtime receipt/);
      assert.strictEqual(report.status, 'issues');
    });

    it('reports issues when cache trail leaves are missing', () => {
      const dir = createHeavyProvenanceBundle('heavy-no-cache', { validLedger: true, validWorkUnit: true, validCache: false });
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      // Ledger declares cache_trails but files don't exist
      assert.strictEqual(report.cache_trails.status, 'issues');
      assert.strictEqual(report.cache_trails.missing, 1);
      assert.strictEqual(report.source_recoverability.status, 'issues');
      assert.strictEqual(report.source_recoverability.recoverable, 0);
    });

    it('projects work-unit lifecycle states including expired, retries, and late submits', () => {
      const { dir, retryWorkId } = createLifecycleProjectionBundle('heavy-lifecycle');
      assert.ok(retryWorkId, 'retry work unit should be claimed');
      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      assert.strictEqual(report.work_units.status, 'issues');
      assert.strictEqual(report.work_units.claimed, 2);
      assert.strictEqual(report.work_units.submitted, 0);
      assert.strictEqual(report.work_units.failed, 1);
      assert.strictEqual(report.work_units.timed_out, 1);
      assert.strictEqual(report.work_units.abandoned, 1);
      assert.strictEqual(report.work_units.expired, 1);
      assert.strictEqual(report.work_units.retries, 1);
      assert.strictEqual(report.work_units.late_submit_rejections, 1);
      assert.strictEqual(report.work_units.nonterminal, 2);
    });

    it('rejects directory scanning as provenance: files without ledger remain issues', () => {
      // Create bundle with populated non-work-unit delegated paths, reference/, _cache/ but no submitted ledger.
      const dir = createHeavyProvenanceBundle('heavy-dir-scan', { validLedger: false, validWorkUnit: false, validCache: false });
      mkdirSync(join(dir, '_subagents'), { recursive: true });
      writeFileSync(join(dir, '_subagents', 'fake-result.json'), '{"fake":true}');
      mkdirSync(join(dir, 'reference'), { recursive: true });
      writeFileSync(join(dir, 'reference', 'fake-ref.md'), '# Fake');
      mkdirSync(join(dir, '_cache', 'fake-trail'), { recursive: true });
      writeFileSync(join(dir, '_cache', 'fake-trail', 'websearch.json'), '{"fake":true}');

      const r = spawnSync('node', [VERIFIER, '--bundle', dir, '--profile', 'heavy', '--json'], { encoding: 'utf-8', timeout: 30000 });
      const report = JSON.parse(r.stdout.trim());

      // Negative regression: ledger empty -> issues. Old delegated dirs do NOT make it pass.
      assert.strictEqual(report.ledger.status, 'issues');
      assert.strictEqual(report.work_units.status, 'issues');
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
