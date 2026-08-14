// check-reentry.test.mjs
// Tests for check-reentry.mjs CLI — target normalization, exit codes, drift classification
// @impl 8A.6, 8A.7
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { addCanonicalRecoveryIncident } from './recovery-incident-fixture.mjs';
import { createTerminalFinalBundle } from './post-final-recovery-fixture.mjs';
import { claimAndSubmitWorkUnit } from '../../engine/work-unit-test-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-reentry-tmp');
const CLI = join(__dirname, '..', '..', '..', 'DEEP_RESEARCH_HARNESS', 'cli', 'check-reentry.mjs');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function setupBundle(name, statusOverrides = {}, queueOverrides = {}, extraFiles = {}) {
  const dir = join(TMP, `dpt_rb_${name}`);
  mkdirSync(dir, { recursive: true });

  // Default status
  const status = {
    bundle: name,
    current_mode: 'execution',
    state: 'in_progress',
    current_gate: 'wave1_complete',
    next_gate: 'wave2_complete',
    ...statusOverrides,
  };
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));

  // Current canonical plan with topic registry
  writeFileSync(join(dir, 'rb_plan.md'), [
    '---',
    `plan_basename: ${name}`,
    'derived_topic_count: 2',
    'topic_registry_version: "2"',
    `topic_registry:`,
    '  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000',
    '    id: T01',
    '    slug: topic-a',
    '    title: Topic A',
    '    must_answer: ["What matters for topic A?"]',
    '    scope_role: primary',
    '    depends_on_topic_uids: []',
    '  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174001',
    '    id: T02',
    '    slug: topic-b',
    '    title: Topic B',
    '    must_answer: ["What matters for topic B?"]',
    '    scope_role: supporting',
    '    depends_on_topic_uids: []',
    '---',
    '# Plan',
  ].join('\n'));

  // Default queue (empty)
  const queue = {
    schema_version: 'queue.v2',
    queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    active_window: [],
    refill_pool: [],
    delegated_in_flight: {},
    terminal_history: [],
    ...queueOverrides,
  };
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify(queue));

  writeFileSync(join(dir, 'rb_profile.yaml'), 'research_style: quick_factual\n');
  writeFileSync(join(dir, 'rb_trace.jsonl'), '');
  writeFileSync(join(dir, 'BUNDLE_ENTRY.md'), '# Bundle Entry\n');
  writeFileSync(join(dir, 'BUNDLE_MAP.md'), '# Bundle Map\n');
  mkdirSync(join(dir, '_logs'), { recursive: true });
  writeFileSync(join(dir, '_logs', 'run.log'), '');

  // Standard dirs and files for wave1
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  mkdirSync(join(dir, 'reference'), { recursive: true });
  mkdirSync(join(dir, 'artifacts', 'wave0', 'topic-a'), { recursive: true });
  mkdirSync(join(dir, 'artifacts', 'wave0', 'topic-b'), { recursive: true });
  mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
  mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-b'), { recursive: true });
  writeFileSync(join(dir, 'seed_topics', 'topic-a.md'), [
    '---',
    'topic_uid: tp_123e4567-e89b-12d3-a456-426614174000',
    'id: T01',
    'slug: topic-a',
    'title: Topic A',
    'must_answer: ["What matters for topic A?"]',
    'scope_role: primary',
    'depends_on_topic_uids: []',
    '---',
    '# Topic A',
  ].join('\n'));
  writeFileSync(join(dir, 'seed_topics', 'topic-b.md'), [
    '---',
    'topic_uid: tp_123e4567-e89b-12d3-a456-426614174001',
    'id: T02',
    'slug: topic-b',
    'title: Topic B',
    'must_answer: ["What matters for topic B?"]',
    'scope_role: supporting',
    'depends_on_topic_uids: []',
    '---',
    '# Topic B',
  ].join('\n'));
  writeFileSync(join(dir, 'artifacts', 'wave0', 'topic-a', 'source.yaml'), '[]\n');
  writeFileSync(join(dir, 'artifacts', 'wave0', 'topic-b', 'source.yaml'), '[]\n');
  writeFileSync(join(dir, 'artifacts', 'wave1', 'topic-a', 'evidence-summary.md'), '# Evidence\n');
  writeFileSync(join(dir, 'artifacts', 'wave1', 'topic-a', 'question-list.md'), '# Questions\n');
  writeFileSync(join(dir, 'artifacts', 'wave1', 'topic-b', 'evidence-summary.md'), '# Evidence\n');
  writeFileSync(join(dir, 'artifacts', 'wave1', 'topic-b', 'question-list.md'), '# Questions\n');

  // Extra files
  for (const [relPath, content] of Object.entries(extraFiles)) {
    const fp = join(dir, relPath);
    mkdirSync(dirname(fp), { recursive: true });
    writeFileSync(fp, content);
  }

  return dir;
}

function runCli(bundle, at) {
  return spawnSync('node', [CLI, '--bundle', bundle, '--at', at], { encoding: 'utf-8' });
}

function runCliJson(bundle, at) {
  const r = runCli(bundle, at);
  try {
    return { exitCode: r.status, stdout: r.stdout ? JSON.parse(r.stdout) : null, stderr: r.stderr };
  } catch {
    return { exitCode: r.status, stdout: null, stderr: r.stderr, rawStdout: r.stdout };
  }
}

function recursiveSnapshot(root, current = root, output = {}) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolutePath = join(current, entry.name);
    const relativePath = absolutePath.slice(root.length + 1);
    if (entry.isDirectory()) recursiveSnapshot(root, absolutePath, output);
    else if (entry.isFile()) output[relativePath] = createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
    else output[relativePath] = statSync(absolutePath).size;
  }
  return output;
}

function phaseOwnedReference(sourceUrl, backingBody) {
  return [
    '---',
    `source_url: "${sourceUrl}"`,
    'acceptance_status: accepted',
    'source_type: primary',
    'tier: "Tier 2"',
    'evidence_role: deepening_reference',
    'trust_level: practitioner',
    'why_it_matters: "Backed reference."',
    'accessed_at: "2026-07-14"',
    'related_topic_uid: tp_123e4567-e89b-12d3-a456-426614174000',
    '---',
    '',
    '# Topic A Reference',
    '',
    '## Key Facts',
    '- Fact.',
    '',
    '## Core Content Capture',
    backingBody,
    '',
    '## Relevance To This Research',
    'Relevant.',
    '',
    '## Quotable Terms / Concepts',
    '- Term.',
    '',
    '## Risks And Limitations',
    '- Risk.',
  ].join('\n');
}

describe('check-reentry CLI', () => {
  describe('target normalization', () => {
    it('normalizes gate hyphen form', () => {
      const dir = setupBundle('rt-norm-gate-hyphen');
      const res = runCliJson(dir, 'wave1-complete');
      assert.strictEqual(res.exitCode, 0);
      assert.ok(res.stdout);
      assert.strictEqual(res.stdout.normalized_target.kind, 'gate');
      assert.strictEqual(res.stdout.normalized_target.gate_key, 'wave1-complete');
      assert.strictEqual(res.stdout.normalized_target.status_gate, 'wave1_complete');
    });

    it('normalizes gate underscore form', () => {
      const dir = setupBundle('rt-norm-gate-us');
      const res = runCliJson(dir, 'wave1_complete');
      assert.strictEqual(res.exitCode, 0);
      assert.strictEqual(res.stdout.normalized_target.status_gate, 'wave1_complete');
    });

    it('normalizes phase key', () => {
      const dir = setupBundle('rt-norm-phase');
      const res = runCliJson(dir, 'wave1');
      assert.strictEqual(res.exitCode, 0);
      assert.strictEqual(res.stdout.normalized_target.kind, 'phase');
      assert.strictEqual(res.stdout.normalized_target.phase_key, 'wave1');
    });

    it('normalizes phase-name form', () => {
      const dir = setupBundle('rt-norm-phasename');
      const res = runCliJson(dir, 'phase-wave1');
      assert.strictEqual(res.exitCode, 0);
      assert.strictEqual(res.stdout.normalized_target.phase_key, 'wave1');
    });

    it('exits 2 on unknown target', () => {
      const dir = setupBundle('rt-unknown');
      const res = runCliJson(dir, 'nonexistent-gate');
      assert.strictEqual(res.exitCode, 2);
      assert.strictEqual(res.stdout.schema_version, '1.1.0');
      assert.strictEqual(Object.hasOwn(res.stdout, 'recovery'), false);
      assert.ok(res.stdout.inspect.some(i => i.includes('Unknown target')));
    });
  });

  describe('exit codes', () => {
    it('exits 0 when clean (no blockers)', () => {
      const dir = setupBundle('rt-clean');
      const res = runCliJson(dir, 'wave1_complete');
      assert.strictEqual(res.exitCode, 0);
      assert.strictEqual(res.stdout.check.exit_code, 0);
      assert.strictEqual(res.stdout.schema_version, '1.1.0');
      assert.ok(res.stdout.recovery);
      assert.deepStrictEqual(res.stdout.recovery.canonical_topic_findings, []);
    });

    it('exits 1 when blockers are present (status mismatch)', () => {
      const dir = setupBundle('rt-blocker', { current_gate: 'setup_ready' }); // wrong gate for wave1
      const res = runCliJson(dir, 'wave1_complete');
      assert.strictEqual(res.exitCode, 1);
      assert.ok(res.stdout.blockers.length > 0);
    });

    it('exits 2 when bundle not found', () => {
      const res = runCliJson('/nonexistent/path', 'wave1_complete');
      assert.strictEqual(res.exitCode, 2);
    });

    it('fails closed for an old mutable plan without suggesting migration', () => {
      const dir = setupBundle('rt-old-plan');
      writeFileSync(join(dir, 'rb_plan.md'), '---\nplan_basename: old\nderived_topic_count: 1\ntopic_registry:\n  - id: T01\n    slug: topic-a\n    title: Topic A\n---\n# Historical plan\n');
      const before = readFileSync(join(dir, 'rb_plan.md'), 'utf8');
      const res = runCliJson(dir, 'wave1_complete');
      assert.strictEqual(res.exitCode, 1);
      assert.ok(res.stdout.blockers.some((blocker) => blocker.check === 'canonical_topic_state'));
      assert.ok(!JSON.stringify(res.stdout).match(/migrat|adopt|upgrade|convert/i));
      assert.strictEqual(readFileSync(join(dir, 'rb_plan.md'), 'utf8'), before);
    });
  });

  describe('status compatibility audit', () => {
    it('blocks when status current_gate does not match target', () => {
      const dir = setupBundle('rt-status-mismatch', { current_gate: 'wave0_complete' });
      const res = runCliJson(dir, 'wave1_complete');
      assert.ok(res.stdout.blockers.some(b => b.check === 'status_compatibility'));
    });

    it('passes when status matches target', () => {
      const dir = setupBundle('rt-status-match');
      const res = runCliJson(dir, 'wave1_complete');
      assert.strictEqual(res.stdout.blockers.length, 0);
    });

    it('reports populated current_node as the current phase coordinate', () => {
      const dir = setupBundle('rt-current-node-present', { current_node: 'phases/phase-wave1.md' });
      const res = runCliJson(dir, 'wave1_complete');
      assert.strictEqual(res.exitCode, 0);
      assert.strictEqual(res.stdout.runtime_position.current_node, 'phases/phase-wave1.md');
      assert.strictEqual(res.stdout.runtime_position.current_node_status, 'populated');
      assert.strictEqual(res.stdout.runtime_position.current_gate, 'wave1_complete');
      assert.strictEqual(res.stdout.runtime_position.next_gate, 'wave2_complete');
    });

    it('keeps initial current_node null non-blocking and advises diagnostics', () => {
      const dir = setupBundle('rt-current-node-null', { current_node: null });
      const res = runCliJson(dir, 'wave1_complete');
      assert.strictEqual(res.exitCode, 0);
      assert.strictEqual(res.stdout.runtime_position.current_node, null);
      assert.strictEqual(res.stdout.runtime_position.current_node_status, 'null');
      assert.ok(res.stdout.warnings.some(w => w.check === 'status_current_node'));
      assert.ok(res.stdout.advice.some(a => a.includes('next successful enter-phase')));
      assert.ok(res.stdout.advice.some(a => a.includes('BUNDLE_MAP.md')));
      assert.ok(!res.stdout.advice.some(a => a.includes('START_FROM_HERE.md')));
    });

    it('keeps legacy status without current_node readable', () => {
      const dir = setupBundle('rt-current-node-absent');
      const res = runCliJson(dir, 'wave1_complete');
      assert.strictEqual(res.exitCode, 0);
      assert.strictEqual(res.stdout.runtime_position.current_node, null);
      assert.strictEqual(res.stdout.runtime_position.current_node_present, false);
      assert.strictEqual(res.stdout.runtime_position.current_node_status, 'absent');
    });

    it('rejects an incomplete current entry before runtime diagnosis', () => {
      const dir = setupBundle('rt-legacy-start-here', { current_node: null });
      rmSync(join(dir, 'BUNDLE_MAP.md'));
      writeFileSync(join(dir, 'START_FROM_HERE.md'), '# Legacy Map\n');

      const res = runCliJson(dir, 'wave1_complete');

      assert.strictEqual(res.exitCode, 1);
      assert.strictEqual(res.stdout.blockers.length, 1);
      assert.strictEqual(res.stdout.blockers[0].check, 'unsupported_current_entry_contract');
      assert.deepStrictEqual(res.stdout.warnings, []);
      assert.deepStrictEqual(res.stdout.drift, []);
      assert.deepStrictEqual(res.stdout.findings, []);
      assert.equal(Object.hasOwn(res.stdout, 'recovery'), false);
      assert.ok(!res.stdout.advice.some(a => a.includes('START_FROM_HERE.md')));
      assert.ok(!res.stdout.advice.some(a => a.includes('migrat')));
    });
  });

  describe('queue conflict audit', () => {
    it('blocks on prior-phase queued work affecting gate pass conditions', () => {
      const dir = setupBundle('rt-qconflict', { current_gate: 'wave1_complete' }, {
        queue_health: 'ready',
        active_window: [{
          queue_item_id: 'wave0-source-topic-a',
          title: 'Wave0 source intake',
          action: 'Collect shared references',
          targets: { controller: 'main-agent' },
          producer_rule: 'shared_reference_intake',
          priority_class: 'P3_current_gate_gap',
          required_receipts: [],
          done_condition: 'Sources collected',
          verification: { engine: [], agent: [] },
          writes_to: ['reference/00-shared-foo.md', 'artifacts/wave0/topic-a/source.yaml'],
          status_sync: [],
          completion_receipt: 'none',
          failure_route: 'queue_repair',
          status: 'queued',
          preempted_from_slot: 'not_applicable',
          restore_priority: 'normal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          payload: {},
        }],
      });
      const res = runCliJson(dir, 'wave1_complete');
      assert.ok(res.stdout.blockers.some(b => b.check === 'queue_conflict'), 'Should have queue conflict blocker');
    });

    it('warns on prior-phase done/failed work', () => {
      const dir = setupBundle('rt-qdone', { current_gate: 'wave1_complete' }, {
        queue_health: 'ready',
        refill_pool: [{
          queue_item_id: 'wave0-source-topic-a',
          title: 'Wave0 intake',
          action: 'Collect shared references',
          targets: { controller: 'main-agent' },
          producer_rule: 'shared_reference_intake',
          priority_class: 'P3_current_gate_gap',
          required_receipts: [],
          done_condition: 'Done',
          verification: { engine: [], agent: [] },
          writes_to: [],
          status_sync: [],
          completion_receipt: 'none',
          failure_route: 'queue_repair',
          status: 'done',
          preempted_from_slot: 'not_applicable',
          restore_priority: 'normal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          payload: {},
        }],
      });
      const res = runCliJson(dir, 'wave1_complete');
      const conflictWarnings = res.stdout.warnings.filter(w => w.check === 'queue_conflict');
      assert.ok(conflictWarnings.length > 0, 'Should warn about prior-phase done work');
    });
  });

  describe('checkpoint drift audit', () => {
    it('detects control file content drift as blocker', () => {
      const dir = setupBundle('rt-drift');

      // Write a checkpoint with a known hash
      const ckptDir = join(dir, '_checkpoints');
      mkdirSync(ckptDir, { recursive: true });
      const statusContent = readFileSync(join(dir, 'rb_status.json'));
      const statusHash = createHash('sha256').update(statusContent).digest('hex');

      const checkpoint = {
        schema_version: '1.0.0',
        created_at: new Date().toISOString(),
        bundle: 'rt-drift',
        trigger: 'gate_attempt',
        gate_result_ref: { gate: 'wave1-complete', passed: true, currentNodeRef: 'phases/phase-wave1.md', next: 'phases/phase-wave2.md' },
        normalized_target: { status_gate: 'wave1_complete', gate_key: 'wave1-complete', node_ref: 'phases/phase-wave1.md', phase_key: 'wave1' },
        status_snapshot: { current_gate: 'wave1_complete', next_gate: 'wave2_complete', state: 'in_progress' },
        topic_registry_summary: { count: 2, slugs: ['topic-a', 'topic-b'] },
        queue_summary: { queue_health: 'ready', active_count: 0, delegated_in_flight_count: 0, pool_count: 0 },
        artifact_inventory: { seed_topics: ['seed_topics/topic-a.md', 'seed_topics/topic-b.md'], reference: [] },
        cursors: { ledger_lines: 0, trace_lines: 0, log_lines: 0 },
        hashes: {
          'rb_status.json': { sha256: statusHash, size: statusContent.length, mtime: new Date().toISOString() },
        },
      };
      writeFileSync(join(ckptDir, '2026-01-01T00-00-00.000Z-wave1-complete.json'), JSON.stringify(checkpoint, null, 2));

      // Now modify rb_status.json
      writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({
        bundle: 'rt-drift',
        current_mode: 'execution',
        state: 'in_progress',
        current_gate: 'wave2_complete', // changed
        next_gate: 'hitl2_recorded',
      }));

      const res = runCliJson(dir, 'wave1_complete');
      assert.ok(res.stdout.drift.some(d => d.path === 'rb_status.json' && d.severity === 'blocker'),
        'Should detect control file drift as blocker');
    });
  });

  describe('route-pending checkpoints', () => {
    it('never selects a pending setup checkpoint as matching or global drift baseline', () => {
      const dir = setupBundle('pending-setup', { current_gate: 'setup_ready', next_gate: 'seed_topics_ready' });
      mkdirSync(join(dir, '_checkpoints'), { recursive: true });
      writeFileSync(join(dir, '_checkpoints', 'pending.json'), JSON.stringify({
        created_at: '2026-07-22T00:00:00.000Z',
        trigger: 'setup_route_pending',
        route_state: 'pending',
        gate_attempt_id: 'pending-attempt',
        hashes: { 'rb_plan.md': { sha256: createHash('sha256').update(readFileSync(join(dir, 'rb_plan.md'))).digest('hex') } },
      }));
      const result = runCliJson(dir, 'setup_ready');
      const warningText = result.stdout.warnings.map((warning) => warning.message || String(warning));
      assert.ok(warningText.some((warning) => warning.includes('route-pending checkpoint')));
      assert.ok(warningText.some((warning) => warning.includes('No passed checkpoint baseline')));
      assert.equal(result.stdout.checkpoint, null);
    });
  });

  describe('missing artifacts audit', () => {
    it('blocks when required wave1 artifacts are missing', () => {
      const dir = setupBundle('rt-missing-artifact');
      // Remove evidence-summary for topic-b
      rmSync(join(dir, 'artifacts', 'wave1', 'topic-b', 'evidence-summary.md'));

      const res = runCliJson(dir, 'wave1_complete');
      assert.ok(res.stdout.blockers.some(b =>
        b.check === 'required_artifact' && b.detail.path.includes('topic-b') && b.detail.path.includes('evidence-summary')
      ), 'Should block on missing evidence-summary');
    });
  });

  describe('ledger coverage audit', () => {
    it('accepts a submitted-backed Phase-owned reference without a synthetic declaration', () => {
      const dir = setupBundle('rt-phase-owned-reference', {
        current_gate: 'wave0_complete',
        next_gate: 'wave1_complete',
      });
      const sourceUrl = 'https://example.com/research/topic-a-source';
      const cacheTrail = '_cache/wave1/primary/topic-a/s01_source';
      const evidencePath = 'artifacts/wave1/topic-a/evidence-summary.md';
      // The work-unit helper establishes the canonical UID-bound seed via the normal claim path.
      rmSync(join(dir, 'seed_topics', 'topic-a.md'));
      rmSync(join(dir, 'seed_topics', 'topic-b.md'));
      rmSync(join(dir, 'artifacts', 'wave0', 'topic-b'), { recursive: true, force: true });
      rmSync(join(dir, 'artifacts', 'wave1', 'topic-b'), { recursive: true, force: true });
      const planPath = join(dir, 'rb_plan.md');
      const singleTopicPlan = readFileSync(planPath, 'utf8')
        .replace('derived_topic_count: 2', 'derived_topic_count: 1')
        .replace(/  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174001\n    id: T02\n    slug: topic-b\n    title: Topic B\n    must_answer: \["What matters for topic B\?"\]\n    scope_role: supporting\n    depends_on_topic_uids: \[\]\n/, '');
      writeFileSync(planPath, singleTopicPlan);
      const submitted = claimAndSubmitWorkUnit(dir, {
        phase: 'wave1',
        queueItemId: 'topic-a',
        outputs: [],
        cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
        resultOverrides: {
          source_claims: [{
            url: sourceUrl,
            acceptance_status: 'accepted',
            is_new_vs_wave0: true,
            source_ref: evidencePath,
            cache_trail_refs: [cacheTrail],
          }],
          accepted_source_urls: [sourceUrl],
        },
      });
      writeFileSync(join(dir, 'reference', 'topic-a-source.md'), phaseOwnedReference(
        sourceUrl,
        `This projection cites ${evidencePath}, ${cacheTrail}, and _work_units/wave1/${submitted.record.work_id}/ as submitted backing.`,
      ));
      const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf8'));
      status.current_gate = 'wave1_complete';
      status.next_gate = 'wave2_complete';
      writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));

      const res = runCliJson(dir, 'wave1_complete');
      assert.equal(res.exitCode, 0, res.stderr || JSON.stringify(res.stdout?.blockers));
      assert.equal(res.stdout.blockers.some((blocker) => blocker.check === 'ledger_coverage'), false, JSON.stringify(res.stdout.blockers));
    });

    it('blocks an unbacked reference with classifier-derived detail', () => {
      const dir = setupBundle('rt-orphan', {}, {}, {
        'reference/topic-a-orphan.md': '# Orphan\n',
      });

      const res = runCliJson(dir, 'wave1_complete');
      const blocker = res.stdout.blockers.find((entry) => entry.check === 'ledger_coverage');
      assert.ok(blocker, 'Should block an unbacked reference');
      assert.match(blocker.message, /Reference authority is not established/);
      assert.ok(blocker.detail.reason_code);
      assert.ok(blocker.detail.missing_fact);
    });
  });

  describe('canonical recovery summary', () => {
    it('groups a terminal incident into one blocking canonical root and exposes the accepted post-final recovery action without mutation', () => {
      const dir = createTerminalFinalBundle(TMP, 'rt-canonical-incident');
      addCanonicalRecoveryIncident(dir);
      const before = recursiveSnapshot(dir);
      const res = runCliJson(dir, 'readiness_passed');
      const after = recursiveSnapshot(dir);

      assert.strictEqual(res.exitCode, 1, res.stderr || JSON.stringify(res.stdout?.inspect));
      assert.strictEqual(res.stdout.check.passed, false);
      const blockingCanonical = res.stdout.recovery.canonical_topic_findings.filter((finding) => finding.classification === 'blocking');
      assert.strictEqual(blockingCanonical.length, 1);
      assert.strictEqual(blockingCanonical[0].topic_identity, 'topic-x');
      const roots = res.stdout.recovery.root_findings.filter((root) => root.source_kind === 'canonical_topic');
      assert.strictEqual(roots.length, 1);
      assert.strictEqual(roots[0].sanctioned_path_status, 'reachable');
      assert.strictEqual(roots[0].direct_blocker, null);
      assert.strictEqual(roots[0].recommended_action.kind, 'post_final_recovery');
      assert.strictEqual(roots[0].recommended_action.target_ref, 'retained post-final request JSON, then apply');
      assert.strictEqual(res.stdout.post_final_recovery.verdict, 'eligible');
      assert.strictEqual(res.stdout.post_final_recovery.next_action.kind, 'prepare_request');
      assert.deepStrictEqual(after, before);
    });
  });
});
