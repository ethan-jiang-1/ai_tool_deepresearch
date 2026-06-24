---
schema: command-experiment/v1
experiment: workflow-chain
case: complex
weight: light
case_goal: "验证 MD controller mode 处理三种错误路径（缺失依赖、循环依赖、malformed frontmatter）并恢复：每种错误由 Markdown control surface 独立发起 load → Engine 返回 error 且不加载文件 → Phase Agent 确认后继续下一个 → 最终加载合法 entry 成功。证明错误不污染 Engine。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wc_complex
trace: dpt_disp_wc_complex/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Markdown control surface 承载 load 指令。每一步 Phase Agent 读取 MD 指令 → Engine 执行并写 trace → Phase Agent 读 trace 裁决并决定下一步。

三个错误场景各自独立——MD 每次创建新 runtime、发一个 load、检查错误、记录结论。最后 MD 验证 Engine 仍可正常加载合法 entry。

# test-workflow-chain-complex

## Step 1: 创建 bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wc_complex --nodes=experiments/prototype-workflow-chain/nodes-workflow-chain --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

---

## Step 2.1: MD 加载 missing.entry.md → 缺失依赖 → error

MD 指令：「加载 missing.entry.md。」

missing.entry.md 声明依赖 `nonexistent-file.md`，该文件不存在。Engine 必须返回 error 且不加载任何文件。

```bash
cat > $B/step_missing.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-complex';
trace.traceInit('wl-complex: MD error handling', { source: SRC });

const runtime = createWorkflowRuntime('test', NODES_DIR);
const before = runtime.receipts.length;
const result = assessNode('missing.entry.md', createState(), runtime, trace);
const newLoads = runtime.receipts.slice(before).filter(r => r.type === 'file_loaded');

trace.traceEntry('check', { source: SRC, step: 'missing:status',
  passed: result.status === 'error',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: SRC, step: 'missing:error_refs',
  passed: Boolean(result.error && result.error.includes('nonexistent-file.md') && result.error.includes('missing.entry.md')),
  detail: `error = ${result.error}` });

trace.traceEntry('check', { source: SRC, step: 'missing:no_load',
  passed: newLoads.length === 0,
  detail: `file_loaded during error = ${newLoads.length}` });
JS

node $B/step_missing.mjs $B $B/exp/nodes

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.step.startsWith('missing:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.step+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.1 — missing dep → error, 零文件加载 ✅');
"
```

→ 预期：status=error，error 含 nonexistent-file.md 和 missing.entry.md，无 file_loaded。

---

## Step 2.2: MD 加载 cycle-a.entry.md → 循环依赖 → error

MD 指令：「加载 cycle-a.entry.md。」

cycle-a.entry.md 依赖 cycle-b.dep.md，cycle-b.dep.md 又依赖 cycle-a.entry.md——形成环路。Engine 必须检测并返回 error。

```bash
cat > $B/step_cycle.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-complex';

const runtime = createWorkflowRuntime('test', NODES_DIR);
const before = runtime.receipts.length;
const result = assessNode('cycle-a.entry.md', createState(), runtime, trace);
const newLoads = runtime.receipts.slice(before).filter(r => r.type === 'file_loaded');

trace.traceEntry('check', { source: SRC, step: 'cycle:status',
  passed: result.status === 'error',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: SRC, step: 'cycle:error_refs',
  passed: Boolean(result.error && result.error.includes('cycle-a.entry.md') && result.error.includes('cycle-b.dep.md')),
  detail: `error = ${result.error}` });

trace.traceEntry('check', { source: SRC, step: 'cycle:no_load',
  passed: newLoads.length === 0,
  detail: `file_loaded during error = ${newLoads.length}` });
JS

node $B/step_cycle.mjs $B $B/exp/nodes

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.step.startsWith('cycle:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.step+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.2 — cycle dep → error, 零文件加载 ✅');
"
```

→ 预期：status=error，error 含 cycle-a 和 cycle-b，无 file_loaded。

---

## Step 2.3: MD 加载 malformed.entry.md → schema 错误 → error

MD 指令：「加载 malformed.entry.md。」

malformed.entry.md 的 frontmatter JSON schema 不合法（requires 应为数组但是字符串）。Engine 必须返回 error 且不加载文件。

```bash
cat > $B/step_malformed.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-complex';

const runtime = createWorkflowRuntime('test', NODES_DIR);
const before = runtime.receipts.length;
const result = assessNode('malformed.entry.md', createState(), runtime, trace);
const newLoads = runtime.receipts.slice(before).filter(r => r.type === 'file_loaded');

trace.traceEntry('check', { source: SRC, step: 'malformed:status',
  passed: result.status === 'error',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: SRC, step: 'malformed:error_refs',
  passed: Boolean(result.error && result.error.includes('Invalid frontmatter schema') && result.error.includes('malformed.entry.md')),
  detail: `error = ${result.error}` });

trace.traceEntry('check', { source: SRC, step: 'malformed:no_load',
  passed: newLoads.length === 0,
  detail: `file_loaded during error = ${newLoads.length}` });
JS

node $B/step_malformed.mjs $B $B/exp/nodes

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.step.startsWith('malformed:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.step+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.3 — malformed frontmatter → error, 零文件加载 ✅');
"
```

→ 预期：status=error，error 含 Invalid frontmatter schema 和 malformed.entry.md，无 file_loaded。

---

## Step 2.4: MD 加载 wave.entry.md → 恢复 → loaded

三次错误后，MD 验证 Engine 未被污染——加载合法 entry wave.entry.md 仍正常。

```bash
cat > $B/step_recovery.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-complex';

const runtime = createWorkflowRuntime('test', NODES_DIR);
const result = assessNode('wave.entry.md', createState(), runtime, trace);

trace.traceEntry('check', { source: SRC, step: 'recovery:status',
  passed: result.status === 'loaded',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: SRC, step: 'recovery:entry_loaded',
  passed: result.state.executionOrder.includes('wave.entry.md') && result.state.counters['wave.entry.md'] === 1,
  detail: `order=${JSON.stringify(result.state.executionOrder)}, count=${result.state.counters['wave.entry.md']}` });
JS

node $B/step_recovery.mjs $B $B/exp/nodes

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.step.startsWith('recovery:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.step+' — '+x.detail));
const ok=c.length===2&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.4 — 错误后恢复，正常加载 wave.entry.md ✅');
"
```

→ 预期：status=loaded，executionOrder 含 wave.entry.md。

---

## Step 2.5: MD 最终裁决——汇总全部 check event

MD 统计全部 5 个 step（4 个 load + 3×3 错误 checks + 2 recovery = 11 checks）。

```bash
cat > $B/verify.mjs << 'JS2'
import { readFileSync } from 'node:fs';
const B=process.argv[2];
const lines = readFileSync(B+'/_trace.jsonl','utf-8').trim().split('\n');
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
console.log('\n\x1b[32mALL CHECKS PASSED\x1b[0m');
JS2

node $B/verify.mjs $B
```

→ 预期：`11 checks, 11 passed, 0 failed`。

---

## Step 3: 清理

```bash
rm -rf $B
```
