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
2. 通过真实 Queue Manager API enqueue 三个任务、claim 当前任务、完成当前任务
3. 生成 projection，从 trace JSONL 裁决
4. 清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs agq_simple --nodes=experiments/prototype-agentic-queue/nodes-agentic-queue --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

→ 预期：validate 5/5 passed，inspect directory structure complete。

---

## Step 2: Enqueue → Claim → Complete → Projection

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_simple"

cat > "$B/t.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-agentic-queue/trace.mjs';
import {
  createEmptyQueue,
  enqueue,
  claimCurrent,
  completeCurrent,
  renderProjection,
  makeQueueItem,
} from '../experiments/prototype-agentic-queue/agentic-queue.mjs';

setTraceFile('dpt_disp_agq_simple/_trace_agq_cli.jsonl');
traceInit('agq-playbook/simple', { source: 'agq-playbook/simple' });

writeFileSync('dpt_disp_agq_simple/done-1.json', '{"ok":true}\n');
let queue = createEmptyQueue('agq-simple');
queue = enqueue(queue, makeQueueItem({ work_id: 'simple-1', title: 'Task 1', completion_receipt: 'json:done-1.json' }));
queue = enqueue(queue, makeQueueItem({ work_id: 'simple-2', title: 'Task 2' }));
queue = enqueue(queue, makeQueueItem({ work_id: 'simple-3', title: 'Task 3' }));

const claim = claimCurrent(queue, { actor: 'main-agent' });
traceEntry('check', {
  source: 'agq-playbook/simple',
  step: 'claim_current_only',
  passed: claim.item.work_id === 'simple-1' && claim.queue.active_window.slot_2_next.status === 'queued',
});

const completed = completeCurrent(claim.queue, { work_id: 'simple-1', receipt: 'json:done-1.json' }, 'dpt_disp_agq_simple');
queue = completed.queue;
renderProjection(queue, 'dpt_disp_agq_simple');
traceEntry('check', {
  source: 'agq-playbook/simple',
  step: 'promote_projection',
  passed: completed.feedback.passed === true && queue.active_window.slot_1_current.work_id === 'simple-2',
});
JS

node "$B/t.mjs"
```

→ 预期：current only claim 成立，complete 后 `simple-2` promotion 到 `slot_1_current`，projection 写入 `_cache/agentic-queue/current-task.md`。

---

## Step 3: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_agq_simple"

cat > "$B/verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-agentic-queue/trace.mjs';

setTraceFile('dpt_disp_agq_simple/_trace_agq_cli.jsonl');
const events = readFileSync(getTraceFile(), 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter((event) => event.event === 'check');
const pass = checks.length >= 3 && checks.every((event) => event.passed === true);
console.log('checks:' + checks.length + ' total:' + events.length);
console.log(pass ? 'SIMPLE PASS' : 'SIMPLE FAIL');
if (!pass) process.exit(1);
traceCleanup();
JS

node "$B/verdict.mjs"
```

→ 预期：所有 `check` events 通过，SIMPLE PASS。

---

## Step 4: 清理

```bash
rm -rf "$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs agq_simple)"
echo "Cleaned up."
```
