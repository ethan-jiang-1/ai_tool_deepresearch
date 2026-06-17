---
schema: command-experiment/v1
experiment: workflow-next
case: medium
case_goal: "验证 single-entry loader 的 dependency-first 执行，以及跨显式 load 调用的内容缓存与重新执行。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wl_medium
trace: dpt_disp_wl_medium/_trace_wl_medium.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-workflow-next-medium

验证 `loadNextMarkdown(entry)` 解析 entry closure，按依赖优先顺序执行，并在同一 runtime 中对已读依赖产生 cache_hit 但仍重新执行。

## Step 1: 创建真正的 DPT run bundle

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs wl_medium --nodes=experiments/prototype-workflow-next/nodes-workflow-next --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

## Step 2: 验证 dependency-first chain

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wl_medium"

cat > $B/check_chain.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-workflow-next/trace.mjs';
import { createWorkflowRuntime, createInitialState, loadNextMarkdown } from '../experiments/prototype-workflow-next/workflow-next.mjs';

setTraceFile('dpt_disp_wl_medium/_trace_wl_medium.jsonl');
const SRC = 'wl-medium';
traceInit('wl-medium single-entry test', { source: SRC });

const runtime = createWorkflowRuntime();
const result = loadNextMarkdown('chain.entry.md', createInitialState(), runtime);

traceEntry('check', { source: SRC, step: 'chain:status_loaded',
  passed: result.status === 'loaded',
  detail: `status = ${result.status}` });

traceEntry('check', { source: SRC, step: 'chain:plan_dependency_first',
  passed: JSON.stringify(result.plan) === JSON.stringify(['chain-policy.dep.md', 'chain-context.dep.md', 'chain.entry.md']),
  detail: `plan = ${JSON.stringify(result.plan)}` });

const order = result.state.executionOrder;
traceEntry('check', { source: SRC, step: 'chain:execution_dependency_first',
  passed: JSON.stringify(order) === JSON.stringify(['chain-policy.dep.md', 'chain-context.dep.md', 'chain.entry.md']),
  detail: `order = ${JSON.stringify(order)}` });
JS

experiments/prototype-workflow-next/nodes-workflow-next="$B/exp/nodes" node $B/check_chain.mjs
```

→ 预期：3 个 check 全 passed。

## Step 3: 验证 cache hit + 重新执行

repeat-1.entry.md 和 repeat-2.entry.md 都依赖 shared-lib.dep.md。

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wl_medium"

cat > $B/check_cache.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-next/trace.mjs';
import { createWorkflowRuntime, createInitialState, loadNextMarkdown } from '../experiments/prototype-workflow-next/workflow-next.mjs';

setTraceFile('dpt_disp_wl_medium/_trace_wl_medium.jsonl');
const SRC = 'wl-medium';

const runtime = createWorkflowRuntime();
let state = createInitialState();

const r1 = loadNextMarkdown('repeat-1.entry.md', state, runtime);
state = r1.state;
const r2 = loadNextMarkdown('repeat-2.entry.md', state, runtime);
state = r2.state;

const reads = runtime.receipts.filter(r => r.type === 'file_read' && r.fileRef === 'shared-lib.dep.md');
const hits = runtime.receipts.filter(r => r.type === 'cache_hit' && r.fileRef === 'shared-lib.dep.md');
const execs = runtime.receipts.filter(r => r.type === 'file_executed' && r.fileRef === 'shared-lib.dep.md');

traceEntry('check', { source: SRC, step: 'cache:first_read_once',
  passed: reads.length === 1,
  detail: `shared-lib file_read count = ${reads.length}` });

traceEntry('check', { source: SRC, step: 'cache:second_cache_hit',
  passed: hits.length >= 1,
  detail: `shared-lib cache_hit count = ${hits.length}` });

traceEntry('check', { source: SRC, step: 'cache:executed_twice',
  passed: execs.length === 2 && state.counters.sharedLib === 2,
  detail: `shared-lib execs=${execs.length}, counter=${state.counters.sharedLib}` });

traceEntry('check', { source: SRC, step: 'cache:both_entries_loaded',
  passed: r1.status === 'loaded' && r2.status === 'loaded',
  detail: `statuses=${r1.status},${r2.status}` });
JS

experiments/prototype-workflow-next/nodes-workflow-next="$B/exp/nodes" node $B/check_cache.mjs
```

→ 预期：shared-lib 被读一次、执行两次。4 个 check 全 passed。

## Step 4: 从 trace 做最终裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wl_medium"

cat > $B/verify.mjs << 'JS2'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-workflow-next/trace.mjs';

setTraceFile('dpt_disp_wl_medium/_trace_wl_medium.jsonl');

const lines = readFileSync(getTraceFile(), 'utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const passed = checks.filter(e => e.passed);
const failed = checks.filter(e => !e.passed);

console.log(`Result: ${checks.length} checks, ${passed.length} passed, ${failed.length} failed (${events.length} total events)`);
if (failed.length > 0) {
  for (const c of failed) console.log(`  FAIL ${c.step}: ${c.detail}`);
  process.exit(1);
}
for (const c of passed) console.log(`  PASS ${c.step}`);
console.log('ALL CHECKS PASSED');

traceCleanup();
JS2

node $B/verify.mjs
```

→ 预期：`7 checks, 7 passed, 0 failed`。

## Step 5: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs wl_medium)
```
