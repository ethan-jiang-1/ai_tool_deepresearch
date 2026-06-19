---
schema: command-experiment/v1
experiment: workflow-fsm
case: complex
weight: light
case_goal: "验证 FSM transition 级 halt 场景：undefined status、unknown node，以及 halt 后的 recovery。错误不污染 Engine，可恢复运行合法 FSM。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wfsm_complex
trace: dpt_disp_wfsm_complex/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock、手写假 result、伪造 trace。

# test-workflow-fsm-complex

## 本实验的 FSM + 验证场景

**wf-halt.fsm.json — undefined status：**
```
initial → halt.entry.md
  halt.entry.md  success → null
```
MD controller 误传 `advance('undefined_status')` → FSM 无此 transition → halt，haltReason 含 `No transition defined`。

**wf-simple.fsm.json — 正常 chain（recovery）：**
```
wave.entry →(success)→ wave-audit →(success)→ wave-final →(success)→ null
```
halt 之后新 Machine 正常完成，证明 Engine 未被污染。

**Unknown node halt：**
故意用不存在的 node 名调用 `resolveTransition`，验证 halt。

## Step 1: 创建 disposable bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wfsm_complex --nodes=experiments/prototype-workflow-fsm/nodes-workflow-fsm --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

## Step 2: Halt 场景 + Recovery

```bash
B="dpt_disp_wfsm_complex"

cat > $B/run.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createMachine, resolveTransition } from '../DPT_FRAMEWORK/engine/workflow-fsm.mjs';
const trace = createTrace('dpt_disp_wfsm_complex/_trace.jsonl', { consoleEcho: false });
const SRC = 'wfsm-complex'; trace.traceInit('wfsm-complex: halt + recovery', { source: SRC });
const NODES_DIR = process.argv[2];

// ── halt: undefined status ──
{
  const m = createMachine(`${NODES_DIR}/wf-halt.fsm.json`, trace);
  trace.traceEntry('check', { source: SRC, step: 'halt:define',
    passed: m.current === 'halt.entry.md', detail: `当前: ${m.current}` });
  m.advance('undefined_status');
  trace.traceEntry('check', { source: SRC, step: 'halt:outcome',
    passed: m.isHalted && m.haltReason.includes('No transition defined'),
    detail: `reason=${m.haltReason}` });
  trace.traceEntry('check', { source: SRC, step: 'halt:iterations_1', passed: m.iterations === 1 });
}

// ── halt: unknown node ──
{
  const fsm = { name: 'bad', initial: 'real.md', states: { 'real.md': { on: { success: null } } } };
  const result = resolveTransition(fsm, 'nonexistent.md', 'success');
  trace.traceEntry('check', { source: SRC, step: 'unknown_node:halt',
    passed: result.action === 'halt' && result.reason.includes('nonexistent.md') });
}

// ── halt: unknown status on wf-halt ──
{
  const m = createMachine(`${NODES_DIR}/wf-halt.fsm.json`, trace);
  m.advance('unknown_status');
  trace.traceEntry('check', { source: SRC, step: 'unknown_status:halt',
    passed: m.isHalted && m.haltReason.includes('unknown_status') });
}

// ── Recovery: wf-simple 正常完成 ──
{
  const m = createMachine(`${NODES_DIR}/wf-simple.fsm.json`, trace);
  trace.traceEntry('check', { source: SRC, step: 'recovery:define',
    passed: m.current === 'wave.entry.md', detail: `当前: ${m.current}` });
  m.advance('success'); m.advance('success'); m.advance('success');
  trace.traceEntry('check', { source: SRC, step: 'recovery:complete',
    passed: m.isComplete && m.iterations === 3,
    detail: `outcome=${m.outcome}` });
}
JS
node $B/run.mjs $B/exp/nodes > /dev/null 2>&1
```

→ 预期：7 checks 全 passed。halt 分别正确停止，recovery 正常走完。

## Step 3: 从 trace 裁决

```bash
B="dpt_disp_wfsm_complex"

node -e "
const fs = require('fs');
const lines = fs.readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const p = checks.filter(e => e.passed).length;
const f = checks.filter(e => !e.passed).length;
const transitions = events.filter(e => e.event === 'transition');
console.log('checks: ' + checks.length + ' p=' + p + ' f=' + f + ' transitions=' + transitions.length + ' tot=' + events.length);
const pass = p === 7 && f === 0 && transitions.length === 5;
console.log(pass ? '\x1b[32mCOMPLEX PASS\x1b[0m' : '\x1b[31mCOMPLEX FAIL\x1b[0m');
if (!pass) process.exit(1);
"
```

→ 预期：7 checks，5 transitions（1 undefined_status + 1 unknown_status + 3 recovery）。

## Step 4: 清理

```bash
rm -rf dpt_disp_wfsm_*
```
