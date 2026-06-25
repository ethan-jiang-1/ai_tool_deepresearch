---
schema: command-experiment/v1
experiment: workflow-chain
case: case-31-light-lazy-load
weight: light
case_goal: "验证 MD controller mode 显式驱动 single-entry loader：Markdown control surface 创建 runtime → Phase Agent 调 assessNode → Engine 返回结果 → Phase Agent 从 trace 交叉验证。runtime init 不预读任何 MD。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-31_wc_simple
trace: dpt_disp_case-31_wc_simple/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Markdown control surface 承载步骤指令。每一步是 Phase Agent 读取 MD 指令 → Engine 执行并写 trace → Phase Agent 读 trace 验证。一个 bash block = 一次 MD↔Engine 交互。

本实验验证：MD 创建 runtime 时 Engine 不预读文件；MD 显式调 `assessNode('wave.entry.md')` 才加载；MD 从 trace 交叉验证每个 event。

# case-31-light-lazy-load


## Expected Runtime Path

1. 创建 bundle + nodes 目录 [MAIN/SHELL]
2. MD 创建 runtime → 验证 contentCache 为空, 无预读 [MAIN/SHELL]
3. MD 调 assessNode → Engine 加载 wave.entry.md [MAIN/SHELL]
4. MD 交叉验证 trace: file_loaded event 存在 [MAIN/SHELL]
5. 从 trace 裁决 + Cleanup

## Step 1: 创建 bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wc_simple --case case-31 --nodes=experiments_env/prototype-workflow-chain/nodes-workflow-chain --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

---

以下 Step 2.1–2.4：MD 逐步驱动 Engine，每步写 trace，MD 读 trace 裁决。

---

## Step 2.1: MD 创建 runtime → 验证 Engine 不预读

MD 指令：「创建 workflow runtime，只加载 nodesDir，不读任何 MD 文件。」

Engine 回答：runtime 就绪，contentCache 为空，无 file_read receipt。

```bash
cat > $B/step_init.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-simple';
trace.traceInit('wl-simple: MD controller mode → Engine', { source: SRC });

const runtime = createWorkflowRuntime('test', NODES_DIR);

// Engine 回答 MD：runtime 状态
trace.traceEntry('check', { source: SRC, step: 'init:cache_empty',
  passed: runtime.contentCache.size === 0,
  detail: `contentCache.size = ${runtime.contentCache.size}` });

trace.traceEntry('check', { source: SRC, step: 'init:no_file_read',
  passed: runtime.receipts.filter(r => r.type === 'file_read').length === 0,
  detail: 'no file_read receipt before explicit load' });

trace.traceEntry('check', { source: SRC, step: 'init:keys',
  passed: runtime.receipts.length === 0,
  detail: `receipts.length = ${runtime.receipts.length}` });
JS

node $B/step_init.mjs $B $B/exp/nodes

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.step.startsWith('init:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.step+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.1 — runtime init 不预读 ✅');
"
```

→ 预期：3 个 check 全 PASS。Engine 未预读任何文件。

---

## Step 2.2: MD 调 assessNode → Engine 加载 wave.entry.md

MD 指令：「加载 wave.entry.md。」

Engine 执行：读文件、解析依赖（自包含，无依赖）、加载、写 trace。

```bash
cat > $B/step_load.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-simple';

const runtime = createWorkflowRuntime('test', NODES_DIR);
const result = assessNode('wave.entry.md', createState(), runtime, trace);

// Engine 回答 MD：load 结果
trace.traceEntry('check', { source: SRC, step: 'load:status',
  passed: result.status === 'loaded',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: SRC, step: 'load:plan',
  passed: JSON.stringify(result.plan) === JSON.stringify(['wave.entry.md']),
  detail: `plan = ${JSON.stringify(result.plan)}` });

trace.traceEntry('check', { source: SRC, step: 'load:entry_loaded',
  passed: result.state.executionOrder.includes('wave.entry.md') && result.state.counters['wave.entry.md'] === 1,
  detail: `order=${JSON.stringify(result.state.executionOrder)}, count=${result.state.counters['wave.entry.md']}` });
JS

node $B/step_load.mjs $B $B/exp/nodes

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.step.startsWith('load:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.step+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.2 — Engine 成功加载 wave.entry.md ✅');
"
```

→ 预期：status=loaded，plan 只有 entry 自身，executionOrder 包含 entry。

---

## Step 2.3: MD 交叉验证——读 trace 文件检查 file_loaded event

MD 不信任 receipts，读原始 trace 文件交叉验证 Engine 确实写了 file_loaded。

```bash
node -e "
const e=require('fs').readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const fileLoaded=e.filter(x=>x.event==='file_loaded');
const waveLoaded=fileLoaded.some(x=>x.fileRef==='wave.entry.md');
const fileRead=e.filter(x=>x.event==='file_read');

console.log('trace events: '+e.length);
console.log('file_loaded events: '+fileLoaded.length);
console.log('wave.entry.md loaded in trace: '+waveLoaded);
console.log('file_read events: '+fileRead.length);
console.log('cache keys at end: '+JSON.stringify([...new Set(e.filter(x=>x.event==='file_loaded').map(x=>x.fileRef))]));

if(!waveLoaded)process.exit(1);
console.log('MD裁决: Step 2.3 — trace 文件交叉验证通过 ✅');
"
```

→ 预期：trace 中有 file_loaded event，fileRef = wave.entry.md。

---

## Step 2.4: MD 最终裁决——汇总全部 check event

MD 统计整个实验中所有 check event，判定 PASS/FAIL。

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

→ 预期：`6 checks, 6 passed, 0 failed`。

---


## Step 3: 结果解读

> 6 个 check，验证 MD controller 的 lazy load：
>   [init:cache_empty] runtime 创建后 contentCache 为空，无预读
>   [init:no_file_read] 无 file_read receipt——证明未预读文件
>   [init:keys] receipts 长度=0
>   [load:status] assessNode 返回 loaded
>   [load:plan] 自包含文件 plan=[wave.entry.md]
>   [load:entry_loaded] executionOrder 含 entry 且 counters=1
>   全部 expected:true → 6/6 PASS 即通过。

## Step 4: 清理

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf $B
```