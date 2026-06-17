---
schema: command-experiment/v1
experiment: workflow-next
case: simple
case_goal: "验证 single-entry loader 在调用前不预读 MD，调用 loadNextMarkdown 后才加载并执行自包含 entry。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wl_simple
trace: dpt_disp_wl_simple/_trace_wl_simple.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-workflow-next-simple

验证 `loadNextMarkdown('wave.entry.md')` 显式加载一个自包含 entry；runtime 创建时不得预读任何 MD。

## Step 1: 创建真正的 DPT run bundle

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs wl_simple --nodes=experiments/prototype-workflow-next/nodes-workflow-next --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

## Step 2: 验证 runtime init 不预读 MD

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wl_simple"

cat > $B/check_init.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-workflow-next/trace.mjs';
import { createWorkflowRuntime } from '../experiments/prototype-workflow-next/workflow-next.mjs';

setTraceFile('dpt_disp_wl_simple/_trace_wl_simple.jsonl');
const SRC = 'wl-simple';
traceInit('wl-simple single-entry test (real bundle)', { source: SRC });

const runtime = createWorkflowRuntime();

traceEntry('check', { source: SRC, step: 'init:cache_empty',
  passed: runtime.contentCache.size === 0,
  detail: `contentCache.size = ${runtime.contentCache.size}` });

traceEntry('check', { source: SRC, step: 'init:no_cursor',
  passed: !('cursor' in runtime) && !('manifest' in runtime),
  detail: `keys = ${Object.keys(runtime).join(', ')}` });

traceEntry('check', { source: SRC, step: 'init:no_file_read',
  passed: runtime.receipts.filter(r => r.type === 'file_read').length === 0,
  detail: 'no file_read receipt before explicit load' });
JS

experiments/prototype-workflow-next/nodes-workflow-next="$B/exp/nodes" node $B/check_init.mjs
```

→ 预期：3 个 check 全部 `passed: true`。

## Step 3: 显式加载 self-contained entry

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wl_simple"

cat > $B/check_load.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-next/trace.mjs';
import { createWorkflowRuntime, createInitialState, loadNextMarkdown } from '../experiments/prototype-workflow-next/workflow-next.mjs';

setTraceFile('dpt_disp_wl_simple/_trace_wl_simple.jsonl');
const SRC = 'wl-simple';

const runtime = createWorkflowRuntime();
const result = loadNextMarkdown('wave.entry.md', createInitialState(), runtime);

traceEntry('check', { source: SRC, step: 'load:status_loaded',
  passed: result.status === 'loaded',
  detail: `status = ${result.status}` });

traceEntry('check', { source: SRC, step: 'load:plan_entry_only',
  passed: JSON.stringify(result.plan) === JSON.stringify(['wave.entry.md']),
  detail: `plan = ${JSON.stringify(result.plan)}` });

traceEntry('check', { source: SRC, step: 'load:entry_executed',
  passed: result.state.executionOrder.includes('wave.entry.md') && result.state.counters.wave === 1,
  detail: `executionOrder=${JSON.stringify(result.state.executionOrder)}, wave=${result.state.counters.wave}` });

traceEntry('check', { source: SRC, step: 'load:no_unrelated_read',
  passed: !runtime.contentCache.has('audit.md'),
  detail: `cache keys = ${JSON.stringify([...runtime.contentCache.keys()])}` });

traceEntry('check', { source: SRC, step: 'load:receipts_present',
  passed: ['load_start', 'file_read', 'dependency_resolved', 'file_executed', 'load_complete'].every(t => runtime.receipts.some(r => r.type === t)),
  detail: `receipt types = ${runtime.receipts.map(r => r.type).join(', ')}` });

// Node writes its own trace directly; verify from trace file, not receipts
import { readFileSync } from 'node:fs';
import { getTraceFile } from '../experiments/prototype-workflow-next/trace.mjs';
const traceEvents = readFileSync(getTraceFile(), 'utf-8').trim().split('\n').map(JSON.parse);
traceEntry('check', { source: SRC, step: 'load:node_self_traced',
  passed: traceEvents.some(e => e.event === 'md:executed' && e.node === 'wave.entry.md'),
  detail: `node_executed in trace = ${traceEvents.some(e => e.event === 'md:executed')}` });
JS

experiments/prototype-workflow-next/nodes-workflow-next="$B/exp/nodes" node $B/check_load.mjs
```

→ 预期：6 个 check 全部 passed，trace 包含 loader phase events + node self-trace。

## Step 4: 从 trace 做最终裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wl_simple"

cat > $B/verify.mjs << 'JS2'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-workflow-next/trace.mjs';

setTraceFile('dpt_disp_wl_simple/_trace_wl_simple.jsonl');

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

→ 预期：`9 checks, 9 passed, 0 failed`。

## Step 5: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs wl_simple)
```
