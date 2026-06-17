---
schema: command-experiment/v1
experiment: gate-loop
case: simple
case_goal: "验证 gate pass 后动态路由到一个 node 并执行代码块。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gl_simple
trace: dpt_disp_gl_simple/_trace_gl_simple.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-gate-loop-simple

验证 Engine gate 评估、node 动态加载和 trace 裁决的最小路径。

## Expected Runtime Path

1. 创建 DPT run bundle，拷入 node MD，validate + inspect
2. JS engine：evaluate gate（pass）→ 路由到 `wave0_search` node → 执行代码块
3. 读 trace 裁决
4. 清理

---

## Step 1: 创建 Run Bundle + 拷入 Nodes

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gl_simple --nodes=experiments/prototype-gate-loop/nodes-gate-loop --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed，inspect "directory structure complete"。

---

## Step 2: Gate 评估 → 动态路由 Node → 执行代码块

`evaluate()` 检查 state：`ref_count=5 >= ref_floor=5` → 返回 `pass`。Engine 根据 transition map 路由到 `wave0_search` node。`executeMDAndRun` 加载 node MD，提取 JS 代码块执行。

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gl_simple"

cat > "$B/t.mjs" << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-gate-loop/trace.mjs';
import { evaluate, executeMDAndRun } from '../experiments/prototype-gate-loop/gate-loop.mjs';

setTraceFile('dpt_disp_gl_simple/_trace_gl_simple.jsonl');
const SRCgl = 'gl-playbook/simple';
traceInit('gl-playbook/simple', { source: SRCgl });

// Gate evaluation: ref_count=5 >= ref_floor=5 → pass
traceEntry('check', { source: SRCgl, step:'gate', passed:evaluate({current_gate:'x',ref_count:5,ref_floor:5})==='pass' });

// Engine routes to wave0_search node, executes its code block
const r = executeMDAndRun('wave0_search', {current_gate:'x',ref_count:3});
r.step.execute({current_gate:'x',ref_count:3});
JS

NODES_DIR="$B/exp/nodes" node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：gate 评估 pass，node 加载，代码块执行成功。

---

## Step 3: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gl_simple"

cat > "$B/t.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-loop/trace.mjs';

setTraceFile('dpt_disp_gl_simple/_trace_gl_simple.jsonl');
const e = JSON.parse('[' + readFileSync(getTraceFile(), 'utf-8').trim().split('\n').join(',') + ']');
const v = e.filter(x => x.event === 'check').length;
const s = e.filter(x => x.event === 'node_exec').length;
const m = e.filter(x => x.event === 'md:executed').length;
console.log('check:' + v + ' node_exec:' + s + ' md:executed:' + m + ' tot:' + e.length);

const pass = v >= 1 && s >= 1 && m >= 1;
console.log(pass ? '\x1b[32mSIMPLE PASS\x1b[0m' : '\x1b[31mSIMPLE FAIL\x1b[0m');
if (!pass) process.exit(1);

traceCleanup();
JS

node "$B/t.mjs"
```

→ 预期：`check >= 1, node_exec >= 1, md_exec >= 1`，SIMPLE PASS。

---

## Step 4: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gl_simple)
echo "✓ Cleaned up."
```
