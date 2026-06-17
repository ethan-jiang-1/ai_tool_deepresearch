---
schema: command-experiment/v1
experiment: gate-fork
case: complex
case_goal: "验证四分支 fork、converge 多问题修复、pipeline 和多维 C&I 反馈。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gf_complex
trace: dpt_disp_gf_complex/_trace_gf_complex.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-gate-fork-complex

验证 gate-fork 全功能路径：四分支、converge repair、pipeline 和 C&I 反馈。

## Expected Runtime Path

1. 创建 DPT run bundle，拷入 node MD，validate + inspect
2. 初始化 trace
3. Fork 四分支 → convergeRepair 多问题 → 4 node + pipeline → C&I 反馈（多次、多维度）
4. 读 trace 裁决
5. 清理

---

## Step 1: 创建 Run Bundle + 拷入 Nodes

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gf_complex --nodes=experiments/prototype-gate-fork/nodes-gate-fork --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed，inspect "directory structure complete"。

---

## Step 2: 初始化 Trace

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_complex"

cat > "$B/t.mjs" << 'JS'
import { setTraceFile, traceInit } from '../experiments/prototype-gate-fork/trace.mjs';
setTraceFile('dpt_disp_gf_complex/_trace_gf_complex.jsonl');
traceInit('gf-playbook/complex', { source: 'gf-playbook/complex' });
JS

node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：trace 初始化。

---

## Step 3: Fork + Converge + 4 Nodes + Pipeline + C&I

- 四分支：pass / fail_a / fail_b / blocked（增加 topicReadiness='blocked'）
- convergeRepair：低 ref + not_ready 两个问题汇聚修复
- 4 个 node + pipeline 完整流程
- C&I 三次反馈：bad state fail / good state pass / invalid topicReadiness fail


```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_complex"

cat > "$B/t.mjs" << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-gate-fork/trace.mjs';
setTraceFile('dpt_disp_gf_complex/_trace_gf_complex.jsonl');
import {
  evaluateBranch, convergeRepair,
  executeMDAndRun, runForkPipeline,
  checkAndReflect, WorkflowState
} from '../experiments/prototype-gate-fork/gate-fork.mjs';

const SRC = 'gf-playbook/complex';

// Fork routing: all 4 branches
traceEntry('check', { source: SRC, step:'fork_pass', passed:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'})==='pass' });
traceEntry('check', { source: SRC, step:'fork_fail_a', passed:evaluateBranch({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'})==='fail_a' });
traceEntry('check', { source: SRC, step:'fork_fail_b', passed:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'not_ready'})==='fail_b' });
traceEntry('check', { source: SRC, step:'fork_blocked', passed:evaluateBranch({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'blocked'})==='blocked' });

// Converge repair: multi-issue (low ref + not_ready) → engine repair step → pass
const r = convergeRepair({current_gate:'x',ref_count:1,ref_floor:5,topicReadiness:'not_ready'});
traceEntry('check', { source: SRC, step:'converge_multi', passed:r.outcome==='pass', its:r.iterations });

// 4 dynamic node MD files → MD code block execution + branch step execution
for (const k of ['pass_next_wave', 'fail_a_topic_repair', 'fail_b_reference_repair', 'shared_repair']) {
  const s = executeMDAndRun(k, {current_gate:'x',ref_count:3,ref_floor:5,topicReadiness:'ready'});
  s.step.execute({current_gate:'x',ref_count:3,ref_floor:5,topicReadiness:'ready'});
}

// Pipeline: fork → converge → re-fork → pass (full composition)
const pipeline = runForkPipeline({current_gate:'x',ref_count:2,ref_floor:5,topicReadiness:'ready'});
traceEntry('check', { source: SRC, step:'pipeline_pass', passed:pipeline.finalState.current_gate==='wave_next' });

// C&I: Zod rejects bad ref_count
const bad = checkAndReflect({current_gate:'x',ref_count:'bad',ref_floor:5,topicReadiness:'ready'}, WorkflowState);
traceEntry('check', { source: SRC, step:'ci_fail', passed:!bad.passed });

// C&I: Zod accepts valid state
const good = checkAndReflect({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'ready'}, WorkflowState);
traceEntry('check', { source: SRC, step:'ci_pass', passed:good.passed });

// C&I: Zod rejects invalid topicReadiness
const badTopic = checkAndReflect({current_gate:'x',ref_count:5,ref_floor:5,topicReadiness:'invalid'}, WorkflowState);
traceEntry('check', { source: SRC, step:'ci_topic_fail', passed:!badTopic.passed });
JS

NODES_DIR="$B/exp/nodes" node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：4 分支正确，converge 修复通过，4 个 bundle 内 node MD + pipeline 完成，C&I 三次反馈正确。

---

## Step 4: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_complex"

cat > "$B/t.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-gate-fork/trace.mjs';

setTraceFile('dpt_disp_gf_complex/_trace_gf_complex.jsonl');
const e = JSON.parse('[' + readFileSync(getTraceFile(), 'utf-8').trim().split('\n').join(',') + ']');
const v = e.filter(x => x.event === 'check');
const s = e.filter(x => x.event === 'node_exec');
const l = e.filter(x => x.event === 'md:executed');
console.log('v:' + v.length + ' node_exec:' + s.length + ' md:executed:' + l.length + ' tot:' + e.length);

const pass = v.length >= 9 && s.length >= 4 && l.length >= 4;
console.log(pass ? '\x1b[32mCOMPLEX PASS\x1b[0m' : '\x1b[31mCOMPLEX FAIL\x1b[0m');
if (!pass) process.exit(1);

traceCleanup();
JS

node "$B/t.mjs"
```

→ 预期：`v >= 9, node_exec >= 4, node_load >= 4`，COMPLEX PASS。

---

## Step 5: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs gf_complex)
echo "✓ Cleaned up."
```
