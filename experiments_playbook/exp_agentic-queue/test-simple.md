---
schema: command-experiment/v1
experiment: agentic-queue
case: simple
case_goal: "验证 enqueue → claim → complete → promote → projection 的最小 Queue Manager 路径。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_agq_simple
trace: dpt_disp_agq_simple/_trace_agq_cli.jsonl
verdict: trace-jsonl
req: AGQ-006
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Queue Manager API/CLI 调用和 trace event；允许读取文件系统中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-agentic-queue-simple

验证三个任务入队后，只有 `slot_1_current` 可 claim；完成当前任务后 slot 2 promotion 到 slot 1，并生成 Markdown projection。

## Expected Runtime Path

1. 创建 disposable bundle，validate + inspect
2. 四段 MD-controlled 脚本：
   - 2.1 Enqueue：初始化队列并入队三个任务，持久化 `rb_queue.agq.json`
   - 2.2 Claim：加载队列，claim `slot_1_current`，验证只有 `simple-1` 可被 claim
   - 2.3 Complete：完成 `simple-1`，receipt 校验，内部 promote + refill + render
   - 2.4 Verify：验证 `simple-2` 已 promotion 到 `slot_1_current`，projection 文件存在
3. 从 trace JSONL 裁决
4. 清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs agq_simple --nodes=experiments/prototype-agentic-queue/nodes-agentic-queue --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

→ 预期：validate 5/5 passed，inspect directory structure complete。

---

## Step 2.1: Enqueue — 初始化队列并入队三个任务

创建空队列，按序入队 `simple-1`、`simple-2`、`simple-3`，写入 receipt 文件，持久化到 `rb_queue.agq.json`。

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_simple"

cat > "$B/enqueue.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  createQueue,
  enqueue,
  saveQueue,
  makeItem,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

const trace = createTrace('dpt_disp_agq_simple/_trace_agq_cli.jsonl', { consoleEcho: false });
trace.traceInit('agq-playbook/simple', { source: 'agq-playbook/simple' });

writeFileSync('dpt_disp_agq_simple/done-1.json', '{"ok":true}\n');
let queue = createQueue('agq-simple');
queue = enqueue(queue, makeItem({ work_id: 'simple-1', title: 'Task 1', completion_receipt: 'json:done-1.json' }));
queue = enqueue(queue, makeItem({ work_id: 'simple-2', title: 'Task 2' }));
queue = enqueue(queue, makeItem({ work_id: 'simple-3', title: 'Task 3' }));
saveQueue('dpt_disp_agq_simple', queue);
JS

node "$B/enqueue.mjs"
```

→ 预期：3 个 `queue_enqueue` trace event，`rb_queue.agq.json` 写入 bundle，`slot_1_current`=`simple-1`，`slot_2_next`=`simple-2`，`slot_3_pending`=`simple-3`，`slot_4`/`slot_5` 为空。

---

## Step 2.2: Claim — 认领当前任务

从持久化队列加载，claim `slot_1_current`。验证只有 `simple-1` 可被 claim，且 `simple-2` 状态仍为 `queued`（不可越级 claim）。

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_simple"

cat > "$B/claim.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  loadQueue,
  claim,
  saveQueue,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

const trace = createTrace('dpt_disp_agq_simple/_trace_agq_cli.jsonl', { consoleEcho: false });

let queue = loadQueue('dpt_disp_agq_simple');
const result = claim(queue, { actor: 'main-agent' });
saveQueue('dpt_disp_agq_simple', result.queue);

trace.traceEntry('check', {
  source: 'agq-playbook/simple',
  step: 'claim_current_only',
  passed: result.item.work_id === 'simple-1' && result.queue.active_window.slot_2_next.status === 'queued',
});
JS

node "$B/claim.mjs"
```

→ 预期：`claim.item.work_id === 'simple-1'`，`slot_2_next` 状态仍为 `queued`，`queue_claimed` trace event 已写入。

---

## Step 2.3: Complete — 完成当前任务 + receipt 校验

完成 `simple-1`，校验 `json:done-1.json` receipt。`complete` 内部执行 promote → refill → render。

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_simple"

cat > "$B/complete.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  loadQueue,
  complete,
  saveQueue,
} from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

const trace = createTrace('dpt_disp_agq_simple/_trace_agq_cli.jsonl', { consoleEcho: false });

let queue = loadQueue('dpt_disp_agq_simple');
const completed = complete(queue, { work_id: 'simple-1', receipt: 'json:done-1.json' }, 'dpt_disp_agq_simple');
saveQueue('dpt_disp_agq_simple', completed.queue);

trace.traceEntry('check', {
  source: 'agq-playbook/simple',
  step: 'completion_feedback',
  passed: completed.feedback.passed === true,
});
JS

node "$B/complete.mjs"
```

→ 预期：receipt 校验通过，`queue_completed` + `queue_promoted` trace event，projection 已渲染到 `_cache/agentic-queue/current-task.md`。

---

## Step 2.4: Verify — 验证 promotion 与最终队列状态

加载完成后的队列，验证 `simple-2` 已 promotion 到 `slot_1_current`，projection 文件存在且内容正确。

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_simple"

cat > "$B/verify.mjs" << 'JS'
import { existsSync, readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { loadQueue } from '../DPT_FRAMEWORK/engine/queue-manager.mjs';

const trace = createTrace('dpt_disp_agq_simple/_trace_agq_cli.jsonl', { consoleEcho: false });

const queue = loadQueue('dpt_disp_agq_simple');
const projectionPath = 'dpt_disp_agq_simple/_cache/agentic-queue/current-task.md';
const projectionExists = existsSync(projectionPath);
const projectionContent = projectionExists ? readFileSync(projectionPath, 'utf-8') : '';

trace.traceEntry('check', {
  source: 'agq-playbook/simple',
  step: 'promote_projection',
  passed: queue.active_window.slot_1_current.work_id === 'simple-2'
    && projectionExists
    && projectionContent.includes('simple-2'),
});
JS

node "$B/verify.mjs"
```

→ 预期：`slot_1_current.work_id === 'simple-2'`，projection 文件存在且包含 `simple-2`。

---

## Step 3: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_simple"

cat > "$B/verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';

const trace = createTrace('dpt_disp_agq_simple/_trace_agq_cli.jsonl', { consoleEcho: false });
const events = readFileSync(trace.traceFilePath(), 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter((event) => event.event === 'check');
const pass = checks.length >= 3 && checks.every((event) => event.passed === true);
console.log('checks:' + checks.length + ' total:' + events.length);
console.log(pass ? 'SIMPLE PASS' : 'SIMPLE FAIL');
if (!pass) process.exit(1);
trace.traceCleanup();
JS

node "$B/verdict.mjs"
```

→ 预期：所有 `check` events 通过，SIMPLE PASS。

---

## Step 4: 清理

```bash
rm -rf "$(node experiments/shared/new-disposable-bundle.mjs agq_simple)"
echo "Cleaned up."
```
