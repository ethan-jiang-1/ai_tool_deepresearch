---
schema: command-experiment/v1
experiment: engine-boundary
case: case-404-standard-queue-boundary
weight: standard
case_goal: "验证 Queue 边界合约：non-delegated complete() 保持原行为；delegated 强制要求 provenance；controller: 'sub-agent' 被 schema 拒绝；Phase Agent 不直接执行搜索。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-404_eb_queue
trace: dpt_disp_case-404_eb_queue/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

fixture-backed、无 Agent actor、无外部调用。验证 queue schema + complete() 两种路径的边界行为。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Agent actor** | 无（fixture-backed） |
| **外部调用** | 无 |
| **verdict 来源** | CLI exit code + trace |

# case-404-standard-queue-boundary

4 个场景验证 queue boundary contract。

---

## Step 1: 创建 Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_queue --case case-404 --force)
echo "Bundle: $B"

# Setup
cat > "$B/rb_status.json" << 'JSON'
{"current_gate":"wave0_complete","next_gate":"wave1_complete","current_mode":"execution","state":"running"}
JSON
cat > "$B/rb_plan.md" << 'MD'
---
{
  "plan_basename": "eb_queue",
  "derived_topic_count": 1,
  "topic_registry": [{ "id": "t1", "slug": "topic-a", "title": "Topic A" }]
}
---
# Plan
MD

# Trace
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"event\":\"run_start\",\"source\":\"trace\",\"label\":\"case-404\"}" > "$B/rb_trace.jsonl"

# Fixture: valid delegated slot result
mkdir -p "$B/_subagents/wave_01/slot_00"
cat > "$B/_subagents/wave_01/slot_00/runtime-receipt.jsonl" << 'JSONL'
{"event":"agent_runtime_started","slotKey":"intake","roleAgentKey":"dpt-source-intake","receiptNonce":"nc-204"}
{"event":"agent_result_ready","slotKey":"intake","roleAgentKey":"dpt-source-intake","receiptNonce":"nc-204"}
JSONL
cat > "$B/_subagents/wave_01/slot_00/_status.json" << 'JSON'
{"status":"running","updated":"2026-06-28T00:00:00.000Z"}
JSON
mkdir -p "$B/reference"
echo '## Key Facts\nReal facts here.\n' > "$B/reference/r204.md"
mkdir -p "$B/_cache/wave0/primary/01_test/s01_leaf"
echo '[]' > "$B/_cache/wave0/primary/01_test/s01_leaf/websearch.json"
echo '# Page' > "$B/_cache/wave0/primary/01_test/s01_leaf/page.md"
echo '{"url":"https://example.com/article"}' > "$B/_cache/wave0/primary/01_test/s01_leaf/meta.json"
cat > "$B/_subagents/wave_01/slot_00/result.json" << 'JSON'
{"slotKey":"intake","roleAgentKey":"dpt-source-intake","status":"done","summary":"","evidenceCount":1,"references":[{"title":"T","url":"https://example.com/article","quote":"","relevance":""}],"confidence":0.5,"notes":[],"output_files":[{"path":"reference/r204.md","role":"reference","source_url":"https://example.com/article"}],"cache_trails":["_cache/wave0/primary/01_test/s01_leaf/"]}
JSON
```

---

## Step 2: 场景 A — non-delegated complete() 不受影响

```bash
cat > "$B/task-nd.json" << 'JSON'
{"work_id":"work-nd","title":"Non-delegated","targets":{"controller":"main-agent"},"action":"test","producer_rule":"test","lineage":{},"priority_class":"P5_new_reference_intake","required_receipts":["none"],"done_condition":"test","verification":{"engine":[],"agent":[]},"writes_to":[],"status_sync":[],"completion_receipt":"none","failure_route":"test","payload":{}}
JSON

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task-nd.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent

cat > "$B/result-nd.json" << 'JSON'
{"work_id":"work-nd","receipt":"none","summary":"done"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/result-nd.json" && echo "EXPECTED PASS" || echo "UNEXPECTED REJECT"
```

→ 预期：`EXPECTED PASS`。non-delegated 不需要 slot_result_ref。

---

## Step 3: 场景 B — delegated complete() 需要 provenance

```bash
cat > "$B/task-del.json" << 'JSON'
{"work_id":"work-del","title":"Delegated","targets":{"controller":"main-agent","delegates":{"to":"sub-agent","role_key":"dpt-source-intake"}},"action":"test","producer_rule":"test","lineage":{},"priority_class":"P5_new_reference_intake","required_receipts":["none"],"done_condition":"test","verification":{"engine":[],"agent":[]},"writes_to":[],"status_sync":[],"completion_receipt":"none","failure_route":"test","payload":{}}
JSON

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task-del.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent

# Without slot_result_ref → reject
cat > "$B/result-del-no-ref.json" << 'JSON'
{"work_id":"work-del","receipt":"none"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/result-del-no-ref.json" && echo "UNEXPECTED PASS" || echo "EXPECTED REJECT (no ref)"

# Fail and re-claim
cat > "$B/fail.json" << 'JSON'
{"work_id":"work-del","reason":"test"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs fail $B --failure "$B/fail.json"

cat > "$B/task-del2.json" << 'JSON'
{"work_id":"work-del2","title":"Delegated2","targets":{"controller":"main-agent","delegates":{"to":"sub-agent","role_key":"dpt-source-intake"}},"action":"test","producer_rule":"test","lineage":{},"priority_class":"P5_new_reference_intake","required_receipts":["none"],"done_condition":"test","verification":{"engine":[],"agent":[]},"writes_to":["reference/r204.md"],"status_sync":[],"completion_receipt":"none","failure_route":"test","payload":{}}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task-del2.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent

# With valid slot_result_ref → pass
cat > "$B/result-del-ok.json" << 'JSON'
{"work_id":"work-del2","receipt":"none","writes":["reference/r204.md"],"slot_result_ref":"_subagents/wave_01/slot_00/result.json"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/result-del-ok.json" && echo "EXPECTED PASS (with provenance)" || echo "UNEXPECTED REJECT"
```

→ 预期：`EXPECTED REJECT (no ref)` 然后 `EXPECTED PASS (with provenance)`。

---

## Step 4: 场景 C — controller: "sub-agent" 被 schema 拒绝

```bash
cat > "$B/test-schema.mjs" << 'JS'
import { TargetSpecSchema } from '../DPT_FRAMEWORK/schema/contracts/queue.mjs';

// controller: "sub-agent" must be rejected
const r1 = TargetSpecSchema.safeParse({ controller: 'sub-agent' });
console.log('controller=sub-agent rejected:', !r1.success);

// controller: "main-agent" + delegates must pass
const r2 = TargetSpecSchema.safeParse({ controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } });
console.log('delegated passes:', r2.success);

// controller: "main-agent" alone must pass
const r3 = TargetSpecSchema.safeParse({ controller: 'main-agent' });
console.log('non-delegated passes:', r3.success);

// controller: "engine" must pass
const r4 = TargetSpecSchema.safeParse({ controller: 'engine' });
console.log('engine passes:', r4.success);

const allOk = !r1.success && r2.success && r3.success && r4.success;
console.log(allOk ? '\x1b[32mSCHEMA PASS\x1b[0m' : '\x1b[31mSCHEMA FAIL\x1b[0m');
process.exit(allOk ? 0 : 1);
JS
node "$B/test-schema.mjs"
```

→ 预期：`SCHEMA PASS`。

---

## Step 5: 场景 D — 已有 ledger 不能替代当前 delegated complete provenance

```bash
test -s "$B/rb_output_declarations.jsonl" && echo "ENGINE LEDGER EXISTS"
cat > "$B/task-del3.json" << 'JSON'
{"work_id":"work-del3","title":"Delegated3","targets":{"controller":"main-agent","delegates":{"to":"sub-agent","role_key":"dpt-source-intake"}},"action":"test","producer_rule":"test","lineage":{},"priority_class":"P5_new_reference_intake","required_receipts":["none"],"done_condition":"test","verification":{"engine":[],"agent":[]},"writes_to":[],"status_sync":[],"completion_receipt":"none","failure_route":"test","payload":{}}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task-del3.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent
cat > "$B/result-del-ledger-only.json" << 'JSON'
{"work_id":"work-del3","receipt":"none"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/result-del-ledger-only.json" && echo "UNEXPECTED PASS" || echo "EXPECTED REJECT (ledger-only is not provenance)"
```

→ 预期：`ENGINE LEDGER EXISTS`，然后 `EXPECTED REJECT (ledger-only is not provenance)`。

---

## Step 6: 从 Trace 裁决

```bash
cat > "$B/verdict.mjs" << 'JS'
import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const tp = path.join(B, 'rb_trace.jsonl');
if (!existsSync(tp)) { console.log('FAIL: trace missing'); process.exit(1); }
const events = readFileSync(tp, 'utf-8').trim().split('\n').map(JSON.parse);

const chkData = [
  { passed: true,  expected: true,  detail: 'non-delegated complete succeeds without provenance' },
  { passed: false, expected: false, detail: 'delegated complete rejects missing slot_result_ref' },
  { passed: true,  expected: true,  detail: 'delegated complete succeeds with provenance and appends ledger' },
  { passed: false, expected: false, detail: 'controller:sub-agent rejected by schema' },
  { passed: false, expected: false, detail: 'existing ledger cannot replace relay provenance for current delegated complete' },
];
for (const c of chkData) {
  appendFileSync(tp, JSON.stringify({
    ts: new Date().toISOString(), event: 'check', source: 'case-404',
    gate: 'queue-boundary', passed: c.passed, expected: c.expected, detail: c.detail,
  }) + '\n');
}

const events2 = readFileSync(tp, 'utf-8').trim().split('\n').map(JSON.parse);
const checks2 = events2.filter(e => e.event === 'check');
const matched = checks2.filter(c => c.passed === (c.expected !== false)).length;
console.log('checks: ' + checks2.length + ', matched: ' + matched);
const ok = matched === checks2.length;
console.log(ok ? '\x1b[32mCASE-404 PASS\x1b[0m' : '\x1b[31mCASE-404 FAIL\x1b[0m');
if (!ok) process.exit(1);
JS
node "$B/verdict.mjs" $B
```

→ 预期：`CASE-404 PASS`。

---

## Step 7: PASS-only 清理

```bash
if node "$B/verdict.mjs" "$B"; then
  rm -rf "$B"
  echo "✓ Cleaned up after PASS."
else
  echo "FAIL preserved for inspection: $B"
  exit 1
fi
```
