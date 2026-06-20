---
schema: command-experiment/v1
experiment: workflow-fsm
case: medium
weight: light
case_goal: "验证 retry 自环（failed → 自环, passed → advance）和 halt（undefined outcome）。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wfsm_medium
trace: dpt_disp_wfsm_medium/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock、手写假 result、伪造 trace。

# test-workflow-fsm-medium

## 本实验的 FSM 定义

**wf-retry.fsm.json（retry 自环）：**
```
initial → retry-node.entry.md
  retry-node.entry.md  failed → retry-node.entry.md  (自环，停在当前)
  retry-node.entry.md  passed → retry-next.entry.md  (advance)
  retry-next.entry.md  passed → null                 (complete)
```
MD controller 运行 retry-node，根据 counter 决定 `advance('failed')` 或 `advance('passed')`。

**wf-halt.fsm.json（halt）：**
```
initial → halt.entry.md
  halt.entry.md  passed → null
```
MD controller 误传 `advance('undefined_status')` → Engine 无此 transition → halt。

## Step 1: 创建 disposable bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wfsm_medium --nodes=experiments/prototype-workflow-fsm/nodes-workflow-fsm --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

## Step 2: Retry — error 自环 → success advance → complete

```bash
cat > $B/run_retry.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createMachine } from '../DPT_FRAMEWORK/engine/workflow-fsm.mjs';
const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: false });
const SRC = 'wfsm-medium'; trace.traceInit('wfsm-medium: retry step-by-step', { source: SRC });
const m = createMachine(`${NODES_DIR}/wf-retry.fsm.json`, trace);

// Define
trace.traceEntry('check', { source: SRC, step: 'define:initial',
  passed: m.current === 'retry-node.entry.md', detail: `当前: ${m.current}` });

// Step 1: failed → 自环，停在 retry-node
m.advance('failed');
trace.traceEntry('check', { source: SRC, step: 'step1:still_retry',
  passed: m.current === 'retry-node.entry.md' && m.canAdvance,
  detail: `failed 自环，仍在: ${m.current}` });
trace.traceEntry('check', { source: SRC, step: 'step1:iterations_1', passed: m.iterations === 1 });

// Step 2: passed → advance 到 retry-next
m.advance('passed');
trace.traceEntry('check', { source: SRC, step: 'step2:advanced',
  passed: m.current === 'retry-next.entry.md' && m.canAdvance,
  detail: `passed 推进到: ${m.current}` });
trace.traceEntry('check', { source: SRC, step: 'step2:iterations_2', passed: m.iterations === 2 });

// Step 3: retry-next → passed → complete
m.advance('passed');
trace.traceEntry('check', { source: SRC, step: 'step3:complete',
  passed: m.isComplete && m.iterations === 3,
  detail: `outcome=${m.outcome}` });
JS
node $B/run_retry.mjs $B $B/exp/nodes > /dev/null 2>&1
```

→ 预期：error 自环 → success advance → complete。trace 里 retry-node transition 顺序为 error → success。

## Step 3: Halt — undefined status

```bash
cat > $B/run_halt.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createMachine } from '../DPT_FRAMEWORK/engine/workflow-fsm.mjs';
const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: false });
const SRC = 'wfsm-medium';
const m = createMachine(`${NODES_DIR}/wf-halt.fsm.json`, trace);

// undefined_status → halt
m.advance('undefined_status');
trace.traceEntry('check', { source: SRC, step: 'halt:isHalted',
  passed: m.isHalted && m.haltReason.includes('undefined_status'),
  detail: `reason=${m.haltReason}` });
trace.traceEntry('check', { source: SRC, step: 'halt:iterations',
  passed: m.iterations === 1 });
JS
node $B/run_halt.mjs $B $B/exp/nodes > /dev/null 2>&1
```

→ 预期：isHalted，haltReason 含 'undefined_status'。

## Step 4: 从 trace 裁决

```bash
node -e "
const fs = require('fs');
const lines = fs.readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const p = checks.filter(e => e.passed).length;
const f = checks.filter(e => !e.passed).length;
const retryTrans = events.filter(e => e.event === 'transition' && e.currentNode === 'retry-node.entry.md');
console.log('checks: ' + checks.length + ' p=' + p + ' f=' + f + ' retry_transitions=' + retryTrans.length + ' tot=' + events.length);
console.log('  retry outcomes: ' + JSON.stringify(retryTrans.map(e => e.outcome)));
const pass = p === 8 && f === 0 && retryTrans[0].outcome === 'failed' && retryTrans[1].outcome === 'passed';
console.log(pass ? '\x1b[32mMEDIUM PASS\x1b[0m' : '\x1b[31mMEDIUM FAIL\x1b[0m');
if (!pass) process.exit(1);
"
```

→ 预期：8 checks，retry transition 顺序 error → success。

## Step 5: 清理

```bash
rm -rf dpt_disp_wfsm_*
```
