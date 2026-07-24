// @impl AGQ-002, AGQ-009, STM-001
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeGateAttempt } from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import { setStatusWindow } from './handoff-fixtures.mjs';

const REPO_ROOT = process.cwd();
const OPERATE_QUEUE = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/operate-queue.mjs');
const SEED_GATE = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs');
const ENTER_PHASE = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/enter-phase.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];
const TOPIC = {
  topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174000',
  id: '01',
  slug: '01_topic-a',
  title: 'Topic A',
  must_answer: ['What must be answered?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
};

function unique(prefix) {
  return `rt_seed_authoring_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function runQueue(bundle, resultPath) {
  return spawnSync('node', [OPERATE_QUEUE, 'complete', bundle, '--result', resultPath], {
    encoding: 'utf-8',
    timeout: 10000,
  });
}

function createBundle(prefix) {
  const created = spawnSync('node', [NEW_BUNDLE, unique(prefix), '--force', '--target-dir', BUNDLES_DIR], {
    encoding: 'utf-8',
    timeout: 10000,
  });
  assert.equal(created.status, 0, created.stderr || created.stdout);
  const bundle = created.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
  createdDirs.push(bundle);
  const planPath = join(bundle, 'rb_plan.md');
  const body = readFileSync(planPath, 'utf8').replace(/^---\n[\s\S]*?\n---\n?/, '');
  writeFileSync(planPath, `---\nplan_basename: test\nderived_topic_count: 1\ntopic_registry_version: "2"\ntopic_registry:\n  - topic_uid: ${TOPIC.topic_uid}\n    id: "${TOPIC.id}"\n    slug: ${TOPIC.slug}\n    title: ${TOPIC.title}\n    must_answer: ["${TOPIC.must_answer[0]}"]\n    scope_role: ${TOPIC.scope_role}\n    depends_on_topic_uids: []\n---\n${body}`);
  mkdirSync(join(bundle, 'seed_topics'), { recursive: true });
  return bundle;
}

function writeSeed(bundle, raw) {
  writeFileSync(join(bundle, 'seed_topics', `${TOPIC.slug}.md`), raw);
}

function seedCard(overrides = {}) {
  const path = `seed_topics/${TOPIC.slug}.md`;
  return {
    queue_item_id: 'seed-topic-01-topic-a',
    title: 'Materialize Topic A',
    targets: { controller: 'main-agent' },
    action: 'Write the declared canonical seed.',
    producer_rule: 'seed_topic_materialize',
    lineage: { topic_slug: TOPIC.slug, phase: 'seed-topics' },
    priority_class: 'P3_current_gate_gap',
    required_receipts: [`file:${path}`],
    done_condition: 'Declared seed exists.',
    verification: { engine: ['receipt_check'], agent: [] },
    writes_to: [path],
    status_sync: [],
    completion_receipt: `file:${path}`,
    failure_route: 'queue repair',
    status: 'queued',
    restore_priority: 'normal',
    payload: { topic_slug: TOPIC.slug, topic_title: TOPIC.title },
    ...overrides,
  };
}

function writeQueue(bundle, item) {
  const queuePath = join(bundle, 'rb_queue.json');
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
  delete queue.bundle_name;
  queue.active_window = [item];
  queue.refill_pool = [];
  queue.delegated_in_flight = {};
  queue.terminal_history = [];
  queue.queue_health = 'thin';
  queue.stop_authorization_state = 'unauthorized_continue_required';
  writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  return queuePath;
}

function writeResult(bundle) {
  const resultPath = join(bundle, 'complete.json');
  writeFileSync(resultPath, JSON.stringify({ queue_item_id: 'seed-topic-01-topic-a', summary: 'seed authored' }));
  return resultPath;
}

function traceEvents(bundle) {
  const tracePath = join(bundle, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  return readFileSync(tracePath, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line).event);
}

function canonicalSeed() {
  return `---\ntopic_uid: ${TOPIC.topic_uid}\nid: "${TOPIC.id}"\nslug: ${TOPIC.slug}\ntitle: ${TOPIC.title}\nmust_answer: ["${TOPIC.must_answer[0]}"]\nscope_role: ${TOPIC.scope_role}\ndepends_on_topic_uids: []\n---\n`;
}

function enterSeedTopics(bundle) {
  setStatusWindow(bundle, 'setup_ready', 'seed_topics_ready');
  writeGateAttempt(bundle, {
    check: {
      passed: true,
      gate: 'setup-ready',
      currentNodeRef: 'phases/phase-setup.md',
      next: 'phases/phase-seed-topics.md',
      failed_rule_ids: [],
    },
    routing: { kind: 'next', next: 'phases/phase-seed-topics.md' },
    inspect: [],
    advice: [],
  }, { setupReadyStaged: true });
  const entered = spawnSync('node', [ENTER_PHASE, '--bundle', bundle, '--node', 'phases/phase-seed-topics.md'], {
    encoding: 'utf-8',
    timeout: 10000,
  });
  assert.equal(entered.status, 0, entered.stderr || entered.stdout);
}

describe('operate-queue seed authoring completion', () => {
  after(() => {
    for (const directory of createdDirs) rmSync(directory, { recursive: true, force: true });
  });

  it('returns a direct repair for malformed declared seed bytes without changing legacy queue authority', () => {
    const bundle = createBundle('malformed');
    writeSeed(bundle, '---\ntitle: [\n---\n');
    const queuePath = writeQueue(bundle, seedCard());
    const before = readFileSync(queuePath, 'utf8');

    const result = runQueue(bundle, writeResult(bundle));
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 1, result.stderr);
    assert.equal(output.repair_kind, 'agent_action');
    assert.match(output.missing_fact, /parseable YAML frontmatter/);
    assert.equal(output.write_to, `seed_topics/${TOPIC.slug}.md#/frontmatter`);
    assert.match(output.rerun, /operate-queue\.mjs complete/);
    assert.equal(readFileSync(queuePath, 'utf8'), before);
    assert.equal(traceEvents(bundle).includes('queue_completed'), false);
  });

  it('rejects ambiguous producer declarations at their owner boundary without guessing a seed repair path', () => {
    const bundle = createBundle('ambiguous');
    writeSeed(bundle, '---\ntopic_uid: wrong\n---\n');
    const queuePath = writeQueue(bundle, seedCard({
      writes_to: [`seed_topics/${TOPIC.slug}.md`, 'seed_topics/other.md'],
    }));
    const before = readFileSync(queuePath, 'utf8');

    const result = runQueue(bundle, writeResult(bundle));
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 1, result.stderr);
    assert.equal(output.repair_kind, 'missing_contract');
    assert.match(output.missing_fact, /exactly one.*writes_to/i);
    assert.match(output.write_to, /queue card declaration/i);
    assert.doesNotMatch(output.write_to, new RegExp(`seed_topics/${TOPIC.slug}\\.md`));
    assert.match(output.rerun, /operate-queue\.mjs complete/);
    assert.equal(readFileSync(queuePath, 'utf8'), before);
    assert.equal(traceEvents(bundle).includes('queue_completed'), false);
  });

  it('accepts the same completion command after declared-file repair and leaves final Gate evaluation to the shared evaluator', () => {
    const bundle = createBundle('repair');
    writeSeed(bundle, canonicalSeed().replace('title: Topic A', 'title: Wrong title'));
    const queuePath = writeQueue(bundle, seedCard());
    const resultPath = writeResult(bundle);

    const rejected = runQueue(bundle, resultPath);
    const rejectedOutput = JSON.parse(rejected.stdout);
    assert.equal(rejected.status, 1, rejected.stderr);
    assert.equal(rejectedOutput.repair_kind, 'agent_action');
    assert.equal(rejectedOutput.write_to, `seed_topics/${TOPIC.slug}.md#/title`);

    writeSeed(bundle, canonicalSeed() + 'This body is intentionally not evaluated here.\n');
    const completed = runQueue(bundle, resultPath);
    const completedOutput = JSON.parse(completed.stdout);
    assert.equal(completed.status, 0, completed.stderr || completed.stdout);
    assert.equal(completedOutput.feedback.passed, true);
    const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
    assert.equal(queue.active_window.length, 0);
    assert.equal(queue.terminal_history.length, 1);
    assert.ok(queue.bundle_name, 'legacy bundle_name is normalized only with successful completion');

    enterSeedTopics(bundle);
    const gate = spawnSync('node', [SEED_GATE, '--bundle', bundle, '--current-node', 'phases/phase-seed-topics.md'], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const gateOutput = JSON.parse(gate.stdout);
    assert.equal(gate.status, 0, gate.stderr || gate.stdout);
    assert.equal(gateOutput.check.passed, true);
  });
});
