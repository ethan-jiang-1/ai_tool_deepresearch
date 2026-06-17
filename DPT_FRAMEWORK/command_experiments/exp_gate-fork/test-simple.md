---
schema: command-experiment/v1
experiment: gate-fork
case: simple
case_goal: "验证 ref_count 与 topicReadiness 共同决定 fork 分支，并路由到对应 node。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gf_simple
trace: dpt_disp_gf_simple/_trace_gf_simple.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-gate-fork-simple

验证 Engine 多维 fork 路由的最小路径：pass/fail_a 判断和 node 执行。

## Expected Runtime Path

1. 创建 DPT run bundle，拷入 node MD，validate + inspect
2. JS engine：evaluateBranch 验证 pass 和 fail_a 两个分支 → 从 bundle 内 node MD 动态加载 pass 分支 → 执行 MD 代码块和 engine step
3. 读 trace 裁决
4. 清理

---

## Step 1: 创建 Run Bundle + 拷入 Nodes

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gf_simple --nodes=experiments/prototype-gate-fork/nodes-gate-fork --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed，inspect "directory structure complete"。

---

## Step 2: Fork 路由 → Node 加载

`evaluateBranch` 检查两个维度（ref_count + topicReadiness），返回分支 key。Engine 根据分支路由到对应 node。

- ref_count=5, topicReadiness='ready' → pass 分支
- ref_count=2, topicReadiness='ready' → fail_a 分支（ref 不足）


```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_simple"

cat > "$B/t.mjs" << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-gate-fork/trace.mjs';
import { evaluateBranch, executeMDAndRun } from '../experiments/prototype-gate-fork/gate-fork.mjs';

setTraceFile('dpt_disp_gf_simple/_trace_gf_simple.jsonl');
const SRC = 'gf-playbook/simple';
traceInit('gf-playbook/simple', { source: SRC });

// Fork routing: high ref + ready → pass
traceEntry('verify', { source: SRC, step:'gate_pass', p:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'})==='pass' });

// Fork routing: low ref + ready → fail_a
traceEntry('verify', { source: SRC, step:'gate_fail_a', p:evaluateBranch({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'})==='fail_a' });

// Engine routes to pass branch node MD, executes MD code block, then runs the branch step
const r = executeMDAndRun('pass_next_wave', {current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'});
r.step.execute({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'});
JS

experiments/prototype-gate-fork/nodes-gate-fork="$B/exp/nodes" node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：两个分支评估正确，bundle 内 node MD 被加载，代码块和 branch step 都执行。

---

## Step 3: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_simple"

cat > "$B/t.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-fork/trace.mjs';

setTraceFile('dpt_disp_gf_simple/_trace_gf_simple.jsonl');
const e = JSON.parse('[' + readFileSync(getTraceFile(), 'utf-8').trim().split('\n').join(',') + ']');
const v = e.filter(x => x.event === 'verify').length;
const s = e.filter(x => x.event === 'node_exec').length;
const l = e.filter(x => x.event === 'md:executed').length;
console.log('verify:' + v + ' node_exec:' + s + ' md:executed:' + l + ' tot:' + e.length);

const pass = v >= 2 && s >= 1 && l >= 1;
console.log(pass ? '\x1b[32mSIMPLE PASS\x1b[0m' : '\x1b[31mSIMPLE FAIL\x1b[0m');
if (!pass) process.exit(1);

traceCleanup();
JS

node "$B/t.mjs"
```

→ 预期：`verify >= 2, node_exec >= 1, node_load >= 1`，SIMPLE PASS。

---

## Step 4: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gf_simple)
echo "✓ Cleaned up."
```
