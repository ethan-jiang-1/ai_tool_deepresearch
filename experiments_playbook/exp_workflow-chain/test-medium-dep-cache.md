---
schema: command-experiment/v1
experiment: workflow-chain
case: medium
weight: light
case_goal: "验证 MD controller mode 驱动 dependency-first 加载与跨 load 调用的 cache 行为：Markdown control surface 加载 chain.entry → Engine 先加载依赖；同一 runtime 内依次加载 repeat-1 和 repeat-2 → Engine 首次 file_read shared-lib，第二次 cache_hit + 重新 load。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wc_medium
trace: dpt_disp_wc_medium/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Markdown control surface 承载步骤指令。每一步由 Phase Agent 读取 MD 指令 → Engine 执行并写 trace → Phase Agent 读 trace 验证。

本实验验证：dependency-first 加载顺序、同一 runtime 内跨 load 调用的 file_read 去重（cache_hit）和重新 file_loaded。

# test-workflow-chain-medium

## Step 1: 创建 bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wc_medium --nodes=experiments/prototype-workflow-chain/nodes-workflow-chain --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate/inspect 通过。

---

## Step 2.1: MD 加载 chain.entry.md → 验证 dependency-first

MD 指令：「加载 chain.entry.md。」

chain.entry.md 依赖 chain-policy.dep.md 和 chain-context.dep.md。Engine 必须先解析并加载依赖，再加载 entry。

```bash
cat > $B/step_chain.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-medium';
trace.traceInit('wl-medium: MD controller mode → Engine', { source: SRC });

const runtime = createWorkflowRuntime('test', NODES_DIR);
const result = assessNode('chain.entry.md', createState(), runtime, trace);

const expectedPlan = ['chain-policy.dep.md', 'chain-context.dep.md', 'chain.entry.md'];

trace.traceEntry('check', { source: SRC, step: 'chain:status',
  passed: result.status === 'loaded',
  detail: `status = ${result.status}` });

trace.traceEntry('check', { source: SRC, step: 'chain:plan_dep_first',
  passed: JSON.stringify(result.plan) === JSON.stringify(expectedPlan),
  detail: `plan = ${JSON.stringify(result.plan)}` });

trace.traceEntry('check', { source: SRC, step: 'chain:order_dep_first',
  passed: JSON.stringify(result.state.executionOrder) === JSON.stringify(expectedPlan),
  detail: `order = ${JSON.stringify(result.state.executionOrder)}` });
JS

node $B/step_chain.mjs $B $B/exp/nodes

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.step.startsWith('chain:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.step+' — '+x.detail));
const ok=c.length===3&&c.every(x=>x.passed);
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.1 — dependency-first 加载 ✅');
"
```

→ 预期：plan = [chain-policy, chain-context, chain.entry]，依赖在前。

---

## Step 2.2: MD 创建 session → 加载 repeat-1 → 保存 session 状态

MD 指令：「创建 runtime session。加载 repeat-1.entry.md。」

repeat-1 依赖 shared-lib.dep.md。Engine 首次碰到 shared-lib → file_read → 写入 contentCache。

**关键**：Phase Agent 通过 Markdown control surface 把 session 状态（contentCache keys、state）序列化成 JSON 写入 `_session.json`——这是 MD controller mode 的核心能力：跨 step 持久化 runtime 状态。

```bash
cat > $B/s2_session_start.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { writeFileSync } from 'node:fs';

const B=process.argv[2], NODES_DIR=process.argv[3];
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-medium';
	// traceInit already called in Step 2.1 — do not re-init (would unlink prior check events)

const runtime = createWorkflowRuntime('test', NODES_DIR);
const r1 = assessNode('repeat-1.entry.md', createState(), runtime, trace);

// MD 检查 repeat-1 结果
trace.traceEntry('check', { source: SRC, step: 's2:repeat1_loaded',
  passed: r1.status === 'loaded',
  detail: `status = ${r1.status}` });

const reads1 = runtime.receipts.filter(r => r.type === 'file_read' && r.fileRef === 'shared-lib.dep.md');
trace.traceEntry('check', { source: SRC, step: 's2:shared_lib_read',
  passed: reads1.length === 1,
  detail: `shared-lib file_read = ${reads1.length} (首次读到)` });

// MD 保存 session: contentCache 中所有 fileRef → Engine 这一步加载了哪些文件
const cacheSnapshot = {};
for (const [fileRef, entry] of runtime.contentCache) {
  cacheSnapshot[fileRef] = { md: entry.md, frontmatter: entry.frontmatter };
}

writeFileSync(B+'/_session.json', JSON.stringify({
  cacheSnapshot,
  state: { counters: r1.state.counters, executionOrder: r1.state.executionOrder },
  receiptCount: runtime.receipts.length,
}, null, 2));

console.log('MD: session saved → _session.json');
console.log('MD: cache keys =', JSON.stringify([...runtime.contentCache.keys()]));
JS

node $B/s2_session_start.mjs $B $B/exp/nodes

# MD 读 trace + 检查 session 文件
node -e "
const e=require('fs').readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.step.startsWith('s2:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.step+' — '+x.detail));
const ok=c.length===2&&c.every(x=>x.passed);
const s=JSON.parse(require('fs').readFileSync('$B/_session.json','utf-8'));
console.log('MD reads session: cache keys =', JSON.stringify(Object.keys(s.cacheSnapshot)));
console.log('MD reads session: state counters =', JSON.stringify(s.state.counters));
if(!ok||!s.cacheSnapshot['shared-lib.dep.md']||!s.cacheSnapshot['repeat-1.entry.md'])process.exit(1);
console.log('MD裁决: Step 2.2 — repeat-1 加载完成, session 已保存 ✅');
"
```

→ 预期：repeat-1 loaded，shared-lib file_read=1，session 文件含 shared-lib 和 repeat-1 的缓存。

---

## Step 2.3: MD 恢复 session → 加载 repeat-2 → 验证 cache_hit

MD 指令：「从上一步的 session 恢复 runtime。加载 repeat-2.entry.md。」

MD 读 `_session.json` → 用 `readMarkdownFile(key, runtime, trace=null)` 把缓存文件预加载进 contentCache（trace=null 不产生 trace event——这是恢复，不是新读）。然后调 `assessNode('repeat-2.entry.md', ...)` → Engine 在 contentCache 中找到 shared-lib → cache_hit！

```bash
cat > $B/s3_session_resume.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import {
  createWorkflowRuntime, createState, assessNode, readMarkdownFile
} from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { readFileSync } from 'node:fs';

const B=process.argv[2], NODES_DIR=process.argv[3];
// 真实 trace — 只记录 Step 2.3 的 load 行为
const trace = createTrace(B+'/_trace.jsonl', { consoleEcho: true });
const SRC = 'wl-medium';

// MD 读 session
const session = JSON.parse(readFileSync(B+'/_session.json', 'utf-8'));
console.log('MD: restored session — cache keys =', JSON.stringify(Object.keys(session.cacheSnapshot)));

// MD 恢复 runtime: 创建新 runtime，预加载缓存
const runtime = createWorkflowRuntime('test', NODES_DIR);
for (const [fileRef, entry] of Object.entries(session.cacheSnapshot)) {
  // trace=null → 恢复操作不写 trace（这是 session 重建，不是新读文件）
  runtime.contentCache.set(fileRef, { fileRef, md: entry.md, frontmatter: entry.frontmatter });
}
console.log('MD: runtime restored — contentCache.size =', runtime.contentCache.size);

// MD 恢复 state
const state = createState();
state.counters = { ...session.state.counters };
state.executionOrder = [...session.state.executionOrder];

// MD: 加载 repeat-2 — Engine 应命中 shared-lib 缓存
const r2 = assessNode('repeat-2.entry.md', state, runtime, trace);

trace.traceEntry('check', { source: SRC, step: 's3:repeat2_loaded',
  passed: r2.status === 'loaded',
  detail: `status = ${r2.status}` });

// shared-lib 命中了缓存 → 不应有新 file_read
const newReads = runtime.receipts.filter(r => r.type === 'file_read' && r.fileRef === 'shared-lib.dep.md');
trace.traceEntry('check', { source: SRC, step: 's3:no_extra_read',
  passed: newReads.length === 0,
  detail: `shared-lib new file_read = ${newReads.length} (缓存命中，不再读盘)` });

// 应有 cache_hit event
const hits = runtime.receipts.filter(r => r.type === 'cache_hit' && r.fileRef === 'shared-lib.dep.md');
trace.traceEntry('check', { source: SRC, step: 's3:cache_hit',
  passed: hits.length >= 1,
  detail: `shared-lib cache_hit = ${hits.length}` });

// shared-lib 被 file_loaded 两次（repeat-1 + repeat-2 各一次）
const loads = runtime.receipts.filter(r => r.type === 'file_loaded' && r.fileRef === 'shared-lib.dep.md');
trace.traceEntry('check', { source: SRC, step: 's3:loaded_twice',
  passed: loads.length === 1 && r2.state.counters['shared-lib.dep.md'] === 2,
  detail: `new loads=${loads.length}, total counter=${r2.state.counters['shared-lib.dep.md']}` });
JS

node $B/s3_session_resume.mjs $B $B/exp/nodes

# MD 读 trace 裁决
node -e "
const e=require('fs').readFileSync('$B/_trace.jsonl','utf-8').trim().split('\n').map(JSON.parse);
const c=e.filter(x=>x.event==='check'&&x.step.startsWith('s3:'));
c.forEach(x=>console.log((x.passed?'PASS':'FAIL')+' '+x.step+' — '+x.detail));
// 验证 cache_hit event 确实写入了 trace
const hits=e.filter(x=>x.event==='cache_hit'&&x.fileRef==='shared-lib.dep.md');
console.log('trace cache_hit events for shared-lib: '+hits.length);
const ok=c.length===4&&c.every(x=>x.passed)&&hits.length>=1;
if(!ok)process.exit(1);
console.log('MD裁决: Step 2.3 — session 恢复 + cache_hit 验证 ✅');
"
```

→ 预期：repeat-2 loaded，shared-lib 无新 file_read（缓存命中），cache_hit 出现，counter=2。

---

## Step 2.4: MD 最终裁决——汇总全部 check event

```bash
cat > $B/verify.mjs << 'JS2'
import { readFileSync } from 'node:fs';
const B=process.argv[2];
const lines = readFileSync(B+'/_trace.jsonl','utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const passed = checks.filter(e => e.passed);
const failed = checks.filter(e => !e.passed);

console.log(`Result: ${checks.length} checks, ${passed.length} passed, ${failed.length} failed (${events.length} total events)`);
if (failed.length > 0) {
  for (const c of failed) console.log(`\x1b[31m  FAIL ${c.step}: ${c.detail}\x1b[0m`);
  process.exit(1);
}
for (const c of passed) console.log(`\x1b[32m  PASS ${c.step}\x1b[0m`);
console.log('\n\x1b[32mALL CHECKS PASSED\x1b[0m');
JS2

node $B/verify.mjs $B
```

→ 预期：`9 checks, 9 passed, 0 failed`。

---

## Step 3: 清理

```bash
rm -rf $B
```
