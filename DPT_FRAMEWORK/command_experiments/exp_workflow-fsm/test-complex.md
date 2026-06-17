---
schema: command-experiment/v1
experiment: workflow-fsm
case: complex
case_goal: "验证 4 种 halt 场景 + recovery：每类错误 Define→Step→Halt，错误不污染 Engine，可恢复运行合法 FSM"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wfsm_complex
trace: dpt_disp_wfsm_complex/_trace_wfsm_complex.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock、手写假 result、伪造 trace。

# test-workflow-fsm-complex

## 本实验的 4 个错误 FSM + 1 个 Recovery FSM

每个错误 FSM 只有 1 个节点，入口即触发问题。

**wf-halt.fsm.json — undefined status：**
```
initial → halt.entry.md
  halt.entry.md  (node returns 'undefined_status'，FSM 无此 transition) → halt
```
node 正常执行了，但 `transition('undefined_status')` 在 FSM 里没定义 → `isHalted`，`haltReason` 含 `No transition defined`。

**wf-missing.fsm.json — 缺失依赖：**
```
initial → missing.entry.md
  missing.entry.md  success → null
```
但 missing.entry.md 的 frontmatter 声明 `requires: ["nonexistent-file.md"]`。load 阶段就失败 → `isHalted`，`haltReason` 含文件名，`file_executed = 0`。

**wf-cycle.fsm.json — 循环依赖：**
```
initial → cycle-a.entry.md
  cycle-a.entry.md  success → null
```
cycle-a → cycle-b → cycle-a，DFS 检测到环 → `isHalted`，`file_executed = 0`。

**wf-malformed.fsm.json — 非法 frontmatter：**
```
initial → malformed.entry.md
  malformed.entry.md  success → null
```
malformed.entry.md 的 frontmatter 是非法 JSON → `isHalted`，`file_executed = 0`。

**Recovery — wf-simple.fsm.json（同 test-simple）：**
```
wave.entry →(success)→ wave-audit →(success)→ wave-final →(success)→ null
```
4 个错误之后，正常加载并完成，证明 Engine 未被污染。

## Step 1: 创建 disposable bundle

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs wfsm_complex --nodes=experiments/prototype-workflow-fsm/nodes-workflow-fsm --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

## Step 2: 4 种 halt + recovery

```bash
B="dpt_disp_wfsm_complex"

cat > $B/run.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-workflow-fsm/trace.mjs';
import { createMachine } from '../experiments/prototype-workflow-fsm/workflow-fsm.mjs';
setTraceFile('dpt_disp_wfsm_complex/_trace_wfsm_complex.jsonl');
const SRC = 'wfsm-complex'; traceInit('wfsm-complex: halt + recovery', { source: SRC });
const NODES_DIR = process.env.NODES_DIR;

// ── halt: undefined status ──
{
  const m = createMachine(`${NODES_DIR}/wf-halt.fsm.json`);
  traceEntry('check', { source: SRC, step: 'halt:define',
    passed: m.current === 'halt.entry.md', detail: `当前: ${m.current}` });
  m.step();
  traceEntry('check', { source: SRC, step: 'halt:outcome',
    passed: m.isHalted && m.haltReason.includes('No transition defined'),
    detail: `reason=${m.haltReason}` });
  traceEntry('check', { source: SRC, step: 'halt:iterations_1', passed: m.iterations === 1 });
}

// ── missing: 缺失依赖 ──
{
  const m = createMachine(`${NODES_DIR}/wf-missing.fsm.json`);
  m.step();
  traceEntry('check', { source: SRC, step: 'missing:outcome',
    passed: m.isHalted && m.haltReason.includes('nonexistent-file.md'),
    detail: `reason=${m.haltReason}` });
  traceEntry('check', { source: SRC, step: 'missing:no_exec',
    passed: m.receipts.filter(r => r.type === 'file_executed').length === 0 });
  traceEntry('check', { source: SRC, step: 'missing:has_load_error',
    passed: m.receipts.some(r => r.type === 'load_error') });
}

// ── cycle: 循环依赖 ──
{
  const m = createMachine(`${NODES_DIR}/wf-cycle.fsm.json`);
  m.step();
  traceEntry('check', { source: SRC, step: 'cycle:outcome',
    passed: m.isHalted && m.haltReason.includes('Dependency cycle'),
    detail: `reason=${m.haltReason}` });
  traceEntry('check', { source: SRC, step: 'cycle:no_exec',
    passed: m.receipts.filter(r => r.type === 'file_executed').length === 0 });
}

// ── malformed: 非法 frontmatter ──
{
  const m = createMachine(`${NODES_DIR}/wf-malformed.fsm.json`);
  m.step();
  traceEntry('check', { source: SRC, step: 'malformed:outcome',
    passed: m.isHalted && m.haltReason.includes('Malformed JSON'),
    detail: `reason=${m.haltReason}` });
  traceEntry('check', { source: SRC, step: 'malformed:no_exec',
    passed: m.receipts.filter(r => r.type === 'file_executed').length === 0 });
}

// ── Recovery: wf-simple 正常完成 ──
{
  const m = createMachine(`${NODES_DIR}/wf-simple.fsm.json`);
  traceEntry('check', { source: SRC, step: 'recovery:define',
    passed: m.current === 'wave.entry.md', detail: `当前: ${m.current}` });
  m.step(); m.step(); m.step();
  traceEntry('check', { source: SRC, step: 'recovery:complete',
    passed: m.isComplete && m.iterations === 3,
    detail: `outcome=${m.outcome}` });
}
JS
NODES_DIR="$B/exp/nodes" node $B/run.mjs > /dev/null 2>&1
```

→ 预期：12 checks 全 passed。4 种 halt 各自正确停止，recovery 正常走完。

## Step 3: 从 trace 裁决

```bash
B="dpt_disp_wfsm_complex"

node -e "
const fs = require('fs');
const lines = fs.readFileSync('$B/_trace_wfsm_complex.jsonl','utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const p = checks.filter(e => e.passed).length;
const f = checks.filter(e => !e.passed).length;
const errors = events.filter(e => e.event === 'load_error');
const md = events.filter(e => e.event === 'md:executed');
const execs = events.filter(e => e.event === 'file_executed');
console.log('checks: ' + checks.length + ' p=' + p + ' f=' + f);
console.log('  load_error=' + errors.length + ' md:executed=' + md.length + ' file_executed=' + execs.length + ' tot=' + events.length);
// halt: node 执行了 → 1 md:executed (halt.entry), 1 file_executed
// missing/cycle/malformed: 不执行 → 3 load_error, 0 file_executed
// recovery: 3 节点 → 3 md:executed, 3 file_executed
// 合计: 3 load_error, 4 md:executed, 4 file_executed
const pass = p === 12 && f === 0 && errors.length === 3 && md.length === 4 && execs.length === 4;
console.log(pass ? '\\x1b[32mCOMPLEX PASS\\x1b[0m' : '\\x1b[31mCOMPLEX FAIL\\x1b[0m');
if (!pass) process.exit(1);
"
```

→ 预期：12 checks，3 load_error，4 md:executed，4 file_executed。

## Step 4: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs wfsm_complex)
```
