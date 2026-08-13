import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  setStatusWindow,
} from './handoff-fixtures.mjs';
import { writeGateAttempt } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import {
  renderSeedInitializationRegion,
  SEED_TOPIC_INITIALIZATION,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/seed-topic-authoring-evaluator.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs');
const ENTER_PHASE = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function unique(prefix) {
  return `rt_seed_gate_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function createBundle(prefix) {
  const name = unique(prefix);
  const created = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], {
    encoding: 'utf-8',
    timeout: 10000,
  });
  assert.equal(created.status, 0, created.stderr);
  const bundlePath = created.stdout.trim();
  createdDirs.push(bundlePath);
  setStatusWindow(bundlePath, 'setup_ready', 'seed_topics_ready');
  return bundlePath;
}

function writeCanonicalPlan(bundlePath, topics) {
  const planPath = join(bundlePath, 'rb_plan.md');
  const body = readFileSync(planPath, 'utf-8').replace(/^---\n[\s\S]*?\n---\n?/, '');
  const topicLines = topics.length === 0
    ? 'topic_registry: []\n'
    : `topic_registry:\n${topics.map((topic) => [
        `  - topic_uid: ${topic.topic_uid}`,
        `    id: "${topic.id}"`,
        `    slug: ${topic.slug}`,
        `    title: ${topic.title}`,
        '    must_answer: ["What must be answered?"]',
        '    scope_role: primary',
        '    depends_on_topic_uids: []',
      ].join('\n')).join('\n')}\n`;
  writeFileSync(planPath, `---\nplan_basename: test\nderived_topic_count: ${topics.length}\ntopic_registry_version: "2"\n${topicLines}---\n${body}`);
  writeGateAttempt(bundlePath, {
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
  const entry = spawnSync('node', [ENTER_PHASE, '--bundle', bundlePath, '--node', 'phases/phase-seed-topics.md'], {
    encoding: 'utf-8',
    timeout: 10000,
  });
  assert.equal(entry.status, 0, entry.stderr);
}

function writeSeed(bundlePath, topic, overrides = {}) {
  mkdirSync(join(bundlePath, 'seed_topics'), { recursive: true });
  const slug = overrides.slug ?? topic.slug;
  const title = overrides.title ?? topic.title;
  const body = overrides.body ?? `# ${title}\n`;
  writeFileSync(join(bundlePath, 'seed_topics', `${topic.slug}.md`), `---\ntopic_uid: ${topic.topic_uid}\nid: "${topic.id}"\nslug: ${slug}\ntitle: ${title}\nmust_answer: ["What must be answered?"]\nscope_role: primary\ndepends_on_topic_uids: []\n---\n${body}`);
}

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-seed-topics.md'], {
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

const TOPIC = {
  topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174000',
  id: '01',
  slug: '01_topic-a',
  title: 'Topic A',
};

describe('check-gate-seed-topics-ready', () => {
  after(() => {
    for (const directory of createdDirs) rmSync(directory, { recursive: true, force: true });
  });

  it('passes a canonical seed set with no repair hints', () => {
    const bundlePath = createBundle('pass');
    writeCanonicalPlan(bundlePath, [TOPIC]);
    writeSeed(bundlePath, TOPIC);

    const result = runGate(bundlePath);
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(output.check.passed, true, JSON.stringify(output.inspect));
    assert.deepEqual(output.hints, []);
  });

  it('uses canonical topic-state as the sole primary root and masks dependent seed rules', () => {
    const bundlePath = createBundle('parent');
    writeCanonicalPlan(bundlePath, [TOPIC]);
    writeSeed(bundlePath, TOPIC, { slug: 'wrong-slug', title: '' });

    const result = runGate(bundlePath);
    const output = JSON.parse(result.stdout);
    const parent = output.hints.find((hint) => hint.rule_id === 'canonical_topic_state_prerequisite');

    assert.equal(result.status, 1, result.stderr);
    assert.equal(output.check.passed, false);
    assertCompleteHint(parent);
    assert.equal(parent.repair_kind, 'engine_operation');
    assert.match(parent.write_to, /operate-topic-state\.mjs apply/);
    assert.match(parent.write_to, new RegExp(TOPIC.topic_uid));
    assert.deepEqual(output.hints.map((hint) => hint.rule_id), ['canonical_topic_state_prerequisite']);
    assert.ok(output.check.masked_rule_ids.includes('per_file_slug_stem_consistency'));
    assert.ok(output.check.masked_rule_ids.includes('per_file_title_non_empty'));
    assert.equal(output.hints.some((hint) => hint.rule_id === 'slug_consistency'), false);
  });

  it('keeps an empty canonical registry as a HITL user decision rather than an Agent artifact repair', () => {
    const bundlePath = createBundle('empty');
    writeCanonicalPlan(bundlePath, []);
    rmSync(join(bundlePath, 'seed_topics'), { recursive: true, force: true });
    mkdirSync(join(bundlePath, 'seed_topics'), { recursive: true });

    const result = runGate(bundlePath);
    const output = JSON.parse(result.stdout);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'canonical_topic_state_prerequisite');

    assert.equal(result.status, 1, result.stderr);
    assert.equal(output.check.passed, false);
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'user_decision');
    assert.equal(hint.write_to, 'phases/phase-hitl1.md');
    assert.match(output.advice.join('\n'), /existing HITL1 owner/);
    assert.match(output.advice.join('\n'), /rerun this same Gate/);
    assert.doesNotMatch(output.advice.join('\n'), /return to HITL|ask|surface/i);
    assert.deepEqual(output.hints.map((candidate) => candidate.rule_id), ['canonical_topic_state_prerequisite']);
    assert.ok(output.check.masked_rule_ids.includes('seed_topics_dir_non_empty'));
    assert.ok(output.check.masked_rule_ids.includes('slug_consistency'));
  });

  it('rejects a current-marker seed with an initialization ghost below its editable boundary', () => {
    const bundlePath = createBundle('initialization-ghost');
    writeCanonicalPlan(bundlePath, [TOPIC]);
    writeSeed(bundlePath, TOPIC, {
      body: [
        '# Topic A',
        '',
        renderSeedInitializationRegion(),
        '',
        `## ${SEED_TOPIC_INITIALIZATION.appendixHeading}`,
        '',
        '## 初始假设、缺口或张力',
        '',
        'pending — old template ghost must not remain in the Engine-owned appendix.',
        '',
      ].join('\n'),
    });

    const result = runGate(bundlePath);
    const output = JSON.parse(result.stdout);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'seed_initialization_structure');

    assert.equal(result.status, 1, result.stderr);
    assert.equal(output.check.passed, false);
    assertCompleteHint(hint);
    assert.match(hint.write_to, /seed-initialization/);
    assert.match(hint.rerun, /check-gate-seed-topics-ready/);
  });

  it('keeps an unmarked legacy duplicate body compatible instead of inferring a new authoring authority', () => {
    const bundlePath = createBundle('legacy-duplicate');
    writeCanonicalPlan(bundlePath, [TOPIC]);
    writeSeed(bundlePath, TOPIC, {
      body: '# Topic A\n\n## 初始假设、缺口或张力\nlegacy duplicate prose\n\n## Appendix\n',
    });

    const result = runGate(bundlePath);
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(output.check.passed, true, JSON.stringify(output.inspect));
    assert.equal(output.hints.some((hint) => hint.rule_id === 'seed_initialization_structure'), false);
  });

  it('fails closed for an old mutable plan without advertising migration', () => {
    const bundlePath = createBundle('old-plan');
    writeCanonicalPlan(bundlePath, [TOPIC]);
    writeFileSync(join(bundlePath, 'rb_plan.md'), '---\nplan_basename: old-plan\nderived_topic_count: 1\ntopic_registry:\n  - id: "01"\n    slug: 01_topic-a\n    title: Topic A\n---\n# Historical plan\n');
    const result = runGate(bundlePath);
    const output = JSON.parse(result.stdout);
    const hint = output.hints.find((candidate) => candidate.rule_id === 'handoff_witness_missing');
    assert.equal(result.status, 1, result.stderr);
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'missing_contract');
    assert.doesNotMatch(JSON.stringify(output), /migrat|adopt|upgrade|convert/i);
  });
});
