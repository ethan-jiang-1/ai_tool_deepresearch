// gate-hitl1-recorded integration tests (PRG-002, PRG-005)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs');
const STYLE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_int_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-hitl1.md'], { encoding: 'utf-8', timeout: 10000 });
}

function writeProfileYaml(bundleDir, yaml) {
  writeFileSync(join(bundleDir, 'rb_profile.yaml'), yaml);
}

function advanceHitl1(bundleDir) {
  return spawnSync('node', [join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/advance-status.mjs'), '--bundle', bundleDir, '--to', 'hitl1_recorded'], { encoding: 'utf-8', timeout: 10000 });
}

function applyStyle(bundleDir, style = 'quick_factual') {
  const result = spawnSync('node', [STYLE_CLI, '--bundle', bundleDir, '--style', style], { encoding: 'utf-8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function assertCompleteHint(hint) {
  assert.ok(hint?.rule_id);
  assert.ok(hint?.repair_kind);
  assert.ok(hint?.missing_fact);
  assert.ok(hint?.write_to);
  assert.ok(hint?.rerun);
}

function materializeCanonicalTopic(bundleDir) {
  const planPath = join(bundleDir, 'rb_plan.md');
  const body = readFileSync(planPath, 'utf8').replace(/^---\n[\s\S]*?\n---\n?/, '');
  writeFileSync(planPath, `---\nplan_basename: test\nderived_topic_count: 1\ntopic_registry_version: "2"\ntopic_registry:\n  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000\n    id: "01"\n    slug: 01_topic-a\n    title: Topic A\n    must_answer: ["What is the answer?"]\n    scope_role: primary\n    depends_on_topic_uids: []\n---\n${body}`);
  mkdirSync(join(bundleDir, 'seed_topics'), { recursive: true });
  writeFileSync(join(bundleDir, 'seed_topics/01_topic-a.md'), '---\ntopic_uid: tp_123e4567-e89b-12d3-a456-426614174000\nid: "01"\nslug: 01_topic-a\ntitle: Topic A\nmust_answer: ["What is the answer?"]\nscope_role: primary\ndepends_on_topic_uids: []\n---\n# Topic A\n');
}

const AVAILABLE_ACCESS = `research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/"
  fetch_outcome: success
`;

const PARTIAL_AVAILABLE_ACCESS = `research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/"
  fetch_outcome: success
  source_class_reachability:
    - source_class: encyclopedia
      reachability: unreachable
    - source_class: code_host
      reachability: reachable
    - source_class: general_web
      reachability: not_attempted
  access_boundary:
    location: network_path
    extent: class_scoped
`;

const VALID_PROFILE = `plan_basename: test
research_profile: quick_factual
root_must_answer_set:
  - "What is the answer?"
${AVAILABLE_ACCESS}human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`;

describe('check-gate-hitl1-recorded', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('passes with a complete profile', () => {
    const name = unique('valid');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, VALID_PROFILE);
    materializeCanonicalTopic(bundleDir);
    assert.equal(applyStyle(bundleDir).topic_count, 1);

    // Advance status to hitl1_recorded (gate now checks current_gate/next_gate per PRG-009)
    advanceHitl1(bundleDir);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, true, `Expected pass, got: ${JSON.stringify(output.inspect)}`);
    assert.deepEqual(output.hints, []);
  });

  it('admits a schema-valid partial-reachability envelope without a per-class Gate rule', () => {
    const name = unique('partial-access');
    const created = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(created.stdout.trim());
    writeProfileYaml(bundleDir, VALID_PROFILE.replace(AVAILABLE_ACCESS, PARTIAL_AVAILABLE_ACCESS));
    materializeCanonicalTopic(bundleDir);
    applyStyle(bundleDir);
    advanceHitl1(bundleDir);

    const output = JSON.parse(runGate(bundleDir).stdout);

    assert.equal(output.check.passed, true);
    assert.equal(output.hints.length, 0);
  });

  it('rejects a valid but stale style projection through the existing style writer', () => {
    const name = unique('stale-style');
    const created = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(created.stdout.trim());
    writeProfileYaml(bundleDir, VALID_PROFILE);

    applyStyle(bundleDir);
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const output = JSON.parse(runGate(bundleDir).stdout);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'style_projection_freshness');

    assert.equal(output.check.passed, false);
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'engine_operation');
    assert.match(hint.write_to, /apply-research-style\.mjs/);
    assert.match(hint.rerun, /check-gate-hitl1-recorded/);

    assert.equal(applyStyle(bundleDir).topic_count, 1);
    assert.equal(JSON.parse(runGate(bundleDir).stdout).check.passed, true);
  });

  it('returns one existing-writer root when style parameters are absent or partial', () => {
    for (const [label, profileYaml] of [
      ['absent', VALID_PROFILE],
      ['partial', `${VALID_PROFILE}research_style_params:\n  wave0_shared_ref_total: 1\n`],
    ]) {
      const name = unique(`style-${label}`);
      const created = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
      const bundleDir = track(created.stdout.trim());
      writeProfileYaml(bundleDir, profileYaml);
      materializeCanonicalTopic(bundleDir);
      advanceHitl1(bundleDir);

      const output = JSON.parse(runGate(bundleDir).stdout);
      const hint = output.hints.find((candidate) => candidate.rule_id === 'style_projection_freshness');

      assert.equal(output.check.passed, false, label);
      assertCompleteHint(hint);
      assert.equal(hint.repair_kind, 'engine_operation');
      assert.equal(output.hints.some((candidate) => candidate.rule_id === 'profile_schema_valid'), false, label);
      assert.match(hint.rerun, /check-gate-hitl1-recorded/);
    }
  });

  it('fails when rb_profile.yaml is missing', () => {
    const name = unique('noprofile');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    rmSync(join(bundleDir, 'rb_profile.yaml'));
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('rb_profile.yaml')), `Expected profile missing: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'profile_exists');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'engine_operation');
    assert.match(hint.write_to, /instantiate-run-bundle\.mjs/);
  });

  it('fails on YAML parse error', () => {
    const name = unique('badyaml');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, 'not: valid: yaml: [[');
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'profile_schema_valid');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'missing_contract');
    assert.match(hint.write_to, /ProfileSchema owner contract boundary/);
    assert.equal(output.hints.some((candidate) => candidate.rule_id === 'research_profile_not_default'), false);
  });

  it('fails when research_profile is still not_selected', () => {
    const name = unique('default');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    // Keep default profile (not_selected)
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('not_selected')), `Expected not_selected fail: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'research_profile_not_default');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'user_decision');
    assert.equal(hint.write_to, 'phases/phase-hitl1.md');
  });

  it('fails when root_must_answer_set is empty', () => {
    const name = unique('emptymust');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, `plan_basename: test
research_profile: exploratory_map
root_must_answer_set: []
${AVAILABLE_ACCESS}human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`);
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('root_must_answer_set')), `Expected empty must_answer fail: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'must_answer_non_empty');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'user_decision');
  });

  it('fails when hitl1.status is not recorded', () => {
    const name = unique('nostatus');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, `plan_basename: test
research_profile: claim_verification
root_must_answer_set:
  - "Q"
${AVAILABLE_ACCESS}human_decision_checkpoints:
  hitl1:
    status: pending_user
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`);
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('recorded')), `Expected status not recorded fail: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'hitl1_status_recorded');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'user_decision');
    assert.equal(output.hints.some((candidate) => candidate.rule_id === 'hitl1_recorded_at_non_empty'), false);
    assert.ok(output.check.masked_rule_ids.includes('hitl1_recorded_at_non_empty'));
  });

  it('fails when recorded_at is missing', () => {
    const name = unique('noat');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, `plan_basename: test
research_profile: quick_factual
root_must_answer_set:
  - "Q"
${AVAILABLE_ACCESS}human_decision_checkpoints:
  hitl1:
    status: recorded
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`);
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const result = runGate(bundleDir);
    const output = JSON.parse(result.stdout);

    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('recorded_at')), `Expected recorded_at missing fail: ${JSON.stringify(output.inspect)}`);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'hitl1_recorded_at_non_empty');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'agent_action');
    assert.match(hint.write_to, /rb_profile\.yaml#\/human_decision_checkpoints\/hitl1\/recorded_at$/);
  });

  it('fails legacy profile without research_access and points to the real probe', () => {
    const name = unique('legacy-access');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, VALID_PROFILE.replace(AVAILABLE_ACCESS, ''));
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const output = JSON.parse(runGate(bundleDir).stdout);

    assert.equal(output.check.passed, false);
    assert.equal(output.check.next, null);
    assert.equal(output.continuation, undefined);
    assert.ok(output.inspect.some((message) => message.includes('research_access/status')));
    assert.ok(output.advice.some((message) => message.includes('real HITL1 search/fetch probe')));
    const hint = output.hints.find((candidate) => candidate.rule_id === 'research_access_available');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'agent_action');
    assert.match(hint.write_to, /rb_profile\.yaml#\/research_access$/);
  });

  it('fails unprobed research_access without authorizing Setup', () => {
    const name = unique('unprobed-access');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, VALID_PROFILE.replace(AVAILABLE_ACCESS, 'research_access:\n  status: unprobed\n'));
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const output = JSON.parse(runGate(bundleDir).stdout);

    assert.equal(output.check.passed, false);
    assert.equal(output.check.next, null);
    assert.notEqual(output.routing.kind, 'next');
    const hint = output.hints.find((candidate) => candidate.rule_id === 'research_access_available');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'agent_action');
  });

  it('exposes an unavailable observation without a boundary as explicitly unclassified', () => {
    const name = unique('unavailable-access');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, VALID_PROFILE.replace(AVAILABLE_ACCESS, `research_access:
  status: unavailable
  probed_at: "2026-07-10T00:00:00.000Z"
  fetch_outcome: blocked
  reason: "Fetch surface blocked"
`));
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const output = JSON.parse(runGate(bundleDir).stdout);

    assert.equal(output.check.passed, false);
    assert.equal(output.check.next, null);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'research_access_available');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'agent_action');
    assert.match(hint.missing_fact, /no routeable boundary/);
    assert.match(hint.missing_fact, /Fetch surface blocked/);
    assert.match(hint.write_to, /rb_profile\.yaml#\/research_access$/);
    assert.equal(output.hints.some((candidate) => candidate.rule_id === 'style_projection_freshness'), false);
    assert.ok(output.check.masked_rule_ids.includes('style_projection_freshness'));
  });

  it('projects one direct finding for every recorded unavailable boundary location', () => {
    for (const [location, owner, repairKind] of [
      ['host_surface', 'selected Claude CLI host runtime', 'external_action'],
      ['host_policy', 'selected Claude CLI host policy', 'external_action'],
      ['network_path', 'network environment', 'external_action'],
      ['probe_relay', 'Agent', 'agent_action'],
    ]) {
      const name = unique(`boundary-${location}`);
      const created = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
      const bundleDir = track(created.stdout.trim());
      writeProfileYaml(bundleDir, VALID_PROFILE.replace(AVAILABLE_ACCESS, `research_access:
  status: unavailable
  probed_at: "2026-07-10T00:00:00.000Z"
  fetch_outcome: blocked
  reason: "Direct recorded boundary for fixture."
  access_boundary:
    location: ${location}
    extent: universal
`));
      materializeCanonicalTopic(bundleDir);
      applyStyle(bundleDir);
      advanceHitl1(bundleDir);

      const output = JSON.parse(runGate(bundleDir).stdout);
      const hint = output.hints.find((candidate) => candidate.rule_id === 'research_access_available');

      assert.equal(output.check.passed, false, location);
      assertCompleteHint(hint);
      assert.equal(hint.repair_kind, repairKind, location);
      assert.match(hint.missing_fact, new RegExp(`${location} with universal extent`));
      assert.match(hint.write_to, new RegExp(owner));
      assert.match(hint.write_to, /research_access\/access_boundary/);
      assert.match(hint.rerun, /check-gate-hitl1-recorded/);
    }
  });

  it('fails fake available research_access through ProfileSchema', () => {
    const name = unique('fake-available');
    const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
    const bundleDir = track(r.stdout.trim());
    writeProfileYaml(bundleDir, VALID_PROFILE.replace('https://example.com/', 'ftp://example.com/file'));
    materializeCanonicalTopic(bundleDir);
    advanceHitl1(bundleDir);

    const output = JSON.parse(runGate(bundleDir).stdout);

    assert.equal(output.check.passed, false);
    assert.equal(output.check.next, null);
    assert.ok(output.inspect.some((message) => message.includes('ProfileSchema validation failed')));
    const hint = output.hints.find((candidate) => candidate.rule_id === 'profile_schema_valid');
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'missing_contract');
    assert.equal(output.hints.some((candidate) => candidate.rule_id === 'research_access_available'), false);
  });
});
