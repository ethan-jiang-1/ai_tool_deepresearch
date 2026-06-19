---
schema: command-experiment/v1
experiment: workflow-chain
case: simple
weight: light
case_goal: "验证 single-entry loader 在调用前不预读 MD，调用 assessNode 后才加载自包含 entry。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wc_simple
trace: dpt_disp_wc_simple/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-workflow-chain-simple

验证 `assessNode('wave.entry.md')` 显式加载一个自包含 entry；runtime 创建时不得预读任何 MD。

## Step 1: 创建真正的 DPT run bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wc_simple --nodes=experiments/prototype-workflow-chain/nodes-workflow-chain --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

## Step 2: 验证 runtime init 不预读 MD

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wc_simple"

cat > $B/check_init.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const trace = createTrace('dpt_disp_wc_simple/_trace.jsonl', { consoleEcho: false });
const SRC = 'wl-simple';
trace.traceInit('wl-simple single-entry test (real bundle)', { source: SRC });

const runtime = createWorkflowRuntime();

trace.traceEntry('check', { source: SRC, step: 'init:cache_empty',
  passed: runtime.contentCache.size === 0,
  detail: `contentCache.size = ${runtime.contentCache.size}` });

trace.traceEntry('check', { source: SRC, step: 'init:no_cursor',
  passed: !('cursor' in runtime) && !('manifest' in runtime),
  detail: `keys = ${Object.keys(runtime).join(', ')}` });

trace.traceEntry('check', { source: SRC, step: 'init:no_file_read',
  passed: runtime.receipts.filter(r => r.type === 'file_read').length === 0,
  detail: 'no file_read receipt before explicit load' });
JS

NODES_DIR="$B/exp/nodes" node $B/check_init.mjs
```

→ 预期：3 个 check 全部 `passed: true`。

## Step 3: 显式加载 self-contained entry

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wc_simple"

cat > $B/check_load.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const trace = createTrace('dpt_disp_wc_simple/_trace.jsonl', { consoleEcho: false });
const SRC = 'wl-simple';

const runtime = createWorkflowRuntime();
const result = assessNode('wave.entry.md', createState(), runtime, trace);

trace.traceEntry('check', { source: SRC, step: 'load:status_loaded',
  passed: result.status === 'loaded',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: SRC, step: 'load:plan_entry_only',
  passed: JSON.stringify(result.plan) === JSON.stringify(['wave.entry.md']),
  detail: `plan = ${JSON.stringify(result.plan)}` });

trace.traceEntry('check', { source: SRC, step: 'load:entry_loaded',
  passed: result.state.executionOrder.includes('wave.entry.md') && result.state.counters['wave.entry.md'] === 1,
  detail: `executionOrder=${JSON.stringify(result.state.executionOrder)}, wave.entry.md=${result.state.counters['wave.entry.md']}` });

trace.traceEntry('check', { source: SRC, step: 'load:no_unrelated_read',
  passed: !runtime.contentCache.has('audit.md'),
  detail: `cache keys = ${JSON.stringify([...runtime.contentCache.keys()])}` });

trace.traceEntry('check', { source: SRC, step: 'load:receipts_present',
  passed: ['load_start', 'file_read', 'dependency_resolved', 'file_loaded', 'load_complete'].every(t => runtime.receipts.some(r => r.type === t)),
  detail: `receipt types = ${runtime.receipts.map(r => r.type).join(', ')}` });

// Engine writes file_loaded to trace; verify from trace file, not just receipts
import { readFileSync } from 'node:fs';

const traceEvents = readFileSync(trace.traceFilePath(), 'utf-8').trim().split('\n').map(JSON.parse);
trace.traceEntry('check', { source: SRC, step: 'load:file_loaded_in_trace',
  passed: traceEvents.some(e => e.event === 'file_loaded' && e.fileRef === 'wave.entry.md'),
  detail: `file_loaded in trace = ${traceEvents.some(e => e.event === 'file_loaded')}` });
JS

NODES_DIR="$B/exp/nodes" node $B/check_load.mjs
```

→ 预期：6 个 check 全部 passed，trace 包含 loader phase events + node self-trace。

## Step 4: 从 trace 做最终裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wc_simple"

cat > $B/verify.mjs << 'JS2'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';

const trace = createTrace('dpt_disp_wc_simple/_trace.jsonl', { consoleEcho: false });

const lines = readFileSync(trace.traceFilePath(), 'utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const passed = checks.filter(e => e.passed);
const failed = checks.filter(e => !e.passed);

console.log(`Result: ${checks.length} checks, ${passed.length} passed, ${failed.length} failed (${events.length} total events)`);
if (failed.length > 0) {
  for (const c of failed) console.log(`\x1b[31m  FAIL ${c.step}: ${c.detail}\x1b[0m`);
  process.exit(1);
}
for (const c of passed) console.log(`\x1b[32m  PASS ${c.step}\x1b[0m`);
console.log('\x1b[32mALL CHECKS PASSED\x1b[0m');

trace.traceCleanup();
JS2

node $B/verify.mjs
```

→ 预期：`9 checks, 9 passed, 0 failed`。

## Step 5: 清理

```bash
rm -rf dpt_disp_wc_*
```
