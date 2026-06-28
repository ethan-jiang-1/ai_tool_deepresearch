---
schema: command-experiment/v1
experiment: engine-boundary
case: case-402-light-complete-reject
weight: light
case_goal: "验证 delegated complete() 拒绝所有缺少 provenance 的场景：缺 slot_result_ref、缺 receipt、writes 无 output_files 声明、缺 cache file、nonce mismatch。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-402_eb_reject
trace: dpt_disp_case-402_eb_reject/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

fixture-backed、无 Agent actor、无外部调用。verdict 来自 Engine CLI 返回值和 trace。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Agent actor** | 无（fixture-backed） |
| **外部调用** | 无 |
| **verdict 来源** | CLI exit code + trace |

# case-402-light-complete-reject

6 个 reject 场景，覆盖 delegated `complete()` 的所有边界检查。

---

## Step 1: 创建 Bundle + 公共 fixtures

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_reject --case case-402 --force)
echo "Bundle: $B"

# Base queue setup
cat > "$B/rb_status.json" << 'JSON'
{"current_gate":"wave0_complete","next_gate":"wave1_complete","current_mode":"execution","state":"in_progress"}
JSON
cat > "$B/rb_plan.md" << 'MD'
---
{
  "plan_basename": "eb_reject",
  "derived_topic_count": 1,
  "topic_registry": [{ "id": "t1", "slug": "topic-a", "title": "Topic A" }]
}
---
# Plan
MD

# Common delegated task JSON
cat > "$B/task.json" << 'JSON'
{"work_id":"work-del","title":"Delegated","targets":{"controller":"main-agent","delegates":{"to":"sub-agent","role_key":"dpt-source-intake"}},"action":"test","producer_rule":"test","lineage":{},"priority_class":"P5_new_reference_intake","required_receipts":["none"],"done_condition":"test","verification":{"engine":[],"agent":[]},"writes_to":[],"status_sync":[],"completion_receipt":"none","failure_route":"test","payload":{}}
JSON

# Setup fixtures
cat > "$B/setup.mjs" << 'JS'
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];

// ── Slot A: missing receipt ──
const sA = '_subagents/wave_01/slot_00';
mkdirSync(path.join(B, sA), { recursive: true });
writeFileSync(path.join(B, `${sA}/_status.json`), JSON.stringify({ status: 'running', updated: new Date().toISOString() }));
writeFileSync(path.join(B, `${sA}/result.json`), JSON.stringify({
  slotKey: 'sA', roleAgentKey: 'dpt-source-intake', status: 'done', summary: '', evidenceCount: 0,
  references: [], confidence: 0, notes: [],
  output_files: [{ path: 'reference/a.md', role: 'reference', source_url: 'https://a.com/article-a' }],
  cache_trails: [],
}, null, 2));
mkdirSync(path.join(B, 'reference'), { recursive: true });
writeFileSync(path.join(B, 'reference/a.md'), '# A');

// ── Slot B: complete but missing declared output file ──
const sB = '_subagents/wave_01/slot_01';
mkdirSync(path.join(B, sB), { recursive: true });
writeFileSync(path.join(B, `${sB}/_status.json`), JSON.stringify({ status: 'running', updated: new Date().toISOString() }));
writeFileSync(path.join(B, `${sB}/runtime-receipt.jsonl`), [
  JSON.stringify({ event: 'agent_runtime_started', slotKey: 'sB', roleAgentKey: 'dpt-source-intake', receiptNonce: 'nb' }),
  JSON.stringify({ event: 'agent_result_ready', slotKey: 'sB', roleAgentKey: 'dpt-source-intake', receiptNonce: 'nb' }),
].join('\n') + '\n');
writeFileSync(path.join(B, `${sB}/result.json`), JSON.stringify({
  slotKey: 'sB', roleAgentKey: 'dpt-source-intake', status: 'done', summary: '', evidenceCount: 0,
  references: [], confidence: 0, notes: [],
  output_files: [{ path: 'reference/missing.md', role: 'reference', source_url: 'https://b.com/article-b' }],
  cache_trails: [],
}, null, 2));

// ── Slot C: incomplete cache leaf ──
const sC = '_subagents/wave_01/slot_02';
mkdirSync(path.join(B, sC), { recursive: true });
writeFileSync(path.join(B, `${sC}/_status.json`), JSON.stringify({ status: 'running', updated: new Date().toISOString() }));
writeFileSync(path.join(B, `${sC}/runtime-receipt.jsonl`), [
  JSON.stringify({ event: 'agent_runtime_started', slotKey: 'sC', roleAgentKey: 'dpt-source-intake', receiptNonce: 'nc' }),
  JSON.stringify({ event: 'agent_result_ready', slotKey: 'sC', roleAgentKey: 'dpt-source-intake', receiptNonce: 'nc' }),
].join('\n') + '\n');
const cDir = '_cache/wave0/primary/01_test/s01_broken';
mkdirSync(path.join(B, cDir), { recursive: true });
writeFileSync(path.join(B, `${cDir}/websearch.json`), '[]');
writeFileSync(path.join(B, `${cDir}/page.md`), '# Page');
// Intentionally omit meta.json
writeFileSync(path.join(B, `${sC}/result.json`), JSON.stringify({
  slotKey: 'sC', roleAgentKey: 'dpt-source-intake', status: 'done', summary: '', evidenceCount: 0,
  references: [], confidence: 0, notes: [],
  output_files: [],
  cache_trails: [cDir + '/'],
}, null, 2));

// ── Slot D: nonce mismatch ──
const sD = '_subagents/wave_01/slot_03';
mkdirSync(path.join(B, sD), { recursive: true });
writeFileSync(path.join(B, `${sD}/_status.json`), JSON.stringify({ status: 'running', updated: new Date().toISOString() }));
writeFileSync(path.join(B, `${sD}/runtime-receipt.jsonl`), [
  JSON.stringify({ event: 'agent_runtime_started', slotKey: 'sD', roleAgentKey: 'dpt-source-intake', receiptNonce: 'wrong-nonce-1' }),
  JSON.stringify({ event: 'agent_result_ready', slotKey: 'sD', roleAgentKey: 'dpt-source-intake', receiptNonce: 'wrong-nonce-2' }),
].join('\n') + '\n');
writeFileSync(path.join(B, `${sD}/result.json`), JSON.stringify({
  slotKey: 'sD', roleAgentKey: 'dpt-source-intake', status: 'done', summary: '', evidenceCount: 0,
  references: [], confidence: 0, notes: [],
  output_files: [],
  cache_trails: [],
}, null, 2));

// ── Slot E: missing output_files[] and cache_trails[] ──
const sE = '_subagents/wave_01/slot_04';
mkdirSync(path.join(B, sE), { recursive: true });
writeFileSync(path.join(B, `${sE}/_status.json`), JSON.stringify({ status: 'running', updated: new Date().toISOString() }));
writeFileSync(path.join(B, `${sE}/runtime-receipt.jsonl`), [
  JSON.stringify({ event: 'agent_runtime_started', slotKey: 'sE', roleAgentKey: 'dpt-source-intake', receiptNonce: 'ne' }),
  JSON.stringify({ event: 'agent_result_ready', slotKey: 'sE', roleAgentKey: 'dpt-source-intake', receiptNonce: 'ne' }),
].join('\n') + '\n');
// result.json with NO output_files and NO cache_trails
writeFileSync(path.join(B, `${sE}/result.json`), JSON.stringify({
  slotKey: 'sE', roleAgentKey: 'dpt-source-intake', status: 'done', summary: '', evidenceCount: 0,
  references: [], confidence: 0, notes: [],
}, null, 2));

// Trace
writeFileSync(path.join(B, 'rb_trace.jsonl'), JSON.stringify({ ts: new Date().toISOString(), event: 'run_start', source: 'trace', label: 'case-402' }) + '\n');

console.log('fixtures ready');
JS
node "$B/setup.mjs" $B
: > "$B/outcomes.jsonl"
```

→ 预期：`fixtures ready`。

---

## Step 2: 场景 A — 缺 slot_result_ref

```bash
# Fresh queue
rm -f "$B/rb_queue.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/ra.json" << 'JSON'
{"work_id":"work-del","receipt":"none"}
JSON
set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/ra.json"
sts=$?
set -e
if [ "$sts" -eq 0 ]; then echo "UNEXPECTED PASS"; else echo "EXPECTED REJECT"; fi
node -e "const fs=require('fs'); const [B,label,exitCode,expected]=process.argv.slice(1); fs.appendFileSync(B + '/outcomes.jsonl', JSON.stringify({label,status:Number(exitCode),expected:Number(expected)}) + '\n');" "$B" "A: no slot_result_ref" "$sts" 1
```

→ 预期：`EXPECTED REJECT`。

---

## Step 3: 场景 B — 缺 runtime receipt

```bash
rm -f "$B/rb_queue.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/rb.json" << 'JSON'
{"work_id":"work-del","receipt":"none","slot_result_ref":"_subagents/wave_01/slot_00/result.json"}
JSON
set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/rb.json"
sts=$?
set -e
if [ "$sts" -eq 0 ]; then echo "UNEXPECTED PASS"; else echo "EXPECTED REJECT"; fi
node -e "const fs=require('fs'); const [B,label,exitCode,expected]=process.argv.slice(1); fs.appendFileSync(B + '/outcomes.jsonl', JSON.stringify({label,status:Number(exitCode),expected:Number(expected)}) + '\n');" "$B" "B: no receipt" "$sts" 1
```

→ 预期：`EXPECTED REJECT`。

---

## Step 4: 场景 C — writes 无 output_files 声明

```bash
rm -f "$B/rb_queue.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/rc.json" << 'JSON'
{"work_id":"work-del","receipt":"none","writes":["reference/a.md"],"slot_result_ref":"_subagents/wave_01/slot_04/result.json"}
JSON
set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/rc.json"
sts=$?
set -e
if [ "$sts" -eq 0 ]; then echo "UNEXPECTED PASS"; else echo "EXPECTED REJECT"; fi
node -e "const fs=require('fs'); const [B,label,exitCode,expected]=process.argv.slice(1); fs.appendFileSync(B + '/outcomes.jsonl', JSON.stringify({label,status:Number(exitCode),expected:Number(expected)}) + '\n');" "$B" "C: writes without output_files declaration" "$sts" 1
```

→ 预期：`EXPECTED REJECT`。

---

## Step 5: 场景 D — 声明文件不存在

```bash
rm -f "$B/rb_queue.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/rd.json" << 'JSON'
{"work_id":"work-del","receipt":"none","slot_result_ref":"_subagents/wave_01/slot_01/result.json"}
JSON
set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/rd.json"
sts=$?
set -e
if [ "$sts" -eq 0 ]; then echo "UNEXPECTED PASS"; else echo "EXPECTED REJECT"; fi
node -e "const fs=require('fs'); const [B,label,exitCode,expected]=process.argv.slice(1); fs.appendFileSync(B + '/outcomes.jsonl', JSON.stringify({label,status:Number(exitCode),expected:Number(expected)}) + '\n');" "$B" "D: missing output file" "$sts" 1
```

→ 预期：`EXPECTED REJECT`。

---

## Step 6: 场景 E — cache leaf 缺文件

```bash
rm -f "$B/rb_queue.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/re.json" << 'JSON'
{"work_id":"work-del","receipt":"none","slot_result_ref":"_subagents/wave_01/slot_02/result.json"}
JSON
set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/re.json"
sts=$?
set -e
if [ "$sts" -eq 0 ]; then echo "UNEXPECTED PASS"; else echo "EXPECTED REJECT"; fi
node -e "const fs=require('fs'); const [B,label,exitCode,expected]=process.argv.slice(1); fs.appendFileSync(B + '/outcomes.jsonl', JSON.stringify({label,status:Number(exitCode),expected:Number(expected)}) + '\n');" "$B" "E: incomplete cache" "$sts" 1
```

→ 预期：`EXPECTED REJECT`。

---

## Step 7: 场景 F — nonce mismatch

```bash
rm -f "$B/rb_queue.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/rf.json" << 'JSON'
{"work_id":"work-del","receipt":"none","slot_result_ref":"_subagents/wave_01/slot_03/result.json"}
JSON
set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/rf.json"
sts=$?
set -e
if [ "$sts" -eq 0 ]; then echo "UNEXPECTED PASS"; else echo "EXPECTED REJECT"; fi
node -e "const fs=require('fs'); const [B,label,exitCode,expected]=process.argv.slice(1); fs.appendFileSync(B + '/outcomes.jsonl', JSON.stringify({label,status:Number(exitCode),expected:Number(expected)}) + '\n');" "$B" "F: nonce mismatch" "$sts" 1
```

→ 预期：`EXPECTED REJECT`。

---

## Step 8: 记录 Trace Check Events + 裁决

每个边界场景写入 `event: 'check'`，reject 场景设 `expected: false`（Principle 3）。

```bash
cat > "$B/verdict.mjs" << 'JS'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const tp = path.join(B, 'rb_trace.jsonl');

const outcomes = readFileSync(path.join(B, 'outcomes.jsonl'), 'utf-8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map(JSON.parse);
for (const s of outcomes) {
  const rejected = s.status !== 0;
  appendFileSync(tp, JSON.stringify({
    ts: new Date().toISOString(), event: 'check', source: 'case-402',
    gate: 'complete-reject',
    passed: rejected,
    expected: true,
    detail: `${s.label} rejected by delegated complete`,
    command_status: s.status,
    expected_status: s.expected,
  }) + '\n');
}

const events = readFileSync(tp, 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter(e => e.event === 'check' && e.source === 'case-402');
const matched = checks.filter(c => c.passed === (c.expected !== false)).length;
const ok = outcomes.length === 6 && matched === checks.length && checks.length >= 6;
writeFileSync(path.join(B, 'case-402-verdict.json'), JSON.stringify({ ok, checks: checks.length, matched, outcomes: outcomes.length }, null, 2));
console.log(`checks: ${checks.length}, matched: ${matched}, outcomes: ${outcomes.length}`);
console.log(ok ? '\x1b[32mCASE-402 PASS\x1b[0m' : '\x1b[31mCASE-402 FAIL\x1b[0m');
if (!ok) process.exit(1);
JS
node "$B/verdict.mjs" $B
```

→ 预期：`CASE-402 PASS`，≥6 个真实 reject 事件。

---

## Step 8: 结果解读

> 6 个场景 A-F，验证 delegated complete() 拒绝所有缺失 provenance 的情况：
>   [A] 缺 slot_result_ref → complete 拒绝（no provenance anchor）
>   [B] 缺 receipt → complete 拒绝（receipt verification fails）
>   [C] writes 无 output_files 声明 → complete 拒绝（declaration contract violated）
>   [D] 声明的 output file 不存在 → complete 拒绝（declaration-file mismatch）
>   [E] 缺 cache leaf（websearch.json/page.md/meta.json）→ complete 拒绝（incomplete cache trail）
>   [F] nonce mismatch → complete 拒绝（receipt integrity violation）
>   全部 6 个 reject 都是 expected:true — 正确拒绝等于正确行为。

## Step 9: PASS-only 清理

```bash
if node -e "const fs=require('fs'); const p=process.argv[1] + '/case-402-verdict.json'; process.exit(JSON.parse(fs.readFileSync(p, 'utf8')).ok ? 0 : 1)" "$B"; then
  rm -rf "$B"
  echo "✓ Cleaned up after PASS."
else
  echo "FAIL preserved for inspection: $B"
  exit 1
fi
```
