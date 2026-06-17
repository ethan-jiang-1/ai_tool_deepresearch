# test-workflow-load-medium (中等)

验证两个高级语义：
1. **依赖优先执行** — chain `entry → context → policy`，executionOrder 必须是 policy, context, entry
2. **内容缓存与执行分离** — 同一 MD 第二次被引用时 cache_hit（不重读），但仍产生新的 file_executed（重新执行）

- Bundle: `dpt_rb_test_wl_medium/`（真正的 DPT run bundle，validate + inspect 双过）
- Segments: 在 bundle 内的 `exp/segments/`
- Trace: `dpt_rb_test_wl_medium/_trace_wl_medium.jsonl`
- 预期: 7 个 check 全部 passed

---

## Step 1: 创建真正的 DPT run bundle

按 `instantiate-run-bundle` playbook 创建完整 bundle，拷入实验 segment MD，跑质量检查。

```bash
B="dpt_rb_test_wl_medium" && NAME="test_wl_medium" && TMPL="DPT_FRAMEWORK/rb_templates"

# 1a. 目录结构
rm -rf $B && mkdir -p $B/{seed_topics,reference,artifacts/wave1,artifacts/wave2,_cache,final}

# 1b. 从模板生成控制文件
for tmpl in START_FROM_HERE.md rb_plan.md rb_profile.yaml rb_status.json rb_queue.json; do
  sed "s/{{name}}/$NAME/g" "$TMPL/${tmpl}.tmpl" > "$B/${tmpl}"
done
cp "$TMPL/rb_trace.jsonl" "$B/rb_trace.jsonl"

# 1c. 拷入实验 segment MD
mkdir -p $B/exp/segments
cp experiments/prototype-workflow-load/segments-workflow-load/*.md $B/exp/segments/

# 1d. 质量检查
echo "=== validate-bundle ==="
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B/
echo "=== inspect-bundle ==="
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B/
echo "✓ segments: $(ls $B/exp/segments/ | wc -l) files"
```

→ 预期：validate 5/5 passed，inspect "directory structure complete"。

---

## Step 2: 创建实验 manifest

两个场景各自一个 manifest。不触碰任何 segment MD。

```bash
B="dpt_rb_test_wl_medium"
mkdir -p $B/.tmp

cat > $B/.tmp/chain-workflow.json << 'EOF'
{"name": "wl-chain", "steps": ["chain-entry.md"]}
EOF

cat > $B/.tmp/cache-workflow.json << 'EOF'
{"name": "wl-cache", "steps": ["repeat-step1.md", "repeat-step2.md"]}
EOF

echo "✓ 两个 manifest 就绪:"
ls $B/.tmp/
```

---

## Step 3: 验证依赖优先执行

chain-entry → chain-context → chain-policy。DFS 解析后依赖应优先于 requester 执行。

```bash
B="dpt_rb_test_wl_medium"

cat > $B/check_chain.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-workflow-load/trace.mjs';
import { loadWorkflowManifest, createWorkflowRuntime, createInitialState, advanceWorkflow } from '../experiments/prototype-workflow-load/workflow-load.mjs';

setTraceFile('dpt_rb_test_wl_medium/_trace_wl_medium.jsonl');
const SRC = 'wl-medium';
traceInit('wl-medium test', { source: SRC });

const manifest = loadWorkflowManifest('dpt_rb_test_wl_medium/.tmp/chain-workflow.json');
const runtime = createWorkflowRuntime(manifest);
const result = advanceWorkflow(createInitialState(), runtime);

const order = result.state.executionOrder;
const pIdx = order.indexOf('chain-policy.md');
const cIdx = order.indexOf('chain-context.md');
const eIdx = order.indexOf('chain-entry.md');

traceEntry('check', { source: SRC, step: 'chain:all_present',
  passed: pIdx >= 0 && cIdx >= 0 && eIdx >= 0,
  detail: `order = ${JSON.stringify(order)}` });

traceEntry('check', { source: SRC, step: 'chain:policy_first',
  passed: pIdx < cIdx && pIdx < eIdx,
  detail: `policy@${pIdx} < context@${cIdx}, entry@${eIdx}` });

traceEntry('check', { source: SRC, step: 'chain:context_before_entry',
  passed: cIdx < eIdx,
  detail: `context@${cIdx} < entry@${eIdx}` });

traceEntry('check', { source: SRC, step: 'chain:cursor_advanced',
  passed: runtime.cursor === 1,
  detail: `cursor = ${runtime.cursor}` });
JS

SEGMENTS_DIR="$B/exp/segments" node $B/check_chain.mjs
```

→ 预期：executionOrder = `["chain-policy.md", "chain-context.md", "chain-entry.md"]`，4 个 check 全 passed。

---

## Step 4: 验证内容缓存与执行分离

repeat-step1 和 repeat-step2 都依赖 shared-lib.md。
- 第一次 advance：shared-lib 产生 `file_read` + `file_executed`
- 第二次 advance：shared-lib 产生 `cache_hit`（不重读磁盘）+ 新的 `file_executed`（重新执行 code block）

```bash
B="dpt_rb_test_wl_medium"

cat > $B/check_cache.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-load/trace.mjs';
import { loadWorkflowManifest, createWorkflowRuntime, createInitialState, advanceWorkflow } from '../experiments/prototype-workflow-load/workflow-load.mjs';

// 追加到同一 trace 文件，不调 traceInit
setTraceFile('dpt_rb_test_wl_medium/_trace_wl_medium.jsonl');
const SRC = 'wl-medium';

const manifest = loadWorkflowManifest('dpt_rb_test_wl_medium/.tmp/cache-workflow.json');
const runtime = createWorkflowRuntime(manifest);
let state = createInitialState();

// Advance 1: repeat-step1 → shared-lib 首次加载
const r1 = advanceWorkflow(state, runtime);
state = r1.state;

const firstReads = runtime.receipts.filter(r => r.type === 'file_read' && r.fileRef === 'shared-lib.md');
traceEntry('check', { source: SRC, step: 'cache:first_is_file_read',
  passed: firstReads.length === 1,
  detail: `shared-lib file_read in advance 1: ${firstReads.length}` });

// Advance 2: repeat-step2 → shared-lib 已在缓存中
const r2 = advanceWorkflow(state, runtime);
state = r2.state;

const cacheHits = runtime.receipts.filter(r => r.type === 'cache_hit' && r.fileRef === 'shared-lib.md');
traceEntry('check', { source: SRC, step: 'cache:second_is_cache_hit',
  passed: cacheHits.length >= 1,
  detail: `shared-lib cache_hit in advance 2: ${cacheHits.length}` });

// 两次 advance 都产生了 file_executed
const allExecs = runtime.receipts.filter(r => r.type === 'file_executed' && r.fileRef === 'shared-lib.md');
traceEntry('check', { source: SRC, step: 'cache:executed_twice',
  passed: allExecs.length === 2 && state.counters.sharedLib === 2,
  detail: `shared-lib execs: ${allExecs.length}, counter: ${state.counters.sharedLib}` });
JS

SEGMENTS_DIR="$B/exp/segments" node $B/check_cache.mjs
```

→ 预期：shared-lib 被读一次、执行两次。counter = 2 证明 code block 跑了两次。

---

## Step 5: 从 trace 做最终裁决

```bash
B="dpt_rb_test_wl_medium"

cat > $B/verify.mjs << 'JS2'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-workflow-load/trace.mjs';

setTraceFile('dpt_rb_test_wl_medium/_trace_wl_medium.jsonl');

const lines = readFileSync(getTraceFile(), 'utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const passed = checks.filter(e => e.passed);
const failed = checks.filter(e => !e.passed);

console.log('');
console.log(`Result: ${checks.length} checks, ${passed.length} passed, ${failed.length} failed (${events.length} total events)`);
console.log('');
if (failed.length > 0) {
  console.log('FAILURES:');
  for (const c of failed) console.log(`  ✗ ${c.step}: ${c.detail}`);
  process.exit(1);
} else {
  for (const c of passed) console.log(`  ✓ ${c.step}`);
  console.log('');
  console.log('ALL CHECKS PASSED');
}

traceCleanup();
JS2

node $B/verify.mjs
```

→ 预期：`7 checks, 7 passed, 0 failed`。

---

## Step 6: 清理

```bash
rm -rf dpt_rb_test_wl_medium
echo "✓ Cleaned up."
```
