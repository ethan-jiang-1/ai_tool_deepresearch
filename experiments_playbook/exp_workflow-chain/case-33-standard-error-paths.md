---
schema: command-experiment/v2
experiment: workflow-chain
case: case-33-standard-error-paths
case_goal: "验证 MD controller mode 处理三种错误路径（缺失依赖、循环依赖、malformed frontmatter）并恢复：每种错误由 Markdown control surface 独立发起 load → Engine 返回 error 且不加载文件 → Phase Agent 确认后继续下一个 → 最终加载合法 entry 成功。证明错误不污染 Engine。"
verdict_mode: last
required_checks: [cycle:error_refs, cycle:no_load, cycle:status, malformed:error_refs, malformed:no_load, malformed:status, missing:error_refs, missing:no_load, missing:status, recovery:entry_loaded, recovery:status]
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

Markdown control surface 承载 load 指令。每一步 Phase Agent 读取 MD 指令 → Engine 执行并写 trace → Phase Agent 读 trace 裁决并决定下一步。

三个错误场景各自独立——MD 每次创建新 runtime、发一个 load、检查错误、记录结论。最后 MD 验证 Engine 仍可正常加载合法 entry。

# case-33-standard-error-paths


## Expected Runtime Path

1. 创建 bundle + nodes 目录 [MAIN/SHELL]
2. Missing dep → error, 零文件加载 [MAIN/SHELL]
3. Cycle dep → error, 零文件加载 [MAIN/SHELL]
4. Malformed frontmatter → error [MAIN/SHELL]
5. Recovery: wave.entry.md → loaded (Engine 未被污染) [MAIN/SHELL]
5. Native completion, then Supervisor-owned health and cleanup policy
## Step 1: 创建 bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wc_complex --case case-33 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

---

## Step 2.1: MD 加载 missing.entry.md → 缺失依赖 → error

MD 指令：「加载 missing.entry.md。」

missing.entry.md 声明依赖 `nonexistent-file.md`，该文件不存在。Engine 必须返回 error 且不加载任何文件。

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" experiments_env/prototype-workflow-chain/nodes-workflow-chain <<'JS'
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from './DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/rb_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-complex';
trace.traceInit('wl-complex: MD error handling', { source: SRC });

const runtime = createWorkflowRuntime('test', NODES_DIR);
const before = runtime.receipts.length;
const result = assessNode('missing.entry.md', createState(), runtime, trace);
const newLoads = runtime.receipts.slice(before).filter(r => r.type === 'file_loaded');

trace.traceEntry('check', { source: 'playbook', gate: 'missing:status', expected: true,
  passed: result.status === 'error',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: 'playbook', gate: 'missing:error_refs', expected: true,
  passed: Boolean(result.error && result.error.includes('nonexistent-file.md') && result.error.includes('missing.entry.md')),
  detail: `error = ${result.error}` });

trace.traceEntry('check', { source: 'playbook', gate: 'missing:no_load', expected: true,
  passed: newLoads.length === 0,
  detail: `file_loaded during error = ${newLoads.length}` });
JS

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/rb_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.gate.startsWith('missing:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.gate+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.1 — missing dep → error, 零文件加载 ✅');
"
```

→ 预期：status=error，error 含 nonexistent-file.md 和 missing.entry.md，无 file_loaded。

---

## Step 2.2: MD 加载 cycle-a.entry.md → 循环依赖 → error

MD 指令：「加载 cycle-a.entry.md。」

cycle-a.entry.md 依赖 cycle-b.dep.md，cycle-b.dep.md 又依赖 cycle-a.entry.md——形成环路。Engine 必须检测并返回 error。

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" experiments_env/prototype-workflow-chain/nodes-workflow-chain <<'JS'
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from './DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/rb_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-complex';

const runtime = createWorkflowRuntime('test', NODES_DIR);
const before = runtime.receipts.length;
const result = assessNode('cycle-a.entry.md', createState(), runtime, trace);
const newLoads = runtime.receipts.slice(before).filter(r => r.type === 'file_loaded');

trace.traceEntry('check', { source: 'playbook', gate: 'cycle:status', expected: true,
  passed: result.status === 'error',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: 'playbook', gate: 'cycle:error_refs', expected: true,
  passed: Boolean(result.error && result.error.includes('cycle-a.entry.md') && result.error.includes('cycle-b.dep.md')),
  detail: `error = ${result.error}` });

trace.traceEntry('check', { source: 'playbook', gate: 'cycle:no_load', expected: true,
  passed: newLoads.length === 0,
  detail: `file_loaded during error = ${newLoads.length}` });
JS

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/rb_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.gate.startsWith('cycle:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.gate+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.2 — cycle dep → error, 零文件加载 ✅');
"
```

→ 预期：status=error，error 含 cycle-a 和 cycle-b，无 file_loaded。

---

## Step 2.3: MD 加载 malformed.entry.md → schema 错误 → error

MD 指令：「加载 malformed.entry.md。」

malformed.entry.md 的 frontmatter JSON schema 不合法（requires 应为数组但是字符串）。Engine 必须返回 error 且不加载文件。

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" experiments_env/prototype-workflow-chain/nodes-workflow-chain <<'JS'
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from './DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/rb_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-complex';

const runtime = createWorkflowRuntime('test', NODES_DIR);
const before = runtime.receipts.length;
const result = assessNode('malformed.entry.md', createState(), runtime, trace);
const newLoads = runtime.receipts.slice(before).filter(r => r.type === 'file_loaded');

trace.traceEntry('check', { source: 'playbook', gate: 'malformed:status', expected: true,
  passed: result.status === 'error',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: 'playbook', gate: 'malformed:error_refs', expected: true,
  passed: Boolean(result.error && result.error.includes('Malformed frontmatter') && result.error.includes('malformed.entry.md')),
  detail: `error = ${result.error}` });

trace.traceEntry('check', { source: 'playbook', gate: 'malformed:no_load', expected: true,
  passed: newLoads.length === 0,
  detail: `file_loaded during error = ${newLoads.length}` });
JS

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/rb_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.gate.startsWith('malformed:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.gate+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.3 — malformed frontmatter → error, 零文件加载 ✅');
"
```

→ 预期：status=error，error 含 Invalid frontmatter schema 和 malformed.entry.md，无 file_loaded。

---

## Step 2.4: MD 加载 wave.entry.md → 恢复 → loaded

三次错误后，MD 验证 Engine 未被污染——加载合法 entry wave.entry.md 仍正常。

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" experiments_env/prototype-workflow-chain/nodes-workflow-chain <<'JS'
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from './DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/rb_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-complex';

const runtime = createWorkflowRuntime('test', NODES_DIR);
const result = assessNode('wave.entry.md', createState(), runtime, trace);

trace.traceEntry('check', { source: 'playbook', gate: 'recovery:status', expected: true,
  passed: result.status === 'loaded',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: 'playbook', gate: 'recovery:entry_loaded', expected: true,
  passed: result.state.executionOrder.includes('wave.entry.md') && result.state.counters['wave.entry.md'] === 1,
  detail: `order=${JSON.stringify(result.state.executionOrder)}, count=${result.state.counters['wave.entry.md']}` });
JS

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/rb_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.gate.startsWith('recovery:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.gate+' — '+x.detail));
const ok=c.length===2&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.4 — 错误后恢复，正常加载 wave.entry.md ✅');
"
```

→ 预期：status=loaded，executionOrder 含 wave.entry.md。

---

## Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 3: 结果解读

> 11 个 check，验证三种错误路径 + 恢复：
>   [missing:*] 缺失依赖 → status=error，error 含文件名，零 file_loaded
>   [cycle:*] 循环依赖 → status=error，error 含两个文件名，零 file_loaded
>   [malformed:*] frontmatter schema 非法 → status=error，零 file_loaded
>   [recovery:*] 错误后加载合法 entry → loaded（Engine 未被污染）
>   全部 expected:true → 11/11 PASS 即通过。

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
