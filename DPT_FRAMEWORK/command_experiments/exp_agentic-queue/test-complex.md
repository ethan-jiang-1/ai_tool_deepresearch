---
schema: command-experiment/v1
experiment: agentic-queue
case: complex
case_goal: "验证 invalid task、missing receipt、unsafe-current guard、failure repair 和 empty queue blocker。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_agq_complex
trace: dpt_disp_agq_complex/_trace_agq_cli.jsonl
verdict: trace-jsonl
req: AGQ-006
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Queue Manager API/CLI 调用和 trace event；允许读取文件系统中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-agentic-queue-complex

验证 Queue Manager 在错误路径中 fail closed，不依赖 chat 解释继续前进。

## Expected Runtime Path

1. 创建 disposable bundle，validate + inspect
2. invalid task schema 被拒绝
3. missing receipt 阻止 complete/promotion
4. unsafe-current guard 阻止替换 current，显式 unsafe 才允许
5. failCurrent 产生 repair work
6. 空队列 claim 返回 blocker/empty feedback
7. 从 trace JSONL 裁决并清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs agq_complex --nodes=experiments/prototype-agentic-queue/nodes-agentic-queue --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

→ 预期：validate 5/5 passed，inspect directory structure complete。

---

## Step 2: Error Paths

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_complex"

cat > "$B/t.mjs" << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-agentic-queue/trace.mjs';
import {
  QueueItemSchema,
  createEmptyQueue,
  enqueue,
  claimCurrent,
  completeCurrent,
  failCurrent,
  preempt,
  makeQueueItem,
} from '../experiments/prototype-agentic-queue/agentic-queue.mjs';

setTraceFile('dpt_disp_agq_complex/_trace_agq_cli.jsonl');
traceInit('agq-playbook/complex', { source: 'agq-playbook/complex' });

const invalid = makeQueueItem({ work_id: 'complex-invalid' });
delete invalid.producer_rule;
traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'invalid_task_rejected',
  passed: QueueItemSchema.safeParse(invalid).success === false,
});

let queue = createEmptyQueue('agq-complex');
queue = enqueue(queue, makeQueueItem({
  work_id: 'complex-1',
  title: 'Missing receipt task',
  completion_receipt: 'file:missing.txt',
}));
queue = enqueue(queue, makeQueueItem({ work_id: 'complex-2', title: 'Next task' }));
const blocked = completeCurrent(queue, { work_id: 'complex-1' }, 'dpt_disp_agq_complex');
traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'missing_receipt_blocks',
  passed: blocked.feedback.passed === false && blocked.queue.active_window.slot_1_current.work_id === 'complex-1',
});

let guardWorked = false;
try {
  preempt(queue, makeQueueItem({ work_id: 'complex-urgent' }), { reason: 'known_bad_current', replaceCurrent: true });
} catch {
  guardWorked = true;
}
traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'unsafe_current_guard',
  passed: guardWorked,
});

const unsafe = preempt(queue, makeQueueItem({ work_id: 'complex-urgent' }), {
  reason: 'known_bad_current',
  replaceCurrent: true,
  unsafeCurrent: true,
});
traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'unsafe_current_explicit',
  passed: unsafe.active_window.slot_1_current.work_id === 'complex-urgent'
    && unsafe.refill_pool.some((item) => item.work_id === 'complex-1'),
});

let repairQueue = createEmptyQueue('agq-complex-repair');
repairQueue = enqueue(repairQueue, makeQueueItem({ work_id: 'complex-fail' }));
repairQueue = enqueue(repairQueue, makeQueueItem({ work_id: 'complex-after-fail' }));
repairQueue = failCurrent(repairQueue, { work_id: 'complex-fail', reason: 'deterministic receipt failed' }, 'dpt_disp_agq_complex');
traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'failure_creates_repair',
  passed: repairQueue.active_window.slot_1_current.work_id === 'complex-after-fail'
    && repairQueue.active_window.slot_2_next.work_id.startsWith('repair-complex-fail-'),
});

const emptyClaim = claimCurrent(createEmptyQueue('agq-complex-empty'), { actor: 'main-agent' });
traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'empty_queue_blocker',
  passed: emptyClaim.item === null
    && emptyClaim.queue.queue_health === 'blocked'
    && emptyClaim.queue.stop_authorization_state === 'empty_queue_after_refill',
});
JS

node "$B/t.mjs"
```

→ 预期：所有错误路径都有结构化 check，失败不会被 chat progress 吞掉。

---

## Step 3: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_complex"

cat > "$B/verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-agentic-queue/trace.mjs';

setTraceFile('dpt_disp_agq_complex/_trace_agq_cli.jsonl');
const events = readFileSync(getTraceFile(), 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter((event) => event.event === 'check' && event.source === 'agq-playbook/complex');
const pass = checks.length >= 7 && checks.every((event) => event.passed === true);
console.log('checks:' + checks.length + ' total:' + events.length);
console.log(pass ? 'COMPLEX PASS' : 'COMPLEX FAIL');
if (!pass) process.exit(1);
traceCleanup();
JS

node "$B/verdict.mjs"
```

→ 预期：所有 `check` events 通过，COMPLEX PASS。

---

## Step 4: 清理

```bash
rm -rf "$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs agq_complex)"
echo "Cleaned up."
```
