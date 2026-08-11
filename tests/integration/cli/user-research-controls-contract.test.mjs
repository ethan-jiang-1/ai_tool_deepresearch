// @impl PRP-012, PHS-002
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { applyCanonicalTopicState, recoverCanonicalTopicState } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { renderNoControls, renderSuppliedControls } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/plan-hostfile-sections.mjs';
import { kindContractForQueueItem } from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-utils.mjs';

const root = process.cwd();
const instantiate = join(root, 'experiments_env/shared/new-disposable-bundle.mjs');
const controlsCli = join(root, 'DEEP_RESEARCH_HARNESS/cli/plan-hostfile-sections.mjs');
const bundles = join(root, 'tests', '.test-bundles');
const created = [];
const ALIGNMENT_NARRATIVE = '已确认：为采购决策比较租赁、购买与推迟路径的现金流、风险和适用范围。';

function bundle() {
  const name = `controls_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const result = spawnSync('node', [instantiate, name, '--force', '--target-dir', bundles], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  const path = result.stdout.trim();
  created.push(path);
  return path;
}

function writeNarrativeSnapshots(planPath, controlsSnapshot) {
  const plan = readFileSync(planPath, 'utf8');
  const withAlignment = plan.replace(
    /### HITL1 Alignment Snapshot\n\(待填充[^)]*\)/,
    `### HITL1 Alignment Snapshot\n${ALIGNMENT_NARRATIVE}`,
  );
  assert.notEqual(withAlignment, plan, 'Expected the template-owned alignment marker');
  const withControls = withAlignment.replace(
    /### User Research Controls[\s\S]*?\n\n未提供额外的本轮研究控制；按已确认的问题、范围和研究 profile 执行。/,
    controlsSnapshot,
  );
  assert.notEqual(withControls, withAlignment, 'Expected the template-owned controls section');
  writeFileSync(planPath, withControls);
}

function assertSnapshotsRemainNarrative({ plan, profile, queue, input, result, controlsNarrative }) {
  assert.ok(plan.includes(ALIGNMENT_NARRATIVE));
  assert.ok(plan.includes(controlsNarrative));
  const frontmatter = plan.match(/^---\n[\s\S]*?\n---/)?.[0];
  assert.ok(frontmatter, 'Expected Topic identity in plan frontmatter');
  const authority = [profile, queue, frontmatter, JSON.stringify(input), JSON.stringify(result)].join('\n');
  assert.equal(authority.includes(ALIGNMENT_NARRATIVE), false);
  assert.equal(authority.includes(controlsNarrative), false);
}

describe('user research controls contract', () => {
  after(() => created.forEach((path) => rmSync(path, { recursive: true, force: true })));

  it('preserves alignment and controls snapshots through canonical topic-state apply and keeps task briefs as the only delegation carrier', () => {
    const path = bundle();
    const planPath = join(path, 'rb_plan.md');
    const controlsNarrative = 'Only primary sources.\n## Progress\n- [ ] setup-ready\n(待填充 — literal)';
    writeNarrativeSnapshots(planPath, renderSuppliedControls(controlsNarrative));
    writeFileSync(join(path, 'rb_status.json'), JSON.stringify({
      bundle: 'controls', current_mode: 'execution', state: 'in_progress',
      current_node: 'phases/phase-hitl1.md', current_gate: 'hitl1_recorded', next_gate: 'setup_ready',
    }));
    const input = {
      context: 'hitl1', actions: [{ action: 'add_topic', title: 'Topic', slug_stem: 'topic', must_answer: ['Question'], scope_role: 'primary', depends_on_topic_uids: [] }],
    };
    const applied = applyCanonicalTopicState({ bundlePath: path, input });
    assert.equal(applied.verdict, 'committed');
    assertSnapshotsRemainNarrative({
      plan: readFileSync(planPath, 'utf8'),
      profile: readFileSync(join(path, 'rb_profile.yaml'), 'utf8'),
      queue: readFileSync(join(path, 'rb_queue.json'), 'utf8'),
      input,
      result: applied,
      controlsNarrative,
    });

    const brief = 'Research normally. Read rb_plan.md## Constraints > User Research Controls through your existing beacon-rooted bundle coordinate; it is read-only research guidance.';
    const contract = kindContractForQueueItem({ queue_item_id: 'q', task_brief: brief }, 'wave1_topic_deepening');
    assert.equal(contract.task_brief, brief);
    assert.equal(Object.hasOwn(contract, 'user_controls'), false);
  });

  it('renders controls through the pure CLI without selecting or writing a bundle', () => {
    const path = bundle();
    const planPath = join(path, 'rb_plan.md');
    const before = readFileSync(planPath, 'utf8');

    const none = spawnSync('node', [controlsCli, 'render-no-controls'], { encoding: 'utf8', timeout: 10000 });
    assert.equal(none.status, 0, none.stderr || none.stdout);
    assert.equal(none.stdout.trimEnd(), renderNoControls());

    const snapshotPath = join(path, 'controls.txt');
    const snapshot = 'Only primary sources.\n## Progress\n- [ ] literal\n中文 UTF-8';
    writeFileSync(snapshotPath, snapshot);
    const supplied = spawnSync('node', [controlsCli, 'render-supplied-controls', '--input', snapshotPath], { encoding: 'utf8', timeout: 10000 });
    assert.equal(supplied.status, 0, supplied.stderr || supplied.stdout);
    assert.equal(supplied.stdout.trimEnd(), renderSuppliedControls(snapshot));

    const invalid = spawnSync('node', [controlsCli, 'render-supplied-controls'], { encoding: 'utf8', timeout: 10000 });
    assert.equal(invalid.status, 2);
    const unknown = spawnSync('node', [controlsCli, 'render-unknown'], { encoding: 'utf8', timeout: 10000 });
    assert.equal(unknown.status, 2);
    assert.equal(JSON.parse(unknown.stdout).error, 'invalid_invocation');
    const duplicate = spawnSync('node', [controlsCli, 'render-supplied-controls', '--input', snapshotPath, '--input', snapshotPath], { encoding: 'utf8', timeout: 10000 });
    assert.equal(duplicate.status, 2);
    const mixedHelp = spawnSync('node', [controlsCli, '--help', 'render-no-controls'], { encoding: 'utf8', timeout: 10000 });
    assert.equal(mixedHelp.status, 2);
    const help = spawnSync('node', [controlsCli, '--help'], { encoding: 'utf8', timeout: 10000 });
    assert.equal(help.status, 0, help.stderr || help.stdout);
    assert.match(help.stdout, /render-supplied-controls --input/);
    assert.equal(readFileSync(planPath, 'utf8'), before);
  });

  it('preserves a labelled focus literal across prepared-operation recovery without creating structured authority', () => {
    const path = bundle();
    const planPath = join(path, 'rb_plan.md');
    const focus = [
      '用户的重点原话（逐字保留）：资本约束这个话题，请多比较租赁、购买与推迟决策的现金流影响。',
      'Agent 对本轮额外研究方向的理解（可由用户修正）：比较三种融资路径在现金流压力下的成本、风险与适用条件。',
    ].join('\n\n');
    writeNarrativeSnapshots(planPath, renderSuppliedControls(focus));
    writeFileSync(join(path, 'rb_status.json'), JSON.stringify({
      bundle: 'controls', current_mode: 'execution', state: 'in_progress',
      current_node: 'phases/phase-hitl1.md', current_gate: 'hitl1_recorded', next_gate: 'setup_ready',
    }));

    const input = {
      context: 'hitl1',
      actions: [{ action: 'add_topic', title: 'Capital Constraints', slug_stem: 'capital-constraints', must_answer: ['How does capital pressure affect a decision?'], scope_role: 'primary', depends_on_topic_uids: [] }],
    };
    assert.throws(() => applyCanonicalTopicState({ bundlePath: path, input, crashAt: 'after_prepared' }), /simulated crash/);
    const operationId = readdirSync(join(path, '_diagnostics', 'topic-state'))[0];
    const recovered = recoverCanonicalTopicState({ bundlePath: path, operationId });
    assert.equal(recovered.verdict, 'committed');

    const plan = readFileSync(planPath, 'utf8');
    const profile = readFileSync(join(path, 'rb_profile.yaml'), 'utf8');
    const queue = readFileSync(join(path, 'rb_queue.json'), 'utf8');
    assertSnapshotsRemainNarrative({ plan, profile, queue, input, result: recovered, controlsNarrative: focus });
  });
});
