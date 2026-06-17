# test-workflow-load-simple (简单)

验证一个核心假设：**manifest load 不预读 step MD，advance 时才动态加载**。

- Bundle: `dpt_rb_test_wl_simple/`
- Trace: `_trace_wl_simple.jsonl`
- 预期: 7 个 trace event，6 个 check 全部 passed

---

## Step 1: 创建实验环境

创建 bundle 和 manifest。manifest 只声明 step 顺序，不触碰任何 MD 文件内容。

```bash
B="dpt_rb_test_wl_simple"
rm -rf $B && mkdir -p $B/.tmp

cat > $B/.tmp/workflow.json << 'EOF'
{"name": "wl-simple", "steps": ["wave-entry.md"]}
EOF

echo "✓ manifest written:"
cat $B/.tmp/workflow.json
```

---

## Step 2: 验证启动时不预读 step MD

`loadWorkflowManifest` + `createWorkflowRuntime` 之后，立刻检查 runtime 内部状态：
- contentCache 应为空
- cursor 应为 0
- 不应有任何 file_read receipt

```bash
cat > $B/check_init.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-workflow-load/trace.mjs';
import { loadWorkflowManifest, createWorkflowRuntime } from '../experiments/prototype-workflow-load/workflow-load.mjs';

setTraceFile('dpt_rb_test_wl_simple/_trace_wl_simple.jsonl');
const SRC = 'wl-simple';

// 只在第一步 traceInit（创建新 trace 文件）
traceInit('wl-simple test', { source: SRC });

const manifest = loadWorkflowManifest('dpt_rb_test_wl_simple/.tmp/workflow.json');
const runtime = createWorkflowRuntime(manifest);

traceEntry('check', { source: SRC, step: 'init:cache_empty',
  passed: runtime.contentCache.size === 0,
  detail: `contentCache.size = ${runtime.contentCache.size}` });

traceEntry('check', { source: SRC, step: 'init:cursor_zero',
  passed: runtime.cursor === 0,
  detail: `cursor = ${runtime.cursor}` });

traceEntry('check', { source: SRC, step: 'init:no_file_read',
  passed: runtime.receipts.filter(r => r.type === 'file_read').length === 0,
  detail: 'no file_read receipt before advance' });
JS

node $B/check_init.mjs
```

→ 预期：3 个 check 全部 `passed: true`。

---

## Step 3: 推进 workflow，验证 step MD 被动态加载

这一步**重新创建 runtime**（给定相同 manifest，行为完全一致），然后调用 `advanceWorkflow`。trace 追加到上一步的文件。

```bash
cat > $B/check_advance.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-load/trace.mjs';
import { loadWorkflowManifest, createWorkflowRuntime, createInitialState, advanceWorkflow } from '../experiments/prototype-workflow-load/workflow-load.mjs';

// 注意：不调 traceInit，trace 追加到 Step 2 创建的文件
setTraceFile('dpt_rb_test_wl_simple/_trace_wl_simple.jsonl');
const SRC = 'wl-simple';

const manifest = loadWorkflowManifest('dpt_rb_test_wl_simple/.tmp/workflow.json');
const runtime = createWorkflowRuntime(manifest);
const state = createInitialState();
const result = advanceWorkflow(state, runtime);

traceEntry('check', { source: SRC, step: 'adv:status_advanced',
  passed: result.status === 'advanced',
  detail: `status = ${result.status}` });

traceEntry('check', { source: SRC, step: 'adv:step_executed',
  passed: result.state.executionOrder.includes('wave-entry.md'),
  detail: `executionOrder = ${JSON.stringify(result.state.executionOrder)}` });

traceEntry('check', { source: SRC, step: 'adv:cursor_moved',
  passed: runtime.cursor === 1,
  detail: `cursor = ${runtime.cursor}` });

// 关键证据：file_read 发生在 advance 期间
const reads = runtime.receipts.filter(r => r.type === 'file_read');
traceEntry('check', { source: SRC, step: 'adv:file_read_happened',
  passed: reads.length >= 1 && reads.some(r => r.fileRef === 'wave-entry.md'),
  detail: `files read: ${reads.map(r => r.fileRef).join(', ')}` });
JS

node $B/check_advance.mjs
```

→ 预期：4 个 check 全部 passed。`adv:file_read_happened` 是最关键的证据——证明确实是 advance 时才第一次读文件。

---

## Step 4: 从 trace 做最终裁决

读取 trace 文件，统计所有 check 的 pass/fail。

```bash
cat > $B/verify.mjs << 'JS2'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-workflow-load/trace.mjs';

setTraceFile('dpt_rb_test_wl_simple/_trace_wl_simple.jsonl');

const lines = readFileSync(getTraceFile(), 'utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const passed = checks.filter(e => e.passed);
const failed = checks.filter(e => !e.passed);

console.log('');
console.log(`Result: ${checks.length} checks, ${passed.length} passed, ${failed.length} failed (${events.length} total events)`);
console.log('');
if (failed.length > 0) {
  console.log('FAILURES:');
  for (const c of failed) console.log(`  ✗ ${c.step}: ${c.detail}`);
  process.exit(1);
} else {
  for (const c of passed) console.log(`  ✓ ${c.step}`);
  console.log('');
  console.log('ALL CHECKS PASSED');
}

traceCleanup();
JS2

node $B/verify.mjs
```

→ 预期：`7 checks, 7 passed, 0 failed`。

---

## Step 5: 清理

```bash
rm -rf dpt_rb_test_wl_simple
echo "✓ Cleaned up."
```
