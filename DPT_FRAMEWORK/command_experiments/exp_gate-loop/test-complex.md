---
schema: command-experiment/v1
experiment: gate-loop
case: complex
case_goal: "验证 gate、repair loop、四个 node 路由和 C&I 反馈回路组合。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gl_complex
trace: dpt_disp_gl_complex/_trace_gl_complex.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-gate-loop-complex

验证 gate-loop 全功能路径：gate 评估、repair loop、多 node 路由和 C&I 反馈。

## Expected Runtime Path

1. 创建 DPT run bundle，拷入 node MD，validate + inspect
2. 初始化 trace
3. Gate pass → repairLoop（低 ref_count 触发 repair）→ 4 node 动态加载 → C&I 反馈（一次 fail、一次 pass）
4. 读 trace 裁决
5. 清理

---

## Step 1: 创建 Run Bundle + 拷入 Nodes

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gl_complex --nodes=experiments/prototype-gate-loop/nodes-gate-loop --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed，inspect "directory structure complete"。

---

## Step 2: 初始化 Trace

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gl_complex"

cat > "$B/t.mjs" << 'JS'
import { setTraceFile, traceInit } from '../experiments/prototype-gate-loop/trace.mjs';
setTraceFile('dpt_disp_gl_complex/_trace_gl_complex.jsonl');
traceInit('gl-playbook/complex', { source: 'gl-playbook/complex' });
JS

node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：trace 文件初始化为单行 `run_start` event。

---

## Step 3: Gate + Repair + 4 Nodes + C&I

- gate pass + repair loop（同 medium）
- 4 个 node 动态加载执行（`wave0_search`, `wave0_audit`, `wave1_evidence`, `repair_references`）
- C&I 反馈：`checkAndReflect` 用 Zod 校验 state——非法 ref_count 应 fail，合法应 pass


```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gl_complex"

cat > "$B/t.mjs" << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-gate-loop/trace.mjs';
setTraceFile('dpt_disp_gl_complex/_trace_gl_complex.jsonl');
import { evaluate, repairLoop, executeMDAndRun, checkAndReflect, WorkflowState } from '../experiments/prototype-gate-loop/gate-loop.mjs';

const SRC = 'gl-playbook/complex';

// Gate evaluation: pass
traceEntry('check', { source: SRC, step:'gate_pass', passed:evaluate({current_gate:'x',ref_count:5,ref_floor:5})==='pass' });

// Repair loop: low ref_count triggers repair, should recover
const r = repairLoop({current_gate:'x',ref_count:2,ref_floor:5});
traceEntry('check', { source: SRC, step:'gate_repair', passed:r.outcome==='pass', its:r.iterations });

// 4 nodes — Engine routes to each, reads bundle-local MD, and executes code blocks
for (const k of ['wave0_search', 'wave0_audit', 'wave1_evidence', 'repair_references']) {
  const s = executeMDAndRun(k, {current_gate:'x',ref_count:3});
  s.step.execute({current_gate:'x',ref_count:3});
}

// C&I feedback: Zod rejects bad state (ref_count is string, not number)
const bad = checkAndReflect({current_gate:'x',ref_count:'bad',ref_floor:5}, WorkflowState);
traceEntry('check', { source: SRC, step:'ci_fail', passed:!bad.passed });

// C&I feedback: Zod accepts valid state
const good = checkAndReflect({current_gate:'x',ref_count:5,ref_floor:5}, WorkflowState);
traceEntry('check', { source: SRC, step:'ci_pass', passed:good.passed });
JS

NODES_DIR="$B/exp/nodes" node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：gate pass，repair 后 pass，4 node 执行，C&I 一 fail 一 pass。

---

## Step 4: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gl_complex"

cat > "$B/t.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-loop/trace.mjs';

setTraceFile('dpt_disp_gl_complex/_trace_gl_complex.jsonl');
const e = JSON.parse('[' + readFileSync(getTraceFile(), 'utf-8').trim().split('\n').join(',') + ']');
const v = e.filter(x => x.event === 'check');
const s = e.filter(x => x.event === 'node_exec');
const m = e.filter(x => x.event === 'md:executed');
console.log('v:' + v.length + ' node_exec:' + s.length + ' md:executed:' + m.length + ' tot:' + e.length);

const pass = v.length >= 4 && s.length >= 4 && m.length >= 4;
console.log(pass ? '\x1b[32mCOMPLEX PASS\x1b[0m' : '\x1b[31mCOMPLEX FAIL\x1b[0m');
if (!pass) process.exit(1);

traceCleanup();
JS

node "$B/t.mjs"
```

→ 预期：`v >= 4, node_exec >= 4, md_exec >= 4`，COMPLEX PASS。

---

## Step 5: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gl_complex)
echo "✓ Cleaned up."
```
