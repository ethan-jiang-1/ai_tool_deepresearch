---
schema: command-experiment/v1
experiment: gate-loop
case: medium
case_goal: "验证低 ref_count 触发 repair loop 后重新通过 gate，并顺序加载多个 node。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gl_medium
trace: dpt_disp_gl_medium/_trace_gl_medium.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-gate-loop-medium

验证 repair loop 的 fail -> repair -> pass 回路，以及多个 node 的动态路由。

## Expected Runtime Path

1. 创建 DPT run bundle，拷入 node MD，validate + inspect
2. Gate pass → repairLoop（低 ref_count 触发 fail→repair→pass）→ 动态加载 2 个 node
3. 读 trace 裁决
4. 清理

---

## Step 1: 创建 Run Bundle + 拷入 Nodes

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gl_medium --nodes=experiments/prototype-gate-loop/nodes-gate-loop --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed，inspect "directory structure complete"。

---

## Step 2: Gate → Repair Loop → 2 Nodes

- `evaluate()`：ref_count=5 → pass
- `repairLoop()`：ref_count=2 < ref_floor=5 → fail → repair → retry → pass
- 加载 `wave0_search` 和 `repair_references` 两个 node

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gl_medium"

cat > "$B/t.mjs" << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-gate-loop/trace.mjs';
import { evaluate, repairLoop, executeMDAndRun } from '../experiments/prototype-gate-loop/gate-loop.mjs';

setTraceFile('dpt_disp_gl_medium/_trace_gl_medium.jsonl');
const SRCgl = 'gl-playbook/medium';
traceInit('gl-playbook/medium', { source: SRCgl });

// Gate evaluation: normal pass
traceEntry('check', { source: SRCgl, step:'gate_pass', passed:evaluate({current_gate:'x',ref_count:5,ref_floor:5})==='pass' });

// Repair loop: ref_count=2 < ref_floor=5 → fail → repair → retry → pass
const r = repairLoop({current_gate:'x',ref_count:2,ref_floor:5});
traceEntry('check', { source: SRCgl, step:'gate_repair', passed:r.outcome==='pass', its:r.iterations });

// Load and execute 2 nodes
for (const k of ['wave0_search', 'repair_references']) {
  const s = executeMDAndRun(k, {current_gate:'x',ref_count:3});
  s.step.execute({current_gate:'x',ref_count:3});
}
JS

NODES_DIR="$B/exp/nodes" node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：gate pass，repair loop 修复后 pass，2 个 node 加载执行。

---

## Step 3: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gl_medium"

cat > "$B/t.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-loop/trace.mjs';

setTraceFile('dpt_disp_gl_medium/_trace_gl_medium.jsonl');
const e = JSON.parse('[' + readFileSync(getTraceFile(), 'utf-8').trim().split('\n').join(',') + ']');
const v = e.filter(x => x.event === 'check');
const s = e.filter(x => x.event === 'node_exec');
const m = e.filter(x => x.event === 'md:executed');
console.log('v:' + v.length + ' node_exec:' + s.length + ' md:executed:' + m.length + ' tot:' + e.length);

const pass = v.length >= 2 && s.length >= 2 && m.length >= 2;
console.log(pass ? '\x1b[32mMEDIUM PASS\x1b[0m' : '\x1b[31mMEDIUM FAIL\x1b[0m');
if (!pass) process.exit(1);

traceCleanup();
JS

node "$B/t.mjs"
```

→ 预期：`v >= 2, node_exec >= 2, md_exec >= 2`，MEDIUM PASS。

---

## Step 4: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gl_medium)
echo "✓ Cleaned up."
```
