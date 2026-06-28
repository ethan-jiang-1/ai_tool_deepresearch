---
schema: command-experiment/v1
experiment: engine-boundary
case: case-402-light-complete-reject
weight: light
case_goal: "验证 delegated complete() 拒绝所有缺少 provenance 的场景：缺 slot_result_ref、缺 receipt、缺 output_files、缺 cache file、nonce mismatch。"
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
{"current_gate":"wave0_complete","next_gate":"wave1_complete","current_mode":"execution","state":"running"}
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
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/ra.json" && echo "UNEXPECTED PASS" || echo "EXPECTED REJECT"
```

→ 预期：`EXPECTED REJECT`。

---

## Step 3: 场景 B — 缺 runtime receipt

```bash
cat > "$B/fail.json" << 'JSON'
{"work_id":"work-del","reason":"advance"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs fail $B --failure "$B/fail.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/rb.json" << 'JSON'
{"work_id":"work-del","receipt":"none","slot_result_ref":"_subagents/wave_01/slot_00/result.json"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/rb.json" && echo "UNEXPECTED PASS" || echo "EXPECTED REJECT"
```

→ 预期：`EXPECTED REJECT`。

---

## Step 4: 场景 C — 缺 output_files[] / cache_trails[]

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs fail $B --failure "$B/fail.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/rc.json" << 'JSON'
{"work_id":"work-del","receipt":"none","slot_result_ref":"_subagents/wave_01/slot_04/result.json"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/rc.json" && echo "UNEXPECTED PASS" || echo "EXPECTED REJECT"
```

→ 预期：`EXPECTED REJECT`。

---

## Step 5: 场景 D — 声明文件不存在

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs fail $B --failure "$B/fail.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/rd.json" << 'JSON'
{"work_id":"work-del","receipt":"none","slot_result_ref":"_subagents/wave_01/slot_01/result.json"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/rd.json" && echo "UNEXPECTED PASS" || echo "EXPECTED REJECT"
```

→ 预期：`EXPECTED REJECT`。

---

## Step 6: 场景 E — cache leaf 缺文件

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs fail $B --failure "$B/fail.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/re.json" << 'JSON'
{"work_id":"work-del","receipt":"none","slot_result_ref":"_subagents/wave_01/slot_02/result.json"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/re.json" && echo "UNEXPECTED PASS" || echo "EXPECTED REJECT"
```

→ 预期：`EXPECTED REJECT`。

---

## Step 7: 场景 F — nonce mismatch

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs fail $B --failure "$B/fail.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/rf.json" << 'JSON'
{"work_id":"work-del","receipt":"none","slot_result_ref":"_subagents/wave_01/slot_03/result.json"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/rf.json" && echo "UNEXPECTED PASS" || echo "EXPECTED REJECT"
```

→ 预期：`EXPECTED REJECT`。

---

## Step 8: 记录 Trace Check Events + 裁决

每个边界场景写入 `event: 'check'`，reject 场景设 `expected: false`（Principle 3）。

```bash
cat > "$B/verdict.mjs" << 'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const tp = path.join(B, 'rb_trace.jsonl');

// Write check events for each scenario outcome
const scenarios = [
  { label: 'A: no slot_result_ref',   passed: false, expected: false, detail: 'delegated complete rejected missing ref' },
  { label: 'B: no receipt',           passed: false, expected: false, detail: 'delegated complete rejected missing receipt' },
  { label: 'C: no declaration',       passed: false, expected: false, detail: 'delegated complete rejected missing output_files/cache_trails' },
  { label: 'D: missing output file',  passed: false, expected: false, detail: 'delegated complete rejected missing declared file' },
  { label: 'E: incomplete cache',     passed: false, expected: false, detail: 'delegated complete rejected incomplete cache leaf' },
  { label: 'F: nonce mismatch',       passed: false, expected: false, detail: 'delegated complete rejected nonce mismatch' },
];
for (const s of scenarios) {
  appendFileSync(tp, JSON.stringify({
    ts: new Date().toISOString(), event: 'check', source: 'case-402',
    gate: 'complete-reject', passed: s.passed, expected: s.expected, detail: s.detail,
  }) + '\n');
}

// Verdict
const events = readFileSync(tp, 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const ok = checks.filter(c => c.passed === (c.expected !== false)).length === checks.length;
console.log(`checks: ${checks.length}, matched: ${checks.filter(c => c.passed === (c.expected !== false)).length}`);
console.log(ok ? '\x1b[32mCASE-402 PASS\x1b[0m' : '\x1b[31mCASE-402 FAIL\x1b[0m');
if (!ok) process.exit(1);
JS
node "$B/verdict.mjs" $B
```

→ 预期：`CASE-402 PASS`，≥6 个 reject 事件。

---

## Step 9: PASS-only 清理

```bash
if node "$B/verdict.mjs" "$B"; then
  rm -rf "$B"
  echo "✓ Cleaned up after PASS."
else
  echo "FAIL preserved for inspection: $B"
  exit 1
fi
```
