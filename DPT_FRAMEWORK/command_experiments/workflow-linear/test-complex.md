# test-workflow-load-complex (复杂)

验证错误路径和恢复能力：
1. **Missing dependency** — 返回 error，cursor 不前进，不执行任何文件
2. **Cycle dependency** — 检测到环，错误消息含完整路径
3. **Recovery** — 错误后用合法 manifest 可以正常 advance
4. **Malformed JSON frontmatter** — JSON 解析失败，行为与 missing 一致

- Bundle: `dpt_rb_test_wl_complex/`（真正的 DPT run bundle，validate + inspect 双过）
- Segments: 在 bundle 内的 `exp/segments/`
- Trace: `dpt_rb_test_wl_complex/_trace_wl_complex.jsonl`
- 预期: 14 个 check 全部 passed

---

## Step 1: 创建真正的 DPT run bundle

按 `instantiate-run-bundle` playbook 创建完整 bundle，拷入实验 segment MD，跑质量检查。

```bash
B="dpt_rb_test_wl_complex" && NAME="test_wl_complex" && TMPL="DPT_FRAMEWORK/rb_templates"

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

四个场景各自一个 manifest。不触碰任何 segment MD。

```bash
B="dpt_rb_test_wl_complex"
mkdir -p $B/.tmp

cat > $B/.tmp/missing.json << 'EOF'
{"name": "wl-missing", "steps": ["missing-entry.md"]}
EOF

cat > $B/.tmp/cycle.json << 'EOF'
{"name": "wl-cycle", "steps": ["cycle-a.md"]}
EOF

cat > $B/.tmp/valid.json << 'EOF'
{"name": "wl-valid", "steps": ["wave-entry.md"]}
EOF

cat > $B/.tmp/malformed.json << 'EOF'
{"name": "wl-malformed", "steps": ["malformed-entry.md"]}
EOF

echo "✓ 4 个 manifest 就绪:"
ls $B/.tmp/
```

---

## Step 3: Missing dependency — 不执行、不推进

missing-entry.md 声明了 `requires: ["nonexistent-file.md"]`，该文件不存在。advance 应返回 error，cursor 保持 0。

```bash
B="dpt_rb_test_wl_complex"

cat > $B/check_missing.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry } from '../experiments/prototype-workflow-load/trace.mjs';
import { loadWorkflowManifest, createWorkflowRuntime, createInitialState, advanceWorkflow } from '../experiments/prototype-workflow-load/workflow-load.mjs';

setTraceFile('dpt_rb_test_wl_complex/_trace_wl_complex.jsonl');
const SRC = 'wl-complex';
traceInit('wl-complex test', { source: SRC });

const m = loadWorkflowManifest('dpt_rb_test_wl_complex/.tmp/missing.json');
const rt = createWorkflowRuntime(m);
const result = advanceWorkflow(createInitialState(), rt);

traceEntry('check', { source: SRC, step: 'missing:status_error',
  passed: result.status === 'error',
  detail: `status = ${result.status}` });

traceEntry('check', { source: SRC, step: 'missing:cursor_unchanged',
  passed: rt.cursor === 0,
  detail: `cursor = ${rt.cursor}` });

traceEntry('check', { source: SRC, step: 'missing:no_execution',
  passed: rt.receipts.filter(r => r.type === 'file_executed').length === 0,
  detail: 'no file_executed receipts' });

traceEntry('check', { source: SRC, step: 'missing:error_names_file',
  passed: result.error && (result.error.includes('nonexistent-file.md') || result.error.includes('File not found')),
  detail: `error: ${result.error}` });
JS

SEGMENTS_DIR="$B/exp/segments" node $B/check_missing.mjs
```

→ 预期：status=error，cursor=0，0 个 file_executed，错误消息点名缺失文件。

---

## Step 4: Cycle dependency — 检测到环

cycle-a → cycle-b → cycle-a。DFS 应在第二次遇到 cycle-a 时检测到环。

```bash
B="dpt_rb_test_wl_complex"

cat > $B/check_cycle.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-load/trace.mjs';
import { loadWorkflowManifest, createWorkflowRuntime, createInitialState, advanceWorkflow } from '../experiments/prototype-workflow-load/workflow-load.mjs';

setTraceFile('dpt_rb_test_wl_complex/_trace_wl_complex.jsonl');
const SRC = 'wl-complex';

const m = loadWorkflowManifest('dpt_rb_test_wl_complex/.tmp/cycle.json');
const rt = createWorkflowRuntime(m);
const result = advanceWorkflow(createInitialState(), rt);

traceEntry('check', { source: SRC, step: 'cycle:status_error',
  passed: result.status === 'error',
  detail: `status = ${result.status}` });

traceEntry('check', { source: SRC, step: 'cycle:cursor_unchanged',
  passed: rt.cursor === 0,
  detail: `cursor = ${rt.cursor}` });

traceEntry('check', { source: SRC, step: 'cycle:no_execution',
  passed: rt.receipts.filter(r => r.type === 'file_executed').length === 0,
  detail: 'no file_executed receipts' });

traceEntry('check', { source: SRC, step: 'cycle:path_in_error',
  passed: result.error && result.error.includes('cycle') && result.error.includes('cycle-a.md') && result.error.includes('cycle-b.md'),
  detail: `error: ${result.error}` });
JS

SEGMENTS_DIR="$B/exp/segments" node $B/check_cycle.mjs
```

→ 预期：status=error，cursor=0，错误消息包含 "cycle" 和 cycle-a.md → cycle-b.md → cycle-a.md。

---

## Step 5: Recovery — 错误后正常路径仍然可用

错误不会破坏 Engine 状态。用合法 manifest 新建 runtime，advance 应正常成功。

```bash
B="dpt_rb_test_wl_complex"

cat > $B/check_recovery.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-load/trace.mjs';
import { loadWorkflowManifest, createWorkflowRuntime, createInitialState, advanceWorkflow } from '../experiments/prototype-workflow-load/workflow-load.mjs';

setTraceFile('dpt_rb_test_wl_complex/_trace_wl_complex.jsonl');
const SRC = 'wl-complex';

const m = loadWorkflowManifest('dpt_rb_test_wl_complex/.tmp/valid.json');
const rt = createWorkflowRuntime(m);
const result = advanceWorkflow(createInitialState(), rt);

traceEntry('check', { source: SRC, step: 'recovery:status_advanced',
  passed: result.status === 'advanced',
  detail: `status = ${result.status}` });

traceEntry('check', { source: SRC, step: 'recovery:step_executed',
  passed: result.state.executionOrder.includes('wave-entry.md'),
  detail: `executionOrder = ${JSON.stringify(result.state.executionOrder)}` });
JS

SEGMENTS_DIR="$B/exp/segments" node $B/check_recovery.mjs
```

→ 预期：status=advanced，wave-entry.md 正常执行。证明 Step 3/4 的错误没有污染后续流程。

---

## Step 6: Malformed JSON frontmatter

malformed-entry.md 的 frontmatter block 存在但 JSON 非法。parseFrontmatter 应抛 Malformed JSON 错误，行为与 missing 一致。

```bash
B="dpt_rb_test_wl_complex"

cat > $B/check_malformed.mjs << 'JS'
import { setTraceFile, traceEntry } from '../experiments/prototype-workflow-load/trace.mjs';
import { loadWorkflowManifest, createWorkflowRuntime, createInitialState, advanceWorkflow } from '../experiments/prototype-workflow-load/workflow-load.mjs';

setTraceFile('dpt_rb_test_wl_complex/_trace_wl_complex.jsonl');
const SRC = 'wl-complex';

const m = loadWorkflowManifest('dpt_rb_test_wl_complex/.tmp/malformed.json');
const rt = createWorkflowRuntime(m);
const result = advanceWorkflow(createInitialState(), rt);

traceEntry('check', { source: SRC, step: 'malformed:status_error',
  passed: result.status === 'error',
  detail: `status = ${result.status}` });

traceEntry('check', { source: SRC, step: 'malformed:cursor_unchanged',
  passed: rt.cursor === 0,
  detail: `cursor = ${rt.cursor}` });

traceEntry('check', { source: SRC, step: 'malformed:no_execution',
  passed: rt.receipts.filter(r => r.type === 'file_executed').length === 0,
  detail: 'no file_executed receipts' });

traceEntry('check', { source: SRC, step: 'malformed:error_mentions_json',
  passed: result.error && (result.error.includes('Malformed JSON') || result.error.includes('JSON')),
  detail: `error: ${result.error}` });
JS

SEGMENTS_DIR="$B/exp/segments" node $B/check_malformed.mjs
```

→ 预期：status=error，cursor=0，错误消息包含 "Malformed JSON"。

---

## Step 7: 从 trace 做最终裁决

```bash
B="dpt_rb_test_wl_complex"

cat > $B/verify.mjs << 'JS2'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-workflow-load/trace.mjs';

setTraceFile('dpt_rb_test_wl_complex/_trace_wl_complex.jsonl');

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

→ 预期：`14 checks, 14 passed, 0 failed`。

---

## Step 8: 清理

```bash
rm -rf dpt_rb_test_wl_complex
echo "✓ Cleaned up."
```
