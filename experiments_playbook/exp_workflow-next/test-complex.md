---
schema: command-experiment/v1
experiment: workflow-next
case: complex
case_goal: "验证 missing dependency、cycle、malformed frontmatter 都不执行任何 MD，并验证同一 runtime 可恢复到合法 entry load。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wl_complex
trace: dpt_disp_wl_complex/_trace_wl_complex.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-workflow-next-complex

验证 single-entry loader 错误路径和恢复能力：缺失依赖、循环依赖、malformed frontmatter 都返回 error 且不执行任何 MD；之后同一 runtime 仍可加载合法 entry。

## Step 1: 创建真正的 DPT run bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wl_complex --nodes=experiments/prototype-workflow-next/nodes-workflow-next --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

## Step 2: 错误路径 + recovery

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wl_complex"

cat > $B/check_errors_and_recovery.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const trace = createTrace('dpt_disp_wl_complex/_trace_wl_complex.jsonl', { consoleEcho: false });
const SRC = 'wl-complex';
trace.traceInit('wl-complex single-entry test', { source: SRC });

const runtime = createWorkflowRuntime();

function receiptCursor() {
  return runtime.receipts.length;
}

function checkErrorCase(label, entry, predicate) {
  const before = receiptCursor();
  const result = assessNode(entry, createState(), runtime, trace);

  const newReceipts = runtime.receipts.slice(before);
  const newExecs = newReceipts.filter(r => r.type === 'file_executed');

  trace.traceEntry('check', { source: SRC, step: `${label}:status_error`,
    passed: result.status === 'error',
    detail: `status = ${result.status}` });

  trace.traceEntry('check', { source: SRC, step: `${label}:error_shape`,
    passed: Boolean(result.error && predicate(result.error)),
    detail: `error = ${result.error}` });

  trace.traceEntry('check', { source: SRC, step: `${label}:no_execution`,
    passed: newExecs.length === 0,
    detail: `file_executed in case = ${newExecs.length}` });

  return result;
}

checkErrorCase('missing', 'missing.entry.md',
  error => error.includes('nonexistent-file.md') && error.includes('missing.entry.md'));

checkErrorCase('cycle', 'cycle-a.entry.md',
  error => error.includes('cycle-a.entry.md') && error.includes('cycle-b.dep.md'));

checkErrorCase('malformed', 'malformed.entry.md',
  error => error.includes('Malformed JSON') && error.includes('malformed.entry.md'));

const beforeRecovery = receiptCursor();
const recovered = assessNode('wave.entry.md', createState(), runtime, trace);

trace.traceEntry('check', { source: SRC, step: 'recovery:status_loaded',
  passed: recovered.status === 'loaded',
  detail: `status = ${recovered.status}` });

trace.traceEntry('check', { source: SRC, step: 'recovery:entry_executed',
  passed: recovered.state.executionOrder.includes('wave.entry.md') && recovered.state.counters.wave === 1,
  detail: `executionOrder=${JSON.stringify(recovered.state.executionOrder)}, wave=${recovered.state.counters.wave}` });

trace.traceEntry('check', { source: SRC, step: 'recovery:same_runtime_reused',
  passed: runtime.receipts.some(r => r.type === 'load_error') && runtime.receipts.some(r => r.type === 'load_complete'),
  detail: `receipt types=${runtime.receipts.map(r => r.type).join(', ')}` });
JS

NODES_DIR="$B/exp/nodes" node $B/check_errors_and_recovery.mjs
```

→ 预期：12 个 check 全 passed。

## Step 3: 从 trace 做最终裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_wl_complex"

cat > $B/verify.mjs << 'JS2'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';

const trace = createTrace('dpt_disp_wl_complex/_trace_wl_complex.jsonl', { consoleEcho: false });

const lines = readFileSync(trace.traceFilePath(), 'utf-8').trim().split('\n');
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

trace.traceCleanup();
JS2

node $B/verify.mjs
```

→ 预期：`12 checks, 12 passed, 0 failed`。

## Step 4: 清理

```bash
rm -rf $(node experiments/shared/new-disposable-bundle.mjs wl_complex)
```
