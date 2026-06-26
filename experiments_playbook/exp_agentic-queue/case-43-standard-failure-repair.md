---
schema: command-experiment/v1
experiment: agentic-queue
case: case-43-standard-failure-repair
weight: light
case_goal: "验证 invalid task、missing receipt、unsafe-current guard、failure repair 和 empty queue blocker。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-43_agq_complex
trace: dpt_disp_case-43_agq_complex/_logs/_trace.jsonl
verdict: trace-jsonl
req: AGQ-006
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Queue Manager API/CLI 调用和 trace event；允许读取文件系统中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-43-standard-failure-repair

验证 Queue Manager 在错误路径中 fail closed，不依赖 chat 解释继续前进。

## Expected Runtime Path

1. 创建 disposable bundle，validate + inspect
2. 六段 MD-controlled 脚本，每个错误路径独立验证：
   - 2.1 Invalid task：schema 拒绝缺少 `producer_rule` 的 task
   - 2.2 Missing receipt：`file:missing.txt` 不存在 → complete 被阻止，promotion 不执行
   - 2.3 Unsafe-current guard：`replaceCurrent=true` 但无 `unsafeCurrent` → throw
   - 2.4 Unsafe-current explicit：`unsafeCurrent=true` → preempt 替换 slot_1，旧 current 入 pool
   - 2.5 Failure repair：`fail` 产生 `repair-*` work 并 preempt 到 slot_2_next
   - 2.6 Empty queue：空队列 claim 返回 `blocked` + `empty_queue_after_refill`
3. 从 trace JSONL 裁决并清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs agq_complex --case case-43 --nodes=experiments_env/prototype-agentic-queue/nodes-agentic-queue --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

→ 预期：validate 5/5 passed，inspect directory structure complete。

---

## Step 2.1: Invalid Task — schema 拒绝非法 task

构造缺少 `producer_rule` 的 task，`QueueItemSchema.safeParse` 应返回 `success: false`。纯 schema 层校验，无需队列持久化。

```bash

cat > "$B/invalid.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  QueueItemSchema,
  makeItem,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/_logs/_trace.jsonl', { consoleEcho: false });
trace.traceInit('agq-playbook/complex', { source: 'agq-playbook/complex' });

const invalid = makeItem({ work_id: 'complex-invalid' });
delete invalid.producer_rule;
trace.traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'invalid_task_rejected',
  passed: QueueItemSchema.safeParse(invalid).success === false,
});
JS

node "$B/invalid.mjs"
```

→ 预期：`QueueItemSchema.safeParse` 返回 `success: false`，`invalid_task_rejected` check 通过。

---

## Step 2.2: Missing Receipt — 缺文件阻止 complete

入队 `complex-1`（completion_receipt=`file:missing.txt`，文件不存在）和 `complex-2`。尝试 `complete` 应被 receipt 校验阻止，`slot_1_current` 保持 `complex-1`。

```bash

cat > "$B/missing_receipt.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  createQueue,
  enqueue,
  complete,
  saveQueue,
  makeItem,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const trace = createTrace(__dirname + '/_logs/_trace.jsonl', { consoleEcho: false });

let queue = createQueue('agq-complex');
queue = enqueue(queue, makeItem({
  work_id: 'complex-1',
  title: 'Missing receipt task',
  completion_receipt: 'file:missing.txt',
}));
queue = enqueue(queue, makeItem({ work_id: 'complex-2', title: 'Next task' }));
saveQueue(__dirname, queue);

const blocked = complete(queue, { work_id: 'complex-1' }, __dirname);
trace.traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'missing_receipt_blocks',
  passed: blocked.feedback.passed === false && blocked.queue.active_window.slot_1_current.work_id === 'complex-1',
});
JS

node "$B/missing_receipt.mjs"
```

→ 预期：receipt 校验失败，`feedback.passed === false`，`slot_1_current` 仍为 `complex-1`（未 promotion）。

---

## Step 2.3: Unsafe-Current Guard — 无显式标志则 throw

加载队列，尝试 `preempt` 带 `replaceCurrent=true` 但不带 `unsafeCurrent=true` —— 应抛出异常，queue 状态不变。

```bash

cat > "$B/guard.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  loadQueue,
  preempt,
  makeItem,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const trace = createTrace(__dirname + '/_logs/_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
let guardWorked = false;
try {
  preempt(queue, makeItem({ work_id: 'complex-urgent' }), { reason: 'known_bad_current', replaceCurrent: true });
} catch {
  guardWorked = true;
}
trace.traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'unsafe_current_guard',
  passed: guardWorked,
});
JS

node "$B/guard.mjs"
```

→ 预期：`preempt` 抛出异常被 catch，`unsafe_current_guard` check 通过。

---

## Step 2.4: Unsafe-Current Explicit — 显式标志允许替换 slot_1

加载队列，带 `unsafeCurrent=true` + `replaceCurrent=true` 执行 preempt。`complex-urgent` 替换 `slot_1_current`，原 `complex-1` 进入 `refill_pool` 并带 restore metadata。

```bash

cat > "$B/unsafe.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  loadQueue,
  preempt,
  saveQueue,
  makeItem,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const trace = createTrace(__dirname + '/_logs/_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
const unsafe = preempt(queue, makeItem({ work_id: 'complex-urgent' }), {
  reason: 'known_bad_current',
  replaceCurrent: true,
  unsafeCurrent: true,
});
saveQueue(__dirname, unsafe);

trace.traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'unsafe_current_explicit',
  passed: unsafe.active_window.slot_1_current.work_id === 'complex-urgent'
    && unsafe.refill_pool.some((item) => item.work_id === 'complex-1'),
});
JS

node "$B/unsafe.mjs"
```

→ 预期：`slot_1_current` = `complex-urgent`，`complex-1` 在 pool 中携带 `preempted_from_slot: slot_1_current`。

---

## Step 2.5: Failure Repair — fail 产生 repair work

创建新队列，入队 `complex-fail` + `complex-after-fail`。`fail` 完成后：`complex-after-fail` promotion 到 `slot_1_current`，`repair-*` work 自动 preempt 到 `slot_2_next`。

```bash

cat > "$B/failure.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  createQueue,
  enqueue,
  fail,
  saveQueue,
  makeItem,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const trace = createTrace(__dirname + '/_logs/_trace.jsonl', { consoleEcho: false });

let repairQueue = createQueue('agq-complex-repair');
repairQueue = enqueue(repairQueue, makeItem({ work_id: 'complex-fail' }));
repairQueue = enqueue(repairQueue, makeItem({ work_id: 'complex-after-fail' }));
repairQueue = fail(repairQueue, { work_id: 'complex-fail', reason: 'deterministic receipt failed' }, 'dpt_disp_case-43_agq_complex');
saveQueue(__dirname, repairQueue);

trace.traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'failure_creates_repair',
  passed: repairQueue.active_window.slot_1_current.work_id === 'complex-after-fail'
    && repairQueue.active_window.slot_2_next.work_id.startsWith('repair-complex-fail-'),
});
JS

node "$B/failure.mjs"
```

→ 预期：`slot_1_current` = `complex-after-fail`，`slot_2_next` 以 `repair-complex-fail-` 开头。

---

## Step 2.6: Empty Queue — 空队列返回 blocker

对空队列调用 `claim`，应返回 `item === null`，`queue_health === 'blocked'`，`stop_authorization_state === 'empty_queue_after_refill'`。

```bash

cat > "$B/empty.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  createQueue,
  claim,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const trace = createTrace(__dirname + '/_logs/_trace.jsonl', { consoleEcho: false });

const emptyClaim = claim(createQueue('agq-complex-empty'), { actor: 'main-agent' });
trace.traceEntry('check', {
  source: 'agq-playbook/complex',
  step: 'empty_queue_blocker',
  passed: emptyClaim.item === null
    && emptyClaim.queue.queue_health === 'blocked'
    && emptyClaim.queue.stop_authorization_state === 'empty_queue_after_refill',
});
JS

node "$B/empty.mjs"
```

→ 预期：`item === null`，queue_health `blocked`，stop_authorization `empty_queue_after_refill`。

---

## Step 3: 从 Trace 裁决

```bash

cat > "$B/verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';

import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);

const trace = createTrace(__dirname + '/_logs/_trace.jsonl', { consoleEcho: false });
const events = readFileSync(trace.traceFilePath(), 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter((event) => event.event === 'check' && event.source === 'agq-playbook/complex');
const pass = checks.length >= 6 && checks.every((event) => event.passed === true);
console.log('checks:' + checks.length + ' total:' + events.length);
console.log(pass ? '\x1b[32mCOMPLEX PASS\x1b[0m' : '\x1b[31mCOMPLEX FAIL\x1b[0m');
if (!pass) process.exit(1);
trace.traceCleanup();
JS

node "$B/verdict.mjs"
```

→ 预期：所有 `check` events 通过，COMPLEX PASS。

---


## Step 4: 结果解读

> 6 个 check，验证 queue 错误路径：
>   [invalid_task_rejected] schema 拒绝缺少 producer_rule 的 task
>   [missing_receipt_blocks] file:missing.txt 不存在 → complete 被阻，slot_1 不变
>   [unsafe_current_guard] replaceCurrent=true 无 unsafeCurrent → throw
>   [unsafe_current_explicit] unsafeCurrent=true → preempt 替换 slot_1，旧 current 入 pool
>   [failure_creates_repair] fail 后 slot_1 promotion，repair-* work 自动 preempt
>   [empty_queue_blocker] 空队列 claim → item=null，health=blocked
>   全部 expected:true → 6/6 PASS 即通过。

## Step 5: 清理

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_case-43_agq_*
echo "Cleaned up."
```