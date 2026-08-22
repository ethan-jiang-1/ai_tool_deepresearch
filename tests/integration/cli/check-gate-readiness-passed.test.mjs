// gate-readiness-passed integration tests (CDG-004)
import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { setStatusWindow, witnessedHandoffEvents } from './handoff-fixtures.mjs';
import { evaluateCompositionProceed } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/composition-handoff.mjs';
import { restoreBundle, snapshotBundle } from '../../e2e/helpers/deterministic-chain-harness.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs');
const HANDOFF_OPERATION_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs');
const WAVE2_GATE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave2-complete.mjs');
const HITL2_GATE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl2-recorded.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

const CURRENT_AVAILABLE_ACCESS = `research_access:
  status: available
  probed_at: "2026-08-11T00:00:00.000Z"
  sample_observations:
    - { sample_id: gov_cn, source_group: china, outcome: content, retrieval_surface: native }
    - { sample_id: gitee, source_group: china, outcome: failed }
    - { sample_id: xinhuanet, source_group: china, outcome: failed }
    - { sample_id: cnki_catalog, source_group: china, outcome: failed }
    - { sample_id: wikipedia, source_group: overseas, outcome: failed }
    - { sample_id: github, source_group: overseas, outcome: failed }
    - { sample_id: iana, source_group: overseas, outcome: failed }
    - { sample_id: arxiv, source_group: overseas, outcome: failed }
    - { sample_id: rfc_editor, source_group: overseas, outcome: failed }
`;

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_rd_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-readiness.md'], { encoding: 'utf-8', timeout: 10000 });
}

function runRestore(bundlePath) {
  return spawnSync('node', [HANDOFF_OPERATION_CLI, 'restore', '--bundle', bundlePath, '--current-node', 'phases/phase-readiness.md'], { encoding: 'utf-8', timeout: 10000 });
}

function runMigration(bundlePath, inputPath) {
  return spawnSync('node', [HANDOFF_OPERATION_CLI, 'migrate-legacy', '--bundle', bundlePath, '--current-node', 'phases/phase-readiness.md', '--input', inputPath], { encoding: 'utf-8', timeout: 10000 });
}

function assertCompleteHint(hint) {
  assert.ok(hint?.rule_id);
  assert.ok(hint?.repair_kind);
  assert.ok(hint?.missing_fact);
  assert.ok(hint?.write_to);
  assert.ok(hint?.rerun);
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
plan_basename: readiness-test
research_profile: quick_factual
root_must_answer_set:
  - "How to measure alignment?"
${CURRENT_AVAILABLE_ACCESS}human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
  hitl2:
    status: recorded
    answerability_class: ready_substantive
    user_decision: proceed_to_readiness
    final_report_view: executive_brief
    rerun_count: 0
    composition_handoff:
      contract_version: 1
      for_rerun_count: 0
      reader:
        description: "Decision makers"
        familiarity: working
      intended_use: "Choose next actions."
      primary_focus: "Material risks and trade-offs."
      content_priorities:
        foreground: ["Decision implications"]
        compress: ["Background"]
      delivery:
        language: en-US
        length: standard
        evidence_exposure: balanced
        appendix: as_needed
`;

// Expected prior gates (derived from manifest topology: all phases before readiness with gate != null).
// This list matches the current manifest; it is the test's expectation of what readiness should verify.
const PRIOR_GATES = [
  'instantiation-complete', 'hitl1-recorded', 'setup-ready',
  'seed-topics-ready', 'wave0-complete', 'wave1-complete',
  'wave2-complete', 'hitl2-recorded',
];

/** Build a trace with gate_attempt(passed:true) for the given gate names. */
function buildTrace(gateNames, receipt) {
  const events = [];
  for (const gate of gateNames) {
    if (gate === 'hitl2-recorded') {
      const handoff = witnessedHandoffEvents({
        sourceGate: 'hitl2-recorded',
        phase: 'hitl2',
        sourceNode: 'phases/phase-hitl2.md',
        targetNode: 'phases/phase-readiness.md',
        sourceAttemptIndex: events.length,
      });
      handoff[0].composition_handoff_receipt = receipt;
      events.push(...handoff);
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
  const receipt = evaluateCompositionProceed(parseYaml(VALID_PROFILE)).receipt;
  writeFileSync(join(dir, 'rb_trace.jsonl'), buildTrace(PRIOR_GATES, receipt));

  return dir;
}

function migrationInputText({ rerunCount = 0 } = {}) {
  const accepted = parseYaml(VALID_PROFILE).human_decision_checkpoints.hitl2;
  return `${stringifyYaml({
    final_report_view: 'technical_deep_dive',
    custom_slug: null,
    composition_handoff: {
      ...accepted.composition_handoff,
      for_rerun_count: rerunCount,
    },
  }).trimEnd()}\n`;
}

function createLegacyBundle(name) {
  const dir = createBundle(name);
  const tracePath = join(dir, 'rb_trace.jsonl');
  const events = readFileSync(tracePath, 'utf-8').trim().split('\n').map((line) => JSON.parse(line));
  delete events.find((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded').composition_handoff_receipt;
  writeFileSync(tracePath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

  const legacy = parseYaml(VALID_PROFILE);
  legacy.human_decision_checkpoints.hitl2.final_report_view = 'not_started';
  delete legacy.human_decision_checkpoints.hitl2.composition_handoff;
  writeFileSync(join(dir, 'rb_profile.yaml'), `${stringifyYaml(legacy).trimEnd()}\n`);
  return dir;
}

describe('check-gate-readiness-passed', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });
  let sharedBundle;
  let sharedSnapshot;
  before(() => {
    sharedBundle = createBundle('shared');
    sharedSnapshot = snapshotBundle(sharedBundle, dirname(sharedBundle));
  });
  function restoredBundle() {
    restoreBundle(sharedSnapshot, sharedBundle);
    return sharedBundle;
  }

  it('1. happy path: all artifacts + 8 gates + valid YAML + valid JSONL → pass', () => {
    const dir = restoredBundle();
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
    assert.equal(result.status, 0, `Expected exit 0, got ${result.status}`);
    assert.deepEqual(output.hints, []);
  });

  it('2. fails when seed_topics/ is missing', () => {
    const dir = restoredBundle();
    rmSync(join(dir, 'seed_topics'), { recursive: true, force: true });
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('seed_topics')),
      `Expected missing seed_topics fail: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'seed_topics_non_empty');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'agent_action');
    assert.equal(hint.write_to, 'seed_topics');
  });

  it('3. fails when seed_topics/ is empty', () => {
    const dir = restoredBundle();
    rmSync(join(dir, 'seed_topics'), { recursive: true, force: true });
    mkdirSync(join(dir, 'seed_topics'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('empty') || m.includes('seed_topics')),
      `Expected empty seed_topics fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails when reference/_INDEX.md is missing', () => {
    const dir = restoredBundle();
    rmSync(join(dir, 'reference/_INDEX.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('_INDEX.md')),
      `Expected missing index fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails when artifacts/wave2/synthesis.md is missing', () => {
    const dir = restoredBundle();
    rmSync(join(dir, 'artifacts/wave2/synthesis.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('synthesis.md')),
      `Expected missing synthesis fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6. fails when artifacts/hitl2/decision-brief.md is missing', () => {
    const dir = restoredBundle();
    rmSync(join(dir, 'artifacts/hitl2/decision-brief.md'));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('decision-brief.md')),
      `Expected missing brief fail: ${JSON.stringify(output.inspect)}`);
  });

  it('7. fails when fewer than 8 gate_attempt events with passed=true', () => {
    const dir = restoredBundle();

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
    const hint = output.hints.find((candidate) => candidate.rule_id === 'all_prior_gates_passed');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'missing_contract');
    assert.match(hint.write_to, /Prior Gate-attempt lineage boundary/);
  });

  it('8. fails when rb_profile.yaml is unparseable', () => {
    const dir = restoredBundle();

    writeFileSync(join(dir, 'rb_profile.yaml'), 'key: [bad: > yaml:');

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('YAML') || m.includes('parse')),
      `Expected YAML parse fail: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'profile_yaml_parseable');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'agent_action');
    assert.match(hint.write_to, /rb_profile\.yaml$/);
  });

  it('9. fails when rb_trace.jsonl has unparseable lines', () => {
    const dir = restoredBundle();

    const badTrace = buildTrace(PRIOR_GATES) + 'this is not json\n' + 'neither is this\n';
    writeFileSync(join(dir, 'rb_trace.jsonl'), badTrace);

    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('unparseable') || m.includes('JSONL') || m.includes('JSON')),
      `Expected JSONL parse fail: ${JSON.stringify(output.inspect)}`);
  });

  it('10. fails on status drift (wrong next_gate)', () => {
    const dir = restoredBundle();

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

  it('10b. reports one restore command for projection-only drift and refuses it for context drift', () => {
    const projectionDir = restoredBundle();
    writeFileSync(join(projectionDir, 'rb_profile.yaml'), VALID_PROFILE.replace('final_report_view: executive_brief', 'final_report_view: claim_judgment'));
    const projectionResult = runGate(projectionDir);
    const projectionOutput = JSON.parse(projectionResult.stdout);
    assert.equal(projectionResult.status, 1);
    const projectionHint = projectionOutput.hints.find((candidate) => candidate.rule_id === 'composition_handoff_readiness_consistency');
    assertCompleteHint(projectionHint);
    assert.equal(projectionHint.repair_kind, 'engine_operation');
    assert.match(projectionHint.write_to, /operate-composition-handoff\.mjs restore/);

    const contextDir = restoredBundle();
    writeFileSync(join(contextDir, 'rb_profile.yaml'), VALID_PROFILE.replace('How to measure alignment?', 'A changed root question'));
    const contextResult = runGate(contextDir);
    const contextOutput = JSON.parse(contextResult.stdout);
    assert.equal(contextResult.status, 1);
    const contextHint = contextOutput.hints.find((candidate) => candidate.rule_id === 'composition_handoff_readiness_consistency');
    assertCompleteHint(contextHint);
    assert.notEqual(contextHint.repair_kind, 'engine_operation');
    assert.doesNotMatch(contextHint.write_to, /operate-composition-handoff\.mjs restore/);
  });

  it('10c. rejects a missing or malformed receipt on the exact selected HITL2 handoff', () => {
    for (const [name, mutate] of [
      ['missing', (event) => { delete event.composition_handoff_receipt; }],
      ['malformed', (event) => { event.composition_handoff_receipt.projection_sha256 = '0'.repeat(64); }],
    ]) {
      const dir = restoredBundle();
      const events = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf-8').trim().split('\n').map((line) => JSON.parse(line));
      mutate(events.find((event) => event.event === 'gate_attempt' && event.gate === 'hitl2-recorded'));
      writeFileSync(join(dir, 'rb_trace.jsonl'), `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
      const result = runGate(dir);
      const output = JSON.parse(result.stdout);
      assert.equal(result.status, 1, name);
      const hint = output.hints.find((candidate) => candidate.rule_id === 'composition_handoff_readiness_consistency');
      assertCompleteHint(hint);
      assert.equal(hint.repair_kind, 'missing_contract');
    }
  });

  it('10d. restore changes only the accepted projection, audits once, and reruns the same Readiness Gate', () => {
    const dir = restoredBundle();
    const profilePath = join(dir, 'rb_profile.yaml');
    const tracePath = join(dir, 'rb_trace.jsonl');
    const statusPath = join(dir, 'rb_status.json');
    const beforeTrace = readFileSync(tracePath, 'utf-8');
    const beforeStatus = readFileSync(statusPath, 'utf-8');
    writeFileSync(profilePath, VALID_PROFILE.replace('final_report_view: executive_brief', 'final_report_view: claim_judgment'));

    const restored = runRestore(dir);
    const output = JSON.parse(restored.stdout);
    assert.equal(restored.status, 0);
    assert.equal(output.verdict, 'restored');
    assert.match(output.next_action.command, /check-gate-readiness-passed\.mjs/);
    const afterProfile = readFileSync(profilePath, 'utf-8');
    assert.match(afterProfile, /final_report_view: executive_brief/);
    assert.equal(readFileSync(statusPath, 'utf-8'), beforeStatus);
    const afterTrace = readFileSync(tracePath, 'utf-8');
    assert.ok(afterTrace.startsWith(beforeTrace));
    assert.equal(JSON.parse(afterTrace.trim().split('\n').at(-1)).event, 'composition_handoff_restore');

    const readiness = runGate(dir);
    assert.equal(readiness.status, 0, readiness.stdout);
  });

  it('10e. rejected restore leaves profile, trace, status, and artifacts unchanged', () => {
    const dir = restoredBundle();
    const profilePath = join(dir, 'rb_profile.yaml');
    writeFileSync(profilePath, VALID_PROFILE.replace('How to measure alignment?', 'A changed root question'));
    const paths = [profilePath, join(dir, 'rb_trace.jsonl'), join(dir, 'rb_status.json'), join(dir, 'artifacts/wave2/synthesis.md')];
    const before = paths.map((filePath) => readFileSync(filePath, 'utf-8'));
    const rejected = runRestore(dir);
    const output = JSON.parse(rejected.stdout);
    assert.equal(rejected.status, 1);
    assert.equal(output.verdict, 'blocked');
    assert.deepEqual(paths.map((filePath) => readFileSync(filePath, 'utf-8')), before);
  });

  it('10f. migrates one receipt-less predecessor, establishes a new baseline, and detects later context drift', () => {
    const dir = createLegacyBundle(unique('legacy-migration'));
    const profilePath = join(dir, 'rb_profile.yaml');
    const tracePath = join(dir, 'rb_trace.jsonl');
    const inputPath = join(dir, 'accepted-projection.yaml');
    const statusPath = join(dir, 'rb_status.json');
    const synthesisPath = join(dir, 'artifacts/wave2/synthesis.md');
    writeFileSync(inputPath, migrationInputText());
    const beforeStatus = readFileSync(statusPath, 'utf-8');
    const beforeSynthesis = readFileSync(synthesisPath, 'utf-8');

    const migrated = runMigration(dir, inputPath);
    const output = JSON.parse(migrated.stdout);
    assert.equal(migrated.status, 0, migrated.stdout);
    assert.equal(output.verdict, 'migrated');
    assert.match(output.next_action.command, /check-gate-readiness-passed\.mjs/);
    assert.equal(parseYaml(readFileSync(profilePath, 'utf-8')).human_decision_checkpoints.hitl2.final_report_view, 'technical_deep_dive');
    assert.equal(readFileSync(statusPath, 'utf-8'), beforeStatus);
    assert.equal(readFileSync(synthesisPath, 'utf-8'), beforeSynthesis);

    const migration = JSON.parse(readFileSync(tracePath, 'utf-8').trim().split('\n').at(-1));
    assert.equal(migration.event, 'composition_handoff_migration');
    assert.equal(migration.historical_context_equality, 'unproven');
    assert.match(migration.source_attempt_sha256, /^[a-f0-9]{64}$/);
    assert.equal(migration.composition_handoff_receipt.final_report_view, 'technical_deep_dive');

    const committedProfile = readFileSync(profilePath, 'utf-8');
    writeFileSync(profilePath, committedProfile.replace('How to measure alignment?', 'A changed root question'));
    const drift = runGate(dir);
    const driftOutput = JSON.parse(drift.stdout);
    assert.equal(drift.status, 1);
    const driftHint = driftOutput.hints.find((candidate) => candidate.rule_id === 'composition_handoff_readiness_consistency');
    assertCompleteHint(driftHint);
    assert.match(driftOutput.inspect.join('\n'), /profile_context_drift/);

    writeFileSync(profilePath, committedProfile);
    const readiness = runGate(dir);
    assert.equal(readiness.status, 0, readiness.stdout);
  });

  it('10g. rejects v1, stale, repeated, non-proceed, Final, and status-conflicted migrations without mutation', () => {
    const cases = [
      {
        name: 'v1',
        setup: (dir) => createBundle(dir),
        input: migrationInputText(),
      },
      {
        name: 'stale-round',
        setup: (dir) => createLegacyBundle(dir),
        input: migrationInputText({ rerunCount: 1 }),
      },
      {
        name: 'non-proceed',
        setup: (dir) => {
          const bundle = createLegacyBundle(dir);
          const profilePath = join(bundle, 'rb_profile.yaml');
          writeFileSync(profilePath, readFileSync(profilePath, 'utf-8').replace('user_decision: proceed_to_readiness', 'user_decision: repair'));
          return bundle;
        },
        input: migrationInputText(),
      },
      {
        name: 'final-entry',
        setup: (dir) => {
          const bundle = createLegacyBundle(dir);
          const tracePath = join(bundle, 'rb_trace.jsonl');
          writeFileSync(tracePath, `${readFileSync(tracePath, 'utf-8')}${JSON.stringify({ event: 'load_complete', entry: 'phases/phase-final.md' })}\n`);
          return bundle;
        },
        input: migrationInputText(),
      },
      {
        name: 'status-conflict',
        setup: (dir) => {
          const bundle = createLegacyBundle(dir);
          const statusPath = join(bundle, 'rb_status.json');
          const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
          status.next_gate = 'hitl2_recorded';
          writeFileSync(statusPath, JSON.stringify(status));
          return bundle;
        },
        input: migrationInputText(),
      },
    ];
    for (const testCase of cases) {
      const bundle = testCase.setup(unique(`migration-${testCase.name}`));
      const inputPath = join(bundle, 'accepted-projection.yaml');
      writeFileSync(inputPath, testCase.input);
      const paths = [join(bundle, 'rb_profile.yaml'), join(bundle, 'rb_trace.jsonl'), join(bundle, 'rb_status.json'), join(bundle, 'artifacts/wave2/synthesis.md')];
      const before = paths.map((filePath) => readFileSync(filePath, 'utf-8'));
      const rejected = runMigration(bundle, inputPath);
      assert.equal(rejected.status, 1, `${testCase.name}: ${rejected.stdout}`);
      assert.equal(JSON.parse(rejected.stdout).verdict, 'blocked', testCase.name);
      assert.deepEqual(paths.map((filePath) => readFileSync(filePath, 'utf-8')), before, testCase.name);
    }

    const repeated = createLegacyBundle(unique('migration-repeated'));
    const inputPath = join(repeated, 'accepted-projection.yaml');
    writeFileSync(inputPath, migrationInputText());
    assert.equal(runMigration(repeated, inputPath).status, 0);
    const paths = [join(repeated, 'rb_profile.yaml'), join(repeated, 'rb_trace.jsonl'), join(repeated, 'rb_status.json'), join(repeated, 'artifacts/wave2/synthesis.md')];
    const before = paths.map((filePath) => readFileSync(filePath, 'utf-8'));
    const rejected = runMigration(repeated, inputPath);
    assert.equal(rejected.status, 1);
    assert.equal(JSON.parse(rejected.stdout).reason_code, 'migration_already_present');
    assert.deepEqual(paths.map((filePath) => readFileSync(filePath, 'utf-8')), before);
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
