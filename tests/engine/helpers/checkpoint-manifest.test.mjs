// checkpoint-manifest.test.mjs
// Tests for writeCheckpointManifest — validates checkpoint schema, selection, and fallback
// @impl 8A.5
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  writeCheckpointManifest,
  writeGateAttempt,
  buildGateResult,
  loadManifest,
  readBundlePlan,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-checkpoint-tmp');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function setupMinimalBundle(name, gate = 'wave1-complete', currentGate = 'wave1_complete') {
  const dir = join(TMP, `dpt_rb_${name}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({
    bundle: name,
    current_mode: 'execution',
    state: 'in_progress',
    current_gate: currentGate,
    next_gate: 'wave2_complete',
  }));
  writeFileSync(join(dir, 'rb_plan.md'), [
    '---',
    `topic_registry:`,
    '  - id: T01',
    '    slug: topic-a',
    '    title: Topic A',
    '  - id: T02',
    '    slug: topic-b',
    '    title: Topic B',
    '---',
    '',
    '# Plan',
  ].join('\n'));
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({
    schema_version: 'queue.v2',
    queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    active_window: [],
    refill_pool: [],
    delegated_in_flight: {},
    terminal_history: [],
  }));
  writeFileSync(join(dir, 'rb_profile.yaml'), 'research_style: quick_factual\n');
  writeFileSync(join(dir, 'rb_trace.jsonl'), '');
  mkdirSync(join(dir, '_logs'), { recursive: true });
  writeFileSync(join(dir, '_logs', 'run.log'), '');
  return dir;
}

describe('checkpoint manifest', () => {
  it('writes checkpoint with all required fields after gate attempt', () => {
    const dir = setupMinimalBundle('ckpt-fields');
    const result = buildGateResult({
      passed: true,
      gate: 'wave1-complete',
      currentNodeRef: 'phases/phase-wave1.md',
      routing: { kind: 'next', next: 'phases/phase-wave2.md' },
      inspect: [],
      advice: [],
    });

    writeCheckpointManifest(dir, result);

    const ckptDir = join(dir, '_checkpoints');
    assert.ok(existsSync(ckptDir), '_checkpoints/ directory should exist');

    const files = readdirSync(ckptDir).filter(f => f.endsWith('.json'));
    assert.ok(files.length >= 1, 'At least one checkpoint file should exist');

    const ckpt = JSON.parse(readFileSync(join(ckptDir, files[0]), 'utf-8'));

    // Required top-level fields
    assert.strictEqual(ckpt.schema_version, '1.0.0');
    assert.ok(ckpt.created_at, 'created_at should be present');
    assert.ok(ckpt.bundle, 'bundle should be present');
    assert.strictEqual(ckpt.trigger, 'gate_attempt');

    // gate_result_ref
    assert.ok(ckpt.gate_result_ref, 'gate_result_ref should be present');
    assert.strictEqual(ckpt.gate_result_ref.gate, 'wave1-complete');
    assert.strictEqual(ckpt.gate_result_ref.passed, true);

    // normalized_target
    assert.ok(ckpt.normalized_target, 'normalized_target should be present');
    assert.strictEqual(ckpt.normalized_target.gate_key, 'wave1-complete');

    // status_snapshot
    assert.ok(ckpt.status_snapshot, 'status_snapshot should be present');
    assert.strictEqual(ckpt.status_snapshot.current_gate, 'wave1_complete');

    // topic_registry_summary
    assert.ok(ckpt.topic_registry_summary, 'topic_registry_summary should be present');
    assert.strictEqual(ckpt.topic_registry_summary.count, 2);
    assert.deepStrictEqual(ckpt.topic_registry_summary.slugs, ['topic-a', 'topic-b']);

    // queue_summary
    assert.ok(ckpt.queue_summary, 'queue_summary should be present');
    assert.strictEqual(ckpt.queue_summary.queue_health, 'ready');

    // artifact_inventory
    assert.ok(ckpt.artifact_inventory, 'artifact_inventory should be present');

    // cursors
    assert.ok(ckpt.cursors, 'cursors should be present');
    assert.ok('ledger_lines' in ckpt.cursors);
    assert.ok('trace_lines' in ckpt.cursors);
    assert.ok('log_lines' in ckpt.cursors);

    // hashes for control files
    assert.ok(ckpt.hashes, 'hashes should be present');
    assert.ok(ckpt.hashes['rb_status.json'], 'rb_status.json hash should be present');
    assert.ok(ckpt.hashes['rb_status.json'].sha256, 'sha256 should be present');
    assert.ok(ckpt.hashes['rb_status.json'].size > 0, 'size should be positive');

    rmSync(dir, { recursive: true, force: true });
  });

  it('writes checkpoint on gate failure too', () => {
    const dir = setupMinimalBundle('ckpt-fail');
    const result = buildGateResult({
      passed: false,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: { kind: 'repair', next: null, detail: 'Test failure' },
      inspect: ['Test failure reason'],
      advice: ['Fix the issue'],
    });

    writeCheckpointManifest(dir, result);

    const ckptDir = join(dir, '_checkpoints');
    const files = readdirSync(ckptDir).filter(f => f.endsWith('.json'));
    const ckpt = JSON.parse(readFileSync(join(ckptDir, files[0]), 'utf-8'));
    assert.strictEqual(ckpt.gate_result_ref.passed, false);
    assert.strictEqual(ckpt.gate_result_ref.gate, 'wave0-complete');

    rmSync(dir, { recursive: true, force: true });
  });

  it('handles missing manifest entry gracefully (normalized_target=null)', () => {
    const dir = setupMinimalBundle('ckpt-unknown');
    const result = buildGateResult({
      passed: true,
      gate: 'unknown-gate',
      currentNodeRef: 'phases/phase-unknown.md',
      routing: { kind: 'terminal', next: null },
      inspect: [],
      advice: [],
    });

    writeCheckpointManifest(dir, result);

    const ckptDir = join(dir, '_checkpoints');
    const files = readdirSync(ckptDir).filter(f => f.endsWith('.json'));
    const ckpt = JSON.parse(readFileSync(join(ckptDir, files[0]), 'utf-8'));
    assert.strictEqual(ckpt.normalized_target, null);

    rmSync(dir, { recursive: true, force: true });
  });

  it('is called from writeGateAttempt (integration)', () => {
    const dir = setupMinimalBundle('ckpt-integration', 'wave0-complete', 'wave0_complete');
    const result = buildGateResult({
      passed: true,
      gate: 'wave0-complete',
      currentNodeRef: 'phases/phase-wave0.md',
      routing: { kind: 'next', next: 'phases/phase-wave1.md' },
      inspect: [],
      advice: [],
    });

    writeGateAttempt(dir, result);

    const ckptDir = join(dir, '_checkpoints');
    assert.ok(existsSync(ckptDir), 'writeGateAttempt should write checkpoint');
    const files = readdirSync(ckptDir).filter(f => f.endsWith('.json'));
    assert.ok(files.length >= 1);

    rmSync(dir, { recursive: true, force: true });
  });

  it('records hashes that detect content changes', () => {
    const dir = setupMinimalBundle('ckpt-hash');
    const result = buildGateResult({
      passed: true,
      gate: 'wave1-complete',
      currentNodeRef: 'phases/phase-wave1.md',
      routing: { kind: 'next', next: 'phases/phase-wave2.md' },
      inspect: [],
      advice: [],
    });

    writeCheckpointManifest(dir, result);

    const ckptDir = join(dir, '_checkpoints');
    const files = readdirSync(ckptDir).filter(f => f.endsWith('.json'));
    const ckpt = JSON.parse(readFileSync(join(ckptDir, files[0]), 'utf-8'));

    const originalHash = ckpt.hashes['rb_status.json'].sha256;

    // Modify status
    writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({
      bundle: 'ckpt-hash',
      current_mode: 'execution',
      state: 'in_progress',
      current_gate: 'wave2_complete', // changed
      next_gate: 'hitl2_recorded',
    }));

    // Write second checkpoint
    const result2 = buildGateResult({
      passed: true,
      gate: 'wave1-complete',
      currentNodeRef: 'phases/phase-wave1.md',
      routing: { kind: 'next', next: 'phases/phase-wave2.md' },
      inspect: [],
      advice: [],
    });
    writeCheckpointManifest(dir, result2);

    const files2 = readdirSync(ckptDir).filter(f => f.endsWith('.json')).sort();
    const ckpt2 = JSON.parse(readFileSync(join(ckptDir, files2[files2.length - 1]), 'utf-8'));

    assert.notStrictEqual(ckpt2.hashes['rb_status.json'].sha256, originalHash,
      'Modified control file should produce different hash');

    rmSync(dir, { recursive: true, force: true });
  });
});
