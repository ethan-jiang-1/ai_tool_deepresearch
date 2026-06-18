---
schema: command-experiment/v1
experiment: agentic-queue
case: medium
case_goal: "验证满 active window、refill_pool、urgent preemption 和 displaced tail restore。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_agq_medium
trace: dpt_disp_agq_medium/_trace_agq_cli.jsonl
verdict: trace-jsonl
req: AGQ-006
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Queue Manager API/CLI 调用和 trace event；允许读取文件系统中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-agentic-queue-medium

验证六个任务入队后五个进入 active window、第六个进入 refill pool；urgent preemption 插入 `slot_2_next`，原 `slot_5_tail` 带 restore metadata 进入 pool；完成当前任务后 tail 从 pool refill。

## Expected Runtime Path

1. 创建 disposable bundle，validate + inspect
2. 四段 MD-controlled 脚本：
   - 2.1 Enqueue：入队 6 个任务，填满 5-slot active window + 1 入 refill pool，持久化
   - 2.2 Preempt：urgent 任务插入 `slot_2_next`，原 `slot_5_tail` 携带 restore metadata 进入 pool
   - 2.3 Complete：完成 `slot_1_current`，receipt 校验，内部 promote + refill
   - 2.4 Verify：验证 displaced tail 从 pool 恢复到 `slot_5_tail`，projection 存在
3. 从 trace JSONL 裁决并清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs agq_medium --nodes=experiments/prototype-agentic-queue/nodes-agentic-queue --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

→ 预期：validate 5/5 passed，inspect directory structure complete。

---

## Step 2.1: Enqueue — 满窗入队 6 任务

入队 6 个任务：前 5 个填满 `slot_1` ~ `slot_5`，第 6 个进入 `refill_pool`。持久化到 `rb_queue.agq.json`。

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_medium"

cat > "$B/enqueue.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-agentic-queue/trace.mjs';
import {
  createEmptyQueue,
  enqueue,
  saveQueue,
  makeQueueItem,
} from '../experiments/prototype-agentic-queue/agentic-queue.mjs';

setTraceFile('dpt_disp_agq_medium/_trace_agq_cli.jsonl');
traceInit('agq-playbook/medium', { source: 'agq-playbook/medium' });

writeFileSync('dpt_disp_agq_medium/done-1.json', '{"ok":true}\n');
let queue = createEmptyQueue('agq-medium');
for (let i = 1; i <= 6; i++) {
  queue = enqueue(queue, makeQueueItem({
    work_id: `medium-${i}`,
    title: `Medium task ${i}`,
    completion_receipt: i === 1 ? 'json:done-1.json' : 'none',
  }));
}
saveQueue('dpt_disp_agq_medium', queue);

traceEntry('check', {
  source: 'agq-playbook/medium',
  step: 'full_window_pool',
  passed: queue.active_window.slot_5_tail.work_id === 'medium-5' && queue.refill_pool[0].work_id === 'medium-6',
});
JS

node "$B/enqueue.mjs"
```

→ 预期：`slot_1`~`slot_5` 分别为 `medium-1` ~ `medium-5`，`refill_pool[0]` = `medium-6`，`full_window_pool` check 通过。

---

## Step 2.2: Preempt — urgent 插入 slot_2_next，tail 被挤出

加载队列，urgent 任务 preempt 到 `slot_2_next`（不打断 `slot_1_current`）。原 `slot_5_tail`（`medium-5`）被挤出到 `refill_pool`，携带 `preempted_from_slot` + `restore_priority` metadata。

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_medium"

cat > "$B/preempt.mjs" << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-agentic-queue/trace.mjs';
import {
  loadQueue,
  preempt,
  saveQueue,
  makeQueueItem,
} from '../experiments/prototype-agentic-queue/agentic-queue.mjs';

setTraceFile('dpt_disp_agq_medium/_trace_agq_cli.jsonl');

let queue = loadQueue('dpt_disp_agq_medium');
queue = preempt(queue, makeQueueItem({
  work_id: 'medium-urgent',
  title: 'Urgent repair',
  priority_class: 'P1_state_or_gate_repair',
}), { reason: 'urgent_gate_repair' });
saveQueue('dpt_disp_agq_medium', queue);

traceEntry('check', {
  source: 'agq-playbook/medium',
  step: 'preempt_displaced_tail',
  passed: queue.active_window.slot_1_current.work_id === 'medium-1'
    && queue.active_window.slot_2_next.work_id === 'medium-urgent'
    && queue.refill_pool.some((item) => item.work_id === 'medium-5'
      && item.preempted_from_slot === 'slot_5_tail'
      && item.restore_priority === 'next_tail_opening'),
});
JS

node "$B/preempt.mjs"
```

→ 预期：`slot_1_current` 仍为 `medium-1`（不受干扰），`slot_2_next` = `medium-urgent`，`medium-5` 在 pool 中携带 restore metadata。

---

## Step 2.3: Complete — 完成 medium-1，触发 promote + refill

完成 `medium-1`，校验 `json:done-1.json` receipt。`completeCurrent` 内部执行 promote → refill（`medium-5` 从 pool 恢复到 `slot_5_tail`）→ renderProjection。

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_medium"

cat > "$B/complete.mjs" << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-agentic-queue/trace.mjs';
import {
  loadQueue,
  completeCurrent,
  saveQueue,
} from '../experiments/prototype-agentic-queue/agentic-queue.mjs';

setTraceFile('dpt_disp_agq_medium/_trace_agq_cli.jsonl');

let queue = loadQueue('dpt_disp_agq_medium');
const completed = completeCurrent(queue, { work_id: 'medium-1', receipt: 'json:done-1.json' }, 'dpt_disp_agq_medium');
saveQueue('dpt_disp_agq_medium', completed.queue);

traceEntry('check', {
  source: 'agq-playbook/medium',
  step: 'completion_feedback',
  passed: completed.feedback.passed === true,
});
JS

node "$B/complete.mjs"
```

→ 预期：receipt 校验通过，`queue_completed` + `queue_promoted` + `queue_refilled` trace event，projection 已渲染。

---

## Step 2.4: Verify — 验证 refill 恢复与最终队列状态

加载完成后的队列，验证 `medium-urgent` 已 promotion 到 `slot_1_current`，`medium-5` 从 pool 恢复到 `slot_5_tail`，projection 文件存在。

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_medium"

cat > "$B/verify.mjs" << 'JS'
import { existsSync, readFileSync } from 'node:fs';
import { setTraceFile, traceEntry } from '../experiments/prototype-agentic-queue/trace.mjs';
import { loadQueue } from '../experiments/prototype-agentic-queue/agentic-queue.mjs';

setTraceFile('dpt_disp_agq_medium/_trace_agq_cli.jsonl');

const queue = loadQueue('dpt_disp_agq_medium');
const projectionPath = 'dpt_disp_agq_medium/_cache/agentic-queue/current-task.md';
const projectionExists = existsSync(projectionPath);
const projectionContent = projectionExists ? readFileSync(projectionPath, 'utf-8') : '';

traceEntry('check', {
  source: 'agq-playbook/medium',
  step: 'restore_refill',
  passed: queue.active_window.slot_1_current.work_id === 'medium-urgent'
    && queue.active_window.slot_5_tail.work_id === 'medium-5'
    && projectionExists
    && projectionContent.includes('medium-urgent')
    && projectionContent.includes('medium-5'),
});
JS

node "$B/verify.mjs"
```

→ 预期：`slot_1_current` = `medium-urgent`，`slot_5_tail` = `medium-5`（从 pool 恢复），projection 包含两者。

---

## Step 3: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_medium"

cat > "$B/verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-agentic-queue/trace.mjs';

setTraceFile('dpt_disp_agq_medium/_trace_agq_cli.jsonl');
const events = readFileSync(getTraceFile(), 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter((event) => event.event === 'check');
const pass = checks.length >= 4 && checks.every((event) => event.passed === true);
console.log('checks:' + checks.length + ' total:' + events.length);
console.log(pass ? 'MEDIUM PASS' : 'MEDIUM FAIL');
if (!pass) process.exit(1);
traceCleanup();
JS

node "$B/verdict.mjs"
```

→ 预期：所有 `check` events 通过，MEDIUM PASS。

---

## Step 4: 清理

```bash
rm -rf "$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs agq_medium)"
echo "Cleaned up."
```
