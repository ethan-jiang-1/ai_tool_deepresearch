// @impl CTS-001, RRM-007
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { createTempDir } from '../../helpers/temp-dirs.mjs';
import { applyCanonicalTopicState, evaluateCanonicalSeedBindings, inspectCanonicalTopicState, recoverCanonicalTopicState } from '../../../DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';
import { diffSnapshots, snapshotTree } from '../../helpers/authority-snapshot.mjs';
import { claimAndSubmitWorkUnit } from '../work-unit-test-helpers.mjs';
import { writeGateAttempt } from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));
function bundle(label = 'topic-state') {
  const dir = createTempDir(label); dirs.push(dir); mkdirSync(join(dir, 'seed_topics')); mkdirSync(join(dir, '_work_units'));
  writeFileSync(join(dir, 'rb_plan.md'), '---\nplan_basename: test\nderived_topic_count: 0\ntopic_registry_version: "2"\ntopic_registry: []\n---\n# Plan\n');
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'not_started', current_gate: 'hitl1_recorded', next_gate: 'setup_ready', current_node: 'phases/phase-hitl1.md' }));
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [] })); writeFileSync(join(dir, 'rb_trace.jsonl'), '');
  return dir;
}
function rerunBundle(label = 'topic-rerun', legacy = false) {
  const dir = bundle(label);
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'in_progress', current_gate: 'hitl2_recorded', next_gate: 'rerun_ready', current_node: 'phases/phase-rerun.md' }));
  writeFileSync(join(dir, 'rb_trace.jsonl'), [
    { event: 'gate_attempt', gate: 'hitl2-recorded', currentNodeRef: 'phases/phase-hitl2.md', passed: true, next: 'phases/phase-rerun.md' },
    { event: 'load_complete', entry: 'phases/phase-rerun.md', handoff_source_gate: 'hitl2-recorded', handoff_source_node: 'phases/phase-hitl2.md', handoff_target_node: 'phases/phase-rerun.md', handoff_source_attempt_index: 0 },
  ].map(JSON.stringify).join('\n') + '\n');
  if (legacy) writeFileSync(join(dir, 'rb_plan.md'), '---\nplan_basename: test\nderived_topic_count: 1\ntopic_registry:\n  - id: "01"\n    slug: 01_old\n    title: Old\n---\n# Plan\n');
  return dir;
}
function authorizeRerun(dir) {
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'in_progress', current_gate: 'hitl2_recorded', next_gate: 'rerun_ready', current_node: 'phases/phase-rerun.md' }));
  writeFileSync(join(dir, 'rb_trace.jsonl'), [
    { event: 'gate_attempt', gate: 'hitl2-recorded', currentNodeRef: 'phases/phase-hitl2.md', passed: true, next: 'phases/phase-rerun.md' },
    { event: 'load_complete', entry: 'phases/phase-rerun.md', handoff_source_gate: 'hitl2-recorded', handoff_source_node: 'phases/phase-hitl2.md', handoff_target_node: 'phases/phase-rerun.md', handoff_source_attempt_index: 0 },
  ].map(JSON.stringify).join('\n') + '\n');
}
function authorizeSeedTopics(dir) {
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'in_progress', current_gate: 'setup_ready', next_gate: 'seed_topics_ready', current_node: 'phases/phase-setup.md' }));
  writeGateAttempt(dir, {
    check: { passed: true, gate: 'setup-ready', currentNodeRef: 'phases/phase-setup.md', next: 'phases/phase-seed-topics.md', failed_rule_ids: [] },
    routing: { kind: 'next', next: 'phases/phase-seed-topics.md' },
    inspect: [], advice: [],
  }, { setupReadyStaged: true });
  const entered = spawnSync('node', ['DPT_FRAMEWORK/cli/enter-phase.mjs', '--bundle', dir, '--node', 'phases/phase-seed-topics.md'], { encoding: 'utf8' });
  assert.equal(entered.status, 0, entered.stderr);
}
const input = { context: 'hitl1', actions: [{ action: 'add_topic', title: 'Topic A', slug_stem: 'topic-a', must_answer: ['What?'], scope_role: 'primary', depends_on_topic_uids: [] }] };
const SEED_HEADINGS = [
  '## 主题定位',
  '## 初始假设、缺口或张力',
  '## why now',
  '## 为什么对最终交付物重要',
  '## 下游位置（可选）',
  '## ═══ 研究轮次追加区 ═══',
  '## 历史摘要',
  '## 本轮新增证据',
  '## 本轮新增机制理解',
  '## 本轮新增趋势与难点',
  '## 当前判断',
  '## 待验证问题',
];
const SEED_BACKFILL_TOKENS = [
  '__BACKFILL_WAVE0_EVIDENCE__',
  '__BACKFILL_WAVE1_MECHANISMS__',
  '__BACKFILL_WAVE1_TRENDS__',
  '__BACKFILL_WAVE2_JUDGMENT__',
  '__BACKFILL_PENDING_QUESTIONS__',
];

function seedBody(raw) {
  return raw.replace(/^---\n[\s\S]*?\n---\n/, '');
}

function assertCompleteSeedSkeleton(raw) {
  const body = seedBody(raw);
  for (const heading of SEED_HEADINGS) assert.ok(body.includes(heading), `missing ${heading}`);
  for (const token of SEED_BACKFILL_TOKENS) {
    assert.equal(body.split(token).length - 1, 1, `${token} must appear exactly once`);
  }
  assert.doesNotMatch(body, /__BACKFILL_(?:EVIDENCE|MECHANISM|TRENDS|JUDGMENT|QUESTIONS|PREVIOUS_SUMMARY)__/);
  assert.doesNotMatch(body, /__FILL_[A-Z0-9_]+__/);
  assert.doesNotMatch(body, /## 主题定位\s+primary\s/);
}

function writeRerunProfile(dir, rerunCount = 0) {
  writeFileSync(join(dir, 'rb_profile.yaml'), `human_decision_checkpoints:\n  hitl2:\n    rerun_count: ${rerunCount}\n`);
}

function directionCandidate({ count = 1, action = 'supplement' } = {}) {
  return {
    rerun_count: count,
    action,
    new_search_dimensions: 'cost and failure modes',
    adjusted_depth: 'compare operating models',
    search_guardrails: 'retain primary sources',
    rationale_excerpt: 'user requested an additional comparison',
  };
}

describe('canonical topic state', () => {
  it('exposes focused seed bindings without progress or workspace evaluation', () => {
    const dir = bundle('topic-seed-binding');
    applyCanonicalTopicState({ bundlePath: dir, input });
    const inspected = inspectCanonicalTopicState({ bundlePath: dir });
    const plan = parseYaml(readFileSync(join(dir, 'rb_plan.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]);
    const focused = evaluateCanonicalSeedBindings(dir, plan);
    assert.equal(focused[0].ok, true);
    rmSync(join(dir, `seed_topics/${focused[0].slug}.md`));
    assert.equal(evaluateCanonicalSeedBindings(dir, plan)[0].reason_code, 'seed_missing');
    assert.equal(inspected.topics[0].topic_uid, focused[0].topic_uid);
  });
  it('atomically adds registry and UID-bound seed', () => {
    const dir = bundle(); const result = applyCanonicalTopicState({ bundlePath: dir, input });
    assert.equal(result.verdict, 'committed'); const inspected = inspectCanonicalTopicState({ bundlePath: dir });
    assert.equal(inspected.mode, 'canonical'); assert.equal(inspected.topics[0].state, 'not_started'); assert.equal(inspected.passed, true);
    assert.match(inspected.plan_sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(inspected.layout_baseline.topics[0], { topic_uid: inspected.topics[0].topic_uid, title: 'Topic A', slug_stem: 'topic-a' });
  });
  it('renders the complete shared seed skeleton for HITL1 and rerun add_topic', () => {
    const hitl1 = bundle('topic-seed-hitl1');
    applyCanonicalTopicState({ bundlePath: hitl1, input });
    const hitl1Seed = readFileSync(join(hitl1, 'seed_topics/01_topic-a.md'), 'utf8');
    assertCompleteSeedSkeleton(hitl1Seed);

    const rerun = rerunBundle('topic-seed-rerun');
    writeRerunProfile(rerun);
    applyCanonicalTopicState({ bundlePath: rerun, input: { context: 'rerun', actions: [{ ...input.actions[0], direction: directionCandidate({ action: 'add' }) }] } });
    const rerunSeed = readFileSync(join(rerun, 'seed_topics/01_topic-a.md'), 'utf8');
    assertCompleteSeedSkeleton(rerunSeed);
    assert.match(seedBody(rerunSeed), /## 本轮重跑方向/);
    assert.ok(seedBody(rerunSeed).startsWith(seedBody(hitl1Seed)));
  });
  it('keeps the renderer appendix structurally aligned with the shared seed authoring contract', () => {
    const dir = bundle('topic-seed-shared-parity');
    applyCanonicalTopicState({ bundlePath: dir, input });
    const rendered = seedBody(readFileSync(join(dir, 'seed_topics/01_topic-a.md'), 'utf8'));
    const contract = readFileSync('DPT_FRAMEWORK/workflows/nodes/shared/shared-seed-topic-authoring.md', 'utf8');
    const appendix = contract.slice(contract.indexOf('## ═══ 研究轮次追加区 ═══'));
    const headings = appendix.split(/\r?\n/)
      .filter((line) => SEED_HEADINGS.includes(line));
    const tokens = [...contract.matchAll(/__BACKFILL_[A-Z0-9_]+__/g)].map((match) => match[0]);
    assert.deepEqual(headings, SEED_HEADINGS.slice(5));
    assert.deepEqual(tokens, SEED_BACKFILL_TOKENS);
    for (const heading of headings) assert.ok(rendered.includes(heading), heading);
    for (const token of tokens) assert.equal(rendered.split(token).length - 1, 1, token);
  });
  it('renders the same complete skeleton for migrate_legacy seed_binding:new', () => {
    const dir = rerunBundle('topic-seed-migration', true);
    const migration = { context: 'rerun', action: 'migrate_legacy', entries: [{
      source: 'registry', id: '01', slug: '01_old', title: 'Old', must_answer: ['Old?'],
      scope_role: 'primary', depends_on_slugs: [], seed_binding: 'new',
    }] };
    assert.equal(applyCanonicalTopicState({ bundlePath: dir, input: migration }).verdict, 'committed');
    assertCompleteSeedSkeleton(readFileSync(join(dir, 'seed_topics/01_old.md'), 'utf8'));
  });
  it('preserves existing enrichment frontmatter and body while canonical intent changes', () => {
    const dir = bundle('topic-seed-preserve');
    applyCanonicalTopicState({ bundlePath: dir, input });
    const topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0];
    const seedPath = join(dir, `seed_topics/${topic.slug}.md`);
    const enriched = readFileSync(seedPath, 'utf8')
      .replace('depends_on_topic_uids: []', 'depends_on_topic_uids: []\ncustom_enrichment: keep-me')
      .replace('pending — seed-topics Agent must enrich this section.', 'Preserved positioning narrative.');
    writeFileSync(seedPath, enriched);
    const update = { context: 'hitl1', actions: [{
      action: 'update_intent', topic_uid: topic.topic_uid, title: 'Topic A revised',
      must_answer: ['Why now?'], scope_role: 'comparison', depends_on_topic_uids: [],
    }] };
    assert.equal(applyCanonicalTopicState({ bundlePath: dir, input: update }).verdict, 'committed');
    const updated = readFileSync(seedPath, 'utf8');
    assert.match(updated, /custom_enrichment: keep-me/);
    assert.match(updated, /Preserved positioning narrative\./);
    assert.match(updated, /title: Topic A revised/);
    assert.match(updated, /scope_role: comparison/);
  });
  it('round-trips parsed canonical values and preserves the exact enrichment body suffix', () => {
    const dir = bundle('topic-seed-enrichment-suffix');
    const specialInput = {
      context: 'hitl1',
      actions: [{
        ...input.actions[0],
        must_answer: ['quoted: "value"', 'first line\nsecond line', 'CJK Unicode: 研究 cafe\u0301'],
      }],
    };
    applyCanonicalTopicState({ bundlePath: dir, input: specialInput });
    const topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0];
    const seedPath = join(dir, `seed_topics/${topic.slug}.md`);
    const initial = readFileSync(seedPath, 'utf8');
    const initialFrontmatter = parseYaml(initial.match(/^---\n([\s\S]*?)\n---/)[1]);
    assert.deepEqual(initialFrontmatter.must_answer, specialInput.actions[0].must_answer);
    const header = initial.match(/^---\n[\s\S]*?\n---\n/)[0];
    const suffix = '\n# Agent-authored positioning\n\n## must_answer\n\nlegacy duplicate prose\n\n## ═══ 研究轮次追加区 ═══\n__BACKFILL_WAVE0_EVIDENCE__\n\n## 本轮重跑方向\n\n- retained direction\n';
    writeFileSync(seedPath, `${header}${suffix}`);
    const planBefore = readFileSync(join(dir, 'rb_plan.md'), 'utf8');
    authorizeSeedTopics(dir);
    const result = applyCanonicalTopicState({
      bundlePath: dir,
      input: {
        context: 'seed_topics', action: 'enrich_seed', topic_uid: topic.topic_uid,
        enrichment: {
          hypothesis: 'quoted: hypothesis', in_scope: 'scope: narrow', out_of_scope: 'exclude: broad',
          search_guardrails: { required_terms: ['CJK', 'multi\nline'], forbidden_broadening: ['summary'] },
          evidence_route: { preferred_sources: ['primary: record'], noise_to_avoid: ['aggregator'] },
        },
      },
    });
    assert.equal(result.verdict, 'committed');
    assert.equal(result.binding_repair, null);
    const enriched = readFileSync(seedPath, 'utf8');
    const enrichedHeader = enriched.match(/^---\n[\s\S]*?\n---\n/)[0];
    assert.equal(enriched.slice(enrichedHeader.length), suffix);
    assert.equal(readFileSync(join(dir, 'rb_plan.md'), 'utf8'), planBefore);
    const frontmatter = parseYaml(enriched.match(/^---\n([\s\S]*?)\n---/)[1]);
    assert.deepEqual(frontmatter.must_answer, specialInput.actions[0].must_answer);
    assert.deepEqual(frontmatter.search_guardrails.required_terms, ['CJK', 'multi\nline']);
  });
  it('rejects forged lifecycle context without writes', () => {
    const dir = bundle(); const before = readFileSync(join(dir, 'rb_plan.md'), 'utf8');
    const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'))); status.current_node = 'phases/phase-final.md'; writeFileSync(join(dir, 'rb_status.json'), JSON.stringify(status));
    const result = applyCanonicalTopicState({ bundlePath: dir, input }); assert.equal(result.verdict, 'blocked'); assert.equal(readFileSync(join(dir, 'rb_plan.md'), 'utf8'), before);
  });
  it('keeps generic inspect diagnostic-only when a seed binding drifts', () => {
    const dir = bundle('topic-inspect-no-writer');
    applyCanonicalTopicState({ bundlePath: dir, input });
    const seedPath = join(dir, 'seed_topics/01_topic-a.md');
    writeFileSync(seedPath, readFileSync(seedPath, 'utf8').replace('title: Topic A', 'title: drifted'));
    const inspected = inspectCanonicalTopicState({ bundlePath: dir });
    assert.equal(inspected.passed, false);
    assert.equal(inspected.blockers[0].finding.repair_kind, 'missing_contract');
    assert.doesNotMatch(JSON.stringify(inspected), /enrich_seed|operate-topic-state\.mjs apply/);
  });
  it('redirects imperative layout actions to the complete sanctioned target without writes', () => {
    const dir = bundle('topic-imperative-layout');
    const before = snapshotTree(dir);
    const result = applyCanonicalTopicState({ bundlePath: dir, input: { context: 'rerun', action: 'rename' } });
    assert.equal(result.reason_code, 'layout_mutation_not_supported');
    assert.match(result.reason, /complete mutate_layout target/);
    assert.match(result.recommended_action, /Run inspect/);
    assert.deepEqual(diffSnapshots(before, snapshotTree(dir)), []);
  });
  it('recovers exact staged bytes after plan commit crash', () => {
    const dir = bundle(); let operationId;
    try { applyCanonicalTopicState({ bundlePath: dir, input, crashAt: 'after_plan' }); } catch {}
    const inspected = inspectCanonicalTopicState({ bundlePath: dir }); operationId = inspected.blockers[0].operation_id;
    assert.equal(recoverCanonicalTopicState({ bundlePath: dir, operationId }).verdict, 'committed'); assert.equal(inspectCanonicalTopicState({ bundlePath: dir }).passed, true);
  });
  it('does not overclaim a pre-prepared crash', () => {
    const dir = bundle(); try { applyCanonicalTopicState({ bundlePath: dir, input, crashAt: 'before_prepared' }); } catch {}
    assert.equal(inspectCanonicalTopicState({ bundlePath: dir }).mode, 'canonical');
  });
  it('authorizes explicit rerun migration and external adoption', () => {
    const dir = rerunBundle('topic-migrate', true);
    writeFileSync(join(dir, 'seed_topics/01_old.md'), '---\nid: "01"\nslug: 01_old\ntitle: Old\n---\n# Old\n');
    writeFileSync(join(dir, 'seed_topics/02_external.md'), '---\nid: "02"\nslug: 02_external\ntitle: External\n---\n# External\n');
    const migration = { context: 'rerun', action: 'migrate_legacy', entries: [
      { source: 'registry', id: '01', slug: '01_old', title: 'Old', must_answer: ['Old?'], scope_role: 'primary', depends_on_slugs: [], seed_binding: 'existing' },
      { source: 'adopt', id: '02', slug: '02_external', title: 'External', must_answer: ['External?'], scope_role: 'supporting', depends_on_slugs: ['01_old'], seed_binding: 'existing' },
    ] };
    assert.equal(applyCanonicalTopicState({ bundlePath: dir, input: migration }).verdict, 'committed');
    const inspected = inspectCanonicalTopicState({ bundlePath: dir }); assert.equal(inspected.mode, 'canonical'); assert.equal(inspected.topics.length, 2);
  });
  it('blocks missing rerun witness and post-final fresh apply', () => {
    const rerun = rerunBundle('topic-no-witness'); writeFileSync(join(rerun, 'rb_trace.jsonl'), ''); writeRerunProfile(rerun);
    const rerunInput = { context: 'rerun', actions: [{ ...input.actions[0], direction: directionCandidate({ action: 'add' }) }] };
    assert.equal(applyCanonicalTopicState({ bundlePath: rerun, input: rerunInput }).reason_code, 'rerun_not_authorized');
    const final = bundle('topic-final'); const status = JSON.parse(readFileSync(join(final, 'rb_status.json'))); status.current_node = 'phases/phase-final.md'; writeFileSync(join(final, 'rb_status.json'), JSON.stringify(status));
    assert.equal(applyCanonicalTopicState({ bundlePath: final, input }).reason_code, 'hitl1_not_authorized');
  });
  it('blocks active owner before intent mutation', () => {
    const dir = bundle('topic-active'); applyCanonicalTopicState({ bundlePath: dir, input });
    const inspected = inspectCanonicalTopicState({ bundlePath: dir }); const topic = inspected.topics[0];
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [{ queue_item_id: 'q1', status: 'queued', payload: { topic_slug: topic.slug } }], refill_pool: [] }));
    const update = { context: 'hitl1', actions: [{ action: 'update_intent', topic_uid: topic.topic_uid, title: 'Updated', must_answer: ['Why?'], scope_role: 'primary', depends_on_topic_uids: [] }] };
    assert.equal(applyCanonicalTopicState({ bundlePath: dir, input: update }).reason_code, 'active_topic_work');
  });
  it('mutates current layout while preserving UID, seed body and historical coordinate', () => {
    const dir = bundle('topic-layout');
    const two = { context: 'hitl1', actions: [input.actions[0], { ...input.actions[0], title: 'Topic B', slug_stem: 'topic-b', must_answer: ['B?'], scope_role: 'supporting' }] };
    applyCanonicalTopicState({ bundlePath: dir, input: two });
    const before = inspectCanonicalTopicState({ bundlePath: dir });
    const [topicA, topicB] = before.topics;
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [{ queue_item_id: 'q-b', status: 'queued', payload: { topic_uid: topicB.topic_uid, topic_slug: topicB.slug } }], refill_pool: [] }));
    authorizeRerun(dir);
    const layout = { ...before.layout_baseline, topics: [
      { topic_uid: topicA.topic_uid, title: 'Topic A revised', slug_stem: 'topic-a-new' },
      before.layout_baseline.topics[1],
    ] };
    const applied = applyCanonicalTopicState({ bundlePath: dir, input: layout });
    assert.equal(applied.verdict, 'committed');
    const plan = readFileSync(join(dir, 'rb_plan.md'), 'utf8');
    assert.match(plan, /slug: 01_topic-a-new/);
    assert.match(plan, /slug: 01_topic-a/);
    assert.equal(existsSync(join(dir, 'seed_topics/01_topic-a-new.md')), true);
    assert.equal(existsSync(join(dir, 'seed_topics/01_topic-a.md')), false);
    assert.equal(existsSync(join(dir, 'seed_topics/02_topic-b.md')), true);
  });
  it('refreshes a standard Topic Registry table and preserves a nonstandard body with advisory', () => {
    const standard = bundle('topic-layout-table'); applyCanonicalTopicState({ bundlePath: standard, input });
    let planPath = join(standard, 'rb_plan.md');
    writeFileSync(planPath, `${readFileSync(planPath, 'utf8')}\n## Topic Registry\n\n| # | Slug | Title | Status |\n|---|------|-------|--------|\n| 01 | 01_topic-a | Topic A | researching |\n\n## Constraints\n`);
    authorizeRerun(standard); let inspected = inspectCanonicalTopicState({ bundlePath: standard });
    let result = applyCanonicalTopicState({ bundlePath: standard, input: { ...inspected.layout_baseline, topics: [{ ...inspected.layout_baseline.topics[0], title: 'Renamed', slug_stem: 'renamed' }] } });
    assert.equal(result.advisory, null);
    const rendered = readFileSync(planPath, 'utf8');
    assert.match(rendered, /\| 01 \| 01_renamed \| Renamed \| researching \|/);
    assert.doesNotMatch(rendered, /01_topic-a \| Topic A/);

    const nonstandard = bundle('topic-layout-table-nonstandard'); applyCanonicalTopicState({ bundlePath: nonstandard, input });
    planPath = join(nonstandard, 'rb_plan.md'); const marker = '\n## Topic Registry\n\nCustom prose stays.\n'; writeFileSync(planPath, `${readFileSync(planPath, 'utf8')}${marker}`);
    authorizeRerun(nonstandard); inspected = inspectCanonicalTopicState({ bundlePath: nonstandard });
    result = applyCanonicalTopicState({ bundlePath: nonstandard, input: { ...inspected.layout_baseline, topics: [{ ...inspected.layout_baseline.topics[0], title: 'Changed' }] } });
    assert.equal(result.advisory, 'topic_registry_table_nonstandard');
    assert.match(readFileSync(planPath, 'utf8'), /Custom prose stays\./);
  });
  it('blocks changed active UID, returns unchanged for a repeated target, and recovers mid-seed crash', () => {
    const activeDir = bundle('topic-layout-active'); applyCanonicalTopicState({ bundlePath: activeDir, input });
    let inspected = inspectCanonicalTopicState({ bundlePath: activeDir }); const topic = inspected.topics[0]; authorizeRerun(activeDir);
    writeFileSync(join(activeDir, 'rb_queue.json'), JSON.stringify({ active_window: [{ queue_item_id: 'q-a', status: 'queued', payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug } }], refill_pool: [] }));
    const changed = { ...inspected.layout_baseline, topics: [{ topic_uid: topic.topic_uid, title: 'Changed', slug_stem: 'changed' }] };
    assert.equal(applyCanonicalTopicState({ bundlePath: activeDir, input: changed }).reason_code, 'active_topic_work');

    const noOpDir = bundle('topic-layout-noop'); applyCanonicalTopicState({ bundlePath: noOpDir, input }); authorizeRerun(noOpDir);
    inspected = inspectCanonicalTopicState({ bundlePath: noOpDir });
    assert.equal(applyCanonicalTopicState({ bundlePath: noOpDir, input: inspected.layout_baseline }).verdict, 'unchanged');
    assert.deepEqual(readdirSync(join(noOpDir, '_diagnostics/topic-state')), []);

    const crashDir = bundle('topic-layout-crash'); applyCanonicalTopicState({ bundlePath: crashDir, input }); authorizeRerun(crashDir);
    inspected = inspectCanonicalTopicState({ bundlePath: crashDir });
    const crashInput = { ...inspected.layout_baseline, topics: [{ ...inspected.layout_baseline.topics[0], slug_stem: 'renamed' }] };
    try { applyCanonicalTopicState({ bundlePath: crashDir, input: crashInput, crashAt: 'after_first_seed' }); } catch {}
    const blocked = inspectCanonicalTopicState({ bundlePath: crashDir });
    assert.equal(blocked.blockers[0].reason_code, 'accepted_workspace');
    assert.equal(recoverCanonicalTopicState({ bundlePath: crashDir, operationId: blocked.blockers[0].operation_id }).verdict, 'committed');
    assert.equal(existsSync(join(crashDir, 'seed_topics/01_renamed.md')), true);
    assert.equal(existsSync(join(crashDir, 'seed_topics/01_topic-a.md')), false);
  });
  it('safely removes only an unstarted dependency-free topic and names style follow-up', () => {
    const dir = bundle('topic-layout-remove');
    applyCanonicalTopicState({ bundlePath: dir, input: { context: 'hitl1', actions: [input.actions[0], { ...input.actions[0], title: 'Topic B', slug_stem: 'topic-b', must_answer: ['B?'] }] } });
    authorizeRerun(dir);
    const inspected = inspectCanonicalTopicState({ bundlePath: dir });
    const remove = { ...inspected.layout_baseline, topics: [inspected.layout_baseline.topics[0]], remove_topic_uids: [inspected.topics[1].topic_uid] };
    const applied = applyCanonicalTopicState({ bundlePath: dir, input: remove });
    assert.equal(applied.verdict, 'committed');
    assert.equal(applied.follow_up, 'recompute_research_style');
    assert.equal(existsSync(join(dir, 'seed_topics/02_topic-b.md')), false);
    assert.equal(inspectCanonicalTopicState({ bundlePath: dir }).topics.length, 1);
  });
  it('blocks safe remove for terminal queue history and inbound dependency before workspace', () => {
    const historyDir = bundle('topic-layout-remove-history');
    applyCanonicalTopicState({ bundlePath: historyDir, input }); authorizeRerun(historyDir);
    let inspected = inspectCanonicalTopicState({ bundlePath: historyDir });
    writeFileSync(join(historyDir, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [], terminal_history: [{ queue_item_id: 'q-old', item: { payload: { topic_uid: inspected.topics[0].topic_uid, topic_slug: inspected.topics[0].slug } } }] }));
    let remove = { ...inspected.layout_baseline, topics: [], remove_topic_uids: [inspected.topics[0].topic_uid] };
    assert.equal(applyCanonicalTopicState({ bundlePath: historyDir, input: remove }).reason_code, 'remove_has_history');

    const dependencyDir = bundle('topic-layout-remove-dependency');
    const second = { ...input.actions[0], title: 'Topic B', slug_stem: 'topic-b', must_answer: ['B?'] };
    applyCanonicalTopicState({ bundlePath: dependencyDir, input: { context: 'hitl1', actions: [input.actions[0], second] } });
    inspected = inspectCanonicalTopicState({ bundlePath: dependencyDir });
    const planPath = join(dependencyDir, 'rb_plan.md');
    writeFileSync(planPath, readFileSync(planPath, 'utf8').replace('depends_on_topic_uids: []\n  - topic_uid:', `depends_on_topic_uids:\n      - ${inspected.topics[1].topic_uid}\n  - topic_uid:`));
    authorizeRerun(dependencyDir); inspected = inspectCanonicalTopicState({ bundlePath: dependencyDir });
    remove = { ...inspected.layout_baseline, topics: [inspected.layout_baseline.topics[0]], remove_topic_uids: [inspected.topics[1].topic_uid] };
    assert.equal(applyCanonicalTopicState({ bundlePath: dependencyDir, input: remove }).reason_code, 'remove_has_dependents');
  });
  it('keeps historical outputs and immutable work authority byte-stable across a real mid-seed crash', () => {
    const dir = bundle('topic-layout-incident'); applyCanonicalTopicState({ bundlePath: dir, input });
    let inspected = inspectCanonicalTopicState({ bundlePath: dir }); const topic = inspected.topics[0];
    claimAndSubmitWorkUnit(dir, {
      queueItemId: 'q-history',
      queueItemOverrides: { payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug } },
      outputs: [{ path: `reference/${topic.slug}-source.md`, role: 'reference', source_url: 'https://example.com/history', source_slug: 'history', content: '# Historical source\n' }],
    });
    mkdirSync(join(dir, 'artifacts/wave0', topic.slug), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave0', topic.slug, 'source.yaml'), '[]\n');
    authorizeRerun(dir); inspected = inspectCanonicalTopicState({ bundlePath: dir });
    const retained = { ...inspected.layout_baseline, topics: [{ ...inspected.layout_baseline.topics[0], slug_stem: 'renamed' }] };
    const before = snapshotTree(dir);
    try { applyCanonicalTopicState({ bundlePath: dir, input: retained, crashAt: 'after_first_seed' }); } catch {}
    const afterCrash = snapshotTree(dir);
    const changed = diffSnapshots(before, afterCrash);
    assert.ok(changed.every((name) => name.startsWith('_diagnostics/topic-state/') || name === 'seed_topics/01_renamed.md'), changed.join('\n'));
    for (const stable of [`reference/${topic.slug}-source.md`, `artifacts/wave0/${topic.slug}/source.yaml`, 'rb_output_declarations.jsonl', '_work_units/_index.json']) {
      assert.equal(afterCrash.get(stable), before.get(stable), stable);
    }
    const blocked = inspectCanonicalTopicState({ bundlePath: dir });
    assert.equal(recoverCanonicalTopicState({ bundlePath: dir, operationId: blocked.blockers[0].operation_id }).verdict, 'committed');
    const afterRecover = snapshotTree(dir);
    for (const stable of [`reference/${topic.slug}-source.md`, `artifacts/wave0/${topic.slug}/source.yaml`, 'rb_output_declarations.jsonl', '_work_units/_index.json']) {
      assert.equal(afterRecover.get(stable), before.get(stable), stable);
    }
  });
  it('blocks late drift and missing staged bytes without overwrite', () => {
    const drift = bundle('topic-drift'); try { applyCanonicalTopicState({ bundlePath: drift, input, crashAt: 'after_prepared' }); } catch {}
    const op = inspectCanonicalTopicState({ bundlePath: drift }).blockers[0].operation_id; writeFileSync(join(drift, 'rb_plan.md'), 'late drift');
    assert.equal(recoverCanonicalTopicState({ bundlePath: drift, operationId: op }).reason_code, 'late_drift'); assert.equal(readFileSync(join(drift, 'rb_plan.md'), 'utf8'), 'late drift');
    const missing = bundle('topic-missing-stage'); try { applyCanonicalTopicState({ bundlePath: missing, input, crashAt: 'after_prepared' }); } catch {}
    const missingOp = inspectCanonicalTopicState({ bundlePath: missing }).blockers[0].operation_id; const staged = join(missing, '_diagnostics/topic-state', missingOp, 'staged'); rmSync(join(staged, readdirSync(staged)[0]));
    assert.equal(recoverCanonicalTopicState({ bundlePath: missing, operationId: missingOp }).reason_code, 'staged_file_missing');
  });
  it('projects progress only from direct queue, ledger and artifact facts', () => {
    const dir = bundle('topic-progress'); applyCanonicalTopicState({ bundlePath: dir, input });
    let topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0]; assert.equal(topic.state, 'not_started');
    writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({ active_window: [{ queue_item_id: 'q1', status: 'queued', payload: { topic_slug: topic.slug } }], refill_pool: [] }));
    topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0]; assert.equal(topic.state, 'in_progress');
    claimAndSubmitWorkUnit(dir, { queueItemId: 'q-submitted', queueItemOverrides: { payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug } } });
    mkdirSync(join(dir, 'artifacts/wave0', topic.slug), { recursive: true });
    topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0]; assert.equal(topic.state, 'complete');
    assert.equal(readdirSync(dir).some((name) => /progress/i.test(name)), false);
  });
  it('resolves submitted legacy slug snapshots through previous layout without serialized inference', () => {
    const dir = bundle('topic-history-progress'); applyCanonicalTopicState({ bundlePath: dir, input });
    const currentPlan = readFileSync(join(dir, 'rb_plan.md'), 'utf8');
    const topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0];
    const frontmatter = parseYaml(currentPlan.match(/^---\n([\s\S]*?)\n---/)?.[1]);
    const body = currentPlan.replace(/^---\n[\s\S]*?\n---\n?/, '');
    frontmatter.topic_registry[0].slug = '00_old-topic-a';
    frontmatter.topic_registry[0].previous_layouts = [];
    writeFileSync(join(dir, 'rb_plan.md'), `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body}`);
    claimAndSubmitWorkUnit(dir, { queueItemId: 'q-legacy', queueItemOverrides: { payload: { topic_uid: topic.topic_uid, topic_slug: '00_old-topic-a' } } });
    frontmatter.topic_registry[0].slug = topic.slug;
    frontmatter.topic_registry[0].previous_layouts = [{ id: '00', slug: '00_old-topic-a' }];
    writeFileSync(join(dir, 'rb_plan.md'), `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body}`);
    mkdirSync(join(dir, 'artifacts/wave0/00_old-topic-a'), { recursive: true });
    const inspected = inspectCanonicalTopicState({ bundlePath: dir });
    assert.equal(inspected.passed, true);
    assert.equal(inspected.topics[0].topic_uid, topic.topic_uid);
    assert.equal(inspected.topics[0].state, 'complete');
  });
  it('fails closed once when a submitted manifest has only free-text topic prose', () => {
    const dir = bundle('topic-unresolved-progress'); applyCanonicalTopicState({ bundlePath: dir, input });
    const topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0];
    const { record } = claimAndSubmitWorkUnit(dir, { queueItemId: 'q-unresolved', queueItemOverrides: { payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug, note: `about ${topic.slug}` } } });
    const manifestPath = join(dir, record.paths.work_unit_dir, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.queue_item.payload = { note: `about ${topic.slug}` };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const inspected = inspectCanonicalTopicState({ bundlePath: dir });
    assert.equal(inspected.passed, false);
    assert.equal(inspected.blockers.length, 1);
    assert.equal(inspected.blockers[0].reason_code, 'submitted_topic_binding_unresolved');
  });
  it('requires explicit adoption for registry-external legacy seed', () => {
    const dir = rerunBundle('topic-unaccounted', true); writeFileSync(join(dir, 'seed_topics/01_old.md'), '---\nid: "01"\nslug: 01_old\ntitle: Old\n---\n'); writeFileSync(join(dir, 'seed_topics/02_external.md'), '---\nid: "02"\nslug: 02_external\ntitle: External\n---\n');
    const migration = { context: 'rerun', action: 'migrate_legacy', entries: [{ source: 'registry', id: '01', slug: '01_old', title: 'Old', must_answer: ['Old?'], scope_role: 'primary', depends_on_slugs: [], seed_binding: 'existing' }] };
    assert.throws(() => applyCanonicalTopicState({ bundlePath: dir, input: migration }), /explicit adopt/);
  });
  it('recovers partial multi-seed and cleanup interruption', () => {
    const multi = bundle('topic-multi'); const multiInput = { context: 'hitl1', actions: [input.actions[0], { ...input.actions[0], title: 'Topic B', slug_stem: 'topic-b', must_answer: ['B?'] }] };
    try { applyCanonicalTopicState({ bundlePath: multi, input: multiInput, crashAt: 'after_first_seed' }); } catch {}
    let op = inspectCanonicalTopicState({ bundlePath: multi }).blockers[0].operation_id; assert.equal(recoverCanonicalTopicState({ bundlePath: multi, operationId: op }).verdict, 'committed'); assert.equal(inspectCanonicalTopicState({ bundlePath: multi }).topics.length, 2);
    const cleanup = bundle('topic-cleanup'); try { applyCanonicalTopicState({ bundlePath: cleanup, input, crashAt: 'before_cleanup' }); } catch {}
    op = inspectCanonicalTopicState({ bundlePath: cleanup }).blockers[0].operation_id; assert.equal(recoverCanonicalTopicState({ bundlePath: cleanup, operationId: op }).verdict, 'committed');
    const partial = bundle('topic-partial-cleanup');
    applyCanonicalTopicState({ bundlePath: partial, input: multiInput }); authorizeRerun(partial);
    const baseline = inspectCanonicalTopicState({ bundlePath: partial }).layout_baseline;
    const layout = { ...baseline, topics: baseline.topics.map((topic, index) => ({ ...topic, slug_stem: `renamed-${index + 1}` })) };
    try { applyCanonicalTopicState({ bundlePath: partial, input: layout, crashAt: 'after_first_cleanup' }); } catch {}
    op = inspectCanonicalTopicState({ bundlePath: partial }).blockers[0].operation_id;
    assert.equal(recoverCanonicalTopicState({ bundlePath: partial, operationId: op }).verdict, 'committed');
    assert.equal(existsSync(join(partial, 'seed_topics/01_topic-a.md')), false);
    assert.equal(existsSync(join(partial, 'seed_topics/02_topic-b.md')), false);
  });
  it('enforces same-device preparation and preserves authority boundaries', () => {
    const mismatch = bundle('topic-device'); assert.throws(() => applyCanonicalTopicState({ bundlePath: mismatch, input, forceDeviceMismatch: true }), /same device/);
    const dir = bundle('topic-snapshot'); const before = snapshotTree(dir); applyCanonicalTopicState({ bundlePath: dir, input }); const changed = diffSnapshots(before, snapshotTree(dir));
    assert.ok(changed.every((name) => name === 'rb_plan.md' || name.startsWith('seed_topics/') || name.startsWith('_diagnostics/')), changed.join('\n'));
    for (const forbidden of ['rb_profile.yaml', 'rb_status.json', 'rb_trace.jsonl', 'rb_queue.json']) assert.ok(!changed.includes(forbidden));
  });
  it('accepts only sanctioned rerun direction actions and atomically replaces one canonical section', () => {
    const dir = bundle('topic-direction-actions');
    applyCanonicalTopicState({ bundlePath: dir, input });
    const topic = inspectCanonicalTopicState({ bundlePath: dir }).topics[0];
    authorizeRerun(dir);
    writeRerunProfile(dir);

    const update = {
      context: 'rerun',
      actions: [{
        action: 'update_intent', topic_uid: topic.topic_uid, title: 'Topic A', must_answer: ['What?'],
        scope_role: 'primary', depends_on_topic_uids: [], direction: directionCandidate(),
      }],
    };
    assert.equal(applyCanonicalTopicState({ bundlePath: dir, input: update }).verdict, 'committed');
    const seedPath = join(dir, `seed_topics/${topic.slug}.md`);
    assert.equal((readFileSync(seedPath, 'utf8').match(/^## 本轮重跑方向$/gm) || []).length, 1);

    const directionOnly = { context: 'rerun', actions: [{ action: 'set_rerun_direction', topic_uid: topic.topic_uid, direction: directionCandidate() }] };
    assert.equal(applyCanonicalTopicState({ bundlePath: dir, input: directionOnly }).verdict, 'unchanged');
    for (const invalid of [
      { ...directionOnly, context: 'hitl1' },
      { context: 'rerun', actions: [...update.actions, ...directionOnly.actions] },
      { context: 'rerun', actions: [{ ...input.actions[0], direction: directionCandidate() }] },
      { context: 'hitl1', actions: [{ ...input.actions[0], direction: directionCandidate({ action: 'add' }) }] },
    ]) {
      assert.equal(applyCanonicalTopicState({ bundlePath: dir, input: invalid }).reason_code, 'input_invalid');
    }
    assert.throws(() => applyCanonicalTopicState({ bundlePath: dir, input: { ...directionOnly, actions: [{ ...directionOnly.actions[0], direction: directionCandidate({ count: 2 }) }] } }), /rerun direction count/);
  });
});
