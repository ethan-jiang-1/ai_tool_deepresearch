---
schema: command-experiment/v2
experiment: agentic-queue
case: case-42-standard-urgent-preemption
case_goal: "验证 queue v2 满 active_window、refill_pool、urgent preemption 和 displaced tail restore。"
verdict_mode: all
required_checks: [completion_feedback, full_window_pool, preempt_displaced_tail, restore_refill]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: AGQ-006, AGQ-019
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中逐步执行。实验结果必须来自实际 Queue Manager API 调用、bundle-root `rb_queue.json`、projection 文件和 trace `check` events；禁止 mock 返回、伪造 trace，或把旧 named slot state 当作证明。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| Runtime context | disposable bundle，`new-disposable-bundle.mjs` 创建 |
| Framework path | `queue-manager.mjs` API：`enqueue`, `preempt`, `complete`, `loadQueue`, `saveQueue` |
| Fixture input | task cards 在 playbook 内构造，使用 queue v2 `queue_item_id` |
| Agent actor | 无，fixture-backed Engine case |
| External calls | 无 |
| Verdict source | bundle-root `rb_trace.jsonl` `check` events |
| 不证明 | Agent priority 判断、delegated work-unit submit |

# case-42-standard-urgent-preemption

验证 ordered `active_window` 达到 `QUEUE_ACTIVE_WINDOW_LIMIT` 后，下一项进入 `refill_pool`；urgent preemption 在运行中的 front item 之后插入，尾部 displaced item 以 restore metadata 回到 pool；front 完成后，urgent promotion 到 front，displaced tail 回填窗口尾部。

## Expected Runtime Path

1. 创建 disposable bundle，validate + inspect
2. Enqueue：填满 `active_window` 并放入一个 pool item
3. Claim + Preempt：front item running，urgent 插到 `active_window[1]`，尾部 displaced 到 pool
4. Complete：完成 front item，触发 promote + refill
5. Verify：urgent 在 `active_window[0]`，displaced item 回到 window tail
6. 从 trace 裁决
7. PASS 后清理

## Step 1: 创建 disposable runtime context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs agq_preempt --case case-42 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$B"
node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs "$B"
```

-> 预期：bundle 创建成功，control files 有效。

## Step 2.1: Enqueue

入队 `QUEUE_ACTIVE_WINDOW_LIMIT + 1` 个 task cards：前 N 个进入 ordered `active_window`，最后一个进入 `refill_pool`。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { writeFileSync } from 'node:fs';
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import {
  QUEUE_ACTIVE_WINDOW_LIMIT,
  createQueue,
  enqueue,
  saveQueue,
  makeItem,
} from './DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

const __dirname = process.argv[2];
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });
trace.traceInit('agq-playbook/preempt', { source: 'agq-playbook/preempt' });

writeFileSync(__dirname + '/done-1.json', '{"ok":true}\n');
let queue = createQueue('agq-preempt');
for (let i = 1; i <= QUEUE_ACTIVE_WINDOW_LIMIT + 1; i += 1) {
  queue = enqueue(queue, makeItem({
    queue_item_id: `queue-preempt-${i}`,
    title: `Preempt task ${i}`,
    completion_receipt: i === 1 ? 'json:done-1.json' : 'none',
  }));
}
saveQueue(__dirname, queue);

trace.traceEntry('check', {
  source: 'playbook',
  gate: 'full_window_pool',
  expected: true,
  passed: queue.active_window.length === QUEUE_ACTIVE_WINDOW_LIMIT
    && queue.active_window.at(-1).queue_item_id === `queue-preempt-${QUEUE_ACTIVE_WINDOW_LIMIT}`
    && queue.refill_pool[0].queue_item_id === `queue-preempt-${QUEUE_ACTIVE_WINDOW_LIMIT + 1}`,
});
JS
```

-> 预期：`active_window.length === QUEUE_ACTIVE_WINDOW_LIMIT`，额外 item 在 `refill_pool[0]`。

## Step 2.2: Claim + Preempt

先 claim front item 使其 running，再 preempt urgent item。urgent 应插入 `active_window[1]`，不打断 running front；原 window tail 进入 `refill_pool` 并带 `lineage.preempted_from: "active_window_tail"`。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import {
  QUEUE_ACTIVE_WINDOW_LIMIT,
  loadQueue,
  claim,
  preempt,
  saveQueue,
  makeItem,
} from './DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

const __dirname = process.argv[2];
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
queue = claim(queue, { actor: 'main-agent' }).queue;
queue = preempt(queue, makeItem({
  queue_item_id: 'queue-preempt-urgent',
  title: 'Urgent repair',
  priority_class: 'P1_state_or_gate_repair',
}), { reason: 'urgent_gate_repair' });
saveQueue(__dirname, queue);

trace.traceEntry('check', {
  source: 'playbook',
  gate: 'preempt_displaced_tail',
  expected: true,
  passed: queue.active_window[0].queue_item_id === 'queue-preempt-1'
    && queue.active_window[0].status === 'running'
    && queue.active_window[1].queue_item_id === 'queue-preempt-urgent'
    && queue.refill_pool.some((item) =>
      item.queue_item_id === `queue-preempt-${QUEUE_ACTIVE_WINDOW_LIMIT}`
      && item.restore_priority === 'next_tail_opening'
      && item.lineage?.preempted_from === 'active_window_tail'),
});
JS
```

-> 预期：urgent 在 index 1，running front 保持不变，尾部 displaced item 在 pool 中等待恢复。

## Step 2.3: Complete

完成 `queue-preempt-1`，校验 receipt，触发 promote + refill。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { loadQueue, complete, saveQueue } from './DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

const __dirname = process.argv[2];
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
const completed = complete(queue, { queue_item_id: 'queue-preempt-1', receipt: 'json:done-1.json' }, __dirname);
saveQueue(__dirname, completed.queue);

trace.traceEntry('check', {
  source: 'playbook',
  gate: 'completion_feedback',
  expected: true,
  passed: completed.feedback.passed === true,
});
JS
```

-> 预期：receipt 通过，queue front promotion，window tail refill。

## Step 2.4: Verify

验证 urgent 成为 `active_window[0]`，displaced tail 回到 window 尾部，projection 包含两者。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import {
  QUEUE_ACTIVE_WINDOW_LIMIT,
  loadQueue,
} from './DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

const __dirname = process.argv[2];
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

const queue = loadQueue(__dirname);
const projectionPath = __dirname + '/_cache/agentic-queue/current-task.md';
const projectionExists = existsSync(projectionPath);
const projectionContent = projectionExists ? readFileSync(projectionPath, 'utf-8') : '';
const restoredId = `queue-preempt-${QUEUE_ACTIVE_WINDOW_LIMIT}`;
const retiredQueueKeys = ['slot_1_current', 'slot_2_next', 'slot_5_tail', 'current_slot', 'named_slots'];
const hasNoRetiredKeys = Object.keys(queue).every((key) => !retiredQueueKeys.includes(key));

trace.traceEntry('check', {
  source: 'playbook',
  gate: 'restore_refill',
  expected: true,
  passed: queue.active_window[0].queue_item_id === 'queue-preempt-urgent'
    && queue.active_window.at(-1).queue_item_id === restoredId
    && projectionExists
    && projectionContent.includes('queue-preempt-urgent')
    && projectionContent.includes(restoredId)
    && hasNoRetiredKeys,
});
JS
```

-> 预期：urgent promotion 到 front，displaced tail 回到 ordered window 尾部。

## Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 4: 结果解读

PASS 证明 queue v2 preemption 使用 ordered array positions 与 `queue_item_id`，不是 named slots；window capacity 来自 `QUEUE_ACTIVE_WINDOW_LIMIT`。

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
