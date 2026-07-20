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
  const fm = `---\nplan_basename: test\nderived_topic_count: 2\ntopic_registry_version: "2"\ntopic_registry:\n  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000\n    id: "01"\n    slug: topic-a\n    title: "Topic A"\n    must_answer: ["A?"]\n    scope_role: primary\n    depends_on_topic_uids: []\n    previous_layouts:\n      - id: "00"\n        slug: old-topic-a\n  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174001\n    id: "02"\n    slug: topic-b\n    title: "Topic B"\n    must_answer: ["B?"]\n    scope_role: supporting\n    depends_on_topic_uids: []\n---`;
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
    ...(overrides.kind ? { kind: overrides.kind } : {}),
    ...(overrides.output_contract ? { output_contract: overrides.output_contract } : {}),
  };
  writeFileSync(filePath, JSON.stringify(task));
  return filePath;
}

function seedMissingModeWave1Card(dir, overrides = {}) {
  const queuePath = join(dir, 'rb_queue.json');
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
  const now = '2026-07-20T00:00:00.000Z';
  const item = {
    queue_item_id: overrides.queue_item_id || 'wave1-deepen-topic-a-legacy',
    title: 'Historical mode-absent Wave1 demand',
    targets: {
      controller: 'main-agent',
      delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 },
    },
    kind: 'wave1_topic_deepening',
    action: 'Deepen topic A.',
    producer_rule: overrides.producer_rule || 'topic_deepening',
    lineage: {},
    priority_class: 'P4_progressive_artifact_or_seed_backfill',
    required_receipts: overrides.required_receipts || [],
    done_condition: 'Submit the assigned work unit.',
    verification: { engine: ['work_unit_submit'], agent: [] },
    writes_to: overrides.writes_to || ['artifacts/wave1/topic-a/optional-notes.md'],
    status_sync: [],
    completion_receipt: overrides.completion_receipt ?? null,
    failure_route: 'queue repair work',
    status: 'queued',
    restore_priority: 'normal',
    created_at: now,
    updated_at: now,
    payload: {
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      topic_slug: 'topic-a',
      wave: 1,
      ...(overrides.payload || {}),
    },
  };
  queue.active_window.push(item);
  writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  return item;
}

function readTrace(dir) {
  const tracePath = join(dir, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  return readFileSync(tracePath, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
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
    assert.equal(out.queue.active_window[0].payload.topic_uid, 'tp_123e4567-e89b-12d3-a456-426614174000');
    assert.equal(out.queue.active_window[0].payload.topic_slug, 'topic-a');
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

  it('9. rejects a previous-layout slug with the current suggestion and no write', () => {
    const dir = createBundle(unique('previous'));
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, { payload: { topic_slug: 'old-topic-a' } });
    const before = readFileSync(join(dir, 'rb_queue.json'), 'utf8');
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, false);
    assert.equal(out.reason_code, 'previous_layout_not_current');
    assert.match(out.error, /topic-a/);
    assert.equal(readFileSync(join(dir, 'rb_queue.json'), 'utf8'), before);
  });

  it('10. rejects caller UID mismatch without queue mutation', () => {
    const dir = createBundle(unique('uid-mismatch'));
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, { payload: { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174001', topic_slug: 'topic-a' } });
    const before = readFileSync(join(dir, 'rb_queue.json'), 'utf8');
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.reason_code, 'topic_uid_slug_mismatch');
    assert.equal(readFileSync(join(dir, 'rb_queue.json'), 'utf8'), before);
  });

  it('11. prioritizes accepted workspace recovery before layout validation', () => {
    const dir = createBundle(unique('workspace'));
    const workspace = join(dir, '_diagnostics/topic-state/op-layout');
    mkdirSync(workspace, { recursive: true });
    writeFileSync(join(workspace, 'prepared.json'), '{}\n');
    const taskFile = join(dir, 'task.json');
    writeTaskFile(taskFile, { payload: { topic_slug: 'old-topic-a' } });
    const r = runOq(dir, 'enqueue', '--task', taskFile);
    const out = JSON.parse(r.stdout);
    assert.equal(out.reason_code, 'accepted_workspace');
    assert.match(out.error, /recover/);
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

describe('AGQ-013 Wave1 assignment-mode admission and repair', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('keeps historical missing-mode rows loadable but rejects missing, unknown, and mismatched new enqueue', async (t) => {
    const historicalDir = createBundle(unique('mode-history'));
    seedMissingModeWave1Card(historicalDir);
    const checked = runOq(historicalDir, 'check');
    assert.equal(checked.status, 0, checked.stderr);

    const invalid = [
      { label: 'missing', payload: { topic_slug: 'topic-a' }, required_receipts: [] },
      { label: 'unknown', payload: { topic_slug: 'topic-a', assignment_mode: 'unknown' }, required_receipts: [] },
      { label: 'primary-empty', payload: { topic_slug: 'topic-a', assignment_mode: 'primary' }, required_receipts: [] },
      {
        label: 'supplementary-pair',
        payload: { topic_slug: 'topic-a', assignment_mode: 'supplementary' },
        required_receipts: [
          'file:artifacts/wave1/topic-a/evidence-summary.md',
          'file:artifacts/wave1/topic-a/question-list.md',
        ],
      },
    ];
    for (const testCase of invalid) {
      await t.test(testCase.label, () => {
        const dir = createBundle(unique(`mode-${testCase.label}`));
        const taskPath = join(dir, 'task.json');
        writeTaskFile(taskPath, {
          queue_item_id: `wave1-deepen-topic-a-${testCase.label}`,
          kind: 'wave1_topic_deepening',
          producer_rule: 'topic_deepening',
          targets: {
            controller: 'main-agent',
            delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 },
          },
          payload: testCase.payload,
          required_receipts: testCase.required_receipts,
          completion_receipt: testCase.required_receipts.length > 0 ? testCase.required_receipts[0] : null,
        });
        const before = readFileSync(join(dir, 'rb_queue.json'), 'utf8');
        const result = runOq(dir, 'enqueue', '--task', taskPath);
        assert.equal(result.status, 1, testCase.label);
        assert.match(`${result.stdout}\n${result.stderr}`, /assignment_mode|primary|supplementary|receipt/i, testCase.label);
        assert.equal(readFileSync(join(dir, 'rb_queue.json'), 'utf8'), before, testCase.label);
      });
    }
  });

  it('rejects every direct selector on enqueue without queue mutation', async (t) => {
    const selectors = [
      'required_outputs',
      'direct_contract',
      'direct_contract_id',
      'assignment_contract_version',
      'resolver_version',
      'contract_id',
    ];
    for (const selector of selectors) {
      await t.test(selector, () => {
        const dir = createBundle(unique(`selector-${selector}`));
        const taskPath = join(dir, 'task.json');
        writeTaskFile(taskPath, {
          queue_item_id: `wave1-deepen-topic-a-${selector.replaceAll('_', '-')}`,
          kind: 'wave1_topic_deepening',
          producer_rule: 'topic_deepening',
          targets: {
            controller: 'main-agent',
            delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 },
          },
          payload: {
            topic_slug: 'topic-a',
            assignment_mode: 'supplementary',
            nested: { [selector]: 'forbidden' },
          },
          required_receipts: [],
          completion_receipt: null,
        });
        const before = readFileSync(join(dir, 'rb_queue.json'), 'utf8');
        const result = runOq(dir, 'enqueue', '--task', taskPath);
        assert.equal(result.status, 1, selector);
        assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(selector));
        assert.equal(readFileSync(join(dir, 'rb_queue.json'), 'utf8'), before, selector);
      });
    }
  });

  it('repairs one unclaimed mode-absent card with one save-before-event sequence', async (t) => {
    for (const mode of ['primary', 'supplementary']) {
      await t.test(mode, () => {
        const dir = createBundle(unique(`repair-${mode}`));
        const original = seedMissingModeWave1Card(dir, {
          queue_item_id: `wave1-deepen-topic-a-repair-${mode}`,
          writes_to: ['artifacts/wave1/topic-a/optional-notes.md'],
        });
        const result = runOq(
          dir,
          'repair',
          '--queue-item-id', original.queue_item_id,
          '--set-assignment-mode', mode,
        );
        assert.equal(result.status, 0, result.stderr);
        const output = JSON.parse(result.stdout);
        assert.equal(output.ok, true);
        const queue = JSON.parse(readFileSync(join(dir, 'rb_queue.json'), 'utf8'));
        const repaired = queue.active_window.find((item) => item.queue_item_id === original.queue_item_id);
        assert.equal(repaired.payload.assignment_mode, mode);
        assert.equal(repaired.queue_item_id, original.queue_item_id);
        assert.equal(repaired.created_at, original.created_at);
        assert.equal(repaired.payload.topic_uid, original.payload.topic_uid);
        if (mode === 'primary') {
          assert.deepEqual(repaired.required_receipts, [
            'file:artifacts/wave1/topic-a/evidence-summary.md',
            'file:artifacts/wave1/topic-a/question-list.md',
          ]);
          assert.ok(repaired.writes_to.includes('artifacts/wave1/topic-a/evidence-summary.md'));
          assert.ok(repaired.writes_to.includes('artifacts/wave1/topic-a/question-list.md'));
        } else {
          assert.deepEqual(repaired.required_receipts, []);
          assert.deepEqual(repaired.writes_to, original.writes_to);
        }
        const trace = readTrace(dir);
        const savedAt = trace.findIndex((event) => event.source === 'agq-save' && event.step === 'save');
        const repairedAt = trace.findIndex((event) => event.event === 'queue_assignment_mode_repaired');
        assert.ok(savedAt >= 0 && repairedAt > savedAt);
        assert.equal(trace.filter((event) => event.event === 'queue_assignment_mode_repaired').length, 1);
      });
    }
  });

  it('leaves queue and success-event authority unchanged for invalid repair targets', () => {
    const cases = [
      { label: 'missing-id', seed: false, id: 'not-present', mode: 'primary' },
      {
        label: 'already-classified',
        seed: true,
        id: 'wave1-already-classified',
        mode: 'supplementary',
        payload: { assignment_mode: 'primary' },
      },
      {
        label: 'wrong-producer',
        seed: true,
        id: 'wave1-wrong-producer',
        mode: 'primary',
        producer_rule: 'manual',
      },
      {
        label: 'unknown-mode',
        seed: true,
        id: 'wave1-unknown-mode',
        mode: 'unknown',
      },
      {
        label: 'delegated-in-flight',
        seed: true,
        id: 'wave1-in-flight',
        mode: 'primary',
        location: 'delegated_in_flight',
      },
      {
        label: 'terminal',
        seed: true,
        id: 'wave1-terminal',
        mode: 'supplementary',
        location: 'terminal_history',
      },
      {
        label: 'duplicate-location',
        seed: true,
        id: 'wave1-duplicate-location',
        mode: 'primary',
        location: 'duplicate',
      },
    ];
    for (const testCase of cases) {
      const dir = createBundle(unique(`repair-invalid-${testCase.label}`));
      if (testCase.seed) {
        const item = seedMissingModeWave1Card(dir, {
          queue_item_id: testCase.id,
          producer_rule: testCase.producer_rule,
          payload: testCase.payload,
        });
        if (testCase.location) {
          const queuePath = join(dir, 'rb_queue.json');
          const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
          if (testCase.location !== 'duplicate') queue.active_window = [];
          if (testCase.location === 'delegated_in_flight' || testCase.location === 'duplicate') {
            queue.delegated_in_flight[item.queue_item_id] = {
              queue_item_id: item.queue_item_id,
              work_id: 'wu-w1-b000-deep-i0001',
              wave: 1,
              kind: 'wave1_topic_deepening',
              batch_id: 'b000',
              attempt_index: 1,
              queue_item_snapshot_hash: 'snapshot-hash',
              claimed_at: '2026-07-20T00:00:00.000Z',
              timeout_ms: 600000,
              deadline_at: '2026-07-20T00:10:00.000Z',
            };
          } else if (testCase.location === 'terminal_history') {
            queue.terminal_history.push({
              queue_item_id: item.queue_item_id,
              terminal_status: 'failed',
              completed_at: '2026-07-20T00:10:00.000Z',
              work_id: 'wu-w1-b000-deep-i0001',
              reason: 'historical terminal attempt',
              item,
            });
          }
          writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
        }
      }
      const queueBefore = readFileSync(join(dir, 'rb_queue.json'), 'utf8');
      const traceBefore = readTrace(dir);
      const result = runOq(dir, 'repair', '--queue-item-id', testCase.id, '--set-assignment-mode', testCase.mode);
      assert.equal(result.status, 1, testCase.label);
      assert.equal(readFileSync(join(dir, 'rb_queue.json'), 'utf8'), queueBefore, testCase.label);
      const traceAfter = readTrace(dir);
      assert.equal(
        traceAfter.filter((event) => event.event === 'queue_assignment_mode_repaired').length,
        traceBefore.filter((event) => event.event === 'queue_assignment_mode_repaired').length,
        testCase.label,
      );
    }
  });
});
