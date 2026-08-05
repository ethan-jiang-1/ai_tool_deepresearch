// @impl PRP-002, CTS-003, CTS-004
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
});
