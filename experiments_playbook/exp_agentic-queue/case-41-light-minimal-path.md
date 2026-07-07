---
schema: command-experiment/v1
experiment: agentic-queue
case: case-41-light-minimal-path
weight: light
case_goal: "验证 enqueue -> claim -> complete -> promote -> projection 的最小 queue v2 路径。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-41_agq_simple_*
trace: dpt_disp_case-41_agq_simple_*/rb_trace.jsonl
verdict: trace-jsonl
req: AGQ-006, AGQ-019
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中逐步执行。实验结果必须来自实际 Queue Manager API/CLI 调用、bundle-root `rb_queue.json`、projection 文件和 trace `check` events；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| Runtime context | disposable bundle，`new-disposable-bundle.mjs` 创建 |
| Framework path | `queue-manager.mjs` API：`createQueue`, `enqueue`, `claim`, `complete`, `saveQueue`, `loadQueue` |
| Fixture input | task card JSON 在 playbook 内构造，使用 queue v2 `queue_item_id` |
| Agent actor | 无，fixture-backed Engine case |
| External calls | 无 |
| Verdict source | bundle-root `rb_trace.jsonl` `check` events |
| 不证明 | Agent 队列决策、delegated work-unit submit、真实内容生产 |

# case-41-light-minimal-path

验证三个 queue demand 入队后，queue front 可以 claim；完成 front item 后，ordered `active_window[1]` promotion 到 `active_window[0]`，并生成 Markdown projection。

## Expected Runtime Path

1. 创建 disposable bundle，validate + inspect
2. Enqueue：初始化 queue v2 并入队三个 task cards
3. Claim：认领 ordered `active_window[0]`
4. Complete：完成 `queue-simple-1`，receipt 校验，内部 promote + render
5. Verify：验证 `queue-simple-2` 已 promotion 到 `active_window[0]`
6. 从 bundle-root trace 裁决
7. PASS 后清理

## Step 1: 创建 disposable runtime context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs agq_simple --case case-41 --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

-> 预期：bundle 创建成功，control files 有效。

## Step 2.1: Enqueue

创建 queue v2，按序入队 `queue-simple-1`、`queue-simple-2`、`queue-simple-3`，持久化到 bundle-root `rb_queue.json`。

```bash
cat > "$B/enqueue.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createQueue, enqueue, saveQueue, makeItem } from '../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });
trace.traceInit('agq-playbook/simple', { source: 'agq-playbook/simple' });

writeFileSync(__dirname + '/done-1.json', '{"ok":true}\n');
let queue = createQueue('agq-simple');
queue = enqueue(queue, makeItem({ queue_item_id: 'queue-simple-1', title: 'Task 1', completion_receipt: 'json:done-1.json' }));
queue = enqueue(queue, makeItem({ queue_item_id: 'queue-simple-2', title: 'Task 2' }));
queue = enqueue(queue, makeItem({ queue_item_id: 'queue-simple-3', title: 'Task 3' }));
saveQueue(__dirname, queue);

trace.traceEntry('check', {
  source: 'agq-playbook/simple',
  step: 'enqueue_ordered_window',
  passed: queue.active_window.length === 3
    && queue.active_window[0].queue_item_id === 'queue-simple-1'
    && queue.active_window[1].queue_item_id === 'queue-simple-2'
    && queue.active_window[2].queue_item_id === 'queue-simple-3'
    && queue.refill_pool.length === 0,
});
JS

node "$B/enqueue.mjs"
```

-> 预期：ordered `active_window` 三个元素顺序正确，无 named slot fields。

## Step 2.2: Claim

从持久化 queue 加载并 claim front item。验证只有 `active_window[0]` 被认领，后续 item 仍为 `queued`。

```bash
cat > "$B/claim.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { loadQueue, claim, saveQueue } from '../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
const result = claim(queue, { actor: 'main-agent' });
saveQueue(__dirname, result.queue);

trace.traceEntry('check', {
  source: 'agq-playbook/simple',
  step: 'claim_front_only',
  passed: result.item.queue_item_id === 'queue-simple-1'
    && result.queue.active_window[0].status === 'running'
    && result.queue.active_window[1].queue_item_id === 'queue-simple-2'
    && result.queue.active_window[1].status === 'queued',
});
JS

node "$B/claim.mjs"
```

-> 预期：claim 返回 `queue-simple-1`，`queue-simple-2` 仍 queued。

## Step 2.3: Complete

完成 `queue-simple-1`，校验 `json:done-1.json` receipt。

```bash
cat > "$B/complete.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { loadQueue, complete, saveQueue } from '../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

let queue = loadQueue(__dirname);
const completed = complete(queue, { queue_item_id: 'queue-simple-1', receipt: 'json:done-1.json' }, __dirname);
saveQueue(__dirname, completed.queue);

trace.traceEntry('check', {
  source: 'agq-playbook/simple',
  step: 'completion_feedback',
  passed: completed.feedback.passed === true,
});
JS

node "$B/complete.mjs"
```

-> 预期：receipt 校验通过，front item 完成并 promotion。

## Step 2.4: Verify

验证 `queue-simple-2` 已成为 `active_window[0]`，projection 文件存在且来自 current queue。

```bash
cat > "$B/verify.mjs" << 'JS'
import { existsSync, readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { loadQueue } from '../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });

const queue = loadQueue(__dirname);
const projectionPath = __dirname + '/_cache/agentic-queue/current-task.md';
const projectionExists = existsSync(projectionPath);
const projectionContent = projectionExists ? readFileSync(projectionPath, 'utf-8') : '';
// queue v2 top-level keys — verify no old named-slot state has leaked in
const retiredQueueKeys = ['slot_1_current', 'slot_2_next', 'slot_5_tail', 'current_slot', 'named_slots'];
const hasNoRetiredKeys = Object.keys(queue).every((key) => !retiredQueueKeys.includes(key));

trace.traceEntry('check', {
  source: 'agq-playbook/simple',
  step: 'promote_projection',
  passed: queue.active_window[0].queue_item_id === 'queue-simple-2'
    && projectionExists
    && projectionContent.includes('queue-simple-2')
    && hasNoRetiredKeys,
});
JS

node "$B/verify.mjs"
```

-> 预期：promotion 与 projection 均通过，queue 文件不含 retired named-slot key。

## Step 3: 从 trace 裁决

```bash
cat > "$B/verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl', { consoleEcho: false });
const events = readFileSync(trace.traceFilePath(), 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter((event) => event.event === 'check' && event.source === 'agq-playbook/simple');
const pass = checks.length >= 4 && checks.every((event) => event.passed === true);
console.log('checks:' + checks.length + ' total:' + events.length);
console.log(pass ? '\x1b[32mCASE-41 PASS\x1b[0m' : '\x1b[31mCASE-41 FAIL\x1b[0m');
if (!pass) process.exit(1);
trace.traceCleanup();
JS

node "$B/verdict.mjs"
```

-> 预期：4 个 playbook check 全部通过。

## Step 4: 结果解读

PASS 证明 queue v2 的 ordered active-window 最小 lifecycle 成立：enqueue 保序、claim 只认领 front、complete 通过 receipt 后 promotion、projection 来自 bundle-root `rb_queue.json`。

## Cleanup

```bash
rm -rf "$B"
echo "Cleaned up $B"
```
