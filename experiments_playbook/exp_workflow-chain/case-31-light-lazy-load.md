---
schema: command-experiment/v2
experiment: workflow-chain
case: case-31-light-lazy-load
case_goal: "验证 MD controller mode 显式驱动 single-entry loader：Markdown control surface 创建 runtime → Phase Agent 调 assessNode → Engine 返回结果 → Phase Agent 从 trace 交叉验证。runtime init 不预读任何 MD。"
verdict_mode: all
required_checks: [init:cache_empty, init:keys, init:no_file_read, load:entry_loaded, load:plan, load:status]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

Markdown control surface 承载步骤指令。每一步是 Phase Agent 读取 MD 指令 → Engine 执行并写 trace → Phase Agent 读 trace 验证。一个 bash block = 一次 MD↔Engine 交互。

本实验验证：MD 创建 runtime 时 Engine 不预读文件；MD 显式调 `assessNode('wave.entry.md')` 才加载；MD 从 trace 交叉验证每个 event。

# case-31-light-lazy-load


## Expected Runtime Path

1. 创建 bundle + nodes 目录 [MAIN/SHELL]
2. MD 创建 runtime → 验证 contentCache 为空, 无预读 [MAIN/SHELL]
3. MD 调 assessNode → Engine 加载 wave.entry.md [MAIN/SHELL]
4. MD 交叉验证 trace: file_loaded event 存在 [MAIN/SHELL]
5. Native completion, then Supervisor-owned health and cleanup policy
## Step 1: 创建 bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wc_simple --case case-31 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs $B
node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

---

以下 Step 2.1–2.4：MD 逐步驱动 Engine，每步写 trace，MD 读 trace 裁决。

---

## Step 2.1: MD 创建 runtime → 验证 Engine 不预读

MD 指令：「创建 workflow runtime，只加载 nodesDir，不读任何 MD 文件。」

Engine 回答：runtime 就绪，contentCache 为空，无 file_read receipt。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" experiments_env/prototype-workflow-chain/nodes-workflow-chain <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { createWorkflowRuntime } from './DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/rb_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-simple';
trace.traceInit('wl-simple: MD controller mode → Engine', { source: SRC });

const runtime = createWorkflowRuntime('test', NODES_DIR);

// Engine 回答 MD：runtime 状态
trace.traceEntry('check', { source: 'playbook', gate: 'init:cache_empty', expected: true,
  passed: runtime.contentCache.size === 0,
  detail: `contentCache.size = ${runtime.contentCache.size}` });

trace.traceEntry('check', { source: 'playbook', gate: 'init:no_file_read', expected: true,
  passed: runtime.receipts.filter(r => r.type === 'file_read').length === 0,
  detail: 'no file_read receipt before explicit load' });

trace.traceEntry('check', { source: 'playbook', gate: 'init:keys', expected: true,
  passed: runtime.receipts.length === 0,
  detail: `receipts.length = ${runtime.receipts.length}` });
JS

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/rb_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.gate.startsWith('init:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.gate+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.1 — runtime init 不预读 ✅');
"
```

→ 预期：3 个 check 全 PASS。Engine 未预读任何文件。

---

## Step 2.2: MD 调 assessNode → Engine 加载 wave.entry.md

MD 指令：「加载 wave.entry.md。」

Engine 执行：读文件、解析依赖（自包含，无依赖）、加载、写 trace。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" experiments_env/prototype-workflow-chain/nodes-workflow-chain <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from './DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/rb_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-simple';

const runtime = createWorkflowRuntime('test', NODES_DIR);
const result = assessNode('wave.entry.md', createState(), runtime, trace);

// Engine 回答 MD：load 结果
trace.traceEntry('check', { source: 'playbook', gate: 'load:status', expected: true,
  passed: result.status === 'loaded',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: 'playbook', gate: 'load:plan', expected: true,
  passed: JSON.stringify(result.plan) === JSON.stringify(['wave.entry.md']),
  detail: `plan = ${JSON.stringify(result.plan)}` });

trace.traceEntry('check', { source: 'playbook', gate: 'load:entry_loaded', expected: true,
  passed: result.state.executionOrder.includes('wave.entry.md') && result.state.counters['wave.entry.md'] === 1,
  detail: `order=${JSON.stringify(result.state.executionOrder)}, count=${result.state.counters['wave.entry.md']}` });
JS

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/rb_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.gate.startsWith('load:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.gate+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.2 — Engine 成功加载 wave.entry.md ✅');
"
```

→ 预期：status=loaded，plan 只有 entry 自身，executionOrder 包含 entry。

---

## Step 2.3: MD 交叉验证——读 trace 文件检查 file_loaded event

MD 不信任 receipts，读原始 trace 文件交叉验证 Engine 确实写了 file_loaded。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node -e "
const e=require('fs').readFileSync('$B/rb_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const fileLoaded=e.filter(x=>x.event==='file_loaded');
const waveLoaded=fileLoaded.some(x=>x.fileRef==='wave.entry.md');
const fileRead=e.filter(x=>x.event==='file_read');

console.log('trace events: '+e.length);
console.log('file_loaded events: '+fileLoaded.length);
console.log('wave.entry.md loaded in trace: '+waveLoaded);
console.log('file_read events: '+fileRead.length);
console.log('cache keys at end: '+JSON.stringify([...new Set(e.filter(x=>x.event==='file_loaded').map(x=>x.fileRef))]));

if(!waveLoaded)process.exit(1);
console.log('MD裁决: Step 2.3 — trace 文件交叉验证通过 ✅');
"
```

→ 预期：trace 中有 file_loaded event，fileRef = wave.entry.md。

---

## Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 3: 结果解读

> 6 个 check，验证 MD controller 的 lazy load：
>   [init:cache_empty] runtime 创建后 contentCache 为空，无预读
>   [init:no_file_read] 无 file_read receipt——证明未预读文件
>   [init:keys] receipts 长度=0
>   [load:status] assessNode 返回 loaded
>   [load:plan] 自包含文件 plan=[wave.entry.md]
>   [load:entry_loaded] executionOrder 含 entry 且 counters=1
>   全部 expected:true → 6/6 PASS 即通过。

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
