// @impl PRP-002, CTS-003, CTS-004
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = process.cwd();
const ADVANCE_STATUS = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/advance-status.mjs');
const TOPIC_STATE = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function unique(prefix) {
  return `rt_hitl1_readiness_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function createBundle(prefix) {
  const created = spawnSync('node', [NEW_BUNDLE, unique(prefix), '--force', '--target-dir', BUNDLES_DIR], {
    encoding: 'utf-8',
    timeout: 10000,
  });
  assert.equal(created.status, 0, created.stderr || created.stdout);
  const bundle = created.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
  createdDirs.push(bundle);
  const statusPath = join(bundle, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf8'));
  status.current_node = 'phases/phase-hitl1.md';
  writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);
  return bundle;
}

function run(command, args) {
  return spawnSync('node', [command, ...args], { encoding: 'utf-8', timeout: 10000 });
}

function writeInput(bundle) {
  const inputPath = join(bundle, 'approved-topic.json');
  writeFileSync(inputPath, JSON.stringify({
    context: 'hitl1',
    actions: [{
      action: 'add_topic',
      title: 'Topic A',
      slug_stem: 'readiness-probe',
      must_answer: ['What must be answered?'],
      scope_role: 'primary',
      depends_on_topic_uids: [],
    }],
  }));
  return inputPath;
}

function snapshot(bundle) {
  const paths = ['rb_plan.md', 'rb_status.json', 'rb_trace.jsonl'];
  return Object.fromEntries(paths.map((relativePath) => {
    const absolutePath = join(bundle, relativePath);
    return [relativePath, existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : null];
  }));
}

function authoritySnapshot(bundle) {
  return JSON.stringify({
    plan: readFileSync(join(bundle, 'rb_plan.md'), 'utf8'),
    status: readFileSync(join(bundle, 'rb_status.json'), 'utf8'),
    trace: existsSync(join(bundle, 'rb_trace.jsonl')) ? readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8') : null,
    seeds: readdirSync(join(bundle, 'seed_topics')).sort().map((name) => [name, readFileSync(join(bundle, 'seed_topics', name), 'utf8')]),
  });
}

function advanceHitl1Recorded(bundle) {
  const synchronized = run(ADVANCE_STATUS, ['--bundle', bundle, '--to', 'hitl1_recorded']);
  assert.equal(synchronized.status, 0, synchronized.stderr || synchronized.stdout);
  return JSON.parse(synchronized.stdout);
}

function writeActionInput(bundle, name, actions) {
  const inputPath = join(bundle, name);
  writeFileSync(inputPath, JSON.stringify({ context: 'hitl1', actions }));
  return inputPath;
}

function writeLayoutInput(bundle, name, inspected, topics, removeTopicUids = []) {
  const inputPath = join(bundle, name);
  writeFileSync(inputPath, JSON.stringify({
    context: 'hitl1',
    action: 'mutate_layout',
    expected_plan_sha256: inspected.plan_sha256,
    topics,
    remove_topic_uids: removeTopicUids,
  }));
  return inputPath;
}

const addActions = [
  { action: 'add_topic', title: 'Topic A', slug_stem: 'topic-a', must_answer: ['A?'], scope_role: 'primary', depends_on_topic_uids: [] },
  { action: 'add_topic', title: 'Topic B', slug_stem: 'topic-b', must_answer: ['B?'], scope_role: 'supporting', depends_on_topic_uids: [] },
  { action: 'add_topic', title: 'Topic C', slug_stem: 'topic-c', must_answer: ['C?'], scope_role: 'comparison', depends_on_topic_uids: [] },
];

describe('operate-topic-state HITL1 readiness', () => {
  after(() => {
    for (const directory of createdDirs) rmSync(directory, { recursive: true, force: true });
  });

  it('requires the existing status synchronization before canonical apply without mutating canonical owners on rejection', () => {
    const bundle = createBundle('sync');
    const input = writeInput(bundle);
    const before = snapshot(bundle);

    const rejected = run(TOPIC_STATE, ['apply', '--bundle', bundle, '--input', input]);

    assert.equal(rejected.status, 1, rejected.stderr);
    assert.equal(JSON.parse(rejected.stdout).reason_code, 'hitl1_not_authorized');
    assert.deepEqual(snapshot(bundle), before);

    const synchronized = run(ADVANCE_STATUS, ['--bundle', bundle, '--to', 'hitl1_recorded']);
    const syncOutput = JSON.parse(synchronized.stdout);
    assert.equal(synchronized.status, 0, synchronized.stderr);
    assert.equal(syncOutput.status, 'ok');
    assert.equal(syncOutput.current_gate, 'hitl1_recorded');
    assert.equal(syncOutput.next_gate, 'setup_ready');

    const applied = run(TOPIC_STATE, ['apply', '--bundle', bundle, '--input', input]);
    const applyOutput = JSON.parse(applied.stdout);
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);
    assert.equal(applyOutput.verdict, 'committed');
    assert.equal(JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8')).current_gate, 'hitl1_recorded');
    assert.match(readFileSync(join(bundle, 'rb_plan.md'), 'utf8'), /topic_registry_version: "2"/);
  });

  it('commits one complete hitl1 mutate_layout target atomically with the style handoff', () => {
    const bundle = createBundle('layout');
    advanceHitl1Recorded(bundle);
    writeFileSync(join(bundle, 'rb_profile.yaml'), [
      'research_profile: quick_factual',
      'research_access:',
      '  status: available',
      '',
    ].join('\n'));
    const applied = run(TOPIC_STATE, ['apply', '--bundle', bundle, '--input', writeActionInput(bundle, 'approved-topic.json', addActions)]);
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);

    const inspected = JSON.parse(run(TOPIC_STATE, ['inspect', '--bundle', bundle]).stdout);
    assert.equal(inspected.layout_baseline.context, 'hitl1');
    const [topicA, topicB, topicC] = inspected.layout_baseline.topics;
    const layoutInput = writeLayoutInput(bundle, 'layout-input.json', inspected, [
      { topic_uid: topicC.topic_uid, title: 'Topic C first', slug_stem: 'topic-c' },
      { topic_uid: topicA.topic_uid, title: 'Topic A revised', slug_stem: 'topic-a-new' },
    ], [topicB.topic_uid]);
    const layoutApplied = run(TOPIC_STATE, ['apply', '--bundle', bundle, '--input', layoutInput]);
    const layoutOutput = JSON.parse(layoutApplied.stdout);
    assert.equal(layoutApplied.status, 0, layoutApplied.stderr || layoutApplied.stdout);
    assert.equal(layoutOutput.verdict, 'committed');
    assert.equal(layoutOutput.style_projection.status, 'refresh_required');
    assert.deepEqual(layoutOutput.style_projection.checkpoint, { gate: 'hitl1-recorded', current_node: 'phases/phase-hitl1.md' });
    const plan = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
    assert.match(plan, /slug: 01_topic-c/);
    assert.match(plan, /slug: 02_topic-a-new/);
    assert.match(plan, /slug: 01_topic-a/);
    assert.doesNotMatch(plan, /slug: .*topic-b/);
    assert.equal(existsSync(join(bundle, 'seed_topics/02_topic-b.md')), false);
    assert.equal(existsSync(join(bundle, 'seed_topics/01_topic-a.md')), false);
    assert.equal(existsSync(join(bundle, 'seed_topics/02_topic-a-new.md')), true);
    assert.equal(existsSync(join(bundle, 'seed_topics/01_topic-c.md')), true);
  });

  it('routes the split flow through two unmixed applies with a fresh inspect between them', () => {
    const bundle = createBundle('split');
    advanceHitl1Recorded(bundle);
    const combined = run(TOPIC_STATE, ['apply', '--bundle', bundle, '--input', writeActionInput(bundle, 'combined.json', [
      { action: 'add_topic', title: 'H200 & MI308', slug_stem: 'h200-mi308', must_answer: ['Combined?'], scope_role: 'primary', depends_on_topic_uids: [] },
    ])]);
    assert.equal(combined.status, 0, combined.stderr || combined.stdout);
    const split = run(TOPIC_STATE, ['apply', '--bundle', bundle, '--input', writeActionInput(bundle, 'split.json', [
      { action: 'add_topic', title: 'H200 baseline', slug_stem: 'h200-baseline', must_answer: ['H200?'], scope_role: 'primary', depends_on_topic_uids: [] },
      { action: 'add_topic', title: 'MI308 baseline', slug_stem: 'mi308-baseline', must_answer: ['MI308?'], scope_role: 'primary', depends_on_topic_uids: [] },
    ])]);
    assert.equal(split.status, 0, split.stderr || split.stdout);

    const inspected = JSON.parse(run(TOPIC_STATE, ['inspect', '--bundle', bundle]).stdout);
    const combinedTopic = inspected.layout_baseline.topics.find((topic) => topic.slug_stem === 'h200-mi308');
    const layoutInput = writeLayoutInput(bundle, 'split-layout.json', inspected, [
      inspected.layout_baseline.topics[1],
      inspected.layout_baseline.topics[2],
    ], [combinedTopic.topic_uid]);
    const applied = run(TOPIC_STATE, ['apply', '--bundle', bundle, '--input', layoutInput]);
    const output = JSON.parse(applied.stdout);
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);
    assert.equal(output.verdict, 'committed');
    const plan = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
    assert.match(plan, /slug: 01_h200-baseline/);
    assert.match(plan, /slug: 02_mi308-baseline/);
    assert.doesNotMatch(plan, /slug: .*h200-mi308/);
    assert.equal(existsSync(join(bundle, 'seed_topics/01_h200-mi308.md')), false);
  });

  it('keeps hitl1 layout guards fail-closed without touching authority bytes', () => {
    const hashDir = createBundle('guard-hash');
    advanceHitl1Recorded(hashDir);
    run(TOPIC_STATE, ['apply', '--bundle', hashDir, '--input', writeActionInput(hashDir, 'add.json', addActions)]);
    const hashInspected = JSON.parse(run(TOPIC_STATE, ['inspect', '--bundle', hashDir]).stdout);
    const staleInput = join(hashDir, 'layout-stale.json');
    writeFileSync(staleInput, JSON.stringify({ context: 'hitl1', action: 'mutate_layout', expected_plan_sha256: '0'.repeat(64), topics: hashInspected.layout_baseline.topics, remove_topic_uids: [] }));
    const beforeHash = authoritySnapshot(hashDir);
    const stale = run(TOPIC_STATE, ['apply', '--bundle', hashDir, '--input', staleInput]);
    assert.equal(JSON.parse(stale.stdout).reason_code, 'plan_hash_mismatch');
    assert.equal(authoritySnapshot(hashDir), beforeHash);

    const historyDir = createBundle('guard-history');
    advanceHitl1Recorded(historyDir);
    run(TOPIC_STATE, ['apply', '--bundle', historyDir, '--input', writeActionInput(historyDir, 'add.json', addActions)]);
    const historyInspected = JSON.parse(run(TOPIC_STATE, ['inspect', '--bundle', historyDir]).stdout);
    mkdirSync(join(historyDir, 'reference'), { recursive: true });
    writeFileSync(join(historyDir, 'reference', '01_topic-a-note.md'), 'history\n');
    const historyInput = writeLayoutInput(historyDir, 'layout-history.json', historyInspected,
      [historyInspected.layout_baseline.topics[1], historyInspected.layout_baseline.topics[2]],
      [historyInspected.layout_baseline.topics[0].topic_uid]);
    const beforeHistory = authoritySnapshot(historyDir);
    const history = run(TOPIC_STATE, ['apply', '--bundle', historyDir, '--input', historyInput]);
    assert.equal(JSON.parse(history.stdout).reason_code, 'remove_has_history');
    assert.equal(authoritySnapshot(historyDir), beforeHistory);

    const closedDir = createBundle('guard-closed');
    advanceHitl1Recorded(closedDir);
    run(TOPIC_STATE, ['apply', '--bundle', closedDir, '--input', writeActionInput(closedDir, 'add.json', addActions)]);
    writeFileSync(join(closedDir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'in_progress', current_gate: 'setup_ready', next_gate: 'seed_topics_ready', current_node: 'phases/phase-setup.md' }));
    const closedInspected = JSON.parse(run(TOPIC_STATE, ['inspect', '--bundle', closedDir]).stdout);
    const closedInput = writeLayoutInput(closedDir, 'layout-closed.json', closedInspected, closedInspected.layout_baseline.topics);
    const beforeClosed = authoritySnapshot(closedDir);
    const closed = run(TOPIC_STATE, ['apply', '--bundle', closedDir, '--input', closedInput]);
    assert.equal(JSON.parse(closed.stdout).reason_code, 'hitl1_not_authorized');
    assert.equal(authoritySnapshot(closedDir), beforeClosed);
  });

  it('derives the inspect layout baseline context from the lifecycle window with a rerun fallback', () => {
    const bundle = createBundle('baseline-context');
    advanceHitl1Recorded(bundle);
    run(TOPIC_STATE, ['apply', '--bundle', bundle, '--input', writeActionInput(bundle, 'add.json', addActions)]);
    let inspected = JSON.parse(run(TOPIC_STATE, ['inspect', '--bundle', bundle]).stdout);
    assert.equal(inspected.layout_baseline.context, 'hitl1');

    writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'in_progress', current_gate: 'hitl2_recorded', next_gate: 'rerun_ready', current_node: 'phases/phase-rerun.md' }));
    inspected = JSON.parse(run(TOPIC_STATE, ['inspect', '--bundle', bundle]).stdout);
    assert.equal(inspected.layout_baseline.context, 'rerun');

    writeFileSync(join(bundle, 'rb_status.json'), 'not-json');
    inspected = JSON.parse(run(TOPIC_STATE, ['inspect', '--bundle', bundle]).stdout);
    assert.equal(inspected.layout_baseline.context, 'rerun');

    rmSync(join(bundle, 'rb_status.json'));
    inspected = JSON.parse(run(TOPIC_STATE, ['inspect', '--bundle', bundle]).stdout);
    assert.equal(inspected.layout_baseline.context, 'rerun');
  });

  it('exposes a parseable hitl1 mutate_layout schema form without rerun direction', async () => {
    const projected = run(TOPIC_STATE, ['schema', '--context', 'hitl1']);
    assert.equal(projected.status, 0, projected.stderr || projected.stdout);
    const output = JSON.parse(projected.stdout);
    const layout = output.forms.find((form) => form.action === 'mutate_layout');
    assert.ok(layout, 'schema --context hitl1 must expose the mutate_layout form');
    assert.equal(layout.template.context, 'hitl1');
    assert.ok(!JSON.stringify(layout.template).includes('direction'));
    const { TopicApplyPlanSchema } = await import(pathToFileURL(join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/engine/helpers/topic-state-plan-schema.mjs')).href);
    assert.equal(TopicApplyPlanSchema.safeParse(layout.template).success, true);
  });
});
