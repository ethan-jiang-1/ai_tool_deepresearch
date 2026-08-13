// @impl SCO-002, PRP-002, PRP-005, AGQ-009, STM-001
// Simulated HITL/Agent inputs drive real production CLI and Gate boundaries only.
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const ROOT = process.cwd();
const BUNDLES = join(ROOT, 'tests', '.test-bundles');
const NEW_BUNDLE = join(ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const ADVANCE = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/advance-status.mjs');
const TOPIC_STATE = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs');
const STYLE = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs');
const QUEUE = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs');
const ENTER = join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs');
const dirs = [];

function currentAvailableResearchAccess() {
  const samples = [
    ['gov_cn', 'china'], ['gitee', 'china'], ['xinhuanet', 'china'], ['cnki_catalog', 'china'],
    ['wikipedia', 'overseas'], ['github', 'overseas'], ['iana', 'overseas'], ['arxiv', 'overseas'],
    ['rfc_editor', 'overseas'],
  ];
  return {
    status: 'available', probed_at: '2026-08-11T00:00:00.000Z',
    sample_observations: samples.map(([sample_id, source_group], index) => (
      index === 0
        ? { sample_id, source_group, outcome: 'content', retrieval_surface: 'native' }
        : { sample_id, source_group, outcome: 'failed' }
    )),
  };
}

function run(script, args, expected = 0) {
  const result = spawnSync('node', [script, ...args], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, expected, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function runRaw(script, args, expected = 0) {
  const result = spawnSync('node', [script, ...args], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, expected, result.stderr || result.stdout);
  return result;
}

function gate(bundle, name, node) {
  return run(join(ROOT, `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-${name}.mjs`), ['--bundle', bundle, '--current-node', node]);
}

function createBundle() {
  const name = `e2e_pre_wave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const result = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const bundle = result.stdout.trim();
  dirs.push(bundle);
  const statusPath = join(bundle, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf8'));
  status.current_node = 'phases/phase-hitl1.md';
  writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);
  return bundle;
}

describe('pre-Wave readiness', () => {
  after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  it('traverses the simulated HITL1 to seed-Gate chain through production state, queue, and Gate commands', () => {
    const bundle = createBundle();
    const topicInput = join(bundle, 'simulated-hitl1-topic-input.json');
    writeFileSync(topicInput, JSON.stringify({ context: 'hitl1', actions: [{
      action: 'add_topic', title: 'Simulated Topic', slug_stem: 'simulated-topic',
      must_answer: ['What does the deterministic chain prove?'], scope_role: 'primary', depends_on_topic_uids: [],
    }] }));

    const denied = run(TOPIC_STATE, ['apply', '--bundle', bundle, '--input', topicInput], 1);
    assert.equal(denied.reason_code, 'hitl1_not_authorized');
    const synced = run(ADVANCE, ['--bundle', bundle, '--to', 'hitl1_recorded']);
    assert.equal(synced.status, 'ok');
    const applied = run(TOPIC_STATE, ['apply', '--bundle', bundle, '--input', topicInput]);
    assert.equal(applied.verdict, 'committed');
    const planPath = join(bundle, 'rb_plan.md');
    writeFileSync(planPath, readFileSync(planPath, 'utf8')
      .replace(/\(待填充[^)]*\)/g, '(simulated)')
      .replace(/\(尚无话题[^)]*\)/g, '(simulated)'));
    run(STYLE, ['--bundle', bundle, '--style', 'quick_factual']);

    const profilePath = join(bundle, 'rb_profile.yaml');
    const profile = parseYaml(readFileSync(profilePath, 'utf8'));
    profile.root_must_answer_set = ['What does the deterministic chain prove?'];
    profile.research_access = currentAvailableResearchAccess();
    profile.human_decision_checkpoints = {
      ...profile.human_decision_checkpoints,
      hitl1: { status: 'recorded', recorded_at: '2026-07-24T00:00:00.000Z' },
      hitl2: { status: 'not_started', answerability_class: 'not_assessed', user_decision: 'not_started', final_report_view: 'not_started' },
    };
    writeFileSync(profilePath, stringifyYaml(profile));

    const hitlGate = gate(bundle, 'hitl1-recorded', 'phases/phase-hitl1.md');
    assert.equal(hitlGate.check.passed, true, JSON.stringify(hitlGate.inspect));
    runRaw(ENTER, ['--bundle', bundle, '--node', hitlGate.check.next]);
    run(ADVANCE, ['--bundle', bundle, '--to', 'setup_ready']);
    const setupGate = gate(bundle, 'setup-ready', 'phases/phase-setup.md');
    assert.equal(setupGate.check.passed, true, JSON.stringify(setupGate.inspect));
    runRaw(ENTER, ['--bundle', bundle, '--node', setupGate.check.next]);

    const plan = readFileSync(planPath, 'utf8');
    const slug = plan.match(/slug: (01_simulated-topic)/)?.[1];
    assert.equal(slug, '01_simulated-topic');
    const seedPath = `seed_topics/${slug}.md`;
    const queue = JSON.parse(readFileSync(join(bundle, 'rb_queue.json'), 'utf8'));
    queue.active_window = [{ queue_item_id: 'seed-topic-simulated', title: 'Simulated seed completion', targets: { controller: 'main-agent' }, action: 'Simulated Agent completion.', producer_rule: 'seed_topic_materialize', lineage: { topic_slug: slug }, priority_class: 'P3_current_gate_gap', required_receipts: [`file:${seedPath}`], done_condition: 'Declared seed exists.', verification: { engine: ['receipt_check'], agent: [] }, writes_to: [seedPath], status_sync: [], completion_receipt: `file:${seedPath}`, failure_route: 'queue repair', status: 'queued', restore_priority: 'normal', payload: { topic_slug: slug } }];
    queue.refill_pool = []; queue.terminal_history = [];
    writeFileSync(join(bundle, 'rb_queue.json'), `${JSON.stringify(queue, null, 2)}\n`);
    const completion = join(bundle, 'simulated-seed-completion.json');
    writeFileSync(completion, JSON.stringify({ queue_item_id: 'seed-topic-simulated', summary: 'simulated Agent seed completion' }));
    const complete = run(QUEUE, ['complete', bundle, '--result', completion]);
    assert.equal(complete.feedback.passed, true);

    run(ADVANCE, ['--bundle', bundle, '--to', 'setup_ready']);
    const seedGate = gate(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md');
    assert.equal(seedGate.check.passed, true, JSON.stringify(seedGate.inspect));
  });
});
