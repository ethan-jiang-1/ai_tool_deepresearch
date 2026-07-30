import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { applyCanonicalTopicState } from '../../../DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';
import { renderNoControls, renderSuppliedControls } from '../../../DPT_FRAMEWORK/engine/helpers/plan-hostfile-sections.mjs';
import { kindContractForQueueItem } from '../../../DPT_FRAMEWORK/engine/work-unit-utils.mjs';

const root = process.cwd();
const instantiate = join(root, 'experiments_env/shared/new-disposable-bundle.mjs');
const controlsCli = join(root, 'DPT_FRAMEWORK/cli/plan-hostfile-sections.mjs');
const bundles = join(root, 'tests', '.test-bundles');
const created = [];

function bundle() {
  const name = `controls_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const result = spawnSync('node', [instantiate, name, '--force', '--target-dir', bundles], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  const path = result.stdout.trim();
  created.push(path);
  return path;
}

describe('user research controls contract', () => {
  after(() => created.forEach((path) => rmSync(path, { recursive: true, force: true })));

  it('preserves the host-file snapshot through canonical topic-state apply and keeps task briefs as the only delegation carrier', () => {
    const path = bundle();
    const planPath = join(path, 'rb_plan.md');
    const snapshot = renderSuppliedControls('Only primary sources.\n## Progress\n- [ ] setup-ready\n(待填充 — literal)');
    writeFileSync(planPath, readFileSync(planPath, 'utf8').replace(/### User Research Controls[\s\S]*?\n\n未提供额外的本轮研究控制；按已确认的问题、范围和研究 profile 执行。/, snapshot));
    writeFileSync(join(path, 'rb_status.json'), JSON.stringify({
      bundle: 'controls', current_mode: 'execution', state: 'in_progress',
      current_node: 'phases/phase-hitl1.md', current_gate: 'hitl1_recorded', next_gate: 'setup_ready',
    }));
    const applied = applyCanonicalTopicState({ bundlePath: path, input: {
      context: 'hitl1', actions: [{ action: 'add_topic', title: 'Topic', slug_stem: 'topic', must_answer: ['Question'], scope_role: 'primary', depends_on_topic_uids: [] }],
    } });
    assert.equal(applied.verdict, 'committed');
    assert.match(readFileSync(planPath, 'utf8'), /Only primary sources\./);
    assert.match(readFileSync(planPath, 'utf8'), /\(待填充 — literal\)/);

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
});
