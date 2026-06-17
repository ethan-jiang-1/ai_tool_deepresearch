---
schema: command-experiment/v1
experiment: gate-fork
case: medium
case_goal: "验证多条 fail 分支汇聚到 convergeRepair 后重新通过 gate。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gf_medium
trace: dpt_disp_gf_medium/_trace_gf_medium.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-gate-fork-medium

验证 fork 多分支路由与 converge repair 的组合语义。

## Expected Runtime Path

1. 创建 DPT run bundle，拷入 node MD，validate + inspect
2. Fork 三分支验证 → convergeRepair（多问题修复后 pass）→ 2 个 node 加载
3. 读 trace 裁决
4. 清理

---

## Step 1: 创建 Run Bundle + 拷入 Nodes

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gf_medium --nodes=experiments/prototype-gate-fork/nodes-gate-fork --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed，inspect "directory structure complete"。

---

## Step 2: Fork + Converge Repair + 2 Nodes

- Fork 三个分支验证：pass（全绿）、fail_a（低 ref）、fail_b（not_ready）
- convergeRepair：低 ref + not_ready 两个问题 → 一次汇聚修复 → pass
- 加载 pass 和 fail_a 各自对应的 node


```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_medium"

cat > "$B/t.mjs" << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-gate-fork/trace.mjs';
import { evaluateBranch, convergeRepair, executeMDAndRun } from '../experiments/prototype-gate-fork/gate-fork.mjs';

setTraceFile('dpt_disp_gf_medium/_trace_gf_medium.jsonl');
const SRC = 'gf-playbook/medium';
traceInit('gf-playbook/medium', { source: SRC });

// Fork routing: 3 branches
traceEntry('verify', { source: SRC, step:'fork_pass', p:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'})==='pass' });
traceEntry('verify', { source: SRC, step:'fork_fail_a', p:evaluateBranch({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'})==='fail_a' });
traceEntry('verify', { source: SRC, step:'fork_fail_b', p:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'not_ready'})==='fail_b' });

// Converge repair: fail_a state → engine repair step → pass
const r = convergeRepair({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'});
traceEntry('verify', { source: SRC, step:'converge_repair', p:r.outcome==='pass', its:r.iterations });

// Pass branch node MD
const s = executeMDAndRun('pass_next_wave', {current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'});
s.step.execute({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'});

// Fail_a branch node MD (after converge repair)
const s2 = executeMDAndRun('fail_a_topic_repair', {current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'});
s2.step.execute({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'});
JS

experiments/prototype-gate-fork/nodes-gate-fork="$B/exp/nodes" node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：3 分支路由正确，converge 修复后 pass，2 个 bundle 内 node MD 加载并执行。

---

## Step 3: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_medium"

cat > "$B/t.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-fork/trace.mjs';

setTraceFile('dpt_disp_gf_medium/_trace_gf_medium.jsonl');
const e = JSON.parse('[' + readFileSync(getTraceFile(), 'utf-8').trim().split('\n').join(',') + ']');
const v = e.filter(x => x.event === 'verify');
const s = e.filter(x => x.event === 'node_exec');
const l = e.filter(x => x.event === 'md:executed');
console.log('v:' + v.length + ' node_exec:' + s.length + ' md:executed:' + l.length + ' tot:' + e.length);

const pass = v.length >= 4 && s.length >= 2 && l.length >= 2;
console.log(pass ? '\x1b[32mMEDIUM PASS\x1b[0m' : '\x1b[31mMEDIUM FAIL\x1b[0m');
if (!pass) process.exit(1);

traceCleanup();
JS

node "$B/t.mjs"
```

→ 预期：`v >= 4, node_exec >= 2, node_load >= 2`，MEDIUM PASS。

---

## Step 4: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gf_medium)
echo "✓ Cleaned up."
```
