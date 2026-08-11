// gate-setup-ready integration tests (PRG-003, PRG-006, PHS-002, PHS-005)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSuppliedControls } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/plan-hostfile-sections.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs');
const GATE_DEFINITION = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-setup-ready.definition.json');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_int_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-setup.md'], {
    encoding: 'utf-8',
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
}

function assertCompleteHint(hint) {
  assert.ok(hint?.rule_id);
  assert.ok(hint?.repair_kind);
  assert.ok(hint?.missing_fact);
  assert.ok(hint?.write_to);
  assert.ok(hint?.rerun);
}

const VALID_PROFILE = `plan_basename: test
research_profile: quick_factual
root_must_answer_set:
  - "Q"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/setup-ready-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`;

function setupValidBundle(bundleDir) {
  writeFileSync(join(bundleDir, 'rb_profile.yaml'), VALID_PROFILE);
}

describe('check-gate-setup-ready', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  // Helper: make plan body gate-ready by replacing required-fill markers
  function fillPlanBody(bundleDir) {
    const planPath = join(bundleDir, 'rb_plan.md');
    let content = readFileSync(planPath, 'utf-8');
    content = content.replace(/\(待填充[^)]*\)/g, '(filled)');
    content = content.replace(/\(尚无话题[^)]*\)/g, '(filled)');
    writeFileSync(planPath, content);
  }

  it('passes with a valid bundle (HITL1 recorded, status correct, basename consistent)', () => {
    const name = unique('prod');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    // Profile must use the same plan_basename as the bundle logical name
    writeFileSync(join(bundleDir, 'rb_profile.yaml'), VALID_PROFILE.replace('plan_basename: test', `plan_basename: ${name}`));
    // Fill required-fill markers in plan body
    fillPlanBody(bundleDir);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
    assert.deepEqual(output.hints, []);
  });

  it('passes with disposable basename normalization', () => {
    const name = unique('disp');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    setupValidBundle(bundleDir);
    // The new-disposable-bundle.mjs creates dpt_disp_rt_<name>_<hex>
    // and sets plan_basename to <name> in both rb_plan.md and rb_profile.yaml
    // Write profile with correct plan_basename matching the logical name
    writeFileSync(join(bundleDir, 'rb_profile.yaml'), VALID_PROFILE.replace('plan_basename: test', `plan_basename: ${name}`));
    // Fill required-fill markers in plan body
    fillPlanBody(bundleDir);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, true, `Expected disposable normalization pass, got: ${JSON.stringify(output.inspect)}`);
  });

  it('uses the existing required-fill rule for the HITL1 alignment placeholder', () => {
    const name = unique('alignment');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    assert.equal(r.status, 0, r.stderr);
    const bundleDir = track(r.stdout.trim());
    writeFileSync(join(bundleDir, 'rb_profile.yaml'), VALID_PROFILE.replace('plan_basename: test', `plan_basename: ${name}`));

    const planPath = join(bundleDir, 'rb_plan.md');
    const templatePlan = readFileSync(planPath, 'utf-8');
    const alignment = templatePlan.match(/### HITL1 Alignment Snapshot\n(\(待填充[^)]*\))/);
    assert.ok(alignment, 'Expected the new template-owned alignment marker');

    fillPlanBody(bundleDir);
    let plan = readFileSync(planPath, 'utf-8').replace(
      /### HITL1 Alignment Snapshot\n\(filled\)/,
      `### HITL1 Alignment Snapshot\n${alignment[1]}`,
    );
    const opaqueControls = renderSuppliedControls('(待填充 — opaque controls literal)');
    plan = plan.replace(
      /### User Research Controls[\s\S]*?\n\n未提供额外的本轮研究控制；按已确认的问题、范围和研究 profile 执行。/,
      opaqueControls,
    );
    writeFileSync(planPath, plan);

    const blocked = JSON.parse(runGate(bundleDir).stdout);
    assert.equal(blocked.check.passed, false);
    assert.ok(blocked.hints.some((hint) => hint.rule_id === 'plan_body_no_unfilled_marker'));

    const definition = JSON.parse(readFileSync(GATE_DEFINITION, 'utf-8'));
    assert.deepEqual(
      definition.rules.filter((rule) => rule.id.startsWith('plan_body_')).map((rule) => rule.id),
      ['plan_body_non_empty', 'plan_body_no_unfilled_marker'],
    );
    assert.doesNotMatch(readFileSync(GATE_CLI, 'utf-8'), /HITL1 Alignment Snapshot/);
    assert.equal(definition.rules.some((rule) => /alignment|snapshot|quality/i.test(`${rule.id} ${rule.check}`)), false);

    writeFileSync(planPath, readFileSync(planPath, 'utf-8').replace(alignment[1], '已记录：按确认的目标、范围与默认研究路径继续。'));
    const passed = JSON.parse(runGate(bundleDir).stdout);
    assert.equal(passed.check.passed, true, `Expected the same marker rule to pass: ${JSON.stringify(passed.inspect)}`);
    assert.deepEqual(passed.hints, []);
  });

  it('fails when a scaffold directory is missing', () => {
    const name = unique('nofinal');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    setupValidBundle(bundleDir);
    rmSync(join(bundleDir, 'final'), { recursive: true, force: true });

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('final')), `Expected missing final dir fail: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'final_exists');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'engine_operation');
    assert.match(hint.missing_fact, /final/);
    assert.match(hint.write_to, /instantiate-run-bundle\.mjs/);
  });

  it('fails when status has drifted', () => {
    const name = unique('drift');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    setupValidBundle(bundleDir);

    const statusPath = join(bundleDir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.next_gate = 'wave2_complete'; // wrong
    writeFileSync(statusPath, JSON.stringify(status));

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('next_gate')), `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });

  it('fails on basename mismatch', () => {
    const name = unique('mismatch');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    setupValidBundle(bundleDir);
    // Write profile with a different plan_basename
    writeFileSync(join(bundleDir, 'rb_profile.yaml'), VALID_PROFILE.replace('plan_basename: test', 'plan_basename: totally_different'));

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Basename') || m.includes('basename') || m.includes('plan_basename')), `Expected basename mismatch fail: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'basename_consistency');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'missing_contract');
    assert.match(hint.write_to, /bundle-basename binding boundary/);
    assert.doesNotMatch(hint.write_to, /rb_plan\.md#|rb_profile\.yaml#/);
  });

  it('fails on unparseable status', () => {
    const name = unique('badstatus');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    setupValidBundle(bundleDir);
    writeFileSync(join(bundleDir, 'rb_status.json'), 'not json {{{');

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'status_schema_valid');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'missing_contract');
    assert.match(hint.missing_fact, /rb_status\.json/);
    assert.equal(output.hints.some((candidate) => candidate.rule_id === 'status_current_gate'), false);
    assert.equal(output.hints.some((candidate) => candidate.rule_id === 'status_next_gate'), false);
  });

  it('resolves definition-owned checked target for an Agent-repairable plan body', () => {
    const name = unique('emptybody');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeFileSync(join(bundleDir, 'rb_profile.yaml'), VALID_PROFILE.replace('plan_basename: test', `plan_basename: ${name}`));
    const planPath = join(bundleDir, 'rb_plan.md');
    const plan = readFileSync(planPath, 'utf-8');
    const frontmatter = plan.match(/^---\n[\s\S]*?\n---/)?.[0];
    assert.ok(frontmatter, 'Expected plan frontmatter fixture');
    writeFileSync(planPath, `${frontmatter}\n`);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'plan_body_non_empty');

    assert.equal(output.check.passed, false);
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'agent_action');
    assert.equal(hint.write_to, 'rb_plan.md');
    assert.equal(hint.write_to.includes('$checked_target'), false);
  });

  it('turns setup route-trace failure into one authority-integrity outcome without a second audit', () => {
    const name = unique('tracefail');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeFileSync(join(bundleDir, 'rb_profile.yaml'), VALID_PROFILE.replace('plan_basename: test', `plan_basename: ${name}`));
    fillPlanBody(bundleDir);
    const planPath = join(bundleDir, 'rb_plan.md');
    rmSync(join(bundleDir, 'rb_trace.jsonl'));
    mkdirSync(join(bundleDir, 'rb_trace.jsonl'));

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'setup_ready_route_persistence_failed');

    assert.equal(output.check.passed, false);
    assert.equal(output.check.trace_durable, false);
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'missing_contract');
    assert.match(readFileSync(planPath, 'utf-8'), /- \[x\] setup-ready \(/);
    const checkpoints = readdirSync(join(bundleDir, '_checkpoints')).filter((name) => name.endsWith('.json'));
    assert.equal(checkpoints.length, 1);
    const checkpoint = JSON.parse(readFileSync(join(bundleDir, '_checkpoints', checkpoints[0]), 'utf-8'));
    assert.equal(checkpoint.trigger, 'setup_route_pending');
    assert.equal(checkpoint.route_state, 'pending');
  });

  it('appends runtime audit entry to rb_trace.jsonl', () => {
    const name = unique('trace');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    setupValidBundle(bundleDir);

    const traceBefore = existsSync(join(bundleDir, 'rb_trace.jsonl')) ? readFileSync(join(bundleDir, 'rb_trace.jsonl'), 'utf-8').trim().split('\n').filter(Boolean) : [];

    runGate(bundleDir);

    const traceAfter = readFileSync(join(bundleDir, 'rb_trace.jsonl'), 'utf-8').trim().split('\n').filter(Boolean);
    assert.ok(traceAfter.length > traceBefore.length, 'Expected new trace entry after gate run');
    const gateEntry = traceAfter.map(l => JSON.parse(l)).find(e => e.event === 'gate_attempt');
    assert.ok(gateEntry, 'Expected gate_attempt trace entry');
    assert.equal(gateEntry.gate, 'setup-ready');
  });
});
