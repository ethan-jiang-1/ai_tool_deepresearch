// gate-readiness-passed integration tests (CDG-004)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setStatusWindow, witnessedHandoffEvents } from './handoff-fixtures.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs');
const WAVE2_GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs');
const HITL2_GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_rd_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-readiness.md'], { encoding: 'utf-8', timeout: 10000 });
}

function runSpecificGate(cli, bundlePath, currentNode) {
  return spawnSync('node', [cli, '--bundle', bundlePath, '--current-node', currentNode], { encoding: 'utf-8', timeout: 10000 });
}

function createPreflightBundle(name, {
  currentGate,
  nextGate,
  currentNode,
  traceEvents = [],
} = {}) {
  mkdirSync(BUNDLES_DIR, { recursive: true });
  const dir = track(join(BUNDLES_DIR, unique(name)));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({
    bundle: name,
    current_mode: 'execution',
    state: 'in_progress',
    current_gate: currentGate,
    next_gate: nextGate,
    current_node: currentNode,
  }, null, 2));
  writeFileSync(join(dir, 'rb_trace.jsonl'), traceEvents.map((event) => JSON.stringify(event)).join('\n') + (traceEvents.length > 0 ? '\n' : ''));
  return dir;
}

const VALID_PROFILE = `
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
  hitl2:
    status: recorded
    user_decision: proceed_to_readiness
`;

// Expected prior gates (derived from manifest topology: all phases before readiness with gate != null).
// This list matches the current manifest; it is the test's expectation of what readiness should verify.
const PRIOR_GATES = [
  'instantiation-complete', 'hitl1-recorded', 'setup-ready',
  'seed-topics-ready', 'wave0-complete', 'wave1-complete',
  'wave2-complete', 'hitl2-recorded',
];

/** Build a trace with gate_attempt(passed:true) for the given gate names. */
function buildTrace(gateNames) {
  const events = [];
  for (const gate of gateNames) {
    if (gate === 'hitl2-recorded') {
      events.push(...witnessedHandoffEvents({
        sourceGate: 'hitl2-recorded',
        phase: 'hitl2',
        sourceNode: 'phases/phase-hitl2.md',
        targetNode: 'phases/phase-readiness.md',
        sourceAttemptIndex: events.length,
      }));
      continue;
    }

    events.push({ event: 'gate_attempt', gate, passed: true, ts: new Date().toISOString() });
  }
  return events.map(e => JSON.stringify(e)).join('\n') + '\n';
}

/** Create a bundle with readiness-ready state (all artifacts present). */
function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  setStatusWindow(dir, 'hitl2_recorded', 'readiness_passed');

  // Create all required artifacts
  writeFileSync(join(dir, 'seed_topics/dummy.md'), '---\nslug: dummy\ntitle: Dummy\n---\n# Dummy\n');
  writeFileSync(join(dir, 'reference/_INDEX.md'), '# Reference Index\n\n| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| 00-shared-dummy.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |\n');
  mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
  writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), '# Synthesis\n\nCross-topic analysis.\n');
  mkdirSync(join(dir, 'artifacts', 'hitl2'), { recursive: true });
  writeFileSync(join(dir, 'artifacts/hitl2/decision-brief.md'), '# Decision Brief\n\nProceed to readiness.\n');

  // Write profile
  writeFileSync(join(dir, 'rb_profile.yaml'), VALID_PROFILE);

  // Write trace with 8 passed gates
  writeFileSync(join(dir, 'rb_trace.jsonl'), buildTrace(PRIOR_GATES));

  return dir;
}

describe('check-gate-readiness-passed', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. happy path: all artifacts + 8 gates + valid YAML + valid JSONL → pass', () => {
    const dir = createBundle(unique('happy'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
    assert.equal(result.status, 0, `Expected exit 0, got ${result.status}`);
  });

  it('2. fails when seed_topics/ is missing', () => {
    const dir = createBundle(unique('noseed'));
    rmSync(join(dir, 'seed_topics'), { recursive: true, force: true });
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('seed_topics')),
      `Expected missing seed_topics fail: ${JSON.stringify(output.inspect)}`);
  });

  it('3. fails when seed_topics/ is empty', () => {
    const dir = createBundle(unique('emptyseed'));
    rmSync(join(dir, 'seed_topics'), { recursive: true, force: true });
    mkdirSync(join(dir, 'seed_topics'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('empty') || m.includes('seed_topics')),
      `Expected empty seed_topics fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails when reference/_INDEX.md is missing', () => {
    const dir = createBundle(unique('noref'));
    rmSync(join(dir, 'reference/_INDEX.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('_INDEX.md')),
      `Expected missing index fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails when artifacts/wave2/synthesis.md is missing', () => {
    const dir = createBundle(unique('nosynthesis'));
    rmSync(join(dir, 'artifacts/wave2/synthesis.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('synthesis.md')),
      `Expected missing synthesis fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6. fails when artifacts/hitl2/decision-brief.md is missing', () => {
    const dir = createBundle(unique('nobrief'));
    rmSync(join(dir, 'artifacts/hitl2/decision-brief.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('decision-brief.md')),
      `Expected missing brief fail: ${JSON.stringify(output.inspect)}`);
  });

  it('7. fails when fewer than 8 gate_attempt events with passed=true', () => {
    const dir = createBundle(unique('fewgates'));

    // Overwrite trace with only 5 passed gates
    const partialTrace = buildTrace([
      'instantiation-complete',
      'setup-ready',
      'wave0-complete',
      'wave2-complete',
      'hitl2-recorded',
    ]);
    // Add one failed gate_attempt to ensure it's not counted
    const traceWithFail = partialTrace +
      JSON.stringify({ event: 'gate_attempt', gate: 'wave1-complete', passed: false, ts: new Date().toISOString() }) + '\n';
    writeFileSync(join(dir, 'rb_trace.jsonl'), traceWithFail);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('5') || (m.includes('trace_has_events') || m.includes('gate_attempt'))),
      `Expected insufficient gates fail (should report actual count < 8): ${JSON.stringify(output.inspect)}`);
  });

  it('8. fails when rb_profile.yaml is unparseable', () => {
    const dir = createBundle(unique('badyaml'));

    writeFileSync(join(dir, 'rb_profile.yaml'), 'key: [bad: > yaml:');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('YAML') || m.includes('parse')),
      `Expected YAML parse fail: ${JSON.stringify(output.inspect)}`);
  });

  it('9. fails when rb_trace.jsonl has unparseable lines', () => {
    const dir = createBundle(unique('badjsonl'));

    const badTrace = buildTrace(PRIOR_GATES) + 'this is not json\n' + 'neither is this\n';
    writeFileSync(join(dir, 'rb_trace.jsonl'), badTrace);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('unparseable') || m.includes('JSONL') || m.includes('JSON')),
      `Expected JSONL parse fail: ${JSON.stringify(output.inspect)}`);
  });

  it('10. fails on status drift (wrong next_gate)', () => {
    const dir = createBundle(unique('drift'));

    const statusPath = join(dir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.next_gate = 'hitl2_recorded'; // wrong before readiness itself passes
    writeFileSync(statusPath, JSON.stringify(status));

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('next_gate')),
      `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });

  it('11. Wave2 gate rejects artifact-only entry before artifact-level diagnostics', () => {
    const dir = createPreflightBundle('wave2-artifact-only', {
      currentGate: 'wave1_complete',
      nextGate: 'wave2_complete',
      currentNode: 'phases/phase-wave2.md',
      traceEvents: [],
    });
    mkdirSync(join(dir, 'artifacts/wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), '# Synthesis\n');
    writeFileSync(join(dir, 'artifacts/wave2/cross-topic-ledger.md'), '# Ledger\n');
    writeFileSync(join(dir, 'artifacts/wave2/finding-index.yaml'), 'findings: []\n');

    const result = runSpecificGate(WAVE2_GATE_CLI, dir, 'phases/phase-wave2.md');
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.equal(output.check.handoff_preflight, false);
    assert.match(output.inspect.join('\n'), /Missing witnessed handoff into phases\/phase-wave2\.md/);
    assert.doesNotMatch(output.inspect.join('\n'), /synthesis\.md|finding-index\.yaml/);
  });

  it('12. HITL2 and readiness gates reject skipped Wave2 handoff despite status/current_node edits', () => {
    const traceEvents = witnessedHandoffEvents({
      sourceGate: 'wave1-complete',
      phase: 'wave1',
      sourceNode: 'phases/phase-wave1.md',
      targetNode: 'phases/phase-wave2.md',
    });

    const hitl2Dir = createPreflightBundle('hitl2-skipped-wave2', {
      currentGate: 'wave2_complete',
      nextGate: 'hitl2_recorded',
      currentNode: 'phases/phase-hitl2.md',
      traceEvents,
    });
    mkdirSync(join(hitl2Dir, 'artifacts/hitl2'), { recursive: true });
    writeFileSync(join(hitl2Dir, 'artifacts/hitl2/decision-brief.md'), '# Decision\n');
    const hitl2 = runSpecificGate(HITL2_GATE_CLI, hitl2Dir, 'phases/phase-hitl2.md');
    const hitl2Output = JSON.parse(hitl2.stdout);
    assert.equal(hitl2Output.check.passed, false);
    assert.equal(hitl2Output.check.handoff_preflight, false);
    assert.match(hitl2Output.inspect.join('\n'), /Latest deterministic handoff targets phases\/phase-wave2\.md, not current node phases\/phase-hitl2\.md/);

    const readinessDir = createPreflightBundle('readiness-skipped-wave2', {
      currentGate: 'hitl2_recorded',
      nextGate: 'readiness_passed',
      currentNode: 'phases/phase-readiness.md',
      traceEvents,
    });
    writeFileSync(join(readinessDir, 'rb_profile.yaml'), VALID_PROFILE);
    mkdirSync(join(readinessDir, 'final'), { recursive: true });
    writeFileSync(join(readinessDir, 'final/report.md'), '# Draft\n');
    const readiness = runSpecificGate(GATE_CLI, readinessDir, 'phases/phase-readiness.md');
    const readinessOutput = JSON.parse(readiness.stdout);
    assert.equal(readinessOutput.check.passed, false);
    assert.equal(readinessOutput.check.handoff_preflight, false);
    assert.match(readinessOutput.inspect.join('\n'), /Latest deterministic handoff targets phases\/phase-wave2\.md, not current node phases\/phase-readiness\.md/);
  });

  it('13. failed predecessor supersedes older pass, while legal degraded handoff clears preflight', () => {
    const failedDir = createPreflightBundle('wave2-failed-predecessor', {
      currentGate: 'wave1_complete',
      nextGate: 'wave2_complete',
      currentNode: 'phases/phase-wave2.md',
      traceEvents: [
        ...witnessedHandoffEvents({
          sourceGate: 'wave1-complete',
          phase: 'wave1',
          sourceNode: 'phases/phase-wave1.md',
          targetNode: 'phases/phase-wave2.md',
        }),
        {
          ts: '2026-01-01T00:00:02.000Z',
          event: 'gate_attempt',
          gate: 'wave1-complete',
          phase: 'wave1',
          passed: false,
          currentNodeRef: 'phases/phase-wave1.md',
          next: null,
        },
      ],
    });
    const failed = runSpecificGate(WAVE2_GATE_CLI, failedDir, 'phases/phase-wave2.md');
    const failedOutput = JSON.parse(failed.stdout);
    assert.equal(failedOutput.check.passed, false);
    assert.equal(failedOutput.check.handoff_preflight, false);
    assert.match(failedOutput.inspect.join('\n'), /Missing witnessed handoff into phases\/phase-wave2\.md/);

    const degradedEvents = witnessedHandoffEvents({
      sourceGate: 'wave1-complete',
      phase: 'wave1',
      sourceNode: 'phases/phase-wave1.md',
      targetNode: 'phases/phase-wave2.md',
    });
    degradedEvents[0].degraded = true;
    degradedEvents[0].degraded_reason = 'fatigue_threshold_reached_with_only_degradation_eligible_quality_rules';
    degradedEvents[0].degraded_rules = ['topic_depth_floor'];
    degradedEvents[1].handoff_source_degraded = true;
    degradedEvents[1].handoff_source_degraded_reason = degradedEvents[0].degraded_reason;
    degradedEvents[1].handoff_source_degraded_rules = degradedEvents[0].degraded_rules;
    const degradedDir = createPreflightBundle('wave2-degraded-preflight', {
      currentGate: 'wave1_complete',
      nextGate: 'wave2_complete',
      currentNode: 'phases/phase-wave2.md',
      traceEvents: degradedEvents,
    });
    const degraded = runSpecificGate(WAVE2_GATE_CLI, degradedDir, 'phases/phase-wave2.md');
    const degradedOutput = JSON.parse(degraded.stdout);
    assert.equal(degradedOutput.check.passed, false);
    assert.notEqual(degradedOutput.check.handoff_preflight, false);
    assert.doesNotMatch(degradedOutput.inspect.join('\n'), /Missing witnessed handoff|Latest deterministic handoff targets/);
  });
});
