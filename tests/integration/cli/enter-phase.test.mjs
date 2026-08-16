import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const REPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

describe('enter-phase CLI', { concurrency: false }, () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dpt-enter-phase-'));
    writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({
      bundle: 'test',
      current_mode: 'execution',
      state: 'in_progress',
      current_gate: 'wave0_complete',
      next_gate: 'wave1_complete',
    }, null, 2));
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({
      ts: '2026-01-01T00:00:00.000Z',
      event: 'gate_attempt',
      gate: 'wave0-complete',
      phase: 'wave0',
      passed: true,
      currentNodeRef: 'phases/phase-wave0.md',
      next: 'phases/phase-wave1.md',
    }) + '\n');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function run(args, expectFailure = false) {
    try {
      return execFileSync('node', ['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', ...args], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      if (expectFailure) return err.stdout;
      throw err;
    }
  }

  function writeTrace(events) {
    writeFileSync(join(dir, 'rb_trace.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + '\n');
  }

  function prepareFinalEntry({ currentGate = 'wave2_complete', nextGate = 'readiness_passed' } = {}) {
    mkdirSync(join(dir, 'final'), { recursive: true });
    writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({
      bundle: 'test',
      current_mode: 'execution',
      state: 'in_progress',
      current_gate: currentGate,
      next_gate: nextGate,
      current_node: 'phases/phase-readiness.md',
    }, null, 2));
    writeTrace([
      wave0Pass({
        gate: 'readiness-passed',
        phase: 'readiness',
        currentNodeRef: 'phases/phase-readiness.md',
        next: 'phases/phase-final.md',
      }),
    ]);
  }

  function wave0Pass(overrides = {}) {
    return {
      ts: '2026-01-01T00:00:00.000Z',
      event: 'gate_attempt',
      gate: 'wave0-complete',
      phase: 'wave0',
      passed: true,
      currentNodeRef: 'phases/phase-wave0.md',
      next: 'phases/phase-wave1.md',
      ...overrides,
    };
  }

  function assertLeadingCue(out, expected) {
    const marker = '<!-- DPT_CONTINUATION_CUE_START -->';
    const idx = out.indexOf(marker);
    assert.equal(idx, 0, `expected leading continuation cue marker; stdout head:\n${out.slice(0, 500)}`);
    const end = out.indexOf('<!-- DPT_CONTINUATION_CUE_END -->');
    assert.notEqual(end, -1, 'expected continuation cue end marker');
    const block = out.slice(idx, end + '<!-- DPT_CONTINUATION_CUE_END -->'.length).trim();
    assert.equal(block, [
      '<!-- DPT_CONTINUATION_CUE_START -->',
      `interaction: ${expected.interaction}`,
      `next_action: ${expected.next_action}`,
      `node_ref: ${expected.node_ref}`,
      '<!-- DPT_CONTINUATION_CUE_END -->',
    ].join('\n'));
  }

  it('renders markdown and writes route-bound load_complete plus current_node without changing gate window', () => {
    const out = run(['--bundle', dir, '--node', 'phases/phase-wave1.md']);

    assert.doesNotMatch(out.trimStart(), /^\{/);
    assertLeadingCue(out, {
      interaction: 'do_not_initiate',
      next_action: 'execute_loaded_node',
      node_ref: 'phases/phase-wave1.md',
    });
    assert.ok(out.indexOf('--to wave0_complete') < out.indexOf('## 0. Execution Brief'));
    assert.match(out, /DPT_SHARED_FILE_MANIFEST_START/);
    assert.doesNotMatch(out, /DPT_LOADED_FILE_START/);
    const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf8'));
    assert.equal(status.current_node, 'phases/phase-wave1.md');
    assert.equal(status.current_gate, 'wave0_complete');
    assert.equal(status.next_gate, 'wave1_complete');

    const events = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const load = events.find(e => e.event === 'load_complete' && e.entry === 'phases/phase-wave1.md');
    assert.ok(load, 'expected load_complete for phase-wave1');
    assert.equal(load.handoff_source_gate, 'wave0-complete');
    assert.equal(load.handoff_source_node, 'phases/phase-wave0.md');
    assert.equal(load.handoff_target_node, 'phases/phase-wave1.md');
    assert.equal(load.handoff_source_attempt_index, 0);
  });

  it('keeps the full dependency closure behind explicit --full while retaining the bounded entry first', () => {
    const out = run(['--bundle', dir, '--node', 'phases/phase-wave1.md', '--full']);
    assertLeadingCue(out, {
      interaction: 'do_not_initiate',
      next_action: 'execute_loaded_node',
      node_ref: 'phases/phase-wave1.md',
    });
    assert.ok(out.indexOf('--to wave0_complete') < out.indexOf('## 0. Execution Brief'));
    assert.match(out, /DPT_SHARED_FILE_MANIFEST_START/);
    assert.match(out, /DPT_LOADED_FILE_START phases\/phase-wave1\.md/);
    const manifest = out.slice(out.indexOf('DPT_SHARED_FILE_MANIFEST_START'), out.indexOf('DPT_SHARED_FILE_MANIFEST_END'));
    assert.doesNotMatch(manifest, /phases\/phase-wave1\.md/);
  });

  it('serves standalone help and rejects malformed entry grammar before trace or status mutation', () => {
    const statusPath = join(dir, 'rb_status.json');
    const tracePath = join(dir, 'rb_trace.jsonl');
    const beforeStatus = readFileSync(statusPath, 'utf8');
    const beforeTrace = readFileSync(tracePath, 'utf8');
    const help = spawnSync('node', ['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--help'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.equal(help.status, 0, help.stderr || help.stdout);
    assert.match(help.stdout, /Usage:/);

    const malformed = spawnSync('node', ['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', dir, '--node'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.equal(malformed.status, 2, malformed.stderr || malformed.stdout);
    const output = JSON.parse(malformed.stdout);
    assert.equal(output.error, 'invalid_invocation');
    assert.equal(readFileSync(statusPath, 'utf8'), beforeStatus);
    assert.equal(readFileSync(tracePath, 'utf8'), beforeTrace);
  });

  it('rejects malformed target action-core configuration before loader or entry-witness writes', () => {
    const frameworkRoot = mkdtempSync(join(tmpdir(), 'dpt-enter-phase-framework-'));
    const framework = join(frameworkRoot, 'DEEP_RESEARCH_HARNESS');
    const statusPath = join(dir, 'rb_status.json');
    const tracePath = join(dir, 'rb_trace.jsonl');
    const beforeStatus = readFileSync(statusPath, 'utf8');
    const beforeTrace = readFileSync(tracePath, 'utf8');
    cpSync(join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS'), framework, { recursive: true });
    symlinkSync(join(REPO_ROOT, 'node_modules'), join(frameworkRoot, 'node_modules'), 'dir');
    writeFileSync(join(framework, 'workflows/nodes/phases/phase-wave1.md'), '# Invalid Wave1 Configuration\n');
    try {
      const result = spawnSync('node', [join(framework, 'cli/enter-phase.mjs'), '--bundle', dir, '--node', 'phases/phase-wave1.md'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
      assert.equal(result.status, 2, result.stderr || result.stdout);
      const output = JSON.parse(result.stdout);
      assert.equal(output.error, 'framework_configuration');
      assert.equal(output.reason_code, 'execution_brief_missing');
    } finally {
      rmSync(frameworkRoot, { recursive: true, force: true });
    }
    assert.equal(readFileSync(statusPath, 'utf8'), beforeStatus);
    assert.equal(readFileSync(tracePath, 'utf8'), beforeTrace);
    assert.equal(existsSync(join(dir, 'runtime-receipt.jsonl')), false);
  });

  it('accepts degraded source pass and preserves degraded context on load_complete', () => {
    writeTrace([
      wave0Pass({
        degraded: true,
        degraded_reason: 'fatigue_threshold_reached_with_only_degradation_eligible_quality_rules',
        degraded_rules: ['shared_ref_count_floor'],
      }),
    ]);

    run(['--bundle', dir, '--node', 'phases/phase-wave1.md']);

    const events = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const load = events.find(e => e.event === 'load_complete' && e.entry === 'phases/phase-wave1.md');
    assert.ok(load, 'expected load_complete for degraded source pass');
    assert.equal(load.handoff_source_degraded, true);
    assert.equal(load.handoff_source_degraded_reason, 'fatigue_threshold_reached_with_only_degradation_eligible_quality_rules');
    assert.deepEqual(load.handoff_source_degraded_rules, ['shared_ref_count_floor']);
  });

  it('renders stop:yes target with required-interaction continuation cue', () => {
    writeTrace([
      wave0Pass({
        gate: 'wave2-complete',
        phase: 'wave2',
        currentNodeRef: 'phases/phase-wave2.md',
        next: 'phases/phase-hitl2.md',
      }),
    ]);

    const out = run(['--bundle', dir, '--node', 'phases/phase-hitl2.md']);
    assertLeadingCue(out, {
      interaction: 'required',
      next_action: 'wait_for_user_in_loaded_node',
      node_ref: 'phases/phase-hitl2.md',
    });
  });

  it('renders Final target with terminal delivery continuation cue', () => {
    prepareFinalEntry();

    const out = run(['--bundle', dir, '--node', 'phases/phase-final.md']);
    assertLeadingCue(out, {
      interaction: 'terminal_delivery',
      next_action: 'deliver_final_artifacts',
      node_ref: 'phases/phase-final.md',
    });
    assert.match(out, /current lineage's missing primary report immediately/);
    assert.ok(out.indexOf('--to readiness_passed') < out.indexOf('## 0. Execution Brief'));
    const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf8'));
    assert.equal(status.current_node, 'phases/phase-final.md');
    const events = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.filter((event) => event.event === 'load_complete' && event.entry === 'phases/phase-final.md').length, 1);
  });

  it('rejects a premature canonical Final report before loader, load_complete, or current_node mutation', () => {
    prepareFinalEntry();
    writeFileSync(join(dir, 'final', 'final.md'), '# Premature report\n');
    const statusPath = join(dir, 'rb_status.json');
    const tracePath = join(dir, 'rb_trace.jsonl');
    const beforeStatus = readFileSync(statusPath, 'utf8');
    const beforeTrace = readFileSync(tracePath, 'utf8');

    const out = run(['--bundle', dir, '--node', 'phases/phase-final.md'], true);
    const parsed = JSON.parse(out);
    assert.equal(parsed.status, 'error');
    assert.match(parsed.reason, /first Final entry requires an empty primary inventory/);
    assert.doesNotMatch(out, /DPT_CONTINUATION_CUE|DPT_LOADED_FILE_START/);
    assert.equal(readFileSync(statusPath, 'utf8'), beforeStatus);
    assert.equal(readFileSync(tracePath, 'utf8'), beforeTrace);
  });

  it('keeps an already bound Final entry compatible with a later exact retry', () => {
    prepareFinalEntry();
    run(['--bundle', dir, '--node', 'phases/phase-final.md']);
    writeFileSync(join(dir, 'final', 'final.md'), '# Published after entry\n');

    const out = run(['--bundle', dir, '--node', 'phases/phase-final.md']);
    assertLeadingCue(out, {
      interaction: 'terminal_delivery',
      next_action: 'deliver_final_artifacts',
      node_ref: 'phases/phase-final.md',
    });
    const events = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.filter((event) => event.event === 'load_complete' && event.entry === 'phases/phase-final.md').length, 2);
  });

  it('rejects degraded marker without passed source handoff', () => {
    writeTrace([
      wave0Pass({
        passed: false,
        next: null,
        degraded: true,
        degraded_rules: ['shared_ref_count_floor'],
      }),
    ]);

    const out = run(['--bundle', dir, '--node', 'phases/phase-wave1.md'], true);
    const parsed = JSON.parse(out);
    assert.equal(parsed.status, 'error');
    assert.match(parsed.reason, /no latest passed deterministic/);
    assert.doesNotMatch(out, /DPT_CONTINUATION_CUE/);
  });

  it('fails with JSON and no load_complete for unauthorized target', () => {
    const out = run(['--bundle', dir, '--node', 'phases/phase-final.md'], true);
    const parsed = JSON.parse(out);
    assert.equal(parsed.status, 'error');
    assert.doesNotMatch(out, /DPT_CONTINUATION_CUE/);

    const events = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.some(e => e.event === 'load_complete' && e.entry === 'phases/phase-final.md'), false);
  });

  it('rejects stale historical target after a later pass points elsewhere', () => {
    writeTrace([
      wave0Pass(),
      {
        ts: '2026-01-01T00:00:02.000Z',
        event: 'gate_attempt',
        gate: 'wave1-complete',
        phase: 'wave1',
        passed: true,
        currentNodeRef: 'phases/phase-wave1.md',
        next: 'phases/phase-wave2.md',
      },
    ]);

    const out = run(['--bundle', dir, '--node', 'phases/phase-wave1.md'], true);
    const parsed = JSON.parse(out);
    assert.equal(parsed.status, 'error');
    assert.match(parsed.reason, /not authorized by latest deterministic handoff/);
    assert.doesNotMatch(out, /DPT_CONTINUATION_CUE/);

    const events = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.some(e => e.event === 'load_complete' && e.entry === 'phases/phase-wave1.md'), false);
  });

  it('rejects superseded pass after newer failed attempt for same source gate', () => {
    writeTrace([
      wave0Pass(),
      wave0Pass({
        ts: '2026-01-01T00:00:02.000Z',
        passed: false,
        next: null,
      }),
    ]);

    const out = run(['--bundle', dir, '--node', 'phases/phase-wave1.md'], true);
    const parsed = JSON.parse(out);
    assert.equal(parsed.status, 'error');
    assert.doesNotMatch(out, /DPT_CONTINUATION_CUE/);

    const events = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.some(e => e.event === 'load_complete' && e.entry === 'phases/phase-wave1.md'), false);
  });

  it('fails with JSON instead of Markdown when route-bound load trace cannot be written', () => {
    const tracePath = join(dir, 'rb_trace.jsonl');
    chmodSync(tracePath, 0o444);
    try {
      const out = run(['--bundle', dir, '--node', 'phases/phase-wave1.md'], true);
      const parsed = JSON.parse(out);
      assert.equal(parsed.status, 'error');
      assert.match(parsed.reason, /Failed to load node/);
      assert.doesNotMatch(out, /DPT_LOADED_FILE_START/);
      assert.doesNotMatch(out, /DPT_CONTINUATION_CUE/);
    } finally {
      chmodSync(tracePath, 0o644);
    }

    const events = readFileSync(tracePath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.some(e => e.event === 'load_complete' && e.entry === 'phases/phase-wave1.md'), false);
  });

  it('fails with JSON instead of Markdown when current_node cannot be written after load_complete', () => {
    const statusPath = join(dir, 'rb_status.json');
    chmodSync(statusPath, 0o444);
    try {
      const out = run(['--bundle', dir, '--node', 'phases/phase-wave1.md'], true);
      const parsed = JSON.parse(out);
      assert.equal(parsed.status, 'error');
      assert.match(parsed.reason, /current_node/);
      assert.doesNotMatch(out, /DPT_LOADED_FILE_START/);
      assert.doesNotMatch(out, /DPT_CONTINUATION_CUE/);
    } finally {
      chmodSync(statusPath, 0o644);
    }

    const events = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.some(e => e.event === 'load_complete' && e.entry === 'phases/phase-wave1.md'), true);
  });
});
