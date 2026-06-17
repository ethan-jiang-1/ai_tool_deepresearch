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
2. 构造 full window + refill pool
3. 执行 urgent preemption，检查 displaced tail metadata
4. complete current 后验证 refill 恢复
5. 从 trace JSONL 裁决并清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs agq_medium --nodes=experiments/prototype-agentic-queue/nodes-agentic-queue --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

→ 预期：validate 5/5 passed，inspect directory structure complete。

---

## Step 2: Full Window + Preemption + Refill

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_medium"

cat > "$B/t.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-agentic-queue/trace.mjs';
import {
  createEmptyQueue,
  enqueue,
  completeCurrent,
  preempt,
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
traceEntry('check', {
  source: 'agq-playbook/medium',
  step: 'full_window_pool',
  passed: queue.active_window.slot_5_tail.work_id === 'medium-5' && queue.refill_pool[0].work_id === 'medium-6',
});

queue = preempt(queue, makeQueueItem({
  work_id: 'medium-urgent',
  title: 'Urgent repair',
  priority_class: 'P1_state_or_gate_repair',
}), { reason: 'urgent_gate_repair' });

traceEntry('check', {
  source: 'agq-playbook/medium',
  step: 'preempt_displaced_tail',
  passed: queue.active_window.slot_1_current.work_id === 'medium-1'
    && queue.active_window.slot_2_next.work_id === 'medium-urgent'
    && queue.refill_pool.some((item) => item.work_id === 'medium-5'
      && item.preempted_from_slot === 'slot_5_tail'
      && item.restore_priority === 'next_tail_opening'),
});

const completed = completeCurrent(queue, { work_id: 'medium-1', receipt: 'json:done-1.json' }, 'dpt_disp_agq_medium');
queue = completed.queue;
traceEntry('check', {
  source: 'agq-playbook/medium',
  step: 'restore_refill',
  passed: completed.feedback.passed === true
    && queue.active_window.slot_1_current.work_id === 'medium-urgent'
    && queue.active_window.slot_5_tail.work_id === 'medium-5',
});
JS

node "$B/t.mjs"
```

→ 预期：preempt 不打断 current，displaced tail 有 restore metadata，complete 后 restore item refill 到 tail。

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
