---
schema: command-experiment/v1
experiment: agentic-queue
case: case-42-standard-urgent-preemption
weight: light
case_goal: "验证 queue v2 满 active_window、refill_pool、urgent preemption 和 displaced tail restore。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-42_agq_preempt_*
trace: dpt_disp_case-42_agq_preempt_*/rb_trace.jsonl
verdict: trace-jsonl
req: AGQ-006, AGQ-019
---

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
B=$(node experiments_env/shared/new-disposable-bundle.mjs agq_preempt --case case-42 --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

-> 预期：bundle 创建成功，control files 有效。

## Step 2.1: Enqueue

入队 `QUEUE_ACTIVE_WINDOW_LIMIT + 1` 个 task cards：前 N 个进入 ordered `active_window`，最后一个进入 `refill_pool`。

```bash
cat > "$B/enqueue.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  QUEUE_ACTIVE_WINDOW_LIMIT,
  createQueue,
  enqueue,
  saveQueue,
  makeItem,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const __dirname = esmDirname(import.meta.url);
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
  source: 'agq-playbook/preempt',
  step: 'full_window_pool',
  passed: queue.active_window.length === QUEUE_ACTIVE_WINDOW_LIMIT
    && queue.active_window.at(-1).queue_item_id === `queue-preempt-${QUEUE_ACTIVE_WINDOW_LIMIT}`
    && queue.refill_pool[0].queue_item_id === `queue-preempt-${QUEUE_ACTIVE_WINDOW_LIMIT + 1}`,
});
JS

node "$B/enqueue.mjs"
```

-> 预期：`active_window.length === QUEUE_ACTIVE_WINDOW_LIMIT`，额外 item 在 `refill_pool[0]`。

## Step 2.2: Claim + Preempt

先 claim front item 使其 running，再 preempt urgent item。urgent 应插入 `active_window[1]`，不打断 running front；原 window tail 进入 `refill_pool` 并带 `lineage.preempted_from: "active_window_tail"`。

```bash
cat > "$B/preempt.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  QUEUE_ACTIVE_WINDOW_LIMIT,
  loadQueue,
  claim,
  preempt,
  saveQueue,
  makeItem,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const __dirname = esmDirname(import.meta.url);
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
  source: 'agq-playbook/preempt',
  step: 'preempt_displaced_tail',
  passed: queue.active_window[0].queue_item_id === 'queue-preempt-1'
    && queue.active_window[0].status === 'running'
    && queue.active_window[1].queue_item_id === 'queue-preempt-urgent'
    && queue.refill_pool.some((item) =>
      item.queue_item_id === `queue-preempt-${QUEUE_ACTIVE_WINDOW_LIMIT}`
      && item.restore_priority === 'next_tail_opening'
      && item.lineage?.preempted_from === 'active_window_tail'),
});
JS

node "$B/preempt.mjs"
```

-> 预期：urgent 在 index 1，running front 保持不变，尾部 displaced item 在 pool 中等待恢复。

## Step 2.3: Complete

完成 `queue-preempt-1`，校验 receipt，触发 promote + refill。

```bash
cat > "$B/complete.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { loadQueue, complete, saveQueue } from '../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
const completed = complete(queue, { queue_item_id: 'queue-preempt-1', receipt: 'json:done-1.json' }, __dirname);
saveQueue(__dirname, completed.queue);

trace.traceEntry('check', {
  source: 'agq-playbook/preempt',
  step: 'completion_feedback',
  passed: completed.feedback.passed === true,
});
JS

node "$B/complete.mjs"
```

-> 预期：receipt 通过，queue front promotion，window tail refill。

## Step 2.4: Verify

验证 urgent 成为 `active_window[0]`，displaced tail 回到 window 尾部，projection 包含两者。

```bash
cat > "$B/verify.mjs" << 'JS'
import { existsSync, readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  QUEUE_ACTIVE_WINDOW_LIMIT,
  loadQueue,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

const queue = loadQueue(__dirname);
const projectionPath = __dirname + '/_cache/agentic-queue/current-task.md';
const projectionExists = existsSync(projectionPath);
const projectionContent = projectionExists ? readFileSync(projectionPath, 'utf-8') : '';
const restoredId = `queue-preempt-${QUEUE_ACTIVE_WINDOW_LIMIT}`;
const retiredQueueKeys = ['slot_1_current', 'slot_2_next', 'slot_5_tail', 'current_slot', 'named_slots'];
const hasNoRetiredKeys = Object.keys(queue).every((key) => !retiredQueueKeys.includes(key));

trace.traceEntry('check', {
  source: 'agq-playbook/preempt',
  step: 'restore_refill',
  passed: queue.active_window[0].queue_item_id === 'queue-preempt-urgent'
    && queue.active_window.at(-1).queue_item_id === restoredId
    && projectionExists
    && projectionContent.includes('queue-preempt-urgent')
    && projectionContent.includes(restoredId)
    && hasNoRetiredKeys,
});
JS

node "$B/verify.mjs"
```

-> 预期：urgent promotion 到 front，displaced tail 回到 ordered window 尾部。

## Step 3: 从 trace 裁决

```bash
cat > "$B/verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });
const events = readFileSync(trace.traceFilePath(), 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter((event) => event.event === 'check' && event.source === 'agq-playbook/preempt');
const pass = checks.length >= 4 && checks.every((event) => event.passed === true);
console.log('checks:' + checks.length + ' total:' + events.length);
console.log(pass ? '\x1b[32mCASE-42 PASS\x1b[0m' : '\x1b[31mCASE-42 FAIL\x1b[0m');
if (!pass) process.exit(1);
trace.traceCleanup();
JS

node "$B/verdict.mjs"
```

-> 预期：4 个 playbook check 全部通过。

## Step 4: 结果解读

PASS 证明 queue v2 preemption 使用 ordered array positions 与 `queue_item_id`，不是 named slots；window capacity 来自 `QUEUE_ACTIVE_WINDOW_LIMIT`。

## Cleanup

```bash
rm -rf "$B"
echo "Cleaned up $B"
```
