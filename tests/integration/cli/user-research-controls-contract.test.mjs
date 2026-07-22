import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { applyCanonicalTopicState } from '../../../DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';
import { renderSuppliedControls } from '../../../DPT_FRAMEWORK/engine/helpers/plan-hostfile-sections.mjs';
import { kindContractForQueueItem } from '../../../DPT_FRAMEWORK/engine/work-unit-utils.mjs';

const root = process.cwd();
const instantiate = join(root, 'experiments_env/shared/new-disposable-bundle.mjs');
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
});
