---
schema: command-experiment/v1
experiment: agentic-queue
case: case-42-standard-urgent-preemption
weight: light
case_goal: "验证满 active window、refill_pool、urgent preemption 和 displaced tail restore。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-42_agq_medium
trace: dpt_disp_case-42_agq_medium/_trace.jsonl
verdict: trace-jsonl
req: AGQ-006
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Queue Manager API/CLI 调用和 trace event；允许读取文件系统中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-42-standard-urgent-preemption

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
B=$(node experiments_env/shared/new-disposable-bundle.mjs agq_medium --case case-42 --nodes=experiments_env/prototype-agentic-queue/nodes-agentic-queue --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

→ 预期：validate 5/5 passed，inspect directory structure complete。

---

## Step 2.1: Enqueue — 满窗入队 6 任务

入队 6 个任务：前 5 个填满 `slot_1` ~ `slot_5`，第 6 个进入 `refill_pool`。持久化到 `rb_queue.json`。

```bash

cat > "$B/enqueue.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  createQueue,
  enqueue,
  saveQueue,
  makeItem,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/_trace.jsonl', { consoleEcho: false });
trace.traceInit('agq-playbook/medium', { source: 'agq-playbook/medium' });

writeFileSync(__dirname + '/'done-1.json', '{"ok":true}\n');
let queue = createQueue('agq-medium');
for (let i = 1; i <= 6; i++) {
  queue = enqueue(queue, makeItem({
    work_id: `medium-${i}`,
    title: `Medium task ${i}`,
    completion_receipt: i === 1 ? 'json:done-1.json' : 'none',
  }));
}
saveQueue(__dirname, queue);

trace.traceEntry('check', {
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

cat > "$B/preempt.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  loadQueue,
  preempt,
  saveQueue,
  makeItem,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const trace = createTrace(__dirname + '/_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
queue = preempt(queue, makeItem({
  work_id: 'medium-urgent',
  title: 'Urgent repair',
  priority_class: 'P1_state_or_gate_repair',
}), { reason: 'urgent_gate_repair' });
saveQueue(__dirname, queue);

trace.traceEntry('check', {
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

完成 `medium-1`，校验 `json:done-1.json` receipt。`complete` 内部执行 promote → refill（`medium-5` 从 pool 恢复到 `slot_5_tail`）→ render。

```bash

cat > "$B/complete.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  loadQueue,
  complete,
  saveQueue,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const trace = createTrace(__dirname + '/_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
const completed = complete(queue, { work_id: 'medium-1', receipt: 'json:done-1.json' }, __dirname);
saveQueue(__dirname, completed.queue);

trace.traceEntry('check', {
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

cat > "$B/verify.mjs" << 'JS'
import { existsSync, readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { loadQueue } from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const trace = createTrace(__dirname + '/_trace.jsonl', { consoleEcho: false });

const queue = loadQueue(__dirname);
const projectionPath = __dirname + '/_cache/agentic-queue/current-task.md';
const projectionExists = existsSync(projectionPath);
const projectionContent = projectionExists ? readFileSync(projectionPath, 'utf-8') : '';

trace.traceEntry('check', {
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

cat > "$B/verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const trace = createTrace(__dirname + '/_trace.jsonl', { consoleEcho: false });
const events = readFileSync(trace.traceFilePath(), 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter((event) => event.event === 'check');
const pass = checks.length >= 4 && checks.every((event) => event.passed === true);
console.log('checks:' + checks.length + ' total:' + events.length);
console.log(pass ? '\x1b[32mMEDIUM PASS\x1b[0m' : '\x1b[31mMEDIUM FAIL\x1b[0m');
if (!pass) process.exit(1);
trace.traceCleanup();
JS

node "$B/verdict.mjs"
```

→ 预期：所有 `check` events 通过，MEDIUM PASS。

---


## Step 4: 结果解读

> 4 个 check，验证 urgent preemption：
>   [full_window_pool] 5 slot 满窗 + 第 6 个入 refill pool
>   [preempt_displaced_tail] slot_1 不受干扰，urgent 插 slot_2，旧 tail 带 restore metadata 入 pool
>   [completion_feedback] receipt 校验通过
>   [restore_refill] urgent→slot_1，旧 tail→slot_5（从 pool 恢复），projection 含两者
>   全部 expected:true → 4/4 PASS 即通过。

## Step 5: 清理

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_case-42_agq_*
echo "Cleaned up."
```