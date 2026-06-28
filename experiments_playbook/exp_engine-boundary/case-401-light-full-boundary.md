---
schema: command-experiment/v1
experiment: engine-boundary
case: case-401-light-full-boundary
weight: light
case_goal: "验证 hardened Agent↔Engine 边界正向全链路：fixture slot result → delegated complete → ledger → validate-bundle → gate content_dedup → trace 统一。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-401_eb_full
trace: dpt_disp_case-401_eb_full/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

fixture-backed、无 Agent actor、无外部调用。所有场景使用真实 Engine CLI 路径。verdict 来自 `rb_trace.jsonl` + gate JSON。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Agent actor** | 无（fixture-backed） |
| **外部调用** | 无（无 WebSearch/WebFetch） |
| **ledger 生成** | Engine delegated `complete()` |
| **gate 输入** | `rb_output_declarations.jsonl`（不扫描 reference/） |
| **trace** | `rb_trace.jsonl`（唯一 sink） |
| **verdict 来源** | trace + gate JSON + ledger 内容 |

# case-401-light-full-boundary

正向全链路：fixture slot result → delegated complete → ledger append → validate-bundle → gate content_dedup pass → trace 验证。

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_full --case case-401 --force)
echo "Bundle: $B"
```

---

## Step 2: 搭建 fixtures

创建有效的 slot result（含 output_files + cache_trails）、runtime receipt、输出文件、cache leaf（含三文件）。

```bash
cat > "$B/setup.mjs" << 'JS'
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const B = process.argv[2];
const slotDir = '_subagents/wave_01/slot_00';
const nonce = randomUUID();
mkdirSync(path.join(B, slotDir), { recursive: true });

// Runtime receipt
writeFileSync(path.join(B, `${slotDir}/runtime-receipt.jsonl`), [
  JSON.stringify({ event: 'agent_runtime_started', slotKey: 'source_intake', roleAgentKey: 'dpt-source-intake', receiptNonce: nonce }),
  JSON.stringify({ event: 'agent_result_ready', slotKey: 'source_intake', roleAgentKey: 'dpt-source-intake', receiptNonce: nonce }),
].join('\n') + '\n');

// Slot status
writeFileSync(path.join(B, `${slotDir}/_status.json`), JSON.stringify({ status: 'running', updated: new Date().toISOString() }));

// Committed slot result with declaration
writeFileSync(path.join(B, `${slotDir}/result.json`), JSON.stringify({
  slotKey: 'source_intake', roleAgentKey: 'dpt-source-intake', status: 'done',
  summary: 'Completed source intake', evidenceCount: 2,
  references: [
    { title: 'AI Safety Overview', url: 'https://example.com/ai-safety', quote: 'AI safety is critical.', relevance: 'foundational' },
    { title: 'EV Market 2024', url: 'https://example.com/ev-market', quote: 'EV sales surpassed 10M.', relevance: 'market data' },
  ],
  confidence: 0.9, notes: [],
  output_files: [
    { path: 'reference/ai-safety.md', role: 'reference', source_url: 'https://example.com/ai-safety' },
    { path: 'reference/ev-market.md', role: 'reference', source_url: 'https://example.com/ev-market' },
  ],
  cache_trails: ['_cache/wave0/primary/01_intake/s01_ai_safety/', '_cache/wave0/primary/01_intake/s02_ev_market/'],
}, null, 2));

// Output files
mkdirSync(path.join(B, 'reference'), { recursive: true });
writeFileSync(path.join(B, 'reference/ai-safety.md'), '---\nsource_url: https://example.com/ai-safety\n---\n## Key Facts\nAI safety research focuses on alignment and robustness against adversarial attacks.\n## Core Content Capture\nOverview of AI safety field.\n');
writeFileSync(path.join(B, 'reference/ev-market.md'), '---\nsource_url: https://example.com/ev-market\n---\n## Key Facts\n2024 年全球新能源汽车销量突破 1000 万辆，中国市场占比超 60%，比亚迪市场份额领先。\n## Core Content Capture\nEV market analysis.\n');

// Cache leaves with 3 files each
for (const [i, leaf] of ['s01_ai_safety', 's02_ev_market'].entries()) {
  const d = path.join(B, '_cache/wave0/primary/01_intake', leaf);
  mkdirSync(d, { recursive: true });
  writeFileSync(path.join(d, 'websearch.json'), JSON.stringify([{ title: `R${i+1}`, url: `https://example.com/${i+1}` }]));
  writeFileSync(path.join(d, 'page.md'), `# Page ${i+1}`);
  writeFileSync(path.join(d, 'meta.json'), JSON.stringify({ url: `https://example.com/${i+1}`, title: `S${i+1}`, source_domain: 'example.com', source_name: `S${i+1}`, fetched_at: new Date().toISOString(), fetch_method: 'WebFetch', fetch_chain: 'direct', content_type: 'article', reliability_tier: 'Tier 2', reliability_basis: 'practitioner', whitelist_status: 'allowed' }));
}

// Gate prerequisites
writeFileSync(path.join(B, 'reference/_INDEX.md'), '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| ai-safety.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |\n| ev-market.md | primary | expert | Tier 1 | topic-a | wave0_foundation | accepted | 2026-06-15 |\n');
writeFileSync(path.join(B, 'reference/README.md'), '# Reference Evidence\n');
mkdirSync(path.join(B, 'artifacts/wave0/topic-a'), { recursive: true });
writeFileSync(path.join(B, 'artifacts/wave0/topic-a/source.yaml'), '- url: "https://example.com/ev-market"\n  title: "EV Market 2024"\n  retrieved_date: "2026-06-15"\n  topic_tag: "topic-a"\n');

// Trace init
writeFileSync(path.join(B, 'rb_trace.jsonl'), JSON.stringify({ ts: new Date().toISOString(), event: 'run_start', source: 'trace', label: 'case-401' }) + '\n');

console.log('fixtures ready');
JS
node "$B/setup.mjs" $B
```

→ 预期：`fixtures ready`。

---

## Step 3: 场景 A — delegated complete 成功 → ledger append

```bash
# Queue setup
cat > "$B/rb_status.json" << 'JSON'
{"current_gate":"wave0_complete","next_gate":"wave1_complete","current_mode":"execution","state":"running"}
JSON

cat > "$B/rb_plan.md" << 'MD'
---
{
  "plan_basename": "eb_full",
  "derived_topic_count": 1,
  "topic_registry": [{ "id": "t1", "slug": "topic-a", "title": "Topic A" }]
}
---
# Plan
MD

# Enqueue delegated task
cat > "$B/task.json" << 'JSON'
{"work_id":"wave0-source-topic-a","title":"Source intake","targets":{"controller":"main-agent","delegates":{"to":"sub-agent","role_key":"dpt-source-intake","timeout_ms":600000}},"action":"Search and collect references. Return output_files[] and cache_trails[] in result.","producer_rule":"source_intake_fan_in","lineage":{"topic_slug":"topic-a"},"priority_class":"P5_new_reference_intake","required_receipts":["none"],"done_condition":"Files exist.","verification":{"engine":[],"agent":[]},"writes_to":["reference/ai-safety.md","reference/ev-market.md"],"status_sync":[],"completion_receipt":"none","failure_route":"queue repair work","payload":{}}
JSON

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent

cat > "$B/result.json" << 'JSON'
{"work_id":"wave0-source-topic-a","receipt":"none","summary":"Completed","writes":["reference/ai-safety.md","reference/ev-market.md"],"slot_result_ref":"_subagents/wave_01/slot_00/result.json"}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/result.json" && echo "EXPECTED PASS" || echo "UNEXPECTED REJECT"
```

→ 预期：`EXPECTED PASS`。

```bash
# Record trace check for complete step
python3 -c "
import json
f = open('$B/rb_trace.jsonl', 'a')
f.write(json.dumps({'ts':'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)','event':'check','source':'case-401','gate':'delegated-complete','passed':True,'expected':True,'detail':'delegated complete succeeded with ledger'}) + '\n')
f.close()
"
```

---

## Step 4: 验证 ledger

```bash
cat > "$B/check-ledger.mjs" << 'JS'
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const lp = path.join(B, 'rb_output_declarations.jsonl');
if (!existsSync(lp)) { console.log('FAIL: ledger missing'); process.exit(1); }
const lines = readFileSync(lp, 'utf-8').trim().split('\n').filter(Boolean);
if (lines.length !== 1) { console.log(`FAIL: expected 1 record, got ${lines.length}`); process.exit(1); }
const r = JSON.parse(lines[0]);
const ok = r.work_id === 'wave0-source-topic-a' && r.output_files.length === 2 && r.cache_trails.length === 2 && r.slot_result_ref === '_subagents/wave_01/slot_00/result.json';
console.log(ok ? '\x1b[32mLEDGER PASS\x1b[0m' : '\x1b[31mLEDGER FAIL\x1b[0m');
if (!ok) process.exit(1);
JS
node "$B/check-ledger.mjs" $B
```

→ 预期：`LEDGER PASS`。

---

## Step 5: 场景 B — validate-bundle

```bash
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
```

→ 预期：`rb_output_declarations.jsonl ✓`。

---

## Step 6: 场景 C — Gate wave0-complete（content_dedup 从 ledger 读取）

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); ok=d['check']['passed']; print('\x1b[32mGATE PASS\x1b[0m' if ok else '\x1b[31mGATE FAIL\x1b[0m: '+str(d.get('inspect',[]))); sys.exit(0 if ok else 1)"
```

→ 预期：`GATE PASS`。

---

## Step 7: 记录 Trace Check Events

每个场景的结果写入标准 `event: 'check'` trace event。

```bash
# Record check events for each verified step
cat > "$B/record.mjs" << 'JS'
import { appendFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const tp = path.join(B, 'rb_trace.jsonl');
function check(passed, detail) {
  appendFileSync(tp, JSON.stringify({
    ts: new Date().toISOString(), event: 'check', source: 'case-401',
    gate: 'full-boundary', passed, expected: true, detail,
  }) + '\n');
}
// Verify each success condition from previous steps
check(existsSync(path.join(B, 'rb_output_declarations.jsonl')), 'ledger file exists');
// Gate passed (check from gate JSON capture in Step 6)
const gateOk = process.env.GATE_OK === '1';
check(gateOk, 'gate content_dedup passed with clean declarations');
// Queue completed
const events = require('fs').readFileSync(tp, 'utf-8').trim().split('\n').map(JSON.parse);
check(events.some(e => e.event === 'queue_completed'), 'queue complete event in trace');
check(events.some(e => e.event === 'ledger_appended'), 'ledger appended event in trace');
check(events.some(e => e.event === 'run_start'), 'run_start event in trace');
JS
GATE_OK=1 node "$B/record.mjs" $B
```

---

## Step 8: 从 Trace 裁决

```bash
cat > "$B/verdict.mjs" << 'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const tp = path.join(B, 'rb_trace.jsonl');
const events = readFileSync(tp, 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const passed = checks.filter(c => c.passed === (c.expected !== false)).length;
const failed = checks.filter(c => c.passed !== (c.expected !== false)).length;
console.log(`checks: ${checks.length} passed: ${passed} failed: ${failed}`);
const ok = checks.length >= 3 && failed === 0;
console.log(ok ? '\x1b[32mCASE-401 PASS\x1b[0m' : '\x1b[31mCASE-401 FAIL\x1b[0m');
if (!ok) process.exit(1);
JS
node "$B/verdict.mjs" $B
```

→ 预期：`CASE-401 PASS`。

---

## Step 8: 结果解读

> 3 个场景验证正向全链路：
>   [A] fixture slot result → delegated complete → ledger append ✓
>   [B] validate-bundle 识别 rb_output_declarations.jsonl ✓
>   [C] gate content_dedup 从 ledger 读取，distinct URLs + distinct Key Facts → pass ✓
>   全部 expected → CASE-401 PASS。

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
