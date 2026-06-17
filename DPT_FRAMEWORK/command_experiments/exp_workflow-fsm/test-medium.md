---
schema: command-experiment/v1
experiment: workflow-fsm
case: medium
case_goal: "验证 retry 自环 Define→Step→Verify：error 后停在当前节点，success 后 advance；及跨 node 缓存命中"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wfsm_medium
trace: dpt_disp_wfsm_medium/_trace_wfsm_medium.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock、手写假 result、伪造 trace。

# test-workflow-fsm-medium

## 本实验的 FSM 定义

**wf-retry.fsm.json（retry 自环）：**
```
initial → retry-node.entry.md
  retry-node.entry.md  error   → retry-node.entry.md  (自环，停在当前)
  retry-node.entry.md  success → retry-next.entry.md  (advance)
  retry-next.entry.md  success → null                 (complete)
```
retry-node 内部逻辑：`counter < 2 → error, counter >= 2 → success`。
第一次 step() error 自环，第二次 success advance，第三次 complete。

**wf-cache.fsm.json（缓存命中）：**
```
initial → repeat-1.entry.md
  repeat-1.entry.md  success → repeat-2.entry.md
  repeat-2.entry.md  success → null
```
repeat-1 和 repeat-2 都依赖 `shared-lib.dep.md`。第一次 `file_read`，第二次 `cache_hit`，但都 `file_executed`。

## Step 1: 创建 disposable bundle

```bash
B=$(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs wfsm_medium --nodes=experiments/prototype-workflow-fsm/nodes-workflow-fsm --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

## Step 2: Retry — Define + Step 1 + Step 2 + Step 3

Define → 第一次 step() error 自环 → 第二次 success advance → 第三次 complete。

```bash
B="dpt_disp_wfsm_medium"

cat > $B/run_retry.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-workflow-fsm/trace.mjs';
import { createMachine } from '../experiments/prototype-workflow-fsm/workflow-fsm.mjs';
setTraceFile('dpt_disp_wfsm_medium/_trace_wfsm_medium.jsonl');
const SRC = 'wfsm-medium'; traceInit('wfsm-medium: retry step-by-step', { source: SRC });
const NODES_DIR = process.env.NODES_DIR;
const m = createMachine(`${NODES_DIR}/wf-retry.fsm.json`);

// Define
traceEntry('check', { source: SRC, step: 'define:initial',
  passed: m.current === 'retry-node.entry.md', detail: `当前: ${m.current}` });

// Step 1: retry-node counter=1 → error → 自环，停在 retry-node
m.step();
traceEntry('check', { source: SRC, step: 'step1:still_retry',
  passed: m.current === 'retry-node.entry.md' && m.canAdvance,
  detail: `error 自环，仍在: ${m.current}` });
traceEntry('check', { source: SRC, step: 'step1:iterations_1', passed: m.iterations === 1 });

// Step 2: retry-node counter=2 → success → advance 到 retry-next
m.step();
traceEntry('check', { source: SRC, step: 'step2:advanced',
  passed: m.current === 'retry-next.entry.md' && m.canAdvance,
  detail: `success 推进到: ${m.current}` });
traceEntry('check', { source: SRC, step: 'step2:iterations_2', passed: m.iterations === 2 });

// Step 3: retry-next → success → complete
m.step();
traceEntry('check', { source: SRC, step: 'step3:complete',
  passed: m.isComplete && m.iterations === 3,
  detail: `outcome=${m.outcome}` });
JS
NODES_DIR="$B/exp/nodes" node $B/run_retry.mjs > /dev/null 2>&1
```

→ 预期：error 自环 → success advance → complete。trace 里 transition 顺序为 error → success → success。

## Step 3: Cache — 两次 step 验证 file_read + cache_hit + file_executed

```bash
B="dpt_disp_wfsm_medium"

cat > $B/run_cache.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-fsm/trace.mjs';
import { createMachine } from '../experiments/prototype-workflow-fsm/workflow-fsm.mjs';
setTraceFile('dpt_disp_wfsm_medium/_trace_wfsm_medium.jsonl');
const SRC = 'wfsm-medium'; const NODES_DIR = process.env.NODES_DIR;
const m = createMachine(`${NODES_DIR}/wf-cache.fsm.json`);

// Step 1: repeat-1 → 首次加载 shared-lib，file_read
m.step();
const reads1 = m.receipts.filter(r => r.type === 'file_read' && r.fileRef === 'shared-lib.dep.md').length;
traceEntry('check', { source: SRC, step: 'cache:step1',
  passed: reads1 === 1 && m.current === 'repeat-2.entry.md',
  detail: `file_read=${reads1}, current=${m.current}` });

// Step 2: repeat-2 → shared-lib cache_hit（不读盘），但仍 file_executed
m.step();
const hits = m.receipts.filter(r => r.type === 'cache_hit' && r.fileRef === 'shared-lib.dep.md').length;
const execs = m.receipts.filter(r => r.type === 'file_executed' && r.fileRef === 'shared-lib.dep.md').length;
traceEntry('check', { source: SRC, step: 'cache:step2',
  passed: hits === 1 && execs === 2 && m.isComplete,
  detail: `cache_hit=${hits}, file_executed=${execs}, outcome=${m.outcome}` });
JS
NODES_DIR="$B/exp/nodes" node $B/run_cache.mjs > /dev/null 2>&1
```

→ 预期：file_read=1, cache_hit=1, file_executed=2, isComplete。

## Step 4: 从 trace 裁决

```bash
B="dpt_disp_wfsm_medium"

node -e "
const fs = require('fs');
const lines = fs.readFileSync('$B/_trace_wfsm_medium.jsonl','utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const p = checks.filter(e => e.passed).length;
const f = checks.filter(e => !e.passed).length;
const retryTrans = events.filter(e => e.event === 'transition' && e.currentNode === 'retry-node.entry.md');
console.log('checks: ' + checks.length + ' p=' + p + ' f=' + f + ' retry_transitions=' + retryTrans.length + ' tot=' + events.length);
console.log('  retry statuses: ' + JSON.stringify(retryTrans.map(e => e.status)));
const pass = p === 8 && f === 0 && retryTrans[0].status === 'error' && retryTrans[1].status === 'success';
console.log(pass ? '\\x1b[32mMEDIUM PASS\\x1b[0m' : '\\x1b[31mMEDIUM FAIL\\x1b[0m');
if (!pass) process.exit(1);
"
```

→ 预期：8 checks，retry transition 顺序 error → success。

## Step 5: 清理

```bash
rm -rf $(node DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs wfsm_medium)
```
