# test-workflow-load-simple (简单)

验证一个核心假设：**manifest load 不预读 step MD，advance 时才动态加载**。

- Bundle: `dpt_rb_test_wl_simple/`（真正的 DPT run bundle，validate + inspect 双过）
- Segments: 在 bundle 内的 `exp/segments/`（从 prototype 拷入）
- Trace: `dpt_rb_test_wl_simple/_trace_wl_simple.jsonl`
- 预期: 7 个 trace event，6 个 check 全部 passed

---

## Step 1: 创建真正的 DPT run bundle

按 `instantiate-run-bundle` playbook 创建完整 bundle，拷入实验 segment MD，跑质量检查。

```bash
B="dpt_rb_test_wl_simple" && NAME="test_wl_simple" && TMPL="DPT_FRAMEWORK/rb_templates"

# 1a. 目录结构
rm -rf $B && mkdir -p $B/{seed_topics,reference,artifacts/wave1,artifacts/wave2,_cache,final}

# 1b. 从模板生成控制文件
for tmpl in START_FROM_HERE.md rb_plan.md rb_profile.yaml rb_status.json rb_queue.json; do
  sed "s/{{name}}/$NAME/g" "$TMPL/${tmpl}.tmpl" > "$B/${tmpl}"
done
cp "$TMPL/rb_trace.jsonl" "$B/rb_trace.jsonl"

# 1c. 拷入实验 segment MD（放在 bundle 内的 exp/segments/）
mkdir -p $B/exp/segments
cp experiments/prototype-workflow-load/segments-workflow-load/*.md $B/exp/segments/

# 1d. 质量检查
echo "=== validate-bundle ==="
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B/
echo "=== inspect-bundle ==="
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B/
echo "✓ segments: $(ls $B/exp/segments/ | wc -l) files"
```

→ 预期：validate 5/5 passed，inspect "directory structure complete"，18 segment files。

---

## Step 2: 创建实验 manifest

在 bundle 的 `.tmp/` 下放 workflow.json，声明 step 顺序。不触碰任何 segment MD。

```bash
B="dpt_rb_test_wl_simple"
mkdir -p $B/.tmp

cat > $B/.tmp/workflow.json << 'EOF'
{"name": "wl-simple", "steps": ["wave-entry.md"]}
EOF

echo "✓ manifest:"
cat $B/.tmp/workflow.json
```

---

## Step 3: 验证启动时不预读 step MD

`loadWorkflowManifest` + `createWorkflowRuntime` 之后，立刻检查 runtime 内部状态：
- contentCache 应为空
- cursor 应为 0
- 不应有任何 file_read receipt

`SEGMENTS_DIR` 指向 bundle 内的 `exp/segments/`。

```bash
B="dpt_rb_test_wl_simple"

cat > $B/check_init.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-workflow-load/trace.mjs';
import { loadWorkflowManifest, createWorkflowRuntime } from '../experiments/prototype-workflow-load/workflow-load.mjs';

setTraceFile('dpt_rb_test_wl_simple/_trace_wl_simple.jsonl');
const SRC = 'wl-simple';

traceInit('wl-simple test (real bundle)', { source: SRC });

const manifest = loadWorkflowManifest('dpt_rb_test_wl_simple/.tmp/workflow.json');
const runtime = createWorkflowRuntime(manifest);

traceEntry('check', { source: SRC, step: 'init:cache_empty',
  passed: runtime.contentCache.size === 0,
  detail: `contentCache.size = ${runtime.contentCache.size}` });

traceEntry('check', { source: SRC, step: 'init:cursor_zero',
  passed: runtime.cursor === 0,
  detail: `cursor = ${runtime.cursor}` });

traceEntry('check', { source: SRC, step: 'init:no_file_read',
  passed: runtime.receipts.filter(r => r.type === 'file_read').length === 0,
  detail: 'no file_read receipt before advance' });
JS

SEGMENTS_DIR="$B/exp/segments" node $B/check_init.mjs
```

→ 预期：3 个 check 全部 `passed: true`。

---

## Step 4: 推进 workflow，验证 step MD 被动态加载

重新创建 runtime（给定相同 manifest，行为完全一致），调用 `advanceWorkflow`。trace 追加到 Step 3 的文件。

```bash
B="dpt_rb_test_wl_simple"

cat > $B/check_advance.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-load/trace.mjs';
import { loadWorkflowManifest, createWorkflowRuntime, createInitialState, advanceWorkflow } from '../experiments/prototype-workflow-load/workflow-load.mjs';

// 不调 traceInit，trace 追加到 Step 3 创建的文件
setTraceFile('dpt_rb_test_wl_simple/_trace_wl_simple.jsonl');
const SRC = 'wl-simple';

const manifest = loadWorkflowManifest('dpt_rb_test_wl_simple/.tmp/workflow.json');
const runtime = createWorkflowRuntime(manifest);
const state = createInitialState();
const result = advanceWorkflow(state, runtime);

traceEntry('check', { source: SRC, step: 'adv:status_advanced',
  passed: result.status === 'advanced',
  detail: `status = ${result.status}` });

traceEntry('check', { source: SRC, step: 'adv:step_executed',
  passed: result.state.executionOrder.includes('wave-entry.md'),
  detail: `executionOrder = ${JSON.stringify(result.state.executionOrder)}` });

traceEntry('check', { source: SRC, step: 'adv:cursor_moved',
  passed: runtime.cursor === 1,
  detail: `cursor = ${runtime.cursor}` });

// 关键证据：file_read 发生在 advance 期间
const reads = runtime.receipts.filter(r => r.type === 'file_read');
traceEntry('check', { source: SRC, step: 'adv:file_read_happened',
  passed: reads.length >= 1 && reads.some(r => r.fileRef === 'wave-entry.md'),
  detail: `files read: ${reads.map(r => r.fileRef).join(', ')}` });
JS

SEGMENTS_DIR="$B/exp/segments" node $B/check_advance.mjs
```

→ 预期：4 个 check 全部 passed。`adv:file_read_happened` 是最关键的证据。

---

## Step 5: 从 trace 做最终裁决

读取 trace 文件，统计所有 check 的 pass/fail。

```bash
B="dpt_rb_test_wl_simple"

cat > $B/verify.mjs << 'JS2'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-workflow-load/trace.mjs';

setTraceFile('dpt_rb_test_wl_simple/_trace_wl_simple.jsonl');

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
rm -rf dpt_rb_test_wl_simple
echo "✓ Cleaned up."
```
