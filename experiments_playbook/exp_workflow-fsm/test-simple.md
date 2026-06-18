---
schema: command-experiment/v1
experiment: workflow-fsm
case: simple
case_goal: "FSM Define→Advance→Verify：加载定义，逐步 advance(status)，每步从 trace 核实当前节点和转移"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wfsm_simple
trace: dpt_disp_wfsm_simple/_trace_wfsm_simple.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock、手写假 result、伪造 trace。

# test-workflow-fsm-simple

## 本实验的 FSM 定义

```
wf-simple.fsm.json:
  initial → wave.entry.md
  wave.entry.md      success → wave-audit.entry.md
  wave-audit.entry.md success → wave-final.entry.md
  wave-final.entry.md success → null (complete)
```

3 节点线性链。MD controller 运行每个 node，将 node 报告的 status 喂给 `advance()`，Engine 查 FSM 表裁决。

## Step 1: 创建 disposable bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wfsm_simple --nodes=experiments/prototype-workflow-fsm/nodes-workflow-fsm --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

## Step 2: Define — 加载 FSM

FSM 加载后 `Machine.current = wave.entry.md`，`canAdvance = true`。

```bash
B="dpt_disp_wfsm_simple"

cat > $B/define.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createMachine } from '../DPT_FRAMEWORK/engine/workflow-fsm.mjs';
const trace = createTrace('dpt_disp_wfsm_simple/_trace_wfsm_simple.jsonl', { consoleEcho: false });
const SRC = 'wfsm-simple'; trace.traceInit('wfsm-simple: define→advance→verify', { source: SRC });
const NODES_DIR = process.env.NODES_DIR;
const m = createMachine(`${NODES_DIR}/wf-simple.fsm.json`, trace);
trace.traceEntry('check', { source: SRC, step: 'define:name', passed: m.fsm.name === 'wf-simple' });
trace.traceEntry('check', { source: SRC, step: 'define:initial', passed: m.current === 'wave.entry.md',
  detail: `current = ${m.current}` });
trace.traceEntry('check', { source: SRC, step: 'define:can_advance', passed: m.canAdvance && !m.isComplete });
JS
NODES_DIR="$B/exp/nodes" node $B/define.mjs > /dev/null 2>&1
```

→ 预期：fsm.name = wf-simple，current = wave.entry.md，canAdvance。

## Step 3: Advance 1 — wave.entry →(success)→ wave-audit

```bash
B="dpt_disp_wfsm_simple"

cat > $B/advance1.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createMachine } from '../DPT_FRAMEWORK/engine/workflow-fsm.mjs';
const trace = createTrace('dpt_disp_wfsm_simple/_trace_wfsm_simple.jsonl', { consoleEcho: false });
const SRC = 'wfsm-simple'; const NODES_DIR = process.env.NODES_DIR;
const m = createMachine(`${NODES_DIR}/wf-simple.fsm.json`, trace);
trace.traceEntry('check', { source: SRC, step: 'advance1:before',
  passed: m.current === 'wave.entry.md', detail: `当前: ${m.current}` });
m.advance('success');
trace.traceEntry('check', { source: SRC, step: 'advance1:after',
  passed: m.current === 'wave-audit.entry.md', detail: `推进到: ${m.current}` });
trace.traceEntry('check', { source: SRC, step: 'advance1:iterations', passed: m.iterations === 1 });
JS
NODES_DIR="$B/exp/nodes" node $B/advance1.mjs > /dev/null 2>&1
```

→ 预期：wave.entry → wave-audit。trace 有 1 条 transition。

## Step 4: Advance 2 — 连续两步到 wave-final

```bash
B="dpt_disp_wfsm_simple"

cat > $B/advance2.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createMachine } from '../DPT_FRAMEWORK/engine/workflow-fsm.mjs';
const trace = createTrace('dpt_disp_wfsm_simple/_trace_wfsm_simple.jsonl', { consoleEcho: false });
const SRC = 'wfsm-simple'; const NODES_DIR = process.env.NODES_DIR;
const m = createMachine(`${NODES_DIR}/wf-simple.fsm.json`, trace);
m.advance('success'); m.advance('success');
trace.traceEntry('check', { source: SRC, step: 'advance2:after',
  passed: m.current === 'wave-final.entry.md', detail: `推进到: ${m.current}` });
trace.traceEntry('check', { source: SRC, step: 'advance2:iterations', passed: m.iterations === 2 });
JS
NODES_DIR="$B/exp/nodes" node $B/advance2.mjs > /dev/null 2>&1
```

→ 预期：wave-final。累计 2 条 transition。

## Step 5: Advance 3 — wave-final → complete

三步到底。complete 后再 advance() 是 no-op。

```bash
B="dpt_disp_wfsm_simple"

cat > $B/advance3.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createMachine } from '../DPT_FRAMEWORK/engine/workflow-fsm.mjs';
const trace = createTrace('dpt_disp_wfsm_simple/_trace_wfsm_simple.jsonl', { consoleEcho: false });
const SRC = 'wfsm-simple'; const NODES_DIR = process.env.NODES_DIR;
const m = createMachine(`${NODES_DIR}/wf-simple.fsm.json`, trace);
m.advance('success'); m.advance('success'); m.advance('success');
trace.traceEntry('check', { source: SRC, step: 'advance3:complete',
  passed: m.isComplete && m.iterations === 3, detail: `outcome=${m.outcome}` });
trace.traceEntry('check', { source: SRC, step: 'advance3:noop',
  passed: m.advance('success') === 'complete', detail: 'complete 后 advance = no-op' });
JS
NODES_DIR="$B/exp/nodes" node $B/advance3.mjs > /dev/null 2>&1
```

→ 预期：isComplete，advance() 返回 'complete'。

## Step 6: 从 trace 裁决

每步独立创建 Machine → 累计 1+2+3 = 6 次 transition。

```bash
B="dpt_disp_wfsm_simple"

node -e "
const fs = require('fs');
const lines = fs.readFileSync('$B/_trace_wfsm_simple.jsonl','utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const p = checks.filter(e => e.passed).length;
const f = checks.filter(e => !e.passed).length;
const transitions = events.filter(e => e.event === 'transition');
console.log('checks: ' + checks.length + ' p=' + p + ' f=' + f + ' transitions=' + transitions.length + ' tot=' + events.length);
const pass = p === 10 && f === 0 && transitions.length === 6;
console.log(pass ? '\\x1b[32mSIMPLE PASS\\x1b[0m' : '\\x1b[31mSIMPLE FAIL\\x1b[0m');
if (!pass) process.exit(1);
"
```

→ 预期：10 checks，6 transitions（1+2+3）。

## Step 7: 清理

```bash
rm -rf $(node experiments/shared/new-disposable-bundle.mjs wfsm_simple)
```
