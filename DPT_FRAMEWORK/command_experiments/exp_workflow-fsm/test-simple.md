---
schema: command-experiment/v1
experiment: workflow-fsm
case: simple
case_goal: "FSM Define→Step→Verify：加载定义，逐步推进，每步从 trace 核实当前节点和转移"
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

3 节点线性链。每个节点执行后 `transition(current, 'success')`，Engine 查 FSM 裁决下一节点。

## Step 1: 创建 disposable bundle

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs wfsm_simple --nodes=experiments/prototype-workflow-fsm/nodes-workflow-fsm --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

## Step 2: Define — 加载 FSM

FSM 加载后 `Machine.current = wave.entry.md`，`canAdvance = true`。

```bash
B="dpt_disp_wfsm_simple"

cat > $B/define.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-workflow-fsm/trace.mjs';
import { createMachine } from '../experiments/prototype-workflow-fsm/workflow-fsm.mjs';
setTraceFile('dpt_disp_wfsm_simple/_trace_wfsm_simple.jsonl');
const SRC = 'wfsm-simple'; traceInit('wfsm-simple: define→step→verify', { source: SRC });
const NODES_DIR = process.env.NODES_DIR;
const m = createMachine(`${NODES_DIR}/wf-simple.fsm.json`);
traceEntry('check', { source: SRC, step: 'define:name', passed: m.fsm.name === 'wf-simple' });
traceEntry('check', { source: SRC, step: 'define:initial', passed: m.current === 'wave.entry.md',
  detail: `current = ${m.current}` });
traceEntry('check', { source: SRC, step: 'define:can_advance', passed: m.canAdvance && !m.isComplete });
JS
NODES_DIR="$B/exp/nodes" node $B/define.mjs > /dev/null 2>&1
```

→ 预期：fsm.name = wf-simple，current = wave.entry.md，canAdvance。

## Step 3: Step 1 — wave.entry →(success)→ wave-audit

当前 `wave.entry.md`，step() 后变成 `wave-audit.entry.md`。

```bash
B="dpt_disp_wfsm_simple"

cat > $B/step1.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-fsm/trace.mjs';
import { createMachine } from '../experiments/prototype-workflow-fsm/workflow-fsm.mjs';
setTraceFile('dpt_disp_wfsm_simple/_trace_wfsm_simple.jsonl');
const SRC = 'wfsm-simple'; const NODES_DIR = process.env.NODES_DIR;
const m = createMachine(`${NODES_DIR}/wf-simple.fsm.json`);
traceEntry('check', { source: SRC, step: 'step1:before',
  passed: m.current === 'wave.entry.md', detail: `当前: ${m.current}` });
m.step();
traceEntry('check', { source: SRC, step: 'step1:after',
  passed: m.current === 'wave-audit.entry.md', detail: `推进到: ${m.current}` });
traceEntry('check', { source: SRC, step: 'step1:iterations', passed: m.iterations === 1 });
JS
NODES_DIR="$B/exp/nodes" node $B/step1.mjs > /dev/null 2>&1
```

→ 预期：wave.entry → wave-audit。trace 有 1 条 `md:executed`。

## Step 4: Step 2 — 连续两步到 wave-final

重新 Load FSM，连续 step() 两次：wave.entry → wave-audit → wave-final。

```bash
B="dpt_disp_wfsm_simple"

cat > $B/step2.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-fsm/trace.mjs';
import { createMachine } from '../experiments/prototype-workflow-fsm/workflow-fsm.mjs';
setTraceFile('dpt_disp_wfsm_simple/_trace_wfsm_simple.jsonl');
const SRC = 'wfsm-simple'; const NODES_DIR = process.env.NODES_DIR;
const m = createMachine(`${NODES_DIR}/wf-simple.fsm.json`);
m.step(); m.step();
traceEntry('check', { source: SRC, step: 'step2:after',
  passed: m.current === 'wave-final.entry.md', detail: `推进到: ${m.current}` });
traceEntry('check', { source: SRC, step: 'step2:iterations', passed: m.iterations === 2 });
JS
NODES_DIR="$B/exp/nodes" node $B/step2.mjs > /dev/null 2>&1
```

→ 预期：wave-final。累计 trace 有 wave.entry + wave-audit 的 `md:executed`。

## Step 5: Step 3 — wave-final → complete

三步到底。complete 后再 step() 是 no-op。

```bash
B="dpt_disp_wfsm_simple"

cat > $B/step3.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-fsm/trace.mjs';
import { createMachine } from '../experiments/prototype-workflow-fsm/workflow-fsm.mjs';
setTraceFile('dpt_disp_wfsm_simple/_trace_wfsm_simple.jsonl');
const SRC = 'wfsm-simple'; const NODES_DIR = process.env.NODES_DIR;
const m = createMachine(`${NODES_DIR}/wf-simple.fsm.json`);
m.step(); m.step(); m.step();
traceEntry('check', { source: SRC, step: 'step3:complete',
  passed: m.isComplete && m.iterations === 3, detail: `outcome=${m.outcome}` });
traceEntry('check', { source: SRC, step: 'step3:noop',
  passed: m.step() === 'complete', detail: 'complete 后 step = no-op' });
JS
NODES_DIR="$B/exp/nodes" node $B/step3.mjs > /dev/null 2>&1
```

→ 预期：isComplete，step() 返回 'complete'。

## Step 6: 从 trace 裁决

每步独立 Load FSM → 累计 1+2+3 = 6 次 node 执行。Trace 里 6 条 `md:executed`。

```bash
B="dpt_disp_wfsm_simple"

node -e "
const fs = require('fs');
const lines = fs.readFileSync('$B/_trace_wfsm_simple.jsonl','utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const p = checks.filter(e => e.passed).length;
const f = checks.filter(e => !e.passed).length;
const md = events.filter(e => e.event === 'md:executed');
console.log('checks: ' + checks.length + ' p=' + p + ' f=' + f + ' md:executed=' + md.length + ' tot=' + events.length);
console.log('  nodes: ' + JSON.stringify(md.map(e => e.node)));
const pass = p === 10 && f === 0 && md.length === 6;
console.log(pass ? '\\x1b[32mSIMPLE PASS\\x1b[0m' : '\\x1b[31mSIMPLE FAIL\\x1b[0m');
if (!pass) process.exit(1);
"
```

→ 预期：10 checks，6 md:executed（1+2+3）。

## Step 7: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs wfsm_simple)
```
