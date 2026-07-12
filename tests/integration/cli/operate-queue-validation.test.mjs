// operate-queue-validation.test.mjs — regression tests for QIV-001..004, AGQ-001/004
// Covers: enqueue topic validation, bundle_name, repair, completion_receipt null

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const REPO_ROOT = process.cwd();
const OPERATE_QUEUE = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/operate-queue.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_oq_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runOq(bundle, command, ...args) {
  return spawnSync('node', [OPERATE_QUEUE, command, bundle, ...args], { encoding: 'utf-8', timeout: 10000 });
}

function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  assert.equal(r.status, 0, `new-disposable-bundle failed: ${r.stderr || r.stdout}`);
  const lines = r.stdout.trim().split(/\r?\n/).filter(Boolean);
  const dir = track(lines.at(-1).replace(/\x1b\[[0-9;]*m/g, ''));

  // Setup status
  const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
  status.current_gate = 'wave0_complete';
  status.next_gate = 'wave1_complete';
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));

  // Write topic_registry into rb_plan.md frontmatter
  const planPath = join(dir, 'rb_plan.md');
  const existing = readFileSync(planPath, 'utf-8');
  const fm = `---\nplan_basename: test\nderived_topic_count: 2\ntopic_registry_version: "2"\ntopic_registry:\n  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000\n    id: "01"\n    slug: topic-a\n    title: "Topic A"\n    must_answer: ["A?"]\n    scope_role: primary\n    depends_on_topic_uids: []\n  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174001\n    id: "02"\n    slug: topic-b\n    title: "Topic B"\n    must_answer: ["B?"]\n    scope_role: supporting\n    depends_on_topic_uids: []\n---`;
  writeFileSync(planPath, fm + '\n' + existing.replace(/^---\n[\s\S]*?\n---\n?/, ''));
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  writeFileSync(join(dir, 'seed_topics/topic-a.md'), '---\ntopic_uid: tp_123e4567-e89b-12d3-a456-426614174000\nid: "01"\nslug: topic-a\ntitle: Topic A\nmust_answer: ["A?"]\nscope_role: primary\ndepends_on_topic_uids: []\n---\n# Topic A\n');
  writeFileSync(join(dir, 'seed_topics/topic-b.md'), '---\ntopic_uid: tp_123e4567-e89b-12d3-a456-426614174001\nid: "02"\nslug: topic-b\ntitle: Topic B\nmust_answer: ["B?"]\nscope_role: supporting\ndepends_on_topic_uids: []\n---\n# Topic B\n');

  return dir;
}

function writeTaskFile(filePath, overrides = {}) {
  const task = {
    queue_item_id: overrides.queue_item_id || 'wave0-source-topic-a',
    title: overrides.title || 'Test Task',
    targets: overrides.targets || { controller: 'main-agent' },
    action: overrides.action || 'Test action',
    producer_rule: overrides.producer_rule || 'source_intake',
    lineage: overrides.lineage || {},
    priority_class: overrides.priority_class || 'P5_new_reference_intake',
    required_receipts: overrides.required_receipts || ['none'],
    done_condition: overrides.done_condition || 'Test done.',
    verification: overrides.verification || { engine: [], agent: [] },
    writes_to: overrides.writes_to || [],
    status_sync: overrides.status_sync || [],
    completion_receipt: overrides.completion_receipt !== undefined ? overrides.completion_receipt : 'none',
    failure_route: overrides.failure_route || 'queue repair work',
    status: overrides.status || 'queued',
    restore_priority: 'normal',
    payload: overrides.payload || {},
  };
  writeFileSync(filePath, JSON.stringify(task));
  return filePath;
}

// Helper to corrupt bundle_name in queue
function setQueueBundleName(dir, name) {
  const q = JSON.parse(readFileSync(join(dir, 'rb_queue.json'), 'utf-8'));
  q.bundle_name = name;
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify(q, null, 2));
}

describe('QIV-001 enqueue topic validation', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. accepts valid topic_slug in payload', () => {
    const dir = createBundle(unique('valid'));
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, { queue_item_id: 'wave0-source-topic-a', payload: { topic_slug: 'topic-a' } });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, true);
  });

  it('2. rejects unknown topic_slug', () => {
    const dir = createBundle(unique('unknown'));
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, { queue_item_id: 'wave0-source-clinical-scenarios', payload: { topic_slug: 'clinical-scenarios' } });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, false);
    assert.ok(out.error.includes('clinical-scenarios'));
  });

  it('3. accepts explicit payload topic_slug when queue_item_id has iteration suffix', () => {
    const dir = createBundle(unique('suffix'));
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, {
      queue_item_id: 'wave1-deepen-topic-a-v2',
      payload: { topic_slug: 'topic-a' },
      producer_rule: 'topic_deepening',
    });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, true, `Expected explicit topic_slug to override ID suffix, got: ${JSON.stringify(out)}`);
  });

  it('4. rejects conflicting explicit payload and lineage topic_slug', () => {
    const dir = createBundle(unique('explicit-conflict'));
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, {
      queue_item_id: 'wave1-deepen-topic-a',
      payload: { topic_slug: 'topic-a' },
      lineage: { topic_slug: 'topic-b' },
      producer_rule: 'topic_deepening',
    });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, false);
    assert.ok(out.error.includes('conflict'));
  });

  it('5. rejects topic-scoped task with no resolvable slug', () => {
    const dir = createBundle(unique('noslug'));
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, { queue_item_id: 'mystery-deepen-foo', producer_rule: 'topic_deepening' });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, false);
    assert.ok(out.error.includes('no resolvable topic_slug'));
  });

  it('6. accepts valid lineage topic_slug without payload topic_slug', () => {
    const dir = createBundle(unique('lineage'));
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, {
      queue_item_id: 'wave1-deepen-topic-a-v2',
      lineage: { topic_slug: 'topic-a' },
      producer_rule: 'topic_deepening',
    });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, true, `Expected lineage topic_slug to validate, got: ${JSON.stringify(out)}`);
  });

  it('7. accepts Wave2 finding-scoped backing task without topic_slug', () => {
    const dir = createBundle(unique('finding'));
    // Create finding-index.yaml so validation checks finding_id
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave2/finding-index.yaml'), 'findings:\n  - id: W2F-001\n    decision: exploit_search\n');
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, {
      queue_item_id: 'wave2-suppl-backing-W2F-001-r1',
      producer_rule: 'topic_deepening',
      payload: { finding_id: 'W2F-001' },
    });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, true);
  });

  it('8. rejects Wave2 finding-scoped task when finding_id not in index', () => {
    const dir = createBundle(unique('badfinding'));
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave2/finding-index.yaml'), 'findings:\n  - id: W2F-001\n');
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, {
      queue_item_id: 'wave2-suppl-backing-W2F-999-r1',
      producer_rule: 'topic_deepening',
      payload: { finding_id: 'W2F-999' },
    });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, false);
    assert.ok(out.error.includes('W2F-999'));
  });
});

describe('QIV-002 bundle_name validation', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. rejects operation when bundle_name mismatches', () => {
    const dir = createBundle(unique('mismatch'));
    setQueueBundleName(dir, 'wrong-bundle-name');
    const r = runOq(dir, 'check');
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes('bundle_name mismatch'));
  });

  it('2. legacy queue (null bundle_name) gets auto-injected on first operation', () => {
    const dir = createBundle(unique('legacy'));
    // Ensure null bundle_name
    const q = JSON.parse(readFileSync(join(dir, 'rb_queue.json'), 'utf-8'));
    q.bundle_name = null;
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify(q, null, 2));
    // First operation should inject and not fail
    const r = runOq(dir, 'count');
    const out = JSON.parse(r.stdout);
    assert.ok(out.pending !== undefined);
    // Queue should now have bundle_name set
    const qAfter = JSON.parse(readFileSync(join(dir, 'rb_queue.json'), 'utf-8'));
    assert.ok(qAfter.bundle_name);
  });
});

describe('QIV-003 projection staleness', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. project writes generated_at and source_queue_sha256', () => {
    const dir = createBundle(unique('project'));
    const r = runOq(dir, 'project');
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, true);
    assert.ok(out.generated_at);
    assert.ok(out.source_queue_sha256);
    // Verify projection file contains metadata
    const projPath = join(dir, '_cache', 'agentic-queue', 'current-task.md');
    const content = readFileSync(projPath, 'utf-8');
    assert.ok(content.includes('generated_at:'));
    assert.ok(content.includes('source_queue_sha256:'));
  });

  it('2. check warns when projection is stale', () => {
    const dir = createBundle(unique('stale'));
    // First project
    runOq(dir, 'project');
    // Modify queue
    const q = JSON.parse(readFileSync(join(dir, 'rb_queue.json'), 'utf-8'));
    q.queue_health = 'thin';
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify(q, null, 2));
    // Check should warn
    const r = runOq(dir, 'check');
    assert.ok(r.stderr.includes('WARNING') && r.stderr.includes('projection'), `Expected staleness warning, got stderr: "${r.stderr}"`);
  });
});

describe('QIV-004 repair --remove-stale', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. removes task card with unknown topic_slug', () => {
    const dir = createBundle(unique('repair'));
    // Enqueue a task with a valid topic first
    const taskFileA = join(dir, 'task_a.json');
    writeTaskFile(taskFileA, { queue_item_id: 'wave0-source-topic-a', payload: { topic_slug: 'topic-a' } });
    runOq(dir, 'enqueue', '--task', taskFileA);
    // Manually add stale entry to refill_pool
    const q = JSON.parse(readFileSync(join(dir, 'rb_queue.json'), 'utf-8'));
    q.refill_pool.push({
      queue_item_id: 'seed-topic-clinical-scenarios',
      title: 'Stale task',
      targets: { controller: 'main-agent' },
      action: 'stale',
      producer_rule: 'seed_topic',
      lineage: {},
      priority_class: 'P5_new_reference_intake',
      required_receipts: ['none'],
      done_condition: 'n/a',
      verification: { engine: [], agent: [] },
      writes_to: [],
      status_sync: [],
      completion_receipt: 'none',
      failure_route: 'n/a',
      status: 'queued',
      restore_priority: 'normal',
      payload: { topic_slug: 'clinical-scenarios' },
    });
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify(q, null, 2));

    const r = runOq(dir, 'repair', '--remove-stale');
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, true);
    assert.ok(out.removed_count > 0);
    assert.ok(out.removed.some((x) => x.queue_item_id === 'seed-topic-clinical-scenarios'));
  });
});

describe('AGQ-001/004 completion_receipt null', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. null completion_receipt with empty required_receipts is valid', () => {
    const dir = createBundle(unique('nullreceipt'));
    // Direct schema test: validate via makeItem path
    // Enqueue with completion_receipt: null and required_receipts: []
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, {
      queue_item_id: 'wave0-suppl-topic-a-r1',
      payload: { topic_slug: 'topic-a' },
      required_receipts: [],
      completion_receipt: null,
    });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, true, `Expected enqueue ok, got: ${JSON.stringify(out)}`);
  });

  it('2. null completion_receipt with non-empty required_receipts is rejected', () => {
    const dir = createBundle(unique('badnull'));
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, {
      queue_item_id: 'wave0-source-topic-a',
      payload: { topic_slug: 'topic-a' },
      required_receipts: ['file:artifacts/wave2/synthesis.md'],
      completion_receipt: null,
    });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    assert.ok(r.status !== 0 || r.stderr.length > 0, 'Expected rejection for null receipt with required_receipts');
  });

  it('3. missing completion_receipt property is still rejected by schema', () => {
    const dir = createBundle(unique('missing'));
    const taskFile = join(dir, 'task.json');
    // Write raw JSON without completion_receipt field
    const raw = {
      queue_item_id: 'wave0-source-topic-a',
      title: 'Test', targets: { controller: 'main-agent' }, action: 'test',
      producer_rule: 'test', lineage: {}, priority_class: 'P5_new_reference_intake',
      required_receipts: [], done_condition: 'test', verification: { engine: [], agent: [] },
      writes_to: [], status_sync: [], failure_route: 'test', status: 'queued',
      restore_priority: 'normal', payload: {},
    };
    writeFileSync(taskFile, JSON.stringify(raw));
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    assert.ok(r.status !== 0 || r.stderr.length > 0, 'Expected rejection for missing completion_receipt');
  });
});
